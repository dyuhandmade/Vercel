import {test,expect,type Page} from '@playwright/test';

const issues=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const list:string[]=[];issues.set(page,list);
 page.on('pageerror',error=>list.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))list.push(message.text());});
});
test.afterEach(async({page})=>expect(issues.get(page)||[],'Menu interaction should not cause runtime or hydration errors').toEqual([]));

async function openMenu(page:Page){
 const trigger=page.getByRole('button',{name:'Open menu',exact:true});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Explore DYU',exact:true});
 await expect(dialog).toBeVisible();
 await expect(trigger).toHaveAttribute('aria-expanded','true');
 const id=await trigger.getAttribute('aria-controls');
 expect(id).toBeTruthy();
 await expect(dialog).toHaveAttribute('id',id!);
 return dialog;
}

for(const width of [320,390,768]){
 test(`menu fits ${width}px, preserves every navigation destination and keeps collections reachable`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.goto('/shop');
  const desktopLinks=await page.getByRole('navigation',{name:'Main navigation',includeHidden:true}).locator('a').evaluateAll(links=>links.map(link=>({text:link.textContent?.trim(),href:link.getAttribute('href')})));
  const dialog=await openMenu(page);
  const menu=dialog.getByRole('navigation',{name:'Mobile navigation',exact:true});
  for(const link of desktopLinks)await expect(menu.getByRole('link',{name:link.text,exact:true})).toHaveAttribute('href',link.href!);
  await expect(dialog.getByRole('link',{name:'How it is made',exact:true})).toHaveAttribute('href','/how-its-made');
  await expect(dialog.getByRole('link',{name:'Get in touch',exact:true})).toHaveAttribute('href','/contact');
  const collections=dialog.getByRole('navigation',{name:'Shop by collection'}).getByRole('link');
  expect(await collections.count()).toBeGreaterThan(0);
  for(const link of await collections.all()){
   await expect(link).toHaveAttribute('href',/^(?:\/|https:\/\/)/);
   await link.scrollIntoViewIfNeeded();
   await expect(link).toBeInViewport();
  }
  const geometry=await page.getByTestId('mobile-menu-drawer').evaluate(element=>{
   const rect=element.getBoundingClientRect();
   return {x:rect.x,right:rect.right,y:rect.y,bottom:rect.bottom,width:rect.width,height:rect.height,overflow:element.scrollWidth-element.clientWidth};
  });
  expect(Math.abs(geometry.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.right-width)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.bottom-844)).toBeLessThanOrEqual(1);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.width-width)).toBeLessThanOrEqual(1);
 });
}

test('opening focuses the dialog, Escape restores focus and body scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/shop');
 const previousOverflow=await page.evaluate(()=>document.body.style.overflow);
 const trigger=page.getByRole('button',{name:'Open menu',exact:true});
 const dialog=await openMenu(page);
 await expect.poll(()=>dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect(trigger).toHaveAttribute('aria-expanded','false');
 await expect(trigger).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe(previousOverflow);
 await openMenu(page);
 await page.getByRole('button',{name:'Close Explore DYU',exact:true}).click();
 await expect(dialog).toBeHidden();
 await expect(trigger).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).toBe(previousOverflow);
});

test('keyboard focus stays within the open menu in both directions',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 const count=await dialog.locator('a[href],button:not([disabled])').count();
 for(const key of ['Tab','Shift+Tab']){
  for(let index=0;index<count+2;index++){
   await page.keyboard.press(key);
   await expect.poll(()=>dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);
  }
 }
});

test('current-page navigation is marked and clicking it closes the menu',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 const current=dialog.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'The collection',exact:true});
 await expect(current).toHaveAttribute('aria-current','page');
 await current.click();
 await expect(dialog).toBeHidden();
 await expect(page).toHaveURL(/\/shop$/);
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});

test('navigation changes the page and resets the drawer for the next visit',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 await dialog.getByRole('link',{name:'Our story',exact:true}).click();
 await expect(page).toHaveURL(/\/our-story$/);
 await expect(dialog).toBeHidden();
 await expect(page.getByRole('button',{name:'Open menu',exact:true})).toHaveAttribute('aria-expanded','false');
 await openMenu(page);
 await expect(dialog.getByRole('link',{name:'Our story',exact:true})).toHaveAttribute('aria-current','page');
 await expect(dialog.getByRole('link',{name:'The collection',exact:true})).not.toHaveAttribute('aria-current','page');
});

test('full-screen menu keeps the explicit close control visible after content scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 await dialog.getByRole('link',{name:'Get in touch',exact:true}).scrollIntoViewIfNeeded();
 const close=dialog.getByRole('button',{name:'Close Explore DYU',exact:true});
 await expect(close).toBeInViewport();
 await close.click();
 await expect(dialog).toBeHidden();
 await expect(page).toHaveURL(/\/shop$/);
 await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeFocused();
});

test('short landscape menu scrolls internally to all content and keeps close reachable',async({page})=>{
 await page.setViewportSize({width:768,height:390});await page.goto('/shop');
 const dialog=await openMenu(page);
 const last=dialog.getByRole('navigation',{name:'Shop by collection'}).getByRole('link').last();
 await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();
 const close=dialog.getByRole('button',{name:'Close Explore DYU',exact:true});
 await expect(close).toBeInViewport();
 const geometry=await page.getByTestId('mobile-menu-drawer').boundingBox();
 expect(Math.abs(geometry!.x)).toBeLessThanOrEqual(1);
 expect(Math.abs(geometry!.y)).toBeLessThanOrEqual(1);
 expect(Math.abs(geometry!.width-768)).toBeLessThanOrEqual(1);
 expect(Math.abs(geometry!.height-390)).toBeLessThanOrEqual(1);
 await close.click();await expect(dialog).toBeHidden();
});

test('reduced motion stays still while retaining menu navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 await expect.poll(()=>dialog.evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation.playState==='running').length)).toBe(0);
 await dialog.getByRole('link',{name:'The ingredients',exact:true}).click();
 await expect(page).toHaveURL(/\/ingredients$/);await expect(dialog).toBeHidden();
});

test('desktop navigation remains available and switching to desktop releases the menu',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/shop');
 const dialog=await openMenu(page);
 await page.setViewportSize({width:1440,height:1000});
 await expect(dialog).toBeHidden();
 await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeHidden();
 const navigation=page.getByRole('navigation',{name:'Main navigation',exact:true});
 await expect(navigation).toBeVisible();
 await expect(navigation.getByRole('link',{name:'The collection',exact:true})).toHaveAttribute('aria-current','page');
 await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 await page.getByRole('button',{name:'Explore collections',exact:true}).click();
 await expect(page.locator('#collection-menu')).toBeVisible();
});
