import {readFileSync} from 'node:fs';

const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line.includes('=')&&!line.trim().startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim()]}));
const domain=env.SHOPIFY_STORE_DOMAIN;
const token=env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain||'')||!token)throw new Error('Storefront domain and public token are required.');
const endpoint=`https://${domain}/api/${env.SHOPIFY_API_VERSION||'2026-07'}/graphql.json`;
async function request(query,variables={}){
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000)});
 const payload=await response.json();
 if(!response.ok||payload.errors?.length)throw new Error(`Storefront query failed (${response.status}): ${payload.errors?.map(error=>error.message).join('; ')||'HTTP error'}`);
 return payload.data;
}
const catalogue=await request(`{shop{name} products(first:100){nodes{handle title description images(first:1){nodes{url}} variants(first:10){nodes{id availableForSale}} media(first:10){nodes{mediaContentType}}}} collections(first:100){nodes{handle title image{url}}}}`);
const products=catalogue.products.nodes;
const variant=products.flatMap(product=>product.variants.nodes).find(item=>item.availableForSale);
if(!variant){
 const empty=await request(`mutation{cartCreate(input:{}){cart{id checkoutUrl totalQuantity} userErrors{message}}}`);
 if(empty.cartCreate.userErrors.length||!empty.cartCreate.cart?.checkoutUrl)throw new Error('Empty cart creation failed.');
 console.log(JSON.stringify({shop:catalogue.shop.name,products:products.length,withImages:products.filter(product=>product.images.nodes.length>0).length,collections:catalogue.collections.nodes.map(collection=>collection.title),availableVariants:0,cartCreate:true,checkoutUrl:true,cartLineFlow:'unavailable until products can be purchased'}));
 process.exit(0);
}
const created=await request(`mutation($variant:ID!){cartCreate(input:{lines:[{merchandiseId:$variant,quantity:1}]}){cart{id checkoutUrl totalQuantity lines(first:1){nodes{id quantity}}} userErrors{message}}}`,{variant:variant.id});
if(created.cartCreate.userErrors.length)throw new Error(created.cartCreate.userErrors.map(error=>error.message).join('; '));
const cart=created.cartCreate.cart;
if(cart.totalQuantity!==1||!cart.checkoutUrl)throw new Error('Cart creation did not return a valid checkout.');
const line=cart.lines.nodes[0];
const updated=await request(`mutation($cart:ID!,$line:ID!){cartLinesUpdate(cartId:$cart,lines:[{id:$line,quantity:2}]){cart{totalQuantity} userErrors{message}}}`,{cart:cart.id,line:line.id});
if(updated.cartLinesUpdate.userErrors.length||updated.cartLinesUpdate.cart.totalQuantity!==2)throw new Error('Cart quantity update failed.');
const removed=await request(`mutation($cart:ID!,$line:ID!){cartLinesRemove(cartId:$cart,lineIds:[$line]){cart{totalQuantity} userErrors{message}}}`,{cart:cart.id,line:line.id});
if(removed.cartLinesRemove.userErrors.length||removed.cartLinesRemove.cart.totalQuantity!==0)throw new Error('Cart item removal failed.');
console.log(JSON.stringify({shop:catalogue.shop.name,products:products.length,withImages:products.filter(product=>product.images.nodes.length>0).length,collections:catalogue.collections.nodes.map(collection=>collection.title),cartCreate:true,cartUpdate:true,cartRemove:true,checkoutUrl:true}));
