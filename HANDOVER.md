# DYUhandmade — project handover

Audit date: 4 October 2026. This repository contains the Next.js storefront and its API backend. **The project is prepared for technical handover; live selling is blocked by merchant and deployment configuration.** The Shopify store is paused, and a completed payment/order has not been verified.

**9 October sign-in repair:** the original temporary tunnel had expired. Its replacement origin and matching Shopify callback/logout/origin registrations are recorded in [customer account setup](docs/customer-account-setup.md). The local sign-in button now completes authorization and returns to the authenticated dashboard. The login route also checks temporary destinations before redirecting; 93 core tests, the production build and the live redirect test passed. This remains a temporary preview, with permanent hosting still outstanding.

## Start here

| Guide | Purpose |
| --- | --- |
| [Provisional Project Handover Report](output/pdf/DYU-Provisional-Handover-Report.pdf) | Detailed illustrated record of delivered work, verification, editing guidance and pending final acceptance |
| [Remaining steps (one-page PDF)](output/pdf/DYU-remaining-steps.pdf) | Simple owner checklist for the remaining launch decisions |
| [README](README.md) | Local setup and the detailed Shopify content editing map |
| [Razorpay setup](docs/razorpay-setup.md) | Official gateway connection, test mode, reconciliation, refunds and rollback |
| [Customer account setup](docs/customer-account-setup.md) | Login client, callback/logout URLs, encrypted session configuration and troubleshooting |
| [Production deployment](docs/deployment.md) | Single-process hosting, proxy/service templates, health monitoring, cutover and rollback |
| [Backend audit](docs/audit-backend.md) | API/security review, data storage, fixes and architecture limits |
| [Frontend audit](docs/audit-frontend.md) | Routes, responsive checks, interactions, accessibility and SEO |
| [CI and acceptance testing](docs/testing.md) | Secret-free CI coverage, mocked account checks and separate connected-store acceptance |
| [Content audit](docs/audit-content.md) | Catalogue completeness and Shopify editing coverage |
| [Shopify audit receipt](qa/handover/shopify-audit.json) | Redacted live store settings and the no-charge checkout attempt |

## Current acceptance status

- Live passwordless Shopify sign-in and account overview, orders, profile, addresses and wishlist pages were verified. The account used for the live check had no previous orders. Profile/address changes and order rendering also have isolated automated tests; these are not proof of a live payment.
- Live wishlist add, persistence after full navigation, and removal were verified against Shopify using the signed-in test account. The original empty wishlist was restored.
- Live test bag: one Oriental Lavendar soap, quantity 1, subtotal INR 449. The fresh server checkout handoff reached Shopify. Shopify displayed **“This store isn’t set up to receive orders yet.”** The test item was removed afterwards. No order was submitted, no payment details were entered and no charge was made.
- After backend hardening, the production build also passed add, update from quantity 1 to 2 (subtotal INR 898), fresh checkout handoff and removal. The final bag is empty. Shopify's same setup blocker prevented purchase completion.
- Shopify Admin reports **Pause and Build at INR 680/month**, not a development store. Shopify disables purchases on this plan. The plan selector offered Basic at INR 1,994/month, with no free selling option shown. No plan change was submitted; the amount/proration payable at confirmation was not inspected. See `qa/handover/plan-options.jpg`.
- Razorpay is **not activated or payment-tested by this audit**. The storefront already uses the Shopify checkout route supported by the official All-in-one Razorpay Payment Gateway. The merchant connects their Razorpay account in Shopify; this integration does not use API keys in Next.js. Do not add an independent payment modal that bypasses Shopify totals or order creation.
- The current host is a temporary HTTPS preview on this computer. It is not permanent hosting. Search indexing now requires an explicit launch flag and a stable HTTPS origin.
- Follow-up after owner email verification: Shopify admin access succeeded, the store display name was changed from “My Store” to **DYUhandmade**, and native Contact information was published using the existing public store email, phone and address. Legal entity details were preserved. The automated privacy policy remains enabled. See [admin-followup.json](qa/handover/admin-followup.json).
- The user excluded Razorpay from follow-up work. No payment-provider installation, activation or configuration was performed.
- Shopify Brand settings now reuse the storefront's existing default logo, forest/cream colours, slogan and short description. The saved settings are recorded in `qa/handover/admin-followup.json`; no new product claims or legal text were introduced.
- The site's `brand` content entry now references that same uploaded Shopify logo, with an image alt label. The image can be replaced through Shopify content editing; Admin and Storefront API verification passed. See `shopify/handover-cleanup/presentation-brand-receipt.json`.
- The existing `frontpage` collection now displays as **Featured collection**, with a factual introduction and its sole member's existing Damask Rose photograph. The preview renders the native Shopify fields correctly. Its handle, membership, publication and sorting were preserved.
- Live catalogue follow-up corrected four title-spacing fields and three description-punctuation fields across six products, filled all 154 previously empty native image alt labels, and corrected two related short-story fields. Fresh Admin and Storefront reads verified the changes, with product handles, prices, inventory and image ordering preserved. Image labels identify the product and gallery position; they are not a visual description of each scene. Backups and execution receipts are in [shopify/handover-cleanup](shopify/handover-cleanup/).
- Product descriptions now preserve Shopify paragraph, list and attributed line breaks as escaped display text. Final production build and TypeScript passed, followed by both 320px/1440px description checks, both carousel pointer regressions and all 12 anonymous preview checks. The existing HTTPS preview was refreshed; no permanent deployment occurred.

## Launch gates — owner/deployer must complete

| Gate | Current evidence | Required action |
| --- | --- | --- |
| Shopify selling plan | Paused; checkout explicitly blocked | Owner selects an active plan in Shopify Settings → Plan. No plan was purchased in this audit. |
| Payment gateway | Not activated; Razorpay excluded from current work by the user | Owner handles gateway setup separately. Verify test mode visibly before any test payment and keep it enabled until acceptance passes. |
| Full test purchase | Blocked at Shopify checkout | Run the no-charge matrix in the Razorpay guide: success, failure, cancellation, duplicate submission, matching totals, Shopify order record, account history and test refund. Record actual order/payment IDs privately. |
| Stock | 1 of 27 variants available | Confirm real stock and fulfillment location in Shopify; do not invent inventory to make tests pass. |
| Shipping/tax | India Standard shipping is free; international Standard is INR 1,700 across a 28-country zone, which Shopify says needs market activation. India uses Manual Tax; prices exclude tax. | Merchant verifies intended destinations, rates, registrations and classifications. No HS codes are populated; country of origin exists for 25 of 27 variants. No tax or shipping settings were changed; destination-specific totals remain untested. |
| Policies/identity | Automated privacy policy and factual Contact information published; display name corrected to DYUhandmade | Merchant supplies approved shipping, returns/refund and terms policies and verifies legal entity details. Review the automated privacy policy against actual data handling. Template typo edits were denied by connector scope; automation was preserved. |
| Product content | Missing content detailed in content audit | Approve product descriptions, complete ingredient labels, directions, care and claims. Resolve deliberate product spellings with the merchant; keep product handles stable. |
| Permanent origin | No permanent origin configured; temporary HTTPS preview | Deploy to the chosen stable HTTPS origin; set public and account origins to the same permanent origin and rebuild. A suitable provider hostname can be used without buying a custom domain. |
| OAuth settings | Temporary preview callback/logout saved | Register `https://YOUR-DOMAIN/api/auth/callback`, `https://YOUR-DOMAIN/account`, and origin `https://YOUR-DOMAIN`; keep required existing URLs until cutover succeeds. |
| Hosting protections | Deployment provider not selected | Configure a trusted reverse proxy, request/rate limits, private origin access, monitoring and secret management. Initial supported topology: one Node process; see backend audit before scaling. |
| Search release | Indexing disabled by default | Only after launch approval, set `SITE_INDEXING_ENABLED=true` and rebuild; verify canonical metadata, robots and sitemap on the permanent domain. |

## Architecture and data ownership

| Data/function | Location |
| --- | --- |
| Pages/components, responsive layout, 3D rendering | `src/app`, `src/components`, static assets under `public` |
| Server API routes | `src/app/api`: cart, checkout, auth callback/logout, account/profile/address/orders/wishlist and cache revalidation |
| Products, prices, variants, inventory, images, collections | Shopify Storefront API backed by Shopify Admin |
| Editable content | Shopify `dyu_site_content` and ingredient/step metaobjects; product `dyu` metafields; editing map in README |
| Customers, addresses and orders | Shopify Customer Account API; scoped to the signed-in customer |
| Signed-in wishlist | Shopify customer metafield `dyu.wishlist`; guest handles merge after sign-in |
| Guest wishlist / recently viewed | This browser's local storage; recently viewed history does not sync between devices |
| Sessions | Encrypted, signed-in context-bound, HttpOnly secure cookies; no access/refresh tokens exposed to client JS |
| Payments, capture, reconciliation, refunds | Shopify checkout and the installed payment provider; no local card database or custom Razorpay order table |
| Separate database | None. Do not provision one for ordinary store operations. Multi-instance refresh coordination would require shared infrastructure or a different session design. |

## Developer setup and checks

Use Node.js 24 LTS for the CI/deployment target. The main Windows build used Node 25.2.1; a follow-up using the already-installed Node 24.19.0 passed all 86 core tests, TypeScript and five health-probe tests. See `qa/handover/rechecks/node24-core/results.json`. Linux installation/build, hosted CI and the chosen hosting environment still require validation. The lockfile is the dependency source of truth.

```sh
npm ci
# Copy .env.example to .env.local; configure credentials locally, never in source control.
npm run dev
npm run typecheck
npm run test:core
node --test deploy/healthcheck.test.mjs
# Separately, against the intended configured storefront:
npm run test:acceptance
npm run check:photo-model
npm run check:photo-solids
npm run check:photo-materials
npm run check:held-container
npm run check:held-tin-normals
npm run build
```

Default CI runs 86 deterministic core checks without a Next server, then nine mocked-account/API-boundary checks against its secret-free demo build. See [CI and acceptance testing](docs/testing.md) for exact coverage and limits. The separate acceptance suite runs against port 3000, reuses a local development server outside CI, and uses Chrome. Automated checkout destinations and customer writes are intercepted test fixtures; they do not charge a card. `npm test` retains its full-suite behavior for compatibility and is not the CI command. The 15 legacy illustrative-product scenarios in `tests/storefront.spec.ts` explicitly skip when `/api/health` reports live Shopify mode; they require a deliberately started demo server and are not part of live-store acceptance. The `scripts/verify-shopify.mjs` utility creates, updates and empties a disposable Shopify cart but never places an order. The content verification script reads live Shopify content.

`npm run check:launch` loads production dotenv configuration using Next's normal precedence and prints only check results, never secrets. It exits with failure for the current preview setup. Passing it verifies configuration shape only: the external launch gates above still require live evidence. Supported API versions must also be reviewed against Shopify's support window; a valid version string alone does not guarantee support.

## Deployment and operation

1. Follow [the deployment runbook](docs/deployment.md) for a single persistent Next.js Node process. Auth callbacks, account APIs and checkout require a server. Configure environment variables in the host's secret manager using `.env.example` as the list. Optional Nginx/systemd templates require validation on the selected host; no infrastructure has been provisioned.
2. Set `NEXT_PUBLIC_SITE_URL` and `CUSTOMER_ACCOUNT_SITE_URL` to the permanent HTTPS origin. Keep `DEMO_MODE=false`. Register matching Shopify OAuth URLs. Values beginning `NEXT_PUBLIC_` are bundled at build time; rebuild after origin changes.
3. Use a cryptographically random `CUSTOMER_ACCOUNT_SESSION_SECRET` of at least 32 bytes. Preserve it across ordinary deployments. Rotating it deliberately signs out current customers; do this if compromised. Never send it in chat, commit it, expose it with a public prefix or place it in Shopify content.
4. Keep the existing Shopify hosted checkout handoff. `SHOPIFY_CHECKOUT_DOMAIN` is only for a verified custom Shopify checkout domain. Set `SHOPIFY_BUYER_IP_HEADER` only to a header overwritten by your trusted hosting proxy; do not trust client-supplied IP headers on an exposed origin.
5. Optionally register signed product/collection/content revalidation webhooks at `/api/revalidate` with `SHOPIFY_WEBHOOK_SECRET`. No live webhook was registered during this audit. Without it, content uses the two-minute cache fallback. This endpoint is for cache invalidation, not Razorpay payment events.
6. Keep authenticated API responses private/no-store and do not CDN-cache `/api/account/*`, `/api/auth/*`, `/api/cart` or `/api/checkout`. Configure edge rate limits/body limits and HTTPS. Log safe error categories/status only; exclude OAuth codes, tokens, cookies, customer details and full checkout URLs.
7. Monitor availability, Shopify/API errors, auth failure counts and payment/order reconciliation. Re-run the test matrix after deployment and after gateway, OAuth or domain changes. A passing local build is not launch approval.

## Handover, maintenance and rollback

- Transfer repository and hosting access through their permission systems, and secrets through a password/secret manager. Keep `.env.local`, `qa/accounts/preview/`, customer records and logs private. Do not send the workstation folder as an unfiltered archive; it contains ignored credentials and temporary tooling.
- Preserve Shopify merchant edits. `shopify/backups` and seed files are historical catalogue snapshots. Never replay seed mutations blindly over current data. Export a fresh backup before any future content migration.
- Back up approved Shopify content and retain the last known-good source revision/build. Roll back the frontend build independently of merchant content. Do not roll back inventory or orders using an old content snapshot.
- Reconcile failed/ambiguous checkout attempts in Shopify/Razorpay before retrying capture or refund. A browser success redirect alone is not proof of payment; Shopify financial status and provider reconciliation are authoritative.
- If the gateway fails, disable it in Shopify after reviewing open payments; the site keeps its standard Shopify checkout path. Do not substitute unverified direct payment links. The Razorpay guide contains provider rollback details.
- Review dependency advisories, Shopify API support and this acceptance matrix at each release. The audit found zero known npm vulnerabilities at its check time, which is not a guarantee against future vulnerabilities or a substitute for a penetration test.

## Verification record

One development-server test saw Next's “Router action dispatched before initialization” error. The cart action succeeded; repeated focused tests and both independent production pointer checks passed without it. Its original caller remains unconfirmed. Full stack capture is now retained in the regression test, and the final deployment must repeat this interaction; see the frontend audit.

The audit reports linked above contain evidence and scope. Final production build and regression results are recorded in `qa/handover/verification.json`. `scripts/check-handover-preview.mjs` checks private-path exposure, anonymous account isolation, health and preview indexing without account cookies; its receipt is `qa/handover/preview-verification.json`. Remaining live scenarios are explicitly marked blocked/unverified. A real order, real payment, real refund, permanent production deployment and live gateway activation were not performed.
