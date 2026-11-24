import { legs, marchPosition, skeletonPosition } from './dungeon.mjs?v=6';

export const champions = [
  { name: 'The Bellkeeper', kind: 'Miniboss', essence: 2, skill: 'Last Toll', boon: 'Heals the weakest living skeleton for 9 every fourth combat round. Can revive a fallen skeleton if the survivors are healthy.' },
  { name: 'The Ash Hound', kind: 'Miniboss', essence: 3, skill: 'Cinder Leap', boon: 'Leaps past the front line to hit archers for 13 damage every third combat round. Hunts the closest foe when there is no archer.' },
  { name: 'The Iron Abbot', kind: 'Boss', essence: 5, skill: 'Glass Aegis', boon: 'Blocks up to 8 damage and strikes back every third combat round.' },
];

export const encounters = [
  { name: 'Grave Rat', zone: 'Abbey Gate', area: 0, hp: 10, attack: 2, dust: 6 },
  { name: 'Hollow Watchman', zone: 'Abbey Gate', area: 0, hp: 18, attack: 4, dust: 10 },
  { ...champions[0], zone: 'Abbey Gate', area: 0, guardian: 0, hp: 54, attack: 5, dust: 25, hint: 'The Bellkeeper heals every third round. Finish him with Grave Bolt.' },
  { name: 'Cinder Thrall', zone: 'Cinder Cloister', area: 1, hp: 32, attack: 6, dust: 15 },
  { ...champions[1], zone: 'Cinder Cloister', area: 1, guardian: 1, hp: 112, attack: 8, dust: 40, hint: 'The Ash Hound lunges every third round. The Bellkeeper can heal your army.' },
  { name: 'Sanctuary Sentinel', zone: 'Broken Sanctuary', area: 2, kind: 'Shield guard', hp: 54, attack: 7, dust: 30, hint: 'The Sentinel blocks skeleton strikes while the archer picks off your wounded. The Ash Hound can leap straight to the archer.' },
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

export const archer = { name: 'Crypt Archer', kind: 'Archer', area: 2, hp: 29, attack: 6 };
export const opponents = wave => legs[wave].backline ? [encounters[wave], archer] : [encounters[wave]];
export const enemyPosition = (wave, index) => index === 1 ? legs[wave].backline : legs[wave].enemy;
export const skeletonHealth = state => 30 + state.levels.armor * 6;
export const livingSkeletons = state => state.run.units.filter(unit => unit.hp > 0).length;
const supportDamage = state => state.levels.grimoire * 3 + state.lineup.length * 3;
export const damage = state => 2 * livingSkeletons(state) + supportDamage(state);
export const upgradeCost = (state, key) => Math.ceil(upgrades[key].base * 1.58 ** state.levels[key]);
export const target = state => encounters[state.run.wave];
export const stepMs = 125;
export const isMarching = ({ run }) => !run.result && run.travel < legs[run.wave].length;

function startRun(state, number) {
  const squad = 2 + state.levels.skeletons;
  state.run = {
    number, wave: 0, length: state.cleared === champions.length ? encounters.length : encounters.length - 1,
    units: makeUnits(squad, skeletonHealth(state)), enemies: makeEnemies(0), dust: 0,
    round: 0, totalRounds: 0, cooldown: 0, wait: 2, result: null, travel: 0, frame: 0,
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
  if (previous.run) {
    const { run } = previous;
    const nearEntrance = run.wave === 0 && run.round === 0 && run.wait > 0 && !run.result;
    const { army, enemy, shield, squad, ...savedRun } = run;
    state.run = {
      travel: nearEntrance ? 0 : legs[run.wave].length, frame: 0, ...savedRun,
      units: run.units?.map(unit => ({ ...unit })) ?? makeUnits(squad, skeletonHealth(state), army),
      enemies: run.enemies?.map(foe => ({ ...foe })) ?? makeEnemies(run.wave, enemy, shield),
    };
  } else {
    startRun(state, 1);
  }
  return state;
}

export function buyUpgrade(state, key) {
  if (!Object.hasOwn(upgrades, key) || state.dust < upgradeCost(state, key)) return false;
  state.dust -= upgradeCost(state, key);
  state.levels[key]++;
  if (key === 'armor' && !state.run.result) {
    for (const unit of state.run.units) if (unit.hp > 0) unit.hp += 6;
  }
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

function makeUnits(count, max, army = count * max) {
  return Array.from({ length: count }, (_, id) => ({
    hp: Math.max(0, Math.min(max, army - (count - id - 1) * max)),
    x: null, y: null, target: null, fallenTo: null,
  }));
}

function makeEnemies(wave, primaryHealth, shield = 0) {
  return opponents(wave).map(({ hp }, index) => ({
    hp: index === 0 && primaryHealth !== undefined ? Math.min(hp, primaryHealth) : hp,
    shield: index === 0 ? shield : 0,
  }));
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
    run.result = 'cleared';
    run.wait = 4;
  } else {
    run.wave++;
    run.travel = 0;
    run.enemies = makeEnemies(run.wave);
    run.round = 0;
    run.wait = 1;
    for (const unit of run.units) {
      if (unit.hp > 0) {
        unit.x = null;
        unit.y = null;
      }
      unit.target = null;
    }
  }
  if (soul) {
    const ending = complete ? 'The army will march again from the Abbey Gate.' : 'Raise this Champion in the crypt.';
    return { text: `${foe.name} falls. +${foe.essence} Grave Essence. ${ending}` };
  }
  return complete ? { text: `The run is clear. The army earned ${run.dust} Bone Dust and will march again.` } : null;
}

function hitEnemy(run, index, amount, breakShield = false) {
  const foe = run.enemies[index];
  if (breakShield) foe.shield = 0;
  const blocked = Math.min(amount, foe.shield);
  foe.shield -= blocked;
  const hit = Math.min(foe.hp, amount - blocked);
  foe.hp -= hit;
  return hit;
}

export function castBolt(state) {
  const run = state.run;
  if (run.wait || run.result || run.cooldown || isMarching(state)) return null;
  const index = run.enemies.findIndex(foe => foe.hp > 0);
  run.cooldown = 6;
  const hit = hitEnemy(run, index, 12 + state.levels.grimoire * 3, true);
  if (run.enemies.every(foe => foe.hp === 0)) return victory(state);
  return { effects: [{ kind: 'bolt', index, hit }] };
}

const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);

function moveSkeletons(run) {
  const index = run.enemies.findIndex(foe => foe.hp > 0);
  const foe = enemyPosition(run.wave, index);
  const lead = marchPosition(run.wave, run.travel);
  const direction = Math.atan2(lead.y - foe.y, lead.x - foe.x);
  let rank = 0;

  for (const unit of run.units) {
    if (!unit.hp) continue;
    if (unit.x === null) Object.assign(unit, skeletonPosition(run.wave, run.travel, rank));
    unit.target = index;
    const row = Math.floor(rank / 7);
    const offset = rank % 7;
    const arc = direction + Math.ceil(offset / 2) * (offset % 2 ? .46 : -.46);
    const reach = 13 + Math.min(row, 3) * 3;
    const goal = { x: foe.x + Math.cos(arc) * reach, y: foe.y + Math.sin(arc) * reach };
    const remaining = distance(unit, goal);
    const fraction = remaining ? Math.min(1, 8 / remaining) : 0;
    unit.x += (goal.x - unit.x) * fraction;
    unit.y += (goal.y - unit.y) * fraction;
    rank++;
  }
}

export function step(state) {
  const run = state.run;
  const moving = !run.wait && isMarching(state);
  if (moving) run.travel = Math.min(legs[run.wave].length, run.travel + 12);
  if (!run.wait && !isMarching(state) && !run.result) moveSkeletons(run);
  run.frame = (run.frame + 1) % (1000 / stepMs);
  return run.frame === 0 ? combatTick(state, moving) : null;
}

function restoreSkeleton(state, effects) {
  const { run } = state;
  const max = skeletonHealth(state);
  const wounded = run.units.filter(unit => unit.hp > 0 && unit.hp <= max - 9)
    .sort((a, b) => a.hp - b.hp)[0];
  const unit = wounded ?? run.units.find(skeleton => skeleton.hp === 0)
    ?? run.units.filter(skeleton => skeleton.hp < max).sort((a, b) => a.hp - b.hp)[0];
  if (!unit) return;
  if (unit.hp === 0) {
    // A fallen skeleton may be several rooms back. It rises near the Bellkeeper.
    Object.assign(unit, skeletonPosition(run.wave, run.travel, livingSkeletons(state)));
    unit.fallenTo = null;
  }
  const heal = Math.min(9, max - unit.hp);
  unit.hp += heal;
  effects.push({ kind: 'heal', id: run.units.indexOf(unit), hit: heal });
}

function combatTick(state, moving) {
  const run = state.run;
  run.cooldown = Math.max(0, run.cooldown - 1);
  if (run.wait) {
    run.wait--;
    if (run.result && run.wait === 0) startRun(state, run.number + 1);
    return null;
  }
  if (moving) return null;

  const foe = target(state);
  const roster = opponents(run.wave);
  const effects = [];
  run.round++;
  run.totalRounds++;
  const thirdRound = run.totalRounds % 3 === 0;
  const enemyThirdRound = run.round % 3 === 0;
  if (run.totalRounds % 4 === 0 && state.lineup.includes(0)) restoreSkeleton(state, effects);
  if (foe.guardian === 0 && enemyThirdRound) run.enemies[0].hp = Math.min(foe.hp, run.enemies[0].hp + 5);

  let front = run.enemies.findIndex(enemy => enemy.hp > 0);
  if (thirdRound && state.lineup.includes(1)) {
    const backline = run.enemies.findIndex((enemy, index) => enemy.hp > 0 && roster[index] === archer);
    const index = backline === -1 ? front : backline;
    effects.push({ kind: 'hound', index, hit: hitEnemy(run, index, 13) });
    front = run.enemies.findIndex(enemy => enemy.hp > 0);
    if (front === -1) return victory(state);
  }

  const frontPosition = enemyPosition(run.wave, front);
  const attackers = run.units.map((unit, id) => ({ unit, id }))
    .filter(({ unit }) => unit.hp > 0 && unit.target === front && distance(unit, frontPosition) <= 26);
  if (attackers.length) {
    let damage = attackers.length * (roster[front].kind === 'Shield guard' ? 1 : 2) + supportDamage(state);
    if (thirdRound && state.ritual === 'bloom') damage += 6;
    if (state.ritual === 'pact' && state.lineup.length) damage += 5;
    const hit = hitEnemy(run, front, damage);
    effects.push({ kind: 'strike', index: front, attackers: attackers.map(({ id }) => id), hit });
    if (run.enemies.every(enemy => enemy.hp === 0)) return victory(state);
  }

  for (const [index, enemy] of run.enemies.entries()) {
    if (!enemy.hp) continue;
    const attacker = roster[index];
    const ranged = attacker === archer;
    if (ranged && run.round % 2) continue;
    const origin = enemyPosition(run.wave, index);
    const reachable = run.units.map((unit, id) => ({ unit, id, range: distance(unit, origin) }))
      .filter(({ unit, range }) => unit.hp > 0 && (ranged || range <= 34));
    reachable.sort(ranged ? (a, b) => a.unit.hp - b.unit.hp : (a, b) => a.range - b.range);
    const victim = reachable[0];
    if (!victim) continue;
    let incoming = attacker.attack + (attacker.guardian === 1 && enemyThirdRound ? 5 : 0);
    if (index === 0 && thirdRound && state.lineup.includes(2)) {
      incoming = Math.max(0, incoming - 8);
      hitEnemy(run, index, 8, true);
      if (run.enemies.every(enemy => enemy.hp === 0)) return victory(state);
      if (!enemy.hp) continue;
    }
    const hit = Math.min(victim.unit.hp, incoming);
    victim.unit.hp -= hit;
    if (victim.unit.hp === 0) victim.unit.fallenTo = attacker.name;
    effects.push({ kind: ranged ? 'arrow' : 'enemy', id: victim.id, index, hit });
    if (!livingSkeletons(state)) {
      run.result = 'fallen';
      run.wait = 4;
      return { effects, text: `The last skeleton fell to ${attacker.name}. The army kept ${run.dust} Bone Dust and will rise again at the Abbey Gate.` };
    }
  }
  if (foe.guardian === 2 && enemyThirdRound && run.enemies[0].hp) run.enemies[0].shield = 10;
  return { effects };
}
