import {test,expect} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {demoProducts} from '../src/lib/demo';
import type {SiteContent} from '../src/lib/content-safety';

// Render the actual React components while keeping this suite offline and
// independent of browser rendering, Shopify data, and the optional 3D runtime.
const previousTsxLoader=require.extensions['.tsx'],previousCssLoader=require.extensions['.css'];
const {transformSync}=require('next/dist/compiled/babel/core');
require.extensions['.tsx']=(loadedModule,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}],require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
 (loadedModule as NodeModule&{_compile:(code:string,filename:string)=>void})._compile(code,filename);
};
require.extensions['.css']=loadedModule=>{loadedModule.exports={};};
const {SiteContentProvider}=require('../src/components/SiteContentProvider') as typeof import('../src/components/SiteContentProvider');
const {StoreProvider}=require('../src/components/StoreProvider') as typeof import('../src/components/StoreProvider');
const Purchase=(require('../src/components/Purchase') as typeof import('../src/components/Purchase')).default;
const Gallery=(require('../src/components/Gallery') as typeof import('../src/components/Gallery')).default;
const ProductGuidance=(require('../src/components/ProductGuidance') as typeof import('../src/components/ProductGuidance')).default;
require.extensions['.tsx']=previousTsxLoader;
if(previousCssLoader)require.extensions['.css']=previousCssLoader;else delete require.extensions['.css'];

test('merchant purchase copy changes while native prices, variants, stock, and checkout paths remain authoritative',()=>{
 const content:SiteContent={sections:{
  'ui-purchase-heading':{handle:'ui-purchase-heading',body:'Your everyday companion'},
  'ui-purchase-add':{handle:'ui-purchase-add',body:'Bring this home'},
  'ui-purchase-choose-prefix':{handle:'ui-purchase-choose-prefix',body:'Select your'},
  'ui-purchase-unavailable':{handle:'ui-purchase-unavailable',body:'Back another day'},
 }};
 const product={...demoProducts[0],demo:false};
 const render=(available=true)=>renderToStaticMarkup(createElement(SiteContentProvider,{content,children:createElement(StoreProvider,{demo:false,children:createElement(Purchase,{product:{...product,variants:product.variants.map(variant=>({...variant,availableForSale:available}))}})})}));
 const markup=render();
 expect(markup).toContain('Your everyday companion');
 expect(markup).toContain('Bring this home');
 expect(markup).toContain('Select your size');
 expect(markup).toContain('50 ml');
 expect(markup).toContain('890');
 expect(markup).toContain('href="/policies/shipping"');
 const soldOut=render(false);
 expect(soldOut).toContain('Back another day');
 expect(soldOut).not.toContain('Bring this home');
 expect(soldOut).toContain('<button class="button" disabled=""');
});

test('merchant gallery settings remove the 3D panel without removing native product photographs',()=>{
 const product={...demoProducts[0],demo:false,image:'https://cdn.shopify.com/product-photo.jpg',images:[{url:'https://cdn.shopify.com/product-photo.jpg',altText:'Actual product photograph'}]};
 const content:SiteContent={sections:{
  'product-gallery':{handle:'product-gallery',displayMode:'image',carouselAutoplay:false,carouselInterval:9000},
  'ui-gallery-photo-caption':{handle:'ui-gallery-photo-caption',body:'Made by hand'},
 }};
 const render=(settings:SiteContent)=>renderToStaticMarkup(createElement(SiteContentProvider,{content:settings,children:createElement(Gallery,{product})}));
 const markup=render(content);
 expect(markup).toContain('product-media-images-only');
 expect(markup).not.toContain('class="product-model-panel"');
 expect(markup).toContain('Actual product photograph');
 expect(markup).toContain('Made by hand');
 expect(markup).toContain('data-autoplay="paused"');
 expect(render({sections:{}})).toContain('class="product-model-panel"');
});

test('editable guidance labels retain native ingredient and care text',()=>{
 const product={...demoProducts[0],demo:false,fullIngredientList:'Coconut oil, shea butter',careNotes:'Keep in a cool place.'};
 const content:SiteContent={sections:{'ui-guidance-ingredients-title':{handle:'ui-guidance-ingredients-title',body:'The full formulation'},'ui-guidance-care-title':{handle:'ui-guidance-care-title',body:'Keep it well'}}};
 const markup=renderToStaticMarkup(createElement(ProductGuidance,{product,content}));
 expect(markup).toContain('The full formulation');
 expect(markup).toContain('Keep it well');
 expect(markup).toContain('Coconut oil, shea butter');
 expect(markup).toContain('Keep in a cool place.');
 expect(markup).toContain('href="/policies/shipping"');
});

test('disabled gallery settings restore the standard model and automatic slideshow',()=>{
 const product={...demoProducts[0],demo:false,images:[{url:'https://cdn.shopify.com/front.jpg'},{url:'https://cdn.shopify.com/back.jpg'}]};
 const content:SiteContent={sections:{'product-gallery':{handle:'product-gallery',enabled:false,displayMode:'image',carouselAutoplay:false,carouselInterval:9000}}};
 const markup=renderToStaticMarkup(createElement(SiteContentProvider,{content,children:createElement(Gallery,{product})}));
 expect(markup).toContain('class="product-model-panel"');
 expect(markup).toContain('aria-label="Pause product images"');
 expect(markup).not.toContain('product-media-images-only');
});
