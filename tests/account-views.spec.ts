import {test, expect, type Page} from '@playwright/test';
import type {AccountAddress, AccountCustomer, AccountOrderDetail} from '../src/lib/account-types';

const customer: AccountCustomer = {id: 'gid://shopify/Customer/42', firstName: 'Mira', lastName: 'Shah', displayName: 'Mira Shah', email: 'mira@example.test', phone: null};
const amount = (value: string) => ({amount: value, currencyCode: 'INR'});
const order: AccountOrderDetail = {id: 'gid://shopify/Order/123', name: '#1024', processedAt: '2026-09-25T10:00:00Z', financialStatus: 'PAID', fulfillmentStatus: 'FULFILLED', totalPrice: amount('560'), statusPageUrl: 'https://example.test/orders/1024', cancelledAt: null, subtotal: amount('500'), totalShipping: amount('60'), totalTax: amount('0'), totalRefunded: amount('0'), shippingAddress: null, lineItems: {nodes: [{id: 'line1', name: 'Botanical body butter', variantTitle: '100 g', quantity: 1, image: null, price: amount('500'), totalPrice: amount('500'), productId: null, variantId: null}], pageInfo: {hasNextPage: false, endCursor: null}}, fulfillments: {nodes: [{id: 'fulfillment1', status: 'SUCCESS', estimatedDeliveryAt: null, trackingInformation: [{company: 'Courier', number: 'TRACK42', url: 'https://example.test/tracking/TRACK42'}]}], pageInfo: {hasNextPage: false, endCursor: null}}};

async function account(page: Page, authenticated: boolean, configured = true) {
  await page.route(/\/api\/account(?:\?.*)?$/, route => route.fulfill({json: {configured, authenticated, ...(authenticated ? {customer, accountUrl: 'https://example.test/account'} : {})}}));
  await page.route(/\/api\/account\/wishlist(?:\?.*)?$/, route => route.fulfill({json: {handles: []}}));
}

test('guest account pages offer an honest sign-in state and work on a narrow screen', async ({page}) => {
  await account(page, false, false);
  await page.setViewportSize({width: 320, height: 900});
  for (const path of ['/account', '/account/orders', '/account/profile', '/account/addresses']) {
    await page.goto(path);
    await expect(page.getByText('Account sign-in isn’t available just yet.', {exact: false})).toBeVisible();
    await expect(page.getByRole('navigation', {name: 'Account navigation'})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.unroute(/\/api\/account(?:\?.*)?$/);
  await account(page, false, true);
  await page.reload();
  await expect(page.getByRole('link', {name: 'Sign in or create an account'})).toHaveAttribute('href', '/api/auth/login?returnTo=%2Faccount%2Faddresses');
});

test('orders paginate and open private details with tracking', async ({page}) => {
  await account(page, true);
  await page.route(/\/api\/account\/orders(?:\?.*)?$/, route => {
    const next = new URL(route.request().url()).searchParams.has('after');
    return route.fulfill({json: {orders: {nodes: [next ? {...order, id: 'gid://shopify/Order/124', name: '#1025'} : order], pageInfo: {hasNextPage: !next, endCursor: next ? null : 'cursor-1'}}}});
  });
  await page.route(/\/api\/account\/orders\/.*/, route => route.fulfill({json: {order}}));
  await page.goto('/account/orders');
  await expect(page.getByRole('link', {name: /#1024/})).toBeVisible();
  await page.getByRole('button', {name: 'Load more orders'}).click();
  await expect(page.getByRole('link', {name: /#1025/})).toBeVisible();
  await page.getByRole('link', {name: /#1024/}).click();
  await expect(page.getByRole('heading', {name: 'Order #1024'})).toBeVisible();
  await expect(page.getByText('Botanical body butter')).toBeVisible();
  await expect(page.getByRole('link', {name: 'TRACK42'})).toHaveAttribute('href', 'https://example.test/tracking/TRACK42');
  await expect(page.getByRole('link', {name: 'View order updates'})).toHaveAttribute('rel', 'noopener noreferrer');
  await page.setViewportSize({width: 320, height: 900});
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('profile saves supported fields and leaves email changes with the account portal', async ({page}) => {
  let savedCustomer = {...customer};
  await account(page, true);
  await page.route(/\/api\/account(?:\?.*)?$/, route => route.fulfill({json: {configured: true, authenticated: true, customer: savedCustomer, accountUrl: 'https://example.test/account'}}));
  await page.route('**/api/account/profile', async route => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({firstName: 'Meera', lastName: 'Shah'});
    savedCustomer = {...customer, firstName: 'Meera'};
    return route.fulfill({json: {customer: savedCustomer}});
  });
  await page.goto('/account/profile');
  await page.getByLabel('First name', {exact: true}).fill('Meera');
  await page.getByRole('button', {name: 'Save changes'}).click();
  await expect(page.getByText('Your details have been saved.')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Manage your email and account settings'})).toHaveAttribute('href', 'https://example.test/account');
});

test('an expired session immediately clears previously loaded private order data', async ({page}) => {
  let authenticated = true;
  await account(page, true);
  await page.route(/\/api\/account(?:\?.*)?$/, route => route.fulfill({json: {configured: true, authenticated, ...(authenticated ? {customer} : {})}}));
  await page.route(/\/api\/account\/orders(?:\?.*)?$/, route => {
    if (new URL(route.request().url()).searchParams.has('after')) {
      authenticated = false;
      return route.fulfill({status: 401, json: {error: 'Your session has ended. Please sign in again.'}});
    }
    return route.fulfill({json: {orders: {nodes: [order], pageInfo: {hasNextPage: true, endCursor: 'cursor-1'}}}});
  });
  await page.goto('/account/orders');
  await expect(page.getByRole('link', {name: /#1024/})).toBeVisible();
  await page.getByRole('button', {name: 'Load more orders'}).click();
  await expect(page.getByRole('link', {name: 'Sign in or create an account'})).toBeVisible();
  await expect(page.getByText('#1024', {exact: true})).toHaveCount(0);
  await expect(page.getByText('mira@example.test')).toHaveCount(0);
});

test('address book creates, updates default, edits, and confirms removal', async ({page}) => {
  await account(page, true);
  let addresses: AccountAddress[] = [];
  let defaultAddressId: string | null = null;
  await page.route(/\/api\/account\/addresses(?:\?.*)?$/, async route => {
    if (route.request().method() === 'GET') return route.fulfill({json: {addresses: {nodes: addresses, pageInfo: {hasNextPage: false, endCursor: null}}, defaultAddressId}});
    const input = route.request().postDataJSON();
    if (route.request().method() === 'DELETE') addresses = [];
    else if (!input.address && input.default) defaultAddressId = input.id;
    else {
      expect(input.address.territoryCode).toBe('IN');
      expect(input.address.zoneCode).toBe('KA');
      addresses = [{id: 'address-1', ...input.address, province: 'Karnataka', country: 'India', formatted: ['Mira Shah', input.address.address1, 'Bengaluru, Karnataka 560001', 'India']}];
    }
    return route.fulfill({json: {ok: true}});
  });
  await page.goto('/account/addresses');
  await page.getByRole('button', {name: 'Add your first address'}).click();
  await page.getByLabel('Address', {exact: true}).fill('12 Garden Road');
  await page.getByLabel('City', {exact: true}).fill('Bengaluru');
  await page.getByLabel('State / territory').selectOption('KA');
  await page.getByLabel('Postal code').fill('560001');
  await page.getByLabel('Last name (optional)').fill('');
  await page.getByRole('button', {name: 'Save address', exact: true}).click();
  await expect(page.getByText('Your address has been saved.')).toBeVisible();
  await expect(page.getByText('12 Garden Road')).toBeVisible();
  await page.getByRole('button', {name: 'Make default'}).click();
  await expect(page.getByText('Default address', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Edit', exact: true}).click();
  await page.getByLabel('Address', {exact: true}).fill('14 Garden Road');
  await page.getByRole('button', {name: 'Save address', exact: true}).click();
  await expect(page.getByText('14 Garden Road')).toBeVisible();
  await page.getByRole('button', {name: 'Remove', exact: true}).click();
  await expect(page.getByText('Remove this address from your account?')).toBeVisible();
  await page.getByRole('button', {name: 'Keep address'}).click();
  await expect(page.getByText('14 Garden Road')).toBeVisible();
  await page.getByRole('button', {name: 'Remove', exact: true}).click();
  await page.getByRole('button', {name: 'Yes, remove'}).click();
  await expect(page.getByRole('button', {name: 'Add your first address'})).toBeVisible();
});
