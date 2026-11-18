import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraTarget,stepCamera,CAMERA} from '../src/camera.js';

test('camera target is continuous as the player moves away from the rival',()=>{
  let prev=cameraTarget(500,500),worst=0;
  for(let x=500;x>=100;x-=.5){const t=cameraTarget(x,500);worst=Math.max(worst,Math.abs(t-prev));prev=t;}
  assert.ok(worst<=1.6,`largest per-half-unit step ${worst}`); // gradual: the old hard switch jumped 110 units at once
});
test('frames both fighters when close, follows the player when far',()=>{
  assert.equal(cameraTarget(400,500),450);
  assert.equal(cameraTarget(100,500),100);
  assert.equal(cameraTarget(500,100),500);
  assert.ok(CAMERA.nearDistance<CAMERA.farDistance);
});
test('smoothing eases toward the target, snaps first frame and after a reset',()=>{
  const s={};
  assert.equal(stepCamera(s,300,5,.016),300);               // first use snaps
  const a=stepCamera(s,400,5.016,.016);assert.ok(a>300&&a<400);
  let x=a;for(let i=0;i<120;i++)x=stepCamera(s,400,6+i/60,1/60);assert.ok(Math.abs(x-400)<.5);
  assert.equal(stepCamera(s,100,0,.016),100);               // game time went backwards: round reset
  assert.equal(stepCamera({x:NaN},50,1,.016),50);
});
