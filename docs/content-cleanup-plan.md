# Approved content cleanup and execution record

Completed October 4, 2026 for Shopify shop `76637307099` (`dyuhandmade.myshopify.com`, canonical Shopify domain `fgm0vn-7t.myshopify.com`). The reviewed plan was applied through the Shopify connector after fresh reads, with exact before/after evidence and rollback inputs retained. No credentials are stored in these artifacts.

## Exact completed scope

| Resource | Before | After |
| --- | --- | --- |
| Rose body-butter title | `Triple Body Butter -Rose` | `Triple Body Butter - Rose` |
| Lavender body-butter title | `Triple Body Butter -Lavendar` | `Triple Body Butter - Lavendar` |
| Sandalwood body-butter title | `Triple Body Butter -Sandalwood` | `Triple Body Butter - Sandalwood` |
| Haze soap title | `Lavendar Haze Soap Bar -60 gm` | `Lavendar Haze Soap Bar - 60 gm` |
| Sandalwood description fragment | `DYU Triple Body Butter ? Sandalwood` | `DYU Triple Body Butter - Sandalwood` |
| Rose Reset description fragment | `self-care, or travel .` | `self-care, or travel.` |
| Tea Tree Trip description fragment | `French Green Clay .` | `French Green Clay.` |
| Tea Tree Trip description separator | `</strong>– Clean` after the French Green Clay heading | `</strong> – Clean` |
| 154 empty native image alt fields | Empty | Associated product title plus `— product image N of M` |

These are **four title fields and three description HTML fields across six products**, plus **154 image-alt fields**. The three description changes preserved all HTML tags exactly, including existing paragraphs, emphasis, and `<br>` elements. Six sequential product mutations and seven file batches completed with no API errors, skipped items, or target mismatches.

The image labels use the existing product identity and verified gallery position only. They do not invent a depicted scene, package contents, ingredients, materials, claims, or photographic angle. This fills native accessibility metadata with a safe baseline; richer scene-specific descriptions can follow an individual visual review. The three `Lavendar` product spellings remain unchanged.

## Additional approved short-story corrections

Final verification found the original sentence-extraction typo had also been copied into two existing `dyu.short_story` metafields. A separate approved, atomic `metafieldsSet` operation used fresh `compareDigest` values:

- **Sandalwood body butter:** replaced the truncated `DYU Triple Body Butter ?` with the exact corrected first sentence already present in its native product description: “DYU Triple Body Butter - Sandalwood offers intense hydration with cocoa, mango, and shea butters blended with coconut oil and sandalwood for deeply nourished, soft, and supple skin.” No new product claim was authored.
- **Tea Tree Trip:** removed the single unwanted space in `French Green Clay .`; all other short-story text, including `Trips`, remains unchanged.

These **two short-story fields** are recorded separately from the original six-product text cleanup. Both values were reread through Admin and Storefront after the atomic update.

## Safeguards and verified preservation

The existing Admin schema was inspected and all read/mutation operations validated before execution. `productUpdate` set only the exact approved title/HTML fields and explicitly retained each existing handle. `fileUpdate` set only ID and alt text; it did not replace files or change associations. The short-story operation set only the two approved namespace/key pairs and required matching digests. [Shopify productUpdate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/productUpdate), [Shopify fileUpdate](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/fileUpdate), [Shopify metafieldsSet](https://shopify.dev/docs/api/admin-graphql/2026-10/mutations/metafieldsSet)

Before each native text/file mutation, the execution reread current values, verified the shop ID, and checked the intended old text or empty alt value. Image checks also confirmed product identity, READY status, URL, count, and position. The plan would skip concurrent changes; none occurred. Before/after snapshots confirmed preservation of:

- All 27 product IDs and handles; status, tags, vendor, product type, and total inventory.
- All variant IDs, titles, prices, compare-at prices, and inventory quantities.
- All 154 image/file IDs, URLs, gallery order, and READY status.
- All non-target titles and description HTML.

The final independent Storefront read found **27 products, 154 images, zero missing alt values, zero target-title mismatches, zero alt mismatches, and zero short-story mismatches**. This verifies published catalogue data, without creating carts or orders. The separate frontend description-layout change is tracked by its owner and is not inferred from API data verification.

## Exclusions and remaining decisions

No branded spelling was changed. `Lavendar` versus `Lavender`, `Trip` versus `Trips`, and `Haze` versus `Honeycomb` remain merchant naming decisions. Product types, possible duplicate Ubtan listings, Moringa's missing description, full ingredient/directions/care information, stock, prices, legal text, shipping terms, and Razorpay were excluded. The existing claims were preserved, not validated or expanded.

Native product HTML already contains `<br>` separators between checklist items and Skin Type/Best For text. Any run-together display from Shopify's flattened `description` field is a frontend formatting issue, not a reason to rewrite native HTML.

## Evidence and rollback

All paths below are inside `shopify/handover-cleanup/`:

| Artifact | Purpose |
| --- | --- |
| `before.json`, `plan.json`, `validation.json` | Original read-only snapshot, exact reviewed changes/variables, and schema validation. |
| `execution-before.json`, `execution-after.json` | Fresh extended catalogue snapshots before and after native text/file writes. |
| `receipts/product-*-intent.json`, `receipts/product-*-result.json` | Exact six product requests and responses. |
| `receipts/files-*-intent.json`, `receipts/files-*-result.json` | Exact seven image batches and responses. |
| `execution-receipt.json` | Successful counts and preservation checks. |
| `short-stories-before.json`, `short-stories-plan.json`, `short-stories-after.json` | Exact two-field follow-up and verified values. |
| `receipts/short-stories-result.json` | Atomic compare-digest mutation result. |
| `storefront-final.json` | Final independent public Storefront verification. |
| `rollback.json`, `short-stories-rollback.json` | Exact inverse inputs, retained for recovery only. |

Rollback was **not executed**. If recovery is requested, use the successful execution receipts, reread every target, and require its current value to equal this cleanup's saved after-value. Never overwrite a later merchant edit. Restore only successfully changed fields in reverse execution order. Short-story rollback must preserve compare-digest protection; reread the digest and confirm the saved after-value before using a new digest. Native image alt rollback restores the original empty strings. Keep receipts and historical snapshots after recovery.

The similarly named `privacy-*.json` files belong to a separate, unsuccessful policy-edit proposal. They are excluded from this cleanup and rollback; do not replay them. See the policy follow-up in [audit-content.md](audit-content.md).
