import type {Product} from './types';

export const SIMILAR_PRODUCT_LIMIT = 8;
export type ProductRecommendation = {product:Product; score:number; reason:string};

// Keep generic shop copy from making every handmade product look alike.
const stopWords = new Set(('a an and are as at be by can care daily day dyu everyday for from handmade has in is it its made natural of on or our plant product products pure ritual skin the this to types use vegan with your all botanical organic rich gentle gently extra virgin oil oils extract extracts essential butter powder powdered cold pressed processed bar soap face facial body hair ml gm g').split(' '));
const botanicals:Record<string,RegExp> = {
 almond:/\balmond\b/, aloe:/\baloe\b/, annatto:/\bann?at[t]?o\b/, camphor:/\bcamphor(?:a)?\b/,
 charcoal:/\bcharcoal\b/, clay:/\bclay\b/, cocoa:/\bcocoa\b/, coconut:/\bcoconut\b/,
 coffee:/\bcoffee\b/, hibiscus:/\bhibiscus\b/, jasmine:/\bjasmin(?:e|um)?\b/,
 jojoba:/\bjojoba\b/, lavender:/\blavender\b/, mint:/\b(?:peppermint|mint)\b/,
 neem:/\bneem\b/, olive:/\bolive\b/, orange:/\borange\b/, rose:/\brose\b/,
 rosemary:/\brosemary\b/, sandalwood:/\bsandalwood\b/, shea:/\bshea\b/,
 'tea tree':/\btea tree\b/, turmeric:/\bturmeric\b/, vetiver:/\bvetiver\b/,
};
const purposes:Record<string,RegExp> = {
 cleanse:/\b(?:cleans\w*|wash|purif\w*)\b/, exfoliate:/\b(?:exfoliat\w*|scrub)\b/,
 moisturize:/\b(?:moistur\w*|hydrat\w*|nourish\w*|dry skin)\b/,
 soothe:/\b(?:sooth\w*|calm\w*)\b/, oily:/\b(?:oily|acne prone|combination)\b/,
 sensitive:/\bsensitive\b/, hair:/\b(?:scalp|hair|dandruff)\b/,
};

function normalize(value:string) {
 return value.slice(0,20000).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/lavendar/g,'lavender').replace(/moisturiser/g,'moisturizer').replace(/[^a-z0-9]+/g,' ').trim();
}
function tokens(value:string) {
 return new Set(normalize(value).split(' ').filter(word=>word.length>2&&!stopWords.has(word)&&!/^\d/.test(word)));
}
function matches(value:string,patterns:Record<string,RegExp>) {
 return new Set(Object.keys(patterns).filter(key=>patterns[key].test(value)));
}
function intersect(a:Set<string>,b:Set<string>) { return [...a].filter(value=>b.has(value)); }
function overlap(a:Set<string>,b:Set<string>,weight:(value:string)=>number=()=>1) {
 const union=new Set([...a,...b]);
 const total=[...union].reduce((sum,value)=>sum+weight(value),0);
 return total?intersect(a,b).reduce((sum,value)=>sum+weight(value),0)/total:0;
}
function profile(product:Product) {
 const identity=normalize(`${product.title} ${product.productType} ${product.tags.join(' ')}`);
 const ingredientText=normalize(`${product.ingredients.map(item=>item.name).join(' ')} ${product.fullIngredientList||''}`);
 const detail=normalize(`${product.description} ${product.story} ${product.sensory||''} ${product.ritual.map(item=>`${item.name} ${item.description}`).join(' ')}`);
 const titleNotes=matches(normalize(product.title),botanicals);
 const form=/\b(?:soap|bar)\b/.test(identity)?'soap':/\b(?:ubtan|scrub)\b/.test(identity)?'scrub':/\b(?:cleanser|wash)\b/.test(identity)?'cleanser':/\b(?:butter|balm|cream|moisturizer)\b/.test(identity)?'moisturizer':/\b(?:oil|serum)\b/.test(identity)?'oil':/\b(?:gift|set|bundle)\b/.test(identity)?'gift':'';
 const areas=new Set<string>();
 if(/\b(?:hair|scalp)\b/.test(identity))areas.add('hair');
 if(/\b(?:face|facial)\b/.test(identity))areas.add('face');
 if(/\b(?:body|bath)\b/.test(identity)||form==='soap')areas.add('body');
 return {
  type:normalize(product.productType),form,areas,
  ingredients:new Set([...matches(ingredientText,botanicals),...product.ingredients.map(item=>[...tokens(item.name)].sort().join(' ')).filter(Boolean)]),
  notes:titleNotes.size?titleNotes:matches(normalize(product.sensory||''),botanicals),
  tags:tokens(product.tags.join(' ')),purposes:matches(detail,purposes),text:tokens(`${identity} ${detail} ${ingredientText}`),
 };
}

/** Similarity establishes eligibility first; price and stock only refine a relevant match. */
export function rankSimilarProducts(current:Product,catalog:Product[]):ProductRecommendation[] {
 const seenIds=new Set([current.id]),seenHandles=new Set([current.handle]);
 const candidates=catalog.filter(product=>{
  if(seenIds.has(product.id)||seenHandles.has(product.handle))return false;
  seenIds.add(product.id);seenHandles.add(product.handle);return true;
 });
 const source=profile(current),profiles=candidates.map(profile);
 const documents=[source,...profiles];
 const frequency=new Map<string,number>();
 for(const document of documents)for(const word of new Set([...document.text,...document.ingredients,...document.notes,...document.tags]))frequency.set(word,(frequency.get(word)||0)+1);
 const weight=(word:string)=>1+Math.log((documents.length+1)/((frequency.get(word)||0)+1));
 const curated=new Set(current.relatedProductHandles||[]);

 return candidates.map((product,index):ProductRecommendation|null=>{
  const candidate=profiles[index];
  const sameType=Boolean(source.type&&source.type===candidate.type);
  const sharedArea=intersect(source.areas,candidate.areas).length>0;
  const compatibleArea=sharedArea||!source.areas.size||!candidate.areas.size;
  const sameForm=Boolean(source.form&&source.form===candidate.form&&compatibleArea);
  const sharedIngredients=intersect(source.ingredients,candidate.ingredients);
  const sharedNotes=intersect(source.notes,candidate.notes);
  const sharedTags=intersect(source.tags,candidate.tags);
  const intent=overlap(source.purposes,candidate.purposes);
  const text=overlap(source.text,candidate.text,weight);
  const selected=curated.has(product.handle);
  if(!sameType&&!sameForm&&!sharedIngredients.length&&!sharedNotes.length&&!sharedTags.length&&!selected&&!(sharedArea&&intent>0&&text>=.12))return null;

  // Category names vary across the catalog. A rose soap in another soap
  // category should beat an unrelated scent with an identical category label.
  let score=(sameType?16:0)+(sameForm?28:0)+(sharedArea?5:0)
   +overlap(source.ingredients,candidate.ingredients,weight)*28
   +overlap(source.notes,candidate.notes,weight)*32
   +overlap(source.tags,candidate.tags,weight)*16+intent*12+text*10+(selected?22:0);
  if(current.shape!=='general'&&current.shape===product.shape)score+=1;
  const sourcePrice=Number(current.price.amount),candidatePrice=Number(product.price.amount);
  if(current.price.currencyCode===product.price.currencyCode&&Number.isFinite(sourcePrice)&&Number.isFinite(candidatePrice)&&sourcePrice>0&&candidatePrice>0)score+=3*Math.min(sourcePrice,candidatePrice)/Math.max(sourcePrice,candidatePrice);
  if(product.availableForSale)score+=2;
  const reason=sharedNotes.length?`${sharedNotes.slice(0,2).map(note=>note[0].toUpperCase()+note.slice(1)).join(' · ')} in common`
   :sameType?`Similar ${product.productType.toLowerCase()}`
   :sharedIngredients.length?'Shared ingredient story'
   :sameForm?'A similar everyday ritual'
   :selected?'Chosen for this ritual'
   :sharedTags.length?'Shared product details':'Similar care focus';
  return {product,score,reason};
 }).filter((result):result is ProductRecommendation=>result!==null)
  .sort((a,b)=>b.score-a.score||a.product.handle.localeCompare(b.product.handle))
  .slice(0,SIMILAR_PRODUCT_LIMIT);
}
