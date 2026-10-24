# Dragon Runner (graybox prototype)

Casual mobile 3D lane runner. You ride a dragon, it breathes fire automatically, you smash through one 90-second level and burn down the castle gate at the end.

## Play

- **Phone:** https://chilledbill.github.io/games/dragon/ (portrait)
- **Desktop:** same link, or run `python3 -m http.server` in the repo root and open http://localhost:8000/dragon/

| Action | Phone | Desktop |
| --- | --- | --- |
| Change lane | Swipe left / right | ← → or A / D |
| Rage (when the button glows) | Tap the button | Space / ↑ |

## Test URLs

- `?debug=1` adds an FPS counter and a ⚙ panel: toggle shake, hit pause, particles, haptics, and change speed, fire rate, rage length live.
- `?level=practice` loads a target-practice track with only burnable stuff.
- In the browser console, `DR.Game.hitLog` lists what hit you and when.

## Files

| File | What it does |
| --- | --- |
| `js/config.js` | **Every tuning number.** Start here. |
| `js/input.js` | Swipe, keys, rage button |
| `js/feel.js` | Screen shake, hit pause, particles, haptics |
| `js/world.js` | Sky, ground, scrolling scenery |
| `js/player.js` | Dragon + knight, lanes, hearts, shield |
| `js/entities.js` | Enemies, obstacles, coins, pickups, castle gate |
| `js/combat.js` | Auto-fire targeting and fireballs |
| `js/level.js` | Level chunks and level definitions |
| `js/hud.js` | HUD and screens |
| `js/debug.js` | `?debug=1` panel |
| `js/main.js` | Game loop, collisions, rage, finale |

## Adding content

- **New chunk:** add an entry to `CHUNKS` in `js/level.js`: `[type, lane 0-2, position 0-1]`. Always leave one lane that's empty or blocked only by burnable things.
- **New level:** add an entry to `LEVELS` with phases (share of the level + chunk pool), then load it with `?level=yourLevelId`.

## Visual language

Warm colors (wood brown, red) = burnable. Grey and black = stone, dodge it. Gold = coins. Blue = shield. Keep this consistent when adding art.

Haptics only work on Android; iPhone Safari has no vibration API.
