# DYU customer account setup

The account implementation brief is in [customer-account-implementation.md](customer-account-implementation.md). The storefront now provides sign-in, an account overview, profile editing, addresses, order history and details, wishlists, and recently viewed products. Guest shopping remains available. Shopify handles email verification and payments.

## Shopify configuration

Open Shopify Admin for DYU, then **Sales channels → Headless → your storefront → Customer Account API → Application setup → Edit**. Use the existing client with ID `c971bbba-6775-416f-91b9-76c4c59efff0`.

For the website origin `https://YOUR-WEBSITE`, register:

| Setting | Value |
| --- | --- |
| Callback URL | `https://YOUR-WEBSITE/api/auth/callback` |
| Logout URL | `https://YOUR-WEBSITE/account` |
| JavaScript origin | `https://YOUR-WEBSITE` |

Keep existing production addresses. These must match exactly, including the scheme and path. Shopify requires a public HTTPS callback; plain localhost HTTP cannot complete this flow. A temporary preview must be registered separately, and its hostname changes if its tunnel is recreated.

The public discovery documents identify `dyuhandmade.myshopify.com` as shop `76637307099`, also represented by `fgm0vn-7t.myshopify.com` in the connected admin. Customer Accounts is already enabled. Use the Headless public Web client with `openid email customer-account-api:full` scopes. The app sends these scopes during authorization.

### Current temporary preview

Recreated October 9, 2026 after the October 4 tunnel expired. This URL is valid only while the recorded local preview and tunnel processes are running.

| Setting | Current value |
| --- | --- |
| Preview | `https://expanded-are-register-judicial.trycloudflare.com/account` |
| Callback URL | `https://expanded-are-register-judicial.trycloudflare.com/api/auth/callback` |
| Logout URL | `https://expanded-are-register-judicial.trycloudflare.com/account` |
| JavaScript origin | `https://expanded-are-register-judicial.trycloudflare.com` |

On October 9, the expired callback, logout URI and JavaScript origin were replaced in the existing Shopify Headless client, and the local account-origin override was updated. A new production build runs behind the replacement tunnel. Clicking the sign-in button from `127.0.0.1:3000/account` completed authorization using the browser's existing Shopify customer session and returned to the authenticated DYU dashboard. A fresh anonymous redirect test also verified the registered callback, PKCE parameters and secure flow cookie. A new email-code submission was not needed for that browser check.

The login route now checks a different temporary preview host anonymously before redirecting to it. A failed request, invalid response or 3.5-second timeout keeps the visitor on `/account?error=unavailable` instead of sending them to a dead hostname. This does not recreate a stopped tunnel: after a restart that changes the tunnel address, update all three Shopify URLs and `CUSTOMER_ACCOUNT_SITE_URL` together. Permanent hosting with a stable HTTPS origin removes this recurring preview dependency.

The public account page, secure OAuth flow cookie, exact callback redirect, and cart/checkout origin checks were verified. The merchant saved the callback, JavaScript origin, and logout URI. A live customer completed Shopify email sign-in, and the authenticated callback, dashboard, profile, order history, address book, and account wishlist were verified in the preview. No customer profile or address values were changed during verification.

The live callback exposed a Shopify compatibility issue: this store's signed ID token contained a positive integer `sub` claim. The implementation now converts positive safe integer subjects losslessly to strings after verifying the signature, issuer, audience, and expiry. Nonce and refresh-account identity checks remain enforced. Null, missing, malformed, nonpositive, fractional, and unsafe numeric subjects remain rejected. Eighteen callback/security tests cover this behavior and bounded diagnostics; logs contain only allowlisted failure categories, never tokens, codes, cookies, or personal details.

The untracked local environment also sets `CUSTOMER_ACCOUNT_SITE_URL` to this preview origin. Sign-in from either `localhost:3000` or `127.0.0.1:3000` first redirects to the HTTPS preview, preventing an unsupported localhost callback. Use a fresh website sign-in link after changing this setting; an already-open Shopify authorization page retains its earlier callback URL. Continue authenticated testing on the preview because its secure session cookie belongs to that hostname. Update or remove this temporary override when the tunnel is replaced or the site is deployed.

The customer wishlist definition was created and verified in this store:

- Owner: `CUSTOMER`; namespace/key: `dyu.wishlist`.
- Type: `list.single_line_text_field`; maximum 100 product handles.
- Customer Account access: `READ_WRITE`; public Storefront access: `NONE`.
- Definition input: `shopify/customer-account-wishlist-definition.json`; setup receipt: `qa/accounts/shopify-setup.json`.

## Server environment

Use `.env.example` as the variable reference. Keep credentials and the session secret in deployment secrets or an untracked local environment file.

| Variable | Purpose |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `dyuhandmade.myshopify.com` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | The public Headless client ID above |
| `SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID` | `76637307099` |
| `SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION` | `2026-07` |
| `CUSTOMER_ACCOUNT_SESSION_SECRET` | Cryptographically random, at least 32 bytes; keep consistent across instances |
| `NEXT_PUBLIC_SITE_URL` | Canonical website origin; set before the production build |
| `CUSTOMER_ACCOUNT_SITE_URL` | Optional server-only origin override, useful for a temporary HTTPS preview |
| `SHOPIFY_CUSTOMER_ACCOUNT_URL` | Optional hosted portal override; default is `https://shopify.com/76637307099/account` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET` | Only for a confidential Shopify client; unnecessary for the public client |
| `SHOPIFY_BUYER_IP_HEADER` | Only a header overwritten by your trusted hosting proxy; forwarded to Shopify for authenticated checkout |
| `SHOPIFY_CHECKOUT_DOMAIN` | Only if Shopify uses a verified custom checkout domain |

The ordinary Storefront API configuration is still required for catalog, cart, and checkout. Set `DEMO_MODE=false` for real commerce. Do not expose Customer Account tokens or private Storefront credentials through `NEXT_PUBLIC_` variables.

For the temporary Cloudflare preview, only the separate production server on loopback port 3001 is exposed. Its process receives the preview origin and `SHOPIFY_BUYER_IP_HEADER=cf-connecting-ip`. The normal development server on port 3000 is separate. Local preview logs and process records live in ignored `qa/accounts/preview/`. Stop the recorded Cloudflare process to revoke the public URL; stop its recorded Next process when the preview is no longer needed. Closing the computer also makes this temporary preview unavailable.

## Behavior and limits

- First-time and returning customers use Shopify's passwordless email-code flow. No password is stored by this website.
- Names and addresses can be edited here. Verified email changes and features such as eligible returns use Shopify's hosted account/order portal.
- Orders and profile data come only from the authenticated Customer Account API. Order details support paginated line items and shipment tracking. No Admin token is used for shopper access.
- Guest wishlists stay on the current browser. After login, saves merge into the customer's Shopify field with conflict detection. The 100-item limit is shown rather than silently dropping items. Authenticated customer details and tokens are never saved in local storage.
- Recently viewed history is separate from purchase history: up to 24 products on this browser, with a clear action. It does not sync across devices.
- Checkout refreshes the current cart's customer identity and checkout URL. Logout clears the local session and the local cart association to prevent reuse by the next customer.
- Sessions are encrypted, HttpOnly, Secure over HTTPS, and expire after seven days. Concurrent refreshes are coordinated within one Node process. Before scaling to multiple server instances, add shared refresh coordination or a server-side session store to safely handle rotating refresh tokens across instances.
- This implementation has no account deletion, payment-method editor, subscription manager, or returns processing API. Shopify's hosted account pages remain the destination for available platform features.

## Verification and activation

Focused tests cover input validation, authorization boundaries, OAuth security, session expiry, saved-item merging, account switching, account forms, orders, and checkout behavior. The UI audit covers 320, 390, 768, and 1440px widths. Customer GraphQL operations are validated against the versioned schema. Production build and TypeScript checks are required after code changes.

Mocked browser workflows do not prove a live customer login or purchase. After saving the registered HTTPS URLs:

1. Open the preview's `/account` page and choose sign in.
2. Complete Shopify's email code in your own browser.
3. Check your own profile, orders, addresses, and wishlist; verify the wishlist after refreshing.
4. Add a product and open checkout to verify the current customer identity. Completing a real purchase is a separate merchant decision.
5. Sign out and confirm private account data disappears.

No live purchase has been submitted by this implementation workflow. The October 4 handover verified a live wishlist save, persistence after full navigation, and removal; the original empty list was restored. A live test cart reached Shopify checkout, which was blocked by the paused store plan. No payment details were entered and no charge was made. See [HANDOVER.md](../HANDOVER.md) for current launch gates and evidence.

## References

- [Shopify Customer Account API setup](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started)
- [Customer Account API reference](https://shopify.dev/docs/api/customer/2026-07)
- [Storefront cart and authenticated checkout](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage)
- [Cloudflare temporary tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)
