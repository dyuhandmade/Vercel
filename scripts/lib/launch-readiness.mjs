import {isIP} from 'node:net';

function launchOrigin(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const temporary = ['trycloudflare.com', 'ngrok.io', 'ngrok-free.app', 'loca.lt', 'localhost', 'local', 'test', 'invalid'];
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port ||
        !host.includes('.') || isIP(host.replace(/^\[|\]$/g, '')) || temporary.some(item => host === item || host.endsWith(`.${item}`))) return null;
    return url.origin;
  } catch { return null; }
}

/** Configuration checks only. Never print credential values or claim remote activation. */
export function inspectLaunchEnvironment(env) {
  const checks = [];
  const add = (id, passed, message, level = 'required') => checks.push({id, status: passed ? 'pass' : level === 'warning' ? 'warning' : 'fail', message});
  const site = launchOrigin(env.NEXT_PUBLIC_SITE_URL);
  const auth = launchOrigin(env.CUSTOMER_ACCOUNT_SITE_URL || env.NEXT_PUBLIC_SITE_URL);
  add('domain', !!site, 'NEXT_PUBLIC_SITE_URL must be the permanent HTTPS origin, without a path, port or query.');
  add('account-origin', !!site && auth === site, 'Customer Account origin must match the permanent storefront origin.');
  add('live-data', env.DEMO_MODE === 'false', 'Set DEMO_MODE=false explicitly for launch.');
  add('indexing', env.SITE_INDEXING_ENABLED === 'true', 'Enable SITE_INDEXING_ENABLED only after the launch checklist is approved.');
  add('store-domain', /^[a-z0-9-]+\.myshopify\.com$/i.test(env.SHOPIFY_STORE_DOMAIN || '') && !/^your-store\./i.test(env.SHOPIFY_STORE_DOMAIN || ''), 'Configure the intended Shopify store domain.');
  const publicToken = env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN || '';
  const privateToken = env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN || '';
  add('storefront-token', !!(publicToken || privateToken) && ![publicToken, privateToken].some(value => /^shpat_/i.test(value)), 'Provide a Storefront token; an Admin API token cannot be used here.');
  for (const key of ['SHOPIFY_API_VERSION', 'SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION']) {
    add(key.toLowerCase(), /^\d{4}-(01|04|07|10)$/.test(env[key] || ''), `Pin ${key} to a supported stable Shopify API version; review its support window before launch.`);
  }
  add('customer-client', !!env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim() && /^\d+$/.test(env.SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID || ''), 'Configure the Customer Account client ID and numeric shop ID for this store.');
  const secret = env.CUSTOMER_ACCOUNT_SESSION_SECRET || '';
  add('session-secret', Buffer.byteLength(secret, 'utf8') >= 32 && !/^(change|replace|your|example|test)/i.test(secret) && new Set(secret).size >= 12, 'Use a generated random session secret of at least 32 bytes; share it only through the deployment secret manager.');
  const exposedSecrets = Object.keys(env).some(key => key.startsWith('NEXT_PUBLIC_') && /(SECRET|PRIVATE|PASSWORD|ADMIN.*TOKEN|ACCESS_TOKEN)/i.test(key) && env[key]);
  add('public-secrets', !exposedSecrets, 'No secret/private/password/Admin/access-token value may use a NEXT_PUBLIC_ variable.');
  add('revalidation', !!env.SHOPIFY_WEBHOOK_SECRET, 'Configure a signed Shopify revalidation webhook for prompt content updates; the two-minute cache fallback otherwise applies.', 'warning');
  add('buyer-ip', !!env.SHOPIFY_BUYER_IP_HEADER, 'Configure only the client-IP header overwritten by the trusted reverse proxy, and prevent direct origin access.', 'warning');
  return {configurationReady: checks.every(check => check.status !== 'fail'), checks,
    externalChecksRequired: ['Active Shopify selling plan', 'Razorpay connected and test mode verified', 'Merchant-approved shipping, taxes, inventory and policies', 'Permanent OAuth callback/logout URLs registered', 'Completed no-charge checkout and account-order test', 'Hosting rate limits, backups and monitoring verified']};
}
