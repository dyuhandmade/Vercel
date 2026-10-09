import {revalidateTag} from 'next/cache';
import {readRequestBytes, RequestBodyError} from '@/lib/request-body';
import {validWebhookSignature} from '@/lib/webhook-security';

const headers = {'Cache-Control': 'no-store'};
export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) return new Response('Not configured', {status: 503, headers});
  const signature = request.headers.get('x-shopify-hmac-sha256');
  if (!signature || !/^[A-Za-z0-9+/]{43}=$/.test(signature)) return new Response('Unauthorized', {status: 401, headers});
  try {
    const body = await readRequestBytes(request, 4 * 1024 * 1024);
    if (!validWebhookSignature(body, signature, secret)) return new Response('Unauthorized', {status: 401, headers});
    revalidateTag('shopify', {expire: 0});
    return Response.json({revalidated: true}, {headers});
  } catch (error) {
    return new Response(error instanceof RequestBodyError ? error.message : 'Revalidation unavailable', {status: error instanceof RequestBodyError ? error.status : 503, headers});
  }
}
