import {ENEMY_PROFILES} from './enemy.js';
import {loadSprites} from './sprites.js';
import {bindChecklist} from './checklist.js';
import {Game} from './game.js';
import {bindInput} from './input.js';
import {render,debugText} from './render.js';
import {skillCooldownLeft} from './skills.js';
import {STYLE} from './style.js';
import {FOCUS} from './resources.js';
import {loadSettings,saveSettings,resetSettings,sanitizeSettings} from './settings.js';
const game=new Game();game.spreadStart=true;game.reset('light');const input=bindInput(game),canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d');
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
// Saved presentation settings (never combat state). Failure to read or write storage is harmless.
let settings=loadSettings();
const scaleInput=document.querySelector('#set-scale'),opacityInput=document.querySelector('#set-opacity'),reducedInput=document.querySelector('#set-reduced');
function applySettings(){
  document.documentElement.style.setProperty('--ctl-scale',settings.controlScale);
  document.documentElement.style.setProperty('--ctl-opacity',settings.controlOpacity);
  scaleInput.value=Math.round(settings.controlScale*100);opacityInput.value=Math.round(settings.controlOpacity*100);reducedInput.checked=settings.reducedEffects;
}
const changeSettings=()=>{settings=sanitizeSettings({controlScale:scaleInput.value/100,controlOpacity:opacityInput.value/100,reducedEffects:reducedInput.checked});saveSettings(settings);applySettings();};
for(const el of [scaleInput,opacityInput,reducedInput])el.addEventListener('input',changeSettings);
document.querySelector('#set-reset').onclick=()=>{settings=resetSettings();applySettings();};
applySettings();
const fillFocus=document.querySelector('#debug-focus');
fillFocus.onclick=()=>{game.resources.player.focus=FOCUS.max;}; // visible only while Debug is on
const skillState=document.querySelector('#skill-state'),focusMeter=document.querySelector('#focus-meter'),focusLabel=document.querySelector('#focus-label'),styleRank=document.querySelector('#style-rank'),rankToast=document.querySelector('#rank-toast');
let seenRankChange=null;
let previous=performance.now(),accumulator=0;
document.addEventListener('visibilitychange',()=>{previous=performance.now();accumulator=0;});
function frame(now){
  const dt=Math.min((now-previous)/1000,.05);previous=now;
  if(!document.hidden && help.hidden){accumulator+=dt;while(accumulator>=1/120){game.tick(1/120);accumulator-=1/120;}}
  if(!help.hidden)accumulator=0;
  const koLeft=game.checkKoRestart();if(koLeft<0)input.clear();
  updateChecklist();
  fitCanvas();
  render(ctx,game,boxes.checked,{width:canvas.clientWidth,height:canvas.clientHeight},{reduced:settings.reducedEffects});
  const left=skillCooldownLeft(game.player,game.time);
  skillState.textContent=left>0?`PHOENIX ${left.toFixed(1)}s`:'PHOENIX READY';skillState.classList.toggle('ready',left<=0);
  const focus=game.resources.player.focus;focusMeter.value=focus;focusMeter.classList.toggle('full',focus>=FOCUS.max);focusLabel.textContent=focus>=FOCUS.max?'FULL':Math.floor(focus);
  const next=STYLE.ranks.find(([,min])=>min>game.style.score);
  styleRank.textContent=`${game.profile==='practice'?'PRACTICE ':''}STYLE ${game.style.rank} ${Math.floor(game.style.score)}${next?'/'+next[1]:''}`;
  const change=game.style.change;
  if(change&&change!==seenRankChange){seenRankChange=change;rankToast.textContent=`${STYLE.ranks.findIndex(r=>r[0]===change.to)>STYLE.ranks.findIndex(r=>r[0]===change.from)?'RANK UP':'RANK DOWN'} · ${change.to}`;rankToast.hidden=false;clearTimeout(frame.toastTimer);frame.toastTimer=setTimeout(()=>{rankToast.hidden=true;},1500);}
  fillFocus.hidden=!debug.checked;
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
