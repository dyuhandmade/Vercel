# Catalogue, content, and Shopify editability audit

Initial audit: October 4, 2026 against the live Storefront API for `dyuhandmade.myshopify.com` and the current repository. That initial pass used read-only product, collection, policy, and website-content queries. Storefront availability is a snapshot, not an inventory count or proof that the store can accept payment. The original findings and counts below are retained as historical evidence; the approved follow-up records the changes completed later that day.

## Approved follow-up: current results

- Corrected **four title-spacing fields and three description HTML fields across six products**, preserving handles and native HTML tags. Added identity-based alt text to all **154 previously empty native image fields**. A separate approved follow-up corrected **two `dyu.short_story` fields** using Shopify's atomic compare-digest protection: the truncated Sandalwood introduction now copies its corrected existing native first sentence, and Tea Tree Trip's introduction removes one space before a full stop.
- Fresh Admin reads verified every targeted value. Before/after comparison confirmed unchanged product/variant identities, handles, prices, inventory quantities, status/tags/vendor/type, image URLs, and gallery order. The final Storefront read reports 27 products, 154 images, no empty image alt values, and no title/alt/short-story mismatches. No cleanup mutation created a cart, order, charge, new claim, or legal policy.
- The image text is a conservative product-identity baseline, not individually authored scene descriptions. Branded `Lavendar` spellings and `Trip`/`Trips` naming remain unchanged. Moringa's missing description, intended availability, complete approved product information, category structure, and shipping/refund/terms policies remain merchant decisions.
- The parallel signed-in Admin follow-up changed the store display name from `My Store` to **DYUhandmade**, with the legal entity unchanged. Native **CONTACT_INFORMATION** was published using already public store contact details. Admin verification now reports published contact information plus the automated privacy policy. Shipping Policy, Refund Policy, and Terms of Service were not added. See [admin-followup.json](../qa/handover/admin-followup.json).
- Privacy remains **Published and Automated**. A separate proposed correction of two literal template typos was denied because the connector lacks `write_legal_policies`; no custom privacy content was applied. Automation and permissions were preserved. The automated UI preview differs from the API body, so the proposal must not be replayed without a fresh read and merchant policy review. See [privacy-result.json](../shopify/handover-cleanup/privacy-result.json).
- Native HTML already contains paragraph and `<br>` separators for checklist/Skin Type/Best For content. The frontend fix renders those breaks as escaped text and passed seven helper/React-rendering tests plus two product-layout checks at 320px and 1440px, with TypeScript passing. The native cleanup retained the HTML structure. The final production build, preview restart and both production layout checks also passed.

Exact changes, backup/rollback instructions, and exclusions are in [content-cleanup-plan.md](content-cleanup-plan.md). Machine-readable results are in [execution-receipt.json](../shopify/handover-cleanup/execution-receipt.json), [short-stories-after.json](../shopify/handover-cleanup/short-stories-after.json), and [storefront-final.json](../shopify/handover-cleanup/storefront-final.json).

## Initial read-only findings

| Priority | Fact at initial audit | Recommended merchant action |
| --- | --- | --- |
| Before selling | The store is on Pause and Build, as confirmed separately by the connected Shopify shop information. | Choose an eligible selling plan when ready; follow [razorpay-setup.md](razorpay-setup.md). Do not interpret a functioning product page as checkout activation. |
| Before selling | Only **1 of 27 variants** reports `availableForSale`: Oriental Lavendar Cold Processed Soap. The other 26 are unavailable. | Confirm which products should be offered, inventory, publication/channel settings, and availability in Shopify. Do not bulk-enable products merely to make the UI look stocked. |
| Before selling | Shipping Policy, Refund Policy, and Terms of Service are absent in the live Storefront response. Privacy Policy is populated. | Supply approved policies through **Settings → Policies**. Current shipping/terms pages fall back to asking customers to contact DYU; those are not completed merchant policies. |
| Content completion | Moringa Facial Oil has neither a native description nor a `dyu.short_story`. | Supply the approved description and optional introduction in Products. The frontend audit adds neutral SEO fallback wording, which does not fill the product's missing information. |
| Content completion | All **154 native product images** have empty Shopify alt text. Every product has at least one image. | Add concise descriptions distinguishing the main product, packaging, reverse label, and lifestyle views. The website supplies fallback alt labels, so this is a source-content quality gap rather than 154 unlabeled rendered images. |
| Product information | No product has a populated dedicated full ingredient list, care/storage, usage steps, making steps, or sensory notes in the supported `dyu` or legacy `custom` fields. | Populate the fields that apply using approved labels/instructions. Some native descriptions already discuss ingredients or use; do not infer complete formulas or instructions from those excerpts. |
| Navigation | Rose Reset Soap Bar and Tea Tree Trip Soap Bar have blank product types. Existing types split similar items across Facial Ubtan, Facial Cleanser, Facial Cleanser/ Ubtan, and Ubtan. | Confirm the intended category structure; set product types consistently or create curated collections. These are catalogue decisions, not spelling-only fixes. |
| Collection presentation | The only native collection remains `frontpage`. Follow-up renamed it **Featured collection**, added a factual introduction and reused its sole member's existing Damask Rose photograph. | Admin and the rendered preview verified the new presentation. Membership and handle were preserved. Any broader collection taxonomy remains a merchant decision; homepage discovery derives category links from product types. |

The parallel live handover also confirmed `checkoutApiSupported: false` and reached Shopify's message that this store is not set up to receive orders. Its temporary bag item was removed; no order or charge was submitted. The connected-store receipt is [shopify-audit.json](../qa/handover/shopify-audit.json). Payment-provider activation still requires an owner check in Shopify Payments settings; an app-installation listing alone cannot conclusively establish enabled gateways.

The existing descriptions contain product-benefit and suitability assertions, including hair-growth and baby-use language. This audit preserved that Shopify-authored content and did not verify those claims. The merchant should confirm the wording against their approved product information while completing ingredient and usage fields.

## Initial catalogue snapshot

| Measure | Live result |
| --- | --- |
| Published products visible to the Storefront token | 27 |
| Variants | 27; one per product |
| Available products / variants | 1 / 1 |
| Products with images | 27 |
| Product images | 154 |
| Images with native alt text | 0 |
| Products with native descriptions | 26 |
| Products with short stories | 26 |
| Products with referenced ingredient stories | 6 |
| Populated sensory notes, making steps, usage steps, care notes, full ingredient lists | 0 products in each field |
| Explicit related-product selections, display-shape overrides, tone overrides | 0 products in each field; code defaults remain available |
| Native collections | 1 |
| Website-content entries | 161 of 161 expected entries found |
| Website-content image references that failed to resolve | 0 |
| Website-content entries with an uploaded image | 23 |
| Website-content entries with separate mobile artwork | 0; desktop artwork currently supplies mobile fallback |

All top-level catalogue/content connections were paginated. The nested product image and variant connections were checked for truncation; none required another page in this catalogue. Unavailable variants are not necessarily zero-stock variants: Storefront availability alone does not explain the reason.

Two similarly named Ubtan pairs exist as separate products: `facial-ubtan-orange-almond` / `facial-ubtan-orange-almond-1`, and `body-ubtan-tea-tree` / `body-ubtan-tea-tree-1`. Their different photographs, names, and descriptions were preserved. Confirm whether they are intentional distinct offerings or legacy duplicates before consolidating anything.

## Copy issues inherited from Shopify

These were candidates recorded before the approved cleanup above. Clear title separator spacing and description punctuation have since been corrected. Naming choices remain unchanged; handles were explicitly preserved during title updates.

| Location | Observed text or inconsistency | Suggested review |
| --- | --- | --- |
| Oriental soap, lavender body butter, Haze soap titles | `Lavendar` | Likely `Lavender`; check packaging/brand naming first. |
| Three body-butter titles | `-Rose`, `-Lavendar`, `-Sandalwood` | Normalize spacing around the separator. |
| Haze title | `Soap Bar -60 gm` | Normalize separator and quantity formatting consistently with other products. |
| Sandalwood body-butter description | `DYU Triple Body Butter ? Sandalwood` | Replace the apparent encoding/punctuation error with the intended separator. |
| Tea Tree Trip description | `Tea Tree Trips Soap Bar`, while the title says `Trip` | Confirm singular/plural naming. |
| Tea Tree Trip and Rose Reset descriptions | `Clay .`, `travel .` | Remove unintended spaces before full stops. |
| Several soap descriptions | Adjacent checklist lines such as `batches✔ Moisturizing`, and `skin.Best For` in Storefront plain text | Follow-up Admin read confirmed native `<br>` tags already exist. Preserve deliberate checklist design and address plain-text flattening in the frontend. |

The local copy scan found no additional unambiguous prose typo that needed an isolated source edit. Native handles containing `lavendar` remain stable, including code references to those handles. The ingredient vocabulary already recognizes that spelling and displays the standard `Lavender` form for inferred entries.

The journal introduction still reads the merchant's **A pause for** / **perspective.** fields. Its JSX now joins the pieces with a normal space and inline italic emphasis, without a forced `<br>`, so available width determines wrapping. Deliberate editorial breaks elsewhere were preserved.

## Editor coverage verified

This is a custom Next.js storefront. Its content editor is **Content → Metaobjects → DYU • Website content**, together with native Products, Collections, and Policies. Shopify's theme customizer controls a different theme surface. Keep the entry handles stable because the application uses them as identifiers.

| Website area | Shopify control | Verification/current state |
| --- | --- | --- |
| Four moving homepage hero pictures | `home-hero`, `home-hero-slide-2`, `home-hero-slide-3`, `home-hero-slide-4` | All four entries are live, enabled, and point to resolved Shopify CDN images. Each supports artwork, optional mobile image, alt text, crop, order, and text/button overrides. Slides 2–4 currently inherit shared copy. |
| Hero rotation and 3D preview | `home-hero` carousel settings; `home-hero-preview` | Autoplay and 2–20 second duration are supported. The preview supports visibility and selected products. Current unset carousel timing uses the code default of two seconds; visitors can pause, and reduced motion stops autoplay. |
| Homepage section order and visibility | `home-layout` and each section's `enabled` field | All ten supported section handles are configured. Unknown/duplicate handles are ignored; omitted sections retain fallback order. |
| Homepage collections and favorites | `home-collections`, `home-favorites` reference lists | Native collection/product selections and order are supported. Both lists are currently unset, so catalogue-derived defaults are used. Up to four collection cards and three favorites are displayed. |
| Shop/category hero | `shop-hero`, `shop-hero-<type-slug>` | Default display is `3d`; ten category override entries exist for all nonempty current product types. Uploading section artwork takes precedence over the generated product study. |
| Native collection page hero | Native collection image plus `collection-page`, `collection-<handle>` | `collection-frontpage` exists. An explicit section image overrides the native collection image; selected products/display mode can provide a product visual. The current page now renders its native Damask Rose collection image; the empty section overrides are preserved. |
| Product page | Native product fields plus ten `dyu` metafield definitions | Native media, description, variants, price, and availability are loaded. Blank new fields preserve usable legacy `custom` values. Shared product-section copy is exposed through `product-*` entries. |
| Ingredient atlas and detail | `dyu_ingredient`, product ingredient references, `ingredient-<handle>`, and `ingredients-*` entries | Merchant presentation overrides are wired up; the index distinguishes ingredient stories/lists from names inferred only from product titles. |
| Story, making, philosophy, rituals | `story-*`, `craft-*`, `philosophy*`, `ritual*` | Headings, prose, imagery, supported links, repeatable ordering, and optional visibility are represented in live entries and consumed by the relevant components. |
| Journal and articles | `journal-*`, `article-<slug>`, `home-journal-*` | Copy, categories, reading times, images, chapter headings, onward panels, and supported visibility/order are editable. Article body lines beginning `## ` become chapter headings. |
| Header, footer, contact, FAQ, branding, sharing | `announcement`, `brand`, `nav-*`, `header-*`, `footer*`, `contact*`, `faq-*`, `site-seo` | Existing entry families are present. Site sharing defaults are editable; some route-specific metadata remains in code. |
| Policies | Native **Settings → Policies** | Native policies take precedence over section fallback text. Only the privacy policy is populated at this audit. |

The repository contains the website/ingredient/step definitions and ten product metafield definitions; the migration receipt records the carousel/display additions. This pass verified public live values and source consumption, not every permission/editor state in Shopify Admin. It deliberately did not save a temporary edit to a real section just to prove a write.

## Limits and small documentation discrepancy

- The four-slide hero supports editing, hiding, and reordering the four wired slots. A fifth slide is not automatically discovered; adding more requires a code extension.
- Generic entries share a common field schema. A field only affects components that consume it; entering an arbitrary value does not create a new layout, page, or interaction.
- Account screens, secure transaction/error messages, 3D geometry, accessibility controls, typography, and responsive layout remain managed in code. New account UI is not represented as a new Shopify editor family.
- Empty fields restore the section's default/inherited content. Use supported visibility switches to hide optional content. Clearing text is not a general-purpose deletion control.
- Shopify-hosted images and safe links are accepted; arbitrary CSS, JavaScript, or HTML are not executed. Mobile artwork is supported where the component consumes it; no separate mobile images are currently populated.
- Cached content is revalidated after approximately 120 seconds and a subsequent request, or through the signed cache webhook when configured. This audit did not register or change webhooks.
- Live Admin inspection confirmed `enabled` and `sort_order` help text already accurately describe hiding the homepage hero and ordering supported entries. Local definition help is now aligned with those live values; no remote definition mutation was required. Historical backups remain unchanged. See [editor-help-verification.json](../qa/handover/editor-help-verification.json).

## Verification and evidence

- `node scripts/verify-site-content.mjs`: passed against the live Storefront API; 161 expected entries present, no unresolved image references.
- Focused content/editor regression suite: **19 passed** across content safety, hero inheritance and ordering, homepage settings, and editorial overrides. The suite ran with the existing external-server configuration to avoid starting another development server.
- Read-only evidence: [catalogue-content-audit.json](../qa/content/catalogue-content-audit.json), [policy-content-audit.json](../qa/content/policy-content-audit.json), and [storefront-verification.json](../qa/content/storefront-verification.json).
- The parallel frontend audit covers route rendering, images, links, controls, and responsive layouts. This document separates native Shopify content gaps from the rendered fallbacks; it does not claim an edit-save-preview cycle or a payment test was performed.

The detailed merchant editing map remains in [README.md](../README.md#editing-the-website-in-shopify). Prioritize approved policies, intended availability, missing product information, then catalogue taxonomy/copy and descriptive image text before public launch.
