const entities:Record<string,string> = {
 amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',
 ndash:'–',mdash:'—',bull:'•',copy:'©',reg:'®',trade:'™',hellip:'…',ensp:' ',emsp:' ',thinsp:' ',
};

function decodeEntities(text:string):string {
 return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(match,value:string)=>{
  if(!value.startsWith('#'))return entities[value.toLowerCase()]??match;
  const code=value[1].toLowerCase()==='x'?parseInt(value.slice(2),16):parseInt(value.slice(1),10);
  return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):match;
 });
}

function paragraphs(text:string):string[]{
 return text.replace(/\r\n?/g,'\n').split(/\n\s*\n/).map(value=>value.trim()).filter(Boolean);
}

function listNumber(tag:string,attribute:'start'|'value'):number|undefined{
 const match=tag.match(new RegExp(`\\s${attribute}\\s*=\\s*(?:"(-?\\d+)"|'(-?\\d+)'|(-?\\d+)(?=\\s|>))`,'i'));
 const value=match?Number(match[1]??match[2]??match[3]):NaN;
 return Number.isSafeInteger(value)?value:undefined;
}

/** Presentation text only. Decode entities last; the result must be React text, never HTML. */
export function productDescriptionParagraphs(html:string|undefined, plainDescription=''):string[]{
 if(!html?.trim())return paragraphs(plainDescription);
 const source=html
  .replace(/<!--[^]*?(?:-->|$)/g,'')
  .replace(/<(script|style|template|iframe|object)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'')
  .replace(/\s+/g,' ');
 const tags=/<\/?([a-z][a-z0-9:-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
 const lists:{ordered:boolean;next:number}[]=[];
 let text='',cursor=0,listItemDepth=0;
 for(const match of source.matchAll(tags)){
  text+=source.slice(cursor,match.index);
  cursor=match.index!+match[0].length;
  const tag=match[1].toLowerCase(),closing=match[0].startsWith('</');
  if(tag==='br')text+='\n';
  else if(tag==='ul'||tag==='ol'){
   text+='\n\n';
   if(closing)lists.pop();
   else lists.push({ordered:tag==='ol',next:listNumber(match[0],'start')??1});
  }else if(tag==='li'){
   if(closing){listItemDepth=Math.max(0,listItemDepth-1);text+='\n';}
   else{listItemDepth++;const list=lists.at(-1);if(list?.ordered)list.next=listNumber(match[0],'value')??list.next;text+=`\n${list?.ordered?`${list.next++}.`:'•'} `;}
  }else if(/^(?:p|div|h[1-6]|section|article|blockquote|pre|hr|tr|table)$/.test(tag)){
   // Shopify sometimes nests a paragraph inside each list item.
   if(!closing&&listItemDepth&&/(?:•|\d+\.) $/.test(text))continue;
   text+=listItemDepth?'\n':'\n\n';
  }else if(tag==='td'||tag==='th')text+=' ';
 }
 text+=source.slice(cursor);
 const result=paragraphs(decodeEntities(text).replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n'));
 return result.length?result:paragraphs(plainDescription);
}
