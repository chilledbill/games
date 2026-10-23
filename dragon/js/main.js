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
    win: false,
    endTimer: 0     // counts down during the outro before results show
  };
  let levelInfo = null;

  const params = new URLSearchParams(location.search);
  const LEVEL_ID = params.get('level') || 'outerWall';

  function startLevel() {
    Object.assign(G, { state: 'play', time: 0, traveled: 0, speed: C.forwardSpeed, coins: 0, kills: 0, win: false, endTimer: 0, resultsShown: false });
    DR.Player.reset();
    DR.Entities.clear();
    DR.Combat.reset();
    levelInfo = DR.Level.build(LEVEL_ID, false);
    DR.HUD.showPlay();
  }

  function endLevel(win) {
    if (G.state !== 'play') return;
    G.state = 'end'; G.win = win;
    G.endTimer = win ? 1.2 : 1.4;
  }

  // ---------- Input ----------
  DR.Input.on('lane', (dir) => { if (G.state === 'play') DR.Player.move(dir); });
  document.getElementById('playBtn').addEventListener('click', startLevel);
  document.getElementById('retryBtn').addEventListener('click', startLevel);

  // ---------- Events from entities ----------
  DR.Entities.hooks.kill = (e) => {
    G.kills++;
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

  // ---------- Collisions ----------
  function checkCollisions() {
    const P = DR.Player, px = P.x, py = C.flyHeight;
    const magnetR = C.coins.magnetRadius;
    const list = DR.Entities.list;

    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e || !e.alive) continue;

      // Pickups
      if (e.pickup === 'coin') {
        const d = Math.hypot(e.x - px, e.y - py, e.z);
        if (d < 1.6) { G.coins++; DR.Entities.remove(e); continue; }
        if (d < magnetR) e.magnet = true;
        continue;
      }
      if (e.pickup) {
        if (Math.abs(e.z) < e.halfD + 0.8 && Math.abs(e.x - px) < e.halfW + 0.6) {
          if (e.pickup === 'shield') P.giveShield();
          DR.Entities.remove(e);
        }
        continue;
      }
      if (e.gate) continue;

      // Threats: simple box overlap around the dragon
      if (Math.abs(e.z) > e.halfD + 0.9) continue;
      if (Math.abs(e.x - px) > e.halfW + C.player.hitRadius) continue;
      if ((e.projectile || e.type === 'flyer' || e.type === 'cannonball') && Math.abs(e.y - py) > 1.8) continue;

      // You ram burnable things (they break, you still take the hit);
      // projectiles vanish; stone stays put while you're invulnerable.
      if (P.invulnerable) continue;
      if (e.destroyable) DR.Entities.kill(e, 'ram');
      else if (e.projectile || e.type === 'cannonball') DR.Entities.remove(e);
      playerHit();
    }
  }

  function playerHit() {
    const r = DR.Player.hit();
    if (r === 'dead') endLevel(false);
  }

  // ---------- Simulation step ----------
  function step(dt) {
    G.time += dt;

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
    DR.Player.update(dt, G.time, false);
    DR.Level.update(G.traveled);
    DR.Entities.update(dt, G.speed, { x: DR.Player.x, y: C.flyHeight }, G.time);
    if (G.state === 'play') {
      DR.Combat.update(dt, G.speed, false);
      checkCollisions();
      // Step 3: reaching the end of the track wins (the castle gate comes in step 5)
      if (G.traveled >= levelInfo.gateDistance) endLevel(true);
    }

    DR.HUD.setProgress(G.traveled / levelInfo.gateDistance);
    DR.HUD.setHearts(DR.Player.hearts, C.player.hearts, DR.Player.shield);
    DR.HUD.setCoins(G.coins);
  }

  // Title screen: dragon cruises slowly behind the menu
  function idle(dt) {
    G.time += dt;
    DR.World.update(dt, C.forwardSpeed * 0.5);
    DR.Player.update(dt, G.time, false);
  }

  // ---------- Camera ----------
  function updateCamera() {
    const px = DR.Player.x * C.camera.followX;
    camera.position.set(px, C.camera.height, C.camera.back);
    camera.lookAt(px * 0.8, C.flyHeight * 0.55, -C.camera.lookAhead);
  }

  // ---------- Frame loop ----------
  let last = performance.now();
  function frame(now) {
    const realDt = Math.min(0.05, (now - last) / 1000); // clamp so a tab switch doesn't teleport us
    last = now;

    if (G.state === 'play' || G.state === 'end') step(realDt);
    else idle(realDt);

    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.DR.Game = G; // handy for poking at state from the console
})();
