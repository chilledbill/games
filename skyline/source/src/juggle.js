// Recovery, never ground contact/bounce, opens a fresh sequence.
export class Juggle {
  constructor(){this.sequence=0;this.reset();}
  reset(){this.budget=120;this.active=false;this.forced=false;this.stepUsed=false;this.groundUsed=false;this.wallUsed=false;}
  spend(cost){if(!this.active){this.active=true;this.sequence++;}this.budget=Math.max(0,this.budget-cost);if(!this.budget)this.forced=true;return !this.forced;}
  step(){if(!this.active||this.forced||this.stepUsed)return false;this.stepUsed=true;this.budget=Math.min(120,this.budget+20);return true;}
  bounce(kind){const key=kind+'Used';if(!this.active||this.forced||this[key])return false;this[key]=true;return true;}
}
