import {expect,test} from '@playwright/test';
import {articles,getArticles,parseArticleBody} from '../src/lib/journal';
import {normalizeContentSection} from '../src/lib/content-safety';
import {buildIngredientIndex} from '../src/app/ingredients/ingredient-data';
import type {Product} from '../src/lib/types';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';

// Playwright's JSX transform creates test component descriptors. Use React's
// transform when verifying the actual markup emitted by this component.
const previousTsxLoader=require.extensions['.tsx'];
const {transformSync}=require('next/dist/compiled/babel/core');
require.extensions['.tsx']=(loadedModule,filename)=>{
 const {code}=transformSync(readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,presets:[[require('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}],require('next/dist/compiled/babel/preset-typescript')],plugins:[require('next/dist/compiled/babel/plugin-transform-modules-commonjs')]});
 (loadedModule as NodeModule&{_compile:(code:string,filename:string)=>void})._compile(code,filename);
};
const ContentImage=(require('../src/components/ContentImage') as typeof import('../src/components/ContentImage')).default;
require.extensions['.tsx']=previousTsxLoader;

test('editorial images retain fill layout and select mobile artwork without changing desktop artwork',()=>{
 const markup=renderToStaticMarkup(createElement(ContentImage,{src:'/images/atelier-hero.webp',mobileSrc:'/images/botanical-study.webp',alt:'Merchant artwork',fill:true,sizes:'100vw',preload:true,style:{objectPosition:'right'}}));
 expect(markup).toContain('<picture');
 expect(markup).toContain('media="(max-width: 540px)"');
 expect(markup).toContain('botanical-study.webp');
 expect(markup).toContain('atelier-hero.webp');
 expect(markup).toContain('object-position:right');
 expect(markup).toContain('position:absolute');
 expect(markup).toContain('loading="eager"');
});

test('Shopify article copy and reading time always win, including the original starter copy',()=>{
 const original=articles[0];
 const body=[...original.paragraphs,
  'You do not need a perfect setting or an elaborate sequence. Choose a moment that already exists in your day and let it be a little slower. Notice the water, the light, the sound of the room.',
  'A ritual is something you return to. Let yours be simple enough to repeat, and personal enough to feel like your own.',
 ].join('\n\n');
 const entry=normalizeContentSection({handle:`article-${original.slug}`,fields:[
  {key:'title',value:original.title},{key:'body',value:body},{key:'read_time',value:'4 MIN READ'},
  {key:'image',value:'/images/botanical-study.webp'},{key:'image_alt',value:'A new botanical study'},{key:'image_position',value:'right'},
 ]})!;
 const article=getArticles({sections:{[entry.handle]:entry}})[0];
 expect(article.paragraphs.join('\n\n')).toBe(body);
 expect(article.sections).toEqual([]);
 expect(article.readTime).toBe('4 MIN READ');
 expect(article.imageAlt).toBe('A new botanical study');
 expect(article.imagePosition).toBe('right');
 expect(article.takeaway).toBeUndefined();
});

test('merchant article headings create reader chapters and editable invitations remain independent',()=>{
 expect(parseArticleBody('Opening paragraph.\n\n## First chapter\nChapter copy.\n\n## Second chapter\nMore copy.')).toEqual({paragraphs:['Opening paragraph.'],sections:[{heading:'First chapter',paragraphs:['Chapter copy.']},{heading:'Second chapter',paragraphs:['More copy.']}]});
 const article=getArticles({sections:{
  'article-new-story':{handle:'article-new-story',title:'A new story',body:'An opening.\n## A chapter\nA new detail.',sortOrder:-1},
  'journal-takeaway-new-story':{handle:'journal-takeaway-new-story',body:'An invitation chosen by the merchant.'},
 }})[0];
 expect(article.slug).toBe('new-story');
 expect(article.sections?.[0].heading).toBe('A chapter');
 expect(article.takeaway).toBe('An invitation chosen by the merchant.');
});

test('ingredient presentation overrides preserve product evidence and support hiding entries',()=>{
 const product:Product={id:'rose',handle:'rose-soap',title:'Rose soap',description:'',productType:'Soap',tags:[],availableForSale:true,createdAt:'',images:[],shape:'soap',tone:'#fff',price:{amount:'100',currencyCode:'INR'},variants:[],story:'',ingredients:[],craft:[],ritual:[]};
 const original=buildIngredientIndex([product])[0];
 const entries=buildIngredientIndex([product],{sections:{'ingredient-rose':{handle:'ingredient-rose',title:'Our rose',body:'A merchant botanical story.',category:'Flower notes',image:'/images/botanical-study.webp',imageAlt:'Rose petals',imagePosition:'top'}}});
 expect(entries[0]).toMatchObject({handle:'rose',name:'Our rose',description:'A merchant botanical story.',family:'Flower notes',image:'/images/botanical-study.webp',imageAlt:'Rose petals',imagePosition:'top',references:original.references});
 expect(buildIngredientIndex([product],{sections:{'ingredient-rose':{handle:'ingredient-rose',enabled:false}}})).toEqual([]);
});
