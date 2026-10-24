// ============================================================
// DEBUG PANEL — open the game with ?debug=1
// Live toggles for every juice effect + a few key tuning numbers.
// Changes apply instantly (density applies on restart).
// ============================================================
DR.Debug = (function () {
  const C = DR.CONFIG;
  const enabled = new URLSearchParams(location.search).has('debug');
  let fpsEl, frames = 0, acc = 0;

  const TOGGLES = [
    ['Screen shake', 'feel.screenShake'],
    ['Hit pause', 'feel.hitPause'],
    ['Particles', 'feel.particles'],
    ['Haptics', 'feel.haptics'],
    ['Rage invincible', 'rage.invincible'],
    ['Rage smashes stone', 'rage.smashStone']
  ];
  const NUMBERS = [
    ['Forward speed', 'forwardSpeed', 1],
    ['Fire rate /s', 'fire.rate', 0.5],
    ['Rage seconds', 'rage.duration', 0.5],
    ['Rage fire /s', 'rage.fireRate', 1],
    ['Hit pause s', 'feel.hitPauseKill', 0.01],
    ['Kill shake', 'feel.shakeOnKill', 0.05],
    ['Spawn density*', 'spawn.density', 0.1]
  ];

  function get(path) { return path.split('.').reduce((o, k) => o[k], C); }
  function set(path, v) {
    const keys = path.split('.'), last = keys.pop();
    keys.reduce((o, k) => o[k], C)[last] = v;
  }

  function init(actions) {
    if (!enabled) return;
    const el = document.getElementById('debug');
    fpsEl = document.getElementById('fps');
    el.classList.remove('hidden'); fpsEl.classList.remove('hidden');

    let html = '<button data-a="toggle" id="dbgToggle">⚙ Debug ▾</button><div id="dbgBody" class="hidden"><h4>JUICE</h4>';
    TOGGLES.forEach(([label, path], i) => {
      html += `<label>${label}<input type="checkbox" data-t="${i}" ${get(path) ? 'checked' : ''}></label>`;
    });
    html += '<h4>TUNING</h4>';
    NUMBERS.forEach(([label, path, stepV], i) => {
      html += `<label>${label}<input type="number" step="${stepV}" data-n="${i}" value="${get(path)}"></label>`;
    });
    html += '<div style="color:#999;font-size:11px">* applies on restart</div>';
    html += '<button data-a="rage">Fill rage</button><button data-a="restart">Restart level</button></div>';
    actions.toggle = () => {
      const body = document.getElementById('dbgBody');
      const open = body.classList.toggle('hidden') === false;
      document.getElementById('dbgToggle').textContent = open ? '⚙ Debug ▴' : '⚙ Debug ▾';
    };
    el.innerHTML = html;

    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset.t != null) set(TOGGLES[+t.dataset.t][1], t.checked);
      if (t.dataset.n != null && t.value !== '') set(NUMBERS[+t.dataset.n][1], parseFloat(t.value));
    });
    el.addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a && actions[a]) actions[a]();
    });
    // Don't let panel touches turn into swipes
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  function tick(realDt) {
    if (!enabled) return;
    frames++; acc += realDt;
    if (acc >= 0.5) { DR._fps = Math.round(frames / acc); fpsEl.textContent = DR._fps + ' fps'; frames = 0; acc = 0; }
  }

  return { init, tick, enabled };
})();
