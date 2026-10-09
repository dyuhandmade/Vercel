import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const browser=await chromium.launch({channel:'chrome',headless:true});
const report=[];
for(const viewport of [{width:390,height:844},{width:320,height:740},{width:768,height:390},{width:768,height:1024}]){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:3000/shop',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 const menu=page.getByRole('dialog',{name:'Explore DYU',exact:true});
 await menu.waitFor({state:'visible'});
 await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`qa/mobile-menu-${viewport.width}x${viewport.height}.png`});
 const geometry=await menu.evaluate(element=>({rect:element.getBoundingClientRect().toJSON(),overflow:element.scrollWidth-element.clientWidth,links:[...element.querySelectorAll('a')].map(link=>({label:link.textContent,href:link.getAttribute('href')})),focusInside:element.contains(document.activeElement)}));
 report.push({viewport,geometry,errors});await page.close();
}
await fs.writeFile('qa/mobile-menu-report.json',JSON.stringify(report,null,2));
await browser.close();
console.log(JSON.stringify(report,null,2));
