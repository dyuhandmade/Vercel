// Read-only preparation: builds an additive Shopify mutation plan. Never executes writes.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {buildIngredientIndex} from '../src/app/ingredients/ingredient-data.ts';

const domain=process.env.SHOPIFY_STORE_DOMAIN;
const token=process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
if(!/^[a-z0-9-]+\.myshopify\.com$/i.test(domain||'')||!token)throw Error('Load the existing .env.local with --env-file.');
async function query(query,variables={}){
 const response=await fetch(`https://${domain}/api/${process.env.SHOPIFY_API_VERSION||'2026-07'}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Storefront-Access-Token':token},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||result.errors)throw Error(JSON.stringify(result.errors||response.status));return result.data;
}
const products=[],collections=[];let after=null;
do{
 const data=await query(`query EditingCatalog($after:String){products(first:100,after:$after){nodes{id handle title productType tags description featuredImage{url} images(first:1){nodes{url}} fullIngredientList:metafield(namespace:"dyu",key:"full_ingredient_list"){value} ingredients:metafield(namespace:"dyu",key:"ingredients"){references(first:50){nodes{... on Metaobject{handle fields{key value reference{... on MediaImage{image{url}}}}}}}}} pageInfo{hasNextPage endCursor}} collections(first:100){nodes{handle title} pageInfo{hasNextPage endCursor}}}`,{after});
 products.push(...data.products.nodes);if(!collections.length){if(data.collections.pageInfo.hasNextPage)throw Error('Collection seed discovery requires pagination.');collections.push(...data.collections.nodes);}
 after=data.products.pageInfo.hasNextPage?data.products.pageInfo.endCursor:null;
}while(after);
const normalized=products.map(p=>({...p,image:p.featuredImage?.url,fullIngredientList:p.fullIngredientList?.value,ingredients:(p.ingredients?.references?.nodes||[]).map(item=>{const value=key=>item.fields.find(f=>f.key===key)?.value;return {handle:item.handle,name:value('name')||value('title')||item.handle,description:value('description')||value('summary')||'',image:item.fields.find(f=>f.key==='image')?.reference?.image?.url};})}));
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const discovered=[
 ...[...new Set(products.map(p=>p.productType).filter(Boolean))].map(type=>({handle:`shop-hero-${slug(type)}`,fields:{name:`Collection hero · ${type}`}})),
 ...collections.map(c=>({handle:`collection-${c.handle}`,fields:{name:`Collection page · ${c.title}`}})),
 ...buildIngredientIndex(normalized).map(i=>({handle:`ingredient-${i.handle}`,fields:{name:`Ingredient page · ${i.name}`}})),
];
writeFileSync('shopify/editability-catalog-seed.json',JSON.stringify(discovered,null,2)+'\n');
const baseline=JSON.parse(readFileSync('shopify/backups/2026-10-04-before-editability.json','utf8'));
const existing=new Map(baseline.entries.map(e=>[e.handle,e]));
const images=JSON.parse(readFileSync('shopify/uploaded-images.json','utf8'));
const seeds=readdirSync('shopify').filter(file=>/^editability-.*-seed\.json$/.test(file)).flatMap(file=>JSON.parse(readFileSync(`shopify/${file}`,'utf8')));
const seen=new Set(),operations=[],skipped=[],unseededImages=[];
const fieldDefinitions=[...baseline.definition.fieldDefinitions,...JSON.parse(readFileSync('shopify/editability-field-definitions.json','utf8'))];
for(const seed of seeds){
 if(seen.has(seed.handle))throw Error(`Duplicate seed: ${seed.handle}`);seen.add(seed.handle);
 if(existing.has(seed.handle)){skipped.push(seed.handle);continue;}
 const fields=[];
 for(const [key,raw] of Object.entries(seed.fields)){
  if(raw===undefined||raw===null||raw==='')continue;
  let value=raw;
  if(key==='image'||key==='mobile_image'){
   value=images[raw]?.fileId||(/^gid:\/\/shopify\/MediaImage\/\d+$/.test(raw)?raw:undefined);
   if(!value){unseededImages.push({handle:seed.handle,key,localDefault:raw});continue;}
  }
  const definition=fieldDefinitions.find(f=>f.key===key);if(!definition)throw Error(`Unknown field ${seed.handle}.${key}`);
  const type=typeof definition.type==='string'?definition.type:definition.type.name;
  const serialized=Array.isArray(value)?JSON.stringify(value):String(value);
  if(type==='single_line_text_field'&&/[\r\n]/.test(serialized))throw Error(`Single-line field contains line breaks: ${seed.handle}.${key}`);
  for(const rule of definition.validations||[]){if(rule.name==='max'&&type.endsWith('text_field')&&!type.startsWith('list.')&&serialized.length>Number(rule.value))throw Error(`Text too long: ${seed.handle}.${key}`);}
  fields.push({key,value:serialized});
 }
 operations.push({handle:{type:'dyu_site_content',handle:seed.handle},metaobject:{fields}});
}
const plan={store:domain,baselineCount:baseline.entries.length,operations,skipped,unseededImages};
writeFileSync('shopify/editability-plan.json',JSON.stringify(plan,null,2)+'\n');
console.log(JSON.stringify({store:domain,products:products.length,collections:collections.length,ingredients:buildIngredientIndex(normalized).length,additions:operations.length,existingPreserved:skipped,unseededImages},null,2));
