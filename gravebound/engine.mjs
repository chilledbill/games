export const champions = [
  { name: 'The Bellkeeper', kind: 'Miniboss', essence: 2, skill: 'Last Toll', boon: 'Restores 9 army health every fourth combat round and can revive fallen skeletons.' },
  { name: 'The Ash Hound', kind: 'Miniboss', essence: 3, skill: 'Cinder Leap', boon: 'Deals 13 bonus damage every third combat round.' },
  { name: 'The Iron Abbot', kind: 'Boss', essence: 5, skill: 'Glass Aegis', boon: 'Blocks up to 8 damage and strikes back every third combat round.' },
];

export const encounters = [
  { name: 'Grave Rat', zone: 'Abbey Gate', area: 0, hp: 10, attack: 2, dust: 6 },
  { name: 'Hollow Watchman', zone: 'Abbey Gate', area: 0, hp: 18, attack: 4, dust: 10 },
  { ...champions[0], zone: 'Abbey Gate', area: 0, guardian: 0, hp: 54, attack: 5, dust: 25, hint: 'The Bellkeeper heals every third round. Finish him with Grave Bolt.' },
  { name: 'Cinder Thrall', zone: 'Cinder Cloister', area: 1, hp: 32, attack: 6, dust: 15 },
  { ...champions[1], zone: 'Cinder Cloister', area: 1, guardian: 1, hp: 112, attack: 8, dust: 40, hint: 'The Ash Hound lunges every third round. The Bellkeeper can heal your army.' },
  { name: 'Sanctuary Sentinel', zone: 'Broken Sanctuary', area: 2, hp: 65, attack: 8, dust: 22 },
  { ...champions[2], zone: 'Broken Sanctuary', area: 2, guardian: 2, hp: 225, attack: 12, dust: 75, hint: 'The Abbot raises a glass shield every third round. Break it with Grave Bolt.' },
  { name: 'The Iron Abbot Reborn', zone: 'Broken Sanctuary', area: 2, guardian: 2, kind: 'Boss', hp: 400, attack: 17, dust: 140, hint: 'Keep enough skeletons alive for the Reborn Abbot. Grave Bolt shatters his shield.' },
];

export const championSlots = 2;
export const upgrades = {
  skeletons: { name: 'Raise Skeleton', detail: '+1 skeleton at the start of each run', base: 16 },
  grimoire: { name: 'Dark Grimoire', detail: '+3 attack and a stronger Grave Bolt', base: 27 },
  armor: { name: 'Bone Armor', detail: '+6 health per skeleton', base: 22 },
};

export const rituals = {
  bloom: { name: 'Corpse Bloom', detail: 'Deal 6 poison damage every third combat round.' },
  pact: { name: 'Grave Pact', detail: 'Adds 5 damage each round while a Champion is deployed.' },
};

const skeletonHealth = state => 30 + state.levels.armor * 6;
export const maxHealth = state => state.run.squad * skeletonHealth(state);
export const livingSkeletons = state => Math.ceil(state.run.army / skeletonHealth(state));
export const damage = state => 2 * livingSkeletons(state) + state.levels.grimoire * 3 + state.lineup.length * 3;
export const upgradeCost = (state, key) => Math.ceil(upgrades[key].base * 1.58 ** state.levels[key]);
export const target = state => encounters[state.run.wave];

function startRun(state, number) {
  const squad = 2 + state.levels.skeletons;
  state.run = {
    number, wave: 0, length: state.cleared === champions.length ? encounters.length : encounters.length - 1,
    squad, army: squad * skeletonHealth(state), enemy: encounters[0].hp, shield: 0, dust: 0,
    round: 0, totalRounds: 0, cooldown: 0, wait: 2, result: null,
  };
}

export function initialState(previous = {}) {
  const state = {
    dust: previous.dust ?? 0, essence: previous.essence ?? 0, cleared: previous.cleared ?? 0,
    levels: { skeletons: 0, grimoire: 0, armor: 0, ...previous.levels },
    raised: [...(previous.raised ?? [])], ritual: previous.ritual ?? 'bloom',
    lineup: (previous.lineup ?? []).slice(0, championSlots),
    best: previous.best ?? 0,
  };
  if (previous.run) state.run = { ...previous.run };
  else startRun(state, 1);
  return state;
}

export function buyUpgrade(state, key) {
  if (!Object.hasOwn(upgrades, key) || state.dust < upgradeCost(state, key)) return false;
  state.dust -= upgradeCost(state, key);
  const alive = livingSkeletons(state);
  state.levels[key]++;
  if (key === 'armor' && !state.run.result) state.run.army += alive * 6;
  return true;
}

export function raiseChampion(state, index) {
  const champion = champions[index];
  if (!champion || index >= state.cleared || state.raised.includes(index) || state.essence < champion.essence) return false;
  state.essence -= champion.essence;
  state.raised.push(index);
  if (state.lineup.length < championSlots) state.lineup.push(index);
  return true;
}

export function toggleChampion(state, index) {
  if (!state.raised.includes(index)) return false;
  if (state.lineup.includes(index)) {
    state.lineup = state.lineup.filter(champion => champion !== index);
    return true;
  }
  if (state.lineup.length >= championSlots) return false;
  state.lineup.push(index);
  return true;
}

function victory(state) {
  const run = state.run;
  const foe = target(state);
  state.dust += foe.dust;
  run.dust += foe.dust;
  state.best = Math.max(state.best, run.wave + 1);
  const soul = foe.guardian === state.cleared;
  if (soul) {
    state.essence += foe.essence;
    state.cleared++;
  }
  const complete = run.wave + 1 === run.length;
  if (complete) {
    run.enemy = 0;
    run.shield = 0;
    run.result = 'cleared';
    run.wait = 4;
  } else {
    run.wave++;
    run.enemy = target(state).hp;
    run.shield = 0;
    run.round = 0;
    run.wait = 1;
  }
  if (soul) {
    const ending = complete ? 'The army will march again from the Abbey Gate.' : 'Raise this Champion in the crypt.';
    return { text: `${foe.name} falls. +${foe.essence} Grave Essence. ${ending}` };
  }
  return complete ? { text: `The run is clear. The army earned ${run.dust} Bone Dust and will march again.` } : null;
}

export function castBolt(state) {
  const run = state.run;
  if (run.wait || run.result || run.cooldown) return null;
  run.cooldown = 6;
  const hit = 12 + state.levels.grimoire * 3;
  run.enemy -= hit;
  run.shield = 0;
  if (run.enemy <= 0) return victory(state);
  return { type: 'bolt', hit };
}

export function tick(state) {
  const run = state.run;
  run.cooldown = Math.max(0, run.cooldown - 1);
  if (run.wait) {
    run.wait--;
    if (run.result && run.wait === 0) startRun(state, run.number + 1);
    return null;
  }

  const foe = target(state);
  run.round++;
  run.totalRounds++;
  const thirdRound = run.totalRounds % 3 === 0;
  const enemyThirdRound = run.round % 3 === 0;
  if (run.totalRounds % 4 === 0 && state.lineup.includes(0)) {
    run.army = Math.min(maxHealth(state), run.army + 9);
  }
  let hit = damage(state);
  if (state.ritual === 'bloom' && thirdRound) hit += 6;
  if (state.ritual === 'pact' && state.lineup.length) hit += 5;
  if (thirdRound && state.lineup.includes(1)) hit += 13;
  if (foe.guardian === 0 && enemyThirdRound) run.enemy = Math.min(foe.hp, run.enemy + 5);
  const blocked = Math.min(hit, run.shield);
  run.shield -= blocked;
  run.enemy -= hit - blocked;
  if (run.enemy <= 0) return victory(state);

  let incoming = foe.attack + (foe.guardian === 1 && enemyThirdRound ? 5 : 0);
  if (thirdRound && state.lineup.includes(2)) {
    incoming = Math.max(0, incoming - 8);
    run.enemy -= 8;
    if (run.enemy <= 0) return victory(state);
  }
  run.army = Math.max(0, run.army - incoming);
  if (run.army === 0) {
    run.result = 'fallen';
    run.wait = 4;
    return { text: `The army fell to ${foe.name}. It kept ${run.dust} Bone Dust and will rise again at the Abbey Gate.` };
  }
  if (foe.guardian === 2 && enemyThirdRound) run.shield = 10;
  return { type: 'round', hit: hit - blocked };
}
