import {chromium} from '@playwright/test';
import {mkdir, readFile, writeFile} from 'node:fs/promises';

const origin = 'http://127.0.0.1:3000';
await mkdir('qa/frontend-handover', {recursive: true});
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({reducedMotion: 'reduce'});
// This audit is read-only and has no access to the user's signed-in browser.
await context.route('**/api/**', route => {
  const request = route.request();
  if (request.method() !== 'GET' || /\/api\/auth\//.test(request.url())) return route.abort();
  return route.continue();
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push({path: new URL(page.url()).pathname, message: error.message}));
const sitemap = await (await context.request.get(`${origin}/sitemap.xml`)).text();
const seeds = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
const previous = await readFile('qa/frontend-handover/audit.json', 'utf8').then(JSON.parse).catch(() => ({paths: []}));
const paths = new Set([...seeds, ...previous.paths, '/', '/shop', '/our-story', '/how-its-made', '/ingredients', '/journal', '/contact', '/faq', '/search?q=__audit_no_match__', '/cart', '/account', '/account/orders', '/account/profile', '/account/addresses', '/account/wishlist', '/account/history', '/policies/privacy', '/policies/terms', '/policies/shipping', '/policies/accessibility']);
const results = [];
const brokenLinks = [];
const routeStatus = new Map();
for (const width of [1440, 768, 390, 320]) {
  await page.setViewportSize({width, height: 1000});
  for (const path of paths) {
    const beforeErrors = errors.length;
    const response = await page.goto(`${origin}${path}`, {waitUntil: 'domcontentloaded'});
    await page.locator('main h1').first().waitFor({timeout: 15000});
    await page.evaluate(() => document.fonts.ready);
    await page.locator('main').getByText('Opening your space…', {exact: true}).waitFor({state: 'hidden'}).catch(() => {});
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += Math.max(innerHeight - 200, 400)) {
        scrollTo(0, y);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      scrollTo(0, 0);
    });
    const measured = await page.evaluate(() => {
      const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
      const name = element => element.getAttribute('aria-label')?.trim() || element.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim() || [...(element.labels || [])].map(label => label.textContent).join(' ').trim() || element.textContent?.trim() || element.getAttribute('title')?.trim();
      const links = [...document.querySelectorAll('a[href]')].map(element => element.getAttribute('href')).filter(Boolean);
      const anchors = links.filter(href => href.startsWith('#') && href.length > 1).filter(href => !document.getElementById(decodeURIComponent(href.slice(1))));
      return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
        h1: [...document.querySelectorAll('main h1')].filter(visible).map(element => element.textContent?.trim()),
        overflow: document.documentElement.scrollWidth - innerWidth,
        missingAlt: [...document.querySelectorAll('img:not([alt])')].filter(visible).map(element => element.src),
        brokenImages: [...document.querySelectorAll('img')].filter(element => visible(element) && element.complete && !element.naturalWidth).map(element => element.currentSrc || element.src),
        unnamedControls: [...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea')].filter(element => visible(element) && !name(element)).map(element => ({tag: element.tagName, type: element.type, className: element.className})),
        brokenAnchors: [...new Set(anchors)],
        links,
      };
    });
    const status = response?.status() || 0;
    routeStatus.set(path.split('?')[0], status);
    if (width === 1440) for (const link of measured.links) {
      if (!link.startsWith('/') || link.startsWith('//') || link.startsWith('/api/') || link.startsWith('/model-preview') || /\.(png|jpg|jpeg|webp|gif|svg|pdf)$/i.test(link)) continue;
      const url = new URL(link, origin);
      if (!url.pathname.includes('.')) paths.add(url.pathname);
    }
    results.push({width, path, status, ...measured, links: undefined, errors: errors.slice(beforeErrors)});
    if ([1440, 390].includes(width) && ['/', '/shop', '/products/oriental-lavendar', '/ingredients', '/journal', '/cart', '/account'].includes(path)) {
      const filename = `qa/frontend-handover/${path.replaceAll('/', '-').replace(/^-/, '') || 'home'}-${width}`;
      await page.screenshot({path: `${filename}.png`, fullPage: true});
      await page.screenshot({path: `${filename}-top.png`});
    }
    console.log(`${width} ${status} ${path} overflow=${measured.overflow}`);
  }
}
for (const path of ['/not-a-real-page', '/products/not-a-real-product', '/collections/not-a-real-collection', '/ingredients/not-a-real-ingredient', '/journal/not-a-real-article']) {
  const response = await page.goto(`${origin}${path}`);
  const recovery = {path, status: response?.status(), h1: await page.locator('main h1').first().textContent(), recoveryLink: await page.locator('main a[href="/shop"]').count()};
  results.push({width: 320, recovery});
}
for (const [path, status] of routeStatus) if (status >= 400) brokenLinks.push({path, status});
const issues = results.filter(result => !result.recovery && (result.status >= 400 || result.overflow > 1 || result.h1.length !== 1 || !result.title || !result.description || result.missingAlt.length || result.brokenImages.length || result.unnamedControls.length || result.brokenAnchors.length || result.errors.length));
await writeFile('qa/frontend-handover/audit.json', JSON.stringify({paths: [...paths], results, issues, brokenLinks, errors}, null, 2));
await browser.close();
console.log(JSON.stringify({routes: paths.size, views: results.length, issues: issues.map(({links, ...issue}) => issue), brokenLinks, errors}, null, 2));
