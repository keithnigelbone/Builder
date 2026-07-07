import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RELIANCE_BRAND_VOICE } from './src/ai/brandVoice';
import { RELIANCE_ART_DIRECTION } from './src/ai/artDirection';
import { RELIANCE_REAL_CONTEXT } from './src/ai/brandContext';

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

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const RELIANCE_SYSTEM_PROMPT = `You are the reasoning layer behind "Reliance Builder", a tool that turns a short
user prompt into a Reliance-branded visual first draft. You never choose colors, fonts,
spacing, or component styling yourself — those always come from Reliance's real design
tokens, applied by the app after you respond. Your job is purely: understand intent,
classify the right output format, ask sharp follow-up questions when useful, and author
clear, presentation-ready CONTENT (headlines, copy, structure) for the chosen format.

${RELIANCE_BRAND_VOICE}

${RELIANCE_REAL_CONTEXT}`;

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
}

type RequestBody = ClassifyRequestBody | PlanRequestBody;

const CLASSIFY_TOOL = {
  name: 'classify_request',
  description: "Classify the user's build request and, if useful, ask 1-2 short follow-up questions.",
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        enum: ['website', 'app-screens', 'slides', 'social-media', 'motion'],
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
      socialFormat: { type: 'string', enum: ['square', 'story', 'linkedin', 'carousel'] },
      badgeLabel: { type: 'string', description: 'Social: small badge/tag text, e.g. "New" or "Live".' },
      motionConcept: {
        type: 'string',
        enum: ['loader', 'transition', 'intro-animation', 'product-reveal', 'micro-interaction'],
      },
      motionDescription: { type: 'string', description: 'One sentence describing what the motion should feel like.' },
      dimensionVariant: {
        type: 'string',
        description: 'Preferred canvas variant for this format, e.g. "desktop"/"tablet"/"mobile" for website.',
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

async function callAnthropic(apiKey: string, system: string, userContent: string, tool: typeof CLASSIFY_TOOL | typeof PLAN_TOOL) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
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

  const data = (await res.json()) as { content: Array<{ type: string; input?: unknown }> };
  const toolUse = data.content.find((block) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Anthropic response had no tool_use block');
  return toolUse.input;
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
            const input = await callAnthropic(
              apiKey,
              RELIANCE_SYSTEM_PROMPT,
              `User's request: "${body.prompt}"\n\nClassify it and propose any useful follow-up questions.`,
              CLASSIFY_TOOL,
            );
            sendJson(res, 200, { result: input });
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
            ].filter(Boolean);

            const planSystemPrompt = `${RELIANCE_SYSTEM_PROMPT}\n\n${RELIANCE_ART_DIRECTION}`;
            const input = await callAnthropic(apiKey, planSystemPrompt, contextLines.join('\n'), PLAN_TOOL);
            sendJson(res, 200, { result: input });
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
