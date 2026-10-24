// ============================================================
// WORLD — sky, lights, scrolling ground, roadside scenery.
// The dragon never really moves forward: the world scrolls toward
// the camera (+Z). That keeps numbers small and recycling simple.
// ============================================================
DR.World = (function () {
  const C = DR.CONFIG;
  const SKY = 0x8fc6e8;
  const GROUND_LEN = 420, TILE = 21; // ground texture repeats every TILE units

  let groundTex;
  const scenery = [];   // trees, rocks: recycled when they pass the camera

  function init(scene) {
    scene.background = new THREE.Color(SKY);
    scene.fog = new THREE.Fog(SKY, 45, 150);

    scene.add(new THREE.HemisphereLight(0xdff2ff, 0x4a6b2a, 0.6));
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.6);
    sun.position.set(-6, 14, 6);
    scene.add(sun);

    // Ground: one long plane with a canvas texture (grass + 3 lane paths + cross stripes for speed)
    groundTex = new THREE.CanvasTexture(makeGroundCanvas());
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(1, GROUND_LEN / TILE);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, GROUND_LEN),
      new THREE.MeshLambertMaterial({ map: groundTex })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -GROUND_LEN / 2 + 40;
    scene.add(ground);

    // Scenery: trees and rocks along both sides
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.6, 6);
    const leafGeo = new THREE.ConeGeometry(1.5, 3.6, 7);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4426 });
    const leafMats = [0x2f7d3a, 0x3d8f45, 0x2a6b34].map(c => new THREE.MeshLambertMaterial({ color: c }));
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8f96 });

    for (let i = 0; i < 46; i++) {
      let obj;
      if (i % 5 === 4) {
        obj = new THREE.Mesh(rockGeo, rockMat);
        obj.scale.set(1 + Math.random(), 0.7 + Math.random() * 0.6, 1 + Math.random());
        obj.position.y = 0.4;
      } else {
        obj = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.8;
        const leaf = new THREE.Mesh(leafGeo, leafMats[i % 3]); leaf.position.y = 3.2;
        obj.add(trunk, leaf);
        obj.scale.setScalar(0.8 + Math.random() * 0.9);
      }
      placeScenery(obj, -Math.random() * 170 + 15);
      scene.add(obj);
      scenery.push(obj);
    }

    // A few big distant hills so the horizon isn't flat
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x5f9a4e });
    for (let i = 0; i < 6; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(30, 12, 8), hillMat);
      hill.scale.y = 0.35;
      hill.position.set((i % 2 ? 1 : -1) * (48 + Math.random() * 20), -2, -150 - i * 18);
      scene.add(hill);
    }
  }

  function placeScenery(obj, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    obj.position.x = side * (7.5 + Math.random() * 14);
    obj.position.z = z;
  }

  function makeGroundCanvas() {
    const W = 512, H = 180, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    g.fillStyle = '#4f9a3d'; g.fillRect(0, 0, W, H);
    // darker cross stripe: gives a strong sense of speed
    g.fillStyle = '#468c36'; g.fillRect(0, 0, W, H * 0.5);
    // lane paths (texture spans 60 world units across)
    const pxPerUnit = W / 60;
    for (let l = 0; l < 3; l++) {
      const cx = W / 2 + (l - 1) * C.laneWidth * pxPerUnit;
      const w = 2.3 * pxPerUnit;
      g.fillStyle = 'rgba(196,160,98,0.75)';
      g.fillRect(cx - w / 2, 0, w, H);
    }
    // grass specks
    for (let i = 0; i < 260; i++) {
      g.fillStyle = Math.random() < 0.5 ? '#6fbc59' : '#4b8e3b';
      g.fillRect(Math.random() * W, Math.random() * H, 3, 3);
    }
    return cv;
  }

  // speed = how many units the world moved toward the camera per second
  function update(dt, speed) {
    groundTex.offset.y += (speed * dt) / TILE;
    for (const obj of scenery) {
      obj.position.z += speed * dt;
      if (obj.position.z > 18) placeScenery(obj, obj.position.z - 175);
    }
  }

  return { init, update };
})();
