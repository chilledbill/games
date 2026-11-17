import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {DEFENSE} from '../src/enemy.js';
const step=(g,s)=>{for(let t=0;t<s;t+=1/120)g.tick(1/120);};

test('KO restarts the round after 3 simulation seconds, keeping profile and checklist',()=>{
  const g=new Game();g.reset('armored');g.record('Attack');
  g.player.hp=0;
  assert.ok(g.checkKoRestart()>2.9);
  step(g,2.5);assert.ok(g.checkKoRestart()>0&&g.checkKoRestart()<1);assert.equal(g.player.hp,0);
  step(g,.6);
  assert.equal(g.checkKoRestart(),-1);
  assert.equal(g.player.hp,100);assert.equal(g.profile,'armored');assert.equal(g.dummy.hp,180);
  assert.ok(g.performed.has('Attack'));assert.equal(g.koAt,null);
  assert.equal(g.checkKoRestart(),0);
});
test('victory also restarts; a paused simulation does not advance the countdown',()=>{
  const g=new Game();g.reset('light');g.dummy.hp=0;g.dummy.state='Dead';
  g.checkKoRestart();
  const t=g.time;assert.ok(g.checkKoRestart()>2.9);assert.equal(g.time,t);
  step(g,3.1);assert.equal(g.checkKoRestart(),-1);assert.equal(g.dummy.hp,100);
});
test('rival confirmed combo hits are spaced like a human could tap them',()=>{
  const g=new Game();g.reset('light');const times=[];
  for(let i=0;i<120*40;i++){g.tick(1/120);g.player.hp=100000;g.player.invulnerableUntil=0;
    for(const e of g.events.splice(0))if(e.type==='enemyHit')times.push(e.time);}
  const gaps=times.slice(1).map((t,i)=>t-times[i]).filter(x=>x<1);
  assert.ok(gaps.length>10);
  gaps.sort((x,y)=>x-y);
  // The Enemy Step route deliberately skips the extra delay (its air position drifts otherwise), so allow ~0.2 s there.
  assert.ok(gaps[0]>=.2,`fastest combo gap ${gaps[0]}`);
  assert.ok(gaps[gaps.length>>1]>=.3,`median combo gap ${gaps[gaps.length>>1]}`);
  assert.ok(DEFENSE.comboDelay>0&&DEFENSE.chainTell>0);
});
