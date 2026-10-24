// ============================================================
// ENTITIES — everything that scrolls toward the dragon:
// enemies, obstacles, projectiles, coins, pickups and the castle gate.
//
// Color language (keep this consistent, it's how players read threats):
//   warm (wood brown / red)  = burnable, auto-fire targets it
//   grey / black stone       = dodge-only, fire ignores it
//   gold = coins, blue = shield
// ============================================================
DR.Entities = (function () {
  const C = DR.CONFIG, E = C.enemies;
  const list = [];
  let scene;

  // Callbacks the game hooks into (set by main.js)
  const hooks = { kill() {}, hitFlash() {} };

  // ---------- Shared geometry & materials ----------
  const lam = (c, o) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}));
  const M = {
    wood: lam(0x9a6234), woodDark: lam(0x6e4224), roof: lam(0xb8382c), enemy: lam(0xc8392b),
    enemyWing: lam(0x7d1f17, { side: THREE.DoubleSide }), stone: lam(0x6c6f76), stoneDark: lam(0x4a4c52),
    iron: lam(0x1d1d22), arrow: lam(0xe8d9b0), coin: lam(0xffc93a, { emissive: 0x7a4e00 }),
    shield: new THREE.MeshLambertMaterial({ color: 0x4fb2ff, emissive: 0x0b3d77 }),
    glow: new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.55, depthWrite: false })
  };
  const GEO = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 14, 10),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 10),
    coin: new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14),
    shield: new THREE.OctahedronGeometry(0.8, 0)
  };
  function part(geo, mat, sx, sy, sz, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz); m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  // ---------- Builders ----------
  // Each returns { mesh, props } where props override entity defaults.
  const BUILD = {
    // Flying grunt: red, 1 hit, flies at you
    flyer() {
      const g = new THREE.Group();
      g.add(part(GEO.sphere, M.enemy, 0.7, 0.55, 0.9));
      const wl = part(GEO.box, M.enemyWing, 1.6, 0.06, 0.7, -0.95, 0.15, 0);
      const wr = part(GEO.box, M.enemyWing, 1.6, 0.06, 0.7, 0.95, 0.15, 0);
      g.add(wl, wr, part(GEO.box, M.iron, 0.18, 0.18, 0.4, 0, 0.1, 0.75));
      g.userData.wings = [wl, wr];
      return { mesh: g, props: { hp: E.flyer.hp, destroyable: true, y: C.flyHeight, halfW: 1.1, halfD: 0.8, vz: E.flyer.approachSpeed, aimY: 0 } };
    },
    // Wooden barricade across one lane
    barricade() {
      const g = new THREE.Group();
      g.add(part(GEO.box, M.wood, 2.6, 3.8, 0.5, 0, 1.9, 0));
      for (let i = 0; i < 3; i++) g.add(part(GEO.box, M.woodDark, 2.8, 0.28, 0.6, 0, 0.7 + i * 1.25, 0));
      return { mesh: g, props: { hp: E.barricade.hp, destroyable: true, y: 0, halfW: 1.3, halfD: 0.5, aimY: 2.4 } };
    },
    // Archer tower: tall wood with red roof, shoots arrows at your lane
    archer() {
      const g = new THREE.Group();
      g.add(part(GEO.cyl, M.wood, 0.95, 4.6, 0.95, 0, 2.3, 0));
      g.add(part(GEO.box, M.woodDark, 2.2, 0.4, 2.2, 0, 4.7, 0));
      g.add(part(GEO.cone, M.roof, 1.5, 1.6, 1.5, 0, 6.5, 0));
      const archer = part(GEO.box, M.enemy, 0.45, 0.6, 0.45, 0, 5.2, 0.4); // the archer
      g.add(archer);
      g.userData.archer = archer;
      return { mesh: g, props: { hp: E.archer.hp, destroyable: true, y: 0, halfW: 1.0, halfD: 1.0, aimY: 4.2, fireT: 0.4 } };
    },
    // Stone pillar: dodge-only
    pillar() {
      const g = new THREE.Group();
      g.add(part(GEO.cyl, M.stone, 1.05, 9, 1.05, 0, 4.5, 0));
      g.add(part(GEO.box, M.stoneDark, 2.5, 0.6, 2.5, 0, 0.3, 0));
      g.add(part(GEO.box, M.stoneDark, 2.5, 0.6, 2.5, 0, 9.0, 0));
      return { mesh: g, props: { destroyable: false, stone: true, y: 0, halfW: 1.1, halfD: 1.0 } };
    },
    // Cannonball: dodge-only, flies at you faster than the world, glowing fuse so you see it coming
    cannonball() {
      const g = new THREE.Group();
      g.add(part(GEO.sphere, M.iron, 0.75, 0.75, 0.75));
      g.add(part(GEO.sphere, M.glow, 1.2, 1.2, 1.2));
      return { mesh: g, props: { destroyable: false, stone: true, y: C.flyHeight, halfW: 0.8, halfD: 0.8, vz: E.cannonball.extraSpeed } };
    },
    // Arrow fired by archer towers (dodge-only)
    arrow() {
      const g = new THREE.Group();
      const tip = part(GEO.cone, M.iron, 0.14, 0.35, 0.14, 0, 0, 0.85);
      tip.rotation.x = Math.PI / 2; // cone points +Y by default; turn it to +Z
      g.add(part(GEO.box, M.arrow, 0.09, 0.09, 1.4), tip);
      return { mesh: g, props: { destroyable: false, projectile: true, halfW: 0.45, halfD: 0.7 } };
    },
    coin() {
      const m = new THREE.Mesh(GEO.coin, M.coin);
      m.rotation.x = Math.PI / 2;
      return { mesh: m, props: { pickup: 'coin', y: C.flyHeight, halfW: 1.2, halfD: 1.0 } };
    },
    shield() {
      const m = new THREE.Mesh(GEO.shield, M.shield);
      return { mesh: m, props: { pickup: 'shield', y: C.flyHeight, halfW: 1.4, halfD: 1.2 } };
    },
    // Castle gate finale: spans all three lanes
    gate() {
      const g = new THREE.Group();
      g.add(part(GEO.box, M.stone, 16, 10, 2.4, 0, 5, 0));
      for (const s of [-1, 1]) {
        g.add(part(GEO.cyl, M.stoneDark, 2.2, 14, 2.2, s * 8.5, 7, 0));
        g.add(part(GEO.cone, M.roof, 2.8, 3.5, 2.8, s * 8.5, 15.7, 0));
      }
      for (let i = -3; i <= 3; i++) g.add(part(GEO.box, M.stoneDark, 1.2, 1.2, 2.6, i * 2.2, 10.5, 0));
      g.add(part(GEO.box, M.wood, 7.5, 8, 0.6, 0, 4, 1.4));         // the big wooden door (camera side)
      for (let i = 0; i < 4; i++) g.add(part(GEO.box, M.iron, 7.8, 0.3, 0.3, 0, 1.2 + i * 2, 1.75));
      return { mesh: g, props: { hp: E.gate.hp, destroyable: true, gate: true, y: 0, halfW: 9, halfD: 1.5, aimY: 4.5, anyLane: true } };
    }
  };

  function init(s) { scene = s; }

  // Spawn an entity. lane 0..2 (or x override), z = position along the track (negative = ahead)
  function spawn(type, lane, z, opts) {
    const { mesh, props } = BUILD[type]();
    const e = Object.assign({
      type, mesh, alive: true, hp: 1, maxHp: 1, destroyable: false, stone: false, projectile: false, pickup: null,
      x: (lane - 1) * C.laneWidth, y: 0, z, vx: 0, vy: 0, vz: 0, halfW: 1, halfD: 1, aimY: 0,
      pending: 0, punch: 0, age: 0, spin: Math.random() * 6
    }, props, opts || {});
    e.maxHp = e.hp;
    mesh.position.set(e.x, e.y, e.z);
    scene.add(mesh);
    list.push(e);
    return e;
  }

  // Fire an arrow from a tower toward a point
  function shootArrow(from, tx, ty, tz) {
    const a = spawn('arrow', 1, from.z, { x: from.x, y: from.aimY + 1 });
    const dx = tx - a.x, dy = ty - a.y, dz = tz - a.z;
    const len = Math.hypot(dx, dy, dz) || 1, sp = E.archer.arrowSpeed;
    a.vx = dx / len * sp; a.vy = dy / len * sp; a.vz = dz / len * sp;
    a.mesh.lookAt(a.x + a.vx, a.y + a.vy, a.z + a.vz); // points the arrow's +Z (its tip) along its flight
    return a;
  }

  // Apply damage. Returns true if this hit killed it.
  function damage(e, amount, cause) {
    if (!e.alive || !e.destroyable) return false;
    e.hp -= amount;
    e.punch = 1; // squash-and-stretch hit reaction
    if (e.hp <= 0) { kill(e, cause); return true; }
    hooks.hitFlash(e);
    return false;
  }

  function kill(e, cause) {
    if (!e.alive) return;
    e.alive = false;
    hooks.kill(e, cause);
    remove(e);
  }

  function remove(e) {
    e.alive = false;
    scene.remove(e.mesh);
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
  }

  function clear() { while (list.length) remove(list[list.length - 1]); }

  // worldSpeed: world scroll this frame (units/s). player: {x, y}
  function update(dt, worldSpeed, player, time) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      e.age += dt;
      e.x += e.vx * dt; e.y += e.vy * dt; e.z += (worldSpeed + e.vz) * dt;

      // Per-type behavior
      if (e.type === 'flyer') {
        const w = Math.sin(time * 14 + e.spin) * 0.5;
        e.mesh.userData.wings[0].rotation.z = w; e.mesh.userData.wings[1].rotation.z = -w;
        e.y = C.flyHeight + Math.sin(time * 3 + e.spin) * 0.3;
      } else if (e.type === 'archer') {
        const dist = -e.z;
        const archer = e.mesh.userData.archer;
        if (dist < E.archer.fireRangeMax && dist > E.archer.fireRangeMin) {
          e.fireT -= dt;
          // Telegraph: the archer stretches up just before shooting, so you can react
          const w = e.fireT < E.archer.windup ? 1 - e.fireT / E.archer.windup : 0;
          archer.scale.set(0.45 + w * 0.25, 0.6 + w * 0.7, 0.45 + w * 0.25);
          if (e.fireT <= 0) {
            e.fireT = E.archer.fireEvery;
            // Aim where the player is now (so changing lanes dodges it)
            shootArrow(e, player.x, player.y, 0);
          }
        }
      } else if (e.pickup === 'coin') {
        e.mesh.rotation.z += dt * 6;
        if (e.magnet) {
          // pulled toward the dragon
          const dx = player.x - e.x, dy = player.y - e.y, dz = -e.z;
          const d = Math.hypot(dx, dy, dz) || 1, st = Math.min(d, C.coins.magnetSpeed * dt);
          e.x += dx / d * st; e.y += dy / d * st; e.z += dz / d * st;
        } else if (e.dropped) {
          // dropped from a kill: pop outward, then settle at flying height
          e.vx *= 0.9; e.vz *= 0.9;
          if (e.age < 0.25) e.vy -= 30 * dt; else e.vy = (C.flyHeight - e.y) * 6;
        }
      } else if (e.pickup === 'shield') {
        e.mesh.rotation.y += dt * 2.5;
        e.y = C.flyHeight + Math.sin(time * 4) * 0.25;
      }

      // Hit punch: scale bump that decays
      if (e.punch > 0) {
        e.punch = Math.max(0, e.punch - dt * 8);
        const s = 1 + e.punch * 0.18;
        e.mesh.scale.set(s, 1 - e.punch * 0.1, s);
      }

      e.mesh.position.set(e.x, e.y, e.z);

      // Passed the camera: recycle
      if (e.z > 14 || e.y < -5) remove(e);
    }
  }

  // Nearest burnable thing ahead whose x is within `laneTol` of x (Infinity = any lane)
  function nearestTarget(x, laneTol, range) {
    let best = null;
    for (const e of list) {
      if (!e.alive || !e.destroyable) continue;
      if (e.z > -2.5 || e.z < -range) continue;
      if (!e.anyLane && Math.abs(e.x - x) > laneTol) continue;
      if (e.pending >= e.hp) continue; // enough fireballs already on the way
      if (!best || e.z > best.z) best = e;
    }
    return best;
  }

  return { init, spawn, update, damage, kill, remove, clear, nearestTarget, hooks, get list() { return list; } };
})();
