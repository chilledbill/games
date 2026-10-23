// ============================================================
// FEEL — the "juice": screen shake, hit pause, particles, haptics.
// Every effect checks its toggle in CONFIG.feel, so you can switch
// them off one at a time (?debug=1 panel) and feel the difference.
// ============================================================
DR.Feel = (function () {
  const F = DR.CONFIG.feel;
  const pool = [], active = [];
  const mats = {};
  const geo = new THREE.BoxGeometry(0.26, 0.26, 0.26);
  let trauma = 0, freeze = 0, pauseCooldown = 0;

  function mat(color) {
    return mats[color] || (mats[color] = new THREE.MeshBasicMaterial({ color }));
  }

  function init(scene) {
    for (let i = 0; i < 320; i++) {
      const m = new THREE.Mesh(geo, mat(0xffffff));
      m.visible = false; m.userData = { vx: 0, vy: 0, vz: 0, life: 0, max: 1, s: 1, g: 18 };
      scene.add(m); pool.push(m);
    }
  }

  function reset() {
    trauma = 0; freeze = 0; pauseCooldown = 0;
    while (active.length) { const m = active.pop(); m.visible = false; pool.push(m); }
  }

  // ---------- Screen shake (trauma model: shake = trauma², decays over time) ----------
  function shake(amount) {
    if (!F.screenShake) return;
    trauma = Math.min(F.shakeMax, trauma + amount);
  }
  // Writes a camera offset into `out` (a Vector3)
  function shakeOffset(out, t) {
    const s = trauma * trauma;
    out.set(
      (Math.sin(t * 47.3) + Math.sin(t * 91.1) * 0.5) * s * 0.55,
      (Math.sin(t * 39.7 + 1.3) + Math.sin(t * 77.9) * 0.5) * s * 0.45,
      0
    );
    return s;
  }

  // ---------- Hit pause: freeze the simulation for a few frames ----------
  function hitPause(seconds) {
    if (!F.hitPause || pauseCooldown > 0) return;
    freeze = Math.max(freeze, seconds);
    pauseCooldown = F.hitPauseCooldown;
  }
  // Called every frame with real time. Returns true while frozen (skip the sim step).
  function frozen(realDt) {
    pauseCooldown = Math.max(0, pauseCooldown - realDt);
    trauma = Math.max(0, trauma - realDt * 1.5);
    if (freeze > 0) { freeze -= realDt; return true; }
    return false;
  }

  // ---------- Haptics (Android Chrome; iOS Safari doesn't support vibrate) ----------
  function haptic(ms) {
    if (!F.haptics || !navigator.vibrate) return;
    try { navigator.vibrate(ms); } catch (e) { /* ignore */ }
  }

  // ---------- Particles ----------
  // burst(position, color, count, speed, lifetime, gravity, size)
  function burst(pos, color, count, speed, life, gravity, size) {
    if (!F.particles) return;
    speed = speed || 10; life = life || 0.55; gravity = gravity == null ? 18 : gravity; size = size || 1;
    const m0 = mat(color);
    for (let i = 0; i < count; i++) {
      const m = pool.pop();
      if (!m) return;
      const u = m.userData;
      // random direction, biased upward
      let x = Math.random() * 2 - 1, y = Math.random() * 1.6 - 0.4, z = Math.random() * 2 - 1;
      const l = Math.hypot(x, y, z) || 1, sp = speed * (0.35 + Math.random() * 0.75);
      u.vx = x / l * sp; u.vy = y / l * sp; u.vz = z / l * sp;
      u.life = u.max = life * (0.6 + Math.random() * 0.7);
      u.s = size * (0.6 + Math.random() * 0.9); u.g = gravity;
      m.material = m0;
      m.position.set(pos.x, pos.y, pos.z);
      m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      m.scale.setScalar(u.s);
      m.visible = true;
      active.push(m);
    }
  }

  // Particles live in world space, so they scroll with the world
  function update(dt, worldSpeed) {
    for (let i = active.length - 1; i >= 0; i--) {
      const m = active[i], u = m.userData;
      u.life -= dt;
      if (u.life <= 0) { m.visible = false; active.splice(i, 1); pool.push(m); continue; }
      u.vy -= u.g * dt;
      m.position.x += u.vx * dt; m.position.y += u.vy * dt; m.position.z += (u.vz + worldSpeed) * dt;
      m.rotation.x += dt * 8;
      m.scale.setScalar(u.s * (u.life / u.max));
    }
  }

  return { init, reset, shake, shakeOffset, hitPause, frozen, haptic, burst, update };
})();
