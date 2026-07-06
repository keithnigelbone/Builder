import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only local proxy to Google's Gemini image API ("Nano Banana").
 *
 * The browser NEVER sees GEMINI_API_KEY — it lives only in this Node
 * process (read from the repo-root .env, copied onto process.env by
 * App/vite.config.ts, same mechanism as aiServerPlugin.ts's Claude proxy).
 * The client posts { prompt: string } to /api/gemini-image; this middleware
 * forwards a single generateContent call requesting image output and
 * returns a data URL. If no key/model is configured, or the call fails for
 * any reason, it returns a JSON error the client already treats as "no
 * image" — App/src/ai/client.ts never throws on this, the preview just
 * renders without one.
 *
 * This only runs under `vite dev` (App/vite.config.ts), same constraint as
 * aiServerPlugin.ts's Claude proxy.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface ImageRequestBody {
  prompt: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ inlineData?: { mimeType: string; data: string } }>;
    };
  }>;
}

function readJsonBody(req: IncomingMessage): Promise<ImageRequestBody> {
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

export function geminiImageProxy(): Plugin {
  return {
    name: 'reliance-builder-gemini-image-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/gemini-image', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_IMAGE_MODEL;
        if (!apiKey || !model) {
          sendJson(res, 503, {
            error: 'GEMINI_API_KEY or GEMINI_IMAGE_MODEL is not set. Add them to the repo-root .env.',
          });
          return;
        }

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          const apiRes = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: body.prompt }] }],
              generationConfig: { responseModalities: ['IMAGE'] },
            }),
          });

          if (!apiRes.ok) {
            const text = await apiRes.text().catch(() => '');
            sendJson(res, 502, { error: `Gemini API error ${apiRes.status}: ${text.slice(0, 300)}` });
            return;
          }

          const data = (await apiRes.json()) as GeminiGenerateContentResponse;
          const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
          if (!part?.inlineData) {
            sendJson(res, 502, { error: 'Gemini response had no image data' });
            return;
          }

          sendJson(res, 200, { result: { dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Gemini' });
        }
      });
    },
  };
}
