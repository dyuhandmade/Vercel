import {test,expect,type Page} from '@playwright/test';

// Exercise the current store content rather than assuming preview products or counts.
const runtimeIssues=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const issues:string[]=[];
 runtimeIssues.set(page,issues);
 page.on('pageerror',error=>issues.push(`Page error: ${error.message}`));
 page.on('console',message=>{
  if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))issues.push(`Hydration: ${message.text()}`);
 });
});
test.afterEach(async({page})=>{
 expect(runtimeIssues.get(page)||[],'Editorial navigation should not produce hydration or runtime errors').toEqual([]);
});

async function visit(page:Page,path:string){
 const response=await page.goto(path);
 expect(response?.ok(),`${path} should load successfully`).toBe(true);
 await expect(page.locator('main h1').first()).toBeVisible();
}

async function assertNoHorizontalOverflow(page:Page){
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),{message:`Horizontal overflow on ${page.url()}`}).toBeLessThanOrEqual(1);
}

test('homepage philosophy supports keyboard navigation, wrapping and previous/next controls',async({page})=>{
 await visit(page,'/');
 const list=page.getByRole('tablist',{name:'Explore our philosophy'});
 const tabs=list.getByRole('tab');
 const count=await tabs.count();
 expect(count).toBeGreaterThan(1);
 await tabs.first().click();
 await expect(tabs.first()).toHaveAttribute('aria-selected','true');
 await tabs.first().press('ArrowDown');
 await expect(tabs.nth(1)).toBeFocused();
 await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
 await tabs.nth(1).press('End');
 await expect(tabs.last()).toBeFocused();
 await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 await tabs.last().press('Home');
 await expect(tabs.first()).toBeFocused();
 await tabs.first().press('ArrowUp');
 await expect(tabs.last()).toBeFocused();
 await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 await page.getByRole('button',{name:'Next philosophy chapter'}).click();
 await expect(tabs.first()).toHaveAttribute('aria-selected','true');
 await page.getByRole('button',{name:'Previous philosophy chapter'}).click();
 await expect(tabs.last()).toHaveAttribute('aria-selected','true');
 const panelId=await tabs.last().getAttribute('aria-controls');
 const panel=page.locator(`[id="${panelId}"]`);
 await expect(panel).toHaveAttribute('aria-labelledby',(await tabs.last().getAttribute('id'))!);
 await expect(panel.getByRole('link')).toHaveAttribute('href',/^(?:\/|https:\/\/)/);
 await expect(panel.getByRole('link')).toBeVisible();
});

test('story chapters target real sections and accordion works with mouse and keyboard',async({page})=>{
 await visit(page,'/our-story');
 const chapterLinks=page.getByRole('navigation',{name:'Our story chapters'}).getByRole('link');
 for(const link of await chapterLinks.all()){
  const href=(await link.getAttribute('href'))!;
  await expect(page.locator(href)).toHaveCount(1);
 }
 const controls=page.locator('#story-principles button[aria-expanded]');
 const count=await controls.count();
 test.skip(count===0,'The optional principles section is disabled in Shopify');
 const control=controls.last();
 const panel=page.locator(`[id="${await control.getAttribute('aria-controls')}"]`);
 if(await control.getAttribute('aria-expanded')!=='true')await control.click();
 await expect(control).toHaveAttribute('aria-expanded','true');
 await expect(panel).toBeVisible();
 expect(await panel.locator('p').first().innerText()).not.toBe('');
 await expect(panel.getByRole('link')).toHaveAttribute('href',/^(?:\/|https:\/\/)/);
 for(let index=0;index<count-1;index++)await expect(controls.nth(index)).toHaveAttribute('aria-expanded','false');
 await control.click();
 await expect(panel).toBeHidden();
 await control.press('Enter');
 await expect(panel).toBeVisible();
});

test('ingredient search, family filters, no-results recovery and product connections work',async({page})=>{
 await visit(page,'/ingredients');
 const index=page.locator('#ingredient-index');
 const cards=index.locator('article');
 const baseline=await cards.count();
 expect(baseline,'The live catalogue should provide ingredient entries').toBeGreaterThan(0);
 const name=(await cards.first().getByRole('heading',{level:3}).innerText()).trim();
 const search=page.getByRole('searchbox',{name:'Search ingredients or products'});
 await search.fill(name);
 await expect(cards.first().getByRole('heading',{level:3})).toHaveText(name);
 expect(await cards.count()).toBeLessThanOrEqual(baseline);
 await page.getByRole('button',{name:'Clear ingredient search'}).click();
 await expect(cards).toHaveCount(baseline);
 const families=page.getByRole('group',{name:'Ingredient families'}).getByRole('button');
 if(await families.count()>1){await families.nth(1).click();await expect(families.nth(1)).toHaveAttribute('aria-pressed','true');}
 await page.getByRole('combobox',{name:'Arrange by'}).selectOption('products');
 await search.fill('editorial-qa-no-such-botanical-7f4b2');
 await expect(index.getByRole('status')).toHaveText(/^0 entries/);
 await expect(cards).toHaveCount(0);
 await page.getByRole('button',{name:'Show all ingredients'}).click();
 await expect(search).toHaveValue('');
 await expect(families.first()).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('combobox',{name:'Arrange by'})).toHaveValue('name');
 await expect(cards).toHaveCount(baseline);
 const ingredientName=(await cards.first().getByRole('heading',{level:3}).innerText()).trim();
 await cards.first().getByRole('link').click();
 await expect(page.locator('main h1')).toContainText(ingredientName);
 const products=page.locator('#ingredient-products article');
 expect(await products.count()).toBeGreaterThan(0);
 for(const link of await products.getByRole('link').all())await expect(link).toHaveAttribute('href',/^\/products\/[^/?#]+$/);
 const productName=(await products.first().getByRole('heading',{level:3}).innerText()).trim();
 await products.first().getByRole('link').click();
 await expect(page.locator('main h1')).toHaveText(productName);
});

test('journal topic and search persist in the URL across reload and reset together',async({page})=>{
 await visit(page,'/journal');
 const archive=page.locator('#main #journal-stories');
 const cards=archive.locator('article');
 await expect(cards.first()).toBeVisible();
 const baseline=await cards.count();
 expect(baseline).toBeGreaterThan(0);
 const filters=page.getByRole('group',{name:'Filter stories by topic'});
 const categoryButton=filters.getByRole('button').nth(1);
 const category=(await categoryButton.innerText()).trim();
 await categoryButton.click();
 await expect(categoryButton).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>new URL(page.url()).searchParams.get('category')).toBe(category);
 const title=(await cards.first().getByRole('heading',{level:3}).innerText()).trim();
 const search=page.getByRole('searchbox',{name:'Search journal stories'});
 await search.fill(title);
 await expect.poll(()=>new URL(page.url()).searchParams.get('q')).toBe(title);
 await expect(cards.first().getByRole('heading',{level:3})).toHaveText(title);
 await page.reload();
 await expect(search).toHaveValue(title);
 await expect(filters.getByRole('button',{name:category,exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(cards.first().getByRole('heading',{level:3})).toHaveText(title);
 await search.fill('editorial-qa-no-such-story-9c31a');
 await expect(cards).toHaveCount(0);
 await expect(archive.getByRole('status')).toHaveText(/^0 stories/);
 await archive.getByRole('button',{name:'Show all stories'}).click();
 await expect(search).toHaveValue('');
 await expect(cards).toHaveCount(baseline);
 await expect.poll(()=>new URL(page.url()).searchParams.has('q')||new URL(page.url()).searchParams.has('category')).toBe(false);
});

test('journal articles have working chapter anchors and related reading',async({page})=>{
 await visit(page,'/journal');
 const cards=page.locator('#journal-stories article');
 const total=await cards.count();
 expect(total).toBeGreaterThan(0);
 const title=(await cards.first().getByRole('heading',{level:3}).innerText()).trim();
 await cards.first().getByRole('heading',{level:3}).getByRole('link').click();
 await expect(page.locator('main h1')).toHaveText(title);
 const originalPath=new URL(page.url()).pathname;
 const contents=page.getByRole('navigation',{name:'In this story'}).getByRole('link');
 expect(await contents.count()).toBeGreaterThan(0);
 for(const link of await contents.all())await expect(page.locator((await link.getAttribute('href'))!)).toHaveCount(1);
 const target=(await contents.last().getAttribute('href'))!;
 await contents.last().click();
 await expect.poll(()=>new URL(page.url()).hash).toBe(target);
 await expect(page.locator(target)).toBeInViewport();
 if(total>1){
  const related=page.locator('section[aria-labelledby="related-stories-title"]');
  await expect(related).toBeVisible();
  const links=related.getByRole('heading',{level:3}).getByRole('link');
  expect(await links.count()).toBeGreaterThan(0);
  for(const link of await links.all())expect(await link.getAttribute('href')).not.toBe(originalPath);
  const nextTitle=(await links.first().innerText()).trim();
  await links.first().click();
  await expect(page.locator('main h1')).toHaveText(nextTitle);
 }
});

for(const width of [390,768])test(`editorial pages remain inside the viewport at ${width}px with reduced motion`,async({page})=>{
 await page.setViewportSize({width,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const route of ['/','/our-story','/ingredients','/journal']){
  await visit(page,route);
  await assertNoHorizontalOverflow(page);
  // Scroll through the page so lazy images and viewport-dependent components are exercised.
  await page.locator('main').evaluate(element=>window.scrollTo(0,element.scrollHeight));
  await assertNoHorizontalOverflow(page);
  if(route==='/our-story'){
   const overlap=await page.evaluate(()=>{
    const caption=document.querySelector('figure[class*="heroImage"] figcaption')!.getBoundingClientRect();
    const inset=document.querySelector('div[class*="botanicalInset"]')!.getBoundingClientRect();
    return Math.max(0,Math.min(caption.right,inset.right)-Math.max(caption.left,inset.left))*Math.max(0,Math.min(caption.bottom,inset.bottom)-Math.max(caption.top,inset.top));
   });
   expect(overlap,'Story caption should clear its inset photograph').toBe(0);
  }
 }
 const articleLink=page.locator('#journal-stories article h3 a').first();
 await articleLink.click();
 await expect(page.locator('main h1')).toBeVisible();
 await assertNoHorizontalOverflow(page);
 await visit(page,'/ingredients');
 await page.locator('#ingredient-index article a').first().click();
 await expect(page.locator('main h1')).toBeVisible();
 await assertNoHorizontalOverflow(page);
});
