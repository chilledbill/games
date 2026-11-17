import {MOVES} from './moves.js';
// Original sheets: horizontal 64px cells, facing right, feet at source Y=48.
// Presentation only: combat timing, hurtboxes and hit detection remain in Game.
export const SPRITE_SHEETS = {
  Block:{frames:6},Hit:{frames:2},Death:{frames:7},Idle:{frames:8},Run:{frames:8},Jump:{frames:11},
  Attack1:{frames:7,impact:3},Attack2:{frames:5,impact:1},Attack3:{frames:8,impact:2},
  JumpAttack1:{frames:6,impact:2},JumpAttack2:{frames:5,impact:1},
  CrouchAttack:{frames:10,impact:3},Slide:{frames:10},
};
const moveSheets={G_Light1:'Attack1',G_Light2:'Attack2',G_Light3:'Attack3',G_Light4:'Attack3',
  G_Counter:'Attack3',G_Launcher:'Attack1',G_Sweep:'CrouchAttack',G_Charge:'Attack3',G_DashAttack:'Attack2',
  A_Light1:'JumpAttack1',A_Light2:'JumpAttack2',A_Light3:'JumpAttack1',
  A_Relaunch:'JumpAttack1',A_Plunge:'JumpAttack2',A_DashAttack:'JumpAttack2',G_Dodge:'Slide',A_Dodge:'Slide'};
const images=new Map();
export function loadSprites(){
  return Promise.all(['WarriorMan','WarriorWoman'].flatMap(character=>Object.keys(SPRITE_SHEETS).map(name=>new Promise(resolve=>{
    const image=new Image();
    image.onload=()=>{images.set(character+name,image);resolve(true);};
    image.onerror=()=>{console.warn('Sprite unavailable:',name);resolve(false);};
    image.src=globalThis.SKYLINE_SPRITE_DATA?.[character+name] || new URL(`../assets/Characters PackV2/${character}/${character}${name}.png`,import.meta.url).href;
  }))));
}
export function spritePose(g){
  const a=g.action;
  if(a){
    const name=moveSheets[a.id]||'Attack1',sheet=SPRITE_SHEETS[name],m=MOVES[a.id];
    let frame;
    if(m.kind==='Dodge')frame=Math.min(sheet.frames-1,Math.floor(a.t/(m.recovery||.3)*sheet.frames));
    else if(a.t<m.startup)frame=Math.floor(a.t/m.startup*sheet.impact);
    else if(a.id==='A_Plunge'&&!a.landed || a.t<m.startup+m.active)frame=sheet.impact;
    else frame=sheet.impact+1+Math.floor((a.t-m.startup-m.active)/m.recovery*(sheet.frames-sheet.impact-1));
    return {name,frame:Math.max(0,Math.min(sheet.frames-1,frame))};
  }
  if(g.player.hp<=0)return {name:'Death',frame:Math.min(6,Math.max(0,Math.floor((g.time-g.player.hurtUntil+.4)*10)))};
  if(g.time<g.player.hurtUntil)return {name:'Hit',frame:0};
  if(g.player.guarding)return {name:'Block',frame:2};
  if(!g.player.grounded)return {name:'Jump',frame:g.player.vy>0?3:7};
  const name=Math.abs(g.player.vx)>5?'Run':'Idle';
  return {name,frame:Math.floor(g.time*(name==='Run'?12:8))%SPRITE_SHEETS[name].frames};
}
export function drawPlayerSprite(ctx,g){
  const {name,frame}=spritePose(g),image=images.get('WarriorMan'+name);
  if(!image)return false;
  const scale=48/27;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,frame*64,0,64,64,-32*scale,-48*scale,64*scale,64*scale);
  return true;
}

export function drawEnemySprite(ctx,g){
  const d=g.dummy,a=d.attack;
  const hurt=['HitstunGround','Launched','AirHitstun','ForcedFall','Staggered','Knockdown'].includes(d.state);
  const proxy={time:g.time,action:a?{...a,t:Math.max(0,a.t-(a.tell||0)),landed:d.y===0}:null,
    player:{...d,grounded:d.y===(d.x<180?38:0),hurtUntil:hurt?g.time+1:0}};
  const {name,frame}=spritePose(proxy),image=images.get('WarriorWoman'+name);
  if(!image)return false;
  const scale=48/27;ctx.imageSmoothingEnabled=false;
  ctx.save();if(a?.id==='G_Dodge'){ctx.translate(0,-24);ctx.rotate(Math.min(1,a.t/.3)*Math.PI*2);ctx.translate(0,24);}
  ctx.drawImage(image,frame*80,0,80,64,-40*scale,-48*scale,80*scale,64*scale);ctx.restore();
  return true;
}
