# Reliance Builder: richer website build structure from real-site reference

## Problem

`App/src/components/previews/WebsitePreview.tsx` currently renders a single-page
structure: header/nav, hero (kicker/headline/subheadline/CTA), an optional hero image,
and one generic `sections` grid (up to 3 cards of title+body). Reference screenshots at
`Ref/website.png` (desktop) and `Ref/Mobile.png` (mobile) — full-page captures of the
real ril.com — show a noticeably richer real-world structure: hero, "Our Businesses"
grid, a founder/quote spotlight (Nita Ambani), a "News From Above" 3-up card grid, a
full-bleed repeated-tagline banner, a "Resource Hub" list, a "Get in Touch" contact
band, and a footer with link columns. Reliance Builder's generated "website" builds
currently can't produce anything past the hero + one generic grid, so they read much
thinner than a real Reliance page.

## Goal

Extend the website build path — schema, AI system prompt, fallback content, and
rendering — so a generated website build can include a quote/spotlight section, a
news/insights grid, and a closing contact band, plus a static footer, modeled on the
real site's structure. Scope is the "website" category only; other categories
(app-screens, slides, social-media, motion) are untouched.

## Non-goals

- **No "Resource Hub" section.** Decided during design discussion — out of scope for
  this pass.
- **No new "businesses" field.** The existing `sections?: { title: string; body: string
  }[]` field (`App/src/ai/schema.ts`) already renders exactly the kind of grid the
  reference's "Our Businesses" section shows (title + body cards, up to 3 columns).
  Adding a second, near-identical field would be duplicate schema for no benefit — the
  existing field just needs to keep being used the way it already is.
- **No extra AI-generated images.** The news grid cards and the contact band use
  solid/tinted color blocks, not their own Gemini-generated photos. Each additional
  generated image is a real extra network call in `App/src/ai/client.ts`'s
  `requestHeroImage`-style flow; multiplying that per news card would make builds
  noticeably slower and more expensive for a visual improvement that doesn't need a real
  photo. The single existing hero image is unaffected.
- **No footer schema fields.** The footer is a static structural addition to
  `WebsitePreview.tsx` (brand mark + the existing `navItems` reused as links + a plain
  copyright line) — not AI-authored content, so it needs no new `BuildPlan` fields and no
  `PLAN_TOOL` schema changes.
- **No changes to `App/src/data/componentRecommendations.ts`.** The components needed
  for the new sections (`Container`, `Surface`, `Text`) are already in
  `BASE_RECOMMENDATIONS.website` and already imported in `WebsitePreview.tsx`.

## Design

### Schema (`App/src/ai/schema.ts`)

Extend the existing flat `BuildPlan` interface the same way it already carries other
category-specific optional fields (`screenTitle`, `socialFormat`, `motionConcept`,
etc.) — one shared interface, new fields simply unused outside the website category.
This matches the codebase's established pattern rather than introducing a per-category
discriminated union, which would be a much larger refactor for no functional gain here.

```ts
quote?: { text: string; name: string; title: string };  // founder/customer spotlight
newsItems?: { title: string; date: string }[];           // news/insights 3-up grid
contactHeadline?: string;                                // closing "Get in touch"-style band
```

### AI system prompt & tool schema (`App/aiServerPlugin.ts`, `App/src/ai/brandContext.ts`)

- `PLAN_TOOL.input_schema.properties` gains `quote`, `newsItems`, and `contactHeadline`,
  each documented as "Website: ..." — matching how existing category-specific fields are
  already described in that same flat tool schema.
- `brandContext.ts` (which already holds `RELIANCE_REAL_CONTEXT`, the ril.com factual
  grounding added previously) gains a short structural note: for a website build, the
  general real-site section order is hero → a few business/feature highlights (the
  existing `sections` field) → optionally a quote/spotlight from a named person →
  optionally 2-3 short news/update items → a closing contact line. Framed as guidance,
  not a hard requirement — a single landing page build should be free to skip the news
  grid, for example.

### Fallback content (`App/src/ai/fallbackPlan.ts`)

`fallbackPlan()`'s `base` object gains the three new fields, filled in unconditionally
like every other field there, with generic (non-Reliance-specific) placeholder content —
consistent with the fallback path's existing honesty: it never pretends to be
AI-authored.

```ts
quote: { text: 'A short quote goes here.', name: 'Name', title: 'Title' },
newsItems: [
  { title: 'Update headline', date: 'Date' },
  { title: 'Update headline', date: 'Date' },
  { title: 'Update headline', date: 'Date' },
],
contactHeadline: 'Get in touch.',
```

### Rendering (`App/src/components/previews/WebsitePreview.tsx`)

Three new optionally-rendered sections plus a static footer, each following the file's
existing pattern (`{plan.field && (...)}` guards, `Container`/`Surface`/`Text` from
`@jds4/oneui-react`, real design tokens via CSS custom properties — never hardcoded
colors):

- **Quote/spotlight** — `Surface mode="moderate"` block with a large `Text` for the
  quote and smaller `Text` lines for name/title.
- **News/insights grid** — same `Container layout="grid"` pattern already used for
  `sections`, up to 3 columns; each card is a `Surface` with a plain
  `aspectRatio`-boxed color block standing in for a photo, plus date + title `Text`.
- **Contact band** — full-bleed `Surface mode="moderate"`, centered, with just a large
  `Text` headline — no button, matching the reference's plain "Get in Touch." close.
- **Footer** (always rendered, not plan-driven) — `BrandMark` + the existing `navItems`
  reused as a link row + a plain `Text` copyright line, separated from the page above by
  a top border.

### Testing

- `tests/unit/ai/fallbackPlan.test.ts`: assert `quote`, `newsItems`, and
  `contactHeadline` are present in the website fallback plan.
- New `tests/unit/components/WebsitePreview.test.tsx`: render with a plan that
  populates all three new fields (asserts each section appears) and a plan that omits
  them (asserts each section is absent) — mirroring the optional-render pattern already
  covered implicitly by the existing `sections`/`heroImage` handling.
- After implementation, visual end-to-end verification against the running dev server
  with Playwright (same approach used for the earlier preview-width fix): drive a real
  "website" build through the guided flow and screenshot the result to confirm the new
  sections render correctly together, not just in isolated unit tests.
