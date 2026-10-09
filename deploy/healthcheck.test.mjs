import assert from 'node:assert/strict';
import test from 'node:test';
import {checkReadiness} from './healthcheck.mjs';

const healthy = {application: 'DYUhandmade', mode: 'shopify', ready: true, productCount: 27};
const json = (body = healthy, init = {}) => Response.json(body, {headers: {'cache-control': 'private, no-store'}, ...init});

test('probe makes one anonymous, bounded GET and accepts live readiness', async () => {
  let calls = 0;
  const result = await checkReadiness('https://store.example', async (url, options) => {
    calls++;
    assert.equal(String(url), 'https://store.example/api/health');
    assert.equal(options.redirect, 'manual');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(options.headers, {Accept: 'application/json'});
    return json();
  });
  assert.deepEqual(result, {ready: true, reason: 'ready', status: 200});
  assert.equal(calls, 1);
});

test('redirects and unhealthy HTTP statuses fail without following or exposing bodies', async () => {
  for (const status of [302, 401, 429, 500, 503]) {
    assert.deepEqual(await checkReadiness(undefined, async () => new Response('private response', {status})),
      {ready: false, reason: 'http_status', status});
  }
});

test('demo, empty, wrong application and false readiness do not pass', async () => {
  for (const change of [{mode: 'demo'}, {productCount: 0}, {productCount: 1.5}, {ready: false}, {application: 'other'}]) {
    assert.deepEqual(await checkReadiness(undefined, async () => json({...healthy, ...change})),
      {ready: false, reason: 'not_live_ready'});
  }
  assert.deepEqual(await checkReadiness(undefined, async () => json(healthy, {headers: {}})),
    {ready: false, reason: 'cache_policy'});
});

test('malformed or oversized responses fail and oversized streams are cancelled', async () => {
  assert.equal((await checkReadiness(undefined, async () => new Response('not json', {headers: {'cache-control': 'no-store'}}))).ready, false);
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(4097)); },
    cancel() { cancelled = true; },
  });
  assert.deepEqual(await checkReadiness(undefined, async () => new Response(stream, {headers: {'cache-control': 'no-store'}})),
    {ready: false, reason: 'invalid_response'});
  assert.equal(cancelled, true);
});

test('invalid origins do not fetch and network errors never print private details', async () => {
  for (const origin of ['https://user:password@store.example', 'https://store.example/path', 'https://store.example?secret=value', 'file:///private']) {
    assert.deepEqual(await checkReadiness(origin, () => { throw new Error('must not fetch'); }),
      {ready: false, reason: 'invalid_origin'});
  }
  assert.deepEqual(await checkReadiness(undefined, async () => { throw new Error('private upstream details'); }),
    {ready: false, reason: 'unavailable'});
  assert.deepEqual(await checkReadiness(undefined, async () => { throw new DOMException('private timeout details', 'TimeoutError'); }),
    {ready: false, reason: 'timeout'});
});
