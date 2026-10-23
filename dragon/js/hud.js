// ============================================================
// HUD — hearts, coins, level progress, rage button, screens.
// Pure DOM; the game calls these setters, nothing here reads game state.
// ============================================================
DR.HUD = (function () {
  const $ = (id) => document.getElementById(id);
  let el = {}, lastCoins = -1, lastHearts = '', lastRage = '';

  function init() {
    el = {
      hud: $('hud'), hearts: $('hearts'), coins: $('coins'), progress: $('progress').firstElementChild,
      rage: $('rageBtn'), rageLabel: $('rageBtn').firstElementChild, flash: $('flash'),
      start: $('start'), results: $('results'), resTitle: $('resTitle'), stars: $('stars'), resCoins: $('resCoins')
    };
  }

  function setHearts(n, max, shield) {
    const key = n + '/' + max + '/' + shield;
    if (key === lastHearts) return;
    lastHearts = key;
    let html = '';
    for (let i = 0; i < max; i++) html += `<span class="h${i < n ? '' : ' lost'}">❤️</span>`;
    if (shield) html += '<span class="shield">🛡️</span>';
    el.hearts.innerHTML = html;
  }

  function setCoins(n) {
    if (n === lastCoins) return;
    if (n > lastCoins && lastCoins >= 0) {
      el.coins.classList.remove('pop'); void el.coins.offsetWidth; el.coins.classList.add('pop');
    }
    lastCoins = n;
    el.coins.textContent = '🪙 ' + n;
  }

  function setProgress(p) {
    el.progress.parentElement.classList.remove('boss');
    el.progress.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%';
  }
  // Gate health (0..1), shown in the same bar
  function setBoss(p) {
    el.progress.parentElement.classList.add('boss');
    el.progress.style.width = (Math.max(0, Math.min(1, p)) * 100).toFixed(1) + '%';
  }

  // pct 0..100, ready = can be triggered, active = rage running
  function setRage(pct, ready, active) {
    const key = Math.round(pct) + (ready ? 'r' : '') + (active ? 'a' : '');
    if (key === lastRage) return;
    lastRage = key;
    el.rage.style.setProperty('--p', pct.toFixed(0));
    el.rage.classList.toggle('ready', ready && !active);
    el.rage.classList.toggle('active', active);
    el.rageLabel.textContent = active ? '🔥🔥' : ready ? 'RAGE!' : 'RAGE';
  }
  function showRage(on) { el.rage.classList.toggle('hidden', !on); }

  // Full-screen color flash (red = hurt, blue = shield, orange = rage)
  function flash(color, strength) {
    el.flash.style.transition = 'none';
    el.flash.style.background = `radial-gradient(ellipse at center, transparent 35%, ${color} 100%)`;
    el.flash.style.opacity = strength == null ? 0.85 : strength;
    void el.flash.offsetWidth;
    el.flash.style.transition = 'opacity .35s ease-out';
    el.flash.style.opacity = 0;
  }

  function showStart() { el.start.classList.remove('hidden'); el.hud.classList.add('hidden'); el.results.classList.add('hidden'); }
  function showPlay() {
    el.start.classList.add('hidden'); el.results.classList.add('hidden'); el.hud.classList.remove('hidden');
    lastCoins = -1; lastHearts = ''; lastRage = '';
  }

  function showResults({ win, coins, stars }) {
    el.resTitle.textContent = win ? 'GATE DESTROYED!' : 'YOU FELL!';
    let s = '';
    for (let i = 0; i < 3; i++) s += `<span class="${i < stars ? '' : 'off'}">⭐</span>`;
    el.stars.innerHTML = s;
    el.resCoins.textContent = '🪙 ' + coins + ' coins';
    el.results.classList.remove('hidden');
    el.hud.classList.add('hidden');
  }

  return { init, setHearts, setCoins, setProgress, setBoss, setRage, showRage, flash, showStart, showPlay, showResults };
})();
