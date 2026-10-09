import {test,expect,type Page,type Locator} from '@playwright/test';

const runtimeIssues=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{
 const issues:string[]=[];
 runtimeIssues.set(page,issues);
 page.on('pageerror',error=>issues.push(error.message));
 page.on('console',message=>{
  if(message.type()==='error'&&/hydrat|server.rendered.html|did(?:n.t| not) match/i.test(message.text()))issues.push(message.text());
 });
});
test.afterEach(async({page})=>{
 expect(runtimeIssues.get(page)||[],'Ritual interactions must not produce runtime or hydration errors').toEqual([]);
});

async function visitRitual(page:Page){
 const response=await page.goto('/');
 expect(response?.ok()).toBe(true);
 // Keep assertions on the mounted page, excluding hidden streamed markup.
 const ritual=page.locator('#main').getByTestId('ritual-moments');
 await expect(ritual).toHaveCount(1);
 await expect(ritual).toBeVisible();
 await page.evaluate(()=>document.fonts.ready);
 await ritual.scrollIntoViewIfNeeded();
 return ritual;
}

async function expectStep(ritual:Locator,index:number){
 const tabs=ritual.getByRole('tablist',{name:'Explore your ritual steps'}).getByRole('tab');
 const selected=tabs.nth(index);
 await expect(selected).toHaveAttribute('aria-selected','true');
 const label=await selected.getAttribute('aria-label');
 expect(label).toMatch(new RegExp(`^Step ${index+1}: `));
 const panel=ritual.getByRole('tabpanel');
 await expect(panel).toHaveAttribute('id',(await selected.getAttribute('aria-controls'))!);
 await expect(panel).toHaveAttribute('aria-labelledby',(await selected.getAttribute('id'))!);
 await expect(panel.getByRole('heading',{level:3})).toHaveText(label!.replace(/^Step \d+: /,''));
 await expect(ritual.getByRole('button',{name:'Previous ritual step'}))[index===0?'toBeDisabled':'toBeEnabled']();
}

test('all three moments retain their own complete, keyboard-accessible steps',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const ritual=await visitRitual(page);
 const moments=ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button');
 await expect(moments).toHaveCount(3);
 const firstTitles=new Set<string>();
 for(const moment of await moments.all()){
  await moment.click();
  await expect(moment).toHaveAttribute('aria-pressed','true');
  await expectStep(ritual,0);
  firstTitles.add(await ritual.getByRole('tabpanel').getByRole('heading',{level:3}).innerText());
  const tabs=ritual.getByRole('tablist',{name:'Explore your ritual steps'}).getByRole('tab');
  await expect(tabs).toHaveCount(3);
  await tabs.first().focus();
  await tabs.first().press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();await expectStep(ritual,1);
  await tabs.nth(1).press('End');
  await expect(tabs.last()).toBeFocused();await expectStep(ritual,2);
  await tabs.last().press('ArrowDown');
  await expect(tabs.first()).toBeFocused();await expectStep(ritual,0);
  await tabs.first().press('ArrowLeft');
  await expect(tabs.last()).toBeFocused();await expectStep(ritual,2);
  await tabs.last().press('Home');
  await expect(tabs.first()).toBeFocused();await expectStep(ritual,0);
 }
 expect(firstTitles.size,'Each moment should expose its own content').toBe(3);
 await moments.first().focus();
 await moments.first().press('ArrowLeft');
 await expect(moments.last()).toBeFocused();await expect(moments.last()).toHaveAttribute('aria-pressed','true');
 await expectStep(ritual,0);
 await moments.last().press('ArrowRight');
 await expect(moments.first()).toBeFocused();await expect(moments.first()).toHaveAttribute('aria-pressed','true');
 await moments.first().press('End');await expect(moments.last()).toBeFocused();
 await moments.last().press('Home');await expect(moments.first()).toBeFocused();
});

test('next/previous controls work, completion hands keyboard focus to the collection link, and switching moments resets progress',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const ritual=await visitRitual(page);
 const next=ritual.getByRole('button',{name:'Take a moment',exact:true});
 await next.click();await expectStep(ritual,1);
 await ritual.getByRole('button',{name:'Previous ritual step'}).click();await expectStep(ritual,0);
 await next.click();
 await next.press('Enter');await expectStep(ritual,2);
 const destination=ritual.getByRole('link',{name:'Find your ritual',exact:true});
 await expect(destination).toBeFocused();
 await expect(destination).toHaveAttribute('href','/shop');
 const moments=ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button');
 await moments.nth(1).click();await expectStep(ritual,0);
 await expect(destination).toHaveCount(0);
 await next.click();await next.press('Enter');await expect(destination).toBeFocused();
 await destination.press('Enter');
 await expect(page).toHaveURL(/\/shop$/);
 await expect(page.locator('#main h1')).toBeVisible();
});

for(const width of [320,390,768,1440,2560])test(`ritual photographs, controls and copy remain readable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 const ritual=await visitRitual(page);
 const moments=ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button');
 for(const moment of await moments.all()){
  await moment.click();
  await expectStep(ritual,0);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  const geometry=await ritual.evaluate(root=>{
   const panel=root.querySelector('[role="tabpanel"]')!;
   const heading=panel.querySelector('h3')!;
   const rect=root.getBoundingClientRect();
   const panelRect=panel.getBoundingClientRect();
   return {left:rect.left,right:rect.right,width:rect.width,panelWidth:panelRect.width,headingClipped:heading.scrollWidth>heading.clientWidth+1};
  });
  expect(geometry.left).toBeGreaterThanOrEqual(-1);expect(geometry.right).toBeLessThanOrEqual(width+1);
  expect(geometry.width).toBeGreaterThan(Math.min(width*.8,1100));
  expect(geometry.panelWidth).toBeGreaterThan(width>=1440?350:width>=768?260:200);
  expect(geometry.headingClipped,'Step titles must fit without horizontal clipping').toBe(false);
  const captionBounds=(await ritual.locator('figure figcaption').boundingBox())!;
  const photoLabelBounds=(await ritual.getByText('THE ART OF THE EVERYDAY',{exact:true}).boundingBox())!;
  expect(captionBounds.y,'Photo captions must clear the top image badge').toBeGreaterThanOrEqual(photoLabelBounds.y+photoLabelBounds.height+6);
  for(const control of await moments.all()){
   await expect(control).toBeVisible();
   const rect=(await control.boundingBox())!;
   expect(rect.height).toBeGreaterThanOrEqual(44);
   expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
  }
  await ritual.getByRole('tablist',{name:'Explore your ritual steps'}).getByRole('tab').last().click();
  await expectStep(ritual,2);
  const destination=ritual.getByRole('link',{name:'Find your ritual',exact:true});
  await expect(destination).toBeVisible();
  const panelBounds=(await ritual.getByRole('tabpanel').boundingBox())!;
  const destinationBounds=(await destination.boundingBox())!;
  expect(destinationBounds.y,'The final action must remain below the complete step content').toBeGreaterThanOrEqual(panelBounds.y+panelBounds.height-1);
 }
});

test('ritual remains usable after client navigation from Our Story and ignores legacy global layout rules',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/our-story');
 await expect(page.locator('#main h1')).toBeVisible();
 await page.getByRole('link',{name:'DYUhandmade home',exact:true}).first().click();
 await expect(page).toHaveURL(/\/$/);
 const ritual=page.locator('#main').getByTestId('ritual-moments');
 await expect(ritual).toHaveCount(1);
 await expect(ritual).toBeVisible();await page.evaluate(()=>document.fonts.ready);
 const size=()=>ritual.evaluate(root=>({width:root.getBoundingClientRect().width,height:root.getBoundingClientRect().height,panelWidth:root.querySelector('[role="tabpanel"]')!.getBoundingClientRect().width}));
 const before=await size();
 await page.addStyleTag({content:'.ritual-experience-stage{display:grid;grid-template-columns:1fr 1fr;max-width:1680px}.ritual-experience-content{padding:90px}.ritual-experience-photo{min-height:750px}.ritual-experience-copy h3{max-width:400px;overflow-wrap:anywhere}'});
 expect(await size()).toEqual(before);
 await ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button').last().click();
 await expectStep(ritual,0);
 await ritual.getByRole('button',{name:'Take a moment',exact:true}).click();
 await expectStep(ritual,1);
});

async function rotationAmount(photo:Locator){
 return photo.evaluate(element=>{
  const transform=new DOMMatrix(getComputedStyle(element).transform);
  return Math.abs(transform.m13)+Math.abs(transform.m23);
 });
}

test('photo responds to the mouse with gentle depth and settles when the pointer leaves',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const ritual=await visitRitual(page);
 await expect(ritual).toHaveAttribute('data-motion','active');
 await expect(ritual).toHaveAttribute('data-in-view','true');
 const photo=ritual.getByTestId('ritual-photo');
 await photo.scrollIntoViewIfNeeded();
 const bounds=(await photo.boundingBox())!;
 // Stay inside the photograph and away from the overlapping controls card.
 await page.mouse.move(bounds.x+bounds.width*.22,bounds.y+Math.min(bounds.height*.32,220));
 await expect.poll(()=>rotationAmount(photo),{message:'Pointer position should gently tilt the photograph'}).toBeGreaterThan(.006);
 await page.mouse.move(2,2);
 await expect.poll(()=>rotationAmount(photo),{message:'The photograph should settle back to level when the pointer leaves'}).toBeLessThan(.001);
});

test('reduced motion keeps the scene static and removes ambient CSS animations',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const ritual=await visitRitual(page);
 await expect(ritual).toHaveAttribute('data-motion','still');
 const photo=ritual.getByTestId('ritual-photo');
 const ambientAnimations=()=>ritual.evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation instanceof CSSAnimation).map(animation=>animation.playState));
 await expect.poll(ambientAnimations).toEqual([]);
 const before=await photo.evaluate(element=>getComputedStyle(element).transform);
 const bounds=(await photo.boundingBox())!;
 await page.mouse.move(bounds.x+bounds.width*.2,bounds.y+Math.min(bounds.height*.3,200));
 await page.waitForTimeout(300);
 expect(await photo.evaluate(element=>getComputedStyle(element).transform)).toBe(before);
 expect(await rotationAmount(photo)).toBeLessThan(.001);
 await ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button').last().click();
 await expectStep(ritual,0);
 await expect.poll(ambientAnimations).toEqual([]);
});

test('ambient photo and light animations pause offscreen and resume in view',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const ritual=await visitRitual(page);
 await expect(ritual).toHaveAttribute('data-in-view','true');
 const light=ritual.getByTestId('ritual-light');
 const lightState=()=>light.evaluate(element=>({name:getComputedStyle(element).animationName,state:getComputedStyle(element).animationPlayState}));
 await expect.poll(async()=>(await lightState()).name).not.toBe('none');
 await expect.poll(async()=>(await lightState()).state).toBe('running');
 await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
 await expect(ritual).toHaveAttribute('data-in-view','false');
 await expect.poll(async()=>(await lightState()).state).toBe('paused');
 const ambientStates=await ritual.evaluate(element=>element.getAnimations({subtree:true}).filter(animation=>animation instanceof CSSAnimation).map(animation=>animation.playState));
 expect(ambientStates.length).toBeGreaterThan(0);
 expect(ambientStates.every(state=>state==='paused'),'All ambient CSS animations should stop while the section is offscreen').toBe(true);
 await ritual.scrollIntoViewIfNeeded();
 await expect(ritual).toHaveAttribute('data-in-view','true');
 await expect.poll(async()=>(await lightState()).state).toBe('running');
});

test('animated moment and step transitions retain complete interaction and focus behavior',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 const ritual=await visitRitual(page);
 await expect(ritual).toHaveAttribute('data-motion','active');
 const moments=ritual.getByRole('group',{name:'Choose your moment'}).getByRole('button');
 for(const moment of await moments.all()){
  await moment.click();
  await expect(moment).toHaveAttribute('aria-pressed','true');
  await expectStep(ritual,0);
  await expect(ritual.getByTestId('ritual-photo').locator('img')).toHaveCount(1);
  await ritual.getByRole('button',{name:'Take a moment',exact:true}).click();
  await expectStep(ritual,1);
  await ritual.getByRole('button',{name:'Take a moment',exact:true}).press('Enter');
  await expectStep(ritual,2);
  await expect(ritual.getByRole('link',{name:'Find your ritual',exact:true})).toBeFocused();
 }
 await moments.first().click();
 await expectStep(ritual,0);
 await expect(ritual.getByRole('link',{name:'Find your ritual',exact:true})).toHaveCount(0);
});
