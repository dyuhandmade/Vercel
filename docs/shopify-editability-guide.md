# Editing the DYU website in Shopify

Open **Content → Metaobjects → DYU • Website content** in the DYUhandmade Shopify admin. Search by the editor label or entry handle. These entries control the custom Next.js storefront. The Shopify theme editor controls the separate Shopify theme.

Save an entry, wait approximately two minutes for the storefront cache, then reload the relevant page. A configured content revalidation webhook can shorten that delay. Preview a desktop and a mobile width after changing a hero, image or navigation list. New website controls need the corresponding frontend release deployed before they appear.

## Find the right control

| Area | Where to edit |
| --- | --- |
| Announcement and logo | `announcement`, `brand` |
| Navigation labels and destinations | `nav-*`; menu membership and ordering use the `navigation-*` entries below |
| Collection dropdown and mobile menu | `header-menu`, `mobile-menu`; select collections in `header-menu` |
| Search drawer and bag heading | `header-search`, `header-bag`; supporting interface text uses `ui-*` entries |
| Footer text and columns | `footer`, `footer-philosophy`, `footer-catalogue`, `navigation-footer-*` |
| Homepage order and section visibility | `home-layout`; each listed section's **Show this section** control |
| Hero pictures, copy, buttons and timing | `home-hero`, `home-hero-slide-*` |
| Homepage featured products and collections | Selected products in `home-favorites`; selected collections in `home-collections` |
| Homepage stories, ingredients and ritual panels | `home-*`, `philosophy*`, `ritual*` |
| Shop and collection introductions | `shop-page`, `shop-hero`, `shop-hero-<category>`, `collection-page`, optional `collection-<handle>` |
| Our story and making pages | `story-*`, `craft-*` |
| Ingredient atlas and ingredient detail | `ingredients-*`, `ingredient-*`; native ingredient metaobjects provide ingredient stories |
| Journal and articles | `journal-*`, `article-<slug>` |
| Contact details and buttons | `contact-page`, `contact`; `contact` can hide the conversation card |
| FAQ heading, questions and sidebar | `faq-page`, `faq-*`, `navigation-faq-sidebar` |
| Account welcome, profile and saved-product wording | `account-welcome`, `account-overview`, `account-benefit-1`–`account-benefit-3`, `ui-account-*` and saved-product interface entries |
| Global palette, typography and corners | **DYU • Website appearance** (`dyu_site_settings`) → `global` |
| Product, cart, search and gallery interface wording | `ui-*` entries; edit **Body text** |
| Missing page and loading error | `not-found-page`, `error-page` |
| Policy introductions and contact links | `policy-privacy`, `policy-shipping`, `policy-terms`, `policy-accessibility` |

## Add, hide or reorder navigation links

The navigation lists use **List items / ordered handles**, with one exact `nav-*` entry handle per item:

| List entry | Location |
| --- | --- |
| `navigation-header` | Desktop header and main mobile navigation |
| `navigation-mobile-secondary` | Extra mobile links |
| `navigation-footer-explore` | First footer link column |
| `navigation-footer-guidance` | Second footer link column |
| `navigation-footer-legal` | Footer policy links |
| `navigation-faq-sidebar` | FAQ sidebar |

To add a link, create a **DYU • Website content** entry with a unique lowercase handle such as `nav-gifts`. Fill its editor label, **Heading**, and **Primary destination** (for example `/collections/gifts`). Add `nav-gifts` to the desired list. Reorder the list items to reorder links. Keep the desktop header short enough to fit comfortably. Existing `nav-collection` retains the collection dropdown behavior.

Set a link's **Show this section** to false to hide that link everywhere it is used. Set the list's control to false to hide that menu group. Removing every item from a list restores its default membership; use the visibility control to hide it. Unknown or incomplete entries are skipped. Footer column titles can be supplied in the corresponding list's **Heading**; otherwise the existing `footer` headings apply. The footer's separate catalogue link has its own `footer-catalogue` visibility and optional link overrides.

## Change text and pictures

Use **Heading**, **Emphasized heading**, **Eyebrow / small heading**, **Body text**, button labels and links where the selected entry supports them. The editor label identifies the section; changing the label itself does not change the website heading. Existing handles connect sections to the frontend, so retain them.

For entries labelled **Interface**, edit **Body text**. They control a small piece of interface copy, such as a button, filter option or empty result message. Keep short labels short. Dynamic prices, stock, order totals and counts still come from Shopify and the application. Blank fields restore the built-in wording.

Choose an existing Shopify file or upload a new picture in **Desktop / section image**. Supply **Image description** for meaningful artwork, and optionally **Mobile image** and **Image focal position**. Use Shopify image fields rather than pasting arbitrary external image URLs. Blank optional fields inherit existing content or design defaults. Text is displayed as text, with line breaks; scripts and arbitrary HTML are not supported.

Hero slides inherit the main hero's blank text and button fields. The shared autoplay toggle and slide duration live in `home-hero`; duration accepts 2000–20000 milliseconds. Visitors retain pause controls and reduced-motion preferences. Shop heroes accept a selected product for a 3D view, or an uploaded picture; the uploaded picture takes precedence.

Use `product-gallery` for photo-only (`image`) or photo-plus-3D (`3d`) display, photo autoplay and its interval (default 5000 ms). Turning off **Show this section** here restores the standard gallery; product photographs remain available. The `product-related` autoplay field controls automatic movement of related products. Visitors retain manual controls.

## Add articles and questions

Create `article-your-slug` to publish a journal article at `/journal/your-slug`. Set its heading, body, image, category, supporting note (the excerpt), caption (the image caption) and reading time. Separate paragraphs with blank lines; a line beginning `## ` creates a chapter heading. Article display order and visibility are editable. Related reader headings and invitations live in `journal-*` entries.

Create a new `faq-your-topic` entry with a question in **Heading** and an answer in **Body text**. If `faq-page` has an explicit **List items / ordered handles** selection, add the new handle to that list. Visibility and display order control which questions appear. Existing ingredient guidance questions use `ingredients-faq-*` entries.

## Products, collections and policies

Use **Products** for names, descriptions, prices, variants, stock, media and product availability. Native **Collections** supply collection titles, descriptions, pictures and product membership. The custom shop also supports product-type categories. Product media supplies the photo gallery and photo-based 3D study.

On each product, use its **DYU metafields** for the short story, sensory notes, full ingredient list, care notes, ingredient references, making steps, usage steps, display shape, tone and related-product selection. Reusable ingredient and step entries live under **Content → Metaobjects → DYU • Ingredient** and **DYU • Making or ritual step**. Publish verified product information and directions in these fields.

Edit privacy, terms, shipping and refund content in **Settings → Policies**. Those native policies take precedence over fallback policy body text on the storefront. The accessibility page uses its `policy-accessibility` entry. Support text and contact destinations can be changed without replacing a policy.

## Account pages

Use `account-welcome` for the guest account heading, description, sign-in button label, supporting note, image, image caption and **Continue exploring** destination. The sign-in destination stays connected to secure authentication. Use `account-overview` for the signed-in welcome panel and its collection button.

The welcome artwork remains hidden on phones up to 600 px, as in the existing layout. Its mobile image applies where the artwork is visible below 700 px. Disabling the welcome entry restores the default sign-in panel so customers can still access their accounts.

The three guest benefit cards are `account-benefit-1`, `account-benefit-2` and `account-benefit-3`; edit their **Heading** and **Body text**, or turn off **Show this section** to hide a card. Search `ui-account-` for account navigation, profile and address labels, order messages, buttons and empty states. Edit **Body text** in these entries. Customer names, addresses and orders remain customer data; these controls change the surrounding interface wording.

## Global appearance

Open **Content → Metaobjects → DYU • Website appearance**, then the **Global appearance** entry. Its definition type is `dyu_site_settings` and its handle must remain `global`. All visual fields are optional. Leave a field blank to retain the original design, or turn off **Use appearance overrides** to restore the original appearance while keeping saved choices.

| Control | Choices and scope |
| --- | --- |
| Palette | Ten color fields: `paper` (page background), `cream` (soft backgrounds), `forest` (primary buttons), `ink` (main text), `muted` (secondary text), `sage` and `olive` (accents), `clay` (focus accent), `walnut` (hover accent), and `line` (dividers) |
| Heading font | `classic` (Georgia), `literary` (Palatino), or `modern` (Arial) |
| Body font | `classic` (Arial), `humanist` (Trebuchet), or `system` (the device font) |
| Base text size | 14–20 px; the original default is 16 px. Scales text sized relative to the base. |
| Button corner radius | 0–40 px, applied to standard `.button` components; 0 is square and 40 is rounded. Other specialized controls retain their own styling. |
| Panel roundness | 0–150% of the shared corner sizes; 100% is the original size and 0 is square. Only panels using shared radius tokens are affected. |

Font choices use installed system fonts and their fallbacks. Palette controls update the shared site colors; photographs, artwork and specialized component details keep their own colors. Check text contrast and desktop/mobile layouts after saving a new combination.

## What still belongs in code

The component layout, responsive behavior, animation mechanics, checkout integration, authentication, security rules and data validation remain application code. Editing customer-facing text does not change those rules. Payment, shipping, tax and customer-account setup live in their Shopify settings. Creating an arbitrary new metaobject handle does not create an arbitrary website page; the supported navigation, FAQ and journal patterns above are connected automatically.

The seed JSON files in this repository record initial content for missing controls. They are not a replacement for current Shopify content and should not be replayed over merchant edits.
