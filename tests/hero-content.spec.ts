import {test,expect} from '@playwright/test';
import {atelierSlides,configuredHeroProduct,heroArtwork,inheritHeroContent,shopHeroHandle} from '../src/lib/hero-content';
import {normalizeContentSection} from '../src/lib/content-safety';
import type {HeroProduct} from '../src/lib/hero-scene';

const rose:HeroProduct={id:'rose',handle:'rose',title:'Rose soap',productType:'Soap',shape:'soap',tone:'#cc8888',tags:[],image:'/images/rose.png',images:[],ingredients:[]};
const oil:HeroProduct={...rose,id:'oil',handle:'oil',title:'Facial oil',productType:'Facial Oil',image:'/images/oil.png'};

test('four default carousel scenes remain available; hidden slides stay hidden and sorting retains their own artwork',()=>{
 expect(atelierSlides()).toHaveLength(4);
 const slides=atelierSlides({handle:'home-hero',title:'My title'},[
  {handle:'home-hero-slide-2',enabled:false},
  {handle:'home-hero-slide-3',sortOrder:-1,image:'/images/custom.png',mobileImage:'/images/mobile.png',imagePosition:'right',title:'Third slide',linkUrl:'/shop?type=Soap'},
 ]);
 expect(slides.map(slide=>slide.handle)).toEqual(['home-hero-slide-3','home-hero','home-hero-slide-4']);
 expect(slides[0]).toMatchObject({image:'/images/custom.png',mobileImage:'/images/mobile.png',position:'right center',content:{title:'Third slide',linkUrl:'/shop?type=Soap'}});
 expect(slides[2].content.title).toBe('My title');
 expect(slides[2].image).toBe('/images/atelier-craft-v2.webp');
});

test('normalized empty override fields inherit base content, while explicit false survives',()=>{
 const base={handle:'shop-hero',caption:'A botanical study',productHandles:['oil'],image:'/images/default.png'};
 const override=normalizeContentSection({handle:'shop-hero-facial-oil',fields:[{key:'enabled',value:'false'}]})!;
 expect(inheritHeroContent(base,override)).toMatchObject({enabled:false,caption:'A botanical study',productHandles:['oil'],image:'/images/default.png'});
 expect(shopHeroHandle(' Cold processed Soap ')).toBe('shop-hero-cold-processed-soap');
 expect(shopHeroHandle('Body & Bath')).toBe('shop-hero-body-bath');
});

test('merchant product references win in order, with category fallback for unavailable references',()=>{
 expect(configuredHeroProduct([rose,oil],{handle:'shop-hero',productHandles:['oil','rose']},'Soap')).toBe(oil);
 expect(configuredHeroProduct([rose,oil],{handle:'shop-hero',productHandles:['removed']},'Facial Oil')).toBe(oil);
 expect(configuredHeroProduct([{...oil,image:undefined},rose],{handle:'shop-hero',productHandles:['oil']})).toBe(rose);
});

test('merchant and native collection images take precedence over 3D, with mobile artwork and product-image mode',()=>{
 const native={url:'/images/collection.png',altText:'A collection of care'};
 expect(heroArtwork({handle:'collection-body'},rose,native)).toMatchObject({image:native.url,alt:native.altText});
 expect(heroArtwork({handle:'collection-body',image:'/images/override.png',mobileImage:'/images/mobile.png',imageAlt:'My crop',imagePosition:'top'},rose,native)).toEqual({image:'/images/override.png',mobileImage:'/images/mobile.png',alt:'My crop',position:'center top'});
 expect(heroArtwork({handle:'shop-hero',mobileImage:'/images/mobile.png'},rose)).toMatchObject({image:'/images/mobile.png',mobileImage:'/images/mobile.png'});
 expect(heroArtwork({handle:'shop-hero',displayMode:'image'},oil)?.image).toBe(oil.image);
 expect(heroArtwork({handle:'shop-hero'},oil)).toBeUndefined();
});
