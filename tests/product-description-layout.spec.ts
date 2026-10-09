import {test,expect} from '@playwright/test';

for(const width of [320,1440]){
 test(`${width}px live product description preserves separate list paragraphs`,async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/cart',route=>route.fulfill({json:{cart:null}}));
  await page.goto('/products/oriental-lavendar');
  const details=page.locator('#main .experience-description');
  await expect(details).toBeVisible();
  await details.locator('summary').click();
  await expect.poll(()=>details.locator('p').count()).toBeGreaterThan(1);
  const copy=await details.locator('p').allTextContents();
  expect(copy.every(value=>value.trim().startsWith('• ')),'Native list items retain distinct bullet paragraphs').toBe(true);
  const geometry=await details.evaluate(element=>{
   const blocks=[...element.querySelectorAll('p')];
   const rect=element.getBoundingClientRect();
   return {right:rect.right,width:innerWidth,styles:blocks.map(block=>getComputedStyle(block).whiteSpace),
    ordered:blocks.every((block,index)=>index===0||block.getBoundingClientRect().top>=blocks[index-1].getBoundingClientRect().bottom),
    overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  expect(geometry.styles.every(style=>style==='pre-line')).toBe(true);
  expect(geometry.ordered).toBe(true);
  expect(geometry.right).toBeLessThanOrEqual(geometry.width+1);
  expect(geometry.overflow).toBe(false);
  await details.screenshot({path:`qa/handover/product-description-${width}.png`});
  expect(errors).toEqual([]);
 });
}
