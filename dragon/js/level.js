// ============================================================
// LEVEL — built from reusable chunks.
//
// A chunk is a short stretch of track (CONFIG.level.chunkLength units).
// Each entry is [type, lane, position] where lane is 0/1/2 (left/mid/right)
// and position is 0..1 along the chunk.
//
// A level is a list of phases. Each phase takes a share of the level's
// length and picks chunks from its pool (seeded, so the level is the same
// every run). To make a new level: add chunks, add an entry to LEVELS.
//
// Design rule for every chunk: there must always be a lane that is
// either empty or blocked only by burnable stuff. Never a stone wall.
// ============================================================
DR.Level = (function () {
  const C = DR.CONFIG;

  const CHUNKS = {
    empty:        [],
    coinLine:     [['coin', 1, .2], ['coin', 1, .35], ['coin', 1, .5], ['coin', 1, .65], ['coin', 1, .8]],
    coinWeave:    [['coin', 0, .15], ['coin', 0, .3], ['coin', 1, .5], ['coin', 2, .7], ['coin', 2, .85]],

    // burnable only
    flyer:        [['flyer', 1, .5]],
    flyerPair:    [['flyer', 0, .3], ['flyer', 2, .7]],
    flyerLine:    [['flyer', 0, .2], ['flyer', 1, .5], ['flyer', 2, .8]],
    flyerV:       [['flyer', 1, .25], ['flyer', 0, .6], ['flyer', 2, .6]],
    barricade:    [['barricade', 1, .5], ['coin', 1, .75], ['coin', 1, .85]],
    woodWall:     [['barricade', 0, .5], ['barricade', 1, .5], ['barricade', 2, .5]],
    tower:        [['archer', 1, .6], ['coin', 0, .3], ['coin', 2, .3]],
    towersSides:  [['archer', 0, .35], ['archer', 2, .75]],

    // mixes stone (dodge-only) with burnables
    pillarGap:    [['pillar', 0, .5], ['pillar', 2, .5], ['barricade', 1, .5]],
    pillarLeft:   [['pillar', 0, .4], ['flyer', 1, .4], ['flyer', 2, .7]],
    slalom:       [['pillar', 0, .15], ['pillar', 1, .5], ['pillar', 2, .85], ['coin', 2, .3], ['coin', 0, .7]],
    cannonPair:   [['cannonball', 0, .3], ['cannonball', 2, .3], ['flyer', 1, .7]],
    cannonMid:    [['cannonball', 1, .4], ['archer', 0, .8]],
    gauntlet:     [['pillar', 0, .3], ['archer', 1, .5], ['barricade', 2, .3], ['flyer', 2, .85]],
    shieldGift:   [['shield', 1, .5], ['flyer', 0, .5], ['flyer', 2, .5]],
    breather:     [['coin', 1, .4], ['coin', 1, .5], ['coin', 1, .6]]
  };

  const LEVELS = {
    // Step-2 test track: only burnable targets
    practice: {
      name: 'Target Practice', seed: 1,
      phases: [
        { share: 0.1, pool: ['empty'] },
        { share: 0.9, pool: ['flyer', 'flyerLine', 'flyerV', 'barricade', 'woodWall', 'tower'] }
      ]
    },
    // Level 1: ramps from pure smashing to mixed dodging
    outerWall: {
      name: 'The Outer Wall', seed: 7,
      phases: [
        { share: 0.06, pool: ['empty', 'coinLine'] },                                            // warm-up
        { share: 0.24, pool: ['flyer', 'flyerPair', 'flyerLine', 'barricade', 'coinWeave', 'woodWall'] },  // pure power
        { share: 0.30, pool: ['flyerV', 'tower', 'pillarGap', 'pillarLeft', 'woodWall', 'shieldGift', 'towersSides'] },
        { share: 0.34, pool: ['towersSides', 'slalom', 'cannonPair', 'cannonMid', 'gauntlet', 'flyerV', 'woodWall', 'shieldGift'] },
        { share: 0.06, pool: ['breather'] }                                                      // calm before the gate
      ]
    }
  };

  // Small seeded random so a level is identical every run
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let schedule = [], next = 0, gateDistance = 0;

  // Build the spawn schedule: a sorted list of {d, type, lane}, d = distance along the track
  function build(levelId, withGate) {
    const L = LEVELS[levelId] || LEVELS.outerWall;
    const rand = rng(L.seed);
    const chunkLen = C.level.chunkLength / Math.max(0.2, C.spawn.density);
    const total = C.level.duration * C.forwardSpeed;
    const chunkCount = Math.max(4, Math.round(total / chunkLen));

    schedule = []; next = 0;
    let idx = 0, last = '';
    for (const ph of L.phases) {
      const n = Math.max(1, Math.round(ph.share * chunkCount));
      for (let i = 0; i < n; i++, idx++) {
        let name = ph.pool[Math.floor(rand() * ph.pool.length)];
        if (name === last && ph.pool.length > 1) name = ph.pool[(ph.pool.indexOf(name) + 1) % ph.pool.length];
        last = name;
        const base = 30 + idx * chunkLen; // 30 = short empty run-up at the start
        for (const [type, lane, pos] of CHUNKS[name]) schedule.push({ d: base + pos * chunkLen, type, lane });
      }
    }
    schedule.sort((a, b) => a.d - b.d);
    gateDistance = 30 + idx * chunkLen + 20;
    if (withGate) schedule.push({ d: gateDistance, type: 'gate', lane: 1 });
    return { name: L.name, gateDistance };
  }

  // Spawn everything that has come within view
  function update(traveled) {
    while (next < schedule.length && schedule[next].d < traveled + C.level.spawnAhead) {
      const s = schedule[next++];
      DR.Entities.spawn(s.type, s.lane, -(s.d - traveled));
    }
  }

  return { build, update, CHUNKS, LEVELS, get gateDistance() { return gateDistance; } };
})();
