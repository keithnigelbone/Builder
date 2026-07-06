// Backed by App/relianceTokenCoveragePlugin.ts, which reads Reliance's real
// fetched brand.css + branding.json — see that file for how.
import { definedProps, brandName, logoSvg } from 'virtual:reliance-brand-meta';

const RELIANCE_DEFINED_PROPS = new Set(definedProps);

/**
 * True when Reliance's own brand.css defines this CSS custom property
 * (without the leading `--`). False means the value comes from the shared
 * design-system foundation — still a real, valid value, just not something
 * Reliance itself repaints. Used to label fallbacks honestly in the
 * "Build details" panel instead of implying everything is bespoke to Reliance.
 */
export function isRelianceDefined(cssCustomPropertyName: string): boolean {
  return RELIANCE_DEFINED_PROPS.has(cssCustomPropertyName);
}

/** Every real Reliance-defined token starting with the given prefix, e.g. "Motion-Duration". */
export function relianceTokensWithPrefix(prefix: string): string[] {
  return definedProps.filter((name) => name.startsWith(prefix));
}

export const RELIANCE_BRAND_NAME = brandName;
export const RELIANCE_LOGO_SVG = logoSvg;
