# Reliance Builder: root `.env` loading + Storybook as component gate

## Problem

Reliance Builder (`App/`) has two gaps:

1. **Live Claude generation doesn't activate.** `App/vite.config.ts` loads env vars via
   `loadEnv(mode, __dirname, '')`, where `__dirname` is `App/`. It only reads `App/.env` /
   `App/.env.local`. The project's secrets live in the repo-root `.env`, which this pipeline
   never reads, so `aiServerPlugin.ts` always sees `ANTHROPIC_API_KEY` as unset and the app
   silently falls back to `fallbackPlan.ts`.

2. **Component recommendations aren't gated by Storybook.** `App/src/data/oneuiRegistry.ts`
   builds `AVAILABLE_COMPONENTS` from `@jds4/oneui-react`'s own `ALL_COMPONENT_METAS`,
   filtered by that package's `isComponentReleased()` flag. That flag reflects the package's
   internal release state, not whether the component has actually been reviewed/added to
   this repo's own Storybook (`src/stories/`). The build/design tool should only ever offer
   components that are demonstrably working in this project's Storybook.

## Goals

- A single `.env` at the repo root is the one place secrets live for this project; Reliance
  Builder's dev server reads it directly.
- `AVAILABLE_COMPONENTS` only includes components that both (a) are released per the package
  registry (existing check, unchanged) and (b) have a matching Storybook story file in
  `src/stories/`.
- No change to component metadata (category/description/tags) — those still come entirely
  from the package's `metaRegistry`. Storybook is purely an additional eligibility gate.

## Non-goals

- Replacing `ALL_COMPONENT_METAS` as the metadata source.
- Any change to the classify/plan Claude prompts or tool schemas.
- Production/deployed hosting of the `/api/claude` proxy (out of scope, same as today).

## Design

### 1. Root `.env` as the single source

`App/vite.config.ts` currently does:

```ts
const env = loadEnv(mode, __dirname, '');
```

Change the second argument from `__dirname` (`App/`) to `repoRoot` (already computed a few
lines above as `path.resolve(__dirname, '..')`), so Vite's env loader looks for `.env`,
`.env.local`, etc. at the repo root instead of inside `App/`:

```ts
const env = loadEnv(mode, repoRoot, '');
```

Everything downstream (`process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY`, etc.) is
unchanged — only which directory is searched for env files changes.

`App/.env.example` continues to document the expected variables, but the comment pointing
readers at `App/.env.local` should be updated to point at the repo-root `.env` instead, so
the README/setup instructions don't contradict the actual behavior.

`.gitignore` already ignores root `.env` (and `App/.env`), so no change needed there.

### 2. Storybook as a component-eligibility gate

Add a new module, `App/src/data/storybookRegistry.ts`, that uses Vite's built-in
`import.meta.glob` to enumerate story files without any Node filesystem access (this code
runs in the browser bundle too):

```ts
const storyModules = import.meta.glob('/src/stories/*.stories.tsx');

/** Component names that have a matching Storybook story, derived from filenames
 *  (e.g. "/src/stories/Button.stories.tsx" -> "Button"). Filenames match component
 *  names exactly by convention in this repo (see .storybook/main.ts's glob). */
export const STORYBOOK_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  Object.keys(storyModules).map((path) => path.split('/').pop()!.replace('.stories.tsx', '')),
);
```

Then in `oneuiRegistry.ts`, change:

```ts
export const AVAILABLE_COMPONENTS: ComponentMeta[] = ALL_COMPONENT_METAS.filter((meta) =>
  isComponentReleased(meta.name),
);
```

to also require Storybook coverage:

```ts
export const AVAILABLE_COMPONENTS: ComponentMeta[] = ALL_COMPONENT_METAS.filter(
  (meta) => isComponentReleased(meta.name) && STORYBOOK_COMPONENT_NAMES.has(meta.name),
);
```

Everything else in `oneuiRegistry.ts` (`getComponentMeta`, `getComponentsByCategory`) is
unchanged — they operate on the now-narrower `AVAILABLE_COMPONENTS`.

A relative `import.meta.glob` pattern resolves relative to the file calling it, not the Vite
project root. `oneuiRegistry.ts` lives at `App/src/data/`, and stories live at the repo
root's `src/stories/` (three levels up: `data/` -> `src/` -> `App/` -> repo root), so the
correct pattern is:

```ts
import.meta.glob('../../../src/stories/*.stories.tsx')
```

This reads from outside `App/`'s Vite `root`, but Vite's dev server `fs.allow` defaults to
the detected workspace root (found by walking up from `root` for the nearest `package.json`
/ lockfile), which resolves to the repo root here — the single `package.json` at
`/Users/keithbone/component_test/package.json`. So no `server.fs.allow` config change should
be needed; this will be confirmed with a real dev-server run during implementation.

## Testing

- Manual: set `ANTHROPIC_API_KEY` in root `.env`, run `npm run app:dev`, submit a build
  prompt, and confirm the network tab shows a real `/api/claude` call succeeding (not a 503
  fallback).
- Manual: temporarily rename one story file (e.g. `Tooltip.stories.tsx`) and confirm
  `Tooltip` no longer appears in `AVAILABLE_COMPONENTS` / recommended components; rename it
  back and confirm it reappears.
- No existing automated tests cover this data layer; adding a unit test is optional and can
  be proposed separately if desired (kept out of scope here per the stated goals).
