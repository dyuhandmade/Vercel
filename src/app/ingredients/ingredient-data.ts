import type {Product, StoryItem} from '@/lib/types';
import type {SiteContent} from '@/lib/content-safety';

export type IngredientFamily = 'Flowers & leaves' | 'Oils & butters' | 'Seeds & fruit' | 'Earth & minerals' | 'Other ingredients';
export type IngredientReference = {handle:string; title:string; image?:string; productType:string; basis:'Ingredient story'|'Ingredient list'|'Product name'};
export type IngredientEntry = {handle:string; name:string; description:string; image?:string; mobileImage?:string; imageAlt?:string; imagePosition?:string; family:string; references:IngredientReference[]; hasStory:boolean};

// This is a catalogue index, not a claim about a formulation. An entry is only
// emitted when the live product name, ingredient list or ingredient story supplies it.
const vocabulary:{name:string; match:RegExp; family:IngredientFamily}[] = [
  {name:'Rose',match:/\brose\b/i,family:'Flowers & leaves'},
  {name:'Lavender',match:/\blav[ea]nd[ea]r\b/i,family:'Flowers & leaves'},
  {name:'Tea tree',match:/\btea[ -]tree\b/i,family:'Flowers & leaves'},
  {name:'Rosemary',match:/\brosemary\b/i,family:'Flowers & leaves'},
  {name:'Neem',match:/\bneem\b/i,family:'Flowers & leaves'},
  {name:'Jasmine',match:/\bjasmine?\b|\bjasminum\b/i,family:'Flowers & leaves'},
  {name:'Aloe',match:/\baloe\b/i,family:'Flowers & leaves'},
  {name:'Mint',match:/\b(?:pepper)?mint\b/i,family:'Flowers & leaves'},
  {name:'Sandalwood',match:/\bsandalwood\b/i,family:'Flowers & leaves'},
  {name:'Camphor',match:/\bcamphora?\b/i,family:'Flowers & leaves'},
  {name:'Almond',match:/\balmond\b/i,family:'Seeds & fruit'},
  {name:'Orange',match:/\borange\b/i,family:'Seeds & fruit'},
  {name:'Coffee',match:/\bcoffee\b/i,family:'Seeds & fruit'},
  {name:'Vanilla',match:/\bvanilla\b/i,family:'Seeds & fruit'},
  {name:'Turmeric',match:/\bturmeric\b/i,family:'Seeds & fruit'},
  {name:'Annatto',match:/\bann?atto\b/i,family:'Seeds & fruit'},
  {name:'Moringa',match:/\bmoringa\b/i,family:'Oils & butters'},
  {name:'Olive',match:/\bolive\b/i,family:'Oils & butters'},
  {name:'Coconut',match:/\bcoconut\b/i,family:'Oils & butters'},
  {name:'Shea butter',match:/\bshea[\s-]+butter\b/i,family:'Oils & butters'},
  {name:'Cocoa butter',match:/\bcocoa[\s-]+butter\b/i,family:'Oils & butters'},
  {name:'Pink salt',match:/\bpink[ -]salt\b/i,family:'Earth & minerals'},
  {name:'Charcoal',match:/\bcharcoal\b/i,family:'Earth & minerals'},
  {name:'Rhassoul clay',match:/\brhassoul\b/i,family:'Earth & minerals'},
  {name:'French green clay',match:/\bfrench[\s-]+green[\s-]+clay\b/i,family:'Earth & minerals'},
];

function slug(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function family(item:StoryItem):IngredientFamily{return vocabulary.find(term=>term.match.test(item.name))?.family||'Other ingredients';}

export function buildIngredientIndex(products:Product[],content?:SiteContent):IngredientEntry[]{
  const entries=new Map<string,IngredientEntry>();
  const addReference=(entry:IngredientEntry,product:Product,basis:IngredientReference['basis'])=>{
    if(!entry.references.some(ref=>ref.handle===product.handle))entry.references.push({handle:product.handle,title:product.title,image:product.image,productType:product.productType,basis});
  };
  for(const product of products){
    for(const item of product.ingredients){
      const handle=item.handle||slug(item.name)||encodeURIComponent(item.name);
      let entry=entries.get(handle);
      if(!entry){entry={handle,name:item.name,description:item.description||'',image:item.image,family:family(item),references:[],hasStory:true};entries.set(handle,entry);}
      if(!entry.description&&item.description)entry.description=item.description;
      if(!entry.image&&item.image)entry.image=item.image;
      addReference(entry,product,'Ingredient story');
    }
  }
  for(const term of vocabulary){
    for(const product of products){
      const listed=term.match.test(product.fullIngredientList||'');
      if(!listed&&!term.match.test(product.title))continue;
      // A product named "rose" is not evidence for a more specific story such
      // as "rose clay" or "rose oil". Only merge equivalent ingredient names.
      let entry=[...entries.values()].find(item=>slug(item.name)===slug(term.name));
      if(!entry){const handle=entries.has(slug(term.name))?`catalogue-${slug(term.name)}`:slug(term.name);entry={handle,name:term.name,description:'',family:term.family,references:[],hasStory:false};entries.set(entry.handle,entry);}
      addReference(entry,product,listed?'Ingredient list':'Product name');
    }
  }
  return [...entries.values()].filter(entry=>content?.sections[`ingredient-${entry.handle}`]?.enabled!==false).map(entry=>{
    // Product references remain evidence-based; editorial overrides change presentation only.
    const saved=content?.sections[`ingredient-${entry.handle}`];
    return {...entry,name:saved?.title||entry.name,description:saved?.body||entry.description,image:saved?.image||entry.image,mobileImage:saved?.mobileImage,imageAlt:saved?.imageAlt,imagePosition:saved?.imagePosition,family:saved?.category||entry.family};
  }).sort((a,b)=>a.name.localeCompare(b.name));
}

export function findIngredient(entries:IngredientEntry[],handle:string){
  // Next already decodes route parameters. Also accept the old name-based links.
  return entries.find(item=>item.handle===handle)
    ||entries.find(item=>item.name===handle||slug(item.name)===handle);
}
