import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:reliance-brand-meta';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Reads whatever the oneui plugin actually fetched for Reliance (brand.css +
 * branding.json, already on disk by the time any module requests this) and
 * exposes two things the app needs to stay honest about what's real:
 *
 *  - `definedProps`: every CSS custom property name Reliance's own brand.css
 *    defines. App/src/data/relianceBrandMeta.ts uses this to tell "Reliance
 *    overrides this token" apart from "this token falls back to the shared
 *    design-system foundation" — never a fabricated value either way.
 *  - `logoSvg` / `brandName`: Reliance's real logo mark, for previews that
 *    want an authentic brand asset instead of a generic placeholder.
 */
export function relianceTokenCoverage(relianceCacheDir: string): Plugin {
  return {
    name: 'reliance-token-coverage',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;

      const cssPath = path.join(relianceCacheDir, 'brand.css');
      const brandingPath = path.join(relianceCacheDir, 'branding.json');

      const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
      const definedProps = [...new Set([...css.matchAll(/--([A-Za-z0-9-]+)\s*:/g)].map((m) => m[1]))];

      let branding = { brandName: 'Reliance', logoSvg: null as string | null };
      if (existsSync(brandingPath)) {
        try {
          branding = JSON.parse(readFileSync(brandingPath, 'utf8'));
        } catch {
          // Cache file mid-write or malformed — fall back to the default above.
        }
      }

      return `
        export const definedProps = ${JSON.stringify(definedProps)};
        export const brandName = ${JSON.stringify(branding.brandName)};
        export const logoSvg = ${JSON.stringify(branding.logoSvg)};
      `;
    },
  };
}
