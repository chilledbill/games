/* =====================================================================
   editor.js - in-game content editor (opened from the start menu).
   Edits CONTENT live: enemies, attacks (frame data), effects, upgrades, props, models, settings.
   Your edits are kept in this browser automatically; "Save to file" writes content.js.
   ===================================================================== */
(function(){
const ED={tab:'enemies',sel:{},issues:[],saveT:0,gameS:null,previewMode:null,previewOpts:null};
window.ED=ED;

/* ---------- tiny DOM helpers ---------- */
const h=(tag,a,...kids)=>{ const e=document.createElement(tag);
  for(const [k,v] of Object.entries(a||{})){ if(v===undefined||v===null) continue; if(k==='class') e.className=v; else if(k==='text') e.textContent=v; else if(k==='value') e.value=v; else if(k.startsWith('on')) e.addEventListener(k.slice(2),v); else e.setAttribute(k,v); }
  kids.flat().forEach(c=>{ if(c!==null&&c!==undefined&&c!==false) e.append(c); }); return e; };
const row=(label,input,help)=>h('label',{class:'er'},h('span',{class:'lbl',text:label}),input,help?h('small',{text:help}):null);
const ids=o=>Object.keys(o).filter(k=>!k.startsWith('__'));
const slug=s=>(s||'').trim().replace(/[^a-zA-Z0-9_]/g,'_');
const fxList=tg=>ids(CONTENT.effects).filter(k=>(CONTENT.effects[k].type==='telegraph')===tg);
const pretty=o=>JSON.stringify(o,null,2).replace(/\[([^\[\]{}]*)\]/g,(m,i)=>'['+i.replace(/\s*\n\s*/g,' ').trim()+']');
const contentText=()=>'/* Martial Idler content. Plain JSON after "window.CONTENT =". Edit by hand or with the in-game editor.\n   Times are FRAMES at 60 per second (60 = 1 second) unless a field says seconds. */\nwindow.CONTENT = '+pretty(CONTENT)+';\n';
function toast(msg){ let t=document.getElementById('edToast'); if(!t){ t=h('div',{id:'edToast'}); document.body.append(t); } t.textContent=msg; t.style.opacity=1; clearTimeout(t._t); t._t=setTimeout(()=>t.style.opacity=0,2200); }
const download=(name,text)=>{ const a=h('a',{href:URL.createObjectURL(new Blob([text],{type:'text/plain'})),download:name}); document.body.append(a); a.click(); a.remove(); };

/* ---------- field builders (edit `obj[key]` in place) ---------- */
function numIn(obj,key,o={}){
  const i=h('input',{type:'number',step:o.step===undefined?'any':o.step,min:o.min,max:o.max}); i.value=obj[key]===undefined?'':obj[key];
  i.addEventListener('input',()=>{ if(i.value===''){ if(o.optional){ delete obj[key]; commit(); } return; } const v=parseFloat(i.value); if(isFinite(v)){ obj[key]=v; commit(); if(o.redraw) render(); } });
  return i; }
function txtIn(obj,key,o={}){ const i=h('input',{type:'text',value:obj[key]===undefined?'':obj[key]}); i.addEventListener('input',()=>{ if(i.value===''&&o.optional) delete obj[key]; else obj[key]=i.value; commit(); }); return i; }
function areaIn(obj,key){ const i=h('textarea',{rows:2}); i.value=obj[key]||''; i.addEventListener('input',()=>{ obj[key]=i.value; commit(); }); return i; }
function colIn(obj,key){ const c=h('input',{type:'color'}); c.value=/^#[0-9a-f]{6}$/i.test(obj[key]||'')?obj[key]:'#ffffff'; const t=h('input',{type:'text',value:obj[key]||'#ffffff',class:'hex'});
  c.addEventListener('input',()=>{ obj[key]=c.value; t.value=c.value; commit(); }); t.addEventListener('input',()=>{ if(/^#[0-9a-f]{6}$/i.test(t.value)){ obj[key]=t.value; c.value=t.value; commit(); } });
  return h('span',{class:'colrow'},c,t); }
function chkIn(obj,key,o={}){ const c=h('input',{type:'checkbox'}); c.checked=!!obj[key]; c.addEventListener('change',()=>{ if(c.checked) obj[key]=true; else if(o.optional) delete obj[key]; else obj[key]=false; commit(); if(o.redraw) render(); }); return c; }
function selIn(obj,key,opts,o={}){ const s=h('select'); const list=opts.map(x=>Array.isArray(x)?x:[x,x]); if(o.blank) s.append(h('option',{value:'',text:o.blank}));
  list.forEach(([v,l])=>s.append(h('option',{value:v,text:l}))); s.value=obj[key]===undefined?'':obj[key];
  s.addEventListener('change',()=>{ if(s.value===''&&o.blank) delete obj[key]; else obj[key]=s.value; commit(); if(o.redraw) render(); }); return s; }
function vecIn(obj,key,def){ if(!obj[key]) obj[key]=def.slice(); const w=h('span',{class:'vec'});
  [0,1,2].forEach(n=>{ const i=h('input',{type:'number',step:'any'}); i.value=obj[key][n]; i.addEventListener('input',()=>{ const v=parseFloat(i.value); if(isFinite(v)){ obj[key][n]=v; commit(); } }); w.append(i); }); return w; }
function pairIn(obj,key,labels){ const a=obj[key]||[0,0]; const w=h('span',{class:'vec'});
  [0,1].forEach(n=>{ const i=h('input',{type:'number',step:'any',placeholder:labels[n]}); i.value=a[n]===undefined?'':a[n]; i.addEventListener('input',()=>{ const v=parseFloat(i.value); const cur=obj[key]||[0,0]; if(isFinite(v)){ cur[n]=v; obj[key]=cur; commit(); } }); w.append(i); }); return w; }
// an ordered list of references (effects, props, combo moves...) with remove buttons and an "add" dropdown
function refList(obj,key,options,label){
  if(!obj[key]) obj[key]=[]; const arr=obj[key], w=h('div',{class:'reflist'});
  arr.forEach((v,i)=>w.append(h('span',{class:'tag'+(options.includes(v)?'':' bad')},v,h('b',{text:'×',onclick:()=>{ arr.splice(i,1); if(!arr.length&&label==='drop') delete obj[key]; commit(); render(); }}))));
  const add=h('select',{class:'addsel'},h('option',{value:'',text:'+ add'}),...options.map(o=>h('option',{value:o,text:o})));
  add.addEventListener('change',()=>{ if(add.value){ arr.push(add.value); commit(); render(); } }); w.append(add); return w; }

/* ---------- state, validation, autosave ---------- */
let commitT=0;
function commit(){
  ED.issues=applyContent(CONTENT);
  const bad=ED.issues.filter(i=>i.level==='error').length;
  const f=document.getElementById('edFoot'); if(f) drawFoot(f);
  clearTimeout(commitT); commitT=setTimeout(()=>{
    try{ localStorage.setItem(CKEY,JSON.stringify(CONTENT)); CUSTOM_CONTENT=true; }catch(e){}
    refreshViews();
  },350);
}
function refreshViews(){                                       // rebuild fighters / preview after content changed
  const sel=currentViewTarget(); viewer.type=sel;
  if(vf) disposeFighter(vf); vf=null; rebuildViewer();
  if(ED.tab==='props'&&ED.sel.props&&vf){ const d=sel==='hero'?HERO_DEF:EN[sel]; setProps(vf,[...(d.props||[]),ED.sel.props]); }   // show the prop being edited
  if(pf){ disposeFighter(pf); } pf=makeFighterFor(HERO_DEF,1); setProps(pf,HERO_DEF.props); pf.root.visible=!!EDITOR_PLAY;
  for(const f of fmap.values()) disposeFighter(f); fmap.clear();
  if(EDITOR_PLAY&&ED.previewMode) startPreview(ED.previewMode,ED.previewOpts);
}
function currentViewTarget(){
  const t=ED.tab;
  if(t==='enemies'&&EN[ED.sel.enemies]) return ED.sel.enemies;
  if(t==='attacks'){ const o=ownerOf(ED.sel.attacks); if(o) return o; }
  if(t==='props'&&ED.propTarget&&EN[ED.propTarget]) return ED.propTarget;
  return 'hero';
}
function ownerOf(atkId){ return ids(CONTENT.enemies).find(t=>(CONTENT.enemies[t].attacks||[]).some(a=>a.use===atkId)||CONTENT.enemies[t].onDeath===atkId); }
function drawFoot(f){
  f.innerHTML=''; const err=ED.issues.filter(i=>i.level==='error'), warn=ED.issues.filter(i=>i.level==='warn');
  f.append(h('div',{class:'sum '+(err.length?'bad':'good'),text:err.length?(err.length+' problem'+(err.length>1?'s':'')+' to fix'+(warn.length?', '+warn.length+' warning(s)':'')):(warn.length?warn.length+' warning(s)':'No problems found')}));
  ED.issues.slice(0,5).forEach(i=>f.append(h('div',{class:'iss '+i.level,text:i.where+': '+i.msg})));
  if(ED.issues.length>5) f.append(h('div',{class:'iss',text:'... and '+(ED.issues.length-5)+' more'}));
}
// when an id changes, fix everything that refers to it
function renameId(sec,oldId,newId){
  const C=CONTENT; C[sec][newId]=C[sec][oldId]; delete C[sec][oldId];
  const swap=a=>Array.isArray(a)?a.map(x=>x===oldId?newId:x):a;
  if(sec==='attacks'){ for(const e of Object.values(C.enemies)){ (e.attacks||[]).forEach(a=>{ if(a.use===oldId) a.use=newId; }); if(e.onDeath===oldId) e.onDeath=newId; } for(const a of Object.values(C.attacks)) if(a.then===oldId) a.then=newId; }
  if(sec==='effects'){ for(const a of Object.values(C.attacks)){ a.onStart=swap(a.onStart); a.onActive=swap(a.onActive); a.onHit=swap(a.onHit); a.telegraph=swap(a.telegraph); } for(const m of Object.values(C.hero.moves)){ m.onSwing=swap(m.onSwing); m.onHit=swap(m.onHit); m.onUse=swap(m.onUse); } for(const k in C.settings.fxDefaults) if(C.settings.fxDefaults[k]===oldId) C.settings.fxDefaults[k]=newId; }
  if(sec==='props'){ C.hero.props=swap(C.hero.props); for(const e of Object.values(C.enemies)) e.props=swap(e.props); }
  if(sec==='models'){ if(C.hero.model===oldId) C.hero.model=newId; for(const e of Object.values(C.enemies)) if(e.model===oldId) e.model=newId; }
}
function newId(sec,base){ let i=slug(prompt('Id for the new item (letters, numbers, underscore):',base||'new_item')); if(!i) return null; if(CONTENT[sec][i]){ alert('That id already exists.'); return null; } return i; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function pick(obj,cur){ const k=ids(obj); return obj[cur]?cur:k[0]; }
function listBar(sec,keys,cur,labelOf,acts){
  const s=h('select',{class:'list',size:Math.min(9,keys.length+1)}); keys.forEach(k=>{ const o=h('option',{value:k,text:labelOf(k)}); if(k===cur) o.selected=true; s.append(o); });
  s.addEventListener('change',()=>{ ED.sel[sec]=s.value; stopPreview(); render(); refreshViews(); });
  return h('div',{class:'listbar'},s,h('div',{class:'btns'},h('button',{text:'Add',onclick:acts.add}),h('button',{text:'Duplicate',onclick:acts.dup}),h('button',{text:'Delete',onclick:acts.del}),acts.extra));
}
const sec=t=>h('h4',{text:t});

/* ---------- frame bar + hitbox preview ---------- */
function frameBar(a){
  const su=+a.startup||0, ac=+a.active||1, rc=+a.recovery||0, tot=su+ac+rc||1, w=h('div',{class:'fbar'});
  const seg=(n,cls,lbl)=>h('div',{class:'seg '+cls,style:'flex:'+Math.max(n,0.0001)+' 0 0;min-width:'+(n>0?14:0)+'px',title:lbl},n>0?String(n):'');
  w.append(seg(su,'su','startup (windup): '+su+' frames'),seg(ac,'ac','active (can hit): '+ac+' frames'),seg(rc,'rc','recovery (open for a counter): '+rc+' frames'));
  return h('div',null,w,h('small',{class:'fnote',text:'startup '+su+'f / active '+ac+'f / recovery '+rc+'f  =  '+tot+' frames ('+(tot/60).toFixed(2)+'s)'}));
}
function hitboxPic(a){
  const c=h('canvas',{width:300,height:84,class:'hbpic'}), g=c.getContext('2d'); g.fillStyle='#0b1220'; g.fillRect(0,0,300,84);
  const u=34, ax=40, cy=42; g.strokeStyle='#223'; g.beginPath(); g.moveTo(0,cy); g.lineTo(300,cy); g.stroke();
  const k=a.kind||'melee', hb=a.hitbox||{offsetX:0,reachX:2.3,halfZ:.7};
  g.fillStyle='#e0553d'; g.beginPath(); g.arc(ax,cy,8,0,7); g.fill();
  if(k==='melee'||k==='charge'){ const x0=ax+(hb.offsetX||0)*u, w=(hb.reachX||2)*u, hz=(hb.halfZ||.7)*u*.8; g.fillStyle='rgba(255,90,60,.35)'; g.strokeStyle='#ff5d3a'; g.fillRect(x0,cy-hz,w,hz*2); g.strokeRect(x0,cy-hz,w,hz*2); }
  if(k==='burst'){ g.fillStyle='rgba(255,140,60,.3)'; g.strokeStyle='#ff8a3a'; g.beginPath(); g.ellipse(ax,cy,(a.radius||2)*u,(a.zRadius||1.2)*u*.8,0,0,7); g.fill(); g.stroke(); }
  if(k==='projectile'){ g.strokeStyle='#ffe9a0'; g.beginPath(); g.moveTo(ax+10,cy); g.lineTo(280,cy); g.stroke(); g.fillStyle='#ffe9a0'; g.fillRect(268,cy-4,10,8); }
  if(k==='charge'){ g.strokeStyle='#ff4a4a'; g.setLineDash([4,4]); g.beginPath(); g.moveTo(ax+10,cy); g.lineTo(280,cy); g.stroke(); g.setLineDash([]); }
  g.fillStyle='#7fe3ff'; const hx=ax+(k==='burst'?1.4:(hb.reachX||2)-.3)*u; g.beginPath(); g.arc(Math.min(hx,280),cy,7,0,7); g.fill();
  g.fillStyle='#8d99b3'; g.font='10px sans-serif'; g.fillText('attacker',ax-18,cy+24); g.fillText('top-down: 1 unit = '+u+'px, Hero in blue',150,12);
  return c;
}

/* ---------- live preview (the sandbox sim) ---------- */
function startPreview(mode,opts){
  if(!ED.gameS) ED.gameS=S;
  ED.previewMode=mode; ED.previewOpts=opts; ED.sandbox=newSandbox(mode,opts); S=ED.sandbox;
  EDITOR_PLAY=true; if(pf) pf.root.visible=true; if(vf) vf.root.visible=false;
  cam.rotation.set(0,0,0); resize(); last=performance.now(); simAcc=0; camX=0; drawBtns();
}
function stopPreview(){
  if(!EDITOR_PLAY) return; EDITOR_PLAY=false; ED.previewMode=null; if(ED.gameS) S=ED.gameS;
  if(pf) pf.root.visible=false; if(vf) vf.root.visible=true;
  for(const f of fmap.values()) disposeFighter(f); fmap.clear(); resize(); drawBtns();
}
const previewBtn=(label,mode,opts)=>h('button',{class:'play',text:EDITOR_PLAY&&ED.previewMode===mode&&JSON.stringify(ED.previewOpts)===JSON.stringify(opts)?'Stop preview':label,onclick:()=>{ if(EDITOR_PLAY&&ED.previewMode===mode&&JSON.stringify(ED.previewOpts)===JSON.stringify(opts)) stopPreview(); else startPreview(mode,opts); render(); }});
function attackDist(a){ const k=a.kind; return k==='projectile'?6:(k==='heal'?5:(a.hitbox&&a.hitbox.reachX?Math.max(1,a.hitbox.reachX*.6):1.5)); }

/* ---------- tabs ---------- */
const TABS=[['hero','Hero'],['enemies','Enemies'],['attacks','Attacks'],['effects','Effects'],['upgrades','Upgrades'],['props','Props'],['models','Models'],['settings','Settings']];

function tabHero(b){
  const H=CONTENT.hero, mid=ED.sel.heroMove=(H.moves[ED.sel.heroMove]?ED.sel.heroMove:H.combo[0]), m=H.moves[mid];
  b.append(sec('Hero'),row('Name',txtIn(H,'name')),row('Model',selIn(H,'model',ids(CONTENT.models),{redraw:true})),
    row('Health',numIn(H,'hp')),row('Damage per hit',numIn(H,'damage'),'multiplied by each move\'s damage'),row('Reach',numIn(H,'reach')),row('Run speed',numIn(H,'move')),
    row('Props (hats, weapons)',refList(H,'props',ids(CONTENT.props))),
    row('Combo order',refList(H,'combo',ids(H.moves).filter(k=>!['click','parry','blast'].includes(k))),'Hero cycles through these moves'));
  b.append(sec('Moves'),h('div',{class:'listbar'},h('select',{class:'list',size:7,onchange:e=>{ ED.sel.heroMove=e.target.value; render(); }},...ids(H.moves).map(k=>{ const o=h('option',{value:k,text:(H.moves[k].name||k)+' ('+k+')'}); if(k===mid) o.selected=true; return o; })),
    h('div',{class:'btns'},h('button',{text:'Add move',onclick:()=>{ const i=newId('hero','new_move'); if(!i) return; H.moves[i]={name:i,startup:4,active:2,recovery:36,damage:1,knockback:1.2,hitstop:2,focus:4,onSwing:[],onHit:['spark_small']}; ED.sel.heroMove=i; commit(); render(); }}),
      h('button',{text:'Delete',onclick:()=>{ if(['click','parry','blast'].includes(mid)||H.combo.includes(mid)&&H.combo.length<2){ alert('That move is required.'); return; } delete H.moves[mid]; H.combo=H.combo.filter(x=>x!==mid); commit(); render(); }}))));
  b.append(row('Move name',txtIn(m,'name')));
  if(m.startup!==undefined){ b.append(frameBar(m),row('Startup frames',numIn(m,'startup',{min:0,step:1,redraw:true})),row('Active frames',numIn(m,'active',{min:1,step:1,redraw:true})),row('Recovery frames',numIn(m,'recovery',{min:0,step:1,redraw:true}))); }
  else b.append(h('small',{class:'fnote',text:'This move is instant (no frames); it is triggered by a click, a parry or the Focus blast.'}));
  if(mid!=='blast') b.append(row('Damage multiplier',numIn(m,'damage')));
  b.append(row('Knockback',numIn(m,'knockback')),row('Stun (frames)',numIn(m,'stun',{optional:true,step:1}),'how long the enemy is stunned'),row('Hitstop (frames)',numIn(m,'hitstop',{step:1}),'a short freeze on impact'),
    row('Focus gained',numIn(m,'focus',{optional:true})),row('Breaks guards',chkIn(m,'breakGuard',{optional:true})),row('Finisher (uses finisher bonuses)',chkIn(m,'finisher',{optional:true})));
  b.append(row('Effects on swing',refList(m,'onSwing',fxList(false))),row('Effects on hit',refList(m,'onHit',fxList(false))));
  if(mid==='blast') b.append(row('Effects on use',refList(m,'onUse',fxList(false))));
  b.append(h('div',{class:'btns'},previewBtn('Preview combo on a dummy','hero',{})));
}

function enemyTemplate(){ return {name:'New enemy',hp:12,speed:2.2,damage:4,scale:1,chi:1.5,unlock:1,weight:5,ai:'melee',stand:1.3,tint:'#ffffff',model:'hero',props:[],attacks:[]}; }
function tabEnemies(b){
  const E=CONTENT.enemies, id=ED.sel.enemies=pick(E,ED.sel.enemies), e=E[id];
  b.append(listBar('enemies',ids(E),id,k=>(E[k].name||k)+' ('+k+')',{
    add:()=>{ const i=newId('enemies','new_enemy'); if(!i) return; E[i]=enemyTemplate(); ED.sel.enemies=i; commit(); render(); refreshViews(); },
    dup:()=>{ const i=newId('enemies',id+'_copy'); if(!i) return; E[i]=clone(e); ED.sel.enemies=i; commit(); render(); refreshViews(); },
    del:()=>{ if(id==='boss'||Object.keys(E).length<2){ alert('Keep at least one enemy (the boss is required).'); return; } if(confirm('Delete '+id+'?')){ delete E[id]; commit(); render(); refreshViews(); } }}));
  const idIn=h('input',{type:'text',value:id}); idIn.addEventListener('change',()=>{ const n=slug(idIn.value); if(n&&n!==id&&!E[n]){ renameId('enemies',id,n); ED.sel.enemies=n; commit(); render(); } else idIn.value=id; });
  b.append(row('Id',idIn),row('Name',txtIn(e,'name')),row('Tip shown the first time it appears',areaIn(e,'tip')),
    sec('Stats'),row('Health',numIn(e,'hp')),row('Move speed',numIn(e,'speed')),row('Damage',numIn(e,'damage'),'per-attack multipliers apply on top'),row('Size',numIn(e,'scale')),row('Chi reward',numIn(e,'chi')),
    sec('Spawning'),row('First wave',numIn(e,'unlock',{step:1}),'0 = never in normal waves (the boss uses boss waves)'),row('Spawn weight',numIn(e,'weight')),row('Max per wave',numIn(e,'maxPerWave',{optional:true,step:1})),
    sec('Behavior'),row('Movement AI',selIn(e,'ai',AIS,{redraw:true}),'melee: queues up around Hero  |  ranged: keeps distance  |  support: stays back  |  rusher: runs straight at Hero'));
  if((e.ai||'melee')==='melee') b.append(row('Stand distance',numIn(e,'stand')));
  if(e.ai==='ranged'||e.ai==='support'){ b.append(row('Keep distance (min, ideal)',pairIn(e,'keep',['min','ideal'])),row('Line up with Hero',chkIn(e,'lineUp'))); }
  b.append(row('Guard (takes less from normal hits)',h('span',null,chkIn({get g(){return !!e.guard;},set g(v){ if(v) e.guard={damageTaken:.2,breakStun:60}; else delete e.guard; }},'g',{redraw:true}))));
  if(e.guard) b.append(row('Damage taken while guarding',numIn(e.guard,'damageTaken'),'0.2 = 20%'),row('Guard-break stun (frames)',numIn(e.guard,'breakStun',{step:1})));
  b.append(row('When it dies, it triggers',selIn(e,'onDeath',ids(CONTENT.attacks),{blank:'(nothing)'})),
    sec('Look'),row('Tint',colIn(e,'tint')),row('Model',selIn(e,'model',ids(CONTENT.models))),row('Props',refList(e,'props',ids(CONTENT.props))),
    sec('Attacks'));
  if(!e.attacks) e.attacks=[];
  e.attacks.forEach((en,i)=>{
    const a=CONTENT.attacks[en.use];
    b.append(h('div',{class:'card'},
      h('div',{class:'crow'},selIn(en,'use',ids(CONTENT.attacks),{redraw:true}),h('button',{class:'x',text:'remove',onclick:()=>{ e.attacks.splice(i,1); commit(); render(); }})),
      a?frameBar(a):h('small',{class:'bad',text:'unknown attack'}),
      row('Weight',numIn(en,'weight',{optional:true}),'how often it is picked'),row('Use between distance (min, max)',pairIn(en,'range',['min','max']),'leave empty for the default'),
      row('Needs depth within',numIn(en,'zTol',{optional:true}),'how closely Hero must line up'),row('Only below this health fraction',numIn(en,'whenHpBelow',{optional:true})),
      h('div',{class:'btns'},previewBtn('Preview this attack',  'enemy',{type:id,attack:en.use,dist:a?attackDist(a):2}))));
  });
  b.append(h('button',{text:'+ Add attack',onclick:()=>{ const first=ids(CONTENT.attacks)[0]; e.attacks.push({use:first}); commit(); render(); }}));
}

function attackTemplate(){ return {name:'New attack',kind:'melee',startup:30,active:3,recovery:20,cooldown:78,damage:1,hitbox:{offsetX:0,reachX:2.3,halfZ:0.7},telegraph:['tg_pulse']}; }
function tabAttacks(b){
  const A=CONTENT.attacks, id=ED.sel.attacks=pick(A,ED.sel.attacks), a=A[id];
  b.append(listBar('attacks',ids(A),id,k=>(A[k].name||k)+' ('+k+')',{
    add:()=>{ const i=newId('attacks','new_attack'); if(!i) return; A[i]=attackTemplate(); ED.sel.attacks=i; commit(); render(); },
    dup:()=>{ const i=newId('attacks',id+'_copy'); if(!i) return; A[i]=clone(a); ED.sel.attacks=i; commit(); render(); },
    del:()=>{ if(confirm('Delete '+id+'? Enemies using it will show an error until you pick another.')){ delete A[id]; commit(); render(); } }}));
  const idIn=h('input',{type:'text',value:id}); idIn.addEventListener('change',()=>{ const n=slug(idIn.value); if(n&&n!==id&&!A[n]){ renameId('attacks',id,n); ED.sel.attacks=n; commit(); render(); } else idIn.value=id; });
  const k=a.kind;
  b.append(row('Id',idIn),row('Name',txtIn(a,'name')),row('Kind',selIn(a,'kind',KINDS,{redraw:true}),'melee: hits in front  |  projectile: fires a shot  |  burst: area around the attacker  |  charge: dashes forward  |  heal: heals an ally  |  teleport: vanishes and reappears behind Hero'),
    sec('Frame data (60 frames = 1 second)'),frameBar(a),
    row('Startup frames',numIn(a,'startup',{min:0,step:1,redraw:true}),'the windup: Hero can parry here'),row('Active frames',numIn(a,'active',{min:1,step:1,redraw:true}),'the attack can hit'),row('Recovery frames',numIn(a,'recovery',{min:0,step:1,redraw:true}),'open for a counter'),
    row('Cooldown after (frames)',numIn(a,'cooldown',{min:0,step:1}),'before this attack can be used again'),
    row('Can be parried',chkIn({get v(){return a.parryable!==false;},set v(x){ if(x) delete a.parryable; else a.parryable=false; }},'v')));
  if(k!=='heal'&&k!=='teleport') b.append(row('Damage multiplier',numIn(a,'damage'),'of the enemy\'s damage'));
  if(k==='melee'||k==='charge'){ if(!a.hitbox) a.hitbox={offsetX:0,reachX:2,halfZ:.7}; b.append(sec('Hitbox'),hitboxPic(a),row('Start offset',numIn(a.hitbox,'offsetX'),'forward from the attacker'),row('Reach forward',numIn(a.hitbox,'reachX')),row('Half depth (up/down)',numIn(a.hitbox,'halfZ'))); }
  if(k==='projectile') b.append(sec('Projectile'),hitboxPic(a),row('Speed',numIn(a,'speed')),row('Line up with Hero while winding up',chkIn(a,'track',{optional:true})),row('Trail color',colIn(a,'trail')));
  if(k==='charge') b.append(row('Charge speed',numIn(a,'speed')),row('Line up while winding up',chkIn(a,'track',{optional:true})));
  if(k==='burst') b.append(sec('Burst'),hitboxPic(a),row('Radius',numIn(a,'radius')),row('Depth radius',numIn(a,'zRadius')),row('Hurts Hero',chkIn({get v(){return a.hitsHero!==false;},set v(x){ a.hitsHero=!!x; }},'v')),
    row('Hurts other enemies',chkIn(a,'hitsEnemies',{optional:true})),row('Damage to enemies (multiplier)',numIn(a,'enemyDamage',{optional:true})),row('Knockback',numIn(a,'knockback',{optional:true})),row('Destroys the attacker',chkIn(a,'selfDestruct',{optional:true})));
  if(k==='heal') b.append(row('Heal amount',numIn(a,'heal'),'0.3 = 30% of the ally\'s health'));
  if(k==='teleport') b.append(row('Lands this far behind Hero',numIn(a,'behind')),row('Invisible while vanishing',chkIn(a,'invisible',{optional:true})),row('Then attacks with',selIn(a,'then',ids(A),{blank:'(nothing)'})));
  b.append(row('Hitstop on hit (frames)',numIn(a,'hitstop',{optional:true,step:1})),
    sec('Effects'),row('While winding up (telegraph)',refList(a,'telegraph',fxList(true))),row('When it starts',refList(a,'onStart',fxList(false))),row('When it becomes active',refList(a,'onActive',fxList(false))),row('When it hits Hero',refList(a,'onHit',fxList(false))));
  const owner=ownerOf(id);
  b.append(h('div',{class:'btns'},owner?previewBtn('Preview (owner: '+owner+')','enemy',{type:owner,attack:id,dist:attackDist(a)}):h('small',{class:'fnote',text:'Give this attack to an enemy (Enemies tab) to preview it.'})));
}

const PRIM={sparks:[['count','num'],['color','col']],slash:[['color','col'],['size0','num'],['size1','num'],['stretch','num'],['life','num'],['y','num'],['rot','num']],
  ring:[['color','col'],['max','num'],['life','num'],['y','num'],['flat','chk']],glow:[['color','col'],['size0','num'],['size1','num'],['stretch','num'],['life','num'],['y','num']],
  shake:[['amount','num']],flash:[['color','col'],['opacity','num']],text:[['text','txt'],['style','sel',['','big','chi','block','crit','dodge','hurt']]],smoke:[['count','num'],['color','col']],rise:[['count','num'],['color','col']]};
const PRIM_DEF={sparks:{type:'sparks',count:8,color:'#ffe9a0'},slash:{type:'slash',color:'#ffffff',size0:.5,size1:1.3,stretch:3,life:8,y:1.15,offsetX:1,rot:.55},ring:{type:'ring',color:'#ffffff',max:2,life:18,y:1},
  glow:{type:'glow',color:'#ffffff',size0:.5,size1:1,life:10,y:1},shake:{type:'shake',amount:.1},flash:{type:'flash',color:'#ffffff',opacity:.3},text:{type:'text',text:'TEXT',style:'big'},smoke:{type:'smoke',count:8,color:'#8a8aa8'},rise:{type:'rise',count:8,color:'#7dffa0'}};
function tabEffects(b){
  const F=CONTENT.effects, id=ED.sel.effects=pick(F,ED.sel.effects), fx=F[id], isT=!Array.isArray(fx);
  b.append(listBar('effects',ids(F),id,k=>k+(F[k].type==='telegraph'?'  [telegraph]':''),{
    add:()=>{ const i=newId('effects','new_effect'); if(!i) return; F[i]=confirm('OK = particle effect, Cancel = telegraph (the warning shown while an attack winds up)')?[clone(PRIM_DEF.sparks)]:{type:'telegraph',shape:'pulse',color:'#ff3333',speed:30}; ED.sel.effects=i; commit(); render(); },
    dup:()=>{ const i=newId('effects',id+'_copy'); if(!i) return; F[i]=clone(fx); ED.sel.effects=i; commit(); render(); },
    del:()=>{ if(confirm('Delete '+id+'?')){ delete F[id]; commit(); render(); } }}));
  const idIn=h('input',{type:'text',value:id}); idIn.addEventListener('change',()=>{ const n=slug(idIn.value); if(n&&n!==id&&!F[n]){ renameId('effects',id,n); ED.sel.effects=n; commit(); render(); } else idIn.value=id; });
  b.append(row('Id',idIn));
  if(isT){
    b.append(row('Shape',selIn(fx,'shape',['pulse','aimLine','link','pathLine','groundRing'],{redraw:true}),'pulse: tints the enemy  |  aimLine: line to Hero  |  link: line to the heal target  |  pathLine: the charge path  |  groundRing: danger circle'),row('Color',colIn(fx,'color')));
    if(fx.shape==='pulse') b.append(row('Pulse speed',numIn(fx,'speed')));
    if(fx.shape==='groundRing') b.append(row('Radius',numIn(fx,'radius')));
    if(fx.shape==='pathLine') b.append(row('Length',numIn(fx,'length')));
    b.append(h('small',{class:'fnote',text:'Telegraphs are drawn continuously during an attack\'s startup frames. Preview them by previewing an attack that uses them.'}));
    return;
  }
  fx.forEach((p,i)=>{
    const spec=PRIM[p.type]||[]; const c=h('div',{class:'card'});
    c.append(h('div',{class:'crow'},selIn(p,'type',Object.keys(PRIM),{redraw:true}),
      h('button',{class:'x',text:'↑',onclick:()=>{ if(i>0){ [fx[i-1],fx[i]]=[fx[i],fx[i-1]]; commit(); render(); } }}),h('button',{class:'x',text:'↓',onclick:()=>{ if(i<fx.length-1){ [fx[i+1],fx[i]]=[fx[i],fx[i+1]]; commit(); render(); } }}),
      h('button',{class:'x',text:'remove',onclick:()=>{ fx.splice(i,1); commit(); render(); }})));
    for(const [key,t,opts] of spec){ const lab=key; c.append(row(lab,t==='num'?numIn(p,key):t==='col'?colIn(p,key):t==='chk'?chkIn(p,key,{optional:true}):t==='txt'?txtIn(p,key):selIn(p,key,opts))); }
    c.append(row('Plays at',selIn(p,'at',['self','target','hero'],{blank:'self (default)'}),'self = where it happens, target = the other fighter, hero = Hero'),row('Offset forward',numIn(p,'offsetX',{optional:true})));
    b.append(c);
  });
  b.append(h('div',{class:'btns'},(()=>{ const s=h('select',{class:'addsel'},h('option',{value:'',text:'+ add a piece'}),...Object.keys(PRIM).map(k=>h('option',{value:k,text:k}))); s.addEventListener('change',()=>{ if(s.value){ fx.push(clone(PRIM_DEF[s.value])); commit(); render(); } }); return s; })(),
    h('button',{class:'play',text:'Play it',onclick:()=>{ const wasP=EDITOR_PLAY; const d=pf?pf.hand:false; runFx([id],{x:0,z:0,dir:1,tx:2.5,tz:0}); }})));
}

function tabUpgrades(b){
  const U=CONTENT.upgrades, cur=ED.sel.upgrades=U.some(u=>u.id===ED.sel.upgrades)?ED.sel.upgrades:U[0].id, u=U.find(x=>x.id===cur);
  b.append(listBar('upgrades',U.map(x=>x.id),cur,k=>{ const x=U.find(y=>y.id===k); return '['+x.branch+'] '+x.name+' ('+k+')'; },{
    add:()=>{ const i=newId('upgrades_',''); },
    dup:()=>{}, del:()=>{} }));
  // replace the generic buttons: upgrades live in an array
  const bar=b.lastChild.querySelector('.btns'); bar.innerHTML='';
  bar.append(h('button',{text:'Add',onclick:()=>{ let i=slug(prompt('Id for the new upgrade:','new_upgrade')); if(!i) return; if(U.some(x=>x.id===i)){ alert('That id exists.'); return; } U.push({id:i,branch:CONTENT.branches[0][0],name:'New upgrade',desc:'',baseCost:20,growth:1.5,max:10,mods:[{stat:'damage',op:'addPct',value:0.1}]}); ED.sel.upgrades=i; commit(); render(); }}),
    h('button',{text:'Delete',onclick:()=>{ if(U.length<2||!confirm('Delete '+cur+'?')) return; U.splice(U.indexOf(u),1); for(const x of U) if(x.requires) delete x.requires[cur]; commit(); render(); }}),
    h('button',{text:'Move up',onclick:()=>{ const i=U.indexOf(u); if(i>0){ [U[i-1],U[i]]=[U[i],U[i-1]]; commit(); render(); } }}),
    h('button',{text:'Move down',onclick:()=>{ const i=U.indexOf(u); if(i<U.length-1){ [U[i+1],U[i]]=[U[i],U[i+1]]; commit(); render(); } }}));
  const idIn=h('input',{type:'text',value:cur}); idIn.addEventListener('change',()=>{ const n=slug(idIn.value); if(n&&n!==cur&&!U.some(x=>x.id===n)){ for(const x of U) if(x.requires&&x.requires[cur]!==undefined){ x.requires[n]=x.requires[cur]; delete x.requires[cur]; } u.id=n; ED.sel.upgrades=n; commit(); render(); } else idIn.value=cur; });
  b.append(row('Id',idIn),row('Name',txtIn(u,'name')),row('Description',areaIn(u,'desc')),row('Branch',selIn(u,'branch',CONTENT.branches.map(x=>x[0]))),
    row('Base cost (chi)',numIn(u,'baseCost')),row('Cost growth per level',numIn(u,'growth'),'1.5 = each level costs 50% more'),row('Max level',numIn(u,'max',{step:1})),sec('Requires (to unlock)'));
  if(!u.requires) u.requires={};
  Object.keys(u.requires).forEach(k=>{ const rr=u.requires; b.append(h('div',{class:'crow'},h('span',{text:k}),h('input',{type:'number',value:rr[k],step:1,oninput:e=>{ rr[k]=parseFloat(e.target.value)||1; commit(); }}),h('button',{class:'x',text:'remove',onclick:()=>{ delete rr[k]; if(!Object.keys(rr).length) delete u.requires; commit(); render(); }}))); });
  b.append((()=>{ const s=h('select',{class:'addsel'},h('option',{value:'',text:'+ add requirement'}),...U.filter(x=>x.id!==cur).map(x=>h('option',{value:x.id,text:x.name+' ('+x.id+')'}))); s.addEventListener('change',()=>{ if(s.value){ (u.requires=u.requires||{})[s.value]=1; commit(); render(); } }); return s; })());
  b.append(sec('Effects on Hero\'s stats (per level)'));
  (u.mods=u.mods||[]).forEach((m,i)=>b.append(h('div',{class:'card'},h('div',{class:'crow'},selIn(m,'stat',STAT_NAMES),selIn(m,'op',['add','addPct','pow']),h('button',{class:'x',text:'remove',onclick:()=>{ u.mods.splice(i,1); commit(); render(); }})),
    row('Value',numIn(m,'value'),'add: +value per level  |  addPct: x(1 + value per level)  |  pow: x value per level'),row('Counts every N levels',numIn(m,'per',{optional:true,step:1})),row('Cap the stat at',numIn(m,'cap',{optional:true})))));
  b.append(h('button',{text:'+ Add stat effect',onclick:()=>{ u.mods.push({stat:'damage',op:'addPct',value:.1}); commit(); render(); }}));
}

function tabProps(b){
  const P=CONTENT.props, id=ED.sel.props=pick(P,ED.sel.props), p=P[id];
  const boneKeys=[...new Set(Object.values(CONTENT.models).flatMap(m=>Object.keys(m.bones||{})))];
  b.append(listBar('props',ids(P),id,k=>k+'  ['+(P[k].shape||'box')+(P[k].bone?' on '+P[k].bone:'')+']',{
    add:()=>{ const i=newId('props','new_prop'); if(!i) return; P[i]={shape:'box',color:'#c0c0c0',size:[.2,.2,.2],offset:[0,1.9,0],bone:'head'}; ED.sel.props=i; commit(); render(); },
    dup:()=>{ const i=newId('props',id+'_copy'); if(!i) return; P[i]=clone(p); ED.sel.props=i; commit(); render(); },
    del:()=>{ if(confirm('Delete '+id+'?')){ delete P[id]; commit(); render(); } }}));
  const idIn=h('input',{type:'text',value:id}); idIn.addEventListener('change',()=>{ const n=slug(idIn.value); if(n&&n!==id&&!P[n]){ renameId('props',id,n); ED.sel.props=n; commit(); render(); } else idIn.value=id; });
  const kitFiles=Object.keys(KITS);
  b.append(row('Id',idIn),row('Shape',selIn(p,'shape',['box','disc','bow','halo','sphere','kit'],{redraw:true}),'"kit" uses a mesh from a .glb you imported on the Models tab'));
  if(p.shape==='kit'){
    b.append(row('Kit file',selIn(p,'file',kitFiles,{blank:'(choose)',redraw:true})));
    const kit=KITS[p.file]; const meshes=[]; if(kit) kit.scene.traverse(o=>{ if(o.isMesh||o.children.some(c=>c.isMesh)) meshes.push(o.name); }); b.append(row('Mesh in the file',selIn(p,'mesh',[...new Set(meshes.filter(Boolean))],{blank:'(choose)'})));
  } else b.append(row('Color',colIn(p,'color')));
  b.append(row('Attach to bone',selIn(p,'bone',boneKeys,{blank:'(body / rig)'}),'bone names are mapped on the Models tab'),row('Size (x, y, z)',vecIn(p,'size',[1,1,1])),row('Offset (x, y, z)',vecIn(p,'offset',[0,0,0]),'metres from the bone (or the body)'),row('Rotation (degrees)',vecIn(p,'rot',[0,0,0])),
    h('small',{class:'fnote',text:'The viewer shows this prop on the selected preview fighter. Offsets are tuned by eye: change a number and look at the model.'}));
  b.append(row('Preview on',(()=>{ const s=h('select'); [['hero','Hero'],...ids(CONTENT.enemies).map(k=>[k,CONTENT.enemies[k].name||k])].forEach(([v,l])=>s.append(h('option',{value:v,text:l}))); s.value=ED.propTarget||'hero'; s.addEventListener('change',()=>{ ED.propTarget=s.value; refreshViews(); }); return s; })()));
}

function modelReport(g,name){
  let tris=0,skinned=0,bones=0,mats=new Set(),imgs=[],meshes=[]; g.scene.traverse(o=>{ if(o.isMesh){ const geo=o.geometry; tris+=(geo.index?geo.index.count:geo.attributes.position.count)/3; if(o.isSkinnedMesh){ skinned++; bones=Math.max(bones,o.skeleton.bones.length); } mats.add(o.material.type+(o.material.map?'+map':'')); if(o.material.map&&o.material.map.image) imgs.push(o.material.map.image.width+'x'+o.material.map.image.height); } });
  g.scene.children.forEach(c=>{ let has=false; c.traverse(o=>{ if(o.isMesh) has=true; }); if(has) meshes.push(c.name); });
  const issues=[]; if(tris>3000) issues.push('over 3,000 triangles ('+Math.round(tris)+')'); if(imgs.some(s=>parseInt(s)>1024)) issues.push('texture larger than 1024'); if(mats.size>2) issues.push('more than 2 materials'); if(g.animations&&g.animations.length) issues.push(g.animations.length+' animation clip(s) in the file: unused data, strip them to save space');
  return {name,tris:Math.round(tris),skinned,bones,mats:[...mats],imgs,meshes,anims:(g.animations||[]).length,height:measureHeight(g.scene),issues};
}
function tabModels(b){
  const M=CONTENT.models, id=ED.sel.models=pick(M,ED.sel.models), m=M[id];
  b.append(sec('Import a .glb'),
    h('div',{class:'drop',id:'edDrop',text:'Drop a .glb here, or click to choose'}),h('div',{id:'edReport'}));
  const drop=b.querySelector('#edDrop'), inp=h('input',{type:'file',accept:'.glb',style:'display:none'}); b.append(inp);
  drop.addEventListener('click',()=>inp.click()); inp.addEventListener('change',()=>{ if(inp.files[0]) importGlb(inp.files[0]); });
  ['dragover','dragenter'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.add('over'); })); ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{ e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop',e=>{ const f=e.dataTransfer.files[0]; if(f) importGlb(f); });
  b.append(sec('Models in this game'),listBar('models',ids(M),id,k=>k+'  ('+M[k].file+')',{
    add:()=>{ alert('Import a character .glb above to create a model.'); },dup:()=>{ const i=newId('models',id+'_copy'); if(!i) return; M[i]=clone(m); ED.sel.models=i; commit(); render(); },
    del:()=>{ if(id==='hero'){ alert('The "hero" model is the default and cannot be deleted.'); return; } if(confirm('Remove model '+id+'?')){ delete M[id]; commit(); render(); } }}));
  b.append(row('File',h('span',{text:m.file})),row('Facing (yaw degrees)',numIn(m,'yaw'),'turn it until the model faces the right'),row('Height in metres',numIn(m,'height'),'0 = keep the size it was made at'),
    row('Pose',selIn(m,'pose',['arms_down','none']),'arms_down needs the arm bones below'),sec('Bone names'),h('small',{class:'fnote',text:'Props attach by these keys. Type the exact bone name from your model for each.'}));
  if(!m.bones) m.bones={};
  for(const k of ['head','hand_r','hand_l','back','hips','upperarm_l','forearm_l','upperarm_r','forearm_r']) b.append(row(k,txtIn(m.bones,k,{optional:true})));
  const g=GLTFS[id]; if(g){ const rp=modelReport(g,m.file); b.append(sec('Report'),h('div',{class:'rep'},rp.tris+' triangles, '+rp.skinned+' skinned mesh(es), '+rp.bones+' bones, '+rp.anims+' animation clip(s), height '+rp.height.toFixed(2)+' m',h('br'),rp.issues.length?rp.issues.join(' | '):'Looks good.')); }
  idbKeys().then(keys=>{ if(keys.length&&document.getElementById('edStore')==null){ b.append(h('div',{id:'edStore'},sec('Stored files'),...keys.map(k=>h('div',{class:'crow'},h('span',{text:k}),h('button',{class:'x',text:'delete',onclick:async()=>{ await idbDel(k); delete KITS[k]; render(); }}))))); } }).catch(()=>{});
}
async function importGlb(file){
  const rep=document.getElementById('edReport'); rep.innerHTML='Reading '+file.name+'...';
  try{
    const buf=await file.arrayBuffer(), g=await parseGlb(buf.slice(0)), r=modelReport(g,file.name); const isChar=r.skinned>0;
    rep.innerHTML=''; rep.append(h('div',{class:'rep'},file.name+': '+r.tris+' triangles, '+r.skinned+' skinned, '+r.bones+' bones, '+r.anims+' animation clip(s), '+r.mats.join('/')+(r.imgs.length?', texture '+r.imgs.join(','):'')+', '+r.height.toFixed(2)+' m tall',h('br'),r.issues.length?'Warnings: '+r.issues.join(' | '):'Looks good.'));
    await idbPut(file.name,buf);
    if(isChar){
      const idIn=h('input',{type:'text',value:slug(file.name.replace(/\.glb$/i,'')),class:'hex'});
      rep.append(h('div',{class:'crow'},h('span',{text:'Add as character model with id'}),idIn,h('button',{text:'Add',onclick:async()=>{ const i=slug(idIn.value); if(!i) return; const base=CONTENT.models.hero||{}; CONTENT.models[i]={file:file.name,yaw:90,height:0,pose:'arms_down',bones:clone(base.bones||{})}; ED.sel.models=i; commit(); await preloadModels(); refreshViews(); render(); toast('Model added: '+i); }})));
    } else {
      rep.append(h('div',{},h('small',{class:'fnote',text:'No skeleton found, so this is a prop kit. Each object becomes a prop you can attach to a bone:'}),
        ...r.meshes.filter(Boolean).map(n=>h('div',{class:'crow'},h('span',{text:n}),h('button',{text:'Add as prop',onclick:async()=>{ const i=slug(n); if(CONTENT.props[i]){ alert('A prop with id '+i+' already exists.'); return; } CONTENT.props[i]={shape:'kit',file:file.name,mesh:n,bone:(n.startsWith('hat')||n.startsWith('mask'))?'head':'hand_r',size:[1,1,1],offset:[0,0,0],rot:[0,0,0]}; ED.sel.props=i; ED.tab='props'; commit(); await preloadModels(); refreshViews(); render(); toast('Prop added: '+i); }})))));
    }
  }catch(e){ rep.innerHTML=''; rep.append(h('div',{class:'rep bad',text:'Could not read that file: '+(e&&e.message||e)})); }
}

function tabSettings(b){
  const S0=CONTENT.settings, nice={arenaX:'Arena half-width',zMax:'Arena half-depth',hpGrowth:'Enemy health growth per wave',dmgGrowth:'Enemy damage growth per wave',chiGrowth:'Chi reward growth per wave',waveBase:'Enemies in wave 1 (base)',wavePerLevel:'Extra enemies per wave',waveMax:'Max enemies per wave',maxAlive:'Max enemies alive at once',spawnGap:'Seconds between spawns',bossEvery:'Boss every N waves',offlineBase:'Offline progress cap (seconds)',blastBase:'Focus blast damage multiplier'};
  b.append(sec('Balance and waves'));
  for(const k of Object.keys(nice)) b.append(row(nice[k],numIn(S0,k)));
  b.append(sec('Boss names (one per line, used in order)'));
  const ta=h('textarea',{rows:5}); ta.value=(S0.bossNames||[]).join('\n'); ta.addEventListener('input',()=>{ S0.bossNames=ta.value.split('\n').map(x=>x.trim()).filter(Boolean); commit(); }); b.append(ta);
  b.append(sec('Default effects'));
  const fd=S0.fxDefaults||(S0.fxDefaults={});
  for(const [k,l] of [['crit','Critical hit'],['block','Blocked by a guard'],['guardBreak','Guard broken'],['heroHurt','Hero is hurt'],['kill','An enemy dies']]) b.append(row(l,selIn(fd,k,fxList(false))));
}

/* ---------- panel shell ---------- */
let panel=null;
function render(){
  if(!panel) return; const body=panel.querySelector('#edBody'); const scroll=body.scrollTop; body.innerHTML='';
  panel.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on',t.dataset.t===ED.tab));
  ({hero:tabHero,enemies:tabEnemies,attacks:tabAttacks,effects:tabEffects,upgrades:tabUpgrades,props:tabProps,models:tabModels,settings:tabSettings})[ED.tab](body);
  body.scrollTop=scroll; drawFoot(panel.querySelector('#edFoot'));
}
function drawBtns(){ if(panel) render(); }
async function saveFile(){
  const text=contentText();
  if(window.showSaveFilePicker){ try{ const hnd=await showSaveFilePicker({suggestedName:'content.js',types:[{description:'Game content',accept:{'text/javascript':['.js']}}]}); const w=await hnd.createWritable(); await w.write(text); await w.close(); toast('Saved to the file you chose'); return; }catch(e){ if(e&&e.name==='AbortError') return; } }
  download('content.js',text); toast('Downloaded content.js: put it next to index.html');
}
function importText(text,name){
  try{
    let t=text.trim(); if(/window\.CONTENT\s*=/.test(t)) t=t.replace(/^[\s\S]*?window\.CONTENT\s*=\s*/,'').replace(/;\s*$/,'');
    const o=JSON.parse(t), iss=validateContent(o); const errs=iss.filter(i=>i.level==='error');
    if(errs.length&&!confirm('This file has '+errs.length+' problem(s), e.g. '+errs[0].where+': '+errs[0].msg+'\nLoad it anyway?')) return;
    Object.keys(CONTENT).forEach(k=>delete CONTENT[k]); Object.assign(CONTENT,o); commit(); preloadModels().then(()=>{ refreshViews(); render(); }); toast('Loaded '+name);
  }catch(e){ alert('Could not read that file: '+e.message); }
}
function build(){
  const css=h('style',{text:`
  body.editor #top,body.editor #hud,body.editor #panel,body.editor #bossBar,body.editor #menu{display:none!important}
  body.editor #stage{left:500px;top:0;height:auto}
  #editor{position:fixed;left:0;top:0;bottom:0;width:500px;z-index:12;background:#0e1424;border-right:1px solid #33425f;display:none;flex-direction:column;color:#e8ecf4;font-size:13px}
  body.editor #editor{display:flex}
  #editor header{padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;border-bottom:1px solid #223}
  #editor header b{letter-spacing:.1em;margin-right:auto}
  #editor button,#editor select,#editor input[type=text],#editor input[type=number],#editor textarea{background:#18223a;color:#e8ecf4;border:1px solid #33425f;border-radius:6px;padding:4px 8px;font:inherit}
  #editor button{cursor:pointer} #editor button:hover{background:#22304f} #editor button.play{background:#2b4a7a;border-color:#4b73b3}
  #editor .tabs{display:flex;flex-wrap:wrap;gap:4px;padding:6px 10px;border-bottom:1px solid #223}
  #editor .tab{border-radius:999px;padding:3px 11px} #editor .tab.on{background:#2b4a7a;border-color:#7fb0ff}
  #edBody{flex:1;overflow:auto;padding:8px 12px 30px}
  #edFoot{border-top:1px solid #223;padding:6px 10px;max-height:130px;overflow:auto;font-size:12px}
  .er{display:grid;grid-template-columns:150px 1fr;gap:2px 8px;align-items:center;margin:5px 0} .er small{grid-column:2;color:#8d99b3} .er input[type=number],.er input[type=text],.er select,.er textarea{width:100%}
  .lbl{color:#b9c4dc} #editor h4{margin:14px 0 4px;font-size:12px;letter-spacing:.1em;color:#7fb0ff;text-transform:uppercase}
  .listbar{display:flex;gap:6px;margin:4px 0 8px} .listbar .list{flex:1} .listbar .btns{display:flex;flex-direction:column;gap:4px}
  .btns{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  .card{background:#141c30;border:1px solid #2a3855;border-radius:8px;padding:8px 10px;margin:8px 0} .crow{display:flex;gap:6px;align-items:center;margin-bottom:6px} .crow>*:first-child{flex:1}
  .x{padding:2px 8px!important;font-size:11px}
  .fbar{display:flex;height:22px;border-radius:5px;overflow:hidden;border:1px solid #33425f;margin:6px 0 2px} .seg{display:flex;align-items:center;justify-content:center;font-size:11px;color:#111;font-weight:700}
  .seg.su{background:#f0c040}.seg.ac{background:#ff6a4a}.seg.rc{background:#5aa0ff} .fnote{display:block;color:#8d99b3;margin:2px 0 6px}
  .hbpic{display:block;margin:6px 0;border-radius:6px}
  .reflist{display:flex;flex-wrap:wrap;gap:4px;align-items:center} .tag{background:#223255;border-radius:999px;padding:2px 4px 2px 9px;font-size:12px} .tag b{cursor:pointer;margin-left:5px;padding:0 4px;color:#ff9a9a} .tag.bad{background:#5a2330}
  .addsel{padding:2px 4px!important}
  .colrow{display:flex;gap:6px} .colrow input[type=color]{width:34px;height:26px;padding:0;border:none;background:none} .hex{width:90px!important}
  .vec{display:flex;gap:4px} .vec input{width:100%;min-width:0}
  .drop{border:2px dashed #4b73b3;border-radius:10px;padding:18px;text-align:center;color:#9fb4d8;cursor:pointer;margin:6px 0} .drop.over{background:#1a2a48}
  .rep{background:#141c30;border:1px solid #2a3855;border-radius:8px;padding:8px 10px;margin:6px 0;line-height:1.5} .rep.bad,.bad{color:#ff8a8a}
  .sum{font-weight:700} .sum.good{color:#7de39a} .sum.bad{color:#ff8a8a} .iss{color:#c7d0e6;margin-top:2px} .iss.error{color:#ff9a9a} .iss.warn{color:#f0c070}
  #edToast{position:fixed;left:520px;bottom:20px;background:#1d2b4a;color:#fff;border:1px solid #4b73b3;border-radius:8px;padding:8px 14px;z-index:30;opacity:0;transition:opacity .3s;pointer-events:none}
  `});
  document.head.append(css);
  panel=h('div',{id:'editor'},
    h('header',null,h('b',{text:'CONTENT EDITOR'}),h('button',{text:'Save to file',class:'play',onclick:saveFile}),h('button',{text:'Export JSON',onclick:()=>download('content.json',pretty(CONTENT))}),
      h('button',{text:'Import',onclick:()=>fi.click()}),h('button',{text:'Reset',onclick:()=>{ if(confirm('Throw away your edits and go back to content.js?')){ try{ localStorage.removeItem(CKEY); }catch(e){} location.reload(); } }}),h('button',{text:'Back to menu',onclick:closeEditor})),
    h('div',{class:'tabs'},...TABS.map(([k,l])=>h('button',{class:'tab',text:l,'data-t':k,onclick:()=>{ ED.tab=k; stopPreview(); render(); refreshViews(); }}))),
    h('div',{id:'edBody'}),h('div',{id:'edFoot'}));
  const fi=h('input',{type:'file',accept:'.json,.js',style:'display:none'}); fi.addEventListener('change',async()=>{ if(fi.files[0]) importText(await fi.files[0].text(),fi.files[0].name); fi.value=''; });
  document.body.append(panel,fi);
}
window.openEditor=function(){
  if(!panel) build();
  ED.gameS=S; MODE='editor'; document.body.classList.remove('menu'); document.body.classList.add('editor'); viewer.spin=true;
  EDITOR_PLAY=false; if(pf) pf.root.visible=false; if(vf) vf.root.visible=true;
  commit(); resize(); render(); refreshViews();
};
function closeEditor(){
  stopPreview(); document.body.classList.remove('editor'); document.body.classList.add('menu'); MODE='menu';
  const g=ED.gameS||S; S=newSim({chi:g.chi,up:g.up,wave:g.wave,best:g.best,auto:g.auto,kills:g.kills,earned:g.earned}); ED.gameS=null;
  for(const f of fmap.values()) disposeFighter(f); fmap.clear();
  refreshViews(); resize();
}
})();
