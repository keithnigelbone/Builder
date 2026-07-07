import { composeStories } from '@storybook/react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandProvider } from '@jds4/oneui-react';

// Every Storybook story in src/stories/ wraps a real @jds4/oneui-react
// component. Rather than hand-writing a render test per component (30+ and
// growing), this loads every story module Storybook itself would pick up and
// smoke-renders each exported story through the same portable-stories API
// Storybook uses internally — catching import errors, prop-type mismatches,
// and render-time crashes across the whole design-system catalog at once.
const storyModules = import.meta.glob('../../src/stories/*.stories.tsx', { eager: true }) as Record<
  string,
  Parameters<typeof composeStories>[0]
>;

describe('oneUI story catalog', () => {
  const entries = Object.entries(storyModules);
  expect(entries.length).toBeGreaterThan(0);

  for (const [path, mod] of entries) {
    const componentName = path.split('/').pop()!.replace('.stories.tsx', '');

    describe(componentName, () => {
      const stories = composeStories(mod);

      for (const [storyName, Story] of Object.entries(stories)) {
        it(`renders the "${storyName}" story without throwing`, async () => {
          // BrandProvider loads brand CSS/decorations asynchronously and
          // renders null until that settles (resolved or, as here with no
          // network/CDN access, rejected) — wait for the real content past
          // that loading gate instead of asserting on the first paint.
          const { container } = render(
            <BrandProvider brand="jio">
              <Story />
            </BrandProvider>,
          );
          await waitFor(() => expect(container).not.toBeEmptyDOMElement());
        });
      }
    });
  }
});
