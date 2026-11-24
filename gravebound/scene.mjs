import { encounters, isMarching, enemyPosition, opponents, skeletonHealth } from './engine.mjs?v=7';
import { TILE, WIDTH, HEIGHT, floorTiles, legs, marchPosition, skeletonPosition } from './dungeon.mjs?v=6';

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

function readout(ctx, text, x, y, color) {
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
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
  let feedback;
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

    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));
    ctx.drawImage(map.canvas, 0, 0);
    const walking = !run.wait && isMarching(state);
    const engaged = !isMarching(state);
    const event = feedback?.wave === run.wave && feedback.run === run.number ? feedback : null;
    const age = event ? (now - event.at) / 680 : 1;
    const effects = age < 1 ? event.effects : [];
    const lunge = still ? 0 : Math.sin(Math.PI * Math.min(age, 1));
    const focus = effects.find(effect => effect.kind === 'strike');
    const hound = effects.find(effect => effect.kind === 'hound');
    const captain = marchPosition(run.wave, distance - 33);
    const unitPositions = run.units.map((unit, id) => {
      if (!unit.hp) return unit.x === null ? null : { x: unit.x, y: unit.y };
      if (!engaged || unit.x === null) {
        const rank = run.units.slice(0, id).filter(other => other.hp > 0).length;
        return skeletonPosition(run.wave, distance, rank);
      }
      const previous = displayUnits[id] ?? unit;
      const walking = !still && Math.hypot(unit.x - previous.x, unit.y - previous.y) > .8;
      const x = walking ? previous.x + (unit.x - previous.x) * .48 : unit.x;
      const y = walking ? previous.y + (unit.y - previous.y) * .48 : unit.y;
      displayUnits[id] = { x, y };
      if (unit.role === 'bow' || !focus?.attackers.includes(id)) return { x, y, walking };
      const foe = enemyPosition(run.wave, focus.index);
      return { x: x + (foe.x - x) * lunge * .51, y: y + (foe.y - y) * lunge * .51, walking };
    });

    for (const [wave] of legs.slice(0, run.length).entries()) {
      opponents(wave).forEach((foe, index) => {
        const { x, y } = enemyPosition(wave, index);
        const active = wave === run.wave ? run.enemies[index] : null;
        if (wave < run.wave || active?.hp === 0) {
          rect(ctx, '#28212c', x - 8, y + 1, 16, 4);
          rect(ctx, '#716277', x - 6, y, 5, 2);
          return;
        }
        const bob = still ? 0 : Math.sin(now / 240 + wave) * 1.5;
        ctx.save();
        ctx.translate(x, y + bob);
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
          const target = enemyPosition(run.wave, hound.index);
          x += (target.x - x) * lunge;
          y += (target.y - y) * lunge - 12 * lunge;
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
      if (unit.hp === 0) {
        rect(ctx, '#a39596', x - 6, y, 10, 3);
        rect(ctx, '#615662', x - 2, y - 3, 7, 2);
        return;
      }
      const gait = (walking || position.walking) && !still ? Math.round(Math.sin(now / 85 + id) * 2) : 0;
      ctx.save();
      ctx.translate(x, y);
      skeleton(ctx, gait, unit.role);
      ctx.restore();
      if (engaged) {
        healthBar(ctx, unit.hp, skeletonHealth(state, unit), x, y - 23, '#a1e8c7');
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#c3baaf';
        ctx.fillText(id + 1, x, y + 13);
      }
    });

    for (const effect of effects) {
      const foe = effect.index === undefined ? null : enemyPosition(run.wave, effect.index);
      const unit = unitPositions[effect.id];
      const rise = still ? 0 : age * 12;
      if (effect.kind === 'arrow' && unit) {
        const travel = still ? 1 : Math.min(1, age * 2);
        const x = foe.x + (unit.x - foe.x) * travel;
        const y = foe.y + (unit.y - foe.y) * travel - 9;
        rect(ctx, '#f0b378', x - 3, y, 6, 2);
      } else if (effect.kind === 'bolt') {
        ctx.strokeStyle = '#b2ffd3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(captain.x, captain.y - 18);
        ctx.lineTo(foe.x, foe.y - 8);
        ctx.stroke();
      }
      if (effect.kind === 'strike') {
        const travel = still ? 1 : Math.min(1, age * 2.7);
        for (const id of effect.attackers) {
          const origin = unitPositions[id];
          if (!origin || run.units[id].role !== 'bow') continue;
          const x = origin.x + (foe.x - origin.x) * travel;
          const y = origin.y + (foe.y - origin.y) * travel - 9;
          rect(ctx, '#b2ffd3', x - 3, y, 6, 2);
        }
      }
      if (effect.kind === 'ward' && unit) {
        ctx.strokeStyle = '#d4b8ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 8, 14 + age * 6, 0, Math.PI * 2);
        ctx.stroke();
        continue;
      }
      const kind = effect.kind;
      if (unit && (kind !== 'arrow' || age >= .4 || still)) {
        readout(ctx, kind === 'heal' ? `+${effect.hit}` : effect.hit ? `−${effect.hit}` : 'BLOCK',
          unit.x, unit.y - 29 - rise, kind === 'heal' ? '#b2ffd3' : '#ffa18e');
      } else if (!unit && foe) {
        readout(ctx, effect.hit || 'BLOCK', foe.x, foe.y - 45 - rise, kind === 'strike' ? '#fff0d2' : '#b2ffd3');
      }
    }
    ctx.restore();

    const miniX = canvas.width - mini.canvas.width - 15;
    const miniY = 12;
    rect(ctx, '#1a1523ee', miniX - 4, miniY - 3, mini.canvas.width + 8, mini.canvas.height + 6);
    ctx.drawImage(mini.canvas, miniX, miniY);
    rect(ctx, '#a9f4cd', miniX + lead.x * 2 / TILE - 2, miniY + lead.y * 2 / TILE - 2, 4, 4);
  }

  requestAnimationFrame(render);
  return event => { feedback = { ...event, at: performance.now(), run: state.run.number, wave: state.run.wave }; };
}
