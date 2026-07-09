import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DEFAULT_VIDEO_MODEL, generateVideo } from './server/geminiVideoCore';

/**
 * Dev-only local proxy to Google's Veo video generation. The actual
 * start/poll/download logic lives in App/server/geminiVideoCore.ts, shared
 * with the hosted Vercel function (api/gemini-video.ts) — this file only
 * adapts it to Vite middleware. Any failure returns a JSON error the UI
 * already renders as "no video".
 *
 * This only runs under `vite dev` (App/vite.config.ts).
 */

interface VideoRequestBody {
  prompt: string;
  startImageDataUrl?: string;
  aspectRatio?: string;
}

function readJsonBody(req: IncomingMessage): Promise<VideoRequestBody> {
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

export function geminiVideoProxy(): Plugin {
  return {
    name: 'reliance-builder-gemini-video-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/gemini-video', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          sendJson(res, 503, { error: 'GEMINI_API_KEY is not set. Add it to the repo-root .env.' });
          return;
        }
        const model = process.env.GEMINI_VIDEO_MODEL || DEFAULT_VIDEO_MODEL;

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          const aspectRatio = body.aspectRatio === '16:9' || body.aspectRatio === '9:16' ? body.aspectRatio : undefined;
          const result = await generateVideo(apiKey, model, body.prompt, body.startImageDataUrl, aspectRatio ? { aspectRatio } : undefined);
          if (result.ok) sendJson(res, 200, { result: { videoUrl: result.videoUrl } });
          else sendJson(res, result.status, { error: result.error });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Veo' });
        }
      });
    },
  };
}
