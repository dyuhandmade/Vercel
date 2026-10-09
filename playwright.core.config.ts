import {defineConfig} from '@playwright/test';

// No webServer or baseURL: core CI must not depend on a running shop, .env files,
// Shopify credentials, catalogue inventory, or Customer Account configuration.
// Browser cases render supplied React markup with page.setContent while offline.
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  outputDir: './test-results/core',
  reporter: [['list'], ['json', {outputFile: 'test-results/core-results.json'}]],
  use: {channel: 'chrome', headless: true, offline: true, viewport: {width: 1440, height: 1000}},
  projects: [
    {
      name: 'logic-and-isolated-components',
      testMatch: [
        '**/account-security.spec.ts', '**/account-callback.spec.ts', '**/customer-login.spec.ts',
        '**/content-safety.spec.ts', '**/editorial-content.spec.ts',
        '**/hero-content.spec.ts', '**/hero-scene.spec.ts',
        '**/home-content-settings.spec.ts', '**/ingredient-index.spec.ts',
        '**/launch-readiness.spec.ts', '**/site-content.spec.ts',
        '**/product-description.spec.ts',
      ],
    },
    {
      name: 'account-input-validation',
      testMatch: '**/account-data.spec.ts',
      grep: /(?:profile edits permit only bounded name fields|address inputs reject unrelated customer fields and preserve country\/region codes|order and cursor inputs are bounded identifiers, never arbitrary query text|wishlist merges deduplicate, removals are targeted and full lists are never silently truncated)$/,
    },
    {
      name: 'backend-guards',
      testMatch: '**/backend-guards.spec.ts',
      grepInvert: /cart rejects cross-site requests and malformed bodies without upstream mutations$/,
    },
    {
      name: 'recommendation-ranking',
      testMatch: '**/product-recommendations.spec.ts',
      grep: /(?:similarity changes with the viewed product, excludes itself and ignores catalog order|generic marketing, bottle shape and a matching price do not qualify unrelated products|a matching botanical in another soap category outranks an unrelated scent in the exact category|ingredients, care purpose, merchant selections, price and availability refine recommendations|recommendations contain at most eight unique relevant items and never pad a short list)$/,
    },
    {
      name: 'saved-product-storage',
      testMatch: '**/saved-products.spec.ts',
      grep: /(?:saved handles reject malformed storage, deduplicate and enforce capacity|recent views move to the front and retain only the last 24 products)$/,
    },
    {
      name: 'indexing-guard',
      testMatch: '**/seo-readiness.spec.ts',
      grep: /only an explicitly approved production origin can be indexed$/,
    },
  ],
});
