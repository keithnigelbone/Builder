/**
 * Pure Gemini ("Nano") image-generation core, shared by the dev-server Vite
 * proxy (App/geminiImageProxy.ts) and the hosted Vercel function
 * (api/gemini-image.ts) so the two runtimes can never drift. Deliberately
 * dependency-free — fetch + JSON only, no Vite, no node:http — because the
 * Vercel function must bundle without npm-installing this repo (the @jds4
 * file: tarballs cannot resolve there).
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** The current Nano image model; override via GEMINI_IMAGE_MODEL. */
export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

export type ImageResult = { ok: true; dataUrl: string } | { ok: false; status: number; error: string };

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ inlineData?: { mimeType: string; data: string } }>;
    };
  }>;
}

export async function generateImage(apiKey: string, model: string, prompt: string): Promise<ImageResult> {
  try {
    const apiRes = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!apiRes.ok) {
      const text = await apiRes.text().catch(() => '');
      return { ok: false, status: 502, error: `Gemini API error ${apiRes.status}: ${text.slice(0, 300)}` };
    }

    const data = (await apiRes.json()) as GeminiGenerateContentResponse;
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part?.inlineData) return { ok: false, status: 502, error: 'Gemini response had no image data' };

    return { ok: true, dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` };
  } catch (err) {
    return { ok: false, status: 502, error: err instanceof Error ? err.message : 'Unknown error calling Gemini' };
  }
}
