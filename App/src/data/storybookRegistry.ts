/**
 * Storybook is the review gate for which components this app is allowed to
 * recommend: a component is only eligible once it has an actual story in
 * `src/stories/`. This uses Vite's built-in `import.meta.glob` (no Node `fs`
 * access) so it works identically in the dev server and the client bundle.
 * The glob matches both nested and flat stories, and both .ts and .tsx
 * extensions, to align with .storybook/main.ts's `stories` glob.
 */
const storyModules = import.meta.glob('../../../src/stories/**/*.stories.{ts,tsx}');

/** Component names with a matching Storybook story, derived from filenames
 *  (e.g. ".../src/stories/Button.stories.tsx" -> "Button", or
 *  ".../src/stories/nested/Card.stories.ts" -> "Card"). Filenames match
 *  component names exactly by convention in this repo (see
 *  .storybook/main.ts's `stories` glob). */
export const STORYBOOK_COMPONENT_NAMES: ReadonlySet<string> = new Set(
  Object.keys(storyModules).map((path) => path.split('/').pop()!.replace(/\.stories\.(ts|tsx)$/, '')),
);
