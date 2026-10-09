import {safeHandle,safeLink,type SiteContent} from './content-safety';

export type NavigationItem={key:string;label:string;href:string};
const defaults:Record<string,{label:string;href:string}>={
 collection:{label:'The collection',href:'/shop'},story:{label:'Our story',href:'/our-story'},
 ingredients:{label:'The ingredients',href:'/ingredients'},journal:{label:'The journal',href:'/journal'},
 making:{label:'How it is made',href:'/how-its-made'},faq:{label:'Frequently asked questions',href:'/faq'},
 contact:{label:'Get in touch',href:'/contact'},shipping:{label:'Shipping & returns',href:'/policies/shipping'},
 privacy:{label:'Privacy',href:'/policies/privacy'},terms:{label:'Terms',href:'/policies/terms'},
 accessibility:{label:'Accessibility',href:'/policies/accessibility'},
};

/** Explicit lists choose membership and order; otherwise the established menu remains. */
export function navigationItems(content:SiteContent|undefined,group:string,fallbackKeys:string[],labels:Record<string,string>={}):NavigationItem[]{
 const control=content?.sections[group];
 if(control?.enabled===false)return [];
 const explicit=Boolean(control?.items?.length);
 const handles=explicit?control!.items!:fallbackKeys.map(key=>`nav-${key}`);
 const unique=[...new Set(handles)].filter(handle=>handle.startsWith('nav-')&&safeHandle(handle)).slice(0,20);
 if(!explicit)unique.sort((a,b)=>(content?.sections[a]?.sortOrder??0)-(content?.sections[b]?.sortOrder??0));
 return unique.flatMap(handle=>{
  const key=handle.slice(4),saved=content?.sections[handle],fallback=defaults[key];
  const label=saved?.title||labels[key]||fallback?.label,href=safeLink(saved?.linkUrl||fallback?.href,true);
  return saved?.enabled!==false&&label&&href?[{key,label,href}]:[];
 });
}
