import { encounters, isMarching, livingSkeletons } from './engine.mjs?v=5';
import { TILE, WIDTH, HEIGHT, floorTiles, legs, marchPosition } from './dungeon.mjs';

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

function skeleton(ctx, gait) {
  shadow(ctx, 7);
  rect(ctx, '#e7dcc5', -5, -16, 10, 7);
  rect(ctx, '#34283b', -3, -14, 2, 2);
  rect(ctx, '#34283b', 1, -14, 2, 2);
  rect(ctx, '#dfc9ad', -2, -10, 4, 8);
  rect(ctx, '#f5e2c7', -5, -8, 10, 2);
  rect(ctx, '#bba38f', -4, -5, 8, 2);
  rect(ctx, '#f5e2c7', -4, -3 + gait, 2, 6);
  rect(ctx, '#f5e2c7', 2, -3 - gait, 2, 6);
  rect(ctx, '#b5d2c7', 6, -14, 2, 11);
  rect(ctx, '#789b97', 4, -6, 6, 2);
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
  if (boss) {
    rect(ctx, '#c2aed7', -19, -15, 10, 13);
    rect(ctx, cloth, -17, -13, 6, 9);
  }
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
    const event = feedback?.wave === run.wave && feedback.run === run.number ? feedback : null;
    const age = event ? (now - event.at) / 550 : 1;
    const flash = age < 1;
    const foePosition = legs[run.wave].enemy;
    const strike = flash && event.type === 'round' && !still ? Math.sin(Math.PI * age) * .66 : 0;

    legs.slice(0, run.length).forEach(({ enemy }, index) => {
      if (index < run.wave || (index === run.wave && !run.enemy)) {
        rect(ctx, '#28212c', enemy.x - 8, enemy.y + 1, 16, 4);
        rect(ctx, '#716277', enemy.x - 6, enemy.y, 5, 2);
      } else {
        ctx.save();
        ctx.translate(enemy.x, enemy.y + (still ? 0 : Math.sin(now / 240 + index) * 1.5));
        if (index === run.wave && run.shield) {
          ctx.strokeStyle = '#c9aeed';
          ctx.lineWidth = 2;
          ctx.strokeRect(-22, -34, 44, 40);
        }
        enemySprite(ctx, encounters[index], index);
        ctx.restore();
      }
    });

    const captain = marchPosition(run.wave, distance - 33);
    ctx.save();
    ctx.translate(captain.x + captain.dy * 7, captain.y - captain.dx * 7);
    necromancer(ctx);
    ctx.restore();
    const survivors = livingSkeletons(state);
    if (survivors) {
      lineup.forEach((champion, slot) => {
        const escort = marchPosition(run.wave, distance - 16 - slot * 10);
        ctx.save();
        ctx.translate(escort.x + escort.dy * 17, escort.y - escort.dx * 17);
        ctx.scale(.76, .76);
        enemySprite(ctx, encounters.find(foe => foe.guardian === champion), -1, true);
        ctx.restore();
      });
      for (let index = Math.min(survivors, 8) - 1; index >= 0; index--) {
        const minion = marchPosition(run.wave, distance - Math.floor(index / 2) * 12);
        const side = index % 2 ? 8 : -8;
        const gait = walking && !still ? Math.round(Math.sin(now / 85 + index) * 2) : 0;
        ctx.save();
        ctx.translate(
          minion.x + minion.dy * side + (foePosition.x - lead.x) * strike,
          minion.y - minion.dx * side + (foePosition.y - lead.y) * strike,
        );
        skeleton(ctx, gait);
        ctx.restore();
      }
    }

    if (flash) {
      if (event.type === 'bolt') {
        ctx.strokeStyle = '#b2ffd3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(captain.x, captain.y - 18);
        ctx.lineTo(foePosition.x, foePosition.y - 8);
        ctx.stroke();
      }
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = event.type === 'bolt' ? '#b2ffd3' : '#fff0d2';
      ctx.fillText(event.hit || 'BLOCK', foePosition.x, foePosition.y - 28 - (still ? 0 : age * 13));
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
