# Higgsfield video generation (motion category) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand "Generate video" action to the `motion` category preview that animates the same art-directed scene already used for the hero image, via Higgsfield's Seedance 2.0 model, using the hero image as the video's starting frame.

**Architecture:** A new dev-server proxy shells out to the `higgsfield` CLI (via Node's `child_process`, since Higgsfield has no REST API) instead of using `fetch`. The client reuses the existing `assembleImagePrompt` helper (already built for the hero image) to build the video prompt, and posts it plus the existing hero image (written to a temp file server-side) to the new proxy. `MotionPreview.tsx` owns this entirely itself — its own local state and API call — since it's an on-demand, self-contained action unrelated to the rest of the app's build state machine.

**Tech Stack:** TypeScript, Vite dev-server plugin, Node `child_process.execFile` (no new npm dependency), the `higgsfield` CLI (already installed on this machine, per the design spec's non-goals: CLI installation and `higgsfield auth login` remain manual, one-time developer setup).

## Global Constraints

- No REST API client for Higgsfield — CLI subprocess only, no new npm dependency.
- No changes to `PLAN_TOOL`/Claude's authored fields — reuse the existing `imageSubject`/`imageAction`/`imageLocation`/`imageFraming`/`imageIsAerial`/`imageColourNotes` fields and the existing `assembleImagePrompt` function in `App/src/ai/client.ts`.
- No automatic video generation with every plan — on-demand only, triggered by a button in `MotionPreview.tsx`.
- `component_test` has no automated test runner (no vitest/jest) — verification is manual, via a live `higgsfield` CLI call (requires `higgsfield auth login` to have been run in a terminal first) and the running dev server.
- The exact JSON shape of a completed `higgsfield generate create --wait --json` job is **not confirmed from documentation alone** — Task 1's verification step requires inspecting a real response and adjusting the URL-extraction logic if the shapes tried don't match, rather than assuming success silently.
- Files under `.env*` patterns must not be Read or Edited — not relevant to this plan (no new env vars needed; Higgsfield auth is CLI-session-based, not env-var-based).

---

### Task 1: Higgsfield video dev-server proxy

**Files:**
- Create: `App/higgsfieldVideoProxy.ts`
- Modify: `App/vite.config.ts`

**Interfaces:**
- Produces: `higgsfieldVideoProxy(): Plugin` (exported from `App/higgsfieldVideoProxy.ts`), registered in `App/vite.config.ts`. Exposes `POST /api/higgsfield-video` accepting `{ prompt: string; startImageDataUrl?: string }` and returning `{ result: { videoUrl: string } }` on success or `{ error: string }` (non-2xx) on failure — consumed by `App/src/ai/client.ts` in Task 2.

- [ ] **Step 1: Create `App/higgsfieldVideoProxy.ts`**

```ts
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

/**
 * Dev-only local proxy to Higgsfield's video generation, via the `higgsfield`
 * CLI (there is no REST API). Requires the CLI installed and `higgsfield auth
 * login` already run in a terminal; this proxy does not manage installation
 * or authentication.
 *
 * The client posts { prompt: string, startImageDataUrl?: string } to
 * /api/higgsfield-video; this middleware shells out to `higgsfield generate
 * create seedance_2_0 ... --wait --json`, optionally passing the decoded
 * startImageDataUrl as a temp-file --start-image, and returns the resulting
 * video URL. Errors (CLI missing, not authenticated, generation failure) come
 * back as a JSON error the client already treats as "no video" — it never
 * throws, the UI just shows the error message.
 *
 * This only runs under `vite dev` (App/vite.config.ts), same constraint as
 * aiServerPlugin.ts's Claude proxy and geminiImageProxy.ts.
 */

const execFileAsync = promisify(execFile);

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

/**
 * Decode a data URL (e.g. "data:image/jpeg;base64,...") to a temp file path.
 * Higgsfield's --start-image flag takes a local file path or upload UUID, not
 * raw base64, so the in-memory hero image has to be written to disk first.
 */
async function writeDataUrlToTempFile(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error('startImageDataUrl is not a recognized data URL');
  const [, ext, base64] = match;
  const filePath = path.join(tmpdir(), `higgsfield-start-${randomUUID()}.${ext}`);
  await writeFile(filePath, Buffer.from(base64, 'base64'));
  return filePath;
}

/**
 * The exact JSON shape of a completed job was not confirmed from
 * documentation alone. This tries several plausible shapes; if none match,
 * the raw JSON is included in the thrown error so a real response can be
 * inspected and this function adjusted, rather than failing silently.
 */
function extractVideoUrl(jobResult: unknown): string {
  const job = Array.isArray(jobResult) ? jobResult[0] : jobResult;
  const j = job as Record<string, any> | null | undefined;
  const candidates = [j?.output_url, j?.output?.url, j?.result?.url, j?.url, j?.results?.[0]?.url];
  const found = candidates.find((c) => typeof c === 'string' && c.length > 0);
  if (!found) {
    throw new Error(`Could not find a video URL in the Higgsfield response. Raw job: ${JSON.stringify(jobResult).slice(0, 500)}`);
  }
  return found;
}

export function higgsfieldVideoProxy(): Plugin {
  return {
    name: 'reliance-builder-higgsfield-video-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/higgsfield-video', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'POST only' });
          return;
        }

        let tempFilePath: string | undefined;

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          if (body.startImageDataUrl) {
            tempFilePath = await writeDataUrlToTempFile(body.startImageDataUrl);
          }

          const args = ['generate', 'create', 'seedance_2_0', '--prompt', body.prompt];
          if (tempFilePath) args.push('--start-image', tempFilePath);
          args.push('--wait', '--json');

          const { stdout } = await execFileAsync('higgsfield', args, {
            timeout: 25 * 60 * 1000,
            maxBuffer: 10 * 1024 * 1024,
          });

          const jobResult = JSON.parse(stdout);
          const videoUrl = extractVideoUrl(jobResult);
          sendJson(res, 200, { result: { videoUrl } });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error calling Higgsfield';

          if (message.includes('ENOENT')) {
            sendJson(res, 503, {
              error:
                'The higgsfield CLI is not installed. Install it: curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh',
            });
            return;
          }

          if (message.includes('Session expired') || message.includes('Not authenticated')) {
            sendJson(res, 503, {
              error: 'Higgsfield session expired or not authenticated. Run `higgsfield auth login` in a terminal, then try again.',
            });
            return;
          }

          sendJson(res, 502, { error: message.slice(0, 500) });
        } finally {
          if (tempFilePath) {
            await unlink(tempFilePath).catch(() => {});
          }
        }
      });
    },
  };
}
```

- [ ] **Step 2: Modify `App/vite.config.ts`**

The file currently has `import { geminiImageProxy } from './geminiImageProxy';` as its last import line. Add one new line directly after it, without changing the existing line:

```ts
import { higgsfieldVideoProxy } from './higgsfieldVideoProxy';
```

Then, separately, replace:

```ts
    plugins: [
      oneui({ ...relianceOnlyConfig, cacheDir: relianceCacheDir }),
      relianceTokenCoverage(path.join(relianceCacheDir, 'brands/reliance')),
      claudeApiProxy(),
      geminiImageProxy(),
    ],
```

with:

```ts
    plugins: [
      oneui({ ...relianceOnlyConfig, cacheDir: relianceCacheDir }),
      relianceTokenCoverage(path.join(relianceCacheDir, 'brands/reliance')),
      claudeApiProxy(),
      geminiImageProxy(),
      higgsfieldVideoProxy(),
    ],
```

- [ ] **Step 3: Verify `higgsfield auth login` has been run**

Run: `higgsfield account status`
Expected: prints real account details (NOT `Error: Not authenticated.`). If it prints "Not authenticated", stop and ask the user to run `higgsfield auth login` in their own terminal before continuing — this step cannot be completed non-interactively.

- [ ] **Step 4: Verify the proxy with a real (short, cheap) call first**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Then:

```bash
curl -s -X POST http://localhost:5173/api/higgsfield-video \
  -H 'content-type: application/json' \
  -d '{"prompt":"a farmer in a blue shirt tending to rice crops in a field in Punjab, eye level shot, warm golden directional light, cinematic documentary feel"}'
```

(Adjust the port if the dev server's log shows a different one. This call has no `--start-image`, is expected to take up to several minutes given `--wait`, and will incur real Higgsfield usage cost — run it once, not repeatedly.)

Expected: eventually `{"result":{"videoUrl":"https://..."}}`. If instead the response is `{"error":"Could not find a video URL in the Higgsfield response. Raw job: ..."}`, read the raw JSON included in that error message, identify the actual field holding the video URL, and update `extractVideoUrl`'s `candidates` array in `App/higgsfieldVideoProxy.ts` to include that real field path — then re-run this same curl command to confirm it now succeeds. Do not guess a fix without seeing the raw JSON first.

- [ ] **Step 5: Stop the dev server**

- [ ] **Step 6: Commit**

```bash
git add App/higgsfieldVideoProxy.ts App/vite.config.ts
git commit -m "Add Higgsfield video-generation dev-server proxy"
```

---

### Task 2: Client wiring — request the video on demand

**Files:**
- Modify: `App/src/ai/client.ts`

**Interfaces:**
- Consumes: `POST /api/higgsfield-video` from Task 1; the existing (unexported, same-file) `assembleImagePrompt` function.
- Produces: `requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }>` — consumed by `MotionPreview.tsx` in Task 3.

- [ ] **Step 1: Add `requestMotionVideo`**

In `App/src/ai/client.ts`, add this new exported function at the end of the file, after `requestPlan`:

```ts
export async function requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }> {
  if (!plan.imageSubject || !plan.imageAction || !plan.imageLocation || !plan.imageFraming) {
    return { error: 'This build has no art-directed scene to animate yet.' };
  }

  try {
    const res = await fetch('/api/higgsfield-video', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: assembleImagePrompt(plan), startImageDataUrl: plan.heroImage }),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` };
    return { videoUrl: typeof json.result?.videoUrl === 'string' ? json.result.videoUrl : undefined };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error reaching the local Higgsfield proxy' };
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p App/tsconfig.json`
Expected: the same pre-existing errors as before this change (in `client.ts:62`, `client.ts:94`, `oneuiRegistry.ts:11`, `tokenRecommendations.ts:54,60,63,64,65,67` — these predate this plan and are unrelated to `requestMotionVideo`), and no new error referencing `requestMotionVideo`.

- [ ] **Step 3: Commit**

```bash
git add App/src/ai/client.ts
git commit -m "Add requestMotionVideo client function for on-demand Higgsfield video generation"
```

---

### Task 3: MotionPreview UI — the "Generate video" button

**Files:**
- Modify: `App/src/components/previews/MotionPreview.tsx`

**Interfaces:**
- Consumes: `requestMotionVideo` from `../../ai/client` (Task 2).
- Produces: no new exports — this is a leaf UI component. `MotionPreview`'s own props (`plan`, `feelingAnswerId`) are unchanged.

- [ ] **Step 1: Replace the whole file**

```tsx
import { useEffect, useState } from 'react';
import { Container, Text, CircularProgressIndicator, Image, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { pickMotionTokens } from '../../data/motionMapping';
import { requestMotionVideo } from '../../ai/client';

type VideoState = { status: 'idle' | 'generating' | 'done' | 'error'; videoUrl?: string; error?: string };

export function MotionPreview({ plan, feelingAnswerId }: { plan: BuildPlan; feelingAnswerId: string | undefined }) {
  const { duration, easing } = pickMotionTokens(feelingAnswerId);
  const [pulsed, setPulsed] = useState(false);
  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });

  useEffect(() => {
    // Continuous decorative animation — skip it entirely for users who've
    // asked their OS to reduce motion, rather than just shortening it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPulsed((p) => !p), 1400);
    return () => clearInterval(id);
  }, []);

  const canGenerateVideo = !!(plan.imageSubject && plan.imageAction && plan.imageLocation && plan.imageFraming);

  const handleGenerateVideo = async () => {
    setVideoState({ status: 'generating' });
    const result = await requestMotionVideo(plan);
    if (result.videoUrl) {
      setVideoState({ status: 'done', videoUrl: result.videoUrl });
    } else {
      setVideoState({ status: 'error', error: result.error || 'Video generation failed.' });
    }
  };

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      align="center"
      justify="center"
      gap="4"
      width="full"
      style={{ height: '100%' }}
    >
      {videoState.status === 'done' && videoState.videoUrl ? (
        <video
          src={videoState.videoUrl}
          controls
          autoPlay
          loop
          muted
          style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 'var(--Shape-3)' }}
        />
      ) : (
        <>
          {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="1:1" width={120} />}
          <CircularProgressIndicator variant="indeterminate" size="XL" aria-label="Motion preview" />
        </>
      )}
      <div
        style={{
          width: pulsed ? 96 : 56,
          height: 8,
          borderRadius: 'var(--Shape-Pill)',
          background: 'var(--Primary-Bold)',
          transition: `width ${duration ? `var(--${duration})` : '200ms'} ${easing ? `var(--${easing})` : 'ease'}`,
        }}
      />
      <Container variant="full-bleed" layout="flex" direction="column" gap="1" align="center" style={{ maxWidth: 320 }}>
        <Text variant="label" size="M" weight="high" textAlign="center">
          {plan.motionConcept || 'Motion concept'}
        </Text>
        <Text variant="body" size="S" appearance="neutral" textAlign="center">
          {plan.motionDescription || 'Live motion, not a static mock.'}
          {duration ? ` Uses Reliance's ${duration}${easing ? ` / ${easing}` : ''}.` : ''}
        </Text>
      </Container>

      {canGenerateVideo && videoState.status !== 'done' && (
        <Button
          attention="medium"
          size="m"
          onClick={handleGenerateVideo}
          disabled={videoState.status === 'generating'}
          loading={videoState.status === 'generating'}
        >
          {videoState.status === 'generating' ? 'Generating video… this can take a few minutes' : 'Generate video'}
        </Button>
      )}

      {videoState.status === 'error' && (
        <Text variant="body" size="S" appearance="negative" textAlign="center">
          {videoState.error}
        </Text>
      )}
    </Container>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p App/tsconfig.json`
Expected: same pre-existing errors as Task 2 Step 2, no new error referencing `MotionPreview.tsx`.

- [ ] **Step 3: Verify visually**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Open the printed local URL in a browser, submit a "motion" build (the start screen has a quick-action button for it), and once the build finishes:
- Confirm the "Generate video" button is present (assuming Claude populated the image-prompt fields — check the "Build details" panel if unsure).
- Click it, confirm the button switches to "Generating video… this can take a few minutes" and stays disabled while waiting.
- After it resolves, confirm either a playing `<video>` appears (success) or an inline error message appears (failure) — never a silent hang or crash.

If you cannot drive an actual browser in this environment, use the DevTools-console-equivalent approach from earlier tasks in this project's history: call `requestMotionVideo` directly against a real plan object fetched via `requestPlan`, e.g. via a small Node script using Vite's `ssrLoadModule`, and confirm it returns `{ videoUrl }` or a clear `{ error }` — not an unhandled exception.

- [ ] **Step 4: Stop the dev server**

- [ ] **Step 5: Commit**

```bash
git add App/src/components/previews/MotionPreview.tsx
git commit -m "Add on-demand Generate video button to the motion preview"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers spec §1 (the proxy); Task 2 covers spec §2 (client
  wiring); Task 3 covers spec §3 (UI) and §4 (error handling — the button's error state
  surfaces the proxy's messages directly, including the CLI-missing and
  not-authenticated cases from Task 1).
- **No placeholders:** every step has literal code, exact commands, and concrete
  expected output; the one genuinely open question (exact job JSON shape) is handled
  with real fallback logic (multiple candidate field paths plus a raw-JSON error) and
  an explicit live-verification step, not a guess presented as fact.
- **Type consistency:** `requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }>` is defined once in Task 2 and consumed by that exact signature in Task 3's `handleGenerateVideo`. `higgsfieldVideoProxy` is defined once in Task 1 and imported by that exact name in `vite.config.ts`.
