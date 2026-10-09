import {isCanonicalAccountHost, safeAccountReturnTo} from './account-security';

export const CUSTOMER_LOGIN_UNAVAILABLE = '/account?error=unavailable';

const temporaryDomains = ['trycloudflare.com', 'ngrok.io', 'ngrok.app', 'ngrok-free.app', 'ngrok-free.dev', 'loca.lt'];

/** A null result starts OAuth on this host; redirects keep the registered callback origin unchanged. */
export async function getCustomerLoginRedirect(
  request: Request,
  siteOrigin: string | undefined,
  returnTo: unknown,
  fetcher: typeof fetch = fetch,
): Promise<string | null> {
  if (!siteOrigin) return CUSTOMER_LOGIN_UNAVAILABLE;
  if (isCanonicalAccountHost(request, siteOrigin)) return null;

  const canonical = new URL('/api/auth/login', siteOrigin);
  canonical.searchParams.set('returnTo', safeAccountReturnTo(returnTo));
  const temporary = temporaryDomains.some(domain => canonical.hostname === domain || canonical.hostname.endsWith(`.${domain}`));
  if (temporary) {
    try {
      // Temporary tunnels disappear when stopped. Check the configured destination
      // anonymously before moving the browser, never forwarding its cookies or headers.
      const response = await fetcher(new URL('/api/account', canonical.origin), {
        method: 'GET', credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(3500),
      });
      if (!response.ok || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) return CUSTOMER_LOGIN_UNAVAILABLE;
      const account: unknown = await response.json();
      if (!account || typeof account !== 'object' ||
          !('configured' in account) || account.configured !== true ||
          !('authenticated' in account) || account.authenticated !== false) return CUSTOMER_LOGIN_UNAVAILABLE;
    } catch {
      return CUSTOMER_LOGIN_UNAVAILABLE;
    }
  }
  return canonical.toString();
}
