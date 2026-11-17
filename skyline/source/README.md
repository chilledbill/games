# Skyline — Browser Combat Lab (Milestones 0–3)

For continuation by another agent, read [HANDOFF.md](HANDOFF.md) first. The next implementation plan is [MILESTONE_4_IMPLEMENTATION.md](MILESTONE_4_IMPLEMENTATION.md).

## Play without hosting

Open `Skyline-Play.html` in a browser. All code, styles and player sprites are embedded; no installation, hosting or internet needed. Some phone file preview apps disable JavaScript; use a browser that supports downloaded HTML. Full screen is optional and browser-dependent.

The game starts against a light swordfighter. **Help → Opponent** selects light, armored, heavy or passive practice dummy. Selection starts a fresh round; Reset restarts the current opponent. Both clear checklist progress. Defeat/victory waits for Reset.

## Phone controls

Four buttons: Attack, Jump, Dodge and Block. Block uses the former unused Skill slot for this prototype; Dodge remains immediate.

- Direction pad: move; slide between directions without lifting.
- Attack: immediate slash; four-hit ground chain or three-hit air chain.
- Up + Attack: launcher or aerial relaunch. Down + Attack: sweep or committed aerial plunge.
- Hold Attack at least 320 ms and release: Charged Cleave when legally cancelable. Initial slash starts on press.
- Jump after confirmed launcher: Air Chase. Jump after an air hit while near the target: Enemy Step, once per juggle sequence, restoring air dash/double jump and 20 juggle points.
- Dodge: ground dodge or one air dash per airborne sequence. Attack 80–280 ms into dodge for a dash strike.
- Watch the amber attack zone; it becomes red during the strike. Dodge provides 160 ms invulnerability. An actual enemy strike overlapping you in the first 100 ms grants Perfect Dodge, then a 300 ms counter window. Ground Attack becomes Dodge Counter in that window. No overlap means no perfect-dodge reward.
- Heavy attack commitments cannot be freely dodge-canceled. Landing resets air dash; Enemy Step can restore it once.
- Keyboard: A/D movement, W/S up/down, J Attack, Space Jump, K Dodge, hold L Block. Release J for charge.

Help pauses combat and contains debug/hitbox toggles. The collapsible, scrollable 24-action checklist marks successful action execution; hits are optional. Blocked inputs do not count. Brief banners name actions. Player health, enemy health and stagger/armor are always visible.

## Enemy combat

Light: 100 HP, the same as the player; approaches and performs confirmed combo routes. Legal hits interrupt it. Armored: 180 HP, armor blocks launch until 100 stagger. Charged Cleave gives 50 stagger; launcher 25; counter 60; normal moves 12. Break opens a 2.2-second punish window; armor returns after grounded recovery once the break expires. Heavy: 260 HP, takes stagger and enters a punish state on break, but cannot be launched. Only one opponent is active at a time. Passive practice dummy retains high health and recovery reset.

The rival uses the same MOVES definitions for startup, active, recovery, hitboxes, damage and legal combo branches. Combo openings have an additional 300 ms tell; followups use the shared move timings. Routes end on whiff or interruption and leave an 800 ms recovery gap. Ground hits impose 320 ms hit reaction; launches and air hits use bounded juggle reactions. Each swing can damage or trigger a dodge only once. Player health is 100. Normal enemies do not regenerate; death cancels target-dependent chase and attacks. WarriorMan is the player and WarriorWoman is the enemy. Both use the supplied idle/run/jump/attack/dodge/hit/death sheets. The passive practice dummy remains a placeholder.

Long-combo damage scales toward a 40% floor, with bounded shortening hitstun. Juggle budget starts at 120; launcher/relaunch costs 18, air hits 8, spike 15. Zero forces fall and locks suspension/relaunch/restoration until grounded recovery. One ground bounce, one wall bounce and one Enemy Step restoration per sequence.

Beginner route: A → A → Up+A → Jump/chase → air A → air A → air A.

Eight-hit routes tested in practice: two ground hits → launch/chase → two air hits → relaunch → recover → two air hits; or two ground hits → launch/chase → two air hits → Enemy Step → two air hits → plunge.

## Files and architecture

The original workspace had no engine or source; native JavaScript ES modules and Canvas 2D were chosen explicitly. Fixed 120 Hz simulation, +Y up, standing height 48. Simulation time pauses during hitstop, preserving buffered inputs. Rendering and collision are independent of sprite dimensions.

- `src/game.js`: input resolver, action/locomotion/reaction states, cancel validation, hit registry, damage and chase.
- `src/enemy.js`: enemy profiles, AI attack timeline, strike collision, player damage and dodge/perfect-dodge checks.
- `src/moves.js`: move definitions, phase/cancel windows, stagger damage and juggle costs; now includes G_Counter.
- `src/juggle.js`: sequence budget and limits.
- `src/input.js`, `src/buffer.js`: multi-pointer touch/keyboard adapters and timestamped command queue.
- `src/sprites.js`, `src/render.js`: sprite presentation, warning zones, health reaction and dodge cues.
- `src/main.js`, `index.html`, `style.css`: opponent settings, vitals, mobile layout and lifecycle.
- `src/checklist.js`: performed-move checklist, including Perfect Dodge and Dodge Counter.
- `assets/Characters PackV2/`: all 54 original PNG sheets and manifest. WarriorMan uses 64×64 cells, WarriorWoman 80×64. Twelve sheets per character (24 total) are embedded in the game. WarriorWoman uses 80-pixel source cells, WarriorMan 64-pixel cells, without stretching either character. Several advanced moves reuse available animation poses.
- `tools/package-offline.py`: rebuild standalone with `python3 tools/package-offline.py` after source edits.

## Validation and development

`npm test`: **51 tests pass**, covering original combos, buffers, hit registry, juggle limits, air mobility, checklist, animation frame bounds, AI damage/hitstun, overlap-based perfect dodge, normal/expired invulnerability, counter expiry, armored/heavy reactions, death/reset and damage scaling.

`npm run check`: syntax checks pass. No compilation step needed. `npm start` optionally serves development modules at localhost:8000 (Python 3 required); standalone play does not need this.

Optional browser checks with existing Playwright and `/usr/bin/chromium`:

- `PLAYWRIGHT_MODULE=/path/to/playwright node tests/offline-browser.cjs`: touch dodge/dash strike, charge release and sweep in passive practice.
- `PLAYWRIGHT_MODULE=/path/to/playwright node tests/defense-browser.cjs`: visible player damage, opponent switching, armored-launcher stagger, passive practice and portrait layout.

Both checks pass with no page errors or HTTP requests. HTML was loaded directly into Chromium; managed Chromium blocks file URLs, so OS-specific file-opening behavior was not tested. Screenshots: `artifacts/milestone3-phone.png` and `artifacts/milestone3-portrait.png`.

## Remaining work

Physical-device latency, safe areas, readability and sustained performance remain untested by the agent. Enemy AI chooses from eight authored routes, with simple pursuit/jump behavior rather than general platform navigation. It is a combat opponent using shared moves, not a full copy of the player input controller. WarriorWoman supplies enemy art; dedicated poses for some advanced moves remain reused. No separate boss encounter. Skill/Focus/finisher/style and saved control settings are Milestone 4, the next recommended implementation pass. No new action buttons or enemy roster were added.

## Rival combo update

Enemy AI now uses ground Light1–4, launcher/Air Chase/Air Light1–3, sweep, Charged Cleave, dodge/dash strike, relaunch/plunge, Enemy Step and jump/double jump/air dash routes. It gets one air dash per airborne sequence; Enemy Step restores mobility and budget only once. Real player-strike overlap during enemy dodge grants its perfect-dodge counter, just like the player's overlap requirement. Decisions observe an 180 ms reaction delay; it does not instantly dodge a button press. Enemy combo damage and player victim juggle budget are tracked separately from player combos/checklist. Budget exhaustion forces the player down, then grounded recovery resets it. Both fighters collide with arena bounds. Heavy/armored options retain their resistance profiles; passive practice remains available.

Shared attack data comes from `src/moves.js`; `src/enemy.js` owns AI choices/turns, `src/game.js` integrates player victim reactions and enemy interruption, `src/sprites.js` draws both characters, and `src/render.js` shows current enemy move warnings. The packager embeds both characters' selected sheets. Enemy action IDs and combo count appear in the debug HUD and landscape opponent status. The checklist remains player-only.

New `tests/rival.test.js` verifies ground/air hits, whiff termination, extended routes, enemy dodge counter, limited air dash, interrupted pursuit, forced fall and long-running bounds. `tests/rival-browser.cjs` confirms both sprite widths really render, rival damage, phone layouts and no external network access. Run with the same optional Playwright setup as the other browser tests. Screenshots: `artifacts/rival-landscape.png` and `artifacts/rival-portrait.png`. Source tests, syntax checks and three standalone browser checks pass. No physical-device play session was performed by the agent. Reopen the regenerated `Skyline-Play.html`; no hosting or installation is needed.

## Guard and escape update

**Hold B / Block** to guard the front while grounded. It does not interrupt committed attacks or hit reactions. Release to stop guarding; focus loss, Help and Reset clear held input. Guard has 100 points: light hits drain 18, ground finisher 30, counter 35 and Charged Cleave 48. Successful blocks take no health damage and give the attacker no hit-confirmed cancel. At zero guard, guard breaks for 800 ms and the strike deals damage. Guard regenerates at 24/s after 800 ms without impact while released. Attacks from behind and airborne attacks against an airborne defender bypass guard. Guard stance and successful block have separate checklist entries. The selected Block sprite sheets are embedded for both characters.

Enemy ground-hit stun now has a sustained-pressure deadline. After three grounded hits and expired hitstun, or after knockdown recovery, the AI can take a recovery roll before player hit detection, preventing same-tick re-stuns. Escape rolls retreat, respect bounds and a 1.5-second escape cooldown, and use visible rotating sprites/cyan ring. They do not cancel immediately into a perfect-dodge counter. No escape is allowed during an ongoing launch or juggle: legitimate air combos remain valid. Neutral AI also guards against sustained pressure. Practice dummy remains passive.

Changed `src/guard.js`, input adapter, Game hit/recovery ordering, AI defense, sprite/block presentation, guard meter/button, checklist, packager and tests. `tests/guard.test.js` checks real blocks, directional/ground requirements, meter break/regen, blocked cancel permissions, heavy commitment, spam escape and roll persistence. `tests/guard-browser.cjs` verifies holding/releasing the actual Block control, blocked attack/checklist/meter, visible enemy roll under repeated attacks, and phone layouts. All 51 source tests, syntax checks, existing touch browser check and new guard browser check pass. Physical-phone tuning remains outstanding. Regenerated `Skyline-Play.html` is still the no-hosting launch file. Next: playtest guard/pressure balance, then resume Skill/Focus planning with the four-button layout.
