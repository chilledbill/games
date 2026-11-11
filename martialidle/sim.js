/* =====================================================================
   sim.js  -  game logic, driven entirely by CONTENT (see content.js).
   No THREE, no DOM: runs in a browser or in Node, and ports to Godot as-is.
   x = left/right, z = depth lane. Time inside attacks is counted in FRAMES (60/s).
   ===================================================================== */
let CONTENT=null, SET={}, HERO_DEF={}, HM={}, EN={}, ATK={}, FX={}, UPG=[], BRANCHES=[], PROPS={}, MODELS={};
let ARENA_X=12, ZMAX=2.3;
const LANES=[0,-.65,.65], FPS=60;
const KINDS=['melee','projectile','burst','charge','heal','teleport'];
const AIS=['melee','ranged','support','rusher','dummy'];
const FX_TYPES=['sparks','slash','ring','glow','shake','flash','text','smoke','rise','telegraph'];
const STAT_NAMES=['damage','attackScale','reach','cleave','maxHp','armor','chiMult','focusGain','move','regen','crit','critMult','finisherMult','blastMult','dodge','thorns','revives','offline','sweep','spirit'];

function applyContent(c){
  CONTENT=c; SET=c.settings; HERO_DEF=c.hero; HM=c.hero.moves; ATK=c.attacks; FX=c.effects; UPG=c.upgrades; BRANCHES=c.branches;
  PROPS=c.props||(c.props={}); MODELS=c.models||(c.models={});
  EN=Object.assign({},c.enemies,{__dummy:{name:'Dummy',hp:1e9,speed:0,damage:0,scale:1,chi:0,unlock:0,weight:0,ai:'dummy',tint:'#cfcfcf',model:'hero',props:[],attacks:[]}});
  ARENA_X=SET.arenaX; ZMAX=SET.zMax;
  return validateContent(c);
}

/* ---------- validation (also used by the editor) ---------- */
function validateContent(c){
  const out=[], err=(where,msg)=>out.push({level:'error',where,msg}), warn=(where,msg)=>out.push({level:'warn',where,msg});
  const num=(v)=>typeof v==='number'&&isFinite(v);
  const fxIds=ids=>Array.isArray(ids)?ids:[];
  const needFx=(where,ids)=>fxIds(ids).forEach(id=>{ if(!c.effects[id]) err(where,'effect "'+id+'" does not exist'); });
  if(!c.settings||!c.hero||!c.attacks||!c.effects||!c.enemies||!c.upgrades) { err('file','missing a top-level section (settings, hero, attacks, effects, enemies, upgrades)'); return out; }
  for(const k of ['arenaX','zMax','hpGrowth','dmgGrowth','chiGrowth','waveBase','wavePerLevel','waveMax','maxAlive','spawnGap','bossEvery','offlineBase','blastBase']) if(!num(c.settings[k])) err('settings.'+k,'must be a number');
  const h=c.hero;
  for(const k of ['hp','damage','reach','move']) if(!num(h[k])||h[k]<=0) err('hero.'+k,'must be a positive number');
  if(!Array.isArray(h.combo)||!h.combo.length) err('hero.combo','needs at least one move');
  for(const id of h.combo||[]) { const m=h.moves[id]; if(!m) err('hero.combo','move "'+id+'" does not exist'); else if(!(m.active>=1)||!(m.startup>=0)||!(m.recovery>=0)) err('hero.moves.'+id,'startup/active/recovery must be numbers (active at least 1)'); }
  for(const id of ['click','parry','blast']) if(!h.moves[id]) err('hero.moves.'+id,'required move is missing');
  for(const [id,m] of Object.entries(h.moves)){ needFx('hero.moves.'+id+'.onSwing',m.onSwing); needFx('hero.moves.'+id+'.onHit',m.onHit); needFx('hero.moves.'+id+'.onUse',m.onUse); }
  for(const p of h.props||[]) if(!(c.props||{})[p]) err('hero.props','prop "'+p+'" does not exist');
  if(!(c.models||{})[h.model]) err('hero.model','model "'+h.model+'" is not in models');
  for(const [k,v] of Object.entries(c.settings.fxDefaults||{})) if(!c.effects[v]) err('settings.fxDefaults.'+k,'effect "'+v+'" does not exist');
  for(const [id,a] of Object.entries(c.attacks)){
    const w='attacks.'+id;
    if(!KINDS.includes(a.kind)) err(w+'.kind','unknown kind "'+a.kind+'" (use '+KINDS.join(', ')+')');
    for(const k of ['startup','recovery']) if(!num(a[k])||a[k]<0) err(w+'.'+k,'must be 0 or more frames');
    if(!num(a.active)||a.active<1) err(w+'.active','must be at least 1 frame');
    if(a.kind==='melee'||a.kind==='charge'){ if(!a.hitbox||!num(a.hitbox.reachX)||!num(a.hitbox.halfZ)) err(w+'.hitbox','needs reachX and halfZ'); }
    if(a.kind==='projectile'&&!num(a.speed)) err(w+'.speed','projectiles need a speed');
    if(a.kind==='charge'&&!num(a.speed)) err(w+'.speed','charges need a speed');
    if(a.kind==='burst'&&!num(a.radius)) err(w+'.radius','bursts need a radius');
    if(a.kind==='heal'&&!num(a.heal)) err(w+'.heal','heals need a heal fraction (0.3 = 30%)');
    if(a.then&&!c.attacks[a.then]) err(w+'.then','attack "'+a.then+'" does not exist');
    needFx(w+'.onStart',a.onStart); needFx(w+'.onActive',a.onActive); needFx(w+'.onHit',a.onHit); needFx(w+'.telegraph',a.telegraph);
    if(a.damage!==undefined&&!num(a.damage)) err(w+'.damage','must be a number');
    if(a.startup+a.active+a.recovery>600) warn(w,'the whole attack lasts over 10 seconds');
  }
  for(const [id,e] of Object.entries(c.enemies)){
    const w='enemies.'+id;
    for(const k of ['hp','speed','scale']) if(!num(e[k])||e[k]<=0) err(w+'.'+k,'must be a positive number');
    for(const k of ['damage','chi','unlock','weight']) if(e[k]!==undefined&&!num(e[k])) err(w+'.'+k,'must be a number');
    if(!AIS.includes(e.ai||'melee')) err(w+'.ai','unknown ai "'+e.ai+'" (use '+AIS.join(', ')+')');
    if(!/^#[0-9a-fA-F]{6}$/.test(e.tint||'')) err(w+'.tint','must be a color like #8fe89a');
    if(!(c.models||{})[e.model||'hero']) err(w+'.model','model "'+e.model+'" is not in models');
    for(const p of e.props||[]) if(!(c.props||{})[p]) err(w+'.props','prop "'+p+'" does not exist');
    if(e.onDeath&&!c.attacks[e.onDeath]) err(w+'.onDeath','attack "'+e.onDeath+'" does not exist');
    if(!(e.attacks||[]).length&&(e.ai||'melee')!=='dummy') warn(w+'.attacks','this enemy has no attacks');
    for(const en of e.attacks||[]){ if(!c.attacks[en.use]) err(w+'.attacks','attack "'+en.use+'" does not exist'); else if(en.range&&(!Array.isArray(en.range)||en.range.length!==2)) err(w+'.attacks','range must be [min, max]'); }
    if(id!=='boss'&&e.unlock>=1&&!(e.weight>0)) warn(w+'.weight','weight is 0, so this enemy will never spawn');
  }
  const ids=new Set(), brs=new Set((c.branches||[]).map(b=>b[0]));
  for(const u of c.upgrades){
    const w='upgrades.'+u.id;
    if(ids.has(u.id)) err(w,'duplicate upgrade id'); ids.add(u.id);
    if(!brs.has(u.branch)) err(w+'.branch','branch "'+u.branch+'" does not exist');
    if(!num(u.baseCost)||!num(u.growth)||!num(u.max)) err(w,'baseCost, growth and max must be numbers');
    for(const m of u.mods||[]){ if(!STAT_NAMES.includes(m.stat)) err(w+'.mods','unknown stat "'+m.stat+'"'); if(!['add','addPct','pow'].includes(m.op)) err(w+'.mods','op must be add, addPct or pow'); if(!num(m.value)) err(w+'.mods','value must be a number'); }
  }
  for(const u of c.upgrades) for(const r of Object.keys(u.requires||{})) if(!ids.has(r)) err('upgrades.'+u.id+'.requires','upgrade "'+r+'" does not exist');
  for(const [id,fx] of Object.entries(c.effects)) for(const p of (Array.isArray(fx)?fx:[fx])) if(!FX_TYPES.includes(p.type)) err('effects.'+id,'unknown effect type "'+p.type+'" (use '+FX_TYPES.join(', ')+')');
  for(const [id,p] of Object.entries(c.props||{})){ if(p.bone&&!Object.values(c.models||{}).some(m=>m.bones&&m.bones[p.bone])) warn('props.'+id+'.bone','no model maps the bone "'+p.bone+'"'); }
  return out;
}

/* ---------- upgrades / stats ---------- */
const upCost=(u,l)=>Math.ceil(u.baseCost*Math.pow(u.growth,l));
const unlocked=(s,u)=>!u.requires||Object.keys(u.requires).every(k=>(s.up[k]||0)>=u.requires[k]);
const reqText=u=>u.requires?Object.keys(u.requires).map(k=>(UPG.find(x=>x.id===k)||{name:k}).name+' '+u.requires[k]).join(', '):'';
const levelSum=s=>Object.values(s.up).reduce((a,b)=>a+b,0);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const targetable=e=>e.state!=='dying'&&!e.hidden;

function stats(s){
  const st={damage:HERO_DEF.damage,attackScale:1,reach:HERO_DEF.reach,cleave:1,maxHp:HERO_DEF.hp,armor:0,chiMult:1,focusGain:1,move:HERO_DEF.move,regen:0,
    crit:0,critMult:2.5,finisherMult:1,blastMult:SET.blastBase,dodge:0,thorns:0,revives:0,offline:SET.offlineBase,sweep:0,spirit:0};
  for(const pass of ['add','addPct','pow']) for(const u of UPG){
    const l=s.up[u.id]||0; if(!l) continue;
    for(const m of u.mods||[]){
      if(m.op!==pass) continue; const n=m.per?Math.floor(l/m.per):l;
      if(pass==='add') st[m.stat]=(st[m.stat]||0)+m.value*n;
      else if(pass==='addPct') st[m.stat]*=(1+m.value*n);
      else st[m.stat]*=Math.pow(m.value,n);
    }
  }
  for(const u of UPG) if(s.up[u.id]) for(const m of u.mods||[]) if(m.cap!==undefined) st[m.stat]=Math.min(st[m.stat],m.cap);
  return st;
}

/* ---------- sim state ---------- */
function newSim(save){
  const s={ phase:'meditate', wave:save.wave||1, best:save.best||1, chi:save.chi||0, up:Object.assign({},save.up||{}), auto:!!save.auto,
    p:{x:0,z:0,hp:100,face:1,atk:null,comboIdx:0,wait:0,inv:0},
    enemies:[], shots:[], queue:[], nextId:1, spawnT:0, focus:0, spiritT:2, hitstop:0, medT:0, defeated:false,
    kills:save.kills||0, earned:save.earned||0, lastBonus:0, revivesLeft:0, events:[], st:null, sandbox:null };
  s.st=stats(s); s.p.hp=s.st.maxHp;
  startWave(s);
  return s;
}

function waveTypes(w){
  const out=[];
  for(const t in EN){ const d=EN[t]; if(t.startsWith('__')||!d.unlock) continue; if(w>=d.unlock) out.push([t,(d.weight||0)*(w===d.unlock&&w>1?2.4:1)]); }
  return out;
}

function startWave(s){
  s.phase='fight'; s.defeated=false; s.enemies.length=0; s.shots.length=0;
  const w=s.wave, n=Math.min(SET.waveMax,SET.waveBase+Math.floor(w*SET.wavePerLevel)), q=[], pool=waveTypes(w), counts={};
  for(let i=0;i<n;i++){
    let tot=0; for(const [,wt] of pool) tot+=wt;
    let r=Math.random()*tot, pick=pool.length?pool[0][0]:'thug';
    for(const [t,wt] of pool){ r-=wt; if(r<=0){pick=t;break;} }
    const d=EN[pick]; if(d.maxPerWave&&(counts[pick]||0)>=d.maxPerWave) pick=pool[0]?pool[0][0]:pick;
    counts[pick]=(counts[pick]||0)+1; q.push(pick);
  }
  for(const t in EN) if(EN[t].unlock===w&&w>1&&!t.startsWith('__')&&!q.includes(t)) q[Math.min(q.length-1,2+Math.floor(Math.random()*3))]=t; // the new enemy always shows up
  if(SET.bossEvery&&w%SET.bossEvery===0&&EN.boss) q.splice(Math.floor(q.length/2),0,'boss');
  s.queue=q; s.spawnT=.4; s.p.x=0; s.p.z=0; s.p.atk=null; s.p.wait=0; s.p.inv=0; s.revivesLeft=s.st.revives;
  const bn=SET.bossNames||['Boss'];
  s.events.push({t:'wave',wave:w,boss:SET.bossEvery&&w%SET.bossEvery===0,bossName:bn[(Math.floor(w/SET.bossEvery)-1+bn.length*99)%bn.length]});
  for(const t in EN) if(EN[t].unlock===w&&w>1&&!t.startsWith('__')) s.events.push({t:'intro',type:t});
}

function makeEnemy(s,type,x,z){
  const d=EN[type], w=s.wave, hm=Math.pow(SET.hpGrowth,w-1);
  return {id:s.nextId++,type,side:x>=0?1:-1,x,z,vx:0,vz:0,hp:d.hp*hm,maxHp:d.hp*hm,state:'walk',t:0,f:0,atk:null,acd:{},gap:.3+Math.random()*.8+(d.ai==='ranged'?1:0),
    stun:0,flash:0,slot:0,parryT:-1,dmg:(d.damage||0)*Math.pow(SET.dmgGrowth,w-1),val:(d.chi||0)*Math.pow(SET.chiGrowth,w-1),
    exploded:false,hit:false,chargeDir:1,healId:0,tx:0,tz:0,hidden:false};
}
function spawnEnemy(s){
  const type=s.queue.shift(), side=Math.random()<.5?-1:1;
  s.enemies.push(makeEnemy(s,type,side*(ARENA_X+2),(Math.random()*2-1)*ZMAX));
}

/* ---------- damage ---------- */
function dmgEnemy(s,e,dmg,o){
  if(!targetable(e)) return;
  const def=EN[e.type]; let blocked=false, broke=false;
  if(def.guard&&e.state==='walk'){ if(o.breakGuard) broke=true; else { dmg*=def.guard.damageTaken; blocked=true; } }
  e.hp-=dmg; e.flash=.12; e.vx+=e.side*(o.kb||1)*(blocked?.3:1); e.vz+=(Math.random()-.5)*2.5;
  let stun=o.stun||0; if(broke) stun=Math.max(stun,(def.guard.breakStun||60)/FPS); if(blocked) stun=0;
  if(stun){ e.state='stun'; e.stun=stun; e.parryT=-1; e.atk=null; e.hidden=false; }
  s.hitstop=Math.max(s.hitstop,blocked?.01:(o.hs||.03));
  s.events.push({t:'hit',x:e.x,z:e.z,dir:-e.side,dmg,blocked,crit:!!o.crit,big:!!o.big,fx:o.fx||[]});
  if(broke) s.events.push({t:'guardbreak',x:e.x,z:e.z});
  if(e.hp<=0){
    e.state='dying'; e.t=0; e.vx=e.side*(4+(o.kb||0)); e.atk=null; e.hidden=false;
    const c=e.val*s.st.chiMult; s.chi+=c; s.earned+=c; s.kills++;
    s.events.push({t:'kill',x:e.x,z:e.z,chi:c});
    if(def.onDeath&&!e.exploded&&ATK[def.onDeath]){ e.exploded=true; doBurst(s,e,ATK[def.onDeath]); const a=ATK[def.onDeath]; if(a.onActive&&a.onActive.length) s.events.push({t:'fx',ids:a.onActive,x:e.x,z:e.z,dir:-e.side,tx:s.p.x,tz:s.p.z}); }
  }
}

function hurtHero(s,d,src,a){
  const p=s.p;
  if(p.inv>0) return;
  if(Math.random()<s.st.dodge){ s.events.push({t:'dodge'}); return; }
  const dd=d*(1-s.st.armor);
  p.hp-=dd; s.events.push({t:'playerHit',dmg:dd,fx:(a&&a.onHit)||[]});
  if(a&&a.hitstop) s.hitstop=Math.max(s.hitstop,a.hitstop/FPS);
  if(src&&s.st.thorns>0&&targetable(src)) dmgEnemy(s,src,dd*s.st.thorns,{kb:0,hs:0});
  if(p.hp<=0) heroDown(s);
}
function heroDown(s){
  if(s.sandbox){ s.p.hp=s.st.maxHp; return; }
  if(s.revivesLeft>0){ s.revivesLeft--; s.p.hp=s.st.maxHp*.4; s.p.inv=1.2; s.events.push({t:'revive'}); return; }
  defeat(s);
}
function defeat(s){
  s.phase='meditate'; s.defeated=true; s.medT=0; s.queue=[]; s.focus=0; s.shots.length=0; s.p.atk=null;
  s.enemies.forEach(e=>{e.state='dying';e.t=.2;e.hidden=false;e.atk=null;});
  s.p.hp=s.st.maxHp; s.events.push({t:'defeat'});
}
function winWave(s){
  const w=s.wave, bonus=(5+2*w)*s.st.chiMult*Math.pow(SET.chiGrowth,w-1);
  s.chi+=bonus; s.earned+=bonus; s.lastBonus=bonus; s.best=Math.max(s.best,w); s.wave++;
  s.phase='meditate'; s.medT=0; s.defeated=false; s.p.hp=s.st.maxHp; s.shots.length=0; s.p.atk=null;
  s.events.push({t:'win',wave:w,chi:bonus});
}

/* ---------- enemy attacks (frame data) ---------- */
const parryRoll=s=>(s.st.spirit>0&&Math.random()<Math.min(.85,.15+.1*s.st.spirit))?.2+Math.random()*.15:-1; // Spirit Hands can auto-parry
function stepToward(e,tx,tz,spd,dt){
  const dx=tx-e.x, dz=tz-e.z, d=Math.hypot(dx,dz);
  if(d>.05){const m=Math.min(d,spd*dt); e.x+=dx/d*m; e.z+=dz/d*m;}
  return d;
}
function healTarget(s,e){
  let best=null,bd=1;
  for(const o of s.enemies){
    if(o===e||!targetable(o)||o.type==='healer'||o.type==='__dummy'&&o.hp>=o.maxHp) continue;
    const f=o.hp/o.maxHp;
    if(f<.8&&Math.hypot(o.x-e.x,o.z-e.z)<=9&&f<bd){bd=f;best=o;}
  }
  return best;
}

function tryAttack(s,e,def){
  const p=s.p, dx=Math.abs(e.x-p.x), dz=Math.abs(e.z-p.z), sb=s.sandbox;
  if(sb&&sb.attack){ if(!e.atk&&e.gap<=0&&ATK[sb.attack]) startAttack(s,e,sb.attack); return; }
  const opts=[]; let tot=0;
  for(const en of def.attacks||[]){
    const a=ATK[en.use]; if(!a||(e.acd[en.use]||0)>0) continue;
    const k=a.kind||'melee', hb=a.hitbox||{reachX:2.3,halfZ:.7};
    const r=en.range||[0,(k==='melee'||k==='charge'?hb.reachX:2.3)-.2];
    if(dx<r[0]||dx>r[1]) continue;
    if(en.whenHpBelow!==undefined&&e.hp/e.maxHp>en.whenHpBelow) continue;
    const zt=en.zTol!==undefined?en.zTol:(k==='melee'?hb.halfZ-.15:(k==='projectile'?1.1:99));
    if(dz>zt) continue;
    if(k==='melee'&&(def.ai||'melee')==='melee'&&e.slot>=2) continue;      // only the two front enemies on each side attack
    if(k==='heal'&&!healTarget(s,e)) continue;
    opts.push([en,en.weight||1]); tot+=en.weight||1;
  }
  if(!opts.length) return;
  let r=Math.random()*tot, pick=opts[0][0];
  for(const [en,w] of opts){ r-=w; if(r<=0){pick=en;break;} }
  startAttack(s,e,pick.use);
}

function startAttack(s,e,id){
  const a=ATK[id], p=s.p; e.atk=id; e.state='windup'; e.f=0; e.hit=false;
  e.parryT=(a.parryable!==false&&a.kind!=='teleport')?parryRoll(s):-1;
  if(a.kind==='heal'){ const t=healTarget(s,e); e.healId=t?t.id:0; if(t){e.tx=t.x;e.tz=t.z;} }
  if(a.kind==='teleport'){ const away=e.x>=p.x?1:-1; e.tx=clamp(p.x-away*(a.behind||1.4),-ARENA_X,ARENA_X); e.tz=clamp(p.z+(Math.random()-.5)*.5,-ZMAX,ZMAX); e.hidden=!!a.invisible; }
  if(a.onStart&&a.onStart.length) s.events.push({t:'fx',ids:a.onStart,x:e.x,z:e.z,dir:e.x>=p.x?-1:1,tx:a.kind==='teleport'||a.kind==='heal'?e.tx:p.x,tz:a.kind==='teleport'||a.kind==='heal'?e.tz:p.z});
}

function doBurst(s,e,a){
  const p=s.p, R=a.radius||2.2, zR=a.zRadius||R*.6;
  if(a.hitsEnemies) for(const o of s.enemies){ if(o===e||!targetable(o)) continue; if(Math.hypot(o.x-e.x,(o.z-e.z)*1.4)<=R) dmgEnemy(s,o,e.dmg*(a.enemyDamage||1),{kb:a.knockback||4,hs:0}); }
  if(a.hitsHero!==false&&Math.abs(p.x-e.x)<=R&&Math.abs(p.z-e.z)<=zR) hurtHero(s,e.dmg*(a.damage||1),e,a);
}

function meleeCheck(s,e,a){
  const p=s.p, hb=a.hitbox, dir=e.x>=p.x?-1:1;
  if(Math.abs(p.x-(e.x+dir*(hb.offsetX||0)))<=hb.reachX&&Math.abs(p.z-e.z)<=hb.halfZ){ e.hit=true; hurtHero(s,e.dmg*(a.damage||1),e,a); }
}

function beginActive(s,e,a){
  const p=s.p, dir=e.x>=p.x?-1:1;
  switch(a.kind){
    case 'melee': e.hit=false; meleeCheck(s,e,a); break;
    case 'projectile': s.shots.push({x:e.x,z:e.z,vx:dir*(a.speed||14),dmg:e.dmg*(a.damage||1),atk:e.atk,t:0}); break;
    case 'burst': doBurst(s,e,a); if(a.selfDestruct){ e.exploded=true; e.state='dying'; e.t=0; e.vx=0; e.atk=null; } break;
    case 'charge': e.chargeDir=(p.x>=e.x?1:-1); e.hit=false; break;
    case 'heal': { const t=s.enemies.find(o=>o.id===e.healId&&targetable(o)); if(t){ t.hp=Math.min(t.maxHp,t.hp+t.maxHp*(a.heal||.3)); e.tx=t.x; e.tz=t.z; } break; }
    case 'teleport': e.x=e.tx; e.z=e.tz; e.hidden=false; e.side=e.x>=p.x?1:-1; break;
  }
  if(a.onActive&&a.onActive.length) s.events.push({t:'fx',ids:a.onActive,x:e.x,z:e.z,dir:e.x>=p.x?-1:1,tx:a.kind==='heal'?e.tx:p.x,tz:a.kind==='heal'?e.tz:p.z});
}

function attackTick(s,e,dt){
  const a=ATK[e.atk]; if(!a){ e.atk=null; e.state='walk'; return; }
  const p=s.p, su=a.startup||0, ac=Math.max(1,a.active||1), tot=su+ac+(a.recovery||0);
  e.f+=dt*FPS;
  if(e.state==='windup'){
    if(a.track) e.z+=(clamp(p.z,-ZMAX,ZMAX)-e.z)*Math.min(1,3*dt);                // line up while winding up
    if(e.parryT>=0){ e.parryT-=dt; if(e.parryT<0){ e.parryT=-1; manualStrike(s,e.side,true,e.id); if(e.state!=='windup') return; } }
    if(e.f>=su){ e.state='active'; beginActive(s,e,a); if(!e.atk||e.state==='dying') return; }
  }
  if(e.state==='active'){
    if(a.kind==='melee'&&!e.hit) meleeCheck(s,e,a);
    if(a.kind==='charge'){
      e.x+=e.chargeDir*(a.speed||16)*dt;
      if(!e.hit&&Math.abs(e.x-p.x)<=a.hitbox.reachX&&Math.abs(e.z-p.z)<=a.hitbox.halfZ){ e.hit=true; hurtHero(s,e.dmg*(a.damage||1),e,a); }
      if(Math.abs(e.x)>ARENA_X+2) e.f=Math.max(e.f,su+ac);
    }
    if(e.f>=su+ac){
      if(a.then&&ATK[a.then]){ e.acd[e.atk]=(a.cooldown||0)/FPS; startAttack(s,e,a.then); return; }   // chain straight into the next attack
      e.state='recover';
    }
  }
  if(e.state==='recover'&&e.f>=tot){ e.acd[e.atk]=(a.cooldown||0)/FPS; e.gap=.25; e.atk=null; e.state='walk'; }
}

function moveAI(s,e,dt,def){
  const p=s.p, dxp=e.x-p.x, dist=Math.abs(dxp), away=dxp>=0?1:-1, ai=def.ai||'melee';
  if(ai==='ranged'||ai==='support'){
    const keep=def.keep||[4.2,7];
    let tx=p.x+away*(dist<keep[0]?keep[1]+2.5:keep[1]), tz=def.lineUp===false?clamp(e.z,-ZMAX,ZMAX):clamp(p.z+((e.id%3)-1)*.15,-ZMAX,ZMAX);
    stepToward(e,clamp(tx,-ARENA_X-1,ARENA_X+1),tz,def.speed,dt);
  } else if(ai==='rusher'){ stepToward(e,p.x,p.z,def.speed,dt);
  } else if(ai==='melee'){
    const stand=def.stand||1.3, row=Math.floor(e.slot/3);
    stepToward(e,p.x+e.side*(stand+row),clamp(p.z+LANES[e.slot%3],-ZMAX,ZMAX),def.speed,dt);
  }
}

function updEnemy(s,e,dt){
  const def=EN[e.type], p=s.p, sb=s.sandbox;
  e.x=clamp(e.x+e.vx*dt,-ARENA_X-3,ARENA_X+3); e.vx*=Math.exp(-7*dt);
  if(targetable(e)&&Math.abs(e.x-p.x)>.4) e.side=e.x>=p.x?1:-1;
  e.z=clamp(e.z+e.vz*dt,-ZMAX,ZMAX); e.vz*=Math.exp(-7*dt);
  e.flash=Math.max(0,e.flash-dt); e.gap-=dt; for(const k in e.acd) e.acd[k]-=dt;
  if(e.state==='dying'){ e.t+=dt; return; }
  if(e.state==='stun'){ e.stun-=dt; if(e.stun<=0){ e.state='walk'; e.gap=Math.max(e.gap,.3); } return; }
  if(e.atk){ attackTick(s,e,dt); return; }
  if((def.ai||'melee')==='dummy') return;
  if(!(sb&&sb.freeze)) moveAI(s,e,dt,def);
  if(e.gap<=0) tryAttack(s,e,def);
}

/* ---------- hero ---------- */
const hitOpts=(m,crit)=>({kb:m.knockback||1,stun:(m.stun||0)/FPS,hs:(m.hitstop||2)/FPS,breakGuard:!!m.breakGuard,crit,fx:m.onHit||[],big:!!(m.finisher||m.parry)});

function heroAttackStep(s,dt){
  const p=s.p, st=s.st;
  if(p.wait>0) p.wait-=dt;
  if(!p.atk){
    if(p.wait>0) return;
    let near=null,nd=1e9;
    for(const e of s.enemies){ if(!targetable(e)) continue; const d=Math.hypot(e.x-p.x,(e.z-p.z)*2);
      if(Math.abs(e.x-p.x)<=st.reach&&Math.abs(e.z-p.z)<=.65&&d<nd){near=e;nd=d;} }
    if(!near) return;
    const id=HERO_DEF.combo[p.comboIdx%HERO_DEF.combo.length]; p.comboIdx++;
    p.atk={id,f:0,hit:false,face:near.side}; p.face=near.side;
  }
  const a=p.atk, m=HM[a.id]; if(!m){ p.atk=null; return; }
  a.f+=dt*FPS/st.attackScale;
  if(!a.hit&&a.f>=m.startup){
    a.hit=true;
    const alive=s.enemies.filter(targetable), crit=Math.random()<st.crit, mul=(m.damage||1)*(m.finisher?st.finisherMult:1)*(crit?st.critMult:1);
    let n=0;
    const hitSide=sd=>alive.filter(e=>e.side===sd&&Math.abs(e.x-p.x)<=st.reach&&Math.abs(e.z-p.z)<=.65)
      .sort((x,y)=>Math.abs(x.x-p.x)-Math.abs(y.x-p.x)).slice(0,st.cleave).forEach(e=>{ n++; dmgEnemy(s,e,st.damage*mul,hitOpts(m,crit)); });
    hitSide(a.face); if(st.sweep>0) hitSide(-a.face);
    if(n) s.focus=Math.min(100,s.focus+(m.focus||4)*st.focusGain);
    s.events.push({t:'swing',move:a.id,face:a.face,sweep:st.sweep>0,x:p.x,z:p.z});
  }
  if(a.f>=m.startup+m.active+m.recovery) p.atk=null;
}

function manualStrike(s,side,free,tid){
  if(s.phase!=='fight') return;
  const st=s.st, p=s.p;
  if(!free&&p.wait>0&&p.manual) return;
  p.face=side;
  let c;
  if(tid){ const t=s.enemies.find(e=>e.id===tid&&targetable(e)); c=t&&Math.abs(t.x-p.x)<=8?[t]:[]; }   // clicked targets: Hero dashes up to 8 units
  else c=s.enemies.filter(e=>e.side===side&&targetable(e)&&Math.abs(e.x-p.x)<=st.reach+.6&&Math.abs(e.z-p.z)<=.9).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
  if(!c.length){ s.events.push({t:'whiff',face:side}); return; }
  const e=c[0];
  p.z=e.z; p.face=e.side; p.x=clamp(e.x-e.side*1.1,-ARENA_X,ARENA_X); p.atk=null; p.wait=.2; p.manual=true;
  const a=e.atk&&ATK[e.atk], parry=e.state==='windup'&&a&&a.parryable!==false&&a.kind!=='teleport';
  const m=parry?HM.parry:HM.click, crit=!parry&&Math.random()<st.crit;
  s.events.push({t:'swing',move:parry?'parry':'click',face:e.side,sweep:false,x:p.x,z:p.z});
  dmgEnemy(s,e,st.damage*(m.damage||1)*(crit?st.critMult:1),hitOpts(m,crit));
  s.focus=Math.min(100,s.focus+(m.focus||0)*st.focusGain);
}

function fireBlast(s){
  if(s.phase!=='fight'||s.focus<100) return false;
  const m=HM.blast; s.focus=0; s.events.push({t:'blast',x:s.p.x,z:s.p.z,fx:m.onUse||[]});
  s.enemies.filter(e=>targetable(e)&&Math.abs(e.x-s.p.x)<=14).forEach(e=>dmgEnemy(s,e,s.st.damage*s.st.blastMult,Object.assign(hitOpts(m,false),{big:true})));
  return true;
}

function heroUpdate(s,dt,canMove){
  const p=s.p, st=s.st;
  if(canMove){
    let tgt=null,bd=1e9;
    for(const e of s.enemies){ if(!targetable(e)) continue; let d=Math.hypot(e.x-p.x,(e.z-p.z)*2); if((EN[e.type].ai==='ranged')) d*=.6; if(d<bd){bd=d;tgt=e;} }
    if(tgt){
      const side=tgt.x>=p.x?1:-1, wantX=tgt.x-side*Math.min(1.2,st.reach*.65), mx=wantX-p.x, mz=tgt.z-p.z, d=Math.hypot(mx,mz);
      if(d>.08){const m=Math.min(d,st.move*dt); p.x+=mx/d*m; p.z+=mz/d*m;}
      p.face=side;
    } else { p.x+=(0-p.x)*Math.min(1,1.2*dt); p.z+=(0-p.z)*Math.min(1,2*dt); }
    p.x=clamp(p.x,-ARENA_X,ARENA_X); p.z=clamp(p.z,-ZMAX,ZMAX);
  }
  p.hp=Math.min(st.maxHp,p.hp+st.regen*dt);
  heroAttackStep(s,dt);
  if(st.spirit>0){
    s.spiritT-=dt;
    if(s.spiritT<=0){
      s.spiritT=Math.max(.8,4-.4*st.spirit);
      const inR=s.enemies.filter(e=>targetable(e)&&Math.abs(e.x-p.x)<=st.reach+.6).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
      const t=inR.find(e=>e.state==='windup')||inR[0];
      if(t) manualStrike(s,t.side,true,t.id);
    }
    if(st.spirit>=2&&s.focus>=100) fireBlast(s);
  }
}

/* ---------- shop ---------- */
function buy(s,id){
  const u=UPG.find(x=>x.id===id), l=s.up[id]||0;
  if(!u||l>=u.max||!unlocked(s,u)) return false;
  const c=upCost(u,l); if(s.chi<c) return false;
  s.chi-=c; s.up[id]=l+1; s.st=stats(s); s.p.hp=Math.min(s.st.maxHp,s.p.hp+((u.mods||[]).some(m=>m.stat==='maxHp')?25:0));
  return true;
}
function autoBuy(s){
  for(let g=0;g<60;g++){
    let best=null,bc=Infinity;
    for(const u of UPG){ const l=s.up[u.id]||0; if(l>=u.max||!unlocked(s,u)) continue; const c=upCost(u,l); if(c<bc){bc=c;best=u;} }
    if(!best||s.chi<bc) return;
    buy(s,best.id);
  }
}

/* ---------- main step ---------- */
function updateShots(s,dt){
  const p=s.p;
  for(let i=s.shots.length-1;i>=0;i--){
    const a=s.shots[i]; a.x+=a.vx*dt; a.t+=dt;
    if(Math.abs(a.x-p.x)<=.7&&Math.abs(a.z-p.z)<=.8){ s.shots.splice(i,1); hurtHero(s,a.dmg,null,ATK[a.atk]); if(s.phase!=='fight') return; }
    else if(Math.abs(a.x)>ARENA_X+8||a.t>2) s.shots.splice(i,1);
  }
}

function update(s,dt){
  s.st=stats(s);
  if(s.hitstop>0){ s.hitstop-=dt; return; }
  const st=s.st, p=s.p;
  p.inv=Math.max(0,p.inv-dt);
  if(s.sandbox) return sandboxUpdate(s,dt);
  if(s.phase==='meditate'){
    s.medT+=dt;
    for(const e of s.enemies) updEnemy(s,e,dt);
    s.enemies=s.enemies.filter(e=>e.t<.7);
    p.hp=st.maxHp;
    if(s.auto){ autoBuy(s); if(s.medT>=2.5) startWave(s); }
    return;
  }
  if(s.queue.length&&s.enemies.filter(e=>e.state!=='dying').length<SET.maxAlive){
    s.spawnT-=dt;
    if(s.spawnT<=0){ spawnEnemy(s); s.spawnT=Math.max(.5,SET.spawnGap-s.wave*.02); }
  }
  for(const side of [-1,1]){
    s.enemies.filter(e=>e.side===side&&targetable(e)&&(EN[e.type].ai||'melee')==='melee')
      .sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).forEach((e,i)=>e.slot=i);
  }
  for(const e of s.enemies){ if(s.phase!=='fight') return; updEnemy(s,e,dt); }
  if(s.phase!=='fight') return;
  updateShots(s,dt); if(s.phase!=='fight') return;
  for(const a of s.enemies){                       // bowling: a fast knocked enemy shoves the one behind it
    if(Math.abs(a.vx)<3) continue;
    for(const b of s.enemies){
      if(a===b||a.side!==b.side||!targetable(b)) continue;
      if(Math.abs(b.x-p.x)>Math.abs(a.x-p.x)&&Math.abs(b.x-a.x)<.8&&Math.abs(b.z-a.z)<.6){ b.vx+=a.vx*.7; a.vx*=.4; dmgEnemy(s,b,st.damage*.5,{kb:0,hs:0}); }
    }
  }
  s.enemies=s.enemies.filter(e=>e.t<.7||e.state!=='dying');
  heroUpdate(s,dt,true);
  if(!s.queue.length&&s.enemies.every(e=>e.state==='dying')) winWave(s);
}

/* ---------- sandbox (the editor's live preview) ---------- */
// mode 'enemy': one enemy keeps repeating an attack at Hero (who cannot die).  mode 'hero': Hero fights a training dummy with his combo.
function newSandbox(mode,opts){
  const s=newSim({}); s.up={}; s.st=stats(s); s.phase='fight'; s.queue=[]; s.enemies.length=0; s.p.hp=s.st.maxHp;
  s.sandbox={mode,type:opts.type,attack:opts.attack||null,freeze:mode==='enemy',dist:opts.dist||2};
  s.events.length=0; return s;
}
function sandboxUpdate(s,dt){
  const sb=s.sandbox, p=s.p, st=s.st;
  p.hp=st.maxHp; p.inv=0; s.focus=0;
  if(sb.mode==='enemy'){
    p.x=0; p.z=0; p.face=1; p.atk=null;
    let e=s.enemies.find(o=>o.type===sb.type&&o.state!=='dying');
    if(!e){ e=makeEnemy(s,sb.type,sb.dist,0); e.side=1; e.gap=.3; s.enemies.push(e); }
    const a=sb.attack&&ATK[sb.attack];
    if(a&&a.kind==='heal'&&!s.enemies.some(o=>o.type==='__dummy')){ const d=makeEnemy(s,'__dummy',sb.dist+2.5,0); d.hp=d.maxHp*.2; d.maxHp=1000; d.hp=200; s.enemies.push(d); }
    e.hp=e.maxHp;
    for(const o of s.enemies) if(o.type==='__dummy'){ o.maxHp=1000; if(o.hp>=999) o.hp=200; }
    for(const o of s.enemies){ updEnemy(s,o,dt); if(o.type!=='__dummy'&&!o.atk&&o.state==='walk'){ o.x=sb.dist; o.z=0; o.vx=0; } }
    updateShots(s,dt);
  } else {
    p.hp=st.maxHp;
    let d=s.enemies.find(o=>o.type==='__dummy');
    if(!d){ d=makeEnemy(s,'__dummy',1.6,0); d.side=1; s.enemies.push(d); }
    d.hp=d.maxHp; d.x=clamp(d.x,-ARENA_X,ARENA_X); d.vx*=.5;
    for(const o of s.enemies) updEnemy(s,o,dt);
    if(Math.abs(d.x-1.6)>.05&&d.state==='walk') d.x+=(1.6-d.x)*Math.min(1,6*dt);
    heroUpdate(s,dt,false);
    p.x=0;p.z=0;
  }
  s.enemies=s.enemies.filter(e=>e.t<.7||e.state!=='dying');
}

/* ---------- headless fast-forward (tab hidden / game closed) ---------- */
function fastForward(s,secs,forceAuto){
  const before={earned:s.earned,kills:s.kills,wave:s.wave,levels:levelSum(s)}, wasAuto=s.auto;
  if(forceAuto) s.auto=true;
  let defeats=0; const n=Math.floor(secs/.05);
  for(let i=0;i<n;i++){ const ph=s.phase; update(s,.05); if(s.phase==='meditate'&&s.defeated&&ph==='fight') defeats++; }
  s.events.length=0; s.auto=wasAuto;
  return {secs,earned:s.earned-before.earned,kills:s.kills-before.kills,waves:Math.max(0,s.wave-before.wave),upgrades:levelSum(s)-before.levels,defeats};
}
