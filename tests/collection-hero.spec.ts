import {test, expect, type Locator, type Page} from '@playwright/test';

async function openHero(page: Page) {
  const diagnostics: string[] = [];
  page.on('pageerror', error => diagnostics.push(error.message));
  page.on('requestfailed', request => {
    if (request.url().includes('shopify') && new URL(request.url()).searchParams.get('width') === '1024') diagnostics.push(`${request.failure()?.errorText}: ${request.url()}`);
  });
  const health = await (await page.request.get('/api/health')).json();
  test.skip(health.mode === 'demo', 'These hero checks use the connected product catalogue and its photographs.');
  await page.goto('/shop');
  const hero = page.locator('#main .collection-hero');
  await expect(hero).toBeVisible();
  await hero.scrollIntoViewIfNeeded();
  try {await expect(hero).toHaveAttribute('data-ready', 'true', {timeout: 30000});}
  catch (error) {
    const details = {errors: diagnostics, content: await hero.textContent()};
    console.error('Hero load diagnostics:', details);
    await test.info().attach('hero-load-diagnostics', {body: JSON.stringify(details), contentType: 'application/json'});
    throw error;
  }
  await expect(hero.locator('canvas')).toBeVisible();
  return hero;
}

/** Read R3F's existing Canvas root ref: no runtime hooks or app test attributes are added. */
async function sceneRotations(canvas: Locator) {
  return canvas.evaluate(element => {
    type SceneObject = {rotation: {x: number; y: number; z: number}};
    type Vector = {x: number; y: number; z: number; clone: () => Vector};
    type RootState = {
      scene?: {isScene: boolean; getObjectByName: (name: string) => SceneObject | undefined};
      gl?: {domElement: Element};
      camera?: {position: Vector; getWorldDirection: (target: Vector) => Vector};
    };
    type Hook = {memoizedState?: {current?: RootState}; next?: Hook};
    type Fiber = {memoizedState?: Hook; return?: Fiber};
    const key = Object.keys(element).find(name => name.startsWith('__reactFiber$'));
    let fiber = key ? (element as unknown as Record<string, Fiber>)[key] : undefined;
    for (let level = 0; fiber && level < 40; level++, fiber = fiber.return) {
      let hook = fiber.memoizedState;
      for (let index = 0; hook && index < 80; index++, hook = hook.next) {
        const state = hook.memoizedState?.current;
        if (!state?.scene?.isScene || state.gl?.domElement !== element) continue;
        const rotation = (name: string) => {
          const object = state.scene!.getObjectByName(name);
          return object ? [object.rotation.x, object.rotation.y, object.rotation.z] : null;
        };
        // The initial Canvas state ref retains the same mutable camera and
        // scene, but its controls slot predates drei's makeDefault effect.
        const direction = state.camera?.getWorldDirection(state.camera.position.clone());
        return {
          disc: rotation('rotating-stone-disc'),
          product: rotation('stationary-product'),
          botanicals: rotation('stationary-botanicals'),
          azimuth: direction ? Math.atan2(-direction.x, -direction.z) : null,
          polar: direction ? Math.acos(Math.max(-1, Math.min(1, -direction.y))) : null,
        };
      }
    }
    return null;
  });
}

const angleDistance = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

test('drag rotates the view while the product stays fixed on the spinning disc, and reset restores the front', async ({page}) => {
  const hero = await openHero(page);
  const canvas = hero.locator('canvas');
  const before = await sceneRotations(canvas);
  expect(before?.azimuth).not.toBeNull();
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .65, bounds.y + bounds.height * .5);
  await expect(canvas).toHaveCSS('cursor', 'grab');
  await page.mouse.down();
  await expect(hero).toHaveAttribute('data-dragging', 'true');
  await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .44, {steps: 12});
  await page.mouse.up();
  await expect(hero).toHaveAttribute('data-dragging', 'false');
  await expect.poll(async () => angleDistance((await sceneRotations(canvas))!.azimuth!, before!.azimuth!)).toBeGreaterThan(.15);
  const dragged = (await sceneRotations(canvas))!;
  expect(dragged.product).toEqual(before!.product);
  expect(dragged.botanicals).toEqual(before!.botanicals);
  await expect.poll(async () => angleDistance((await sceneRotations(canvas))!.disc![1], dragged.disc![1])).toBeGreaterThan(.01);
  await hero.getByRole('button', {name: 'Reset 3D view', exact: true}).click();
  await expect.poll(async () => angleDistance((await sceneRotations(canvas))!.azimuth!, before!.azimuth!)).toBeLessThan(.001);
  expect((await sceneRotations(canvas))!.polar).toBeCloseTo(before!.polar!, 3);
});

test('arrow controls and keyboard arrows rotate the 3D view without starting product auto-rotation', async ({page}) => {
  const hero = await openHero(page);
  const canvas = hero.locator('canvas');
  const before = (await sceneRotations(canvas))!;
  await hero.getByRole('button', {name: 'Rotate scene left', exact: true}).click();
  await expect.poll(async () => (await sceneRotations(canvas))!.azimuth!).toBeLessThan(before.azimuth! - .1);
  await hero.getByRole('button', {name: 'Reset 3D view', exact: true}).click();
  await hero.getByRole('button', {name: 'Rotate scene right', exact: true}).click();
  await expect.poll(async () => (await sceneRotations(canvas))!.azimuth!).toBeGreaterThan(before.azimuth! + .1);
  const stage = hero.getByRole('group', {name: 'Interactive 3D product display', exact: true});
  await stage.focus();
  await stage.press('Home');
  await expect.poll(async () => angleDistance((await sceneRotations(canvas))!.azimuth!, before.azimuth!)).toBeLessThan(.001);
  await stage.press('ArrowLeft');
  await expect.poll(async () => (await sceneRotations(canvas))!.azimuth!).toBeLessThan(before.azimuth! - .1);
  await stage.press('ArrowUp');
  await expect.poll(async () => (await sceneRotations(canvas))!.polar!).toBeLessThan(before.polar! - .05);
  expect((await sceneRotations(canvas))!.product).toEqual(before.product);
});

test('collection hero renders solid 3D, rotates only the stone disc, and has no image card', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const hero = await openHero(page);
  await expect(hero.locator('img')).toHaveCount(0);
  await expect(page.locator('.shop-intro-photo')).toHaveCount(0);
  await expect(hero).toHaveAttribute('data-model-construction', 'solids');
  await expect(hero).toHaveAttribute('data-disc-motion', 'rotating');
  await expect(hero).toHaveAttribute('data-product-motion', 'stationary');
  const canvas = hero.locator('canvas');
  const before = await sceneRotations(canvas);
  expect(before).not.toBeNull();
  expect(before?.disc).not.toBeNull();
  expect(before?.product).not.toBeNull();
  expect(before?.botanicals).not.toBeNull();
  await expect.poll(async () => (await sceneRotations(canvas))?.disc?.[1] ?? -1, {timeout: 10000}).toBeGreaterThan(before!.disc![1] + .01);
  const after = await sceneRotations(canvas);
  expect(after?.product).toEqual(before!.product);
  expect(after?.botanicals).toEqual(before!.botanicals);
  await hero.screenshot({path: 'qa/collection-hero-3d-desktop.png'});
  expect(errors).toEqual([]);
});

test('category changes rebuild the hero with matching botanicals and smaller bottle and jar discs', async ({page}) => {
  const hero = await openHero(page);
  const category = (name: string) => page.locator('.category-tabs').getByRole('button', {name, exact: true});
  for (const name of ['Facial Oil', 'Hair Care', 'Facial Ubtan']) {
    test.skip(await category(name).count() === 0, `${name} is not in this catalogue.`);
  }
  const soapRadius = Number(await hero.locator('canvas').getAttribute('data-disc-radius'));
  const original = await hero.getAttribute('data-product');
  await category('Facial Oil').click();
  await expect(hero).toHaveAttribute('data-shape', 'bottle');
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute('data-ready', 'true', {timeout: 30000});
  expect(await hero.getAttribute('data-product')).not.toBe(original);
  expect(Number(await hero.locator('canvas').getAttribute('data-disc-radius'))).toBeLessThan(soapRadius);
  await category('Hair Care').click();
  await expect(hero).toHaveAttribute('data-botanical', 'rosemary');
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute('data-ready', 'true', {timeout: 30000});
  await hero.screenshot({path: 'qa/collection-hero-3d-rosemary.png'});
  await category('Facial Ubtan').click();
  await expect(hero).toHaveAttribute('data-shape', 'jar');
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute('data-ready', 'true', {timeout: 30000});
  expect(Number(await hero.locator('canvas').getAttribute('data-disc-radius'))).toBeLessThan(soapRadius);
  await hero.screenshot({path: 'qa/collection-hero-3d-ubtan.png'});
});

test('phone hero supports touch rotation and renders the full canvas without horizontal page overflow', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const hero = await openHero(page);
  const canvas = await hero.locator('canvas').boundingBox();
  expect(canvas).not.toBeNull();
  expect(canvas!.width).toBeGreaterThan(250);
  expect(canvas!.height).toBeGreaterThan(250);
  expect(canvas!.x).toBeGreaterThanOrEqual(0);
  expect(canvas!.x + canvas!.width).toBeLessThanOrEqual(391);
  const before = (await sceneRotations(hero.locator('canvas')))!;
  const scrollY = await page.evaluate(() => window.scrollY);
  const session = await page.context().newCDPSession(page);
  try {
    const startX = canvas!.x + canvas!.width * .7;
    const endX = canvas!.x + canvas!.width * .3;
    const y = canvas!.y + canvas!.height * .5;
    await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: startX, y, id: 1}]});
    for (let step = 1; step <= 12; step++) {
      await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: startX + (endX - startX) * step / 12, y, id: 1}]});
    }
    await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  } finally {
    await session.detach();
  }
  await expect.poll(async () => angleDistance((await sceneRotations(hero.locator('canvas')))!.azimuth!, before.azimuth!)).toBeGreaterThan(.15);
  expect((await sceneRotations(hero.locator('canvas')))!.product).toEqual(before.product);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scrollY, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await hero.screenshot({path: 'qa/collection-hero-3d-mobile.png'});
  expect(errors).toEqual([]);
});

test('reduced motion keeps the scene still until the user rotates it', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  const hero = await openHero(page);
  await expect(hero).toHaveAttribute('data-disc-motion', 'still');
  const before = await sceneRotations(hero.locator('canvas'));
  expect(before).not.toBeNull();
  expect(before?.disc).not.toBeNull();
  await page.waitForTimeout(750);
  expect(await sceneRotations(hero.locator('canvas'))).toEqual(before);
  const stage = hero.getByRole('group', {name: 'Interactive 3D product display', exact: true});
  await stage.focus();
  await stage.press('ArrowRight');
  await expect.poll(async () => (await sceneRotations(hero.locator('canvas')))!.azimuth!).toBeGreaterThan(before!.azimuth! + .1);
  const turned = (await sceneRotations(hero.locator('canvas')))!;
  expect(turned.disc).toEqual(before!.disc);
  expect(turned.product).toEqual(before!.product);
  expect(turned.botanicals).toEqual(before!.botanicals);
  await stage.press('Home');
  await expect.poll(async () => angleDistance((await sceneRotations(hero.locator('canvas')))!.azimuth!, before!.azimuth!)).toBeLessThan(.001);
});

test('a failed source photograph offers retry and recovers without replacing the scene with an image', async ({page}) => {
  const health = await (await page.request.get('/api/health')).json();
  test.skip(health.mode === 'demo', 'A Shopify source photograph is required to exercise source recovery.');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const sourceRequest = (url: URL) => ['cdn.shopify.com', 'cdn.shopifycdn.net'].includes(url.hostname) && url.searchParams.get('width') === '1024';
  const blocked: string[] = [];
  await page.route(sourceRequest, async route => {blocked.push(route.request().url()); await route.abort('failed');});
  await page.goto('/shop');
  const hero = page.locator('#main .collection-hero');
  await expect(hero).toBeVisible();
  await hero.scrollIntoViewIfNeeded();
  await expect(hero.getByRole('button', {name: 'Try again'})).toBeVisible({timeout: 30000});
  expect(blocked.length).toBeGreaterThan(0);
  expect(blocked.every(url => new URL(url).hostname.startsWith('cdn.shopify'))).toBe(true);
  await expect(hero).toHaveAttribute('data-ready', 'false');
  await expect(hero.locator('img')).toHaveCount(0);
  await page.unroute(sourceRequest);
  await hero.getByRole('button', {name: 'Try again'}).click();
  await expect(hero).toHaveAttribute('data-ready', 'true', {timeout: 30000});
  await expect(hero.locator('canvas')).toBeVisible();
  await expect(hero.getByRole('button', {name: 'Try again'})).toHaveCount(0);
  expect(errors).toEqual([]);
});
