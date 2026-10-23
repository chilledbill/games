// ============================================================
// DRAGON RUNNER — TUNING
// Every number that affects how the game plays lives here.
// Change a value, reload the page, test. With ?debug=1 in the
// URL, some of these can also be changed live in the debug panel.
// ============================================================
window.DR = window.DR || {};

DR.CONFIG = {
  // ---------- Movement ----------
  forwardSpeed: 22,      // world units per second
  laneWidth: 3.2,        // distance between lane centers
  laneSwitchTime: 0.15,  // seconds to slide one lane
  flyHeight: 3.2,        // dragon's height above the ground
  bankAngle: 0.45,       // roll (radians) while switching lanes

  // ---------- Camera ----------
  camera: {
    fov: 64,
    height: 8.2,         // above the ground
    back: 11,            // behind the dragon
    lookAhead: 20,       // how far ahead the camera aims
    followX: 0.55,       // 0 = camera stays centered, 1 = follows lanes fully
    rageFovBoost: 8      // extra FOV during rage (sense of speed)
  },

  // ---------- Level ----------
  level: {
    duration: 90,        // seconds of flying before the castle gate
    chunkLength: 40,     // length of one level chunk in world units
    spawnAhead: 115,     // how far ahead things appear (~5s at base speed)
    gateStopDistance: 15 // dragon hovers this far from the gate
  },
  spawn: {
    density: 1.0         // >1 packs chunks tighter (more stuff per second). Restart to apply.
  },

  // ---------- Player ----------
  player: {
    hearts: 3,
    invulnTime: 1.0,     // seconds of invulnerability after a hit
    hitRadius: 1.1       // collision half-width of the dragon
  },

  // ---------- Auto-fire ----------
  fire: {
    rate: 7,             // fireballs per second
    speed: 70,           // fireball speed
    damage: 1,
    range: 60,           // only targets within this distance ahead
    homing: 14           // how hard fireballs steer toward their target
  },

  // ---------- Rage ----------
  rage: {
    duration: 5,         // seconds of mega-fire
    fireRate: 22,        // fireballs per second during rage (spread over all lanes)
    damage: 3,
    speedMult: 1.35,     // forward speed multiplier during rage
    invincible: true,    // can't be hurt during rage
    smashStone: true,    // ram through stone and cannonballs during rage
    magnetRadius: 14     // coin pickup radius during rage (covers all lanes)
  },

  // ---------- Coins ----------
  coins: {
    magnetRadius: 5,     // coins closer than this fly to you
    magnetSpeed: 40
  },

  // ---------- Enemies & obstacles ----------
  // hp = fireballs to kill, coins = coins dropped, rage = % of meter per kill
  enemies: {
    archer:    { hp: 3, coins: 3, rage: 14, fireEvery: 1.8, arrowSpeed: 18, fireRangeMax: 64, fireRangeMin: 32, windup: 0.4 },
    flyer:     { hp: 1, coins: 1, rage: 8, approachSpeed: 7 },
    barricade: { hp: 2, coins: 2, rage: 9 },
    cannonball:{ extraSpeed: 16 },          // dodge-only, flies at you faster than the world
    gate:      { hp: 40, coins: 25 }
  },

  // ---------- Game feel (juice) ----------
  feel: {
    screenShake: true,
    hitPause: true,
    particles: true,
    haptics: true,       // Android only; iPhone Safari has no vibration API

    shakeOnKill: 0.22,
    shakeOnHit: 0.75,
    shakeOnRage: 0.55,
    shakeMax: 1.0,

    hitPauseKill: 0.05,    // seconds frozen on a kill (~50ms)
    hitPauseHit: 0.09,     // seconds frozen when you get hit
    hitPauseCooldown: 0.12,// min gap between freezes (keeps rage from stuttering)

    particlesPerKill: 16,

    hapticKill: 12,      // vibration ms
    hapticHit: 70,
    hapticRage: 45
  }
};
