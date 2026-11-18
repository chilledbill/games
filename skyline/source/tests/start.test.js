import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
const step=(g,s)=>{for(let t=0;t<s;t+=1/120)g.tick(1/120);};

test('browser match start: fighters begin far apart and the rival does not attack for 1.5 s',()=>{
  const g=new Game();g.spreadStart=true;g.reset('light');
  assert.ok(Math.abs(g.dummy.x-g.player.x)>=200);
  step(g,1.45);
  assert.equal(g.events.some(e=>e.type==='enemyMove'||e.type==='enemyHit'),false);
  assert.equal(g.player.hp,100);
  step(g,6);                                  // the rival still comes in and fights after the grace period
  assert.ok(g.events.some(e=>e.type==='enemyMove'));
});
test('every restart uses the same spread start, including KO auto-restart',()=>{
  const g=new Game();g.spreadStart=true;g.reset('armored');g.player.hp=0;
  step(g,.1);g.checkKoRestart();step(g,3.1);assert.equal(g.checkKoRestart(),-1);
  assert.ok(Math.abs(g.dummy.x-g.player.x)>=200);assert.equal(g.dummy.attackAfter>0,true);
  g.player.x=100;g.reset();assert.ok(Math.abs(g.dummy.x-g.player.x)>=200);
});
test('default Game (tests, practice) keeps the close start',()=>{
  const g=new Game();assert.equal(g.dummy.x-g.player.x,75);
  g.spreadStart=true;g.reset('practice');assert.equal(g.dummy.attackAfter,0);
});
