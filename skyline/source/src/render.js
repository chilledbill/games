import {DEFENSE,enemyBox,ENEMY_PROFILES,enemyPhase} from './enemy.js';
import {drawPlayerSprite,drawEnemySprite} from './sprites.js';
import {MOVES} from './moves.js';
export function render(ctx,g,boxes=false,viewport={width:960,height:540},opts={}) {
  const reduced=!!opts.reduced;
  ctx.save();
  // Fill the phone view without stretching; follow combatants within world bounds.
  const scale=Math.max(viewport.width/960,viewport.height/540);
  const half=viewport.width/(2*scale);
  const focus=Math.abs(g.player.x-g.dummy.x)<220?(g.player.x+g.dummy.x)/2:g.player.x;
  const camera=Math.max(half,Math.min(960-half,focus));
  ctx.translate(viewport.width/2,viewport.height/2);
  ctx.scale(scale,scale);ctx.translate(-camera,-270);
  const w=960,h=540,floor=410;
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#182c2b');bg.addColorStop(1,'#304337');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // Placeholder dojo architecture and depth grid; no external art.
  ctx.strokeStyle='#8ca78816';ctx.lineWidth=1;
  for(let x=0;x<w;x+=80){ctx.beginPath();ctx.moveTo(x,90);ctx.lineTo(x,floor);ctx.stroke();}
  for(let y=90;y<floor;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.fillStyle='#49634a22';ctx.beginPath();ctx.arc(480,190,112,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#adc48b20';ctx.beginPath();ctx.arc(480,190,100,0,Math.PI*2);ctx.stroke();
  ctx.font='11px monospace';ctx.textAlign='center';ctx.fillStyle='#98ae8b44';ctx.fillText('S K Y L I N E   /   T R A I N I N G   F A C I L I T Y',480,190);
  ctx.fillStyle='#17251f';ctx.fillRect(0,floor,960,130);ctx.fillStyle='#698263';ctx.fillRect(0,floor,960,2);
  for(let x=-400;x<1400;x+=90){ctx.strokeStyle='#49634844';ctx.beginPath();ctx.moveTo(480+(x-480)*.7,floor);ctx.lineTo(x,540);ctx.stroke();}
  [438,483,535].forEach(y=>{ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke();});
  ctx.fillStyle='#304438';ctx.fillRect(0,floor-38,180,38);ctx.fillStyle='#7e936a';ctx.fillRect(0,floor-38,180,2);
  ctx.font='9px monospace';ctx.fillStyle='#8fa27c';ctx.fillText('JUMP LEDGE',90,floor-48);
  function fighter(e,dummy=false) {
    const x=e.x,y=floor-e.y;
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(x,floor+3,23,6,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.translate(x,y);ctx.scale(dummy?(g.profile==='practice'?1:g.dummy.facing):g.player.facing,1);
    const active=!dummy&&g.action;const pose=active?Math.sin(Math.min(1,g.action.t/.22)*Math.PI):0;
    if(dummy && g.profile!=='practice' && drawEnemySprite(ctx,g)){}
    else if(dummy){ctx.fillStyle=e.hp<=0?'#74635b':e.armor>0?'#879ca3':e.state==='Neutral'?'#c69977':'#efd3ac';ctx.fillRect(-13,-35,26,28);ctx.fillStyle='#9a7157';ctx.fillRect(-9,-48,18,12);ctx.fillStyle='#504e38';ctx.fillRect(-9,-7,6,7);ctx.fillRect(3,-7,6,7);ctx.strokeStyle='#61452f';ctx.beginPath();ctx.moveTo(-9,-31);ctx.lineTo(9,-12);ctx.moveTo(9,-31);ctx.lineTo(-9,-12);ctx.stroke();}
    else if(!drawPlayerSprite(ctx,g)) {ctx.fillStyle='#c9e6a2';ctx.fillRect(-9,-48,18,13);ctx.fillStyle='#8fae84';ctx.fillRect(-12,-34,24,23);ctx.fillStyle='#223e35';ctx.fillRect(-12,-32,24,7);ctx.fillStyle='#a7c78b';ctx.fillRect(-11,-11,7,11);ctx.fillRect(4,-11,7,11);ctx.fillStyle='#263d31';ctx.fillRect(-12,-3,10,3);ctx.fillRect(3,-3,11,3);
      ctx.save();ctx.translate(8,-28);ctx.rotate(active?-1.1+pose*2.5:-.6);ctx.fillStyle='#c2d3ac';ctx.fillRect(0,-2,44,3);ctx.fillStyle='#d9e7bb';ctx.fillRect(5,-3,34,2);ctx.fillStyle='#7a9866';ctx.fillRect(0,-7,4,14);ctx.restore();
      if(active && g.phase()==='Active'){ctx.strokeStyle='#d4f4a7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(14,-28,53,-1.4,1.1);ctx.stroke();ctx.strokeStyle='#d4f4a744';ctx.lineWidth=13;ctx.stroke();}}
    ctx.restore();ctx.textAlign='center';ctx.font='9px monospace';ctx.fillStyle=dummy?'#cdb193':'#c5e789';ctx.fillText(dummy?(g.profile==='practice'?'TRAINING DUMMY':g.profile.toUpperCase()):'01 / YOU',x,y-64);
    if(dummy && g.profile!=='practice' && drawEnemySprite(ctx,g)){}
    else if(dummy){ctx.fillStyle='#0005';ctx.fillRect(x-24,y-57,48,3);ctx.fillStyle='#c99974';ctx.fillRect(x-24,y-57,48*e.hp/e.maxHp,3);}
  }
  if(g.dummy.attack){
    const b=enemyBox(g.dummy),phase=enemyPhase(g.dummy),active=phase==='Active';
    if(MOVES[g.dummy.attack.id]?.kind!=='Dodge' && phase!=='Recovery'){
      ctx.fillStyle=active?'#fa675b88':'#edbd5555';ctx.fillRect(b.x,floor-b.y-b.h,b.w,b.h);
      ctx.strokeStyle=active?'#ff5348':'#edbd55';ctx.strokeRect(b.x,floor-b.y-b.h,b.w,b.h);
      ctx.fillStyle='#ffddbb';ctx.font='bold 13px monospace';ctx.fillText(active?'STRIKE':`! ${MOVES[g.dummy.attack.id]?.name||'DODGE'}`,g.dummy.x,floor-g.dummy.y-78);
    }
  }
  fighter(g.dummy,true);fighter(g.player);
  // Phoenix effects: warm arc for the skill, larger gold arc for the finisher. Reduced effects drops the glow.
  const phoenix=(x,y,facing,finisher,progress)=>{
    ctx.save();ctx.translate(x,floor-y-26);ctx.scale(facing,1);
    const radius=finisher?80:58,sweep=-2.1+progress*2.6;
    if(!reduced){ctx.strokeStyle=finisher?'#ffd98a55':'#ff8a3d55';ctx.lineWidth=finisher?20:14;ctx.beginPath();ctx.arc(12,0,radius,-2.1,sweep);ctx.stroke();}
    ctx.strokeStyle=finisher?'#ffd98a':'#ff8a3d';ctx.lineWidth=finisher?8:5;ctx.beginPath();ctx.arc(12,0,radius,-2.1,sweep);ctx.stroke();
    ctx.restore();
  };
  if(g.action&&(g.action.skill||g.action.finisher)){const m=MOVES[g.action.id];phoenix(g.player.x,g.player.y,g.player.facing,!!g.action.finisher,Math.min(1,g.action.t/(m.startup+m.active)));if(g.action.finisher){ctx.fillStyle='#ffd98a';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText('PHOENIX BREAK',g.player.x,floor-g.player.y-96);}}
  if(g.dummy.attack&&MOVES[g.dummy.attack.id]?.skill&&enemyPhase(g.dummy)!=='Recovery'){const m=MOVES[g.dummy.attack.id];phoenix(g.dummy.x,g.dummy.y,g.dummy.facing,false,Math.min(1,Math.max(0,g.dummy.attack.t-(g.dummy.attack.tell||0))/(m.startup+m.active)));}
  if(g.resources.player.focus>=100&&g.player.hp>0){ctx.strokeStyle='#ffb45e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.player.x,floor-g.player.y-24,32+(reduced?0:Math.sin(g.time*6)*2),0,Math.PI*2);ctx.stroke();}
  for(const actor of [g.player,g.dummy]){
    if(actor.guarding){ctx.strokeStyle='#9adcf5';ctx.lineWidth=4;ctx.beginPath();ctx.arc(actor.x+actor.facing*10,floor-actor.y-24,31,actor.facing>0?-1.2:Math.PI-1.2,actor.facing>0?1.2:Math.PI+1.2);ctx.stroke();}
  }
  if(g.dummy.attack?.id==='G_Dodge'){ctx.strokeStyle='#a9edfa';ctx.lineWidth=2;ctx.beginPath();ctx.arc(g.dummy.x,floor-g.dummy.y-24,30,0,Math.PI*2);ctx.stroke();}
  if(g.time<g.player.hurtUntil){ctx.strokeStyle='#ff6b63';ctx.lineWidth=3;ctx.strokeRect(g.player.x-20,floor-g.player.y-52,40,56);}
  if(g.action?.id.endsWith('Dodge') && g.action.t<=DEFENSE.invulnerable){ctx.strokeStyle='#a9edfa';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(g.player.x,floor-g.player.y-24,29,34,0,0,Math.PI*2);ctx.stroke();}
  if(g.time<g.counterUntil){ctx.fillStyle='#d3f49b';ctx.font='bold 13px monospace';ctx.fillText('PERFECT · ATTACK',g.player.x,floor-g.player.y-80);}
  for(const e of g.effects){ctx.globalAlpha=e.life/.3;ctx.strokeStyle='#d5eeb0';for(let i=0;i<6;i++){const a=i*Math.PI/3,r=(.3-e.life)*160;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r,floor-e.y+Math.sin(a)*r);ctx.lineTo(e.x+Math.cos(a)*(r+8),floor-e.y+Math.sin(a)*(r+8));ctx.stroke();}ctx.fillStyle='#f0efcb';ctx.font='bold 16px monospace';ctx.fillText(e.damage,e.x+23,floor-e.y-25-(.3-e.life)*40);ctx.globalAlpha=1;}
  if(boxes){const box=(b,color)=>{ctx.fillStyle=color+'22';ctx.strokeStyle=color;ctx.fillRect(b.x,floor-b.y-b.h,b.w,b.h);ctx.strokeRect(b.x,floor-b.y-b.h,b.w,b.h);};box(g.body(g.player),'#7addec');box(g.body(g.dummy),'#f2b478');if(g.action)box(g.hitbox(),g.phase()==='Active'?'#ff635f':'#a59865');}
  ctx.restore();
}
export function debugText(g){return `SIM ${g.time.toFixed(3)}s | +Y UP | fixed 120 Hz\nLOCOMOTION ${g.player.grounded?'Grounded':g.action?.id==='A_Dodge'?'AirDashing':g.player.vy>0?'Rising':'Falling'} | ACTION ${g.player.hp<=0?'Dead':g.time<g.player.hurtUntil?'HitReact':g.action?(MOVES[g.action.id].kind==='Dodge'?'Dodging':'Attacking'):'Idle'} / ${g.phase()}\nMOVE ${g.action?.id||'—'} | t ${g.action?.t.toFixed(3)||'0'} | HIT CONFIRMED ${!!g.action?.confirmed}\nCOMBO ${g.combo} | TARGET ${g.dummy.state} | FOE MOVE ${g.dummy.attack?.id||'—'} / ${enemyPhase(g.dummy)} | FOE COMBO ${g.dummy.combo} | ARMOR ${g.dummy.armor} STAGGER ${g.dummy.stagger} | STUN ${Math.max(0,g.dummy.stun).toFixed(2)}s\nCHASE ${g.validChase()?'eligible':g.chase?'pursuing':'unavailable'} | TARGET ID ${g.launch?.id||'—'}\nJUGGLE ${g.juggle.budget}/120 | FORCED ${g.juggle.forced} | STEP ${g.juggle.stepUsed} | AIR DASH ${g.player.airDash} | CHARGE ${g.attackHeld!==null && g.time-g.attackHeld>=0.22}\nQUEUE ${g.buffer.commands.map(c=>`${c.action}@${c.time.toFixed(3)} [${c.direction.x},${c.direction.y}]`).join(', ')||'empty'}\nINPUT ${g.history.map(c=>c.text+'@'+c.time.toFixed(2)).join(' · ')}`;}
