// HTTP diagnostics only: verifies routes and client assets without launching a browser.
import assert from 'node:assert/strict';

const base = process.env.DYU_BASE_URL || 'http://127.0.0.1:3000';
const checkedAssets = new Set();
const pages = new Map();
const queue = ['/', '/cart', '/search?q=oil'];
const anchors = [];
const decode = value => value.replaceAll('&amp;', '&');

async function get(path, headers = {}) {
 const response = await fetch(new URL(path, base), {
  headers: { Origin: base, Referer: `${base}/`, ...headers },
  signal: AbortSignal.timeout(30000),
 });
 assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
 return response;
}

async function asset(path) {
 if (checkedAssets.has(path)) return;
 const response = await get(path);
 const type = response.headers.get('content-type') || '';
 if (/\.js(?:\?|$)/.test(path)) assert.match(type, /javascript/, `${path}: wrong script MIME type`);
 // Consume the body so a truncated stream fails the diagnostic too.
 await response.arrayBuffer();
 checkedAssets.add(path);
}

while (queue.length) {
 const path = queue.shift();
 if (pages.has(path)) continue;
 assert.ok(pages.size < 100, 'Unexpectedly large route crawl');
 const response = await get(path);
 const html = await response.text();
 assert.match(html, /<h1[\s>]/, `${path}: missing main heading`);
 pages.set(path, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1])));
 for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
  const url = new URL(decode(href), `${base}${path}`);
  if (url.origin !== base) continue;
  if (url.hash) anchors.push([url.pathname, decodeURIComponent(url.hash.slice(1))]);
  if (!pages.has(url.pathname)) queue.push(url.pathname);
 }
 const assets = [...html.matchAll(/<(?:script|img)\b[^>]*\ssrc="([^"]+)"/g),
  ...html.matchAll(/<link\b[^>]*\shref="([^"]+)"/g)]
  .map(m => new URL(decode(m[1]), base)).filter(u => u.origin === base && !['/', path].includes(u.pathname));
 for (const url of assets) await asset(url.pathname + url.search);
 console.log(`OK ${path}`);
}

for (const [path, id] of anchors) assert.ok(pages.get(path)?.has(id), `Broken anchor: ${path}#${id}`);
await asset('/images/atelier-hero.webp');
for (const shape of ['jar', 'bottle', 'soap']) await asset(`/images/${shape}-atelier.png`);

// Regression for Next's no-cors dev-asset check (script tags use Referer).
const script = [...checkedAssets].find(path => path.endsWith('.js'));
assert.ok(script, 'No client scripts were found');
const noCors = await fetch(new URL(script, base), {headers: {Referer: `${base}/shop`, 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Site': 'cross-site'}, signal: AbortSignal.timeout(10000)});
assert.equal(noCors.status, 200, 'Script request using only Referer was blocked');
await noCors.arrayBuffer();

const missing = await fetch(`${base}/products/does-not-exist`, {signal: AbortSignal.timeout(30000)});
// A loading boundary can stream the shell with 200 before notFound() resolves.
assert.ok([200,404].includes(missing.status), 'Unexpected missing-product status');
const missingHtml = await missing.text();
assert.match(missingHtml, /A LITTLE DETOUR \/ 404/, 'Unknown product must show the recovery page');
assert.match(missingHtml, /name="robots" content="noindex/, 'Unknown product must not be indexed');
const cart = await (await get('/api/cart')).json();
if (cart.demo) {
 const checkout = await fetch(`${base}/api/cart`, {method:'POST', headers:{'Content-Type':'application/json',Origin:base}, body:JSON.stringify({action:'add',lines:[]}), signal:AbortSignal.timeout(10000)});
 assert.equal(checkout.status, 409, 'Preview must not enable live checkout');
 for (const origin of [null, 'https://unrelated.example']) {
  const headers = {'Content-Type':'application/json'};
  if (origin) headers.Origin = origin;
  const rejected = await fetch(`${base}/api/cart`, {method:'POST', headers, body:'{}', signal:AbortSignal.timeout(10000)});
  assert.equal(rejected.status, 403, 'Missing or cross-site origins must remain blocked');
 }
}
console.log(`PASS: ${pages.size} pages, ${checkedAssets.size} assets, ${anchors.length} anchor links, dev script origins, 404 and cart API.`);
