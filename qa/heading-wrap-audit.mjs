import {chromium} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({reducedMotion:'reduce'});
const errors=[],results=[];
page.on('pageerror',error=>errors.push(error.message));
const routes=['/','/journal','/our-story','/ingredients','/shop','/collections/frontpage','/products/facial-ubtan-orange-almond-1','/contact','/faq','/how-its-made','/journal/making-space-for-a-ritual','/not-a-real-page'];
mkdirSync('qa/typography',{recursive:true});
try{
 for(const width of [2545,1440,768,390,320]){
  await page.setViewportSize({width,height:1000});
  for(const route of routes){
   await page.goto(`http://127.0.0.1:3000${route}`,{waitUntil:'domcontentloaded'});
   await page.locator('main h1').first().waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const audit=await page.evaluate(()=>{
    const headings=[...document.querySelectorAll('main h1,main h2,main h3')].map(heading=>{
     const box=heading.getBoundingClientRect();
     if(!box.width||!box.height)return null;
     const clone=heading.cloneNode(true);
     for(const br of clone.querySelectorAll('br'))br.replaceWith(document.createTextNode(' '));
     for(const inline of clone.querySelectorAll('em,span'))inline.style.display='inline';
     Object.assign(clone.style,{position:'absolute',width:'max-content',maxWidth:'none',whiteSpace:'nowrap',textWrap:'nowrap',visibility:'hidden'});
     heading.parentElement.appendChild(clone);
     const unbrokenWidth=clone.getBoundingClientRect().width;clone.remove();
     const range=document.createRange();range.selectNodeContents(heading);
     const lineTops=[...new Set([...range.getClientRects()].filter(rect=>rect.width>0).map(rect=>Math.round(rect.top/10)*10))];
     return {text:heading.textContent.trim(),tag:heading.tagName,forcedBreaks:heading.querySelectorAll('br').length,width:Math.round(box.width),unbrokenWidth:Math.round(unbrokenWidth),fits:unbrokenWidth<=box.width+1,lineTops};
    }).filter(Boolean);
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,headings};
   });
   results.push({width,route,...audit});
   if(route==='/journal')await page.screenshot({path:`qa/typography/journal-${width}.png`});
   console.log(JSON.stringify({width,route,overflow:audit.overflow,avoidable:audit.headings.filter(h=>h.forcedBreaks&&h.fits).map(h=>h.text),h1:audit.headings.find(h=>h.tag==='H1')}));
  }
 }
}finally{await browser.close();writeFileSync('qa/typography/audit.json',JSON.stringify({results,errors},null,2)+'\n');}
if(results.some(result=>result.overflow)||errors.length)process.exitCode=1;
