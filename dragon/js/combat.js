// ============================================================
// COMBAT — auto-fire. The dragon shoots fireballs at the nearest
// burnable thing ahead in the lane it's in (or moving into).
// During rage it sprays all three lanes, faster and harder.
// ============================================================
DR.Combat = (function () {
  const C = DR.CONFIG;
  const pool = [], live = [];
  let scene, cooldown = 0, rageLane = 0;
  const _mouth = new THREE.Vector3();

  const geo = new THREE.SphereGeometry(0.6, 10, 8);
  const mNormal = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
  const mRage = new THREE.MeshBasicMaterial({ color: 0xffd34d });
  const coreGeo = new THREE.SphereGeometry(0.32, 8, 6);
  const mCore = new THREE.MeshBasicMaterial({ color: 0xfff6d0 });

  function init(s) {
    scene = s;
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(geo, mNormal);
      m.add(new THREE.Mesh(coreGeo, mCore));
      m.visible = false; scene.add(m); pool.push(m);
    }
  }

  function reset() {
    cooldown = 0;
    while (live.length) release(live[live.length - 1]);
  }

  function release(f) {
    if (f.target) f.target.pending = Math.max(0, f.target.pending - f.damage);
    f.mesh.visible = false; pool.push(f.mesh);
    live.splice(live.indexOf(f), 1);
  }

  // Launch one fireball. target may be null (rage spray down an empty lane).
  function launch(from, target, laneX, rage) {
    const mesh = pool.pop();
    if (!mesh) return;
    const dmg = rage ? C.rage.damage : C.fire.damage;
    mesh.material = rage ? mRage : mNormal;
    mesh.scale.setScalar(rage ? 1.5 : 1);
    mesh.position.copy(from);
    mesh.visible = true;
    // Initial velocity: straight ahead, slightly toward the lane
    const f = { mesh, target, damage: dmg, life: 1.1, vx: (laneX - from.x) * 3, vy: 0, vz: -C.fire.speed };
    if (target) target.pending += dmg;
    live.push(f);
  }

  // Returns how many shots were fired this frame (for juice)
  function update(dt, worldSpeed, rageOn) {
    const P = DR.Player;
    let shots = 0;
    cooldown -= dt;
    const rate = rageOn ? C.rage.fireRate : C.fire.rate;

    while (cooldown <= 0) {
      cooldown += 1 / rate;
      P.mouthWorld(_mouth);
      if (rageOn) {
        // Cycle lanes so the spray covers all three
        rageLane = (rageLane + 1) % 3;
        const lx = (rageLane - 1) * C.laneWidth;
        const t = DR.Entities.nearestTarget(lx, C.laneWidth * 0.5, C.fire.range) ||
                  DR.Entities.nearestTarget(lx, C.laneWidth * 0.5, C.fire.range * 1.2);
        launch(_mouth, t, lx, true); shots++;
      } else {
        // Aim at the lane we're in or sliding into
        const t = DR.Entities.nearestTarget(P.targetX, C.laneWidth * 0.5, C.fire.range);
        if (t) { launch(_mouth, t, t.x, false); shots++; }
        else { cooldown = Math.max(cooldown, 0); break; } // nothing to shoot: stay ready
      }
    }
    if (shots) P.breathe();

    // Move fireballs: steer toward target, hit on contact
    for (let i = live.length - 1; i >= 0; i--) {
      const f = live[i], m = f.mesh;
      f.life -= dt;
      const t = f.target;
      if (t && t.alive) {
        const tx = t.x, ty = t.y + t.aimY, tz = t.z;
        const dx = tx - m.position.x, dy = ty - m.position.y, dz = tz - m.position.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        // Steer: blend velocity toward the target direction
        const sp = C.fire.speed, k = Math.min(1, C.fire.homing * dt);
        f.vx += (dx / d * sp - f.vx) * k;
        f.vy += (dy / d * sp - f.vy) * k;
        f.vz += (dz / d * sp - f.vz) * k;
        const hitR = t.gate ? 3 : 1.4;
        if (d < hitR || (t.gate && m.position.z <= tz + 1.2)) {
          const tgt = t;
          release(f);
          DR.Entities.damage(tgt, f.damage, f.damage > C.fire.damage ? 'rage' : 'fire');
          continue;
        }
      } else if (t) {
        // target died to another fireball: free its reservation and keep flying
        t.pending = Math.max(0, t.pending - f.damage); f.target = null;
      }
      m.position.x += f.vx * dt; m.position.y += f.vy * dt; m.position.z += f.vz * dt;
      m.scale.setScalar((f.damage > C.fire.damage ? 1.5 : 1) * (0.85 + Math.random() * 0.3));
      if (f.life <= 0 || m.position.z < -C.fire.range * 1.4) release(f);
    }
    return shots;
  }

  return { init, reset, update };
})();
