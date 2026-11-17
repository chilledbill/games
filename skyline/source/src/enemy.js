import {guardImpact,grounded} from './guard.js';
import {MOVES,TUNE} from './moves.js';
// AI uses the player's move definitions; only its choices and opening tell differ.
export const ENEMY_PROFILES={
 practice:{name:'Practice dummy',hp:1000,ai:false,armor:0,heavy:false},
 light:{name:'Swordfighter',hp:100,ai:true,armor:0,heavy:false},
 armored:{name:'Armored swordfighter',hp:180,ai:true,armor:100,heavy:false},
 heavy:{name:'Heavy swordfighter',hp:260,ai:true,armor:100,heavy:true},
};
export const DEFENSE={windup:.55,active:.14,recovery:.75,damage:8,speed:TUNE.speed,range:88,invulnerable:.16,perfect:.1,counter:.3,hitstun:.4,reaction:.18,openingTell:.4,turnRecovery:1.1,comboDelay:.18,chainTell:.05};
export const ENEMY_ROUTES=[
 ['G_Light1','G_Light2','G_Light3','G_Light4'],
 ['G_Light1','G_Light2','G_Launcher','Chase','A_Light1','A_Light2','A_Light3'],
 ['G_Light1','G_Sweep'],['G_Charge'],['G_Dodge','G_DashAttack'],
 ['G_Launcher','Chase','A_Light1','A_Light2','A_Relaunch','Wait','A_Light1','A_Light2','A_Plunge'],
 ['G_Launcher','Chase','A_Light1','A_Light2','Step','A_Light1','A_Light2','A_Plunge'],
 ['Jump','DoubleJump','A_Dodge','A_DashAttack'],
];
export function enemyTiming(a){const m=MOVES[a?.id]||MOVES.G_Light1;return {m,startup:m.startup+(a?.tell||0)};}
export function enemyPhase(d){if(!d.attack)return 'Idle';const {m,startup}=enemyTiming(d.attack);return d.attack.t<startup?'Startup':d.attack.t<startup+m.active||d.attack.id==='A_Plunge'&&d.y>0?'Active':'Recovery';}
export function enemyBox(d){const {m}=enemyTiming(d.attack),b=m.hitbox;return {x:d.x+d.facing*b.x-b.width/2,y:d.y+b.y-b.height/2,w:b.width,h:b.height};}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function beginEnemyMove(g,id,tell=0){
 const d=g.dummy;if(!MOVES[id])return false;
 if(MOVES[id].kind==='Dodge'&&g.time<(d.dodgeUntil||0))return false;
 if(id==='A_Dodge'&&!d.airDash)return false;
 d.guarding=false;d.rollDirection=0;d.facing=g.player.x>=d.x?1:-1;d.attack={id,t:0,tell,spent:false,confirmed:false};d.state='Attacking';d.lastMove=id;
 if(MOVES[id].kind==='Dodge'){d.dodgeUntil=g.time+.42;if(id==='A_Dodge'){d.airDash=false;d.vy=0;}}
 if(id.startsWith('A_') && MOVES[id].kind!=='Dodge')d.vy=Math.max(d.vy,65);
 g.events.push({type:'enemyMove',id,time:g.time});if(g.events.length>240)g.events.splice(0,100);
 return true;
}
export function tryEnemyEscape(g){
 const d=g.dummy;
 if(!ENEMY_PROFILES[g.profile].ai||d.hp<=0||!grounded(d)||d.state!=='Neutral'||g.time<(d.escapeUntil||0)||g.time<(d.guardBrokenUntil||0))return false;
 if(!d.escapePending && !((d.pressureHits||0)>=3&&g.time>=d.pressureUntil))return false;
 d.escapePending=false;d.pressureHits=0;d.plan=[];d.guarding=false;d.counterUntil=0;d.escapeUntil=g.time+1.5;
 if(!beginEnemyMove(g,'G_Dodge'))return false;
 d.rollDirection=d.x<196?1:d.x>900?-1:-d.facing;d.vx=d.rollDirection*480;d.escaping=true;
 g.notice='ENEMY ROLL ESCAPE';g.events.push({type:'enemyEscape',time:g.time});return true;
}
function endTurn(g){const d=g.dummy;d.attack=null;d.plan=[];d.state='Neutral';d.readyAt=g.time+(d.escaping?.15:DEFENSE.turnRecovery);d.escaping=false;d.chaseUntil=0;d.vx=0;}
function hitPlayer(g){
 const d=g.dummy,p=g.player,a=d.attack,{m}=enemyTiming(a);
 if(a.spent || !overlap(enemyBox(d),g.body(p)))return;
 const dodge=g.action&&MOVES[g.action.id].kind==='Dodge';
 if(dodge&&g.action.t<=DEFENSE.invulnerable){
  a.spent=true;
  if(g.action.t<=DEFENSE.perfect){g.counterUntil=g.time+DEFENSE.counter;g.record('PerfectDodge');g.notice='PERFECT DODGE · Attack to counter';}
  else g.notice='DODGED';
  return;
 }
 const guarded=guardImpact(p,d,m,g.time);
 if(guarded==='block'){a.spent=true;g.record('BlockHit');g.notice='BLOCKED';g.effects.push({x:p.x,y:p.y+30,life:.3,damage:'BLOCK'});return;}
 if(guarded==='break'){p.hurtUntil=g.time+.8;g.notice='GUARD BROKEN';}
 if(g.time<p.invulnerableUntil||g.time<p.knockdownUntil)return;
 a.spent=true;a.confirmed=true;if(a.id.startsWith('A_'))d.lastAirHit=g.time;
 const damage=Math.max(1,Math.round(m.damage*Math.max(.4,1-Math.max(0,(d.combo||0)-3)*.05)));
 d.combo=(g.time-(d.lastHit||-10)<1.2?d.combo:0)+1;d.lastHit=g.time;
 p.hp=Math.max(0,p.hp-damage);p.hurtUntil=g.time+(guarded==='break'?.8:DEFENSE.hitstun);
 // Repeated confirmed hits share a bounded victim juggle sequence.
 const airborne=p.y>0||['Launch','Relaunch'].includes(m.reaction);
 if(airborne)g.victimJuggle.spend(m.juggleCost);
 if(g.victimJuggle.forced){p.vy=Math.min(-140,p.vy);p.forcedFall=true;p.enemyLaunched=true;p.y=Math.max(1,p.y);p.grounded=false;}
 else if(['Launch','Relaunch'].includes(m.reaction)){p.y=Math.max(1,p.y);p.vy=m.reaction==='Launch'?TUNE.launcher:245;p.grounded=false;p.enemyLaunched=true;if(m.reaction==='Relaunch')d.vy=230;p.hurtUntil=g.time+.65;d.launchUntil=g.time+TUNE.chaseWindow;}
 else if(m.reaction==='Pop'&&p.y===0){p.y=1;p.vy=80;p.grounded=false;}
 else if(m.reaction==='Spike'){p.vy=-600;p.spiked=true;}
 else if(airborne){p.vy=m.reaction==='AirFinish'?70:110;d.vy=Math.max(d.vy,100);}
 else if(['Knockdown','Knockback'].includes(m.reaction)){p.knockdownUntil=g.time+.7;p.hurtUntil=p.knockdownUntil;}
 if(p.enemyLaunched&&!p.forcedFall)p.hurtUntil=Math.max(p.hurtUntil,g.time+.45);
 g.action=null;g.chain=null;g.chase=null;g.launch=null;g.counterUntil=0;g.combo=0;g.buffer.clear();g.attackHeld=null;
 g.notice=p.hp?`${m.name.toUpperCase()} · enemy combo ${d.combo}`:'DEFEATED · Restarting';
 g.effects.push({x:p.x,y:p.y+30,life:.3,damage});
 g.events.push({type:'enemyHit',id:a.id,time:g.time});
 if(p.hp<=0)endTurn(g);
}
function special(g,token){
 const d=g.dummy,p=g.player;
 const mark=()=>g.events.push({type:'enemyMobility',id:token,time:g.time});
 if(token==='Wait')return true;
 if(token==='Jump'){if(d.y>0)return false;d.vy=TUNE.jump;mark();return true;}
 if(token==='DoubleJump'){if(d.y<=0||!d.double)return false;d.double=false;d.vy=TUNE.jump;mark();return true;}
 if(token==='Chase'){
  if(p.hp<=0||p.y<=0||p.forcedFall||g.time>d.launchUntil||Math.hypot(p.x-d.x,p.y-d.y)>TUNE.chaseRange)return false;
  d.chaseUntil=g.time+TUNE.chaseDuration;d.double=false;d.y=Math.max(1,d.y);mark();return true;
 }
 if(token==='Step'){
  if(!d.lastAirHit||g.time-d.lastAirHit>.3||Math.hypot(p.x-d.x,p.y-d.y)>90||p.y<=0||!g.victimJuggle.step())return false;
  d.vy=150;d.double=true;d.airDash=true;p.hurtUntil=Math.max(p.hurtUntil,g.time+.2);d.lastAirHit=0;mark();return true;
 }
 return false;
}
export function updateEnemy(g,dt){
 const d=g.dummy,p=g.player,profile=ENEMY_PROFILES[g.profile];
 if(!profile.ai||d.hp<=0||p.hp<=0){d.attack=null;return;}
 if(!['Neutral','Attacking'].includes(d.state)){d.attack=null;d.plan=[];d.chaseUntil=0;return;}
 if(tryEnemyEscape(g))return;
 d.guarding=d.state==='Neutral'&&g.time<(d.guardUntil||0)&&g.time>=(d.guardBrokenUntil||0);
 if(d.y===(d.x<180?38:0)){d.double=true;d.airDash=true;}
 if(g.action && d.seenAction!==g.action){d.seenAction=g.action;d.seenAt=g.time;}
 if(d.counterUntil>g.time && d.y===(d.x<180?38:0) && (!d.attack||MOVES[d.attack.id]?.kind==='Dodge')){d.counterUntil=0;d.plan=[];beginEnemyMove(g,'G_Counter');}
 if(d.chaseUntil>g.time){
  if(p.hp<=0||p.y<=0||p.forcedFall){d.chaseUntil=0;}
  else{d.vx=Math.max(-650,Math.min(650,(p.x-d.facing*43-d.x)*18));d.vy=Math.max(-650,Math.min(650,(p.y+3-d.y)*18));}
 }else if(d.attack&&MOVES[d.attack.id]?.kind==='Dodge'){d.vx=(d.rollDirection||d.facing)*480;d.vy=d.y>0?0:d.vy;}
 else d.vx=0;
 if(!d.attack){
  if(g.action&&grounded(d)&&Math.abs(p.x-d.x)<130&&g.time-(d.seenAt||g.time)>=DEFENSE.reaction){d.facing=p.x>=d.x?1:-1;d.guardUntil=g.time+.2;d.guarding=g.time>=(d.guardBrokenUntil||0);}
  if(d.guarding)return;
  if(g.time<(d.readyAt||0))return;
  d.facing=p.x>=d.x?1:-1;
  if(Math.abs(p.x-d.x)>DEFENSE.range){
   const next=Math.max(22,Math.min(938,d.x+d.facing*DEFENSE.speed*dt));
   if(d.x>=196&&next<196&&d.y<38){if(d.vy<=0)d.vy=TUNE.jump;}else d.x=next;
   return;
  }
  if(d.counterUntil>g.time && d.y===0){d.counterUntil=0;beginEnemyMove(g,'G_Counter');return;}
  if(g.action){
   if(g.time-d.seenAt>=DEFENSE.reaction && d.seenAction!==d.evadedAction){
    d.evadedAction=g.action;d.plan=[d.y>0?'A_DashAttack':'G_DashAttack'];beginEnemyMove(g,d.y>0?'A_Dodge':'G_Dodge');return;
   }
  }
  if(!d.plan?.length){const index=d.routeIndex||0;d.routeIndex=index+1;d.plan=[...ENEMY_ROUTES[index%ENEMY_ROUTES.length]];d.combo=0;}
  const id=d.plan.shift();
  if(!MOVES[id]){if(!special(g,id))endTurn(g);else d.readyAt=g.time+.1;return;}
  if(id.startsWith('G_')&&d.y>0){endTurn(g);return;}
  if(id.startsWith('A_')&&d.y===0){endTurn(g);return;}
  beginEnemyMove(g,id,d.combo===0&&MOVES[id].kind!=='Dodge'?DEFENSE.openingTell:0);
 }
 const a=d.attack;if(!a)return;
 a.t+=dt;const {m,startup}=enemyTiming(a);
 if(a.id==='A_Plunge' && a.t>=startup && d.y>0)d.vy=-650;
 if(m.kind!=='Dodge'&&enemyPhase(d)==='Active')hitPlayer(g);
 if(!d.attack)return;
 // Directional branches require a real hit; dodges have their own dash-strike window.
 const next=d.plan?.[0];
 const canCancel=a.confirmed&&a.t>=startup+1/60+(next==='Step'?0:DEFENSE.comboDelay)&&(m.next===next||m.branches.includes(next)||['Chase','Step'].includes(next));
 const dash=m.kind==='Dodge'&&a.t>=.1&&a.t<=.28&&next?.includes('DashAttack');
 if(canCancel||dash){
  d.plan.shift();
  if(MOVES[next])beginEnemyMove(g,next,dash?0:DEFENSE.chainTell);else{d.attack=null;d.state='Neutral';if(!special(g,next))endTurn(g);else d.readyAt=g.time+.12;}
 }else if(a.t>=startup+m.active+m.recovery && (a.id!=='A_Plunge'||d.y===0)){
  d.attack=null;d.state='Neutral';
  if(!a.confirmed&&m.kind!=='Dodge'){endTurn(g);return;}
  d.readyAt=g.time+.08;
  if(!d.plan?.length)endTurn(g);
 }
}
