import {chromium} from '@playwright/test';
const browser = await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:1000},deviceScaleFactor:1});
page.on('pageerror',e=>console.error('PAGE ERROR:',e.message));
for(const shape of ['jar','bottle','soap']){
 await page.goto('http://localhost:3000/model-preview?shape='+shape,{waitUntil:'networkidle'});
 await page.locator('#model-capture canvas').waitFor();
 await page.waitForTimeout(2500);
 await page.addStyleTag({content:'body, #model-capture {background:transparent !important}'});
 await page.locator('#model-capture').screenshot({path:`public/images/${shape}-render.png`,omitBackground:true});
 console.log('Rendered '+shape);
}
await page.setViewportSize({width:1440,height:1000});
await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
await page.screenshot({path:'qa/home-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
await page.screenshot({path:'qa/home-mobile.png',fullPage:true});
await browser.close();
