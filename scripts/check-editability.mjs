import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from '@playwright/test';

const base=process.env.DYU_BASE_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
// A hard refresh bypasses Next's development HMR fetch cache during live verification.
await page.setExtraHTTPHeaders({'Cache-Control':'no-cache'});
const errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
mkdirSync('qa/editability',{recursive:true});
try{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});
  for(const route of ['/','/shop','/collections/frontpage','/our-story','/ingredients','/ingredients/almond','/how-its-made','/journal','/journal/making-space-for-a-ritual','/products/facial-ubtan-orange-almond-1','/contact','/faq']){
   const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:60000});
   assert.equal(response.status(),200,route);
   const heading=page.locator('h1').first();await heading.waitFor({state:'visible'});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,`${route} overflows at ${width}`);
   if(route==='/'){
    const images=await page.locator('.atelier-backdrop img').evaluateAll(images=>images.map(image=>({src:image.getAttribute('src'),loaded:image.complete&&image.naturalWidth>0})));
    assert.equal(images.length,4,'Four hero slides');
    assert(images.every(image=>decodeURIComponent(image.src).includes('cdn.shopify.com')),`All hero artwork comes from Shopify: ${JSON.stringify(images)}`);
    assert(images[0].loaded,'First hero image loaded');
    await page.screenshot({path:`qa/editability/home-${width}.png`});
   }
   if(route==='/shop')await page.screenshot({path:`qa/editability/shop-${width}.png`});
   results.push({width,route,status:response.status(),heading:await heading.innerText(),overflow});
   console.log(`${width} ${route}: OK`);
  }
 }
 assert.equal(errors.length,0,errors.join('\n'));
}finally{
 await browser.close();writeFileSync('qa/editability/browser-verification.json',JSON.stringify({results,errors},null,2)+'\n');
}
console.log(JSON.stringify({checked:results.length,browserErrors:errors.length}));
