import {test, expect} from '@playwright/test';
import {CUSTOMER_LOGIN_UNAVAILABLE, getCustomerLoginRedirect} from '../src/lib/customer-login';

const preview = 'https://dyu-preview.trycloudflare.com';
const request = (host = 'localhost:3000', headers: Record<string, string> = {}) => new Request('http://0.0.0.0:3000/api/auth/login', {
  headers: {host, ...headers},
});
const healthy = () => Response.json({configured: true, authenticated: false});
const noFetch: typeof fetch = async () => { throw new Error('Unexpected availability probe.'); };

test('missing configuration stays on the current browser host without a network request', async () => {
  expect(await getCustomerLoginRedirect(request(), undefined, '/account', noFetch)).toBe(CUSTOMER_LOGIN_UNAVAILABLE);
  expect(CUSTOMER_LOGIN_UNAVAILABLE).toBe('/account?error=unavailable');
});

test('the raw canonical Host starts OAuth without a probe, including behind an HTTP proxy', async () => {
  expect(await getCustomerLoginRedirect(request('dyu-preview.trycloudflare.com'), preview, '/account', noFetch)).toBeNull();
  expect(await getCustomerLoginRedirect(request('DYU-PREVIEW.TRYCLOUDFLARE.COM:443'), preview, '/account', noFetch)).toBeNull();
});

test('a healthy temporary preview gets one canonical hop with an anonymous bounded probe', async () => {
  let probes = 0;
  const probe: typeof fetch = async (url, init) => {
    probes++;
    expect(String(url)).toBe(`${preview}/api/account`);
    expect(init).toMatchObject({method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error'});
    expect(Array.from(new Headers(init?.headers).entries())).toEqual([['accept', 'application/json']]);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.signal?.aborted).toBe(false);
    return healthy();
  };
  const incoming = request('localhost:3000', {cookie: 'private-session=value', authorization: 'Bearer private', 'x-forwarded-host': 'evil.example'});
  const result = new URL((await getCustomerLoginRedirect(incoming, preview, '/account/orders?cursor=next', probe))!);
  expect(probes).toBe(1);
  expect(result.origin).toBe(preview);
  expect(result.pathname).toBe('/api/auth/login');
  expect(result.searchParams.get('returnTo')).toBe('/account/orders?cursor=next');
});

test('dead, redirected, unavailable and invalid preview responses stay on the current account page', async () => {
  const failures: Array<() => Response | Promise<Response>> = [
    () => { throw new TypeError('DNS lookup failed'); },
    () => { throw new TypeError('Redirect rejected'); },
    () => new Response(null, {status: 503}),
    () => new Response(null, {status: 302, headers: {Location: 'https://evil.example'}}),
    () => new Response('<html>Welcome</html>', {headers: {'Content-Type': 'text/html'}}),
    () => new Response('invalid json', {headers: {'Content-Type': 'application/json'}}),
    () => Response.json(null),
    () => Response.json({configured: false, authenticated: false}),
    () => Response.json({configured: true, authenticated: true}),
    () => Response.json({configured: true}),
  ];
  for (const fail of failures) {
    expect(await getCustomerLoginRedirect(request(), preview, '//evil.example', async () => fail())).toBe(CUSTOMER_LOGIN_UNAVAILABLE);
  }
});

test('a hanging preview request is aborted within the configured timeout', async () => {
  let abortReason: unknown;
  const hanging: typeof fetch = async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => {
      abortReason = init!.signal!.reason;
      reject(abortReason);
    }, {once: true});
  });
  expect(await getCustomerLoginRedirect(request(), preview, '/account', hanging)).toBe(CUSTOMER_LOGIN_UNAVAILABLE);
  expect(abortReason).toMatchObject({name: 'TimeoutError'});
});

test('forwarded host cannot bypass the preview probe or change the registered origin', async () => {
  let probes = 0;
  const probe: typeof fetch = async () => { probes++; return healthy(); };
  const result = new URL((await getCustomerLoginRedirect(request('evil.example', {
    'x-forwarded-host': 'dyu-preview.trycloudflare.com', 'x-forwarded-proto': 'https',
  }), preview, 'https://evil.example/account', probe))!);
  expect(probes).toBe(1);
  expect(result.origin).toBe(preview);
  expect(result.searchParams.get('returnTo')).toBe('/account');
});

test('permanent canonical origins do not incur a probe, while supported temporary domains do', async () => {
  const result = new URL((await getCustomerLoginRedirect(request(), 'https://shop.example.com', '/account', noFetch))!);
  expect(result.origin).toBe('https://shop.example.com');
  for (const origin of ['https://dyu.ngrok.io', 'https://dyu.ngrok.app', 'https://dyu.ngrok-free.app', 'https://dyu.ngrok-free.dev', 'https://dyu.loca.lt']) {
    let probes = 0;
    const probe: typeof fetch = async () => { probes++; return healthy(); };
    expect(new URL((await getCustomerLoginRedirect(request(), origin, '/account', probe))!).origin).toBe(origin);
    expect(probes).toBe(1);
  }
});
