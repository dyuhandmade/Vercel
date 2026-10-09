# Frontend handover audit

Audited October 4, 2026 against the current local storefront and the published catalogue. This pass used isolated Chrome contexts, without the merchant's signed-in browser. Cart, checkout, and account form regression tests mock their write endpoints; the route crawl blocks API writes and authentication redirects. No Shopify content, customer details, orders, inventory, or payment settings were changed by this audit.

## Route and viewport coverage

The read-only crawl checked **77 routes at 320, 390, 768, and 1440 pixels: 308 page layouts**, plus five missing-route recovery cases. It followed internal navigation and scrolled pages to exercise lazy content. The full route list, measurements, and HTTP results are in [audit.json](../qa/frontend-handover/audit.json); the repeatable runner is [frontend-handover-audit.mjs](../qa/frontend-handover-audit.mjs).

| Route family | Routes | Coverage |
| --- | ---: | --- |
| Home, shop, story, making, ingredients, journal, contact, FAQ | 8 | Every page at all four widths |
| Product detail | 27 | Every published product at all four widths |
| Collection detail | 1 | `/collections/frontpage` at all four widths |
| Ingredient detail | 23 | Every generated ingredient route at all four widths |
| Journal articles | 6 | Every published article at all four widths |
| Account | 6 | Overview, orders, profile, addresses, wishlist, history in the guest state |
| Cart and search | 2 | Empty bag and search recovery at all four widths |
| Policies | 4 | Privacy, terms, shipping, accessibility at all four widths |
| Missing routes | 5 additional | Unknown top-level, product, collection, ingredient, and journal routes |

Across the 308 layouts, the stable-source crawl found **no horizontal overflow, broken internal navigation, broken rendered images, missing rendered image alt attributes, unnamed visible form controls/buttons, broken local anchors, or browser runtime errors**. All 77 existing routes returned HTTP 200. These are specific automated checks, not a claim of complete WCAG certification or a substitute for screen-reader testing.

The crawl also found missing descriptions on the collection and 23 ingredient pages. Those template fallbacks were corrected afterward. The full crawl JSON retains those original findings; [metadata-recheck.json](../qa/frontend-handover/metadata-recheck.json) records the subsequent **24/24 passing** description, status, preview-robots, and canonical checks, with zero browser errors. A separate regression checks the previously empty Moringa product description as well. Metadata fallback wording does not replace missing merchant-authored product information.

Screenshots in [frontend-handover](../qa/frontend-handover/) include desktop and phone views of the home page, shop, product, journal, account, cart, and ingredient index. Visual inspection covered core landing/product/journal layouts and the empty bag; prior account-specific images in [account-ui](../qa/account-ui/) cover overview, orders, order detail, profile, addresses, wishlist, and history at 1440/390 pixels. The journal's “A pause for perspective.” heading fits one line on a wide desktop and wraps at narrower widths while preserving its emphasized styling.

## Fixes completed

- Prevented an older cart fetch from overwriting a successful add. In-flight mutations invalidate stale reads; refreshes do not race a mutation. A successful cart-load retry clears the prior recoverable error.
- Removed Shopify's internal “Default Title” option from single-option product purchase forms. Real option labels use the catalogue's option names, and options are disabled during a pending add.
- Added explicit production-indexing controls. Indexing requires production mode, demo mode off, `SITE_INDEXING_ENABLED=true`, and a stable HTTPS origin. Local, temporary tunnel, and invalid origins stay `noindex, nofollow`, omit canonicals and product structured data, disallow crawling, and return no sitemap URLs. Eligible production sitemaps now include ingredient detail pages.
- Added neutral metadata-description fallbacks for products, collections, and ingredients when their merchant summaries are absent. Ingredient heading text retains accessible spacing between its name and subtitle.
- Preserved the account fixes from the implementation pass: private content clears on session expiry/sign-out, cross-tab logout invalidates saved account state, address last names are optional, and email-only Shopify display names no longer become oversized welcome headings. Profile email/phone changes remain with Shopify's hosted account portal.
- Updated regression locators to target the active `#main` content instead of temporary streamed DOM copies. Carousel quick-add tests identify the actual add button rather than the newly added wishlist button, while retaining physical-coordinate clicking and hit-target assertions.
- Guarded all 15 legacy illustrative-catalogue tests in `storefront.spec.ts` with the runtime `/api/health` mode. They explicitly skip outside demo mode, preventing fixture cart actions from reaching the live Shopify store. Their source and demo coverage are preserved.

## Interaction verification

Product-description follow-up: the Storefront adapter now reads Shopify's [`descriptionHtml`](https://shopify.dev/docs/api/storefront/2026-07/objects/Product) into optional display paragraphs. Paragraphs, headings, attributed `<br>` tags and list items retain visible boundaries; the original plain `description` used by metadata/search remains unchanged. Both the long product description and its existing guidance fallback render separate escaped React text paragraphs with `white-space: pre-line`. No raw HTML is inserted, no merchant copy is rewritten, and missing/unusable HTML falls back to the original plain text.

This follow-up passed **7 pure/React-rendering regressions and 2 live layout checks at 320/1440px**, plus TypeScript. Coverage includes single-pass entity decoding, encoded markup, hidden script/style content, malformed numeric entities, ordered-list start/value attributes, literal comparison characters in plain fallback and untruncated long descriptions. Screenshots of the real product list description were visually checked for wrapping and paragraph separation: [phone](../qa/handover/product-description-320.png), [desktop](../qa/handover/product-description-1440.png). Results are in `qa/handover/rechecks/product-description`. Shopify's local versioned schema validated the new field; this agent did not build/restart the production preview or alter Shopify content.

The following **72 distinct frontend regressions passed on their latest local audit execution**, assembled from the initial run and targeted repairs/rechecks. This is not an uninterrupted green full-suite claim. The root handover owns the final repository-wide suite and production-build receipt.

| Test file | Checks | Main behavior |
| --- | ---: | --- |
| `account-checkout.spec.ts` | 4 | Guest/signed-in handoff, pending locks, failure/retry, incomplete-response recovery |
| `account-views.spec.ts` | 5 | Guest screens, paginated orders/detail, profile, addresses, immediate expiry clearing |
| `editorial-pages.spec.ts` | 7 | Philosophy keyboard controls, story accordion/anchors, ingredient discovery, journal filters/search, responsive layouts |
| `hero-hydration.spec.ts` | 1 | Homepage carousel hydration and reduced-motion controls |
| `mobile-menu.spec.ts` | 11 | 320/390/768 layout, focus trapping/restoration, Escape, navigation, landscape scrolling, reduced motion |
| `product-card-cart.spec.ts` | 13 | Quick-add, quantity, sold-out behavior, options, keyboard/pointer use, pending/error/retry, stale-read protection |
| `product-gallery.spec.ts` | 17 | Photos, thumbnails, autoplay, reduced motion, model presentation, phone/landscape/resize behavior |
| `saved-products.spec.ts` | 9 | Guest persistence, account merging, logout isolation, errors/capacity, recent-history clearing |
| `catalogue-handover.spec.ts` | 2 | URL-persistent filters/sorting, empty search recovery, header search keyboard/focus behavior |
| `seo-readiness.spec.ts` | 3 | Origin/indexing gate, preview robots/canonical/sitemap/JSON-LD, metadata fallbacks |

The collection hero's image-failure retry regression also passed its focused recheck after active-content locator scoping. TypeScript checking (`npx tsc --noEmit`) passed after the final metadata changes.

### Failures and rechecks

The first 64-test frontend batch finished **57 passed / 7 failed**. Five failures involved selectors resolving temporary Next streamed copies; two physical-pointer tests targeted the wishlist button after that feature added a new first button. These were corrected without weakening the intended interaction assertions. The affected 33-test batch then passed 32 checks; its new cart-retry fixture initially failed because React Strict Mode performs more than one initial read. The fixture now holds all initial reads in the failed state until the shopper explicitly retries, and the focused retry passed.

During the root's later full-suite run, the journal test recorded 12 baseline articles from streamed copies and six actual articles after reset. Scoping to `#main #journal-stories` and awaiting the first visible card resolved this; URL topic/search persistence and reset checks still run. The collection photograph retry similarly now targets the visible active hero. Focused editorial/SEO/pointer rechecks passed **6/6**, with output retained under [rechecks/editorial](../qa/handover/rechecks/editorial/).

One original-carousel pointer test in the root's development-server run recorded **“Internal Next.js error: Router action dispatched before initialization.”** The add-to-bag action itself succeeded, but the runtime-error assertion correctly failed. Both pointer cases then passed unchanged, followed by three further repeats each (**6/6**, [rechecks/carousel-pointer](../qa/handover/rechecks/carousel-pointer/)). An independent agent also ran the original and loop-copy physical-pointer tests against the existing production server: **2/2 passed**, with cart writes mocked and no runtime/hydration errors ([latest production receipt](../qa/handover/rechecks/final-production/.last-run.json)). Review found no custom router call or server action in the carousel, card quick-add, cart mutation, or dialog-opening path. The message comes from Next's internal null-dispatch guard; navigation, history restoration, and development HMR can reach that guard. The original receipt retained only the message, so this audit cannot establish its caller or conclusively label it a development-only issue. The assertion remains active and now retains full error stacks if it recurs. The targeted follow-up found no reproducible application defect warranting a code change; no framework patch, arbitrary delay, or error suppression was introduced.

The independent production-server pointer check passed **2/2** against the built preview on port 3001, with no runtime or hydration errors and intercepted cart writes. Its configuration and results are in `qa/handover/playwright.production-pointer.config.ts` and `qa/handover/rechecks/production-pointer`. This does not establish the original error's root cause; keep the stack-capturing assertion and recheck on the final deployment.

The root delegated additional homepage and closing-journal test rechecks to the other audit agents: homepage philosophy/ingredients passed **14/14**, ritual moments **12/12**, and closing-journal layout **7/7**. They corrected active-page/streaming readiness without weakening the geometry, keyboard, pointer or error assertions. The 15 explicitly demo-only legacy tests are excluded in live mode; they must be run with demo fixtures if that mode is released.

## Recovery, launch conditions, and remaining checks

The final description-formatting build was produced and the existing production preview restarted. The original and loop-copy pointer checks plus the 320px and 1440px product-description layout checks passed **4/4**, without runtime errors and with cart requests mocked. This final combined run is recorded in `qa/handover/rechecks/final-production` and the root verification receipt. All 12 anonymous preview/security checks also passed after restart. No live payment or order was performed.

Unknown top-level routes returned 404 with recovery navigation. Four nonexistent dynamic product/collection/ingredient/article paths rendered the correct not-found state and shop link with a streamed 200 response. This matches the installed Next.js convention documented in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md`: streamed not-found responses use 200, non-streamed responses use 404.

The frontend is still a preview until its deployment uses the approved stable HTTPS origin and the indexing flag is deliberately enabled. The indexing gate prevents the localhost/temporary tunnel from advertising itself as the canonical shop; it does not configure DNS or deploy the site.

The root's separate live checkout audit reached Shopify's “This store isn’t set up to receive orders yet” state on the store's Pause and Build plan. **A working storefront and checkout handoff do not mean payments or ordering are enabled.** Merchant activation, approved shipping/refund/terms policies, stock decisions, and a properly authorized end-to-end test order remain launch requirements; see [audit-content.md](audit-content.md) and the root's operational handover. No payment was submitted by this frontend audit.

Authenticated UI scenarios here use representative API fixtures; the root owns the real Shopify login/checkout checks. Physical iOS/Android devices, Safari/Firefox, a full assistive-technology audit, real payment completion, and real order/fulfillment lifecycle behavior were not independently certified by this pass.
