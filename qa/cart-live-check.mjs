import {chromium,expect} from '@playwright/test';

const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto('http://127.0.0.1:3000/shop?available=true');
 const card=page.locator('.product-card[data-product-handle="oriental-lavendar"]');
 const name=await card.locator('h3').innerText();
 const before=page.url();
 const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/cart')&&response.request().method()==='POST');
 await card.getByRole('button',{name:`Add ${name} to bag`,exact:true}).click();
 const response=await responsePromise;
 const data=await response.json();
 const bag=page.getByRole('dialog',{name:'Your bag',exact:true});
 if(!response.ok()||!data.cart?.totalQuantity){
  console.log(JSON.stringify({ok:false,status:response.status(),error:data.error||'Cart did not receive an item',inlineError:await card.getByRole('alert').allTextContents(),errors}));
  process.exitCode=1;
 }else{
  await bag.waitFor({state:'visible'});
  const image=bag.getByRole('img',{name:`${name} product image`,exact:true});
  await expect(image).toBeVisible();
  await expect.poll(()=>image.evaluate(element=>element instanceof HTMLImageElement&&element.complete&&element.naturalWidth>0)).toBe(true);
  await page.screenshot({path:'qa/cart-live-mobile.png',fullPage:false});
  console.log(JSON.stringify({ok:true,status:response.status(),samePage:before===page.url(),quantity:data.cart.totalQuantity,title:await bag.getByRole('link',{name,exact:true}).innerText(),imageLoaded:true,errors}));
 }
}finally{
 // The browser context has its own cart cookie. Leave its test bag empty.
 try{const result=await page.evaluate(async()=>{const response=await fetch('/api/cart');return response.json();});
  const ids=result.cart?.lines?.nodes?.map(line=>line.id)||[];
  if(ids.length){const cleanup=await page.evaluate(async lines=>{const response=await fetch('/api/cart',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',lines})});const data=await response.json();return {status:response.status,quantity:data.cart?.totalQuantity};},ids);console.log(JSON.stringify({cleanup}));if(cleanup.status!==200||cleanup.quantity!==0)process.exitCode=1;}
 }catch(error){console.log(JSON.stringify({cleanupError:error.message}));}
 await browser.close();
}
