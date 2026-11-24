import { encounters, isMarching, enemyPosition, opponents, skeletonHealth } from './engine.mjs?v=8';
import { TILE, WIDTH, HEIGHT, floorTiles, legs, marchPosition, skeletonPosition } from './dungeon.mjs?v=6';
import { impactFrame, impactLength } from './impact.mjs';

const stone = [
  ['#373343', '#443d4e', '#302c3b'],
  ['#423036', '#503941', '#35262f'],
  ['#2d3547', '#394354', '#272e41'],
];

function layer(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

function paintDungeon(ctx, tiles) {
  ctx.fillStyle = '#100e19';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (const [row, line] of tiles.entries()) {
    for (const [col, area] of line.entries()) {
      if (area < 0) continue;
      const x = col * TILE;
      const y = row * TILE;
      const pattern = (row * 41 + col * 17 + col * row) % 7;
      ctx.fillStyle = stone[area][pattern % 3];
      ctx.fillRect(x + 1, y + 1, TILE - 1, TILE - 1);
      ctx.fillStyle = '#ffffff0e';
      ctx.fillRect(x + 4, y + 4, 5 + pattern, 1);
      if (pattern < 4) ctx.fillRect(x + 11, y + 14, 3, 1);

      if (tiles[row - 1]?.[col] < 0) {
        ctx.fillStyle = '#645a70';
        ctx.fillRect(x, y - 12, TILE, 3);
        ctx.fillStyle = '#463d56';
        ctx.fillRect(x, y - 9, TILE, 12);
        ctx.fillStyle = '#2b2439';
        ctx.fillRect(x + 10, y - 7, 2, 8);
        if (col % 4 === 0) {
          const light = ctx.createRadialGradient(x + 12, y + 1, 1, x + 12, y + 1, 35);
          light.addColorStop(0, '#f0a25b50');
          light.addColorStop(1, '#f0a25b00');
          ctx.fillStyle = light;
          ctx.fillRect(x - 23, y - 15, 70, 50);
          ctx.fillStyle = '#f7be72';
          ctx.fillRect(x + 11, y - 3, 3, 5);
        }
      }
      if (line[col - 1] < 0 || line[col + 1] < 0) {
        ctx.fillStyle = '#20192b';
        ctx.fillRect(line[col - 1] < 0 ? x : x + TILE - 3, y, 3, TILE);
      }
      if (tiles[row + 1]?.[col] < 0) {
        ctx.fillStyle = '#5d5069';
        ctx.fillRect(x, y + TILE - 2, TILE, 4);
        ctx.fillStyle = '#2c2338';
        ctx.fillRect(x, y + TILE + 2, TILE, 4);
      }
    }
  }
}

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function shadow(ctx, width) {
  ctx.fillStyle = '#110e18a0';
  ctx.beginPath();
  ctx.ellipse(0, 3, width, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}

function skeleton(ctx, gait, role) {
  shadow(ctx, 7);
  rect(ctx, '#e7dcc5', -5, -16, 10, 7);
  rect(ctx, '#34283b', -3, -14, 2, 2);
  rect(ctx, '#34283b', 1, -14, 2, 2);
  rect(ctx, '#dfc9ad', -2, -10, 4, 8);
  rect(ctx, '#f5e2c7', -5, -8, 10, 2);
  rect(ctx, '#bba38f', -4, -5, 8, 2);
  rect(ctx, '#f5e2c7', -4, -3 + gait, 2, 6);
  rect(ctx, '#f5e2c7', 2, -3 - gait, 2, 6);
  if (role === 'shield') {
    rect(ctx, '#a38760', 3, -10, 9, 12);
    rect(ctx, '#e2bf7c', 4, -9, 7, 9);
    rect(ctx, '#8b7155', 7, -9, 1, 9);
  } else if (role === 'bow') {
    ctx.strokeStyle = '#db9e69';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(6, -9, 6, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    rect(ctx, '#e6d3b1', 6, -15, 1, 12);
  } else {
    rect(ctx, '#b5d2c7', 6, -14, 2, 11);
    rect(ctx, '#789b97', 4, -6, 6, 2);
  }
}

function necromancer(ctx) {
  shadow(ctx, 10);
  ctx.fillStyle = '#674778';
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.lineTo(-6, -17);
  ctx.lineTo(1, -24);
  ctx.lineTo(7, -17);
  ctx.lineTo(9, 2);
  ctx.fill();
  rect(ctx, '#382341', -4, -17, 9, 9);
  rect(ctx, '#aff3d2', -2, -15, 5, 2);
  rect(ctx, '#ad8981', 10, -20, 2, 23);
  rect(ctx, '#86e3bc', 8, -24, 6, 6);
}

function enemySprite(ctx, foe, index, ally = false) {
  const fur = ally ? '#8fd8b8' : ['#d6a270', '#c17467', '#9ca6bd'][foe.area];
  const cloth = ally ? '#497c6b' : ['#77566c', '#823f51', '#59627b'][foe.area];
  const eye = ally ? '#caffd6' : '#ffcd91';
  if (foe.kind === 'Archer') {
    shadow(ctx, 10);
    rect(ctx, '#8e5547', -7, -20, 14, 21);
    rect(ctx, '#d9a17e', -4, -16, 8, 7);
    rect(ctx, '#ffe0a2', 1, -14, 3, 2);
    ctx.strokeStyle = '#eda975';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, -9, 7, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    rect(ctx, '#ecd8c0', 11, -16, 1, 14);
    return;
  }
  if (index === 0 || foe.guardian === 1) {
    const wide = index === 0 ? 9 : 17;
    shadow(ctx, wide);
    rect(ctx, cloth, -wide, -9, wide * 2, 9);
    rect(ctx, fur, -wide - 4, -13, 9, 8);
    rect(ctx, fur, -wide, -17, 3, 5);
    rect(ctx, eye, -wide - 2, -11, 2, 2);
    rect(ctx, cloth, wide - 1, -13, 5, 12);
    return;
  }
  const boss = foe.guardian === 2;
  const tall = boss ? 30 : 24;
  shadow(ctx, boss ? 17 : 11);
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-tall / 2, 2);
  ctx.lineTo(-tall / 3, -tall * .7);
  ctx.lineTo(0, -tall);
  ctx.lineTo(tall / 3, -tall * .7);
  ctx.lineTo(tall / 2, 2);
  ctx.fill();
  rect(ctx, fur, -6, -tall + 7, 12, 7);
  rect(ctx, eye, -4, -tall + 9, 2, 2);
  rect(ctx, eye, 2, -tall + 9, 2, 2);
  if (foe.guardian === 0) rect(ctx, fur, 10, -10, 9, 9);
  else rect(ctx, fur, 11, -tall + 4, 3, tall - 2);
  if (boss || foe.kind === 'Shield guard') {
    rect(ctx, boss ? '#c2aed7' : '#dcbb83', -19, -15, 10, 13);
    rect(ctx, cloth, -17, -13, 6, 9);
  }
}

export function drawChampionPortrait(canvas, index) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const glow = ['#acf7c6', '#ffbb83', '#ccafff'][index];
  for (let i = 0; i < 25; i++) {
    const x = 28 + (i * 41) % 168;
    const y = 24 + (i * 29) % 98;
    ctx.globalAlpha = .25 + (i % 4) * .17;
    rect(ctx, glow, x, y, 1 + (i % 3), 1 + (i % 5 === 0));
  }
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(canvas.width / 2, 122);
  ctx.scale(index === 1 ? 4 : 3.2, index === 1 ? 4 : 3.2);
  enemySprite(ctx, encounters.find(foe => foe.guardian === index), -1, true);
  ctx.restore();
}

function healthBar(ctx, health, max, x, y, color) {
  rect(ctx, '#171120', x - 12, y, 24, 4);
  rect(ctx, color, x - 11, y + 1, Math.round(22 * health / max), 2);
}

function impactText(ctx, text, x, y, color, power) {
  ctx.font = `bold ${Math.round(14 * power)}px monospace`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#1a111d';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function trail(ctx, from, to, fraction, color, width) {
  const x = from.x + (to.x - from.x) * fraction;
  const y = from.y + (to.y - from.y) * fraction;
  const tail = Math.max(0, fraction - .24);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(from.x + (to.x - from.x) * tail, from.y + (to.y - from.y) * tail - 9);
  ctx.lineTo(x, y - 9);
  ctx.stroke();
}

function burst(ctx, x, y, age, color, power, seed) {
  if (age < 0 || age > 300) return;
  const t = age / 300;
  ctx.save();
  ctx.globalAlpha = (1 - t) ** 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < Math.round(7 * power); i++) {
    const angle = i * 2.4 + seed * .19;
    const distance = 3 + t * (22 + (i % 4) * 6) * power;
    const tail = distance + (1 - t) * (3 + i % 3 * 2);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
    ctx.lineTo(x + Math.cos(angle) * tail, y + Math.sin(angle) * tail);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 4 + t * 19 * power, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function recoilOffset(at, from, recoil) {
  if (!from || !recoil) return { x: 0, y: 0 };
  const dx = at.x - from.x;
  const dy = at.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: 7 * recoil * dx / length, y: 7 * recoil * dy / length };
}

export function animateScene(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const tiles = floorTiles();
  const map = layer(WIDTH * TILE, HEIGHT * TILE);
  paintDungeon(map, tiles);
  const mini = layer(WIDTH * 2, HEIGHT * 2);
  tiles.forEach((line, y) => line.forEach((area, x) => {
    if (area >= 0) rect(mini, '#75627f', x * 2, y * 2, 2, 2);
  }));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let feedback = [];
  let distance = state.run.travel;
  let lastRun;
  let lastWave;
  let displayUnits = [];
  let camX = 0;
  let camY = 0;
  let lastDraw = -100;

  function render(now) {
    requestAnimationFrame(render);
    if (now - lastDraw < 26 || document.hidden) return;
    lastDraw = now;
    const { run, lineup } = state;
    const reset = lastRun !== run.number;
    const newWave = lastWave !== run.wave;
    if (reset || newWave) displayUnits = [];
    const still = motion.matches;
    if (reset || newWave || still) distance = run.travel;
    else distance += (run.travel - distance) * .38;
    lastRun = run.number;
    lastWave = run.wave;
    const lead = marchPosition(run.wave, distance);
    const goalX = Math.max(0, Math.min(map.canvas.width - canvas.width, lead.x - canvas.width / 2 + lead.dx * 27));
    const goalY = Math.max(0, Math.min(map.canvas.height - canvas.height, lead.y - canvas.height / 2 + lead.dy * 21));
    camX = reset || still ? goalX : camX + (goalX - camX) * .20;
    camY = reset || still ? goalY : camY + (goalY - camY) * .20;

    const walking = !run.wait && isMarching(state);
    const engaged = !isMarching(state);
    const captain = marchPosition(run.wave, distance - 33);
    feedback = feedback.filter(event => event.run === run.number && now - event.at < impactLength);
    const effects = feedback.flatMap(event => event.effects.map(effect => ({
      ...effect, wave: event.wave, positions: event.positions, elapsed: now - event.at,
      ...impactFrame(effect, now - event.at, still),
    })));
    const contacts = effects.filter(effect => effect.hit && effect.kind !== 'heal' && effect.age >= 0 && effect.age < 145);
    const shake = still ? 0 : Math.max(0, ...contacts.map(effect => (1 - effect.age / 145) * (effect.power > 1 ? 4 : 1.4)));
    const impactPose = effects.find(effect => effect.wave !== run.wave)?.positions;
    const focus = effects.find(effect => effect.kind === 'strike');
    const hound = effects.find(effect => effect.kind === 'hound');

    ctx.fillStyle = '#100e19';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-Math.round(camX - Math.sin(now / 12) * shake), -Math.round(camY - Math.cos(now / 18) * shake));
    ctx.drawImage(map.canvas, 0, 0);

    const unitPositions = run.units.map((unit, id) => {
      if (!unit.hp) return unit.x === null ? null : { x: unit.x, y: unit.y };
      const closingPose = run.wait && impactPose?.[id];
      let position;
      if (closingPose && closingPose.x !== null) position = closingPose;
      else if (!engaged || unit.x === null) {
        const rank = run.units.slice(0, id).filter(other => other.hp > 0).length;
        position = skeletonPosition(run.wave, distance, rank);
      } else {
        const previous = displayUnits[id] ?? unit;
        const walking = !still && Math.hypot(unit.x - previous.x, unit.y - previous.y) > .8;
        position = walking ? { x: previous.x + (unit.x - previous.x) * .48, y: previous.y + (unit.y - previous.y) * .48, walking } : unit;
        displayUnits[id] = { x: position.x, y: position.y };
      }
      const { x, y } = position;
      const incoming = effects.find(effect => effect.id === id && (effect.kind === 'enemy' || effect.kind === 'arrow'));
      const push = incoming ? recoilOffset(position, enemyPosition(incoming.wave, incoming.index), incoming.recoil) : { x: 0, y: 0 };
      if (unit.role === 'bow' || !focus?.attackers.includes(id)) return { x: x + push.x, y: y + push.y, walking: position.walking };
      const foe = enemyPosition(focus.wave, focus.index);
      return { x: x + push.x + (foe.x - x) * focus.reach * .58, y: y + push.y + (foe.y - y) * focus.reach * .58, walking: position.walking };
    });

    for (const [wave] of legs.slice(0, run.length).entries()) {
      opponents(wave).forEach((foe, index) => {
        const { x, y } = enemyPosition(wave, index);
        const active = wave === run.wave ? run.enemies[index] : null;
        const blow = effects.find(effect => effect.wave === wave && effect.index === index && ['strike', 'bolt', 'hound', 'ward'].includes(effect.kind));
        const finishing = effects.find(effect => effect.wave === wave && effect.index === index && effect.defeated);
        if ((wave < run.wave || active?.hp === 0) && (!finishing || finishing.age > 105)) {
          rect(ctx, '#28212c', x - 8, y + 1, 16, 4);
          rect(ctx, '#716277', x - 6, y, 5, 2);
          return;
        }
        const bob = still ? 0 : Math.sin(now / 240 + wave) * 1.5;
        const origin = blow?.positions[blow.attackers?.[0] ?? blow.id] ?? captain;
        const push = recoilOffset({ x, y }, origin.x === null ? captain : origin, blow?.recoil);
        ctx.save();
        ctx.translate(x + push.x, y + bob + push.y);
        if (finishing && finishing.age > 35 && !still) {
          ctx.rotate(.005 * (finishing.age - 35));
          ctx.globalAlpha = 1 - (finishing.age - 35) / 100;
        }
        if (!still && blow?.age >= 0 && blow.age < 72) ctx.filter = 'brightness(2.7)';
        if (active?.shield) {
          ctx.strokeStyle = '#c9aeed';
          ctx.lineWidth = 2;
          ctx.strokeRect(-22, -34, 44, 40);
        }
        enemySprite(ctx, foe, wave);
        ctx.restore();
        if (active && engaged) healthBar(ctx, active.hp, foe.hp, x, y - 40, '#f4a18c');
      });
    }

    ctx.save();
    ctx.translate(captain.x + captain.dy * 7, captain.y - captain.dx * 7);
    necromancer(ctx);
    ctx.restore();
    if (run.units.some(unit => unit.hp > 0)) {
      lineup.forEach((champion, slot) => {
        const escort = marchPosition(run.wave, distance - 16 - slot * 10);
        let x = escort.x + escort.dy * 17;
        let y = escort.y - escort.dx * 17;
        if (champion === 1 && hound) {
          const target = enemyPosition(hound.wave, hound.index);
          x += (target.x - x) * hound.reach;
          y += (target.y - y) * hound.reach - 11 * hound.reach;
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(.76, .76);
        enemySprite(ctx, encounters.find(foe => foe.guardian === champion), -1, true);
        ctx.restore();
      });
    }
    unitPositions.forEach((position, id) => {
      if (!position) return;
      const { x, y } = position;
      const unit = run.units[id];
      const fall = effects.find(effect => effect.id === id && effect.fallen);
      if (unit.hp === 0 && (!fall || fall.age > 100 || still)) {
        rect(ctx, '#a39596', x - 6, y, 10, 3);
        rect(ctx, '#615662', x - 2, y - 3, 7, 2);
        return;
      }
      const gait = (walking || position.walking) && !still ? Math.round(Math.sin(now / 85 + id) * 2) : 0;
      ctx.save();
      if (fall && fall.age > 0 && !still) {
        const push = recoilOffset(position, enemyPosition(fall.wave, fall.index), fall.recoil);
        ctx.translate(x + push.x, y + push.y);
        ctx.rotate(fall.age * .009);
      } else {
        ctx.translate(x, y);
      }
      const struck = effects.some(effect => effect.id === id && (effect.kind === 'enemy' || effect.kind === 'arrow') && effect.age >= 0 && effect.age < 80);
      if (struck && !still) ctx.filter = 'brightness(2.2)';
      skeleton(ctx, gait, unit.role);
      ctx.restore();
      if (engaged && unit.hp > 0) {
        healthBar(ctx, unit.hp, skeletonHealth(state, unit), x, y - 23, '#a1e8c7');
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c3baaf';
        ctx.fillText(id + 1, x, y + 13);
      }
    });

    for (const effect of effects) {
      const { kind, age, power, color, hit, travel } = effect;
      const foe = effect.index === undefined ? null : enemyPosition(effect.wave, effect.index);
      const unit = effect.positions[effect.id] ?? unitPositions[effect.id];
      const incoming = kind === 'arrow' || kind === 'enemy';
      const destination = incoming || kind === 'heal' ? unit : foe;
      if (!destination || destination.x === null) continue;

      if (!still && age < 80) {
        if (kind === 'arrow' && unit) trail(ctx, foe, unit, travel, color, 2);
        if (kind === 'bolt') trail(ctx, captain, foe, travel, color, 3);
        if (kind === 'strike') {
          for (const id of effect.attackers) {
            const origin = effect.positions[id];
            if (!origin || origin.x === null || origin.role !== 'bow') continue;
            trail(ctx, origin, foe, travel, '#b2ffd3', 2);
          }
        }
      }
      if (age < 0) continue;
      const healing = kind === 'heal';
      if (!still) {
        burst(ctx, destination.x, destination.y - 9, age, color, power, effect.index ?? effect.id);
        if (kind === 'ward' && unit && age < 420) {
          burst(ctx, unit.x, unit.y - 9, age * .71, color, 1.25, effect.id);
        }
        if ((kind === 'strike' || kind === 'hound') && age < 130) {
          const source = effect.positions[effect.attackers?.[0]] ?? captain;
          const angle = Math.atan2(destination.y - source.y, destination.x - source.x);
          ctx.save();
          ctx.globalAlpha = 1 - age / 130;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(destination.x, destination.y - 10, 11 + age / 28, angle - 1, angle + 1.12);
          ctx.stroke();
          ctx.restore();
        }
      }
      const offset = kind === 'hound' ? 10 : kind === 'heal' ? -9 : 0;
      const rise = still ? 0 : Math.min(20, age * .041);
      const label = healing ? `+${hit}` : hit ? `−${hit}` : 'BLOCK';
      impactText(ctx, label, destination.x + offset, destination.y - (incoming || healing ? 29 : 43) - rise, color, power);
    }
    ctx.restore();

    const miniX = canvas.width - mini.canvas.width - 15;
    const miniY = 12;
    rect(ctx, '#1a1523ee', miniX - 4, miniY - 3, mini.canvas.width + 8, mini.canvas.height + 6);
    ctx.drawImage(mini.canvas, miniX, miniY);
    rect(ctx, '#a9f4cd', miniX + lead.x * 2 / TILE - 2, miniY + lead.y * 2 / TILE - 2, 4, 4);
  }

  requestAnimationFrame(render);
  return event => feedback.push({
    ...event, at: performance.now(), run: state.run.number, wave: event.wave ?? state.run.wave,
    positions: event.positions ?? state.run.units.map(({ x, y, role }) => ({ x, y, role })),
  });
}
