# Portable production deployment

Prepared 4 October 2026. These files prepare a deployment; they have not provisioned hosting, changed DNS, installed services, issued certificates or published a site. A hosting account and permanent HTTPS hostname still need to be chosen. Payment setup remains separate.

## Supported starting point

### Vercel build configuration

The repository's `vercel.json` explicitly selects the Next.js integration, installs from the lockfile with `npm ci`, runs `npm run build`, and uses `.next` output. These values override framework/build/output choices in the Vercel dashboard. The project Root Directory must be the repository root (the directory containing `package.json`), not `public`, `src` or `src/app`.

On 9 October, `dyu1.vercel.app` served `/images/dyu-handmade-logo.png` with HTTP 200 but returned Vercel `NOT_FOUND` for both `/` and `/api/health`. GitHub recorded a successful Vercel deployment of commit `4f9def9`. This points to static-output configuration rather than a rejected GitHub push. The explicit configuration makes Vercel build the application routes as well as the assets. A successful build status alone is insufficient: check the homepage and `/api/health` after deployment.

Production Shopify/account variables must also be configured in the Vercel project's environment settings; `.env.local` is intentionally excluded from GitHub. Use the permanent origin for both site URL variables and register its callback/logout URLs in Shopify. This build configuration does not resolve the separate multi-instance account refresh limitation described below.

#### Current deployment and owner setup

Commit `3c2a566` deployed successfully to `https://dyu1.vercel.app` on 9 October. Its clean Linux CI install, type checking, production build and automated verification all passed. The Vercel platform 404 is resolved. The running application still shows its error page: `/api/health` reports HTTP 503 with `mode: "shopify"`, `ready: false` and zero products, while `/api/account` reports `configured: false`. The account configuration is incomplete; the catalogue connection needs valid production settings or investigation in the owner's runtime logs. GitHub collaborator identity is not blocking deployments.

The Vercel account owner should open **dyu1 → Settings → Environment Variables**, select **Production**, and add or correct the following. Enter credentials privately using the existing working configuration; never put their values in GitHub or screenshots.

| Variable | Production value |
| --- | --- |
| `SHOPIFY_STORE_DOMAIN` | `dyuhandmade.myshopify.com` |
| `SHOPIFY_STOREFRONT_PUBLIC_TOKEN` | Existing working Shopify Storefront token |
| `DEMO_MODE` | `false` |
| `NEXT_PUBLIC_SITE_URL` | `https://dyu1.vercel.app` |
| `CUSTOMER_ACCOUNT_SITE_URL` | `https://dyu1.vercel.app` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | Existing Shopify Headless Customer Account public client ID |
| `SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID` | `76637307099` |
| `CUSTOMER_ACCOUNT_SESSION_SECRET` | Existing stable random secret, at least 32 bytes |

An existing `SHOPIFY_STOREFRONT_PRIVATE_TOKEN` can replace the public token; do not leave an invalid public token configured alongside it, because the public token takes precedence. The Storefront and Customer Account API versions default to `2026-07`. Keep `SITE_INDEXING_ENABLED=false` during acceptance. Do not copy a temporary Cloudflare origin into either site URL variable.

In the existing Shopify Headless Customer Account client, add the callback `https://dyu1.vercel.app/api/auth/callback`, logout URL `https://dyu1.vercel.app/account`, and JavaScript origin `https://dyu1.vercel.app`. Keep existing preview URLs until cutover is verified.

After saving the environment values, **redeploy dyu1**. Confirm the homepage renders, `/api/health` returns HTTP 200 with `mode: "shopify"` and `ready: true`, and `/api/account` reports `configured: true` before testing sign-in. Environment changes apply to new deployments: [Vercel environment variables](https://vercel.com/docs/environment-variables). If catalogue readiness still fails, the owner must inspect the Vercel runtime logs for the Shopify connection error; these anonymous probes do not reveal which token or network setting failed.

References: [Vercel project configuration](https://vercel.com/docs/project-configuration/vercel-json), [build settings and root directory](https://vercel.com/docs/builds/configure-a-build).

### Persistent Node hosting

Use one persistent Node process behind a trusted HTTPS reverse proxy. Shopify remains the database for products, customers, addresses, wishlist and orders. No application database, Redis, Docker or Kubernetes is needed for this topology. The current refresh-token coordination is in-process: disable clustering, multiple replicas, overlapping rolling releases and automatic horizontal scaling until shared session/refresh coordination is implemented.

Use a currently patched **Node 24 LTS** release for the new host, and run the full build and acceptance checks there. The workstation's default Node 25.2.1 is now end-of-life; the Next minimum version is not a supported-production-runtime recommendation. Node 24 is LTS in the [official release table](https://nodejs.org/en/about/previous-releases). A follow-up using the already-bundled Node **24.19.0** on Windows passed all 86 core tests, TypeScript checking and five health-probe tests without installing a runtime or starting a server. A clean Linux dependency install, production build and deployment acceptance on the chosen host remain unverified.

The existing `next start` setup supports server routes and the image/data cache. It does not require a custom server or `output: standalone`. Do not use a static export: OAuth callbacks, customer APIs, cart, checkout and signed cache invalidation need the server. Next's [self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting) recommends a reverse proxy and describes persistent single-instance caching and streaming.

| File | Purpose |
| --- | --- |
| [`deploy/dyu.service`](../deploy/dyu.service) | Optional Linux/systemd service: one Node process, loopback port 3000, restart after process failure and a 30-second shutdown window |
| [`deploy/nginx.conf.template`](../deploy/nginx.conf.template) | Optional direct-to-Nginx HTTPS proxy with explicit hostname, request limits and restricted logging |
| [`deploy/healthcheck.mjs`](../deploy/healthcheck.mjs) | Portable, anonymous, read-only readiness command; exit 0 only for live Shopify readiness |
| [`.env.example`](../.env.example) | Environment variable names and purposes; no production values |

Managed Node hosting can implement the same controls without these Linux templates. Require a single persistent instance, supported Node LTS, streaming, secret management, HTTPS, adequate request/response header sizes, private/no-store API handling, and a way to redact OAuth queries from all logs. Select a plan only after its cost, region, limits and operational owner are agreed.

## Prepare a release

1. Create a clean release directory from the intended source revision. Transfer source through the repository or an explicit reviewed file list. Exclude `.env*` except `.env.example`, `.git`, local `node_modules`, `.next`, `qa/accounts/preview`, customer records and workstation logs. Do not upload the entire workstation folder. Keep source and secret backups separate.
2. Install dependencies with the lockfile on the target OS/architecture. Do not copy Windows `node_modules` to Linux. Keep build dependencies available: this project has a TypeScript Next config. Dependency pruning requires separate runtime verification and is not part of this template.
3. Supply environment through the host secret manager or a restricted environment file outside the release. The systemd example reads `/etc/dyu/storefront.env`; use `KEY=value` lines, no `export`, and systemd-compatible quoting. Restrict that file to the deployment administrator and never print it. The build must receive the same intended environment through the CI/host environment injection mechanism.
4. Set both `NEXT_PUBLIC_SITE_URL` and `CUSTOMER_ACCOUNT_SITE_URL` to the same permanent HTTPS origin, with no trailing path, query or port. Set `DEMO_MODE=false`. Keep `SITE_INDEXING_ENABLED=false` during private acceptance. Keep the existing random session secret across ordinary releases. Do not create a new secret on every restart.
5. Configure the real Storefront and Customer Account values using `.env.example`. Use only the client-IP header the final proxy overwrites. The direct Nginx template uses `SHOPIFY_BUYER_IP_HEADER=x-real-ip`; this replaces the temporary tunnel's header setting. Set a custom checkout domain only when Shopify actually uses that verified domain.
6. Register the permanent callback `https://HOST/api/auth/callback`, logout `https://HOST/account`, and JavaScript origin `https://HOST` in the existing Shopify Headless client before testing. Keep required existing URLs until cutover succeeds. Provide the intended signed revalidation secret if that webhook is configured.

With the production environment securely injected, run:

```sh
npm ci
npm run typecheck
npm run build
node --test deploy/healthcheck.test.mjs
```

Run the documented browser and account acceptance suite against this release before launch. Any `NEXT_PUBLIC_` value is fixed into browser output at build time; changing the origin or launch indexing flag requires a rebuild. See Next's [environment variable guide](https://nextjs.org/docs/app/guides/environment-variables).

To start the built app under the chosen supervisor, the portable command is:

```sh
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
```

Run it as an unprivileged application user. Keep its `.next` cache writable and persistent. Only the reverse proxy should be externally reachable; do not expose port 3000 or a development server. For a managed host that requires binding its assigned interface/port, use its private ingress boundary and verify direct external access is blocked.

## Optional Linux service

The service template expects `/usr/bin/node`, user/group `dyu`, a release symlink at `/srv/dyu/current`, and an existing `.next` directory writable by that user. Adjust these explicitly for the selected host. Its `ProtectSystem=strict` permits application writes only to `.next`; `PrivateTmp` supplies private temporary storage. Do not run the build under this runtime service.

Before installing or starting the service, validate the rendered unit on the target:

```sh
systemd-analyze verify deploy/dyu.service
```

The deployer then installs the reviewed unit using the host's service-management process. Send SIGTERM and allow the configured 30 seconds to drain requests when stopping. Process failure can restart the service; a Shopify readiness failure should alert an operator rather than trigger an endless restart loop.

## Optional direct HTTPS proxy

The Nginx template belongs inside the `http {}` context, usually as `/etc/nginx/conf.d/dyu.conf`. It is a starting template for a dedicated virtual host, not a command to overwrite the machine's existing configuration. Replace every `STOREFRONT_HOST` with the exact approved hostname. Supply a valid certificate/key at the indicated paths or adjust them to the host's managed TLS paths. Establish certificate issuance and renewal separately; the template does not implement an ACME challenge handler. Require a maintained Nginx release supporting `ssl_reject_handshake`.

Before reloading the proxy, validate the **complete rendered host configuration** with `nginx -t`. Check for conflicts with existing default servers, access logs, `map` names and rate zones. Nginx is not installed and the Docker daemon is not running on the audit workstation, so native Nginx syntax/runtime validation and systemd validation remain target-host checks.

The template applies these concrete controls:

| Control | Configured behavior |
| --- | --- |
| Host and scheme | Reject unknown hosts; redirect the approved HTTP hostname to HTTPS; forward the fixed canonical Host to Node |
| Trusted client IP | Overwrite `X-Real-IP` and `X-Forwarded-For` with the immediate client address; remove incoming forwarded-host and Cloudflare identity headers |
| JSON body limit | 20,000 bytes, matching cart/account application limits; only `/api/revalidate` gets a 4 MiB allowance |
| Slow clients | 10-second client header/body inactivity limits; bounded upstream connection/read/send timeouts |
| Header size | 16 KiB single request-header allowance and 32 KiB upstream response-header buffer, accommodating encrypted split session cookies |
| Caching and streaming | Proxy cache disabled; Next Cache-Control and Set-Cookie preserved; response buffering disabled for streamed HTML |
| Retries | Automatic upstream retry disabled so ambiguous writes are not replayed |
| API rate control | 6 requests/second per IP with burst 30; writes additionally 30/minute with burst 15 |
| Auth rate control | 30 requests/minute per IP with burst 20, covering login and callback |
| Webhook rate control | 10 requests/second per IP with burst 100; HMAC remains the actual authentication mechanism |
| Page rate control | 30 requests/second per IP with burst 100; immutable Next static assets exempt |
| Rejections | Rate-limited requests return 429; application still performs ownership, Origin and input validation |

These are starting limits, not traffic capacity claims. Tune against real anonymous traffic and shared-network usage; avoid blocking legitimate shoppers behind one public IP. Run saturation tests only against a controlled mock/staging backend, not live Shopify mutation routes. Inactivity timeouts are not hard total request-duration limits. If the selected edge supports a hard request-duration ceiling, configure one appropriate to accepted page/API latency.

The template assumes Nginx is the public edge. If a CDN/load balancer sits in front, `$remote_addr` is otherwise the proxy address and all shoppers share a rate bucket. Configure trusted real-IP processing only for that provider's maintained source ranges and block direct origin bypass before enabling it; never trust an arbitrary incoming IP header. Verify final identity headers and HTTPS-origin checks again after that change. Nginx documents [rate limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html), [request limits](https://nginx.org/en/docs/http/ngx_http_core_module.html) and [proxy behavior](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

The safe access log contains only timestamp, HTTP method, fixed route category, status, bytes and duration. It excludes customer identifiers, raw URLs, search/query strings, IPs, referrers, headers and bodies. Ordinary Nginx error messages can contain raw callback requests, so the template discards that error log. Use safe access metrics and the application's bounded auth diagnostics; enabling richer error logs first requires a verified redaction pipeline. Check CDN, load balancer, APM, platform and support-bundle logs too. Restrict journal/log access and configure retention/rotation. The [Nginx logging reference](https://nginx.org/en/docs/http/ngx_http_log_module.html) describes custom access formats.

## Readiness, acceptance and monitoring

Run this anonymous read-only command locally, or set `DYU_HEALTHCHECK_ORIGIN` to the public HTTPS origin in the monitor environment:

```sh
node deploy/healthcheck.mjs
```

It checks only `/api/health`, follows no redirects, sends no cookies, allows five seconds, caps the response at 4 KiB, and prints only a fixed result/status. It passes only for HTTP 200, `Cache-Control: no-store`, the expected application, `mode=shopify`, `ready=true`, and a positive product count. It fails for healthy demo mode, unavailable/empty catalogue, redirects or malformed responses. This is catalogue readiness, not proof that login, payment, orders, shipping or taxes work. The catalogue uses a two-minute cache; a transient upstream failure may not be immediately reflected.

Use a 60-second monitoring interval and alert after three consecutive failures as an initial policy. Monitor public HTTPS and the local process separately; do not create a restart loop during an upstream Shopify outage. Track safe 5xx/429 and auth-failure counts, process restarts, disk/cache growth and TLS expiry. Agree who receives alerts before launch; no scheduled monitor is created by this runbook.

Before public release, verify the final hostname end to end:

1. Unknown Host and direct Node-port access are rejected. Normal public pages and optimized images load on desktop/mobile without streaming or asset errors.
2. `/api/health` passes the probe. Anonymous account endpoints return 401; account/cart/auth responses retain private/no-store. Private source/config paths are inaccessible.
3. Shopify passwordless login, callback, signed-in account reads, wishlist persistence, checkout identity and logout work through the final proxy. Confirm session cookies survive the proxy header limits. Do not paste OAuth callback URLs into logs or screenshots.
4. Repeat the original and loop-copy carousel physical pointer tests with mocked cart routes. Confirm no router/hydration exception occurs on the production host.
5. Verify the signed cache webhook if enabled, or document the two-minute update delay. Perform any live purchase/payment acceptance only under the separately approved merchant test procedure.
6. After merchant launch gates and indexing approval, set `SITE_INDEXING_ENABLED=true`, rebuild, run `npm run check:launch`, then verify canonical URLs, robots and sitemap on the permanent domain. That preflight intentionally fails while indexing is disabled and does not prove remote configuration or payment readiness.

The existing `scripts/check-handover-preview.mjs` is specifically a **preview** check: it expects noindex and an empty sitemap, so do not use it unchanged as a launched-site acceptance test.

## Cutover and rollback

Build in a new release directory. Keep the previous tested release and its matching environment available privately. During a short planned maintenance window, stop/drain the current process, switch the release symlink, and start exactly one process. Verify local health, then the public site. Do not rebuild `.next` in the running release directory. Retain the same session secret and canonical origin across ordinary updates; a domain/secret change may require customers to sign in again.

If the new release fails, stop/drain it, point back to the prior release, restart one process and repeat health plus account checks. Restore the prior compatible environment through secret management when necessary. Do not restore old Shopify catalogue/inventory snapshots or roll back orders as part of a code rollback. Existing browser tabs may have old asset references after a release; test navigation after cutover and ask affected customers to reload if needed. Supporting zero-downtime overlapping releases requires a separate session/cache/version-skew design.

## Validation completed here

- Read the installed Next 16.3.8 self-hosting/environment/deployment guidance and confirmed the production CLI supports the specified bind/port flags.
- `node --test deploy/healthcheck.test.mjs`: **5 passed**, including anonymous request behavior, demo/unhealthy rejection, oversized-stream cancellation, invalid origins and redacted errors.
- Follow-up with the existing bundled **Node 24.19.0 on Windows**: **86/86 core tests passed**, zero failures/skips; TypeScript `--noEmit --incremental false` passed; the **5/5 health-probe tests passed** again. The core runner used that runtime for its child process, removed Shopify/account configuration and kept browser contexts offline. No dependencies were installed, application files changed, Next build created or server started/restarted. See [CI receipt](../qa/handover/ci-verification.json) and [Node 24 core result](../qa/handover/rechecks/node24-core/results.json).
- Probe against the already-running built preview at loopback port 3001: **ready, HTTP 200**. No server was built or restarted and no cart, account or payment mutation was sent.
- Linux Node 24 `npm ci`/production build, hosted CI execution, native Nginx/systemd validation, DNS/TLS, public proxy behavior and permanent-host acceptance: **not performed**. The local Node 24 results do not replace these target-platform checks.
