import { MOVES, TUNE as T } from './moves.js';
import { ENEMY_PROFILES, updateEnemy, enemyPhase, tryEnemyEscape } from './enemy.js';
import {tickGuard,guardImpact} from './guard.js';
import { Juggle } from './juggle.js';
import { InputBuffer } from './buffer.js';
const KO_RESTART_SECONDS = 3;
export const overlaps = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
export class Game {
  constructor() { this.reset(); }
  reset(profile=this.profile||'practice') {
    this.profile=ENEMY_PROFILES[profile]?profile:'practice';
    const opponent=ENEMY_PROFILES[this.profile];this.counterUntil=0;
    this.performed=new Set();this.lastPerformed=null;
    this.time=0; this.buffer=new InputBuffer(); this.direction={x:0,y:0};
    this.player={x:360,y:0,vx:0,vy:0,facing:1,grounded:true,lastGround:0,double:true,airDash:true,hp:100,hurtUntil:0,invulnerableUntil:0};
    this.dummy={id:1,x:435,y:0,vx:0,vy:0,state:'Neutral',hp:opponent.hp,maxHp:opponent.hp,stun:0,armor:opponent.armor,stagger:0,brokenUntil:0,facing:-1,attack:null,airDash:true,double:true,plan:[],readyAt:0,routeIndex:0,combo:0};
    this.victimJuggle=new Juggle();this.juggle=new Juggle();this.dodgeUntil=0;this.stepUntil=0;this.attackHeld=null;this.guardHeld=false;
    this.action=null; this.chain=null; this.chainUntil=0; this.launch=null; this.chase=null;
    this.hits=0; this.combo=0; this.lastHit=-10; this.hitstop=0; this.effects=[]; this.history=[]; this.events=[];
    this.lastMove='—'; this.koAt=null; this.notice=opponent.ai?'SPARRING · Dodge the marked strike':'Approach the dummy · press Attack';
  }
  // Auto-restart after a KO. Uses simulation time, so Help-pause also pauses the countdown.
  // Returns seconds remaining (0 when nobody is KO'd) or -1 on the frame the round restarts.
  // Checklist progress survives an automatic restart; the Reset button still clears it.
  checkKoRestart(seconds=KO_RESTART_SECONDS) {
    if(this.player.hp>0&&this.dummy.hp>0){this.koAt=null;return 0;}
    if(this.koAt===null||this.koAt===undefined)this.koAt=this.time;
    const left=seconds-(this.time-this.koAt);
    if(left>0)return left;
    const keep=this.performed,last=this.lastPerformed;
    this.reset();this.performed=keep;this.lastPerformed=last&&{...last,time:-10};
    return -1;
  }
  press(action, direction=this.direction) {
    if(action==='Guard'){this.guardHeld=true;return;}
    if(action==='Attack')this.attackHeld=this.time;
    this.buffer.add(action,direction,this.time);
    this.history.unshift({text:`${direction.y>0?'↑ ':direction.y<0?'↓ ':''}${action}`,time:this.time});
    this.history.length=Math.min(this.history.length,8);
    // Resolve on press: ordinary attack never waits for hold recognition.
    if (!this.hitstop) this.resolve();
  }
  record(id){
    const first=!this.performed.has(id);this.performed.add(id);this.lastPerformed={id,first,time:this.time};
  }
  release(action){
    if(action==='Guard'){this.guardHeld=false;this.player.guarding=false;return;}
    if(action==='Attack' && this.attackHeld!==null){
      if(this.time-this.attackHeld>=0.32)this.buffer.add('Charge',{...this.direction},this.time);
      this.attackHeld=null;
    }
  }
  canStep(){
    const p=this.player,d=this.dummy;
    return !p.grounded && this.time<=this.stepUntil && d.y>0 && d.hp>0 &&
      ['Launched','AirHitstun'].includes(d.state) && Math.hypot(d.x-p.x,d.y-p.y)<90 &&
      !this.juggle.stepUsed && !this.juggle.forced;
  }
  recordGuardOnce(){if(!this.performed.has('Guard'))this.record('Guard');}
  body(entity) { return {x:entity.x-16,y:entity.y,w:32,h:48}; }
  hitbox() {
    if(!this.action) return null;
    const {hitbox:b}=MOVES[this.action.id], p=this.player;
    return {x:p.x+p.facing*b.x-b.width/2,y:p.y+b.y-b.height/2,w:b.width,h:b.height};
  }
  phase() {
    if(!this.action) return 'Idle';
    if(this.action.id==='A_Plunge' && !this.action.landed && this.action.t>=MOVES.A_Plunge.startup)return 'Active';
    const m=MOVES[this.action.id],t=this.action.t;
    return t<m.startup?'Startup':t<m.startup+m.active?'Active':'Recovery';
  }
  start(id) {
    this.record(id);
    this.action={id,t:0,confirmed:false,hit:new Set()}; this.lastMove=id;
    this.chain=null; this.events.push({type:'move',id,time:this.time});
    if(MOVES[id].kind==='Dodge'){this.chase=null;this.dodgeUntil=this.time+0.42;if(!this.player.grounded){this.player.airDash=false;this.player.vy=0;}}
    if(id.startsWith('A_') && MOVES[id].kind!=='Dodge') this.player.vy=Math.max(this.player.vy,65);
  }
  validChase() {
    const d=this.dummy,p=this.player;
    return this.launch && this.time<=this.launch.until && d.id===this.launch.id &&
      d.hp>0 && d.y>0 && ['Launched','AirHitstun'].includes(d.state) &&
      Math.hypot(d.x-p.x,d.y-p.y)<T.chaseRange && d.x>=16 && d.x<=944;
  }
  resolve() {
    this.buffer.expire(this.time);
    const p=this.player,d=this.dummy;
    if(p.hp<=0 || this.time<(p.guardBrokenUntil||0) || this.time<p.hurtUntil || p.enemyLaunched&&p.y>0)return;
    for(const c of [...this.buffer.commands]) {
      if(c.action!=='Guard')p.guarding=false;
      if(c.action==='Jump') {
        if(this.canStep() && (!this.action || ['A_Light1','A_Light2'].includes(this.action.id))){
          if(this.juggle.step()){
            d.stun=Math.max(d.stun,0.2);d.vx=15*p.facing;
            p.vy=310;p.airDash=true;p.double=true;this.action=null;this.chain=null;this.chase=null;this.stepUntil=0;
            this.record('A_EnemyStep');
            this.notice='ENEMY STEP · air mobility restored';this.events.push({type:'step',time:this.time});
            this.buffer.consume(c);continue;
          }
        }
        if(this.validChase() && (!this.action || this.action.id==='G_Launcher')) {
          this.action=null; this.chain=null; this.chase={remaining:T.chaseDuration};
          p.grounded=false; p.double=false; this.launch=null;
          this.record('A_Chase');
          this.notice='AIR CHASE · Attack to juggle';
          this.events.push({type:'chase',time:this.time}); this.buffer.consume(c); continue;
        }
        // Preserve an early chase request until launcher hit confirmation.
        if(this.action) continue;
        if(p.grounded || this.time-p.lastGround<=T.coyote) {
          p.vy=T.jump;p.grounded=false;p.lastGround=-10;this.record('Jump');
        } else if(p.double) {p.vy=T.jump;p.double=false;this.record('DoubleJump');}
        else continue;
        this.buffer.consume(c); this.chain=null;
      } else if(c.action==='Dodge') {
        if(!p.grounded && !p.airDash)continue;
        if(this.time<this.dodgeUntil)continue;
        if(this.action){const m=MOVES[this.action.id];if(!m.dodgeCancel || (!this.action.confirmed && this.phase()!=='Recovery'))continue;}
        if(c.direction.x)p.facing=c.direction.x;
        this.start(p.grounded?'G_Dodge':'A_Dodge');this.buffer.consume(c);
      } else if(c.action==='Charge') {
        if(!p.grounded)continue;
        if(this.action && (!MOVES[this.action.id].chargeCancel || this.phase()!=='Recovery'))continue;
        this.start('G_Charge');this.buffer.consume(c);
      } else if(c.action==='Attack') {
        const air=!p.grounded;
        if(!air && this.time<this.counterUntil){p.facing=c.direction.x||(d.x>=p.x?1:-1);this.counterUntil=0;this.start('G_Counter');this.buffer.consume(c);continue;}
        let id=c.direction.y>0?(air?'A_Relaunch':'G_Launcher'):c.direction.y<0?(air?'A_Plunge':'G_Sweep'):air?'A_Light1':'G_Light1';
        if(this.action) {
          const a=this.action,m=MOVES[a.id];
          if(m.kind==='Dodge'){
            if(c.direction.y || a.t<0.08 || a.t>0.28)continue;
            id=air?'A_DashAttack':'G_DashAttack';
          }else{
            if(!a.confirmed || a.t<m.cancelStart || a.t>m.cancelEnd) continue;
            if(c.direction.y) { if(!m.branches.includes(id)) continue; }
            else { if(!m.next) continue; id=m.next; }
          }
        } else if(this.chain && this.time<=this.chainUntil && !c.direction.y) {
          const next=MOVES[this.chain].next;
          if(next && next.startsWith(air?'A_':'G_')) id=next;
        }
        if(c.direction.x) p.facing=c.direction.x;
        this.start(id);this.buffer.consume(c);
      } else this.buffer.consume(c);
    }
  }
  hit() {
    const a=this.action,d=this.dummy,p=this.player,m=MOVES[a.id];
    if(a.hit.has(d.id) || d.state==='Knockdown' || d.state==='Recovering' || d.state==='Invulnerable' || d.hp<=0 || !overlaps(this.hitbox(),this.body(d))) return;
    if(d.attack && MOVES[d.attack.id]?.kind==='Dodge' && d.attack.t<=.16){
      a.hit.add(d.id);
      if(d.attack.t<=.1&&!d.escaping)d.counterUntil=this.time+.3;
      this.notice='ENEMY DODGED';return;
    }
    const guarded=guardImpact(d,p,m,this.time);
    if(guarded==='block'){a.hit.add(d.id);this.notice='ENEMY BLOCKED · charge or attack from behind';this.effects.push({x:d.x,y:d.y+30,life:.3,damage:'BLOCK'});return;}
    if(guarded==='break'){d.state='Staggered';d.stun=.8;this.notice='ENEMY GUARD BROKEN';}
    a.hit.add(d.id); a.confirmed=true; const scale=this.profile==='practice'?1:Math.max(.4,1-Math.max(0,this.combo-3)*.05);
    const damage=Math.round(m.damage*scale);d.hp=Math.max(0,d.hp-damage);d.stun=Math.max(.22,.65-Math.max(0,this.combo-5)*.025);
    this.hits++;this.combo=this.time-this.lastHit<1.2?this.combo+1:1;this.lastHit=this.time;
    d.vx=0;
    if(this.profile!=='practice'&&d.y===0){
      if(!d.pressureUntil||this.time>d.pressureUntil+.4){d.pressureUntil=this.time+.85;d.pressureHits=0;}
      d.pressureHits=(d.pressureHits||0)+1;
      d.stun=Math.min(d.stun,Math.max(.04,d.pressureUntil-this.time));
    }
const profile=ENEMY_PROFILES[this.profile];
    const resisting=d.armor>0 && this.time>=d.brokenUntil;
    let broke=false;
    if(resisting){
      d.stagger=Math.min(100,d.stagger+m.staggerDamage);
      if(d.stagger>=100){d.stagger=0;d.brokenUntil=this.time+2.2;d.armor=0;d.state='Staggered';d.stun=2.2;d.attack=null;broke=true;this.notice='STAGGER BREAK · punish now';}
    }
    if((resisting && !broke) || profile.heavy){
      if(profile.heavy && (!resisting || broke)){d.attack=null;d.state='Staggered';d.stun=Math.max(d.stun,d.brokenUntil-this.time);}
      this.launch=null;
      if(!broke)this.notice=`ARMOR HIT · stagger ${d.stagger}/100`;
    }else{
    d.attack=null;d.plan=[];d.chaseUntil=0;
    const wasForced=this.juggle.forced;
    const airborneHit=d.y>0 || ['Launch','Relaunch'].includes(m.reaction);
    if(airborneHit)this.juggle.spend(m.juggleCost);
    if(wasForced || this.juggle.forced){d.state='ForcedFall';d.vy=Math.min(d.vy,-100);this.launch=null;this.stepUntil=0;}
    else if(m.reaction==='Relaunch') {d.state='AirHitstun';d.vy=245;d.y=Math.max(1,d.y);p.vy=230;}
    else if(m.reaction==='Spike'){d.state='AirHitstun';d.vy=-600;d.spiked=true;}
    else if(m.reaction==='Knockback'){d.state='Knockdown';d.vx=230*p.facing;d.vy=120;d.y=Math.max(1,d.y);}
    else if(m.reaction==='Launch') {
      d.state='Launched';d.vy=T.launcher;d.y=Math.max(1,d.y);
      this.launch={id:d.id,until:this.time+T.chaseWindow};this.notice='LAUNCH CONFIRMED · press Jump';
    } else if(m.reaction==='Knockdown') {d.state='Knockdown';d.stun=0.8;d.escapePending=true;d.vx=110*p.facing;}
    else if(m.reaction==='Suspend' || m.reaction==='AirFinish') {
      d.state='AirHitstun';d.vy=m.reaction==='AirFinish'?70:110;
      p.vy=Math.max(p.vy,100);d.vx=m.reaction==='AirFinish'?90*p.facing:0;
    } else {d.state=d.y>0?'AirHitstun':'HitstunGround';if(m.reaction==='Pop'){d.vy=80;d.y=1;}}
    }
    if(d.hp<=0){d.state='Dead';d.attack=null;d.plan=[];d.chaseUntil=0;d.vx=0;this.launch=null;this.chase=null;this.notice='VICTORY · Restarting';}
    if(guarded==='break')d.stun=Math.max(.8,d.stun);
    if(a.id.startsWith('A_') && !this.juggle.forced)this.stepUntil=this.time+0.3;
    this.hitstop=m.reaction==='Launch'?0.065:0.045;
    this.effects.push({x:d.x,y:d.y+28,life:0.3,damage});
    this.events.push({type:'hit',id:a.id,time:this.time});
    if(this.events.length>200) this.events.splice(0,100);
  }
  tick(dt) {
    // Fixed 120 Hz simulation called by main; combat time pauses during hitstop.
    if(this.hitstop>0) {this.hitstop=Math.max(0,this.hitstop-dt);return;}
    this.time+=dt;const p=this.player,d=this.dummy;
    p.guarding=this.guardHeld&&p.grounded&&!this.action&&p.hp>0&&this.time>=p.hurtUntil&&this.time>=(p.guardBrokenUntil||0)&&!p.enemyLaunched;
    if(p.guarding)this.recordGuardOnce();
    tickGuard(p,this.time,dt);tickGuard(d,this.time,dt);
    this.effects=this.effects.filter(e=>(e.life-=dt)>0);
    if(p.grounded) p.lastGround=this.time;
    p.vx=p.hp<=0 || this.time<p.hurtUntil || p.enemyLaunched?0:this.direction.x*T.speed*(this.action?0.25:p.guarding?.25:1);
    if(this.action && MOVES[this.action.id].kind==='Dodge'){p.vx=p.facing*480;if(!p.grounded)p.vy=0;}
    if(this.action?.id==='A_Plunge' && this.action.t>=MOVES.A_Plunge.startup && !this.action.landed){p.vy=-650;p.vx=0;}
    if(this.direction.x && !this.action) p.facing=this.direction.x;
    if(this.chase) {
      if(d.y<=0 || d.hp<=0 || !['Launched','AirHitstun'].includes(d.state)) this.chase=null;
      else {
        const tx=d.x-p.facing*43,ty=d.y+3;
        const dx=tx-p.x,dy=ty-p.y;
        // Bounded pursuit speed; all positions still pass through world collision.
        p.vx=Math.max(-T.chaseSpeed,Math.min(T.chaseSpeed,dx*18))+this.direction.x*50;
        p.vy=Math.max(-T.chaseSpeed,Math.min(T.chaseSpeed,dy*18));
        this.chase.remaining-=dt;if(this.chase.remaining<=0)this.chase=null;
      }
    }
    if(!this.chase) p.vy-=T.gravity*dt*((this.action?.id.startsWith('A_')||p.enemyLaunched&&!p.forcedFall)?T.airGravityScale:1);
    const oldX=p.x;
    p.x=Math.max(18,Math.min(942,p.x+p.vx*dt));
    if(oldX>=196 && p.x<196 && p.y<38) p.x=196; // ledge side is solid
    p.y+=p.vy*dt;
    // A raised training ledge exposes a real coyote-time edge.
    const ground=p.x<180?38:0;
    if(p.y<=ground && p.vy<=0) {
      const landed=!p.grounded;p.y=ground;p.vy=0;p.grounded=true;p.double=true;p.airDash=true;
      if(landed && p.enemyLaunched){
        if(p.spiked && this.victimJuggle.bounce('ground')){p.y=ground+1;p.vy=240;p.grounded=false;p.spiked=false;}
        else{p.enemyLaunched=false;p.forcedFall=false;p.spiked=false;p.knockdownUntil=this.time+.7;p.hurtUntil=p.knockdownUntil;}
      }
      if(landed){this.chain=null;this.stepUntil=0;
        if(this.action?.id==='A_Plunge'){this.action.landed=true;this.action.t=MOVES.A_Plunge.startup+MOVES.A_Plunge.active;}
        else if(this.action?.id.startsWith('A_'))this.action=null;
      }
    } else p.grounded=false;
    if(p.grounded&&this.time>=(p.knockdownUntil||0)&&this.victimJuggle.active)this.victimJuggle.reset();
    const attackingAir=d.state==='Attacking'&&d.attack?.id.startsWith('A_')&&d.attack.id!=='A_Plunge';
    d.vy-=T.gravity*dt*((d.state==='AirHitstun'&&d.stun>0)||attackingAir?T.airGravityScale:1);
    const oldEnemyX=d.x;d.x=Math.max(22,Math.min(938,d.x+d.vx*dt));
    if(oldEnemyX>=196&&d.x<196&&d.y<38)d.x=196;
    d.y+=d.vy*dt;
    if(d.y>340){d.y=340;d.vy=Math.min(0,d.vy);}
    if((d.x<=22||d.x>=938)&&Math.abs(d.vx)>50&&d.y>0&&this.juggle.bounce('wall')){d.vx*=-0.65;d.vy=Math.max(100,d.vy);}
    p.y=Math.min(350,p.y);
    const enemyGround=d.x<180?38:0;
    if(d.y<=enemyGround && d.vy<=0) {
      d.y=enemyGround;d.vy=0;
      if(d.attack?.id==='A_Plunge'&&!d.attack.landed){d.attack.landed=true;d.attack.t=MOVES.A_Plunge.startup+(d.attack.tell||0)+MOVES.A_Plunge.active;}d.vx*=0.94;
      if(d.spiked && this.juggle.bounce('ground')){d.y=1;d.vy=240;d.state='AirHitstun';d.spiked=false;}
      else if(['Launched','AirHitstun','ForcedFall'].includes(d.state)) {d.state='Knockdown';d.stun=0.7;d.escapePending=true;this.launch=null;d.spiked=false;}
    }
    if(d.stun>0)d.stun-=dt;
    if(d.stun<=0 && d.y===(d.x<180?38:0) && !['Neutral','Attacking','Dead'].includes(d.state)) {
      d.state='Neutral';if(this.profile==='practice')d.hp=1000;d.vx=0;this.juggle.reset();
      if(this.time>=d.brokenUntil)d.armor=ENEMY_PROFILES[this.profile].armor;
    }
    if(d.state==='Neutral'&&this.time>=d.brokenUntil)d.armor=ENEMY_PROFILES[this.profile].armor;
    tryEnemyEscape(this);
    if(this.action) {
      this.action.t+=dt;
      if(this.phase()==='Active' && MOVES[this.action.id].kind!=='Dodge')this.hit();
      const m=MOVES[this.action.id];
      if(this.action.t>=m.startup+m.active+m.recovery && (this.action.id!=='A_Plunge'||this.action.landed)) {
        this.chain=this.action.confirmed?this.action.id:null;
        this.chainUntil=this.lastHit+T.comboWindow;this.action=null;
      }
    }
    updateEnemy(this,dt);
    this.resolve();
    if(this.time-this.lastHit>1.2)this.combo=0;
  }
}
