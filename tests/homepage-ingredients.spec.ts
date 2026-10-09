import {test,expect,type Page} from '@playwright/test';

const runtimeIssues=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const errors:string[]=[];
 runtimeIssues.set(page,errors);
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))errors.push(message.text());});
});
test.afterEach(async({page})=>expect(runtimeIssues.get(page)||[]).toEqual([]));

async function visit(page:Page){
 const response=await page.goto('/');
 expect(response?.ok()).toBe(true);
 // Wait for the mounted page rather than scrolling a temporary streamed node.
 const root=page.locator('#main').getByTestId('home-ingredients');
 await expect(root).toHaveCount(1);
 await expect(root).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await root.scrollIntoViewIfNeeded();
 await expect(root.getByRole('tab').first()).toBeVisible();
 return root;
}

test('each homepage ingredient opens its own content, source image and working collection links',async({page})=>{
 const root=await visit(page);
 const tabs=root.getByRole('tab');
 const count=await tabs.count();
 expect(count).toBeGreaterThan(1);
 for(let index=0;index<count;index++){
  const tab=tabs.nth(index);
  const name=(await tab.innerText()).replace(/^\d+\s*/,'').trim();
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(root.locator('[role=tab][aria-selected=true]')).toHaveCount(1);
  const panel=root.getByRole('tabpanel');
  await expect(panel).toHaveAttribute('id',(await tab.getAttribute('aria-controls'))!);
  await expect(panel).toHaveAttribute('aria-labelledby',(await tab.getAttribute('id'))!);
  await expect(panel.getByRole('heading',{level:3})).toHaveText(name);
  const ingredientLink=panel.getByRole('link',{name:`Explore ${name}`,exact:true});
  await expect(ingredientLink).toHaveAttribute('href',/^\/ingredients\/[^/?#]+$/);
  const productLinks=panel.locator('a[href^="/products/"]');
  expect(await productLinks.count()).toBeGreaterThan(0);
  for(const link of await productLinks.all())await expect(link).toHaveAttribute('href',/^\/products\/[^/?#]+$/);
  await expect(panel.getByText('From the collection',{exact:true})).toBeVisible();
  if(index===0||index===count-1)await expect.poll(()=>panel.locator('img').first().evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 }
 await root.getByRole('link',{name:/^Explore /}).click();
 await expect(page.locator('#main h1')).toBeVisible();
 await expect(page).toHaveURL(/\/ingredients\//);
});

test('ingredient keyboard controls and next/previous wrap without losing selection',async({page})=>{
 const root=await visit(page);
 const tabs=root.getByRole('tab');
 await tabs.first().click();
 await tabs.first().press('ArrowRight');
 await expect(tabs.nth(1)).toBeFocused();
 await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
 await tabs.nth(1).press('End');
 await expect(tabs.last()).toBeFocused();
 await tabs.last().press('ArrowRight');
 await expect(tabs.first()).toBeFocused();
 await tabs.first().press('ArrowLeft');
 await expect(tabs.last()).toBeFocused();
 await tabs.last().press('Home');
 await expect(tabs.first()).toBeFocused();
 await root.getByRole('button',{name:'Previous ingredient'}).click();
 await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 await root.getByRole('button',{name:'Next ingredient'}).click();
 await expect(tabs.first()).toHaveAttribute('aria-selected','true');
 const name=(await tabs.first().innerText()).replace(/^\d+\s*/,'').trim();
 await expect(root.getByRole('heading',{level:3})).toHaveText(name);
});

for(const width of [320,390,768])test(`ingredient tabs remain reachable at ${width}px with reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 const root=await visit(page);
 const tabs=root.getByRole('tab');
 await tabs.first().click();
 await tabs.first().press('End');
 await expect(tabs.last()).toBeFocused();
 await expect(tabs.last()).toBeInViewport();
 await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 await expect.poll(()=>root.getByRole('tabpanel').locator('img').first().evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 await tabs.last().press('Home');
 await expect(tabs.first()).toBeInViewport();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});

test('wide-screen ingredient layout uses the available space without collapsing into a narrow column',async({page})=>{
 await page.setViewportSize({width:2560,height:1440});
 const root=await visit(page);
 const bounds=await root.boundingBox();
 expect(bounds!.width).toBeGreaterThan(1000);
 expect(bounds!.height).toBeLessThan(1400);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
});
