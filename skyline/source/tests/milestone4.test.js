import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {routePress} from '../src/input.js';
import {Resources,FOCUS} from '../src/resources.js';
import {Style,STYLE,rankFor} from '../src/style.js';
import {SKILLS,skillReady,skillCooldownLeft} from '../src/skills.js';
import {MOVES} from '../src/moves.js';
const step=(g,s,dt=1/120)=>{for(let t=0;t<s;t+=dt)g.tick(dt);};
const until=(g,p,timeout=2)=>{for(let t=0;t<timeout;t+=1/120){if(p())return;g.tick(1/120);}assert.ok(p(),'condition reached');};
const hit=(g,dir={x:0,y:0})=>{const n=g.hits;g.press('Attack',dir);until(g,()=>g.hits>n);step(g,.035);};
const skillHit=g=>{const n=g.hits;g.press('Skill');until(g,()=>g.hits>n);};

test('Down + Block routes to Skill; plain Block stays Block',()=>{
  assert.equal(routePress('Guard',{x:0,y:-1}),'Skill');
  assert.equal(routePress('Guard',{x:0,y:0}),'Guard');
  assert.equal(routePress('Guard',{x:1,y:1}),'Guard');
  assert.equal(routePress('Dodge',{x:0,y:-1}),'Dodge');
});

test('Skill starts immediately, ground and air variants, cooldown starts once',()=>{
  let g=new Game();g.press('Skill');
  assert.equal(g.action.id,'G_RisingPhoenix');assert.ok(Math.abs(skillCooldownLeft(g.player,g.time)-7)<1e-9);
  assert.ok(g.performed.has('G_RisingPhoenix'));
  g=new Game();g.player.y=80;g.player.grounded=false;g.press('Skill');
  assert.equal(g.action.id,'A_RisingPhoenix');assert.ok(g.performed.has('A_RisingPhoenix'));
});

test('cooldown is shared, rejected presses do not restart it or fall back to another action',()=>{
  const g=new Game();g.press('Skill');g.release('Skill');step(g,1);
  const ready=g.player.skillReadyAt;g.action=null;
  g.press('Skill');
  assert.equal(g.action,null);assert.equal(g.player.skillReadyAt,ready);
  assert.ok(g.events.some(e=>e.type==='skillRejected'));
  assert.equal(g.player.guarding,false);assert.equal(g.lastMove,'G_RisingPhoenix');
  g.player.y=60;g.player.grounded=false; // air variant shares the same cooldown
  g.press('Skill');assert.equal(g.action,null);
  step(g,6.2);g.release('Skill');g.player.y=60;g.player.grounded=false;g.player.vy=0;g.press('Skill');
  assert.equal(g.action?.id,'A_RisingPhoenix');
});

test('holding Skill does not recast when cooldown ends; a fresh press is required',()=>{
  const g=new Game();g.press('Skill');step(g,7.5);
  assert.ok(skillReady(g.player,g.time));
  assert.equal(g.action,null);assert.equal(g.events.filter(e=>e.type==='move'&&e.id==='G_RisingPhoenix').length,1);
});

test('whiff after start still spends cooldown; input rejected before start does not',()=>{
  let g=new Game();g.dummy.x=800;g.press('Skill');step(g,.6);
  assert.ok(g.player.skillReadyAt>g.time);
  g=new Game();g.player.hurtUntil=5;g.press('Skill');step(g,.3);
  assert.equal(g.player.skillReadyAt||0,0);assert.equal(g.action,null);
});

test('Skill cancels a light attack only after a confirmed hit',()=>{
  let g=new Game();g.dummy.x=800;g.press('Attack');step(g,.1);g.press('Skill');step(g,.05);
  assert.notEqual(g.action?.id,'G_RisingPhoenix');assert.equal(g.player.skillReadyAt||0,0);
  g=new Game();hit(g);g.press('Skill');step(g,.03);
  assert.equal(g.action.id,'G_RisingPhoenix');
});

test('Phoenix launches, lifts the player and allows Air Chase',()=>{
  const g=new Game();skillHit(g);
  assert.equal(g.dummy.state,'Launched');assert.ok(g.player.y>0&&!g.player.grounded);
  step(g,.05);g.press('Jump');until(g,()=>!!g.chase);
  assert.ok(g.performed.has('A_Chase'));
});

test('Focus: one reward per hit, categories, repetition, clamp',()=>{
  const r=new Resources();
  assert.equal(r.award('hit','G_Light1','h1'),4);assert.equal(r.award('hit','G_Light1','h1'),0);
  assert.equal(r.award('hit','G_Light1','h2'),2);assert.equal(r.award('hit','G_Light1','h3'),1);assert.equal(r.award('hit','G_Light1','h4'),0);
  assert.equal(r.award('launch','G_Launcher','h5'),8);
  assert.equal(r.award('hit','G_Light1','h6'),4);
  assert.equal(r.award('finisher','F_PhoenixBreak','h7'),0);
  for(let i=0;i<40;i++)r.award('step','s'+i,'x'+i);
  assert.equal(r.focus,FOCUS.max);
});

test('Focus from real hits; blocked or dodged strikes earn nothing',()=>{
  const g=new Game();hit(g);assert.equal(g.resources.player.focus,4);
  const b=new Game();b.dummy.guarding=true;b.dummy.guard=100;b.press('Attack');step(b,.4);
  assert.equal(b.resources.player.focus,0);assert.ok(b.dummy.hp===b.dummy.maxHp);
  const s=new Game();skillHit(s);assert.equal(s.resources.player.focus,6);
});

test('Focus: launcher gives launch credit only; armor-resisted launcher gives plain hit credit',()=>{
  let g=new Game();g.press('Attack',{x:0,y:1});until(g,()=>g.hits>0);assert.equal(g.resources.player.focus,8);
  g=new Game();g.reset('armored');g.press('Attack',{x:0,y:1});until(g,()=>g.hits>0);
  assert.equal(g.dummy.state==='Launched',false);assert.equal(g.resources.player.focus,4);
});

function finisherSetup(focus=100){const g=new Game();g.resources.player.focus=focus;return g;}
const markerTime=SKILLS.RisingPhoenix.marker;

test('held Skill finisher spends exactly 100 Focus once and finisher hit refunds nothing',()=>{
  const g=finisherSetup();g.press('Skill');
  until(g,()=>g.action?.id==='F_PhoenixBreak');
  assert.equal(g.resources.player.focus,0);assert.ok(g.performed.has('F_PhoenixBreak'));
  const hp=g.dummy.hp;until(g,()=>g.hits>=2,3);
  assert.ok(g.dummy.hp<hp);assert.equal(g.resources.player.focus,0);
  step(g,1);assert.equal(g.events.filter(e=>e.type==='finisher').length,1);
  assert.equal(g.player.skillReadyAt>g.time-8,true); // cooldown is not charged again by the finisher
});

test('finisher rejects: early release, low Focus, unrelated later press, whiff, dead target',()=>{
  let g=finisherSetup();g.press('Skill');g.release('Skill');step(g,.6);
  assert.equal(g.resources.player.focus,100);assert.equal(g.events.some(e=>e.type==='finisher'),false);
  g=finisherSetup(90);g.press('Skill');step(g,.6);
  assert.equal(g.resources.player.focus,96);assert.equal(g.events.some(e=>e.type==='finisher'),false);
  g=finisherSetup();g.press('Skill');g.release('Skill');g.press('Skill'); // second, rejected press is held at the marker
  step(g,.6);assert.equal(g.events.some(e=>e.type==='finisher'),false);assert.equal(g.resources.player.focus>=100,true);
  g=finisherSetup();g.dummy.x=800;g.press('Skill');step(g,.6);
  assert.equal(g.events.some(e=>e.type==='finisher'),false);assert.equal(g.resources.player.focus,100);
  g=finisherSetup();g.dummy.hp=1;g.press('Skill');step(g,.6);
  assert.equal(g.dummy.hp,0);assert.equal(g.events.some(e=>e.type==='finisher'),false);assert.ok(g.resources.player.focus>=100);
});

test('marker crossing fires at most once at different simulation cadences',()=>{
  for(const dt of [1/120,1/60,1/30,1/15]){
    const g=finisherSetup();g.press('Skill');step(g,1,dt);
    assert.equal(g.events.filter(e=>e.type==='finisher').length,1,'dt '+dt);
  }
});

test('interrupted skill does not become a finisher and spends no Focus',()=>{
  const g=finisherSetup();g.press('Skill');step(g,.05);g.action=null; // interrupted (e.g. hit reaction)
  step(g,.6);assert.equal(g.resources.player.focus,100);assert.equal(g.events.some(e=>e.type==='finisher'),false);
});

test('finisher cannot be cancelled by Dodge, Attack, Jump',()=>{
  const g=finisherSetup();g.press('Skill');until(g,()=>g.action?.id==='F_PhoenixBreak');
  g.press('Dodge');g.press('Attack');g.press('Jump');assert.equal(g.action.id,'F_PhoenixBreak');
});

test('player and rival Focus and cooldowns are independent',()=>{
  const g=new Game();g.reset('light');g.player.hp=1000;g.dummy.routeIndex=8;g.dummy.skillReadyAt=0;
  step(g,2.2);
  assert.ok(g.events.some(e=>e.type==='enemyHit'&&e.id==='G_RisingPhoenix'));
  assert.ok(g.resources.rival.focus>0);assert.equal(g.resources.player.focus,0);
  assert.ok(g.dummy.skillReadyAt>0);assert.equal(g.player.skillReadyAt||0,0);
});

test('rival will not use Phoenix on cooldown and picks another route',()=>{
  const g=new Game();g.reset('light');g.player.hp=1000;g.dummy.routeIndex=8;g.dummy.skillReadyAt=999;
  step(g,2.5);
  assert.equal(g.events.some(e=>e.type==='enemyMove'&&e.id==='G_RisingPhoenix'),false);
  assert.ok(g.events.some(e=>e.type==='enemyMove'));
});

test('rival air Phoenix route hits and relaunches',()=>{
  const g=new Game();g.reset('light');g.player.hp=1000;g.dummy.routeIndex=9;
  step(g,3);
  const hits=g.events.filter(e=>e.type==='enemyHit').map(e=>e.id);
  assert.ok(hits.includes('A_RisingPhoenix'));assert.ok(hits.includes('A_Plunge'));
});

test('a guarding target blocks Phoenix: higher guard cost, no damage, no Focus, no launch',()=>{
  const g=new Game();g.dummy.guarding=true;g.dummy.guard=100;
  g.press('Skill');step(g,.5);
  assert.equal(g.dummy.guard,70);assert.equal(g.dummy.hp,g.dummy.maxHp);
  assert.equal(g.resources.player.focus,0);assert.equal(g.dummy.state,'Neutral');
});

test('style: rank thresholds, repetition, variety, damage penalty, idle decay, independence from Focus',()=>{
  assert.deepEqual(['D','C','B','A','S','SS'],[0,50,120,220,350,500].map(rankFor));
  assert.equal(rankFor(49),'D');assert.equal(rankFor(499),'S');
  const s=new Style();
  assert.equal(s.record('hit','G_Light1',1,'a'),15);   // 10 + variety 5
  assert.equal(s.record('hit','G_Light1',1.1,'b'),5);  // repeat x0.5, no variety
  assert.equal(s.record('hit','G_Light1',1.2,'c'),3);  // repeat x0.25 = 2.5 -> 3
  assert.equal(s.record('hit','G_Light1',1.3,'d'),0);
  assert.equal(s.record('hit','G_Light1',1.3,'d'),0);  // duplicate id
  s.score=0;s.rank='D';s.lastEventAt=0;s.set(130,0);assert.equal(s.rank,'B');
  s.penalize(1);assert.equal(s.score,90);assert.equal(s.rank,'C');
  s.penalize(1);s.penalize(1);s.penalize(1);assert.equal(s.score,0);
  s.set(100,10);s.lastEventAt=10;s.tick(11.9,.1);assert.equal(s.score,100);
  s.tick(12.5,.5);assert.equal(s.score,95);
  const g=new Game();g.resources.player.focus=100;g.press('Skill');step(g,.6);
  assert.ok(g.style.score>0);
});

test('real damage taken costs style; combat events never leak between actors',()=>{
  const g=new Game();g.reset('light');g.player.hp=1000;g.style.set(100,0);g.style.lastEventAt=0;
  step(g,.7);assert.ok(g.style.score<100);
  assert.equal(g.resources.player.focus,0);
});

test('reset clears focus, style, cooldown, holds and hit history',()=>{
  const g=new Game();g.resources.player.focus=50;g.press('Skill');g.style.set(300,0);
  g.reset();
  assert.equal(g.resources.player.focus,0);assert.equal(g.style.score,0);assert.equal(g.skillHeld,0);
  assert.ok(skillReady(g.player,g.time));assert.equal(g.resources.player.seen.size,0);
});

test('release and clear leave no sticky Skill hold',()=>{
  const g=new Game();g.press('Skill');assert.ok(g.skillHeld>0);g.release('Skill');assert.equal(g.skillHeld,0);
  g.press('Guard');g.release('Guard');assert.equal(g.guardHeld,false);
});
