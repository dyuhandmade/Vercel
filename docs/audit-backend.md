# Backend handover audit

Audit date: 2026-10-04. Scope: every `src/app/api` route, Shopify adapters, customer authentication, account data, wishlist, cart, checkout, revalidation, and server/client secret boundaries. No orders, payments, remote Shopify configuration changes, deployments, or server restarts were performed by this audit.

## Result

No confirmed P0/P1 issue remains from this code review and the checks below. This is a targeted application audit, not a penetration-test certification. Real payment/order acceptance and the final deployed configuration are separate checks owned by the main handover workflow.

## Fixed in this audit

| Finding | Change | Evidence |
| --- | --- | --- |
| Cart JSON was unbounded; account/webhook limits applied after buffering. | Shared streaming reader rejects excessive declared or chunked bodies before buffering the rest. Cart/account JSON: 20,000 bytes; webhook: 4 MiB. Invalid UTF-8/non-object JSON is rejected. | Declared-size, chunk cancellation, byte-limit, content-type and malformed-input tests pass. |
| Cart accepted arbitrary IDs/fields, exposed unexpected exception messages, and omitted no-store on several outcomes. | Restrict supported cart actions, Shopify ID types, quantities and fields; redact unexpected failures; use private/no-store and Vary: Cookie consistently. Expired/invalid cart cookies are cleared on read. Checkout validates its cart ID before contacting Shopify. | Validation and live negative-route tests pass without upstream mutations. |
| Storefront GraphQL errors were logged verbatim. | Log a fixed error category; reject redirects carrying Storefront credentials; validate the configured API version. Cart user errors use a bounded recovery message. | Source review and TypeScript pass. No authentication values enter the new log record. |
| Stored wishlist data could be silently filtered/truncated on the next write. | Reject malformed or over-capacity stored lists before writing. Existing compare-digest concurrency retries remain intact. | Stored-list validation and merge/capacity tests pass. |
| Webhook authentication read an unbounded decoded string. | Verify HMAC against bounded exact raw bytes, require a canonical SHA-256 signature, reject missing signatures before body reads, and return no-store responses. | Raw-byte, tamper, wrong-secret and malformed-signature tests pass. |
| Readiness reported HTTP 200 when the catalogue was empty or unavailable. | `/api/health` now returns 503 when `ready=false`, 200 when products load, and private/no-store on both outcomes. | Mocked empty, upstream-failure and successful-catalogue checks pass without exposing upstream errors. |

## Checked

- Customer login uses PKCE, state and nonce; JOSE validates signature, issuer, audience and expiry. Signed positive safe integer Shopify subject IDs normalize losslessly; malformed subjects remain rejected. Callback logs contain only allowlisted diagnostic labels.
- Session tokens stay in authenticated encrypted HttpOnly cookies. HTTPS cookies use Secure and `__Host-`; cookies are scoped to the configured shop, client and origin. Refresh runs on the server. Logout clears local session and buyer-bound cart cookies.
- Account API reads require a valid customer session. Mutations additionally require the configured Origin. Cart/checkout honor the configured external HTTPS scheme only for the matching raw Host; forwarded host/proto headers cannot override trust. Missing/cross-site Origin requests fail.
- Account data and carts are fetched without caching. Customer API authorization limits data to the signed-in customer. Arbitrary customer IDs cannot be supplied to profile, address or wishlist ownership fields; order IDs are validated before querying with that customer's token.
- Checkout rebinds the current authenticated buyer or clears guest buyer identity before requesting a fresh Shopify checkout URL. Checkout/payment execution remains Shopify-hosted. The application does not receive card data or create payment charges.
- The wishlist is a Shopify customer metafield with compare-digest retries. Add/remove/merge operations retain concurrent changes rather than replacing stale lists. Browser persistence contains public product handles, not authentication tokens or account records.
- Only `.env.example` is Git-tracked. Source/test/docs token-prefix scan found no credential literals. Existing public JavaScript chunks contained no references to the server session-secret, private Storefront-token or customer-client-secret environment names. This is a source/bundle-boundary check, not an exhaustive credential-value scan.
- Catalogue cache invalidation uses Shopify HMAC. Replaying a valid event only expires catalogue cache; it cannot create orders or update payment state. CMS display adapters render text safely; the only inspected raw HTML insertion is JSON-LD with `<` escaped.

## Verification

- `npm run typecheck`: passed.
- `npx playwright test tests/backend-guards.spec.ts tests/account-security.spec.ts tests/account-callback.spec.ts tests/account-data.spec.ts --workers=1`: **32 passed** before the additional readiness regression. The updated backend guard suite also passes, including empty/failed/healthy readiness cases.
- HTTP checks in this suite use anonymous reads and invalid/cross-site writes only. Signed-in cross-customer access, live token refresh and payment settlement were not exercised by this audit. No new production build was started here; the main agent owns that final check.

## Remaining limits and launch checks

1. **Stable deployment configuration:** replace temporary tunnel URLs with the final HTTPS domain and register its exact callback, logout and JavaScript origin in Shopify. Keep `DEMO_MODE=false`; supply secrets through the host's secret store. Ensure reverse-proxy logs redact auth callback query strings. Forward buyer IP only through a header overwritten by a trusted proxy.
2. **Multi-instance sessions:** refresh coalescing is currently in-process for 30 seconds. Horizontal/serverless deployments can race rotating refresh tokens across instances. Add a shared session/refresh coordination service if that deployment model is selected. Stateless cookies also do not provide independent immediate server-wide session revocation; Shopify's token validity remains authoritative.
3. **Mutation retries:** the app does not automatically retry ambiguous cart/address-create failures. They are not guaranteed exactly-once across repeated network submissions. Refresh/read back before retrying; Shopify owns payment and order idempotency. No payment webhook or custom charge API exists here.
4. **Pagination bounds:** account orders, addresses and order line items expose pagination. Order fulfillments currently query the first 20 and cart views the first 100 distinct lines. Very large orders/carts need further pagination before those sizes are a supported use case.
5. **Hosting controls:** set request duration/body limits and rate controls at the final proxy/host. Application body limits now protect buffering, but they are not a distributed rate limiter. A production content-security policy should be rolled out with visual/3D behavior testing rather than enabled blindly.
6. **Operational readiness:** `/api/health` returns 503 if products cannot load or the catalogue is empty, and 200 when ready; also verify `mode=shopify` for launch rather than a healthy demo. Confirm the HMAC secret and webhook registration in the deployed environment. The 120-second catalogue cache remains the fallback when invalidation is unavailable.

No application database is required for the current feature set: Shopify stores catalogue, customer profiles, addresses, orders and wishlist data. A shared cache/session service would address horizontal refresh coordination if needed; it is not a reason to duplicate Shopify's commerce database.
