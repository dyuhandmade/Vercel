import 'server-only';
import { demoProducts, demoCollections } from './demo';
import type {Product, Collection, Cart, ProductMedia} from './types';
import {productMetafieldKeys,productText,productStoryItems,productPresentation,type ProductMetafield} from './product-content';

export const isDemo = () => process.env.DEMO_MODE === 'true';
const metafieldIdentifiers=['dyu','custom'].flatMap(namespace=>productMetafieldKeys.map(key=>`{namespace:"${namespace}",key:"${key}"}`)).join(',');
const fields = `id handle title description productType tags availableForSale createdAt featuredImage{url altText} images(first:50){nodes{url altText}} priceRange{minVariantPrice{amount currencyCode}} variants(first:100){nodes{id title availableForSale price{amount currencyCode} selectedOptions{name value}}} media(first:50){nodes{id alt mediaContentType previewImage{url} ... on MediaImage{image{url altText}} ... on Video{sources{url mimeType format}} ... on ExternalVideo{embedUrl} ... on Model3d{sources{url format}}}} metafields(identifiers:[${metafieldIdentifiers}]){namespace key value type references(first:50){nodes{__typename ... on Product{handle} ... on Metaobject{handle fields{key value reference{... on MediaImage{image{url}}}}}}}}`;
export async function shopify<T>(query:string,variables:Record<string,unknown>={},fresh=false):Promise<T>{
 const domain=process.env.SHOPIFY_STORE_DOMAIN;
 const publicToken=process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
 const privateToken=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
 const token=publicToken||privateToken;
 if(!domain || !token || !/^[a-z0-9-]+\.myshopify\.com$/i.test(domain)) throw new Error('Shopify connection is not configured.');
 const res=await fetch(`https://${domain}/api/${process.env.SHOPIFY_API_VERSION||'2026-07'}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json',[publicToken?'X-Shopify-Storefront-Access-Token':'Shopify-Storefront-Private-Token']:token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(15000),...(fresh?{cache:'no-store' as const}:{next:{revalidate:120,tags:['shopify']}})});
 if(!res.ok) throw new Error('The shop is temporarily unavailable. Please try again.');
 const result=await res.json(); if(result.errors) {console.error('Shopify query failed',result.errors.map((e:{message:string})=>e.message));throw new Error('We could not load the shop. Please try again.');} return result.data;
}
type RawProduct = {id:string;handle:string;title:string;description:string;productType:string;tags:string[];availableForSale:boolean;createdAt:string;featuredImage?:{url:string;altText?:string};images:{nodes:Product['images']};priceRange:{minVariantPrice:Product['price']};variants:{nodes:Product['variants']};media:{nodes:{id:string;alt?:string;mediaContentType:string;previewImage?:{url:string};image?:{url:string;altText?:string};sources?:{url:string;format?:string;mimeType?:string}[];embedUrl?:string}[]};metafields:(ProductMetafield|null)[]};
function mapProduct(p:RawProduct):Product{
 const presentation=productPresentation(p.metafields);
 const media:ProductMedia[]=p.media.nodes.map((m):ProductMedia=>{
  if(m.mediaContentType==='IMAGE')return {id:m.id,type:'image',url:m.image?.url||m.previewImage?.url,previewImage:m.previewImage?.url,alt:m.alt||m.image?.altText};
  if(m.mediaContentType==='VIDEO')return {id:m.id,type:'video',url:m.sources?.find(s=>s.mimeType==='video/mp4')?.url||m.sources?.[0]?.url,previewImage:m.previewImage?.url,alt:m.alt};
  if(m.mediaContentType==='EXTERNAL_VIDEO')return {id:m.id,type:'externalVideo',embedUrl:m.embedUrl,previewImage:m.previewImage?.url,alt:m.alt};
  return {id:m.id,type:'model',url:m.sources?.find(s=>s.format?.toLowerCase()==='glb')?.url,previewImage:m.previewImage?.url,alt:m.alt};
 }).filter(m=>m.url||m.embedUrl);
 const images=p.images.nodes.length?p.images.nodes:media.filter(m=>m.type==='image'&&m.url).map(m=>({url:m.url!,altText:m.alt}));
 const shapeHint=`${p.title} ${p.productType}`;
 const shape:Product['shape']=presentation.shape||(/soap|\bbar\b/i.test(shapeHint)?'soap':/oil|serum|dropper/i.test(shapeHint)?'bottle':/butter|balm|cream|ubtan|scrub|jar|tin|moisturi|face[\s-]*wash/i.test(shapeHint)?'jar':'general');
 const description=p.description?.trim()||'';
 const firstSentence=description.match(/^.{1,240}?[.!?](?=\s|$)/)?.[0]||description.slice(0,190);
 return {id:p.id,handle:p.handle,title:p.title,description,productType:p.productType,tags:p.tags,availableForSale:p.availableForSale,createdAt:p.createdAt,image:p.featuredImage?.url||images[0]?.url,images,media,price:p.priceRange.minVariantPrice,variants:p.variants.nodes,model:media.find(m=>m.type==='model')?.url,shape,tone:presentation.tone||(shape==='soap'?'#9b9c74':'#95602f'),story:productText(p.metafields,'short_story',3000)||firstSentence,sensory:productText(p.metafields,'sensory_notes',2000),ingredients:productStoryItems(p.metafields,'ingredients'),craft:productStoryItems(p.metafields,'craft_steps'),ritual:productStoryItems(p.metafields,'ritual_steps'),careNotes:productText(p.metafields,'care_notes'),fullIngredientList:productText(p.metafields,'full_ingredient_list'),relatedProductHandles:presentation.relatedProductHandles};
}
export function discoveryCollections(products:Product[],collections:Collection[]):Collection[]{
 const curated=collections.filter(c=>c.handle!=='frontpage');
 if(curated.length>=3||isDemo())return curated.length?curated:collections;
 const preferred=['Cold processed Soap','Facial Oil','Hair Care','Gift Set'];
 const types=[...new Set(products.map(p=>p.productType).filter(Boolean))];
 const chosen=[...preferred.filter(t=>types.includes(t)),...types.filter(t=>!preferred.includes(t))].slice(0,4);
 return chosen.map(title=>{const product=products.find(p=>p.productType===title);return {handle:product?.handle||title.toLowerCase().replace(/[^a-z0-9]+/g,'-'),title,description:`Explore ${title.toLowerCase()} from DYUhandmade.`,image:product?.image?{url:product.image,altText:product.title}:undefined,href:`/shop?type=${encodeURIComponent(title)}`};});
}
export async function getProducts(query?:string):Promise<Product[]>{
 if(isDemo()) return demoProducts.filter(p=>!query||`${p.title} ${p.productType}`.toLowerCase().includes(query.toLowerCase()));
 const all:Product[]=[];let after:string|null=null;
 do{const d: {products:{nodes:RawProduct[];pageInfo:{hasNextPage:boolean;endCursor:string}}}=await shopify(`query Products($query:String,$after:String){products(first:100,query:$query,after:$after){nodes{${fields}} pageInfo{hasNextPage endCursor}}}`,{query:query||null,after});all.push(...d.products.nodes.map(mapProduct));after=d.products.pageInfo.hasNextPage?d.products.pageInfo.endCursor:null;}while(after);
 return all;
}
export async function getProduct(handle:string):Promise<Product|null>{if(isDemo())return demoProducts.find(p=>p.handle===handle)||null;const d=await shopify<{product:RawProduct|null}>(`query Product($handle:String!){product(handle:$handle){${fields}}}`,{handle},true);return d.product?mapProduct(d.product):null;}
export async function getCollections():Promise<Collection[]>{if(isDemo())return demoCollections;const all:Collection[]=[];let after:string|null=null;do{const d:{collections:{nodes:Collection[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}}=await shopify(`query Collections($after:String){collections(first:100,after:$after){nodes{handle title description image{url altText}} pageInfo{hasNextPage endCursor}}}`,{after});all.push(...d.collections.nodes);after=d.collections.pageInfo.hasNextPage?d.collections.pageInfo.endCursor:null;}while(after);return all;}
export async function getCollection(handle:string):Promise<{collection:Collection;products:Product[]}|null>{if(isDemo()){const c=demoCollections.find(c=>c.handle===handle);return c?{collection:c,products:demoProducts.filter(p=>p.productType===c.title)}:null;}const all:Product[]=[];let after:string|null=null;let collection:Collection|null=null;do{const d:{collection:(Collection&{products:{nodes:RawProduct[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}})|null}=await shopify(`query Collection($handle:String!,$after:String){collection(handle:$handle){handle title description image{url altText} products(first:20,after:$after){nodes{${fields}} pageInfo{hasNextPage endCursor}}}}`,{handle,after});if(!d.collection)return null;collection={handle:d.collection.handle,title:d.collection.title,description:d.collection.description,image:d.collection.image};all.push(...d.collection.products.nodes.map(mapProduct));after=d.collection.products.pageInfo.hasNextPage?d.collection.products.pageInfo.endCursor:null;}while(after);return {collection:collection!,products:all};}
export const cartFields=`id checkoutUrl totalQuantity cost{subtotalAmount{amount currencyCode} totalAmount{amount currencyCode}} lines(first:100){nodes{id quantity merchandise{... on ProductVariant{id title price{amount currencyCode} product{title handle featuredImage{url altText}}}}}}`;
export async function getCart(id:string):Promise<Cart|null>{const d=await shopify<{cart:Cart|null}>(`query Cart($id:ID!){cart(id:$id){${cartFields}}}`,{id},true);return d.cart;}
export async function mutateCart(operation:'create'|'add'|'update'|'remove',id:string|undefined,lines:unknown[]):Promise<Cart>{
 const name={create:'cartCreate',add:'cartLinesAdd',update:'cartLinesUpdate',remove:'cartLinesRemove'}[operation];
 const decl=operation==='create'?'$lines:[CartLineInput!]!':operation==='remove'?'$id:ID!,$lines:[ID!]!':`$id:ID!,$lines:[${operation==='update'?'CartLineUpdateInput':'CartLineInput'}!]!`;
 const args=operation==='create'?'input:{lines:$lines}':operation==='remove'?'cartId:$id,lineIds:$lines':'cartId:$id,lines:$lines';
 const d=await shopify<Record<string,{cart:Cart;userErrors:{message:string}[]}>>(`mutation(${decl}){${name}(${args}){cart{${cartFields}} userErrors{message}}}`,{id,lines},true);
 if(d[name].userErrors.length)throw new Error(d[name].userErrors.map(e=>e.message).join(' '));return d[name].cart;
}
