import {test,expect,type Page} from '@playwright/test';
import {GUEST_WISHLIST_KEY,RECENT_PRODUCTS_KEY,productHandles,recordProductView} from '../src/lib/saved-products';
import type {Product} from '../src/lib/types';

const handle='oriental-lavendar',title='Oriental Lavendar Cold Processed Soap';
const other='facial-ubtan-orange-almond-1';
function product(item:string):Product{return {id:`gid://shopify/Product/${item}`,handle:item,title:item===handle?title:'Facial Ubtan',description:'Botanical care',productType:'Soap',tags:[],availableForSale:true,createdAt:'2026-01-01',images:[],shape:'soap',tone:'#8c9066',price:{amount:'449',currencyCode:'INR'},variants:[{id:`variant-${item}`,title:'Default Title',availableForSale:true,price:{amount:'449',currencyCode:'INR'},selectedOptions:[]}],story:'A quiet ritual',ingredients:[],craft:[],ritual:[]};}

test('saved handles reject malformed storage, deduplicate and enforce capacity',()=>{
 expect(productHandles(null)).toEqual([]);
 expect(productHandles(['rose','rose',null,{},'../account','bad space','<script>','a'.repeat(129),'soap-1'])).toEqual(['rose','soap-1']);
 expect(productHandles(Array.from({length:150},(_,index)=>`product-${index}`))).toHaveLength(100);
});

test('recent views move to the front and retain only the last 24 products',()=>{
 const handles=Array.from({length:24},(_,index)=>`product-${index}`);
 expect(recordProductView(handles,'product-12')).toEqual(['product-12',...handles.filter(item=>item!=='product-12')]);
 expect(recordProductView(handles,'new-product')).toEqual(['new-product',...handles.slice(0,23)]);
});

async function guestAccount(page:Page){
 await page.route('**/api/account',route=>route.fulfill({json:{authenticated:false,configured:true,customer:null}}));
 await page.route('**/api/saved-products?*',route=>{const handles=new URL(route.request().url()).searchParams.get('handles')?.split(',')||[];return route.fulfill({json:{products:handles.map(product)}});});
 await page.emulateMedia({reducedMotion:'reduce'});
}
async function firstCard(page:Page){
 await page.goto('/shop');
 const card=page.locator(`#main .catalog-grid .product-card[data-product-handle="${handle}"]`);
 await expect(card).toBeVisible();return card;
}

test('guest wishlist saves without navigation, persists, and removes from the wishlist page',async({page})=>{
 await guestAccount(page);
 const card=await firstCard(page),button=card.getByRole('button',{name:`Save ${title} to wishlist`,exact:true});
 await expect(button).toBeEnabled();expect(await button.evaluate(element=>!!element.closest('a'))).toBe(false);await button.click();
 await expect(card.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL('/shop');
 await page.reload();
 await expect(card.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true})).toBeEnabled();
 await page.goto('/account/wishlist');
 await expect(page.getByRole('region',{name:'Saved products'})).toContainText('saved in this browser');
 await page.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true}).click();
 await expect(page.getByText('A little space for your favourites.',{exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual([]);
});

test('account wishlist merges guest additions and clears account items when logout begins',async({page})=>{
 let accountReads=0,serverHandles=[handle];const actions:{action:string;handles:string[]}[]=[];
 await page.addInitScript(({key,item})=>localStorage.setItem(key,JSON.stringify([item])),{key:GUEST_WISHLIST_KEY,item:other});
 await page.route('**/api/account',route=>{accountReads++;return route.fulfill({json:{authenticated:true,configured:true,customer:{id:'customer-one'}}});});
 await page.route('**/api/account/wishlist',async route=>{
  if(route.request().method()==='POST'){
   const input=route.request().postDataJSON();actions.push(input);
   serverHandles=input.action==='remove'?serverHandles.filter(item=>!input.handles.includes(item)):productHandles([...serverHandles,...input.handles]);
  }
  return route.fulfill({json:{handles:serverHandles}});
 });
 const card=await firstCard(page);
 await expect(card.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true})).toBeEnabled();
 expect(actions).toEqual([{action:'merge',handles:[other]}]);
 expect(serverHandles).toEqual([handle,other]);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual([]);
 await card.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true}).click();
 await expect(card.getByRole('button',{name:`Save ${title} to wishlist`,exact:true})).toBeEnabled();
 expect(serverHandles).toEqual([other]);
 const readsBeforeLogout=accountReads;
 // The cookie can still be valid while a native logout POST is in flight.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('dyu:account-changed',{detail:{type:'logout'}})));
 await expect(page.locator(`#main .catalog-grid .product-card[data-product-handle="${other}"]`).getByRole('button',{name:/^Save .* to wishlist$/})).toBeEnabled();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual([]);
 expect(accountReads).toBe(readsBeforeLogout);
});

test('failed account save reports an error and does not claim the item was saved',async({page})=>{
 await page.route('**/api/account',route=>route.fulfill({json:{authenticated:true,configured:true,customer:{id:'customer-one'}}}));
 await page.route('**/api/account/wishlist',route=>route.request().method()==='POST'?route.fulfill({status:503,json:{error:'Wishlist service unavailable. Please try again.'}}):route.fulfill({json:{handles:[]}}));
 const card=await firstCard(page),button=card.getByRole('button',{name:`Save ${title} to wishlist`,exact:true});
 await expect(button).toBeEnabled();await button.click();
 await expect(card.getByRole('alert')).toContainText('Wishlist service unavailable');
 await expect(button).toHaveAttribute('aria-pressed','false');await expect(button).toBeEnabled();
});

test('a late wishlist response cannot restore a previous account after sign-out',async({page})=>{
 let authenticated=true,release:()=>void=()=>{},started:()=>void=()=>{},finished:()=>void=()=>{};
 const responseGate=new Promise<void>(resolve=>{release=resolve;});
 const requestStarted=new Promise<void>(resolve=>{started=resolve;});
 const requestFinished=new Promise<void>(resolve=>{finished=resolve;});
 await page.route('**/api/account',route=>route.fulfill({json:{authenticated,configured:true,customer:authenticated?{id:'customer-one'}:null}}));
 await page.route('**/api/account/wishlist',async route=>{started();await responseGate;await route.fulfill({json:{handles:[handle]}});finished();});
 const card=await firstCard(page);await requestStarted;
 authenticated=false;await page.evaluate(()=>window.dispatchEvent(new Event('dyu:account-changed')));
 const button=card.getByRole('button',{name:`Save ${title} to wishlist`,exact:true});
 await expect(button).toBeEnabled();release();await requestFinished;
 await expect(button).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual([]);
});

test('a full account wishlist stays editable when browser favourites cannot yet merge',async({page})=>{
 let serverHandles=[handle,...Array.from({length:98},(_,index)=>`saved-${index}`)];
 const browserHandles=[other,'new-favourite'];
 await page.addInitScript(({key,handles})=>localStorage.setItem(key,JSON.stringify(handles)),{key:GUEST_WISHLIST_KEY,handles:browserHandles});
 await page.route('**/api/account',route=>route.fulfill({json:{authenticated:true,configured:true,customer:{id:'customer-one'}}}));
 await page.route('**/api/account/wishlist',route=>{
  if(route.request().method()==='POST'){
   const input=route.request().postDataJSON(),next=input.action==='remove'?serverHandles.filter(item=>!input.handles.includes(item)):[...new Set([...serverHandles,...input.handles])];
   if(next.length>100)return route.fulfill({status:400,json:{error:'Your wishlist holds up to 100 items. Remove an item before saving another.'}});
   serverHandles=next;
  }
  return route.fulfill({json:{handles:serverHandles}});
 });
 const card=await firstCard(page),remove=card.getByRole('button',{name:`Remove ${title} from wishlist`,exact:true});
 await expect(remove).toBeEnabled();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual(browserHandles);
 await remove.click();await expect(card.getByRole('button',{name:`Save ${title} to wishlist`,exact:true})).toBeEnabled();
 await page.evaluate(()=>window.dispatchEvent(new Event('dyu:account-changed')));
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),GUEST_WISHLIST_KEY)).toEqual([]);
 expect(serverHandles).toHaveLength(100);expect(serverHandles).toContain(other);expect(serverHandles).toContain('new-favourite');
});

test('viewed products stay in browser history and can be cleared',async({page})=>{
 await guestAccount(page);
 await page.goto(`/products/${handle}`);
 await expect(page.locator('#main .exhibit-introduction h1')).toBeVisible();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),RECENT_PRODUCTS_KEY)).toEqual([handle]);
 await page.goto('/account/history');
 const region=page.getByRole('region',{name:'Recently viewed products'});
 await expect(region).toContainText('saved only in this browser');
 await expect(region.getByRole('link',{name:title,exact:true})).toBeVisible();
 await region.getByRole('button',{name:'Clear history',exact:true}).click();
 await expect(region.getByText('Follow your curiosity.',{exact:true})).toBeVisible();
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),RECENT_PRODUCTS_KEY)).toEqual([]);
});

test('account and wishlist remain reachable in the small-screen menu',async({page})=>{
 await guestAccount(page);await page.setViewportSize({width:320,height:740});await page.goto('/shop');
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'Explore DYU',exact:true});
 await expect(menu.getByRole('link',{name:'Your account',exact:true})).toBeVisible();
 await expect(menu.getByRole('link',{name:'Your wishlist',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
 await menu.getByRole('link',{name:'Your wishlist',exact:true}).click();await expect(page).toHaveURL('/account/wishlist');
 await expect(menu).not.toBeVisible();
});
