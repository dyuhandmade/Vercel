import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('qa/catalog-model-audit');
await fs.mkdir(root,{recursive:true});
const base='http://127.0.0.1:3000';
const sitemap=await (await fetch(`${base}/sitemap.xml`)).text();
let handles=[...new Set([...sitemap.matchAll(/<loc>[^<]*\/products\/([^<]+)<\/loc>/g)].map(m=>m[1]))];
if(process.argv[2])handles=handles.filter(h=>process.argv[2].split(',').some(filter=>h.includes(filter)));
if(!handles.length)throw new Error('No catalog product URLs found');
const previous=process.argv[2]?JSON.parse(await fs.readFile(path.join(root,'report.json'),'utf8').catch(()=>'[]')):[];
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
try{
 for(const handle of handles){
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
  const item={handle,errors,requests};
  try{
   await page.goto(`${base}/products/${handle}`,{waitUntil:'domcontentloaded',timeout:45000});
   const model=page.locator('.product-model-panel'), visual=model.locator('.product-visual');
   await visual.waitFor({state:'visible',timeout:20000});
   const pause=page.getByRole('button',{name:'Pause product images',exact:true});
   if(await pause.count())await pause.click();
   await model.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('.product-model-panel .product-visual')?.getAttribute('data-model-ready')==='true'||document.querySelector('.product-model-panel .model-note'),null,{timeout:25000});
   Object.assign(item,await visual.evaluate(el=>({ready:el.getAttribute('data-model-ready'),kind:el.getAttribute('data-model-kind'),construction:el.getAttribute('data-model-construction'),parts:el.getAttribute('data-model-parts'),partKinds:el.getAttribute('data-model-part-kinds'),view:el.getAttribute('data-view')})));
   item.title=await page.locator('h1').first().innerText();
   item.images=await page.locator('.product-photo-panel img').evaluateAll(els=>els.map(el=>({alt:el.alt,src:el.currentSrc||el.src})));
   const front=path.join(root,`${handle}-front.png`),back=path.join(root,`${handle}-back.png`),side=path.join(root,`${handle}-side.png`);
   await model.screenshot({path:front});item.front=front;
   if(item.ready==='true'){
    const rotate=model.getByRole('button',{name:'Rotate product right',exact:true});
    for(let i=0;i<4;i++)await rotate.click();
    await page.waitForTimeout(120);
    await model.screenshot({path:side});item.side=side;
    for(let i=0;i<4;i++)await rotate.click();
    await page.waitForTimeout(120);
    await model.screenshot({path:back});item.back=back;
   }
  }catch(error){item.failure=String(error);}
  report.push(item);
  await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({handle:item.handle,ready:item.ready,kind:item.kind,construction:item.construction,parts:item.parts,errors:item.errors,failure:item.failure}));
  await context.close();
 }
}finally{await browser.close();}
const auditedCount=report.length;
if(previous.length){
 const updated=new Map(report.map(item=>[item.handle,item]));
 const merged=previous.map(item=>updated.get(item.handle)||item);
 for(const item of report)if(!previous.some(old=>old.handle===item.handle))merged.push(item);
 report.splice(0,report.length,...merged);
 await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
}
for(const mode of ['front','side','back']){
 const cols=5,w=300,h=350,rows=Math.ceil(report.length/cols),composite=[];
 for(let i=0;i<report.length;i++){
  const item=report[i],left=i%cols*w,top=Math.floor(i/cols)*h;
  if(item[mode])composite.push({input:await sharp(item[mode]).resize(w,h-40,{fit:'contain',background:'#f5f2e8'}).png().toBuffer(),left,top});
  const title=`${i+1}. ${item.handle}`.replaceAll('&','&amp;');
  composite.push({input:Buffer.from(`<svg width="300" height="40"><rect width="300" height="40" fill="white"/><text x="5" y="16" font-size="10" font-family="Arial">${title}</text><text x="5" y="32" font-size="10" font-family="Arial">${item.kind} / ${item.construction} / ${item.parts} parts</text></svg>`),left,top:top+h-40});
 }
 await sharp({create:{width:cols*w,height:rows*h,channels:4,background:'white'}}).composite(composite).png().toFile(path.join(root,`contact-${mode}.png`));
}
console.log(`Audited ${auditedCount} products; saved ${report.length} catalog results to ${root}`);
