import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const copy of [false,true]){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});let calls=0;
 await page.route('**/api/cart',route=>{if(route.request().method()==='POST')calls++;return route.fulfill({json:{cart:null}})});
 await page.goto('http://127.0.0.1:3000/products/damask-rose-cold-processed-soap#similar-products');
 const viewport=page.locator('.similar-viewport');
 const selector=`${copy?'.similar-copy':'.similar-group:not(.similar-copy)'} .product-card[data-product-handle="oriental-lavendar"]`;
 const card=page.locator(selector),button=card.locator('button').first();
 await viewport.scrollIntoViewIfNeeded();
 const geometry=await viewport.evaluate((el,{selector,copy})=>{
  const target=el.querySelector(selector),item=target.closest('li');
  const first=el.querySelector('.similar-group');
  const groupWidth=first.getBoundingClientRect().width;
  const offset=target.getBoundingClientRect().left-el.getBoundingClientRect().left+el.scrollLeft;
  el.scrollLeft=copy?groupWidth-10:Math.max(0,offset-el.clientWidth*.3);
  return {groupWidth,itemOffset:item.offsetLeft,offset,width:el.clientWidth};
 },{selector,copy});
 await page.waitForTimeout(100);
 const before=await viewport.evaluate(el=>el.scrollLeft),box=await button.boundingBox();
 if(box)await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await page.waitForTimeout(400);
 console.log({copy,geometry,before,buttonBox:box,after:await viewport.evaluate(el=>el.scrollLeft),calls});
 await page.close();
}
await browser.close();
