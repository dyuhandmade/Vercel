import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report=[];
for(const width of [1440,2048,2560]){
 const page=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const via of ['direct','story']){
  if(via==='direct')await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
  else{await page.goto('http://127.0.0.1:3000/our-story',{waitUntil:'networkidle'});await page.getByRole('link',{name:'DYUhandmade home',exact:true}).first().click();await page.waitForURL('http://127.0.0.1:3000/');await page.waitForLoadState('networkidle');}
  const section=page.locator('.philosophy-experience');await section.scrollIntoViewIfNeeded();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
  const details=await section.evaluate(s=>{
   const fields=['display','position','width','height','minHeight','maxWidth','gridTemplateColumns','gridTemplateRows','gridColumn','gridRow','alignItems','alignSelf','justifyContent','flexDirection','margin','padding','fontSize','lineHeight','whiteSpace','overflowWrap','color'];
   const describe=e=>({tag:e.tagName,class:e.className,text:e.textContent?.trim().slice(0,90),rect:e.getBoundingClientRect().toJSON(),styles:Object.fromEntries(fields.map(k=>[k,getComputedStyle(e)[k]])),rules:[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules]}catch{return []}}).flatMap(function flat(rule){if(rule.cssRules)return [...rule.cssRules].flatMap(flat);try{return rule.selectorText&&e.matches(rule.selectorText)?[{selector:rule.selectorText,css:rule.style.cssText}]:[]}catch{return []}})});
   return {section:describe(s),parts:['.philosophy-topline','.philosophy-spread','.philosophy-index','.philosophy-words','.philosophy-words>button','.philosophy-words>button>span:not(.philosophy-selection)','.philosophy-panel','.philosophy-scene','.philosophy-controls'].map(sel=>({selector:sel,...describe(s.querySelector(sel))})),overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  await section.screenshot({path:`qa/philosophy-audit-${width}-${via}.jpg`,type:'jpeg',quality:80});
  report.push({width,via,...details,errors:[...errors]});
  console.log(JSON.stringify({width,via,section:details.section.rect,parts:details.parts.map(({selector,rect,styles})=>({selector,rect,styles})),overflow:details.overflow,errors}));
 }
 await page.close();
}
await fs.writeFile('qa/homepage-layout-audit.json',JSON.stringify(report,null,2));
await browser.close();
