import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];
for(const width of [2560,2048,1440,768,390]){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const via of ['direct','story']){
  await page.goto(`http://127.0.0.1:3000/${via==='direct'?'journal':'our-story'}`,{waitUntil:'networkidle'});
  if(via==='story'){
   const link=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'The journal'});
   if(await link.isVisible())await link.click();else{await page.getByRole('button',{name:'Open menu',exact:true}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'The journal'}).click();}
   await page.waitForURL('**/journal');await page.waitForLoadState('networkidle');
  }
  const section=page.locator('section[aria-labelledby="journal-closing-title"]');await section.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);
  const geometry=await section.evaluate(element=>{
   const describe=e=>{const c=getComputedStyle(e);return {class:e.className,rect:e.getBoundingClientRect().toJSON(),grid:c.gridTemplateColumns,maxWidth:c.maxWidth,width:c.width,whiteSpace:c.whiteSpace,wordBreak:c.wordBreak,overflowWrap:c.overflowWrap,text:e.textContent}};
   return {root:describe(element),children:[...element.children].map(describe),heading:describe(element.querySelector('h2')),overflow:document.documentElement.scrollWidth-innerWidth};
  });await section.screenshot({path:`qa/journal-closing-${width}-${via}.jpg`,type:'jpeg',quality:85});report.push({width,via,geometry,errors});
 }
 await page.close();
}
await fs.writeFile('qa/journal-closing-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();
