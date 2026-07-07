import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only local proxy to Google's Veo video generation, replacing the
 * outgoing Higgsfield CLI proxy — reached the same way geminiImageProxy.ts
 * already reaches Gemini: GEMINI_API_KEY over plain HTTPS, no CLI, no
 * separate auth step. The client posts { prompt, startImageDataUrl? } to
 * /api/gemini-video; this middleware starts a predictLongRunning job, polls
 * it to completion, downloads the finished file, and responds with a
 * data:video/mp4 URL — one blocking request from the client's perspective,
 * mirroring the old --wait behavior. Any failure returns a JSON error the
 * UI already renders as "no video".
 *
 * This only runs under `vite dev` (App/vite.config.ts), same constraint as
 * every other proxy here.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface VideoRequestBody {
  prompt: string;
  startImageDataUrl?: string;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The exact JSON shape of a completed Veo operation isn't fully certain from
 * documentation alone (same situation the old Higgsfield extractVideoUrl
 * documented) — try the plausible shapes and fail loudly with the raw
 * operation attached so the parsing can be corrected against a real
 * response.
 */
function extractVideoUri(operation: unknown): string {
  const op = operation as Record<string, any>;
  const candidates = [
    op?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri,
    op?.response?.predictions?.[0]?.video?.uri,
    op?.response?.videos?.[0]?.uri,
  ];
  const found = candidates.find((c) => typeof c === 'string' && c.length > 0);
  if (!found) {
    throw new Error(`Could not find a video URI in the Veo operation. Raw operation: ${JSON.stringify(operation).slice(0, 500)}`);
  }
  return found;
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
        // Default matches the current GA text-to-video Veo model; override
        // via GEMINI_VIDEO_MODEL in the repo-root .env if your key exposes a
        // different one — errors from a wrong model name surface verbatim.
        const model = process.env.GEMINI_VIDEO_MODEL || 'veo-3.0-generate-001';
        if (!apiKey) {
          sendJson(res, 503, { error: 'GEMINI_API_KEY is not set. Add it to the repo-root .env.' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          const instance: Record<string, unknown> = { prompt: body.prompt };
          if (body.startImageDataUrl) {
            const match = body.startImageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) instance.image = { mimeType: match[1], bytesBase64Encoded: match[2] };
          }

          const startRes = await fetch(`${GEMINI_API_BASE}/models/${model}:predictLongRunning`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ instances: [instance] }),
          });
          if (!startRes.ok) {
            const text = await startRes.text().catch(() => '');
            sendJson(res, 502, { error: `Veo start error ${startRes.status}: ${text.slice(0, 300)}` });
            return;
          }
          const startData = (await startRes.json()) as { name?: string };
          if (!startData.name) {
            sendJson(res, 502, { error: 'Veo did not return an operation name.' });
            return;
          }

          const deadline = Date.now() + POLL_TIMEOUT_MS;
          let operation: Record<string, any>;
          for (;;) {
            await sleep(POLL_INTERVAL_MS);
            const pollRes = await fetch(`${GEMINI_API_BASE}/${startData.name}`, {
              headers: { 'x-goog-api-key': apiKey },
            });
            if (!pollRes.ok) {
              const text = await pollRes.text().catch(() => '');
              sendJson(res, 502, { error: `Veo poll error ${pollRes.status}: ${text.slice(0, 300)}` });
              return;
            }
            operation = (await pollRes.json()) as Record<string, any>;
            if (operation.done) break;
            if (Date.now() > deadline) {
              sendJson(res, 504, { error: 'Video generation timed out after 5 minutes.' });
              return;
            }
          }

          if (operation.error) {
            sendJson(res, 502, { error: `Veo generation failed: ${JSON.stringify(operation.error).slice(0, 300)}` });
            return;
          }

          const videoUri = extractVideoUri(operation);
          const fileRes = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
          if (!fileRes.ok) {
            sendJson(res, 502, { error: `Veo video download failed with HTTP ${fileRes.status}` });
            return;
          }
          const buffer = Buffer.from(await fileRes.arrayBuffer());
          sendJson(res, 200, { result: { videoUrl: `data:video/mp4;base64,${buffer.toString('base64')}` } });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Veo' });
        }
      });
    },
  };
}
