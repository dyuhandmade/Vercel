import {defineConfig} from '@playwright/test';

// The CI job builds demo mode first, then starts that build with no credentials.
// Local read-only verification may reuse an existing server for these cases:
// account writes are mocked; endpoint checks reject before any Shopify mutation.
const reuse = process.env.DYU_CI_REUSE_SERVER === 'true' && !process.env.CI;
export default defineConfig({
  testDir: './tests', timeout: 60000, fullyParallel: false, workers: 1,
  forbidOnly: Boolean(process.env.CI), retries: 0,
  outputDir: './test-results/ci-browser',
  reporter: [['list'], ['json', {outputFile: 'test-results/ci-browser-results.json'}]],
  use: {baseURL: 'http://127.0.0.1:3000', channel: 'chrome', headless: true, viewport: {width: 1440, height: 1000}},
  webServer: reuse ? undefined : {
    command: 'node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000/api/health', reuseExistingServer: false, timeout: 120000,
    env: {NODE_ENV: 'production'},
  },
  projects: [
    {name: 'mocked-account-views', testMatch: '**/account-views.spec.ts'},
    {
      name: 'anonymous-account-boundaries', testMatch: '**/account-data.spec.ts',
      grep: /(?:account endpoints reject anonymous reads and cross-site writes without exposing records|forged customer cookies do not authenticate a shopper|checkout remains guest accessible but rejects an empty bag)$/,
    },
    {
      name: 'cart-route-boundaries', testMatch: '**/backend-guards.spec.ts',
      grep: /cart rejects cross-site requests and malformed bodies without upstream mutations$/,
    },
  ],
});
