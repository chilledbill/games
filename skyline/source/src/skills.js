// Skill data and per-actor cooldown rules. No DOM access; used by the player and the rival.
export const SKILLS={
  RisingPhoenix:{id:'RisingPhoenix',name:'Rising Phoenix',cooldown:7,ground:'G_RisingPhoenix',air:'A_RisingPhoenix',
    finisher:'F_PhoenixBreak',marker:.24,focusCost:100,finisherRange:140},
};
export const isSkillMove=id=>id==='G_RisingPhoenix'||id==='A_RisingPhoenix';
export const skillCooldownLeft=(actor,now)=>Math.max(0,(actor.skillReadyAt||0)-now);
export const skillReady=(actor,now)=>skillCooldownLeft(actor,now)<=0;
// Start the shared (ground+air) cooldown exactly once, when the skill actually begins.
export const startSkillCooldown=(actor,now,skill=SKILLS.RisingPhoenix)=>{actor.skillReadyAt=now+skill.cooldown;};
export const skillVariant=(airborne,skill=SKILLS.RisingPhoenix)=>airborne?skill.air:skill.ground;
