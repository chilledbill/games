import {
  encounters, upgrades, rituals, initialState, maxHealth, damage, income, upgradeCost,
  target, collectOffline, buyUpgrade, raiseChampion, toggleChampion, challenge, castBolt, tick,
} from './engine.mjs';
import { animateScene } from './scene.mjs';

const SAVE_KEY = 'gravebound:v1';
const find = id => document.getElementById(id);
const number = new Intl.NumberFormat();
const state = initialState();
let restored = false;
let storageAvailable = true;
try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    Object.assign(state, JSON.parse(saved));
    restored = true;
  }
} catch {
  storageAvailable = false;
}

const announce = text => {
  const item = document.createElement('li');
  item.textContent = text;
  const journal = find('journal');
  journal.prepend(item);
  if (journal.children.length > 5) journal.lastElementChild.remove();
};

function save() {
  state.savedAt = Date.now();
  if (!storageAvailable) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
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

const championButtons = encounters.map((foe, index) => {
  const row = document.createElement('article');
  row.className = 'row champion';
  row.innerHTML = `<span class="portrait" aria-hidden="true">${['♜', '✦', '⬢'][index]}</span>
    <div><span class="status">${foe.kind}</span><h3>${foe.name}</h3><p><strong>${foe.skill}.</strong> ${foe.boon}</p></div>
    <button>Undiscovered</button>`;
  const button = row.querySelector('button');
  button.addEventListener('click', () => {
    if (state.raised.includes(index)) {
      toggleChampion(state, index);
      announce(`${foe.name} ${state.lineup.includes(index) ? 'joins the army.' : 'returns to the crypt.'}`);
    } else if (raiseChampion(state, index)) {
      announce(`${foe.name} rises and joins your army.`);
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
const challengeButton = find('challenge');
const fightHints = [
  'The Bellkeeper recovers health every third round. Time Grave Bolt to finish him.',
  'The Ash Hound lunges every third round. The Bellkeeper can heal your army.',
  'The Abbot raises a glass shield every third round. Break it with Grave Bolt.',
];

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
  const { fight, cleared, attempted, cooldown, lineup } = state;
  const complete = cleared === encounters.length;
  const canRaise = encounters.some((entry, i) => i < cleared && !state.raised.includes(i) && state.essence >= entry.cost);
  setText(find('dust'), number.format(state.dust));
  setText(find('essence'), number.format(state.essence));
  setText(find('battle-mode'), fight ? foe.kind : complete ? 'Abbey conquered' : attempted ? 'Regrouping' : 'Patrol');
  setText(find('battle-title'), fight ? foe.name : foe.zone);
  setText(find('mode-pill'), fight ? 'Auto battle' : `+${income(state)} dust / sec`);
  setText(find('dps'), `${damage(state)} base dmg / round`);
  setText(find('lineup-count'), `${lineup.length} / 3 deployed`);
  find('summon-link').hidden = !canRaise;
  meter('army-hp', fight?.army ?? maxHealth(state), maxHealth(state));
  meter('foe-hp', fight?.enemy ?? (complete ? cleared : state.patrol), fight ? foe.hp : complete ? encounters.length : foe.patrol);
  setText(find('foe-label'), fight ? (fight.shield ? `Enemy HP · ${fight.shield} shield` : 'Enemy health') : complete ? 'Guardians defeated' : 'Patrol progress');
  bolt.hidden = !fight;
  bolt.disabled = !fight || cooldown > 0;
  setText(bolt, cooldown ? `Grave Bolt · ${cooldown}s` : 'Cast Grave Bolt');
  challengeButton.hidden = Boolean(fight) || !(complete || attempted);
  setText(challengeButton, complete ? 'Challenge the Abbot Reborn' : 'Retry fight');
  const endgameHint = state.rematches
    ? 'The Abbot Reborn has fallen. Challenge him again for 180 Bone Dust.'
    : 'The abbey is yours. Raise the Iron Abbot, then test your full lineup against his reborn form.';
  const hint = fight ? fightHints[Math.min(cleared, 2)]
    : complete ? endgameHint
    : attempted ? `Farming Bone Dust after retreating. Upgrade your army before retrying ${foe.name}.`
    : `The army fights automatically. Upgrade your army before ${foe.name} arrives.`;
  setText(find('battle-hint'), hint);

  championButtons.forEach(({ row, button }, index) => {
    const foe = encounters[index];
    const raised = state.raised.includes(index);
    const deployed = lineup.includes(index);
    const defeated = index < cleared;
    row.classList.toggle('active', deployed);
    button.disabled = !defeated || (!raised && state.essence < foe.cost);
    button.dataset.state = defeated && !raised ? 'available' : '';
    const label = raised ? (deployed ? 'Recall' : 'Deploy') : defeated ? `Raise · ${foe.cost} essence` : 'Defeat to unlock';
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

function resume(now) {
  const earned = collectOffline(state, now);
  if (earned) announce(`While you were away, your army gathered ${number.format(earned)} Bone Dust.`);
  saveAndRender();
}

bolt.addEventListener('click', () => {
  eventFeedback(castBolt(state));
  saveAndRender();
});
challengeButton.addEventListener('click', () => {
  if (challenge(state)) announce(`${target(state).name} enters the battlefield.`);
  saveAndRender();
});

announce(restored ? 'Your march through the abbey resumes.' : 'Your skeletons begin their patrol at the Abbey Gate.');
resume(Date.now());

let lastTick = Date.now();
let hiddenSince = document.hidden ? lastTick : null;
setInterval(() => {
  if (hiddenSince !== null) return;
  const now = Date.now();
  const elapsed = Math.floor((now - lastTick) / 1000);
  if (elapsed < 1) return;
  if (elapsed > 5) {
    lastTick = now;
    collectOffline(state, now);
  } else {
    lastTick += elapsed * 1000;
    for (let i = 0; i < elapsed; i++) eventFeedback(tick(state));
  }
  saveAndRender();
}, 200);

document.addEventListener('visibilitychange', () => {
  const now = Date.now();
  if (document.hidden) {
    hiddenSince = now;
    save();
  } else if (hiddenSince !== null) {
    hiddenSince = null;
    lastTick = now;
    resume(now);
  }
});
window.addEventListener('pagehide', () => {
  if (hiddenSince === null) save();
});
