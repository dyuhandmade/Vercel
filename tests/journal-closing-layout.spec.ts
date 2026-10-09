import {test,expect,type Page} from '@playwright/test';

// Next streams sections into hidden transport containers before moving them into main.
// Target the visible page content, never a transient detached streaming node.
const closing=(page:Page)=>page.locator('main#main section[aria-labelledby="journal-closing-title"]:visible');

async function readyClosing(page:Page){
 await expect(closing(page)).toHaveCount(1);
 await expect(closing(page)).toBeVisible();
 await closing(page).scrollIntoViewIfNeeded();
 await page.evaluate(()=>document.fonts.ready);
}

async function layout(page:Page){
 return closing(page).evaluate(section=>{
  const heading=section.querySelector('h2')!;
  const headingBlock=heading.parentElement!;
  const copy=section.children[1];
  const rect=(element:Element)=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};};
  const textLines=(element:Element)=>{
   const range=document.createRange();range.selectNodeContents(element);
   return new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.y))).size;
  };
  return {section:rect(section),heading:rect(headingBlock),copy:rect(copy),titleLines:[...heading.children].map(textLines),kickerLines:textLines(headingBlock.querySelector('p')!),overflow:document.documentElement.scrollWidth-innerWidth};
 });
}

for(const width of [320,390,768,1440,2048,2560])test(`Journal invitation has full readable columns at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/journal');await readyClosing(page);
 const before=await layout(page);
 expect(before.titleLines).toEqual([1,1]);
 expect(before.kickerLines).toBe(1);
 expect(before.overflow).toBeLessThanOrEqual(1);
 if(width>900){
  expect(before.heading.width).toBeGreaterThan(before.section.width*.45);
  expect(before.copy.x).toBeGreaterThan(before.heading.right);
  expect(before.copy.width).toBeGreaterThan(250);
 }else{
  expect(before.heading.width).toBeGreaterThan(before.section.width*.9);
  expect(before.copy.y).toBeGreaterThan(before.heading.y+before.heading.height);
 }
 // Simulate retained rules from the retired module class, including a vacant
 // third decorative column. The replacement uses independent named areas.
 await page.addStyleTag({content:`
  .journal-module__UhKvEq__closing{display:grid;grid-template-columns:100px 330px 1fr;gap:60px}
  .journal-module__UhKvEq__closing>div:first-child{max-width:100px}
  .journal-module__UhKvEq__closing>div:last-child{max-width:330px;justify-self:start}
 `});
 expect(await layout(page)).toEqual(before);
 await expect(closing(page).getByRole('link',{name:'Explore the collection'})).toHaveAttribute('href','/shop');
 expect(errors).toEqual([]);
});

test('Journal invitation preserves its layout through client navigation',async({page})=>{
 await page.setViewportSize({width:2048,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/journal');await readyClosing(page);
 const before=await layout(page);
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Our story',exact:true}).click();
 await expect(page).toHaveURL(/\/our-story$/);
 await expect(closing(page)).toHaveCount(0);
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'The journal',exact:true}).click();
 await expect(page).toHaveURL(/\/journal$/);await readyClosing(page);
 const after=await layout(page);
 expect(after.titleLines).toEqual(before.titleLines);
 expect(after.heading.width).toBe(before.heading.width);
 expect(after.copy.width).toBe(before.copy.width);
 expect(after.section.height).toBe(before.section.height);
 await closing(page).getByRole('link',{name:'Explore the collection'}).click();
 await expect(page).toHaveURL(/\/shop$/);
});
