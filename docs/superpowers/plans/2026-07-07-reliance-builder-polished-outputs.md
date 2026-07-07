# Reliance Builder Polished Pattern-Driven Outputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Reliance Builder's generated outputs premium and Reliance-specific: Fable 5 picks a curated layout pattern and authors content into it, a critique pass revises weak content, renderers enforce art-direction in code, Veo replaces the Higgsfield CLI for motion video, and lint + Playwright gates are added.

**Architecture:** The existing two-phase Claude flow (classify → plan) becomes an orchestrated pipeline (classify → plan-with-pattern → critique → media) coordinated by a new `App/src/ai/orchestrator.ts`. A curated `patternRegistry` constrains layout choices the same way the component registry already constrains component choices. Preview renderers become pattern switches. All AI output stays validated against real registries; every layer degrades gracefully (fallback model → deterministic `fallbackPlan`; media failure → no media).

**Tech Stack:** React 18 + `@jds4/oneui-react` (Reliance brand), Vite 5 dev-server proxy plugins (Anthropic Messages API, Gemini image, Gemini Veo video), Vitest 4 + Testing Library, ESLint 9 (typescript-eslint), Playwright.

**Spec:** `docs/superpowers/specs/2026-07-07-reliance-builder-polished-outputs-design.md`

## Global Constraints

- Reliance-only: never add brand switching; never touch the Reliance lock in `App/vite.config.ts` / `App/src/data/brandsConfig.ts`.
- Claude authors content and structural *choices* only — never colors, fonts, spacing, radii, or new layouts. All styling comes from Reliance tokens (`var(--...)`) and `@jds4/oneui-react` components.
- Every model-authored ID is validated against a real registry before use (components: `AVAILABLE_COMPONENTS`; patterns: `patternRegistry`). Invalid → default, never crash.
- Never block the preview: primary model failure → one retry on the fallback model → `fallbackPlan.ts` deterministic content. Media failure → preview without media.
- Model env vars: `ANTHROPIC_MODEL` (code default `claude-fable-5`), `ANTHROPIC_FALLBACK_MODEL` (code default `claude-sonnet-5`), `GEMINI_VIDEO_MODEL` (code default `veo-3.0-generate-001`). Never edit `.env` — code defaults + README documentation only.
- Keep every file under 500 lines. Match existing code style (comment density explains *why*, JSDoc on exported things, no semicolon/style changes).
- New unit tests go in **new test files** (additive) unless a task explicitly shows the exact edit to an existing test file.
- Run `npx vitest run` after each task; it must pass before committing.
- Every commit message ends with: `Co-Authored-By: claude-flow <ruv@ruv.net>`
- Working directory for all commands: `/Users/keithbone/component_test`.

---

### Task 1: Fable 5 primary + fallback model chain

**Files:**
- Modify: `App/aiServerPlugin.ts` (model constant → lazy resolution + fallback chain, lines 24 and 229-270 and the two `sendJson(res, 200, ...)` call sites)
- Modify: `App/vite.config.ts:47-50` (env passthrough)
- Modify: `App/src/ai/schema.ts:91-96` (`AIResult` gains `model?`)
- Modify: `App/src/ai/client.ts` (`postToClaude` returns `model`, both request fns thread it)
- Modify: `App/src/types.ts:29-33` (`AIMeta` gains `model?`)
- Modify: `App/src/App.tsx:21-25,62` (thread model into metas)
- Test: `tests/unit/aiServerPlugin-models.test.ts` (new)

**Interfaces:**
- Consumes: existing `callAnthropic`, `CLASSIFY_TOOL`, `PLAN_TOOL` in `App/aiServerPlugin.ts`.
- Produces: `resolveModels(): { primary: string; fallback: string }` and `callAnthropicWithFallback(apiKey: string, system: string, userContent: string, tool): Promise<{ input: unknown; model: string }>` (both exported from `App/aiServerPlugin.ts`); proxy success responses become `{ result, model }`; `AIResult<T>` gains `model?: string`; `AIMeta` gains `model?: string`. Task 8 renders the badge; Task 4 reuses `callAnthropicWithFallback` for critique.

Background: the current `const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'` is evaluated at module import — which happens when `App/vite.config.ts` imports the plugin, *before* `defineConfig`'s callback copies `.env` values onto `process.env`. So an `ANTHROPIC_MODEL` set only in `.env` was silently ignored. This task fixes that by resolving models lazily, per request.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/aiServerPlugin-models.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAnthropicWithFallback, resolveModels, PLAN_TOOL } from '../../App/aiServerPlugin';

function anthropicResponse(marker: string): Response {
  return {
    ok: true,
    json: async () => ({
      content: [{ type: 'tool_use', input: { headline: marker } }],
      stop_reason: 'tool_use',
    }),
  } as Response;
}

function anthropicError(status: number): Response {
  return { ok: false, status, text: async () => 'model unavailable' } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_MODEL;
  delete process.env.ANTHROPIC_FALLBACK_MODEL;
});

describe('resolveModels', () => {
  it('defaults to Fable 5 primary with Sonnet 5 fallback', () => {
    expect(resolveModels()).toEqual({ primary: 'claude-fable-5', fallback: 'claude-sonnet-5' });
  });

  it('reads env overrides at call time, not import time', () => {
    process.env.ANTHROPIC_MODEL = 'custom-primary';
    process.env.ANTHROPIC_FALLBACK_MODEL = 'custom-fallback';

    expect(resolveModels()).toEqual({ primary: 'custom-primary', fallback: 'custom-fallback' });
  });
});

describe('callAnthropicWithFallback', () => {
  it('uses the primary model when it succeeds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-fable-5');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe('claude-fable-5');
  });

  it('retries once on the fallback model when the primary fails', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(anthropicError(500)).mockResolvedValueOnce(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-sonnet-5');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe('claude-sonnet-5');
  });

  it('retries on the fallback model when the primary response is truncated', async () => {
    const truncated = {
      ok: true,
      json: async () => ({ content: [], stop_reason: 'max_tokens' }),
    } as Response;
    const fetchMock = vi.fn().mockResolvedValueOnce(truncated).mockResolvedValueOnce(anthropicResponse('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { model } = await callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL);

    expect(model).toBe('claude-sonnet-5');
  });

  it('throws when both models fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(anthropicError(500)));

    await expect(callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL)).rejects.toThrow(/Anthropic API error 500/);
  });

  it('does not retry when primary and fallback are the same model', async () => {
    process.env.ANTHROPIC_MODEL = 'claude-sonnet-5';
    process.env.ANTHROPIC_FALLBACK_MODEL = 'claude-sonnet-5';
    const fetchMock = vi.fn().mockResolvedValue(anthropicError(500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callAnthropicWithFallback('key', 'sys', 'user', PLAN_TOOL)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/aiServerPlugin-models.test.ts`
Expected: FAIL — `callAnthropicWithFallback` / `resolveModels` are not exported.

- [ ] **Step 3: Implement the model chain in `App/aiServerPlugin.ts`**

Replace line 24 (`const ANTHROPIC_MODEL = ...`) with:

```ts
/**
 * Model resolution is lazy (read per request, not at module import) because
 * this module is imported by App/vite.config.ts *before* its defineConfig
 * callback copies .env values onto process.env — a module-level constant
 * would always see the pre-loadEnv environment and silently ignore
 * ANTHROPIC_MODEL / ANTHROPIC_FALLBACK_MODEL set in .env.
 */
export function resolveModels(): { primary: string; fallback: string } {
  return {
    primary: process.env.ANTHROPIC_MODEL || 'claude-fable-5',
    fallback: process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-sonnet-5',
  };
}
```

Change `callAnthropic`'s signature to accept the model explicitly (replace the current
`async function callAnthropic(apiKey, system, userContent, tool)` signature and the
`model: ANTHROPIC_MODEL` line in its request body):

```ts
async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  userContent: string,
  tool: typeof CLASSIFY_TOOL | typeof PLAN_TOOL,
) {
```

…and in the `body: JSON.stringify({ ... })`: `model,` instead of `model: ANTHROPIC_MODEL,`.

Add below `callAnthropic`:

```ts
/**
 * One retry on the fallback model covers every primary failure mode this
 * proxy can detect — HTTP error, overload, max_tokens truncation, missing
 * tool_use block. Both models failing propagates the error so the client
 * falls back to fallbackPlan.ts's deterministic content.
 */
export async function callAnthropicWithFallback(
  apiKey: string,
  system: string,
  userContent: string,
  tool: typeof CLASSIFY_TOOL | typeof PLAN_TOOL,
): Promise<{ input: unknown; model: string }> {
  const { primary, fallback } = resolveModels();
  try {
    return { input: await callAnthropic(apiKey, primary, system, userContent, tool), model: primary };
  } catch (primaryErr) {
    if (fallback === primary) throw primaryErr;
    return { input: await callAnthropic(apiKey, fallback, system, userContent, tool), model: fallback };
  }
}
```

In `configureServer`'s handler, replace both call sites:

```ts
if (body.type === 'classify') {
  const { input, model } = await callAnthropicWithFallback(
    apiKey,
    RELIANCE_SYSTEM_PROMPT,
    `User's request: "${body.prompt}"\n\nClassify it and propose any useful follow-up questions.`,
    CLASSIFY_TOOL,
  );
  sendJson(res, 200, { result: input, model });
  return;
}
```

…and identically for the `plan` branch (`const { input, model } = await callAnthropicWithFallback(apiKey, planSystemPrompt, contextLines.join('\n'), PLAN_TOOL); sendJson(res, 200, { result: input, model });`).

- [ ] **Step 4: Pass the fallback model through the env in `App/vite.config.ts`**

After line 48 (`if (env.ANTHROPIC_MODEL) ...`), add:

```ts
if (env.ANTHROPIC_FALLBACK_MODEL) process.env.ANTHROPIC_FALLBACK_MODEL = env.ANTHROPIC_FALLBACK_MODEL;
```

- [ ] **Step 5: Thread the model into client results**

In `App/src/ai/schema.ts`, extend `AIResult`:

```ts
export interface AIResult<T> {
  data: T;
  source: 'claude' | 'fallback';
  /** Present when source is 'fallback' — shown honestly in Build details, never hidden. */
  fallbackReason?: string;
  /** Which Claude model actually authored this stage (e.g. after a fallback-model retry). */
  model?: string;
}
```

In `App/src/types.ts`, extend `AIMeta`:

```ts
export interface AIMeta {
  source: 'claude' | 'fallback';
  reasoning: string;
  fallbackReason?: string;
  /** Which Claude model authored this stage, when source is 'claude'. */
  model?: string;
}
```

In `App/src/ai/client.ts`, change `postToClaude`'s success shape and returns:

```ts
async function postToClaude(
  body: unknown,
): Promise<{ ok: true; result: unknown; model?: string } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
    return { ok: true, result: json.result, model: typeof json.model === 'string' ? json.model : undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error reaching the local Claude proxy' };
  }
}
```

In `requestClassification`, the success return becomes:

```ts
return {
  source: 'claude',
  model: response.model,
  data: { ... unchanged ... },
};
```

In `requestPlan`, the final return becomes `return { source: 'claude', model: response.model, data };`.

In `App/src/App.tsx`, thread it into both metas: `classifyMeta` gains `model: classification.model,` and `planMeta` gains `model: result.model,`.

- [ ] **Step 6: Run the new test and the full suite**

Run: `npx vitest run`
Expected: all PASS (existing `client.test.ts` mocks return no `model` field — `undefined` is fine).

- [ ] **Step 7: Document the env vars in `README.md`**

In the "Enabling live Claude generation" section, after the `ANTHROPIC_API_KEY` step, add:

```markdown
Optional model overrides (both read from the repo-root `.env`):

- `ANTHROPIC_MODEL` — primary orchestration model. Default: `claude-fable-5`.
- `ANTHROPIC_FALLBACK_MODEL` — retried once automatically when the primary model
  fails for any reason. Default: `claude-sonnet-5`.
```

- [ ] **Step 8: Commit**

```bash
git add App/aiServerPlugin.ts App/vite.config.ts App/src/ai/schema.ts App/src/ai/client.ts App/src/types.ts App/src/App.tsx tests/unit/aiServerPlugin-models.test.ts README.md
git commit -m "Add Fable 5 primary model with automatic fallback-model retry

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 2: Schema additions + fallback plan defaults

**Files:**
- Modify: `App/src/ai/schema.ts` (patternId, carouselFrames, qualityNotes, stat/closing slide types)
- Modify: `App/src/ai/fallbackPlan.ts` (default patternId, carouselFrames, new slide types in the fallback deck)
- Test: `tests/unit/ai/schema-plan-fields.test.ts` (new)

**Interfaces:**
- Consumes: existing `BuildPlan`, `SlideContent`, `SlideType` in `App/src/ai/schema.ts`.
- Produces: `SlideType = 'cover' | 'divider' | 'content' | 'split-photo' | 'table' | 'stat' | 'closing'`; `SlideContent` gains `statValue?: string; statLabel?: string`; new `export interface CarouselFrame { headline: string; body?: string }`; `BuildPlan` gains `patternId?: string`, `carouselFrames?: CarouselFrame[]`, `qualityNotes?: string`. `fallbackPlan()` output always has `patternId` set to a literal registry-default ID per category (`website: 'product-story'`, `app-screens: 'dashboard'`, `slides: 'deck'`, `social-media: 'announcement'`, `motion: 'loader'`) — Task 3's registry test cross-checks these IDs exist.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ai/schema-plan-fields.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fallbackPlan } from '../../../App/src/ai/fallbackPlan';
import type { BuildPlan, CarouselFrame, SlideContent } from '../../../App/src/ai/schema';

describe('BuildPlan new fields', () => {
  it('accepts patternId, carouselFrames, qualityNotes, and stat/closing slides', () => {
    const frames: CarouselFrame[] = [{ headline: 'One' }, { headline: 'Two', body: 'Detail' }];
    const slides: SlideContent[] = [
      { slideType: 'stat', headline: 'Growth', statValue: '42%', statLabel: 'YoY' },
      { slideType: 'closing', headline: 'Thank you.' },
    ];
    const plan: BuildPlan = {
      patternId: 'campaign-hero',
      carouselFrames: frames,
      qualityNotes: 'Tightened the headline.',
      slides,
      recommendedComponentNames: [],
      reasoning: '',
    };

    expect(plan.patternId).toBe('campaign-hero');
    expect(plan.slides?.[0].statValue).toBe('42%');
  });
});

describe('fallbackPlan pattern defaults', () => {
  const input = { prompt: 'x', answers: {} };

  it.each([
    ['website', 'product-story'],
    ['app-screens', 'dashboard'],
    ['slides', 'deck'],
    ['social-media', 'announcement'],
    ['motion', 'loader'],
  ] as const)('assigns the %s default pattern %s', (category, patternId) => {
    expect(fallbackPlan({ ...input, category }, 'why').data.patternId).toBe(patternId);
  });

  it('always provides carousel frames so a carousel build never renders empty', () => {
    const frames = fallbackPlan({ ...input, category: 'social-media' }, 'why').data.carouselFrames;
    expect(frames?.length).toBeGreaterThanOrEqual(3);
    expect(frames?.[0].headline).toBeTruthy();
  });

  it('includes stat and closing slides in the fallback deck', () => {
    const slides = fallbackPlan({ ...input, category: 'slides' }, 'why').data.slides ?? [];
    expect(slides.some((s) => s.slideType === 'stat' && s.statValue)).toBe(true);
    expect(slides.at(-1)?.slideType).toBe('closing');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/ai/schema-plan-fields.test.ts`
Expected: FAIL — `CarouselFrame` not exported; `'stat'` not assignable to `SlideType`; `patternId` undefined.

- [ ] **Step 3: Extend `App/src/ai/schema.ts`**

Change the `SlideType` union and `SlideContent`:

```ts
export type SlideType = 'cover' | 'divider' | 'content' | 'split-photo' | 'table' | 'stat' | 'closing';

export interface SlideContent {
  slideType: SlideType;
  headline: string;
  /** cover only. */
  subheadline?: string;
  /** content/split-photo only. */
  body?: string;
  /** content/split-photo only, optional eyebrow label. */
  kicker?: string;
  /** table only — 2-5 columns, each a header + 2-5 short bullet items. */
  tableColumns?: { header: string; items: string[] }[];
  /** stat only: the single large number/value the slide is about, e.g. "42%" or "₹2,400 Cr". */
  statValue?: string;
  /** stat only: one-line caption under the value. */
  statLabel?: string;
}
```

Add above `BuildPlan`:

```ts
/** Social carousel: one frame's content — rendered at 1080×1080 like a mini slide. */
export interface CarouselFrame {
  headline: string;
  body?: string;
}
```

Add to `BuildPlan` (after `socialFormat`):

```ts
  /** Social carousel only: 3-5 frames, navigated like the slides deck. */
  carouselFrames?: CarouselFrame[];
```

…and after `recommendedComponentNames`:

```ts
  /**
   * Curated layout pattern for this build — always validated against
   * data/patternRegistry.ts before rendering, exactly like component names.
   * A free Claude choice only for website/app-screens; derived from
   * socialFormat/motionConcept for social/motion, fixed to "deck" for slides.
   */
  patternId?: string;
  /** One-line summary from the critique pass — shown in Build details. */
  qualityNotes?: string;
```

- [ ] **Step 4: Extend `App/src/ai/fallbackPlan.ts`**

Add after `HEADLINE_BY_CATEGORY`:

```ts
/**
 * Literal registry-default pattern IDs (see data/patternRegistry.ts). Kept as
 * literals — not a registry import — so this module stays dependency-light;
 * the registry's own test asserts these IDs really exist there.
 */
const PATTERN_BY_CATEGORY: Record<BuildCategoryId, string> = {
  website: 'product-story',
  'app-screens': 'dashboard',
  slides: 'deck',
  'social-media': 'announcement',
  motion: 'loader',
};
```

In the `base: BuildPlan` object: add `patternId: PATTERN_BY_CATEGORY[input.category],` after `headline`; add after `socialFormat: 'square',`:

```ts
    carouselFrames: [
      { headline: 'Frame one message', body: 'Supporting detail goes here.' },
      { headline: 'Frame two message', body: 'Supporting detail goes here.' },
      { headline: 'Frame three message' },
    ],
```

…and extend the `slides` array by appending after the existing `table` slide:

```ts
      { slideType: 'stat', headline: 'A number that matters', statValue: '42%', statLabel: 'Stat label' },
      { slideType: 'closing', headline: 'Thank you.' },
```

- [ ] **Step 5: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add App/src/ai/schema.ts App/src/ai/fallbackPlan.ts tests/unit/ai/schema-plan-fields.test.ts
git commit -m "Add patternId, carousel frames, quality notes, and stat/closing slide types

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 3: Curated pattern registry with Storybook enforcement

**Files:**
- Create: `App/src/data/patternRegistry.ts`
- Test: `tests/unit/data/patternRegistry.test.ts` (new)

**Interfaces:**
- Consumes: `BuildCategoryId` from `App/src/types.ts`; `BuildPlan` (type-only) from `App/src/ai/schema.ts`.
- Produces (all exported from `App/src/data/patternRegistry.ts`):
  - `interface BuildPattern { id: string; category: BuildCategoryId; label: string; whenToUse: string; sections: string[]; storyComponents: string[] }`
  - `const BUILD_PATTERNS: BuildPattern[]`
  - `getPatternsForCategory(category: BuildCategoryId): BuildPattern[]`
  - `getDefaultPattern(category: BuildCategoryId): BuildPattern` (first pattern listed for the category)
  - `getPattern(id: string): BuildPattern | undefined`
  - `resolvePatternId(category: BuildCategoryId, plan: Pick<BuildPlan, 'patternId' | 'socialFormat' | 'motionConcept'>): string`
- IMPORTANT: this module must import **types only** (no `oneuiRegistry`/`storybookRegistry` imports — those use `import.meta.glob`, which does not exist when `App/aiServerPlugin.ts` imports this registry in plain Node at Vite config load). The Storybook intersection is enforced by the test, which runs under Vitest where the glob works.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/data/patternRegistry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  BUILD_PATTERNS,
  getDefaultPattern,
  getPattern,
  getPatternsForCategory,
  resolvePatternId,
} from '../../../App/src/data/patternRegistry';
import { AVAILABLE_COMPONENTS } from '../../../App/src/data/oneuiRegistry';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';

const AVAILABLE_NAMES = new Set(AVAILABLE_COMPONENTS.map((c) => c.name));

describe('pattern registry integrity', () => {
  it('has unique pattern ids', () => {
    const ids = BUILD_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every category at least one pattern and a default', () => {
    for (const category of BUILD_CATEGORIES) {
      expect(getPatternsForCategory(category.id).length).toBeGreaterThan(0);
      expect(getDefaultPattern(category.id).category).toBe(category.id);
    }
  });

  it('only ever composes Storybook-story-backed, released OneUI components', () => {
    for (const pattern of BUILD_PATTERNS) {
      expect(pattern.storyComponents.length).toBeGreaterThan(0);
      for (const name of pattern.storyComponents) {
        expect(AVAILABLE_NAMES.has(name), `${pattern.id} references ${name}, which has no story`).toBe(true);
      }
    }
  });

  it('declares every id fallbackPlan.ts uses as a per-category default', () => {
    for (const id of ['product-story', 'dashboard', 'deck', 'announcement', 'loader']) {
      expect(getPattern(id), `fallbackPlan default "${id}" missing from registry`).toBeDefined();
    }
  });
});

describe('resolvePatternId', () => {
  it('honors a valid free choice for website and app-screens', () => {
    expect(resolvePatternId('website', { patternId: 'campaign-hero' })).toBe('campaign-hero');
    expect(resolvePatternId('app-screens', { patternId: 'checkout' })).toBe('checkout');
  });

  it('falls back to the category default for unknown or cross-category ids', () => {
    expect(resolvePatternId('website', { patternId: 'not-real' })).toBe(getDefaultPattern('website').id);
    expect(resolvePatternId('website', { patternId: 'checkout' })).toBe(getDefaultPattern('website').id);
  });

  it('derives social patterns from socialFormat, ignoring any authored patternId', () => {
    expect(resolvePatternId('social-media', { patternId: 'campaign-hero', socialFormat: 'story' })).toBe('story-vertical');
    expect(resolvePatternId('social-media', { socialFormat: 'carousel' })).toBe('carousel');
    expect(resolvePatternId('social-media', {})).toBe('announcement');
  });

  it('derives motion patterns from motionConcept and slides is always deck', () => {
    expect(resolvePatternId('motion', { motionConcept: 'product-reveal' })).toBe('product-reveal');
    expect(resolvePatternId('motion', {})).toBe('loader');
    expect(resolvePatternId('slides', { patternId: 'whatever' })).toBe('deck');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/data/patternRegistry.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `App/src/data/patternRegistry.ts`**

```ts
import type { BuildCategoryId } from '../types';
import type { BuildPlan } from '../ai/schema';

/**
 * Curated Reliance layout patterns — the layout-level equivalent of
 * oneuiRegistry.ts's component gating. Claude picks a pattern (website and
 * app-screens only) and authors content into it; it can never invent a
 * layout, the same way it can never invent a component or a token.
 *
 * IMPORTANT: this module is imported by App/aiServerPlugin.ts in plain Node
 * (Vite config load), so it must stay dependency-free apart from types —
 * in particular it must NOT import oneuiRegistry/storybookRegistry, which
 * rely on import.meta.glob. The "storyComponents only name story-backed
 * components" rule is enforced by tests/unit/data/patternRegistry.test.ts.
 */
export interface BuildPattern {
  id: string;
  category: BuildCategoryId;
  label: string;
  /** The one-line brief Claude chooses from — when this layout is the right call. */
  whenToUse: string;
  /** Composition summary, top to bottom — what the renderer implements. */
  sections: string[];
  /** OneUI components this pattern composes — every name must have a Storybook story. */
  storyComponents: string[];
}

export const BUILD_PATTERNS: BuildPattern[] = [
  // ---- Website (free Claude choice; first entry is the category default) ----
  {
    id: 'product-story',
    category: 'website',
    label: 'Product story',
    whenToUse: 'Product or brand pages that explain and persuade — the default marketing page.',
    sections: ['nav header', 'centered hero copy + CTA', 'hero image', 'feature grid', 'quote spotlight', 'news grid', 'contact band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Divider'],
  },
  {
    id: 'campaign-hero',
    category: 'website',
    label: 'Campaign hero',
    whenToUse: 'Launches and campaigns that lead with one bold image and one message.',
    sections: ['nav header', 'full-bleed image hero with scrim + headline + dual CTA', 'feature grid', 'closing CTA band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Badge'],
  },
  {
    id: 'editorial',
    category: 'website',
    label: 'Editorial',
    whenToUse: 'Announcements, stories, and content-led pages where reading comes first.',
    sections: ['nav header', 'kicker + left-aligned headline + lede', 'numbered article sections', 'pull-quote', 'related grid', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'Surface', 'Divider'],
  },
  {
    id: 'service-hub',
    category: 'website',
    label: 'Service hub',
    whenToUse: 'Overviews of multiple offerings, businesses, or services side by side.',
    sections: ['nav header', 'centered headline + subheadline', 'icon-led service card grid with per-card CTAs', 'contact band', 'footer'],
    storyComponents: ['Container', 'Text', 'Button', 'Icon', 'Surface', 'Badge'],
  },

  // ---- App screens (free Claude choice; mobile-only; first entry is the default) ----
  {
    id: 'dashboard',
    category: 'app-screens',
    label: 'Dashboard',
    whenToUse: 'Overview screens: greeting, key numbers, recent activity.',
    sections: ['greeting header', 'stat card row', 'activity list', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'Avatar', 'BottomNavigation', 'Image', 'Icon'],
  },
  {
    id: 'onboarding',
    category: 'app-screens',
    label: 'Onboarding',
    whenToUse: 'First-run and welcome screens introducing one value proposition.',
    sections: ['brand mark', 'hero image', 'value-prop headline + body', 'pagination dots', 'primary CTA'],
    storyComponents: ['Container', 'Text', 'Button', 'Image', 'PaginationDots'],
  },
  {
    id: 'browse',
    category: 'app-screens',
    label: 'Browse',
    whenToUse: 'Search, discovery, and catalogue screens with filters.',
    sections: ['top bar', 'search input', 'filter chips', 'content cards', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'Input', 'Chip', 'ChipGroup', 'Image', 'BottomNavigation'],
  },
  {
    id: 'profile',
    category: 'app-screens',
    label: 'Profile',
    whenToUse: 'Account, settings, and identity screens.',
    sections: ['large avatar header', 'settings list', 'primary action', 'bottom nav'],
    storyComponents: ['Container', 'Text', 'Avatar', 'Icon', 'Button', 'BottomNavigation'],
  },
  {
    id: 'checkout',
    category: 'app-screens',
    label: 'Checkout',
    whenToUse: 'Order review, payment, and confirmation flows.',
    sections: ['top bar', 'order line items', 'total row', 'promo input', 'confirm CTA'],
    storyComponents: ['Container', 'Text', 'Divider', 'InputField', 'Button', 'Avatar'],
  },

  // ---- Slides (fixed: per-slide variety comes from slideType) ----
  {
    id: 'deck',
    category: 'slides',
    label: 'Deck',
    whenToUse: 'Every slides build — per-slide layouts come from each slide\'s slideType (cover, divider, content, split-photo, table, stat, closing).',
    sections: ['cover', 'section dividers', 'content slides', 'split-photo slides', 'data tables', 'stat slides', 'closing slide'],
    storyComponents: ['Surface', 'Text', 'Badge', 'Image', 'Container'],
  },

  // ---- Social (derived 1:1 from socialFormat) ----
  {
    id: 'announcement',
    category: 'social-media',
    label: 'Announcement (square)',
    whenToUse: 'Square 1080×1080 posts announcing one thing boldly.',
    sections: ['brand mark + badge', 'centered display headline', 'CTA'],
    storyComponents: ['Container', 'Text', 'Badge', 'Surface', 'Button'],
  },
  {
    id: 'story-vertical',
    category: 'social-media',
    label: 'Story / Reel',
    whenToUse: '1080×1920 vertical stories led by a full-bleed image.',
    sections: ['full-bleed image + scrim', 'brand mark', 'bottom stack: badge, headline, CTA'],
    storyComponents: ['Container', 'Text', 'Badge', 'Image', 'Button'],
  },
  {
    id: 'linkedin-split',
    category: 'social-media',
    label: 'LinkedIn split',
    whenToUse: '1200×627 landscape posts balancing copy and image.',
    sections: ['left copy column: brand mark, kicker, headline, body, CTA', 'right image'],
    storyComponents: ['Container', 'Text', 'Image', 'Surface', 'Button'],
  },
  {
    id: 'carousel',
    category: 'social-media',
    label: 'Carousel',
    whenToUse: 'Multi-frame square carousels telling one story across 3-5 frames.',
    sections: ['per-frame: brand mark + frame badge, headline, body, pagination dots'],
    storyComponents: ['Container', 'Text', 'Badge', 'Surface', 'PaginationDots'],
  },

  // ---- Motion (derived 1:1 from motionConcept) ----
  {
    id: 'loader',
    category: 'motion',
    label: 'Loader',
    whenToUse: 'Waiting states that stay confident and calm.',
    sections: ['brand loader stage'],
    storyComponents: ['CircularProgressIndicator', 'Container', 'Text'],
  },
  {
    id: 'transition',
    category: 'motion',
    label: 'Transition',
    whenToUse: 'Moving between views or states.',
    sections: ['two-panel slide transition stage'],
    storyComponents: ['Surface', 'Container', 'Text'],
  },
  {
    id: 'intro-animation',
    category: 'motion',
    label: 'Intro animation',
    whenToUse: 'Brand moments that open an experience.',
    sections: ['brand mark reveal stage'],
    storyComponents: ['Container', 'Text', 'Logo'],
  },
  {
    id: 'product-reveal',
    category: 'motion',
    label: 'Product reveal',
    whenToUse: 'Unveiling one product or image with drama.',
    sections: ['image wipe-reveal stage'],
    storyComponents: ['Container', 'Text', 'Image'],
  },
  {
    id: 'micro-interaction',
    category: 'motion',
    label: 'Micro-interaction',
    whenToUse: 'Small UI feedback moments — toggles, taps, confirmations.',
    sections: ['animated control stage'],
    storyComponents: ['Switch', 'Container', 'Text'],
  },
];

const BY_ID = new Map(BUILD_PATTERNS.map((p) => [p.id, p]));

export function getPattern(id: string): BuildPattern | undefined {
  return BY_ID.get(id);
}

export function getPatternsForCategory(category: BuildCategoryId): BuildPattern[] {
  return BUILD_PATTERNS.filter((p) => p.category === category);
}

/** The first pattern listed for a category — the safe default when Claude's choice is invalid or absent. */
export function getDefaultPattern(category: BuildCategoryId): BuildPattern {
  return getPatternsForCategory(category)[0];
}

const SOCIAL_PATTERN_BY_FORMAT: Record<NonNullable<BuildPlan['socialFormat']>, string> = {
  square: 'announcement',
  story: 'story-vertical',
  linkedin: 'linkedin-split',
  carousel: 'carousel',
};

/**
 * The one place a plan's pattern is decided. Free (but validated) Claude
 * choice for website/app-screens; derived from fields Claude already picks
 * for social (socialFormat) and motion (motionConcept); fixed for slides.
 */
export function resolvePatternId(
  category: BuildCategoryId,
  plan: Pick<BuildPlan, 'patternId' | 'socialFormat' | 'motionConcept'>,
): string {
  if (category === 'slides') return 'deck';
  if (category === 'social-media') return SOCIAL_PATTERN_BY_FORMAT[plan.socialFormat ?? 'square'];
  if (category === 'motion') return plan.motionConcept ?? 'loader';
  const candidate = plan.patternId ? getPattern(plan.patternId) : undefined;
  if (candidate && candidate.category === category) return candidate.id;
  return getDefaultPattern(category).id;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/data/patternRegistry.test.ts`
Expected: PASS (the story-backed test proves every `storyComponents` name has a real story — if one fails, fix the registry, not the test).

- [ ] **Step 5: Run the full suite, then commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/data/patternRegistry.ts tests/unit/data/patternRegistry.test.ts
git commit -m "Add curated Reliance pattern registry with Storybook enforcement test

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 4: MCP quality adapters, patternId in the plan tool, and the critique endpoint

**Files:**
- Create: `App/src/mcp/uiUxProAdapter.ts`
- Create: `App/src/mcp/framerAdapter.ts`
- Modify: `App/aiServerPlugin.ts` (PLAN_TOOL patternId property, pattern guidance in plan context, `CRITIQUE_TOOL`, `type: 'critique'` branch, `RequestBody` union)
- Test: `tests/unit/aiServerPlugin-critique.test.ts` (new)
- Test: `tests/unit/mcp/adapters.test.ts` (new)

**Interfaces:**
- Consumes: `callAnthropicWithFallback` (Task 1), `BUILD_PATTERNS`/`getPatternsForCategory` (Task 3), existing `RELIANCE_SYSTEM_PROMPT`/`RELIANCE_ART_DIRECTION`.
- Produces:
  - `getUiUxQualityHints(category: string): string[]` from `App/src/mcp/uiUxProAdapter.ts`
  - `getFramerQualityHints(): string[] | undefined` from `App/src/mcp/framerAdapter.ts`
  - `export const CRITIQUE_TOOL` from `App/aiServerPlugin.ts` — same content properties as `PLAN_TOOL` minus structural fields, plus required `qualityNotes: string`
  - `/api/claude` accepts `{ type: 'critique', category: string, prompt: string, draftPlan: object }` → `{ result: Partial<BuildPlan> & { qualityNotes: string }, model }`
  - `PLAN_TOOL.input_schema.properties.patternId` — enum of website + app-screens pattern IDs. Task 7's client calls the critique endpoint.

- [ ] **Step 1: Write the failing adapter test**

Create `tests/unit/mcp/adapters.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { getUiUxQualityHints } from '../../../App/src/mcp/uiUxProAdapter';
import { getFramerQualityHints } from '../../../App/src/mcp/framerAdapter';

describe('uiUxProAdapter', () => {
  it('always returns shared hints plus category-specific hints', () => {
    const website = getUiUxQualityHints('website');
    const social = getUiUxQualityHints('social-media');

    expect(website.length).toBeGreaterThan(3);
    expect(social.length).toBeGreaterThan(3);
    expect(website.join(' ')).not.toBe(social.join(' '));
  });

  it('returns only shared hints for an unknown category instead of throwing', () => {
    expect(getUiUxQualityHints('not-a-category').length).toBeGreaterThan(0);
  });
});

describe('framerAdapter', () => {
  afterEach(() => {
    delete process.env.FRAMER_MCP_URL;
  });

  it('returns undefined when no Framer MCP endpoint is configured', () => {
    expect(getFramerQualityHints()).toBeUndefined();
  });

  it('still returns undefined (gracefully, without throwing) when the env var is set', () => {
    process.env.FRAMER_MCP_URL = 'http://localhost:9999';
    expect(getFramerQualityHints()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Write the failing server test**

Create `tests/unit/aiServerPlugin-critique.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CRITIQUE_TOOL, PLAN_TOOL } from '../../App/aiServerPlugin';
import { getPatternsForCategory } from '../../App/src/data/patternRegistry';

describe('PLAN_TOOL patternId', () => {
  it('offers exactly the website and app-screens pattern ids', () => {
    const expected = [...getPatternsForCategory('website'), ...getPatternsForCategory('app-screens')].map((p) => p.id);
    expect(PLAN_TOOL.input_schema.properties.patternId.enum).toEqual(expected);
  });
});

describe('CRITIQUE_TOOL', () => {
  const props = CRITIQUE_TOOL.input_schema.properties as Record<string, unknown>;

  it('can revise content fields', () => {
    for (const key of ['headline', 'subheadline', 'body', 'ctaLabel', 'sections', 'slides', 'imageLocation']) {
      expect(props[key], `${key} should be revisable`).toBeDefined();
    }
  });

  it('cannot touch structural fields', () => {
    for (const key of ['patternId', 'dimensionVariant', 'recommendedComponentNames', 'socialFormat', 'motionConcept', 'reasoning']) {
      expect(props[key], `${key} must not be revisable`).toBeUndefined();
    }
  });

  it('requires only qualityNotes', () => {
    expect(CRITIQUE_TOOL.input_schema.required).toEqual(['qualityNotes']);
    expect(props.qualityNotes).toBeDefined();
  });
});
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `npx vitest run tests/unit/mcp/adapters.test.ts tests/unit/aiServerPlugin-critique.test.ts`
Expected: FAIL — modules/exports don't exist.

- [ ] **Step 4: Create `App/src/mcp/uiUxProAdapter.ts`**

```ts
/**
 * "UI UX Pro" quality layer — distilled, static heuristics that feed the
 * critique pass's rubric (see App/aiServerPlugin.ts).
 *
 * Honest constraint, on purpose: a running Vite app cannot invoke Claude
 * Code MCP servers, so "check for the UI UX Pro MCP" cannot mean a live
 * call. This module is the seam where MCP-derived guidance would plug in;
 * until then it ships the distilled rules directly, so the critique rubric
 * is always available with zero configuration.
 */
const SHARED_HINTS = [
  'One idea per view: the headline states a single benefit in plain confident language, never a slogan soup.',
  'Exactly one high-attention CTA per view; every other action is visibly secondary.',
  'Copy rhythm: headlines under ~9 words, subheadlines one sentence, body copy 1-2 short sentences.',
  'Hierarchy must survive squinting: display > title > body > label, with clear size steps between levels.',
  'No filler: every section earns its place — cut a weak section rather than pad it.',
  'Specific beats generic: name the product, the place, the number — never "innovative solutions".',
];

const CATEGORY_HINTS: Record<string, string[]> = {
  website: [
    'The hero answers "what is this and why should I care" in under 3 seconds.',
    'Feature sections lead with the benefit, not the mechanism.',
    'The closing band repeats the primary CTA — a page should never fizzle out.',
  ],
  'app-screens': [
    'Touch targets read as at least 44px; list rows carry one primary label and at most one support line.',
    'The screen title says where the user is, not what the app is.',
    'Stats show the number big and the caption small — never the reverse.',
  ],
  slides: [
    'One message per slide; if a slide needs two headlines it is two slides.',
    'Data slides make the single number the hero; tables never exceed 5 columns.',
    'The closing slide asks for something specific — a decision, a next step, a date.',
  ],
  'social-media': [
    'The headline must work at thumbnail size — 6 words or fewer is ideal.',
    'Carousel frames each advance the story; frame one is a hook, the last frame is the CTA.',
    'Badges and CTAs are short verbs: "Live", "Join", "Explore".',
  ],
  motion: [
    'Motion communicates one feeling; describe timing and easing character, not decoration.',
    'The described motion must be achievable as a subtle UI behavior — no film-trailer language.',
  ],
};

export function getUiUxQualityHints(category: string): string[] {
  return [...SHARED_HINTS, ...(CATEGORY_HINTS[category] ?? [])];
}
```

- [ ] **Step 5: Create `App/src/mcp/framerAdapter.ts`**

```ts
/**
 * Framer MCP quality layer — a graceful seam, honestly labelled.
 *
 * A running Vite app cannot invoke Claude Code MCP servers, so this cannot
 * make live Framer MCP calls. It checks for a configured endpoint and, for
 * now, contributes nothing either way — but it is the single place a real
 * Framer-derived hint source would plug into the critique rubric, and the
 * app's behavior is already correct with it absent (the spec's "fall back
 * gracefully, never expose MCPs to the end user").
 */
let warnedOnce = false;

export function getFramerQualityHints(): string[] | undefined {
  if (!process.env.FRAMER_MCP_URL) return undefined;
  if (!warnedOnce) {
    console.warn('[reliance-builder] FRAMER_MCP_URL is set, but live MCP calls are not implemented — ignoring it.');
    warnedOnce = true;
  }
  return undefined;
}
```

- [ ] **Step 6: Wire patternId + critique into `App/aiServerPlugin.ts`**

Add to the imports:

```ts
import { getPatternsForCategory } from './src/data/patternRegistry';
import { getUiUxQualityHints } from './src/mcp/uiUxProAdapter';
import { getFramerQualityHints } from './src/mcp/framerAdapter';
```

Add `patternId` to `PLAN_TOOL.input_schema.properties` (immediately before `recommendedComponentNames`):

```ts
      patternId: {
        type: 'string',
        enum: [...getPatternsForCategory('website'), ...getPatternsForCategory('app-screens')].map((p) => p.id),
        description:
          'Website/app-screens only: the curated Reliance layout pattern that best fits this brief — pick from the ids listed for the current output format in the request. Omit for slides/social/motion.',
      },
```

Add the critique request type to the union (after `PlanRequestBody`):

```ts
interface CritiqueRequestBody {
  type: 'critique';
  category: string;
  prompt: string;
  draftPlan: Record<string, unknown>;
}

type RequestBody = ClassifyRequestBody | PlanRequestBody | CritiqueRequestBody;
```

Add `CRITIQUE_TOOL` after `PLAN_TOOL` (derived, so the two can never drift):

```ts
/** Plan fields the critique pass must never touch — layout, canvas, and component choices are structural. */
const CRITIQUE_EXCLUDED_FIELDS = new Set([
  'patternId',
  'dimensionVariant',
  'recommendedComponentNames',
  'socialFormat',
  'motionConcept',
  'reasoning',
]);

export const CRITIQUE_TOOL = {
  name: 'critique_and_revise',
  description:
    'Review the drafted plan against the quality rubric. Return ONLY the content fields that should improve (rewritten in full), plus a one-line qualityNotes. Never change the layout pattern, canvas, or component choices — those fields do not exist on this tool.',
  input_schema: {
    type: 'object' as const,
    properties: {
      ...Object.fromEntries(Object.entries(PLAN_TOOL.input_schema.properties).filter(([key]) => !CRITIQUE_EXCLUDED_FIELDS.has(key))),
      qualityNotes: {
        type: 'string',
        description: 'One sentence: what the review checked and what it improved — or that the draft was already strong.',
      },
    },
    required: ['qualityNotes'],
  },
};
```

Add the rubric builder after `RELIANCE_SYSTEM_PROMPT`:

```ts
function buildCritiqueSystemPrompt(category: string): string {
  const hints = [...getUiUxQualityHints(category), ...(getFramerQualityHints() ?? [])];
  return `${RELIANCE_SYSTEM_PROMPT}\n\n${RELIANCE_ART_DIRECTION}\n\nQuality rubric — judge the draft against every line before deciding what to revise:\n${hints
    .map((h) => `- ${h}`)
    .join('\n')}`;
}
```

In the `plan` branch's `contextLines`, add pattern guidance after the `Components available...` line:

```ts
              `Curated layout patterns for this format (choose patternId from these ids only): ${getPatternsForCategory(
                body.category as BuildCategoryId,
              )
                .map((p) => `${p.id} — ${p.whenToUse}`)
                .join('; ') || 'none — omit patternId'}`,
```

…which needs the type import at the top of the file: `import type { BuildCategoryId } from './src/types';`

Add the critique branch after the `plan` branch, before the final `sendJson(res, 400, ...)`:

```ts
          if (body.type === 'critique') {
            const { input, model } = await callAnthropicWithFallback(
              apiKey,
              buildCritiqueSystemPrompt(body.category),
              [
                `Output format: ${body.category}`,
                `Original request: "${body.prompt}"`,
                `Drafted plan (JSON): ${JSON.stringify(body.draftPlan)}`,
                'Return only the fields that need improving, rewritten in full, plus qualityNotes. If the draft is already strong, return just qualityNotes.',
              ].join('\n'),
              CRITIQUE_TOOL,
            );
            sendJson(res, 200, { result: input, model });
            return;
          }
```

Note: `callAnthropicWithFallback`'s `tool` parameter type widens to `typeof CLASSIFY_TOOL | typeof PLAN_TOOL | typeof CRITIQUE_TOOL` — update both it and `callAnthropic`'s signature accordingly.

- [ ] **Step 7: Run tests, then the full suite**

Run: `npx vitest run`
Expected: all PASS (the existing `aiServerPlugin.test.ts` schema assertions are unaffected — `patternId` is a new property, and its tests use `objectContaining`/specific keys).

- [ ] **Step 8: Commit**

```bash
git add App/src/mcp/uiUxProAdapter.ts App/src/mcp/framerAdapter.ts App/aiServerPlugin.ts tests/unit/mcp/adapters.test.ts tests/unit/aiServerPlugin-critique.test.ts
git commit -m "Add pattern selection to the plan tool and a rubric-driven critique endpoint

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 5: Extract the media layer (imageGenerator / videoGenerator)

**Files:**
- Create: `App/src/media/imageGenerator.ts`
- Create: `App/src/media/videoGenerator.ts`
- Modify: `App/src/ai/client.ts` (remove the moved functions; import from media)
- Modify: `App/src/components/previews/MotionPreview.tsx:6` (import path)
- Modify: `tests/unit/ai/client.test.ts` (delete the moved `requestMotionVideo` describe block, lines 137-167)
- Test: `tests/unit/media/imageGenerator.test.ts`, `tests/unit/media/videoGenerator.test.ts` (new)

**Interfaces:**
- Consumes: `RELIANCE_VISUAL_BASELINE`/`RELIANCE_VISUAL_BASELINE_AERIAL` from `App/src/ai/artDirection.ts`; `BuildPlan` type.
- Produces:
  - `assembleImagePrompt(plan: Pick<BuildPlan, 'imageSubject' | 'imageAction' | 'imageLocation' | 'imageFraming' | 'imageIsAerial' | 'imageColourNotes'>): string` and `requestHeroImage(plan: BuildPlan): Promise<string | undefined>` from `App/src/media/imageGenerator.ts`
  - `requestMotionVideo(plan: BuildPlan): Promise<{ videoUrl?: string; error?: string }>` from `App/src/media/videoGenerator.ts` (still posting to `/api/higgsfield-video` in this task — Task 6 flips the URL when the proxy swaps, keeping this task a pure extraction)
- This is a **behavior-preserving move**: `client.ts`'s `requestPlan` keeps calling `requestHeroImage` exactly as today (Task 7 relocates that call into the orchestrator).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/media/imageGenerator.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assembleImagePrompt, requestHeroImage } from '../../../App/src/media/imageGenerator';
import { RELIANCE_VISUAL_BASELINE } from '../../../App/src/ai/artDirection';
import type { BuildPlan } from '../../../App/src/ai/schema';

const scene = {
  imageSubject: 'A line engineer in a grey uniform',
  imageAction: 'both hands tightening a panel bolt',
  imageLocation: 'red-brown Rajasthan earth, dry scrubland',
  imageFraming: 'medium close-up, slight low angle',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('assembleImagePrompt', () => {
  it('joins the four scene parts with the standard visual baseline', () => {
    const prompt = assembleImagePrompt(scene);

    expect(prompt).toContain(scene.imageSubject);
    expect(prompt).toContain(scene.imageLocation);
    expect(prompt).toContain(RELIANCE_VISUAL_BASELINE);
  });

  it('swaps to the aerial baseline with colour notes for aerial shots', () => {
    const prompt = assembleImagePrompt({ ...scene, imageIsAerial: true, imageColourNotes: 'steel-blue panels' });

    expect(prompt).toContain('top-down aerial');
    expect(prompt).toContain('steel-blue panels');
    expect(prompt).not.toContain(RELIANCE_VISUAL_BASELINE);
  });
});

describe('requestHeroImage', () => {
  const plan = { ...scene, recommendedComponentNames: [], reasoning: '' } as BuildPlan;

  it('returns the data URL on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { dataUrl: 'data:image/png;base64,x' } }) } as Response),
    );

    expect(await requestHeroImage(plan)).toBe('data:image/png;base64,x');
  });

  it('returns undefined instead of throwing on any failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));

    expect(await requestHeroImage(plan)).toBeUndefined();
  });

  it('skips the network entirely when the scene is incomplete', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await requestHeroImage({ recommendedComponentNames: [], reasoning: '' } as BuildPlan)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

Create `tests/unit/media/videoGenerator.test.ts` (the two cases moving out of `client.test.ts`, retargeted):

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestMotionVideo } from '../../../App/src/media/videoGenerator';
import type { BuildPlan } from '../../../App/src/ai/schema';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestMotionVideo', () => {
  it('errors locally without calling the proxy when the plan has no art-directed scene', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestMotionVideo({} as BuildPlan);

    expect(result.error).toMatch(/no art-directed scene/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns the video URL from a successful proxy response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { videoUrl: 'blob:video' } }) } as Response));

    const plan: BuildPlan = {
      imageSubject: 's',
      imageAction: 'a',
      imageLocation: 'l',
      imageFraming: 'f',
      recommendedComponentNames: [],
      reasoning: '',
    };

    expect((await requestMotionVideo(plan)).videoUrl).toBe('blob:video');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/media`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Create `App/src/media/imageGenerator.ts`**

Move `assembleImagePrompt` and `requestHeroImage` verbatim from `client.ts` (adding exports and the guard that lived at `requestHeroImage`'s call-site):

```ts
import type { BuildPlan } from '../ai/schema';
import { RELIANCE_VISUAL_BASELINE, RELIANCE_VISUAL_BASELINE_AERIAL } from '../ai/artDirection';

/**
 * Client half of image generation ("media/imageGenerator"): Claude authors
 * the scene as separate art-directed fields (see ai/artDirection.ts), this
 * module assembles them with the fixed visual baseline and calls the local
 * Gemini proxy. Failure of any kind means "no image" — never a blocked
 * preview.
 */
export function assembleImagePrompt(
  plan: Pick<BuildPlan, 'imageSubject' | 'imageAction' | 'imageLocation' | 'imageFraming' | 'imageIsAerial' | 'imageColourNotes'>,
): string {
  const baseline = plan.imageIsAerial
    ? RELIANCE_VISUAL_BASELINE_AERIAL.replace('{{colourNotes}}', plan.imageColourNotes || 'natural')
    : RELIANCE_VISUAL_BASELINE;
  return [plan.imageSubject, plan.imageAction, plan.imageLocation, plan.imageFraming, baseline].join('\n');
}

export async function requestHeroImage(plan: BuildPlan): Promise<string | undefined> {
  if (!plan.imageSubject || !plan.imageAction || !plan.imageLocation || !plan.imageFraming) return undefined;

  try {
    const res = await fetch('/api/gemini-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: assembleImagePrompt(plan) }),
    });
    const json = await res.json();
    if (!res.ok) return undefined;
    return typeof json.result?.dataUrl === 'string' ? json.result.dataUrl : undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Create `App/src/media/videoGenerator.ts`**

Move `requestMotionVideo` verbatim from `client.ts`:

```ts
import type { BuildPlan } from '../ai/schema';
import { assembleImagePrompt } from './imageGenerator';

/**
 * Client half of motion-video generation ("media/videoGenerator"). The same
 * Claude-authored art-directed scene that produced the hero image drives the
 * video prompt; the hero image itself (when present) is passed as the start
 * frame. Errors come back as a message the UI renders — never a throw.
 */
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
    return { error: err instanceof Error ? err.message : 'Network error reaching the local video proxy' };
  }
}
```

- [ ] **Step 5: Slim `App/src/ai/client.ts`**

- Delete `assembleImagePrompt`, `requestHeroImage`, and `requestMotionVideo` from `client.ts`.
- Delete the now-unused `RELIANCE_VISUAL_BASELINE` import.
- Add `import { requestHeroImage } from '../media/imageGenerator';`
- `requestPlan` keeps its existing `data.heroImage = await requestHeroImage(data);` line, now calling the import.
- In `App/src/components/previews/MotionPreview.tsx`, change the import `import { requestMotionVideo } from '../../ai/client';` → `import { requestMotionVideo } from '../../media/videoGenerator';`
- In `tests/unit/ai/client.test.ts`: remove `requestMotionVideo` from the import on line 2 and delete the whole `describe('requestMotionVideo', ...)` block (lines 137-167) — those cases now live in `tests/unit/media/videoGenerator.test.ts`.

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add App/src/media App/src/ai/client.ts App/src/components/previews/MotionPreview.tsx tests/unit/media tests/unit/ai/client.test.ts
git commit -m "Extract media generation into media/imageGenerator and media/videoGenerator

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 6: Veo video proxy replaces the Higgsfield CLI

**Files:**
- Create: `App/geminiVideoProxy.ts`
- Delete: `App/higgsfieldVideoProxy.ts`
- Modify: `App/vite.config.ts` (plugin swap + `GEMINI_VIDEO_MODEL` passthrough)
- Modify: `App/src/media/videoGenerator.ts` (URL `/api/higgsfield-video` → `/api/gemini-video`, error copy)
- Modify: `README.md` (document `GEMINI_VIDEO_MODEL`)

**Interfaces:**
- Consumes: request body `{ prompt: string, startImageDataUrl?: string }` (unchanged from today).
- Produces: `/api/gemini-video` responding `{ result: { videoUrl: 'data:video/mp4;base64,...' } }` or `{ error }` — the exact contract `videoGenerator.ts` and `MotionPreview.tsx` already consume.
- Per the approved Veo spec (`docs/superpowers/specs/2026-07-07-reliance-builder-veo-motion-video-design.md`): no unit tests for the proxy itself — it is a thin wrapper over live network calls, verified live in Task 17.

- [ ] **Step 1: Create `App/geminiVideoProxy.ts`**

```ts
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only local proxy to Google's Veo video generation, replacing the
 * outgoing Higgsfield CLI proxy — reached the same way geminiImageProxy.ts
 * already reaches Gemini: GEMINI_API_KEY over plain HTTPS, no CLI, no
 * separate auth step. The client posts { prompt, startImageDataUrl? } to
 * /api/gemini-video; this middleware starts a predictLongRunning job, polls
 * it to completion, downloads the finished file, and responds with a
 * data:video/mp4 URL — one blocking request from the client's perspective,
 * mirroring the old --wait behavior. Any failure returns a JSON error the
 * UI already renders as "no video".
 *
 * This only runs under `vite dev` (App/vite.config.ts), same constraint as
 * every other proxy here.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const POLL_INTERVAL_MS = 5_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * The exact JSON shape of a completed Veo operation isn't fully certain from
 * documentation alone (same situation the old Higgsfield extractVideoUrl
 * documented) — try the plausible shapes and fail loudly with the raw
 * operation attached so the parsing can be corrected against a real
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
        // Default matches the current GA text-to-video Veo model; override
        // via GEMINI_VIDEO_MODEL in the repo-root .env if your key exposes a
        // different one — errors from a wrong model name surface verbatim.
        const model = process.env.GEMINI_VIDEO_MODEL || 'veo-3.0-generate-001';
        if (!apiKey) {
          sendJson(res, 503, { error: 'GEMINI_API_KEY is not set. Add it to the repo-root .env.' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          if (!body.prompt) {
            sendJson(res, 400, { error: 'Missing prompt' });
            return;
          }

          const instance: Record<string, unknown> = { prompt: body.prompt };
          if (body.startImageDataUrl) {
            const match = body.startImageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) instance.image = { mimeType: match[1], bytesBase64Encoded: match[2] };
          }

          const startRes = await fetch(`${GEMINI_API_BASE}/models/${model}:predictLongRunning`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({ instances: [instance] }),
          });
          if (!startRes.ok) {
            const text = await startRes.text().catch(() => '');
            sendJson(res, 502, { error: `Veo start error ${startRes.status}: ${text.slice(0, 300)}` });
            return;
          }
          const startData = (await startRes.json()) as { name?: string };
          if (!startData.name) {
            sendJson(res, 502, { error: 'Veo did not return an operation name.' });
            return;
          }

          const deadline = Date.now() + POLL_TIMEOUT_MS;
          let operation: Record<string, any>;
          for (;;) {
            await sleep(POLL_INTERVAL_MS);
            const pollRes = await fetch(`${GEMINI_API_BASE}/${startData.name}`, {
              headers: { 'x-goog-api-key': apiKey },
            });
            if (!pollRes.ok) {
              const text = await pollRes.text().catch(() => '');
              sendJson(res, 502, { error: `Veo poll error ${pollRes.status}: ${text.slice(0, 300)}` });
              return;
            }
            operation = (await pollRes.json()) as Record<string, any>;
            if (operation.done) break;
            if (Date.now() > deadline) {
              sendJson(res, 504, { error: 'Video generation timed out after 5 minutes.' });
              return;
            }
          }

          if (operation.error) {
            sendJson(res, 502, { error: `Veo generation failed: ${JSON.stringify(operation.error).slice(0, 300)}` });
            return;
          }

          const videoUri = extractVideoUri(operation);
          const fileRes = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
          if (!fileRes.ok) {
            sendJson(res, 502, { error: `Veo video download failed with HTTP ${fileRes.status}` });
            return;
          }
          const buffer = Buffer.from(await fileRes.arrayBuffer());
          sendJson(res, 200, { result: { videoUrl: `data:video/mp4;base64,${buffer.toString('base64')}` } });
        } catch (err) {
          sendJson(res, 502, { error: err instanceof Error ? err.message : 'Unknown error calling Veo' });
        }
      });
    },
  };
}
```

- [ ] **Step 2: Swap the proxy in `App/vite.config.ts`**

- Replace the import `import { higgsfieldVideoProxy } from './higgsfieldVideoProxy';` with `import { geminiVideoProxy } from './geminiVideoProxy';`
- In the env passthrough block, after the `GEMINI_IMAGE_MODEL` line, add: `if (env.GEMINI_VIDEO_MODEL) process.env.GEMINI_VIDEO_MODEL = env.GEMINI_VIDEO_MODEL;`
- In `plugins`, replace `higgsfieldVideoProxy(),` with `geminiVideoProxy(),`

- [ ] **Step 3: Delete the Higgsfield proxy and flip the client URL**

```bash
git rm App/higgsfieldVideoProxy.ts
```

In `App/src/media/videoGenerator.ts`, change the fetch URL to `'/api/gemini-video'`.

- [ ] **Step 4: Verify build + tests**

Run: `npx vitest run && npm run app:build`
Expected: both PASS (no unit tests reference the deleted proxy).

- [ ] **Step 5: Document in `README.md`**

In the same env section as Task 1's addition:

```markdown
- `GEMINI_VIDEO_MODEL` — Veo model used for motion video generation via the
  local `/api/gemini-video` proxy. Default: `veo-3.0-generate-001`.
```

- [ ] **Step 6: Commit**

```bash
git add App/geminiVideoProxy.ts App/vite.config.ts App/src/media/videoGenerator.ts README.md
git commit -m "Replace the Higgsfield CLI proxy with a Google Veo video proxy

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 7: The orchestrator — plan, critique merge, media, stage labels

**Files:**
- Create: `App/src/ai/orchestrator.ts`
- Modify: `App/src/ai/client.ts` (export `PlanInput`; add `requestCritique`; validate `patternId` in `requestPlan`; move the hero-image call out; sanitize `carouselFrames`)
- Modify: `App/src/App.tsx` (use `generateBuild` with stage labels)
- Test: `tests/unit/ai/orchestrator.test.ts` (new)

**Interfaces:**
- Consumes: `requestPlan`/`requestCritique` (client), `requestHeroImage` (media), `resolvePatternId` (registry).
- Produces (from `App/src/ai/orchestrator.ts`):
  - `mergeCritique(draft: BuildPlan, revision: Partial<BuildPlan> & { qualityNotes?: string }): BuildPlan`
  - `generateBuild(input: PlanInput, onStage?: (label: string) => void): Promise<AIResult<BuildPlan>>`
- From `client.ts`: `export interface PlanInput { category: BuildCategoryId; prompt: string; answers: GuidedAnswers; refinement?: string }` (the existing local interface, exported) and `requestCritique(category: BuildCategoryId, prompt: string, draftPlan: BuildPlan): Promise<{ ok: true; revision: Partial<BuildPlan> & { qualityNotes?: string }; model?: string } | { ok: false; error: string }>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/ai/orchestrator.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBuild, mergeCritique } from '../../../App/src/ai/orchestrator';
import * as client from '../../../App/src/ai/client';
import * as imageGenerator from '../../../App/src/media/imageGenerator';
import type { BuildPlan } from '../../../App/src/ai/schema';

vi.mock('../../../App/src/ai/client', async (importOriginal) => {
  const original = await importOriginal<typeof client>();
  return { ...original, requestPlan: vi.fn(), requestCritique: vi.fn() };
});
vi.mock('../../../App/src/media/imageGenerator', () => ({ requestHeroImage: vi.fn().mockResolvedValue(undefined) }));

const draft: BuildPlan = {
  headline: 'Draft headline',
  patternId: 'campaign-hero',
  navItems: ['One', 'Two'],
  recommendedComponentNames: ['Button'],
  reasoning: 'draft',
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('mergeCritique', () => {
  it('applies content revisions and attaches qualityNotes', () => {
    const merged = mergeCritique(draft, { headline: 'Sharper headline', qualityNotes: 'Tightened it.' });

    expect(merged.headline).toBe('Sharper headline');
    expect(merged.qualityNotes).toBe('Tightened it.');
  });

  it('never lets the critique change structural fields', () => {
    const merged = mergeCritique(draft, {
      patternId: 'editorial',
      recommendedComponentNames: ['Modal'],
      dimensionVariant: 'mobile',
      qualityNotes: 'x',
    } as never);

    expect(merged.patternId).toBe('campaign-hero');
    expect(merged.recommendedComponentNames).toEqual(['Button']);
    expect(merged.dimensionVariant).toBeUndefined();
  });

  it('rejects malformed array revisions instead of crashing renderers', () => {
    const merged = mergeCritique(draft, { navItems: 'One", "Two' as never, qualityNotes: 'x' });

    expect(merged.navItems).toEqual(['One', 'Two']);
  });
});

describe('generateBuild', () => {
  const input = { category: 'website' as const, prompt: 'a site', answers: {} };

  it('runs plan → critique → image with stage labels, merging the revision', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', model: 'claude-fable-5', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({ ok: true, revision: { headline: 'Better', qualityNotes: 'Improved.' } });
    const stages: string[] = [];

    const result = await generateBuild(input, (label) => stages.push(label));

    expect(result.data.headline).toBe('Better');
    expect(result.data.qualityNotes).toBe('Improved.');
    expect(stages).toEqual(['Designing your preview…', 'Reviewing the design…', 'Art-directing the imagery…']);
    expect(imageGenerator.requestHeroImage).toHaveBeenCalledTimes(1);
  });

  it('skips the critique for fallback plans', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'fallback', fallbackReason: 'no key', data: { ...draft } });

    const result = await generateBuild(input);

    expect(client.requestCritique).not.toHaveBeenCalled();
    expect(result.source).toBe('fallback');
  });

  it('ships the draft with honest quality notes when the critique fails', async () => {
    vi.mocked(client.requestPlan).mockResolvedValue({ source: 'claude', data: { ...draft } });
    vi.mocked(client.requestCritique).mockResolvedValue({ ok: false, error: 'overloaded' });

    const result = await generateBuild(input);

    expect(result.data.headline).toBe('Draft headline');
    expect(result.data.qualityNotes).toMatch(/Quality review skipped: overloaded/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/ai/orchestrator.test.ts`
Expected: FAIL — orchestrator module doesn't exist.

- [ ] **Step 3: Update `App/src/ai/client.ts`**

- Export the existing `PlanInput` interface (`interface PlanInput` → `export interface PlanInput`).
- In `requestPlan`, delete the line `data.heroImage = await requestHeroImage(data);` and the now-unused `requestHeroImage` import (the orchestrator owns media now).
- In `requestPlan`'s `data` assembly, add carousel sanitization and pattern resolution:

```ts
import { resolvePatternId } from '../data/patternRegistry';
// …in the data assembly, alongside the other asArray lines:
    carouselFrames: asArray(raw.carouselFrames),
// …after the data object is built, before `return`:
  data.patternId = resolvePatternId(input.category, {
    patternId: typeof raw.patternId === 'string' ? raw.patternId : undefined,
    socialFormat: data.socialFormat,
    motionConcept: data.motionConcept,
  });
```

- Add `requestCritique` after `requestPlan`:

```ts
export async function requestCritique(
  category: BuildCategoryId,
  prompt: string,
  draftPlan: BuildPlan,
): Promise<{ ok: true; revision: Partial<BuildPlan> & { qualityNotes?: string }; model?: string } | { ok: false; error: string }> {
  const response = await postToClaude({ type: 'critique', category, prompt, draftPlan });
  if (response.ok === false) return { ok: false, error: response.error };
  const revision = response.result;
  if (!revision || typeof revision !== 'object') return { ok: false, error: 'Claude returned an empty critique.' };
  return { ok: true, revision: revision as Partial<BuildPlan> & { qualityNotes?: string }, model: response.model };
}
```

- [ ] **Step 4: Create `App/src/ai/orchestrator.ts`**

```ts
import type { AIResult, BuildPlan } from './schema';
import { requestCritique, requestPlan, type PlanInput } from './client';
import { requestHeroImage } from '../media/imageGenerator';

/**
 * Composes the build pipeline: plan → critique → media. client.ts stays the
 * thin transport layer; this module owns sequencing, the content-only
 * critique merge, and honest stage labels for the UI. Every stage degrades:
 * a failed critique ships the draft (noted in qualityNotes), failed media
 * ships no image — the preview always renders.
 */

/** Plan fields the critique may revise — content only, mirroring the server-side CRITIQUE_TOOL. */
const CONTENT_REVISION_KEYS = [
  'headline',
  'subheadline',
  'body',
  'kicker',
  'ctaLabel',
  'navItems',
  'sections',
  'quote',
  'newsItems',
  'contactHeadline',
  'screenTitle',
  'contentBlocks',
  'screenNavItems',
  'slides',
  'carouselFrames',
  'badgeLabel',
  'motionDescription',
  'imageSubject',
  'imageAction',
  'imageLocation',
  'imageFraming',
  'imageIsAerial',
  'imageColourNotes',
] as const;

/** Fields that must be real arrays — same malformed-string defence client.ts applies to plan responses. */
const ARRAY_KEYS = new Set<string>(['navItems', 'sections', 'newsItems', 'contentBlocks', 'screenNavItems', 'slides', 'carouselFrames']);

export function mergeCritique(draft: BuildPlan, revision: Partial<BuildPlan> & { qualityNotes?: string }): BuildPlan {
  const merged: BuildPlan = { ...draft };
  for (const key of CONTENT_REVISION_KEYS) {
    const value = revision[key];
    if (value === undefined) continue;
    if (ARRAY_KEYS.has(key) && !Array.isArray(value)) continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  if (typeof revision.qualityNotes === 'string') merged.qualityNotes = revision.qualityNotes;
  return merged;
}

export async function generateBuild(input: PlanInput, onStage?: (label: string) => void): Promise<AIResult<BuildPlan>> {
  onStage?.('Designing your preview…');
  const planResult = await requestPlan(input);
  let plan = planResult.data;

  // Only critique real Claude drafts — fallbackPlan.ts's deterministic
  // content is honest placeholder copy; "improving" it would only disguise
  // that Claude was unavailable.
  if (planResult.source === 'claude') {
    onStage?.('Reviewing the design…');
    const critique = await requestCritique(input.category, input.prompt, plan);
    plan = critique.ok ? mergeCritique(plan, critique.revision) : { ...plan, qualityNotes: `Quality review skipped: ${critique.error}` };
  }

  onStage?.('Art-directing the imagery…');
  plan.heroImage = await requestHeroImage(plan);

  return { ...planResult, data: plan };
}
```

- [ ] **Step 5: Wire it into `App/src/App.tsx`**

- Replace the import `import { requestClassification, requestPlan } from './ai/client';` with:

```ts
import { requestClassification } from './ai/client';
import { generateBuild } from './ai/orchestrator';
```

- In `generatePlan`, replace the two lines

```ts
    setBusyLabel(refinement ? 'Updating your preview…' : 'Designing your preview…');
    const result = await requestPlan({ category: category.id, prompt: freeformPrompt, answers, refinement });
```

with:

```ts
    setBusyLabel(refinement ? 'Updating your preview…' : 'Designing your preview…');
    const result = await generateBuild({ category: category.id, prompt: freeformPrompt, answers, refinement }, setBusyLabel);
```

- [ ] **Step 6: Run the full suite**

Run: `npx vitest run`
Expected: all PASS. Note: `tests/unit/ai/client.test.ts`'s "does not request a hero image when image-prompt parts are incomplete" case still passes — `requestPlan` now *never* fetches images, which satisfies the same assertion.

- [ ] **Step 7: Commit**

```bash
git add App/src/ai/orchestrator.ts App/src/ai/client.ts App/src/App.tsx tests/unit/ai/orchestrator.test.ts
git commit -m "Add build orchestrator with content-only critique merge and stage labels

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 8: Build details — model badges, pattern row, quality notes

**Files:**
- Modify: `App/src/components/BuildDetails.tsx`
- Test: `tests/unit/components/BuildDetails.test.tsx` (new)

**Interfaces:**
- Consumes: `AIMeta.model` (Task 1), `plan.qualityNotes`/`plan.patternId` (Task 2), `getPattern`/`resolvePatternId` (Task 3).
- Produces: no new exports — Build details now shows, per stage, which Claude model authored it; the resolved pattern with its story-backed components; and the critique's quality notes. Everything stays inside the collapsed `<details>`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/BuildDetails.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuildDetails } from '../../../App/src/components/BuildDetails';
import { BUILD_CATEGORIES } from '../../../App/src/data/buildCategories';
import type { BuildRequest } from '../../../App/src/types';

function makeRequest(overrides: Partial<BuildRequest['plan']> = {}): BuildRequest {
  return {
    category: BUILD_CATEGORIES[0],
    freeformPrompt: 'a site',
    answers: {},
    answerLabels: {},
    refinements: [],
    plan: { headline: 'H', patternId: 'campaign-hero', recommendedComponentNames: [], reasoning: 'planned', ...overrides },
    classifyMeta: { source: 'claude', reasoning: 'classified', model: 'claude-fable-5' },
    planMeta: { source: 'claude', reasoning: 'planned', model: 'claude-sonnet-5' },
  };
}

describe('BuildDetails', () => {
  it('shows which Claude model authored each stage', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.getByText('claude-fable-5')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
  });

  it('shows the resolved pattern with its story-backed components', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.getByText('Campaign hero')).toBeInTheDocument();
    expect(screen.getByText(/Composed from .*Button.* stories/)).toBeInTheDocument();
  });

  it('shows quality notes when the critique ran', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest({ qualityNotes: 'Tightened the headline.' })} />);

    expect(screen.getByText('Quality review')).toBeInTheDocument();
    expect(screen.getByText('Tightened the headline.')).toBeInTheDocument();
  });

  it('omits the quality review row when there are no notes', () => {
    render(<BuildDetails components={[]} tokensByCategory={{}} request={makeRequest()} />);

    expect(screen.queryByText('Quality review')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/BuildDetails.test.tsx`
Expected: FAIL — model text / pattern row not rendered.

- [ ] **Step 3: Implement in `App/src/components/BuildDetails.tsx`**

Add imports:

```ts
import { getPattern, resolvePatternId } from '../data/patternRegistry';
```

In `ReasoningRow`, add the model label next to the existing source badge (inside the same
flex row; a plain `Text` label, not a `Badge` — the proven Badge appearances here are
semantic positive/warning, and the model name is neutral metadata):

```tsx
        {meta.model && (
          <Text variant="label" size="XS" appearance="neutral">
            {meta.model}
          </Text>
        )}
```

In `AIReasoningSummary`, after the two `<ReasoningRow>`s, add the pattern row and quality notes:

```tsx
      <PatternRow request={request} />

      {request.plan.qualityNotes && (
        <Container variant="full-bleed" layout="flex" direction="column" gap="1" width="full">
          <Text variant="label" size="XS" weight="high">
            Quality review
          </Text>
          <Text variant="body" size="S" appearance="neutral">
            {request.plan.qualityNotes}
          </Text>
        </Container>
      )}
```

…and add the component after `AIReasoningSummary`:

```tsx
function PatternRow({ request }: { request: BuildRequest }) {
  const pattern = getPattern(resolvePatternId(request.category.id, request.plan));
  if (!pattern) return null;
  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="1" width="full">
      <Container variant="full-bleed" layout="flex" align="center" gap="2">
        <Text variant="label" size="XS" weight="high">
          Layout pattern
        </Text>
        <Badge size="xs" appearance="primary">
          {pattern.label}
        </Badge>
      </Container>
      <Text variant="body" size="S" appearance="neutral">
        Composed from {pattern.storyComponents.join(', ')} stories.
      </Text>
    </Container>
  );
}
```

- [ ] **Step 4: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/BuildDetails.tsx tests/unit/components/BuildDetails.test.tsx
git commit -m "Show authoring model, layout pattern, and quality notes in Build details

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 9: Website patterns 1/2 — shared chrome, Product story, Campaign hero

**Files:**
- Create: `App/src/components/previews/website/shared.tsx`
- Create: `App/src/components/previews/website/ProductStory.tsx`
- Create: `App/src/components/previews/website/CampaignHero.tsx`
- Modify: `App/src/components/previews/WebsitePreview.tsx` (becomes the pattern switch)
- Test: `tests/unit/components/WebsitePreview-patterns.test.tsx` (new)

**Interfaces:**
- Consumes: `resolvePatternId` (Task 3), `BuildPlan` with `patternId` (Task 2).
- Produces: `SiteHeader({ plan })`, `SiteFooter({ plan })`, `HERO_SCRIM` (a CSS gradient string) from `website/shared.tsx`; `ProductStory({ plan })`, `CampaignHero({ plan })` pattern renderers; `WebsitePreview` switching on the resolved pattern (unknown → `ProductStory`). Task 10 adds the `editorial`/`service-hub` cases to the same switch.
- CRITICAL: the existing `tests/unit/components/WebsitePreview.test.tsx` must keep passing unmodified — `ProductStory` (the default) must preserve: quote rendered as `"{text}"` with name/title, news titles + dates, `contactHeadline` text, `© Reliance` footer, and navItems appearing exactly twice (header + footer).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/WebsitePreview-patterns.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Powering every home',
  subheadline: 'Clean energy for a billion people.',
  ctaLabel: 'See the plan',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('WebsitePreview pattern switch', () => {
  it('renders the campaign hero pattern with a secondary CTA and stat-band treatment', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'campaign-hero' }} />);

    expect(screen.getByText('Powering every home')).toBeInTheDocument();
    expect(screen.getByText('See the plan')).toBeInTheDocument();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('defaults unknown patterns to the product story layout', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'nonsense' }} />);

    expect(screen.queryByText('Learn more')).not.toBeInTheDocument();
    expect(screen.getByText('© Reliance')).toBeInTheDocument();
  });

  it('renders one high-attention CTA in the campaign hero (secondary is visibly secondary)', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'campaign-hero' }} />);

    // Both CTAs exist but only the plan's own label is the primary action.
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/WebsitePreview-patterns.test.tsx`
Expected: FAIL — 'Learn more' not rendered (current single layout).

- [ ] **Step 3: Create `App/src/components/previews/website/shared.tsx`**

```tsx
import { Container, Text, Button } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { BrandMark } from '../../BrandMark';

/**
 * Shared website chrome: every website pattern gets the same real-feeling
 * header and footer so pattern variety happens in the page body, not in the
 * frame. Extracted from the original single-layout WebsitePreview.
 */

/** Text-over-image is only ever done through a scrim — art-direction rule, enforced here as the one shared gradient. */
export const HERO_SCRIM = 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 62%, rgba(0,0,0,0.7) 100%)';

export function SiteHeader({ plan }: { plan: BuildPlan }) {
  const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      align="center"
      justify="space-between"
      width="full"
      padding="4"
      style={{ borderBottom: '1px solid var(--Neutral-Stroke-Low)' }}
    >
      <BrandMark size={22} />
      <Container variant="full-bleed" layout="flex" align="center" gap="5" width="fit">
        {navItems.map((item) => (
          <Text key={item} variant="label" size="M" appearance="neutral">
            {item}
          </Text>
        ))}
        <Button attention="high" size="m">
          {plan.ctaLabel || 'Get started'}
        </Button>
      </Container>
    </Container>
  );
}

export function SiteFooter({ plan }: { plan: BuildPlan }) {
  const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="3"
      width="full"
      padding="10"
      style={{ borderTop: '1px solid var(--Neutral-Stroke-Low)', marginTop: 'auto' }}
    >
      <BrandMark size={20} />
      <Container variant="full-bleed" layout="flex" gap="4" wrap>
        {navItems.map((item) => (
          <Text key={item} variant="label" size="S" appearance="neutral">
            {item}
          </Text>
        ))}
      </Container>
      <Text variant="label" size="XS" appearance="neutral">
        © Reliance
      </Text>
    </Container>
  );
}
```

Note: the header CTA in `SiteHeader` keeps the original's `attention="high"` — but the art-direction rule says one high-attention CTA per view. Change the header CTA to `attention="medium"` so each pattern's hero CTA is the single high-attention action. (The original file used high in both places; this is the fix, not a regression — no existing test asserts button attention.)

- [ ] **Step 4: Create `App/src/components/previews/website/ProductStory.tsx`**

The current `WebsitePreview` body, restructured around the shared chrome, with the empty
grey news placeholder replaced by a token-styled brand treatment (designed absence):

```tsx
import { Container, Text, Button, Image, Surface } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { BrandMark } from '../../BrandMark';
import { SiteHeader, SiteFooter } from './shared';

/** "Product story": split-intent marketing page — the default website pattern. */
export function ProductStory({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" padding="10">
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" textAlign="center" style={{ maxWidth: 760 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" appearance="neutral" textAlign="center" style={{ maxWidth: 620 }}>
            {plan.subheadline}
          </Text>
        )}
        <Button attention="high" size="l">
          {plan.ctaLabel || 'Primary action'}
        </Button>
      </Container>

      {plan.heroImage && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />
        </Container>
      )}

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(sections.length, 3)} gap="6" width="full" padding="10">
          {sections.map((section) => (
            <Container key={section.title} variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="title" size="S">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral">
                {section.body}
              </Text>
            </Container>
          ))}
        </Container>
      )}

      {plan.quote && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Surface mode="moderate" style={{ padding: 'var(--Spacing-8)', borderRadius: 'var(--Shape-3)' }}>
            <Text variant="title" size="L">
              "{plan.quote.text}"
            </Text>
            <Text variant="label" size="M" weight="high">
              {plan.quote.name}
            </Text>
            <Text variant="body" size="S" appearance="neutral">
              {plan.quote.title}
            </Text>
          </Surface>
        </Container>
      )}

      {plan.newsItems && plan.newsItems.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(plan.newsItems.length, 3)} gap="6" width="full" padding="10">
          {plan.newsItems.map((item) => (
            <Surface key={item.title} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-3)' }}>
              {plan.heroImage ? (
                <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />
              ) : (
                <Surface
                  mode="bold"
                  appearance="primary"
                  style={{
                    aspectRatio: '16 / 9',
                    borderRadius: 'var(--Shape-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BrandMark size={32} onBold />
                </Surface>
              )}
              <Text variant="label" size="S" appearance="neutral" style={{ marginTop: 'var(--Spacing-3)' }}>
                {item.date}
              </Text>
              <Text variant="title" size="S">
                {item.title}
              </Text>
            </Surface>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Container variant="full-bleed" width="full">
          <Surface mode="moderate" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
            <Text variant="display" size="M">
              {plan.contactHeadline}
            </Text>
          </Surface>
        </Container>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
```

- [ ] **Step 5: Create `App/src/components/previews/website/CampaignHero.tsx`**

```tsx
import { Container, Text, Button, Surface, Badge } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { SiteHeader, SiteFooter, HERO_SCRIM } from './shared';

/**
 * "Campaign hero": one bold image, one message. The generated hero image is
 * the full-bleed backdrop with the scrim guaranteeing text contrast; without
 * an image the hero falls back to the brand's bold primary surface — a
 * designed absence, never an empty shell.
 */
export function CampaignHero({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  const heroContent = (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      gap="4"
      width="full"
      padding="10"
      style={{ minHeight: 520, position: 'relative', boxSizing: 'border-box' }}
    >
      {/* Top spacer + one message stack: justify="space-between" then anchors
          the stack to the hero's bottom edge — the same spacer idiom
          SlidePreview's CoverSlide already uses. */}
      <div />
      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        {plan.kicker && (
          <Container variant="full-bleed" width="fit">
            <Badge size="m" appearance="brand-bg">
              {plan.kicker}
            </Badge>
          </Container>
        )}
        <Text variant="display" size="L" style={{ maxWidth: 880, color: 'var(--Text-OnBold-High, #fff)' }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" style={{ maxWidth: 640, color: 'var(--Text-OnBold-Medium, #fff)' }}>
            {plan.subheadline}
          </Text>
        )}
        <Container variant="full-bleed" layout="flex" gap="3" width="fit">
          <Button attention="high" size="l">
            {plan.ctaLabel || 'Get started'}
          </Button>
          <Button attention="low" size="l">
            Learn more
          </Button>
        </Container>
      </Container>
    </Container>
  );

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      {plan.heroImage ? (
        <div
          role="img"
          aria-label={describeHeroImage(plan)}
          style={{
            backgroundImage: `${HERO_SCRIM}, url(${plan.heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {heroContent}
        </div>
      ) : (
        <Surface mode="bold" appearance="primary">
          {heroContent}
        </Surface>
      )}

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(sections.length, 3)} gap="6" width="full" padding="10">
          {sections.map((section, i) => (
            <Container key={section.title} variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="label" size="S" appearance="primary">
                {String(i + 1).padStart(2, '0')}
              </Text>
              <Text variant="title" size="M">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral">
                {section.body}
              </Text>
            </Container>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Surface mode="bold" appearance="primary" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {plan.contactHeadline}
          </Text>
        </Surface>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
```

- [ ] **Step 6: Turn `App/src/components/previews/WebsitePreview.tsx` into the switch**

Replace the entire file:

```tsx
import type { BuildPlan } from '../../ai/schema';
import { resolvePatternId } from '../../data/patternRegistry';
import { ProductStory } from './website/ProductStory';
import { CampaignHero } from './website/CampaignHero';

/**
 * Website preview = a switch over the curated pattern registry. The pattern
 * id is always resolved through the registry (invalid/missing → the
 * category default), so Claude can steer the layout but never invent one.
 */
export function WebsitePreview({ plan }: { plan: BuildPlan }) {
  switch (resolvePatternId('website', plan)) {
    case 'campaign-hero':
      return <CampaignHero plan={plan} />;
    // 'editorial' and 'service-hub' land in the next task; until then the
    // registry default keeps them on the strongest existing layout.
    case 'product-story':
    default:
      return <ProductStory plan={plan} />;
  }
}
```

- [ ] **Step 7: Run the new test AND the pre-existing WebsitePreview test**

Run: `npx vitest run tests/unit/components/WebsitePreview-patterns.test.tsx tests/unit/components/WebsitePreview.test.tsx`
Expected: both PASS — the old file's assertions (quote, news, contact band, footer, nav ×2) all hold against `ProductStory`.

- [ ] **Step 8: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/previews/website App/src/components/previews/WebsitePreview.tsx tests/unit/components/WebsitePreview-patterns.test.tsx
git commit -m "Split website preview into pattern renderers: product story and campaign hero

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 10: Website patterns 2/2 — Editorial and Service hub

**Files:**
- Create: `App/src/components/previews/website/Editorial.tsx`
- Create: `App/src/components/previews/website/ServiceHub.tsx`
- Modify: `App/src/components/previews/WebsitePreview.tsx` (add the two cases)
- Test: `tests/unit/components/WebsitePreview-patterns2.test.tsx` (new)

**Interfaces:**
- Consumes: `SiteHeader`/`SiteFooter` (Task 9), `BuildPlan`.
- Produces: `Editorial({ plan })`, `ServiceHub({ plan })`; the `WebsitePreview` switch handles all four website patterns.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/WebsitePreview-patterns2.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'The next decade of energy',
  subheadline: 'What changes, what stays, and what we build first.',
  sections: [
    { title: 'Solar at scale', body: 'Panels across ten states.' },
    { title: 'Grid storage', body: 'Batteries that hold a city.' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('Editorial pattern', () => {
  it('numbers its article sections', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'editorial' }} />);

    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('02')).toBeInTheDocument();
    expect(screen.getByText('Solar at scale')).toBeInTheDocument();
  });

  it('renders the quote as a pull-quote when present', () => {
    render(
      <WebsitePreview plan={{ ...basePlan, patternId: 'editorial', quote: { text: 'It works', name: 'Asha', title: 'CTO' } }} />,
    );

    expect(screen.getByText('"It works"')).toBeInTheDocument();
    expect(screen.getByText('Asha')).toBeInTheDocument();
  });
});

describe('Service hub pattern', () => {
  it('renders one explorable card per section', () => {
    render(<WebsitePreview plan={{ ...basePlan, patternId: 'service-hub' }} />);

    expect(screen.getByText('Solar at scale')).toBeInTheDocument();
    expect(screen.getByText('Grid storage')).toBeInTheDocument();
    expect(screen.getAllByText('Explore')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/WebsitePreview-patterns2.test.tsx`
Expected: FAIL — patterns fall through to `ProductStory` (no '01', no 'Explore').

- [ ] **Step 3: Create `App/src/components/previews/website/Editorial.tsx`**

```tsx
import { Container, Text, Image } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { describeHeroImage } from '../../../ai/schema';
import { SiteHeader, SiteFooter } from './shared';

/** "Editorial": reading-first announcement/story page — left-aligned measure, numbered sections, pull-quote. */
export function Editorial({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" padding="10" style={{ maxWidth: 880 }}>
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" style={{ maxWidth: 820 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="title" size="S" appearance="neutral" style={{ maxWidth: 680 }}>
            {plan.subheadline}
          </Text>
        )}
      </Container>

      {plan.heroImage && (
        <Container variant="full-bleed" width="full" padding="10" style={{ paddingTop: 0 }}>
          <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="21:9" width="full" />
        </Container>
      )}

      <Container variant="full-bleed" layout="flex" direction="column" gap="8" padding="10" style={{ maxWidth: 880, paddingTop: 0 }}>
        {plan.body && (
          <Text variant="body" size="L" appearance="neutral" style={{ maxWidth: 680 }}>
            {plan.body}
          </Text>
        )}

        {sections.map((section, i) => (
          <Container key={section.title} variant="full-bleed" layout="flex" gap="6" width="full">
            <Text variant="title" size="M" appearance="primary" style={{ minWidth: 56 }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
              <Text variant="title" size="M">
                {section.title}
              </Text>
              <Text variant="body" size="M" appearance="neutral" style={{ maxWidth: 620 }}>
                {section.body}
              </Text>
            </Container>
          </Container>
        ))}

        {plan.quote && (
          <Container
            variant="full-bleed"
            layout="flex"
            direction="column"
            gap="2"
            width="full"
            padding="6"
            style={{ borderLeft: '4px solid var(--Primary-Bold)' }}
          >
            <Text variant="title" size="L">
              "{plan.quote.text}"
            </Text>
            <Text variant="label" size="M" weight="high">
              {plan.quote.name}
            </Text>
            <Text variant="body" size="S" appearance="neutral">
              {plan.quote.title}
            </Text>
          </Container>
        )}
      </Container>

      <SiteFooter plan={plan} />
    </Container>
  );
}
```

- [ ] **Step 4: Create `App/src/components/previews/website/ServiceHub.tsx`**

```tsx
import { Container, Text, Button, Surface, Icon } from '@jds4/oneui-react';
import type { BuildPlan } from '../../../ai/schema';
import { SiteHeader, SiteFooter } from './shared';

/** Icons cycled across service cards — a fixed, on-registry set (never model-chosen). */
const SERVICE_ICONS = ['grid', 'heart', 'settings', 'chat', 'calendar', 'search'];

/** "Service hub": one card per offering, each with its own low-attention CTA — the page CTA hierarchy stays with the header/hero. */
export function ServiceHub({ plan }: { plan: BuildPlan }) {
  const sections = plan.sections ?? [];

  return (
    <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full" style={{ minHeight: '100%' }}>
      <SiteHeader plan={plan} />

      <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="3" padding="10">
        {plan.kicker && (
          <Text variant="label" size="S" appearance="primary">
            {plan.kicker}
          </Text>
        )}
        <Text variant="display" size="L" textAlign="center" style={{ maxWidth: 760 }}>
          {plan.headline}
        </Text>
        {plan.subheadline && (
          <Text variant="body" size="L" appearance="neutral" textAlign="center" style={{ maxWidth: 620 }}>
            {plan.subheadline}
          </Text>
        )}
      </Container>

      {sections.length > 0 && (
        <Container variant="full-bleed" layout="grid" columns={Math.min(Math.max(sections.length, 2), 3)} gap="6" width="full" padding="10" style={{ paddingTop: 0 }}>
          {sections.map((section, i) => (
            <Surface key={section.title} mode="subtle" style={{ padding: 'var(--Spacing-6)', borderRadius: 'var(--Shape-3)' }}>
              <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
                <Icon icon={SERVICE_ICONS[i % SERVICE_ICONS.length]} size="6" />
                <Text variant="title" size="M">
                  {section.title}
                </Text>
                <Text variant="body" size="M" appearance="neutral">
                  {section.body}
                </Text>
                <Button attention="low" size="m">
                  Explore
                </Button>
              </Container>
            </Surface>
          ))}
        </Container>
      )}

      {plan.contactHeadline && (
        <Surface mode="moderate" style={{ padding: 'var(--Spacing-10)', textAlign: 'center' }}>
          <Text variant="display" size="M">
            {plan.contactHeadline}
          </Text>
        </Surface>
      )}

      <SiteFooter plan={plan} />
    </Container>
  );
}
```

- [ ] **Step 5: Add the cases to `WebsitePreview.tsx`**

```tsx
import { Editorial } from './website/Editorial';
import { ServiceHub } from './website/ServiceHub';
// …in the switch, above 'product-story':
    case 'editorial':
      return <Editorial plan={plan} />;
    case 'service-hub':
      return <ServiceHub plan={plan} />;
```

…and delete the now-stale "land in the next task" comment.

- [ ] **Step 6: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/previews/website App/src/components/previews/WebsitePreview.tsx tests/unit/components/WebsitePreview-patterns2.test.tsx
git commit -m "Add editorial and service-hub website patterns

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 11: App-screen pattern compositions

**Files:**
- Modify: `App/src/components/previews/AppScreenPreview.tsx` (pattern compositions steering the existing `contentBlocks` grammar)
- Test: `tests/unit/components/AppScreenPreview-patterns.test.tsx` (new)

**Interfaces:**
- Consumes: `resolvePatternId` (Task 3); existing `ContentBlock` rendering; `PaginationDots`, `Input`, `Chip`, `ChipGroup`, `InputField`, `Avatar` from `@jds4/oneui-react` (all story-backed; APIs per their stories: `<PaginationDots pageCount={n} defaultActiveIndex={i} aria-label=... />`, `<Input placeholder size onChange />`, `<ChipGroup aria-label value onValueChange><Chip value>label</Chip></ChipGroup>`, `<InputField label placeholder size />`).
- Produces: `AppScreenPreview` rendering five pattern compositions: `dashboard` (default), `onboarding`, `browse`, `profile`, `checkout`. The existing `tests/unit/components/AppScreenPreview.test.tsx` must keep passing — the default (`dashboard`) composition preserves: hero image render, all four block types, dynamic bottom nav with `aria-label="Preview navigation"`, `screenTitle` fallback 'Home'.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/AppScreenPreview-patterns.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppScreenPreview } from '../../../App/src/components/previews/AppScreenPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Track your energy',
  screenTitle: 'Energy',
  ctaLabel: 'Get started',
  contentBlocks: [
    { type: 'list-item', title: 'Solar output', subtitle: 'Live' },
    { type: 'stat', value: '4.2 kW', label: 'Generating now' },
    { type: 'action', label: 'View details' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('AppScreenPreview patterns', () => {
  it('onboarding: hero-led, pagination dots and one primary CTA, no bottom nav', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'onboarding' }} />);

    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.getByLabelText('Onboarding steps')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preview navigation')).not.toBeInTheDocument();
  });

  it('browse: search input and filter chips above the content', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'browse' }} />);

    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview navigation')).toBeInTheDocument();
  });

  it('checkout: order rows, a total, a promo field, one confirming CTA', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'checkout' }} />);

    expect(screen.getByText('Promo code')).toBeInTheDocument();
    expect(screen.getByText('4.2 kW')).toBeInTheDocument();
    expect(screen.getByText('View details')).toBeInTheDocument();
  });

  it('profile: large avatar header with the screen title', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'profile' }} />);

    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview navigation')).toBeInTheDocument();
  });

  it('defaults to the dashboard composition with a greeting', () => {
    render(<AppScreenPreview plan={{ ...basePlan, patternId: 'nonsense' }} />);

    expect(screen.getByText('Good morning')).toBeInTheDocument();
    expect(screen.getByText('4.2 kW')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/AppScreenPreview-patterns.test.tsx`
Expected: FAIL — no pattern handling.

- [ ] **Step 3: Rework `App/src/components/previews/AppScreenPreview.tsx`**

Keep `DEFAULT_BLOCKS`, `DEFAULT_NAV_ITEMS`, and the whole `ContentBlock` component exactly as they are. Replace the `AppScreenPreview` export with pattern compositions:

```tsx
import { Container, Text, Avatar, BottomNavigation, BottomNavItem, Image, Icon, Button, Input, Chip, ChipGroup, InputField, PaginationDots } from '@jds4/oneui-react';
import type { AppScreenBlock, BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { resolvePatternId } from '../../data/patternRegistry';
import { BrandMark } from '../BrandMark';
```

```tsx
function TopBar({ title }: { title: string }) {
  return (
    <Container variant="full-bleed" layout="flex" align="center" gap="2" padding="4">
      <Avatar size="s" content="text" alt="User" />
      <Text variant="label" size="M" weight="high">
        {title}
      </Text>
    </Container>
  );
}

function BottomNav({ navItems }: { navItems: { label: string; icon: string }[] }) {
  return (
    <BottomNavigation aria-label="Preview navigation" defaultValue={navItems[0]?.label.toLowerCase()}>
      {navItems.map((item) => (
        <BottomNavItem key={item.label} icon={item.icon} label={item.label} value={item.label.toLowerCase()} />
      ))}
    </BottomNavigation>
  );
}

export function AppScreenPreview({ plan }: { plan: BuildPlan }) {
  const blocks = plan.contentBlocks?.length ? plan.contentBlocks : DEFAULT_BLOCKS;
  const navItems = plan.screenNavItems?.length ? plan.screenNavItems : DEFAULT_NAV_ITEMS;
  const heroAlt = describeHeroImage(plan);
  const title = plan.screenTitle || 'Home';
  const patternId = resolvePatternId('app-screens', plan);

  if (patternId === 'onboarding') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" align="center" justify="space-between" width="full" padding="6" style={{ height: '100%', boxSizing: 'border-box' }}>
        <BrandMark size={28} />
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" width="full">
          {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="1:1" width="full" />}
          <Text variant="display" size="S" textAlign="center">
            {plan.headline || title}
          </Text>
          {plan.body && (
            <Text variant="body" size="M" appearance="neutral" textAlign="center">
              {plan.body}
            </Text>
          )}
          <PaginationDots pageCount={3} defaultActiveIndex={0} aria-label="Onboarding steps" />
        </Container>
        <Button attention="high" size="l" fullWidth>
          {plan.ctaLabel || 'Get started'}
        </Button>
      </Container>
    );
  }

  if (patternId === 'browse') {
    const filterChips = navItems.slice(0, 3).map((item) => item.label);
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <TopBar title={title} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          <Input size="m" placeholder="Search" />
          <ChipGroup aria-label="Filters" value={[filterChips[0]?.toLowerCase() ?? 'all']} onValueChange={() => {}}>
            <Container variant="full-bleed" layout="flex" gap="2" wrap>
              {filterChips.map((label) => (
                <Chip key={label} value={label.toLowerCase()} size="s" attention="medium">
                  {label}
                </Chip>
              ))}
            </Container>
          </ChipGroup>
          {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
        </Container>
        <BottomNav navItems={navItems} />
      </Container>
    );
  }

  if (patternId === 'profile') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="2" padding="6">
          {/* size "m" is the largest Avatar size proven by its story args — the
              generous padding around it carries the "large header" feel. */}
          <Avatar size="m" content="text" alt="User" />
          <Text variant="title" size="M">
            {title}
          </Text>
        </Container>
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
        </Container>
        <BottomNav navItems={navItems} />
      </Container>
    );
  }

  if (patternId === 'checkout') {
    return (
      <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
        <TopBar title={title} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
          {blocks.map((block, i) => (
            <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
          ))}
          <InputField label="Promo code" placeholder="Enter code" size="m" />
        </Container>
        <Container variant="full-bleed" layout="flex" direction="column" padding="4" width="full">
          <Button attention="high" size="l" fullWidth>
            {plan.ctaLabel || 'Confirm'}
          </Button>
        </Container>
      </Container>
    );
  }

  // dashboard — the default composition.
  return (
    <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" padding="4">
        <Container variant="full-bleed" layout="flex" direction="column" gap="0">
          <Text variant="label" size="S" appearance="neutral">
            Good morning
          </Text>
          <Text variant="title" size="S">
            {title}
          </Text>
        </Container>
        <Avatar size="s" content="text" alt="User" />
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
        {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
        {blocks.map((block, i) => (
          <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
        ))}
      </Container>

      <BottomNav navItems={navItems} />
    </Container>
  );
}
```

Note: the existing `AppScreenPreview.test.tsx` renders plans without `patternId`, which resolves to `dashboard` — its hero/blocks/nav assertions still hold. If any of its assertions referenced the old top bar (`Avatar` + title side by side), the dashboard header still renders both the title and an avatar, so text queries keep passing. Run it explicitly in the next step to confirm.

- [ ] **Step 4: Run both AppScreenPreview test files**

Run: `npx vitest run tests/unit/components/AppScreenPreview.test.tsx tests/unit/components/AppScreenPreview-patterns.test.tsx`
Expected: both PASS. If the old file asserted on layout specifics the dashboard changed (e.g. exact heading structure), update ONLY those assertions to match the dashboard composition and note it in the commit message.

- [ ] **Step 5: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/previews/AppScreenPreview.tsx tests/unit/components/AppScreenPreview-patterns.test.tsx
git commit -m "Add app-screen pattern compositions: onboarding, browse, profile, checkout, dashboard

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 12: Stat and closing slide types

**Files:**
- Modify: `App/aiServerPlugin.ts` (slides tool schema: enum + stat fields)
- Modify: `tests/unit/aiServerPlugin.test.ts:45` (exact assertion update below)
- Modify: `App/src/components/previews/SlidePreview.tsx` (two new slide renderers + switch cases)
- Test: `tests/unit/components/SlidePreview-new-types.test.tsx` (new)

**Interfaces:**
- Consumes: `SlideContent.statValue`/`statLabel` and the widened `SlideType` (Task 2).
- Produces: `SlidePreview` renders `stat` and `closing` slides; the plan tool can author them.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/SlidePreview-new-types.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlidePreview } from '../../../App/src/components/previews/SlidePreview';

describe('stat slide', () => {
  it('makes the value the hero with a small caption', () => {
    render(<SlidePreview slide={{ slideType: 'stat', headline: 'Growth', statValue: '42%', statLabel: 'Year on year' }} />);

    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByText('Year on year')).toBeInTheDocument();
    expect(screen.getByText('Growth')).toBeInTheDocument();
  });
});

describe('closing slide', () => {
  it('renders the closing headline and optional subheadline', () => {
    render(<SlidePreview slide={{ slideType: 'closing', headline: 'Thank you.', subheadline: 'Questions welcome.' }} />);

    expect(screen.getByText('Thank you.')).toBeInTheDocument();
    expect(screen.getByText('Questions welcome.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/SlidePreview-new-types.test.tsx`
Expected: FAIL — `stat`/`closing` fall through to `ContentSlide`, which never renders `statValue`.

- [ ] **Step 3: Add the renderers to `App/src/components/previews/SlidePreview.tsx`**

Add after `TableSlide`:

```tsx
function StatSlide({ slide }: { slide: SlideContent }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Container variant="full-bleed" layout="flex" align="center" justify="space-between" width="full">
        <Badge size="m" appearance="primary">
          {slide.headline}
        </Badge>
        <BrandMark size={28} />
      </Container>
      <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
        <Text variant="display" size="L" appearance="primary">
          {slide.statValue}
        </Text>
        {slide.statLabel && (
          <Text variant="title" size="S" appearance="neutral">
            {slide.statLabel}
          </Text>
        )}
      </Container>
    </Container>
  );
}

function ClosingSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface mode="bold" appearance="primary" style={{ height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        align="center"
        justify="center"
        gap="3"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box' }}
      >
        <Text variant="display" size="L" textAlign="center" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
          {slide.headline}
        </Text>
        {slide.subheadline && (
          <Text variant="title" size="S" textAlign="center" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
            {slide.subheadline}
          </Text>
        )}
        <BrandMark size={32} onBold />
      </Container>
    </Surface>
  );
}
```

Add to the switch in `SlidePreview`:

```tsx
    case 'stat':
      return <StatSlide slide={slide} />;
    case 'closing':
      return <ClosingSlide slide={slide} />;
```

- [ ] **Step 4: Extend the plan tool in `App/aiServerPlugin.ts`**

In `PLAN_TOOL`'s `slides.items.properties`:
- `slideType.enum` becomes `['cover', 'divider', 'content', 'split-photo', 'table', 'stat', 'closing']`
- Add:

```ts
            statValue: { type: 'string', description: 'stat only: the single large number/value the slide is about, e.g. "42%" or "₹2,400 Cr".' },
            statLabel: { type: 'string', description: 'stat only: one-line caption under the value.' },
```

- In the `slides` array's `description`, extend the slideType list: `…"table" for a structured comparison/principles table, "stat" for one hero number with a caption, "closing" for the final thank-you/next-steps slide.`
- Also extend `SlideContent`'s `subheadline` JSDoc in `App/src/ai/schema.ts` to `/** cover and closing only. */` and the tool's `subheadline` description to `'cover/closing only.'`.

Update `tests/unit/aiServerPlugin.test.ts` line 45 — this exact change:

```ts
// old
    expect(props.slides.items.properties.slideType.enum).toEqual(['cover', 'divider', 'content', 'split-photo', 'table']);
// new
    expect(props.slides.items.properties.slideType.enum).toEqual(['cover', 'divider', 'content', 'split-photo', 'table', 'stat', 'closing']);
```

- [ ] **Step 5: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/previews/SlidePreview.tsx App/aiServerPlugin.ts App/src/ai/schema.ts tests/unit/aiServerPlugin.test.ts tests/unit/components/SlidePreview-new-types.test.tsx
git commit -m "Add stat and closing slide types

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 13: Designed social formats and the multi-frame carousel

**Files:**
- Modify: `App/src/components/previews/SocialPreview.tsx` (full rewrite: four designed formats, `frameIndex` prop)
- Modify: `App/src/components/BuildPreview.tsx` (generalize the deck navigator to carousel frames)
- Modify: `App/aiServerPlugin.ts` (PLAN_TOOL gains `carouselFrames`)
- Test: `tests/unit/components/SocialPreview-formats.test.tsx` (new)
- Test: `tests/unit/components/BuildPreview-carousel.test.tsx` (new)

**Interfaces:**
- Consumes: `CarouselFrame`/`plan.carouselFrames` (Task 2; client sanitization landed in Task 7), `HERO_SCRIM` (Task 9), `PaginationDots`.
- Produces: `SocialPreview({ plan, variantId, frameIndex = 0 })` — the composition follows `variantId` (the canvas the user is actually looking at: `square`/`story`/`linkedin`/`carousel`); `BuildPreview` owns frame state and passes `frameIndex`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/SocialPreview-formats.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SocialPreview } from '../../../App/src/components/previews/SocialPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Solar for every rooftop',
  body: 'From launch to your home in 30 days.',
  ctaLabel: 'Join the waitlist',
  badgeLabel: 'New',
  carouselFrames: [
    { headline: 'The problem', body: 'Rooftops sit idle.' },
    { headline: 'The idea', body: 'Panels as a service.' },
    { headline: 'Join us' },
  ],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('SocialPreview formats', () => {
  it('square renders the announcement composition with badge and CTA', () => {
    render(<SocialPreview plan={basePlan} variantId="square" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Join the waitlist')).toBeInTheDocument();
  });

  it('linkedin renders the split composition including body copy', () => {
    render(<SocialPreview plan={basePlan} variantId="linkedin" />);

    expect(screen.getByText('From launch to your home in 30 days.')).toBeInTheDocument();
  });

  it('story renders on the bold brand surface when no image exists (designed absence)', () => {
    render(<SocialPreview plan={basePlan} variantId="story" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
  });

  it('carousel renders the requested frame with its position', () => {
    render(<SocialPreview plan={basePlan} variantId="carousel" frameIndex={1} />);

    expect(screen.getByText('The idea')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.queryByText('The problem')).not.toBeInTheDocument();
  });

  it('carousel falls back to a single headline frame when no frames were authored', () => {
    render(<SocialPreview plan={{ ...basePlan, carouselFrames: undefined }} variantId="carousel" />);

    expect(screen.getByText('Solar for every rooftop')).toBeInTheDocument();
  });
});
```

Create `tests/unit/components/BuildPreview-carousel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BuildPreview } from '../../../App/src/components/BuildPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const plan: BuildPlan = {
  headline: 'H',
  socialFormat: 'carousel',
  dimensionVariant: 'carousel',
  carouselFrames: [{ headline: 'Hook frame' }, { headline: 'Middle frame' }, { headline: 'CTA frame' }],
  recommendedComponentNames: [],
  reasoning: '',
};

describe('BuildPreview carousel navigation', () => {
  it('pages through carousel frames with the deck navigator', async () => {
    const user = userEvent.setup();
    render(<BuildPreview category="social-media" answers={{}} plan={plan} />);

    expect(screen.getByText('Hook frame')).toBeInTheDocument();
    expect(screen.getByText('Frame 1 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Middle frame')).toBeInTheDocument();
    expect(screen.getByText('Frame 2 of 3')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run tests/unit/components/SocialPreview-formats.test.tsx tests/unit/components/BuildPreview-carousel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `App/src/components/previews/SocialPreview.tsx`**

```tsx
import { Container, Text, Badge, Image, Surface, Button, PaginationDots } from '@jds4/oneui-react';
import type { BuildPlan, CarouselFrame } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';
import { BrandMark } from '../BrandMark';
import { HERO_SCRIM } from './website/shared';

/**
 * One designed composition per social canvas. The composition follows the
 * canvas actually being previewed (variantId), so switching the size picker
 * always shows a layout designed for that size — never a stretched square.
 */
export function SocialPreview({ plan, variantId, frameIndex = 0 }: { plan: BuildPlan; variantId: string; frameIndex?: number }) {
  switch (variantId) {
    case 'story':
      return <StoryVertical plan={plan} />;
    case 'linkedin':
      return <LinkedInSplit plan={plan} />;
    case 'carousel':
      return <CarouselFramePreview plan={plan} frameIndex={frameIndex} />;
    case 'square':
    default:
      return <Announcement plan={plan} />;
  }
}

function BrandRow({ plan }: { plan: BuildPlan }) {
  return (
    <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
      <BrandMark size={36} onBold />
      <Badge size="s" appearance="brand-bg">
        {plan.badgeLabel || 'New'}
      </Badge>
    </Container>
  );
}

/** Square 1080×1080 — one bold statement. */
function Announcement({ plan }: { plan: BuildPlan }) {
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="8"
      style={{ height: '100%', boxSizing: 'border-box', background: 'var(--Surface-Bold)' }}
    >
      <BrandRow plan={plan} />
      {plan.heroImage && <Image src={plan.heroImage} alt={describeHeroImage(plan)} aspectRatio="16:9" width="full" />}
      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '85%' }}>
          {plan.headline}
        </Text>
        {plan.ctaLabel && (
          <Container variant="full-bleed" width="fit">
            <Button attention="high" size="l">
              {plan.ctaLabel}
            </Button>
          </Container>
        )}
      </Container>
    </Container>
  );
}

/** 1080×1920 vertical — image-led with a scrim-anchored bottom stack. */
function StoryVertical({ plan }: { plan: BuildPlan }) {
  const backdrop = plan.heroImage
    ? { backgroundImage: `${HERO_SCRIM}, url(${plan.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--Surface-Bold)' };
  return (
    <div role={plan.heroImage ? 'img' : undefined} aria-label={plan.heroImage ? describeHeroImage(plan) : undefined} style={{ height: '100%', ...backdrop }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="8"
        style={{ height: '100%', boxSizing: 'border-box' }}
      >
        <BrandRow plan={plan} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
          <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {plan.headline}
          </Text>
          {plan.ctaLabel && (
            <Container variant="full-bleed" width="fit">
              <Button attention="high" size="l">
                {plan.ctaLabel}
              </Button>
            </Container>
          )}
        </Container>
      </Container>
    </div>
  );
}

/** 1200×627 landscape — copy left, image right. */
function LinkedInSplit({ plan }: { plan: BuildPlan }) {
  return (
    <Container variant="full-bleed" layout="flex" width="full" style={{ height: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        gap="3"
        padding="8"
        style={{ width: '55%', height: '100%', boxSizing: 'border-box' }}
      >
        <BrandMark size={28} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
          {plan.badgeLabel && (
            <Badge size="s" appearance="primary">
              {plan.badgeLabel}
            </Badge>
          )}
          <Text variant="title" size="L">
            {plan.headline}
          </Text>
          {plan.body && (
            <Text variant="body" size="M" appearance="neutral">
              {plan.body}
            </Text>
          )}
        </Container>
        {plan.ctaLabel ? (
          <Container variant="full-bleed" width="fit">
            <Button attention="high" size="m">
              {plan.ctaLabel}
            </Button>
          </Container>
        ) : (
          <div />
        )}
      </Container>
      {plan.heroImage ? (
        <div
          role="img"
          aria-label={describeHeroImage(plan)}
          style={{ width: '45%', height: '100%', backgroundImage: `url(${plan.heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : (
        <Surface mode="bold" appearance="primary" style={{ width: '45%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandMark size={64} onBold />
        </Surface>
      )}
    </Container>
  );
}

/** 1080×1080 per frame — a mini-slide; BuildPreview owns which frame is showing. */
function CarouselFramePreview({ plan, frameIndex }: { plan: BuildPlan; frameIndex: number }) {
  const frames: CarouselFrame[] = plan.carouselFrames?.length ? plan.carouselFrames : [{ headline: plan.headline || 'Untitled frame' }];
  const index = Math.min(Math.max(frameIndex, 0), frames.length - 1);
  const frame = frames[index];

  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      justify="space-between"
      width="full"
      padding="8"
      style={{ height: '100%', boxSizing: 'border-box', background: 'var(--Surface-Bold)' }}
    >
      <Container variant="full-bleed" layout="flex" justify="space-between" align="center" width="full">
        <BrandMark size={36} onBold />
        <Badge size="s" appearance="brand-bg">
          {`${index + 1}/${frames.length}`}
        </Badge>
      </Container>
      <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
        <Text variant="display" size="M" style={{ color: 'var(--Text-OnBold-High, #fff)', maxWidth: '85%' }}>
          {frame.headline}
        </Text>
        {frame.body && (
          <Text variant="body" size="L" style={{ color: 'var(--Text-OnBold-Medium, #fff)', maxWidth: '75%' }}>
            {frame.body}
          </Text>
        )}
      </Container>
      <PaginationDots pageCount={frames.length} defaultActiveIndex={index} aria-label="Carousel frames" key={index} />
    </Container>
  );
}
```

- [ ] **Step 4: Generalize the navigator in `App/src/components/BuildPreview.tsx`**

Replace the slides-specific navigator section. After the existing `slides`/`currentIndex` lines, change to:

```tsx
  const slides: SlideContent[] = plan.slides?.length ? plan.slides : [{ slideType: 'content', headline: plan.headline || 'Untitled slide' }];
  const frames = plan.carouselFrames?.length ? plan.carouselFrames : [{ headline: plan.headline || 'Untitled frame' }];
  // The deck navigator serves two multi-frame formats: slide decks and
  // social carousels. Which one (if either) is active depends on the
  // category and, for social, the canvas actually being previewed.
  const navigator =
    category === 'slides'
      ? { count: slides.length, noun: 'Slide' }
      : category === 'social-media' && variantId === 'carousel'
        ? { count: frames.length, noun: 'Frame' }
        : null;
  const currentIndex = navigator ? Math.min(Math.max(slideIndex, 0), navigator.count - 1) : 0;
```

Pass the index into `SocialPreview`:

```tsx
        {category === 'social-media' && <SocialPreview plan={plan} variantId={variantId} frameIndex={currentIndex} />}
```

Replace the `{category === 'slides' && slides.length > 1 && (...)}` block with:

```tsx
      {navigator && navigator.count > 1 && (
        <Container variant="full-bleed" layout="flex" align="center" justify="center" gap="4" padding="4">
          <Button attention="low" size="s" disabled={currentIndex === 0} onClick={() => setSlideIndex(currentIndex - 1)}>
            Previous
          </Button>
          <Text variant="label" size="S" appearance="neutral">
            {navigator.noun} {currentIndex + 1} of {navigator.count}
          </Text>
          <Button attention="low" size="s" disabled={currentIndex === navigator.count - 1} onClick={() => setSlideIndex(currentIndex + 1)}>
            Next
          </Button>
        </Container>
      )}
```

- [ ] **Step 5: Add `carouselFrames` to `PLAN_TOOL` in `App/aiServerPlugin.ts`**

After the `socialFormat` property:

```ts
      carouselFrames: {
        type: 'array',
        description:
          'Social carousel only: 3-5 frames, each one mini-slide advancing a single story — frame one is the hook, the last frame carries the CTA.',
        items: {
          type: 'object',
          properties: { headline: { type: 'string' }, body: { type: 'string' } },
          required: ['headline'],
        },
      },
```

- [ ] **Step 6: Run both new test files, the pre-existing SocialPreview/BuildPreview tests, then the full suite**

Run: `npx vitest run tests/unit/components`
Expected: PASS. If `tests/unit/components/SocialPreview.test.tsx` asserted specifics of the old single layout that the new `Announcement` composition changed (it renders the same headline/badge/CTA content), update only those selectors to the announcement composition and say so in the commit message.

- [ ] **Step 7: Commit**

```bash
git add App/src/components/previews/SocialPreview.tsx App/src/components/BuildPreview.tsx App/aiServerPlugin.ts tests/unit/components/SocialPreview-formats.test.tsx tests/unit/components/BuildPreview-carousel.test.tsx
git commit -m "Design all four social formats and make the carousel truly multi-frame

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 14: Concept-specific motion stages

**Files:**
- Create: `App/src/components/previews/MotionStage.tsx`
- Modify: `App/src/components/previews/MotionPreview.tsx` (pulse bar → `MotionStage`)
- Test: `tests/unit/components/MotionStage.test.tsx` (new)

**Interfaces:**
- Consumes: `pickMotionTokens` output (`duration`/`easing` token *names*), `plan.motionConcept`, `plan.heroImage`.
- Produces: `MotionStage({ concept, heroImage, heroAlt, duration, easing })` — a self-contained animated stage per concept (`loader`, `transition`, `intro-animation`, `product-reveal`, `micro-interaction`), pure CSS animations built from Reliance motion/color/shape tokens, fully static under `prefers-reduced-motion`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/MotionStage.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MotionStage } from '../../../App/src/components/previews/MotionStage';

const CONCEPTS = ['loader', 'transition', 'intro-animation', 'product-reveal', 'micro-interaction'] as const;

function stubReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MotionStage', () => {
  it.each(CONCEPTS)('renders an animated stage for %s', (concept) => {
    stubReducedMotion(false);
    const { container } = render(<MotionStage concept={concept} heroAlt="scene" />);

    expect(container.querySelector('style')).not.toBeNull();
    expect(container.firstChild).not.toBeNull();
  });

  it('renders a fully static stage under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { container } = render(<MotionStage concept="loader" heroAlt="scene" />);

    expect(container.querySelector('style')).toBeNull();
  });

  it('falls back to the loader stage for an unknown concept', () => {
    stubReducedMotion(false);
    const { container } = render(<MotionStage concept="not-a-concept" heroAlt="scene" />);

    expect(container.firstChild).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/unit/components/MotionStage.test.tsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Create `App/src/components/previews/MotionStage.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Container, CircularProgressIndicator, Image, Surface, Switch } from '@jds4/oneui-react';
import { BrandMark } from '../BrandMark';

interface MotionStageProps {
  concept: string;
  heroImage?: string;
  heroAlt: string;
  /** Reliance motion token *names* from pickMotionTokens, e.g. "Motion-Duration-M". */
  duration?: string;
  easing?: string;
}

/**
 * One animated stage per motion concept — pure CSS animations composed from
 * Reliance motion/colour/shape tokens (the AI never chooses these; it only
 * chose the concept). Under prefers-reduced-motion the stage renders its
 * final frame with no <style> tag and no animation at all.
 */
export function MotionStage({ concept, heroImage, heroAlt, duration, easing }: MotionStageProps) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dur = duration ? `var(--${duration})` : '400ms';
  const ease = easing ? `var(--${easing})` : 'ease';

  const keyframes = (
    <style>{`
      @keyframes rb-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.55; } }
      @keyframes rb-slide { 0%, 45% { transform: translateX(0); } 55%, 100% { transform: translateX(-50%); } }
      @keyframes rb-intro { 0% { transform: scale(0.7); opacity: 0; } 35%, 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.7); opacity: 0; } }
      @keyframes rb-reveal { 0% { clip-path: inset(0 100% 0 0); } 45%, 80% { clip-path: inset(0 0 0 0); } 100% { clip-path: inset(0 100% 0 0); } }
      @keyframes rb-tap { 0%, 100% { transform: translateY(0); } 15% { transform: translateY(4px); } 30% { transform: translateY(0); } }
    `}</style>
  );

  const stage = (children: ReactNode) => (
    <Container
      variant="full-bleed"
      layout="flex"
      align="center"
      justify="center"
      width="full"
      style={{ minHeight: 220, overflow: 'hidden', borderRadius: 'var(--Shape-3)', background: 'var(--Surface-Subtle)' }}
    >
      {!reduced && keyframes}
      {children}
    </Container>
  );

  switch (concept) {
    case 'transition':
      return stage(
        <div style={{ width: '70%', display: 'flex', gap: 12, animation: reduced ? undefined : `rb-slide 2.8s ${ease} infinite` }}>
          <Surface mode="bold" appearance="primary" style={{ minWidth: '100%', height: 120, borderRadius: 'var(--Shape-3)' }} />
          <Surface mode="moderate" style={{ minWidth: '100%', height: 120, borderRadius: 'var(--Shape-3)' }} />
        </div>,
      );
    case 'intro-animation':
      return stage(
        <div style={{ animation: reduced ? undefined : `rb-intro 3s ${ease} infinite` }}>
          <BrandMark size={96} />
        </div>,
      );
    case 'product-reveal':
      return stage(
        <div style={{ width: '70%', animation: reduced ? undefined : `rb-reveal 3.4s ${ease} infinite` }}>
          {heroImage ? (
            <Image src={heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />
          ) : (
            <Surface
              mode="bold"
              appearance="primary"
              style={{ aspectRatio: '16 / 9', borderRadius: 'var(--Shape-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <BrandMark size={48} onBold />
            </Surface>
          )}
        </div>,
      );
    case 'micro-interaction':
      return stage(
        <div style={{ animation: reduced ? undefined : `rb-tap 1.8s ${ease} infinite` }}>
          <Switch defaultSelected aria-label="Example toggle" />
        </div>,
      );
    case 'loader':
    default:
      return stage(
        <Container variant="full-bleed" layout="flex" direction="column" align="center" gap="4" width="fit">
          <CircularProgressIndicator variant="indeterminate" size="XL" aria-label="Motion preview" />
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--Shape-Pill)',
                  background: 'var(--Primary-Bold)',
                  animation: reduced ? undefined : `rb-pulse 1.4s ${ease} ${i * 0.18}s infinite`,
                  animationDuration: reduced ? undefined : dur,
                }}
              />
            ))}
          </div>
        </Container>,
      );
  }
}
```

- [ ] **Step 4: Use it in `App/src/components/previews/MotionPreview.tsx`**

- Remove the `pulsed` state, its `useEffect`, and the pulse-bar `<div style={{ width: pulsed ? 96 : 56 ... }}/>`.
- Remove the now-unused `useEffect`/`useState` imports as applicable (`useState` stays for `videoState`).
- Replace the `<>` fallback branch (hero thumb + `CircularProgressIndicator`) and the pulse bar with:

```tsx
        <MotionStage
          concept={plan.motionConcept || 'loader'}
          heroImage={plan.heroImage}
          heroAlt={describeHeroImage(plan)}
          duration={duration}
          easing={easing}
        />
```

…keeping the `<video>` branch, the concept/description text block, the Generate video button, and the error text exactly as they are. Add `import { MotionStage } from './MotionStage';`.

- [ ] **Step 5: Run the full suite, commit**

Run: `npx vitest run` — all PASS.

```bash
git add App/src/components/previews/MotionStage.tsx App/src/components/previews/MotionPreview.tsx tests/unit/components/MotionStage.test.tsx
git commit -m "Give each motion concept its own token-driven animated stage

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 15: ESLint gate

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json` (devDeps + `lint` script)

**Interfaces:**
- Produces: `npm run lint` passing over `App/`, `src/`, `tests/`.

- [ ] **Step 1: Install and configure**

```bash
npm install -D eslint typescript-eslint eslint-plugin-react-hooks
```

Create `eslint.config.js`:

```js
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      'storybook-static/**',
      '.playwright-cli/**',
      '.claude/**',
      '.claude-flow/**',
      '.agents/**',
      'oneUI/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The dev proxies deliberately use `any` for "shape not fully known
      // from documentation" API responses — a documented, load-bearing choice.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
```

Add to `package.json` scripts: `"lint": "eslint ."`.

- [ ] **Step 2: Run it and fix what it finds**

Run: `npm run lint`

Fix every finding mechanically (unused imports/vars, `@ts-expect-error` hygiene). Two rules for the fixes: never change runtime behavior to satisfy a lint rule, and if a rule fires broadly on pre-existing idioms (not real defects), disable that one rule with a comment in `eslint.config.js` explaining why rather than mass-editing files.

- [ ] **Step 3: Verify everything still passes**

Run: `npm run lint && npx vitest run && npm run app:build`
Expected: all three PASS.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git add -u
git commit -m "Add ESLint flat config and lint gate

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 16: Playwright smoke suite (hermetic fallback path)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/builder.spec.ts`
- Modify: `App/vite.config.ts` (respect `RELIANCE_BUILDER_DISABLE_AI`)
- Modify: `package.json` (devDep + `test:e2e` script)

**Interfaces:**
- Produces: `npm run test:e2e` — boots the dev server on port 5199 with all AI/media keys withheld, drives the real guided flow on the deterministic fallback path, asserts the preview-first contract.
- Key mechanism: `loadEnv` reads `.env` from disk regardless of the child process env, so "strip the env" alone cannot make the run hermetic. `RELIANCE_BUILDER_DISABLE_AI=1` tells `App/vite.config.ts` to skip copying the keys onto `process.env`, which makes every proxy 503 → the client's existing fallback path.

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Add the disable-AI guard to `App/vite.config.ts`**

Replace the env passthrough block (the five `if (env.X) process.env.X = env.X;` lines for `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_FALLBACK_MODEL`, `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`, `GEMINI_VIDEO_MODEL`) with:

```ts
  const env = loadEnv(mode, repoRoot, '');
  // E2E runs set RELIANCE_BUILDER_DISABLE_AI=1 to keep the suite hermetic:
  // loadEnv reads the repo-root .env from disk regardless of the child
  // process env, so withholding keys from the child env alone would not
  // stop them reaching the proxies — this flag does.
  const disableAI = env.RELIANCE_BUILDER_DISABLE_AI === '1' || process.env.RELIANCE_BUILDER_DISABLE_AI === '1';
  if (!disableAI) {
    if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
    if (env.ANTHROPIC_MODEL) process.env.ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
    if (env.ANTHROPIC_FALLBACK_MODEL) process.env.ANTHROPIC_FALLBACK_MODEL = env.ANTHROPIC_FALLBACK_MODEL;
    if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (env.GEMINI_IMAGE_MODEL) process.env.GEMINI_IMAGE_MODEL = env.GEMINI_IMAGE_MODEL;
    if (env.GEMINI_VIDEO_MODEL) process.env.GEMINI_VIDEO_MODEL = env.GEMINI_VIDEO_MODEL;
  }
```

- [ ] **Step 3: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5199' },
  webServer: {
    command: 'npx vite --config App/vite.config.ts --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, RELIANCE_BUILDER_DISABLE_AI: '1' },
  },
});
```

Add to `package.json` scripts: `"test:e2e": "playwright test"`.

- [ ] **Step 4: Create `tests/e2e/builder.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

/**
 * Hermetic smoke of the whole guided flow on the deterministic fallback
 * path (RELIANCE_BUILDER_DISABLE_AI=1 → every proxy 503s → fallbackPlan.ts
 * authors the content). Asserts the preview-first product contract, not
 * AI quality.
 */
test('guided flow renders a polished preview with details collapsed', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Reliance Builder')).toBeVisible();

  await page.getByPlaceholder('What would you like to build today?').fill('A campaign page for rooftop solar');
  await page.getByRole('button', { name: 'Build' }).click();

  // Fallback classification reuses the category's hand-authored questions.
  await expect(page.getByText('What type of website do you want to build?')).toBeVisible();
  await page.getByText('Campaign page', { exact: true }).click();

  await expect(page.getByText('What is the main goal of the website?')).toBeVisible();
  await page.getByText('Launch', { exact: true }).click();

  // Preview-first: the result screen leads with the rendered canvas.
  await expect(page.getByText("Here's what we'd build")).toBeVisible();
  await expect(page.getByText('A headline that sells the idea').first()).toBeVisible();

  // Technical detail stays collapsed until asked for.
  await expect(page.getByText('What Claude understood')).not.toBeVisible();
  await page.getByText('Build details').click();
  await expect(page.getByText('What Claude understood')).toBeVisible();
  await expect(page.getByText('Layout pattern')).toBeVisible();

  // Refine affordance is present.
  await expect(page.getByText('Refine prompt')).toBeVisible();
});

test('quick CTAs start a category directly', async ({ page }) => {
  await page.goto('/');

  await page.getByText('Slides', { exact: true }).click();

  await expect(page.getByText('What kind of slide do you want to create?')).toBeVisible();
});
```

- [ ] **Step 5: Run it**

Run: `npm run test:e2e`
Expected: 2 passed. If a selector misses because a OneUI component renders text differently (e.g. chips not exposing exact text nodes), adjust the selector to what the real DOM shows (`npx playwright test --debug` or the trace viewer) — do not weaken the assertions themselves.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/builder.spec.ts App/vite.config.ts package.json package-lock.json
git commit -m "Add hermetic Playwright smoke suite over the guided flow

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

### Task 17: Full gates + live verification

**Files:**
- Possibly modify: `App/geminiVideoProxy.ts` (`extractVideoUri` corrected against the real Veo response, if needed)
- Modify: `README.md` (final "How it works" touches: orchestrator, patterns, critique)

- [ ] **Step 1: Run all four gates**

```bash
npm run app:build && npm run lint && npx vitest run && npm run test:e2e
```

Expected: all PASS. Fix anything that fails before proceeding.

- [ ] **Step 2: Live verification — real Fable 5 build (uses the real API key; needs the user's .env intact)**

Start the app: `npm run app:dev` (background). Then with the playwright CLI (the same live-verification approach previous iterations used), drive: type "A campaign page announcing Reliance rooftop solar for 10 states" → follow-ups → wait for the preview.

Verify in the browser:
- The preview renders a pattern-driven layout (not the fallback copy).
- Build details shows: Claude badges with `claude-fable-5` (or the fallback model badge if the primary genuinely failed — both are correct behavior), the layout pattern row, and quality notes.
- A refinement ("make the headline about savings") re-runs plan + critique and updates the preview.
- No browser console errors.

- [ ] **Step 3: Live verification — real Veo video**

Drive a motion build ("A product reveal for our new energy app"). Click "Generate video" and wait — this is a live long-running call (up to a few minutes). If `extractVideoUri` misses the real operation shape, the error includes the raw JSON: correct the candidate paths in `App/geminiVideoProxy.ts` from that real response, re-run, and confirm a playable `<video>` renders. If the key has no Veo access, confirm the clean 503/502 error message renders in the motion panel and note it in the final report instead — the CSS/JS stage remains the fallback.

- [ ] **Step 4: Update `README.md` "How it works"**

Amend the AI-layer bullet to describe the current pipeline:

```markdown
- **AI reasoning layer**: `App/src/ai/` — an orchestrated pipeline (`orchestrator.ts`):
  phase 1 classifies the prompt and proposes follow-ups; phase 2 picks a curated
  Reliance layout pattern (`App/src/data/patternRegistry.ts`) and authors content
  into it; phase 3 critiques the draft against an art-direction + UX rubric and
  revises content fields only. Claude never chooses colors, fonts, spacing,
  component styling, or layouts — patterns and tokens are curated and validated
  app-side. Primary model `claude-fable-5` with automatic `claude-sonnet-5`
  fallback (see the env table above).
```

- [ ] **Step 5: Final commit**

```bash
git add README.md App/geminiVideoProxy.ts
git commit -m "Verify polished-outputs iteration live and document the pipeline

Co-Authored-By: claude-flow <ruv@ruv.net>"
```

---

## Acceptance criteria traceability

| Spec criterion | Where satisfied |
|---|---|
| Reliance-only lock intact | Untouched (`vite.config.ts`/`brandsConfig.ts`); Global Constraints |
| Fable 5 primary + fallback model + never-blocked preview | Task 1 (+ existing fallbackPlan path) |
| Validated pattern selection + content-only critique | Tasks 3, 4, 7 |
| Preview-first; tech detail in collapsed Build details | Tasks 8, 16 (asserted end-to-end) |
| Patterns compose only story-backed components (test-enforced) | Task 3 |
| Gemini images; Veo video; media never blocks; CSS motion always available | Tasks 5, 6, 14 |
| MCP adapters as graceful seams | Task 4 |
| `app:build`, `lint`, `vitest`, `test:e2e` all pass | Tasks 15, 16, 17 |

