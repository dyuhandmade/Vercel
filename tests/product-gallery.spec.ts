import {test,expect,type Page} from '@playwright/test';

async function openProduct(page:Page,pause=true) {
 const health=await (await page.request.get('/api/health')).json();
 const handle=health.mode==='demo'?'botanical-face-balm':'facial-ubtan-orange-almond';
 await page.goto(`/products/${handle}`);
 const gallery=page.locator('.exhibit-gallery');
 await expect(gallery).toBeVisible();
 if(pause)await gallery.getByRole('button',{name:'Pause product images',exact:true}).click();
 return gallery;
}

test('desktop photos sit left of an independent interactive 3D model',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const gallery=await openProduct(page);
 const model=gallery.getByRole('region',{name:'Interactive 3D product model'});
 const visual=model.locator('.product-visual');
 await expect(visual).toHaveAttribute('data-model-ready','true',{timeout:20000});
 await expect(model.locator('canvas')).toBeVisible();
 const bounds=await gallery.evaluate(element=>{
  const rect=(selector:string)=>{const {left,right,top,bottom,width,height}=element.querySelector(selector)!.getBoundingClientRect();return {left,right,top,bottom,width,height};};
  return {photo:rect('.product-photo-panel'),model:rect('.product-model-panel'),image:rect('.product-image-stage'),rail:rect('.product-thumbnail-rail')};
 });
 expect(bounds.photo.right).toBeLessThan(bounds.model.left);
 expect(bounds.rail.right).toBeLessThan(bounds.image.left);
 expect(bounds.rail.width).toBeGreaterThanOrEqual(44);
 const photo=gallery.locator('.product-image-stage img');
 await expect.poll(()=>photo.evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 const firstImage=await photo.getAttribute('src');
 await model.locator('canvas').evaluate(canvas=>{canvas.setAttribute('data-qa-identity','original');});
 await gallery.getByRole('button',{name:'View image 2',exact:true}).click();
 await expect(gallery.getByRole('button',{name:'View image 2',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await photo.getAttribute('src')).not.toBe(firstImage);
 await expect(model.locator('canvas')).toHaveAttribute('data-qa-identity','original');
 await model.getByRole('button',{name:'Rotate product right'}).click();
 await gallery.screenshot({path:'qa/product-gallery-split-desktop.png'});
 await model.getByRole('button',{name:'Close 3D view'}).click();
 await expect(model.locator('canvas')).toHaveCount(0);
 await expect(photo).toBeVisible();
 await model.getByRole('button',{name:'Explore in 3D'}).click();
 await expect(visual).toHaveAttribute('data-model-ready','true',{timeout:20000});
 expect(errors).toEqual([]);
});

test('phone photos advance in order, loop to the first, and support manual pause and resume',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.clock.install();
 const gallery=await openProduct(page,false),panel=gallery.locator('.product-photo-panel');
 const photos=gallery.getByRole('button',{name:/^View image /}),stage=gallery.locator('.product-image-stage');
 const count=await photos.count();expect(count).toBeGreaterThan(1);
 await page.mouse.move(5,5);
 await expect(panel).toHaveAttribute('data-autoplay','playing');
 const first=await stage.getAttribute('data-media-id');
 for(let index=1;index<count;index++){
  await page.clock.fastForward(5100);
  await expect(photos.nth(index)).toHaveAttribute('aria-pressed','true');
 }
 await page.clock.fastForward(5100);
 await expect(stage).toHaveAttribute('data-media-id',first!);
 await expect(photos.first()).toHaveAttribute('aria-pressed','true');
 await gallery.getByRole('button',{name:'Pause product images'}).click();
 await page.clock.fastForward(15000);
 await expect(stage).toHaveAttribute('data-media-id',first!);
 await gallery.getByRole('button',{name:'Play product images'}).click();
 await page.clock.fastForward(5100);
 await expect(photos.nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(gallery.locator('canvas')).toHaveCount(0);
});

test('desktop autoplay preserves the model and pauses for image hover and keyboard focus',async({page})=>{
 const gallery=await openProduct(page,false),panel=gallery.locator('.product-photo-panel');
 const canvas=gallery.locator('.product-model-panel canvas'),visual=gallery.locator('.product-model-panel .product-visual');
 await expect(visual).toHaveAttribute('data-model-ready','true',{timeout:20000});
 await canvas.evaluate(element=>element.setAttribute('data-qa-identity','same-model'));
 await page.clock.install();
 // Reset the timer after installing the clock so all subsequent ticks are virtual.
 await gallery.getByRole('button',{name:'Pause product images'}).click();
 await gallery.getByRole('button',{name:'Play product images'}).click();
 await page.mouse.move(5,5);
 await expect(panel).toHaveAttribute('data-autoplay','playing');
 const stage=gallery.locator('.product-image-stage'),initial=await stage.getAttribute('data-media-id');
 await page.clock.fastForward(5100);
 expect(await stage.getAttribute('data-media-id')).not.toBe(initial);
 await expect(canvas).toHaveAttribute('data-qa-identity','same-model');
 await stage.hover();await expect(panel).toHaveAttribute('data-autoplay','paused');
 const hovered=await stage.getAttribute('data-media-id');
 await page.clock.fastForward(15000);await expect(stage).toHaveAttribute('data-media-id',hovered!);
 await page.mouse.move(5,5);
 const selected=gallery.locator('.gallery-thumbs button[aria-pressed=true]');
 await selected.focus();await selected.press('ArrowDown');
 await expect(panel).toHaveAttribute('data-autoplay','paused');
 const focused=await stage.getAttribute('data-media-id');
 await page.clock.fastForward(15000);await expect(stage).toHaveAttribute('data-media-id',focused!);
 await expect(canvas).toHaveAttribute('data-qa-identity','same-model');
});

test('reduced-motion visitors can explicitly start the image loop',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();
 const gallery=await openProduct(page,false),stage=gallery.locator('.product-image-stage');
 await expect(gallery.getByRole('button',{name:'Play product images'})).toBeVisible();
 const initial=await stage.getAttribute('data-media-id');
 await page.clock.fastForward(15000);await expect(stage).toHaveAttribute('data-media-id',initial!);
 await gallery.getByRole('button',{name:'Play product images'}).click();
 await page.clock.fastForward(5100);
 expect(await stage.getAttribute('data-media-id')).not.toBe(initial);
});

for(const width of [375,430,768])test(`image gallery works at ${width}px without mounting a 3D viewer`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const gallery=await openProduct(page),buttons=gallery.getByRole('group',{name:'Product media'}).locator('button');
 await expect(gallery.locator('.product-model-panel')).toBeHidden();
 await expect(gallery.locator('.product-model-panel .product-visual')).toHaveCount(0);
 await expect(gallery.locator('canvas')).toHaveCount(0);
 await expect(gallery.getByRole('group',{name:'3D view controls'})).toHaveCount(0);
 const count=await buttons.count();expect(count).toBeGreaterThan(1);
 const stage=gallery.locator('.product-image-stage'),rail=gallery.locator('.gallery-thumbs');
 const before=await stage.getAttribute('data-media-id');
 await buttons.nth(1).click();
 expect(await stage.getAttribute('data-media-id')).not.toBe(before);
 await buttons.nth(1).press('End');
 await expect(buttons.last()).toBeFocused();await expect(buttons.last()).toHaveAttribute('aria-pressed','true');
 await expect(buttons.last()).toBeInViewport();
 await buttons.last().press('Home');await expect(buttons.first()).toBeFocused();
 await expect(buttons.first()).toHaveAttribute('aria-pressed','true');
 await expect.poll(()=>buttons.first().locator('img').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
 expect(await rail.evaluate(element=>element.scrollTop)).toBeLessThan(5);
 const bounds=await gallery.evaluate(element=>{
  const image=element.querySelector('.product-image-stage')!.getBoundingClientRect(),rail=element.querySelector('.product-thumbnail-rail')!.getBoundingClientRect();
  return {imageLeft:image.left,imageRight:image.right,imageWidth:image.width,railRight:rail.right};
 });
 expect(bounds.railRight).toBeLessThan(bounds.imageLeft);expect(bounds.imageRight).toBeLessThanOrEqual(width);
 expect(bounds.imageWidth).toBeGreaterThan(width*.65);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
 if(width===375)await gallery.screenshot({path:'qa/product-gallery-mobile.png'});
});

for(const handle of ['almond-facial-oil','damask-rose-cold-processed-soap','camphora-pink-salt','mud-face-wash','body-ubtan-tea-tree-1','triple-body-butter-lavendar','triple-body-butter-sandalwood'])test(`the separate model fits the gallery for ${handle}`,async({page})=>{
 const health=await (await page.request.get('/api/health')).json();
 await page.goto(`/products/${health.mode==='demo'?(handle==='almond-facial-oil'?'scalp-and-hair-oil':'botanical-soap'):handle}`);
 const gallery=page.locator('.exhibit-gallery');
 await expect(gallery.locator('.product-model-panel .product-visual')).toHaveAttribute('data-model-ready','true',{timeout:20000});
 await expect(gallery.locator('.product-image-stage img')).toBeVisible();
 const model=gallery.locator('.product-model-panel');
 await expect(model.locator('canvas')).toBeVisible();
 const bounds=await model.evaluate(element=>{
  const panel=element.getBoundingClientRect(),controls=element.querySelector('.viewer-controls')!.getBoundingClientRect();
  return {panelLeft:panel.left,panelRight:panel.right,controlsLeft:controls.left,controlsRight:controls.right};
 });
 expect(bounds.controlsLeft).toBeGreaterThanOrEqual(bounds.panelLeft);expect(bounds.controlsRight).toBeLessThanOrEqual(bounds.panelRight);
 await gallery.screenshot({path:`qa/product-gallery-${handle}.png`});
 if(handle==='camphora-pink-salt'&&health.mode!=='demo'){
  await expect(model.locator('.product-visual')).toHaveAttribute('data-model-construction','solids');
  await expect(model.locator('.product-visual')).toHaveAttribute('data-model-parts','2');
  for(let turn=0;turn<8;turn++)await model.getByRole('button',{name:'Rotate product right'}).click();
  await expect(model.locator('canvas')).toBeVisible();
  await model.screenshot({path:'qa/camphora-reverse-fixed.png'});
 }
 if(['mud-face-wash','body-ubtan-tea-tree-1','triple-body-butter-lavendar','triple-body-butter-sandalwood'].includes(handle)&&health.mode!=='demo'){
  await expect(model.locator('.product-visual')).toHaveAttribute('data-model-construction','solids');
  await expect(model.locator('.product-visual')).toHaveAttribute('data-model-part-kinds','jar');
  for(let turn=0;turn<8;turn++)await model.getByRole('button',{name:'Rotate product right'}).click();
  await expect(model.locator('canvas')).toBeVisible();
  await model.screenshot({path:`qa/${handle}-reverse-fixed.png`});
 }
});

test('landscape phones show photographs without loading 3D',async({browser})=>{
 const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',viewport:{width:844,height:390},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 try {
  const gallery=await openProduct(page);
  await expect(gallery.locator('.product-model-panel')).toBeHidden();
  await expect(gallery.locator('.product-model-panel .product-visual')).toHaveCount(0);
  await expect(gallery.locator('canvas')).toHaveCount(0);
  await expect(gallery.getByRole('button',{name:'View image 2'})).toBeVisible();
 } finally {await context.close();}
});

test('resizing from desktop to phone removes the model while preserving the selected image',async({page})=>{
 const gallery=await openProduct(page);
 await expect(gallery.locator('.product-model-panel .product-visual')).toHaveCount(1);
 await gallery.getByRole('button',{name:'View image 2',exact:true}).click();
 const selected=await gallery.locator('.product-image-stage').getAttribute('data-media-id');
 await page.setViewportSize({width:390,height:844});
 await expect(gallery.locator('.product-model-panel .product-visual')).toHaveCount(0);
 await expect(gallery.locator('canvas')).toHaveCount(0);
 await expect(gallery.locator('.product-image-stage')).toHaveAttribute('data-media-id',selected!);
});
