import 'server-only';
import {cache} from 'react';
import {isDemo,shopify} from './shopify';
import {normalizeContentSection,type RawContentSection,type SiteContent,type ContentSection} from './content-safety';

export type {SiteContent,ContentSection} from './content-safety';

export const siteContentQuery=`query SiteContent($after:String){
 metaobjects(type:"dyu_site_content",first:100,after:$after){
  nodes{handle fields{key value type reference{... on MediaImage{image{url altText}}} references(first:50){nodes{__typename ... on Product{handle} ... on Collection{handle}}}}}
  pageInfo{hasNextPage endCursor}
 }
}`;
type ContentResponse={metaobjects:{nodes:RawContentSection[];pageInfo:{hasNextPage:boolean;endCursor:string|null}}};

// React deduplicates layout/page calls; Shopify's fetch cache refreshes after 120s or a webhook.
export const getSiteContent=cache(async():Promise<SiteContent>=>{
 const content:SiteContent={sections:{}};
 if(isDemo())return content;
 let after:string|null=null;
 const cursors=new Set<string>();
 try{
  do{
   const data:ContentResponse=await shopify<ContentResponse>(siteContentQuery,{after});
   for(const node of data.metaobjects?.nodes||[]){const entry=normalizeContentSection(node);if(entry)content.sections[entry.handle]=entry;}
   const page=data.metaobjects?.pageInfo;
   after=page?.hasNextPage?page.endCursor:null;
   if(after&&cursors.has(after))break;
   if(after)cursors.add(after);
  }while(after);
 }catch{
  // Missing schema, storefront access, or an outage must not break the existing site.
  console.warn('Shopify site content is unavailable; using the existing page defaults.');
 }
 return content;
});

export function section(content:SiteContent,handle:string):ContentSection {
 return Object.hasOwn(content.sections,handle)?content.sections[handle]:{handle};
}
