import {test,expect} from '@playwright/test';
import {rankSimilarProducts} from '../src/lib/product-recommendations';
import type {Product} from '../src/lib/types';

function product(handle:string,overrides:Partial<Product>={}):Product {
 return {id:`product-${handle}`,handle,title:handle,productType:'',tags:[],description:'',story:'',availableForSale:true,createdAt:'2026-01-01',images:[],shape:'general',tone:'#95602f',price:{amount:'450',currencyCode:'INR'},variants:[],ingredients:[],craft:[],ritual:[],...overrides};
}

test('similarity changes with the viewed product, excludes itself and ignores catalog order',()=>{
 const rose=product('rose-soap',{title:'Rose Soap',productType:'Cold processed Soap',shape:'soap',sensory:'Rose floral aroma'});
 const lavender=product('lavender-soap',{title:'Lavender Soap',productType:rose.productType,shape:'soap',sensory:'Lavender floral aroma'});
 const roseBar=product('rose-bar',{title:'Rose Reset Bar',productType:'Bar Soap',shape:'soap',sensory:'Rose floral aroma'});
 const lavenderBar=product('lavender-bar',{title:'Lavendar Haze Bar',productType:'Bar Soap',shape:'soap',sensory:'Lavendar floral aroma'});
 const catalog=[roseBar,lavender,lavenderBar,rose];
 const roses=rankSimilarProducts(rose,catalog),lavenders=rankSimilarProducts(lavender,catalog);
 expect(roses.find(item=>item.product.handle==='rose-bar')!.score).toBeGreaterThan(roses.find(item=>item.product.handle==='lavender-bar')!.score);
 expect(lavenders.find(item=>item.product.handle==='lavender-bar')!.score).toBeGreaterThan(lavenders.find(item=>item.product.handle==='rose-bar')!.score);
 expect(roses.some(item=>item.product.id===rose.id)).toBe(false);
 expect(rankSimilarProducts(rose,[...catalog].reverse()).map(item=>item.product.handle)).toEqual(roses.map(item=>item.product.handle));
});

test('generic marketing, bottle shape and a matching price do not qualify unrelated products',()=>{
 const hair=product('hair-oil',{title:'Hair Oil',productType:'Hair Care',shape:'bottle',description:'Handmade natural vegan botanical care.'});
 const face=product('face-oil',{title:'Facial Oil',productType:'Facial Oil',shape:'bottle',description:hair.description,tags:['Natural','Handmade','Vegan']});
 const unknown=product('unknown',{shape:'bottle',price:hair.price});
 expect(rankSimilarProducts(hair,[hair,face,unknown])).toEqual([]);
});

test('a matching botanical in another soap category outranks an unrelated scent in the exact category',()=>{
 const source=product('rose-soap',{title:'Damask Rose Soap',productType:'Cold processed Soap',shape:'soap'});
 const rose=product('rose-bar',{title:'Rose Reset Soap Bar',productType:'Bar Soap',shape:'soap'});
 const soaps=Array.from({length:10},(_,index)=>product(`other-soap-${index}`,{title:`Plain Soap ${index}`,productType:source.productType,shape:'soap'}));
 const result=rankSimilarProducts(source,[...soaps,rose]);
 expect(result[0].product.handle).toBe(rose.handle);
});

test('ingredients, care purpose, merchant selections, price and availability refine recommendations',()=>{
 const source=product('face-balm',{title:'Face Balm',productType:'Face Balm',shape:'jar',ingredients:[{name:'Almond oil',description:''}],description:'Moisturizes dry skin.',relatedProductHandles:['almond-body-oil']});
 const plain=product('plain-face-balm',{title:'Face Balm',productType:source.productType,shape:'jar'});
 const formula=product('almond-face-balm',{title:'Almond Face Balm',productType:source.productType,shape:'jar',ingredients:source.ingredients,description:source.description});
 const curated=product('almond-body-oil',{title:'Almond Body Oil',productType:'Body Oil',shape:'bottle',ingredients:source.ingredients});
 const result=rankSimilarProducts(source,[plain,formula,curated]);
 expect(result[0].product.handle).toBe(formula.handle);
 expect(result.some(item=>item.product.handle===curated.handle)).toBe(true);
 const selected=rankSimilarProducts({...source,relatedProductHandles:[]},[curated])[0];
 expect(result.find(item=>item.product.handle===curated.handle)!.score).toBeGreaterThan(selected.score);
 const available=product('a-available',{...plain,id:'available',handle:'a-available',availableForSale:true});
 const sold=product('b-sold',{...plain,id:'sold',handle:'b-sold',availableForSale:false});
 const expensive=product('c-expensive',{...plain,id:'expensive',handle:'c-expensive',price:{amount:'2000',currencyCode:'INR'}});
 const refinements=rankSimilarProducts(source,[expensive,sold,available]);
 expect(refinements[0].product.handle).toBe('a-available');
 expect(refinements.find(item=>item.product.handle==='a-available')!.score).toBeGreaterThan(refinements.find(item=>item.product.handle==='c-expensive')!.score);
});

test('recommendations contain at most eight unique relevant items and never pad a short list',()=>{
 const source=product('source',{title:'Soap',productType:'Soap',shape:'soap'});
 const candidates=Array.from({length:12},(_,index)=>product(`soap-${index}`,{title:`Soap ${index}`,productType:'Soap',shape:'soap'}));
 const result=rankSimilarProducts(source,[source,...candidates,candidates[0],{...candidates[0],id:'duplicate-id'}]);
 expect(result).toHaveLength(8);
 expect(new Set(result.map(item=>item.product.handle)).size).toBe(8);
 expect(rankSimilarProducts(source,[source,candidates[0],product('unrelated')])).toHaveLength(1);
 expect(rankSimilarProducts({...source,price:{amount:'bad',currencyCode:'INR'}},candidates).every(item=>Number.isFinite(item.score))).toBe(true);
});

async function openProduct(page:import('@playwright/test').Page) {
 const health=await (await page.request.get('/api/health')).json();
 const handle=health.mode==='demo'?'botanical-soap':'damask-rose-cold-processed-soap';
 await page.goto(`/products/${handle}`);
 const carousel=page.getByRole('region',{name:/There’s more/});
 await carousel.scrollIntoViewIfNeeded();
 await page.mouse.move(5,5);
 return {carousel,handle};
}

test('real product carousel moves, pauses, wraps after its ranked stream, and opens a recommendation',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const {carousel,handle}=await openProduct(page);
 const items=carousel.locator('.similar-group').first().locator('.similar-item');
 const handles=await items.evaluateAll(elements=>elements.map(element=>element.getAttribute('data-product-handle')));
 expect(handles.length).toBeGreaterThan(1);expect(handles.length).toBeLessThanOrEqual(8);
 expect(new Set(handles).size).toBe(handles.length);expect(handles).not.toContain(handle);
 await expect(carousel.locator('.similar-copy .similar-item')).toHaveCount(handles.length);
 expect(await carousel.locator('.similar-copy a').evaluateAll(elements=>elements.every(element=>element.getAttribute('tabindex')==='-1'))).toBe(true);
 const viewport=carousel.locator('.similar-viewport');
 const initial=await viewport.evaluate(element=>element.scrollLeft);
 await expect.poll(()=>viewport.evaluate(element=>element.scrollLeft)).toBeGreaterThan(initial+4);
 await carousel.getByRole('button',{name:'Pause similar products'}).click();
 const stopped=await viewport.evaluate(element=>element.scrollLeft);
 await page.waitForTimeout(350);
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBeCloseTo(stopped,0);
 await viewport.evaluate(element=>{const width=element.querySelector('.similar-group')!.getBoundingClientRect().width;element.scrollLeft=width-2;});
 await carousel.getByRole('button',{name:'Next similar product',exact:true}).click();
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBeLessThan(await items.first().evaluate(element=>element.getBoundingClientRect().width+35));
 await carousel.getByRole('button',{name:'Play similar products'}).click();
 await viewport.hover();const hovered=await viewport.evaluate(element=>element.scrollLeft);await page.waitForTimeout(350);
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBeCloseTo(hovered,0);
 await carousel.getByRole('button',{name:'Pause similar products'}).click();
 await items.last().locator('a').first().focus();
 const focused=await viewport.evaluate(element=>element.scrollLeft);await page.waitForTimeout(350);
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBeCloseTo(focused,0);
 await expect(items.last().locator('a').first()).toBeInViewport();
 await items.first().locator('a').first().focus();
 await carousel.screenshot({path:'qa/similar-products-desktop.png'});
 await items.first().locator('a').first().click();
 await expect(page).toHaveURL(new RegExp(`/products/${handles[0]}$`),{timeout:15000});
 await expect(page.locator('.similar-group').first().locator(`[data-product-handle="${handles[0]}"]`)).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('mobile reduced-motion carousel remains still, supports navigation, and fits the screen',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({reducedMotion:'reduce'});
 const {carousel}=await openProduct(page),viewport=carousel.locator('.similar-viewport');
 await expect(carousel.getByRole('button',{name:'Pause similar products'})).toHaveCount(0);
 const initial=await viewport.evaluate(element=>element.scrollLeft);await page.waitForTimeout(350);
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBe(initial);
 await carousel.getByRole('button',{name:'Next similar product',exact:true}).click();
 expect(await viewport.evaluate(element=>element.scrollLeft)).toBeGreaterThan(initial);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
 await carousel.screenshot({path:'qa/similar-products-mobile.png'});
});
