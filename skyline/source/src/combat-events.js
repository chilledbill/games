// Single pipeline for confirmed combat events. Player and rival both report here, so
// Focus and style rules cannot drift between the two hit implementations.
export function emitCombat(g,ev){
  const key=ev.key||ev.kind;
  const res=ev.actor==='player'?g.resources.player:g.resources.rival;
  const gained=res.award(ev.kind,key,ev.hitId);
  if(ev.actor==='player')g.style.record(ev.kind,key,g.time,ev.hitId);
  g.events.push({type:'combat',actor:ev.actor,kind:ev.kind,gained,time:g.time});
  return gained;
}
