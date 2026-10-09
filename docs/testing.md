# CI and storefront acceptance

Routine CI and connected-store acceptance are separate. The live catalogue currently has products and account settings that are not present in the illustrative demo catalogue. Running every storefront test with `DEMO_MODE=true` is therefore not a meaningful CI configuration.

## Default pull-request CI

[check.yml](../.github/workflows/check.yml) uses Node.js 24 on Ubuntu, installs the lockfile, runs TypeScript checking and five deployment-health-probe tests, builds the application in demo mode, installs Chrome, then runs these two groups:

| Command | Checks | Dependencies |
| --- | ---: | --- |
| `npm run test:core` | 93 | Supplied fixtures and source files; no Next server, Shopify, dotenv, or account configuration |
| `npm run test:ci-browser` | 9 | The just-built local demo app; account writes are mocked and anonymous API requests are rejected before commerce mutations |

No Shopify secrets are supplied to the workflow. Demo mode is explicit and indexing is disabled. CI does not run the legacy illustrative-product acceptance cases, real login redirects, or tests that depend on particular live products, inventory, images, or editable shop content. Reports are retained as the `core-test-results` workflow artifact even after a failure. Assertions in the existing test files are unchanged.

The core runner does not load dotenv. It removes inherited Shopify, Customer Account, and public-origin configuration and supplies a known test environment. Known credential fields are explicitly blanked to override local dotenv files if the separate browser group starts Next. Core browser contexts are offline, use `page.setContent` with real React-generated markup and local CSS, and have neither a `baseURL` nor `webServer`.

## Exact core coverage

[playwright.core.config.ts](../playwright.core.config.ts) explicitly selects these checks. Mixed files use named projects and title filters to keep their pure tests without selecting their running-app scenarios.

| Test source | Selected checks |
| --- | ---: |
| Account callback flow, rejection ordering and safe diagnostics | 8 |
| Account redirects/origins, PKCE, session encryption, JWT signature and claims | 10 |
| Temporary login destination availability, timeout, anonymous probes and canonical redirects | 7 |
| Content URL/image/rich-text validation and field precedence | 6 |
| Editorial image markup, article content and ingredient presentation | 4 |
| Hero content inheritance, slide ordering, artwork and product references | 4 |
| Hero selection, botanical naming and model/layout bounds | 6 |
| Homepage order, journal cards, ritual configuration and branding | 5 |
| Ingredient-index identity and data mapping | 5 |
| Launch configuration and redacted failure reporting | 3 |
| Isolated hero/craft markup, reduced-motion CSS and long-copy layouts | 9 |
| Profile/address/order/cursor/wishlist input validation | 4 |
| Readiness, byte limits, malformed JSON, cart input, stored wishlist and webhook HMAC | 7 |
| Recommendation ranking, relevance and result bounds | 5 |
| Saved/recent-product storage normalization | 2 |
| Production origin and search-indexing gate | 1 |
| Product-description paragraphs/lists/entities, plain fallback and actual React text escaping | 7 |
| **Total** | **93** |

The separate [CI browser config](../playwright.ci-browser.config.ts) retains five fully mocked account-screen tests: guest/narrow-screen states, orders/pagination/detail/tracking, profile save, session-expiry clearing, and address create/edit/default/remove. It also retains four API-boundary tests for anonymous/cross-origin access, forged cookies, empty-bag checkout, and cart rejection. In demo mode cart mutation routes return 409 before parsing a commerce body; the detailed byte-bound/body-validation checks are independently covered by the core tests, while the real-mode HTTP parsing branch remains acceptance coverage.

## Local commands and acceptance

Run the deterministic checks without an app server:

```sh
npm ci
npx playwright install chrome
npm run typecheck
node --test deploy/healthcheck.test.mjs
npm run test:core
```

`npm run test:ci-browser` normally starts the existing production build on port 3000 and refuses to reuse a listening server. Build that app with demo mode enabled first. It does not create a build itself. For a controlled local check of these mode-independent cases against an already running server, set `DYU_CI_REUSE_SERVER=true`; CI deliberately ignores that option. This local reuse verifies the selected cases against that server, not a fresh demo deployment.

Run connected-store browser acceptance explicitly with `npm run test:acceptance`. The existing `npm test` command remains an alias for the full Playwright suite for compatibility; it is **not** the default CI command. The full suite uses [playwright.config.ts](../playwright.config.ts), expects the locally configured store, and reuses the development server outside CI. Keep fixture interception in place. Real OAuth tests require the intended account configuration and can follow a configured public callback origin; this is distinct from the core security tests. The 15 legacy illustrative-product tests run only in deliberate demo mode and skip against a live shop.

A green CI result does not verify real Shopify login, customer data, live product availability, 3D reconstruction from Shopify photos, payment, order creation, fulfillment, or merchant-authored page content. Those remain separate acceptance checks described in [audit-frontend.md](audit-frontend.md), [audit-backend.md](audit-backend.md), and [HANDOVER.md](../HANDOVER.md). Do not run broad fixture-dependent acceptance against an arbitrary merchant environment just to reproduce CI.

## Verification receipt

On October 9, 2026, all 93 core tests and the production build (including TypeScript) passed after adding the expired-preview login guard. The focused live `account-auth-routes.spec.ts` test passed against the local server and replacement HTTPS preview. Browser verification completed the sign-in redirect and returned to the authenticated account dashboard using an existing Shopify customer session.

On October 4, 2026, the 86-test core group passed with inherited shop/account configuration removed, offline browser contexts, and no Next server started or used. This includes seven new description-formatting and escaping checks. The two description layout checks that visit a real product at 320/1440 pixels remain outside core CI. All nine selected app/API cases passed against the existing local server using the explicit reuse option; no server was built or restarted by this CI-validation pass. Five health-probe tests and TypeScript checking passed. See [ci-verification.json](../qa/handover/ci-verification.json).

The initial pass used Windows and Node.js 25.2.1. A subsequent pass explicitly invoked the existing bundled **Node.js 24.19.0** on Windows: **86/86 core tests passed with zero failures/skips**, TypeScript `--noEmit --incremental false` passed, and **5/5 deployment-health-probe tests passed**. The core runner spawned Playwright with the same Node 24 executable, removed inherited Shopify/account configuration and kept browser contexts offline. Its [JSON result](../qa/handover/rechecks/node24-core/results.json) records the run. This follow-up installed nothing, changed no application files, used no Next server and performed no build/restart.

**A clean Linux Node.js 24 dependency install/build, actual hosted GitHub Actions execution and a fresh secret-free CI demo server remain unverified.** The nine selected app/API cases above were not rerun under Node 24. Final-host TLS, proxy and deployment acceptance also remain separate. The current production application build was verified previously under the workstation runtime; the Node 24 follow-up establishes local core/type compatibility, not a production build or deployment on the target platform.
