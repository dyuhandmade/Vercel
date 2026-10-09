import {test, expect} from '@playwright/test';
import {createLocalJWKSet, exportJWK, generateKeyPair, SignJWT} from 'jose';
import {
  accountCodeChallenge, accountRandomValue, constantTimeAccountEqual, isCanonicalAccountHost, isSameAccountOrigin, isSameStorefrontOrigin,
  openAccountValue, safeAccountEndpoint, safeAccountReturnTo, sealAccountValue, verifyAccountIdToken,
} from '../src/lib/account-security';

const secret = 'testing-only-session-secret-with-64-randomish-characters-0123456789';

test('OAuth return locations reject external, encoded and control-character redirects', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/%5cevil.example', '/%2fevil.example', '/%252fevil.example', '/%0d%0aLocation:evil', '/api/auth/login', 'javascript:alert(1)']) {
    expect(safeAccountReturnTo(value), value).toBe('/account');
  }
  expect(safeAccountReturnTo('/account?tab=orders#latest')).toBe('/account?tab=orders#latest');
  expect(safeAccountReturnTo('/products/facial-oil')).toBe('/products/facial-oil');
});

test('account writes require the exact configured Origin', () => {
  const site = 'https://dyu.example';
  expect(isSameAccountOrigin(new Request(`${site}/api/account`, {headers: {Origin: site}}), site)).toBe(true);
  for (const origin of ['https://evil.example', 'https://dyu.example.evil.example', 'null', 'http://dyu.example']) {
    expect(isSameAccountOrigin(new Request(`${site}/api/account`, {headers: {Origin: origin}}), site)).toBe(false);
  }
  expect(isSameAccountOrigin(new Request(`${site}/api/account`), site)).toBe(false);
  expect(isSameAccountOrigin(new Request(`${site}/api/account`, {headers: {Origin: site, 'Sec-Fetch-Site': 'cross-site'}}), site)).toBe(false);
});

test('canonical login uses the browser Host instead of a normalized Next bind address', () => {
  const request = (host: string, forwardedHost?: string) => new Request('http://0.0.0.0:3000/api/auth/login', {
    headers: {host, ...(forwardedHost ? {'x-forwarded-host': forwardedHost} : {})},
  });
  expect(isCanonicalAccountHost(request('localhost:3000'), 'http://localhost:3000')).toBe(true);
  expect(isCanonicalAccountHost(request('127.0.0.1:3000'), 'http://localhost:3000')).toBe(false);
  expect(isCanonicalAccountHost(request('evil.example', 'localhost:3000'), 'http://localhost:3000')).toBe(false);
  expect(isCanonicalAccountHost(request('evil.example@localhost:3000'), 'http://localhost:3000')).toBe(false);
  expect(isCanonicalAccountHost(request('DYU.EXAMPLE:443'), 'https://dyu.example')).toBe(true);
});

test('cart and checkout accept a configured HTTPS host behind HTTP without trusting forwarded headers', () => {
  const site = 'https://dyu-preview.trycloudflare.com';
  const request = (headers: Record<string, string>) => new Request('http://0.0.0.0:3000/api/checkout', {method: 'POST', headers});
  const canonicalHeaders = {host: 'dyu-preview.trycloudflare.com', origin: site};
  expect(isSameStorefrontOrigin(request(canonicalHeaders), site)).toBe(true);
  expect(isSameStorefrontOrigin(request({...canonicalHeaders, origin: 'http://dyu-preview.trycloudflare.com'}), site)).toBe(false);
  expect(isSameStorefrontOrigin(request({host: 'localhost:3000', origin: 'http://localhost:3000'}), site)).toBe(true);
  expect(isSameStorefrontOrigin(request({host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000'}), site)).toBe(true);
  expect(isSameStorefrontOrigin(request({host: 'localhost:3000', origin: site, 'x-forwarded-host': 'dyu-preview.trycloudflare.com', 'x-forwarded-proto': 'https'}), site)).toBe(false);
  expect(isSameStorefrontOrigin(request({host: 'evil.example', origin: 'https://evil.example', 'x-forwarded-host': 'dyu-preview.trycloudflare.com', 'x-forwarded-proto': 'https'}), site)).toBe(false);
  expect(isSameStorefrontOrigin(request({...canonicalHeaders, origin: 'https://evil.example'}), site)).toBe(false);
  expect(isSameStorefrontOrigin(request({host: canonicalHeaders.host}), site)).toBe(false);
  expect(isSameStorefrontOrigin(request({...canonicalHeaders, 'sec-fetch-site': 'cross-site'}), site)).toBe(false);
});

test('PKCE uses the RFC 7636 S256 vector and cryptographically random verifier values', () => {
  expect(accountCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  const values = Array.from({length: 50}, accountRandomValue);
  expect(new Set(values).size).toBe(50);
  for (const value of values) expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test('session cookies encrypt private data and reject tampering, a different key and purpose', () => {
  const value = {accessToken: 'private-shopify-token', subject: 'customer-123'};
  const sealed = sealAccountValue(value, secret, 'customer-session', 60, 100000);
  expect(sealed).not.toContain(value.accessToken);
  expect(openAccountValue(sealed, secret, 'customer-session', 100001)).toEqual(value);
  const tampered = `${sealed.slice(0, 35)}${sealed[35] === 'A' ? 'B' : 'A'}${sealed.slice(36)}`;
  expect(openAccountValue(tampered, secret, 'customer-session', 100001)).toBeNull();
  expect(openAccountValue(sealed, `${secret}other`, 'customer-session', 100001)).toBeNull();
  expect(openAccountValue(sealed, secret, 'oauth-flow', 100001)).toBeNull();
  expect(openAccountValue(sealed, secret, 'customer-session', 160000)).toBeNull();
});

test('malformed session values and undersized keys fail closed', () => {
  for (const value of [undefined, '', 'invalid', 'abc=', 'a'.repeat(17000)]) expect(openAccountValue(value, secret, 'customer-session')).toBeNull();
  expect(() => sealAccountValue({}, 'short-key', 'customer-session', 60)).toThrow();
  expect(constantTimeAccountEqual('abc', 'abc')).toBe(true);
  expect(constantTimeAccountEqual('ab', 'abc')).toBe(false);
  expect(constantTimeAccountEqual(undefined, 'abc')).toBe(false);
});

test('discovered endpoints require public HTTPS destinations without credentials', () => {
  expect(safeAccountEndpoint('https://account.dyu.example/authentication/token')).toBe('https://account.dyu.example/authentication/token');
  for (const value of ['http://shopify.com/auth', 'https://user:secret@shopify.com/auth', 'https://127.0.0.1/token', 'https://localhost/token', 'https://internal/token', 'https://test.local/token', 'https://shopify.com:444/token', 'https://shopify.com/token#secret']) {
    expect(() => safeAccountEndpoint(value), value).toThrow();
  }
});

test('ID tokens verify signature, issuer, audience, expiry, nonce and refreshing subject', async () => {
  const pair = await generateKeyPair('RS256');
  const jwk = {...await exportJWK(pair.publicKey), kid: 'shopify-test-key'};
  const jwks = createLocalJWKSet({keys: [jwk]});
  const issuer = 'https://shopify.com/authentication/123';
  const clientId = 'public-client';
  const options = {issuer, clientId, nonce: 'expected-nonce'};
  const issue = (overrides: Record<string, unknown> = {}, signingKey = pair.privateKey) => new SignJWT({nonce: 'expected-nonce', ...overrides})
    .setProtectedHeader({alg: 'RS256', kid: 'shopify-test-key'}).setIssuer(issuer).setAudience(clientId)
    .setSubject('customer-123').setIssuedAt().setExpirationTime('5m').sign(signingKey);
  const token = await issue();
  expect(await verifyAccountIdToken(token, jwks, options)).toBe('customer-123');
  await expect(verifyAccountIdToken(token, jwks, {...options, nonce: 'wrong'})).rejects.toMatchObject({code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'nonce'});
  await expect(verifyAccountIdToken(token, jwks, {...options, issuer: `${issuer}4`})).rejects.toThrow();
  await expect(verifyAccountIdToken(token, jwks, {...options, clientId: 'wrong'})).rejects.toThrow();
  await expect(verifyAccountIdToken(token, jwks, {...options, subject: 'another-customer'})).rejects.toMatchObject({code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'sub'});
  await expect(verifyAccountIdToken(await issue({azp: 'other-client'}), jwks, options)).rejects.toMatchObject({code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'azp'});
  const otherPair = await generateKeyPair('RS256');
  await expect(verifyAccountIdToken(await issue({}, otherPair.privateKey), jwks, options)).rejects.toThrow();
  const expired = await new SignJWT({nonce: options.nonce}).setProtectedHeader({alg: 'RS256', kid: jwk.kid})
    .setIssuer(issuer).setAudience(clientId).setSubject('customer-123').setIssuedAt(1).setExpirationTime(2).sign(pair.privateKey);
  await expect(verifyAccountIdToken(expired, jwks, options)).rejects.toThrow();
  const unsigned = `${Buffer.from(JSON.stringify({alg: 'none'})).toString('base64url')}.${Buffer.from(JSON.stringify({iss: issuer, aud: clientId, sub: 'attacker'})).toString('base64url')}.`;
  await expect(verifyAccountIdToken(unsigned, jwks, options)).rejects.toThrow();
});

test('signed Shopify numeric subjects normalize losslessly while identity safeguards remain enforced', async () => {
  const pair = await generateKeyPair('RS256');
  const jwk = {...await exportJWK(pair.publicKey), kid: 'numeric-subject-key'};
  const jwks = createLocalJWKSet({keys: [jwk]});
  const options = {issuer: 'https://shopify.com/authentication/123', clientId: 'numeric-test-client', nonce: 'expected-nonce'};
  const issue = (subject: unknown, key = pair.privateKey) => {
    const payload: Record<string, unknown> = {sub: subject, nonce: options.nonce};
    return new SignJWT(payload).setProtectedHeader({alg: 'RS256', kid: jwk.kid}).setIssuer(options.issuer)
      .setAudience(options.clientId).setIssuedAt().setExpirationTime('5m').sign(key);
  };
  const token = await issue(12345);
  expect(await verifyAccountIdToken(token, jwks, options)).toBe('12345');
  expect(await verifyAccountIdToken(token, jwks, {...options, subject: '12345'})).toBe('12345');
  expect(await verifyAccountIdToken(await issue('gid://shopify/Customer/12345'), jwks, options)).toBe('gid://shopify/Customer/12345');
  await expect(verifyAccountIdToken(token, jwks, {...options, subject: '54321'})).rejects.toMatchObject({code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'sub'});
  await expect(verifyAccountIdToken(token, jwks, {...options, nonce: 'wrong-nonce'})).rejects.toMatchObject({code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim: 'nonce'});
  const untrusted = await generateKeyPair('RS256');
  await expect(verifyAccountIdToken(await issue(12345, untrusted.privateKey), jwks, options)).rejects.toThrow();
  for (const subject of [null, undefined, '', [], {}, true, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await expect(verifyAccountIdToken(await issue(subject), jwks, options)).rejects.toThrow();
  }
});
