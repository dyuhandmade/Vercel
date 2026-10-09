import {readFileSync} from 'node:fs';

// Read-only verification; credentials stay in the process environment.
const domain=process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//,'').replace(/\/$/,'');
const privateToken=process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
const token=privateToken||process.env.SHOPIFY_STOREFRONT_PUBLIC_TOKEN;
if(!domain||!token||!/^[-a-z0-9]+\.myshopify\.com$/.test(domain))throw new Error('A Shopify domain and Storefront token are required.');
async function query(query,variables={}){
 const response=await fetch(`https://${domain}/api/2026-07/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json',[privateToken?'Shopify-Storefront-Private-Token':'X-Shopify-Storefront-Access-Token']:token},body:JSON.stringify({query,variables})});
 const result=await response.json();
 if(!response.ok||result.errors)throw new Error('Storefront verification query failed.');
 return result.data;
}
const read=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const expected=['account','commerce','editorial-extra','global'].flatMap(name=>read(`shopify/editability-${name}-seed.json`));
const original=read('shopify/backups/2026-10-09-before-full-editability.json').entries;
const entries=new Map();let after=null;const cursors=new Set();
do{
 const data=await query('query EditorVerification($after:String){metaobjects(type:"dyu_site_content",first:100,after:$after){nodes{handle fields{key value}} pageInfo{hasNextPage endCursor}}}',{after});
 for(const entry of data.metaobjects.nodes)entries.set(entry.handle,entry);
 after=data.metaobjects.pageInfo.hasNextPage?data.metaobjects.pageInfo.endCursor:null;
 if(after&&cursors.has(after))throw new Error('Repeated Shopify page cursor.');
 if(after)cursors.add(after);
}while(after);
const missing=expected.filter(entry=>!entries.has(entry.handle)).map(entry=>entry.handle);
const changed=[];
for(const before of original){
 const current=entries.get(before.handle);
 if(!current){changed.push(`${before.handle}: missing`);continue;}
 for(const field of before.fields){if(field.value!==null&&field.value!==undefined&&current.fields.find(item=>item.key===field.key)?.value!==field.value)changed.push(`${before.handle}.${field.key}`);}
}
const incomplete=[];
for(const entry of expected){for(const [key,value] of Object.entries(entry.fields)){const expectedValue=typeof value==='string'?value:JSON.stringify(value);if(entries.get(entry.handle)?.fields.find(item=>item.key===key)?.value!==expectedValue)incomplete.push(`${entry.handle}.${key}`);}}
const appearance=await query('{metaobject(handle:{type:"dyu_site_settings",handle:"global"}){handle fields{key value}}}');
const passed=!missing.length&&!changed.length&&!incomplete.length&&appearance.metaobject?.handle==='global';
console.log(JSON.stringify({passed,storefrontEntries:entries.size,newEntries:expected.length,originalEntries:original.length,missing,changed,incomplete,appearanceReadable:!!appearance.metaobject},null,2));
if(!passed)process.exitCode=1;
