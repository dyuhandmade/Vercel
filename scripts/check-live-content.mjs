import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const base='http://127.0.0.1:3200';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const routes=['/','/shop','/products/facial-ubtan-orange-almond-1','/our-story','/ingredients','/ingredients/almond','/how-its-made','/faq','/journal','/journal/making-space-for-a-ritual','/contact','/policies/privacy','/policies/shipping'];
const results=[];mkdirSync('qa/content',{recursive:true});
try{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('h1').first().waitFor({state:'visible'});
   const heading=await page.locator('h1').first().innerText();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
   const result={width,route,status:response.status(),heading,overflow};results.push(result);
   if(route==='/'){
    const image=page.locator('.atelier-backdrop img');await image.waitFor();
    await page.waitForFunction(()=>{const i=document.querySelector('.atelier-backdrop img');return i instanceof HTMLImageElement&&i.complete&&i.naturalWidth>0;});
    result.heroImage=await image.getAttribute('src');
    if(!result.heroImage.includes('dyu-website-hero'))throw Error('Hero did not use Shopify artwork.');
    await page.screenshot({path:`qa/content/live-home-${width}.png`,fullPage:false});
   }
   if(response.status()!==200||overflow)throw Error(JSON.stringify(result));
  }
 }
 if(errors.length)throw Error(errors.join('\n'));
}finally{await browser.close();writeFileSync('qa/content/live-browser-verification.json',JSON.stringify({results,errors},null,2));}
console.log(JSON.stringify({routes:routes.length,viewports:2,checks:results.length,errors,overflow:results.filter(r=>r.overflow).length}));
