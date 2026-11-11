# Martial Idler: content guide

Everything you can change without code lives in **`content.js`** (plain JSON after `window.CONTENT =`).
Edit it by hand, or use the in-game **EDITOR** button on the start menu.

## Files (keep them together)

| File | What it is |
|---|---|
| `index.html` | The game: rendering, menu, model viewer. Hero's default model is embedded in it. |
| `content.js` | All game data: enemies, attacks, effects, upgrades, props, models, settings. |
| `sim.js` | Game rules. Reads `content.js`. No graphics, so it ports to Godot. |
| `editor.js` | The in-game editor. |
| `overlay/` | Optional Electron wrapper for the taskbar strip. |

## The editor

Start menu > **EDITOR**. Left: forms. Right: the model viewer, which shows whatever you are editing.

- Every change is **saved in your browser automatically** and used by the game straight away.
- **Save to file** writes `content.js` (Chrome lets you pick the file and overwrites it; other browsers download it, then replace the old `content.js`).
- **Export JSON** gives a plain `content.json` to share. **Import** loads a `.json` or `.js`.
- **Reset** throws away your browser edits and goes back to the `content.js` on disk.
- The footer checks your content (missing attacks, bad numbers, unknown effects...) and tells you what is wrong.
- **Preview buttons** run the real game rules on a test dummy so you can see an attack's timing and effects.

## Frame data (how attacks work)

Time inside attacks is in **frames, 60 per second** (60 = 1 second).

```
|------ startup ------|-- active --|---- recovery ----|
 windup, telegraphed    can hit      open for a counter
 Hero can PARRY here
```

An attack record in `attacks`:

```json
"heavy_swing": {
  "kind": "melee",                        // melee | projectile | burst | charge | heal | teleport
  "startup": 54, "active": 4, "recovery": 21,
  "cooldown": 126,                        // frames before it can be used again
  "damage": 1,                            // multiplier of the enemy's own damage
  "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 },
  "telegraph": ["tg_pulse"],              // shown during startup
  "onStart": [], "onActive": [], "onHit": ["spark_big"]
}
```

| kind | extra fields |
|---|---|
| melee | `hitbox` (reach forward, half depth) |
| projectile | `speed`, `track` (line up while winding up), `trail` color |
| burst | `radius`, `zRadius`, `hitsHero`, `hitsEnemies`, `enemyDamage`, `selfDestruct` |
| charge | `speed`, `hitbox`, `track` |
| heal | `heal` (0.3 = 30%) |
| teleport | `behind`, `invisible`, `then` (attack to start on arrival) |

Optional on any attack: `parryable: false`, `hitstop` (frames), `knockback`.

### Adding an enemy attack
1. **Attacks** tab > Add. Pick a kind and set the frames.
2. **Enemies** tab > pick the enemy > **+ Add attack** > choose yours. Give it a weight, and optionally a distance range (`range`), a depth tolerance (`zTol`), or `whenHpBelow`.
3. Press **Preview this attack**.

## Hero moves

**Hero** tab. The `combo` list is the order Hero cycles his auto-attacks. Each move has the same frame data, plus `damage` (multiplier), `knockback`, `stun`, `hitstop`, `focus`, `breakGuard`, and `finisher`. `click`, `parry` and `blast` are instant moves tied to clicking, parrying and the Focus blast.

## Effects

`effects` holds named effects. Attacks and moves list effect names, so one effect can be reused.

A particle effect is a list of pieces:

```json
"spark_big": [ { "type": "sparks", "count": 14, "color": "#ffd24a" },
               { "type": "shake", "amount": 0.22 } ]
```

Piece types: `sparks`, `slash`, `ring` (`"flat": true` lies on the ground), `glow`, `shake`, `flash`, `text`, `smoke`, `rise`.
Every piece can have `"at": "self" | "target" | "hero"` and `"offsetX"`.

A **telegraph** is a single object (not a list): `{ "type": "telegraph", "shape": "pulse | aimLine | link | pathLine | groundRing", "color": "#ff3333" }`. It is drawn while an attack winds up.

`settings.fxDefaults` sets the effects used for crits, blocks, guard breaks, Hero being hurt, and kills.

## Enemies

Key fields: `hp`, `speed`, `damage`, `scale`, `chi`, `unlock` (first wave), `weight` (how common), `ai`, `tint`, `model`, `props`, `attacks`.

- `ai`: `melee` (queues up around Hero, set `stand`), `ranged` (keeps `keep: [min, ideal]` distance), `support` (stays back), `rusher` (runs at Hero).
- `guard`: `{ "damageTaken": 0.2, "breakStun": 60 }` takes 20% from normal hits while walking. Moves with `breakGuard` break it.
- `onDeath`: an attack (usually a `burst`) triggered when it is killed.
- `tip`: shown the first time the enemy appears.
- The boss (`boss`) appears every `settings.bossEvery` waves; `settings.bossNames` are its titles in order.

## Upgrades

Each upgrade has a `branch`, `baseCost`, `growth` (cost multiplier per level), `max`, optional `requires` (`{ "str": 3 }`) and `mods`:

```json
"mods": [ { "stat": "damage", "op": "addPct", "value": 0.2 } ]
```

- `add`: stat + value x level. `addPct`: stat x (1 + value x level). `pow`: stat x value^level.
- Optional `per` (counts every N levels) and `cap` (stat limit).
- Stats: damage, attackScale, reach, cleave, maxHp, armor, chiMult, focusGain, move, regen, crit, critMult, finisherMult, blastMult, dodge, thorns, revives, offline, sweep, spirit.

## Models, hats and weapons

### Models (Models tab)
Drag a `.glb` onto the drop box. The importer reports triangles, bones, textures, animation clips and height, and warns about problems.
- **With a skeleton** it becomes a **character model**. Set its facing (`yaw`), `height` in metres (0 = keep the original size) and the **bone names** (head, hand_r, hand_l, ...) so props know where to attach. Then give it to Hero or an enemy with the `model` field.
- **Without a skeleton** it becomes a **prop kit**: every object in the file can be added as a prop.
- Imported files are stored in your browser (IndexedDB), so they survive reloads.
- Animation clips in an imported file are ignored, so strip them in Blender if you want a small file.

### Props (Props tab)
A prop is a hat, weapon, shield or any attachment: `shape` (`box`, `disc`, `bow`, `halo`, `sphere`, or `kit` for a mesh from an imported file), `color`, `size`, `offset`, `rot` (degrees), and `bone`.
- Set **`bone`** to attach it to a bone (`head` for hats, `hand_r` for weapons). Leave it empty to attach to the body.
- **Blender tip:** put each hat's origin where it sits on the head (base centre), +Y up, +Z forward. Then the offset is usually `[0, 0, 0]`. Name objects `hat_...`, `mask_...`, `weapon_...`.
- Give props to Hero or an enemy through their `props` list. The viewer shows the prop on the selected character while you tune it.

## Animation

Characters can play the animation clips stored in their `.glb`.

**Importing:** Models tab > drop the file. The report lists every clip with its length. Press **Use as Hero's model** to replace Hero, or **Add** to make a new character model. Clips are mapped to game states by name (idle, run, hit, knockdown...), and you can change that mapping.

**Game states** (Models tab > Animations): `idle` (required: animation turns on once an idle clip is set), `move`, `hurt` (Hero is hit), `stun`, `defeat`, and optionally `meditate`. Enemies share these clips when they use the same model. These live in `models.<id>.anims` in `content.js`.

**Attacks and Hero moves** choose a clip with `"anim": "punch_left"`. The clip is stretched to fit the frame data, so the strike lands exactly when the active frames begin:

```
clip:   |---- wind-up ----|X impact |---- follow-through ----|
frames: |---- startup ----|-- active --|------ recovery ------|
```

- `animImpact` is the moment (in seconds) the strike lands inside the clip. If you leave it out, the game finds it by sampling the clip for the moment the hands or feet move fastest. The editor has **Detect impact** and **Play clip** buttons.
- Shorter startup frames make the wind-up part of the clip play faster. Tune the frames in the editor and watch it with **Preview**.
- Instant moves (dash strike, parry) have no frames; their clip plays from just before its impact.

**Size:** the animation data is the biggest part of a model file (10 clips on 41 bones is about 350 KB). To shrink it: fewer bones, fewer or shorter clips, drop clips you do not use, and export only rotation tracks (plus the hips position) from Blender.

## Settings

Balance and wave numbers: enemy health/damage growth per wave, chi growth, wave size, boss frequency, offline progress cap.

## Rules of thumb
- Frames, not seconds: 30 frames = half a second.
- Change one number, then press **Preview**.
- If the footer shows a red problem, the game may ignore or break that item, so fix it before playing.
