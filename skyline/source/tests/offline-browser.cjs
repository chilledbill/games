// Optional: PLAYWRIGHT_MODULE=/path/to/playwright node tests/offline-browser.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.setContent(fs.readFileSync('Skyline-Play.html','utf8'));await page.waitForTimeout(150);
 await page.locator('#help-toggle').tap();await page.locator('#opponent').selectOption('practice');await page.locator('#mobile-debug').tap();await page.locator('#help-close').tap();
 const hud=()=>page.locator('#hud').textContent();
 await page.locator('[data-action="Dodge"]').tap();await page.waitForTimeout(20);
 assert.match(await hud(),/MOVE G_Dodge/);
 await page.locator('[data-action="Attack"]').tap();await page.waitForTimeout(120);assert.match(await hud(),/MOVE G_DashAttack/);assert.match(await hud(),/COMBO 1/);
 await page.locator('#mobile-reset').tap();
 // Hold and release through actual DOM keyboard events, not direct simulation calls.
 await page.keyboard.down('j');await page.waitForTimeout(550);await page.keyboard.up('j');await page.waitForTimeout(100);assert.match(await hud(),/MOVE G_Charge/);
 await page.locator('#mobile-reset').tap();await page.keyboard.down('s');await page.locator('[data-action="Attack"]').tap();await page.keyboard.up('s');await page.waitForTimeout(210);assert.match(await hud(),/MOVE G_Sweep/);assert.match(await hud(),/TARGET Knockdown/);
 await page.screenshot({path:'artifacts/milestone2-phone.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('PASS: standalone HTML, touch dodge/dash strike, held charge/release, sweep, zero page errors or network requests');
 }finally{await browser.close();}
})();
