# Reliance Builder: polished pattern-driven outputs, Fable 5 orchestration, Veo motion

## Problem

The app works end-to-end, but generated outputs feel generic: every website build uses the
same single layout, `SocialPreview` is one thin composition for all four formats, carousel
is a single frame, motion renders one pulse bar regardless of concept, and there is no
quality gate between "Claude drafted content" and "the user sees it". The orchestration
model is a single hardcoded fallback (`claude-sonnet-5`) with no fallback chain, video
generation depends on an external CLI (Higgsfield) the project otherwise avoids, and two
named acceptance gates (lint, Playwright) don't exist in the repo at all.

## Goal

A preview-first Reliance AI design builder whose outputs feel premium, confident, and
Reliance-specific: Fable 5 picks a curated Reliance layout pattern and authors content
into it, a critique pass revises weak content before display, renderers enforce
art-direction rules in code, images come from Gemini and motion video from Veo, and the
whole thing degrades gracefully at every layer.

## Decisions locked during brainstorming

- **Approach:** curated pattern registry + critique loop (not free-form section grammar,
  not a minimal polish pass). Claude never invents styling *or layouts* — it picks from
  curated patterns and authors content into them.
- **Video:** Veo replaces the Higgsfield CLI, implementing the already-approved
  `2026-07-07-reliance-builder-veo-motion-video-design.md` as part of this work.
- **Checks:** add both ESLint (flat config) and a hermetic Playwright smoke suite.
- **App screens stay mobile-only** (390×844). The spec'd 1440×1024 desktop variant is
  deliberately dropped, honoring the earlier "app-screens is phone-chrome only" decision.

## Non-goals

- No brand switching, ever — the Reliance lock (`App/vite.config.ts` +
  `App/src/data/brandsConfig.ts`) is already correct and untouched.
- No change to the guided-flow shape: single input, quick CTAs (Website / App screens /
  Slides / Social media / Motion), 1–2 follow-ups, preview, refine field, collapsed
  Build details.
- No new Reliance styles invented: all color/type/spacing/radius/motion values keep
  coming from the fetched Reliance brand CSS and `@jds4/oneui-react` tokens.
- No editing of `.env` by tooling — code defaults make new env vars optional; README
  documents the overrides.
- No renaming of existing modules to match the requested structure where a module
  already plays the role (`App/src/ai/schema.ts` *is* `renderPlanSchema`,
  `App/src/components/previews/` *is* `preview/renderers`,
  `App/src/data/relianceBrandMeta.ts` + `tokenRecommendations.ts` play
  `brand/relianceMapper`). Churn-free mapping over cosmetic renames.
- No live MCP calls from the running app (impossible from a Vite client/dev server —
  see MCP adapters below for the honest seam).

## Design

### 1. Model orchestration (`App/aiServerPlugin.ts`)

- `ANTHROPIC_MODEL` code default changes `'claude-sonnet-5'` → `'claude-fable-5'`.
- New `ANTHROPIC_FALLBACK_MODEL`, code default `'claude-sonnet-5'`, passed through
  `App/vite.config.ts` like the existing env vars.
- `callAnthropic()` tries the primary model; on **any** failure (HTTP error, overload,
  model-not-found, the existing `max_tokens` truncation detection, missing `tool_use`
  block) it retries **once** with the fallback model. Both failing → throw, which the
  client already turns into `fallbackPlan.ts`'s deterministic preview. The app never
  blocks on a model.
- Every proxy response gains `{ result, model }` so the client can show which model
  authored each stage.

### 2. Pipeline (`App/src/ai/orchestrator.ts`, new)

`App.tsx` currently calls `requestClassification`/`requestPlan` directly; the
orchestrator takes over composition and `client.ts` stays the thin fetch layer:

1. **Classify** — unchanged contract: category + 0–2 follow-up questions.
2. **Plan** — the plan tool gains `patternId` (enum of the registry's IDs for the
   category, injected server-side from the registry module). Claude authors content
   into that pattern's grammar plus the existing art-directed image fields.
   `patternId` is validated client-side against the real registry exactly like
   component names are today; invalid → the category's default pattern.
3. **Critique** (new request `type: 'critique'`, new `CRITIQUE_TOOL`) — the drafted
   plan goes back to the same model chain with a quality rubric composed from
   `artDirection.ts` + the MCP adapters' hints (see §7): headline strength, copy
   rhythm, CTA hierarchy, block balance, image-prompt specificity. It returns
   revisions to **content fields only** — it must echo `patternId`,
   `dimensionVariant`, and `recommendedComponentNames` unchanged; the client merge
   enforces this (structural fields from the draft always win). One-line
   `qualityNotes` lands in Build details. Critique failure → draft ships as-is,
   noted honestly in Build details.
4. **Media** — hero image exactly as today (via `media/imageGenerator`); motion video
   opt-in via Veo (§6).

Busy labels become stage-honest: "Reading your request…" → "Designing your preview…"
→ "Reviewing the design…". Refinements re-run plan + critique with the same pattern
constraint behavior (Claude may pick a different pattern on refine if the user asks).

### 3. Schema (`App/src/ai/schema.ts`)

Additions to `BuildPlan`:

- `patternId: string` — validated registry pattern.
- `carouselFrames?: { headline: string; body?: string }[]` — social carousel, 3–5
  frames.
- `qualityNotes?: string` — critique summary.
- `SlideType` gains `'stat'` (big-number data slide: `statValue`, `statLabel` on the
  slide) and `'closing'` (end-of-deck CTA slide).

`AIResult` meta gains `model?: string` per stage (threaded into
`BuildRequest.classifyMeta`/`planMeta` and shown in Build details as a
"Fable 5" / "Sonnet 5 (fallback)" badge beside the existing Claude/Fallback badge).

### 4. Pattern registry (`App/src/data/patternRegistry.ts`, new)

Each pattern: `{ id, category, label, whenToUse (the text Claude chooses from),
sections (composition the renderer implements), storyComponents (OneUI components it
composes) }`. A Vitest test asserts every pattern's `storyComponents` ⊆
`AVAILABLE_COMPONENTS` (released ∧ story-backed), making "Storybook is the design
foundation" mechanically enforced. Build details lists the pattern and its story-backed
components.

Patterns:

- **Website:** `campaign-hero` (full-bleed image hero with gradient scrim, display
  headline over image, stat band, feature grid, closing CTA band), `product-story`
  (split hero text/image, alternating feature rows, quote spotlight, news grid,
  contact band — the evolution of today's layout), `editorial` (kicker, lede,
  article-style sections, pull-quote, related grid), `service-hub` (icon-led service
  card grid, per-service CTAs).
- **App screens (mobile-only):** `onboarding` (hero image, value-prop, PaginationDots,
  primary CTA), `dashboard` (greeting header, stat cards, list items, bottom nav),
  `browse` (search Input, ChipGroup filters, image cards, bottom nav), `profile`
  (Avatar header, settings list, action, bottom nav), `checkout` (order list, total
  stat, InputField, high-attention action). All steer the existing `contentBlocks`
  grammar plus pattern-specific chrome.
- **Slides:** the `slideType` grammar is the pattern family (per-slide selection);
  registry entries exist for deck-level guidance (title/storytelling/data/comparison/
  closing) and the two new slide types complete the set.
- **Social:** one designed composition per format — `announcement` (square),
  `story-vertical` (image-led, text overlaid bottom on gradient scrim), `linkedin-split`
  (landscape split image/copy), `carousel` (multi-frame with the deck-style
  Previous/Next navigator, 1080×1080 per frame).
- **Motion:** concept IDs are the pattern family (`loader`, `transition`,
  `intro-animation`, `product-reveal`, `micro-interaction`) — each gets its own
  animated stage (§5).

`patternId` is only a free choice for **website** and **app-screens**. For social and
motion, `patternId` is derived 1:1 from the existing enum field Claude already picks
(`socialFormat`, `motionConcept`) — the client sets it, Claude does not author it. For
slides it is the fixed value `deck` (per-slide variety comes from `slideType`). The
registry still carries `whenToUse` guidance and `storyComponents` for every pattern in
every category, for prompt context, Build details, and the enforcement test.

### 5. Renderers (`App/src/components/previews/`)

Cross-cutting rules, enforced in code:

- One high-attention CTA per view; everything else medium/low.
- Proportional spacing rhythm per canvas (display type sized confidently on 1440/1920
  canvases; max line lengths on all copy).
- Text over image always via gradient scrim; hero images used full-bleed where the
  pattern calls for it.
- Designed absence for every optional field — no empty shells; the news grid's empty
  grey placeholder `div` is removed (hero-image reuse or token-styled treatment
  instead).
- `prefers-reduced-motion` respected everywhere animated.
- Files stay under 500 lines: `WebsitePreview.tsx` becomes a pattern switch over
  sub-renderers in `previews/website/`; app patterns likewise if needed.

Category work: website = 4 pattern renderers; app = 5 pattern compositions; slides =
`stat` + `closing` types plus typographic polish of the existing five; social = 4
designed formats including the multi-frame carousel navigator; motion = 5
concept-specific stages built from Reliance motion/color/shape tokens, replacing the
single pulse bar, with the Veo button alongside.

### 6. Media layer

- **`App/src/media/imageGenerator.ts`** (new): `assembleImagePrompt` + hero-image fetch
  move here from `client.ts`, contract unchanged (failure → no image, never blocks).
- **`App/src/media/videoGenerator.ts`** (new): `requestMotionVideo` moves here, posting
  to `/api/gemini-video`.
- **`App/geminiVideoProxy.ts`** (new) and **`App/higgsfieldVideoProxy.ts`** (deleted):
  implemented exactly per `2026-07-07-reliance-builder-veo-motion-video-design.md`
  (predictLongRunning → 5s polling to 5-minute cap → download → `data:video/mp4`
  URL; that spec's error-handling table applies verbatim), with one addition:
  `GEMINI_VIDEO_MODEL` gets a code default of `'veo-3.0-generate-001'` so nothing in
  `.env` must change; unset/denied access surfaces as the clean 503/502 messages the
  UI already renders. The CSS/JS motion stage is the always-available fallback.

### 7. MCP quality adapters (`App/src/mcp/`, new)

Honest constraint, stated in code comments too: the running app cannot invoke Claude
Code MCP servers. The adapters are the seam where MCP-derived guidance plugs in:

- **`uiUxProAdapter.ts`** — `getQualityHints(category, patternId)` returning distilled
  static heuristics (hierarchy, spacing, contrast, touch targets, CTA rules). Always
  available; feeds the critique rubric server-side (imported by `aiServerPlugin.ts`
  the same way `brandVoice.ts` already is).
- **`framerAdapter.ts`** — same interface; checks `FRAMER_MCP_URL` (env passthrough)
  and returns `undefined` gracefully when unset (the normal case). Never user-visible.

### 8. Checks

- **ESLint:** flat `eslint.config.js` — `typescript-eslint` recommended +
  `eslint-plugin-react-hooks`, no stylistic rules. `npm run lint` covers `App/`,
  `src/stories/`, `tests/`. Existing code is brought to passing (expect only
  mechanical fixes; rules causing wide churn get disabled with a comment rather than
  mass-editing).
- **Playwright:** `@playwright/test` devDep, `playwright.config.ts` with a `webServer`
  that boots `vite dev` **with `ANTHROPIC_API_KEY`/`GEMINI_API_KEY` stripped from the
  child env** so the deterministic fallback path drives the run — hermetic, no API
  spend. `tests/e2e/builder.spec.ts` walks: start screen renders (input + 5 quick
  CTAs) → submit a prompt → answer follow-ups → preview renders with a headline →
  Build details is collapsed by default and opens on click → refine field present.
  `npm run test:e2e`.

### 9. File map

Create: `App/src/ai/orchestrator.ts`, `App/src/data/patternRegistry.ts`,
`App/src/media/imageGenerator.ts`, `App/src/media/videoGenerator.ts`,
`App/src/mcp/uiUxProAdapter.ts`, `App/src/mcp/framerAdapter.ts`,
`App/geminiVideoProxy.ts`, `App/src/components/previews/website/*.tsx`,
`eslint.config.js`, `playwright.config.ts`, `tests/e2e/builder.spec.ts`.

Modify: `App/aiServerPlugin.ts` (model chain, patternId enum, critique tool, hint
imports), `App/vite.config.ts` (env passthrough, proxy swap), `App/src/ai/client.ts`
(slims to transport), `App/src/ai/schema.ts`, `App/src/App.tsx` (orchestrator, stage
labels), `App/src/components/BuildDetails.tsx` (model badges, pattern row, quality
notes), all five preview renderers, `App/src/ai/fallbackPlan.ts` (assigns default
patternId), `package.json` (scripts + devDeps), `README.md` (env vars).

Delete: `App/higgsfieldVideoProxy.ts`.

### 10. Testing

- **Unit (Vitest):** pattern registry validity (story-backed components, unique IDs,
  every category has a default), model fallback chain in `aiServerPlugin`
  (primary fails → fallback model called; both fail → error), critique merge
  (content-only; structural fields immutable), carousel frames + `stat`/`closing`
  slide rendering, orchestrator stage flow with mocked transport, media modules'
  never-throw contract. Existing suites updated where schemas/imports moved.
- **E2E (Playwright):** the hermetic smoke suite above.
- **Live verification (not CI):** one real Fable 5 build end-to-end in the browser
  (real key), confirming pattern selection + critique in Build details, and one real
  Veo generation per the Veo spec's testing section — expecting a genuine
  minutes-long wait, correcting `extractVideoUri()` against the real response shape
  if needed.

## Acceptance criteria

- Reliance-only lock intact (unchanged, verified by existing behavior).
- `claude-fable-5` is the primary orchestration model; `ANTHROPIC_FALLBACK_MODEL`
  (default `claude-sonnet-5`) is used automatically on primary failure; both failing
  still yields a rendered deterministic preview.
- Fable 5 selects a validated pattern from the curated registry; a critique pass
  revises content before display; neither can invent layouts, styles, or components.
- Main output is the polished rendered preview; pattern, model badges, quality notes,
  components, and tokens live only in collapsed Build details.
- Every pattern composes only Storybook-story-backed OneUI components (test-enforced).
- Image generation via the existing Gemini proxy; motion video via the new Veo proxy;
  media failure never blocks a preview; CSS/JS Reliance-token motion always available.
- MCP adapters exist as graceful seams; app behavior is identical with no MCP
  configured.
- `npm run app:build`, `npm run lint`, `npm test`, and `npm run test:e2e` all pass.
