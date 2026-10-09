import {test,expect,type Page} from '@playwright/test';

// An earlier global stylesheet could survive a client-side route transition.
// Keep this exact regression independent of the generated development chunks.
const legacyPhilosophyStyles=`
.philosophy-experience{display:grid;grid-template-columns:1.15fr 1fr;grid-template-rows:auto 1fr auto;gap:35px;min-height:790px;color:#f4f0e6;background:#25382c}
.philosophy-topline{grid-column:1/-1}.philosophy-words{padding:35px 0 65px;align-self:center}
.philosophy-panel{align-self:end;max-width:520px;margin:0 0 35px;padding:0 0 0 35px}
.philosophy-controls button{color:#f4f0e6}.philosophy-words>button>span{overflow-wrap:anywhere}
`;
const issues=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const messages:string[]=[];issues.set(page,messages);
 page.on('pageerror',error=>messages.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))messages.push(message.text());});
});
test.afterEach(async({page})=>{expect(issues.get(page)||[],'No runtime or hydration errors').toEqual([]);});

async function settle(page:Page){
 // Next can retain a hidden streamed copy outside the mounted page.
 const root=page.locator('#main').getByTestId('home-philosophy');
 await expect(root).toHaveCount(1);
 await expect(root).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await root.scrollIntoViewIfNeeded();
}
async function geometry(page:Page){
 return page.locator('#main').getByTestId('home-philosophy').evaluate(root=>{
  const panel=root.querySelector('[role="tabpanel"]')!;
  const list=root.querySelector('[role="tablist"]')!;
  const rect=(element:Element)=>{const r=element.getBoundingClientRect();return {width:r.width,height:r.height,x:r.x};};
  return {root:rect(root),panel:rect(panel),list:rect(list),overflow:document.documentElement.scrollWidth-window.innerWidth};
 });
}

for(const width of [320,390,768,1440,2560])test(`homepage philosophy stays readable at ${width}px with stale global styles`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await settle(page);
 const before=await geometry(page);
 await page.addStyleTag({content:legacyPhilosophyStyles});
 const after=await geometry(page);
 expect(after).toEqual(before);
 expect(after.overflow).toBeLessThanOrEqual(1);
 expect(after.panel.width).toBeGreaterThan(width>760?width>1100?450:280:220);
 const root=page.locator('#main').getByTestId('home-philosophy');
 const tabs=root.getByRole('tab');
 for(const tab of await tabs.all()){
  const bounds=await tab.boundingBox();expect(bounds!.width).toBeGreaterThan(65);
  await expect(tab).toBeVisible();
 }
 const clippedText=await tabs.evaluateAll(elements=>elements.some(element=>[...element.querySelectorAll('span')].some(span=>span.scrollWidth>span.clientWidth+1&&getComputedStyle(span).position!=='absolute')));
 expect(clippedText,'Chapter names must fit without horizontal clipping').toBe(false);
});

test('homepage philosophy retains layout after client navigation from Our Story',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await settle(page);const before=await geometry(page);
 await page.locator('#main').getByTestId('home-philosophy').getByRole('link',{name:'The story behind DYU'}).click();
 await expect(page).toHaveURL(/\/our-story$/);
 await page.getByRole('link',{name:'DYUhandmade home',exact:true}).first().click();
 await expect(page).toHaveURL(/\/$/);await settle(page);
 const after=await geometry(page);
 expect(after).toEqual(before);
 const root=page.locator('#main').getByTestId('home-philosophy');
 await root.getByRole('button',{name:'Next philosophy chapter'}).click();
 await expect(root.getByRole('tab').nth(1)).toHaveAttribute('aria-selected','true');
});

test('desktop photograph gently tilts with the pointer and settles on leaving',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/');await settle(page);
 const root=page.locator('#main').getByTestId('home-philosophy');
 const stage=root.locator('[class*="stage"]').first();
 const deck=root.locator('[class*="deck"]').first();
 const bounds=(await stage.boundingBox())!;
 const rotation=()=>deck.evaluate(element=>{const matrix=new DOMMatrix(getComputedStyle(element).transform);return Math.abs(matrix.m13)+Math.abs(matrix.m23);});
 await page.mouse.move(bounds.x+bounds.width*.82,bounds.y+75);
 await expect.poll(rotation).toBeGreaterThan(.005);
 await page.mouse.move(1,1);
 await expect.poll(rotation).toBeLessThan(.001);
});

test('reduced-motion preference keeps the photograph stable under the pointer',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await settle(page);
 const root=page.locator('#main').getByTestId('home-philosophy');
 const stage=root.locator('[class*="stage"]').first();
 const deck=root.locator('[class*="deck"]').first();
 const transform=()=>deck.evaluate(element=>getComputedStyle(element).transform);
 const before=await transform();const bounds=(await stage.boundingBox())!;
 await page.mouse.move(bounds.x+bounds.width*.82,bounds.y+75);
 await page.waitForTimeout(350);
 expect(await transform()).toBe(before);
});
