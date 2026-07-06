import type { RecommendedComponent } from './componentRecommendations';
import { isRelianceDefined } from './relianceBrandMeta';

/**
 * Every recommended component ships its own real token manifest
 * (`<Component>_TOKEN_MANIFEST`, surfaced on `ComponentMeta.tokenManifest`).
 * This just walks those manifests and groups the token *definitions* — never
 * invented values — by their category, so the result screen can show "these
 * are the real design tokens this build will use" without us guessing at
 * colors, spacing, or radii.
 */

const CATEGORY_ORDER = [
  'color',
  'typography',
  'spacing',
  'shape',
  'stroke',
  'elevation',
  'motion',
  'decoration',
  'accessibility',
] as const;

export type TokenCategory = (typeof CATEGORY_ORDER)[number];

export interface TokenSample {
  /** The token's own default value, e.g. "Primary-Bold" or "Shape-Pill". */
  defaultToken: string;
  cssProperty?: string;
  description?: string;
  componentName: string;
  /**
   * True when Reliance's own brand.css defines this token. False means it
   * falls back to the shared design-system foundation (still real, just not
   * something Reliance repaints) — surfaced honestly in the UI rather than
   * silently presented as bespoke Reliance styling.
   */
  isRelianceSpecific: boolean;
}

const MAX_SAMPLES_PER_CATEGORY = 6;

export function collectTokensByCategory(
  components: RecommendedComponent[],
): Partial<Record<TokenCategory, TokenSample[]>> {
  const byCategory: Partial<Record<TokenCategory, Map<string, TokenSample>>> = {};

  for (const { meta } of components) {
    const manifest = meta.tokenManifest;
    if (!manifest) continue;

    for (const definition of Object.values(manifest.tokens)) {
      const category = definition.category as TokenCategory;
      if (!CATEGORY_ORDER.includes(category)) continue;

      const bucket = (byCategory[category] ??= new Map());
      // Dedupe by the resolved default token so e.g. every component that
      // uses Primary-Bold only shows up once per category.
      const key = definition.defaultToken;
      if (!bucket.has(key) && bucket.size < MAX_SAMPLES_PER_CATEGORY) {
        bucket.set(key, {
          defaultToken: definition.defaultToken,
          cssProperty: definition.cssProperty,
          description: definition.description,
          componentName: meta.name,
          isRelianceSpecific: isRelianceDefined(definition.defaultToken),
        });
      }
    }
  }

  const result: Partial<Record<TokenCategory, TokenSample[]>> = {};
  for (const category of CATEGORY_ORDER) {
    const bucket = byCategory[category];
    if (bucket && bucket.size > 0) result[category] = [...bucket.values()];
  }
  return result;
}

export { CATEGORY_ORDER as TOKEN_CATEGORY_ORDER };
