# Reliance Builder: multi-slide decks with slide-type variety and visual polish

## Problem

`App/src/components/previews/SlidePreview.tsx` renders every generated "slides" build
through one fixed layout: a top row (kicker badge + brand mark), a headline, an
optional body line, and an optional image stacked below — and every build only ever
produces that one slide, regardless of what the user asked for. This is a real gap:
the live guided-question flow already asks "Roughly how many slides do you need?"
(3-5 / 6-10 / 10+ slides), but the app currently has no way to act on that answer —
there is no concept of a deck, only a single slide's content, and no way to page
through more than one.

Reference screenshots at `Deck Ref/*.png` — 9 slides from a real Reliance corporate
deck — also show genuine slide-*type* variety (a dark navy cover/title slide with a
large serif headline and a translucent decorative logo mark bleeding off the edge,
full-color section-divider slides, split content+photo layouts, a structured 7-column
principles table, a partner-logo grid, and brand-spec panels) plus a distinct,
considered visual language, further underlining how flat today's single generic slide
looks by comparison.

## Goal

Turn a "slides" build into a real multi-slide deck: Claude authors a specific number of
slides (picked within whatever range the guided answers imply), each one a `SlideContent`
choosing its own layout from five types — cover, divider, content (today's existing
layout, restyled), split-photo, and table — and the result screen lets the user page
through the whole deck with Previous/Next controls and a "Slide X of N" counter.

## Non-goals

- **No per-slide AI-generated images.** The deck shares the single existing
  `plan.heroImage` (same one-image-per-build pattern already used for
  website/app-screens) — any content/split-photo slide that wants a photo reuses it.
  Generating a distinct photo per slide would multiply Gemini calls by the slide count
  (up to 10+) for a build that's meant to stay fast and cheap.
- **No slide-count question in the offline fallback flow.** `fallbackPlan.ts` always
  generates a fixed 3-slide deck (cover → content → table) regardless of guided
  answers, when no `ANTHROPIC_API_KEY` is set. `App/src/data/buildCategories.ts`'s
  hardcoded fallback questions for "slides" are unchanged.
- **No partner-logo-grid or brand-spec-panel slide types.** Two of the reference deck's
  nine slide types are specific to Reliance's own internal brand-guideline deck and
  don't generalize to an arbitrary generated presentation.
- **No hardcoded colors.** Cover/divider backgrounds use `<Surface mode="bold">`
  (the real `--Surface-Bold` token), never the reference deck's literal navy/gold hex
  values.
- **No new components.** The table slide type reuses the same
  `Container layout="grid"` + `Surface` "grid of cards" pattern `WebsitePreview.tsx`'s
  sections/news grids already use — there is no dedicated Table component in
  `@jds4/oneui-react`.
- **No changes to other categories, or to `App/src/data/previewDimensions.ts`.** The
  `slides` category keeps its single `16:9` canvas variant — slide *count* and canvas
  *dimension* are orthogonal; this spec only adds a slide-index navigator alongside the
  existing (untouched) dimension-variant picker.

## Design

### Schema (`App/src/ai/schema.ts`)

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

New `BuildPlan` field:
```ts
/** Slides: the full deck — each entry is one slide's content. The shared plan.heroImage (if any) is reused by any slide that wants an image; slides never author their own. */
slides?: SlideContent[];
```

`BuildPlan`'s existing top-level `headline`/`body`/`kicker`/`subheadline` are untouched
(still used by other categories, and still required generically by `PLAN_TOOL`) — for
a slides build, Claude uses the top-level `headline` as the overall deck title/topic
(shown in the request summary / Build details) and `slides[]` as the actual per-slide
content, independent of it.

### AI system prompt & tool schema (`App/aiServerPlugin.ts`, `App/src/ai/brandContext.ts`)

```ts
slides: {
  type: 'array',
  description:
    'Slides: the full deck. Look at the guided answers for a slide-count signal (e.g. a range like "3-5", "6-10", "10+") and author that many slide objects, picking one specific number within the indicated range (e.g. "3-5" → 4, "10+" → 10). Each slide picks its own slideType: "cover" for an opening title slide, "divider" for a section-break heading only, "content" for a standard headline+body slide, "split-photo" for headline+body beside the deck's shared photo, "table" for a structured comparison/principles table. Slides never author their own image — the single shared heroImage (imageSubject/imageAction/imageLocation/imageFraming) is reused by any content/split-photo slide that wants one.',
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
```

`brandContext.ts`'s `RELIANCE_REAL_CONTEXT` gets one more structural paragraph
covering the same guidance in prose form (count-from-answers, per-slide type choice,
shared image reuse) — consistent with how every other category's structural guidance
is already phrased there.

### Fallback content (`App/src/ai/fallbackPlan.ts`)

Always a fixed 3-slide deck, regardless of `answers`:

```ts
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
```

### Rendering (`App/src/components/previews/SlidePreview.tsx`, `App/src/components/BuildPreview.tsx`)

`SlidePreview` takes one slide's content plus the deck's shared image, not the whole
plan:

```tsx
export function SlidePreview({ slide, heroImage }: { slide: SlideContent; heroImage?: string }) {
  switch (slide.slideType) {
    case 'cover': return <CoverSlide slide={slide} />;
    case 'divider': return <DividerSlide slide={slide} />;
    case 'split-photo': return <SplitPhotoSlide slide={slide} heroImage={heroImage} />;
    case 'table': return <TableSlide slide={slide} />;
    case 'content':
    default: return <ContentSlide slide={slide} heroImage={heroImage} />;
  }
}
```

Per-type visual treatment (unchanged from the original draft, just parameterized on
`slide` instead of `plan`):
- **`CoverSlide`** — `<Surface mode="bold" appearance="primary">` filling the slide,
  a large `BrandMark` (the existing component, no new art) absolutely positioned off
  the right edge at low opacity as a decorative bleed, headline + subheadline styled
  `color: var(--Text-OnBold-High)` (same on-bold pattern `SocialPreview.tsx` already
  uses).
- **`DividerSlide`** — same bold `Surface`, no decorative mark, one large centered
  headline.
- **`ContentSlide`** — today's existing layout, essentially unchanged.
- **`SplitPhotoSlide`** — two-column flex: left column (kicker/headline/body), right
  column the shared `heroImage`, full height.
- **`TableSlide`** — headline, then a `Container layout="grid"` of column cards
  (`Surface mode="subtle"` + header `Text` + bullet list).

`BuildPreview.tsx` gains a `slideIndex` state (`useState(0)`), independent of
`PreviewFrame`'s existing `variantId`/dimension-picker state (untouched, still
category-agnostic). For the `slides` category:

```tsx
const slides = plan.slides?.length ? plan.slides : [{ slideType: 'content' as const, headline: plan.headline || 'Untitled slide' }];
const currentIndex = Math.min(Math.max(slideIndex, 0), slides.length - 1);
```

— defensively falls back to a single generic slide if `plan.slides` is ever empty
(mirrors the existing `navItems`/`sections`/`contentBlocks` defensive-default pattern
throughout the codebase), and clamps the index if the array is ever shorter than the
last-viewed position (e.g. after a refinement that changes deck length).

A small navigator row renders below `<PreviewFrame>`, only for the `slides` category
and only when there's more than one slide:
```tsx
{slides.length > 1 && (
  <Container variant="full-bleed" layout="flex" align="center" justify="center" gap="4">
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
```

### Testing

- `tests/unit/ai/fallbackPlan.test.ts`: assert the slides fallback always returns the
  fixed 3-slide array (cover/content/table), regardless of `answers`.
- New `tests/unit/components/SlidePreview.test.tsx`: one test per slide type, now
  passing a `slide: SlideContent` + optional `heroImage` directly (cover shows
  headline+subheadline on a bold surface, divider shows only the headline, content
  shows headline+body+image, split-photo shows headline+body beside the shared image,
  table shows column headers+items).
- New/extended `tests/unit/components/BuildPreview.test.tsx` (or inline in an existing
  suite if one already covers `BuildPreview`): confirm the navigator renders only when
  `slides.length > 1`, Previous/Next correctly move `slideIndex` and disable at the
  bounds, and the defensive single-slide fallback kicks in when `plan.slides` is empty.
- After implementation, visual end-to-end verification against the running dev server
  with Playwright: drive a real "slides" build, confirm multiple slides were generated,
  click Next/Previous through the whole deck, and screenshot at least two different
  slide types to confirm distinct layouts render — the same live-variance caveat as the
  website-sections and app-screens-blocks specs applies to which specific types Claude
  picks for a given run.
