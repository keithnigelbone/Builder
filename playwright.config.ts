import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5199' },
  webServer: {
    command: 'npx vite --config App/vite.config.ts --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { ...process.env, RELIANCE_BUILDER_DISABLE_AI: '1' },
  },
});
