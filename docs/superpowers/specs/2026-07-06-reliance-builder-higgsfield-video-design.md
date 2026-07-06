# Reliance Builder: Higgsfield video generation for the motion category

## Problem

The `motion` category currently only shows a static, hand-built preview (a spinner
pulse + `motionConcept`/`motionDescription` text) describing an abstract UI
micro-interaction. There is no real generated video. `Conversation/ART_DIRECTION_RELIANCE_v4.md`
already gives us a rich, working recipe for art-directed *photographic* scenes
(subject/action/location/framing), reused today to generate a Nano Banana hero image
for every build including motion.

Higgsfield (`https://higgsfield.ai`) is not a REST API — it's a CLI tool (`higgsfield`
binary) requiring local installation and interactive `higgsfield auth login` (short-lived
session tokens; no documented non-interactive API-key path). Its `seedance_2_0` model is
the "default all-purpose serious video" pick: cinematic, photographic, motion-heavy —
a good match for the art-directed scene fields we already have, not for an abstract UI
loader/transition concept.

## Goal

Add an on-demand "Generate video" action to the `motion` category's preview that
animates the *same art-directed scene* already used for the hero image (reusing
`imageSubject`/`imageAction`/`imageLocation`/`imageFraming`), using the existing hero
image as the video's starting frame for visual continuity, via Higgsfield's Seedance 2.0
model.

## Non-goals

- No REST API client — Higgsfield is invoked via CLI subprocess (`child_process`), no
  new npm dependency.
- No change to `PLAN_TOOL`/Claude's authored fields — the video prompt is assembled from
  the same `imageSubject`/`imageAction`/`imageLocation`/`imageFraming`/`imageIsAerial`/
  `imageColourNotes` fields already authored for the hero image (see the image-generation
  spec, `2026-07-06-reliance-builder-image-generation-design.md`).
- No automatic video generation with every plan (unlike the hero image) — this is a
  separate, on-demand, per-component action, since Seedance 2.0 can take minutes.
- No handling of other Higgsfield models, Marketing Studio, 3D, or audio — out of scope.
- No automated CLI installation or `higgsfield auth login` — these remain manual,
  one-time developer setup steps (documented in README, matching the existing
  `GOOGLE_ACCESS_TOKEN` / `gcloud auth print-access-token` precedent already in this
  project's `.env` comments).

## Design

### 1. New dev-server proxy: `App/higgsfieldVideoProxy.ts`

A Vite plugin exposing `POST /api/higgsfield-video`, structurally parallel to
`geminiImageProxy.ts` but invoking a CLI subprocess instead of `fetch`:

- Request body: `{ prompt: string; startImageDataUrl?: string }`.
- If `startImageDataUrl` is present, decode its base64 payload and write it to a temp
  file (`os.tmpdir()` + a random filename with the correct extension from the data
  URL's MIME type), since the CLI's `--start-image` flag takes a local file path or
  upload UUID, not raw base64.
- Run the CLI via Node's `child_process.execFile` (not `exec`, to avoid shell
  interpretation of the prompt text) with args:
  ```
  higgsfield generate create seedance_2_0 --prompt "<prompt>" [--start-image <tempFilePath>] --wait --json
  ```
- Set `execFile`'s own `timeout` option generously (e.g. 25 minutes) — longer than
  Higgsfield's own default `--wait-timeout` (10m, and up to 20m is documented as
  supported), so the CLI's own timeout fires first with a real result rather than Node
  killing the process prematurely.
- Delete the temp file in a `finally` block regardless of success/failure.
- Parse the CLI's `--json` stdout output to extract the result video URL. **The exact
  JSON shape of a completed job is not confirmed from documentation alone** — the
  skill doc says `--wait --json` prints "the final job object array" but doesn't show
  a literal example. The implementation task must run one real CLI call, inspect the
  actual JSON structure, and extract the URL field from whatever shape is observed
  (most likely something like `[{ id, status, output_url }]` or nested under a
  `result`/`output` key) — this is called out explicitly so the implementer verifies
  against a live response rather than guessing a field name silently.
- Missing/misconfigured CLI: if `execFile('higgsfield', ...)` fails with an
  `ENOENT`-style "command not found" error, or the CLI's own stderr/stdout indicates
  `Not authenticated`/`Session expired` (per the skill doc's documented error strings),
  return a `503` with a message telling the developer to install the CLI and/or run
  `higgsfield auth login` — mirroring `geminiImageProxy.ts`'s missing-key handling
  pattern, never a bare stack trace.

### 2. Client wiring: `App/src/ai/client.ts`

A new exported function, separate from `requestPlan` (since this is on-demand, not
automatic):

```ts
export async function requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }>
```

Reuses the existing (currently private) `assembleImagePrompt` helper to build the same
prompt used for the hero image. Posts `{ prompt, startImageDataUrl: plan.heroImage }` to
`/api/higgsfield-video`. Returns `{ error }` (never throws) on any failure, matching the
existing tolerant pattern in this file.

### 3. UI: `App/src/components/previews/MotionPreview.tsx`

This is a deliberate architectural departure from the rest of this app: every other
preview component is purely presentational (`plan` in, JSX out), with all async
orchestration living in `App.tsx`. `MotionPreview` gains its own local state
(`isGeneratingVideo`, `videoUrl`, `videoError`) and calls `requestMotionVideo` itself,
because this action is self-contained, optional, and irrelevant to the rest of the
app's state machine — lifting it up to `App.tsx`/`BuildRequest` would mean threading a
mostly-unused field through every other screen for no benefit.

- A "Generate video" button, disabled when `imageSubject`/`imageAction`/`imageLocation`/
  `imageFraming` are any missing (e.g. the deterministic fallback plan was used, which
  never populates them — same guard `requestHeroImage` already uses).
- While generating: button shows a loading state with label text like "Generating
  video… this can take a few minutes" (matching this project's existing busy-label
  copy style).
- On success: renders an HTML5 `<video src={videoUrl} controls autoPlay loop muted>` in
  place of (or alongside — implementer's call, scoped small either way) the existing
  spinner-pulse placeholder.
- On error: shows the returned error message inline (e.g. "Run `higgsfield auth login`
  in a terminal, then try again"), never a silent failure.

## Testing

No automated test suite exists in this project. Verification is manual: with the
`higgsfield` CLI installed and authenticated, submit a `motion` build, click "Generate
video", and confirm a real video renders using the same scene as the hero image. Also
manually verify the missing-CLI and not-authenticated error paths surface their
messages instead of hanging or crashing.
