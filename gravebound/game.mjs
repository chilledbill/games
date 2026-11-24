import {
  champions, encounters, championSlots, upgrades, rituals, initialState, maxHealth, damage, livingSkeletons, upgradeCost,
  target, buyUpgrade, raiseChampion, toggleChampion, castBolt, tick,
} from './engine.mjs?v=3';
import { animateScene } from './scene.mjs?v=3';

const ACTIVE_SAVE_KEY = 'gravebound:active-save';
const DEFAULT_SAVE_KEY = 'gravebound:v3';
const find = id => document.getElementById(id);
const number = new Intl.NumberFormat();
let previous;
let saveKey = DEFAULT_SAVE_KEY;
let storageAvailable = true;
try {
  const activeSave = localStorage.getItem(ACTIVE_SAVE_KEY);
  if (activeSave) saveKey = activeSave;
  const saved = activeSave
    ? localStorage.getItem(saveKey)
    : localStorage.getItem(saveKey) ?? localStorage.getItem('gravebound:v2') ?? localStorage.getItem('gravebound:v1');
  if (saved) previous = JSON.parse(saved);
} catch {
  storageAvailable = false;
}
const state = initialState(previous ?? {});

const announce = text => {
  const item = document.createElement('li');
  item.textContent = text;
  const journal = find('journal');
  journal.prepend(item);
  if (journal.children.length > 5) journal.lastElementChild.remove();
};

function save() {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(saveKey, JSON.stringify(state));
  } catch {
    storageAvailable = false;
  }
}

function updateSaveNote() {
  if (!storageAvailable) find('save-note').textContent = 'Browser storage is unavailable. Progress lasts for this session.';
}

const hitEffect = animateScene(find('scene'), state);

function eventFeedback(event) {
  if (!event) return;
  if (event.text) announce(event.text);
  if (event.type === 'round' || event.type === 'bolt') hitEffect(event);
}

const championButtons = champions.map((foe, index) => {
  const row = document.createElement('article');
  row.className = 'row champion';
  row.innerHTML = `<span class="portrait" aria-hidden="true">${['♜', '✦', '⬢'][index]}</span>
    <div><span class="status">${foe.kind}</span><h3>${foe.name}</h3><p><strong>${foe.skill}.</strong> ${foe.boon}</p></div>
    <button>Undiscovered</button>`;
  const button = row.querySelector('button');
  button.addEventListener('click', () => {
    if (state.raised.includes(index)) {
      if (toggleChampion(state, index)) {
        announce(`${foe.name} ${state.lineup.includes(index) ? 'joins the army.' : 'returns to the crypt.'}`);
      }
    } else if (raiseChampion(state, index)) {
      announce(`${foe.name} ${state.lineup.includes(index) ? 'rises and joins your army.' : 'rises and waits in the crypt.'}`);
    }
    saveAndRender();
  });
  find('champions').append(row);
  return { row, button };
});

const upgradeButtons = Object.entries(upgrades).map(([key, upgrade]) => {
  const row = document.createElement('article');
  row.className = 'row';
  row.innerHTML = `<div><h3>${upgrade.name}</h3><p><span class="level"></span> · ${upgrade.detail}</p></div><button aria-label="Buy ${upgrade.name}"></button>`;
  const button = row.querySelector('button');
  button.addEventListener('click', () => {
    if (buyUpgrade(state, key)) saveAndRender();
  });
  find('upgrades').append(row);
  return { key, upgrade, button, level: row.querySelector('.level') };
});

const ritualButtons = Object.entries(rituals).map(([key, ritual]) => {
  const row = document.createElement('article');
  row.className = 'row';
  row.innerHTML = `<div><h3>${ritual.name}</h3><p>${ritual.detail}</p></div><button></button>`;
  const button = row.querySelector('button');
  button.addEventListener('click', () => {
    if (state.ritual === key) return;
    state.ritual = key;
    announce(`${ritual.name} is active.`);
    saveAndRender();
  });
  find('rituals').append(row);
  return { row, button, key, ritual };
});

const bolt = find('bolt');
const resetDialog = find('reset-dialog');
const waveTrack = find('wave-track');
const waveMarkers = encounters.map(foe => {
  const marker = document.createElement('span');
  marker.className = foe.guardian === undefined ? 'wave' : 'wave guardian';
  waveTrack.append(marker);
  return marker;
});

function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

function meter(id, value, max) {
  const bar = find(id);
  bar.max = max;
  bar.value = value;
  setText(find(id.replace('-hp', '-number')), `${value} / ${max}`);
}

function render() {
  const foe = target(state);
  const { run, lineup } = state;
  const skeletons = livingSkeletons(state);
  const canRaise = champions.some((entry, index) => index < state.cleared && !state.raised.includes(index) && state.essence >= entry.essence);
  setText(find('dust'), number.format(state.dust));
  setText(find('essence'), number.format(state.essence));
  setText(find('battle-mode'), foe.zone);
  setText(find('battle-title'), foe.name);
  setText(find('mode-pill'), `Run ${number.format(run.number)}`);
  setText(find('wave-number'), `Wave ${run.wave + 1} / ${run.length}`);
  setText(find('run-dust'), `+${number.format(run.dust)} dust this run`);
  setText(find('best-run'), `Best run · ${state.best} ${state.best === 1 ? 'wave' : 'waves'} cleared`);
  waveMarkers.forEach((marker, index) => {
    marker.hidden = index >= run.length;
    marker.classList.toggle('cleared', index < run.wave || (index === run.wave && run.result === 'cleared'));
    marker.classList.toggle('current', index === run.wave && run.result !== 'cleared');
  });
  setText(find('dps'), `${damage(state)} base dmg / round`);
  setText(find('lineup-count'), `${lineup.length} / ${championSlots} deployed`);
  setText(find('army-label'), `${skeletons} ${skeletons === 1 ? 'skeleton' : 'skeletons'}`);
  setText(find('foe-label'), run.shield ? `Enemy HP · ${run.shield} shield` : 'Enemy health');
  find('summon-link').hidden = !canRaise;
  meter('army-hp', run.army, maxHealth(state));
  meter('foe-hp', run.enemy, foe.hp);
  bolt.disabled = Boolean(run.wait || run.result || run.cooldown);
  setText(bolt, run.cooldown ? `Grave Bolt · ${run.cooldown}s` : 'Cast Grave Bolt');
  const hint = run.result === 'fallen' ? `Your army fell. Rising at the Abbey Gate in ${run.wait}s.`
    : run.result === 'cleared' ? `Run cleared. The next march starts in ${run.wait}s.`
    : run.wave === 0 && run.wait ? 'Your skeletons are rising at the Abbey Gate.'
    : foe.hint ?? 'Your army attacks automatically. Defeat foes to earn Bone Dust.';
  setText(find('battle-hint'), hint);

  championButtons.forEach(({ row, button }, index) => {
    const foe = champions[index];
    const raised = state.raised.includes(index);
    const deployed = lineup.includes(index);
    const defeated = index < state.cleared;
    const full = lineup.length >= championSlots;
    row.classList.toggle('active', deployed);
    button.disabled = !defeated || (raised ? !deployed && full : state.essence < foe.essence);
    button.dataset.state = defeated && !raised ? 'available' : '';
    const label = raised ? (deployed ? 'Recall' : full ? 'Lineup full' : 'Deploy')
      : defeated ? `Raise · ${foe.essence} essence` : 'Defeat to unlock';
    setText(button, label);
    button.setAttribute('aria-label', `${label} · ${foe.name}`);
  });
  upgradeButtons.forEach(({ key, upgrade, button, level }) => {
    const cost = upgradeCost(state, key);
    const label = Number.isFinite(cost) ? `${number.format(cost)} dust` : 'Maxed';
    setText(level, `Lv. ${state.levels[key]}`);
    setText(button, label);
    button.disabled = state.dust < cost;
    button.setAttribute('aria-label', `${upgrade.name} · ${label}`);
  });
  ritualButtons.forEach(({ row, button, key, ritual }) => {
    const active = state.ritual === key;
    row.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', ritual.name);
    setText(button, active ? 'Active' : 'Equip');
  });
  updateSaveNote();
}

function saveAndRender() {
  save();
  render();
}

bolt.addEventListener('click', () => {
  eventFeedback(castBolt(state));
  saveAndRender();
});

find('start-over').addEventListener('click', () => {
  find('reset-error').hidden = true;
  resetDialog.showModal();
  syncTimer();
});
resetDialog.addEventListener('close', syncTimer);
find('confirm-reset').addEventListener('click', () => {
  const fresh = initialState();
  if (storageAvailable) {
    const nextSaveKey = `gravebound:run:${crypto.randomUUID()}`;
    try {
      localStorage.setItem(nextSaveKey, JSON.stringify(fresh));
      localStorage.setItem(ACTIVE_SAVE_KEY, nextSaveKey);
    } catch {
      find('reset-error').hidden = false;
      return;
    }
    const previousSaveKey = saveKey;
    saveKey = nextSaveKey;
    try {
      localStorage.removeItem(previousSaveKey);
    } catch {
      // The active save already points to the new game.
    }
  }
  Object.assign(state, fresh);
  find('journal').replaceChildren();
  announce('Progress reset. Two skeletons rise at the Abbey Gate.');
  resetDialog.close();
  render();
});

if (previous && !previous.run) {
  announce('Your upgrades and Champions carry over. A new run begins at the Abbey Gate.');
} else if (!previous) {
  announce('Two skeletons rise and begin their first march.');
}
saveAndRender();

let timer;
function syncTimer() {
  clearInterval(timer);
  if (!document.hidden && !resetDialog.open) {
    timer = setInterval(() => {
      if (document.hidden || resetDialog.open) return;
      eventFeedback(tick(state));
      saveAndRender();
    }, 1000);
  }
}
document.addEventListener('visibilitychange', syncTimer);
window.addEventListener('storage', event => {
  if (event.key === ACTIVE_SAVE_KEY && event.newValue && event.newValue !== saveKey) window.location.reload();
});
syncTimer();
