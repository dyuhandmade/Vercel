import 'server-only';
import {createHash} from 'node:crypto';
import {cookies} from 'next/headers';
import {createRemoteJWKSet} from 'jose';
import {
  accountCodeChallenge, accountRandomValue, isSameAccountOrigin,
  openAccountValue, safeAccountEndpoint, safeAccountReturnTo, sealAccountValue, verifyAccountIdToken,
} from './account-security';
import {
  CustomerAuthCallbackError, runCustomerAuthCallback, safeOAuthError,
  type CustomerAuthFlow, type CustomerTokenResult,
} from './customer-auth-callback';

const FLOW_TTL = 10 * 60;
const SESSION_TTL = 7 * 24 * 60 * 60;
const COOKIE_CHUNK_SIZE = 3500;
const MAX_COOKIE_CHUNKS = 3;

export type AccountConfig = {
  clientId: string; clientSecret?: string; shopId: string; shopDomain: string;
  siteOrigin: string; redirectUri: string; sessionSecret: string; secure: boolean;
};

export type CustomerSession = {
  accessToken: string; refreshToken?: string; idToken: string; expiresAt: number;
  subject: string; sessionExpiresAt: number;
};

type AuthFlow = CustomerAuthFlow;
type AuthEndpoints = {
  issuer: string; authorization_endpoint: string; token_endpoint: string; end_session_endpoint: string; jwks_uri: string;
};
type TokenResult = CustomerTokenResult;

export function getAccountConfig(): AccountConfig | null {
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
  const clientSecret = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET?.trim() || undefined;
  const shopId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID?.trim();
  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN?.trim();
  const sessionSecret = process.env.CUSTOMER_ACCOUNT_SESSION_SECRET;
  const siteUrl = process.env.CUSTOMER_ACCOUNT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!clientId || !shopId || !/^\d+$/.test(shopId) || !shopDomain ||
      !/^[a-z0-9-]+\.myshopify\.com$/i.test(shopDomain) || !sessionSecret ||
      Buffer.byteLength(sessionSecret, 'utf8') < 32 || !siteUrl) return null;
  try {
    const site = new URL(siteUrl);
    const secure = site.protocol === 'https:';
    const localDevelopment = process.env.NODE_ENV !== 'production' && site.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname);
    if ((!secure && !localDevelopment) || site.username || site.password || site.pathname !== '/' || site.search || site.hash) return null;
    return {clientId, clientSecret, shopId, shopDomain, sessionSecret, secure, siteOrigin: site.origin, redirectUri: `${site.origin}/api/auth/callback`};
  } catch {
    return null;
  }
}

export function isAccountMutationAllowed(request: Request): boolean {
  const config = getAccountConfig();
  return !!config && isSameAccountOrigin(request, config.siteOrigin);
}

function sessionCookieName(config: AccountConfig): string {
  return config.secure ? '__Host-dyu-account' : 'dyu-account';
}

function flowCookieName(config: AccountConfig): string {
  return `${sessionCookieName(config)}-flow`;
}

function cookiePurpose(config: AccountConfig, purpose: 'oauth-flow' | 'customer-session'): string {
  return `${purpose}:${config.shopId}:${config.clientId}:${config.siteOrigin}`;
}

function cookieOptions(config: AccountConfig, maxAge: number) {
  return {httpOnly: true, secure: config.secure, sameSite: 'lax' as const, path: '/', maxAge, priority: 'high' as const};
}

const endpointCache = new Map<string, {expires: number; value: AuthEndpoints}>();
const apiCache = new Map<string, {expires: number; value: string}>();
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
// Coalesce simultaneous account/cart requests when a rotating refresh token expires.
// This is a short in-process window only; the browser remains the session store.
const refreshes = new Map<string, {expires: number; promise: Promise<CustomerSession>}>();

async function fetchDiscovery(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, {cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000), headers: {Accept: 'application/json', 'User-Agent': 'DYU-Customer-Accounts/1.0'}});
  if (!response.ok) throw new Error('Customer account discovery is unavailable.');
  return response.json();
}

export async function getAccountEndpoints(config = getAccountConfig()): Promise<AuthEndpoints> {
  if (!config) throw new Error('Customer accounts are not configured.');
  const cacheKey = `${config.shopDomain}:${config.shopId}`;
  const cached = endpointCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const metadata = await fetchDiscovery(`https://${config.shopDomain}/.well-known/openid-configuration`);
  const expectedIssuer = `https://shopify.com/authentication/${config.shopId}`;
  if (metadata.issuer !== expectedIssuer) throw new Error('Customer account issuer does not match this store.');
  const value: AuthEndpoints = {
    issuer: expectedIssuer,
    authorization_endpoint: safeAccountEndpoint(metadata.authorization_endpoint),
    token_endpoint: safeAccountEndpoint(metadata.token_endpoint),
    end_session_endpoint: safeAccountEndpoint(metadata.end_session_endpoint),
    jwks_uri: safeAccountEndpoint(metadata.jwks_uri),
  };
  endpointCache.set(cacheKey, {value, expires: Date.now() + 60 * 60 * 1000});
  return value;
}

export async function getCustomerApiUrl(): Promise<string> {
  const config = getAccountConfig();
  if (!config) throw new Error('Customer accounts are not configured.');
  const version = process.env.SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION || process.env.SHOPIFY_API_VERSION || '2026-07';
  if (!/^20\d{2}-(01|04|07|10)$/.test(version)) throw new Error('Invalid customer account API version.');
  const cacheKey = `${config.shopDomain}:${version}`;
  const cached = apiCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;
  const metadata = await fetchDiscovery(`https://${config.shopDomain}/.well-known/customer-account-api`);
  const url = new URL(safeAccountEndpoint(metadata.graphql_api));
  if (!/\/api\/20\d{2}-(?:01|04|07|10)\/graphql\/?$/.test(url.pathname)) throw new Error('Invalid customer API endpoint.');
  url.pathname = url.pathname.replace(/\/api\/20\d{2}-(?:01|04|07|10)\/graphql\/?$/, `/api/${version}/graphql`);
  const value = url.toString();
  apiCache.set(cacheKey, {value, expires: Date.now() + 60 * 60 * 1000});
  return value;
}

function getJwks(uri: string) {
  let jwks = jwksCache.get(uri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(uri), {timeoutDuration: 10000, cooldownDuration: 30000});
    jwksCache.set(uri, jwks);
  }
  return jwks;
}

async function requestToken(config: AccountConfig, endpoints: AuthEndpoints, parameters: Record<string, string>): Promise<TokenResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json',
    Origin: config.siteOrigin, 'User-Agent': 'DYU-Customer-Accounts/1.0',
  };
  if (config.clientSecret) headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
  let response: Response;
  try {
    response = await fetch(endpoints.token_endpoint, {
      method: 'POST', headers, body: new URLSearchParams({client_id: config.clientId, ...parameters}),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    });
  } catch { throw new CustomerAuthCallbackError({stage: 'token', reason: 'network_error'}); }
  if (!response.ok) {
    let oauthError: unknown;
    try { oauthError = (await response.json())?.error; } catch { /* Never log provider bodies. */ }
    throw new CustomerAuthCallbackError({stage: 'token', reason: 'http_error', httpStatus: response.status, oauthError: safeOAuthError(oauthError)});
  }
  let token: TokenResult;
  try { token = await response.json(); }
  catch { throw new CustomerAuthCallbackError({stage: 'token', reason: 'invalid_token_response'}); }
  if (!token || typeof token.access_token !== 'string' || !token.access_token || token.access_token.length > 6000 ||
      !Number.isFinite(token.expires_in) || token.expires_in <= 0 || token.expires_in > 365 * 24 * 60 * 60 ||
      (token.id_token !== undefined && (typeof token.id_token !== 'string' || token.id_token.length > 6000)) ||
      (token.refresh_token !== undefined && (typeof token.refresh_token !== 'string' || token.refresh_token.length > 6000))) {
    throw new CustomerAuthCallbackError({stage: 'token', reason: 'invalid_token_response'});
  }
  return token;
}

export async function beginCustomerLogin(returnTo: unknown): Promise<string> {
  const config = getAccountConfig();
  if (!config) throw new Error('Customer accounts are not configured.');
  const endpoints = await getAccountEndpoints(config);
  const flow: AuthFlow = {state: accountRandomValue(), nonce: accountRandomValue(), verifier: accountRandomValue(), returnTo: safeAccountReturnTo(returnTo)};
  const url = new URL(endpoints.authorization_endpoint);
  url.search = new URLSearchParams({
    scope: 'openid email customer-account-api:full', client_id: config.clientId, response_type: 'code',
    redirect_uri: config.redirectUri, state: flow.state, nonce: flow.nonce,
    code_challenge: accountCodeChallenge(flow.verifier), code_challenge_method: 'S256',
  }).toString();
  (await cookies()).set(flowCookieName(config), sealAccountValue(flow, config.sessionSecret, cookiePurpose(config, 'oauth-flow'), FLOW_TTL), cookieOptions(config, FLOW_TTL));
  return url.toString();
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies();
  // Clear either transport variant when configuration changes or disappears.
  for (const base of ['dyu-account', '__Host-dyu-account']) {
    const options = {httpOnly: true, secure: base.startsWith('__Host-'), sameSite: 'lax' as const, path: '/', maxAge: 0};
    jar.set(base, '', options);
    jar.set(`${base}-flow`, '', options);
    for (let i = 0; i < MAX_COOKIE_CHUNKS; i++) jar.set(`${base}.${i}`, '', options);
  }
}

async function writeCustomerSession(config: AccountConfig, session: CustomerSession): Promise<void> {
  const maxAge = Math.max(0, Math.floor((session.sessionExpiresAt - Date.now()) / 1000));
  const sealed = sealAccountValue(session, config.sessionSecret, cookiePurpose(config, 'customer-session'), maxAge);
  const chunks = sealed.match(new RegExp(`.{1,${COOKIE_CHUNK_SIZE}}`, 'g')) || [];
  if (!chunks.length || chunks.length > MAX_COOKIE_CHUNKS) throw new CustomerAuthCallbackError({stage: 'session', reason: 'cookie_size'});
  const jar = await cookies();
  const base = sessionCookieName(config);
  jar.set(base, String(chunks.length), cookieOptions(config, maxAge));
  for (let i = 0; i < MAX_COOKIE_CHUNKS; i++) jar.set(`${base}.${i}`, chunks[i] || '', cookieOptions(config, chunks[i] ? maxAge : 0));
}

async function readCustomerSession(config: AccountConfig): Promise<CustomerSession | null> {
  const jar = await cookies();
  const base = sessionCookieName(config);
  const countValue = jar.get(base)?.value;
  if (!countValue || !/^[1-3]$/.test(countValue)) return null;
  const values = Array.from({length: Number(countValue)}, (_, i) => jar.get(`${base}.${i}`)?.value);
  if (values.some(value => !value || value.length > COOKIE_CHUNK_SIZE)) return null;
  const session = openAccountValue<CustomerSession>(values.join(''), config.sessionSecret, cookiePurpose(config, 'customer-session'));
  if (!session || !session.accessToken || !session.idToken || !session.subject ||
      typeof session.accessToken !== 'string' || typeof session.idToken !== 'string' || typeof session.subject !== 'string' ||
      (session.refreshToken !== undefined && typeof session.refreshToken !== 'string') ||
      !Number.isFinite(session.expiresAt) || !Number.isFinite(session.sessionExpiresAt) || session.sessionExpiresAt <= Date.now()) return null;
  return session;
}

function refreshCustomerSession(config: AccountConfig, session: CustomerSession): Promise<CustomerSession> {
  const key = createHash('sha256').update(`${config.clientId}:${session.refreshToken}`).digest('hex');
  const cached = refreshes.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  for (const [entryKey, entry] of refreshes) if (entry.expires <= Date.now()) refreshes.delete(entryKey);
  if (refreshes.size >= 500) refreshes.delete(refreshes.keys().next().value!);
  const promise = (async (): Promise<CustomerSession> => {
    const endpoints = await getAccountEndpoints(config);
    const token = await requestToken(config, endpoints, {grant_type: 'refresh_token', refresh_token: session.refreshToken!});
    if (token.id_token) await verifyAccountIdToken(token.id_token, getJwks(endpoints.jwks_uri), {issuer: endpoints.issuer, clientId: config.clientId, subject: session.subject});
    return {
      ...session, accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000,
      idToken: token.id_token || session.idToken, refreshToken: token.refresh_token || session.refreshToken,
    };
  })();
  refreshes.set(key, {promise, expires: Date.now() + 30000});
  // Attach cleanup without leaving a rejected promise unhandled.
  void promise.catch(() => { if (refreshes.get(key)?.promise === promise) refreshes.delete(key); });
  return promise;
}

/** Route handlers only: refreshes and rotates the HttpOnly session cookies. */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const config = getAccountConfig();
  if (!config) return null;
  const session = await readCustomerSession(config);
  if (!session) return null;
  if (session.expiresAt > Date.now() + 60 * 1000) return session;
  if (!session.refreshToken) {
    await clearCustomerSession();
    return null;
  }
  try {
    const next = await refreshCustomerSession(config, session);
    await writeCustomerSession(config, next);
    return next;
  } catch {
    await clearCustomerSession();
    return null;
  }
}

export async function completeCustomerLogin(parameters: URLSearchParams): Promise<string> {
  const config = getAccountConfig();
  if (!config) throw new CustomerAuthCallbackError({stage: 'configuration', reason: 'unavailable'});
  const jar = await cookies();
  let endpoints: AuthEndpoints;
  return runCustomerAuthCallback(parameters, {
    readFlow: async () => {
      const value = jar.get(flowCookieName(config))?.value;
      return {present: !!value, value: openAccountValue<AuthFlow>(value, config.sessionSecret, cookiePurpose(config, 'oauth-flow'))};
    },
    clearFlow: async () => { jar.set(flowCookieName(config), '', cookieOptions(config, 0)); },
    discover: async () => { endpoints = await getAccountEndpoints(config); },
    exchange: (code, verifier) => requestToken(config, endpoints, {grant_type: 'authorization_code', code, redirect_uri: config.redirectUri, code_verifier: verifier}),
    verify: (idToken, nonce) => verifyAccountIdToken(idToken, getJwks(endpoints.jwks_uri), {issuer: endpoints.issuer, clientId: config.clientId, nonce}),
    save: (token, subject) => writeCustomerSession(config, {
      accessToken: token.access_token, refreshToken: token.refresh_token, idToken: token.id_token,
      expiresAt: Date.now() + token.expires_in * 1000, sessionExpiresAt: Date.now() + SESSION_TTL * 1000, subject,
    }),
  });
}

export async function endCustomerLogin(): Promise<string> {
  const config = getAccountConfig();
  const session = config ? await readCustomerSession(config) : null;
  await clearCustomerSession();
  if (!config || !session) return '/account';
  try {
    const endpoints = await getAccountEndpoints(config);
    const url = new URL(endpoints.end_session_endpoint);
    url.searchParams.set('id_token_hint', session.idToken);
    url.searchParams.set('post_logout_redirect_uri', `${config.siteOrigin}/account`);
    return url.toString();
  } catch {
    // The local session is already invalidated even if Shopify is unavailable.
    return '/account';
  }
}
