import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** Read-only readiness probe; never sends account cookies or logs response bodies. */
export async function checkReadiness(origin = 'http://127.0.0.1:3000', fetcher = fetch) {
  let url;
  try {
    url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash) throw new Error();
  } catch { return {ready: false, reason: 'invalid_origin'}; }

  try {
    const response = await fetcher(new URL('/api/health', url), {
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(5000),
      headers: {'Accept': 'application/json'},
    });
    if (response.status !== 200) {
      await response.body?.cancel();
      return {ready: false, reason: 'http_status', status: response.status};
    }
    if (!/\bno-store\b/i.test(response.headers.get('cache-control') || '')) {
      await response.body?.cancel();
      return {ready: false, reason: 'cache_policy'};
    }
    const reader = response.body?.getReader();
    if (!reader) return {ready: false, reason: 'invalid_response'};
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 4096) {
          await reader.cancel();
          return {ready: false, reason: 'invalid_response'};
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)));
    if (data?.application !== 'DYUhandmade' || data.ready !== true || data.mode !== 'shopify' ||
        !Number.isSafeInteger(data.productCount) || data.productCount <= 0) {
      return {ready: false, reason: 'not_live_ready'};
    }
    return {ready: true, reason: 'ready', status: 200};
  } catch (error) {
    return {ready: false, reason: ['AbortError', 'TimeoutError'].includes(error?.name) ? 'timeout' : 'unavailable'};
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await checkReadiness(process.env.DYU_HEALTHCHECK_ORIGIN);
  console.log(JSON.stringify(result));
  if (!result.ready) process.exitCode = 1;
}
