// Camera follow math, kept free of canvas/DOM so it can be tested.
// Near the rival the camera frames both fighters; far away it follows the player. The blend between
// the two is continuous (the old hard switch at 220 units made the view jump by up to 110 units).
export const CAMERA={nearDistance:180,farDistance:300,rate:9};
export function cameraTarget(playerX,rivalX){
  const gap=Math.abs(playerX-rivalX);
  const t=Math.min(1,Math.max(0,(CAMERA.farDistance-gap)/(CAMERA.farDistance-CAMERA.nearDistance)));
  const blend=t*t*(3-2*t);
  return playerX+(rivalX-playerX)*.5*blend;
}
// Exponential smoothing toward the target; snaps on first use or when the round was reset.
export function stepCamera(state,target,gameTime,dtSeconds){
  if(state.x===undefined||gameTime<state.gameTime-.01||!Number.isFinite(state.x))state.x=target;
  else state.x+=(target-state.x)*(1-Math.exp(-Math.min(.1,Math.max(0,dtSeconds))*CAMERA.rate));
  state.gameTime=gameTime;
  return state.x;
}
