// Focus: a 0-100 resource per fighter, separate from health, stagger, guard and style.
export const FOCUS={max:100,
  gains:{hit:4,launch:8,relaunch:6,perfectDodge:12,step:8,skill:6,finisher:0},
  repeat:[1,.5,.25,0]};
export class Resources{
  constructor(){this.reset();}
  reset(){this.focus=0;this.lastKey=null;this.repeatCount=0;this.seen=new Set();this.order=[];}
  // One reward per hit identity. Consecutive uses of the same move earn 1, .5, .25, then 0.
  award(category,key,hitId){
    if(!hitId||this.seen.has(hitId))return 0;
    this.seen.add(hitId);this.order.push(hitId);
    if(this.order.length>96)this.seen.delete(this.order.shift());
    const base=FOCUS.gains[category]??0;
    if(base<=0)return 0;
    if(key===this.lastKey)this.repeatCount++;else{this.lastKey=key;this.repeatCount=0;}
    const gain=Math.round(base*FOCUS.repeat[Math.min(this.repeatCount,FOCUS.repeat.length-1)]);
    const before=this.focus;this.focus=Math.min(FOCUS.max,this.focus+gain);
    return this.focus-before;
  }
  full(){return this.focus>=FOCUS.max;}
  spend(amount){if(this.focus<amount)return false;this.focus-=amount;return true;}
}
