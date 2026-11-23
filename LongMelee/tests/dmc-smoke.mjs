// Browser-level stress test for the isolated REACH DMC gun experiment.
// Run with: npm install --no-save puppeteer-core@24 && node LongMelee/tests/dmc-smoke.mjs
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const indexPath=fileURLToPath(new URL('../index.html',import.meta.url));
const html=await readFile(indexPath);
const server=createServer((req,res)=>{
 if(req.url!=='/' && req.url!=='/index.html'){res.writeHead(404).end();return}
 res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
let browser;
const errors=[];
try{
 browser=await puppeteer.launch({executablePath:chrome,headless:true,args:[
  '--no-sandbox','--disable-dev-shm-usage','--enable-webgl',
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const page=await browser.newPage();
 page.on('pageerror',e=>errors.push(String(e)));
 await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'load'});
 await page.waitForFunction(()=>window.__rangeLabDebug!==undefined,{timeout:15000});
 const init=await page.evaluate(()=>({gl:window.__rangeLabDebug.glOk,phase:window.__rangeLabDebug.phase}));
 assert.equal(init.gl,true,'WebGL must initialize');
 assert.equal(init.phase,'menu');

 await page.evaluate(()=>{window.__rangeLabDebug.start();window.__rangeLabDebug.setWeapon('shotgun')});
 await page.waitForFunction(()=>window.__rangeLabDebug.phase==='playing');
 assert.equal(await page.evaluate(()=>window.__rangeLabDebug.weapon),'shotgun');

 const stress=await page.evaluate(()=>window.__rangeLabDebug.stressShotgunEffects(500));
 console.log('500-shot 25Hz FX simulation:',JSON.stringify(stress));
 assert.equal(stress.passed,true,'FX pool must be bounded and fully expire');
 assert.equal(stress.remaining,0,'FX must not leak after 1.2 seconds');
 assert.ok(stress.dropped>0,'Overload simulation must exercise particle shedding');

 // Actual input-driven repeated firing with the render loop active.
 await page.keyboard.down('j');
 await new Promise(resolve=>setTimeout(resolve,5500));
 await page.keyboard.up('j');
 await new Promise(resolve=>setTimeout(resolve,1400));
 const live=await page.evaluate(()=>({weapon:window.__rangeLabDebug.weapon,...window.__rangeLabDebug.perf}));
 console.log('Repeated-fire browser render:',JSON.stringify(live));
 assert.equal(live.weapon,'shotgun');
 assert.equal(live.error,'','Main requestAnimationFrame loop must not throw');
 assert.ok(live.drawCalls>0,'Frame must render objects');
 assert.ok(live.peak<=live.limit,'Live particles must be bounded');
 assert.ok(live.effects<=live.limit,'Active particles must be bounded');
 assert.equal(errors.length,0,'Browser must have no uncaught errors: '+errors.join('; '));

 // Weapon switching and settings auto-save remain intact.
 const saved=await page.evaluate(()=>{
  window.__rangeLabDebug.setWeapon('pistols');
  const slider=document.getElementById('fullSettings_shotgunFX');
  slider.value='70';slider.dispatchEvent(new Event('input',{bubbles:true}));
  return {weapon:window.__rangeLabDebug.weapon,fx:JSON.parse(localStorage.getItem('reachDmcLabV1')).shotgunFX,hover:typeof window.__rangeLabDebug.pickHoveredEnemy};
 });
 assert.equal(saved.weapon,'pistols');
 assert.equal(saved.fx,70);
 assert.equal(saved.hover,'function');
 await page.reload({waitUntil:'load'});
 assert.equal(await page.evaluate(()=>window.__rangeLabDebug.settings.shotgunFX),70,'Auto-saved slider restores on reload');
 console.log('PASS: browser FX stress, actual fire loop, settings persistence, targeting and switching API');
}catch(error){
 console.error('FAIL:',error);
 if(errors.length)console.error('Browser errors:',errors);
 process.exitCode=1;
}finally{
 if(browser)await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
