// Style is performance feedback only. It is independent of Focus and is never spent.
export const STYLE={
  points:{hit:10,launch:15,relaunch:15,step:15,perfectDodge:25,skill:10,finisher:30},
  variety:5,repeat:[1,.5,.25,0],damagePenalty:40,idleSeconds:2,decayPerSecond:10,
  ranks:[['D',0],['C',50],['B',120],['A',220],['S',350],['SS',500]],
};
export const rankFor=score=>STYLE.ranks.reduce((r,[name,min])=>score>=min?name:r,'D');
export class Style{
  constructor(){this.reset();}
  reset(){this.score=0;this.rank='D';this.lastEventAt=-10;this.recent=[];this.lastKey=null;this.repeatCount=0;
    this.seen=new Set();this.order=[];this.change=null;}
  record(kind,key,now,hitId){
    if(!hitId||this.seen.has(hitId))return 0;
    this.seen.add(hitId);this.order.push(hitId);if(this.order.length>96)this.seen.delete(this.order.shift());
    const base=STYLE.points[kind]??0;if(base<=0)return 0;
    if(key===this.lastKey)this.repeatCount++;else{this.lastKey=key;this.repeatCount=0;}
    const mult=STYLE.repeat[Math.min(this.repeatCount,STYLE.repeat.length-1)];
    const variety=!this.recent.slice(-2).includes(key)?STYLE.variety:0;
    this.recent.push(key);if(this.recent.length>4)this.recent.shift();
    const gain=Math.round(base*mult)+(mult>0?variety:0);
    this.set(this.score+gain,now);this.lastEventAt=now;return gain;
  }
  // Only real health damage costs style; blocking and normal dodges do not.
  penalize(now){this.set(Math.max(0,this.score-STYLE.damagePenalty),now);this.lastEventAt=now;}
  tick(now,dt){
    if(this.score>0&&now-this.lastEventAt>STYLE.idleSeconds)this.set(Math.max(0,this.score-STYLE.decayPerSecond*dt),now);
  }
  set(score,now){
    this.score=score;const rank=rankFor(score);
    if(rank!==this.rank){this.change={from:this.rank,to:rank,time:now};this.rank=rank;}
  }
}
