# Reliance Builder: richer website build sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the "website" build category so a generated build can include a quote/spotlight section, a news/insights grid, and a closing contact band, plus a static footer — modeled on the real ril.com structure shown in `Ref/website.png` and `Ref/Mobile.png`.

**Architecture:** Three new optional fields on the existing shared `BuildPlan` interface (`quote`, `newsItems`, `contactHeadline`), threaded through the Claude tool schema, the offline fallback content generator, and `WebsitePreview.tsx`'s rendering — following the exact pattern the codebase already uses for every other category-specific `BuildPlan` field. A static footer is added to `WebsitePreview.tsx` with no new schema (it just reuses the existing `navItems` field).

**Tech Stack:** TypeScript, React 18, `@jds4/oneui-react`, Vitest + Testing Library.

## Global Constraints

- Scope is the "website" category only — `app-screens`, `slides`, `social-media`, and `motion` previews/schemas are not touched by this plan.
- No "Resource Hub" section (explicitly out of scope per spec).
- No new "businesses" field — the existing `sections?: { title: string; body: string }[]` field already covers that grid; do not duplicate it.
- No extra AI-generated images. News cards and the contact band use solid/tinted color blocks (via `Surface`/plain `div` + design tokens), never a new Gemini image call.
- No new footer schema fields — the footer is static markup reusing the existing `navItems` field.
- No changes to `App/src/data/componentRecommendations.ts` — `Container`, `Surface`, and `Text` are already recommended for the website category.
- Never hardcode colors — all new styling uses CSS custom properties (design tokens) the same way the rest of `WebsitePreview.tsx` already does (e.g. `var(--Neutral-Stroke-Low)`, `var(--Shape-3)`).

---

### Task 1: Extend `BuildPlan` schema and fallback content

**Files:**
- Modify: `App/src/ai/schema.ts:33` (insert new fields after `sections`)
- Modify: `App/src/ai/fallbackPlan.ts:62` (insert new fields in the `base` object after `sections: [],`)
- Test: `tests/unit/ai/fallbackPlan.test.ts`

**Interfaces:**
- Produces: `BuildPlan.quote?: { text: string; name: string; title: string }`, `BuildPlan.newsItems?: { title: string; date: string }[]`, `BuildPlan.contactHeadline?: string` — consumed by Task 2 (tool schema) and Task 3 (rendering).

- [ ] **Step 1: Write the failing test**

Add this test to the existing `describe('fallbackPlan', ...)` block in `tests/unit/ai/fallbackPlan.test.ts` (after the existing `'folds guided answers into the recommended components'` test, still inside the same `describe`):

```ts
  it('includes generic quote, news, and contact content for every category', () => {
    const result = fallbackPlan({ category: 'website', prompt: '', answers: {} }, 'x');

    expect(result.data.quote).toEqual({ text: 'A short quote goes here.', name: 'Name', title: 'Title' });
    expect(result.data.newsItems).toHaveLength(3);
    expect(result.data.newsItems?.[0]).toEqual({ title: 'Update headline', date: 'Date' });
    expect(result.data.contactHeadline).toBe('Get in touch.');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: FAIL — `result.data.quote` is `undefined`, so `toEqual` fails (the fields don't exist on `BuildPlan` or in `fallbackPlan`'s output yet).

- [ ] **Step 3: Add the fields to `BuildPlan`**

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
  ...
```

Insert the three new fields directly after `sections`:

```ts
export interface BuildPlan {
  headline?: string;
  subheadline?: string;
  body?: string;
  kicker?: string;
  ctaLabel?: string;
  navItems?: string[];
  sections?: { title: string; body: string }[];
  /** Website: an optional founder/customer spotlight quote below the sections grid. */
  quote?: { text: string; name: string; title: string };
  /** Website: an optional 2-3 item news/updates grid. */
  newsItems?: { title: string; date: string }[];
  /** Website: an optional closing contact/CTA band headline, e.g. "Get in touch." */
  contactHeadline?: string;
  screenTitle?: string;
  contentBlocks?: string[];
  ...
```

(Leave every other field exactly as-is — only inserting the three new lines and their doc comments.)

- [ ] **Step 4: Add the fields to `fallbackPlan`'s output**

In `App/src/ai/fallbackPlan.ts`, the `base` object currently reads (around line 55-72):

```ts
  const base: BuildPlan = {
    headline: HEADLINE_BY_CATEGORY[input.category],
    subheadline: 'Supporting copy goes here.',
    body: 'Supporting detail goes here.',
    kicker: 'Section',
    ctaLabel: 'Get started',
    navItems: ['Product', 'Pricing'],
    sections: [],
    screenTitle: 'Home',
    contentBlocks: ['Content block', 'Content block'],
    ...
```

Insert the three new fields directly after `sections: [],`:

```ts
  const base: BuildPlan = {
    headline: HEADLINE_BY_CATEGORY[input.category],
    subheadline: 'Supporting copy goes here.',
    body: 'Supporting detail goes here.',
    kicker: 'Section',
    ctaLabel: 'Get started',
    navItems: ['Product', 'Pricing'],
    sections: [],
    quote: { text: 'A short quote goes here.', name: 'Name', title: 'Title' },
    newsItems: [
      { title: 'Update headline', date: 'Date' },
      { title: 'Update headline', date: 'Date' },
      { title: 'Update headline', date: 'Date' },
    ],
    contactHeadline: 'Get in touch.',
    screenTitle: 'Home',
    contentBlocks: ['Content block', 'Content block'],
    ...
```

(Leave every other field exactly as-is.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/unit/ai/fallbackPlan.test.ts`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 6: Run the full suite and typecheck to confirm nothing else broke**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass, zero typecheck errors.

- [ ] **Step 7: Commit**

```bash
git add App/src/ai/schema.ts App/src/ai/fallbackPlan.ts tests/unit/ai/fallbackPlan.test.ts
git commit -m "Add quote, newsItems, and contactHeadline fields to BuildPlan"
```

---

### Task 2: Wire the new fields into the Claude tool schema and system prompt

**Files:**
- Modify: `App/aiServerPlugin.ts:94` (`PLAN_TOOL` — add `export`, add three new properties)
- Modify: `App/src/ai/brandContext.ts:9-26` (`RELIANCE_REAL_CONTEXT` — append a structural-ordering paragraph)
- Test: `tests/unit/aiServerPlugin.test.ts` (new file)

**Interfaces:**
- Consumes: `BuildPlan.quote`, `BuildPlan.newsItems`, `BuildPlan.contactHeadline` from Task 1 (field names/shapes must match exactly).
- Produces: `PLAN_TOOL` (now exported) with `quote`, `newsItems`, `contactHeadline` in `input_schema.properties` — no other task depends on this directly, but it's what makes Claude actually author these fields at runtime.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/aiServerPlugin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PLAN_TOOL } from '../../App/aiServerPlugin';

describe('PLAN_TOOL schema', () => {
  it('includes the website quote, newsItems, and contactHeadline fields', () => {
    const props = PLAN_TOOL.input_schema.properties;

    expect(props.quote).toBeDefined();
    expect(props.quote.properties).toEqual(
      expect.objectContaining({
        text: { type: 'string' },
        name: { type: 'string' },
        title: { type: 'string' },
      }),
    );

    expect(props.newsItems).toBeDefined();
    expect(props.newsItems.type).toBe('array');

    expect(props.contactHeadline).toBeDefined();
    expect(props.contactHeadline.type).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: FAIL — `PLAN_TOOL` is not exported from `App/aiServerPlugin.ts` yet (import error), so the test file itself fails to resolve.

- [ ] **Step 3: Export `PLAN_TOOL` and add the new properties**

In `App/aiServerPlugin.ts`, change the declaration on line 94 from:

```ts
const PLAN_TOOL = {
```

to:

```ts
export const PLAN_TOOL = {
```

Then, inside `input_schema.properties`, insert three new properties directly after the existing `sections` property (which currently ends at line 110 with `},`):

```ts
      sections: {
        type: 'array',
        description: 'Website: supporting feature/benefit blocks below the hero.',
        items: { type: 'object', properties: { title: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'] },
      },
      quote: {
        type: 'object',
        description: 'Website: an optional founder/customer spotlight quote — only include when it genuinely fits the brief.',
        properties: {
          text: { type: 'string' },
          name: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['text', 'name', 'title'],
      },
      newsItems: {
        type: 'array',
        description: 'Website: an optional 2-3 item news/updates grid.',
        items: {
          type: 'object',
          properties: { title: { type: 'string' }, date: { type: 'string' } },
          required: ['title', 'date'],
        },
      },
      contactHeadline: {
        type: 'string',
        description: 'Website: an optional closing contact/CTA band headline, e.g. "Get in touch."',
      },
      screenTitle: { type: 'string', description: 'App screens: the top bar / screen title.' },
```

(Only the `quote`, `newsItems`, and `contactHeadline` blocks are new — `sections` and `screenTitle` shown above only to make the exact insertion point unambiguous. Leave every other property as-is.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/aiServerPlugin.test.ts`
Expected: PASS.

- [ ] **Step 5: Add structural guidance to the system prompt**

In `App/src/ai/brandContext.ts`, the `RELIANCE_REAL_CONTEXT` constant currently ends with:

```ts
Real site sections a Reliance-branded page draws its structure from: About,
Businesses, Sustainability (decarbonisation, net-zero, HSE), Investors, Careers, News
& Media, eB2B (customers, suppliers, notices). Reliance Foundation and its impact
figures (e.g. "97 million lives impacted") are a legitimate scale reference for
CSR/impact copy — don't invent a bigger or different number.
`.trim();
```

Change it to append one more paragraph before the closing backtick:

```ts
Real site sections a Reliance-branded page draws its structure from: About,
Businesses, Sustainability (decarbonisation, net-zero, HSE), Investors, Careers, News
& Media, eB2B (customers, suppliers, notices). Reliance Foundation and its impact
figures (e.g. "97 million lives impacted") are a legitimate scale reference for
CSR/impact copy — don't invent a bigger or different number.

Structure a website build the way ril.com's real page is structured: hero, then a few
business/feature highlights (the sections field), then optionally a quote/spotlight
from a named person, then optionally 2-3 short news/update items, then a closing
contact line. Not every field is required for every build — skip what doesn't fit a
short, focused brief.
`.trim();
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json`
Expected: all tests pass (including the new `aiServerPlugin.test.ts`), zero typecheck errors.

- [ ] **Step 7: Commit**

```bash
git add App/aiServerPlugin.ts App/src/ai/brandContext.ts tests/unit/aiServerPlugin.test.ts
git commit -m "Wire quote/newsItems/contactHeadline into the Claude plan tool schema"
```

---

### Task 3: Render the new sections and a static footer in `WebsitePreview.tsx`

**Files:**
- Modify: `App/src/components/previews/WebsitePreview.tsx`
- Test: `tests/unit/components/WebsitePreview.test.tsx` (new file)

**Interfaces:**
- Consumes: `BuildPlan.quote`, `BuildPlan.newsItems`, `BuildPlan.contactHeadline`, `BuildPlan.navItems` (all from Task 1/existing schema).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/WebsitePreview.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WebsitePreview } from '../../../App/src/components/previews/WebsitePreview';
import type { BuildPlan } from '../../../App/src/ai/schema';

const basePlan: BuildPlan = {
  headline: 'Test headline',
  recommendedComponentNames: [],
  reasoning: '',
};

describe('WebsitePreview', () => {
  it('renders the quote spotlight when a quote is present', () => {
    render(<WebsitePreview plan={{ ...basePlan, quote: { text: 'Great things', name: 'Ada', title: 'Founder' } }} />);

    expect(screen.getByText('"Great things"')).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Founder')).toBeInTheDocument();
  });

  it('omits the quote spotlight when no quote is given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('Founder')).not.toBeInTheDocument();
  });

  it('renders a news card per item when newsItems is present', () => {
    render(
      <WebsitePreview
        plan={{
          ...basePlan,
          newsItems: [
            { title: 'First update', date: '1 July' },
            { title: 'Second update', date: '2 July' },
          ],
        }}
      />,
    );

    expect(screen.getByText('First update')).toBeInTheDocument();
    expect(screen.getByText('Second update')).toBeInTheDocument();
    expect(screen.getByText('1 July')).toBeInTheDocument();
  });

  it('omits the news grid when no newsItems are given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('1 July')).not.toBeInTheDocument();
  });

  it('renders the contact band headline when present', () => {
    render(<WebsitePreview plan={{ ...basePlan, contactHeadline: 'Get in touch.' }} />);

    expect(screen.getByText('Get in touch.')).toBeInTheDocument();
  });

  it('omits the contact band when no contactHeadline is given', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.queryByText('Get in touch.')).not.toBeInTheDocument();
  });

  it('always renders a footer with a copyright line', () => {
    render(<WebsitePreview plan={basePlan} />);

    expect(screen.getByText('© Reliance')).toBeInTheDocument();
  });

  it('reuses navItems as footer links alongside the header nav', () => {
    render(<WebsitePreview plan={{ ...basePlan, navItems: ['Docs', 'Support'] }} />);

    expect(screen.getAllByText('Docs')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/unit/components/WebsitePreview.test.tsx`
Expected: FAIL on every test that looks for quote/news/contact/footer content — none of it exists in `WebsitePreview.tsx` yet.

- [ ] **Step 3: Implement the new sections and footer**

In `App/src/components/previews/WebsitePreview.tsx`, change the import line from:

```tsx
import { Container, Text, Button, Image } from '@jds4/oneui-react';
```

to:

```tsx
import { Container, Text, Button, Image, Surface } from '@jds4/oneui-react';
```

Then, insert the following JSX immediately after the existing `sections` block and its closing `)}`, and immediately before the outer `</Container>` that closes the component's return value (the file currently ends with the `sections` block's closing `)}` on the line before the final `</Container>\n  );\n}`):

```tsx
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
              <div
                style={{
                  aspectRatio: '16 / 9',
                  background: 'var(--Neutral-Subtle)',
                  borderRadius: 'var(--Shape-2)',
                  marginBottom: 'var(--Spacing-3)',
                }}
              />
              <Text variant="label" size="S" appearance="neutral">
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

      <Container
        variant="full-bleed"
        layout="flex"
        direction="column"
        gap="3"
        width="full"
        padding="10"
        style={{ borderTop: '1px solid var(--Neutral-Stroke-Low)' }}
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
```

The footer's `navItems.map` reuses the same `navItems` local variable already destructured at the top of the component (`const navItems = plan.navItems?.length ? plan.navItems : ['Product', 'Pricing'];`) — no new variable needed. Its `key={item}` is scoped to this list only, so it doesn't collide with the header nav's identical keys in a different list.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/components/WebsitePreview.test.tsx`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit -p App/tsconfig.json && npx tsc --noEmit -p tsconfig.json`
Expected: all tests pass, zero typecheck errors in both tsconfigs.

- [ ] **Step 6: Commit**

```bash
git add App/src/components/previews/WebsitePreview.tsx tests/unit/components/WebsitePreview.test.tsx
git commit -m "Render quote, news grid, contact band, and footer in WebsitePreview"
```

---

### Task 4: Visual end-to-end verification

**Files:** None modified — this task only verifies Tasks 1-3 together in the real running app.

**Interfaces:** None (verification only).

- [ ] **Step 1: Start the dev server**

Run: `npm run app:dev` (in the background; note whichever port it binds to — 5173 may already be in use by another project on this machine, Vite will fall back to 5174/5175/etc. and print the actual URL).

Wait for it to respond: poll `curl -sf http://localhost:<port>` until it succeeds (up to ~30s).

- [ ] **Step 2: Drive a real website build through the guided flow**

Using Playwright (`npm install --no-save playwright` in a scratch directory if not already available, per the same approach used for the earlier preview-width verification), or manually in a browser:

1. Navigate to the dev server URL.
2. Click the "Website" quick-action chip.
3. Answer both guided questions (pick any option — if `ANTHROPIC_API_KEY` is configured the questions come from a live classify call and their exact wording varies each run; click the first available option either way).
4. Wait for "Designing your preview…" to resolve to the result screen.

- [ ] **Step 3: Confirm the new sections render**

Take a full-page screenshot of the result screen. Confirm:
- A quote/spotlight block appears below the sections grid (if the plan included one — with `ANTHROPIC_API_KEY` set, Claude decides whether to include it per the new system-prompt guidance; with no key, the fallback path always includes one).
- A news grid with color-block placeholders (not broken image icons) appears.
- A contact band headline appears near the bottom.
- A footer with the brand mark, nav links, and "© Reliance" appears at the very end.
- No console errors (check via the browser's dev tools or Playwright's `page.on('console', ...)`).

- [ ] **Step 4: Stop the dev server**

Run: `kill %1` or `pkill -f "vite --config App/vite.config.ts"` (whichever matches how it was started in Step 1) to avoid leaving a stray process running.

- [ ] **Step 5: Report results**

No commit for this task (verification only) — summarize what was confirmed (or any issue found, in which case return to the relevant task above, fix, and re-verify) to the user.

---

## Self-Review Notes

- **Spec coverage:** Schema fields (Task 1) ✓, fallback content (Task 1) ✓, `PLAN_TOOL` schema (Task 2) ✓, system-prompt structural guidance (Task 2) ✓, quote/news/contact rendering (Task 3) ✓, static footer (Task 3) ✓, fallbackPlan test extension (Task 1) ✓, new `WebsitePreview` test (Task 3) ✓, visual end-to-end verification (Task 4) ✓. All non-goals from the spec (no Resource Hub, no `businesses` field, no extra generated images, no footer schema, no `componentRecommendations.ts` changes) are respected — no task introduces any of them.
- **Type consistency:** `quote: { text, name, title }`, `newsItems: { title, date }[]`, `contactHeadline: string` are identical across `schema.ts` (Task 1), `fallbackPlan.ts` (Task 1), `aiServerPlugin.ts`'s `PLAN_TOOL` (Task 2), and the test/render usage in `WebsitePreview.tsx` (Task 3).
- **No placeholders:** every step above shows the exact code to write or the exact command to run.
