import {test,expect,type Page} from '@playwright/test';
import type {Cart,Variant} from '../src/lib/types';

const product={handle:'oriental-lavendar',title:'Oriental Lavendar Cold Processed Soap',variantId:'gid://shopify/ProductVariant/46836266041563',variantTitle:'Default Title',price:'449.0'};
const soldOut={handle:'damask-rose-cold-processed-soap',title:'Damask Rose Cold Processed Soap'};
const optionVariants:Variant[]=[
 {id:product.variantId,title:'50 g',availableForSale:true,price:{amount:'449.0',currencyCode:'INR'},selectedOptions:[{name:'Size',value:'50 g'}]},
 {id:'gid://shopify/ProductVariant/90000000000002',title:'100 g',availableForSale:true,price:{amount:'799.0',currencyCode:'INR'},selectedOptions:[{name:'Size',value:'100 g'}]},
 {id:'gid://shopify/ProductVariant/90000000000003',title:'200 g',availableForSale:false,price:{amount:'1399.0',currencyCode:'INR'},selectedOptions:[{name:'Size',value:'200 g'}]},
];
const errors=new WeakMap<Page,string[]>();

test.beforeEach(async({page})=>{
 const issues:string[]=[];errors.set(page,issues);
 page.on('pageerror',error=>issues.push(error.stack||error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))issues.push(message.text());});
 await page.emulateMedia({reducedMotion:'reduce'});
});
test.afterEach(async({page})=>expect(errors.get(page)||[],'Quick-add must not introduce runtime or hydration errors').toEqual([]));

// Only the browser's cart endpoint is stubbed. Product cards and navigation use
// the real local storefront, while no cart mutation reaches Shopify.
async function mockCart(page:Page,{failures=0,delay=0,variants=[]}:{failures?:number;delay?:number;variants?:Variant[]}={}){
 let cart:Cart|null=null;
 const calls:{action:string;lines:{merchandiseId:string;quantity:number}[]}[]=[];
 await page.route('**/api/cart',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{cart}});
  const payload=route.request().postDataJSON();calls.push(payload);
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
  if(failures-->0)return route.fulfill({status:422,json:{error:'This item could not be added. Please try again.'}});
  const line=payload.lines[0];
  const quantity=(cart?.totalQuantity||0)+line.quantity;
  const variant=variants.find(item=>item.id===line.merchandiseId);
  const price=variant?.price||{amount:product.price,currencyCode:'INR'};
  const total={amount:String(Number(price.amount)*quantity),currencyCode:'INR'};
  cart={id:'qa-cart',checkoutUrl:'https://example.invalid/checkout',totalQuantity:quantity,lines:{nodes:[{id:'qa-line',quantity,merchandise:{id:line.merchandiseId,title:variant?.title||product.variantTitle,price,product:{title:product.title,handle:product.handle}}}]},cost:{subtotalAmount:total,totalAmount:total}};
  return route.fulfill({json:{cart}});
 });
 return {calls};
}

async function catalogueCard(page:Page,handle=product.handle){
 await page.goto('/shop');
 const card=page.locator(`#main .catalog-grid .product-card[data-product-handle="${handle}"]`);
 await expect(card).toBeVisible();
 await card.scrollIntoViewIfNeeded();
 return card;
}

for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 test(`${viewport.width}px quick-add stays on the catalogue, updates bag and survives reload`,async({page})=>{
  await page.setViewportSize(viewport);
  const {calls}=await mockCart(page);
  const card=await catalogueCard(page),url=page.url();
  const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
  await expect(add).toBeEnabled();
  await add.click();
  const bag=page.getByRole('dialog',{name:'Your bag',exact:true});
  await expect(bag).toBeVisible();
  await expect(bag.getByRole('link',{name:product.title,exact:true})).toBeVisible();
  await expect(bag.locator('.bag-total')).toContainText('₹449');
  await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
  await expect(page).toHaveURL(url);
  expect(calls).toEqual([{action:'add',lines:[{merchandiseId:product.variantId,quantity:1}]}]);
  await bag.screenshot({path:`qa/product-card-bag-${viewport.width}.png`});
  await page.keyboard.press('Escape');
  await expect(bag).not.toBeVisible();
  await add.click();
  await expect(bag.locator('.bag-total')).toContainText('₹898');
  await expect(page.getByRole('button',{name:'Open bag, 2 items',exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Open bag, 2 items',exact:true}).click();
  await expect(bag.getByRole('link',{name:product.title,exact:true})).toBeVisible();
  await expect(bag.locator('.quantity span')).toHaveText('2');
  expect(calls).toHaveLength(2);
 });
}

test('failed quick-add shows a local error without a false bag count, then retries successfully',async({page})=>{
 const {calls}=await mockCart(page,{failures:1});
 const card=await catalogueCard(page),url=page.url();
 const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
 await add.click();
 await expect(card.getByRole('alert')).toContainText('This item could not be added. Please try again.');
 await expect(page.getByRole('button',{name:'Open bag, 0 items',exact:true})).toBeVisible();
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).not.toBeVisible();
 await expect(page).toHaveURL(url);
 await expect(add).toBeEnabled();
 await add.click();
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
 await expect(card.getByRole('alert')).toHaveCount(0);
 expect(calls).toHaveLength(2);
});

test('pending quick-add disables the control and does not submit twice',async({page})=>{
 const {calls}=await mockCart(page,{delay:650});
 const card=await catalogueCard(page);
 const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
 await add.click();
 await expect(add).toBeDisabled();
 await add.evaluate(button=>(button as HTMLButtonElement).click());
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
 expect(calls).toHaveLength(1);
 await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
});

test('sold-out cards cannot add, while their image and title still open product details',async({page})=>{
 const {calls}=await mockCart(page);
 const card=await catalogueCard(page,soldOut.handle);
 await expect(card.getByRole('button',{name:`Sold out: ${soldOut.title}`,exact:true})).toBeDisabled();
 await card.getByRole('link',{name:`Discover ${soldOut.title}`,exact:true}).click();
 await expect(page).toHaveURL(`/products/${soldOut.handle}`);
 await page.goBack();
 await card.getByRole('link',{name:soldOut.title,exact:true}).click();
 await expect(page).toHaveURL(`/products/${soldOut.handle}`);
 expect(calls).toHaveLength(0);
});

test('keyboard quick-add activates the bag without following the product link',async({page})=>{
 const {calls}=await mockCart(page);
 const card=await catalogueCard(page),url=page.url();
 const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
 await add.focus();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
 await expect(page).toHaveURL(url);
 expect(calls).toHaveLength(1);
});

test('similar-product quick-add uses the same bag action without navigating',async({page})=>{
 const {calls}=await mockCart(page);
 await page.goto(`/products/${soldOut.handle}#similar-products`);
 const carousel=page.locator('#main #similar-products');
 const card=carousel.locator(`.similar-group:not(.similar-copy) .product-card[data-product-handle="${product.handle}"]`);
 await expect(card).toBeVisible();
 const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
 await add.focus();
 const url=page.url();
 await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
 await expect(page).toHaveURL(url);
 expect(calls).toHaveLength(1);
});

for(const copy of [false,true]){
 test(`pointer quick-add works on a partially scrolled ${copy?'loop copy':'original'} carousel card`,async({page})=>{
  const {calls}=await mockCart(page);
  await page.goto(`/products/${soldOut.handle}#similar-products`);
  const viewport=page.locator('#main .similar-viewport');
  await viewport.scrollIntoViewIfNeeded();
  const selector=`${copy?'.similar-copy':'.similar-group:not(.similar-copy)'} .product-card[data-product-handle="${product.handle}"]`;
  const button=page.locator(`#main ${selector}`).getByRole('button',{name:`Add ${product.title} to bag`,exact:true,includeHidden:true});
  await viewport.evaluate((element,{selector,copy})=>{
   const target=element.querySelector(selector)!;
   const width=element.querySelector('.similar-group')!.getBoundingClientRect().width;
   const offset=target.getBoundingClientRect().left-element.getBoundingClientRect().left+element.scrollLeft;
   element.scrollLeft=copy?width-10:Math.max(0,offset-element.clientWidth*.3);
  },{selector,copy});
  // Use physical coordinates so focus cannot silently move the card before
  // Playwright retries the click at a new position. The real pointer must work.
  await expect(button).toBeInViewport();
  const box=await button.boundingBox();expect(box).toBeTruthy();
  const url=page.url();
  await page.mouse.click(box!.x+box!.width/2,box!.y+box!.height/2);
  await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
  await expect(page).toHaveURL(url);
  expect(calls).toHaveLength(1);
 });
}

test('products with options wait for an explicit available choice before adding',async({page})=>{
 const {calls}=await mockCart(page,{variants:optionVariants});
 const original={id:product.variantId,title:'Default Title',availableForSale:true,price:{amount:'449.0',currencyCode:'INR'},selectedOptions:[{name:'Title',value:'Default Title'}]};
 let fixtureApplied=false;
 // Fixture only the RSC client-navigation response: the client renders the
 // genuine card from supplied catalogue data, without changing Shopify or
 // creating a production-only test route / server hydration mismatch.
 await page.route(url=>url.pathname==='/shop',async route=>{
  if(!route.request().headers()['rsc'])return route.continue();
  const response=await route.fetch(),body=await response.text();
  const originalJSON=`"variants":[${JSON.stringify(original)}]`;
  const fixture=`"variants":${JSON.stringify(optionVariants)}`;
  const changed=body.replaceAll(originalJSON,fixture);
  fixtureApplied ||= changed!==body;
  await route.fulfill({response,body:changed});
 });
 await page.goto('/faq');
 await page.getByRole('navigation',{name:'Main navigation',exact:true}).getByRole('link',{name:'The collection',exact:true}).click();
 await expect(page).toHaveURL('/shop');
 const card=page.locator(`.catalog-grid .product-card[data-product-handle="${product.handle}"]`);
 await expect(card).toBeVisible();
 expect(fixtureApplied,'Option fixture must be applied to the real catalogue navigation response').toBe(true);
 const add=card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true});
 await add.click();
 const options=card.getByRole('region',{name:`Choose options for ${product.title}`,exact:true});
 await expect(options).toBeVisible();
 await expect(add).toHaveAttribute('aria-expanded','true');
 await expect(options.getByRole('button',{name:'Add to bag',exact:true})).toBeDisabled();
 await expect(options.getByRole('radio',{name:/200 g/})).toBeDisabled();
 expect(calls).toHaveLength(0);
 await options.getByRole('button',{name:`Close options for ${product.title}`,exact:true}).focus();
 await page.keyboard.press('Escape');
 await expect(options).toHaveCount(0);
 await expect(add).toBeFocused();
 await add.click();
 await options.getByRole('radio',{name:/100 g/}).check();
 await card.screenshot({path:'qa/product-card-options.png'});
 await expect(options.getByRole('button',{name:'Add to bag',exact:true})).toBeEnabled();
 await options.getByRole('button',{name:'Add to bag',exact:true}).click();
 const bag=page.getByRole('dialog',{name:'Your bag',exact:true});
 await expect(bag).toBeVisible();
 await expect(bag.locator('.bag-line p')).toHaveText('100 g');
 await expect(bag.locator('.bag-total')).toContainText('₹799');
 expect(calls).toEqual([{action:'add',lines:[{merchandiseId:optionVariants[1].id,quantity:1}]}]);
 await expect(options).toHaveCount(0);
 await expect(page).toHaveURL('/shop');
});

test('a delayed initial cart read cannot erase a newly added product',async({page})=>{
 let release:()=>void=()=>{};
 const initialRead=new Promise<void>(resolve=>{release=resolve;});
 await mockCart(page);
 await page.route('**/api/cart',async route=>{
  if(route.request().method()!=='GET')return route.fallback();
  await initialRead;
  return route.fulfill({json:{cart:null}});
 });
 const card=await catalogueCard(page);
 await card.getByRole('button',{name:`Add ${product.title} to bag`,exact:true}).click();
 const bag=page.getByRole('dialog',{name:'Your bag',exact:true});
 await expect(bag.getByRole('link',{name:product.title,exact:true})).toBeVisible();
 const staleResponse=page.waitForResponse(response=>response.url().endsWith('/api/cart')&&response.request().method()==='GET');
 release();await (await staleResponse).finished();
 // Let the stale fetch continuation run before asserting it was discarded.
 await page.waitForTimeout(100);
 await expect(bag.getByRole('link',{name:product.title,exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open bag, 1 items',exact:true})).toBeVisible();
});

test('a successful cart-load retry clears the previous recoverable error',async({page})=>{
 let retry=false;
 await page.route('**/api/cart',route=>{
  return route.fulfill(!retry?{status:503,json:{error:'Unavailable'}}:{json:{cart:null}});
 });
 await page.goto('/cart');
 const main=page.locator('#main');
 await expect(main.getByRole('alert')).toContainText('We could not load your bag.');
 retry=true;
 await main.getByRole('button',{name:'Retry',exact:true}).click();
 await expect(main.getByRole('alert')).toHaveCount(0);
 await expect(main.getByText('Your bag is waiting to be filled.')).toBeVisible();
});

test('product purchase hides Shopify default options and submits the chosen quantity',async({page})=>{
 const {calls}=await mockCart(page);
 await page.goto(`/products/${product.handle}`);
 const purchase=page.locator('#main #purchase');
 await purchase.scrollIntoViewIfNeeded();
 await expect(purchase.getByText('Default Title',{exact:true})).toHaveCount(0);
 await expect(purchase.locator('fieldset')).toHaveCount(0);
 await purchase.getByRole('button',{name:'Increase quantity',exact:true}).click();
 await purchase.getByRole('button',{name:'Add to bag',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Your bag',exact:true})).toBeVisible();
 expect(calls).toEqual([{action:'add',lines:[{merchandiseId:product.variantId,quantity:2}]}]);
});
