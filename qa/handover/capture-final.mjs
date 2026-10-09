import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:3001/journal',{waitUntil:'networkidle'});
 await page.locator('#main h1').waitFor({state:'visible'});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:'qa/handover/final-journal.png'});
}finally{await browser.close();}
