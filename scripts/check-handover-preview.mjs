import assert from 'node:assert/strict';
import {mkdirSync, writeFileSync} from 'node:fs';

const origin = new URL(process.env.DYU_BASE_URL || 'http://127.0.0.1:3001').origin;
const checks = [];
async function read(path) {
  const response = await fetch(new URL(path, origin), {redirect: 'manual', signal: AbortSignal.timeout(30000)});
  return response;
}
for (const path of ['/.env.local', '/.git/config', '/src/lib/customer-auth.ts', '/qa/accounts/preview/processes.json', '/shopify/backups/2026-10-04-before-editability.json']) {
  const response = await read(path);
  // Never log or save the response body if a private-path check fails.
  assert.equal(response.status, 404, `Private path is reachable: ${path}`);
  await response.body?.cancel();
  checks.push({path, status: response.status, passed: true});
}
for (const path of ['/api/account/orders', '/api/account/addresses', '/api/account/wishlist']) {
  const response = await read(path);
  assert.equal(response.status, 401, `Anonymous account access: ${path}`);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  await response.body?.cancel();
  checks.push({path, status: response.status, privateNoStore: true});
}
const account = await read('/api/account');
assert.equal(account.status, 200);
assert.match(account.headers.get('cache-control') || '', /no-store/);
const accountStatus = await account.json();
assert.equal(accountStatus.authenticated, false);
assert.equal(accountStatus.customer, undefined);
checks.push({path: '/api/account', status: 200, anonymous: true, noCustomerData: true, privateNoStore: true});
const profileRead = await read('/api/account/profile');
assert.equal(profileRead.status, 405); // Profile is PATCH-only; read data comes from /api/account.
await profileRead.body?.cancel();
checks.push({path: '/api/account/profile', method: 'GET', status: 405});
const health = await read('/api/health');
assert.equal(health.status, 200);
assert.match(health.headers.get('cache-control') || '', /no-store/);
const readiness = await health.json();
assert.equal(readiness.ready, true);
assert.equal(readiness.mode, 'shopify');
checks.push({path: '/api/health', status: health.status, ready: readiness.ready, productCount: readiness.productCount});

const robots = await read('/robots.txt');
assert.match(await robots.text(), /Disallow: \//);
const sitemap = await read('/sitemap.xml');
assert.doesNotMatch(await sitemap.text(), /<loc>/);
const home = await read('/');
assert.equal(home.status, 200);
assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
assert.equal(home.headers.get('x-frame-options'), 'DENY');
assert.match(await home.text(), /name="robots" content="noindex,\s*nofollow"/);
checks.push({path: '/', status: 200, previewNoIndex: true, robotsDisallowAll: true, emptyPreviewSitemap: true, securityHeaders: true});

const result = {checkedAt: new Date().toISOString(), origin, scope: 'Anonymous read-only checks against the built preview; does not place an order or verify a payment.', checks};
mkdirSync('qa/handover', {recursive: true});
writeFileSync('qa/handover/preview-verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({checked: checks.length, ready: true, productCount: readiness.productCount, previewNoIndex: true}));
