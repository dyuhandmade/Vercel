import {test, expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {readJsonObject, readRequestBytes} from '../src/lib/request-body';
import {cartChange, validCartId} from '../src/lib/cart-validation';
import {storedWishlist} from '../src/lib/account-validation';
import {validWebhookSignature} from '../src/lib/webhook-security';
import {storefrontReadiness} from '../src/lib/health';

test('readiness returns 503 for an empty or failed catalogue and 200 only when products load', async () => {
  for (const load of [async () => [], async () => { throw new Error('private-upstream-failure'); }]) {
    const response = await storefrontReadiness(load, false);
    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({application: 'DYUhandmade', mode: 'shopify', ready: false, productCount: 0});
  }
  const ready = await storefrontReadiness(async () => [{id: 'public-product'}], false);
  expect(ready.status).toBe(200);
  expect(await ready.json()).toMatchObject({mode: 'shopify', ready: true, productCount: 1});
});

test('request limits reject declared oversize before consuming the stream', async () => {
  const request = new Request('https://dyu.example/api/cart', {method: 'POST', headers: {'content-length': '1000'}, body: '{}'});
  await expect(readRequestBytes(request, 10)).rejects.toMatchObject({status: 413});
  expect(request.bodyUsed).toBe(false);
});

test('chunked oversized requests are cancelled before the remaining body is buffered', async () => {
  let produced = 0, cancelled = false;
  const stream = new ReadableStream<Uint8Array>({pull(controller) { produced++; controller.enqueue(new Uint8Array(8)); }, cancel() { cancelled = true; }});
  const request = new Request('https://dyu.example/api/cart', {method: 'POST', body: stream, duplex: 'half'} as RequestInit);
  await expect(readRequestBytes(request, 12)).rejects.toMatchObject({status: 413});
  expect(cancelled).toBe(true);
  expect(produced).toBeLessThan(5);
});

test('JSON requests require an object, valid UTF-8, a JSON content type and a byte bound', async () => {
  const request = (body: BodyInit, contentType = 'application/json; charset=utf-8') => new Request('https://dyu.example/api/cart', {method: 'POST', headers: {'content-type': contentType}, body});
  expect(await readJsonObject(request('{"action":"add"}'))).toEqual({action: 'add'});
  for (const body of ['null', '[]', '"value"', '{']) await expect(readJsonObject(request(body))).rejects.toMatchObject({status: 400});
  await expect(readJsonObject(request(new Uint8Array([0xff])))).rejects.toMatchObject({status: 400});
  await expect(readJsonObject(request('{}', 'text/plain'))).rejects.toMatchObject({status: 415});
  await expect(readJsonObject(request('{"value":"ééé"}'), 15)).rejects.toMatchObject({status: 413});
});

test('cart changes accept only bounded IDs, quantities and implemented fields', () => {
  const line = 'gid://shopify/CartLine/abc-123?cart=example';
  expect(cartChange({action: 'add', lines: [{merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 2}]})).toEqual({action: 'add', lines: [{merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 2}]});
  expect(cartChange({action: 'update', lines: [{id: line, quantity: 99}]})).toEqual({action: 'update', lines: [{id: line, quantity: 99}]});
  expect(cartChange({action: 'remove', lines: [line, line]})).toEqual({action: 'remove', lines: [line]});
  for (const body of [
    {action: 'add', lines: [null]}, {action: 'add', lines: [{merchandiseId: 'not-a-variant', quantity: 1}]},
    {action: 'add', lines: [{merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1, attributes: []}]},
    {action: 'update', lines: [{id: line, quantity: 0}]}, {action: 'update', lines: [{id: line, quantity: 100}]},
    {action: 'remove', lines: ['gid://shopify/Customer/123']}, {action: 'add', lines: []},
    {action: 'add', lines: Array.from({length: 31}, () => ({merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1}))},
  ]) expect(() => cartChange(body)).toThrow();
  expect(validCartId('gid://shopify/Cart/example?key=example-key')).toBe(true);
  for (const id of ['', '../other', 'gid://shopify/Customer/123', 'gid://shopify/Cart/a\n', `gid://shopify/Cart/${'a'.repeat(2048)}`]) expect(validCartId(id)).toBe(false);
});

test('stored wishlist data cannot silently discard malformed or excess entries during the next write', () => {
  expect(storedWishlist(['rose', 'rose', 'almond'])).toEqual(['rose', 'almond']);
  for (const value of [null, {}, ['rose', '../bad'], ['rose', 12], Array.from({length: 101}, (_, i) => `item-${i}`)]) expect(() => storedWishlist(value)).toThrow();
});

test('webhook authentication covers exact raw bytes and rejects malformed or forged signatures', () => {
  const body = new TextEncoder().encode('{"title":"é"}');
  const secret = 'test-webhook-secret';
  const signature = createHmac('sha256', secret).update(body).digest('base64');
  expect(validWebhookSignature(body, signature, secret)).toBe(true);
  expect(validWebhookSignature(new TextEncoder().encode('{ "title":"é"}'), signature, secret)).toBe(false);
  expect(validWebhookSignature(body, signature, 'different-secret')).toBe(false);
  for (const value of [null, '', signature.replace(/.$/, '!'), `${signature}\n`, 'a'.repeat(10000)]) expect(validWebhookSignature(body, value, secret)).toBe(false);
});

test('cart rejects cross-site requests and malformed bodies without upstream mutations', async ({request}) => {
  const crossSite = await request.post('/api/cart', {headers: {Origin: 'https://unrelated.example'}, data: {action: 'add', lines: []}});
  expect(crossSite.status()).toBe(403);
  expect(crossSite.headers()['cache-control']).toContain('no-store');
  const malformed = await request.post('/api/cart', {headers: {Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json'}, data: 'null'});
  expect([400, 409]).toContain(malformed.status());
  expect(malformed.headers()['cache-control']).toContain('no-store');
  const oversize = await request.post('/api/cart', {headers: {Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json'}, data: JSON.stringify({padding: 'x'.repeat(20001)})});
  expect([413, 409]).toContain(oversize.status());
  expect(oversize.headers()['cache-control']).toContain('no-store');
});
