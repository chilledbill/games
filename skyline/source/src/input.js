// Device adapters only emit logical commands; combat rules live in Game.
export function bindInput(game) {
  const held=new Map();let order=0;
  const keys={KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'};
  const actions={KeyJ:'Attack',Space:'Jump',KeyK:'Dodge',KeyL:'Guard'};
  function update() {
    const latest=name=>Math.max(0,...[...held.values()].filter(v=>v.name===name).map(v=>v.order));
    const l=latest('left'),r=latest('right'),u=latest('up'),d=latest('down');
    game.direction={x:l||r?(r>l?1:-1):0,y:u&&d?0:u?1:d?-1:0};
  }
  document.addEventListener('keydown',e=>{
    if(keys[e.code]||actions[e.code])e.preventDefault();if(e.repeat)return;
    if(keys[e.code]){held.set(e.code,{name:keys[e.code],order:++order});update();}
    if(actions[e.code])game.press(actions[e.code]);
  });
  document.addEventListener('keyup',e=>{if(actions[e.code])game.release(actions[e.code]);held.delete(e.code);update();});
  document.querySelectorAll('[data-direction],[data-action]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{
      e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('held');
      held.set(e.pointerId,{name:button.dataset.direction||button.dataset.action,order:++order});update();
      if(button.dataset.action)game.press(button.dataset.action);
    });
    // A captured left thumb can slide between directions without lifting.
    if(button.dataset.direction) button.addEventListener('pointermove',e=>{
      if(!held.has(e.pointerId))return;
      const pad=button.parentElement.getBoundingClientRect();
      const x=e.clientX-(pad.x+pad.width/2),y=e.clientY-(pad.y+pad.height/2);
      const name=Math.hypot(x,y)<15?null:Math.abs(x)>Math.abs(y)?(x>0?'right':'left'):(y>0?'down':'up');
      held.set(e.pointerId,{name,order:++order});update();
      button.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('held',b.dataset.direction===name));
    });
    const release=e=>{if(button.dataset.action && held.has(e.pointerId))game.release(button.dataset.action);held.delete(e.pointerId);update();button.classList.remove('held');if(button.dataset.direction)button.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('held'));};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  const clear=()=>{held.clear();update();game.buffer.clear();game.attackHeld=null;game.release('Guard');document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));};
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return {clear};
}
