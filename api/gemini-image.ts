import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_IMAGE_MODEL, generateImage } from '../App/server/geminiImageCore';
import { rejectBadRequest } from './_guards';

/**
 * Hosted twin of the dev-only Vite proxy (App/geminiImageProxy.ts) — same
 * path, same request/response contract, same shared core.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (rejectBadRequest(req, res)) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'GEMINI_API_KEY is not configured on this deployment.' });
    return;
  }
  const model = process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;

  const result = await generateImage(apiKey, model, (req.body as { prompt: string }).prompt);
  if (result.ok) res.status(200).json({ result: { dataUrl: result.dataUrl } });
  else res.status(result.status).json({ error: result.error });
}
