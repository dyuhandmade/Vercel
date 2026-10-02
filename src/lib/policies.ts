import 'server-only';
import {isDemo,shopify} from './shopify';
import {safeLink} from './content-safety';

type Policy={title:string;body:string;url:string};
type Policies={privacyPolicy:Policy|null;shippingPolicy:Policy|null;refundPolicy:Policy|null;termsOfService:Policy|null};

export async function getPolicies():Promise<Policies>{
 const empty={privacyPolicy:null,shippingPolicy:null,refundPolicy:null,termsOfService:null};
 if(isDemo())return empty;
 try{return (await shopify<{shop:Policies}>(`query DyuPolicies{shop{privacyPolicy{title body url} shippingPolicy{title body url} refundPolicy{title body url} termsOfService{title body url}}}`)).shop;}
 catch{return empty;}
}

// Policy HTML is displayed as text, never inserted into the document as markup.
export function policyParagraphs(html:string):string[]{
 const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',bull:'•',copy:'©'};
 return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,(_match,double:string,single:string,label:string)=>{
   const href=safeLink((double||single||'').replace(/&amp;/gi,'&'),true);
   const text=label.replace(/<[^>]+>/g,'');
   return href&&text.trim()!==href?`${text} (${href})`:text;
  })
  .replace(/<li\b[^>]*>/gi,'\n• ').replace(/<br\s*\/?\s*>/gi,'\n')
  .replace(/<\/(?:p|div|h[1-6]|li|tr|table|section|ul|ol)>/gi,'\n\n')
  .replace(/<[^>]+>/g,'')
  .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,value:string)=>{
   if(value.startsWith('#')){const code=value[1].toLowerCase()==='x'?parseInt(value.slice(2),16):parseInt(value.slice(1),10);return code>0&&code<=0x10ffff?String.fromCodePoint(code):match;}
   return entities[value.toLowerCase()]??match;
  }).split(/\n\s*\n/).map(paragraph=>paragraph.trim()).filter(Boolean);
}
