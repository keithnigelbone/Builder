import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Cheap abuse guards for the public hosted endpoints. Honest limits: Origin
 * headers are spoofable by non-browser clients — these stop casual cross-site
 * abuse and oversized prompts, while the Google account's spending cap is
 * the real cost ceiling.
 */
export const MAX_PROMPT_LENGTH = 2000;

/** Returns true when the request was rejected (a response has already been sent). */
export function rejectBadRequest(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return true;
  }

  const origin = req.headers.origin ?? req.headers.referer;
  if (origin) {
    try {
      if (new URL(String(origin)).host !== req.headers.host) {
        res.status(403).json({ error: 'Cross-origin requests are not allowed' });
        return true;
      }
    } catch {
      res.status(403).json({ error: 'Unparseable Origin header' });
      return true;
    }
  }

  const prompt = (req.body as { prompt?: unknown } | undefined)?.prompt;
  if (typeof prompt !== 'string' || prompt.length === 0) {
    res.status(400).json({ error: 'Missing prompt' });
    return true;
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    res.status(400).json({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} chars)` });
    return true;
  }

  return false;
}
