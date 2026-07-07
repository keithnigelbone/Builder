# Reliance Builder: richer app-screens content blocks and dynamic nav

## Problem

`App/src/components/previews/AppScreenPreview.tsx` currently renders every content
block identically: a plain grey rectangle (`background: var(--Surface-Subtle)`)
containing one line of body text, driven by `BuildPlan.contentBlocks?: string[]` —
just a list of labels with no structure or variety. The bottom nav is worse: it's three
hardcoded `BottomNavItem`s (Home/Search/Settings), completely ignoring the plan, so
every generated app screen ends with the same three nav items regardless of what the
app actually is. Compared to `WebsitePreview.tsx` (hero, sections grid, and — per the
sibling spec — quote/news/contact/footer), the app-screens preview reads as flat and
repetitive by comparison.

## Goal

Give app-screens builds the same kind of AI-authored variety `WebsitePreview.tsx` has:
typed content blocks (list item, stat/highlight, image card, action button) instead of
uniform grey rows, and a dynamic bottom nav (labels + icons) reflecting the actual app
being built instead of a hardcoded Home/Search/Settings default.

## Non-goals

- **No per-block AI-generated images.** Decided during design discussion: an
  `image-card` block reuses the single existing hero image
  (`plan.heroImage`/`imageSubject`/etc.) rather than authoring its own
  imageSubject/imageAction/imageLocation/imageFraming quad. Giving every image-card its
  own distinct generated photo would multiply Gemini calls per screen and require a
  much larger expansion of the image-prompt schema in `App/src/ai/client.ts`'s
  `requestHeroImage` flow — out of scope here.
- **No changes to other categories.** Website, slides, social-media, and motion are
  untouched.
- **No free-form icon strings.** `contentBlocks[].icon` (for `list-item`) and
  `screenNavItems[].icon` both come from one fixed, validated enum of real semantic
  icon names — never an arbitrary string Claude might invent, matching the existing
  validated-enum pattern already used for `socialFormat`/`motionConcept` in
  `PLAN_TOOL`.
- **No `componentRecommendations.ts` changes.** `Icon` and `Button` are already
  available in the registry; no new components are introduced.

## Design

### Schema (`App/src/ai/schema.ts`)

Replace `contentBlocks?: string[]` with a typed discriminated union — safe to change
its type outright since this field is app-screens-only and nothing else reads it as a
plain string array:

```ts
export type AppScreenBlock =
  | { type: 'list-item'; icon?: string; title: string; subtitle?: string }
  | { type: 'stat'; value: string; label: string }
  | { type: 'image-card'; caption: string }
  | { type: 'action'; label: string };
```

`contentBlocks?: AppScreenBlock[]` (same field name, new type).

New field for the dynamic bottom nav — can't reuse `navItems: string[]` (website's
plain link-label shape is a different structure):

```ts
screenNavItems?: { label: string; icon: string }[];
```

`icon` is typed as a plain `string` here, not a strict union — `BuildPlan` is shared
across every category and the enum constraint belongs in `PLAN_TOOL`'s JSON schema
(where `socialFormat`/`motionConcept` are already constrained the same way), not
duplicated into the shared TypeScript interface.

### AI system prompt & tool schema (`App/aiServerPlugin.ts`, `App/src/ai/brandContext.ts`)

A shared icon enum, validated against real `SemanticIconName` values the design system
actually resolves (confirmed against
`node_modules/@jds4/oneui-react/dist/packages/shared/src/types/icons.d.ts`):

```ts
const NAV_ICON_ENUM = ['home', 'search', 'settings', 'user', 'notification', 'chat', 'calendar', 'heart', 'list', 'grid'];
```

`PLAN_TOOL.input_schema.properties.contentBlocks` becomes one flat object schema
covering all four block types at once — matching the tool's existing style of one flat
schema with per-field/per-type descriptions (e.g. "list-item only", "stat/action") —
with an explicit note that `image-card` reuses the existing hero image rather than
authoring a new one. `screenNavItems` is added alongside it, reusing `NAV_ICON_ENUM`
for its own `icon` property.

`brandContext.ts`'s `RELIANCE_REAL_CONTEXT` gets one more structural paragraph (after
the website one added in the sibling spec): for an app-screen build, top bar → optional
hero image → 2-5 mixed content blocks (list-item/stat/image-card/action, whichever fit
the screen's real purpose) → a bottom nav reflecting the actual app, not a generic
default. Guidance, not a hard requirement.

### Fallback content (`App/src/ai/fallbackPlan.ts`)

One of each block type, plus the same Home/Search/Settings nav the hardcoded default
already showed — so the no-AI fallback path looks the same as it does today, just
sourced from the new dynamic field instead of literal JSX:

```ts
contentBlocks: [
  { type: 'list-item', icon: 'list', title: 'List item', subtitle: 'Supporting detail' },
  { type: 'stat', value: '12', label: 'Stat label' },
  { type: 'image-card', caption: 'Image caption' },
  { type: 'action', label: 'Action' },
],
screenNavItems: [
  { label: 'Home', icon: 'home' },
  { label: 'Search', icon: 'search' },
  { label: 'Settings', icon: 'settings' },
],
```

### Rendering (`App/src/components/previews/AppScreenPreview.tsx`)

A small internal `ContentBlock` switch-renderer replaces the single generic-row
mapping:

- **`list-item`** — optional `Icon` + `Text` title + optional `Text` subtitle, inside
  the same tinted row container the old generic block used.
- **`stat`** — a tinted `Container` with a large `Text variant="display"` value and a
  `Text variant="label"` caption below it.
- **`image-card`** — reuses `plan.heroImage` (via the same `describeHeroImage(plan)`
  alt text already used for the hero image above it) + a `Text` caption.
- **`action`** — a full-width `Button`.

Local typed defaults (`DEFAULT_BLOCKS`, `DEFAULT_NAV_ITEMS`) replace the old
`['Content block', 'Content block']` string default and the hardcoded
`BottomNavItem`s respectively, used only when the plan has neither field (matching
today's fallback-of-a-fallback behavior for a bare/minimal plan). The bottom nav maps
over `plan.screenNavItems` (or the default) instead of three literal `BottomNavItem`s.

### Testing

- `tests/unit/ai/fallbackPlan.test.ts`: assert the app-screens fallback includes all
  four block types and the default `screenNavItems`.
- New `tests/unit/components/AppScreenPreview.test.tsx`: one test per block type
  (list-item with/without icon+subtitle, stat shows value+label, image-card reuses
  `plan.heroImage`, action renders a button with its label), a test for dynamic
  `screenNavItems` rendering custom labels, and a test confirming the old defaults (2
  generic list-items, Home/Search/Settings) still apply when the plan has neither
  field.
- After implementation, visual end-to-end verification against the running dev server
  with Playwright (same approach used for the website-sections and preview-fit fixes):
  drive a real "app-screens" build through the guided flow and screenshot the result to
  confirm all four block types and the dynamic nav render correctly together.
