import {test, expect} from '@playwright/test';

test('configured login reaches Shopify authorization after at most one canonical redirect', async ({request}) => {
  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').origin;
  const status = await request.get(`${origin}/api/account`, {maxRedirects: 0});
  expect(status.ok()).toBe(true);
  const account = await status.json();
  test.skip(!account.configured, 'Customer Account client configuration is not installed in this environment.');

  let response = await request.get(`${origin}/api/auth/login?returnTo=%2Faccount%3Ftab%3Dorders`, {maxRedirects: 0});
  expect(response.status()).toBe(303);
  let location = response.headers().location;
  // Assert only non-sensitive derived values; never print OAuth state, nonce or cookies.
  expect(typeof location === 'string').toBe(true);
  let destination = new URL(location!);
  let canonicalOrigin = origin;
  if (destination.pathname === '/api/auth/login') {
    expect(destination.origin !== origin).toBe(true);
    expect(destination.protocol).toBe('https:');
    expect(destination.searchParams.get('returnTo')).toBe('/account?tab=orders');
    canonicalOrigin = destination.origin;
    response = await request.get(destination.toString(), {maxRedirects: 0});
    expect(response.status()).toBe(303);
    location = response.headers().location;
    expect(typeof location === 'string').toBe(true);
    destination = new URL(location!);
  }
  // A second application-login hop fails here instead of hiding a redirect loop.
  expect(destination.origin !== canonicalOrigin).toBe(true);
  expect(destination.protocol).toBe('https:');
  expect(destination.pathname.endsWith('/oauth/authorize')).toBe(true);
  expect(destination.searchParams.get('response_type')).toBe('code');
  expect(destination.searchParams.get('code_challenge_method')).toBe('S256');
  expect(destination.searchParams.get('redirect_uri')).toBe(`${canonicalOrigin}/api/auth/callback`);
  expect(Boolean(destination.searchParams.get('state') && destination.searchParams.get('nonce'))).toBe(true);
  expect(response.headers()['cache-control'].includes('no-store')).toBe(true);
  const flowCookies = response.headersArray().filter(header => header.name.toLowerCase() === 'set-cookie');
  expect(flowCookies.length > 0).toBe(true);
  expect(flowCookies.every(header => /httponly/i.test(header.value) && /samesite=lax/i.test(header.value))).toBe(true);
  if (canonicalOrigin.startsWith('https:')) expect(flowCookies.every(header => /;\s*secure(?:;|$)/i.test(header.value))).toBe(true);
});
