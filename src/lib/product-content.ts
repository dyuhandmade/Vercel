import {plainText,safeHandle,safeImage} from './content-safety';
import type {Product,StoryItem} from './types';

type Reference={__typename?:string;handle?:string;fields?:{key:string;value?:string|null;reference?:{image?:{url?:string}}|null}[]};
export type ProductMetafield={namespace?:string;key:string;value:string;type:string;references?:{nodes:Reference[]}|null};
export const productMetafieldKeys=['short_story','sensory_notes','ingredients','craft_steps','ritual_steps','care_notes','full_ingredient_list','display_shape','tone','related_products'] as const;

/** Explicit namespace order prevents an empty or invalid newer field from hiding legacy content. */
export function productFields(fields:(ProductMetafield|null)[]|undefined,key:string):ProductMetafield[] {
 return (fields||[]).filter((field):field is ProductMetafield=>Boolean(field&&field.key===key)).sort((a,b)=>{
  const rank=(namespace?:string)=>namespace==='dyu'?0:namespace==='custom'?1:2;
  return rank(a.namespace)-rank(b.namespace);
 });
}

export function productText(fields:(ProductMetafield|null)[]|undefined,key:string,max=5000):string|undefined {
 for(const field of productFields(fields,key)){const text=plainText(field.value,max);if(text)return text;}
 return undefined;
}

function storyItems(field:ProductMetafield):StoryItem[] {
 const references=(field.references?.nodes||[]).filter(node=>node.fields?.length).map(node=>{
  const value=(key:string,max=3000)=>plainText(node.fields?.find(item=>item.key===key)?.value,max);
  return {name:value('name',200)||value('title',200)||node.handle||'',title:value('title',200),description:value('description')||value('summary')||value('instructions')||'',handle:safeHandle(node.handle),image:safeImage(node.fields?.find(item=>item.key==='image')?.reference?.image?.url)};
 }).filter(item=>item.name||item.description);
 if(references.length)return references.slice(0,24);
 // Unpublished/inaccessible references are not customer-facing prose or GIDs.
 if(field.type.includes('reference'))return [];
 try{
  const entries:unknown=JSON.parse(field.value);
  if(Array.isArray(entries))return entries.slice(0,24).map((entry,index):StoryItem|null=>{
   if(typeof entry==='string'){const name=plainText(entry,200);return name?{name,description:''}:null;}
   if(!entry||typeof entry!=='object')return null;
   const item=entry as Record<string,unknown>;
   const name=plainText(item.name,200)||plainText(item.title,200);
   const description=plainText(item.description)||plainText(item.summary)||plainText(item.instructions)||'';
   return name||description?{name:name||`Step ${index+1}`,title:plainText(item.title,200),description,image:safeImage(item.image),handle:safeHandle(item.handle)}:null;
  }).filter((item):item is StoryItem=>Boolean(item));
 }catch{/* A legacy text field can use comma/newline-separated values. */}
 const text=plainText(field.value);if(!text)return [];
 return text.split(/\r?\n|,/).map(name=>name.trim()).filter(Boolean).slice(0,24).map(name=>({name:name.slice(0,200),description:''}));
}

export function productStoryItems(fields:(ProductMetafield|null)[]|undefined,key:string):StoryItem[] {
 for(const field of productFields(fields,key)){const items=storyItems(field);if(items.length)return items;}
 return [];
}

export function productPresentation(fields:(ProductMetafield|null)[]|undefined):{shape?:Product['shape'];tone?:string;relatedProductHandles:string[]} {
 let shape:Product['shape']|undefined,tone:string|undefined,relatedProductHandles:string[]=[];
 for(const field of productFields(fields,'display_shape')){if(['jar','bottle','soap','general'].includes(field.value)){shape=field.value as Product['shape'];break;}}
 for(const field of productFields(fields,'tone')){if(/^#[a-f0-9]{6}$/i.test(field.value)){tone=field.value;break;}}
 for(const field of productFields(fields,'related_products')){
  const handles=(field.references?.nodes||[]).filter(node=>!node.__typename||node.__typename==='Product').map(node=>safeHandle(node.handle)).filter((handle):handle is string=>Boolean(handle));
  if(handles.length){relatedProductHandles=[...new Set(handles)].slice(0,12);break;}
 }
 return {shape,tone,relatedProductHandles};
}
