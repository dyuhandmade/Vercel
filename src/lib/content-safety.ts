/** Pure display adapters. Shopify retains the original values; only rendering is constrained. */
export type ContentSection = {
 handle:string; name?:string; eyebrow?:string; title?:string; titleEmphasis?:string; body?:string;
 image?:string; mobileImage?:string; imageAlt?:string; imagePosition?:string;
 linkLabel?:string; linkUrl?:string; secondaryLabel?:string; secondaryUrl?:string;
 enabled?:boolean; sortOrder?:number; productHandles?:string[]; collectionHandles?:string[];
 items?:string[]; note?:string; caption?:string; category?:string; readTime?:string;
};
export type SiteContent = {sections:Record<string,ContentSection>};
export type ContentField = {key:string;value?:string|null;type?:string;reference?:{image?:{url?:string;altText?:string|null}}|null;references?:{nodes:{__typename?:string;handle?:string}[]}|null};
export type RawContentSection = {handle:string;fields:ContentField[]};

function richText(node:unknown, depth=0):string {
 if(depth>12||!node||typeof node!=='object')return '';
 const n=node as {type?:string;value?:unknown;children?:unknown[]};
 if(n.type==='text')return typeof n.value==='string'?n.value:'';
 const text=Array.isArray(n.children)?n.children.slice(0,200).map(child=>richText(child,depth+1)).join(''):'';
 return ['paragraph','heading','list-item'].includes(n.type||'')?`${text}\n`:text;
}

export function plainText(value:unknown, maxLength=3000):string|undefined {
 if(typeof value!=='string')return undefined;
 let text=value;
 if(text.trim().startsWith('{')){
  try{const parsed=JSON.parse(text);if(parsed?.type==='root')text=richText(parsed);}catch{/* Existing plain text is valid too. */}
 }
 text=text.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'').replace(/<br\s*\/?\s*>|<\/p\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/\r\n?/g,'\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 return text?text.slice(0,maxLength):undefined;
}

export function safeLink(value:unknown, allowContact=false):string|undefined {
 if(typeof value!=='string')return undefined;
 const candidate=value.trim();
 if(!candidate||candidate.length>2048||/[\u0000-\u0020\u007f\\]/.test(candidate)||/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(candidate))return undefined;
 if(/^#[a-z0-9][a-z0-9_-]*$/i.test(candidate))return candidate;
 if(candidate.startsWith('/')&&!candidate.startsWith('//')){
  const url=new URL(candidate,'https://dyu.invalid');
  return url.origin==='https://dyu.invalid'?`${url.pathname}${url.search}${url.hash}`:undefined;
 }
 if(allowContact&&/^mailto:[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(candidate))return candidate;
 if(allowContact&&/^tel:\+?[0-9()\-]{5,25}$/.test(candidate))return candidate;
 try{const url=new URL(candidate);return url.protocol==='https:'&&!url.username&&!url.password?url.href:undefined;}catch{return undefined;}
}

export function safeImage(value:unknown):string|undefined {
 const url=safeLink(value);
 if(!url)return undefined;
 if(url.startsWith('/'))return url.startsWith('/images/')?url:undefined;
 try{return new URL(url).hostname==='cdn.shopify.com'?url:undefined;}catch{return undefined;}
}

export function textList(value:unknown, maxItems=20, maxLength=240):string[] {
 if(typeof value==='string'){try{value=JSON.parse(value);}catch{return [];}}
 if(!Array.isArray(value))return [];
 return value.slice(0,maxItems).map(item=>plainText(item,maxLength)).filter((item):item is string=>Boolean(item));
}

export function safeHandle(value:unknown):string|undefined {
 return typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,127}$/.test(value)?value:undefined;
}

export function normalizeContentSection(raw:RawContentSection):ContentSection|null {
 const handle=safeHandle(raw.handle);if(!handle)return null;
 const field=(key:string)=>raw.fields.find(item=>item.key===key);
 const value=(key:string,max=300)=>plainText(field(key)?.value,max);
 const handles=(key:string,type:string)=>[...new Set((field(key)?.references?.nodes||[]).filter(node=>!node.__typename||node.__typename===type).map(node=>safeHandle(node.handle)).filter((h):h is string=>Boolean(h)))].slice(0,24);
 const position=field('image_position')?.value;
 const enabled=field('enabled')?.value;
 const order=field('sort_order')?.value?.trim();
 const imageField=field('image');
 return {
  handle,name:value('name',100),eyebrow:value('eyebrow',100),title:value('title',160),titleEmphasis:value('title_emphasis',160),body:value('body',20000),
  image:safeImage(imageField?.reference?.image?.url||imageField?.value),mobileImage:safeImage(field('mobile_image')?.reference?.image?.url||field('mobile_image')?.value),
  imageAlt:value('image_alt',300)||plainText(imageField?.reference?.image?.altText,300),imagePosition:position&&['left','center','right','top','bottom'].includes(position)?position:undefined,
  linkLabel:value('link_label',80),linkUrl:safeLink(field('link_url')?.value,true),secondaryLabel:value('secondary_label',80),secondaryUrl:safeLink(field('secondary_url')?.value,true),
  enabled:enabled==='true'?true:enabled==='false'?false:undefined,sortOrder:order&&/^-?\d+$/.test(order)?Math.max(-10000,Math.min(10000,Number(order))):undefined,
  productHandles:handles('products','Product'),collectionHandles:handles('collections','Collection'),items:textList(field('items')?.value),note:value('note',240),caption:value('caption',240),category:value('category',100),readTime:value('read_time',80),
 };
}
