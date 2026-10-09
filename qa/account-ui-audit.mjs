import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';

await mkdir('qa/account-ui', {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const results = [];
const customer = {id: 'gid://shopify/Customer/42', firstName: 'Mira', lastName: 'Shah', displayName: 'Mira Shah', email: 'mira@example.test', phone: null};
const address = {id: 'address1', firstName: 'Mira', lastName: 'Shah', company: '', address1: '12 Garden Road', address2: '', city: 'Bengaluru', zoneCode: 'KA', province: 'Karnataka', territoryCode: 'IN', country: 'India', zip: '560001', phoneNumber: '', formatted: ['Mira Shah', '12 Garden Road', 'Bengaluru, Karnataka 560001', 'India']};
const price = amount => ({amount, currencyCode: 'INR'});
const order = {id: 'gid://shopify/Order/123', name: '#1024', processedAt: '2026-09-25T10:00:00Z', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', totalPrice: price('560'), statusPageUrl: 'https://example.test/order', cancelledAt: null, subtotal: price('500'), totalShipping: price('60'), totalTax: price('0'), totalRefunded: price('0'), shippingAddress: address, lineItems: {nodes: [{id: 'line1', name: 'Botanical body butter', variantTitle: '100 g', quantity: 1, image: null, price: price('500'), totalPrice: price('500'), productId: null, variantId: null}], pageInfo: {hasNextPage: false, endCursor: null}}, fulfillments: {nodes: [{id: 'fulfillment1', status: 'SUCCESS', trackingInformation: [{company: 'Courier', number: 'TRACK42', url: 'https://example.test/tracking'}]}], pageInfo: {hasNextPage: false, endCursor: null}}};

for (const authenticated of [false, true]) {
  const context = await browser.newContext({reducedMotion: 'reduce'});
  await context.route(/\/api\/account(?:\?.*)?$/, route => route.fulfill({json: {configured: true, authenticated, ...(authenticated ? {customer, accountUrl: 'https://example.test/account'} : {})}}));
  await context.route(/\/api\/account\/wishlist(?:\?.*)?$/, route => route.fulfill({json: {handles: []}}));
  await context.route(/\/api\/account\/orders(?:\?.*)?$/, route => route.fulfill({json: {orders: {nodes: [order], pageInfo: {hasNextPage: false, endCursor: null}}}}));
  await context.route(/\/api\/account\/orders\/.*/, route => route.fulfill({json: {order}}));
  await context.route(/\/api\/account\/addresses(?:\?.*)?$/, route => route.fulfill({json: {addresses: {nodes: [address], pageInfo: {hasNextPage: false, endCursor: null}}, defaultAddressId: address.id}}));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({width, height: 1000});
    for (const path of authenticated ? ['/account', '/account/orders', `/account/orders/${encodeURIComponent(order.id)}`, '/account/profile', '/account/addresses', '/account/wishlist', '/account/history'] : ['/account']) {
      await page.goto(`http://127.0.0.1:3000${path}`);
      await page.getByRole('navigation', {name: 'Account navigation'}).waitFor();
      await page.locator('main').getByText('Opening your space…', {exact: true}).waitFor({state: 'hidden'});
      await page.evaluate(() => document.fonts.ready);
      const name = path.includes('%') ? 'order-detail' : path.replace('/account', '').replaceAll('/', '') || (authenticated ? 'overview' : 'welcome');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      results.push({authenticated, path, width, overflow, errors: [...errors]});
      if (width === 1440 || width === 390) await page.screenshot({path: `qa/account-ui/${name}-${width}.png`, fullPage: true});
    }
  }
  await context.close();
}
await browser.close();
await writeFile('qa/account-ui/audit.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({views: results.length, issues: results.filter(result => result.overflow > 1 || result.errors.length)}, null, 2));
if (results.some(result => result.overflow > 1 || result.errors.length)) process.exitCode = 1;
