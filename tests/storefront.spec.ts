import {test,expect} from '@playwright/test';
test('browse, add, persist, update and remove a preview product',async({page})=>{
 await page.goto('/shop');
 await page.getByRole('link',{name:'Discover Botanical Face Balm',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Botanical Face Balm',exact:true,level:1})).toBeVisible();
 await page.getByRole('button',{name:'Add to bag',exact:true}).click();
 const bag=page.getByRole('dialog',{name:'Your bag'});
 await expect(bag).toBeVisible();
 await expect(bag.getByText('₹890',{exact:true}).first()).toBeVisible();
 await bag.getByRole('button',{name:'Increase Botanical Face Balm'}).click();
 await expect(bag.getByText('₹1,780',{exact:true}).first()).toBeVisible();
 await expect(bag.getByRole('button',{name:'Checkout available at launch'})).toBeDisabled();
 await page.reload();
 await page.getByRole('button',{name:'Open bag, 2 items'}).click();
 await expect(bag.getByText('Botanical Face Balm',{exact:true})).toBeVisible();
 await bag.getByRole('button',{name:'Remove Botanical Face Balm'}).click();
 await expect(bag.getByText('Your bag is waiting to be filled.')).toBeVisible();
});
test('URL filters, sort, and no-results recovery',async({page})=>{
 await page.goto('/shop');
 await page.getByRole('button',{name:'Skin rituals',exact:true}).click();
 await expect(page).toHaveURL(/type=Skin/);
 await expect(page.locator('.product-card')).toHaveCount(1);
 await page.reload();await expect(page.locator('.product-card')).toHaveCount(1);
 await page.getByRole('button',{name:'All rituals',exact:true}).click();
 await page.getByLabel('Sort by').selectOption('price-asc');
 await expect(page.locator('.product-card h3').first()).toHaveText('Botanical Soap');
 await page.goto('/search?q=not-a-product');
 await expect(page.getByRole('heading',{name:'No rituals found.'})).toBeVisible();
 await page.getByRole('button',{name:'Clear search & filters'}).click();
 await expect(page.locator('.product-card')).toHaveCount(6);
});
test('search opens, finds products, and restores focus',async({page})=>{
 await page.goto('/');const trigger=page.getByRole('button',{name:'Search products'});await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Find your ritual'});
 await dialog.getByLabel('Search the collection').fill('soap');
 await expect(dialog.locator('.search-result')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
});
test('product 3D can be opened, rotated and closed',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/products/botanical-face-balm');
 const gallery=page.locator('.exhibit-gallery');
 await expect(gallery.locator('canvas')).toBeVisible();
 await gallery.getByRole('button',{name:'Rotate product right'}).click();
 await gallery.getByRole('button',{name:'Close 3D view'}).click();
 await expect(gallery.locator('canvas')).toHaveCount(0);expect(errors).toEqual([]);
 await gallery.getByRole('button',{name:'Explore in 3D'}).click();
 await expect(gallery.locator('canvas')).toBeVisible();
});

test('all preview shapes keep their model visible while gallery photographs change',async({page})=>{
 for(const handle of ['scalp-and-hair-oil','botanical-face-balm','botanical-soap']){
  await page.goto(`/products/${handle}`);
  const gallery=page.locator('.exhibit-gallery');
  await expect(gallery.locator('canvas')).toBeVisible();
  await gallery.getByRole('button',{name:'View image 2',exact:true}).click();
  await expect(gallery.getByRole('button',{name:'View image 2',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(gallery.getByRole('img',{name:'Illustrative atelier still life'})).toHaveAttribute('src',/atelier-hero/);
  await expect(gallery.getByRole('button',{name:'Explore in 3D'})).toHaveCount(0);
  await gallery.getByRole('button',{name:'View image 1',exact:true}).click();
  await expect(gallery.locator('canvas')).toBeVisible();
  await gallery.getByRole('button',{name:'Rotate product left'}).click();
  await gallery.getByRole('button',{name:'View image 2',exact:true}).click();
  await expect(gallery.locator('canvas')).toBeVisible();
 }
});

test('resetting filters preserves search and back navigation updates the field',async({page})=>{
 await page.goto('/search?q=oil');
 await page.getByRole('button',{name:'Hair care',exact:true}).click();
 await page.getByRole('button',{name:'Refine',exact:true}).click();
 await page.getByRole('button',{name:'Reset filters',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'Search products',exact:true})).toHaveValue('oil');
 await expect(page.locator('.product-card')).toHaveCount(2);
 await page.goto('/search?q=soap');
 await page.goBack();
 await expect(page.getByRole('textbox',{name:'Search products',exact:true})).toHaveValue('oil');
});
test('mobile navigation, responsive routes and reduced motion',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.getByRole('button',{name:'Open menu'}).click();
 await page.getByRole('dialog',{name:'Explore DYU'}).getByRole('link',{name:'Our story',exact:true}).click();
 await expect(page).toHaveURL(/our-story/);await expect(page.getByRole('dialog',{name:'Explore DYU'})).not.toBeVisible();
 await page.getByRole('button',{name:'Open menu'}).click();
 await page.getByRole('dialog',{name:'Explore DYU'}).getByRole('link',{name:'Our story',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Explore DYU'})).not.toBeVisible();
 for(const route of ['/','/shop','/products/botanical-face-balm','/ingredients','/how-its-made','/journal','/faq','/contact','/cart']){
  await page.goto(route);await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),route+' overflows').toBeTruthy();
  await expect(page.locator('.exhibit-gallery canvas')).toHaveCount(0);
 }
 await page.goto('/products/botanical-face-balm');
 const making=page.locator('.process-experience');
 await making.locator('.process-scene').scrollIntoViewIfNeeded();
 await expect(making.locator('.process-static')).toBeVisible();
 await expect(making.locator('canvas')).toHaveCount(0);
 const botanicals=page.locator('.botanical-discovery');
 await botanicals.locator('.botanical-stage').scrollIntoViewIfNeeded();
 await expect(botanicals.locator('.botanical-poster')).toBeVisible();
 await expect(botanicals.locator('canvas')).toHaveCount(0);
 expect(errors,'Reduced-motion pages hydrate without replacing the server-rendered content').toEqual([]);
});
test('all editorial and collection routes respond without runtime errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/collections/skin-rituals','/collections/body-and-bath','/collections/hair-care','/collections/gifting','/journal/making-space-for-a-ritual','/policies/shipping','/policies/privacy','/policies/terms','/policies/accessibility']){
  const response=await page.goto(route);expect(response?.status(),route).toBe(200);await expect(page.locator('h1')).toBeVisible();
 }
 await page.goto('/products/does-not-exist');await expect(page.getByText('A LITTLE DETOUR / 404')).toBeVisible();expect(errors).toEqual([]);
});


test('home defers 3D and story interactions support keyboard exploration',async({page})=>{
 await page.goto('/');
 await expect(page.locator('canvas')).toHaveCount(0);
 await page.getByRole('button',{name:'Explore collections',exact:true}).click();
 await expect(page.locator('#collection-menu')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('button',{name:'Explore collections',exact:true})).toBeFocused();
 await page.getByRole('button',{name:/Get a little closer/}).click();
 await expect(page.getByRole('dialog',{name:'A closer look'}).locator('canvas')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog',{name:'A closer look'})).not.toBeVisible();
 const making=page.locator('.process-experience');
 await expect(making.getByRole('tablist',{name:'Making steps'}).getByRole('tab')).toHaveCount(6);
 await making.getByRole('tab',{name:'02 · Prepare the botanical oil.',exact:true}).click();
 await page.keyboard.press('ArrowRight');
 await expect(making.getByRole('tab',{name:'03 · Bring the base together.',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(making.getByRole('tabpanel')).toContainText('Bring the base together.');
 const botanicals=page.locator('.botanical-discovery');
 await botanicals.getByRole('button',{name:'Explore Chamomile',exact:true}).click();
 await expect(botanicals.locator('.botanical-detail h3')).toHaveText('Chamomile');
 await botanicals.getByRole('button',{name:'Explore Aloe vera',exact:true}).click();
 await expect(botanicals.locator('.botanical-detail h3')).toHaveText('Aloe vera');
});

test('balm making shows six material transformations with working navigation and replay',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/products/botanical-face-balm');
 const making=page.locator('.process-experience');
 const timeline=making.getByRole('tablist',{name:'Making steps'});
 const panel=making.getByRole('tabpanel');
 const titles=['Measure the ingredients.','Prepare the botanical oil.','Bring the base together.','Fill each jar.','Let the balm take shape.','Close, label, and pack.'];
 await expect(timeline.getByRole('tab')).toHaveCount(6);
 await expect(timeline.getByRole('tab',{name:/Nature|Your ritual/i})).toHaveCount(0);
 await expect(making.getByRole('button',{name:'Previous making step'})).toBeDisabled();
 await making.getByRole('button',{name:'Next making step'}).click();
 await expect(panel.getByRole('heading',{name:titles[1],exact:true})).toBeVisible();
 await making.getByRole('button',{name:'Previous making step'}).click();
 await expect(panel.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();
 for(const [index,title] of titles.entries()){
  const tab=timeline.getByRole('tab',{name:`0${index+1} · ${title}`,exact:true});
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(panel.getByRole('heading',{name:title,exact:true})).toBeVisible();
 }
 await expect(panel).toContainText('A finished jar');
 await making.getByRole('button',{name:'Restart the making process'}).click();
 await expect(timeline.getByRole('tab').first()).toHaveAttribute('aria-selected','true');
 await timeline.getByRole('tab').first().focus();
 await page.keyboard.press('End');
 await expect(timeline.getByRole('tab').last()).toBeFocused();
 await expect(panel.getByRole('heading',{name:titles[5],exact:true})).toBeVisible();
 await page.keyboard.press('Home');
 await expect(timeline.getByRole('tab').first()).toBeFocused();
 await making.getByRole('button',{name:'Replay this making step'}).click();
 await expect(making.locator('canvas')).toBeVisible();
 await expect(panel.getByRole('heading',{name:titles[0],exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test('making page switches to soap and oil processes without retaining another product step',async({page})=>{
 await page.goto('/how-its-made');
 const making=page.locator('.process-experience');
 const families=making.getByRole('group',{name:'Choose a making process'});
 const panel=making.getByRole('tabpanel');
 await families.getByRole('button',{name:'Soap',exact:true}).click();
 await expect(families.getByRole('button',{name:'Soap',exact:true})).toHaveAttribute('aria-pressed','true');
 await making.getByRole('tab',{name:'05 · Form the individual bars.',exact:true}).click();
 await expect(panel.getByRole('heading',{name:'Form the individual bars.',exact:true})).toBeVisible();
 await expect(panel).toContainText('Individual bars');
 await expect(panel).toContainText('cure');
 await families.getByRole('button',{name:'Oil',exact:true}).click();
 await expect(making.getByRole('tab',{name:'01 · Measure the oils.',exact:true})).toHaveAttribute('aria-selected','true');
 await making.getByRole('tab',{name:'04 · Fill the bottles.',exact:true}).click();
 await expect(panel.getByRole('heading',{name:'Fill the bottles.',exact:true})).toBeVisible();
 await making.getByRole('button',{name:'Next making step'}).click();
 await expect(panel.getByRole('heading',{name:'Check the filled batch.',exact:true})).toBeVisible();
 await expect(panel).not.toContainText('cure');
});

test('evening ritual advances to the product purchase and resets for another moment',async({page})=>{
 await page.goto('/products/botanical-face-balm');
 const ritual=page.locator('.ritual-experience');
 const selectedMoment=page.locator('.purchase-card .selected-ritual');
 const steps=ritual.getByRole('tablist',{name:'Explore your ritual steps'});
 await expect(selectedMoment).toHaveCount(0);
 await steps.getByRole('tab').first().focus();
 await page.keyboard.press('End');
 await expect(steps.getByRole('tab').last()).toBeFocused();
 await expect(steps.getByRole('tab').last()).toHaveAttribute('aria-selected','true');
 await expect(selectedMoment).toHaveCount(0);
 const evening=ritual.getByRole('button',{name:'Evening',exact:true});
 await evening.click();
 await expect(evening).toHaveAttribute('aria-pressed','true');
 await expect(ritual.getByRole('heading',{name:'Set the day down.',exact:true})).toBeVisible();
 await expect(ritual.getByRole('button',{name:'Previous ritual step'})).toBeDisabled();
 await ritual.getByRole('button',{name:'Take a moment',exact:true}).click();
 await expect(ritual.getByRole('heading',{name:'Return to the familiar.',exact:true})).toBeVisible();
 await ritual.getByRole('button',{name:'Take a moment',exact:true}).click();
 const purchase=ritual.getByRole('link',{name:'Make room for a ritual',exact:true});
 await expect(ritual.getByRole('heading',{name:'Leave a little space.',exact:true})).toBeVisible();
 await expect(purchase).toHaveAttribute('href','#purchase');
 await expect(purchase).toBeFocused();
 await purchase.click();
 await expect(page).toHaveURL(/#purchase$/);
 await expect(page.locator('#purchase').getByRole('button',{name:'Add to bag',exact:true})).toBeVisible();
 await expect(selectedMoment).toBeVisible();
 await expect(selectedMoment.locator('p')).toHaveText('For your evenings.');
 const changeMoment=selectedMoment.getByRole('link',{name:'Change moment',exact:true});
 await expect(changeMoment).toHaveAttribute('href','#ritual');
 await changeMoment.click();
 await expect(page).toHaveURL(/#ritual$/);
 await ritual.getByRole('button',{name:'Morning',exact:true}).click();
 await expect(ritual.getByRole('heading',{name:'Let the day arrive.',exact:true})).toBeVisible();
 await expect(ritual.getByRole('button',{name:'Previous ritual step'})).toBeDisabled();
 await expect(ritual.getByRole('link',{name:'Make room for a ritual',exact:true})).toHaveCount(0);
 await expect(selectedMoment.locator('p')).toHaveText('For your mornings.');
});

test('botanical keyboard exploration preserves complete descriptions and selected states',async({page})=>{
 await page.goto('/products/botanical-face-balm');
 const botanicals=page.locator('.botanical-discovery');
 const choices=botanicals.getByRole('group',{name:'Explore botanical forms'});
 const detail=botanicals.locator('.botanical-detail');
 const calendula=choices.getByRole('button',{name:'Explore Calendula',exact:true});
 const chamomile=choices.getByRole('button',{name:'Explore Chamomile',exact:true});
 const aloe=choices.getByRole('button',{name:'Explore Aloe vera',exact:true});
 const shea=choices.getByRole('button',{name:'Explore Shea butter',exact:true});
 await calendula.click();
 await expect(detail.locator('p')).toHaveText('A sunlit study in warm gold. Layered petals and a vivid centre bring a little wildness to the botanical palette.');
 await page.keyboard.press('End');
 await expect(shea).toBeFocused();
 await expect(shea).toHaveAttribute('aria-pressed','true');
 await expect(calendula).toHaveAttribute('aria-pressed','false');
 await expect(detail.locator('p')).toHaveText('Soft ivory folds and a rich, sculptural texture. A material study that invites you to slow down and look a little closer.');
 await expect(detail).toContainText('The butter · Shape & substance');
 await page.keyboard.press('ArrowUp');
 await expect(chamomile).toBeFocused();
 await expect(detail.getByRole('heading',{name:'Chamomile',exact:true})).toBeVisible();
 await page.keyboard.press('ArrowLeft');
 await expect(calendula).toBeFocused();
 await page.keyboard.press('ArrowDown');
 await expect(aloe).toBeFocused();
 await expect(aloe).toHaveAttribute('aria-pressed','true');
 await expect(detail.locator('p')).toHaveText('Sculptural leaves open to a translucent centre. The contrast between the green exterior and clear interior is a study in texture.');
 await page.keyboard.press('Home');
 await expect(calendula).toBeFocused();
 await expect(calendula).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('ArrowRight');
 await expect(chamomile).toBeFocused();
 await expect(chamomile).toHaveAttribute('aria-pressed','true');
 await expect(botanicals.getByRole('group',{name:'Product assembly stages'}).getByRole('button',{name:/Look within/})).toHaveAttribute('aria-pressed','true');
});

test('product guidance opens native answers and sends visitors to existing sections',async({page})=>{
 await page.goto('/products/botanical-face-balm');
 const guidance=page.locator('.product-guidance');
 const ingredients=guidance.locator('details').filter({hasText:'What’s inside?'});
 const routine=guidance.locator('details').filter({hasText:'How do I make it part of my routine?'});
 const ordering=guidance.locator('details').filter({hasText:'Can I order this product?'});
 await ingredients.locator('summary').click();
 await expect(ingredients).toHaveJSProperty('open',true);
 await expect(ingredients.locator('p')).toHaveText('The ingredients in this design preview are botanical studies. The confirmed formulation will accompany the final product.');
 await expect(ingredients.locator('p')).toBeVisible();
 await expect(ingredients.getByRole('link',{name:'Revisit the botanical study',exact:true})).toHaveAttribute('href','#ingredients');
 await routine.locator('summary').click();
 await expect(routine).toHaveJSProperty('open',true);
 await expect(ingredients).toHaveJSProperty('open',false);
 await expect(routine.locator('p')).toBeVisible();
 const chooseMoment=routine.getByRole('link',{name:'Choose your moment',exact:true});
 await expect(chooseMoment).toHaveAttribute('href','#ritual');
 await chooseMoment.click();
 await expect(page).toHaveURL(/#ritual$/);
 await expect(page.locator('#ritual').getByRole('group',{name:'Choose your moment'})).toBeVisible();
 await ordering.locator('summary').click();
 await expect(ordering).toHaveJSProperty('open',true);
 await expect(routine).toHaveJSProperty('open',false);
 await expect(ordering.locator('p')).toContainText('Orders and payments are not yet enabled.');
 await expect(ordering.getByRole('link',{name:'Shipping & returns',exact:true})).toHaveAttribute('href','/policies/shipping');
 await ordering.locator('summary').press('Enter');
 await expect(ordering).toHaveJSProperty('open',false);
});

test('philosophy supports keyboard exploration and links each idea to its matching destination',async({page})=>{
 await page.goto('/');
 const philosophy=page.locator('.philosophy-experience');
 const tabs=philosophy.getByRole('tablist',{name:'Explore our philosophy'});
 const panel=philosophy.getByRole('tabpanel');
 await tabs.getByRole('tab',{name:'Nature',exact:true}).focus();
 await expect(panel.getByRole('link',{name:'Meet the botanicals',exact:true})).toHaveAttribute('href','/ingredients');
 await page.keyboard.press('ArrowDown');
 await expect(tabs.getByRole('tab',{name:'Human touch',exact:true})).toBeFocused();
 await expect(tabs.getByRole('tab',{name:'Human touch',exact:true})).toHaveAttribute('aria-selected','true');
 await expect(panel.getByRole('link',{name:'Follow the making',exact:true})).toHaveAttribute('href','/how-its-made');
 await page.keyboard.press('End');
 await expect(tabs.getByRole('tab',{name:'Your everyday',exact:true})).toBeFocused();
 await expect(panel.getByRole('link',{name:'Find your ritual',exact:true})).toHaveAttribute('href','/shop');
 await page.keyboard.press('Home');
 await expect(tabs.getByRole('tab',{name:'Nature',exact:true})).toBeFocused();
 await philosophy.getByRole('button',{name:'Next philosophy chapter'}).click();
 await panel.getByRole('link',{name:'Follow the making',exact:true}).click();
 await expect(page).toHaveURL(/\/how-its-made$/);
 await expect(page.locator('.process-experience').getByRole('tablist',{name:'Making steps'})).toBeVisible();
});

