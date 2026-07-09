# Video Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A sixth build category, Video: destination-driven ratios/dimensions shape the storyboard concept, safe areas, preview canvas, and the app-assembled Veo-ready prompt, with opt-in in-app Veo generation at the nearest supported aspect.

**Architecture:** A typed format registry (`videoFormats.ts`) is the single source of truth for the nine destinations; format resolution is deterministic and client-side (never model-authored). The category fans out mechanically across the existing typed registries, Fable 5 authors storyboard content through the existing pattern-constrained pipeline, and a dedicated renderer draws the concept at true ratio with safe-area guides. Motion is untouched.

**Tech Stack:** Existing app stack (React 18 + @jds4/oneui-react, Vite, Vitest, Playwright); Gemini Veo via the shared `geminiVideoCore` with a new `aspectRatio` parameter.

**Spec:** `docs/superpowers/specs/2026-07-09-reliance-builder-video-category-design.md`

**One documented refinement over the spec:** spec §4 suggested a `videoFormatId` echo field on `PLAN_TOOL`; this plan drops it — the format reaches the model via plan-call context lines, and the client's deterministic resolution is the only source of truth, so an echo field is dead weight. Also, the assembled Veo prompt uses `plan.body` (visual direction) rather than a separate tone parameter — the tone answer already shapes the authored content.

## Global Constraints

- **Motion untouched:** no edits to `MotionPreview.tsx`, `MotionStage.tsx`, `motionMapping.ts`, or motion tests. `requestMotionVideo` may change ONLY such that motion plans (no `videoFormat`) behave byte-identically.
- Format values, verbatim: keynote-agm 16:9 1920×1080 · auditorium-ultrawide 21:9 2560×1080 · youtube-website 16:9 1920×1080 · linkedin-feed 1.91:1 1200×627 · instagram-feed 4:5 1080×1350 · instagram-story 9:16 1080×1920 · square-social 1:1 1080×1080 · digital-display default 16:9 1920×1080 (portrait → 1080×1920, ultra-wide → 2560×1080) · custom parsed.
- `veoAspectRatio` is only ever `'16:9'` or `'9:16'` (nearest by aspect: ≥1 → 16:9).
- Format is STRUCTURAL: resolved deterministically from answers/prompt, attached by the orchestrator, never authored or revised by the model (not in PLAN_TOOL, not critique-revisable).
- Scene templates and all model-facing guidance follow `App/src/ai/artDirection.ts`; the banned-phrase list from `tests/unit/data/sceneTemplates.test.ts` applies to new scenes.
- Media failure never blocks a preview; the deterministic fallback path must produce a complete video concept.
- COMMIT DISCIPLINE: stage files explicitly by path — never `git add -A`/`.`/`-u`/`-a`; verify every commit with `git show --stat HEAD`.
- `npx vitest run` green before every commit. Commit messages end with:
  `Co-Authored-By: claude-flow <ruv@ruv.net>`
- Working directory: `/Users/keithbone/component_test`.

---

### Task 1: Video format registry

**Files:**
- Create: `App/src/data/videoFormats.ts`
- Test: `tests/unit/data/videoFormats.test.ts` (new)

**Interfaces:**
- Consumes: `GuidedAnswers` type from `App/src/types.ts` (type-only).
- Produces (all exported):
  - `interface VideoFormat { id: string; label: string; ratio: string; width: number; height: number; useFor: string; safeArea: string[]; veoAspectRatio: '16:9' | '9:16' }`
  - `const VIDEO_FORMATS: VideoFormat[]` (the eight fixed destinations + a `custom` placeholder entry)
  - `const DEFAULT_VIDEO_FORMAT_ID = 'keynote-agm'`
  - `getVideoFormat(id: string): VideoFormat | undefined`
  - `nearestVeoAspect(width: number, height: number): '16:9' | '9:16'`
  - `parseCustomFormat(text: string): { ratio: string; width: number; height: number } | undefined`
  - `resolveDigitalDisplay(promptText: string): { ratio: string; width: number; height: number }`
  - `interface ResolvedVideoFormat extends Omit<VideoFormat, 'useFor'> { note?: string }`
  - `resolveVideoFormatForBuild(answers: GuidedAnswers, promptText: string): ResolvedVideoFormat`
  - Tasks 2/4/5/6 consume these.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/data/videoFormats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIDEO_FORMAT_ID,
  VIDEO_FORMATS,
  getVideoFormat,
  nearestVeoAspect,
  parseCustomFormat,
  resolveDigitalDisplay,
  resolveVideoFormatForBuild,
} from '../../../App/src/data/videoFormats';

describe('VIDEO_FORMATS', () => {
  it.each([
    ['keynote-agm', '16:9', 1920, 1080, '16:9'],
    ['auditorium-ultrawide', '21:9', 2560, 1080, '16:9'],
    ['youtube-website', '16:9', 1920, 1080, '16:9'],
    ['linkedin-feed', '1.91:1', 1200, 627, '16:9'],
    ['instagram-feed', '4:5', 1080, 1350, '9:16'],
    ['instagram-story', '9:16', 1080, 1920, '9:16'],
    ['square-social', '1:1', 1080, 1080, '16:9'],
    ['digital-display', '16:9', 1920, 1080, '16:9'],
  ] as const)('%s is %s at %d×%d (Veo %s)', (id, ratio, width, height, veo) => {
    const f = getVideoFormat(id);
    expect(f).toBeDefined();
    expect(f?.ratio).toBe(ratio);
    expect(f?.width).toBe(width);
    expect(f?.height).toBe(height);
    expect(f?.veoAspectRatio).toBe(veo);
  });

  it('every format has use-for and at least one safe-area bullet', () => {
    for (const f of VIDEO_FORMATS) {
      expect(f.useFor.length, f.id).toBeGreaterThan(10);
      expect(f.safeArea.length, f.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('defaults to the keynote format', () => {
    expect(DEFAULT_VIDEO_FORMAT_ID).toBe('keynote-agm');
  });
});

describe('nearestVeoAspect', () => {
  it('maps landscape-or-square to 16:9 and portrait to 9:16', () => {
    expect(nearestVeoAspect(2560, 1080)).toBe('16:9');
    expect(nearestVeoAspect(1080, 1080)).toBe('16:9');
    expect(nearestVeoAspect(1080, 1350)).toBe('9:16');
    expect(nearestVeoAspect(1080, 1920)).toBe('9:16');
  });
});

describe('parseCustomFormat', () => {
  it.each([
    ['16:9', 1920, 1080],
    ['9:16', 1080, 1920],
    ['1:1', 1080, 1080],
    ['4:5', 1080, 1350],
    ['21:9', 2560, 1080],
    ['1.91:1', 1200, 627],
  ] as const)('accepts the ratio form %s', (ratio, width, height) => {
    expect(parseCustomFormat(ratio)).toEqual({ ratio, width, height });
  });

  it('accepts size forms with ×, x, and loose spacing', () => {
    expect(parseCustomFormat('1920 × 1080')).toEqual({ ratio: '16:9', width: 1920, height: 1080 });
    expect(parseCustomFormat('1080x1920')).toEqual({ ratio: '9:16', width: 1080, height: 1920 });
    expect(parseCustomFormat(' 2560 X 1080 ')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
  });

  it('derives a reduced ratio label for non-standard sizes', () => {
    expect(parseCustomFormat('1000x500')).toEqual({ ratio: '2:1', width: 1000, height: 500 });
  });

  it('rejects garbage', () => {
    expect(parseCustomFormat('very wide please')).toBeUndefined();
    expect(parseCustomFormat('')).toBeUndefined();
  });
});

describe('resolveDigitalDisplay', () => {
  it('defaults to 1920×1080, honours portrait and ultra-wide mentions', () => {
    expect(resolveDigitalDisplay('a lobby screen loop')).toEqual({ ratio: '16:9', width: 1920, height: 1080 });
    expect(resolveDigitalDisplay('a portrait display in reception')).toEqual({ ratio: '9:16', width: 1080, height: 1920 });
    expect(resolveDigitalDisplay('an ultra-wide lobby wall')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
    expect(resolveDigitalDisplay('an ultrawide banner screen')).toEqual({ ratio: '21:9', width: 2560, height: 1080 });
  });
});

describe('resolveVideoFormatForBuild', () => {
  it('resolves a fixed destination', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'instagram-story' }, 'a reel');
    expect(f.ratio).toBe('9:16');
    expect(f.width).toBe(1080);
    expect(f.veoAspectRatio).toBe('9:16');
    expect(f.note).toBeUndefined();
  });

  it('resolves digital-display from the prompt text', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'digital-display' }, 'portrait display in the lobby');
    expect(f.ratio).toBe('9:16');
    expect(f.height).toBe(1920);
  });

  it('resolves custom from the free-text answer', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'custom', 'video-custom-format': '21:9' }, 'x');
    expect(f.ratio).toBe('21:9');
    expect(f.width).toBe(2560);
    expect(f.veoAspectRatio).toBe('16:9');
  });

  it('falls back to 16:9 with an honest note when custom input is unparseable', () => {
    const f = resolveVideoFormatForBuild({ 'video-destination': 'custom', 'video-custom-format': 'idk' }, 'x');
    expect(f.ratio).toBe('16:9');
    expect(f.width).toBe(1920);
    expect(f.note).toMatch(/defaulted to 16:9/i);
  });

  it('falls back to the keynote default when the destination is missing or unknown', () => {
    expect(resolveVideoFormatForBuild({}, 'x').id).toBe(DEFAULT_VIDEO_FORMAT_ID);
    expect(resolveVideoFormatForBuild({ 'video-destination': 'nonsense' }, 'x').id).toBe(DEFAULT_VIDEO_FORMAT_ID);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/data/videoFormats.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/src/data/videoFormats.ts`**

```ts
import type { GuidedAnswers } from '../types';

/**
 * Destination-driven video formats — the single source of truth for the
 * Video category's ratios, dimensions, and safe-area guidance. Formats are
 * STRUCTURAL: resolved deterministically from the guided answers (and, for
 * digital displays and custom sizes, the prompt/answer text), attached to
 * the plan by the orchestrator, never authored by the model.
 *
 * veoAspectRatio is the nearest ratio the Veo API actually generates (it
 * accepts only 16:9 and 9:16); the assembled prompt always names the exact
 * target format so the film is composed for its true destination.
 */
export interface VideoFormat {
  id: string;
  label: string;
  ratio: string;
  width: number;
  height: number;
  useFor: string;
  safeArea: string[];
  veoAspectRatio: '16:9' | '9:16';
}

export const DEFAULT_VIDEO_FORMAT_ID = 'keynote-agm';

const SAFE_16_9 = [
  'Keep key text away from the extreme edges.',
  'Suitable for keynote, web, YouTube and AGM screens.',
];
const SAFE_21_9 = [
  'Keep the centre clear for speaker/stage presence where relevant.',
  'Avoid placing critical text too far left or right.',
  'Use wide cinematic compositions.',
];
const SAFE_9_16 = [
  'Keep text large and centred.',
  'Avoid placing important content in the top and bottom UI zones.',
  'Use mobile-first framing.',
];
const SAFE_4_5 = ['Use strong centred hierarchy.', 'Good for social feed storytelling.'];
const SAFE_1_1 = ['Keep the composition simple and iconic.', 'Use one clear message.'];
const SAFE_1_91 = ['Keep copy short and readable.', 'Good for LinkedIn and campaign assets.'];

export const VIDEO_FORMATS: VideoFormat[] = [
  {
    id: 'keynote-agm',
    label: 'Keynote / AGM screen',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Executive presentations, AGM films, website video and standard keynote content.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'auditorium-ultrawide',
    label: 'Auditorium ultra-wide screen',
    ratio: '21:9',
    width: 2560,
    height: 1080,
    useFor: 'Large stage screens, panoramic brand films and immersive keynote backdrops.',
    safeArea: SAFE_21_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'youtube-website',
    label: 'YouTube / website',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Website video, YouTube uploads and standard landscape film.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'linkedin-feed',
    label: 'LinkedIn feed',
    ratio: '1.91:1',
    width: 1200,
    height: 627,
    useFor: 'LinkedIn feed video or campaign posts.',
    safeArea: SAFE_1_91,
    veoAspectRatio: '16:9',
  },
  {
    id: 'instagram-feed',
    label: 'Instagram / social feed',
    ratio: '4:5',
    width: 1080,
    height: 1350,
    useFor: 'Feed-first social video.',
    safeArea: SAFE_4_5,
    veoAspectRatio: '9:16',
  },
  {
    id: 'instagram-story',
    label: 'Instagram Story / Reel',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    useFor: 'Vertical video, stories, reels and mobile-first edits.',
    safeArea: SAFE_9_16,
    veoAspectRatio: '9:16',
  },
  {
    id: 'square-social',
    label: 'Square social post',
    ratio: '1:1',
    width: 1080,
    height: 1080,
    useFor: 'Square social video or carousel-style motion frames.',
    safeArea: SAFE_1_1,
    veoAspectRatio: '16:9',
  },
  {
    id: 'digital-display',
    label: 'Digital display',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Signage and display loops — portrait and ultra-wide variants resolved from the brief.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
  {
    id: 'custom',
    label: 'Custom',
    ratio: '16:9',
    width: 1920,
    height: 1080,
    useFor: 'Any bespoke ratio or size, entered in the guided flow.',
    safeArea: SAFE_16_9,
    veoAspectRatio: '16:9',
  },
];

const BY_ID = new Map(VIDEO_FORMATS.map((f) => [f.id, f]));

export function getVideoFormat(id: string): VideoFormat | undefined {
  return BY_ID.get(id);
}

export function nearestVeoAspect(width: number, height: number): '16:9' | '9:16' {
  return width / height >= 1 ? '16:9' : '9:16';
}

/** The six named ratios map to their standard delivery dimensions. */
const RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '21:9': { width: 2560, height: 1080 },
  '1.91:1': { width: 1200, height: 627 },
};

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

export function parseCustomFormat(text: string): { ratio: string; width: number; height: number } | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const named = RATIO_DIMENSIONS[trimmed];
  if (named) return { ratio: trimmed, ...named };

  const size = trimmed.match(/^(\d{2,4})\s*[×xX]\s*(\d{2,4})$/);
  if (size) {
    const width = Number(size[1]);
    const height = Number(size[2]);
    const known = Object.entries(RATIO_DIMENSIONS).find(([, d]) => d.width === width && d.height === height);
    if (known) return { ratio: known[0], width, height };
    const divisor = greatestCommonDivisor(width, height);
    return { ratio: `${width / divisor}:${height / divisor}`, width, height };
  }

  return undefined;
}

export function resolveDigitalDisplay(promptText: string): { ratio: string; width: number; height: number } {
  const text = promptText.toLowerCase();
  if (text.includes('portrait')) return { ratio: '9:16', width: 1080, height: 1920 };
  if (text.includes('ultra-wide') || text.includes('ultrawide')) return { ratio: '21:9', width: 2560, height: 1080 };
  return { ratio: '16:9', width: 1920, height: 1080 };
}

export interface ResolvedVideoFormat extends Omit<VideoFormat, 'useFor'> {
  /** Present when the resolution had to fall back (e.g. unparseable custom input) — surfaced honestly in Build details. */
  note?: string;
}

const SAFE_BY_RATIO: Record<string, string[]> = {
  '16:9': SAFE_16_9,
  '21:9': SAFE_21_9,
  '9:16': SAFE_9_16,
  '4:5': SAFE_4_5,
  '1:1': SAFE_1_1,
  '1.91:1': SAFE_1_91,
};

function withDerived(base: VideoFormat, dims: { ratio: string; width: number; height: number }, note?: string): ResolvedVideoFormat {
  return {
    id: base.id,
    label: base.label,
    ratio: dims.ratio,
    width: dims.width,
    height: dims.height,
    safeArea: SAFE_BY_RATIO[dims.ratio] ?? SAFE_16_9,
    veoAspectRatio: nearestVeoAspect(dims.width, dims.height),
    note,
  };
}

/**
 * The one place a build's video format is decided — deterministic, from the
 * guided answers and prompt text. Never model-authored.
 */
export function resolveVideoFormatForBuild(answers: GuidedAnswers, promptText: string): ResolvedVideoFormat {
  const destination = answers['video-destination'];
  const base = (destination && getVideoFormat(destination)) || getVideoFormat(DEFAULT_VIDEO_FORMAT_ID)!;

  if (base.id === 'digital-display') {
    return withDerived(base, resolveDigitalDisplay(promptText));
  }

  if (base.id === 'custom') {
    const parsed = parseCustomFormat(answers['video-custom-format'] ?? '');
    if (parsed) return withDerived(base, parsed);
    return withDerived(
      base,
      { ratio: '16:9', width: 1920, height: 1080 },
      'Unrecognized custom size — defaulted to 16:9 1920×1080.',
    );
  }

  const { useFor: _useFor, ...rest } = base;
  return { ...rest };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/data/videoFormats.test.ts`
Expected: PASS.

- [ ] **Step 5: Full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/data/videoFormats.ts tests/unit/data/videoFormats.test.ts
git commit -m "Add destination-driven video format registry

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: Sixth-category fan-out (video everywhere the type system demands)

**Files:**
- Modify: `App/src/types.ts:3` (`BuildCategoryId` union)
- Modify: `App/src/data/buildCategories.ts` (video entry)
- Modify: `App/src/components/StartScreen.tsx:6-12` (`CATEGORY_ICONS`)
- Modify: `App/src/components/BuildPreview.tsx:13-19` (`CHROME_BY_CATEGORY`)
- Modify: `App/src/data/previewDimensions.ts` (`DIMENSIONS.video`)
- Modify: `App/src/data/patternRegistry.ts` (video pattern + `resolvePatternId` branch)
- Modify: `App/src/ai/schema.ts` (BuildPlan video fields)
- Modify: `App/src/ai/fallbackPlan.ts` (maps, video regex, fallback concept)
- Modify: `App/src/data/sceneTemplates.ts` (3 video scenes)
- Modify: `App/aiServerPlugin.ts` (CLASSIFY_TOOL category enum only)
- Modify (exact assertion edits shown below): `tests/unit/data/sceneTemplates.test.ts:24`, `tests/unit/ai/schema-plan-fields.test.ts:29-35`, `tests/unit/ai/fallbackPlan-scenes.test.ts:7`
- Test: `tests/unit/ai/fallbackPlan-video.test.ts` (new)

**Interfaces:**
- Consumes: nothing from Task 1 at runtime (kept independent so the fan-out compiles alone).
- Produces: `BuildCategoryId` includes `'video'`; `BuildPlan` gains `videoFormat?: ResolvedVideoFormat`-shaped field plus `recommendedDuration?/openingShot?/keyScenes?/closingFrame?/voiceoverCopy?`; `SCENE_TEMPLATES.video`; pattern `video-storyboard`; fallback video concept. NOTE: the app compiles and all suites pass at the end of this task, but the video category renders an empty canvas until Task 6 — that's expected mid-plan state.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ai/fallbackPlan-video.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fallbackPlan, fallbackClassify } from '../../../App/src/ai/fallbackPlan';

describe('fallback video concept', () => {
  const plan = fallbackPlan({ category: 'video', prompt: 'an AGM film', answers: {} }, 'no key').data;

  it('is a complete storyboard concept', () => {
    expect(plan.headline).toBeTruthy();
    expect(plan.recommendedDuration).toBeTruthy();
    expect(plan.openingShot).toBeTruthy();
    expect(plan.keyScenes?.length).toBeGreaterThanOrEqual(3);
    expect(plan.keyScenes?.[0].title).toBeTruthy();
    expect(plan.keyScenes?.[0].description).toBeTruthy();
    expect(plan.closingFrame).toBeTruthy();
    expect(plan.voiceoverCopy).toBeTruthy();
    expect(plan.patternId).toBe('video-storyboard');
  });

  it('carries a complete art-directed scene like the other media categories', () => {
    expect(plan.imageSubject).toBeTruthy();
    expect(plan.imageFraming).toBeTruthy();
  });
});

describe('video classification keywords', () => {
  it('routes film/AGM language to video even when app words appear', () => {
    expect(fallbackClassify('An AGM film about our energy app', 'x').data.category).toBe('video');
  });

  it('leaves motion words routing to motion (Motion unchanged)', () => {
    expect(fallbackClassify('a loader micro-interaction', 'x').data.category).toBe('motion');
  });
});
```

- [ ] **Step 2: Run new + soon-to-break suites to see the failures**

Run: `npx vitest run tests/unit/ai/fallbackPlan-video.test.ts`
Expected: FAIL — `'video'` not assignable / fields undefined.

- [ ] **Step 3: Widen the type and schema**

`App/src/types.ts:3`:

```ts
export type BuildCategoryId = 'website' | 'app-screens' | 'slides' | 'social-media' | 'motion' | 'video';
```

`App/src/ai/schema.ts` — add to `BuildPlan` (after `qualityNotes`):

```ts
  /**
   * Video: the destination-resolved format. STRUCTURAL — attached by the
   * orchestrator from data/videoFormats.ts, never authored or revised by
   * the model (deliberately absent from the plan/critique tool schemas).
   */
  videoFormat?: {
    id: string;
    label: string;
    ratio: string;
    width: number;
    height: number;
    safeArea: string[];
    veoAspectRatio: '16:9' | '9:16';
    note?: string;
  };
  /** Video: e.g. "45–60 seconds". */
  recommendedDuration?: string;
  /** Video: the opening shot, described concretely. */
  openingShot?: string;
  /** Video: 3-5 storyboard beats. */
  keyScenes?: { title: string; description: string }[];
  /** Video: the final frame / end card. */
  closingFrame?: string;
  /** Video: voiceover or on-screen copy, a line or two. */
  voiceoverCopy?: string;
```

- [ ] **Step 4: Category data, icon, chrome, dimensions, pattern**

`App/src/data/buildCategories.ts` — append to `BUILD_CATEGORIES` (after motion):

```ts
  {
    id: 'video',
    label: 'Video',
    description: 'Brand films, campaign video and event screens',
    questions: [
      {
        id: 'video-destination',
        prompt: 'Where will this video be used?',
        options: [
          { id: 'keynote-agm', label: 'Keynote / AGM screen' },
          { id: 'auditorium-ultrawide', label: 'Auditorium ultra-wide screen' },
          { id: 'youtube-website', label: 'YouTube / website' },
          { id: 'linkedin-feed', label: 'LinkedIn feed' },
          { id: 'instagram-feed', label: 'Instagram / social feed' },
          { id: 'instagram-story', label: 'Instagram Story / Reel' },
          { id: 'square-social', label: 'Square social post' },
          { id: 'digital-display', label: 'Digital display' },
          { id: 'custom', label: 'Custom' },
        ],
      },
      {
        id: 'video-feeling',
        prompt: 'What should the film feel like?',
        options: [
          { id: 'grounded-real', label: 'Grounded & real' },
          { id: 'epic-scale', label: 'Epic scale' },
          { id: 'fast-energetic', label: 'Fast & energetic' },
          { id: 'warm-human', label: 'Warm & human' },
          { id: 'precise-technical', label: 'Precise & technical' },
        ],
      },
    ],
  },
```

`App/src/components/StartScreen.tsx` — `CATEGORY_ICONS` gains `video: 'grid',` (Motion keeps `play`).

`App/src/components/BuildPreview.tsx` — `CHROME_BY_CATEGORY` gains `video: 'none',`.

`App/src/data/previewDimensions.ts` — `DIMENSIONS` gains:

```ts
  video: [{ id: 'concept', label: 'Concept', width: 1920, height: 1080 }],
```

(One variant only — the destination step already chose the format; Task 6's
`overrideDimensions` carries the real size, so the variant picker never renders.)

`App/src/data/patternRegistry.ts` — append to `BUILD_PATTERNS`:

```ts
  // ---- Video (fixed: the destination step, not the model, decides the format) ----
  {
    id: 'video-storyboard',
    category: 'video',
    label: 'Storyboard',
    whenToUse: 'Every video build — a destination-formatted storyboard concept: title, opening shot, key scenes, closing frame, voiceover copy.',
    sections: ['format meta', 'true-ratio concept canvas with safe-area guides', 'key-scene strip', 'closing frame', 'voiceover copy', 'Veo-ready prompt'],
    storyComponents: ['Container', 'Text', 'Surface', 'Badge', 'Image', 'Button'],
  },
```

…and in `resolvePatternId`, immediately after the `slides` line:

```ts
  if (category === 'video') return 'video-storyboard';
```

- [ ] **Step 5: Fallback plan + classification + scenes**

`App/src/ai/fallbackPlan.ts`:

- `inferCategoryFromPrompt` — insert as the FIRST rule (above app-screens), so film
  language beats the broad `app` keyword:

```ts
  if (/(video|film|reel|storyboard|agm|keynote)/.test(text)) return 'video';
```

  Note: the motion rule stays where it is and still fires for motion-only wording
  ("loader", "micro-interaction", "animat…") because those words don't match the
  video rule.

- `HEADLINE_BY_CATEGORY` gains `video: 'A film that shows the work',` and
  `PATTERN_BY_CATEGORY` gains `video: 'video-storyboard',`.
- In the `base: BuildPlan` literal, after `motionDescription`:

```ts
    recommendedDuration: '45–60 seconds',
    openingShot: 'Open on the art-directed scene — hands mid-task, light raking from one side.',
    keyScenes: [
      { title: 'The work', description: 'Stay close on the task; let the environment reveal its scale behind it.' },
      { title: 'The reach', description: 'Widen out: the same work repeating across the site, the street, the state.' },
      { title: 'The outcome', description: 'One person using what the work delivers, unposed and specific.' },
    ],
    closingFrame: 'Reliance mark on a bold surface with the campaign line.',
    voiceoverCopy: 'The work is real. So is what it changes.',
```

`App/src/data/sceneTemplates.ts` — `SCENE_TEMPLATES` gains a `video` entry (the
`SceneCategory` type already covers it via `Exclude<BuildCategoryId, 'slides'>`):

```ts
  video: [
    {
      imageSubject: 'A plant supervisor in a khaki uniform and white hard hat, lanyard tucked into a chest pocket',
      imageAction: 'both hands unrolling a schematic across a steel walkway railing',
      imageLocation: 'a refinery gantry outside Jamnagar at dawn, pipework receding into haze',
      imageFraming: 'medium close-up, slight low angle, railing anchoring the foreground',
    },
    {
      imageSubject: 'A store associate in a navy polo, sleeves pushed to the elbow',
      imageAction: 'both hands pinning a festive garland across a shelf-edge display',
      imageLocation: 'a Jaipur retail store at opening hour, aisles of stacked fabric bolts behind her',
      imageFraming: 'medium close-up, slight low angle, shelf edge soft in the foreground',
    },
    {
      imageSubject: 'A turbine blade on a flatbed trailer turning onto a coastal service jetty',
      imageAction: 'a ground crew guiding the blade with both arms raised in signal',
      imageLocation: 'the Gujarat shoreline at low tide, turbine towers along the water line',
      imageFraming: 'true top-down aerial, wide enough to show the full blade length',
      imageIsAerial: true,
      imageColourNotes: 'white blade, teal shallows and wet grey sand',
    },
  ],
```

`App/aiServerPlugin.ts` — `CLASSIFY_TOOL`'s `category.enum` becomes:

```ts
        enum: ['website', 'app-screens', 'slides', 'social-media', 'motion', 'video'],
```

- [ ] **Step 6: Exact edits to the three existing assertions**

`tests/unit/data/sceneTemplates.test.ts:24`:

```ts
// old
    expect(CATEGORIES.sort()).toEqual(['app-screens', 'motion', 'social-media', 'website']);
// new
    expect(CATEGORIES.sort()).toEqual(['app-screens', 'motion', 'social-media', 'video', 'website']);
```

`tests/unit/ai/schema-plan-fields.test.ts` — add one tuple to the `it.each` list:

```ts
    ['video', 'video-storyboard'],
```

`tests/unit/ai/fallbackPlan-scenes.test.ts:7` — the `it.each` array becomes:

```ts
  it.each(['website', 'app-screens', 'social-media', 'motion', 'video'] as const)('gives %s a complete art-directed scene', (category) => {
```

- [ ] **Step 7: Run the full suite**

Run: `npx vitest run`
Expected: all PASS (registry integrity + Storybook enforcement auto-cover the new
pattern; buildCategories tests auto-cover the new entry; scene compliance now runs
over five categories).

- [ ] **Step 8: Commit**

```bash
git add App/src/types.ts App/src/data/buildCategories.ts App/src/components/StartScreen.tsx App/src/components/BuildPreview.tsx App/src/data/previewDimensions.ts App/src/data/patternRegistry.ts App/src/ai/schema.ts App/src/ai/fallbackPlan.ts App/src/data/sceneTemplates.ts App/aiServerPlugin.ts tests/unit/data/sceneTemplates.test.ts tests/unit/ai/schema-plan-fields.test.ts tests/unit/ai/fallbackPlan-scenes.test.ts tests/unit/ai/fallbackPlan-video.test.ts
git commit -m "Add the Video build category across the typed registries

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Free-text guided question + Custom-format step

**Files:**
- Modify: `App/src/types.ts` (`GuidedQuestion` gains `input?`/`placeholder?`)
- Modify: `App/src/ai/schema.ts` (`FollowUpQuestion` gains the same two optionals)
- Modify: `App/src/components/GuidedQuestionScreen.tsx` (text-input branch)
- Modify: `App/src/App.tsx` (inject the custom-format question)
- Test: `tests/unit/components/GuidedQuestionScreen-text.test.tsx` (new)

**Interfaces:**
- Consumes: category questions from Task 2 (`video-destination`'s `custom` option id).
- Produces: `GuidedQuestion`/`FollowUpQuestion` support `{ input?: 'text'; placeholder?: string }` (chips remain the default when absent); selecting Custom appends the question `{ id: 'video-custom-format', prompt: 'Enter the ratio or size', input: 'text', placeholder: 'e.g. 16:9 or 1920 × 1080', options: [] }` to the remaining follow-ups; the typed text lands in `answers['video-custom-format']` (Task 1's resolver reads it).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/GuidedQuestionScreen-text.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GuidedQuestionScreen } from '../../../App/src/components/GuidedQuestionScreen';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';

const category = BUILD_CATEGORIES.find((c) => c.id === 'video')!;

const textQuestion = {
  id: 'video-custom-format',
  prompt: 'Enter the ratio or size',
  input: 'text' as const,
  placeholder: 'e.g. 16:9 or 1920 × 1080',
  options: [],
};

describe('GuidedQuestionScreen text input', () => {
  it('renders an input with the placeholder and submits the typed value on Continue', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <GuidedQuestionScreen
        category={category}
        question={textQuestion}
        questionIndex={2}
        totalQuestions={3}
        selectedOptionId={undefined}
        onSelectOption={onSelectOption}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    await user.type(screen.getByPlaceholderText('e.g. 16:9 or 1920 × 1080'), '21:9');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSelectOption).toHaveBeenCalledWith('21:9');
  });

  it('submits an empty string when nothing is typed (resolver falls back honestly)', async () => {
    const user = userEvent.setup();
    const onSelectOption = vi.fn();
    render(
      <GuidedQuestionScreen
        category={category}
        question={textQuestion}
        questionIndex={2}
        totalQuestions={3}
        selectedOptionId={undefined}
        onSelectOption={onSelectOption}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSelectOption).toHaveBeenCalledWith('');
  });

  it('still renders chips for option questions', () => {
    render(
      <GuidedQuestionScreen
        category={category}
        question={category.questions[0]}
        questionIndex={0}
        totalQuestions={2}
        selectedOptionId={undefined}
        onSelectOption={() => {}}
        onBack={() => {}}
        busyLabel={null}
      />,
    );

    expect(screen.getByText('Keynote / AGM screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/GuidedQuestionScreen-text.test.tsx`
Expected: FAIL — `input` not a known property / no Continue button rendered.

- [ ] **Step 3: Widen the question types**

`App/src/types.ts` — `GuidedQuestion` becomes:

```ts
export interface GuidedQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
  /** 'text' renders a free-text input instead of option chips (options ignored). */
  input?: 'text';
  placeholder?: string;
}
```

`App/src/ai/schema.ts` — `FollowUpQuestion` gains the same two optional fields:

```ts
export interface FollowUpQuestion {
  id: string;
  prompt: string;
  options: FollowUpOption[];
  /** 'text' renders a free-text input instead of option chips (options ignored). */
  input?: 'text';
  placeholder?: string;
}
```

- [ ] **Step 4: Render the text branch in `GuidedQuestionScreen.tsx`**

Add `Input` to the `@jds4/oneui-react` import and `useState` from react. Replace the
`<ChipGroup …>…</ChipGroup>` block with:

```tsx
        {question.input === 'text' ? (
          <TextAnswer question={question} onSubmit={onSelectOption} disabled={!!busyLabel} />
        ) : (
          <ChipGroup
            aria-label={question.prompt}
            value={selectedOptionId ? [selectedOptionId] : []}
            onValueChange={(values) => {
              const next = values[values.length - 1];
              if (next) onSelectOption(next);
            }}
          >
            <Container variant="full-bleed" layout="flex" wrap gap="2">
              {question.options.map((option) => (
                <Chip key={option.id} value={option.id} size="l" attention="medium" disabled={!!busyLabel}>
                  {option.label}
                </Chip>
              ))}
            </Container>
          </ChipGroup>
        )}
```

…and add at the bottom of the file:

```tsx
function TextAnswer({
  question,
  onSubmit,
  disabled,
}: {
  question: FollowUpQuestion;
  onSubmit: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (!disabled) onSubmit(value.trim());
  };
  return (
    <Container variant="full-bleed" layout="flex" gap="2" width="full">
      <div style={{ flex: 1 }}>
        <Input
          size="l"
          placeholder={question.placeholder}
          value={value}
          onChange={setValue}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </div>
      <Button attention="high" size="l" onClick={submit} disabled={disabled}>
        Continue
      </Button>
    </Container>
  );
}
```

(`FollowUpQuestion` is already imported in this file; add `useState` and `Input` imports.)

- [ ] **Step 5: Inject the custom step in `App/src/App.tsx`**

In `handleSelectOption`, after `const answerLabels = …` and before the
`if (step.questionIndex < step.followUps.length - 1)` branch, add:

```ts
    // Picking a bespoke video format needs one extra, free-text step. Injected
    // only when Custom is chosen so every other destination stays two-question.
    let followUps = step.followUps;
    if (question.id === 'video-destination' && optionId === 'custom' && !followUps.some((q) => q.id === 'video-custom-format')) {
      followUps = [
        ...followUps,
        {
          id: 'video-custom-format',
          prompt: 'Enter the ratio or size',
          input: 'text',
          placeholder: 'e.g. 16:9 or 1920 × 1080',
          options: [],
        },
      ];
    }
```

…then replace the two uses of `step.followUps` in the remainder of the handler with
`followUps` (the length check and the `setStep({ ...step, followUps, questionIndex: … })`
update — include `followUps` in the spread so the injected question persists).

- [ ] **Step 6: Run the full suite + e2e**

Run: `npx vitest run && npm run test:e2e`
Expected: all PASS (existing flows never set `input`, so chips behavior is
unchanged; e2e untouched so far).

- [ ] **Step 7: Commit**

```bash
git add App/src/types.ts App/src/ai/schema.ts App/src/components/GuidedQuestionScreen.tsx App/src/App.tsx tests/unit/components/GuidedQuestionScreen-text.test.tsx
git commit -m "Add free-text guided questions and the Custom video-format step

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 4: Claude authoring fields + deterministic format attach

**Files:**
- Modify: `App/aiServerPlugin.ts` (PLAN_TOOL video properties; system-prompt video paragraph; video context lines)
- Modify: `App/src/ai/client.ts` (sanitize `keyScenes`)
- Modify: `App/src/ai/orchestrator.ts` (attach `videoFormat`; extend `CONTENT_REVISION_KEYS` + ARRAY_KEYS)
- Test: `tests/unit/ai/orchestrator-video.test.ts` (new)
- Test: `tests/unit/aiServerPlugin-video.test.ts` (new)

**Interfaces:**
- Consumes: `resolveVideoFormatForBuild(answers, promptText)` (Task 1); `BuildPlan` video fields (Task 2).
- Produces: `PLAN_TOOL.input_schema.properties` gains `recommendedDuration`, `openingShot`, `keyScenes` (items `{title, description}` both required), `closingFrame`, `voiceoverCopy` — all content fields, so the derived `CRITIQUE_TOOL` picks them up automatically; `CONTENT_REVISION_KEYS` gains the same five keys (`keyScenes` also joins ARRAY_KEYS); `generateBuild` attaches `plan.videoFormat` for video builds on BOTH sources (Claude and fallback), before the critique call. `videoFormat` itself stays out of every tool schema.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/aiServerPlugin-video.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CRITIQUE_TOOL, PLAN_TOOL } from '../../App/aiServerPlugin';

describe('PLAN_TOOL video fields', () => {
  const props = PLAN_TOOL.input_schema.properties as Record<string, any>;

  it('authors the storyboard content fields', () => {
    for (const key of ['recommendedDuration', 'openingShot', 'keyScenes', 'closingFrame', 'voiceoverCopy']) {
      expect(props[key], key).toBeDefined();
    }
    expect(props.keyScenes.type).toBe('array');
    expect(props.keyScenes.items.required).toEqual(['title', 'description']);
  });

  it('never lets the model author the format', () => {
    expect(props.videoFormat).toBeUndefined();
    expect(props.videoFormatId).toBeUndefined();
  });
});

describe('CRITIQUE_TOOL video fields', () => {
  const props = CRITIQUE_TOOL.input_schema.properties as Record<string, any>;

  it('can revise storyboard content but not the format', () => {
    expect(props.keyScenes).toBeDefined();
    expect(props.openingShot).toBeDefined();
    expect(props.videoFormat).toBeUndefined();
  });
});
```

Create `tests/unit/ai/orchestrator-video.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBuild } from '../../../App/src/ai/orchestrator';
import * as client from '../../../App/src/ai/client';
import type { BuildPlan } from '../../../App/src/ai/schema';

vi.mock('../../../App/src/ai/client', async (importOriginal) => {
  const original = await importOriginal<typeof client>();
  return { ...original, requestPlan: vi.fn(), requestCritique: vi.fn() };
});
vi.mock('../../../App/src/media/imageGenerator', () => ({ requestHeroImage: vi.fn().mockResolvedValue(undefined) }));

const draft: BuildPlan = { headline: 'Film', patternId: 'video-storyboard', recommendedComponentNames: [], reasoning: 'draft' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('generateBuild video format attach', () => {
  it('attaches the deterministic format for video builds (fallback source too)', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild({
      category: 'video',
      prompt: 'a reel',
      answers: { 'video-destination': 'instagram-story' },
    });

    expect(result.data.videoFormat?.ratio).toBe('9:16');
    expect(result.data.videoFormat?.width).toBe(1080);
    expect(result.data.videoFormat?.veoAspectRatio).toBe('9:16');
  });

  it('attaches no format for other categories', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild({ category: 'motion', prompt: 'a loader', answers: {} });

    expect(result.data.videoFormat).toBeUndefined();
  });

  it('the critique sees the attached format but cannot change it', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({
      ok: true,
      revision: { openingShot: 'Sharper opening', videoFormat: { ratio: '1:1' }, qualityNotes: 'x' } as never,
    });

    const result = await generateBuild({
      category: 'video',
      prompt: 'an AGM film',
      answers: { 'video-destination': 'auditorium-ultrawide' },
    });

    expect(result.data.openingShot).toBe('Sharper opening');
    expect(result.data.videoFormat?.ratio).toBe('21:9');
    const critiqueDraft = vi.mocked(client.requestCritique).mock.calls[0][2];
    expect(critiqueDraft.videoFormat?.ratio).toBe('21:9');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/aiServerPlugin-video.test.ts tests/unit/ai/orchestrator-video.test.ts`
Expected: FAIL.

- [ ] **Step 3: Extend `App/aiServerPlugin.ts`**

Add to `PLAN_TOOL.input_schema.properties`, after `motionDescription`:

```ts
      recommendedDuration: { type: 'string', description: 'Video only: recommended film length, e.g. "45–60 seconds".' },
      openingShot: { type: 'string', description: 'Video only: the opening shot, described concretely per the art-direction rules.' },
      keyScenes: {
        type: 'array',
        minItems: 3,
        maxItems: 5,
        description: 'Video only: 3-5 storyboard beats that build one story toward the closing frame.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Two or three words naming the beat.' },
            description: { type: 'string', description: 'What the camera sees — concrete, physical, on-format.' },
          },
          required: ['title', 'description'],
        },
      },
      closingFrame: { type: 'string', description: 'Video only: the final frame / end card.' },
      voiceoverCopy: { type: 'string', description: 'Video only: a line or two of voiceover or on-screen copy.' },
```

Add to `RELIANCE_SYSTEM_PROMPT` (append a paragraph before the closing backtick,
after the `${RELIANCE_REAL_CONTEXT}` interpolation):

```ts
For "video" builds you author a storyboard-level film concept: title (headline),
concept summary (subheadline), visual direction (body), recommended duration, an
opening shot, 3-5 key scenes, a closing frame, and voiceover/on-screen copy. The
delivery format (ratio, dimensions, safe areas) is decided by the app from the
user's destination choice and given to you as context — compose FOR it: framing,
text-safe areas, title/CTA placement and visual density must fit that ratio, not
merely mention it.
```

In the `plan` branch's `contextLines`, after the pattern-guidance line, add:

```ts
              body.category === 'video'
                ? `Video format (decided by the app — compose for it): ${body.videoFormatContext ?? 'Keynote / AGM screen — 16:9, 1920×1080.'}`
                : '',
```

…and extend `PlanRequestBody` with `videoFormatContext?: string;`.

- [ ] **Step 4: Thread the format context + sanitize in `App/src/ai/client.ts`**

- `PlanInput` gains `videoFormatContext?: string;` and `requestPlan` forwards it in
  the `postToClaude({ type: 'plan', … })` body.
- In `requestPlan`'s data assembly, alongside the other `asArray` lines:

```ts
    keyScenes: asArray(raw.keyScenes),
```

- [ ] **Step 5: Attach the format in `App/src/ai/orchestrator.ts`**

Imports:

```ts
import { resolveVideoFormatForBuild } from '../data/videoFormats';
```

`CONTENT_REVISION_KEYS` gains, after `'motionDescription'`:

```ts
  'recommendedDuration',
  'openingShot',
  'keyScenes',
  'closingFrame',
  'voiceoverCopy',
```

`ARRAY_KEYS` gains `'keyScenes'`.

In `generateBuild`, replace the opening so the format exists before the plan call
(context) and is attached after (structural truth):

```ts
export async function generateBuild(input: PlanInput, onStage?: (label: string) => void): Promise<AIResult<BuildPlan>> {
  // The video format is structural: resolved from the guided answers, given
  // to the model as context only, and stamped onto the plan afterwards —
  // whatever the model or critique says, this value wins.
  const videoFormat = input.category === 'video' ? resolveVideoFormatForBuild(input.answers, input.prompt) : undefined;

  onStage?.('Designing your preview…');
  const planResult = await requestPlan(
    videoFormat
      ? {
          ...input,
          videoFormatContext: `${videoFormat.label} — ${videoFormat.ratio}, ${videoFormat.width}×${videoFormat.height}. Safe areas: ${videoFormat.safeArea.join(' ')}`,
        }
      : input,
  );
  let plan = planResult.data;
  if (videoFormat) plan.videoFormat = videoFormat;
```

(The critique block and image stage stay as they are — `videoFormat` is not in
`CONTENT_REVISION_KEYS`, so `mergeCritique` can never touch it.)

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all PASS — including the existing critique-lockstep test, which
automatically proves the five new content keys are client-mergeable.

- [ ] **Step 7: Commit**

```bash
git add App/aiServerPlugin.ts App/src/ai/client.ts App/src/ai/orchestrator.ts tests/unit/aiServerPlugin-video.test.ts tests/unit/ai/orchestrator-video.test.ts
git commit -m "Author video storyboards via Claude with an app-decided format

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Veo-ready prompt assembly + aspect-ratio generation

**Files:**
- Create: `App/src/ai/videoPrompt.ts`
- Modify: `App/server/geminiVideoCore.ts` (`options.aspectRatio` → `parameters.aspectRatio`)
- Modify: `App/geminiVideoProxy.ts` (pass `body.aspectRatio` through)
- Modify: `api/gemini-video.ts` (pass `body.aspectRatio` through)
- Modify: `App/src/media/videoGenerator.ts` (video plans use the assembled prompt + aspect)
- Test: `tests/unit/ai/videoPrompt.test.ts` (new)
- Test additions: `tests/unit/server/geminiVideoCore.test.ts`, `tests/unit/media/videoGenerator.test.ts` (exact cases below)

**Interfaces:**
- Consumes: `plan.videoFormat` (Task 4 attach), `assembleImagePrompt` (media/imageGenerator).
- Produces: `assembleVideoPrompt(plan: BuildPlan): string`; `generateVideo(..., options?: { pollIntervalMs?; pollTimeoutMs?; aspectRatio?: '16:9' | '9:16' })`; both `/api/gemini-video` runtimes accept optional `aspectRatio` in the body (validated to the two literals); `requestMotionVideo(plan)` — for plans WITH `videoFormat`: prompt = `assembleVideoPrompt(plan)`, aspect = `plan.videoFormat.veoAspectRatio`; for motion plans (no `videoFormat`): byte-identical behavior to today.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/ai/videoPrompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { assembleVideoPrompt } from '../../../App/src/ai/videoPrompt';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'The grid that grows',
  body: 'Documentary realism, long lenses, unhurried cuts.',
  imageSubject: 'A grid engineer in a navy work shirt',
  imageAction: 'both hands torquing a junction bolt',
  imageLocation: 'red-brown Rajasthan earth, dry scrubland',
  imageFraming: 'medium close-up, slight low angle',
  recommendedDuration: '45–60 seconds',
  openingShot: 'Hands mid-task before we see a face.',
  keyScenes: [
    { title: 'The work', description: 'Close on the task.' },
    { title: 'The reach', description: 'The site widens behind it.' },
    { title: 'The outcome', description: 'A home lit at dusk.' },
  ],
  closingFrame: 'Reliance mark on a bold surface.',
  voiceoverCopy: 'The work is real.',
  videoFormat: {
    id: 'auditorium-ultrawide',
    label: 'Auditorium ultra-wide screen',
    ratio: '21:9',
    width: 2560,
    height: 1080,
    safeArea: ['Keep the centre clear for speaker/stage presence where relevant.'],
    veoAspectRatio: '16:9',
  },
  recommendedComponentNames: [],
  reasoning: '',
};

describe('assembleVideoPrompt', () => {
  const prompt = assembleVideoPrompt(plan);

  it('names the exact target format, ratio and dimensions', () => {
    expect(prompt).toContain('Auditorium ultra-wide screen');
    expect(prompt).toContain('Deliver at 21:9 (2560×1080)');
    expect(prompt).toContain('Keep the centre clear');
    expect(prompt).toContain('45–60 seconds');
  });

  it('carries the art-directed scene and every storyboard beat', () => {
    expect(prompt).toContain('red-brown Rajasthan earth');
    expect(prompt).toContain('Opening shot: Hands mid-task');
    expect(prompt).toContain('Scene 2 — The reach');
    expect(prompt).toContain('Closing frame: Reliance mark');
    expect(prompt).toContain('Visual direction: Documentary realism');
    expect(prompt).toContain('voiceover copy: "The work is real."');
  });
});
```

Add to `tests/unit/server/geminiVideoCore.test.ts` (inside the existing
`describe('generateVideo', …)`):

```ts
  it('sends parameters.aspectRatio when the option is given', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'stop' } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, { ...FAST, aspectRatio: '9:16' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.parameters).toEqual({ aspectRatio: '9:16' });
  });

  it('omits parameters entirely when no aspect is given', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 400, text: async () => 'stop' } as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);

    await generateVideo('key', DEFAULT_VIDEO_MODEL, 'p', undefined, FAST);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.parameters).toBeUndefined();
  });
```

Add to `tests/unit/media/videoGenerator.test.ts` (inside the existing describe):

```ts
  it('sends the assembled video prompt and aspect for video-format plans', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:v' } }) } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const plan: BuildPlan = {
      imageSubject: 's',
      imageAction: 'a',
      imageLocation: 'l',
      imageFraming: 'f',
      openingShot: 'Open close.',
      videoFormat: {
        id: 'instagram-story',
        label: 'Instagram Story / Reel',
        ratio: '9:16',
        width: 1080,
        height: 1920,
        safeArea: ['Keep text large and centred.'],
        veoAspectRatio: '9:16',
      },
      recommendedComponentNames: [],
      reasoning: '',
    };

    await requestMotionVideo(plan);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.aspectRatio).toBe('9:16');
    expect(body.prompt).toContain('Deliver at 9:16 (1080×1920)');
  });

  it('sends no aspect and the plain scene prompt for motion plans (unchanged)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:v' } }) } as Response);
    vi.stubGlobal('fetch', fetchMock);

    const plan: BuildPlan = { imageSubject: 's', imageAction: 'a', imageLocation: 'l', imageFraming: 'f', recommendedComponentNames: [], reasoning: '' };
    await requestMotionVideo(plan);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.aspectRatio).toBeUndefined();
    expect(body.prompt).not.toContain('Deliver at');
  });
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/ai/videoPrompt.test.ts tests/unit/server/geminiVideoCore.test.ts tests/unit/media/videoGenerator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Create `App/src/ai/videoPrompt.ts`**

```ts
import type { BuildPlan } from './schema';
import { assembleImagePrompt } from '../media/imageGenerator';

/**
 * The Veo-ready prompt is assembled by the app, never authored whole by the
 * model: the art-directed scene + visual baseline, the storyboard beats the
 * model DID author, and the destination format block (exact ratio and
 * dimensions — Veo generates at the nearest supported aspect, the prompt
 * composes for the true target).
 */
export function assembleVideoPrompt(plan: BuildPlan): string {
  const beats = [
    plan.openingShot ? `Opening shot: ${plan.openingShot}` : '',
    ...(plan.keyScenes ?? []).map((s, i) => `Scene ${i + 1} — ${s.title}: ${s.description}`),
    plan.closingFrame ? `Closing frame: ${plan.closingFrame}` : '',
  ].filter(Boolean);

  const f = plan.videoFormat;

  return [
    assembleImagePrompt(plan),
    plan.body ? `Visual direction: ${plan.body}` : '',
    beats.join('\n'),
    plan.voiceoverCopy ? `On-screen/voiceover copy: "${plan.voiceoverCopy}"` : '',
    f
      ? `Format: ${f.label}. Deliver at ${f.ratio} (${f.width}×${f.height}). Safe areas: ${f.safeArea.join(' ')}${
          plan.recommendedDuration ? ` Recommended duration: ${plan.recommendedDuration}.` : ''
        }`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}
```

- [ ] **Step 4: Thread the aspect through the core and both runtimes**

`App/server/geminiVideoCore.ts` — the options type becomes
`options?: { pollIntervalMs?: number; pollTimeoutMs?: number; aspectRatio?: '16:9' | '9:16' }`,
and after building the request body's `instances`, extend the start call:

```ts
    const requestBody: Record<string, unknown> = { instances: [instance] };
    if (options?.aspectRatio) requestBody.parameters = { aspectRatio: options.aspectRatio };
```

…and use `JSON.stringify(requestBody)` in the start fetch.

`App/geminiVideoProxy.ts` — `VideoRequestBody` gains `aspectRatio?: string;`; the
`generateVideo` call becomes:

```ts
          const aspectRatio = body.aspectRatio === '16:9' || body.aspectRatio === '9:16' ? body.aspectRatio : undefined;
          const result = await generateVideo(apiKey, model, body.prompt, body.startImageDataUrl, aspectRatio ? { aspectRatio } : undefined);
```

`api/gemini-video.ts` — same validation:

```ts
  const body = req.body as { prompt: string; startImageDataUrl?: unknown; aspectRatio?: unknown };
  const startImageDataUrl = typeof body.startImageDataUrl === 'string' ? body.startImageDataUrl : undefined;
  const aspectRatio = body.aspectRatio === '16:9' || body.aspectRatio === '9:16' ? body.aspectRatio : undefined;

  const result = await generateVideo(apiKey, model, body.prompt, startImageDataUrl, aspectRatio ? { aspectRatio } : undefined);
```

`App/src/media/videoGenerator.ts`:

```ts
import { assembleVideoPrompt } from '../ai/videoPrompt';
// …inside requestMotionVideo, replace the fetch body construction:
    const isVideoConcept = !!plan.videoFormat;
    const res = await fetch('/api/gemini-video', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: isVideoConcept ? assembleVideoPrompt(plan) : assembleImagePrompt(plan),
        startImageDataUrl: plan.heroImage,
        aspectRatio: plan.videoFormat?.veoAspectRatio,
      }),
    });
```

(Motion plans have no `videoFormat`: prompt and body are unchanged —
`aspectRatio: undefined` is dropped by JSON.stringify.)

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS (the pre-existing motion videoGenerator tests prove the
unchanged path).

- [ ] **Step 6: Commit**

```bash
git add App/src/ai/videoPrompt.ts App/server/geminiVideoCore.ts App/geminiVideoProxy.ts api/gemini-video.ts App/src/media/videoGenerator.ts tests/unit/ai/videoPrompt.test.ts tests/unit/server/geminiVideoCore.test.ts tests/unit/media/videoGenerator.test.ts
git commit -m "Assemble destination-formatted Veo prompts and generate at the nearest aspect

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: Storyboard renderer at true ratio with safe-area guides

**Files:**
- Create: `App/src/components/previews/VideoPreview.tsx` (canvas art + `VideoConceptDetails`)
- Modify: `App/src/components/PreviewFrame.tsx` (optional `overrideDimensions` prop)
- Modify: `App/src/components/BuildPreview.tsx` (video branches)
- Test: `tests/unit/components/VideoPreview.test.tsx` (new)

**Interfaces:**
- Consumes: `plan.videoFormat` + storyboard fields; `requestMotionVideo` (Task 5); `describeHeroImage`, `HERO_SCRIM` (website/shared), `DimensionVariant` type.
- Produces: `VideoPreview({ plan })` — the IN-CANVAS art (safe-area guides + title/opening treatment); `VideoConceptDetails({ plan })` — the below-canvas concept block (meta chips, scenes, closing, VO, collapsed Veo-ready prompt, Generate button); `PreviewFrame` accepts `overrideDimensions?: DimensionVariant` (wins over the variant lookup AND suppresses the variant picker).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/VideoPreview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VideoConceptDetails, VideoPreview } from '../../../App/src/components/previews/VideoPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'The grid that grows',
  subheadline: 'A film about the build-out.',
  body: 'Documentary realism.',
  imageSubject: 's',
  imageAction: 'a',
  imageLocation: 'l',
  imageFraming: 'f',
  recommendedDuration: '45–60 seconds',
  openingShot: 'Hands mid-task before we see a face.',
  keyScenes: [
    { title: 'The work', description: 'Close on the task.' },
    { title: 'The reach', description: 'The site widens.' },
    { title: 'The outcome', description: 'A home lit at dusk.' },
  ],
  closingFrame: 'Reliance mark on a bold surface.',
  voiceoverCopy: 'The work is real.',
  videoFormat: {
    id: 'instagram-story',
    label: 'Instagram Story / Reel',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    safeArea: ['Keep text large and centred.'],
    veoAspectRatio: '9:16',
  },
  recommendedComponentNames: [],
  reasoning: '',
};

describe('VideoPreview (canvas art)', () => {
  it('renders the title and opening shot inside safe-area guides', () => {
    const { container } = render(<VideoPreview plan={plan} />);

    expect(screen.getByText('The grid that grows')).toBeInTheDocument();
    expect(screen.getByText(/Hands mid-task/)).toBeInTheDocument();
    expect(container.querySelector('[data-safe-area="9:16"]')).not.toBeNull();
  });
});

describe('VideoConceptDetails', () => {
  it('shows format, ratio, dimensions and duration', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('Instagram Story / Reel')).toBeInTheDocument();
    expect(screen.getByText('9:16')).toBeInTheDocument();
    expect(screen.getByText('1080 × 1920')).toBeInTheDocument();
    expect(screen.getByText('45–60 seconds')).toBeInTheDocument();
  });

  it('lists the storyboard beats, closing frame and voiceover copy', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('The work')).toBeInTheDocument();
    expect(screen.getByText('The outcome')).toBeInTheDocument();
    expect(screen.getByText(/Reliance mark on a bold surface/)).toBeInTheDocument();
    expect(screen.getByText(/"The work is real."/)).toBeInTheDocument();
  });

  it('exposes the assembled Veo-ready prompt with the exact target format', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText('Veo-ready prompt')).toBeInTheDocument();
    expect(screen.getByText(/Deliver at 9:16 \(1080×1920\)/)).toBeInTheDocument();
  });

  it('shows the safe-area guidance and the generate affordance', () => {
    render(<VideoConceptDetails plan={plan} />);

    expect(screen.getByText(/Keep text large and centred/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate video/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/VideoPreview.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/src/components/previews/VideoPreview.tsx`**

```tsx
import { useState } from 'react';
import { Container, Text, Badge, Surface, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { assembleVideoPrompt } from '../../ai/videoPrompt';
import { requestMotionVideo } from '../../media/videoGenerator';
import { HERO_SCRIM } from './website/shared';

/**
 * Video is previewed as a storyboard concept: the canvas (this component,
 * rendered inside PreviewFrame at the destination's true dimensions) shows
 * the opening treatment inside dashed safe-area guides; the concept detail
 * block (VideoConceptDetails, rendered by BuildPreview below the frame)
 * carries the beats, copy, assembled Veo prompt, and opt-in generation.
 */

/** Dashed guide geometry per ratio family — a concept aid, not a broadcast spec. */
function safeAreaInsets(ratio: string): { inset: string; bands?: 'vertical' | 'horizontal' } {
  if (ratio === '9:16' || ratio === '4:5') return { inset: '12% 8%', bands: 'horizontal' };
  if (ratio === '21:9') return { inset: '8% 18%', bands: 'vertical' };
  if (ratio === '1.91:1') return { inset: '10% 8%' };
  return { inset: '6% 5%' }; // 16:9, 1:1, and anything custom
}

export function VideoPreview({ plan }: { plan: BuildPlan }) {
  const format = plan.videoFormat;
  const guides = safeAreaInsets(format?.ratio ?? '16:9');

  const backdrop = plan.heroImage
    ? { backgroundImage: `${HERO_SCRIM}, url(${plan.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--Surface-Bold)' };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...backdrop }}>
      {plan.heroImage && (
        <div role="img" aria-label={describeHeroImage(plan)} style={{ position: 'absolute', inset: 0 }} />
      )}

      {/* Safe-area guides — always on: this is a concept artifact. */}
      <div
        data-safe-area={format?.ratio ?? '16:9'}
        style={{
          position: 'absolute',
          inset: guides.inset,
          border: '2px dashed rgba(255,255,255,0.45)',
          borderRadius: 8,
          pointerEvents: 'none',
        }}
      />

      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="10"
        style={{ position: 'relative', height: '100%', boxSizing: 'border-box' }}
      >
        <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
          {format && (
            <Badge size="m" appearance="brand-bg">
              {format.ratio}
            </Badge>
          )}
          {plan.recommendedDuration && (
            <Text variant="label" size="S" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
              {plan.recommendedDuration}
            </Text>
          )}
        </Container>

        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '90%' }}>
            {plan.headline}
          </Text>
          {plan.openingShot && (
            <Text variant="body" size="M" style={{ color: 'var(--Text-OnBold-Medium, #fff)', maxWidth: '85%' }}>
              Opening: {plan.openingShot}
            </Text>
          )}
        </Container>
      </Container>
    </div>
  );
}

type VideoState = { status: 'idle' | 'generating' | 'done' | 'error'; videoUrl?: string; error?: string };

export function VideoConceptDetails({ plan }: { plan: BuildPlan }) {
  const format = plan.videoFormat;
  const [videoState, setVideoState] = useState<VideoState>({ status: 'idle' });
  const canGenerate = !!(plan.imageSubject && plan.imageAction && plan.imageLocation && plan.imageFraming);

  const handleGenerate = async () => {
    setVideoState({ status: 'generating' });
    const result = await requestMotionVideo(plan);
    if (result.videoUrl) setVideoState({ status: 'done', videoUrl: result.videoUrl });
    else setVideoState({ status: 'error', error: result.error || 'Video generation failed.' });
  };

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full" padding="4">
      <Container variant="full-bleed" layout="flex" gap="2" wrap align="center">
        {format && (
          <>
            <Badge size="s" appearance="primary">
              {format.label}
            </Badge>
            <Badge size="s" appearance="primary">
              {format.ratio}
            </Badge>
            <Text variant="label" size="S" appearance="neutral">
              {format.width} × {format.height}
            </Text>
          </>
        )}
        {plan.recommendedDuration && (
          <Text variant="label" size="S" appearance="neutral">
            {plan.recommendedDuration}
          </Text>
        )}
      </Container>

      {format && (
        <Text variant="body" size="S" appearance="neutral">
          Safe areas: {format.safeArea.join(' ')}
          {format.note ? ` ${format.note}` : ''}
        </Text>
      )}

      {plan.subheadline && (
        <Text variant="body" size="M" appearance="neutral">
          {plan.subheadline}
        </Text>
      )}

      {plan.keyScenes && plan.keyScenes.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(plan.keyScenes.length, 5)} gap="4" width="full">
          {plan.keyScenes.map((scene, i) => (
            <Surface key={scene.title} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
              <Text variant="label" size="S" appearance="primary">
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text variant="label" size="M" weight="high">
                {scene.title}
              </Text>
              <Text variant="body" size="S" appearance="neutral">
                {scene.description}
              </Text>
            </Surface>
          ))}
        </Container>
      )}

      {plan.closingFrame && (
        <Text variant="body" size="S" appearance="neutral">
          Closing frame: {plan.closingFrame}
        </Text>
      )}

      {plan.voiceoverCopy && (
        <Surface mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
          <Text variant="label" size="S" appearance="neutral">
            Voiceover / on-screen copy
          </Text>
          <Text variant="title" size="S">
            "{plan.voiceoverCopy}"
          </Text>
        </Surface>
      )}

      <details style={{ width: '100%' }}>
        <summary style={{ cursor: 'pointer' }}>
          <Text variant="label" size="S" appearance="neutral">
            Veo-ready prompt
          </Text>
        </summary>
        <Surface mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)', marginTop: 'var(--Spacing-2)' }}>
          <Text variant="body" size="S" appearance="neutral" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--Typography-Font-Code, monospace)' }}>
            {assembleVideoPrompt(plan)}
          </Text>
          {format && format.veoAspectRatio !== format.ratio && (
            <Text variant="label" size="XS" appearance="neutral" style={{ marginTop: 'var(--Spacing-2)' }}>
              Generates at {format.veoAspectRatio}; deliver/crop at {format.ratio}.
            </Text>
          )}
        </Surface>
      </details>

      {videoState.status === 'done' && videoState.videoUrl ? (
        <video src={videoState.videoUrl} controls autoPlay loop muted style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 'var(--Shape-3)' }} />
      ) : (
        canGenerate && (
          <Container variant="full-bleed" width="fit">
            <Button
              attention="medium"
              size="m"
              onClick={handleGenerate}
              disabled={videoState.status === 'generating'}
              loading={videoState.status === 'generating'}
            >
              {videoState.status === 'generating' ? 'Generating video… this can take a few minutes' : 'Generate video'}
            </Button>
          </Container>
        )
      )}

      {videoState.status === 'error' && (
        <Text variant="body" size="S" appearance="negative">
          {videoState.error}
        </Text>
      )}
    </Container>
  );
}
```

- [ ] **Step 4: `PreviewFrame` override + `BuildPreview` wiring**

`App/src/components/PreviewFrame.tsx`:

- Import the type: `import { DIMENSIONS, type DimensionVariant } from '../data/previewDimensions';`
- Props gain `overrideDimensions?: DimensionVariant;`
- The variant resolution becomes:

```ts
  const variants = DIMENSIONS[category];
  const variant = overrideDimensions ?? variants.find((v) => v.id === variantId) ?? variants[0];
```

- The picker condition becomes `{variants.length > 1 && !overrideDimensions && (`.

`App/src/components/BuildPreview.tsx`:

- Imports: `import { VideoPreview, VideoConceptDetails } from './previews/VideoPreview';`
- `PreviewFrame` gains the override for video (the `videoFormat` shape structurally
  satisfies `DimensionVariant`'s `{ id, label, width, height }`):

```tsx
      <PreviewFrame
        category={category}
        variantId={variantId}
        onVariantChange={setVariantId}
        chrome={CHROME_BY_CATEGORY[category]}
        overrideDimensions={category === 'video' ? plan.videoFormat : undefined}
      >
```

- Inside the frame, with the other category branches: `{category === 'video' && <VideoPreview plan={plan} />}`
- After the navigator block (outside the frame): `{category === 'video' && <VideoConceptDetails plan={plan} />}`

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add App/src/components/previews/VideoPreview.tsx App/src/components/PreviewFrame.tsx App/src/components/BuildPreview.tsx tests/unit/components/VideoPreview.test.tsx
git commit -m "Render video concepts at true destination ratio with safe-area guides

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: E2E + full gates

**Files:**
- Modify: `tests/e2e/builder.spec.ts` (one new test)

- [ ] **Step 1: Add the hermetic video e2e test**

Append to `tests/e2e/builder.spec.ts`:

```ts
test('video builds render a storyboard at the destination ratio', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Video', { exact: true }).click();

  await expect(page.getByText('Where will this video be used?')).toBeVisible();
  await page.getByText('Instagram Story / Reel', { exact: true }).click();

  await expect(page.getByText('What should the film feel like?')).toBeVisible();
  await page.getByText('Grounded & real', { exact: true }).click();

  await expect(page.getByText("Here's what we'd build")).toBeVisible();
  await expect(page.getByText('9:16').first()).toBeVisible();
  await expect(page.getByText('1080 × 1920')).toBeVisible();
  await expect(page.getByText('Veo-ready prompt')).toBeVisible();
});
```

- [ ] **Step 2: Run all four gates**

Run: `npm run app:build && npm run lint && npx vitest run && npm run test:e2e`
Expected: all PASS (3 e2e tests now).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/builder.spec.ts
git commit -m "Add hermetic e2e coverage for the video storyboard flow

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 8: Deploy + live verification (CONTROLLER-run)

Run by the controller, not a fresh subagent (spends real quota; uses the established
scratchpad driver technique).

- [ ] **Step 1: Deploy**

```bash
npm run app:build && vercel build --prod --yes && vercel deploy --prebuilt --prod --yes
```

- [ ] **Step 2: Live verify on https://reliance-builder.vercel.app**

Playwright driver from the scratchpad: quick CTA Video → "Instagram Story / Reel" →
"Grounded & real" → storyboard renders (9:16 canvas, meta shows 1080 × 1920, scenes
+ VO + Veo-ready prompt with `Deliver at 9:16 (1080×1920)`) → screenshot → click
Generate video → confirm a real vertical Veo clip renders (screenshot). Also verify
Motion still behaves (one motion build, CSS stage renders — no video regression).

- [ ] **Step 3: Ledger + report**

Record results (screenshots, console) in `.superpowers/sdd/task-8-report.md` and the
progress ledger.

---

## Acceptance criteria traceability

| Product-spec criterion | Where satisfied |
|---|---|
| Ratio/destination selection step with the nine options | Tasks 2 (question), 3 (custom text step) |
| Destination → exact ratio + dimensions | Task 1 registry (+ tests pinning every pair) |
| Concept preview shows format/ratio/dimensions/safe-areas/duration/title/summary/direction/opening/scenes/closing/VO | Tasks 4 (authoring), 6 (renderer) |
| Veo-ready prompt includes format, ratio, dimensions | Task 5 (`assembleVideoPrompt` + test) |
| Storyboard guidance changes with ratio | Task 4 (system prompt + per-build context), Task 6 (guides per ratio) |
| Preview canvas at selected dimensions | Task 6 (`overrideDimensions`) |
| Motion flow unchanged | Global constraint; Tasks 5/6 preserve motion paths; motion tests untouched |
| Gates pass | Task 7 |
| Hosted verification | Task 8 |

