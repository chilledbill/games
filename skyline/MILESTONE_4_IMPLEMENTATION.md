# Skyline — Milestone 4 implementation brief

Prepared 2026-11-17 for the next AI agent. **This is a plan, not implemented functionality.** Read `HANDOFF.md` for the existing game, architecture, user decisions and validation. Current game has Milestones 0–3, rival combo parity, Block and recovery-roll fixes; its latest baseline is 51 passing source tests.

## Objective

Add Rising Phoenix (ground/air special), cooldown, Focus, a held-Skill finisher, style ranks and saved control settings. Keep the existing mobile combat playable and readable. Continue delivering **one self-contained `Skyline-Play.html`**, without hosting, installation or runtime network requests.

Do not replace the engine, add a framework, remove Block, delay immediate Attack/Dodge, or weaken the enemy escape fix. Keep existing two-character sprites and the on-screen performed-action checklist.

## 1. Resolve the Skill input before finalizing the playable controls

Current buttons: Attack / Jump / Dodge / Block. The original GDD's Skill slot is now Block because the user explicitly requested defense against attack spam. **No new Skill mapping has been approved.** Do not silently replace Block or present a proposed mapping as an existing user decision.

Present a concrete control proposal to the user before exposing a final mapping. Recommended proposal to discuss:

- Keep the four buttons and add **Down + Block press → Skill**, using the left thumb's direction and right thumb's Block button.
- Ordinary Block press still starts held guard; ordinary Dodge still rolls immediately.
- Sample the modifier on the initial Block press. Moving Down while already holding Block must not unexpectedly cast Skill.
- Once a press was routed to Skill, continuing that same physical hold sustains Skill-held state for finisher eligibility. Releasing it ends that state. Never also enable guard from that press.
- If Skill is unavailable, the modified press gives cooldown/rejection feedback; it must not fall back to Block or Dodge.
- Keyboard proposal: a dedicated debug key such as I for Skill, with key-up ending the hold. Keep L for Block.

Alternative for explicit user approval: a fifth, clearly labeled Skill button, with spacing verified on small phones. This is easier to discover but changes the original four-button constraint. Do not require simultaneous Attack + Dodge or a third finger. Do not make Skill depend on a long press that delays its start.

This input choice need not block work on move data, resources, event handling and automated tests through logical `SkillPressed` / `SkillReleased` events. Complete that independent implementation and prepare the control proposal for review. Update Help, labels and the handoff once the user chooses.

## 2. Scope and implementation sequence

Implement in this order, with a runnable/tested build after each pass:

1. Shared skill state and Rising Phoenix ground/air moves, cooldown and legal cancels; player and rival use the same definitions.
2. A successful-combat event pipeline and Focus earning, without finisher spending yet.
3. Finisher branch with atomic, validated spending and interruption handling.
4. Style score/rank, repetition reduction, damage penalties and idle decay.
5. Saved control/accessibility settings and final phone tuning.

Only implement one equipped skill initially. ArcWave, ChainBind and MeteorBreak are optional later work, not part of the first pass. No progression, skill tree, multiplayer, store or new enemy roster.

## 3. Data and architecture

Use stable IDs, for example:

- Skill definition: `RisingPhoenix`.
- Ground move: `G_RisingPhoenix`.
- Air move: `A_RisingPhoenix`.
- Finisher: `F_PhoenixBreak`.

Treat these names and the numerical proposals below as implementation choices, not values already present in the code. Preserve the existing `MOVES` schema or extend it with explicit fields rather than matching localized display strings.

Suggested modules:

| File | Responsibility |
|---|---|
| `src/skills.js` | Skill definitions, cooldown readiness, allowed variants and execution validation for both actors. |
| `src/combat-events.js` | Structured successful-combat events, unique execution IDs and bounded deduplication. |
| `src/resources.js` | Focus clamp/gains/spend and repetition history. No DOM access. |
| `src/style.js` | Independent style score/rank, variety, repetition, decay and damage penalties. |
| `src/settings.js` | Versioned localStorage settings, validation, fallback defaults and reset. |

Extend existing files where appropriate:

- `moves.js`: phase data, skill/finisher hitboxes, stagger/juggle costs and explicit cancel/branch markers.
- `game.js`: logical Skill press/release state, contextual variant selection, legal transitions, hit confirmation and finisher execution.
- `enemy.js`: delayed, bounded AI skill/finisher choices using the same eligibility and cooldown rules.
- `input.js`: physical events only. Contextual Block/Skill routing belongs to the resolver; retain the route for the lifetime of a physical press so releases are unambiguous.
- `sprites.js`, `render.js`: reusable Spell/Spell2 sheets, skill/counterpart telegraphs, distinctive effects and readable meters.
- `main.js`, `index.html`, `style.css`: cooldown, Focus/style HUD, Help and settings controls.
- `checklist.js`: completed ground skill, air skill and finisher; execution checks must not be confused with successful-hit checks.
- `tools/package-offline.py`: include new modules in dependency order and embed any additional sheets for **both characters**.

Current player and rival hit/reaction implementations are separate. Resource logic should use shared validated events so the two paths do not drift. Avoid rewriting the entire actor system just to add resources, but extract small common validators where useful.

## 4. Rising Phoenix

### Required behavior

- Skill begins immediately on a legal press, independent of Focus and hold duration.
- Choose ground/air variant from locomotion at actual execution time, including a buffered execution.
- Base cooldown is **7 seconds**, shared between the two variants for each actor.
- Start cooldown exactly once when the skill actually begins. A whiff or interruption after beginning still spends that cooldown. Rejected/expired input does not.
- Use simulation time. Pause/hitstop must follow the same time policy as existing combat; do not mix wall-clock and simulation timers.
- A held button must not recast automatically when cooldown ends. A fresh press is required.
- While cooling down, show remaining seconds or a clear readiness state; never execute an unrelated fallback action.

### Proposed first-pass move values

These are tuning suggestions to make the first build concrete; test and adjust them.

| Property | Ground | Air |
|---|---|---|
| Startup / active / recovery | 0.12 / 0.10 / 0.30 s | 0.10 / 0.10 / 0.30 s |
| Health damage | 18 | 16 |
| Stagger damage | 30 | 25 |
| Juggle cost on a qualifying hit | 25 | 25 |
| Reaction | Full upward launch if permitted | Modest relaunch if permitted |
| Player movement on confirmed launch | Upward pursuit/lift | Bounded upward lift |

Use one hit per target per execution for the initial skill. Multi-hit visuals do not imply multiple damage/resource events. Hitboxes and movement remain independent of animation. Spell sheets can be mapped to phases, with feet/origin and source-cell widths preserved.

Armor and heavy reactions must still apply. A hit on armor can deal damage/stagger without launching. ForcedFall/zero juggle budget must never be reset or bypassed by Skill. Only register a chase target when a confirmed hit actually produces full launch. No teleporting through walls or locking a dead/landed target.

### Cancel permissions

Data-driven, confirmed-hit skill cancels from ground Light1–3 and air Light1–2, with explicit timeline windows. Initial suggestion: allow from their existing legal on-hit cancel start through recovery end. Normal idle Skill is allowed when grounded/airborne and not forced into hit reaction, knockdown, death or guard break.

Ground finisher, Charged Cleave and Plunge keep their existing commitment. Do not allow Skill to escape every forced or heavy state. Guard must end before a legal offensive execution; an unavailable Skill must not accidentally leave guard held or spend cooldown.

## 5. Focus earning

Focus is a separate 0–100 resource per fighter. The HUD primarily displays the player's Focus. Keep resources independent of health, stagger, guard and style.

Suggested gains from the original GDD:

| Confirmed event | Base Focus |
|---|---:|
| Normal successful unique damaging hit | +4 |
| Full ground launch | +8 |
| Aerial relaunch | +6 |
| Perfect Dodge from actual strike overlap | +12 |
| Successful Enemy Step | +8 |

Recommended first-pass special gain: +6 for the single legal Skill hit. Finisher hits earn zero Focus so a finisher cannot refund itself. Keep this tuning in data.

Apply only one matching reward category per hit: a launcher should not receive basic +4 as well as launch +8. A launcher resisted by armor gets at most the ordinary legal-damage reward, not full-launch credit. A guard-breaking hit that actually deals damage can earn normal credit; merely touching a guarded target cannot.

No Focus from whiffs, blocked/dodged/invulnerable hits, damage to a corpse, guarded overlap repeats, rejected Step, duplicate active-window overlaps or repeated updates during hitstop. Perfect Dodge must be tied to an actual enemy swing ID; a dodge timer alone grants nothing.

Each execution needs a unique serial and per-target hit identity. Do not rely solely on move ID, because two legitimate uses of the same move must remain distinguishable. Keep deduplication bounded and clear round-specific history on Reset.

Suggested anti-farming rule, explicitly proposed: consecutive uses of the same reward move get multipliers 1, 0.5, 0.25, then 0 until another eligible move is used or a combat episode ends. Passive practice can retain capped Focus for testing; style practice behavior must not allow an unlimited prestige score. No points from stance/checklist updates.

Reset and opponent changes clear Focus, cooldowns, pending holds, execution state and deduplication. Provide any resource-fill shortcut only behind Debug, visibly marked as a test control.

## 6. Held-Skill finisher

### Exact eligibility

At a data-defined branch marker during the current Skill execution, check all of the following:

1. Actor is alive and the Skill execution has not been interrupted.
2. The same Skill press is still held; a later unrelated press is not equivalent.
3. Focus is full at the marker.
4. This Skill execution has a confirmed legal damaging hit.
5. Its target is still alive, eligible and in range; collision constraints still hold.
6. Finisher has not already been consumed for this execution and the current state permits the transition.

Suggested branch marker: 0.24 seconds after Skill start for both initial variants, after their active hit window. It is a data marker, not a render-frame condition. Check when simulation crosses the marker, including after hitstop. A release before crossing it cancels the hold request. A release after the finisher has actually started does not refund or abort the committed attack.

### Atomic transition

Validate everything first. Then, as one transition, mark the branch consumed, spend exactly 100 Focus, clear the Skill-held request and start `F_PhoenixBreak`. If any validation fails, spend nothing and continue normal Skill recovery. Cooldown belongs to the original Skill and is not charged/reset a second time for the finisher.

Do not spend Focus on button press, reserve it before hit confirmation, or spend on failed/dead-target transitions. If Skill itself raises Focus to full before the marker, that is eligible. If the Skill kills its only target, keep the Focus and reject the follow-up.

### Initial finisher behavior

Use one distinctive, committed heavy strike rather than a cinematic subsystem. Proposed damage 35, stagger 60, recovery 0.45 s, one target hit, no Focus refund, no normal cancel. A downward ending can use a spike reaction with a 15-point qualifying juggle cost. ForcedFall and bounce limits still apply. A finisher must not reset a victim's sequence or introduce an infinite relaunch.

Use Spell2/reused attack poses and a distinct effect/label if no dedicated animation exists. Prevent surprise extra damage from a visual multi-hit flourish. Do not add global invulnerability or freeze enemy AI unless explicitly designed, tested and explained.

## 7. Rival parity

The user requested an enemy as capable as the player. Keep the same ground/air Skill variants, per-actor cooldowns, costs, hit registry and reaction gates for WarriorWoman.

- Add bounded Skill choices to existing routes, respecting the current reaction delay and opening telegraph.
- Rival cannot cast on cooldown, through hit reaction, during a recovery escape roll, or by resetting its cooldown when a route changes.
- Rival Skill hits earn resources through the same successful-combat pipeline.
- If enabling rival finishers in this pass, use the same Focus/confirmed-hit/held-intent marker validation. Represent deliberate AI hold intent for one execution rather than granting an automatic finisher on every Skill.
- Rival finisher needs a readable warning and real recovery opportunity.
- Keep player and rival resources, victim juggle controllers, cooldowns and checklist ownership separate.
- Do not sacrifice the newly fixed retreat roll to add another offensive route. Block must remain a meaningful response; stronger offense must still obey guard and guard-break rules.

## 8. Style ranks

Style is performance feedback, **not currency**. Rank order: D, C, B, A, S, SS. Focus spending must not reduce style; style score must not pay for a finisher.

Suggested starting score model (new tuning proposal):

- Legal damaging hit: +10; full launch +15; successful Step +15; Perfect Dodge +25; finisher hit +30. Use category bonuses deliberately, not accidental duplicated subscriptions.
- Different move from the previous two successful moves: +5 variety bonus.
- Repetition multipliers: 1, 0.5, 0.25, then 0 for consecutive identical moves.
- Taking actual health damage: −40, clamped at zero. Blocking/normal dodge do not incur this penalty.
- After 2 seconds without a qualifying event, decay 10 points per simulation second.
- Proposed thresholds: D 0, C 50, B 120, A 220, S 350, SS 500.

Keep all values configurable; test rank transitions and decay with deterministic time. Passive practice can show a clearly marked **practice rank** but must not produce persistent competitive records. No persistent leaderboard is in scope. Reset/opponent changes clear score and repetition history.

The HUD should show one rank and a compact indication of progress, not a large new dashboard. Announce rank changes and a finisher clearly. Do not obscure the fighter, threat zones, health/guard or controls on a phone.

## 9. Saved settings

Persist presentation preferences, not combat state. Minimum useful settings: control scale, control opacity, reduced effects/shake, and a reset-to-default action. If move/resize is included, place it in a separate paused editing mode so normal fighting never drags a button.

Use a versioned localStorage key such as `skyline.settings.v1`. Validate numbers, clamp safe ranges, ignore unknown keys and handle malformed JSON/storage denial without preventing play. Downloaded HTML/mobile browsers can have restricted or nonpersistent storage. Defaults must always work without storage permission.

Clamp controls to the visible safe area after reload, orientation change and viewport resize. Saved positions should use normalized coordinates, not device-specific screen pixels. Maintain reachable, non-overlapping touch zones and readable labels down to a 320px-wide phone. Essential moves must remain two-thumb actions. Avoid settings that allow invisible or unreachable essential controls.

Do not persist HP, enemy state, Focus, timers, active holds, current action, combo history or the checklist by accident. Round Reset resets combat, not saved settings; Reset Settings changes preferences, not hidden combat resources.

## 10. Tests and acceptance criteria

Keep all 51 existing tests passing unless a deliberately changed rule is documented and its test updated for that reason. Add tests for behavior, not just field existence.

### Skill and cooldown

- Legal press starts immediately at zero/full Focus; ordinary taps do not wait for a hold threshold.
- Correct ground/air variant at actual execution; one cooldown shared across variants, independent between fighters.
- Whiff/interruption after start spends cooldown; rejection before start does not.
- Holding/repeated presses cannot bypass cooldown or trigger unrelated actions.
- Skill cancel requires the configured state/window and actual hit confirmation.
- Armor, heavy, guard and ForcedFall rules remain intact.

### Events, Focus and finisher

- One resource reward per legal hit identity; no reward for block/dodge/invulnerability/death/duplicates.
- Clamping, repetition reduction, category exclusivity, Step and Perfect Dodge gains.
- Finisher requires the same held execution, legal marker, full Focus and living eligible target.
- Whiff, early release, interruption, target death/landing/out-of-range, guard break or insufficient Focus spends nothing.
- Crossing the marker at different simulation/render cadences triggers at most once.
- Successful transition spends exactly 100 and finisher hits cannot refund it.
- Player/rival events never affect the other actor's Focus or cooldown.

### Style and settings

- Variety beats repeated spam; damage penalty and idle decay update deterministically.
- Ranks use thresholds correctly; style and Focus remain independent.
- Invalid/blocked storage falls back safely; saved controls survive reload and stay in bounds after rotation.
- No sticky Skill/Block hold after Help, blur, visibility change, reset or pointer cancellation.

### Browser/manual acceptance

- Two thumbs can perform a basic combo, Skill and held-Skill finisher using the approved mapping.
- Existing ground/air routes, real recovery roll, Block, charge and counter still work.
- Correct button routing: failed Skill never unexpectedly guards/rolls; normal Block remains reliable.
- Skill shows READY/cooldown; Focus shows full state; finisher and style changes are recognizable without Debug.
- New performed actions check off on screen exactly when actually executed.
- Both sprite sets render; no network requests, page errors or missing images in the generated standalone.
- Check small portrait and landscape views, including 320×568, 390×844 and 844×390.
- Real-device performance/reach is reported separately from headless emulation.

## 11. Release and next-agent work order

Before editing, read `HANDOFF.md`, `src/game.js`, `src/enemy.js`, `src/guard.js`, the original GDD and the packager. Briefly list intended file changes. Establish the current test baseline.

After implementing each coherent pass:

```sh
npm test
npm run check
python3 tools/package-offline.py
```

Add new modules to syntax/test coverage; the existing check script only names some modules. Run relevant optional Playwright browser checks as documented in `HANDOFF.md`; add a Skill/Focus/finisher check using real press/hold/release events. Inspect generated HTML behavior, not only the development modules. Do not make Playwright a runtime game dependency.

Update README, HANDOFF, Help, checklist and validation notes with actual behavior and approved input mapping. Deliver the regenerated **`Skyline-Play.html`** plus source. If asked for an archive, include the new brief and handoff. Do not claim a GitHub push: the project is currently local; the prior GitHub credential attempt failed with 401 and access must be re-established before repository publishing.

Report implemented behavior, test evidence, remaining device validation and any deliberate scope deferrals. Do not claim Milestone 4 complete while Skill input, finisher spending, rival legality or offline packaging remains unresolved.

### Copyable prompt

> Read HANDOFF.md and MILESTONE_4_IMPLEMENTATION.md. Implement Milestone 4 incrementally: Rising Phoenix ground/air skill with shared per-actor cooldown, validated combat events and Focus, held-Skill finisher, style ranks and saved settings. Preserve the standalone no-hosting HTML game, immediate Attack/Dodge, Block, rival combos/recovery roll, both characters' sprites and action checklist. The Skill mapping is not approved: prepare a concrete two-thumb proposal and preserve existing controls while implementing independent logic/tests. Use shared move/reaction rules for player and rival. Add meaningful tests, regenerate Skyline-Play.html, and report verified behavior and physical-device gaps. Do not add optional skills or publish/deploy anything without a request.
