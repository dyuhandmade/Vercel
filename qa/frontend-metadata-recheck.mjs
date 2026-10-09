import {chromium} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';

const origin = 'http://127.0.0.1:3000';
const audit = JSON.parse(await readFile('qa/frontend-handover/audit.json', 'utf8'));
const paths = audit.paths.filter(path => path.startsWith('/collections/') || path.startsWith('/ingredients/'));
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
await context.route('**/api/**', route => route.request().method() === 'GET' && !route.request().url().includes('/api/auth/') ? route.continue() : route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const results = [];
for (const path of paths) {
  const response = await page.goto(`${origin}${path}`);
  await page.locator('#main h1').waitFor();
  results.push({path, status: response.status(), ...await page.evaluate(() => ({description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '', canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '', robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || ''}))});
}
const failures = results.filter(result => result.status !== 200 || result.description.length < 30 || result.canonical || !result.robots.includes('noindex'));
await writeFile('qa/frontend-handover/metadata-recheck.json', JSON.stringify({results, errors, failures}, null, 2));
await browser.close();
console.log(JSON.stringify({checked: results.length, failures: failures.length, browserErrors: errors.length}));
if (failures.length || errors.length) process.exitCode = 1;
