/**
 * Pure Veo video-generation core, shared by the dev-server Vite proxy
 * (App/geminiVideoProxy.ts) and the hosted Vercel function
 * (api/gemini-video.ts). Dependency-free for the same reason as
 * geminiImageCore.ts. One blocking call: predictLongRunning → poll →
 * download → data URL.
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * The product decision asked for Veo 2, but the Gemini API no longer serves
 * it: models/veo-2.0-generate-001 404s ("not found for API version v1beta,
 * or is not supported for predictLongRunning" — observed live 2026-07-08),
 * while veo-3.0-generate-001 is proven live on this key. Override via
 * GEMINI_VIDEO_MODEL if Google ships new ids.
 */
export const DEFAULT_VIDEO_MODEL = 'veo-3.0-generate-001';

export type VideoResult = { ok: true; videoUrl: string } | { ok: false; status: number; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The exact JSON shape of a completed Veo operation isn't fully certain from
 * documentation alone — try the plausible shapes and fail loudly with the
 * raw operation attached so the parsing can be corrected against a real
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

export async function generateVideo(
  apiKey: string,
  model: string,
  prompt: string,
  startImageDataUrl?: string,
  options?: { pollIntervalMs?: number; pollTimeoutMs?: number },
): Promise<VideoResult> {
  const pollIntervalMs = options?.pollIntervalMs ?? 5_000;
  const pollTimeoutMs = options?.pollTimeoutMs ?? 5 * 60 * 1000;

  try {
    const instance: Record<string, unknown> = { prompt };
    if (startImageDataUrl) {
      const match = startImageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) instance.image = { mimeType: match[1], bytesBase64Encoded: match[2] };
    }

    const startRes = await fetch(`${GEMINI_API_BASE}/models/${model}:predictLongRunning`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ instances: [instance] }),
    });
    if (!startRes.ok) {
      const text = await startRes.text().catch(() => '');
      return { ok: false, status: 502, error: `Veo start error ${startRes.status}: ${text.slice(0, 300)}` };
    }
    const startData = (await startRes.json()) as { name?: string };
    if (!startData.name) return { ok: false, status: 502, error: 'Veo did not return an operation name.' };

    const deadline = Date.now() + pollTimeoutMs;
    let operation: Record<string, any>;
    for (;;) {
      await sleep(pollIntervalMs);
      const pollRes = await fetch(`${GEMINI_API_BASE}/${startData.name}`, {
        headers: { 'x-goog-api-key': apiKey },
      });
      if (!pollRes.ok) {
        const text = await pollRes.text().catch(() => '');
        return { ok: false, status: 502, error: `Veo poll error ${pollRes.status}: ${text.slice(0, 300)}` };
      }
      operation = (await pollRes.json()) as Record<string, any>;
      if (operation.done) break;
      if (Date.now() > deadline) {
        return { ok: false, status: 504, error: 'Video generation timed out after 5 minutes.' };
      }
    }

    if (operation.error) {
      return { ok: false, status: 502, error: `Veo generation failed: ${JSON.stringify(operation.error).slice(0, 300)}` };
    }

    const videoUri = extractVideoUri(operation);
    const fileRes = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
    if (!fileRes.ok) {
      return { ok: false, status: 502, error: `Veo video download failed with HTTP ${fileRes.status}` };
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());
    return { ok: true, videoUrl: `data:video/mp4;base64,${buffer.toString('base64')}` };
  } catch (err) {
    return { ok: false, status: 502, error: err instanceof Error ? err.message : 'Unknown error calling Veo' };
  }
}
