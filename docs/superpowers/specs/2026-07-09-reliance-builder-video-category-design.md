# Reliance Builder: Video category with destination-driven ratios

## Problem

Reliance video content is made for very different surfaces — AGM keynote screens,
auditorium ultra-wides, LinkedIn feeds, Stories — and the app has no way to produce a
video concept shaped by its destination. Motion (UI micro-interactions) is the wrong
home for this: its deliverable is a token-driven interaction preview, not a film
concept, and it must remain unchanged.

## Goal

A sixth build category, **Video**: the user picks where the video will be used, the
app maps that to the correct ratio and dimensions, and Fable 5 authors a
storyboard-level concept whose framing, safe areas, copy placement, Veo prompt, and
preview canvas all follow the selected format. Opt-in in-app Veo generation, like
Motion has today.

## Decisions locked during brainstorming

- **Deliverable:** concept package rendered at the true selected ratio (title, meta,
  safe-area guides, scenes, VO copy, assembled Veo-ready prompt) **plus** an opt-in
  Generate-video button. Not auto-generated.
- **Custom format:** a new free-text question type in the guided flow (chips-only
  today), shown only when the user picks Custom.
- **Veo API reality:** generation requests use the *nearest supported* aspect ratio
  (`16:9` or `9:16`) via the API's `aspectRatio` parameter; the assembled prompt
  always names the exact target format/ratio/dimensions.
- **Motion untouched:** no Motion source file changes; Video never uses the Motion
  Storybook stages or motion-token mapping.

## Non-goals

- No multi-clip editing, no timeline, no audio.
- No auto-generation of the video with the preview (cost); the button is opt-in.
- No new Storybook stories (the storyboard renderer composes existing story-backed
  components).
- Slides/social/website/app-screens/motion behavior unchanged.

## Design

### 1. Format registry — `App/src/data/videoFormats.ts`

```ts
export interface VideoFormat {
  id: string;             // 'keynote-agm' | 'auditorium-ultrawide' | 'youtube-website' |
                          // 'linkedin-feed' | 'instagram-feed' | 'instagram-story' |
                          // 'square-social' | 'digital-display' | 'custom'
  label: string;          // e.g. 'Keynote / AGM screen'
  ratio: string;          // e.g. '16:9', '1.91:1'
  width: number;
  height: number;
  useFor: string;         // the "Use for …" line from the product spec
  safeArea: string[];     // guidance bullets for this ratio
  veoAspectRatio: '16:9' | '9:16'; // nearest API-supported generation ratio
}
```

The nine destinations exactly per the product spec:

| id | ratio | dimensions | veoAspectRatio |
|---|---|---|---|
| keynote-agm | 16:9 | 1920×1080 | 16:9 |
| auditorium-ultrawide | 21:9 | 2560×1080 | 16:9 |
| youtube-website | 16:9 | 1920×1080 | 16:9 |
| linkedin-feed | 1.91:1 | 1200×627 | 16:9 |
| instagram-feed | 4:5 | 1080×1350 | 9:16 |
| instagram-story | 9:16 | 1080×1920 | 9:16 |
| square-social | 1:1 | 1080×1080 | 16:9 |
| digital-display | 16:9 default | 1920×1080 default | follows resolved ratio |
| custom | parsed | parsed | nearest of 16:9/9:16 by aspect |

Safe-area bullets per ratio, verbatim from the product spec's Safe-area section
(16:9 edges; 21:9 centre-clear + wide cinematic; 9:16 large centred text, avoid
top/bottom UI zones; 4:5 centred hierarchy; 1:1 simple/iconic one message;
1.91:1 short readable copy).

Helpers:

- `getVideoFormat(id): VideoFormat | undefined`; `DEFAULT_VIDEO_FORMAT_ID = 'keynote-agm'`.
- `resolveDigitalDisplay(promptText): { ratio, width, height }` — "portrait" →
  1080×1920, "ultra-wide"/"ultrawide" → 2560×1080, else default 1920×1080.
- `parseCustomFormat(text): { ratio: string; width: number; height: number } | undefined`
  — accepts ratio forms (`16:9`, `9:16`, `1:1`, `4:5`, `21:9`, `1.91:1`) mapping to
  the standard dimensions above (16:9→1920×1080, 9:16→1080×1920, 1:1→1080×1080,
  4:5→1080×1350, 21:9→2560×1080, 1.91:1→1200×627), and size forms
  (`1920 × 1080`, `1920x1080`, case/space tolerant) deriving the reduced ratio label.
  Unparseable → `undefined`; the caller falls back to 16:9 1920×1080 and notes it
  honestly in Build details reasoning.
- `nearestVeoAspect(width, height): '16:9' | '9:16'` — aspect ≥ 1 → `'16:9'`, else `'9:16'`.

### 2. Guided flow

- `BuildCategoryId` gains `'video'`. New `BUILD_CATEGORIES` entry:
  - label 'Video', description 'Brand films, campaign video and event screens',
    StartScreen icon `grid` (Motion keeps `play`).
  - Q1 `video-destination`: **"Where will this video be used?"** — the nine options.
  - Q2 `video-feeling`: **"What should the film feel like?"** — grounded-real /
    epic-scale / fast-energetic / warm-human / precise-technical.
- **Free-text question type:** `GuidedQuestion`/`FollowUpQuestion` gain optional
  `input?: 'text'` + `placeholder?: string` (chips remain the default).
  `GuidedQuestionScreen` renders an `Input` + Continue button for text questions
  (Enter submits; empty input allowed → treated as unparseable → 16:9 fallback).
  `App.tsx`: when the `video-destination` answer is `custom`, append the text
  question `video-custom-format` ("Enter the ratio or size — e.g. 16:9 or
  1920 × 1080") to the remaining follow-ups.
- Classification: `CLASSIFY_TOOL` category enum gains `'video'`;
  `fallbackClassify`'s keyword inference checks video terms
  (`video|film|reel|storyboard|agm|keynote`) **before** the app-screens rule (so
  "AGM film for our energy app" lands in video), while `motion|animat|loader|...`
  keeps routing to motion (Motion unchanged).

### 3. Format resolution (client, deterministic)

`App/src/data/videoFormats.ts` also exports
`resolveVideoFormatForBuild(answers: GuidedAnswers, promptText: string): ResolvedVideoFormat`
where `ResolvedVideoFormat = { id, label, ratio, width, height, safeArea, veoAspectRatio, note?: string }`:

- destination answer → registry entry;
- `digital-display` → `resolveDigitalDisplay(promptText)`;
- `custom` → `parseCustomFormat(answers['video-custom-format'])`, fallback 16:9 +
  `note: 'Unrecognized custom size — defaulted to 16:9 1920×1080.'`;
- missing/unknown answer → `DEFAULT_VIDEO_FORMAT_ID`.

The orchestrator attaches it to the plan (`plan.videoFormat = resolved`) for BOTH
Claude and fallback plans — format is structural, never model-authored.

### 4. Schema + Claude authoring

`BuildPlan` gains (all optional):

```ts
videoFormat?: { id: string; label: string; ratio: string; width: number; height: number;
                safeArea: string[]; veoAspectRatio: '16:9' | '9:16'; note?: string };
recommendedDuration?: string;             // e.g. '45–60 seconds'
openingShot?: string;
keyScenes?: { title: string; description: string }[];  // 3–5
closingFrame?: string;
voiceoverCopy?: string;
```

`PLAN_TOOL` gains matching properties (with `videoFormatId` as a string enum of the
nine ids — the guided answer is echoed into the plan request context so the model
knows the target; the client ignores the model's echo and uses the deterministic
resolution). The plan-call context lines include, for video builds:
`Video format: <label> — <ratio>, <width>×<height>. Safe areas: <bullets>` plus the
product spec's framing note ("the ratio must shape composition, text-safe areas,
title/CTA placement and visual density — not just be metadata").
`RELIANCE_SYSTEM_PROMPT` gains a short Video paragraph: video concepts are
storyboard-level (title/opening/scenes/closing/VO), destination-formatted, and reuse
the art-directed scene fields for the base imagery. Existing fields reused:
`headline` = title, `subheadline` = concept summary, `body` = visual direction,
`imageSubject/Action/Location/Framing` = base scene (and Veo start frame).
`CRITIQUE_TOOL` stays derived (new fields automatically revisable);
`CONTENT_REVISION_KEYS` gains the five new content keys (`recommendedDuration`,
`openingShot`, `keyScenes`, `closingFrame`, `voiceoverCopy`) — `keyScenes` joins the
ARRAY_KEYS malformed-defence; `videoFormat` is structural (never revisable, never
model-set).

### 5. Veo prompt assembly + generation

New `App/src/ai/videoPrompt.ts`:
`assembleVideoPrompt(plan): string` — assembled app-side (the model never authors
the final prompt), composed of: the art-directed scene (via
`assembleImagePrompt`-style parts + visual baseline), tone (from `video-feeling`
answer label), opening shot → key scenes → closing frame beats, voiceover/on-screen
copy note, and a format block:
`Format: <label>. Deliver at <ratio> (<width>×<height>). Safe areas: <bullets>.
Recommended duration: <recommendedDuration>.`

`App/server/geminiVideoCore.ts`: `generateVideo` gains optional
`aspectRatio?: '16:9' | '9:16'` (appended to the request as
`parameters: { aspectRatio }` when present). Both the dev proxy and the hosted
function pass it through from the request body (`{ prompt, startImageDataUrl?,
aspectRatio? }`). `media/videoGenerator.ts`'s `requestMotionVideo(plan)` passes
`plan.videoFormat?.veoAspectRatio` when present — motion plans have no
`videoFormat`, so Motion's behavior is byte-identical.

### 6. Renderer — `App/src/components/previews/VideoPreview.tsx`

- Meta row: format label, ratio, dimensions, recommended duration (Badge/Text chips).
- **True-ratio canvas**: `previewDimensions` gains a single `video` variant
  (`{ id: 'concept', label: 'Concept', 1920×1080 }`) so the variant picker never
  renders for video — the destination step already chose the format. `BuildPreview`
  ALWAYS passes `plan.videoFormat`'s dimensions for video via a new optional
  `overrideDimensions` prop on `PreviewFrame` (covers all nine destinations,
  digital-display resolution, and custom sizes uniformly). The canvas composes: title +
  opening-shot treatment over the art-directed hero image (scrim rule) or bold
  surface, with **dashed safe-area guide overlays** drawn per ratio (16:9 ≈5%
  margins; 21:9 centre-band markers; 9:16 top/bottom UI-zone bands ≈12%; 4:5/1:1
  centred grid; 1.91:1 tight copy zone) — subtle, always on (it's a concept
  artifact, not a final render).
- Below the canvas: numbered key-scene strip (title + description per scene),
  closing-frame line, voiceover/on-screen copy block.
- **"Veo-ready prompt"** collapsed `<details>` under the concept: the full assembled
  prompt in a monospace block (selectable), plus which aspect the API generation
  will use when it differs from the target ratio ("generates at 16:9; deliver/crop
  at 21:9").
- **Generate video** button — same states as Motion's (idle/generating/done/error),
  calling `requestMotionVideo(plan)` (which now carries the aspect).
- Pattern registry: one `video-storyboard` pattern for the category
  (`resolvePatternId('video', …)` → fixed, like slides); storyComponents from
  existing story-backed set (Container, Text, Surface, Badge, Image, Button).

### 7. Fallback + scenes

- `fallbackPlan` for video: deterministic concept — title 'A film that shows the
  work', duration '45–60 seconds', opening shot, 3 key scenes, closing frame, VO
  line — plus the shared curated scene fields. `PATTERN_BY_CATEGORY.video =
  'video-storyboard'`; `HEADLINE_BY_CATEGORY.video` set.
- `sceneTemplates` gains `video` (SceneCategory covers it automatically via
  `Exclude<BuildCategoryId,'slides'>`): 3 new scenes obeying every art-direction
  rule (compliance test moves to five categories, ≥3 each).

### 8. Testing

- Unit: format table matches the product spec exactly (ratios, dimensions, veo
  mapping); `parseCustomFormat` accepts all listed forms + rejects garbage;
  `resolveDigitalDisplay` portrait/ultrawide/default; `resolveVideoFormatForBuild`
  precedence incl. custom fallback note; guided-flow text-question injection;
  plan-tool enums incl. `videoFormatId`; critique lockstep (existing test auto-covers
  the new keys); `assembleVideoPrompt` includes format/ratio/dimensions/safe-areas;
  `generateVideo` sends `parameters.aspectRatio` when given (core test);
  VideoPreview renders meta + guides + scenes at ratio; fallback video completeness;
  scene compliance ×5 categories. Motion test files untouched.
- E2E: one new hermetic test — quick CTA Video → destination (Instagram Story) →
  feeling → storyboard renders showing `9:16` and `1080 × 1920`.
- Live verification: one hosted video build end-to-end with a non-16:9 destination
  (e.g. Story/Reel 9:16): concept renders at ratio; Generate produces a real Veo
  clip at 9:16.

## Acceptance criteria (traces to the product spec)

- Video flow includes the destination/ratio step with the nine options; custom
  accepts ratio/size text input.
- Each destination maps to the exact ratio + dimensions listed above.
- The concept preview displays format, ratio, dimensions, duration, safe-area
  guidance, title, summary, visual direction, opening shot, key scenes, closing
  frame, VO copy — and the canvas itself is the selected ratio with safe-area
  guides.
- The assembled Veo-ready prompt names the selected format, ratio, and dimensions;
  API generation uses the nearest supported aspect.
- Storyboard/system-prompt guidance varies by ratio (framing + safe-area text per
  format reaches the model and the renderer).
- Motion flow unchanged (no Motion source edits; motion regression tests pass).
- All four gates pass; hosted site works on the fallback path day one.
