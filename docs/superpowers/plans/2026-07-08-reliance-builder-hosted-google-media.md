# Hosted Google Media Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nano image generation works on the hosted Vercel site for website/app-screens/social-media/motion builds, motion video uses Veo 2 everywhere, and every generated asset follows the art-direction rules via a curated, test-enforced scene library.

**Architecture:** The Google request/parse logic moves into two pure, dependency-free cores under `App/server/`, consumed by both the existing Vite dev proxies and two new zero-dependency Vercel functions in `api/` (bundled locally by `vercel build`, shipped by the existing `--prebuilt` deploy, answering the same `/api/...` paths the client already calls). The deterministic fallback plan — the only authoring path on the hosted site — gains art-directed image-prompt fields from a curated scene-template library, so the existing orchestrator → `requestHeroImage` pipeline generates without any client changes.

**Tech Stack:** TypeScript, Vite middleware (dev), Vercel Node functions + Build Output API (hosted), Gemini `generateContent` (Nano) + `predictLongRunning` (Veo 2), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-08-reliance-builder-hosted-google-media-design.md`

## Global Constraints

- Never read, print, or echo `.env` or any key material. Vercel env values are piped shell-to-shell only, with explicit user approval, in Task 7.
- Model defaults, verbatim: image `'gemini-2.5-flash-image'`, video `'veo-2.0-generate-001'`. Env vars `GEMINI_IMAGE_MODEL` / `GEMINI_VIDEO_MODEL` override; `GEMINI_API_KEY` is required at request time (503 when absent).
- Client contracts are frozen: `/api/gemini-image` responds `{ result: { dataUrl } }` or `{ error }`; `/api/gemini-video` responds `{ result: { videoUrl } }` or `{ error }`. No client-code changes in this plan.
- Media failure never blocks a preview. Slides get no scene template.
- Scene templates must satisfy `App/src/ai/artDirection.ts`'s rules; the banned-phrase list (case-insensitive, all fields): `dramatic lighting`, `beautiful`, `professional photography`, `realistic`, `stunning`, `perfect`, `amazing`, `high quality`, `in india`, `indian setting`, `typical`, `tata`.
- `App/server/` cores and `api/` functions import nothing except each other and `@vercel/node` types — no Vite, no `node:http`, no third-party runtime deps (Vercel cannot npm-install this repo).
- COMMIT DISCIPLINE: stage files explicitly by path — never `git add -A`, `git add .`, `git add -u`, or `git commit -a`. Verify every commit with `git show --stat HEAD`.
- Run `npx vitest run` before every commit; it must pass. Commit messages end with:
  `Co-Authored-By: claude-flow <ruv@ruv.net>`
- Working directory: `/Users/keithbone/component_test`.

---

### Task 1: Shared Gemini image core + thin dev proxy

**Files:**
- Create: `App/server/geminiImageCore.ts`
- Modify: `App/geminiImageProxy.ts` (becomes a thin adapter; keeps `readJsonBody`/`sendJson`)
- Test: `tests/unit/server/geminiImageCore.test.ts` (new)

**Interfaces:**
- Consumes: nothing new (extracts logic currently inside `App/geminiImageProxy.ts`).
- Produces (from `App/server/geminiImageCore.ts`):
  - `export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image'`
  - `export type ImageResult = { ok: true; dataUrl: string } | { ok: false; status: number; error: string }`
  - `export async function generateImage(apiKey: string, model: string, prompt: string): Promise<ImageResult>`
  - Task 3's `api/gemini-image.ts` imports both exports. Behavior change vs today: a missing `GEMINI_IMAGE_MODEL` no longer 503s — the default applies.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/server/geminiImageCore.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_IMAGE_MODEL, generateImage } from '../../../App/server/geminiImageCore';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('generateImage', () => {
  it('requests the given model with IMAGE modality and returns a data URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'abc123' } }] } }],
      }),
    } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateImage('key', 'gemini-2.5-flash-image', 'a grounded scene');

    expect(result).toEqual({ ok: true, dataUrl: 'data:image/png;base64,abc123' });
    expect(fetchMock.mock.calls[0][0]).toContain('/models/gemini-2.5-flash-image:generateContent');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toBe('a grounded scene');
    expect(body.generationConfig.responseModalities).toEqual(['IMAGE']);
    expect(fetchMock.mock.calls[0][1].headers['x-goog-api-key']).toBe('key');
  });

  it('maps an API error to ok:false with the status text preserved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'spending cap exceeded' } as unknown as Response),
    );

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error).toContain('Gemini API error 429');
      expect(result.error).toContain('spending cap exceeded');
    }
  });

  it('maps a response without image data to ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [] }) } as Response));

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Gemini response had no image data');
  });

  it('never throws — a network failure becomes ok:false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const result = await generateImage('key', DEFAULT_IMAGE_MODEL, 'p');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('offline');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/server/geminiImageCore.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/server/geminiImageCore.ts`**

```ts
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
```

- [ ] **Step 4: Slim `App/geminiImageProxy.ts` to a thin adapter**

Replace the whole file with:

```ts
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
```

Note the deliberate behavior change (spec §1): a missing `GEMINI_IMAGE_MODEL` now falls back to `DEFAULT_IMAGE_MODEL` instead of 503ing.

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add App/server/geminiImageCore.ts App/geminiImageProxy.ts tests/unit/server/geminiImageCore.test.ts
git commit -m "Extract shared Gemini image core with a built-in Nano model default

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: Shared Veo core + thin dev proxy (Veo 2 default)

**Files:**
- Create: `App/server/geminiVideoCore.ts`
- Modify: `App/geminiVideoProxy.ts` (becomes a thin adapter)
- Test: `tests/unit/server/geminiVideoCore.test.ts` (new)

**Interfaces:**
- Consumes: nothing new (extracts logic from `App/geminiVideoProxy.ts`).
- Produces (from `App/server/geminiVideoCore.ts`):
  - `export const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001'`
  - `export type VideoResult = { ok: true; videoUrl: string } | { ok: false; status: number; error: string }`
  - `export async function generateVideo(apiKey: string, model: string, prompt: string, startImageDataUrl?: string, options?: { pollIntervalMs?: number; pollTimeoutMs?: number }): Promise<VideoResult>`
  - Task 3's `api/gemini-video.ts` imports both exports. The `options` parameter exists so tests don't sleep 5s per poll; production callers omit it.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/server/geminiVideoCore.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_VIDEO_MODEL, generateVideo } from '../../../App/server/geminiVideoCore';

const FAST = { pollIntervalMs: 1, pollTimeoutMs: 50 };

function jsonRes(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DEFAULT_VIDEO_MODEL', () => {
  it('is Veo 2', () => {
    expect(DEFAULT_VIDEO_MODEL).toBe('veo-2.0-generate-001');
  });
});

describe('generateVideo', () => {
  it('starts, polls to done, downloads, and returns a data URL', async () => {
    const videoBytes = new Uint8Array([1, 2, 3]).buffer;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: false }))
      .mockResolvedValueOnce(
        jsonRes({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: 'https://files/video1' } }] } } }),
      )
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => videoBytes } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'a reveal', undefined, FAST);

    expect(result).toEqual({ ok: true, videoUrl: `data:video/mp4;base64,${Buffer.from(videoBytes).toString('base64')}` });
    expect(fetchMock.mock.calls[0][0]).toContain(`/models/${DEFAULT_VIDEO_MODEL}:predictLongRunning`);
    expect(fetchMock.mock.calls[3][0]).toBe('https://files/video1');
  });

  it('attaches a parsed start image when a data URL is provided', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'stop here' } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', 'data:image/jpeg;base64,QUJD', FAST);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.instances[0].image).toEqual({ mimeType: 'image/jpeg', bytesBase64Encoded: 'QUJD' });
  });

  it('maps a start failure to ok:false 502 with status text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'cap' } as unknown as Response));

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result).toEqual({ ok: false, status: 502, error: 'Veo start error 429: cap' });
  });

  it('times out with 504 when the operation never completes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonRes({ name: 'operations/abc' })).mockResolvedValue(jsonRes({ done: false }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, { pollIntervalMs: 1, pollTimeoutMs: 5 });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(504);
  });

  it('surfaces an operation-level error as 502', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: true, error: { code: 3, message: 'bad prompt' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Veo generation failed');
  });

  it('fails loudly with the raw operation when no video URI shape matches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonRes({ name: 'operations/abc' }))
      .mockResolvedValueOnce(jsonRes({ done: true, response: { unexpected: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Could not find a video URI');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/server/geminiVideoCore.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/server/geminiVideoCore.ts`**

Move the flow from `App/geminiVideoProxy.ts` (start → poll → extract → download), returning results instead of writing responses:

```ts
/**
 * Pure Veo video-generation core, shared by the dev-server Vite proxy
 * (App/geminiVideoProxy.ts) and the hosted Vercel function
 * (api/gemini-video.ts). Dependency-free for the same reason as
 * geminiImageCore.ts. One blocking call: predictLongRunning → poll →
 * download → data URL.
 */
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Product decision: motion is generated with Veo 2. Override via GEMINI_VIDEO_MODEL. */
export const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001';

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
```

- [ ] **Step 4: Slim `App/geminiVideoProxy.ts` to a thin adapter**

Replace the whole file with:

```ts
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

          const result = await generateVideo(apiKey, model, body.prompt, body.startImageDataUrl);
          if (result.ok) sendJson(res, 200, { result: { videoUrl: result.videoUrl } });
          else sendJson(res, result.status, { error: result.error });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Veo' });
        }
      });
    },
  };
}
```

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add App/server/geminiVideoCore.ts App/geminiVideoProxy.ts tests/unit/server/geminiVideoCore.test.ts
git commit -m "Extract shared Veo core and switch the default motion model to Veo 2

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Vercel functions + guards

**Files:**
- Create: `api/_guards.ts` (underscore prefix = not a route, Vercel convention)
- Create: `api/gemini-image.ts`
- Create: `api/gemini-video.ts`
- Modify: `package.json` (devDep `@vercel/node` — types only)
- Test: `tests/unit/api/guards.test.ts` (new)

**Interfaces:**
- Consumes: `generateImage`/`DEFAULT_IMAGE_MODEL` (Task 1), `generateVideo`/`DEFAULT_VIDEO_MODEL` (Task 2).
- Produces: hosted `/api/gemini-image` and `/api/gemini-video` endpoints with the frozen client contracts; `rejectBadRequest(req, res): boolean` from `api/_guards.ts` (true = rejected, response already sent); `MAX_PROMPT_LENGTH = 2000`.

- [ ] **Step 1: Install the types devDep**

```bash
npm install -D @vercel/node
```

- [ ] **Step 2: Write the failing guards test**

Create `tests/unit/api/guards.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_PROMPT_LENGTH, rejectBadRequest } from '../../../api/_guards';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function makeReq(overrides: { method?: string; headers?: Record<string, string>; body?: unknown }): VercelRequest {
  return {
    method: overrides.method ?? 'POST',
    headers: overrides.headers ?? { host: 'reliance-builder.vercel.app' },
    body: overrides.body ?? { prompt: 'a grounded scene' },
  } as unknown as VercelRequest;
}

function makeRes(): { res: VercelResponse; recorded: { status?: number; body?: unknown } } {
  const recorded: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      recorded.status = code;
      return this;
    },
    json(body: unknown) {
      recorded.body = body;
      return this;
    },
  } as unknown as VercelResponse;
  return { res, recorded };
}

describe('rejectBadRequest', () => {
  it('rejects non-POST with 405', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ method: 'GET' }), res)).toBe(true);
    expect(recorded.status).toBe(405);
  });

  it('rejects a cross-origin request with 403', () => {
    const { res, recorded } = makeRes();
    const req = makeReq({ headers: { host: 'reliance-builder.vercel.app', origin: 'https://evil.example.com' } });
    expect(rejectBadRequest(req, res)).toBe(true);
    expect(recorded.status).toBe(403);
  });

  it('accepts a same-origin request', () => {
    const { res } = makeRes();
    const req = makeReq({ headers: { host: 'reliance-builder.vercel.app', origin: 'https://reliance-builder.vercel.app' } });
    expect(rejectBadRequest(req, res)).toBe(false);
  });

  it('accepts a request with no origin or referer header', () => {
    const { res } = makeRes();
    expect(rejectBadRequest(makeReq({}), res)).toBe(false);
  });

  it('rejects a missing prompt with 400', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ body: {} }), res)).toBe(true);
    expect(recorded.status).toBe(400);
  });

  it('rejects an over-length prompt with 400', () => {
    const { res, recorded } = makeRes();
    expect(rejectBadRequest(makeReq({ body: { prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) } }), res)).toBe(true);
    expect(recorded.status).toBe(400);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/unit/api/guards.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Create `api/_guards.ts`**

```ts
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
```

- [ ] **Step 5: Create `api/gemini-image.ts`**

```ts
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
```

- [ ] **Step 6: Create `api/gemini-video.ts`**

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DEFAULT_VIDEO_MODEL, generateVideo } from '../App/server/geminiVideoCore';
import { rejectBadRequest } from './_guards';

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

  const body = req.body as { prompt: string; startImageDataUrl?: unknown };
  const startImageDataUrl = typeof body.startImageDataUrl === 'string' ? body.startImageDataUrl : undefined;

  const result = await generateVideo(apiKey, model, body.prompt, startImageDataUrl);
  if (result.ok) res.status(200).json({ result: { videoUrl: result.videoUrl } });
  else res.status(result.status).json({ error: result.error });
}
```

- [ ] **Step 7: Bundling checkpoint — verify `vercel build` picks up the functions**

Run: `vercel build --yes 2>&1 | tail -3 && ls .vercel/output/functions/api/`
Expected: build succeeds and lists `gemini-image.func` and `gemini-video.func`.

If the functions are missing or the build errors on the imports: STOP and report BLOCKED with the exact output. (Documented fallback, only on controller instruction: inline the two cores into the function files, accepting duplication.) If the build warns that `maxDuration: 300` exceeds the plan's limit, change it to the highest allowed value it names and note that in your report.

- [ ] **Step 8: Run all gates**

Run: `npm run lint && npx vitest run`
Expected: both PASS (the `api/` files are linted; `.vercel/**` output is already ignored).

- [ ] **Step 9: Commit**

```bash
git add api/_guards.ts api/gemini-image.ts api/gemini-video.ts package.json package-lock.json tests/unit/api/guards.test.ts
git commit -m "Add hosted Vercel functions for Nano images and Veo 2 video

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 4: Curated scene-template library

**Files:**
- Create: `App/src/data/sceneTemplates.ts`
- Test: `tests/unit/data/sceneTemplates.test.ts` (new)

**Interfaces:**
- Consumes: `BuildCategoryId` from `App/src/types.ts` (type only).
- Produces (from `App/src/data/sceneTemplates.ts`):
  - `export type SceneCategory = Exclude<BuildCategoryId, 'slides'>`
  - `export interface ArtDirectedScene { imageSubject: string; imageAction: string; imageLocation: string; imageFraming: string; imageIsAerial?: boolean; imageColourNotes?: string }` (spread-compatible with `BuildPlan`'s image fields)
  - `export const SCENE_TEMPLATES: Record<SceneCategory, ArtDirectedScene[]>`
  - `export function pickSceneTemplate(category: SceneCategory, seedText: string): ArtDirectedScene` — stable hash pick. Task 5 consumes both.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/data/sceneTemplates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SCENE_TEMPLATES, pickSceneTemplate, type SceneCategory } from '../../../App/src/data/sceneTemplates';

const CATEGORIES = Object.keys(SCENE_TEMPLATES) as SceneCategory[];

/** From App/src/ai/artDirection.ts's "Never use" list + the TATA prohibition. */
const BANNED = [
  'dramatic lighting',
  'beautiful',
  'professional photography',
  'realistic',
  'stunning',
  'perfect',
  'amazing',
  'high quality',
  'in india',
  'indian setting',
  'typical',
  'tata',
];

describe('scene template compliance', () => {
  it('covers exactly the four media categories, three-plus scenes each', () => {
    expect(CATEGORIES.sort()).toEqual(['app-screens', 'motion', 'social-media', 'website']);
    for (const category of CATEGORIES) {
      expect(SCENE_TEMPLATES[category].length, `${category} needs >= 3 scenes`).toBeGreaterThanOrEqual(3);
    }
  });

  it('every scene has the four art-directed fields, populated', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        expect(scene.imageSubject.length).toBeGreaterThan(10);
        expect(scene.imageAction.length).toBeGreaterThan(10);
        expect(scene.imageLocation.length).toBeGreaterThan(10);
        expect(scene.imageFraming.length).toBeGreaterThan(5);
      }
    }
  });

  it('no scene uses a banned phrase in any field', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        const text = Object.values(scene).filter((v): v is string => typeof v === 'string').join(' ').toLowerCase();
        for (const phrase of BANNED) {
          expect(text, `${category} scene "${scene.imageSubject.slice(0, 30)}…" contains banned "${phrase}"`).not.toContain(phrase);
        }
      }
    }
  });

  it('aerial scenes carry colour notes for the aerial baseline', () => {
    for (const category of CATEGORIES) {
      for (const scene of SCENE_TEMPLATES[category]) {
        if (scene.imageIsAerial) expect(scene.imageColourNotes, `${category} aerial scene needs imageColourNotes`).toBeTruthy();
      }
    }
  });
});

describe('pickSceneTemplate', () => {
  it('is stable for the same seed', () => {
    expect(pickSceneTemplate('website', 'solar campaign page')).toBe(pickSceneTemplate('website', 'solar campaign page'));
  });

  it('reaches more than one template across seeds', () => {
    const picked = new Set(
      ['a', 'solar page', 'retail app', 'festival post', 'city launch', 'grid story'].map((seed) => pickSceneTemplate('website', seed)),
    );
    expect(picked.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/data/sceneTemplates.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/src/data/sceneTemplates.ts`**

```ts
import type { BuildCategoryId } from '../types';

/**
 * Curated, art-direction-compliant scene templates — the image-prompt
 * authoring path for builds Claude didn't author (the deterministic fallback
 * plan, which is everything the hosted site runs). Each scene follows
 * App/src/ai/artDirection.ts to the letter: physical subject + clothing,
 * both hands doing something specific, a named Indian location with physical
 * detail, framing per the people/infrastructure rules, aerials carrying
 * their own colour notes. tests/unit/data/sceneTemplates.test.ts enforces
 * the "Never use" phrase list mechanically.
 *
 * Slides is deliberately absent (product decision — see the 2026-07-08
 * hosted-media spec).
 */
export type SceneCategory = Exclude<BuildCategoryId, 'slides'>;

export interface ArtDirectedScene {
  imageSubject: string;
  imageAction: string;
  imageLocation: string;
  imageFraming: string;
  imageIsAerial?: boolean;
  imageColourNotes?: string;
}

export const SCENE_TEMPLATES: Record<SceneCategory, ArtDirectedScene[]> = {
  website: [
    {
      imageSubject: 'A grid engineer in her forties, navy work shirt and hard hat, sleeves rolled to the forearm',
      imageAction: 'both hands torquing a junction bolt on a solar panel frame with a long-handled wrench',
      imageLocation: 'red-brown Rajasthan earth, dry scrubland with neem trees, panel rows receding behind her',
      imageFraming: 'medium close-up, slight low angle, subject offset left, soft panel edge in the foreground',
    },
    {
      imageSubject: 'A solar farm of long panel rows with a single service track cutting through',
      imageAction: 'two maintenance workers walking the track, one steadying a panel lid with both hands',
      imageLocation: 'flat semi-arid land outside Jodhpur, panels extending to the horizon line',
      imageFraming: 'true top-down aerial, wide enough that the rows read as a repeating grid',
      imageIsAerial: true,
      imageColourNotes: 'steel-blue panels and red-brown earth',
    },
    {
      imageSubject: 'A fibre technician in a grey polo and climbing harness, cable spool at his hip',
      imageAction: 'both hands splicing a fibre strand into a rooftop junction box',
      imageLocation: 'a Mumbai apartment rooftop at dusk, water tanks and antenna masts around him, sodium lights below',
      imageFraming: 'medium close-up, slight low angle, junction box anchoring the foreground',
    },
  ],
  'app-screens': [
    {
      imageSubject: 'A young woman in a mustard kurta, phone in hand, canvas tote over one shoulder',
      imageAction: 'one hand holding her phone to a stall QR stand, the other steadying a bag of tomatoes',
      imageLocation: 'a Chennai vegetable market at morning, wet stone floor, stacked produce crates',
      imageFraming: 'medium close-up, slight low angle, produce crate softly out of focus in the foreground',
    },
    {
      imageSubject: 'A delivery rider in a rain shell and full-face helmet with the visor up',
      imageAction: 'both thumbs confirming a route on a handlebar-mounted phone',
      imageLocation: 'a Bengaluru side street in light monsoon rain, wet tarmac reflecting shop signs',
      imageFraming: 'medium close-up, slight low angle, handlebar mirror blurred in the foreground',
    },
    {
      imageSubject: 'A kirana shop owner in a checked shirt, reading glasses pushed up his forehead',
      imageAction: 'one hand scanning a barcode with his phone, the other steadying the jar on the shelf',
      imageLocation: 'a Jaipur kirana store, floor-to-ceiling shelves of labelled jars and sacks of grain',
      imageFraming: 'medium close-up, slight low angle, shelf edge anchoring the foreground',
    },
  ],
  'social-media': [
    {
      imageSubject: "A silk weaver's hands, forearms bare, cotton thread bracelet on one wrist",
      imageAction: 'both hands guiding a shuttle through the warp threads of a handloom',
      imageLocation: 'a Kanchipuram weaving workshop, morning light raking across stretched crimson silk',
      imageFraming: 'intimate close-up on the hands, slight low angle, loom frame soft in the foreground',
    },
    {
      imageSubject: 'A chai vendor in a rolled-sleeve flannel shirt, steel kettle blackened at the base',
      imageAction: 'both hands pulling a long pour of chai between two steel tumblers',
      imageLocation: 'a Kolkata street corner at dawn, hand-painted shop shutters behind the stall',
      imageFraming: 'medium close-up, slight low angle, steam catching the light, tumbler rim in the foreground',
    },
    {
      imageSubject: 'A lantern seller in a printed cotton sari, marigold garland over one arm',
      imageAction: 'both hands stringing a line of paper lanterns between two bamboo poles',
      imageLocation: 'the Varanasi ghats at first light, stone steps and moored boats behind her',
      imageFraming: 'medium close-up, slight low angle, an unlit lantern soft in the foreground',
    },
  ],
  motion: [
    {
      imageSubject: 'A wind-farm technician in an orange jumpsuit and work gloves',
      imageAction: 'both gloved hands turning a turbine base valve wheel',
      imageLocation: 'coastal Gujarat wind farm, turbine towers along the shoreline, salt haze over the water',
      imageFraming: 'medium close-up, slight low angle, valve wheel anchoring the foreground',
    },
    {
      imageSubject: 'A white electric car at a charging bay, charge port open',
      imageAction: "a commuter's both hands clicking the charging connector into the port",
      imageLocation: 'a Pune apartment-block basement garage, painted bay lines and numbered pillars',
      imageFraming: 'medium close-up, slight low angle, charging cable curving through the foreground',
    },
    {
      imageSubject: 'A container terminal of stacked containers and gantry cranes over berthed ships',
      imageAction: 'one crane mid-lift, a container suspended over the stack while a spotter signals with both arms',
      imageLocation: 'Nhava Sheva port outside Mumbai, wharf extending to the water line',
      imageFraming: 'true top-down aerial, wide enough that the container rows read as a colour grid',
      imageIsAerial: true,
      imageColourNotes: 'teal and rust-orange containers against grey wharf concrete',
    },
  ],
};

/**
 * Stable pick: the same prompt keeps its scene across refinements (no image
 * churn on refine), while different prompts spread across the library.
 */
export function pickSceneTemplate(category: SceneCategory, seedText: string): ArtDirectedScene {
  const templates = SCENE_TEMPLATES[category];
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  return templates[hash % templates.length];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/data/sceneTemplates.test.ts`
Expected: PASS. If a banned-phrase assertion fails, fix the SCENE (not the test).

- [ ] **Step 5: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/data/sceneTemplates.ts tests/unit/data/sceneTemplates.test.ts
git commit -m "Add curated art-directed scene templates for fallback imagery

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Fallback plan applies the scene templates

**Files:**
- Modify: `App/src/ai/fallbackPlan.ts`
- Test: `tests/unit/ai/fallbackPlan-scenes.test.ts` (new)

**Interfaces:**
- Consumes: `pickSceneTemplate`, `SceneCategory` (Task 4).
- Produces: `fallbackPlan()` output for `website`/`app-screens`/`social-media`/`motion` carries a complete art-directed scene (so the orchestrator's existing `requestHeroImage` generates); `slides` output carries none; the fallback `reasoning` string gains, verbatim: `" Imagery uses a curated art-directed scene."` when a scene was applied.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ai/fallbackPlan-scenes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fallbackPlan } from '../../../App/src/ai/fallbackPlan';

const input = { prompt: 'a rooftop solar campaign', answers: {} };

describe('fallbackPlan scene templates', () => {
  it.each(['website', 'app-screens', 'social-media', 'motion'] as const)('gives %s a complete art-directed scene', (category) => {
    const plan = fallbackPlan({ ...input, category }, 'no key').data;

    expect(plan.imageSubject).toBeTruthy();
    expect(plan.imageAction).toBeTruthy();
    expect(plan.imageLocation).toBeTruthy();
    expect(plan.imageFraming).toBeTruthy();
  });

  it('gives slides no scene', () => {
    const plan = fallbackPlan({ ...input, category: 'slides' }, 'no key').data;

    expect(plan.imageSubject).toBeUndefined();
    expect(plan.imageFraming).toBeUndefined();
  });

  it('says so honestly in the reasoning when a scene is applied', () => {
    expect(fallbackPlan({ ...input, category: 'website' }, 'no key').data.reasoning).toContain('curated art-directed scene');
    expect(fallbackPlan({ ...input, category: 'slides' }, 'no key').data.reasoning).not.toContain('curated art-directed scene');
  });

  it('keeps the same scene for the same prompt (stable across refinements)', () => {
    const a = fallbackPlan({ ...input, category: 'motion' }, 'no key').data;
    const b = fallbackPlan({ ...input, category: 'motion' }, 'no key').data;

    expect(a.imageSubject).toBe(b.imageSubject);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/ai/fallbackPlan-scenes.test.ts`
Expected: FAIL — image fields undefined for all categories.

- [ ] **Step 3: Implement in `App/src/ai/fallbackPlan.ts`**

Add the import:

```ts
import { pickSceneTemplate, type SceneCategory } from '../data/sceneTemplates';
```

In `fallbackPlan`, before `const base: BuildPlan = {`:

```ts
  // Hosted builds have no Claude to author image prompts — a curated,
  // art-direction-compliant scene fills that role (slides excluded by
  // product decision). Stable per prompt so refinements don't churn images.
  const scene = input.category === 'slides' ? undefined : pickSceneTemplate(input.category as SceneCategory, input.prompt || input.category);
```

Inside the `base: BuildPlan` object literal, add `...scene,` on the line immediately after `patternId: PATTERN_BY_CATEGORY[input.category],` — and change the `reasoning` value to:

```ts
    reasoning:
      'No live reasoning available for this request — used a generic on-brand layout for this category instead of AI-authored content.' +
      (scene ? ' Imagery uses a curated art-directed scene.' : ''),
```

- [ ] **Step 4: Run the new test, the pre-existing fallback tests, then the full suite**

Run: `npx vitest run tests/unit/ai`
Expected: PASS — including `fallbackPlan.test.ts` and `schema-plan-fields.test.ts`, which assert fields this change doesn't touch.

Then: `npx vitest run` — all PASS. Also run `npm run test:e2e` once here: the hermetic run now makes the fallback plan attempt an image fetch, which 503s (keys blanked) and must not break any assertion.
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add App/src/ai/fallbackPlan.ts tests/unit/ai/fallbackPlan-scenes.test.ts
git commit -m "Apply curated art-directed scenes to fallback plans

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: README + full local gates

**Files:**
- Modify: `README.md` (hosted-generation section; env-var list updates)

- [ ] **Step 1: Update `README.md`**

(a) In the env-vars section (added by the previous iteration), update the two Gemini lines to document the new defaults:

```markdown
- `GEMINI_IMAGE_MODEL` — Nano image model used by `/api/gemini-image`.
  Default: `gemini-2.5-flash-image`.
- `GEMINI_VIDEO_MODEL` — Veo model used by `/api/gemini-video`.
  Default: `veo-2.0-generate-001` (Veo 2).
```

(b) Replace the paragraph that says the key "is **only** read by a local dev-server proxy … a real deployment of this prototype would need an equivalent hosted endpoint (e.g. a serverless function) — out of scope for this local prototype." with:

```markdown
Keys are read server-side only — never sent to the browser or bundled. Locally
that means the Vite dev-server proxies (`App/aiServerPlugin.ts`,
`App/geminiImageProxy.ts`, `App/geminiVideoProxy.ts`). On the hosted Vercel
deployment, `api/gemini-image.ts` and `api/gemini-video.ts` serve the same
`/api/...` paths as zero-dependency serverless functions sharing the same cores
(`App/server/`): Nano images and Veo 2 motion work on the hosted site (fallback
builds author their image prompts from the curated, art-direction-enforced
scene library in `App/src/data/sceneTemplates.ts`). Claude is local-only.
Hosted guards: POST-only, same-origin, 2000-char prompt cap — the Google
account's spending cap is the cost ceiling. Hosted env vars are set via
`vercel env add` (`GEMINI_API_KEY` required; model vars optional).
```

- [ ] **Step 2: Run all four gates**

Run: `npm run app:build && npm run lint && npx vitest run && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document hosted Google media generation

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: Vercel env (user-assisted), deploy, live verification

This task is run by the CONTROLLER (not a fresh subagent) because it needs user
approval for the env step and spends real Google quota.

- [ ] **Step 1: Set the hosted env var (user approval required first)**

Ask the user to approve running (value flows shell-to-shell, never displayed):

```bash
grep '^GEMINI_API_KEY=' .env | cut -d= -f2- | tr -d '\n' | vercel env add GEMINI_API_KEY production
```

(Model vars are NOT set — the code defaults are the product decision. If the
user prefers, they run the command themselves.)

- [ ] **Step 2: Deploy**

```bash
npm run app:build && vercel build --prod --yes && vercel deploy --prebuilt --prod --yes
```

Then verify the functions shipped: `vercel inspect <deployment-url>` should list 2 functions.

- [ ] **Step 3: Live verify hosted images (real spend)**

Drive https://reliance-builder.vercel.app with a Playwright script from the scratchpad (same technique as the previous iteration's live verify): run a website build ("A campaign page for rooftop solar"), wait through the guided flow, and confirm a real generated image renders in the preview (screenshot to scratchpad). Then run an app-screens or social build to confirm a second category. Check the browser console: no JS errors; `/api/gemini-image` returns 200.

- [ ] **Step 4: Live verify hosted Veo 2 motion (real spend, minutes)**

Drive a motion build ("A product reveal for our new energy app"), click "Generate video", poll patiently up to 6 minutes, and confirm a playable video renders (screenshot). If `extractVideoUri` misses Veo 2's real response shape, the error carries the raw operation JSON — correct the candidate paths in `App/server/geminiVideoCore.ts`, add the shape to the core's unit test, redeploy, retry once.

(The spec's local Veo check is satisfied structurally: dev proxy and hosted function share `DEFAULT_VIDEO_MODEL` from the same core, and the default is unit-tested — no second billable video needed.)

- [ ] **Step 5: Record results + final commit if the core changed**

If Step 4 changed `geminiVideoCore.ts`, commit it with its test update. Otherwise nothing to commit here.

---

## Acceptance criteria traceability

| Spec criterion | Where satisfied |
|---|---|
| Hosted Nano images for website/app-screens/social/motion | Tasks 1, 3, 4, 5; verified in Task 7 |
| Veo 2 default locally + hosted; hosted Generate video works | Tasks 2, 3; verified in Task 7 |
| Art-direction-governed prompts, test-enforced | Task 4 (+ existing assembleImagePrompt baseline) |
| Slides unchanged; media never blocks | Task 5 (slides excluded; existing degrade paths) |
| Local dev unchanged except the two model defaults | Tasks 1, 2 (thin adapters, same contracts) |
| All four gates pass | Task 6 |

