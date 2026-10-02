import {test,expect} from '@playwright/test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {normalizeContentSection,type ContentSection} from '../src/lib/content-safety';
import type {AtelierPreviewProduct} from '../src/components/AtelierHero';

// Render the real client component on the server. Its CSS is inserted into the
// isolated browser document below; no app route, Shopify token or store is used.
const previousCssLoader=require.extensions['.css'];
const previousTsxLoader=require.extensions['.tsx'];
const {transformSync}=require('next/dist/compiled/babel/core');
require.extensions['.css']=()=>undefined;
require.extensions['.tsx']=(loadedModule,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}],require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
 (loadedModule as NodeModule&{_compile:(code:string,filename:string)=>void})._compile(code,filename);
};
const AtelierHero=(require('../src/components/AtelierHero') as typeof import('../src/components/AtelierHero')).default;
if(previousCssLoader)require.extensions['.css']=previousCssLoader;
else delete require.extensions['.css'];
require.extensions['.tsx']=previousTsxLoader;

const styles=['src/app/globals.css','src/app/atelier.css','src/app/story.css','src/components/atelier-preview.css'].map(file=>readFileSync(file,'utf8')).join('\n');
const products:AtelierPreviewProduct[]=[{id:'preview-one',handle:'preview-one',title:'Preview product',productType:'Oil',shape:'bottle',tone:'#95602f',image:'/images/bottle-atelier.png'}];
function markup(content?:ContentSection,preview?:ContentSection){
 const html=renderToStaticMarkup(createElement(AtelierHero,{products,content,preview}));
 return `<!doctype html><html><head><style>${styles}</style></head><body><div style="height:108px"></div><main class="atelier-home">${html}</main></body></html>`;
}

test('invalid editor values retain the hero defaults and cannot inject unsafe artwork or links',async({page})=>{
 const content=normalizeContentSection({handle:'home-hero',fields:[
  {key:'title',value:'<script>bad()</script>'},{key:'image',value:'https://unapproved.example/hero.png'},
  {key:'mobile_image',value:'javascript:bad()'},{key:'link_url',value:'javascript:bad()'},
  {key:'image_position',value:'url(https://unapproved.example/track)'},{key:'enabled',value:'false'}
 ]})!;
 await page.setContent(markup(content));
 await expect(page.getByRole('heading',{level:1})).toHaveText('Rooted in nature. Made forslower moments.');
 await expect(page.getByRole('link',{name:'Discover your ritual'})).toHaveAttribute('href','/shop');
 await expect(page.locator('.atelier-backdrop img')).toHaveAttribute('src',/atelier-hero.webp/);
 expect(await page.locator('script').count()).toBe(0);
 expect(await page.locator('.atelier-backdrop img').evaluate(image=>image.style.objectPosition)).toBe('');
});

test('hero artwork uses distinct mobile and desktop sources and the optional 3D card can be hidden',async({page})=>{
 const content=normalizeContentSection({handle:'home-hero',fields:[
  {key:'title',value:'Your own daily ritual.'},{key:'image',value:'/images/atelier-hero.webp'},
  {key:'mobile_image',value:'/images/atelier-ritual-v2.webp'},{key:'image_alt',value:'A merchant chosen still life'},
  {key:'image_position',value:'right'},{key:'link_url',value:'/collections/care'},{key:'link_label',value:'Explore care'}
 ]})!;
 await page.setViewportSize({width:375,height:812});
 await page.setContent(markup(content,{handle:'home-hero-preview',enabled:false}));
 await expect(page.locator('.atelier-backdrop source')).toHaveAttribute('media','(max-width: 540px)');
 await expect(page.locator('.atelier-backdrop source')).toHaveAttribute('srcset',/atelier-ritual-v2.webp/);
 await expect(page.locator('.atelier-backdrop img')).toHaveAttribute('srcset',/atelier-hero.webp/);
 await expect(page.getByAltText('A merchant chosen still life')).toHaveCSS('object-position','100% 50%');
 await expect(page.getByRole('link',{name:'Explore care'})).toHaveAttribute('href','/collections/care');
 await expect(page.locator('.hero-explore')).toHaveCount(0);
 await page.setContent(markup(content,{handle:'home-hero-preview',enabled:true}));
 await expect(page.getByRole('button',{name:/Get a little closer/})).toBeVisible();
});

for(const width of [375,768,1024,1440])test(`long merchant copy stays inside the hero without overlapping the preview at ${width}px`,async({page})=>{
 const content:ContentSection={handle:'home-hero',eyebrow:'A'.repeat(100),title:'Thoughtful everyday care with a human touch. '.repeat(8),titleEmphasis:'A softer, slower moment just for you. '.repeat(8),body:'Discover the textures, ingredients and stories behind your daily care. '.repeat(20),linkLabel:'Explore all of our thoughtful everyday products and find your own favourite',secondaryLabel:'Discover the people and the story behind every handmade product',items:['Botanical ingredients with a story worth exploring','Thoughtful objects made with a human touch']};
 await page.setViewportSize({width,height:900});
 await page.setContent(markup(content,{handle:'home-hero-preview',title:'Choose an everyday object and take a closer look at the details. '.repeat(3),eyebrow:'THE ATELIER, IN YOUR HANDS. '.repeat(5),body:'Turn the object and discover the care behind its making. '.repeat(5)}));
 const bounds=await page.evaluate(()=>{
  const rect=(selector:string)=>{const {top,bottom,left,right}=document.querySelector(selector)!.getBoundingClientRect();return {top,bottom,left,right};};
  return {hero:rect('.atelier-hero'),copy:rect('.atelier-hero-copy'),preview:rect('.hero-explore'),footer:rect('.atelier-hero-bottom'),pageWidth:document.documentElement.scrollWidth,viewport:window.innerWidth};
 });
 expect(bounds.pageWidth).toBeLessThanOrEqual(bounds.viewport);
 const copyAndPreviewAreSeparate=bounds.copy.bottom<=bounds.preview.top||bounds.copy.right<=bounds.preview.left||bounds.preview.right<=bounds.copy.left;
 expect(copyAndPreviewAreSeparate,JSON.stringify(bounds)).toBe(true);
 expect(bounds.preview.bottom).toBeLessThanOrEqual(bounds.footer.top);
 expect(bounds.footer.bottom).toBeLessThanOrEqual(bounds.hero.bottom);
});
