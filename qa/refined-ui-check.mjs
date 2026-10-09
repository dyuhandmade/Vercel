import {chromium} from '@playwright/test';

const browser=await chromium.launch({channel:'chrome',headless:true});
const checks=[
 {name:'home-mobile',url:'/',viewport:{width:390,height:844}},
 {name:'home-tablet',url:'/',viewport:{width:1024,height:900}},
 {name:'shop-desktop',url:'/shop',viewport:{width:1440,height:1000}},
 {name:'shop-mobile',url:'/shop',viewport:{width:390,height:844}},
 {name:'story-tablet',url:'/our-story',viewport:{width:1024,height:900}},
 {name:'journal-mobile',url:'/journal',viewport:{width:390,height:844}},
 {name:'making-tablet',url:'/how-its-made',viewport:{width:1024,height:900}},
 {name:'product-mobile',url:'/products/camphora-pink-salt',viewport:{width:390,height:844}},
 {name:'product-tablet',url:'/products/camphora-pink-salt#purchase',viewport:{width:1024,height:900}},
 {name:'product-desktop',url:'/products/camphora-pink-salt#purchase',viewport:{width:1440,height:1000}},
];
const report=[];
try{
 for(const check of checks){
  const context=await browser.newContext({viewport:check.viewport});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:3000${check.url}`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.site-header');
  await page.waitForTimeout(3000);
  if(check.url.includes('#purchase'))await page.locator('.story-purchase').scrollIntoViewIfNeeded();
  const metrics=await page.evaluate(()=>{
   const header=document.querySelector('.site-header')?.getBoundingClientRect();
   const documentWidth=document.documentElement.scrollWidth;
   const imageIssues=[...document.images].flatMap(image=>{
    const rect=image.getBoundingClientRect();
    if(!rect.width||!rect.height)return [];
    const problems=[];
    if(rect.left < -1 || rect.right > documentWidth+1)problems.push('horizontal-overflow');
    if(rect.width > documentWidth+1)problems.push('wider-than-document');
    return problems.length?[{src:image.currentSrc||image.src,rect:{left:rect.left,right:rect.right,width:rect.width,height:rect.height},problems}]:[];
   });
   const caption=document.querySelector('.purchase-visual>.margin-note')?.getBoundingClientRect();
   const purchaseVisual=document.querySelector('.purchase-visual')?.getBoundingClientRect();
   const captionContained=!caption||!purchaseVisual||(caption.left>=purchaseVisual.left-1&&caption.right<=purchaseVisual.right+1&&caption.top>=purchaseVisual.top-1&&caption.bottom<=purchaseVisual.bottom+1);
   return {scrollWidth:documentWidth,clientWidth:document.documentElement.clientWidth,imageCount:document.images.length,imageIssues,captionContained,header:header&&{left:header.left,right:header.right,width:header.width,height:header.height,borderRadius:getComputedStyle(document.querySelector('.site-header')).borderRadius}};
  });
  await page.screenshot({path:`qa/ui-refined-${check.name}.png`,fullPage:false});
  report.push({...check,metrics,errors});
  await context.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify(report,null,2));
