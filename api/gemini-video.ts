import type { VercelRequest, VercelResponse } from '@vercel/node';
// Explicit .js specifiers — same runtime-ESM constraint as api/gemini-image.ts.
import { DEFAULT_VIDEO_MODEL, generateVideo } from '../App/server/geminiVideoCore.js';
import { rejectBadRequest } from './_guards.js';

/**
 * Hosted twin of the dev-only Vite proxy (App/geminiVideoProxy.ts) — same
 * path, same contract, same shared core. Veo jobs run tens of seconds to
 * minutes, hence the extended maxDuration; the core's own 5-minute deadline
 * returns a clean 504 JSON inside that window.
 */
export const config = { maxDuration: 300 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectBadRequest(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured on this deployment.' });
    return;
  }
  const model = process.env.GEMINI_VIDEO_MODEL || DEFAULT_VIDEO_MODEL;

  const body = req.body as { prompt: string; startImageDataUrl?: unknown; aspectRatio?: unknown };
  const startImageDataUrl = typeof body.startImageDataUrl === 'string' ? body.startImageDataUrl : undefined;
  const aspectRatio = body.aspectRatio === '16:9' || body.aspectRatio === '9:16' ? body.aspectRatio : undefined;

  const result = await generateVideo(apiKey, model, body.prompt, startImageDataUrl, aspectRatio ? { aspectRatio } : undefined);
  if (result.ok === true) res.status(200).json({ result: { videoUrl: result.videoUrl } });
  else res.status(result.status).json({ error: result.error });
}
