import {createHmac, timingSafeEqual} from 'node:crypto';

export function validWebhookSignature(body: Uint8Array, signature: string | null, secret: string): boolean {
  if (!signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature) || !secret) return false;
  const actual = Buffer.from(signature, 'base64');
  const expected = createHmac('sha256', secret).update(body).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
