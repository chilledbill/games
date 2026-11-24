const palettes = [
  ['#211c35', '#342944', '#4e3954', '#e5ad94'],
  ['#2c1c31', '#432942', '#603847', '#f6a477'],
  ['#1a233b', '#282e4b', '#3c3b61', '#d6b9ef'],
];

function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.fill();
}

function ruin(ctx, x, y, width, height, shade) {
  ctx.fillStyle = shade;
  ctx.fillRect(x, y + 12, width, height);
  for (let i = 0; i < width; i += 13) {
    ctx.fillRect(x + i, y + (i % 3) * 4, Math.min(8, width - i), 15);
  }
  ctx.fillStyle = '#181625';
  for (let i = 10; i < width - 6; i += 22) {
    ctx.fillRect(x + i, y + 28, 7, 29);
    ctx.fillRect(x + i + 2, y + 24, 3, 4);
  }
}

function background(ctx, palette, width, height) {
  const [sky, far, near, moon] = palette;
  const gradient = ctx.createLinearGradient(0, 0, 0, 193);
  gradient.addColorStop(0, sky);
  gradient.addColorStop(1, near);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(378, 59, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .36;
  for (let i = 0; i < 52; i++) ctx.fillRect((i * 67 + 11) % width, (i * i * 17 + 13) % 119, i % 5 ? 1 : 2, 1);
  ctx.globalAlpha = 1;
  polygon(ctx, far, [[0, 144], [62, 106], [132, 135], [211, 96], [286, 135], [371, 116], [480, 139], [480, 201], [0, 201]]);
  ruin(ctx, 3, 88, 50, 86, '#282037');
  ruin(ctx, 46, 119, 54, 55, '#282037');
  ruin(ctx, 412, 99, 67, 83, '#282037');
  ruin(ctx, 273, 103, 74, 72, '#302640');
  polygon(ctx, '#302640', [[273, 117], [309, 73], [347, 117]]);
  ctx.fillStyle = '#1f1b30';
  ctx.fillRect(302, 124, 14, 47);
  polygon(ctx, '#1f1b30', [[302, 124], [309, 112], [316, 124]]);
  ctx.fillStyle = '#211c2c';
  ctx.fillRect(0, 174, width, height - 174);
  polygon(ctx, '#3d3045', [[181, 174], [332, 174], [465, 236], [65, 236]]);
  polygon(ctx, '#49394d', [[190, 179], [326, 179], [413, 229], [103, 229]]);
  ctx.fillStyle = '#635069';
  for (let i = 0; i < 42; i++) {
    const y = 180 + (i * 17) % 53;
    const x = 252 + ((i * 53) % 91 - 45) * (y - 150) / 28;
    ctx.fillRect(Math.round(x), y, 3 + i % 15, 1);
  }
  for (const [x, y] of [[29, 168], [67, 181], [438, 183], [452, 169], [389, 165]]) {
    ctx.fillStyle = '#5c485f';
    ctx.fillRect(x, y - 16, 5, 18);
    ctx.fillRect(x - 4, y - 12, 13, 4);
  }
}

function necromancer(ctx, x, y) {
  polygon(ctx, '#151020', [[x - 15, y - 6], [x - 9, y - 38], [x - 7, y - 48], [x + 6, y - 53], [x + 14, y - 40], [x + 11, y - 27], [x + 17, y - 4], [x + 11, y]]);
  polygon(ctx, '#74518b', [[x - 9, y - 40], [x - 7, y - 48], [x + 6, y - 53], [x + 14, y - 40], [x + 7, y - 38], [x + 4, y - 44]]);
  polygon(ctx, '#583865', [[x - 6, y - 32], [x + 4, y - 31], [x + 6, y - 17], [x + 11, y - 5], [x - 10, y - 6]]);
  ctx.fillStyle = '#a3ebc6';
  ctx.fillRect(x + 5, y - 40, 5, 2);
  ctx.fillStyle = '#b18871';
  ctx.fillRect(x + 20, y - 54, 3, 51);
  ctx.fillStyle = '#75cfb4';
  ctx.fillRect(x + 17, y - 57, 9, 8);
  ctx.fillStyle = '#cef7db';
  ctx.fillRect(x + 20, y - 56, 3, 5);
}

function skeleton(ctx, x, y) {
  ctx.fillStyle = '#e8d8bd';
  ctx.fillRect(x - 4, y - 22, 10, 9);
  ctx.fillRect(x - 5, y - 12, 12, 2);
  ctx.fillRect(x - 3, y - 8, 8, 2);
  ctx.fillRect(x, y - 14, 2, 11);
  ctx.fillRect(x - 3, y - 5, 2, 5);
  ctx.fillRect(x + 4, y - 5, 2, 5);
  ctx.fillStyle = '#251c30';
  ctx.fillRect(x + 2, y - 19, 4, 2);
  ctx.fillStyle = '#aabcb0';
  ctx.fillRect(x + 9, y - 20, 3, 13);
  ctx.fillRect(x + 7, y - 11, 7, 2);
}

function guardian(ctx, x, y, id, spirit) {
  const cloak = spirit ? '#619882' : ['#ab756f', '#af6958', '#697391'][id];
  const steel = spirit ? '#abe6c2' : ['#e2b48c', '#f2a068', '#bbc3dc'][id];
  const eye = spirit ? '#dbffdd' : '#ffd69d';
  if (id === 1) {
    polygon(ctx, cloak, [[x - 30, y - 22], [x - 23, y - 36], [x - 18, y - 27], [x + 9, y - 24], [x + 30, y - 35], [x + 26, y - 16], [x + 15, y - 13], [x + 20, y], [x + 10, y], [x + 5, y - 9], [x - 16, y - 9], [x - 23, y], [x - 31, y], [x - 27, y - 13], [x - 37, y - 14]]);
    polygon(ctx, steel, [[x - 37, y - 14], [x - 30, y - 22], [x - 21, y - 20], [x - 22, y - 14]]);
    ctx.fillStyle = eye;
    ctx.fillRect(x - 29, y - 23, 4, 2);
    return;
  }
  polygon(ctx, cloak, [[x - 23, y], [x - 17, y - 32], [x - 9, y - 43], [x - 9, y - 52], [x + 3, y - 61], [x + 11, y - 49], [x + 10, y - 39], [x + 22, y - 28], [x + 24, y]]);
  polygon(ctx, '#211b2a', [[x - 6, y - 50], [x + 1, y - 53], [x + 8, y - 48], [x + 6, y - 43], [x - 5, y - 43]]);
  ctx.fillStyle = eye;
  ctx.fillRect(x - 4, y - 48, 6, 2);
  if (id === 0) {
    polygon(ctx, steel, [[x - 24, y - 32], [x - 16, y - 32], [x - 12, y - 18], [x - 9, y - 15], [x - 31, y - 15], [x - 28, y - 18]]);
    ctx.fillStyle = steel;
    ctx.fillRect(x - 22, y - 14, 5, 4);
    ctx.fillRect(x + 4, y - 36, 3, 34);
  } else {
    polygon(ctx, steel, [[x - 26, y - 34], [x - 10, y - 39], [x - 2, y - 31], [x - 5, y - 16], [x - 16, y - 7], [x - 26, y - 18]]);
    polygon(ctx, '#816994', [[x - 22, y - 30], [x - 13, y - 34], [x - 8, y - 29], [x - 10, y - 19], [x - 16, y - 13], [x - 22, y - 21]]);
    ctx.fillStyle = steel;
    ctx.fillRect(x + 17, y - 54, 3, 47);
    ctx.fillRect(x + 12, y - 48, 13, 3);
  }
}

export function animateScene(canvas, state) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const scenery = palettes.map(palette => {
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    background(layer.getContext('2d'), palette, layer.width, layer.height);
    return layer;
  });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let feedback;
  let lastDraw = -100;

  function render(now) {
    requestAnimationFrame(render);
    if (now - lastDraw < 40 || document.hidden) return;
    lastDraw = now;
    const { cleared, fight, lineup, levels } = state;
    const time = motion.matches ? 0 : now;
    const index = Math.min(cleared, 2);
    const bob = Math.round(Math.sin(time / 220) * 2);
    const flash = feedback && now - feedback.at < 560;
    const enemyX = 371 + (flash && !motion.matches ? 3 * Math.round(Math.sin(now / 16)) : 0);
    ctx.drawImage(scenery[index], 0, 0);
    for (let i = 0; i < 20; i++) {
      const x = (i * 53 + time * (.008 + (i % 3) * .005)) % canvas.width;
      const y = (i * 17 + time * .009) % 104 + 92;
      ctx.fillStyle = i % 4 ? '#a3808b' : '#efb893';
      ctx.fillRect(Math.round(x), Math.round(y), i % 4 ? 1 : 2, 1);
    }
    necromancer(ctx, 75, 200 + bob);
    for (let i = 0; i < Math.min(1 + levels.skeletons, 6); i++) {
      skeleton(ctx, 113 + i * 21, 196 + (i % 2) * 10 + bob * (i % 2 ? 1 : -1));
    }
    lineup.forEach((champion, slot) => {
      ctx.save();
      ctx.translate(190 + slot * 47, 184 + (slot % 2) * 11);
      ctx.scale(-.68, .68);
      guardian(ctx, 0, -bob, champion, true);
      ctx.restore();
    });
    if (fight) {
      if (fight.shield) {
        ctx.strokeStyle = '#cdb1f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(enemyX - 39, 124, 78, 78);
      }
      guardian(ctx, enemyX, 199 - bob, index, false);
    } else if (cleared < 3) {
      for (let i = 0; i < 3; i++) {
        const x = 340 + i * 28 - Math.round(time / 180 % 14);
        const y = 191 + i % 2 * 8;
        polygon(ctx, '#171222', [[x - 9, y], [x - 5, y - 25], [x + 4, y - 27], [x + 10, y]]);
        ctx.fillStyle = '#edac91';
        ctx.fillRect(x - 4, y - 21, 4, 2);
      }
    }
    if (flash) {
      const age = (now - feedback.at) / 560;
      if (feedback.type === 'bolt' && !motion.matches) {
        ctx.fillStyle = '#bcffd7';
        ctx.fillRect(96 + (enemyX - 96) * Math.min(age * 2, 1), 145, 17, 4);
      }
      ctx.font = 'bold 17px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = feedback.type === 'bolt' ? '#c1ffd8' : '#fff0d2';
      ctx.fillText(feedback.hit || 'BLOCK', enemyX, 133 - (motion.matches ? 0 : age * 15));
    }
  }
  requestAnimationFrame(render);
  return event => { feedback = { ...event, at: performance.now() }; };
}
