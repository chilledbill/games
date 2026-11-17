import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {MOVES} from '../src/moves.js';
import {SPRITE_SHEETS,spritePose} from '../src/sprites.js';
test('every move resolves to valid sprite cells across its timeline',()=>{
  const g=new Game();
  for(const m of Object.values(MOVES))for(const t of [0,m.startup,m.startup+m.active,m.startup+m.active+m.recovery]){
    g.action={id:m.id,t};const pose=spritePose(g);
    assert.ok(Number.isInteger(pose.frame));assert.ok(pose.frame>=0&&pose.frame<SPRITE_SHEETS[pose.name].frames,m.id);
  }
});
test('attack strike frame aligns to active phase; run and air use locomotion poses',()=>{
  const g=new Game();g.start('G_Light1');g.action.t=MOVES.G_Light1.startup;
  assert.deepEqual(spritePose(g),{name:'Attack1',frame:3});g.action=null;g.player.vx=100;
  assert.equal(spritePose(g).name,'Run');g.player.grounded=false;assert.equal(spritePose(g).name,'Jump');
});
