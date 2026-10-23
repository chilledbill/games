// ============================================================
// MAIN — renderer, camera, game state and the frame loop.
// States: 'start' (title screen) -> 'play' -> 'end' (results)
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
    speed: 0        // current forward speed
  };

  const params = new URLSearchParams(location.search);
  const LEVEL_ID = params.get('level') || 'practice';

  function startLevel() {
    G.state = 'play'; G.time = 0; G.traveled = 0; G.speed = C.forwardSpeed;
    DR.Player.reset();
    DR.Entities.clear();
    DR.Combat.reset();
    DR.Level.build(LEVEL_ID, false);
    DR.HUD.showPlay();
  }

  // ---------- Input ----------
  DR.Input.on('lane', (dir) => { if (G.state === 'play') DR.Player.move(dir); });
  document.getElementById('playBtn').addEventListener('click', startLevel);
  document.getElementById('retryBtn').addEventListener('click', startLevel);

  // ---------- Simulation step ----------
  function step(dt) {
    G.time += dt;
    G.traveled += G.speed * dt;

    DR.World.update(dt, G.speed);
    DR.Player.update(dt, G.time, false);
    DR.Level.update(G.traveled);
    DR.Entities.update(dt, G.speed, { x: DR.Player.x, y: C.flyHeight }, G.time);
    DR.Combat.update(dt, G.speed, false);

    const levelLength = C.level.duration * C.forwardSpeed;
    DR.HUD.setProgress(G.traveled / levelLength);
    DR.HUD.setHearts(DR.Player.hearts, C.player.hearts, DR.Player.shield);
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

    if (G.state === 'play') step(realDt);
    else idle(realDt);

    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.DR.Game = G; // handy for poking at state from the console
})();
