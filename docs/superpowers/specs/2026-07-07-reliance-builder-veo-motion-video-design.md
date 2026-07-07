# Reliance Builder: replace Higgsfield with Google Veo for motion video generation

## Problem

`App/src/components/previews/MotionPreview.tsx`'s only real deliverable for a "motion"
build — a "Generate video" button — calls `requestMotionVideo()` in
`App/src/ai/client.ts`, which posts to `/api/higgsfield-video`. That endpoint
(`App/higgsfieldVideoProxy.ts`) shells out to the `higgsfield` CLI, which requires the
CLI installed separately and `higgsfield auth login` already run in a terminal — an
external dependency this project doesn't otherwise have (every other AI capability here
goes through either the Anthropic API or the Gemini API, both reached over plain HTTPS
with an API key in `.env`, no CLI, no separate auth step).

## Goal

Replace the Higgsfield CLI proxy with a Google Veo-based one, reached the same way the
existing Gemini image generation already is (`GEMINI_API_KEY` in the repo-root `.env`,
a plain HTTPS call, no CLI). The client-facing contract
(`requestMotionVideo(plan): Promise<{ videoUrl?: string; error?: string }>`) and the
`MotionPreview.tsx` UI (button, states, `<video>` playback) stay exactly as they are —
this is a backend provider swap, not a UX change.

## Non-goals

- **No change to when/how video generation is triggered.** It stays an opt-in
  "Generate video" button, gated on the same `imageSubject`/`imageAction`/
  `imageLocation`/`imageFraming` fields already required today. No automatic
  generation, no new guided question.
- **No start/poll split with client-visible progress.** The proxy call stays a single
  blocking request from the client's perspective, exactly like the Higgsfield flow's
  existing `--wait` behavior — the proxy itself polls Veo's long-running operation
  internally and only responds once the video is ready (or has failed). Veo jobs run in
  the tens of seconds to a couple of minutes, well inside Higgsfield's existing 25-minute
  timeout budget, so there's no evidence a blocking call is a real problem worth the
  added complexity of a two-endpoint polling UI.
- **No new local file-serving route.** The finished video is downloaded server-side and
  returned to the client as a `data:video/mp4;base64,...` URL, mirroring
  `geminiImageProxy.ts`'s existing inline-data response — not saved to disk and served
  from a new static route.
- **No aspect ratio / duration guided question.** Uses Veo's defaults; not configurable
  per build.
- **No unit tests for the proxy itself.** Consistent with every existing dev-only proxy
  in this codebase (`aiServerPlugin.ts`, `geminiImageProxy.ts`, the outgoing
  `higgsfieldVideoProxy.ts`) — none have unit tests, since they're thin wrappers around
  real external network calls. Verified live instead (see Testing).

## Design

### Files

- **Delete:** `App/higgsfieldVideoProxy.ts`
- **Create:** `App/geminiVideoProxy.ts`
- **Modify:** `App/vite.config.ts` — swap the plugin import/registration, add
  `GEMINI_VIDEO_MODEL` to the env passthrough
- **Modify:** `App/src/ai/client.ts` — `requestMotionVideo()` posts to
  `/api/gemini-video` instead of `/api/higgsfield-video`
- **Unchanged:** `README.md` — it documents `ANTHROPIC_API_KEY` setup but never
  mentioned Higgsfield, `GEMINI_API_KEY`, or `GEMINI_IMAGE_MODEL` in the first place, so
  there's nothing there to update
- **Unchanged:** `App/src/components/previews/MotionPreview.tsx` — same states, same
  button, same `<video>` tag

### `App/geminiVideoProxy.ts`

Same dev-only Vite-plugin shape as `geminiImageProxy.ts` — `configureServer` middleware
on `/api/gemini-video`, reading `GEMINI_API_KEY`/`GEMINI_VIDEO_MODEL` from
`process.env`, 503 if either is unset. Request body is unchanged from today:
`{ prompt: string, startImageDataUrl?: string }`.

Flow:

1. **Start the job** — `POST /v1beta/models/{GEMINI_VIDEO_MODEL}:predictLongRunning`
   with `x-goog-api-key`, body:
   ```json
   {
     "instances": [{
       "prompt": "<prompt>",
       "image": { "bytesBase64Encoded": "<base64>", "mimeType": "<mime>" }
     }]
   }
   ```
   The `image` field is included only when `startImageDataUrl` was provided — parsed
   directly from the existing data URL (same regex `geminiImageProxy.ts` already uses
   for the reverse direction), with no temp file. This is simpler than the outgoing
   Higgsfield flow, which had to write the hero image to a temp file for the CLI's
   `--start-image` flag and clean it up afterward — Veo takes the image inline in the
   same request, so that whole `writeDataUrlToTempFile`/`unlink` step disappears
   entirely.
   Response: `{ name: "operations/..." }`.

2. **Poll until done** — `GET /v1beta/{operation.name}` with `x-goog-api-key`, every 5
   seconds, until the response's `done` field is `true`, up to a 5-minute overall
   timeout (reject with a clear timeout error past that).

3. **Extract the finished video's file URI** — the exact JSON shape of a completed Veo
   operation isn't fully certain from documentation alone (the same situation
   `higgsfieldVideoProxy.ts`'s own `extractVideoUrl()` already documents for Higgsfield's
   job result), so this tries several plausible shapes and throws with the raw operation
   JSON included if none match:
   ```ts
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
   ```

4. **Download the video** — `GET` the extracted URI with `x-goog-api-key` attached,
   read the response as an `ArrayBuffer`, base64-encode it, and respond
   `{ result: { videoUrl: "data:video/mp4;base64,<...>" } }` — same response shape the
   client already expects today.

Error handling, matching the existing "never throw to the client, return a JSON error
the UI already renders" convention every proxy in this codebase follows:
- Missing `GEMINI_API_KEY`/`GEMINI_VIDEO_MODEL` → 503, "add these to `.env`"
- `predictLongRunning` call fails (bad request, quota, model not enabled for the key) →
  502 with the API's error text
- Polling exceeds the 5-minute timeout → 504, "video generation timed out"
- Operation completes but its own result reports an error → 502 with that error surfaced
- File download step fails → 502 with the failure reason

### `App/vite.config.ts`

```ts
import { geminiVideoProxy } from './geminiVideoProxy';
// ...
if (env.GEMINI_VIDEO_MODEL) process.env.GEMINI_VIDEO_MODEL = env.GEMINI_VIDEO_MODEL;
// ...
plugins: [
  oneui({ ...relianceOnlyConfig, cacheDir: relianceCacheDir }),
  relianceTokenCoverage(path.join(relianceCacheDir, 'brands/reliance')),
  claudeApiProxy(),
  geminiImageProxy(),
  geminiVideoProxy(),
],
```

### `App/src/ai/client.ts`

Only the URL changes in `requestMotionVideo()`:

```ts
const res = await fetch('/api/gemini-video', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt: assembleImagePrompt(plan), startImageDataUrl: plan.heroImage }),
});
```

Everything else in that function (the guard clause, response parsing, return shape) is
unchanged.

### Testing

- No unit tests for `geminiVideoProxy.ts` itself (see Non-goals).
- After implementation, live verification with Playwright against the running dev
  server: drive a real "motion" build through the guided flow (so `imageSubject`/
  `imageAction`/`imageLocation`/`imageFraming` are populated), click "Generate video,"
  wait for the real Veo call to complete (expect a genuine wait of up to a couple of
  minutes — this is a live external call, not something to fake or shortcut), and
  confirm a real, playable video renders with no console errors. If the exact Veo
  response shape differs from the guessed candidates in `extractVideoUri()`, the
  resulting error will include the raw operation JSON, which is used to correct the
  parsing — the same iterative "confirm against a real response" approach already used
  for `higgsfieldVideoProxy.ts`'s equivalent function and for the `slides` deck array
  bug found this session.
