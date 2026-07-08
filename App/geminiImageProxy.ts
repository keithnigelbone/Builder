import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEFAULT_IMAGE_MODEL, generateImage } from './server/geminiImageCore';

/**
 * Dev-only local proxy to Google's Gemini image API ("Nano"). The actual
 * request/parse logic lives in App/server/geminiImageCore.ts, shared with
 * the hosted Vercel function (api/gemini-image.ts) — this file only adapts
 * it to Vite middleware. If no key is configured, or the call fails for any
 * reason, it returns a JSON error the client already treats as "no image".
 *
 * This only runs under `vite dev` (App/vite.config.ts).
 */

interface ImageRequestBody {
  prompt: string;
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
        if (!apiKey) {
          sendJson(res, 503, { error: 'GEMINI_API_KEY is not set. Add it to the repo-root .env.' });
          return;
        }
        const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          const result = await generateImage(apiKey, model, body.prompt);
          if (result.ok) sendJson(res, 200, { result: { dataUrl: result.dataUrl } });
          else sendJson(res, result.status, { error: result.error });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Gemini' });
        }
      });
    },
  };
}
