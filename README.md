# DYUhandmade digital atelier

A spacious, editorial Next.js storefront with optional interactive 3D, built from the supplied PRD and TRD. The local site now reads the live DYUhandmade Shopify catalogue through the Storefront API.

**Start with [HANDOVER.md](HANDOVER.md)** for the current audit, architecture, Razorpay setup, deployment steps and launch gates. As of 4 October 2026 the Shopify store is paused: the test bag reaches Shopify, but order completion is blocked. Razorpay activation and a completed no-charge payment test remain outstanding. `npm run check:launch` checks configuration without exposing secrets; temporary previews remain excluded from search indexing.

## Run locally

**Shopify editing:** see [the website editor guide](docs/shopify-editability-guide.md). The 9 October expansion adds 299 controls for shopping/account wording, gallery behavior and navigation, plus a separate global appearance editor. Shopify now holds 460 website content entries; the original 161 entries were preserved. See [the verified migration receipt](shopify/full-editability-receipt.json).

Use a patched Node.js 24 LTS release for new setups; the installed Next.js minimum is 20.9. CI targets Node 24. See [deployment.md](docs/deployment.md) for target-host validation and [testing.md](docs/testing.md) for secret-free CI versus connected-store acceptance.

On Windows, double-click [`START_DYU.bat`](./START_DYU.bat). It checks the local setup, installs missing dependencies, starts the Next.js frontend and API routes, waits for the server, and opens `http://127.0.0.1:3000`. Keep the server window open while using the site. The explicit IPv4 address avoids Windows `localhost`/IPv6 resolution conflicts.

```sh
npm ci
# Copy .env.example to .env.local, add the store domain and Storefront token, then set DEMO_MODE=false.
npm run dev
```

Open http://127.0.0.1:3000. The current workspace has an ignored `.env.local` configured for the connected Shopify store. `npm run build` creates a production build; `npm start` serves it.

## Implemented experience

- Responsive homepage with botanical still life, generous editorial spacing, collection discovery, craft narrative, ingredient preview, and journal.
- Shop and collection pages, URL-based category/availability filters and sorting, predictive local preview search, and zero-results recovery.
- Product pages automatically build an interactive 3D study from the main Shopify photo, with accessible rotation controls, photo galleries, variants, quantities, purchase shortcut, and related products.
- Three procedural preview models: jar, dropper bottle, and soap. The hero combines all three; the craft and ingredient sections provide additional interactions.
- Static product cards; Three.js is dynamically imported for the product hero and on request in the homepage viewer. Demand rendering avoids a continuous animation loop. Reduced-motion preferences disable decorative transitions.
- Shopify cart with server-side cookie storage, quantity changes, removal, totals, focus-managed dialogs, and checkout URL. Demo mode retains a separate browser-persisted preview bag.
- Brand story, craft, ingredient atlas, journal/articles, FAQ, contact, policy, and recovery pages.
- Shopify server-side adapter for live products, collections, variants, prices, images, video/GLB media, optional story metaobjects, cart mutations, checkout URL, signed revalidation webhook, and HTTP-only cart cookie.
- Metadata, live product structured data, sitemap, robots, and preview no-index protection.

## Shopify connection

The ignored `.env.local` uses `dyuhandmade.myshopify.com`, the supplied public Storefront token, and `DEMO_MODE=false`. The token beginning `shpat_` is an Admin API credential; it is not used by the buyer-facing storefront or stored in this project. Keep all credentials out of source control.

For another environment set `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` (or a genuine `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` for server-side requests), `SHOPIFY_API_VERSION` (pinned to `2026-07`), and `NEXT_PUBLIC_SITE_URL`. Set `SHOPIFY_WEBHOOK_SECRET` when registering product or collection webhooks at `/api/revalidate`. Restart the server after changing environment variables.

The 2 October 2026 content migration verified 27 products and one collection called “Home page”. It added 10 merchant-owned product metafield definitions and three metaobject definitions. All original products, descriptions, images, prices, variants, inventory counts, taxonomy attributes, policies, pages, blogs and collections were preserved and compared after migration. Existing description excerpts seeded 26 short stories; existing Shopify ingredient attributes seeded nine ingredient records linked to six products. No making instructions, full ingredient labels or product claims were invented.

The site derives discovery categories from Shopify product types until curated collections are supplied. Product pages retain the full native description and support `dyu.short_story`, `dyu.sensory_notes`, `dyu.ingredients`, `dyu.craft_steps`, `dyu.ritual_steps`, `dyu.care_notes`, `dyu.full_ingredient_list`, `dyu.display_shape`, `dyu.tone`, and `dyu.related_products`. Usable legacy `custom` values remain supported. Blank new fields do not mask existing legacy data.

No separate 3D upload is needed: the main Shopify image supplies the silhouette and front artwork for an automatically generated closed mesh. Unseen depth and reverse surfaces are approximated, not an exact scan. Clean backgrounds produce a rounded cutout volume; complex lifestyle photographs remain a clearly labelled shallow photo relief. Additional Shopify photos keep their normal gallery views, while the 3D source always remains the main product photograph. Optional uploaded GLB and video media are still supported.

Make variants available in Shopify before live Add to bag and checkout can be exercised. `node scripts/verify-shopify.mjs` checks the catalogue and cart; when an available variant exists it also tests add, update and remove. Confirm shipping, claims, journal, contact and policy content with the merchant before public launch.

The site loads editable content from Shopify's `dyu_site_content` metaobjects. Current search is client-side over the fetched catalogue; the root passes only product names/handles/types to the search interface. Products, collections and website content paginate through Shopify.

## Editing the website in Shopify

Open **Content → Metaobjects → DYU • Website content**. This Next.js storefront reads these entries directly; Shopify's theme customizer controls a separate Shopify theme. Entries have descriptive editor labels. Keep entry handles and definitions unchanged: the handles connect each entry to its section. Save changes in Shopify; the connected website refreshes its cached content after approximately two minutes and subsequent requests. The `/api/revalidate` signed webhook expires content immediately when configured for relevant Shopify events. No webhook was registered by this migration.

| What to change | Entry / location |
| --- | --- |
| First hero picture, shared heading, description, buttons, mobile artwork, crop and autoplay timing | `home-hero` |
| Other three moving hero pictures, optional individual text/buttons, visibility and order | `home-hero-slide-2`, `home-hero-slide-3`, `home-hero-slide-4` |
| Homepage section order | `home-layout` → Short list items (section handles, in order) |
| Shop page heading and featured collection links | `shop-page` |
| Default shop hero image or 3D product | `shop-hero` → Desktop / section image, Mobile image, Selected products, Image or 3D display |
| Different hero for each product category | `shop-hero-<category>`; entries are provided for the current catalogue |
| Collection page headings, artwork and hero product | Native **Products → Collections** title, description and image; optional `collection-<handle>` overrides; `collection-page` supplies shared defaults |
| Hero 3D card, its visibility and selected products | `home-hero-preview` |
| Homepage product picks and order (up to three shown) | `home-favorites` → Selected products |
| Homepage collection picks and order (up to four shown) | `home-collections` → Selected collections |
| Homepage section headings and visibility | `home-welcome`, `home-collections`, `home-craft`, `home-ingredients`, `home-favorites`, `home-journal`, `home-reassurance` |
| Announcement, uploaded logo, navigation, footer | `announcement`, `brand` (image and image description), `nav-*`, `header-menu`, `footer`, `footer-philosophy` |
| Story slides, images and calls to action | `philosophy`, `philosophy-nature`, `philosophy-human-touch`, `philosophy-everyday` |
| Morning, evening and pause narratives | `ritual`, `ritual-*`, `ritual-*-step-*` |
| Page introductions and contact links | `story-page`, `craft-page`, `ingredients-page`, `contact-page`, `contact` |
| Questions and answers | `faq-page`, `faq-*` |
| Journal copy and images | `journal-page`, `article-*`; homepage cards use `home-journal-1` / `home-journal-2` |
| Product copy, price, stock, options, gallery photos | Native **Products** fields |
| Product ingredients, directions, care, related products and display controls | Product's **Metafields → DYU** fields |
| Shared product-page headings, purchase panel, guidance and related carousel | `product-page`, `product-invitation`, `product-craft`, `product-ingredients`, `product-purchase`, `product-guidance`, `product-related` |
| Ingredient descriptions and imagery | **Content → Metaobjects → DYU • Ingredient** |
| Ingredient atlas/detail presentation overrides, including ingredients inferred from the catalogue | `ingredient-<handle>`; `ingredients-*` and `ingredient-*` section entries |
| Our story page sections, images and onward links | `story-*` |
| Journal index, article images, chapter content and closing panels | `journal-*`, `article-<slug>`; use a line beginning `## ` for a chapter heading in article Body text |
| Making page headings, artwork and onward links | `craft-page`, `craft-journey`, `craft-products`, `craft-onward-*` |
| Reusable approved making / usage steps | **Content → Metaobjects → DYU • Making or ritual step** |
| Privacy, shipping, refund and terms policies | Native **Settings → Policies**; these take precedence on the website |

For each hero slide, select an image in **Desktop / section image**, optionally choose a different **Mobile image**, and fill **Image description**. Blank text on slides 2–4 inherits the first hero's copy and buttons. **Display order** reorders slides. On `home-hero`, **Automatically rotate hero slides** enables autoplay and **Hero slide duration (milliseconds)** accepts 2000–20000 (5000 = five seconds). Visitors can pause or choose slides; reduced-motion preferences disable autoplay. Uploaded starting artwork is illustrative and retains that description. Focal positions are left, center, right, top and bottom.

For a shop/category hero, uploading an image takes precedence over the 3D display. With no uploaded image, choose **Selected products** to control the 3D source, or set **Image or 3D display** to `image` to show its product photograph. Product galleries and photo-based models continue to use native product media. A native collection image automatically appears on its collection page unless an explicit section image overrides it. Blank category fields inherit `shop-hero`; blank collection fields inherit `collection-page` or native collection data.

Use plain text; line breaks work in heading and body fields. Local destinations such as `/shop` and HTTPS links are supported, plus valid contact links. Text is escaped, images are restricted to Shopify's CDN, and unsupported values fall back to the existing design. Blank fields restore default copy. Shopify retains entered content even where the site limits display length. CSS, scripts, font sizes and interactive structure stay controlled in code.

**Show this section** controls optional homepage sections (including the hero), the 3D card, announcement, navigation links, FAQs, editorial blocks, ingredient entries and journal entries. Core page introductions, purchase controls and essential product guidance remain available. Each generic field affects only components that use that field; 3D geometry, interaction controls and layout styling remain in code. Product/collection reference list order controls featured items. `home-layout` reorders supported homepage sections; unknown or duplicate handles are ignored, and omitted sections retain their fallback order. Use each section's visibility switch to hide it.

To add an FAQ, create an entry with a `faq-` handle, heading and body; include its handle in `faq-page` → Short list items (or clear that list to use all FAQ entries), and set Display order. To add a journal article, create an `article-<slug>` entry with heading and body; separate paragraphs with a blank line. It appears in the journal and sitemap at `/journal/<slug>`. Disabled articles are also removed from matching homepage cards. Homepage journal card copy is separately editable.

Product ingredient selections are ingredient stories, not a complete formulation label. Enter the approved complete label in **DYU full ingredient list**. Add making/ritual steps only from approved instructions. Reordering reference lists reorders their steps. Native prices, stock and checkout settings keep their Shopify behavior.

Migration sources and receipts are in `shopify/`. Original data snapshots are in `shopify/backups/`; these contain store catalogue content and should be kept private. The October 4 extension adds 95 entries (161 total) and three optional editor field definitions, and preserves all values in the original 66 website entries. See `shopify/editability-receipt.json` and `editability-*-seed.json`. `scripts/prepare-editability.mjs` only prepares a plan; it never executes writes. Its baseline is a point-in-time snapshot: always re-read Shopify and skip existing handles before applying a plan. Do not blindly rerun seed writes over later merchant edits. To undo a content change, restore its prior values using Shopify or a reviewed snapshot. The local frontend must be deployed to your existing Next.js host before these controls affect that deployment.

## Validation

```sh
npm run typecheck
npm run build
# Verify live website entries and image references (read-only, requires Shopify access):
node scripts/verify-site-content.mjs
# Isolated demo regression suite against the built app (Chrome required):
npx playwright test --config qa/playwright-content.config.ts
# Photo segmentation, mesh integrity and Shopify image sizing:
npm run check:photo-model
# Cylindrical depth, lids, closed contours and surface coordinates:
npm run check:photo-solids
# HTTP-only route, asset, anchor and local-origin diagnostics (server running):
node scripts/check-site.mjs
# With the development server running on :3000 and Chrome installed:
npm test
```

Playwright covers browse/add/persist/update/remove, rapid filter/sort changes, URL persistence, search and focus restoration, 3D controls, mobile overflow/reduced-motion, and core page routes. Tests use the explicit preview fixture, not a live Shopify store. `scripts/render-posters.mjs` regenerates static product posters using the local `/model-preview` development-only route. `qa/` contains visual review captures.

Before public launch, finish approved merchant content, real product media, legal/support details, live Shopify QA, consent-aware analytics and field Web Vitals reporting, production monitoring, and real-device/browser/accessibility audits. The production build is verified; field performance targets are not claimed as achieved.

## Architecture and assets

- `src/app`: App Router pages, metadata, and server handlers.
- `src/components`: UI, commerce controls, progressive 3D and motion.
- `src/lib/shopify.ts`: server-only commerce and content gateway.
- `src/lib/photo-model.ts`: bounded photo segmentation, closed mesh construction and Shopify image resizing; runs in the browser without credentials or an external generation service.
- `src/lib/photo-objects.ts`: confidence-gated separation of cartons, bars and containers, excluding decorative props.
- `src/lib/photo-solid-geometry.ts`: separate rounded solids and container geometry inferred from the main photograph.
- `src/lib/photo-vessel-geometry.ts`: photo-view correction, cylindrical jar walls, circular lids and continuous material coordinates.
- `src/lib/photo-contours.ts`: simplified outlines for shaped bars, unfamiliar convex objects and flat bottles with narrow necks.
- `src/lib/photo-materials.ts`: source-guided paper, soap and container surfaces, plus targeted petal-edge repair.
- `src/components/PhotoProductModel.tsx`: original front artwork, inferred surface materials, GPU resource cleanup and render readiness.
- `src/lib/demo.ts`: explicit, illustrative development catalogue.
- `public/images/atelier-hero.webp`: AI-generated concept still life; not product photography.
- `public/images/{jar,bottle,soap}-render.png`: transparent renders of procedural preview geometry; not actual product scans.

Dependencies are pinned in `package.json` and `package-lock.json`. No external analytics or advertising scripts are active. This project is suitable for a Node-capable Next.js host such as Vercel; it is not a static export because live commerce requires server handlers. Roll back production through the host's previous immutable deployment; verify the catalogue and bag again after rollback.

Technical references: [Next.js App Router](https://nextjs.org/docs/app), [Shopify Storefront API](https://shopify.dev/docs/api/storefront/2026-07), [Shopify carts](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage).

## Shopify photo-based 3D — 2 October

Tightly cropped soap cartons: Oriental Lavendar now uses the same six-face carton and proportional depth as Damask Rose. When background segmentation cannot isolate a close crop, paper coverage on all four edges plus visible printing can recover a carton; blank frames, unrelated shape hints and promotional layouts retain the fallback. All 13 individual soap images in the catalogue now infer solid parts. Validation: 29 image checks, 11 geometry checks and the production build pass; browser rotation confirms Lavender's side thickness (`qa/oriental-lavender-depth.jpg`).

Current reconstruction refinement: pale carton/shaped-soap pairs now use separate outlines, including hexagons and unfamiliar convex forms. Cylindrical jars use complete walls, circular lids and bases, with the photographed ellipse corrected for viewing angle. Their actual glass, powder and lid textures continue around the circumference; grazing-angle samples exclude the backdrop. Carton reverses have folded-paper structure and a lower accent only when supported by the front photograph. Flat oil bottles preserve their neck/cap outline and exclude surrounding props. Unknown Shopify product categories use `general` instead of being forced into jar geometry.

Validation for this refinement: 22 image-inference regressions and 10 geometry checks pass, including closed meshes, circular depth, lid planarity, empty Haze corners and an unfamiliar asymmetric outline. Production build and TypeScript pass. Browser review confirms Haze front/back and 390px mobile rotation without page overflow, plus the rebuilt jar front/side/rear and the isolated Rosemary bottle. The final jar side retains wall detail without the white backdrop seam or stretched sampling strip. The 27-image catalogue audit is reproducible with `node qa/audit-catalog/run-audit.mjs`. Complex or tightly cropped photographs retain a labelled photo-relief/silhouette fallback; this is an approximate single-image reconstruction, not a guarantee of exact hidden dimensions or printing. Latest visual evidence uses `qa/haze-*` and `qa/ubtan-*`.

The product hero now opens the image-derived model automatically. Its main-photo source stays stable while shoppers browse additional media. The homepage's live 3D dialog also uses Shopify products, with a product selector and links to their detail pages. Processing is capped at a 192-pixel segmentation grid and a 1024-pixel texture; geometry is closed with smoothed edges, original front artwork, and inferred unbranded sides. Promotional captions and complex scenes use the labelled photo-relief path. No image is uploaded to an external model-generation service.

Validation: production build and TypeScript passed; all 8 photo-model regressions passed; HTTP diagnostics passed for 44 pages, 63 assets and 208 anchors. In-app browser checks covered automatic generation, bottle/jar/soap imagery, pointer drag, rotation buttons, close/reopen and focus restoration, main-photo identity after thumbnail changes, homepage selection, promotional-photo relief, and 390px mobile layouts. Screenshots are in `qa/shopify-photo-3d-desktop.jpg`, `qa/shopify-photo-3d-mobile.jpg`, and `qa/shopify-photo-relief-mobile.jpg`. Exact back-surface reconstruction is not claimed. The existing standalone Playwright suite was not rerun.

## October refinement

Photo-model material refinement (2 October): confident product photos now produce separate carton/bar solids, cylindrical bottles and shallow tins. Decorative petals and cast-shadow tails are excluded; a boundary-connected repair replaces petals over an otherwise uniform soap edge using nearby soap texture. Cartons retain pale paper, fold seams and sharper edges; bars retain their own colour and grain; bottles keep cap/body colours; silver tins use a complete body and lid. Original front artwork remains sourced from the Shopify main image. Ambiguous photographs retain the existing silhouette/photo-relief fallback. Unseen printing is not fabricated and the approximation caption remains visible.

Validation: all 16 photo-model regressions and the production build (including TypeScript) pass. Browser review covers Damask Rose front/back and 390px mobile, Moringa bottle cap/body, and the shallow Rose body-butter tin. Current captures use `qa/shopify-solid-*`. The existing full commerce suite was not rerun for this geometry/material change.

Reviewed the PRD's embedded concept gallery and palette, the TRD, and all 15 rendered pages of `The_Digital_Atelier.pdf`. Kadam Haat informed category discovery and editorial pacing; no third-party designs or product assets were copied.

- Palette now matches the PRD tokens: ivory `#F4F0E6`, beige `#E7DFD0`, sage `#98A68D`, olive `#7E8665`, forest `#25382C`, terracotta `#C77C5D`, walnut `#60483B`, charcoal `#292721`.
- Added a floating glass navigation shell and collection panel, photographic landing composition, subtle pointer depth, and an on-demand three-object 3D dialog.
- Rebuilt the product journey around origin, making, botanicals, ritual, and final purchase. Chapter navigation and a contextual purchase shortcut support returning shoppers.
- Added a keyboard-operated craft narrative and tap-operated botanical atlas. The new generated botanical still life is illustrative; it does not establish product ingredients or manufacturing claims.
- Updated journal, ingredient, craft and contact pages; connected the user-supplied WhatsApp catalogue URL in homepage, product, contact, and footer links. WhatsApp redirected the catalogue request to its home screen, so catalogue contents were not imported or verified.
- Refined amber vessel geometry, wood-grain lid materials and static model posters. Current posters are `public/images/{jar,bottle,soap}-atelier.png`. The development-only `/model-preview?shape=jar` route includes a poster export button; production returns 404 for this utility.
- Verified 320px and 390px mobile layouts without horizontal page overflow, plus 1440px desktop views. In-app browser checks covered collection menu Escape/focus, search results/focus restoration, filtering/sorting, craft keyboard navigation, atlas selection, 3D open/rotate/close and deferred loading, and preview bag add/update/persist/remove. Production build and TypeScript checks pass. The current live Shopify status is documented above.

Current visual-review captures use the `qa/refined-*` prefix. Existing Playwright scenarios were updated for the new story page and extended with the homepage lazy-3D/story interactions; this refinement was exercised through the in-app browser rather than rerunning the standalone Playwright suite.

Final source review (2 October): removed unnecessary craft-image remounts; added descriptive craft-tab names and focusable panels; contained the manifesto photograph's stacking layer; made catalogue menus scroll and ingredient controls wrap; and mapped real ingredient imagery instead of positioning live ingredient names over a concept photograph. Typecheck and production build were repeated after these corrections. Browser security policy blocked reopening localhost in the final session, so these last source corrections have not received an additional visual pass; the earlier in-app interaction checks and captures remain the browser evidence. The standalone Playwright suite was not rerun in this refinement.

Interaction repair (2 October): the launcher uses `127.0.0.1`, which must be included in Next's `allowedDevOrigins`. Product-page client scripts previously returned 403 with that origin; all 18 now return 200. The cart handler also uses the incoming Host for its same-origin check because Next normalizes loopback URLs internally. Missing and cross-site origins remain rejected. Mobile navigation now closes when selecting the current page; resetting filters preserves the search query; search fields synchronize with navigation; and failed 3D views offer a poster, explanation and retry instead of inactive rotation controls. Atelier mode identifies its illustrative still-life image.

The HTTP diagnostic passes for 27 page URLs, 54 assets, 70 section links, script-origin checks, missing-product recovery and preview cart API behavior. Regression specs now cover atelier/object/3D switching for all three model shapes, search reset/history and mobile same-page navigation, using the launcher's IPv4 address. Browser security policy still blocks preview interaction in this session, so these new browser specs are not claimed as executed. To see the repaired client code, reload the page at `http://127.0.0.1:3000` (Ctrl+Shift+R if an old page remains open).

## Connected editorial journey — 2 October

Revisited the full PRD including its requirement tables and embedded concepts, the TRD, the Digital Atelier overview and the Kadam Haat ambience reference. The home now moves from an atmospheric entrance and photographic collection discovery into the human touch, botanical details, a quiet everyday ritual, and product discovery. The product identity and gallery remain familiar; a new server-rendered `ProductStory` carries the rest of the narrative through origin, making, ingredients, ritual, support reassurance and purchase. Repeated double headings and isolated panel treatments have been removed from these sequences. A shared ivory/sage ground, overlapping editorial compositions, chapter hand-offs and distinct imagery connect the reading experience. The shop entrance uses the same visual direction with direct collection links.

`src/app/story.css` contains the responsive refinement, including static fallbacks for scroll-linked image motion and reduced-motion overrides. Heavy 3D remains on demand. New locally optimized concept imagery is saved as `public/images/atelier-craft-v2.webp` and `public/images/atelier-ritual-v2.webp`; full generation prompts and provenance are in `qa/story-refinement-assets.txt`. These are explicitly illustrative, not real maker/customer documentation. No reviews, formulation claims or production facts were added. The current live Shopify status is documented above.

Validation: production build and TypeScript pass. HTTP crawl passes for 27 page URLs, 58 assets and 89 section links, plus existing cart/origin/recovery diagnostics. The in-app browser inventory still reports connection-error documents, so the new layout has not had a fresh rendered desktop/mobile or interaction pass; earlier screenshots do not represent this revision.
