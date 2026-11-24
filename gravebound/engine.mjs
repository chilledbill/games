export const encounters = [
  { name: 'The Bellkeeper', zone: 'Abbey Gate', kind: 'Miniboss', hp: 66, attack: 5, patrol: 28, essence: 2, cost: 2, dust: 32, skill: 'Last Toll', boon: 'Restores 9 army health every fourth round.' },
  { name: 'The Ash Hound', zone: 'Cinder Cloister', kind: 'Miniboss', hp: 148, attack: 9, patrol: 55, essence: 3, cost: 3, dust: 65, skill: 'Cinder Leap', boon: 'Deals 13 bonus damage every third round.' },
  { name: 'The Iron Abbot', zone: 'Broken Sanctuary', kind: 'Boss', hp: 245, attack: 12, patrol: 86, essence: 5, cost: 5, dust: 105, skill: 'Glass Aegis', boon: 'Absorbs up to 8 damage every third round, then hits for 8.' },
];

export const upgrades = {
  skeletons: { name: 'Raise Skeleton', detail: '+2 damage per round', base: 16 },
  grimoire: { name: 'Dark Grimoire', detail: '+3 damage and a stronger Grave Bolt', base: 27 },
  armor: { name: 'Bone Armor', detail: '+15 maximum army health', base: 22 },
};

export const rituals = {
  bloom: { name: 'Corpse Bloom', detail: 'Deal 6 poison damage every third round.' },
  pact: { name: 'Grave Pact', detail: 'Adds 5 damage each round while a Champion is deployed.' },
};

export const initialState = (now = Date.now()) => ({
  dust: 12, essence: 0, cleared: 0, patrol: 0, attempted: false, rematches: 0,
  levels: { skeletons: 0, grimoire: 0, armor: 0 },
  raised: [], lineup: [], ritual: 'bloom', fight: null, cooldown: 0, savedAt: now,
});

export const maxHealth = state => 60 + state.levels.armor * 15;
export const damage = state => 4 + state.levels.skeletons * 2 + state.levels.grimoire * 3 + state.lineup.length * 3;
export const income = state => [2, 3, 7, 8][state.cleared];
export const upgradeCost = (state, key) => Math.ceil(upgrades[key].base * 1.58 ** state.levels[key]);
export const rematch = { ...encounters[2], name: 'The Iron Abbot Reborn', hp: 470, attack: 20 };

export function target(state) {
  return encounters[state.cleared] ?? rematch;
}

export function collectOffline(state, now) {
  const seconds = Math.min(8 * 3600, Math.max(0, Math.floor((now - state.savedAt) / 1000)));
  state.savedAt = now;
  if (!seconds) return 0;
  const earned = seconds * income(state);
  state.dust += earned;
  return earned;
}

export function buyUpgrade(state, key) {
  if (!Object.hasOwn(upgrades, key) || state.dust < upgradeCost(state, key)) return false;
  state.dust -= upgradeCost(state, key);
  state.levels[key]++;
  if (key === 'armor' && state.fight) state.fight.army += 15;
  return true;
}

export function raiseChampion(state, index) {
  const foe = encounters[index];
  if (!foe || index >= state.cleared || state.raised.includes(index) || state.essence < foe.cost) return false;
  state.essence -= foe.cost;
  state.raised.push(index);
  state.lineup.push(index);
  return true;
}

export function toggleChampion(state, index) {
  if (!state.raised.includes(index)) return;
  state.lineup = state.lineup.includes(index)
    ? state.lineup.filter(champion => champion !== index)
    : [...state.lineup, index];
}

export function canChallenge(state) {
  return !state.fight && (state.cleared === encounters.length || state.patrol >= target(state).patrol);
}

export function challenge(state) {
  if (!canChallenge(state)) return false;
  state.fight = { enemy: target(state).hp, army: maxHealth(state), round: 0, shield: 0 };
  state.attempted = true;
  return true;
}

export function retreat(state) {
  if (!state.fight) return false;
  state.fight = null;
  state.attempted = true;
  return true;
}

function victory(state) {
  const foe = target(state);
  const firstClear = state.cleared < encounters.length;
  state.dust += firstClear ? foe.dust : 180;
  if (firstClear) {
    state.essence += foe.essence;
    state.cleared++;
    state.patrol = 0;
  } else {
    state.rematches++;
  }
  state.fight = null;
  state.attempted = false;
  return { type: 'victory', text: firstClear
    ? `${foe.name} falls. +${foe.dust} Bone Dust · +${foe.essence} Grave Essence. Raise this Champion in the crypt.`
    : 'The Iron Abbot Reborn falls. +180 Bone Dust.' };
}

export function castBolt(state) {
  if (!state.fight || state.cooldown > 0) return null;
  state.cooldown = 6;
  const hit = 12 + state.levels.grimoire * 3;
  state.fight.enemy -= hit;
  state.fight.shield = 0;
  if (state.fight.enemy <= 0) return victory(state);
  return { type: 'bolt', hit, text: `Grave Bolt deals ${hit} damage and breaks any enemy shield.` };
}

export function tick(state) {
  state.cooldown = Math.max(0, state.cooldown - 1);
  const foe = target(state);
  const fight = state.fight;
  state.dust += income(state);
  if (!fight) {
    if (state.cleared < encounters.length) {
      state.patrol = Math.min(foe.patrol, state.patrol + damage(state));
      if (foe.kind === 'Miniboss' && !state.attempted && challenge(state)) {
        return { type: 'challenge', text: `${foe.name} enters the battlefield.` };
      }
    }
    return null;
  }

  fight.round++;
  const thirdRound = fight.round % 3 === 0;
  let hit = damage(state);
  if (state.ritual === 'bloom' && thirdRound) hit += 6;
  if (state.ritual === 'pact' && state.lineup.length) hit += 5;
  if (thirdRound && state.lineup.includes(1)) hit += 13;
  if (state.cleared === 0 && thirdRound) fight.enemy = Math.min(foe.hp, fight.enemy + 5);
  const blocked = Math.min(hit, fight.shield);
  fight.shield -= blocked;
  fight.enemy -= hit - blocked;
  if (fight.enemy <= 0) return victory(state);

  if (fight.round % 4 === 0 && state.lineup.includes(0)) {
    fight.army = Math.min(maxHealth(state), fight.army + 9);
  }
  let incoming = foe.attack + (state.cleared === 1 && thirdRound ? 5 : 0);
  if (thirdRound && state.lineup.includes(2)) {
    incoming = Math.max(0, incoming - 8);
    fight.enemy -= 8;
    if (fight.enemy <= 0) return victory(state);
  }
  fight.army -= incoming;
  if (fight.army <= 0) {
    retreat(state);
    return { type: 'defeat', text: 'The army retreats to the last cleared area and keeps farming Bone Dust.' };
  }
  if (state.cleared >= 2 && thirdRound) fight.shield = 10;
  return { type: 'round', hit: hit - blocked };
}
