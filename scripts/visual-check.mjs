import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});await page.screenshot({path:'qa/home-desktop-viewport.png'});await page.screenshot({path:'qa/home-desktop-final.png',fullPage:true});
await page.goto('http://localhost:3000/products/botanical-face-balm',{waitUntil:'networkidle'});await page.screenshot({path:'qa/product-desktop.png'});
await page.setViewportSize({width:390,height:844});await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});await page.screenshot({path:'qa/home-mobile-viewport.png'});
await page.goto('http://localhost:3000/products/botanical-face-balm',{waitUntil:'networkidle'});await page.screenshot({path:'qa/product-mobile.png',fullPage:true});
console.log('Visual captures saved');await browser.close();
