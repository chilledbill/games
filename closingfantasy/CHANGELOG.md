# Closing Fantasy — Changelog

Newest first. Every build also has the same notes in the in-game **Build notes** panel (left side).
Numbered copies of each build live in `D:\claudegames\0ClosingFantasy` as `ClosingFantasy_vNN_Name.html`.

## Open issues (from the user, not yet fixed)
- **Light attack slash looks bigger than the heavy (reported after v0.24).** The big pale fan on light swings is the **smear frame** (v0.6): user values `smearSize` 70, `smearAlpha` 0.65, `smearTime` 160 ms, on for light (`smearOnLight` 1) and off for heavy (`smearOnHeavy` 0, since v0.22). The heavy shows only the sword trail (`trailWHeavy` 20, `trailMaxR` 85), so it reads smaller.
  - The user couldn't find a slider for it: nothing is labelled as the light slash. The controls are under **✨ New juice (v0.6)**: *Smear frame length / strength / duration / on light swings*.
  - Fix to discuss with the user: make the heavy read bigger than the light (for example a bigger, longer heavy trail, or a separate smear size for light and heavy), and give these sliders labels the user will recognise, such as "Light slash size".

## v0.25 · Dodge and enemy tracking
- Dodge movement takes 150 ms. You can then attack, while your next dodge or parry unlocks 450 ms after the step began. Amber telegraphs turn toward you at up to 180°/s during the first 65% of windup. Red marks the locked strike. The Defender turns behind his shield and holds his facing through exposed recovery. Adjust all four values under Gameplay.
- Verified in headless Chrome: attack and defense unlock thresholds, early dodge caught, bounded turns and locked directions on all four enemies, Defender guard and exposure, arrows from a secondary attacker, and both dodge directions at all four corners. Parry-led and dodge-led full-map clears passed with effects on and off.
- Human playtest: judge the amber-to-red transition and 180°/s tracking on a phone, especially against the Berserker.

## v0.24 · Defensive gameplay
- Parry inputs cannot refresh an active window. A miss leaves 0.25 s of vulnerable recovery. A successful targeted parry grants a 1.00 s opening for a manual counter. Both recovery values are adjustable in Gameplay. Attacking or evading cancels the active window.
- Evades use the earliest committed attack that currently covers the player. At arena edges they try available directions. Melee attackers finish recovery before pursuing. Switching targets during a swing keeps the original contact target.
- Headless Chrome passed parry-led and dodge-led full-map clears with effects on and off, repeated parry inputs, secondary Archer and melee threats, arrow reflection, three-light Grunt kills, both evade inputs at all four corners, and guarded and exposed Defender hits.
- Playtest next on a phone to judge secondary attack readability and the feel of an evade redirected along a wall.

## v0.23 · Your tuning as defaults
- The user's second tuning export (193 values) is now the built-in default set.
- Settings added after that export keep their own defaults: trail cut on guard, dull block, blocked knockback and push-back, smear on/off per swing.
- Widened sliders the user had pushed to the end of their range:
  - heavy windup hold: max 0.95
  - glint size: max 80
  - sword bounce: max 4
  - dodge slow-mo speed: min ×0.01
  - afterimage lifetime: max 2500 ms
- First build published to GitHub Pages at `closingfantasy/`.

## v0.22 · One slash on heavy
- The smear frame is off for heavy swings, so a heavy shows only the sword trail. Before, both effects stacked into two slash shapes.
- New switches: **Smear frame on light swings** and **Smear frame on heavy swings**.

## v0.21 · Blocked push-back
- A blocked hit really pushes the player back 20 px: the actual position moves, sliding over 120 ms.
- New ⚠ Gameplay sliders: **Blocked: push you back** and **push-back slide time**.

## v0.20 · Blocked hits feel bad
- Armor chips moved to heavy hits only. Blocked hits throw none, so a block no longer looks like progress.
- A blocked hit now:
  - knocks the player back visually and tilts them away
  - jolts their arm
  - turns the burst and sparks dull grey
  - shakes the GUARDED label
  - plays a dull thud and clank instead of the bright ring

## v0.19 · Guard cuts the trail
- On a guarded hit, the sword trail stops at the shield, with a white cut edge.
- Sliders for on/off and the cut position.

## v0.18 · Bigger zoom range
- Zoom punch maximum raised to 60% (was 20%), and zoom duration to 3000 ms (was 1000 ms).

## v0.17 · Defender guards through windup
- Defender loop: idle (guarding) → windup (guarding) → swing (guard drops) → 0.7 s cooldown (open) → idle.
- A parry also opens him up. Heavy attacks always go through his guard.

## v0.16 · Defender starts guarded
- The Defender holds his guard for the full guard time before his first swing.
- His shield sits higher while guarding.

## v0.15 · Defender guard fixed
- Fixed two bugs that had existed since v0.4:
  - He only guarded while idle, which was almost never.
  - He started his next windup the instant his cooldown ended, so there was no guard phase.
- Added a guard phase between swings (1.5 s) and the opening after his swing (0.7 s).
- His shield lowers while he's open.

## v0.14 · Defender guard restored
- Undid v0.13's removal of the Defender's guard. The player has no guard, only parry and dodge.

## v0.13 · Parry & dodge
- **Parry:**
  - stance pose with a cyan window shimmer
  - clash star at the weapon meeting point
  - slow-motion and a short impact frame
  - riposte flick of the sword
  - metallic ring tail on the sound
  - stagger stars over the parried enemy
- **Dodge:**
  - slide that is visual only (110 ms)
  - lean into the move
  - afterimages, dust and a sweeping whoosh
  - dodge success: "DODGE" label, ring, chime, buzz and slow-motion when an attack lands where you just were
- Enemy attacks now show a swing arc, or an arrow streak for the Archer.
- Includes the v0.12 work, which was never published separately:
  - armor chips and sword bounce
  - heavy windup hold and glint
  - squash and stretch
  - dust and scuff marks
  - zoom punch
  - a stronger guarded hit

## v0.11 · Battle exit & map defeat
- The player's swing finishes, then settles for 0.25 s, before returning to the map. Before, the pose froze mid-swing.
- On the map, a defeated enemy's piece blinks white, swells and bursts into a ring and sparks, with "Defeated".

## v0.10 · Kill slow-mo
- Kill slow-motion: ×0.3 for 0.7 s, easing back to normal.
- Impact frames are kill-only by default.
- Victim shiver is off by default; the user may want it later for an earthquake-style attack.

## v0.9 · Softer impact frame
- The impact frame is blended over the scene (strength and contrast sliders) and fades out.

## v0.8 · Isolate effects
- Solo or mute any effect layer. Quick buttons. Slow-mo (O) at ×0.5, ×0.25 or ×0.1. None of this is saved.

## v0.7 · Build notes panel
- Changelog panel on the left side of the screen.

## v0.6 · Juice pass
- victim shiver
- alternating light swings
- smear frame
- impact frame
- HP damage chunk
- phone vibration
- The user's first tuning export became the defaults.
- Save now stores every value.

## v0.5 · Tuning panel
- Tuning panel (T): about 110 feel variables with live sliders.
- Save as default, Revert, Factory reset, Export/Import JSON, Bake into HTML.
- A/B against v0.4 (B).
- No damage button (N).
- Master limiter.
- Gameplay values exposed under ⚠.

## v0.4 · Hit feedback (baseline from the original handoff)
- hitstop
- directional shake
- victim recoil and tilt
- contact bursts, sparks and rings
- tapered trails
- damage number pops
- hurt vignette
- defeat fall
- synthesized audio
