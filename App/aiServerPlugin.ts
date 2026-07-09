import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BuildCategoryId } from './src/types';
import { RELIANCE_BRAND_VOICE } from './src/ai/brandVoice';
import { RELIANCE_ART_DIRECTION } from './src/ai/artDirection';
import { RELIANCE_REAL_CONTEXT } from './src/ai/brandContext';
import { getPatternsForCategory } from './src/data/patternRegistry';
import { getUiUxQualityHints } from './src/mcp/uiUxProAdapter';
import { getFramerQualityHints } from './src/mcp/framerAdapter';

/**
 * Dev-only local proxy to the Anthropic API.
 *
 * The browser NEVER sees ANTHROPIC_API_KEY — it lives only in this Node
 * process (read from App/.env.local, see README.md). The client posts a
 * small typed request to /api/claude; this middleware owns the actual
 * system prompt + structured-output tool schema and forwards a single
 * Messages API call. If no key is configured, or the call fails for any
 * reason, it returns a JSON error the client already knows how to handle —
 * App/src/ai/client.ts falls back to fallbackPlan.ts so the app keeps
 * working without Claude, it just stops being AI-authored.
 *
 * This only runs under `vite dev` (App/vite.config.ts). `vite build`
 * produces static files with no server, so a production deployment of this
 * prototype would need a real hosted equivalent of this endpoint.
 */

/**
 * Model resolution is lazy (read per request, not at module import) because
 * this module is imported by App/vite.config.ts *before* its defineConfig
 * callback copies .env values onto process.env — a module-level constant
 * would always see the pre-loadEnv environment and silently ignore
 * ANTHROPIC_MODEL / ANTHROPIC_FALLBACK_MODEL set in .env.
 */
export function resolveModels(): { primary: string; fallback: string } {
  return {
    primary: process.env.ANTHROPIC_MODEL || 'claude-fable-5',
    fallback: process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-sonnet-5',
  };
}
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const RELIANCE_SYSTEM_PROMPT = `You are the reasoning layer behind "Reliance Builder", a tool that turns a short
user prompt into a Reliance-branded visual first draft. You never choose colors, fonts,
spacing, or component styling yourself — those always come from Reliance's real design
tokens, applied by the app after you respond. Your job is purely: understand intent,
classify the right output format, ask sharp follow-up questions when useful, and author
clear, presentation-ready CONTENT (headlines, copy, structure) for the chosen format.

${RELIANCE_BRAND_VOICE}

${RELIANCE_REAL_CONTEXT}

For "video" builds you author a storyboard-level film concept: title (headline),
concept summary (subheadline), visual direction (body), recommended duration, an
opening shot, 3-5 key scenes, a closing frame, and voiceover/on-screen copy. The
delivery format (ratio, dimensions, safe areas) is decided by the app from the
user's destination choice and given to you as context — compose FOR it: framing,
text-safe areas, title/CTA placement and visual density must fit that ratio, not
merely mention it.`;

function buildCritiqueSystemPrompt(category: string): string {
  const hints = [...getUiUxQualityHints(category), ...(getFramerQualityHints() ?? [])];
  return `${RELIANCE_SYSTEM_PROMPT}\n\n${RELIANCE_ART_DIRECTION}\n\nQuality rubric — judge the draft against every line before deciding what to revise:\n${hints
    .map((h) => `- ${h}`)
    .join('\n')}`;
}

interface ClassifyRequestBody {
  type: 'classify';
  prompt: string;
}

interface PlanRequestBody {
  type: 'plan';
  category: string;
  prompt: string;
  answers: Record<string, string>;
  refinement?: string;
  availableComponents: string[];
  videoFormatContext?: string;
}

interface CritiqueRequestBody {
  type: 'critique';
  category: string;
  prompt: string;
  draftPlan: Record<string, unknown>;
}

type RequestBody = ClassifyRequestBody | PlanRequestBody | CritiqueRequestBody;

const CLASSIFY_TOOL = {
  name: 'classify_request',
  description: "Classify the user's build request and, if useful, ask 1-2 short follow-up questions.",
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        enum: ['website', 'app-screens', 'slides', 'social-media', 'motion', 'video'],
        description: 'The single best-fit output format for this request.',
      },
      reasoning: { type: 'string', description: 'One or two sentences on why this category and these follow-ups.' },
      followUps: {
        type: 'array',
        maxItems: 2,
        description: 'Follow-up questions to sharpen the brief. Empty array if the prompt is already specific enough.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'kebab-case identifier' },
            prompt: { type: 'string' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 6,
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, label: { type: 'string' } },
                required: ['id', 'label'],
              },
            },
          },
          required: ['id', 'prompt', 'options'],
        },
      },
    },
    required: ['category', 'reasoning', 'followUps'],
  },
};

const NAV_ICON_ENUM = ['home', 'search', 'settings', 'user', 'notification', 'chat', 'calendar', 'heart', 'list', 'grid'];

export const PLAN_TOOL = {
  name: 'author_build_plan',
  description: 'Author the content and structure for a Reliance-branded visual preview.',
  input_schema: {
    type: 'object' as const,
    properties: {
      headline: { type: 'string' },
      subheadline: { type: 'string' },
      body: { type: 'string' },
      kicker: { type: 'string', description: 'Small eyebrow label above the headline, e.g. a section tag or badge.' },
      ctaLabel: { type: 'string' },
      navItems: { type: 'array', items: { type: 'string' }, description: 'Website: 2-4 nav link labels.' },
      sections: {
        type: 'array',
        description: 'Website: supporting feature/benefit blocks below the hero.',
        items: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'] },
      },
      quote: {
        type: 'object',
        description: 'Website: an optional founder/customer spotlight quote — only include when it genuinely fits the brief.',
        properties: {
          text: { type: 'string' },
          name: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['text', 'name', 'title'],
      },
      newsItems: {
        type: 'array',
        description: 'Website: an optional 2-3 item news/updates grid.',
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, date: { type: 'string' } },
          required: ['title', 'date'],
        },
      },
      contactHeadline: {
        type: 'string',
        description: 'Website: an optional closing contact/CTA band headline, e.g. "Get in touch."',
      },
      screenTitle: { type: 'string', description: 'App screens: the top bar / screen title.' },
      contentBlocks: {
        type: 'array',
        description:
          'App screens: 2-5 content blocks below the hero image, mixing the types below. image-card blocks reuse the single generated hero image (imageSubject/imageAction/imageLocation/imageFraming) — never author a separate image per block.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['list-item', 'stat', 'image-card', 'action'] },
            icon: { type: 'string', enum: NAV_ICON_ENUM, description: 'list-item only, optional leading icon.' },
            title: { type: 'string', description: 'list-item only.' },
            subtitle: { type: 'string', description: 'list-item only, optional.' },
            value: { type: 'string', description: 'stat only: the large number/value shown, e.g. "12" or "₹2,400".' },
            label: { type: 'string', description: 'stat only (caption) or action only (button label).' },
            caption: { type: 'string', description: 'image-card only: caption shown under the reused hero image.' },
          },
          required: ['type'],
        },
      },
      screenNavItems: {
        type: 'array',
        description: 'App screens: 2-5 bottom nav items for this specific app, replacing the generic Home/Search/Settings default.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            icon: { type: 'string', enum: NAV_ICON_ENUM },
          },
          required: ['label', 'icon'],
        },
      },
      slides: {
        type: 'array',
        description:
          'Slides: the full deck. Look at the guided answers for a slide-count signal (e.g. a range like "3-5", "6-10", "10+") and author that many slide objects, picking one specific number within the indicated range (e.g. "3-5" → 4, "10+" → 10). Each slide picks its own slideType: "cover" for an opening title slide, "divider" for a section-break heading only, "content" for a standard headline+body slide, "split-photo" for headline+body beside the deck\'s shared photo, "table" for a structured comparison/principles table, "stat" for one hero number with a caption, "closing" for the final thank-you/next-steps slide. Slides never author their own image — the single shared heroImage (imageSubject/imageAction/imageLocation/imageFraming) is reused by any content/split-photo slide that wants one.',
        items: {
          type: 'object',
          properties: {
            slideType: { type: 'string', enum: ['cover', 'divider', 'content', 'split-photo', 'table', 'stat', 'closing'] },
            headline: { type: 'string' },
            subheadline: { type: 'string', description: 'cover/closing only.' },
            body: { type: 'string', description: 'content/split-photo only.' },
            kicker: { type: 'string', description: 'content/split-photo only, optional eyebrow label.' },
            tableColumns: {
              type: 'array',
              description: 'table only.',
              items: {
                type: 'object',
                properties: { header: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
                required: ['header', 'items'],
              },
            },
            statValue: { type: 'string', description: 'stat only: the single large number/value the slide is about, e.g. "42%" or "₹2,400 Cr".' },
            statLabel: { type: 'string', description: 'stat only: one-line caption under the value.' },
          },
          required: ['slideType', 'headline'],
        },
      },
      socialFormat: { type: 'string', enum: ['square', 'story', 'linkedin', 'carousel'] },
      carouselFrames: {
        type: 'array',
        description:
          'Social carousel only: 3-5 frames, each one mini-slide advancing a single story — frame one is the hook, the last frame carries the CTA.',
        items: {
          type: 'object',
          properties: { headline: { type: 'string' }, body: { type: 'string' } },
          required: ['headline'],
        },
      },
      badgeLabel: { type: 'string', description: 'Social: small badge/tag text, e.g. "New" or "Live".' },
      motionConcept: {
        type: 'string',
        enum: ['loader', 'transition', 'intro-animation', 'product-reveal', 'micro-interaction'],
      },
      motionDescription: { type: 'string', description: 'One sentence describing what the motion should feel like.' },
      recommendedDuration: { type: 'string', description: 'Video only: recommended film length, e.g. "45–60 seconds".' },
      openingShot: { type: 'string', description: 'Video only: the opening shot, described concretely per the art-direction rules.' },
      keyScenes: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        description: 'Video only: 3-5 storyboard beats that build one story toward the closing frame.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Two or three words naming the beat.' },
            description: { type: 'string', description: 'What the camera sees — concrete, physical, on-format.' },
          },
          required: ['title', 'description'],
        },
      },
      closingFrame: { type: 'string', description: 'Video only: the final frame / end card.' },
      voiceoverCopy: { type: 'string', description: 'Video only: a line or two of voiceover or on-screen copy.' },
      dimensionVariant: {
        type: 'string',
        description: 'Preferred canvas variant for this format, e.g. "desktop"/"tablet"/"mobile" for website.',
      },
      patternId: {
        type: 'string',
        enum: [...getPatternsForCategory('website'), ...getPatternsForCategory('app-screens')].map((p) => p.id),
        description:
          'Website/app-screens only: the curated Reliance layout pattern that best fits this brief — pick from the ids listed for the current output format in the request. Omit for slides/social/motion.',
      },
      recommendedComponentNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Pick 4-8 names from the provided availableComponents list that best fit this build.',
      },
      imageSubject: { type: 'string', description: 'Image: physical description and clothing of the subject, per the art-direction rules.' },
      imageAction: { type: 'string', description: "Image: what the subject's hands are doing — specific and real, never resting." },
      imageLocation: {
        type: 'string',
        description: 'Image: a named Indian place with physical, specific detail (e.g. "red-brown Rajasthan earth, dry scrubland") — never a generic phrase like "in India".',
      },
      imageFraming: {
        type: 'string',
        description: 'Image: shot type and angle per the framing rules (e.g. "medium close-up, slight low angle" for people; "wide low angle" for infrastructure).',
      },
      imageIsAerial: { type: 'boolean', description: 'Image: true only for a genuine top-down/aerial shot.' },
      imageColourNotes: {
        type: 'string',
        description: 'Image: only used when imageIsAerial is true — the scene\'s specific colours for the aerial visual baseline (e.g. "steel-blue panels and red-brown earth").',
      },
      reasoning: { type: 'string', description: 'One or two sentences on the layout/content choices made and why.' },
    },
    required: ['headline', 'reasoning', 'recommendedComponentNames'],
  },
};

/** Plan fields the critique pass must never touch — layout, canvas, and component choices are structural. */
const CRITIQUE_EXCLUDED_FIELDS = new Set([
  'patternId',
  'dimensionVariant',
  'recommendedComponentNames',
  'socialFormat',
  'motionConcept',
  'reasoning',
]);

export const CRITIQUE_TOOL = {
  name: 'critique_and_revise',
  description:
    'Review the drafted plan against the quality rubric. Return ONLY the content fields that should improve (rewritten in full), plus a one-line qualityNotes. Never change the layout pattern, canvas, or component choices — those fields do not exist on this tool.',
  input_schema: {
    type: 'object' as const,
    properties: {
      ...Object.fromEntries(Object.entries(PLAN_TOOL.input_schema.properties).filter(([key]) => !CRITIQUE_EXCLUDED_FIELDS.has(key))),
      qualityNotes: {
        type: 'string',
        description: 'One sentence: what the review checked and what it improved — or that the draft was already strong.',
      },
    },
    required: ['qualityNotes'],
  },
};

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userContent: string,
  tool: typeof CLASSIFY_TOOL | typeof PLAN_TOOL | typeof CRITIQUE_TOOL,
) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      // 1024 was fine before the slides deck array existed; a "slides" plan
      // call authoring up to 10 slide objects plus reasoning and image
      // fields routinely needs more than that and was silently truncating
      // (observed live: stop_reason "max_tokens", with the slides array
      // dropped from the response entirely while every field generated
      // before it came through complete).
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userContent }],
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }>; stop_reason?: string };
  // A max_tokens stop means the tool-call JSON was cut off mid-generation —
  // whatever fields survived may look complete but the response as a whole
  // is not what Claude intended. Fail loudly here so the client falls back
  // to fallbackPlan.ts's honest placeholder content instead of silently
  // rendering a truncated, partially-AI-authored build.
  if (data.stop_reason === 'max_tokens') {
    throw new Error('Anthropic response was truncated (max_tokens) before completing the tool call.');
  }
  const toolUse = data.content.find((block) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Anthropic response had no tool_use block');
  return toolUse.input;
}

/**
 * One retry on the fallback model covers every primary failure mode this
 * proxy can detect — HTTP error, overload, max_tokens truncation, missing
 * tool_use block. Both models failing propagates the error so the client
 * falls back to fallbackPlan.ts's deterministic content.
 */
export async function callAnthropicWithFallback(
  apiKey: string,
  system: string,
  userContent: string,
  tool: typeof CLASSIFY_TOOL | typeof PLAN_TOOL | typeof CRITIQUE_TOOL,
): Promise<{ input: unknown; model: string }> {
  const { primary, fallback } = resolveModels();
  try {
    return { input: await callAnthropic(apiKey, primary, system, userContent, tool), model: primary };
  } catch (primaryErr) {
    if (fallback === primary) throw primaryErr;
    return { input: await callAnthropic(apiKey, fallback, system, userContent, tool), model: fallback };
  }
}

function readJsonBody(req: IncomingMessage): Promise<RequestBody> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export function claudeApiProxy(): Plugin {
  return {
    name: 'reliance-builder-claude-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/claude', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          sendJson(res, 503, {
            error: 'ANTHROPIC_API_KEY is not set. Add it to App/.env.local — see README.md. Using local fallback reasoning instead.',
          });
          return;
        }

        try {
          const body = await readJsonBody(req);

          if (body.type === 'classify') {
            const { input, model } = await callAnthropicWithFallback(
              apiKey,
              RELIANCE_SYSTEM_PROMPT,
              `User's request: "${body.prompt}"\n\nClassify it and propose any useful follow-up questions.`,
              CLASSIFY_TOOL,
            );
            sendJson(res, 200, { result: input, model });
            return;
          }

          if (body.type === 'plan') {
            const contextLines = [
              `Output format: ${body.category}`,
              `Original request: "${body.prompt}"`,
              Object.keys(body.answers).length
                ? `Answers gathered so far: ${JSON.stringify(body.answers)}`
                : 'No follow-up answers were needed.',
              body.refinement ? `The user just asked to refine it further: "${body.refinement}"` : '',
              `Components available to recommend from (pick only from this real list): ${body.availableComponents.join(', ')}`,
              `Curated layout patterns for this format (choose patternId from these ids only): ${getPatternsForCategory(
                body.category as BuildCategoryId,
              )
                .map((p) => `${p.id} — ${p.whenToUse}`)
                .join('; ') || 'none — omit patternId'}`,
              body.category === 'video'
                ? `Video format (decided by the app — compose for it): ${body.videoFormatContext ?? 'Keynote / AGM screen — 16:9, 1920×1080.'}`
                : '',
            ].filter(Boolean);

            const planSystemPrompt = `${RELIANCE_SYSTEM_PROMPT}\n\n${RELIANCE_ART_DIRECTION}`;
            const { input, model } = await callAnthropicWithFallback(apiKey, planSystemPrompt, contextLines.join('\n'), PLAN_TOOL);
            sendJson(res, 200, { result: input, model });
            return;
          }

          if (body.type === 'critique') {
            const { input, model } = await callAnthropicWithFallback(
              apiKey,
              buildCritiqueSystemPrompt(body.category),
              [
                `Output format: ${body.category}`,
                `Original request: "${body.prompt}"`,
                `Drafted plan (JSON): ${JSON.stringify(body.draftPlan)}`,
                'Return only the fields that need improving, rewritten in full, plus qualityNotes. If the draft is already strong, return just qualityNotes.',
              ].join('\n'),
              CRITIQUE_TOOL,
            );
            sendJson(res, 200, { result: input, model });
            return;
          }

          sendJson(res, 400, { error: 'Unknown request type' });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Claude' });
        }
      });
    },
  };
}
