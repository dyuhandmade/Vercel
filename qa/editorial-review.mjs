import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(`${page.url()} :: ${message.text().slice(0,6000)}`);});
  for(const route of ['/our-story','/journal','/ingredients']){
   const response=await page.goto('http://127.0.0.1:3000'+route,{waitUntil:'networkidle'});
   await page.evaluate(()=>document.fonts.ready);
   const heading=await page.locator('main h1').textContent();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   const height=await page.evaluate(()=>document.documentElement.scrollHeight);
   for(let y=0;y<height;y+=750){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(70);}
   await page.evaluate(()=>Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))));
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   const slug=route.slice(1),size=viewport.width===390?'phone':'desktop';
   await page.screenshot({path:`qa/redesign-${slug}-${size}.jpg`,type:'jpeg',quality:80,fullPage:true});
   const missingImages=await page.locator('main img').evaluateAll(images=>images.filter(image=>!image.naturalWidth).map(image=>image.getAttribute('src')));
   results.push({route,width:viewport.width,status:response.status(),heading,overflow,missingImages});
  }
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
  const philosophy=page.getByTestId('home-philosophy');
  await philosophy.scrollIntoViewIfNeeded();
  await philosophy.screenshot({path:`qa/redesign-philosophy-${viewport.width===390?'phone':'desktop'}.jpg`,type:'jpeg',quality:85});
  results.push({route:'/#philosophy',width:viewport.width,errors});
  await page.close();
 }
 await fs.writeFile('qa/editorial-review.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
} finally{await browser.close();}
