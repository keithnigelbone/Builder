# Reliance Builder: multi-slide decks with slide-type variety — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a "slides" build into a real multi-slide deck: Claude authors a specific number of `SlideContent` objects (each choosing its own layout from cover/divider/content/split-photo/table), and the result screen lets the user page through the whole deck with Previous/Next controls and a "Slide X of N" counter.

**Architecture:** A new `slides?: SlideContent[]` field on `BuildPlan`, threaded through the Claude tool schema, the offline fallback generator (always a fixed 3-slide deck), and a restructured `SlidePreview.tsx` (one sub-renderer per type, now taking a single slide + the deck's shared image instead of the whole plan). `BuildPreview.tsx` gains its own `slideIndex` state and a small navigator row, independent of `PreviewFrame`'s existing dimension-variant picker.

**Tech Stack:** TypeScript, React 18, `@jds4/oneui-react`, Vitest + Testing Library.

## Global Constraints

- Scope is the "slides" category only — other categories are untouched.
- No per-slide AI-generated images — all slides share the single existing `plan.heroImage`.
- No slide-count question in the offline fallback flow — `fallbackPlan.ts` always generates a fixed 3-slide deck regardless of `answers`.
- No changes to `App/src/data/previewDimensions.ts` — the `slides` category keeps its single `16:9` canvas variant; slide count and canvas dimension are orthogonal.
- No hardcoded colors — cover/divider backgrounds use `<Surface mode="bold">` (the real `--Surface-Bold` token).
- No new components — the table slide type reuses the `Container layout="grid"` + `Surface` "grid of cards" pattern already used in `WebsitePreview.tsx`.

---

### Task 1: Extend `BuildPlan` schema, fallback content, and client-side array validation

**Files:**
- Modify: `App/src/ai/schema.ts:24` (add `SlideType`/`SlideContent` types, `slides` field)
- Modify: `App/src/ai/fallbackPlan.ts:81` (add fixed 3-slide deck)
- Modify: `App/src/ai/client.ts:123` (validate `slides` is a real array, same pattern as every other array field)
- Test: `tests/unit/ai/fallbackPlan.test.ts`

**Interfaces:**
- Produces: `SlideType`, `SlideContent`, `BuildPlan.slides?: SlideContent[]` — consumed by Task 2 (tool schema) and Task 3 (rendering).

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('fallbackPlan', ...)` block in `tests/unit/ai/fallbackPlan.test.ts` (after the last existing test, still inside the same `describe`):

```ts
  it('always returns a fixed 3-slide deck for slides, regardless of answers', () => {
    const result = fallbackPlan({ category: 'slides', prompt: '', answers: { 'slide-count': '10-plus' } }, 'x');

    expect(result.data.slides).toEqual([
      { slideType: 'cover', headline: 'A headline that sells the idea', subheadline: 'Supporting copy goes here.' },
      { slideType: 'content', headline: 'Key message goes here', kicker: 'Section', body: 'Supporting detail goes here.' },
      {
        slideType: 'table',
        headline: 'Key message goes here',
        tableColumns: [
          { header: 'Column one', items: ['Point one', 'Point two'] },
          { header: 'Column two', items: ['Point one', 'Point two'] },
        ],
      },
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: FAIL — `result.data.slides` is `undefined` (the field doesn't exist on `BuildPlan` or in `fallbackPlan`'s output yet).

- [ ] **Step 3: Add `SlideType`/`SlideContent` and the `slides` field to `schema.ts`**

In `App/src/ai/schema.ts`, immediately after the existing `AppScreenBlock` type (ends at line 24 with `| { type: 'action'; label: string };`) and before the `BuildPlan` JSDoc comment, insert:

```ts
export type SlideType = 'cover' | 'divider' | 'content' | 'split-photo' | 'table';

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
}
```

Then, in the `BuildPlan` interface, find:

```ts
  /** App screens: dynamic bottom nav items, replacing the generic Home/Search/Settings default. */
  screenNavItems?: { label: string; icon: string }[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
```

Insert the new field between them:

```ts
  /** App screens: dynamic bottom nav items, replacing the generic Home/Search/Settings default. */
  screenNavItems?: { label: string; icon: string }[];
  /** Slides: the full deck — each entry is one slide's content. The shared plan.heroImage (if any) is reused by any slide that wants an image; slides never author their own. */
  slides?: SlideContent[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
```

- [ ] **Step 4: Add the fixed 3-slide deck to `fallbackPlan.ts`**

In `App/src/ai/fallbackPlan.ts`, find:

```ts
    screenNavItems: [
      { label: 'Home', icon: 'home' },
      { label: 'Search', icon: 'search' },
      { label: 'Settings', icon: 'settings' },
    ],
    socialFormat: 'square',
```

Insert the new field between them:

```ts
    screenNavItems: [
      { label: 'Home', icon: 'home' },
      { label: 'Search', icon: 'search' },
      { label: 'Settings', icon: 'settings' },
    ],
    slides: [
      { slideType: 'cover', headline: 'A headline that sells the idea', subheadline: 'Supporting copy goes here.' },
      { slideType: 'content', headline: 'Key message goes here', kicker: 'Section', body: 'Supporting detail goes here.' },
      {
        slideType: 'table',
        headline: 'Key message goes here',
        tableColumns: [
          { header: 'Column one', items: ['Point one', 'Point two'] },
          { header: 'Column two', items: ['Point one', 'Point two'] },
        ],
      },
    ],
    socialFormat: 'square',
```

- [ ] **Step 5: Validate the `slides` array in `client.ts`**

In `App/src/ai/client.ts`, find:

```ts
    screenNavItems: asArray(raw.screenNavItems),
    recommendedComponentNames,
```

Insert `slides` validation between them, using the same `asArray` helper every other array field already uses:

```ts
    screenNavItems: asArray(raw.screenNavItems),
    slides: asArray(raw.slides),
    recommendedComponentNames,
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass. `SlidePreview.tsx` still expects a `plan` prop, not `slide`/`heroImage` — it isn't updated until Task 3, so a typecheck error there is possible at this point and is fine; proceed to Task 2 either way.

- [ ] **Step 8: Commit**

```bash
git add App/src/ai/schema.ts App/src/ai/fallbackPlan.ts App/src/ai/client.ts tests/unit/ai/fallbackPlan.test.ts
git commit -m "Add slides: SlideContent[] deck field to BuildPlan"
```

---

### Task 2: Wire `slides` into the Claude tool schema and system prompt

**Files:**
- Modify: `App/aiServerPlugin.ts:166` (`PLAN_TOOL` — add `slides` property)
- Modify: `App/src/ai/brandContext.ts:36` (`RELIANCE_REAL_CONTEXT` — append a multi-slide structural paragraph)
- Test: `tests/unit/aiServerPlugin.test.ts` (extend the existing file)

**Interfaces:**
- Consumes: `BuildPlan.slides` (`SlideContent[]`) from Task 1.
- Produces: `PLAN_TOOL.input_schema.properties.slides` — makes Claude actually author the deck at runtime.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/unit/aiServerPlugin.test.ts` (append a new `describe` block after the existing ones, in the same file):

```ts
describe('PLAN_TOOL schema — slides', () => {
  it('includes a slides array with a validated slideType enum', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.slides.type).toBe('array');
    expect(props.slides.items.properties.slideType.enum).toEqual(['cover', 'divider', 'content', 'split-photo', 'table']);
    expect(props.slides.items.required).toEqual(['slideType', 'headline']);
    expect(props.slides.items.properties.tableColumns.items.required).toEqual(['header', 'items']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: FAIL — `props.slides` is `undefined`.

- [ ] **Step 3: Add the `slides` property to `PLAN_TOOL`**

In `App/aiServerPlugin.ts`, find:

```ts
      screenNavItems: {
        type: 'array',
        description: 'App screens: 2-5 bottom nav items for this specific app, replacing the generic Home/Search/Settings default.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            icon: { type: 'string', enum: NAV_ICON_ENUM },
          },
          required: ['label', 'icon'],
        },
      },
      socialFormat: { type: 'string', enum: ['square', 'story', 'linkedin', 'carousel'] },
```

Insert the new `slides` property between them:

```ts
      screenNavItems: {
        type: 'array',
        description: 'App screens: 2-5 bottom nav items for this specific app, replacing the generic Home/Search/Settings default.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            icon: { type: 'string', enum: NAV_ICON_ENUM },
          },
          required: ['label', 'icon'],
        },
      },
      slides: {
        type: 'array',
        description:
          'Slides: the full deck. Look at the guided answers for a slide-count signal (e.g. a range like "3-5", "6-10", "10+") and author that many slide objects, picking one specific number within the indicated range (e.g. "3-5" → 4, "10+" → 10). Each slide picks its own slideType: "cover" for an opening title slide, "divider" for a section-break heading only, "content" for a standard headline+body slide, "split-photo" for headline+body beside the deck\'s shared photo, "table" for a structured comparison/principles table. Slides never author their own image — the single shared heroImage (imageSubject/imageAction/imageLocation/imageFraming) is reused by any content/split-photo slide that wants one.',
        items: {
          type: 'object',
          properties: {
            slideType: { type: 'string', enum: ['cover', 'divider', 'content', 'split-photo', 'table'] },
            headline: { type: 'string' },
            subheadline: { type: 'string', description: 'cover only.' },
            body: { type: 'string', description: 'content/split-photo only.' },
            kicker: { type: 'string', description: 'content/split-photo only, optional eyebrow label.' },
            tableColumns: {
              type: 'array',
              description: 'table only.',
              items: {
                type: 'object',
                properties: { header: { type: 'string' }, items: { type: 'array', items: { type: 'string' } } },
                required: ['header', 'items'],
              },
            },
          },
          required: ['slideType', 'headline'],
        },
      },
      socialFormat: { type: 'string', enum: ['square', 'story', 'linkedin', 'carousel'] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: PASS.

- [ ] **Step 5: Add structural guidance to the system prompt**

In `App/src/ai/brandContext.ts`, find the file's last line: `` `.trim(); ``, currently preceded by the app-screens structural paragraph. Insert a new paragraph immediately before it:

```ts
For a slides build, author the full deck as the slides array: read the guided answers
for a slide-count signal (a range like "3-5", "6-10", "10+") and pick one specific
number within it, then give each slide a slideType — cover to open, divider for
section breaks, content for a standard point, split-photo when the deck's shared
photo genuinely adds to a point, table for comparing several items side by side.
`.trim();
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass (including the new `slides` schema test).

- [ ] **Step 7: Commit**

```bash
git add App/aiServerPlugin.ts App/src/ai/brandContext.ts tests/unit/aiServerPlugin.test.ts
git commit -m "Wire slides deck array into the Claude plan tool schema"
```

---

### Task 3: Render the five slide types and add the deck navigator

**Files:**
- Modify: `App/src/components/previews/SlidePreview.tsx` (full rewrite)
- Modify: `App/src/components/BuildPreview.tsx` (slide index state + navigator)
- Test: `tests/unit/components/SlidePreview.test.tsx` (new file)
- Test: `tests/unit/components/BuildPreview.test.tsx` (new file)

**Interfaces:**
- Consumes: `BuildPlan.slides` (`SlideContent[]`), `BuildPlan.heroImage`, `BuildPlan.headline` (all from Task 1/existing schema).
- Produces: `SlidePreview({ slide, heroImage })` — the prop signature changes from `{ plan }`; no other file besides `BuildPreview.tsx` imports `SlidePreview`, so this is a contained change.

- [ ] **Step 1: Write the failing tests for `SlidePreview`**

Create `tests/unit/components/SlidePreview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlidePreview } from '../../../App/src/components/previews/SlidePreview';
import type { SlideContent } from '../../../App/src/ai/schema';

describe('SlidePreview', () => {
  it('renders a cover slide with headline and subheadline', () => {
    const slide: SlideContent = { slideType: 'cover', headline: 'Growth is Life', subheadline: 'Our story' };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('Growth is Life')).toBeInTheDocument();
    expect(screen.getByText('Our story')).toBeInTheDocument();
  });

  it('renders a divider slide with only the headline', () => {
    const slide: SlideContent = { slideType: 'divider', headline: 'Section two' };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('Section two')).toBeInTheDocument();
  });

  it('renders a content slide with headline, body, kicker, and image', () => {
    const slide: SlideContent = { slideType: 'content', headline: 'Our approach', body: 'A short body line', kicker: 'Overview' };
    render(<SlidePreview slide={slide} heroImage="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" />);

    expect(screen.getByText('Our approach')).toBeInTheDocument();
    expect(screen.getByText('A short body line')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders a split-photo slide with headline, body, and the shared image beside it', () => {
    const slide: SlideContent = { slideType: 'split-photo', headline: 'Built for scale', body: 'Details here' };
    render(<SlidePreview slide={slide} heroImage="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" />);

    expect(screen.getByText('Built for scale')).toBeInTheDocument();
    expect(screen.getByText('Details here')).toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('renders a table slide with column headers and items', () => {
    const slide: SlideContent = {
      slideType: 'table',
      headline: 'The 7 principles',
      tableColumns: [
        { header: 'We care', items: ['Point one', 'Point two'] },
        { header: 'Excellence', items: ['Point three'] },
      ],
    };
    render(<SlidePreview slide={slide} />);

    expect(screen.getByText('The 7 principles')).toBeInTheDocument();
    expect(screen.getByText('We care')).toBeInTheDocument();
    expect(screen.getByText('Excellence')).toBeInTheDocument();
    expect(screen.getByText('• Point one')).toBeInTheDocument();
    expect(screen.getByText('• Point three')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/SlidePreview.test.tsx`
Expected: FAIL — `SlidePreview` still takes a `plan` prop, not `slide`/`heroImage`.

- [ ] **Step 3: Rewrite `SlidePreview.tsx`**

Replace the entire contents of `App/src/components/previews/SlidePreview.tsx` with:

```tsx
import { Container, Text, Badge, Image, Surface } from '@jds4/oneui-react';
import type { SlideContent } from '../../ai/schema';
import { BrandMark } from '../BrandMark';

function CoverSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface
      mode="bold"
      appearance="primary"
      style={{ height: '100%', width: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          right: -100,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      >
        <BrandMark size={480} onBold />
      </div>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box', position: 'relative' }}
      >
        <BrandMark size={28} onBold />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full" style={{ maxWidth: '65%' }}>
          <Text variant="display" size="L" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
            {slide.headline}
          </Text>
          {slide.subheadline && (
            <Text variant="title" size="S" style={{ color: 'var(--Text-OnBold-Medium, #fff)' }}>
              {slide.subheadline}
            </Text>
          )}
        </Container>
        <div />
      </Container>
    </Surface>
  );
}

function DividerSlide({ slide }: { slide: SlideContent }) {
  return (
    <Surface mode="bold" appearance="primary" style={{ height: '100%', width: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        align="center"
        width="full"
        padding="10"
        style={{ height: '100%', boxSizing: 'border-box' }}
      >
        <Text variant="display" size="L" style={{ color: 'var(--Text-OnBold-High, #fff)' }}>
          {slide.headline}
        </Text>
      </Container>
    </Surface>
  );
}

function ContentSlide({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
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
          {slide.kicker || 'Section'}
        </Badge>
        <BrandMark size={28} />
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="4" width="full">
        <Text variant="display" size="L">
          {slide.headline}
        </Text>
        {slide.body && (
          <Text variant="title" size="S" appearance="neutral" style={{ maxWidth: '70%' }}>
            {slide.body}
          </Text>
        )}
        {heroImage && (
          <Container variant="full-bleed" width="full" style={{ maxHeight: 280 }}>
            <Image src={heroImage} alt={slide.headline || 'Slide image'} aspectRatio="16:9" width="full" />
          </Container>
        )}
      </Container>
    </Container>
  );
}

function SplitPhotoSlide({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  return (
    <Container variant="full-bleed" layout="flex" width="full" style={{ height: '100%', boxSizing: 'border-box' }}>
      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        justify="space-between"
        gap="4"
        padding="10"
        style={{ width: '45%', height: '100%', boxSizing: 'border-box' }}
      >
        <BrandMark size={24} />
        <Container variant="full-bleed" layout="flex" direction="column" gap="3" width="full">
          {slide.kicker && (
            <Text variant="label" size="S" appearance="primary">
              {slide.kicker}
            </Text>
          )}
          <Text variant="title" size="L">
            {slide.headline}
          </Text>
          {slide.body && (
            <Text variant="body" size="M" appearance="neutral">
              {slide.body}
            </Text>
          )}
        </Container>
        <div />
      </Container>
      {heroImage && (
        <div style={{ width: '55%', height: '100%' }}>
          <Image src={heroImage} alt={slide.headline || 'Slide image'} aspectRatio="3:4" width="full" />
        </div>
      )}
    </Container>
  );
}

function TableSlide({ slide }: { slide: SlideContent }) {
  const columns = slide.tableColumns ?? [];
  return (
    <Container
      variant="full-bleed"
      layout="flex"
      direction="column"
      gap="5"
      width="full"
      padding="10"
      style={{ height: '100%', boxSizing: 'border-box' }}
    >
      <Text variant="title" size="L">
        {slide.headline}
      </Text>
      <Container variant="full-bleed" layout="grid" columns={Math.max(columns.length, 1)} gap="4" width="full" grow={1}>
        {columns.map((col) => (
          <Surface key={col.header} mode="subtle" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-2)' }}>
            <Text variant="label" size="M" weight="high">
              {col.header}
            </Text>
            <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full" style={{ marginTop: 'var(--Spacing-3)' }}>
              {col.items.map((item) => (
                <Text key={item} variant="body" size="S" appearance="neutral">
                  • {item}
                </Text>
              ))}
            </Container>
          </Surface>
        ))}
      </Container>
    </Container>
  );
}

export function SlidePreview({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  switch (slide.slideType) {
    case 'cover':
      return <CoverSlide slide={slide} />;
    case 'divider':
      return <DividerSlide slide={slide} />;
    case 'split-photo':
      return <SplitPhotoSlide slide={slide} heroImage={heroImage} />;
    case 'table':
      return <TableSlide slide={slide} />;
    case 'content':
    default:
      return <ContentSlide slide={slide} heroImage={heroImage} />;
  }
}
```

- [ ] **Step 4: Run `SlidePreview` tests to verify they pass**

Run: `npx vitest run tests/unit/components/SlidePreview.test.tsx`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Write the failing tests for `BuildPreview`'s navigator**

Create `tests/unit/components/BuildPreview.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BuildPreview } from '../../../App/src/components/BuildPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Deck title',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('BuildPreview slide navigator', () => {
  it('does not render a navigator for a single-slide deck', () => {
    render(
      <BuildPreview
        category="slides"
        answers={{}}
        plan={{ ...basePlan, slides: [{ slideType: 'content', headline: 'Only slide' }] }}
      />,
    );

    expect(screen.queryByText(/Slide \d+ of \d+/)).not.toBeInTheDocument();
  });

  it('renders a navigator and moves between slides for a multi-slide deck', () => {
    render(
      <BuildPreview
        category="slides"
        answers={{}}
        plan={{
          ...basePlan,
          slides: [
            { slideType: 'cover', headline: 'First slide' },
            { slideType: 'divider', headline: 'Second slide' },
          ],
        }}
      />,
    );

    expect(screen.getByText('First slide')).toBeInTheDocument();
    expect(screen.getByText('Slide 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Second slide')).toBeInTheDocument();
    expect(screen.getByText('Slide 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('falls back to a single generic slide when plan.slides is empty', () => {
    render(<BuildPreview category="slides" answers={{}} plan={basePlan} />);

    expect(screen.getByText('Deck title')).toBeInTheDocument();
    expect(screen.queryByText(/Slide \d+ of \d+/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run `BuildPreview` tests to verify they fail**

Run: `npx vitest run tests/unit/components/BuildPreview.test.tsx`
Expected: FAIL — `BuildPreview` doesn't yet read `plan.slides`, doesn't render a navigator, and still passes the whole `plan` to `SlidePreview` (which now expects `slide`/`heroImage` after Step 3, so this will likely error rather than just fail assertions).

- [ ] **Step 7: Update `BuildPreview.tsx`**

Replace the entire contents of `App/src/components/BuildPreview.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Container, Text, Button, Surface } from '@jds4/oneui-react';
import type { BuildCategoryId, GuidedAnswers } from '../types';
import type { BuildPlan, SlideContent } from '../ai/schema';
import { getDefaultVariant } from '../data/previewDimensions';
import { PreviewFrame } from './PreviewFrame';
import { WebsitePreview } from './previews/WebsitePreview';
import { AppScreenPreview } from './previews/AppScreenPreview';
import { SlidePreview } from './previews/SlidePreview';
import { SocialPreview } from './previews/SocialPreview';
import { MotionPreview } from './previews/MotionPreview';

const CHROME_BY_CATEGORY: Record<BuildCategoryId, 'browser' | 'phone' | 'none'> = {
  website: 'browser',
  'app-screens': 'phone',
  slides: 'none',
  'social-media': 'none',
  motion: 'none',
};

/**
 * Renders the AI-authored (or fallback) build plan through a real,
 * dimension-accurate canvas for the chosen category — assembled entirely
 * from real OneUI components under the Reliance brand, so every colour,
 * radius, and font here is genuinely Reliance's. The AI layer only ever
 * supplies content and structure (see ai/schema.ts); it never chooses
 * styling.
 */
export function BuildPreview({ category, answers, plan }: { category: BuildCategoryId; answers: GuidedAnswers; plan: BuildPlan }) {
  const [variantId, setVariantId] = useState(() => getDefaultVariant(category).id);
  const [slideIndex, setSlideIndex] = useState(0);

  // Reset to this category's default canvas (and the first slide, for a
  // slides build) when the category itself changes (starting a new build),
  // but keep the chosen variant/slide across refinements of the *same* build.
  useEffect(() => {
    setVariantId(plan.dimensionVariant ?? getDefaultVariant(category).id);
    setSlideIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // Defensively falls back to a single generic slide if plan.slides is ever
  // empty (mirrors the navItems/sections/contentBlocks defensive-default
  // pattern used throughout this file's sibling preview components), and
  // clamps the index if the array is ever shorter than the last-viewed
  // position (e.g. after a refinement that changes the deck length).
  const slides: SlideContent[] = plan.slides?.length ? plan.slides : [{ slideType: 'content', headline: plan.headline || 'Untitled slide' }];
  const currentIndex = Math.min(Math.max(slideIndex, 0), slides.length - 1);

  return (
    <Surface mode="moderate" style={{ padding: 'var(--Spacing-4)', borderRadius: 'var(--Shape-3)' }}>
      <PreviewFrame category={category} variantId={variantId} onVariantChange={setVariantId} chrome={CHROME_BY_CATEGORY[category]}>
        {category === 'website' && <WebsitePreview plan={plan} />}
        {category === 'app-screens' && <AppScreenPreview plan={plan} />}
        {category === 'slides' && <SlidePreview slide={slides[currentIndex]} heroImage={plan.heroImage} />}
        {category === 'social-media' && <SocialPreview plan={plan} variantId={variantId} />}
        {category === 'motion' && <MotionPreview plan={plan} feelingAnswerId={answers['motion-feeling']} />}
      </PreviewFrame>

      {category === 'slides' && slides.length > 1 && (
        <Container variant="full-bleed" layout="flex" align="center" justify="center" gap="4" padding="4">
          <Button attention="low" size="s" disabled={currentIndex === 0} onClick={() => setSlideIndex(currentIndex - 1)}>
            Previous
          </Button>
          <Text variant="label" size="S" appearance="neutral">
            Slide {currentIndex + 1} of {slides.length}
          </Text>
          <Button attention="low" size="s" disabled={currentIndex === slides.length - 1} onClick={() => setSlideIndex(currentIndex + 1)}>
            Next
          </Button>
        </Container>
      )}
    </Surface>
  );
}
```

- [ ] **Step 8: Run `BuildPreview` tests to verify they pass**

Run: `npx vitest run tests/unit/components/BuildPreview.test.tsx`
Expected: PASS, all 3 tests.

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json && npx tsc --noEmit -p tsconfig.json`
Expected: all tests pass, zero typecheck errors in both tsconfigs.

- [ ] **Step 10: Commit**

```bash
git add App/src/components/previews/SlidePreview.tsx App/src/components/BuildPreview.tsx tests/unit/components/SlidePreview.test.tsx tests/unit/components/BuildPreview.test.tsx
git commit -m "Render the five slide types and add the deck Previous/Next navigator"
```

---

### Task 4: Visual end-to-end verification

**Files:** None modified — this task only verifies Tasks 1-3 together in the real running app.

**Interfaces:** None (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run app:dev` (in the background; check the printed URL — Vite falls back to another port if 5173 is taken). Poll `curl -sf http://localhost:<port>` until it responds.

- [ ] **Step 2: Drive a real slides build through the guided flow**

Using `playwright-cli` (already installed globally as `@playwright/cli` this session — `playwright-cli open <url>`, `snapshot` to get element refs, `click <ref>`), or manually in a browser:

1. Navigate to the dev server URL.
2. Click the "Slides" quick-action chip.
3. Answer both guided questions (click any option — exact wording varies per run since it's a live classify call).
4. Wait for "Designing your preview…" to resolve to the result screen.

- [ ] **Step 3: Confirm the deck and navigator**

Take a snapshot/screenshot of the result screen. Confirm:
- More than one slide was generated (if `ANTHROPIC_API_KEY` is set and a slide-count signal came through the guided answers — with no key, the fallback path always produces exactly 3).
- A "Slide 1 of N" counter and Previous/Next buttons appear below the canvas when there's more than one slide, and don't appear when there's only one.
- Previous is disabled on slide 1, Next is disabled on the last slide; clicking Next/Previous moves through the deck and updates the counter.
- At least two different slide types render distinctly (e.g. a cover slide's bold background + decorative brand mark vs. a content slide's white background) — screenshot at least two slides to confirm.
- No console errors.

- [ ] **Step 4: Stop the dev server**

Run: `kill %1` or `pkill -f "vite --config App/vite.config.ts"`.

- [ ] **Step 5: Report results**

No commit for this task (verification only) — summarize what was confirmed (or any issue found, in which case return to the relevant task above, fix, and re-verify) to the user.

---

## Self-Review Notes

- **Spec coverage:** `SlideType`/`SlideContent`/`slides` field (Task 1) ✓, `client.ts` array validation (Task 1) ✓, fixed 3-slide fallback deck (Task 1) ✓, `PLAN_TOOL` schema (Task 2) ✓, system-prompt structural guidance (Task 2) ✓, five slide-type renderers (Task 3) ✓, `BuildPreview` navigator + defensive fallback + index clamping (Task 3) ✓, visual end-to-end verification (Task 4) ✓. Non-goals respected: no per-slide images (slides share `plan.heroImage`), no offline slide-count question, no `previewDimensions.ts` changes, no hardcoded colors, no new components.
- **Type consistency:** `SlideContent`'s fields (`slideType`, `headline`, `subheadline`, `body`, `kicker`, `tableColumns`) are identical across `schema.ts` (Task 1), `fallbackPlan.ts` (Task 1), `aiServerPlugin.ts`'s `PLAN_TOOL` (Task 2), and the test/render usage in `SlidePreview.tsx`/`BuildPreview.tsx` (Task 3). `SlidePreview`'s new `{ slide, heroImage }` signature is used consistently in both its own tests and `BuildPreview.tsx`.
- **No placeholders:** every step above shows the exact code to write or the exact command to run.
