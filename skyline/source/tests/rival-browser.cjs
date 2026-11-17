const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const errors=[],warnings=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='warning')warnings.push(e.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 await page.evaluate(()=>{window.spriteDraws={player:0,enemy:0};const original=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(...args){if(args[3]===80)window.spriteDraws.enemy++;if(args[3]===64)window.spriteDraws.player++;return original.apply(this,args);};});
 await page.setContent(fs.readFileSync('Skyline-Play.html','utf8'));await page.waitForTimeout(1000);
 const draws=await page.evaluate(()=>window.spriteDraws);assert.ok(draws.enemy>0);assert.ok(draws.player>0);assert.ok(Number((await page.locator('#player-health').textContent()).split('/')[0])<100);
 await page.screenshot({path:'artifacts/rival-landscape.png'});await page.setViewportSize({width:390,height:844});await page.locator('#mobile-reset').tap();await page.waitForTimeout(350);await page.screenshot({path:'artifacts/rival-portrait.png'});assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(network,[]);console.log('PASS two embedded character sheets render (64px/80px), rival deals combo damage, phone layouts, no errors or external requests');
}finally{await browser.close();}})();
