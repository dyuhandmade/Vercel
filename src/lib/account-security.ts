import {createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual} from 'node:crypto';
import {jwtVerify, type JWTVerifyGetKey} from 'jose';

export const ACCOUNT_NO_STORE = {'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer'};

/** Only local paths can survive the OAuth round trip. */
export function safeAccountReturnTo(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/')) return fallback;
  let decoded = value;
  try {
    for (let i = 0; i < 3; i++) {
      if (/^[\/]{2}|[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (/^[\/]{2}|[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || url.pathname.startsWith('/api/auth/')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function isSameAccountOrigin(request: Request, siteOrigin: string): boolean {
  return request.headers.get('origin') === siteOrigin && request.headers.get('sec-fetch-site') !== 'cross-site';
}

/** Next's internal URL can use the bind address; the incoming Host identifies the browser's cookie host. */
export function isCanonicalAccountHost(request: Request, siteOrigin: string): boolean {
  const host = request.headers.get('host');
  if (!host || /[\\/\s@?#]/.test(host)) return false;
  try {
    const canonical = new URL(siteOrigin);
    return new URL(`${canonical.protocol}//${host}`).origin === canonical.origin;
  } catch {
    return false;
  }
}

/** Use the configured external scheme only for its matching raw Host, never forwarded headers. */
export function isSameStorefrontOrigin(
  request: Request,
  siteUrl = process.env.CUSTOMER_ACCOUNT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL,
): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || /[\\/\s@?#]/.test(host) || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    let protocol = new URL(request.url).protocol;
    if (!['http:', 'https:'].includes(protocol)) return false;
    if (siteUrl) {
      const canonical = new URL(siteUrl);
      if (!['http:', 'https:'].includes(canonical.protocol) || canonical.username || canonical.password) return false;
      if (isCanonicalAccountHost(request, canonical.origin)) protocol = canonical.protocol;
    }
    return new URL(`${protocol}//${host}`).origin === origin;
  } catch {
    return false;
  }
}

export function safeAccountEndpoint(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid account endpoint.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.port ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(url.hostname) ||
      /(?:^|\.)(?:localhost|local|internal)$/i.test(url.hostname)) {
    throw new Error('Invalid account endpoint.');
  }
  return url.toString();
}

export function accountRandomValue(): string {
  return randomBytes(32).toString('base64url');
}

export function accountCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function constantTimeAccountEqual(actual: unknown, expected: string): boolean {
  if (typeof actual !== 'string') return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function encryptionKey(secret: string): Buffer {
  if (Buffer.byteLength(secret, 'utf8') < 32) throw new Error('Account session secret must contain at least 32 bytes.');
  return createHash('sha256').update(secret).digest();
}

/** AEAD authenticates the complete envelope, including its purpose and expiry. */
export function sealAccountValue(value: unknown, secret: string, purpose: string, ttlSeconds: number, now = Date.now()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(`dyu-account:v1:${purpose}`));
  const plaintext = JSON.stringify({v: 1, exp: Math.floor(now / 1000) + ttlSeconds, data: value});
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

export function openAccountValue<T>(value: string | undefined, secret: string, purpose: string, now = Date.now()): T | null {
  if (!value || value.length > 16000 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length < 29 || bytes.toString('base64url') !== value) return null;
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(secret), bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(`dyu-account:v1:${purpose}`));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const envelope = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    if (envelope.v !== 1 || !Number.isSafeInteger(envelope.exp) || envelope.exp <= Math.floor(now / 1000)) return null;
    return envelope.data as T;
  } catch {
    return null;
  }
}

export async function verifyAccountIdToken(token: string, key: JWTVerifyGetKey, options: {
  issuer: string; clientId: string; nonce?: string; subject?: string;
}): Promise<string> {
  const {payload} = await jwtVerify(token, key, {
    algorithms: ['RS256', 'ES256'], issuer: options.issuer, audience: options.clientId,
    requiredClaims: ['iss', 'aud', 'exp', 'iat', 'sub'], clockTolerance: 5,
  });
  const rejectClaim = (claim: 'sub' | 'iat' | 'nonce' | 'azp' | 'aud'): never => {
    const subject = payload.sub as unknown;
    const subjectShape = typeof subject === 'number' && Number.isSafeInteger(subject) && subject > 0 ? 'positive_safe_integer'
      : subject === '' ? 'empty_string' : subject === null ? 'null' : subject === undefined ? 'missing'
      : Array.isArray(subject) ? 'array' : typeof subject === 'object' ? 'object' : 'other';
    throw Object.assign(new Error('Invalid customer identity claim.'), {code: 'ERR_JWT_CLAIM_VALIDATION_FAILED', claim, ...(claim === 'sub' ? {subjectShape} : {})});
  };
  // Shopify can return its customer ID as a signed JSON integer rather than a string.
  // Normalize only lossless positive IDs after signature, issuer, audience and expiry verification.
  const rawSubject: unknown = payload.sub;
  const subject = typeof rawSubject === 'string' && rawSubject ? rawSubject
    : typeof rawSubject === 'number' && Number.isSafeInteger(rawSubject) && rawSubject > 0 ? String(rawSubject) : undefined;
  if (!subject) return rejectClaim('sub');
  if (typeof payload.iat !== 'number' || !Number.isFinite(payload.iat) || payload.iat > Math.floor(Date.now() / 1000) + 5) rejectClaim('iat');
  if (options.nonce !== undefined && !constantTimeAccountEqual(payload.nonce, options.nonce)) rejectClaim('nonce');
  if (options.subject !== undefined && !constantTimeAccountEqual(subject, options.subject)) rejectClaim('sub');
  if (payload.azp !== undefined && payload.azp !== options.clientId) rejectClaim('azp');
  if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== options.clientId) rejectClaim('aud');
  return subject;
}
