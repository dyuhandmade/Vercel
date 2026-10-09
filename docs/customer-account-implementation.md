# DYU customer accounts — implementation prompt

Extend the existing DYU Next.js storefront with a complete customer account experience connected to Shopify. Preserve its cream, forest-green, serif-led visual identity, existing content controls, product options, bag, and guest checkout. Use real Shopify identity and commerce data; never simulate a successful login, order, payment, or saved account change.

## Sign-in and session

- Add a clearly labelled account entry on desktop and mobile, plus account and wishlist links in mobile navigation.
- Use Shopify Customer Accounts passwordless email-code sign-in. Returning and first-time customers use the same hosted Shopify flow. Shopify handles email verification and account creation.
- Return customers to the page they intended to visit. Keep safe internal return paths only. Preserve the shopping bag when signing in.
- Support session expiry, refresh, cancelled sign-in, invalid callbacks, retry, and explicit logout. Logout must clear the local authenticated session and detach the cart from the previous customer.
- Keep OAuth authorization-code exchange, PKCE, state, nonce, signed ID-token validation, and tokens on the server. Store encrypted sessions only in HttpOnly cookies, Secure in production, with finite expiry. Protect mutations against cross-origin requests; never expose customer tokens in browser storage or JSON.
- Verify Shopify customer-account activation, storefront client ID, shop ID, redirect/logout URLs, and required scopes. Missing configuration must fail safely with an honest unavailable state; never display fake customer records.

## Account experience

- Provide an overview with personal greeting, quick access to orders, profile, addresses, wishlist, recently viewed products, and support.
- Profile: display verified email and phone, edit first and last name, validate input, show pending/success/error states. Route changes unsupported by Shopify's customer API to the Shopify account portal.
- Address book: view, add, edit, remove with confirmation, and select a default address. Support country, region, postal code, name, company, address lines, city, and phone. Read and write only the authenticated customer's addresses.
- Orders/purchase history: newest first, cursor pagination, number/date, actual payment and fulfillment statuses, total and currency, and useful empty states.
- Order detail: purchased items and variants, quantities, historical prices, shipping address, subtotal/shipping/taxes/refunds when present, shipment tracking, and a link to Shopify's order status page. Handle multiple shipments and unavailable orders without exposing other customers' data. Use the Shopify order page for eligible returns, receipts, and order-specific support; do not invent cancellation or refund capabilities.
- Wishlist: heart controls on product cards and product pages; guest persistence on the current browser; authenticated persistence in a customer-owned Shopify field; merge guest saves on successful login; remove and browse saved items; reflect current availability and variant choices. Handle cross-device conflicts without silently losing saves. Do not store authenticated customer details locally.
- Recently viewed: separate from purchase history, bounded to the current browser, disclosed as such, with a clear-history action. Handle unavailable or deleted products.
- Shopping: customers can add items and checkout before or after sign-in. Before checkout, bind the cart to the current Shopify customer server-side and fetch a fresh checkout URL. Fail visibly on errors. Keep payments in Shopify checkout.

## Quality and accessibility

- Cover signed-out, signed-in, empty, loading, unavailable, session-expired, validation-error, network-error, and pending states across all views. Never claim a failed write succeeded.
- Use semantic links/buttons, visible focus, associated form labels, screen-reader status messages, keyboard navigation, appropriate autocomplete, and touch-sized controls.
- Match current responsive typography and intentional visual treatments. Test 320px phones through large desktops, without clipped controls or horizontal scrolling.
- Exclude account routes from indexing. Use private/no-store responses for customer data and auth routes. Do not log tokens, addresses, or orders. Keep error messages safe and useful.
- Use the customer-scoped API for shopper records; never put Admin credentials in the storefront. Keep field definitions merchant-owned where both the Headless customer client and merchant tools need access, with no public Storefront access to wishlists.
- Document environment variables, Shopify activation, exact callback/logout URLs, deployment requirements, and any remaining activation steps. Keep store credentials out of source control.

## Acceptance checks

1. Account links work on desktop and mobile; guest buying still works.
2. The OAuth flow rejects missing/mismatched/expired state, unsafe return paths, and invalid token issuer/audience/signature/nonce.
3. Anonymous and cross-origin requests cannot read or change private customer data.
4. Profile/address changes persist through Shopify, with failures surfaced accurately.
5. Orders and details come from the signed-in customer's session, including pagination and tracking.
6. Wishlist saves survive reload; guest saves merge on login; switching accounts cannot show the previous customer's saves.
7. Recently viewed items remain browser-local and can be cleared.
8. Checkout uses the current customer identity; logout cannot retain another customer's checkout identity.
9. Run TypeScript, focused security/behavior tests, production build, and desktop/mobile visual checks. Separate mock-backed verification from a live customer login and purchase, which require the merchant's configured client and a customer completing the email code.

## Primary references

- [Shopify Customer Account API](https://shopify.dev/docs/api/customer/2026-07)
- [Customer metafield access](https://shopify.dev/docs/apps/build/metafields#customer-accounts-permissions)
- [Storefront cart management](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)

This is the implementation brief for the current change. Activation and verification results are recorded separately in the setup guide.
