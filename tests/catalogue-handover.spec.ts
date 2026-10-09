import {test,expect} from '@playwright/test';

test('catalogue filters and sorting survive reload and empty search recovers',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/shop');
 const main=page.locator('#main');
 const types=main.locator('.category-tabs button');
 await expect(types.nth(1)).toBeVisible();
 expect(await types.count()).toBeGreaterThan(1);
 const type=(await types.nth(1).textContent())!.trim();
 await types.nth(1).click();
 await expect(types.nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(page).toHaveURL(new RegExp(`type=${encodeURIComponent(type).replaceAll('%20','\\+')}`));
 const count=await main.locator('.catalog-grid .product-card').count();
 expect(count).toBeGreaterThan(0);
 await page.reload();
 await expect(main.locator('.catalog-grid .product-card')).toHaveCount(count);
 await main.getByRole('button',{name:'Refine',exact:true}).click();
 await main.getByLabel('Available now').check();
 await expect(main.locator('.catalog-grid .product-card button[aria-label^="Sold out:"]')).toHaveCount(0);
 await main.getByLabel('Sort by').selectOption('price-asc');
 const prices=await main.locator('.catalog-grid .price').allTextContents();
 const numbers=prices.map(price=>Number(price.replace(/[^\d.]/g,'')));
 expect(numbers).toEqual([...numbers].sort((a,b)=>a-b));
 await page.goto('/search?q=__handover_no_match__');
 await expect(main.getByRole('heading',{name:'No rituals found.'})).toBeVisible();
 await main.getByRole('button',{name:'Clear search & filters'}).click();
 await expect(main.locator('.catalog-grid .product-card').first()).toBeVisible();
 await expect(main.getByRole('textbox',{name:'Search products',exact:true})).toHaveValue('');
});

test('header search supports keyboard submit and Escape restores trigger focus',async({page})=>{
 await page.goto('/contact');
 const trigger=page.getByRole('button',{name:'Search products',exact:true});
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'Find your ritual',exact:true});
 const input=dialog.getByRole('textbox',{name:'Search the collection',exact:true});
 await input.fill('soap');
 await expect(dialog.locator('.search-result').first()).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 await expect(trigger).toBeFocused();
 await trigger.click();
 await input.fill('soap');
 await input.press('Enter');
 await expect(page).toHaveURL(/\/search\?q=soap$/);
 await expect(page.locator('#main .catalog-grid .product-card').first()).toBeVisible();
});
