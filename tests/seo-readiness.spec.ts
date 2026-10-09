import {test,expect} from '@playwright/test';
import {stableSiteOrigin,storefrontIndexable} from '../src/lib/seo';

test('only an explicitly approved production origin can be indexed',()=>{
 const approved={NODE_ENV:'production',DEMO_MODE:'false',SITE_INDEXING_ENABLED:'true',NEXT_PUBLIC_SITE_URL:'https://store.example.com'};
 expect(storefrontIndexable(approved)).toBe(true);
 for(const NEXT_PUBLIC_SITE_URL of ['http://localhost:3000','https://localhost','https://127.0.0.1','https://[::1]','https://shop.local','https://demo.trycloudflare.com','https://demo.ngrok-free.app','https://store.example.com/path','https://user:pass@store.example.com','not-a-url']){
  expect(stableSiteOrigin({...approved,NEXT_PUBLIC_SITE_URL}),NEXT_PUBLIC_SITE_URL).toBeNull();
  expect(storefrontIndexable({...approved,NEXT_PUBLIC_SITE_URL}),NEXT_PUBLIC_SITE_URL).toBe(false);
 }
 expect(storefrontIndexable({...approved,SITE_INDEXING_ENABLED:undefined})).toBe(false);
 expect(storefrontIndexable({...approved,SITE_INDEXING_ENABLED:'false'})).toBe(false);
 expect(storefrontIndexable({...approved,NODE_ENV:'development'})).toBe(false);
 expect(storefrontIndexable({...approved,DEMO_MODE:'true'})).toBe(false);
});

test('local preview does not advertise indexing, a localhost canonical, or a public sitemap',async({page,request})=>{
 await page.goto('/products/oriental-lavendar');
 await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content',/noindex/);
 await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
 await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
 const robots=await (await request.get('/robots.txt')).text();
 expect(robots).toContain('Disallow: /');
 expect(robots).not.toContain('Sitemap:');
 expect(await (await request.get('/sitemap.xml')).text()).not.toContain('<loc>');
});

test('products, collections and ingredients retain useful descriptions when merchant summaries are empty',async({page})=>{
 for(const path of ['/products/moringa-facial-oil','/collections/frontpage','/ingredients/vitamin-e']){
  await page.goto(path);
  await expect(page.locator('#main h1')).toBeVisible();
  await expect(page.locator('meta[name="description"]').first()).toHaveAttribute('content',/.{30,}/);
 }
});
