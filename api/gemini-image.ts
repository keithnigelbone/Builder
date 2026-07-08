import type { VercelRequest, VercelResponse } from '@vercel/node';
// Explicit .js specifiers: the Vercel Node builder emits ESM, and Node's ESM
// resolver refuses extensionless relative imports at runtime
// (ERR_MODULE_NOT_FOUND observed live on the first deploy).
import { DEFAULT_IMAGE_MODEL, generateImage } from '../App/server/geminiImageCore.js';
import { rejectBadRequest } from './_guards.js';

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
  if (result.ok === true) res.status(200).json({ result: { dataUrl: result.dataUrl } });
  else res.status(result.status).json({ error: result.error });
}
