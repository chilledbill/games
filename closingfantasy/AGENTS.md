# AGENTS.md — Closing Fantasy

Instructions for AI agents working on this project. **Two agents share it**, so read "Working as two agents" before you change anything.

## What this is
- A portrait, one-handed mobile tactical action RPG, **prototyped as one self-contained HTML file** (Canvas 2D, 420×480 logical pixels, synthesized Web Audio, no external files).
- How it plays:
  - On a small tactical map, you click an enemy to approach it.
  - That opens a separate battle arena.
  - There are four enemies: Grunt, Archer, Defender and Berserker.
- **Current focus: game feel** (juice: hit feedback, parry, dodge). **Gameplay systems are out of scope** unless the user asks for them.

## Where things live
| What | Path | Role |
|---|---|---|
| Live build | `closingfantasy/index.html` in the `chilledbill/games` repo (local: `C:\Users\load2\Documents\Claude-KHlike\incrementalgame\incrementalgame\`) | What GitHub Pages serves at `chilledbill.github.io/games/closingfantasy/`. **This is the source of truth.** |
| Build history | `D:\claudegames\0ClosingFantasy\ClosingFantasy_vNN_Name.html` | Numbered copy of every build, kept as backups. Never edit old ones. |
| Changelog | `closingfantasy/CHANGELOG.md` (copy in the D: folder) | One entry per build. |
| Hub page | `index.html` at the repo root | One card per game. Change only the Closing Fantasy card. The file uses CRLF line endings, so keep them. |

## Rules the user has set (follow every time)
1. **Deliver every build to the folders and confirm it arrived.**
   - Write the new build to `closingfantasy/index.html` and to a new numbered copy in the D: folder.
   - Read both back and confirm they match what you built.
   - If you can't write or verify, **say so plainly**. Never say a file is in place without checking.
2. **Every build gets a Build notes entry** in the in-game panel (the `#notes` aside, newest first, inside `<details open>`) **and** in `CHANGELOG.md`. Bump the version in the `<title>` and in the header `<small>`.
3. **Make values adjustable.**
   - New effects get tuning-panel sliders with wide ranges. The user tunes far higher than AI defaults; several of their values sit at a slider's maximum.
   - Widen a slider's range whenever the user hits its end.
4. **The user publishes.** They commit and push to GitHub themselves. Don't push unless they ask.
5. **Keep replies short and concrete:** what changed, the tuning values, what was tested, what needs a human to judge. In design discussions, act as a game designer and give options.
6. Automated tests don't prove a hit feels good. Say that tests passed; leave the feel to the user's playtest.

## Design facts (current, confirmed by the user)
- **Player:** light (J), heavy (K), **parry** (Space) and **dodge** (A/D). **The player has no guard.**
- **Defender loop:** idle (guarding) → windup (guarding) → swing (guard drops) → about 0.7 s cooldown (open) → idle.
  - A parry also opens him up.
  - Light hits are blocked whenever his guard is up. Heavy hits always go through.
- **Blocked hits must feel clearly bad:**
  - dull grey effects and sound
  - the player knocked back and their arm jolted
  - the trail cut at the shield
  - a real push-back
- **Armor chips** belong on heavy hits, not blocks.
- The user likes impact frames **on kills only**, kill slow-motion, and big zoom punches.
- **Victim shiver** is off by default; the user may want it later for an earthquake-style attack.
- Only one slash shape per swing. Heavy swings have the smear off.
- Effects are render-only (no change to logical position) **except** the deliberate blocked push-back, which is gameplay.

## Code map (inside the single `<script>`)
The code is dense, with few line breaks. Find things by name.

**Core**
- `input(k)`: starts attacks, parries, dodges and target switching.
- `battleTick(dt)`: contact resolution, guard check, enemy AI and attacks, parry check.
- `hit(e,n,w,stagger,kind)`: damage, defeat, kill effects.
- `impact(u,k,from,label)`: one function for all hit feedback. `k` is one of `light`, `heavy`, `guard`, `parry`, `hurt`. `q(name)` reads `T[name+'_'+k]`.
- `sprite(u,isPlayer)`: procedural character drawing. Holds the swing pose, lunge, squash, shiver, smear, glint, parry stance and Defender shield pose.
- `slash()`: sword trail.
- `paintJuice()`, `paintGround()`, `tickJuice(dt)`: effects.
- `draw()`, `loop(t)`: rendering and the frame loop.
- `sound(k)`, `tone()`, `hiss()`, `sweep()`: audio.

**Effects helpers**
- `timeSlow(dur,amt)`: slow-motion. Kill, parry and dodge share it.
- `zoomPunch(pct,x,y)`
- `parryClash(e)`, `onDodge(old,sign)`, `dodgeSuccess(e)`, `enemySwing(e)`
- `tickChunks()`: HP damage chunk.
- `tickMapVanish()`, `paintMapVanish()`: map defeat flash.

**Tuning system** (search `v0.5 TUNING SYSTEM`)
- `TUNE_GROUPS`: the slider list. Each row is `[key, label, min, max, step, factoryDefault, unit]`.
- `OUT_ROWS` and `OUT_FACTORY`: per-outcome rows, generated as `key_light`, `key_heavy` and so on.
- `FACTORY`: v0.4 behaviour. **New effects use factory = 0 or off**, so A/B (B key) still compares against v0.4.
- **Load order:** `FACTORY` → `BAKED` (JSON in `<script id="cfTuningDefaults">`, the file's own defaults) → `SAVED` (`localStorage.cfTuning`) → `T` (live values).
- To change a default: edit the JSON in `#cfTuningDefaults`, not `FACTORY`.
- A value the user saved in their browser **overrides** the file's defaults. Tell the user when a new default might be hidden by their saved values.

**Isolation** (search `FX_LAYERS`)
- Every effect layer has an entry in `FX_LAYERS`. Effects are wrapped in `fxOn('layerName')` so they can be soloed or muted.
- Add a layer for every new effect.

**Other UI**
- Settings in `cfg` (`localStorage.cfSettings`), including `cfg.practice` (the No damage button, N).

## How to make a change
1. Get the latest `closingfantasy/index.html`, check the version in its `<title>`, and keep a copy of it.
2. Make a small, focused change.
3. For any new feel variable, add:
   - a `TUNE_GROUPS` row (factory = off)
   - a default in `#cfTuningDefaults` if it should be on
   - an `FX_LAYERS` entry with an `fxOn()` gate
4. Check the script parses: extract the main `<script>` and run `node --check`.
5. Test in a headless browser:
   - the page loads with no page errors
   - the specific effect fires (read state through `page.evaluate`, and take frozen-frame screenshots by setting `stop` or `paused`)
   - a full-map run finishes with effects on (`cfg.juice=1`) and off (`cfg.juice=0`)
6. Add the Build notes entry and the CHANGELOG entry, then bump the version.
7. Deliver to both locations and verify (rule 1).

## Working as two agents
- **One builder at a time.** Only one agent edits `closingfantasy/index.html` in any build. Before starting, check its version and timestamp. If they changed while you worked, start again from the new file instead of overwriting it.
- **Version numbers go up by one per build.** Use the next number after what's in the live file's `<title>`, never a number you remembered.
- **Leave a handoff note.** Append to `CHANGELOG.md` what you changed, the tuning values, what you tested, and anything unfinished, so the other agent can continue.
- **Split work by area when both are active.** For example, one agent takes parry and dodge while the other takes hit feedback and audio. Don't edit the same functions in parallel.
- **The user's latest instruction wins.** If this file disagrees with the user, follow the user and update this file.
