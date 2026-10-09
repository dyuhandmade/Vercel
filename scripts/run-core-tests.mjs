import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
// Do not load dotenv. Strip inherited shop/account configuration as well, so a
// developer's configured shell cannot turn fixture-only tests into live reads.
const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:SHOPIFY_|CUSTOMER_ACCOUNT_|NEXT_PUBLIC_|DEMO_MODE$|SITE_INDEXING_ENABLED$)/i.test(key)));
Object.assign(environment, {NODE_ENV: 'test', DEMO_MODE: 'true', SITE_INDEXING_ENABLED: 'false', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000'});
// Explicit blanks also override local dotenv values if the optional CI browser
// group starts the already-built demo app outside a clean CI checkout.
for (const key of ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_STOREFRONT_PUBLIC_TOKEN', 'SHOPIFY_STOREFRONT_PRIVATE_TOKEN', 'SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID', 'SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET', 'SHOPIFY_CUSTOMER_ACCOUNT_SHOP_ID', 'SHOPIFY_CUSTOMER_ACCOUNT_URL', 'SHOPIFY_WEBHOOK_SECRET', 'SHOPIFY_BUYER_IP_HEADER', 'SHOPIFY_CHECKOUT_DOMAIN', 'CUSTOMER_ACCOUNT_SITE_URL', 'CUSTOMER_ACCOUNT_SESSION_SECRET']) environment[key] = '';
const args = process.argv.slice(2);
const browser = args[0] === '--browser';
if (browser) args.shift();
const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', browser ? 'playwright.ci-browser.config.ts' : 'playwright.core.config.ts', ...args], {
  cwd: fileURLToPath(new URL('..', import.meta.url)), env: environment, stdio: 'inherit', windowsHide: true,
});
child.once('error', error => {console.error(error.message); process.exitCode = 1;});
child.once('exit', (code, signal) => {process.exitCode = signal ? 1 : code ?? 1;});
