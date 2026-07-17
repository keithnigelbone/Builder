import { defineConfig, type Plugin } from 'vitest/config';

const VIRTUAL_ID = 'virtual:reliance-brand-meta';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

// The real module comes from App/relianceTokenCoveragePlugin.ts, which reads
// Reliance's fetched brand.css/branding.json off disk (populated by the oneui
// vite plugin at dev/build time). Tests never run that pipeline, so provide
// empty-but-valid defaults here just so the import resolves; individual tests
// override this via vi.mock when they need specific brand-meta values.
function relianceBrandMetaStub(): Plugin {
  return {
    name: 'reliance-brand-meta-stub',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `
        export const definedProps = [];
        export const brandName = "Reliance";
        export const logoSvg = null;
      `;
    },
  };
}

export default defineConfig({
  plugins: [relianceBrandMetaStub()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'App/tests/**/*.test.{ts,tsx}'],
    css: true,
  },
});
