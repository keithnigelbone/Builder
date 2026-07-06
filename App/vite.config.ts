import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
// Reuse the same brand-CSS plugin the Storybook catalog uses (see
// ../.storybook/main.ts) so this app renders with real brand tokens too.
import { oneui } from '@jds4/oneui-vite-plugin';
import { relianceTokenCoverage } from './relianceTokenCoveragePlugin';
import { claudeApiProxy } from './aiServerPlugin';

// No @vitejs/plugin-react here on purpose (keeping deps minimal, per project
// convention) — Vite's built-in esbuild transform already handles .tsx via
// the automatic JSX runtime. The only thing we lose is React Fast Refresh;
// edits still rebuild, just with a full reload instead of HMR.

// ---------------------------------------------------------------------------
// oneui.brands.json is the single source of truth for *which brands exist at
// all*. This app, though, is Reliance-only by product requirement: even if
// the file lists other brands (jio, swadesh, ...), we deliberately only pass
// the Reliance entry to the `oneui()` plugin below, so no other brand's CSS
// or tokens are ever fetched, cached, or reachable from this app. The full
// parsed file is still injected as `__ONEUI_BRANDS_CONFIG__` purely so
// App/src/data/brandsConfig.ts can assert Reliance is actually declared
// there — see that file for the app-side half of this.
// ---------------------------------------------------------------------------
const brandsConfigPath = path.resolve(__dirname, '../oneui.brands.json');
const fullBrandsConfig = JSON.parse(readFileSync(brandsConfigPath, 'utf8'));
const repoRoot = path.resolve(__dirname, '..');

const relianceOnlyConfig = {
  cdnUrl: fullBrandsConfig.cdnUrl,
  brands: { reliance: fullBrandsConfig.brands.reliance },
};
// A cache dir of its own — separate from the Storybook catalog's — so the
// two tools never prune each other's cached brands when run at different
// times (the oneui plugin deletes any cached brand not in its own config).
const relianceCacheDir = path.resolve(repoRoot, 'node_modules/.oneui-cache-app');

export default defineConfig(({ mode }) => {
  // Reads the repo-root `.env` (see README.md) — `''` prefix means "load
  // every variable, not just VITE_-prefixed ones". We deliberately do NOT
  // expose ANTHROPIC_API_KEY to the client bundle; we only copy it onto
  // process.env so aiServerPlugin.ts (which runs in this Node process, never
  // in the browser) can read it.
  const env = loadEnv(mode, repoRoot, '');
  if (env.ANTHROPIC_API_KEY) process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
  if (env.ANTHROPIC_MODEL) process.env.ANTHROPIC_MODEL = env.ANTHROPIC_MODEL;

  return {
    // `--config App/vite.config.ts` only selects the config file — Vite still
    // defaults `root` to the CLI's cwd (the repo root), not this file's
    // directory. Set it explicitly so App/index.html is actually found.
    root: __dirname,
    // App/ has no node_modules of its own (it shares the repo root's — see
    // package.json). Point Vite's caches back at the repo root instead of
    // letting it try to create node_modules/.vite inside App/.
    cacheDir: path.resolve(repoRoot, 'node_modules/.vite-app'),
    esbuild: {
      jsx: 'automatic' as const,
    },
    plugins: [
      oneui({ ...relianceOnlyConfig, cacheDir: relianceCacheDir }),
      relianceTokenCoverage(path.join(relianceCacheDir, 'brands/reliance')),
      claudeApiProxy(),
    ],
    define: {
      __ONEUI_BRANDS_CONFIG__: JSON.stringify(fullBrandsConfig),
    },
    optimizeDeps: {
      // See ../.storybook/main.ts for why this exclusion is required: Vite's
      // dependency pre-bundler otherwise inlines the package's dynamic
      // import() of brand-loader before the oneui plugin can intercept it,
      // which silently breaks brand switching.
      exclude: ['@jds4/oneui-react/brand-loader'],
    },
  };
});
