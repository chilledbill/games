import {ENEMY_PROFILES} from './enemy.js';
import {loadSprites} from './sprites.js';
import {bindChecklist} from './checklist.js';
import {Game} from './game.js';
import {bindInput} from './input.js';
import {render,debugText} from './render.js';
const game=new Game();game.reset('light');const input=bindInput(game),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
loadSprites();
const updateChecklist=bindChecklist(game);
function fitCanvas(){
  const ratio=Math.min(window.devicePixelRatio||1,2);
  const width=Math.round(canvas.clientWidth*ratio),height=Math.round(canvas.clientHeight*ratio);
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  ctx.setTransform(ratio,0,0,ratio,0,0);
}

const hud=document.querySelector('#hud'),boxes=document.querySelector('#boxes'),debug=document.querySelector('#debug');
document.querySelector('#reset').onclick=()=>{input.clear();game.reset();};
for(const name of ['boxes','debug']) document.querySelector('#mobile-'+name).onclick=e=>{ const field=name==='boxes'?boxes:debug;field.checked=!field.checked;e.currentTarget.setAttribute('aria-pressed',String(field.checked));};
document.querySelector('#mobile-reset').onclick=()=>{input.clear();game.reset();};
const help=document.querySelector('#phone-help'),helpToggle=document.querySelector('#help-toggle');
for(const id of ['mobile-boxes','mobile-debug'])help.append(document.querySelector('#'+id));
const showHelp=show=>{help.hidden=!show;helpToggle.setAttribute('aria-expanded',String(show));input.clear();};
helpToggle.onclick=()=>showHelp(help.hidden);
document.querySelector('#help-close').onclick=()=>showHelp(false);
document.querySelector('#fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{showHelp(true);document.querySelector('#phone-help strong').textContent='Your browser uses its own full-screen controls';}
};
document.querySelector('#opponent').onchange=e=>{input.clear();game.reset(e.target.value);};
let previous=performance.now(),accumulator=0;
document.addEventListener('visibilitychange',()=>{previous=performance.now();accumulator=0;});
function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(!document.hidden && help.hidden){accumulator+=dt;while(accumulator>=1/120){game.tick(1/120);accumulator-=1/120;}}
  if(!help.hidden)accumulator=0;
  const koLeft=game.checkKoRestart();if(koLeft<0)input.clear();
  updateChecklist();
  fitCanvas();
  render(ctx,game,boxes.checked,{width:canvas.clientWidth,height:canvas.clientHeight});
  document.querySelector('#combo').innerHTML=game.combo?`${game.combo.toString().padStart(2,'0')}<small>HIT COMBO</small>`:'';
  document.querySelector('#cue').textContent=game.player.hp<=0?'DEFEATED · Restarting in '+Math.ceil(koLeft):game.dummy.hp<=0?'VICTORY · Restarting in '+Math.ceil(koLeft):game.time<(game.player.guardBrokenUntil||0)?'GUARD BROKEN · recover':game.player.guarding?'BLOCKING · protects your front':game.time<game.counterUntil?'PERFECT DODGE · ATTACK TO COUNTER':game.juggle.forced?'JUGGLE LIMIT · target must recover':game.attackHeld!==null && game.time-game.attackHeld>=0.32?'CHARGED CLEAVE READY · release Attack':game.canStep()?'JUMP: ENEMY STEP · once per launch':game.notice;
  document.querySelector('#guard-health').textContent=game.time<(game.player.guardBrokenUntil||0)?'BROKEN':Math.ceil(game.player.guard??100);
  document.querySelector('#guard-meter').value=game.player.guard??100;
  document.querySelector('#player-health').textContent=`${game.player.hp}/100`;
  document.querySelector('#player-hp').value=game.player.hp;
  document.querySelector('#enemy-health').textContent=`${game.dummy.hp}/${game.dummy.maxHp}`;
  document.querySelector('#enemy-hp').max=game.dummy.maxHp;document.querySelector('#enemy-hp').value=game.dummy.hp;
  document.querySelector('#stagger').value=game.dummy.stagger;
  document.querySelector('#armor-label').textContent=game.dummy.armor>0?'ARMORED':game.time<game.dummy.brokenUntil?'BROKEN':'OPEN';
  document.querySelector('#target').textContent=`${ENEMY_PROFILES[game.profile].name.toUpperCase()} / ${game.dummy.state.toUpperCase()}${game.dummy.attack?' · '+game.dummy.attack.id:''}${game.dummy.combo?' · '+game.dummy.combo+' HITS':''}${game.juggle.active?' · '+game.juggle.budget+'/120':''}`;
  hud.hidden=!debug.checked; if(debug.checked)hud.textContent=debugText(game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
