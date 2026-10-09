import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(line=>line.includes('=')&&!line.trim().startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim()]}));
const domain=env.SHOPIFY_STORE_DOMAIN;
if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain||'')||!env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN)throw new Error('Storefront connection is missing.');
const source=readFileSync('src/lib/site-content.ts','utf8');
const query=source.match(/siteContentQuery=`([\s\S]*?)`;/)?.[1];
if(!query)throw new Error('Cannot locate site content query.');
async function request(query,variables={}){
 const response=await fetch(`https://${domain}/api/${env.SHOPIFY_API_VERSION||'2026-07'}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||result.errors?.length)throw new Error(`Storefront verification failed: ${result.errors?.map(e=>e.message).join('; ')||response.status}`);return result.data;
}
const entries=[];let after=null;
do{const data=await request(query,{after});entries.push(...data.metaobjects.nodes);after=data.metaobjects.pageInfo.hasNextPage?data.metaobjects.pageInfo.endCursor:null;}while(after);
const expected=[...new Map(['home-content-seed.json','secondary-content-seed.json',...readdirSync('shopify').filter(file=>/^editability-.*-seed\.json$/.test(file))].flatMap(file=>JSON.parse(readFileSync(`shopify/${file}`,'utf8'))).map(entry=>[entry.handle,entry])).values()];
const missing=expected.filter(e=>!entries.some(x=>x.handle===e.handle)).map(e=>e.handle);
const unresolvedImages=entries.flatMap(e=>e.fields.filter(f=>['image','mobile_image'].includes(f.key)&&f.value&&!f.reference?.image?.url).map(f=>`${e.handle}.${f.key}`));
const hero=entries.find(e=>e.handle==='home-hero');
const image=hero?.fields.find(f=>f.key==='image')?.reference?.image?.url;
const products=await request('{products(first:100){nodes{id handle shortStory:metafield(namespace:"dyu",key:"short_story"){value} ingredients:metafield(namespace:"dyu",key:"ingredients"){references(first:50){nodes{... on Metaobject{handle fields{key value}}}}}} pageInfo{hasNextPage}}}');
if(products.products.pageInfo.hasNextPage)throw new Error('Product verification needs pagination.');
const report={entries:entries.length,expectedEntries:expected.length,missing,unresolvedImages,heroImage:image,products:products.products.nodes.length,shortStories:products.products.nodes.filter(p=>p.shortStory?.value).length,productsWithIngredientStories:products.products.nodes.filter(p=>p.ingredients?.references?.nodes.length).length};
mkdirSync('qa/content',{recursive:true});writeFileSync('qa/content/storefront-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
if(missing.length||unresolvedImages.length||!image?.startsWith('https://cdn.shopify.com/'))process.exitCode=1;
