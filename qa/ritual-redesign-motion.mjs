import {chromium} from '@playwright/test';

const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const width of [1440,320]){
  const page=await browser.newPage({viewport:{width,height:1200},reducedMotion:'no-preference',hasTouch:width===320});
  await page.goto('http://127.0.0.1:3000/');
  const root=page.getByTestId('ritual-moments');
  await root.waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}.site-header{visibility:hidden!important}'});
  await root.evaluate(element=>window.scrollTo({top:element.getBoundingClientRect().top+window.scrollY,behavior:'instant'}));
  await root.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
  await page.waitForTimeout(1000);
  if(width===1440){
   const bounds=await root.getByTestId('ritual-photo').boundingBox();
   await page.mouse.move(bounds.x+bounds.width*.15,bounds.y+bounds.height*.25);
   await page.waitForTimeout(750);
   // Inspect the sweep at its visible midpoint without waiting for an entire cycle.
   await root.getByTestId('ritual-light').evaluate(element=>{for(const animation of element.getAnimations())animation.currentTime=4500;});
   await root.screenshot({path:'qa/ritual-redesign-motion-1440-depth-light.png'});
   await root.getByRole('group',{name:'Choose your moment'}).getByRole('button').nth(1).click();
  }else{
   await root.getByRole('group',{name:'Choose your moment'}).getByRole('button').last().tap();
   await root.getByRole('tablist',{name:'Explore your ritual steps'}).getByRole('tab').last().tap();
  }
  await page.waitForTimeout(900);
  await root.screenshot({path:`qa/ritual-redesign-motion-${width}-interaction.png`});
  console.log(JSON.stringify({width,motion:await root.getAttribute('data-motion'),overflow:await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)}));
  await page.close();
 }
}finally{await browser.close();}
