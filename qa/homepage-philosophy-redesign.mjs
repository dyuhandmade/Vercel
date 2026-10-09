import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
for(const width of [320,390,768,1440,2560]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
 const section=page.getByTestId('home-philosophy');await section.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
 await section.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode().catch(()=>{}))));
 const before=await section.boundingBox();
 await section.screenshot({path:`qa/philosophy-redesigned-${width}.jpg`,type:'jpeg',quality:85});
 await page.addStyleTag({content:await fs.readFile('.next/dev/static/chunks/src_components_philosophy-experience_1f8vkh_.css','utf8')});
 const after=await section.boundingBox();
 const diagnostics=await section.evaluate(element=>({width:element.clientWidth,height:element.clientHeight,overflow:document.documentElement.scrollWidth-innerWidth,images:[...element.querySelectorAll('img')].map(img=>({loaded:img.complete&&img.naturalWidth>0,src:img.currentSrc})),tabs:[...element.querySelectorAll('[role="tab"]')].map(tab=>({text:tab.textContent,width:tab.clientWidth,height:tab.clientHeight}))}));
 report.push({width,before,after,diagnostics,errors});await page.close();
}
await fs.writeFile('qa/homepage-philosophy-redesigned.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));await browser.close();
