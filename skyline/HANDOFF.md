# Skyline Combat Lab — AI agent handoff

Snapshot: 2026-11-17. Project root: `/workspace`. This document describes the current implementation, including changes requested after the original spec. Read this before continuing; use source code to resolve numerical details that change later.

## 1. What this game is

A touch-first, single-player, side-view 2D sword-combat prototype. WarriorMan is the player; WarriorWoman is a capable AI rival using the same move database. It is a bounded training/sparring room with combos, launch/chase, air juggling, defensive mechanics and selectable opponent profiles. Both portrait and landscape layouts exist; landscape is the original design target.

The deliverable is **`Skyline-Play.html`: one self-contained browser game with embedded graphics**. The user explicitly rejected hosting and server setup as a requirement for playing. They later confirmed the standalone game works on their phone. Preserve that delivery model. Development may use a local server, but do not replace the playable file with server instructions or deploy a site without a new request.

No Unity/Godot/Unreal project exists. The workspace originally had no source or engine. This implementation uses native JavaScript ES modules, Canvas 2D, HTML and CSS, with no runtime packages or bundler.

## 2. User direction and important history

The project began from a combat GDD and attached AGENTS instructions; Milestones 0–3 have since been implemented, with additional user-requested changes. Current user preferences take precedence over the original document where they differ.

- Keep phone play easy, with reachable controls and no mandatory third finger.
- Keep the game directly playable as one HTML file, without hosting/install steps.
- Make actions readable. The user found Enemy Step hard to distinguish from normal jumps.
- Keep an on-screen checklist marking each action performed at least once. Current checklist has 24 entries and is player-only.
- Import the supplied sprites; the rival should use the other character.
- The rival should be capable of combos, launch/chase, aerial extensions and defensive movement, rather than merely repeating one strike.
- Most recent gameplay feedback: the computer did not visibly roll away and attack spam was too effective. The latest pass added actual recovery-roll priority and blocking.
- Current four buttons are **Attack / Jump / Dodge / Block**. Block occupies the formerly unused Skill slot. Do not quietly revert it to Skill or delay Dodge activation. If adding Skill later, explicitly resolve the input/layout conflict with the user.

Historical references, if attachments still exist:

- GDD: `.codex-attachments/9dcfda6d-69b2-4e37-b025-d525b9a733e2/947ae79b-ab3f-43ed-a11c-15c58bee7ade/Mobile_2D_Combo_Combat_Spec-2.txt`
- Attached agent instructions: `.codex-attachments/9dcfda6d-69b2-4e37-b025-d525b9a733e2/9d425c14-216c-48a5-8136-9588dcb29438/AGENTS_3_-1.md`
- Sprite archive: `.codex-attachments/7623e0dc-6667-4969-92b9-35fb9b18a34e/adb816e3-a594-4c18-8df9-18b6d0454b4a/Characters PackV2.rar`

The original instructions emphasize data-driven moves, buffered input, separate UI/combat/presentation, tests, debug views and placeholder-first development. They initially limited work to Milestones 0–1; the user subsequently authorized the later milestones and rival/guard changes.

## 3. Launch, edit and deliver

For the user: open `Skyline-Play.html` in a browser capable of executing downloaded HTML. Some mobile file preview apps do not execute JavaScript. Avoid assuming an arbitrary workspace link is a public download; earlier links caused confusion. Do not claim a phone file-opening workflow was tested when only desktop Chromium was used.

For development:

```sh
cd /workspace
npm test
npm run check
python3 tools/package-offline.py
```

Optional development server: `npm start` serves modules on port 8000 using Python 3. It is not necessary for the standalone deliverable. Node 24 and Python 3.12 were available during development; there is no npm install requirement for core tests or gameplay.

**Edit source files, not just the generated HTML. Regenerate `Skyline-Play.html` after every gameplay/UI/asset change.** The packager:

1. Inlines `style.css` and strips the external font import.
2. Embeds 13 selected PNG sheets per character (26 total) as base64 data URLs.
3. Concatenates modules into an IIFE using an explicit dependency order.
4. Removes single-line imports/exports and replaces `import.meta.url` for classic-script parsing.
5. Adds a launch-status fallback for viewers that do not execute JavaScript.

This is intentionally a minimal packager, not a general JavaScript compiler. Multiline imports, export aliases, duplicate top-level names, added modules, dynamic imports or different HTML entry markup may break it. Update and test the packager when changing these conventions. New sprite sheet names must be added to its embed list as well as the sprite module. Missing embedding can cause file-relative requests and break offline play.

## 4. Current controls and game flow

| Logical action | Phone | Keyboard | Behavior |
|---|---|---|---|
| Move/modifiers | Slideable directional pad | A/D, W/S | Last horizontal press wins; up/down together cancel the modifier |
| Attack | A | J | Starts immediately on press; no hold-recognition delay |
| Jump | Arrow button | Space | Jump, double jump, Air Chase or Enemy Step according to state |
| Dodge | D | K | Immediate ground dodge or one air dash per airborne sequence |
| Block | Hold B | Hold L | Grounded frontal guard while free to act; release to stop |

Notation in this document uses logical actions: `Attack` is **not** keyboard A. The original GDD's `J` means the Jump action, whereas keyboard J attacks.

- Ground Attack chain: `G_Light1 → G_Light2 → G_Light3 → G_Light4`.
- Up+Attack: ground launcher or airborne relaunch. Down+Attack: sweep or plunge.
- Holding Attack for at least 320 ms, then releasing, requests Charged Cleave when legal. Initial light still starts on press.
- Attack during 80–280 ms of dodge requests a dash strike.
- Confirmed launcher → Jump performs bounded, collision-aware Air Chase; it consumes double-jump availability.
- Confirmed air hit → nearby Jump performs Enemy Step once per target juggle sequence, restoring air dash/double jump and 20 juggle budget. It is a deliberate combo extension, not a normal jump replacement at arbitrary times.
- Perfect Dodge requires actual strike overlap during the first 100 ms of a dodge. Dodge invulnerability lasts 160 ms. A successful perfect dodge opens a 300 ms grounded Attack counter window.
- Heavy commitments do not freely cancel into defensive actions.
- Help pauses simulation, clears held input and exposes opponent selection/debug/hitboxes. Fullscreen is optional. Reset restarts the current opponent; opponent changes start a new round. Both clear checklist progress.
- Victory/defeat waits for Reset. Checklist checks mean the action actually started, not necessarily that it hit. Guard stance and successful block have separate checks. Progress is not saved across reloads.

Useful routes to preserve:

1. Beginner: Attack → Attack → Up+Attack → Jump/chase → air Attack ×3.
2. Eight-hit relaunch: two ground hits → launcher/chase → two air hits → relaunch → recovery → two air hits.
3. Eight-hit step/plunge: two ground hits → launcher/chase → two air hits → Enemy Step → two air hits → plunge.

Use passive practice to verify these routes without AI interference.

## 5. Mechanics and numerical baseline

### Simulation and collision

Fixed 120 Hz simulation, independent of rendering. Coordinates: +X right, +Y up; standing height 48 world units. World is 960×540, player X clamped to 18–942, rival to 22–938. The raised left ledge is 38 units high and exists to exercise coyote time. Physics is custom, not a general tile-map engine. Rendering follows/crops around combatants to fill narrow views without stretching the characters.

Inputs expire after 150 ms; coyote time is 100 ms; chain continuation is 450 ms. Commands retain direction snapshots. Simulation time stops during hitstop so buffers are not lost during impact pauses. Air attacks/hitstun use reduced gravity to make phone tap timing more forgiving. Help/background processing avoids accumulating a large catch-up interval.

### Damage, reactions and juggling

Player HP 100. Opponents: light 100, armored 180, heavy 260, passive dummy 1000. Practice health restores on recovery; active opponents do not regenerate. Hit registry permits one target hit per swing. Rejected/guarded/dodged strikes do not create a legal hit-confirmed branch.

Armor resists launching until 100 stagger. Stagger damage: normal 12, launcher 25, charge 50, counter 60. Break creates a 2.2-second punish window; armor returns after recovery when the break expires. Heavy opponents remain unlaunchable even after stagger break. Long combos reduce damage toward a 40% floor and shorten bounded hitstun.

Each launched victim has an independent 120-point juggle sequence: launch/relaunch costs 18, normal air hit 8, spike 15. Enemy Step restores 20 once, capped at 120. One ground bounce and one wall bounce per sequence. At zero, force fall; no further suspension, relaunch or budget restoration until grounded recovery. Preserve the distinction between ground contact and completed recovery.

`game.juggle` tracks the rival as the player's victim. `game.victimJuggle` tracks the player as the rival's victim. Mixing these is a serious regression risk.

### Rival AI

`ENEMY_ROUTES` contains eight authored routes, including full ground chain, launch/chase/air chain, sweep, charge, dodge/dash strike, relaunch/plunge, Enemy Step and jump/double-jump/air-dash routes. It shares `MOVES` data and validates hit-confirmed continuations. Missed/interrupted routes end rather than inventing hits. Openers get an extra 300 ms tell; normal route completion gives an 800 ms gap. Reaction observation is delayed 180 ms. The AI is not a second instance of the player controller and is not perfectly symmetric in every locomotion/reaction detail.

Amber/red strike zones and text identify the enemy move. Debug and landscape opponent status expose move IDs and combo count. All rival activity stays out of the player's checklist.

### Latest anti-spam / roll fix — preserve this ordering

Previously every hit refreshed ground stun, and the next player hit could occur before the rival got a recovery decision. Current ground pressure has an 850 ms deadline; after at least three ground hits and expired stun, the rival can escape. Knockdowns also mark an escape pending.

`Game.tick()` calls **`tryEnemyEscape()` after rival recovery processing but BEFORE player active-hit detection**. Moving this callback back behind player hits reintroduces the reported bug.

Escape rolls retreat, respect bounds and a 1.5-second escape cooldown, and have a rotating sprite/cyan ring. They do not occur in an ongoing launch/air juggle. `d.escaping` prevents a same-frame blocked strike from converting the escape immediately into a perfect-dodge counter; this previously made the roll disappear before moving. The roll needs to remain visible and actually create distance. Practice dummy stays passive.

### Guard / Block

`src/guard.js` is shared by both fighters. Guard is directional and grounded; it cannot cancel heavy commitment or hit reaction. No chip damage on successful block. Blocked attacks consume the swing but do not confirm combo cancels. Guard cost: 18 normal, 30 ground finisher, 35 counter, 48 charge. Meter max 100; zero causes an 800 ms break and allows the breaking strike to damage. Regeneration is 24/s after 800 ms without impact while not guarding. Release Block to recover meter. Back attacks bypass guard. Both characters have Block sprite poses; player has a visible guard bar and shield arc.

Neutral AI can guard under observed pressure. Guard points initialize lazily in `tickGuard`; impact handling also defaults an unset meter to 100. Do not bypass the state gates when adding guard controls or AI behavior.

## 6. Source map and state ownership

| File | Responsibility |
|---|---|
| `src/main.js` | Browser bootstrap, fixed-step accumulator, help/pause, opponent selector, canvas sizing, HUD updates. Browser starts in light mode. |
| `src/game.js` | Player command resolver, action timeline, world physics, hit detection/reactions, shared integration, recovery order and checklist recording. `new Game()` defaults to practice for tests. |
| `src/moves.js` | Stable move IDs, startup/active/recovery, hitboxes, next/branch links, cancel flags, damage, stagger and juggle costs; `TUNE`. |
| `src/enemy.js` | Profiles, route decisions, enemy move timeline, player victim damage, chase/step/jump choices, guard and recovery roll. |
| `src/juggle.js` | Budget, forced-fall lock, step/bounce sequence limits. |
| `src/guard.js` | Guard eligibility, impact cost/break and regeneration. |
| `src/input.js` | Keyboard/multi-pointer adapters, pointer capture, sliding directions, press/release and focus cleanup. No combat selection rules. |
| `src/buffer.js` | Action-family replacement, timestamped direction snapshots, expiration/consumption. |
| `src/checklist.js` | 24 display entries and success banner; reads `performed` Set / `lastPerformed`. |
| `src/sprites.js` | Async image loading, move-to-sheet selection, phase-synchronized frame choice, separate 64/80-pixel source slicing. |
| `src/render.js` | Arena, characters, camera transform, telegraphs, guard/dodge cues, effects and debug string. |
| `index.html`, `style.css` | Responsive phone/desktop controls, help, vitals and collapsible checklist. |
| `tools/package-offline.py` | Single-file release generation; runtime does not require Python. |

Key naming traps: `game.dummy` is also the active AI rival; do not assume it is passive. Player action is `game.action`, enemy action is `game.dummy.attack`. Their timeline wrappers differ (enemy has opening tell). Action phases are Startup/Active/Recovery; death/hit reaction/guard use fields and gates rather than a fully generic actor FSM. Player and rival damage paths are separate, so check both when modifying defensive or reaction rules.

## 7. Assets

All 54 original PNG sheets were extracted unchanged to `assets/Characters PackV2/`: 27 each for WarriorMan and WarriorWoman. `manifest.json` records dimensions, frame counts and SHA-256 hashes. **WarriorMan cells: 64×64; WarriorWoman: 80×64.** Both face right; feet anchor at source Y=48. Character scale targets 48-world-unit standing height. Mirror rendering, not collision geometry hacks, for left facing.

Current embedded set per character: Block, Hit, Death, Idle, Run, Jump, Attack1, Attack2, Attack3, JumpAttack1, JumpAttack2, CrouchAttack, Slide. Other sheets remain available in the project. Some moves reuse supplied attacks because there are no dedicated launcher/plunge/Enemy Step sheets. Standing/attack frame alignment and feet anchoring should remain stable.

Archive had no license/author/timing document; no usage terms were invented. See the asset README for provenance. Extraction helper uses the available system libarchive via Python ctypes, rejects path traversal/nonregular entries, and is not a runtime dependency.

## 8. Validation baseline and how to test

**Re-run during this handoff on 2026-11-17:** `npm test` = 51 passing tests; `npm run check` = pass. This handoff pass changes documentation only, not gameplay.

Source tests cover buffered commands, ground/air routes, branches, hit registry, chase invalidation, coyote/buffered jump, cadence, juggle locks, bounces, mobility limits, charge, armor, HP/death, perfect dodge/counter, enemy routes, guard and anti-pressure escape. `npm run check` explicitly checks only the main four JS files; imports exercised by source/browser tests supply additional coverage. Add direct syntax checks if adding otherwise unexecuted modules.

Optional browser scripts require Playwright outside the project and Chromium at `/usr/bin/chromium`:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node tests/offline-browser.cjs
PLAYWRIGHT_MODULE=/path/to/playwright node tests/guard-browser.cjs
```

Those two passed on the latest gameplay pass. Additional scripts: `defense-browser.cjs` and `rival-browser.cjs` were run during their relevant feature passes; `browser-smoke.cjs` is an older server-based check and may contain outdated assumptions. Browser scripts are not included in `npm test`. Do not install Playwright as a gameplay dependency.

Prior environment had Playwright at `/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`. Verify availability rather than assuming the path persists. Browser/server execution required sandbox escalation in this environment. Managed Chromium blocked `file://` navigation, so standalone checks load the HTML text into a page and assert actual interactions and no external HTTP requests. Do not describe that as testing iOS/Android file-opening behavior.

Artifacts include validation notes and screenshots. Latest visual evidence: `artifacts/guard-landscape.png`, `artifacts/guard-portrait.png`; rival screenshots also exist. Latest browser guard test holds/releases the actual button, checks HP/meter/checklist, spams attacks and observes a rendered retreat roll. Tests are evidence of those interactions, not proof of final balance.

No agent-operated physical-phone playtest, iOS test, sustained performance profile, audio test or gamepad test has been performed. The user confirmed an earlier standalone version worked on their phone.

## 9. Remaining work and recommended continuation

**First: verify latest guard/escape behavior with the user.** This is the newest correction and directly addresses their complaint. Check that rolls are frequent enough to notice, attacks cannot trivially lock the rival, blocking is readable/reachable, and guard break creates a fair punish window. Preserve meaningful combos rather than having the AI escape every hit.

Known limitations / audit targets, not all confirmed defects:

- Authored AI routes and simplified movement; no general navigation or separate boss encounter. Player/rival systems duplicate some logic and can diverge. Consider small shared helpers, not an engine rewrite.
- Minimal physics, rectangle collisions, fixed room, no complete platforming level.
- Guard/escape constants and some reaction rules live in functions as well as tuning objects. Balance requires testing both sides and all opponent profiles.
- Escape/guard behavior around the raised ledge and walls deserves device playtesting; existing tests cover bounds and selected cases, not every corner.
- Several action poses are reused. Enemy Step still lacks a unique dedicated kick animation beyond jump/confirmation feedback.
- Checklist, settings and progress reset on reload. Fullscreen support varies by browser.
- Standalone packaging relies on source conventions; test embedded assets and no network access after changes.
- `README.md` contains historical appended sections and some stale asset-count wording. Current source and this handoff's 26 embedded sheets / 24 checklist entries are the baseline.

Original Milestone 4 remains unimplemented: active skills (initially RisingPhoenix), cooldown, Focus earning/spending, held-Skill finisher on confirmed hit, style ranks and persistent control settings. **Block now owns the original Skill slot. Resolve that product/input decision before adding Skill.** The user has not requested implementing Milestone 4 in the current handoff task.

Do not add progression, multiplayer, monetization, extra characters, a hosted service or polished content as speculative scope. Continue incrementally from the user's next request. Keep code changes reviewable, use meaningful combat regression tests, update the checklist for new executable actions, regenerate the standalone file, and report what was tested versus what still needs physical-device validation.

## 10. Suggested first prompt for the next agent

> Read HANDOFF.md and inspect the current source before changing anything. Preserve the single-file offline browser deliverable, four reachable phone buttons, immediate Dodge, imported two-character sprites and action checklist. Verify the latest anti-spam recovery roll and hold-to-Block behavior first. Follow the user's next requested scope; do not assume Skill can replace Block. Run relevant tests and regenerate Skyline-Play.html after source changes. Report actual verification and physical-phone gaps honestly.
