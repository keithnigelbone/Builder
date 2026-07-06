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
