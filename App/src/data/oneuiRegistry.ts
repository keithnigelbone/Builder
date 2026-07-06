/**
 * Thin wrapper around @jds4/oneui-react's own component registry.
 *
 * `@jds4/oneui-react/registry/metaRegistry` ships real, first-party metadata for
 * every component (category, description, search tags, and a reference to its
 * token manifest). `@jds4/oneui-react/registry/releasedComponents` lists which
 * of those are actually shipped/stable. We intersect the two so this app only
 * ever recommends components that genuinely exist in the installed package —
 * nothing here is hand-invented.
 */
import { ALL_COMPONENT_METAS, type ComponentMeta } from '@jds4/oneui-react/registry/metaRegistry';
import { isComponentReleased } from '@jds4/oneui-react/registry/releasedComponents';
import { STORYBOOK_COMPONENT_NAMES } from './storybookRegistry';

/** Every component this app is allowed to recommend or reference: released by
 *  the package AND covered by an actual Storybook story in this repo. */
export const AVAILABLE_COMPONENTS: ComponentMeta[] = ALL_COMPONENT_METAS.filter(
  (meta) => isComponentReleased(meta.name) && STORYBOOK_COMPONENT_NAMES.has(meta.name),
);

const BY_NAME = new Map(AVAILABLE_COMPONENTS.map((meta) => [meta.name, meta]));

export function getComponentMeta(name: string): ComponentMeta | undefined {
  return BY_NAME.get(name);
}

/** Real functional categories from the registry (`actions`, `inputs`, `display`, `layout`, `overlays`, `navigation`, `feedback`). */
export function getComponentsByCategory(category: ComponentMeta['category']): ComponentMeta[] {
  return AVAILABLE_COMPONENTS.filter((meta) => meta.category === category);
}

export type { ComponentMeta };
