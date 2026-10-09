import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const records=[];
try{
 for(const width of [320,390,768,1440,2560]){
  const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
  const issues=[];
  page.on('pageerror',error=>issues.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))issues.push(message.text());});
  await page.goto('http://127.0.0.1:3000/');
  const root=page.getByTestId('ritual-moments');
  await root.waitFor({state:'visible'});
  await page.evaluate(()=>document.fonts.ready);
  await root.scrollIntoViewIfNeeded();
  await root.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
  // Keep the persistent header from obscuring the top of this isolated section capture.
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}.site-header{visibility:hidden!important}'});
  await root.evaluate(element=>window.scrollTo({top:element.getBoundingClientRect().top+window.scrollY,behavior:'instant'}));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const metrics=await root.evaluate(element=>{
   const r=element.getBoundingClientRect();
   const panel=element.querySelector('[role="tabpanel"]').getBoundingClientRect();
   return {root:{width:r.width,height:r.height,left:r.left},panel:{width:panel.width,height:panel.height},overflow:document.documentElement.scrollWidth-window.innerWidth};
  });
  await root.screenshot({path:`qa/ritual-redesign-${width}-morning.png`});
  if(width===1440||width<=390){
   const moments=root.getByRole('group',{name:'Choose your moment'}).getByRole('button');
   for(const [index,name] of [[1,'evening'],[2,'pause']]){
    await moments.nth(index).click();
    await root.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
    if(width===1440)await root.screenshot({path:`qa/ritual-redesign-${width}-${name}.png`});
   }
   await root.getByRole('tablist',{name:'Explore your ritual steps'}).getByRole('tab').last().click();
   await root.screenshot({path:`qa/ritual-redesign-${width}-complete.png`});
  }
  records.push({width,metrics,issues});
  await page.close();
 }
 await fs.writeFile('qa/ritual-redesign-review.json',JSON.stringify(records,null,2));
 console.log(JSON.stringify(records,null,2));
}finally{await browser.close();}
