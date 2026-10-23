// ============================================================
// INPUT — swipe (touch or mouse drag), arrow keys, rage button.
// The rest of the game subscribes with DR.Input.on(event, fn).
// Events: 'lane' (dir -1 or +1), 'rage'
// ============================================================
DR.Input = (function () {
  const SWIPE_PX = 26;          // how far a finger must move to count as a swipe
  const handlers = { lane() {}, rage() {} };

  let tracking = false, used = false, pointerId = null, startX = 0, startY = 0;

  function on(evt, fn) { handlers[evt] = fn; }

  function init(zone, rageBtn) {
    // Swipe: we switch lanes as soon as the finger passes the threshold
    // (not on release), which feels much snappier.
    zone.addEventListener('pointerdown', (e) => {
      tracking = true; used = false; pointerId = e.pointerId;
      startX = e.clientX; startY = e.clientY;
    });
    zone.addEventListener('pointermove', (e) => {
      if (!tracking || used || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
        handlers.lane(dx > 0 ? 1 : -1);
        used = true; // one lane per swipe
      }
    });
    const end = (e) => { if (e.pointerId === pointerId) tracking = false; };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);

    // Rage button gets its own touch so it never registers as a swipe.
    rageBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      handlers.rage();
    });

    // Keyboard for desktop testing
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') handlers.lane(-1);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') handlers.lane(1);
      else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); handlers.rage(); }
    });
  }

  return { init, on };
})();
