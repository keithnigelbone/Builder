# Reliance Builder: root `.env` loading + Storybook component gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Reliance Builder read its Anthropic key from the repo-root `.env`, and only recommend components that have an actual Storybook story in this repo.

**Architecture:** Two small, independent changes to the existing `App/` Vite app: (1) point `loadEnv` at the repo root instead of `App/`, (2) add a Storybook-derived allowlist and intersect it into the existing `AVAILABLE_COMPONENTS` filter in `oneuiRegistry.ts`.

**Tech Stack:** Vite 5, TypeScript, React 18, `@jds4/oneui-react`, Storybook 8 (`@storybook/react-vite`).

## Global Constraints

- Root `.env` is the single source of truth for secrets in this project (per `docs/superpowers/specs/2026-07-06-reliance-builder-env-and-storybook-gate-design.md`) — do not reintroduce `App/.env.local` as a required file.
- Storybook gates eligibility only — component metadata (category/description/tags) still comes entirely from `@jds4/oneui-react`'s `metaRegistry`. Do not touch metadata sourcing.
- `component_test` has no git repository (`git rev-parse --is-inside-work-tree` fails) and no test runner (no vitest/jest in `package.json`) — skip "commit" steps and automated test steps from the standard plan template; use the manual verification steps specified in each task instead.
- Files under `.env*` patterns are blocked from being read/edited by this environment's permission settings — do not add tasks that Read or Edit `App/.env.example`; leave it untouched.

---

### Task 1: Point Reliance Builder's env loading at the repo root

**Files:**
- Modify: `App/vite.config.ts:44-46`

**Interfaces:**
- Consumes: nothing new.
- Produces: `process.env.ANTHROPIC_API_KEY` / `process.env.ANTHROPIC_MODEL` populated from the repo-root `.env` instead of `App/.env` — consumed by `App/aiServerPlugin.ts`'s existing `process.env.ANTHROPIC_API_KEY` read (unchanged).

- [ ] **Step 1: Make the change**

In `App/vite.config.ts`, `repoRoot` is already defined at line 27 (`const repoRoot = path.resolve(__dirname, '..');`). Update the `loadEnv` call and its comment inside the `defineConfig` callback:

```ts
export default defineConfig(({ mode }) => {
  // Reads the repo-root `.env` (see README.md) — `''` prefix means "load
  // every variable, not just VITE_-prefixed ones". We deliberately do NOT
  // expose ANTHROPIC_API_KEY to the client bundle; we only copy it onto
  // process.env so aiServerPlugin.ts (which runs in this Node process, never
  // in the browser) can read it.
  const env = loadEnv(mode, repoRoot, '');
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (env.ANTHROPIC_MODEL) process.env.ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;
```

Only the `loadEnv(mode, __dirname, '')` -> `loadEnv(mode, repoRoot, '')` argument and the comment change; nothing else in the file changes.

- [ ] **Step 2: Verify the repo-root `.env` already has the key**

Run: `grep -c ANTHROPIC_API_KEY /Users/keithbone/component_test/.env`
Expected: `1`

(This file was already created with `ANTHROPIC_API_KEY=sk-ant-...` in an earlier session. If it's missing, add `ANTHROPIC_API_KEY=<your key>` to `/Users/keithbone/component_test/.env` before continuing.)

- [ ] **Step 3: Start the dev server**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Expected: log output showing a local URL, e.g. `Local: http://localhost:5173/`

- [ ] **Step 4: Verify the proxy no longer reports a missing key**

Run:
```bash
curl -s -X POST http://localhost:5173/api/claude \
  -H 'content-type: application/json' \
  -d '{"type":"classify","prompt":"a homepage for a new savings account"}'
```
Expected: **NOT** `{"error":"ANTHROPIC_API_KEY is not set...`. A `{"result": {...}}` body means the key works end-to-end. A different error (e.g. a 401 from Anthropic) still confirms the fix — it means the key is now being read and forwarded, even if the key value itself is invalid/expired; if you see that, report the exact error back rather than treating it as a plan failure.

- [ ] **Step 5: Stop the dev server**

Stop the background `npm run app:dev` process before moving to Task 2 (it will be restarted there).

---

### Task 2: Update README's setup instructions to match

**Files:**
- Modify: `README.md` (the "Enabling live Claude generation" section)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by code — documentation only.

- [ ] **Step 1: Make the change**

In `README.md`, replace:

```markdown
1. Get an Anthropic API key: https://console.anthropic.com/
2. `cp App/.env.example App/.env.local`
3. Put your key in `App/.env.local` as `ANTHROPIC_API_KEY=sk-ant-...`
4. Restart `npm run app:dev`
```

with:

```markdown
1. Get an Anthropic API key: https://console.anthropic.com/
2. Add `ANTHROPIC_API_KEY=sk-ant-...` to the repo-root `.env` (create the file if it
   doesn't exist yet — it's already excluded via `.gitignore`).
3. Restart `npm run app:dev`
```

- [ ] **Step 2: Verify**

Run: `grep -n "repo-root \`.env\`" README.md`
Expected: one match, inside the "Enabling live Claude generation" section.

---

### Task 3: Add the Storybook component registry module

**Files:**
- Create: `App/src/data/storybookRegistry.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `STORYBOOK_COMPONENT_NAMES: ReadonlySet<string>` — set of component names (e.g. `"Button"`, `"Input"`) that have a matching file in `src/stories/`. Consumed by Task 4.

- [ ] **Step 1: Create the file**

```ts
/**
 * Storybook is the review gate for which components this app is allowed to
 * recommend: a component is only eligible once it has an actual story in
 * `src/stories/`. This uses Vite's built-in `import.meta.glob` (no Node `fs`
 * access) so it works identically in the dev server and the client bundle.
 */
const storyModules = import.meta.glob('../../../src/stories/*.stories.tsx');

/** Component names with a matching Storybook story, derived from filenames
 *  (e.g. ".../src/stories/Button.stories.tsx" -> "Button"). Filenames match
 *  component names exactly by convention in this repo (see
 *  .storybook/main.ts's `stories` glob). */
export const STORYBOOK_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  Object.keys(storyModules).map((path) => path.split('/').pop()!.replace(/\.stories\.tsx$/, '')),
);
```

- [ ] **Step 2: Verify the glob path resolves**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Then open the printed local URL in a browser, open the browser DevTools console, and run:

```js
import('/src/data/storybookRegistry.ts').then((m) => console.log([...m.STORYBOOK_COMPONENT_NAMES].sort()));
```

Expected: an array of ~35 names including `"Button"`, `"Input"`, `"Tooltip"`, `"Modal"` (one per file in `src/stories/`, matching `ls src/stories/*.stories.tsx`). If the array is empty, the glob path is wrong — double check `App/src/data/` is really 3 directories above the repo root's `src/` (`data` -> `src` -> `App` -> repo root).

- [ ] **Step 3: Stop the dev server**

Stop the background process before Task 4.

---

### Task 4: Gate `AVAILABLE_COMPONENTS` on Storybook coverage

**Files:**
- Modify: `App/src/data/oneuiRegistry.ts:11-17`

**Interfaces:**
- Consumes: `STORYBOOK_COMPONENT_NAMES` from Task 3 (`./storybookRegistry`).
- Produces: `AVAILABLE_COMPONENTS: ComponentMeta[]` (same exported name/type as before — narrower contents). `getComponentMeta` and `getComponentsByCategory` are unchanged and now operate over the narrower list automatically.

- [ ] **Step 1: Make the change**

In `App/src/data/oneuiRegistry.ts`, replace:

```ts
import { ALL_COMPONENT_METAS, type ComponentMeta } from '@jds4/oneui-react/registry/metaRegistry';
import { isComponentReleased } from '@jds4/oneui-react/registry/releasedComponents';

/** Every component this app is allowed to recommend or reference. */
export const AVAILABLE_COMPONENTS: ComponentMeta[] = ALL_COMPONENT_METAS.filter((meta) =>
  isComponentReleased(meta.name),
);
```

with:

```ts
import { ALL_COMPONENT_METAS, type ComponentMeta } from '@jds4/oneui-react/registry/metaRegistry';
import { isComponentReleased } from '@jds4/oneui-react/registry/releasedComponents';
import { STORYBOOK_COMPONENT_NAMES } from './storybookRegistry';

/** Every component this app is allowed to recommend or reference: released by
 *  the package AND covered by an actual Storybook story in this repo. */
export const AVAILABLE_COMPONENTS: ComponentMeta[] = ALL_COMPONENT_METAS.filter(
  (meta) => isComponentReleased(meta.name) && STORYBOOK_COMPONENT_NAMES.has(meta.name),
);
```

- [ ] **Step 2: Verify baseline — a covered component is still available**

Run (from `/Users/keithbone/component_test`), in the background: `npm run app:dev`
Open the browser DevTools console at the printed local URL and run:

```js
import('/src/data/oneuiRegistry.ts').then((m) => console.log(m.AVAILABLE_COMPONENTS.some((c) => c.name === 'Button')));
```
Expected: `true`

- [ ] **Step 3: Verify the gate actually removes an uncovered component**

Stop the dev server. Temporarily rename the story file so `Tooltip` has no story:

Run: `mv src/stories/Tooltip.stories.tsx src/stories/Tooltip.stories.tsx.disabled`

Restart: `npm run app:dev` (in the background)
Open the browser DevTools console at the printed local URL and run:

```js
import('/src/data/oneuiRegistry.ts').then((m) => console.log(m.AVAILABLE_COMPONENTS.some((c) => c.name === 'Tooltip')));
```
Expected: `false`

- [ ] **Step 4: Restore the story file**

Stop the dev server. Run: `mv src/stories/Tooltip.stories.tsx.disabled src/stories/Tooltip.stories.tsx`

Re-run the Step 2 check once more to confirm `Tooltip` (and `Button`) are back:
```js
import('/src/data/oneuiRegistry.ts').then((m) => console.log(m.AVAILABLE_COMPONENTS.some((c) => c.name === 'Tooltip'), m.AVAILABLE_COMPONENTS.some((c) => c.name === 'Button')));
```
Expected: `true true`

- [ ] **Step 5: Stop the dev server**

Leave the working tree clean (only the intended `vite.config.ts`, `README.md`, `storybookRegistry.ts`, `oneuiRegistry.ts` changes present — `Tooltip.stories.tsx` restored to its original name/content).

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers spec Section 1 (root `.env`); Task 2 keeps docs truthful; Tasks 3-4 cover spec Section 2 (Storybook gate) exactly as designed, including the corrected relative glob path from the design doc's self-review.
- **No placeholders:** every step has literal code/commands and literal expected output.
- **Type consistency:** `STORYBOOK_COMPONENT_NAMES` is defined once in Task 3 and consumed with that exact name in Task 4; `AVAILABLE_COMPONENTS` keeps its existing name and type (`ComponentMeta[]`) so `ComponentRecommendations.tsx` and other existing consumers need no changes.
