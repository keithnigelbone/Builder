# Reliance Builder: hosted Google media generation (Nano images + Veo 2 motion)

## Problem

The deployed Vercel site (https://reliance-builder.vercel.app) runs the deterministic
fallback path with no media: the Gemini/Veo proxies are dev-server-only Vite middleware,
and the fallback plan authors no image-prompt fields, so even hosted endpoints would have
nothing to generate from. Locally, motion defaults to Veo 3, which the product decision
now pins to Veo 2.

## Goal

Image generation (Nano) works on the hosted site for **website, app screens, social
media, and motion** builds, and motion video generation uses **Veo 2** — with every
generated asset governed by the art-direction rules
(`Conversation/ART_DIRECTION_RELIANCE_v4.md`, encoded in `App/src/ai/artDirection.ts`),
exactly as Claude-authored scenes are locally.

## Decisions locked during brainstorming

- **Target:** the hosted Vercel site (plus local, unchanged).
- **Scope:** Google-only on hosted. Claude is NOT ported; hosted copy stays the
  deterministic fallback content. Curated scene templates author the image prompts.
- **Approach:** Vercel serverless functions bundled locally via the existing
  Build-Output (`vercel build` → `--prebuilt`) deploy — never `npm install` on Vercel
  (the `@jds4` `file:` tarballs cannot resolve there).
- **Models:** images `gemini-2.5-flash-image` (Nano) default; video
  `veo-2.0-generate-001` (Veo 2) default. Both env-overridable.
- **Slides are excluded** from template-driven imagery (per the requested category
  list). A Claude-authored slides build locally still gets imagery as today.

## Non-goals

- No Anthropic/Claude on the hosted site; no critique pass there.
- No auth/passcode UI. Abuse guards are POST-only + same-origin + prompt-length cap;
  the Google spending cap is the accepted cost ceiling (observed working: the live
  run 429'd against it).
- No client routing changes — the client already posts to `/api/gemini-image` and
  `/api/gemini-video`; hosted functions answer the same paths the Vite proxies answer
  in dev.
- No change to the "media never blocks the preview" contract or to slides/e2e behavior
  (the hermetic e2e blanks keys → image fetch 503s → identical assertions).
- `.env` is never read or displayed by tooling. Vercel env values are piped
  shell-side with explicit user approval at that step.

## Design

### 1. Shared Google cores (`App/server/`)

Extract the pure request/parse logic out of the Vite middleware into two dependency-free
modules usable from both runtimes (Vite plugin under Node, Vercel function under
Node) — plain `fetch`, no Vite/HTTP imports:

- **`App/server/geminiImageCore.ts`**
  - `const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image'`
  - `generateImage(apiKey: string, model: string, prompt: string): Promise<{ ok: true; dataUrl: string } | { ok: false; status: number; error: string }>`
    — the `generateContent` call + inlineData parse currently in
    `App/geminiImageProxy.ts`, returning results instead of writing responses.
- **`App/server/geminiVideoCore.ts`**
  - `const DEFAULT_VIDEO_MODEL = 'veo-2.0-generate-001'`
  - `generateVideo(apiKey: string, model: string, prompt: string, startImageDataUrl?: string): Promise<{ ok: true; videoUrl: string } | { ok: false; status: number; error: string }>`
    — predictLongRunning → 5s poll → 5-min cap → download → data URL, i.e. the body of
    `App/geminiVideoProxy.ts` incl. `extractVideoUri`, returning results.

`App/geminiImageProxy.ts` / `App/geminiVideoProxy.ts` become thin adapters: read body,
read env (image model now **defaults** instead of 503ing when unset; video default
changes to Veo 2), call the core, `sendJson` the result. Client-visible contracts are
unchanged.

### 2. Vercel functions (`api/`)

- **`api/gemini-image.ts`** and **`api/gemini-video.ts`** — Vercel Node functions
  (`export default function handler(req, res)`), importing only their core module.
  Behavior: 405 on non-POST; guards (below); env via `process.env` (`GEMINI_API_KEY`
  required → 503 with a clear message; models default from the cores); call core;
  respond with the same `{ result }` / `{ error }` shapes the client parses today.
- **Guards (both functions):** reject when `prompt` missing, non-string, or
  > 2000 chars (400); same-origin check — when an `Origin` or `Referer` header is
  present, its host must match the request's `Host` (403 otherwise; requests with
  neither header pass, since the app's own fetches are same-origin). Honest limits
  noted in code: origin headers are spoofable by non-browser clients; the Google
  spending cap is the real ceiling.
- **`api/gemini-video.ts` `maxDuration`:** export `config = { maxDuration: 300 }` so
  the poll loop fits within the function limit (Veo jobs run tens of seconds to
  minutes). If the plan's Vercel tier caps lower, the function's own 5-minute
  deadline still returns a clean 504 JSON before a platform kill where possible.
- **Bundling reality check:** `vercel build` detects `api/*.ts` and bundles each
  function (esbuild) with its relative imports — no package installation needed for
  zero-external-dep code. If bundling fails on this repo's config in practice, the
  fallback is inlining the core into each function file (accepting duplication);
  the plan treats this as a checkpoint, not a surprise.

### 3. Curated scene library (`App/src/data/sceneTemplates.ts`)

- `export type ArtDirectedScene = Pick<BuildPlan, 'imageSubject' | 'imageAction' | 'imageLocation' | 'imageFraming' | 'imageIsAerial' | 'imageColourNotes'>`
- `SCENE_TEMPLATES: Record<'website' | 'app-screens' | 'social-media' | 'motion', ArtDirectedScene[]>`
  — 3–4 scenes per category, hand-authored to the art-direction rules: physical
  subject + clothing; both hands doing something specific; named Indian location with
  physical detail; framing per the people/infrastructure rules; aerial variants set
  `imageIsAerial` + `imageColourNotes`. No banned phrases, no TATA references,
  no generic "in India".
- `pickSceneTemplate(category, seedText: string): ArtDirectedScene` — stable pick via
  a simple string hash of `seedText` (same prompt → same scene across refinements;
  different prompts → variety).

### 4. Fallback plan integration (`App/src/ai/fallbackPlan.ts`)

For the four covered categories, `fallbackPlan()` spreads
`pickSceneTemplate(category, input.prompt)` into the base plan (slides gets none) and
appends to its `reasoning`: "Imagery uses a curated art-directed scene." Nothing else
changes — the orchestrator's existing `requestHeroImage(plan)` now finds complete
scene fields and generates, locally and hosted, with the same assembled prompt +
visual baseline as Claude-authored scenes. Claude-authored fields always win (this
path only runs in fallback plans).

### 5. Env & deploy

- Vercel project env (production): `GEMINI_API_KEY` (required), optional
  `GEMINI_IMAGE_MODEL`, `GEMINI_VIDEO_MODEL`. Set via
  `grep '^VAR=' .env | cut -d= -f2- | vercel env add VAR production` — value flows
  shell-to-shell, never displayed; run only after explicit user approval (or the user
  runs it themselves).
- Deploy recipe unchanged: `npm run app:build && vercel build --prod --yes && vercel deploy --prebuilt --prod --yes`.
- README: hosted-generation section (endpoints, models, guards, spend-cap note,
  env setup) replacing the "would need a hosted equivalent — out of scope" caveat.

### 6. Testing

- **Unit (Vitest):**
  - Scene compliance: every template in every category has all four required fields;
    a banned-phrase list (`'dramatic lighting'`, `'beautiful'`, `'professional
    photography'`, `'realistic'`, `'stunning'`, `'perfect'`, `'amazing'`, `'high
    quality'`, `'in India'`, `'Indian setting'`, `'typical'`, `'TATA'`,
    case-insensitive) is absent from every field of every template; aerial templates
    carry `imageColourNotes`; all four categories present with ≥3 templates.
  - `pickSceneTemplate`: stable for equal seeds; both branches (people/aerial)
    reachable across seeds.
  - `fallbackPlan`: sets a complete scene for the four categories; sets none for
    slides; reasoning mentions the curated scene.
  - Cores: `generateImage`/`generateVideo` happy path + error mapping with stubbed
    fetch (moving the parse logic into pure functions makes the previously untested
    proxy logic testable — add the tests the proxies never had).
  - Guards: origin mismatch → 403; long prompt → 400 (function handlers tested with
    mock req/res).
- **E2E:** unchanged and must stay green (keys blanked → 503 → no image, same
  assertions).
- **Live verification:** locally, one real motion build confirms the Veo 2 default
  end-to-end (Claude authors the scene locally — the template path can't be
  exercised locally with real generation, since the disable-AI flag blanks Google
  keys too). The template path is live-verified on the hosted site: deploy, drive a
  website build on the production URL, confirm a real Nano image renders (or the
  clean 429 degrade if the spend cap is still active), and trigger one Veo 2 motion
  generation (same cap caveat).

## Acceptance criteria

- Hosted site generates Nano images for website, app-screens, social-media, and
  motion fallback builds via `/api/gemini-image` (given key + quota).
- Motion video uses Veo 2 by default locally and hosted via `/api/gemini-video`;
  "Generate video" works on the hosted site (given key + quota).
- Every generated asset's prompt is assembled from art-direction-compliant fields +
  the fixed visual baseline; template compliance is test-enforced.
- Slides behavior unchanged; media failure never blocks a preview anywhere.
- Local dev behavior unchanged apart from the Veo 2 default and the image-model
  default (no more 503 when `GEMINI_IMAGE_MODEL` is unset).
- `npm run app:build`, `npm run lint`, `npx vitest run`, `npm run test:e2e` all pass.
