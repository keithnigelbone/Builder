# Reliance Builder: slide-type variety and visual polish for the slides builder

## Problem

`App/src/components/previews/SlidePreview.tsx` renders every generated "slides" build
through one fixed layout: a top row (kicker badge + brand mark), a headline, an
optional body line, and an optional image stacked below. Reference screenshots at
`Deck Ref/*.png` — 9 slides from a real Reliance corporate deck — show genuine
slide-type variety (a dark navy cover/title slide with a large serif headline and a
translucent decorative logo mark bleeding off the edge, full-color section-divider
slides, split content+photo layouts, a structured 7-column principles table, a
partner-logo grid, and brand-spec panels) plus a distinct, considered visual language.
Every build today produces the same single slide shape regardless of what's actually
being said.

## Goal

Let a generated slide use one of five distinct layouts — cover, divider, content
(today's existing layout, restyled), split-photo, and table — chosen by Claude to fit
the request, with the cover/divider types using a real bold-brand-color background and
a decorative `BrandMark` bleed, matching the reference deck's polish without hardcoding
any of its specific hex values.

## Non-goals

- **No multi-slide deck/carousel.** Each "slides" build still produces exactly one
  slide's content, same as today — this spec only adds layout variety to that one
  slide, not a slide-sequence/navigation feature. `App/src/data/previewDimensions.ts`'s
  `slides` category keeps its single `16:9` variant.
- **No partner-logo-grid or brand-spec-panel slide types.** Two of the reference deck's
  nine slide types are specific to Reliance's own internal brand-guideline deck (a grid
  of partner company logos; an annotated logo/color-spec panel) and don't generalize to
  an arbitrary generated presentation — decided during design discussion.
- **No hardcoded colors.** The cover/divider backgrounds use `<Surface mode="bold">`
  (resolving to the real `--Surface-Bold` token), never the reference deck's literal
  navy/gold hex values — consistent with every other preview component in this
  codebase.
- **No new components.** The table slide type is built from the same
  `Container layout="grid"` + `Surface` "grid of cards" pattern `WebsitePreview.tsx`'s
  sections/news grids already use — there is no dedicated Table component in
  `@jds4/oneui-react` to reach for instead.
- **No changes to other categories.** Website, app-screens, social-media, and motion
  are untouched.

## Design

### Schema (`App/src/ai/schema.ts`)

One new enum field for which layout to use, and one field only the table type needs.
Every other field (`headline`, `subheadline`, `body`, `kicker`, `heroImage`) already
exists on `BuildPlan` and is reused per type rather than duplicated:

```ts
export type SlideType = 'cover' | 'divider' | 'content' | 'split-photo' | 'table';

slideType?: SlideType;
/** Slides: table type only — columns of short bullet points (e.g. principles, comparison criteria). */
tableColumns?: { header: string; items: string[] }[];
```

Field reuse per type:
- **cover** — `headline` + `subheadline` (no body), full bold-brand background.
- **divider** — `headline` only, full bold-brand background, centered.
- **content** (today's existing layout) — `headline` + `body` + optional `heroImage`
  below.
- **split-photo** — `headline` + `body` beside a full-bleed `heroImage` (not stacked
  below it).
- **table** — `headline` as the slide title + `tableColumns`.

### AI system prompt & tool schema (`App/aiServerPlugin.ts`, `App/src/ai/brandContext.ts`)

```ts
slideType: {
  type: 'string',
  enum: ['cover', 'divider', 'content', 'split-photo', 'table'],
  description:
    'Slides: which slide layout to use. "cover" for an opening title slide, "divider" for a section-break heading only, "content" for a standard headline+body(+image) slide, "split-photo" for headline+body beside a full photo, "table" for a structured comparison/principles table.',
},
tableColumns: {
  type: 'array',
  description: 'Slides: table type only — 2-5 columns, each a header + 2-5 short bullet items.',
  items: {
    type: 'object',
    properties: {
      header: { type: 'string' },
      items: { type: 'array', items: { type: 'string' } },
    },
    required: ['header', 'items'],
  },
},
```

`brandContext.ts`'s `RELIANCE_REAL_CONTEXT` gets one more structural paragraph: for a
slides build, pick `slideType` to fit the request — cover for an opening slide,
divider for a section break, content for a standard point, split-photo when a photo
genuinely adds to the point, table for comparing several items side by side.

### Fallback content (`App/src/ai/fallbackPlan.ts`)

`slideType: 'content'` so the offline fallback path renders exactly as it does today,
unaffected by this change, plus generic placeholder table columns for completeness:

```ts
slideType: 'content',
tableColumns: [
  { header: 'Column one', items: ['Point one', 'Point two'] },
  { header: 'Column two', items: ['Point one', 'Point two'] },
],
```

### Rendering (`App/src/components/previews/SlidePreview.tsx`)

Restructured into one small sub-renderer per `slideType`, dispatched by a switch
(`content` is the default/fallback case, matching today's behavior when `slideType` is
absent):

- **`CoverSlide`** — `<Surface mode="bold" appearance="primary">` filling the slide,
  with a large `BrandMark` (the existing component, not new art) absolutely positioned
  off the right edge at low opacity as a decorative bleed. Headline + subheadline in
  `Text` styled `color: var(--Text-OnBold-High)` — the same on-bold text pattern
  `SocialPreview.tsx` already uses.
- **`DividerSlide`** — same bold `Surface`, no decorative mark, one large centered
  headline.
- **`ContentSlide`** — today's existing layout, essentially unchanged.
- **`SplitPhotoSlide`** — two-column flex: left column (kicker/headline/body), right
  column a full-height `Image`.
- **`TableSlide`** — headline, then a `Container layout="grid"` of column cards
  (`Surface mode="subtle"` + header `Text` + bullet list) — the same grid-of-cards
  pattern already used elsewhere in the codebase.

```tsx
export function SlidePreview({ plan }: { plan: BuildPlan }) {
  switch (plan.slideType) {
    case 'cover': return <CoverSlide plan={plan} />;
    case 'divider': return <DividerSlide plan={plan} />;
    case 'split-photo': return <SplitPhotoSlide plan={plan} />;
    case 'table': return <TableSlide plan={plan} />;
    case 'content':
    default: return <ContentSlide plan={plan} />;
  }
}
```

### Testing

- `tests/unit/ai/fallbackPlan.test.ts`: assert the slides fallback includes
  `slideType: 'content'` and generic `tableColumns`.
- New `tests/unit/components/SlidePreview.test.tsx`: one test per slide type (cover
  shows headline+subheadline on a bold surface, divider shows only the headline,
  content shows headline+body+image as today, split-photo shows headline+body beside
  the image, table shows column headers+items), plus a test confirming no `slideType`
  at all falls back to the content layout.
- After implementation, visual end-to-end verification against the running dev server
  with Playwright: drive a real "slides" build and screenshot the result. Since each
  build only produces one slide and Claude picks the type per-request, this confirms
  the mechanism works for whichever type comes back rather than guaranteeing all five
  appear in one run — the same live-variance caveat already noted in the
  website-sections and app-screens-blocks specs.
