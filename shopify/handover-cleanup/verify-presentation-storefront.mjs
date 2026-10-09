import {readFileSync,writeFileSync} from 'node:fs';
const domain=process.env.SHOPIFY_STORE_DOMAIN;
const token=process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain||'')||!token)throw Error('Storefront configuration missing');
async function request(query,variables={}) {
 const response=await fetch('https://'+domain+'/api/'+(process.env.SHOPIFY_API_VERSION||'2026-07')+'/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();
 if(!response.ok||result.errors?.length)throw Error('Read-only Storefront verification failed: '+response.status);
 return result.data;
}
const collection=await request('query PresentationCollection { collection(handle:"frontpage") { id handle title description image { url altText } products(first:100) { nodes { id handle } pageInfo { hasNextPage } } } }');
const source=readFileSync('src/lib/site-content.ts','utf8');
const query=source.match(/siteContentQuery=\x60([\s\S]*?)\x60;/)?.[1];
if(!query)throw Error('Cannot locate existing production Storefront content query');
let after=null;let brand;
do{const data=await request(query,{after});brand||=data.metaobjects.nodes.find(n=>n.handle==='brand');after=data.metaobjects.pageInfo.hasNextPage?data.metaobjects.pageInfo.endCursor:null;}while(after);
const fields=Object.fromEntries((brand?.fields||[]).map(f=>[f.key,f]));
const c=collection.collection;
const mismatches=[];
if(c?.handle!=='frontpage'||c?.title!=='Featured collection'||c?.description!=='Discover Damask Rose Cold Processed Soap from DYUhandmade.')mismatches.push('collection copy');
if(c?.image?.altText!=='Damask Rose Cold Processed Soap with its packaging'||!c.image.url.includes('/collections/Damask_Rose_Soap_Amazon.png'))mismatches.push('collection image');
if(c?.products?.pageInfo.hasNextPage||c?.products?.nodes.length!==1||c.products.nodes[0].handle!=='damask-rose-cold-processed-soap')mismatches.push('collection membership');
if(fields.image?.value!=='gid://shopify/MediaImage/46412586713307'||fields.image_alt?.value!=='DYU Handmade'||fields.image?.reference?.image?.altText!=='DYU Handmade logo'||!fields.image?.reference?.image?.url.includes('/files/dyu-handmade-logo.png'))mismatches.push('brand logo');
const report={checkedAt:new Date().toISOString(),status:mismatches.length?'failed':'verified_storefront',mismatches,collection:c,brand};
writeFileSync('shopify/handover-cleanup/presentation-storefront.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,mismatches,collectionTitle:c?.title,logoUrl:fields.image?.reference?.image?.url}));
if(mismatches.length)process.exitCode=1;

