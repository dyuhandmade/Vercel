import type {ContentSection} from './content-safety';
import {selectHeroProduct,type HeroProduct} from './hero-scene';

export const heroImagePositions:Record<string,string>={left:'left center',center:'center center',right:'right center',top:'center top',bottom:'center bottom'};

/** Missing fields inherit; normalized empty reference lists are also unset. */
export function inheritHeroContent(base:ContentSection,override?:ContentSection):ContentSection {
 const fields=Object.entries(override||{}).filter(([,value])=>value!==undefined&&(!Array.isArray(value)||value.length>0));
 return {...base,...Object.fromEntries(fields)};
}

export function shopHeroHandle(type:string):string {
 return `shop-hero-${type.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,110)}`;
}

const defaultSlides=[
 {handle:'home-hero',image:'/images/atelier-hero.webp',alt:'Illustrative DYUhandmade care products with botanicals, linen and sunlit stone'},
 {handle:'home-hero-slide-2',image:'/images/atelier-ritual-v2.webp',alt:'A quiet botanical care ritual'},
 {handle:'home-hero-slide-3',image:'/images/botanical-study.webp',alt:'Botanical forms and natural textures'},
 {handle:'home-hero-slide-4',image:'/images/atelier-craft-v2.webp',alt:'Thoughtful handmade care in the atelier'},
];

export function atelierSlides(content:ContentSection={handle:'home-hero'},slides:ContentSection[]=[]){
 return defaultSlides.map((fallback,index)=>{
  const value=index===0?content:slides.find(slide=>slide.handle===fallback.handle)||{handle:fallback.handle};
  return {
   handle:fallback.handle,enabled:value.enabled,order:value.sortOrder??index+1,
   content:inheritHeroContent(content,value),
   image:value.image||value.mobileImage||fallback.image,
   mobileImage:value.mobileImage||value.image||fallback.image,
   alt:value.imageAlt||fallback.alt,
   position:value.imagePosition?heroImagePositions[value.imagePosition]:index===0?undefined:'center center',
  };
 }).filter(slide=>slide.enabled!==false).sort((a,b)=>a.order-b.order);
}

/** Explicit products win in reference order; deleted references recover gracefully. */
export function configuredHeroProduct(products:HeroProduct[],content?:ContentSection,type?:string|null):HeroProduct|undefined {
 const selected=(content?.productHandles||[]).map(handle=>products.find(product=>product.handle===handle)).filter((product):product is HeroProduct=>Boolean(product));
 return selectHeroProduct(selected)||selectHeroProduct(products,type);
}

export function heroArtwork(content:ContentSection,product?:HeroProduct,nativeImage?:{url:string;altText?:string}){
 const image=content.image||content.mobileImage||nativeImage?.url||(content.displayMode==='image'?(product?.image||product?.images[0]?.url):undefined);
 return image?{image,mobileImage:content.mobileImage||image,alt:content.imageAlt||nativeImage?.altText||product?.title||'The collection',position:heroImagePositions[content.imagePosition||'center']}:undefined;
}
