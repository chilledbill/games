// ============================================================
// MAIN — renderer, camera, game state and the frame loop.
// States: 'start' (title screen) -> 'play' -> 'end' (outro, then results)
// ============================================================
(function () {
  const C = DR.CONFIG;
  const app = document.getElementById('app');

  // ---------- Renderer / scene / camera ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  app.insertBefore(renderer.domElement, app.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(C.camera.fov, 9 / 16, 0.1, 400);

  // Portrait play area: full screen on phones, phone-shaped column on desktop
  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(vw, Math.round(vh * 0.6));
    app.style.width = w + 'px';
    renderer.setSize(w, vh, false);
    camera.aspect = w / vh;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  DR.World.init(scene);
  DR.Player.build(scene);
  DR.Entities.init(scene);
  DR.Combat.init(scene);
  DR.Feel.init(scene);
  DR.HUD.init();
  DR.Input.init(document.getElementById('zone'), document.getElementById('rageBtn'));

  // ---------- Game state ----------
  const G = {
    state: 'start',
    time: 0,        // game time (seconds)
    traveled: 0,    // world units flown this level
    speed: 0,       // current forward speed
    coins: 0,
    kills: 0,
    rage: 0,        // meter 0..100
    rageT: 0,       // seconds of rage left (>0 = active)
    win: false,
    endTimer: 0     // counts down during the outro before results show
  };
  let levelInfo = null;

  const params = new URLSearchParams(location.search);
  const LEVEL_ID = params.get('level') || 'outerWall';

  function startLevel() {
    Object.assign(G, { state: 'play', time: 0, traveled: 0, speed: C.forwardSpeed, coins: 0, kills: 0, rage: 0, rageT: 0, rageCount: 0, win: false, endTimer: 0, resultsShown: false });
    DR.Player.reset();
    DR.Feel.reset();
    DR.Entities.clear();
    DR.Combat.reset();
    levelInfo = DR.Level.build(LEVEL_ID, false);
    DR.HUD.showPlay();
    DR.HUD.showRage(true);
  }

  function endLevel(win) {
    if (G.state !== 'play') return;
    G.state = 'end'; G.win = win; G.rageT = 0;
    DR.HUD.showRage(false);
    G.endTimer = win ? 1.2 : 1.4;
  }

  // ---------- Input ----------
  DR.Input.on('lane', (dir) => { if (G.state === 'play') DR.Player.move(dir); });
  DR.Input.on('rage', activateRage);

  // ---------- Rage ----------
  const rageOn = () => G.rageT > 0;
  function activateRage() {
    if (G.state !== 'play' || G.rage < 100 || rageOn()) return;
    G.rageT = C.rage.duration;
    G.rageCount++;
    const F = C.feel;
    DR.Feel.shake(F.shakeOnRage);
    DR.Feel.haptic(F.hapticRage);
    DR.HUD.flash('rgba(255,120,20,.9)', 0.9);
    const p = DR.Player.group.position;
    DR.Feel.burst(p, 0xffd34d, 40, 16, 0.6, 4, 1.4);
    DR.Feel.burst(p, 0xff5a1a, 30, 12, 0.7, 4, 1.2);
  }
  document.getElementById('playBtn').addEventListener('click', startLevel);
  document.getElementById('retryBtn').addEventListener('click', startLevel);

  // ---------- Events from entities ----------
  const KILL_COLORS = { flyer: 0xc8392b, barricade: 0x9a6234, archer: 0x9a6234, gate: 0x9a6234, pillar: 0x6c6f76, cannonball: 0x2a2a30, arrow: 0xe8d9b0 };
  DR.Entities.hooks.kill = (e, cause) => {
    G.kills++;
    const F = C.feel, pos = { x: e.x, y: e.y + (e.aimY || 0), z: e.z };
    const color = KILL_COLORS[e.type] || 0xffffff;
    DR.Feel.burst(pos, color, F.particlesPerKill, 11, 0.6, 18, e.stone ? 1.6 : 1.1);
    DR.Feel.burst(pos, 0xff8a1f, Math.round(F.particlesPerKill * 0.6), 8, 0.35, -2, 0.9); // embers
    DR.Feel.shake(e.stone ? F.shakeOnKill * 1.5 : F.shakeOnKill);
    DR.Feel.hitPause(F.hitPauseKill);
    DR.Feel.haptic(F.hapticKill);
    // Fill the rage meter (not while it's running)
    const def = C.enemies[e.type];
    if (!rageOn() && def && def.rage) G.rage = Math.min(100, G.rage + def.rage);
    // Drop coins that pop out and get pulled in
    const n = (C.enemies[e.type] && C.enemies[e.type].coins) || 0;
    for (let i = 0; i < n; i++) {
      const c = DR.Entities.spawn('coin', 1, e.z, {
        x: e.x, y: e.y + (e.aimY || 0), dropped: true,
        vx: (Math.random() - 0.5) * 8, vy: 6 + Math.random() * 4, vz: (Math.random() - 0.5) * 6
      });
      c.magnet = true;
    }
  };

  // A fireball hit something that survived: small spark
  DR.Entities.hooks.hitFlash = (e) => {
    DR.Feel.burst({ x: e.x, y: e.y + (e.aimY || 0), z: e.z }, 0xffc04a, 5, 7, 0.25, 0, 0.8);
  };

  // ---------- Collisions ----------
  function checkCollisions() {
    const P = DR.Player, px = P.x, py = C.flyHeight;
    const magnetR = rageOn() ? C.rage.magnetRadius : C.coins.magnetRadius;
    const list = DR.Entities.list;

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e || !e.alive) continue;

      // Pickups
      if (e.pickup === 'coin') {
        const d = Math.hypot(e.x - px, e.y - py, e.z);
        if (d < 1.6) {
          G.coins++;
          DR.Feel.burst({ x: e.x, y: e.y, z: e.z }, 0xffd34d, 3, 5, 0.25, 0, 0.6);
          DR.Entities.remove(e);
          continue;
        }
        if (d < magnetR) e.magnet = true;
        continue;
      }
      if (e.pickup) {
        if (Math.abs(e.z) < e.halfD + 0.8 && Math.abs(e.x - px) < e.halfW + 0.6) {
          if (e.pickup === 'shield') {
            P.giveShield();
            DR.Feel.burst(P.group.position, 0x59b8ff, 18, 9, 0.5, 0, 1);
            DR.HUD.flash('rgba(80,170,255,.8)', 0.5);
          }
          DR.Entities.remove(e);
        }
        continue;
      }
      if (e.gate) continue;

      // Threats: simple box overlap around the dragon
      if (Math.abs(e.z) > e.halfD + 0.9) continue;
      if (Math.abs(e.x - px) > e.halfW + C.player.hitRadius) continue;
      if ((e.projectile || e.type === 'flyer' || e.type === 'cannonball') && Math.abs(e.y - py) > 1.8) continue;

      // RAGE: you're a battering ram. Everything breaks, nothing hurts.
      if (rageOn() && C.rage.invincible) {
        if (e.destroyable || C.rage.smashStone) DR.Entities.kill(e, 'smash');
        continue;
      }

      // You ram burnable things (they break, you still take the hit);
      // projectiles vanish; stone stays put while you're invulnerable.
      if (P.invulnerable) continue;
      if (e.destroyable) DR.Entities.kill(e, 'ram');
      else if (e.projectile || e.type === 'cannonball') DR.Entities.remove(e);
      playerHit();
    }
  }

  function playerHit() {
    const r = DR.Player.hit(), F = C.feel, p = DR.Player.group.position;
    if (r === 'none') return;
    if (r === 'shield') {
      DR.Feel.shake(0.4);
      DR.Feel.burst(p, 0x59b8ff, 24, 12, 0.5, 6, 1.1);
      DR.HUD.flash('rgba(80,170,255,.9)', 0.7);
      DR.Feel.haptic(30);
      return;
    }
    DR.Feel.shake(F.shakeOnHit);
    DR.Feel.hitPause(F.hitPauseHit);
    DR.Feel.haptic(F.hapticHit);
    DR.Feel.burst(p, 0x3f9b4a, 14, 9, 0.5, 18, 1);
    DR.HUD.flash('rgba(220,20,20,.95)', 0.9);
    if (r === 'dead') endLevel(false);
  }

  // ---------- Simulation step ----------
  function step(dt) {
    G.time += dt;

    // Rage timer and speed boost
    if (G.rageT > 0) {
      G.rageT -= dt;
      G.rage = Math.max(0, 100 * G.rageT / C.rage.duration); // meter drains while active
      if (G.rageT <= 0) { G.rageT = 0; G.rage = 0; }
    }
    if (G.state === 'play') {
      const target = C.forwardSpeed * (rageOn() ? C.rage.speedMult : 1);
      G.speed += (target - G.speed) * Math.min(1, dt * 4);
    }

    if (G.state === 'end') {
      // Outro: keep the world moving, then show results
      G.speed *= Math.pow(G.win ? 0.6 : 0.3, dt);
      G.endTimer -= dt;
      if (G.endTimer <= 0 && !G.resultsShown) {
        G.resultsShown = true;
        const stars = G.win ? DR.Player.hearts : 0;
        DR.HUD.showResults({ win: G.win, coins: G.coins, stars });
      }
    }

    G.traveled += G.speed * dt;

    DR.World.update(dt, G.speed);
    DR.Player.update(dt, G.time, rageOn());
    DR.Level.update(G.traveled);
    DR.Entities.update(dt, G.speed, { x: DR.Player.x, y: C.flyHeight }, G.time);
    if (G.state === 'play') {
      DR.Combat.update(dt, G.speed, rageOn());
      checkCollisions();
      // Step 3: reaching the end of the track wins (the castle gate comes in step 5)
      if (G.traveled >= levelInfo.gateDistance) endLevel(true);
    }

    DR.HUD.setProgress(G.traveled / levelInfo.gateDistance);
    DR.HUD.setHearts(DR.Player.hearts, C.player.hearts, DR.Player.shield);
    DR.HUD.setCoins(G.coins);
    DR.HUD.setRage(G.rage, G.rage >= 100, rageOn());
    DR.Feel.update(dt, G.speed);

    // Rage trail: embers streaming off the dragon
    if (rageOn() && Math.random() < 0.8) {
      const p = DR.Player.group.position;
      DR.Feel.burst({ x: p.x + (Math.random() - 0.5) * 2, y: p.y, z: p.z + 1 }, Math.random() < 0.5 ? 0xffd34d : 0xff5a1a, 1, 3, 0.4, -4, 0.8);
    }
  }

  // Title screen: dragon cruises slowly behind the menu
  function idle(dt) {
    G.time += dt;
    DR.World.update(dt, C.forwardSpeed * 0.5);
    DR.Player.update(dt, G.time, false);
  }

  // ---------- Camera ----------
  const shakeV = new THREE.Vector3();
  let camTime = 0;
  function updateCamera(realDt) {
    camTime += realDt;
    const px = DR.Player.x * C.camera.followX;
    camera.position.set(px, C.camera.height, C.camera.back);
    camera.lookAt(px * 0.8, C.flyHeight * 0.55, -C.camera.lookAhead);
    DR.Feel.shakeOffset(shakeV, camTime);
    camera.position.add(shakeV);
    // Wider FOV during rage sells the speed
    const fov = C.camera.fov + (rageOn() ? C.camera.rageFovBoost : 0);
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * Math.min(1, realDt * 6);
      camera.updateProjectionMatrix();
    }
  }

  // ---------- Frame loop ----------
  let last = performance.now();
  function frame(now) {
    const realDt = Math.min(0.05, (now - last) / 1000); // clamp so a tab switch doesn't teleport us
    last = now;

    // Hit pause: skip the simulation for a few frames, but keep rendering (and shaking)
    const frozen = DR.Feel.frozen(realDt);
    if (G.state === 'play' || G.state === 'end') { if (!frozen) step(realDt); }
    else idle(realDt);

    updateCamera(realDt);
    DR.Debug.tick(realDt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  DR.Debug.init({
    rage() { G.rage = 100; },
    restart() { startLevel(); }
  });

  window.DR.Game = G; // handy for poking at state from the console
})();
