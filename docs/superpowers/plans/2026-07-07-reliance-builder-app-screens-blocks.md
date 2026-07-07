# Reliance Builder: richer app-screens content blocks and dynamic nav — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `AppScreenPreview.tsx`'s uniform grey content rows and hardcoded Home/Search/Settings bottom nav with four typed, AI-authored content block types (list item, stat, image card, action) and a dynamic nav.

**Architecture:** A new `AppScreenBlock` discriminated union replaces `BuildPlan.contentBlocks`'s type (`string[]` → `AppScreenBlock[]`), plus a new `screenNavItems` field — threaded through the Claude tool schema (with a shared validated icon enum), the offline fallback generator, and a small `ContentBlock` switch-renderer in `AppScreenPreview.tsx`.

**Tech Stack:** TypeScript, React 18, `@jds4/oneui-react`, Vitest + Testing Library.

## Global Constraints

- Scope is the "app-screens" category only — other categories are untouched.
- **Dependency: this plan assumes `docs/superpowers/plans/2026-07-07-reliance-builder-website-sections.md` has already been executed.** That plan exports `PLAN_TOOL` from `App/aiServerPlugin.ts` and appends a website-structure paragraph to `RELIANCE_REAL_CONTEXT` in `App/src/ai/brandContext.ts` — Task 2 below builds on both. If executing this plan first instead, `export` isn't yet on `PLAN_TOOL` (add it as part of Task 2 Step 3) and `RELIANCE_REAL_CONTEXT`'s current last paragraph is "Real site sections a Reliance-branded page..." (adjust the insertion anchor in Task 2 Step 5 to match whatever is actually the file's current last paragraph before its closing `` `.trim();` ``).
- No per-block AI-generated images — `image-card` blocks reuse the single existing `plan.heroImage`, never a new Gemini call.
- No free-form icon strings — `contentBlocks[].icon` and `screenNavItems[].icon` both come from one fixed, validated enum (`NAV_ICON_ENUM`) of real semantic icon names.
- No changes to `App/src/data/componentRecommendations.ts`.
- Never hardcode colors — all new styling uses CSS custom properties (design tokens), matching the rest of the file.

---

### Task 1: Extend `BuildPlan` schema and fallback content

**Files:**
- Modify: `App/src/ai/schema.ts:35` (change `contentBlocks` type, add `screenNavItems`)
- Modify: `App/src/ai/fallbackPlan.ts:63-64` (replace `contentBlocks` value, add `screenNavItems`)
- Test: `tests/unit/ai/fallbackPlan.test.ts`

**Interfaces:**
- Produces: `AppScreenBlock` union type, `BuildPlan.contentBlocks?: AppScreenBlock[]` (type changed from `string[]`), `BuildPlan.screenNavItems?: { label: string; icon: string }[]` — consumed by Task 2 (tool schema) and Task 3 (rendering).

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('fallbackPlan', ...)` block in `tests/unit/ai/fallbackPlan.test.ts` (after the last existing test, still inside the same `describe`):

```ts
  it('includes typed content blocks and dynamic nav items for app-screens', () => {
    const result = fallbackPlan({ category: 'app-screens', prompt: '', answers: {} }, 'x');

    expect(result.data.contentBlocks).toEqual([
      { type: 'list-item', icon: 'list', title: 'List item', subtitle: 'Supporting detail' },
      { type: 'stat', value: '12', label: 'Stat label' },
      { type: 'image-card', caption: 'Image caption' },
      { type: 'action', label: 'Action' },
    ]);
    expect(result.data.screenNavItems).toEqual([
      { label: 'Home', icon: 'home' },
      { label: 'Search', icon: 'search' },
      { label: 'Settings', icon: 'settings' },
    ]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: FAIL — `result.data.contentBlocks` is still `['Content block', 'Content block']` (a string array) and `result.data.screenNavItems` is `undefined`.

- [ ] **Step 3: Add `AppScreenBlock` and update `BuildPlan` in `schema.ts`**

In `App/src/ai/schema.ts`, the `BuildPlan` interface currently reads (around line 26-57):

```ts
export interface BuildPlan {
  headline?: string;
  subheadline?: string;
  body?: string;
  kicker?: string;
  ctaLabel?: string;
  navItems?: string[];
  sections?: { title: string; body: string }[];
  screenTitle?: string;
  contentBlocks?: string[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
  ...
```

Add the new `AppScreenBlock` type directly above the `BuildPlan` interface, and change `contentBlocks`'s type, adding `screenNavItems` right after it:

```ts
export type AppScreenBlock =
  | { type: 'list-item'; icon?: string; title: string; subtitle?: string }
  | { type: 'stat'; value: string; label: string }
  | { type: 'image-card'; caption: string }
  | { type: 'action'; label: string };

export interface BuildPlan {
  headline?: string;
  subheadline?: string;
  body?: string;
  kicker?: string;
  ctaLabel?: string;
  navItems?: string[];
  sections?: { title: string; body: string }[];
  screenTitle?: string;
  /** App screens: typed content blocks below the hero image. */
  contentBlocks?: AppScreenBlock[];
  /** App screens: dynamic bottom nav items, replacing the generic Home/Search/Settings default. */
  screenNavItems?: { label: string; icon: string }[];
  socialFormat?: 'square' | 'story' | 'linkedin' | 'carousel';
  ...
```

(Leave every other field exactly as-is — only changing `contentBlocks`'s type and inserting `screenNavItems` and the new `AppScreenBlock` export.)

- [ ] **Step 4: Update `fallbackPlan`'s output**

In `App/src/ai/fallbackPlan.ts`, the `base` object currently reads (around line 55-72):

```ts
    navItems: ['Product', 'Pricing'],
    sections: [],
    screenTitle: 'Home',
    contentBlocks: ['Content block', 'Content block'],
    socialFormat: 'square',
```

Change to:

```ts
    navItems: ['Product', 'Pricing'],
    sections: [],
    screenTitle: 'Home',
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
    socialFormat: 'square',
```

(Leave every other field exactly as-is.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass, zero typecheck errors. (`AppScreenPreview.tsx` still expects `contentBlocks` to be a string array at this point — it isn't updated until Task 3 — so this step is expected to show a new typecheck error there. If it does, that's fine: proceed to Task 3, which fixes it. If `tsc` reports no errors at all, that's also fine — proceed.)

- [ ] **Step 7: Commit**

```bash
git add App/src/ai/schema.ts App/src/ai/fallbackPlan.ts tests/unit/ai/fallbackPlan.test.ts
git commit -m "Add typed AppScreenBlock content blocks and screenNavItems to BuildPlan"
```

---

### Task 2: Wire the new fields into the Claude tool schema and system prompt

**Files:**
- Modify: `App/aiServerPlugin.ts:94-152` (`PLAN_TOOL` — add `NAV_ICON_ENUM`, replace `contentBlocks` property, add `screenNavItems`)
- Modify: `App/src/ai/brandContext.ts` (`RELIANCE_REAL_CONTEXT` — append an app-screens structural-ordering paragraph)
- Test: `tests/unit/aiServerPlugin.test.ts` (extend the existing file from the website-sections plan)

**Interfaces:**
- Consumes: `BuildPlan.contentBlocks` (now `AppScreenBlock[]`), `BuildPlan.screenNavItems` from Task 1.
- Produces: `PLAN_TOOL.input_schema.properties.contentBlocks` (object-array schema) and `.screenNavItems` — no other task depends on this directly, but it's what makes Claude actually author these fields at runtime.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/unit/aiServerPlugin.test.ts` (append a new `describe` block after the existing one, in the same file):

```ts
describe('PLAN_TOOL schema — app screens', () => {
  it('includes typed contentBlocks and screenNavItems with a validated icon enum', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.contentBlocks.type).toBe('array');
    expect(props.contentBlocks.items.properties.type.enum).toEqual(['list-item', 'stat', 'image-card', 'action']);
    expect(props.contentBlocks.items.properties.icon.enum).toContain('home');

    expect(props.screenNavItems).toBeDefined();
    expect(props.screenNavItems.type).toBe('array');
    expect(props.screenNavItems.items.properties.icon.enum).toContain('home');
    expect(props.screenNavItems.items.required).toEqual(['label', 'icon']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: FAIL — `props.contentBlocks.items.properties.type` is `undefined` (the current schema's `contentBlocks.items` is `{ type: 'string' }`, not an object with a `type`/`icon` property), and `props.screenNavItems` is `undefined`.

- [ ] **Step 3: Add `NAV_ICON_ENUM` and update `PLAN_TOOL`**

In `App/aiServerPlugin.ts`, directly above the `PLAN_TOOL` declaration (currently starting at line 94 with `export const PLAN_TOOL = {` — if it still reads `const PLAN_TOOL = {` instead, add `export` per the Global Constraints dependency note), add:

```ts
const NAV_ICON_ENUM = ['home', 'search', 'settings', 'user', 'notification', 'chat', 'calendar', 'heart', 'list', 'grid'];

export const PLAN_TOOL = {
```

Then, inside `input_schema.properties`, find the existing `contentBlocks` property:

```ts
      contentBlocks: {
        type: 'array',
        description: 'App screens: short labels for the content blocks on the screen.',
        items: { type: 'string' },
      },
```

Replace it with, and add `screenNavItems` directly after it:

```ts
      contentBlocks: {
        type: 'array',
        description:
          'App screens: 2-5 content blocks below the hero image, mixing the types below. image-card blocks reuse the single generated hero image (imageSubject/imageAction/imageLocation/imageFraming) — never author a separate image per block.',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['list-item', 'stat', 'image-card', 'action'] },
            icon: { type: 'string', enum: NAV_ICON_ENUM, description: 'list-item only, optional leading icon.' },
            title: { type: 'string', description: 'list-item only.' },
            subtitle: { type: 'string', description: 'list-item only, optional.' },
            value: { type: 'string', description: 'stat only: the large number/value shown, e.g. "12" or "₹2,400".' },
            label: { type: 'string', description: 'stat only (caption) or action only (button label).' },
            caption: { type: 'string', description: 'image-card only: caption shown under the reused hero image.' },
          },
          required: ['type'],
        },
      },
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
```

(Only `contentBlocks` and the new `screenNavItems` change — leave `socialFormat` and every other property as-is; it's shown in the "before" snippet above only for context on where `contentBlocks` used to sit relative to it, and doesn't need to move.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: PASS.

- [ ] **Step 5: Add structural guidance to the system prompt**

In `App/src/ai/brandContext.ts`, find the file's last line: `` `.trim(); ``. Insert a new paragraph immediately before it (after whatever the current last paragraph is — per the Global Constraints dependency note, this should be the website-structure paragraph the sibling plan added):

```ts
Structure an app-screen build the same way: top bar, then an optional hero image, then
2-5 content blocks mixing list-item/stat/image-card/action — whichever fit the screen's
real purpose — then a bottom nav that reflects the actual app being built, not a
generic Home/Search/Settings default.
`.trim();
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass. `AppScreenPreview.tsx` still hasn't been updated (Task 3), so a typecheck error there is still expected/fine at this point if one appeared after Task 1.

- [ ] **Step 7: Commit**

```bash
git add App/aiServerPlugin.ts App/src/ai/brandContext.ts tests/unit/aiServerPlugin.test.ts
git commit -m "Wire typed contentBlocks and screenNavItems into the Claude plan tool schema"
```

---

### Task 3: Render the four block types and dynamic nav in `AppScreenPreview.tsx`

**Files:**
- Modify: `App/src/components/previews/AppScreenPreview.tsx`
- Test: `tests/unit/components/AppScreenPreview.test.tsx` (new file)

**Interfaces:**
- Consumes: `BuildPlan.contentBlocks` (`AppScreenBlock[]`), `BuildPlan.screenNavItems`, `BuildPlan.heroImage`, `BuildPlan.screenTitle` (all from Task 1/existing schema).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/AppScreenPreview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppScreenPreview } from '../../../App/src/components/previews/AppScreenPreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  screenTitle: 'Test Screen',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('AppScreenPreview', () => {
  it('renders a list-item block with icon, title, and subtitle', () => {
    render(
      <AppScreenPreview
        plan={{ ...basePlan, contentBlocks: [{ type: 'list-item', icon: 'home', title: 'Item title', subtitle: 'Item subtitle' }] }}
      />,
    );

    expect(screen.getByText('Item title')).toBeInTheDocument();
    expect(screen.getByText('Item subtitle')).toBeInTheDocument();
  });

  it('renders a list-item block without a subtitle when none is given', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'list-item', title: 'Item title' }] }} />);

    expect(screen.getByText('Item title')).toBeInTheDocument();
  });

  it('renders a stat block with its value and label', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'stat', value: '42', label: 'Stat label' }] }} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Stat label')).toBeInTheDocument();
  });

  it('renders an image-card block reusing the plan hero image, with its caption', () => {
    render(
      <AppScreenPreview
        plan={{
          ...basePlan,
          heroImage: 'data:image/svg+xml,%3Csvg%3E%3C/svg%3E',
          contentBlocks: [{ type: 'image-card', caption: 'Card caption' }],
        }}
      />,
    );

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('Card caption')).toBeInTheDocument();
  });

  it('renders an action block as a button with its label', () => {
    render(<AppScreenPreview plan={{ ...basePlan, contentBlocks: [{ type: 'action', label: 'Do the thing' }] }} />);

    expect(screen.getByRole('button', { name: 'Do the thing' })).toBeInTheDocument();
  });

  it('renders custom bottom nav items when screenNavItems is given', () => {
    render(
      <AppScreenPreview
        plan={{ ...basePlan, screenNavItems: [{ label: 'Orders', icon: 'list' }, { label: 'Profile', icon: 'user' }] }}
      />,
    );

    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('falls back to two generic list-items and Home/Search/Settings nav when the plan has neither field', () => {
    render(<AppScreenPreview plan={basePlan} />);

    expect(screen.getAllByText('Content block')).toHaveLength(2);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/AppScreenPreview.test.tsx`
Expected: FAIL on every test except possibly the last (fallback) one — `contentBlocks`/`screenNavItems`-driven rendering doesn't exist in `AppScreenPreview.tsx` yet.

- [ ] **Step 3: Implement the typed block renderer and dynamic nav**

Replace the entire contents of `App/src/components/previews/AppScreenPreview.tsx` with:

```tsx
import { Container, Text, Avatar, BottomNavigation, BottomNavItem, Image, Icon, Button } from '@jds4/oneui-react';
import type { AppScreenBlock, BuildPlan } from '../../ai/schema';
import { describeHeroImage } from '../../ai/schema';

const DEFAULT_BLOCKS: AppScreenBlock[] = [
  { type: 'list-item', title: 'Content block' },
  { type: 'list-item', title: 'Content block' },
];

const DEFAULT_NAV_ITEMS = [
  { label: 'Home', icon: 'home' },
  { label: 'Search', icon: 'search' },
  { label: 'Settings', icon: 'settings' },
];

function ContentBlock({ block, heroImage, heroAlt }: { block: AppScreenBlock; heroImage?: string; heroAlt: string }) {
  switch (block.type) {
    case 'list-item':
      return (
        <Container
          variant="full-bleed"
          layout="flex"
          align="center"
          gap="3"
          padding="3"
          style={{ minHeight: 64, background: 'var(--Surface-Subtle)', borderRadius: 'var(--Shape-2)' }}
        >
          {block.icon && <Icon icon={block.icon} size="5" />}
          <Container variant="full-bleed" layout="flex" direction="column" gap="0" width="full">
            <Text variant="body" size="M">
              {block.title}
            </Text>
            {block.subtitle && (
              <Text variant="label" size="S" appearance="neutral">
                {block.subtitle}
              </Text>
            )}
          </Container>
        </Container>
      );
    case 'stat':
      return (
        <Container
          variant="full-bleed"
          layout="flex"
          direction="column"
          gap="1"
          padding="4"
          style={{ background: 'var(--Surface-Subtle)', borderRadius: 'var(--Shape-2)' }}
        >
          <Text variant="display" size="S">
            {block.value}
          </Text>
          <Text variant="label" size="S" appearance="neutral">
            {block.label}
          </Text>
        </Container>
      );
    case 'image-card':
      return (
        <Container variant="full-bleed" layout="flex" direction="column" gap="2" width="full">
          {heroImage && <Image src={heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
          <Text variant="label" size="S" appearance="neutral">
            {block.caption}
          </Text>
        </Container>
      );
    case 'action':
      return (
        <Button attention="medium" size="m" fullWidth>
          {block.label}
        </Button>
      );
  }
}

export function AppScreenPreview({ plan }: { plan: BuildPlan }) {
  const blocks = plan.contentBlocks?.length ? plan.contentBlocks : DEFAULT_BLOCKS;
  const navItems = plan.screenNavItems?.length ? plan.screenNavItems : DEFAULT_NAV_ITEMS;
  const heroAlt = describeHeroImage(plan);

  return (
    <Container variant="full-bleed" layout="flex" direction="column" width="full" style={{ height: '100%' }}>
      <Container variant="full-bleed" layout="flex" align="center" gap="2" padding="4">
        <Avatar size="s" content="text" alt="User" />
        <Text variant="label" size="M" weight="high">
          {plan.screenTitle || 'Home'}
        </Text>
      </Container>

      <Container variant="full-bleed" layout="flex" direction="column" gap="3" padding="4" grow={1} width="full">
        {plan.heroImage && <Image src={plan.heroImage} alt={heroAlt} aspectRatio="16:9" width="full" />}
        {blocks.map((block, i) => (
          <ContentBlock key={i} block={block} heroImage={plan.heroImage} heroAlt={heroAlt} />
        ))}
      </Container>

      <BottomNavigation aria-label="Preview navigation" defaultValue={navItems[0]?.label.toLowerCase()}>
        {navItems.map((item) => (
          <BottomNavItem key={item.label} icon={item.icon} label={item.label} value={item.label.toLowerCase()} />
        ))}
      </BottomNavigation>
    </Container>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/AppScreenPreview.test.tsx`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json && npx tsc --noEmit -p tsconfig.json`
Expected: all tests pass, zero typecheck errors in both tsconfigs.

- [ ] **Step 6: Commit**

```bash
git add App/src/components/previews/AppScreenPreview.tsx tests/unit/components/AppScreenPreview.test.tsx
git commit -m "Render typed content blocks and dynamic nav in AppScreenPreview"
```

---

### Task 4: Visual end-to-end verification

**Files:** None modified — this task only verifies Tasks 1-3 together in the real running app.

**Interfaces:** None (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run app:dev` (in the background; Vite may fall back to a port other than 5173 if something else is already using it — check the printed URL). Poll `curl -sf http://localhost:<port>` until it responds (up to ~30s).

- [ ] **Step 2: Drive a real app-screens build through the guided flow**

Using Playwright (same approach used for the earlier preview fixes — `npm install --no-save playwright` in a scratch directory if not already available), or manually in a browser:

1. Navigate to the dev server URL.
2. Click the "App screens" quick-action chip.
3. Answer both guided questions (click the first available option either way — if `ANTHROPIC_API_KEY` is configured, the exact wording varies per run).
4. Wait for "Designing your preview…" to resolve to the result screen.

- [ ] **Step 3: Confirm the new blocks and nav render**

Take a full-page screenshot of the result screen. Confirm:
- Content blocks show visibly different treatments (not uniform grey rows) — at minimum a stat-style block with a large value, and a list-item row.
- If an image-card block is present, it shows the same hero image used elsewhere on the screen (not a broken image).
- The bottom nav shows labels that make sense for the specific app described in the request summary, not always literally "Home/Search/Settings" (unless the fallback path is active, e.g. no `ANTHROPIC_API_KEY` set, in which case Home/Search/Settings is the correct, expected result).
- No console errors (check via the browser's dev tools or Playwright's `page.on('console', ...)`).

- [ ] **Step 4: Stop the dev server**

Run: `kill %1` or `pkill -f "vite --config App/vite.config.ts"` (whichever matches how it was started in Step 1).

- [ ] **Step 5: Report results**

No commit for this task (verification only) — summarize what was confirmed (or any issue found, in which case return to the relevant task above, fix, and re-verify) to the user.

---

## Self-Review Notes

- **Spec coverage:** `AppScreenBlock` schema (Task 1) ✓, `screenNavItems` field (Task 1) ✓, fallback content (Task 1) ✓, `PLAN_TOOL` schema + `NAV_ICON_ENUM` (Task 2) ✓, system-prompt structural guidance (Task 2) ✓, four block-type renderers (Task 3) ✓, dynamic bottom nav (Task 3) ✓, fallbackPlan test extension (Task 1) ✓, new `AppScreenPreview` test (Task 3) ✓, visual end-to-end verification (Task 4) ✓. Non-goals respected: no per-block AI images (image-card reuses `plan.heroImage`), no free-form icons (both `contentBlocks[].icon` and `screenNavItems[].icon` share `NAV_ICON_ENUM`), no `componentRecommendations.ts` changes.
- **Type consistency:** `AppScreenBlock`'s four variants (`list-item`/`stat`/`image-card`/`action`) and their field names (`icon`, `title`, `subtitle`, `value`, `label`, `caption`) are identical across `schema.ts` (Task 1), `fallbackPlan.ts` (Task 1), `aiServerPlugin.ts`'s `PLAN_TOOL` (Task 2), and the test/render usage in `AppScreenPreview.tsx` (Task 3). `screenNavItems: { label, icon }[]` is likewise identical everywhere it appears.
- **Cross-plan dependency:** explicitly called out in Global Constraints and inline at the two touch points that overlap with the sibling website-sections plan's changes to the same files (`PLAN_TOOL`'s export keyword, `RELIANCE_REAL_CONTEXT`'s insertion point) — both plans' actual field insertions are otherwise at non-overlapping locations in each shared file, so they compose regardless of execution order except for those two noted spots.
- **No placeholders:** every step above shows the exact code to write or the exact command to run.
