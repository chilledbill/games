export const GUARD={max:100,regen:24,delay:.8,breakTime:.8};
export const grounded=e=>e.y===(e.x<180?38:0);
export function tickGuard(e,now,dt){
 if(e.guard===undefined)e.guard=GUARD.max;
 if(now>=(e.guardBrokenUntil||0) && now-(e.lastGuardHit||-10)>GUARD.delay && !e.guarding)e.guard=Math.min(GUARD.max,e.guard+GUARD.regen*dt);
}
export function guardImpact(defender,attacker,move,now){
 if(!defender.guarding||!grounded(defender)||now<(defender.guardBrokenUntil||0)|| (attacker.x-defender.x)*defender.facing<0)return null;
 const cost=move.id==='G_Charge'?48:move.id==='G_Counter'?35:move.id==='G_Light4'?30:18;
 defender.guard=Math.max(0,(defender.guard??GUARD.max)-cost);defender.lastGuardHit=now;
 if(!defender.guard){defender.guarding=false;defender.guardBrokenUntil=now+GUARD.breakTime;return 'break';}
 return 'block';
}
