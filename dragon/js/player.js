// ============================================================
// PLAYER — the dragon and its knight, built from primitives.
// Owns: lane position, banking, wing flaps, hearts, shield, invulnerability.
// The dragon faces -Z (away from the camera).
// ============================================================
DR.Player = (function () {
  const C = DR.CONFIG;

  const group = new THREE.Group();
  let shadow, bubble, flame, bodyMat, wingL, wingR, mouth;

  let lane = 1, x = 0, fromX = 0, toX = 0, slideT = 1;
  let hearts = 3, invuln = 0, shield = false, wingPhase = 0, flameT = 0, fall = 0;

  const laneX = (l) => (l - 1) * C.laneWidth;

  function lambert(color, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {})); }

  function build(scene) {
    bodyMat = lambert(0x3f9b4a, { emissive: 0x000000 });
    const bellyMat = lambert(0xd9c46a);
    const darkMat = lambert(0x2c6e35);

    // Body
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), bodyMat);
    body.scale.set(0.95, 0.78, 1.9);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), bellyMat);
    belly.scale.set(0.75, 0.55, 1.6); belly.position.set(0, -0.28, -0.1);

    // Neck + head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 1.5, 10), bodyMat);
    neck.rotation.x = -1.0; neck.position.set(0, 0.55, -1.75);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.6, 1.15), bodyMat);
    head.position.set(0, 1.05, -2.55);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.55), darkMat);
    snout.position.set(0, 0.95, -3.25);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe04a });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), eyeMat);
      eye.position.set(s * 0.33, 1.2, -2.85);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.6, 6), lambert(0xf1e6c8));
      horn.position.set(s * 0.22, 1.5, -2.25); horn.rotation.x = 0.7;
      group.add(eye, horn);
    }

    // Wings pivot at the shoulders so they flap
    const wingMat = lambert(0x2f7e3c, { side: THREE.DoubleSide });
    const wingGeo = new THREE.BoxGeometry(2.8, 0.08, 1.4);
    wingL = new THREE.Group(); wingR = new THREE.Group();
    const wl = new THREE.Mesh(wingGeo, wingMat); wl.position.x = -1.4;
    const wr = new THREE.Mesh(wingGeo, wingMat); wr.position.x = 1.4;
    wingL.add(wl); wingR.add(wr);
    wingL.position.set(-0.6, 0.45, -0.3); wingR.position.set(0.6, 0.45, -0.3);

    // Tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.2, 8), bodyMat);
    tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.05, 2.7);

    // Knight on the back
    const armor = lambert(0xc3cad4);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.42), armor);
    torso.position.set(0, 1.1, 0.15);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), armor);
    helm.position.set(0, 1.68, 0.15);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55, 6), lambert(0xd8322b));
    plume.position.set(0, 2.0, 0.3); plume.rotation.x = 0.5;
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.05), lambert(0xb32621));
    cape.position.set(0, 1.0, 0.42); cape.rotation.x = 0.35;
    const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, 2.6, 6), lambert(0xe9e2cf));
    lance.rotation.x = -Math.PI / 2 + 0.25; lance.position.set(0.38, 1.25, -0.9);
    const kShield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.42), lambert(0xd8322b));
    kShield.position.set(-0.34, 1.05, 0.05);

    // Fire breath cone at the mouth (flickers while shooting)
    mouth = new THREE.Object3D(); mouth.position.set(0, 0.95, -3.55);
    flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.6, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff8a1f, transparent: true, opacity: 0.85, depthWrite: false })
    );
    flame.rotation.x = -Math.PI / 2; flame.position.z = -0.8;
    mouth.add(flame);

    group.add(body, belly, neck, head, snout, wingL, wingR, tail,
      torso, helm, plume, cape, lance, kShield, mouth);

    // Shield bubble (shown when carrying a shield pickup)
    bubble = new THREE.Mesh(
      new THREE.SphereGeometry(2.7, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0x59b8ff, transparent: true, opacity: 0.22, depthWrite: false })
    );
    bubble.scale.z = 1.5;
    group.add(bubble);

    group.scale.setScalar(0.72);
    scene.add(group);

    // Blob shadow on the ground: helps read which lane you're in
    shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2; shadow.scale.y = 1.7; shadow.position.y = 0.03;
    scene.add(shadow);

    reset();
  }

  function reset() {
    lane = 1; x = fromX = toX = 0; slideT = 1;
    hearts = C.player.hearts; invuln = 0; shield = false; flameT = 0; fall = 0;
    group.visible = true;
  }

  // dir = -1 (left) or +1 (right). Returns false if already at the edge.
  function move(dir) {
    const next = Math.max(0, Math.min(2, lane + dir));
    if (next === lane) return false;
    lane = next; fromX = x; toX = laneX(lane); slideT = 0;
    return true;
  }

  function update(dt, time, rageOn) {
    // Lane slide with ease-out
    if (slideT < 1) {
      slideT = Math.min(1, slideT + dt / C.laneSwitchTime);
      const e = 1 - Math.pow(1 - slideT, 3);
      x = fromX + (toX - fromX) * e;
    }
    const bank = (toX - x) / C.laneWidth; // >0 while moving right
    group.position.set(x, C.flyHeight + Math.sin(time * 2.4) * 0.16, 0);
    group.rotation.z = -bank * C.bankAngle * 2.2;
    group.rotation.y = -bank * 0.35;
    group.rotation.x = Math.sin(time * 2.4 + 1) * 0.04;

    wingPhase += dt * (rageOn ? 15 : 9);
    const flap = Math.sin(wingPhase) * 0.65;
    wingL.rotation.z = flap; wingR.rotation.z = -flap;

    // Fire breath: visible briefly after each shot, big and constant in rage
    flameT = Math.max(0, flameT - dt);
    const f = rageOn ? 1.8 + Math.random() * 0.5 : (flameT > 0 ? 0.8 + Math.random() * 0.4 : 0);
    flame.visible = f > 0;
    flame.scale.set(f, f * (rageOn ? 1.6 : 1), f);
    flame.material.color.setHex(rageOn ? 0xffd34d : 0xff8a1f);

    // Rage glow
    bodyMat.emissive.setHex(rageOn ? 0xff4400 : 0x000000);
    bodyMat.emissiveIntensity = rageOn ? 0.35 + Math.sin(time * 20) * 0.15 : 0;

    // Invulnerability blink
    if (invuln > 0) { invuln -= dt; group.visible = Math.floor(time * 22) % 2 === 0 || invuln <= 0; }
    else group.visible = true;

    // Out of hearts: tumble to the ground
    if (hearts <= 0) {
      fall += dt;
      group.visible = true;
      group.position.y = Math.max(0.8, C.flyHeight - fall * fall * 7);
      group.rotation.z = fall * 4; group.rotation.x = 0.4;
    }

    bubble.visible = shield;
    if (shield) bubble.rotation.y += dt;
    shadow.position.x = x;
  }

  // Called when something hits the dragon. Returns 'none' | 'shield' | 'hurt' | 'dead'
  function hit() {
    if (invuln > 0 || hearts <= 0) return 'none';
    if (shield) { shield = false; invuln = 0.5; return 'shield'; }
    hearts--;
    invuln = C.player.invulnTime;
    return hearts <= 0 ? 'dead' : 'hurt';
  }

  const _v = new THREE.Vector3();
  function mouthWorld(out) { return mouth.getWorldPosition(out || _v); }

  return {
    build, reset, move, update, hit, mouthWorld,
    breathe() { flameT = 0.12; },
    giveShield() { shield = true; },
    get x() { return x; },
    get targetX() { return toX; },
    get lane() { return lane; },
    get hearts() { return hearts; },
    get shield() { return shield; },
    get invulnerable() { return invuln > 0; },
    get group() { return group; }
  };
})();
