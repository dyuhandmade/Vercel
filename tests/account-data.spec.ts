import {test,expect} from '@playwright/test';
import {addressId,addressInput,combineWishlist,orderId,pageCursor,profileInput,wishlistInput} from '../src/lib/account-validation';

test('profile edits permit only bounded name fields',()=>{
 expect(profileInput({firstName:' Asha ',lastName:' Rao '})).toEqual({firstName:'Asha',lastName:'Rao'});
 for(const value of [{firstName:'',lastName:''},{firstName:'Asha',lastName:'Rao',id:'someone-else'},{firstName:'A'.repeat(101),lastName:''},{firstName:'A\nB',lastName:''}])expect(()=>profileInput(value)).toThrow();
});
test('address inputs reject unrelated customer fields and preserve country/region codes',()=>{
 expect(addressInput({firstName:'Asha',address1:'12 Garden Road',city:'Pune',territoryCode:'in',zoneCode:'MH'})).toMatchObject({territoryCode:'IN',zoneCode:'MH'});
 expect(()=>addressInput({firstName:'Asha',address1:'Road',city:'Pune',territoryCode:'India'})).toThrow();
 expect(()=>addressInput({customerId:'other'})).toThrow();
 expect(addressId('gid://shopify/CustomerAddress/123?model_name=CustomerAddress')).toContain('CustomerAddress');
 expect(()=>addressId('gid://shopify/Customer/123')).toThrow();
});
test('order and cursor inputs are bounded identifiers, never arbitrary query text',()=>{
 expect(orderId('gid://shopify/Order/123')).toBe('gid://shopify/Order/123');
 expect(()=>orderId('gid://shopify/Customer/123')).toThrow();
 expect(()=>pageCursor('a'.repeat(1025))).toThrow();
});
test('wishlist merges deduplicate, removals are targeted and full lists are never silently truncated',()=>{
 expect(combineWishlist(['rose','almond'],['almond','ubtan'],'merge')).toEqual(['rose','almond','ubtan']);
 expect(combineWishlist(['rose','almond'],['rose'],'remove')).toEqual(['almond']);
 expect(()=>combineWishlist(Array.from({length:100},(_,i)=>`product-${i}`),['new'],'add')).toThrow(/100/);
 expect(wishlistInput({action:'add',handles:['rose','rose']})).toEqual({action:'add',handles:['rose']});
 expect(()=>wishlistInput({action:'replace',handles:['rose']})).toThrow();
 expect(()=>wishlistInput({action:'add',handles:['../account']})).toThrow();
});
test('account endpoints reject anonymous reads and cross-site writes without exposing records',async({request})=>{
 for(const url of ['/api/account/orders','/api/account/addresses','/api/account/wishlist','/api/account/orders/gid%3A%2F%2Fshopify%2FOrder%2F123']){
  const response=await request.get(url);expect(response.status()).toBe(401);expect(response.headers()['cache-control']).toContain('no-store');expect(await response.json()).toEqual({error:'Please sign in to continue.'});
 }
 for(const [url,method,data] of [['/api/account/profile','PATCH',{firstName:'Asha',lastName:'Rao'}],['/api/account/addresses','POST',{address:{}}],['/api/account/wishlist','POST',{action:'add',handles:['rose']}],['/api/checkout','POST',{}],['/api/auth/logout','POST',{}]] as const){
  const response=await request.fetch(url,{method,headers:{Origin:'https://unrelated.example'},data});expect(response.status()).toBe(403);expect(response.headers()['cache-control']).toContain('no-store');
 }
 const state=await request.get('/api/account');const body=await state.json();expect(body.authenticated).toBe(false);expect(body.customer).toBeUndefined();expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken|idToken|sessionSecret/);
});
test('forged customer cookies do not authenticate a shopper',async({request})=>{
 const response=await request.get('/api/account',{headers:{Cookie:'dyu-account=1; dyu-account.0=forged-session'}});
 expect((await response.json()).authenticated).toBe(false);expect(response.headers()['cache-control']).toContain('private');
});
test('checkout remains guest accessible but rejects an empty bag',async({request})=>{
 const response=await request.post('/api/checkout',{headers:{Origin:'http://127.0.0.1:3000'},data:{}});
 expect([400,409]).toContain(response.status());expect((await response.json()).error).toMatch(/bag|Checkout/);
});
