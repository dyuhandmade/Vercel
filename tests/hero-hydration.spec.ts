import {test,expect} from '@playwright/test';

test('homepage carousel hydrates and remains manually usable with reduced motion',async({page})=>{
 const hydrationErrors:string[]=[];
 page.on('pageerror',error=>hydrationErrors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|server rendered|did not match/i.test(message.text()))hydrationErrors.push(message.text());});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');
 const hero=page.locator('#main .atelier-hero');
 await expect(hero).toBeVisible();
 const slides=hero.getByRole('button',{name:/^Show slide /});
 await expect(slides.first()).toBeVisible();
 await expect(hero.locator('.atelier-carousel-autoplay')).toBeHidden();
 if(await slides.count()>1){
  await slides.nth(1).click();
  await expect(slides.nth(1)).toHaveAttribute('aria-pressed','true');
 }
 expect(hydrationErrors).toEqual([]);
});
