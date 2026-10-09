import {test,expect,type Page} from '@playwright/test';
import type {Cart} from '../src/lib/types';

const checkoutUrl='https://checkout-qa.myshopify.com/checkouts/test-handoff?key=test-only&sso=silent';
const cart:Cart={id:'test-cart',checkoutUrl:'https://stale.invalid/checkout',totalQuantity:1,lines:{nodes:[{id:'test-line',quantity:1,merchandise:{id:'test-variant',title:'Default Title',price:{amount:'449',currencyCode:'INR'},product:{title:'A saved botanical ritual',handle:'oriental-lavendar'}}}]},cost:{subtotalAmount:{amount:'449',currencyCode:'INR'},totalAmount:{amount:'449',currencyCode:'INR'}}};

async function openBag(page:Page,authenticated=false){
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/cart',route=>route.fulfill({json:{cart}}));
 await page.route('**/api/account',route=>route.fulfill({json:{configured:true,authenticated,...(authenticated?{customer:{id:'test-customer'}}:{})}}));
 await page.route('**/api/account/wishlist',route=>route.fulfill({json:{handles:[]}}));
 // The destination is fully intercepted: no request or purchase reaches Shopify.
 await page.route('https://checkout-qa.myshopify.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Checkout test handoff</title><h1>Checkout handoff received</h1>'}));
 await page.goto('/contact');
 const trigger=page.getByRole('button',{name:'Open bag, 1 items',exact:true});await expect(trigger).toBeVisible();await trigger.click();
 const bag=page.getByRole('dialog',{name:'Your bag',exact:true});await expect(bag).toBeVisible();return bag;
}

for(const {width,authenticated} of [{width:1440,authenticated:false},{width:390,authenticated:true}]){
 test(`${width}px ${authenticated?'signed-in':'guest'} checkout obtains a fresh server handoff before navigating`,async({page})=>{
  await page.setViewportSize({width,height:900});let calls=0;
  await page.route('**/api/checkout',route=>{
   calls++;expect(route.request().method()).toBe('POST');expect(route.request().postDataJSON()).toEqual({});
   return route.fulfill({json:{checkoutUrl}});
  });
  const bag=await openBag(page,authenticated);await bag.getByRole('button',{name:'Continue to checkout',exact:true}).click();
  await expect(page).toHaveURL(checkoutUrl);await expect(page.getByRole('heading',{name:'Checkout handoff received'})).toBeVisible();
  expect(calls).toBe(1);
 });
}

test('checkout locks pending controls, preserves bag on failure, and supports a successful retry',async({page})=>{
 let calls=0,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/checkout',async route=>{
  calls++;if(calls===1){await gate;return route.fulfill({status:503,json:{error:'Checkout is temporarily unavailable. Please try again.'}});}
  return route.fulfill({json:{checkoutUrl}});
 });
 const bag=await openBag(page),button=bag.getByRole('button',{name:'Continue to checkout',exact:true}),start=page.url();
 await button.click();const pending=bag.getByRole('button',{name:'Preparing your bag…',exact:true});await expect(pending).toBeDisabled();
 await expect(bag.getByRole('button',{name:'Increase A saved botanical ritual'})).toBeDisabled();
 await pending.evaluate(element=>(element as HTMLButtonElement).click());expect(calls).toBe(1);
 release();await expect(bag.getByRole('alert')).toContainText('Checkout is temporarily unavailable');
 await expect(button).toBeEnabled();await expect(page).toHaveURL(start);await expect(bag.locator('.quantity span')).toHaveText('1');
 await button.click();await expect(page).toHaveURL(checkoutUrl);expect(calls).toBe(2);
});

test('an incomplete checkout response remains on the storefront with a recoverable error',async({page})=>{
 await page.route('**/api/checkout',route=>route.fulfill({json:{}}));
 const bag=await openBag(page),start=page.url(),button=bag.getByRole('button',{name:'Continue to checkout',exact:true});
 await button.click();await expect(bag.getByRole('alert')).toContainText('Checkout could not be opened. Please retry.');
 await expect(button).toBeEnabled();await expect(page).toHaveURL(start);await expect(bag.locator('.bag-total')).toContainText('₹449');
});
