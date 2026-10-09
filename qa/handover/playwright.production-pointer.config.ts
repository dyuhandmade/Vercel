import { defineConfig } from '@playwright/test';
import base from '../../playwright.config';

// Reuse the already running production preview without starting a dev server.
export default defineConfig({
  ...base,
  testDir: '../../tests',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3001' },
  webServer: undefined,
  outputDir: './rechecks/production-pointer',
});
