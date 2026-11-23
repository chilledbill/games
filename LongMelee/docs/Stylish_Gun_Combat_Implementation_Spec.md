# STYLISH GUN COMBAT
## Implementation Specification — Godot 4.x

**Status:** Prototype design / engineering handoff  
**Version:** 1.0 — 23 November 2026  
**Primary reference:** Stylish firearm combat in *Devil May Cry* (especially DMC3/DMC5 Dante and DMC4 Special Edition Lady)  
**Assumed build:** PC-first, 2D top-down arena shooter in Godot 4.x, with a clear path to third-person 3D  
**Audience:** Solo developer and AI coding assistant (Codex or similar)

> **Design boundary:** This is an original implementation inspired by DMC's combat principles, not a one-to-one re-creation of its game, assets, animation data, timing, or copyrighted content. Every numerical value in this document is a suggested prototype starting point, **not** a measured or official DMC value. Treat values as exported tuning parameters.

---

# 1. Project Definition

## 1.1 The player fantasy

The player is a highly mobile gunfighter who **controls the shape of a fight**. Gunshots are more than damage: they interrupt, launch, suspend, redirect, separate, and collide enemies. The player makes expressive sequences by chaining these effects into movement and follow-up attacks. A weak pistol may be useful precisely because it keeps an airborne enemy available for a shotgun blast; the shotgun may be useful because it pushes that enemy into another opponent rather than simply dealing more damage.

The benchmark is **player-authored combinations**, not canned cinematics. Every interaction must remain useful if the player improvises, changes targets, cancels a move, or uses it in an unexpected order.

## 1.2 Design pillars

1. **Immediate firearm response.** Low delay between accepted input and clearly readable attack; no unnecessary reload loop in the prototype.
2. **Deliberate enemy manipulation.** Common attacks cause predictable reactions. Launch, sustain, knockback, and collisions remain consistent.
3. **Movement woven into offense.** Shooting, dodging, dash-blasting, recoil, and pursuit have explicit transitions.
4. **Expressive difficulty.** Simple shots are useful, but mastering combo routing, spacing, timing, and target choice produces superior results.
5. **One-versus-many readability.** Enemies pressure the player without making every combo impossible; crowd-control decisions matter.
6. **Data-driven tuning.** Designers can change attacks and hit reactions without rewriting the whole combat controller.

## 1.3 What this prototype is not

- Not a realistic ballistic shooter, cover shooter, or ammunition-economy game.
- Not a DMC asset, moveset, or control-code extraction project.
- Not a fully physics-driven ragdoll sandbox; deterministic reaction trajectories have priority over visual ragdoll realism.
- Not a 20-weapon launch. Two weapons and a good enemy reaction system are the initial scope.
- Not an automatic combo cutscene: the player chooses the next input.

## 1.4 Terminology

| Term | Meaning in this specification |
|---|---|
| **Attack** | A player move with startup, active phase, recovery, hit properties, and legal cancel transitions. |
| **Reaction** | An enemy response: flinch, stagger, launch, sustain, knockback, crumple, etc. |
| **Juggle** | A sequence that keeps a target airborne and susceptible to follow-up. |
| **Sustain** | A hit that slows an airborne target's descent without fully relaunching it. |
| **Soft lock** | Optional remembered target that improves stability without forbidding manual aiming. |
| **Cancel** | Starting a legal subsequent action before the current attack's full animation finishes. |
| **Attack token** | AI permission for a particular enemy to start an active attack in a crowd encounter. |
| **Poise** | Resistance to being staggered or launched, separate from health. |
| **Vertical slice** | A minimum playable arena demonstrating the intended combat loop end-to-end. |

# 2. Definition of Done and Prototype Scope

## 2.1 The smallest valuable test

Build a rectangular arena with one player, two weapon modes (pistols and shotgun), walls, a lightweight dummy, and later two live enemy types. The minimum expressive sequence is:

**Approach → launch enemy → sustain in air with pistol → switch to shotgun → redirect into a wall or another enemy → chase or evade.**

If this sequence does not feel good with simple shapes and debug text, **do not** add another gun, finisher, elaborate style meter, or long animation set yet.

## 2.2 Must-have vertical-slice mechanics

| ID | Deliverable | Visible proof |
|---|---|---|
| VS-01 | Mouse aim, WASD movement, attack input, dash | Character moves, fires precisely, dodges while maintaining aim control. |
| VS-02 | One shared attack/hit pipeline | Different attacks reuse the same damage/reaction delivery logic. |
| VS-03 | Pistol tap, short-range launcher, air sustain | Enemy can be launched and held for a brief combo. |
| VS-04 | Shotgun blast and directional knockback | Hit enemy moves predictably in the intended direction. |
| VS-05 | Weapon switch and cancel rules | Pistol → shotgun follow-up works without animation dead time. |
| VS-06 | One wall bounce and enemy collision rule | A redirected enemy can cause one readable environmental or multi-enemy follow-up. |
| VS-07 | Enemy attack readability | Basic enemy telegraphs attacks; player can interrupt or dodge them. |
| VS-08 | Diagnostic HUD | Current move, target, enemy state, stun, pseudo-height, combo count visible. |

## 2.3 Keep for later

Charged delayed explosives, aerial player attacks, recoil-directed mobility, three or more enemy archetypes, elaborate style scoring, finishers, branching firearm trees, advanced bosses, replay cameras, and 3D conversion are **not** prerequisites for the first evaluation.

# 3. Platform, Coordinates, and Controls

## 3.1 Default presentation

Use Godot 4.x **2D top-down**, 60 FPS design target (render FPS can vary), fixed-step physics, keyboard/mouse first, and simple sprites/circles or capsules for placeholders. Player and enemies exist on a 2D floor plane. A separate scalar `height_px` represents an enemy's airborne elevation; the rendered sprite is offset upward while ground collisions and world position stay independent.

**Unit convention:** all world-distance and velocity defaults below use **pixels**, **pixels/second**, or **pixels/second²**. A working art convention is **64 pixels ≈ one visual meter**, but that is not physically enforced. Do not mix arbitrary “meters” with Godot's pixel movement. Time is seconds.

## 3.2 Suggested PC input map

| Action | Default | Behavior |
|---|---|---|
| Move | W / A / S / D | Eight-direction movement, normalized input. |
| Aim | Mouse cursor | Aim world direction from muzzle/player toward cursor. |
| Primary fire | Left mouse | Weapon normal shot; auto-repeat while held if move permits. |
| Special fire | Right mouse | Pistol charge/hold-release; shotgun directional blast. |
| Launcher | Q | Short-range gun-based launcher, independent of selected gun in first slice. |
| Dash / dodge | Space | Directional evasive movement; can cancel permitted attacks. |
| Weapon selection | 1 / 2 | Direct pistol or shotgun selection. Mouse wheel optional. |
| Manual aim / soft lock toggle | Tab (debug only) | Compare target assist modes during tuning. |
| Debug overlay | F3 | Toggle live combat diagnostics. |
| Reset arena | F5 | Return to a repeatable test setup. |

**Important:** All commands are remappable via Godot Input Map. Do not make hold-to-charge block basic movement. Keep the mouse targeting independent of movement direction. For controller support, use left stick move, right stick aim, triggers for primary/special, face buttons for launcher and dodge, shoulder button for weapon switch; expose a configurable dead zone and aim-assist strength.

## 3.3 Input processing requirements

Capture inputs **each frame**, buffer their intent briefly, and execute them only when the combat state allows it. Movement input should remain active during gunfire except when an explicit heavy attack locks or modifies movement. A failed input during a non-cancelable window should not disappear immediately if its input buffer remains valid.

**Starting values:** input buffer 0.10 s; dash direction defaults to the current movement vector, or away from the aimed direction only if no move input exists; allow an explicit neutral-dash fallback. Do not allow accidental double execution from one buffered press.

# 4. Technical Architecture and Ownership

## 4.1 Recommended folder structure

```text
res://
  scenes/
    Arena.tscn
    Player.tscn
    EnemyLight.tscn
    EnemyArmored.tscn
    ProjectileVisual.tscn
    DamageNumber.tscn
  combat/
    AttackData.gd              # Resource: tuned attack properties
    HitEvent.gd                # Runtime hit packet
    CombatResolver.gd          # validates and routes hits
    PlayerCombatController.gd  # attack state, requests, cancels, buffer
    WeaponController.gd        # selected weapon and move mapping
    TargetingComponent2D.gd    # cursor aim and optional assist
    EnemyReaction2D.gd        # poise, stun, pseudo-Z, knockback
    CollisionCombo2D.gd       # walls, body collisions, bounce caps
    StyleController.gd         # later milestone
    CombatFeedback.gd          # hitstop, effects, audio signals
    CrowdDirector.gd           # active enemy attack tokens
  data/attacks/
    pistol_tap.tres
    pistol_launcher.tres
    pistol_sustain.tres
    pistol_charge.tres
    shotgun_blast.tres
    shotgun_directional.tres
    shotgun_dash.tres
    shotgun_recoil.tres
  ui/DebugCombatHUD.tscn
  tests/CombatTestArena.tscn
```

## 4.2 Single-responsibility rules

- **PlayerMovement** computes locomotion and dash velocity; it does not decide damage.
- **PlayerCombatController** owns attack lifecycle, input queue, charge state, and cancel permissions; it does not implement enemy physics.
- **Targeting** chooses candidate targets based on mouse/controller aim; it never silently alters damage or enemy state.
- **AttackData** defines an attack, including reactions and windows; a single attack resource may be used by several actors.
- **CombatResolver** validates a hit, ensures the same attack is not counted twice, creates a `HitEvent`, and sends it to the target.
- **EnemyReaction** interprets the hit against armor, poise, current reaction, and airborne limits. It manages transitions and movement impulses.
- **CollisionCombo** interprets wall/body impacts and decides whether to trigger bounce or secondary damage, with strict chain limits.
- **Feedback** subscribes to hit events and spawns VFX, screen effects, and sound without changing combat truth.
- **CrowdDirector** schedules AI aggression at an encounter level, not as a hidden rule inside every enemy attack.

## 4.3 Suggested scene composition

```text
Player (CharacterBody2D)
├─ Sprite2D / AnimatedSprite2D
├─ CollisionShape2D
├─ AimPivot (Node2D)
│  └─ Muzzle (Marker2D)
├─ PlayerMovement (Node)
├─ PlayerCombatController (Node)
├─ WeaponController (Node)
├─ TargetingComponent2D (Node)
└─ AnimationPlayer

Enemy (CharacterBody2D)
├─ CollisionShape2D
├─ SpritePivot (Node2D)  # move this upward by -height_px
│  └─ Sprite2D
├─ GroundShadow (Sprite2D)
├─ EnemyBrain (Node)
├─ EnemyReaction2D (Node)
└─ Hurtbox (Area2D)

Arena (Node2D)
├─ Walls (StaticBody2D / TileMapLayer collision)
├─ Player
├─ Enemies
├─ CrowdDirector
├─ CombatResolver
├─ CombatFeedback
├─ Camera2D
└─ DebugCombatHUD
```

Build the components as nodes/scripts rather than one monolithic `Player.gd`. The separation is not overengineering: it prevents a targeting change from breaking hit reactions and makes top-down-to-3D changes more realistic.

# 5. Attack Data, Hit Events, and Damage Pipeline

## 5.1 AttackData resource schema

Use `Resource` objects for attacks. The following fields are minimum requirements; additional optional fields should default safely and be explicitly documented.

| Field | Type | Why it exists |
|---|---|---|
| `id` | StringName | Unique identifier for buffering, debug, repetition score. |
| `weapon_id` | StringName | Pistol, shotgun, shared, or future weapons. |
| `damage` | float | Baseline HP change before enemy modifiers. |
| `startup_s`, `active_s`, `recovery_s` | float | Timing phases and cancel-frame calculations. |
| `hit_shape`, `max_range_px`, `spread_deg` | enum/floats | Ray, cone, circle, or attack volume. |
| `target_rule` | enum | Direct, aim-assist, locked, area. |
| `reaction_type` | enum | Flinch, stagger, launch, sustain, knockback, crumple, guard break. |
| `reaction_power` | float | Compared to enemy poise/armor thresholds. |
| `stun_s`, `launch_vel_z`, `knockback_speed` | floats | Reaction-specific strengths. |
| `cancel_windows` | list | Authorized action categories and start/end times. |
| `movement_multiplier` | float | Locomotion during attack, 0–1 normally. |
| `hitstop_s`, `style_base` | floats | Feedback and scoring metadata. |
| `max_hits_per_target` | int | Prevents repeated overlap from multi-hitting accidentally. |
| `collision_profile` | enum | None, light push, wall bounce, body collision, etc. |
| `cooldown_s` | float | Optional limit on attacks such as launcher; avoid blanket cooldowns. |

**Design rule:** Damage and reaction are independent. A high-damage shot can have weak control, and a lower-damage attack can reliably sustain a juggle. Also distinguish a “damage hit” from a “reaction hit”; enemy armor may block the latter while still allowing the former.

## 5.2 Runtime HitEvent fields

A hit event is created **at the moment of confirmed collision**, not at input time. Include `attack_id`, `source_id`, `target_id`, `attack_instance_id`, `timestamp_s`, `hit_position`, `aim_direction`, `damage`, `reaction_type`, `reaction_power`, and `context_tags` (e.g., `AIRBORNE`, `FROM_COLLISION`, `CHARGED`). Snapshot values needed for resolution; do not assume mutable resources retain the exact values of the fired attack if switching weapons later.

## 5.3 Hit execution order

1. Input request enters the attack buffer.
2. Controller checks whether the requested action is legal now (or remains buffered).
3. Attack enters **startup**; begin animation, facing, and optionally a telegraph.
4. On active frame(s), perform ray/cone/overlap query and collect hits.
5. Validate target, line of sight, attack instance, friendly-fire policy, and per-target hit cap.
6. Create `HitEvent`; compute HP damage, armor/poise response, and reaction.
7. Apply enemy movement and state updates **once** in a stable order.
8. Emit `hit_confirmed` to feedback/style/UI listeners; handle hitstop without pausing unowned timers.
9. Attack enters **recovery**, with its specified cancel windows.
10. At completion, return to neutral or activate a valid buffered action.

For shotgun pellets, collect multiple ray hits but **aggregate a single reaction per enemy per blast**. A six-pellet hit must not apply six independent launch impulses.

## 5.4 Hit detection recommendation

For direct shots, start with **hitscan rays** aligned to the aim direction. Use `PhysicsDirectSpaceState2D.intersect_ray()` against a dedicated enemy hurtbox layer; return the first valid object before the arena wall. Aimed wide blasts can use multiple rays or a cone overlap. Launcher can use an immediate short-range circle/cone query. For projectiles with travel time (future rockets/explosive bullets), use an Area2D/CharacterBody2D projectile and reuse the exact same `HitEvent` and `CombatResolver` path on contact.

**Prevent:** shooting through walls; double-hits from overlapping hurtboxes; damage from muzzle flash visuals; mismatched visual and hit origin; applying hits while attack is only in startup; hitting dead or invulnerable targets; friendly fire unless intentionally enabled.

## 5.5 Priority and determinism

Process incoming hits in a deterministic order where feasible. A recommended per-target reaction priority is: **guard break / scripted boss rule → launch / heavy knockback → crumple → stagger → flinch → sustain**. Sustain is only relevant when airborne. A higher-priority reaction can replace a lower-priority one; weaker hits may extend stun up to a cap instead of replacing state. Define ties with fixed rules, not arbitrary node order.

# 6. Weapon Movesets and Initial Tuning

All values in this section are **initial tunables to test**, not DMC measurements. Treat attack damage as relative units (e.g., a light enemy starts at 100 HP). Tune enemy HP after reactions feel right.

## 6.1 Dual pistols

| Move / input | Function | Starting values | Cancel and design notes |
|---|---|---|---|
| **Tap fire** / LMB | Fast damage; minor flinch. Useful between major attacks. | 7 damage; 0.14 s shot interval; ~700 px range; flinch 0.05 s, reduced on standing enemies. | Can move at 100%; cancel into dash, launcher, weapon switch with minimal delay. Should not perma-stun a standing target. |
| **Launcher** / Q | Close-range blast that launches a vulnerable enemy. | 10 damage; startup 0.13 s; reach 85 px; `launch_vel_z` 480 px/s; recovery 0.20 s. | Must connect only within short range. Allow follow-up fire after active frames. Armor can require a setup hit first. |
| **Sustain fire** / LMB while airborne target selected | Retains airborne target briefly. | 5 damage; shot interval 0.13 s; clamp target fall speed no faster than -90 px/s; 0.11 s stun extension. | Cannot launch standing enemies. Limit effective sustain hits in one aerial sequence. The weapon is still player-aimed. |
| **Charged shot** / RMB hold/release (phase 2) | Tag enemy with a delayed secondary blast. | Charge 0.55 s; direct 16 damage; explosion after 0.65 s for 12 damage; blast radius 85 px. | Damage and reaction fire on tagged target after delay unless canceled by target death policy. Avoid mandatory charge for basic gameplay. |

**Intent:** pistols give precise control and reliably maintain tempo, not maximum burst. If sustained pistol fire outperforms shotgun and launcher against every enemy, reduce standing stagger/damage rather than making the pistols feel sluggish.

## 6.2 Shotgun

| Move / input | Function | Starting values | Cancel and design notes |
|---|---|---|---|
| **Standard blast** / LMB | Heavy close-range damage and stagger; modest horizontal push. | 22 damage at ideal range; 0.35 s between blasts; 280 px max practical range; cone ~30°. | Aggregate pellet reactions. Damage falls with distance. Shooting does not fully freeze movement. |
| **Directional blast** / RMB | Strong horizontal displacement toward current aim. | 16 damage; startup 0.14 s; knockback 540 px/s for 0.20 s; 0.34 s recovery. | Direction comes from input snapshot at firing, not target center after hit. Allow one wall bounce per chain. |
| **Dash blast** / dash + LMB (phase 2) | Advance into close range and shoot in one deliberate action. | Dash 180 px over 0.18 s; fire at ~0.11 s; impact 26 damage. | Movement is committed to a chosen trajectory. No automatic magnetic teleport to the target. |
| **Recoil shot** / phase 3 modifier | Fire and push the player backward or diagonally. | Player impulse 280 px/s; ~0.16 s recoil movement; 0.24 s attack recovery. | Move with aim and chosen recoil direction. Respect walls. Keep control of facing/aim where readable. |

**Intent:** shotgun spends proximity and commitment to obtain strong enemy movement and damage. Do not make the shotgun's projectile spread so random that the player cannot predict whether a bounce or collision will occur.

## 6.3 Attack identity and future expansion

A new gun must add a **new decision**, not just another damage number. Good later additions could include a revolver that pins/interrupts, an explosive firearm that creates delayed launches, or a long-range precision attack that marks a target for an aggressive pursuit. Require any new gun to document: its range weakness, distinctive reaction, movement interaction, cancel role, and reason to switch away from it.

# 7. Enemy Reaction System

## 7.1 Separate health, poise, and reaction state

Every enemy has `health`, `max_health`, `poise`, `armor_profile`, `reaction_state`, `reaction_timer`, `height_px`, `vertical_velocity_px_s`, `ground_velocity`, and current `combo_context` (sustain count, bounce count, collision count). **Health decreases on hit**; **poise decides whether strong reactions occur**; **reaction state decides what the enemy can do next**.

Use a clear list of state transitions rather than treating hitstun as an animation side effect.

| Reaction state | Enter condition | During state | Exit |
|---|---|---|---|
| Neutral | Spawn / recovered | AI moves and attacks | Any legal reaction or AI action |
| Flinch | Light hit passes resistance | Brief animation; movement reduced | Short timer → neutral |
| Stagger | Higher reaction power or depleted poise | No attack; clear recovery pose | Timer → neutral / armor recovery |
| Launch | Valid launch hit | Set `vel_z` positive and state airborne | At apex/descending → airborne, at ground → land |
| Airborne | `height_px > 0` | Apply pseudo-gravity and limited air hit reactions | Landing or special knockdown |
| Knockback | Significant horizontal impulse | Controller drives predictable slide and collision checks | Speed/short timer expires |
| Crumple | Special finisher-ready hit | Target slumps, temporarily vulnerable | Timer → stand / knockdown |
| Guard break | Defensive threshold exceeded | Guard disabled; guaranteed opening | Recovery → neutral |
| Knockdown/land | Height reaches ground with relevant speed | Play land/bounce and possible short vulnerability | Stand-up recovery → neutral |
| Dead | Health ≤ 0 | Stop combat and drop rewards | Despawn after effects |

A real implementation may represent `airborne` as an **orthogonal flag** rather than one mutually exclusive state; this is often cleaner because an enemy can be airborne *and* knocked back horizontally. Avoid a single giant enum if combinations of dimensions become awkward.

## 7.2 Poise and armor

Suggested initial light enemy: 100 HP, 20 poise, poise recovery after 1.0 s without meaningful hits. Launcher reaction power 35; ordinary pistol 2; shotgun blast 18; heavy directional blast 30. If an enemy's armor blocks a reaction, damage can still go through with a distinct armor-hit effect. Let poise break from several different attack routes, not only one required weapon.

For armored enemies, distinguish **temporary resistance** from **full immunity**. Example: pistols reduce poise slowly, shotgun staggers strongly, launcher works once armor is broken. A boss may need a special reaction profile, but should still provide readable feedback for attacks it resists.

## 7.3 Pseudo-height in top-down view

Represent enemy elevation using `height_px >= 0`, not by moving its world collision body. Draw the sprite at an offset `-height_px` on screen while its ground shadow remains anchored. This is a **readability convention**, not full simulated 3D motion. In a strictly top-down camera the sprite offset can be ambiguous; add a shadow-size/elevation cue and optional height bar.

Suggested initial values: `gravity_px_s2 = 1200`, `launch_vel_z = 480`, giving an unobstructed airtime around **0.8 s** and an apex around **96 px**, before sustain. These numbers are tunable; the actual perceived height depends on sprite scale.

## 7.4 Air sustain without infinite juggling

On a legal sustain hit against an airborne target, clamp rapid descent and extend `stun_timer`. Do **not** reset it to a full launch every shot. Track `sustain_hits_this_air_combo`. Example: hits 1–3 at 100% effect, hit 4 at 50%, then further taps maintain damage only until the enemy lands. Alternatively use a rolling air-control budget. Reset the counter on a genuine landing, not every stagger.

The player should be able to deliberately perform a short multi-hit sequence, but tap-fire alone should not pin a foe in the sky indefinitely. Strong late-game or boss abilities may deliberately override this rule, but those should be named exceptions.

## 7.5 Ground bounce and wall bounce

Use collisions from intentional knockback movement to detect actual wall contact. If the attack's collision profile allows a wall bounce and the target has not bounced already in the current combo, reflect the horizontal knockback vector against wall normal and multiply by a retention factor (start `0.55`). Generate a brief stun and a clear impact effect. **Do not** bounce repeatedly between walls by default.

For a ground bounce, require meaningful downward speed, eligibility tag, and an unused bounce budget. On landing, assign a reduced upward velocity (start `0.35 × original launch speed`) and briefly allow follow-up. Ordinary soft landings should not always bounce.

Keep bounce counts in `combo_context`, and reset only after the enemy has fully recovered on the ground for a defined short interval. Add a debug label to tell whether a bounce failed because of angle, speed, armor, or a spent budget.

## 7.6 Enemy-to-enemy collision

When an enemy is in a **launched/knockback projectile state**, collision with another enemy can trigger a secondary hit. Resolve the impact once per target pair per brief cooldown (e.g., 0.30 s), with speed threshold (start ~260 px/s), direct damage (start 8), and stagger power determined by impact speed. The struck enemy can be pushed a short distance, but should **not** automatically become a new unlimited projectile.

Use strict chain controls: max one body-collision propagation per thrown enemy in the first slice, no self-collision, no duplicate effects across physics ticks, and no secondary damage from enemies barely sliding together. This keeps the one-versus-many feature intentional rather than turning crowd impacts into accidental screen-clearing explosives.

# 8. Targeting and Aim Assistance

## 8.1 Principle: preserve player intent

Mouse aiming should feel like aiming a gun, not selecting menu items. The primary direction is `normalized(mouse_world - muzzle_world)`. The target system may help determine which airborne foe receives a sustained hit, but it must not spin the player toward a distant enemy against a clearly different cursor direction.

## 8.2 Proposed targeting modes for A/B tests

| Mode | Rules | Best use |
|---|---|---|
| Direct aim | Hit test strictly on mouse/cursor ray and attack geometry. | Baseline skill and precision test. |
| Light assist | If the aim line nearly intersects a target within limited angle/distance, adjust the *hit query* subtly; render aim cue. | Default PC prototype candidate. |
| Hover-sticky soft target | Hovering an enemy acquires it; cursor entering empty ground retains target briefly or until a new valid enemy is hovered; actual shots still require aim agreement. | Optional experiment for juggling and multi-target play. |
| Controller directional assist | From the right-stick vector, rank enemies in a cone by angle, range, visibility, and current-target continuity. | Controller play only; more assistance is usually required. |

**Do not conflate target selection with hit success.** A remembered target is information, not a license for a shot to turn 90 degrees. Strong homing should be a specific named move property, not a universal aim feature.

## 8.3 Initial assist tuning

- Mouse: begin with direct aim. Test assist cone at **4–7 degrees**, not automatic screen-wide lock-on.
- Candidate valid only within attack range and unobstructed line of sight.
- A new cursor-hovered enemy immediately overrides the remembered target.
- Retain previous target in empty space for **0.20–0.35 s** during experiments; no retention after target death, invalidation, or explicit reset.
- Rank by **smallest aim angle**, then line-of-sight validity, then range; give a small bonus to the previous target to prevent flickering.
- For an airborne target in top-down, aim at its **ground-plane position / shadow**. The pseudo-height offset must not change the hit requirement unless an intentional move specifically targets height.

## 8.4 Targeting test cases

1. Two enemies stand side by side: intentional cursor movement immediately changes the intended target.
2. Target A is launched: normal aimed pistol fire hits A regardless of its drawn sprite offset.
3. A wall separates player and enemy: no assist may tunnel through the wall.
4. Player aims at empty ground: no distant enemy is mysteriously struck.
5. The player shoots near the edge of assistance: the debug HUD shows exact target choice and angular error.
6. While dashing, facing follows the chosen aim rules rather than snapping to movement direction.

# 9. Attack Lifecycle, Input Buffering, and Cancels

## 9.1 State machine

```text
NEUTRAL
  └─ accepted input → STARTUP
                        └─ startup elapsed → ACTIVE
                                               └─ active elapsed → RECOVERY
                                                                     └─ done → NEUTRAL
                     └─ legal cancel at configured time → STARTUP(new attack)
                     └─ dodge cancel at configured time → DASH
```

The state machine needs: `current_attack`, `elapsed_s`, `phase`, `attack_instance_id`, `buffered_command`, `buffer_expires_at`, and `legal_cancel_types`. Keep `phase` derived from elapsed times where possible, not managed by unrelated timers that can drift. At 60 FPS, `0.10 s` is approximately six frames, but seconds are authoritative.

## 9.2 Example initial cancel table

| Current action | Allowed transitions | Earliest suggested cancel | Not allowed |
|---|---|---|---|
| Pistol tap | Tap, launcher, dash, weapon switch | On/after shot commit (~0.05 s) | Undo already-fired damage. |
| Launcher | Pistol sustain, dash follow, weapon switch | After launch active hit (~0.15 s) | Instantly chain another full launcher during startup. |
| Pistol charge hold | Movement, dash-cancel charge, release shot | Hold phase; cancel discards charge | Fire a fully charged shot after cancel. |
| Shotgun standard | Dash, weapon switch, directional follow-up | After blast (~0.16–0.22 s) | Cancel wind-up before discharge into guaranteed hit. |
| Directional blast | Dash (later), weapon switch (later) | Late recovery (~0.23 s) | Zero-cost repetition without spacing or risk. |
| Dash blast | Standard move on finish, special continuation | After the fire commit | Homing trajectory change midway without an ability. |

**Hit confirmation** can optionally grant a slightly earlier follow-up window on certain attacks. This is a deliberate tuning choice. Make it visible in debugging so testers can distinguish whiff timing from hit timing.

## 9.3 Input buffer algorithm

On press, store command and timestamp. Each simulation tick: check if command remains within buffer duration; if yes and current state allows it, execute and remove it; if not legal yet, retain it; if expired, discard. Prefer a **single last-intent slot per action category** or a bounded priority queue; an unbounded FIFO may create unintended strings of actions after a long animation.

Give emergency dodge high priority, but not unconditional authority: some heavy moves deliberately have a committed period. Explicitly test button mashing to ensure one press cannot cause multiple attacks.

## 9.4 Animation and gameplay authority

Combat timing is **data-driven**. `AnimationPlayer` follows the action state and receives fire/hit cues, but an animation event should not be the only record of whether an attack is active. This avoids gameplay changes if a visual animation is retimed. Use animation events for synchronization (muzzle flash, pose accent), not as the sole attack state machine.

# 10. Player Movement, Pursuit, and Recoil

## 10.1 Ground movement

Start with a top-down `CharacterBody2D` using normalized WASD input. Suggested values: movement speed **250–310 px/s**, acceleration **1500–2200 px/s²**, friction/deceleration **1800–2400 px/s²**. Aim pivot follows mouse continuously unless an explicit move applies facing lock. Shooting ordinary pistols should preserve most or all movement speed. Heavy attack movement multipliers are in `AttackData`.

## 10.2 Dash / dodge

Suggested dash: **0.20 s**, speed **650–850 px/s**, cooldown or recovery **0.25–0.35 s**. Begin testing without invulnerability, then add a narrow i-frame interval (e.g., 0.05–0.13 s) only if enemy pressure demands it. Keep collision resolution active during dash so the player cannot pass through walls. Allow legal attack cancels during or immediately after dash according to the move table.

**Do not build a dash that simultaneously has full invulnerability, instant canceling, zero recovery, and unlimited range.** That combination would invalidate positioning and defensive decision-making.

## 10.3 Dash blast

At accepted input, snapshot the intended dash direction; drive player toward the target area, **not directly to the target's live center**. At attack's defined active frame, fire the shotgun along current aim or captured aim (choose one rule and test it). If the dash hits a wall early, end movement but preserve the attack only if the muzzle geometry still permits the shot. Display the committed trajectory in the debug overlay.

## 10.4 Recoil movement

On recoil blast, compute a recoil vector opposite the shot direction. In advanced mode, combine it with a limited amount of directional input to allow backward-left/backward-right variants, while retaining a strong visual connection to the shot's recoil. Apply recoil velocity through PlayerMovement rather than directly changing global position. Collision with a wall interrupts recoil instead of clipping through it.

## 10.5 Optional aerial player combat

Do **not** add player jumping solely because DMC has aerial combat. In top-down, it creates camera/readability work. If aerial player combat proves desirable, use a player pseudo-height channel and a separate airborne movement profile. Define entry (jump/launch), landing, aerial shot targeting, recoil, and defensive options; show clear shadows and vertical offsets. In a third-person 3D conversion, replace pseudo-height with real vertical movement under `CharacterBody3D` while preserving attack and reaction data contracts.

# 11. Charged and Delayed-Effect Gunshots

## 11.1 Pistol charge pipeline

1. RMB press creates a charge session with a unique `charge_id`.
2. Progress increases while held, clamped to max charge (start 0.55 s).
3. Player can move and aim; dash may explicitly cancel and reset charge.
4. RMB release fires an attack snapshot with `charge_level` (begin with only uncharged/charged, not five gradations).
5. On hit, apply initial damage/reaction and attach a timed explosive `Mark` to the enemy.
6. At fuse completion, validate mark ownership, target existence, and death policy; trigger one explosion and remove mark.

## 11.2 Mark ownership and edge cases

Store marks as objects with `id`, `source_id`, `target_id`, `damage`, `radius_px`, `remaining_time_s`, and `detonation_policy`. Choose a deterministic policy when the marked target dies: recommended prototype policy is **detonate immediately at the death position** once, allowing nearby enemies to be affected. An alternative is dropping the explosion. Never spawn both. Two marks can stack only if you explicitly support it; first slice should replace an existing mark or cap at one per target.

The explosion uses the normal `HitEvent` pipeline with a different `attack_instance_id`; prevent it from triggering itself recursively. A charge shot should create a new attack opportunity, not simply become highest DPS by default.

## 11.3 Test scenarios

- Charge shot hits Enemy A; player shoots Enemy B before delayed explosion; A detonates on schedule.
- Enemy A dies before fuse; chosen death policy executes exactly once.
- Explosion hits multiple enemies; each receives at most one reaction from that explosion.
- Two marks in quick succession obey the chosen stacking policy.
- Marked enemy is behind a wall relative to nearby enemies; line-of-sight blocking of explosion is documented and tested (initial choice: walls block if strict ray visibility is required, or area damage passes around small cover only if explicitly intended).

# 12. Enemy AI, Aggression, and Counterplay

## 12.1 Encounter director

For one-versus-many combat, create a `CrowdDirector` that grants **attack tokens** to at most **two active melee enemies** at a time in an initial 4–6-enemy test. Other enemies should still reposition, circle, pressure space, prepare telegraphs, or choose safe ranged attacks. Do not freeze non-token enemies in idle loops. Enemies request a token when in range; director grants by distance, player focus, time since last attack, and variety. Revoke token on enemy death, stagger, or attack completion.

## 12.2 Attack structure

Every enemy attack has **approach → anticipation/telegraph → active frames → recovery**. First chaser example: telegraph 0.45 s, active 0.16 s, recovery 0.50 s, with clear direction cue. The player should have enough time to interrupt, dodge, or reposition. Do not silently speed up attacks as the combo meter rises.

## 12.3 Initial enemy archetypes

| Type | Role | Reaction behavior | Counterplay |
|---|---|---|---|
| Training dummy | Mechanic tuning | Always accepts launch/sustain, never attacks | Learn combos and verify deterministic physics. |
| Light rusher | Close-range pressure | Low poise, easily launched, moderate HP | Launch, stagger, directional collision. |
| Armored bruiser | Punishes repetitive light fire | Resists pistol flinch; poise breaks via shotgun or repeated precision | Set up with heavy attack or evade and punish recovery. |
| Ranged disruptor (later) | Prevents stationary tunnel vision | Low–medium poise; ranged telegraph | Dodge projectile, dash to disable, use nearby enemy as obstruction if supported. |

## 12.4 Anti-kiting without arbitrary restrictions

Do not simply increase the damage of long-range enemies or install invisible rubber-band teleports. Instead, make high-control techniques more effective at medium/close range; give enemies explicit approach tools, dodge/guard patterns, and recoverable defensive states; make finishing combos reposition the player into interesting risk. A reliable long-range weapon may remain useful, but should not offer the best damage, safety, and crowd control simultaneously.

## 12.5 Resistance rules

An armored opponent can block launch until poise is broken, but the player needs immediate readable feedback: an armor spark, resistant sound, debug note, and non-zero damage. Resistances must be predictable and discoverable. Full immunity to every expressive mechanic is reserved for rare, intentionally designed phases, not the default enemy design.

# 13. Style System and Scoring

## 13.1 Core reward principle

Style rewards **new meaningful interactions**, not simply firing as fast as possible or switching weapons on every frame. Build the style system only after base combat feels good, because scoring can disguise mechanical weaknesses.

## 13.2 Suggested scoring events

| Event | Illustrative score |
|---|---:|
| Ordinary damage hit | +1 (low cap per repeated attack) |
| First launcher on a target | +8 |
| Sustained aerial continuation | +4 for first few useful hits |
| Weapon transition that connects | +5 |
| Wall bounce followed by successful hit | +14 |
| Enemy-to-enemy collision | +12 |
| Dodge followed by counterattack within window | +10 |
| Successful finishing attack after multi-move string | +15 |

Maintain a short rolling history of `attack_id` and `interaction_id`. Diminish repeated style contribution from identical attacks, but allow sustain fire to preserve the active chain. **Do not** multiply HP damage by style rank in the initial design: it can make snowballing too strong and complicate balance.

## 13.3 Chain timeout and UI

Prototype style chain timeout: **1.6 s** after last meaningful offensive interaction, paused or slowed during select defensive actions. Style drops gradually after timeout, not instantly after one miss. Show basic rank, current score, and one or two highlighted interaction labels (“WALL BOUNCE”, “AIR CONTINUE”). Avoid filling the screen with points on every pistol pellet.

## 13.4 Exploit checks

- Shooting a dead enemy gives no score.
- One pellet spray does not award repeated launch points.
- Indefinitely sustaining a safe airborne foe cannot climb rank forever.
- Swapping pistol ↔ shotgun without meaningful hits yields no score.
- One rolling body collision cannot recursively generate unlimited style events.

# 14. Feedback, Animation, Camera, and Audio

## 14.1 Four-part hit feedback

On a confirmed hit, coordinate: **(a) shooter recoil**, **(b) impact VFX and audio**, **(c) target reaction**, and **(d) camera emphasis**. A large muzzle flash alone cannot replace enemy motion. Separate graphical feedback from combat rules: hitstop, particles, and sound subscribe to `hit_confirmed` signals.

| Attack class | Hitstop starting point | Camera / visual emphasis | Audio |
|---|---|---|---|
| Pistol tap | 0–0.016 s | Tiny muzzle/impact, no major shake | Crisp, rapid transient |
| Launcher | 0.025–0.050 s | Brief hit flash, directional launch trail | Strong impact with tonal lift |
| Shotgun blast | 0.050–0.067 s | Short modest camera impulse | Deep body, bright transient |
| Heavy knockback/wall bounce | 0.067–0.10 s | Impact pulse, wall debris | Layered impact and spatial reflection |

At 60 FPS, the latter values are roughly 3–6 frames. Tune by feel; the numbers are not DMC measurements. Too much hitstop on rapid pistol fire makes aiming feel sticky.

## 14.2 Implement hitstop safely

For early prototypes, prefer **local combat hitstop**: temporarily freeze the attacker and impacted target's animation/motion for a short specified real-time interval, while UI/input collection continues. Store hitstop timers using unscaled elapsed time (or manually update in a manager). Avoid setting `Engine.time_scale = 0` globally for every bullet: that can freeze input buffering, timed explosive fuses, or unrelated actors and produce complex bugs. Decide whether multiple simultaneous hitstops use max duration or add; initial recommendation: **max duration, not sum**.

## 14.3 Animation implementation

For simple 2D art, separate locomotion facing and firing sprites/overlays where possible. For heavyweight moves, full-body animation can take over while PlayerMovement still applies attack-defined velocity. Each move needs readable **wind-up**, **commit/fire pose**, and **follow-through**. Do not bury gameplay timing in art; link animation cue times to `AttackData` windows. Build with simple colored shapes first; custom art only after tuning.

## 14.4 Camera guidelines

Top-down Camera2D should preserve visibility of aim direction and nearby threats. Limit shake amplitude and duration, particularly during repeated shotgun shots. Optional subtle camera lead along aim direction can improve awareness, but must not displace the player offscreen. Screen-space VFX should not cover projectile telegraphs. Expose shake and flash intensity in accessibility settings once moving beyond prototype.

## 14.5 Sound cues

Give each systemic event a distinct category: armor resisted, poise broken, launch, sustain, shotgun impact, wall bounce, body collision, enemy telegraph, clean dodge, and finisher-ready. Reuse layered procedural placeholder samples if necessary, but test audio priority so twenty overlapping pistol impacts do not clip or drown out an imminent enemy attack.
# 15. Debugging, Instrumentation, and Reproducible Tests

## 15.1 Mandatory debug overlay

Toggle with F3. Show: player state, active attack ID/phase/time, legal cancel types, buffered input and expiry, selected weapon, aim direction, chosen target ID, target angle error and LOS status. For selected enemy show: HP, poise, reaction state, height, vertical speed, stun remaining, sustain count, wall bounce count, collision budget. Also show active AI attack tokens and rolling style event list.

## 15.2 Slow motion and step tools

Include controllable `combat_speed` (0.25×, 0.5×, 1×) **for tests only**; always define whether input buffer and fuses scale with combat time. Allow single-step simulation using a dedicated test runner if feasible. Add hitbox/cone drawing with `draw_line`, `draw_arc`, or `draw_circle` so testers see what actually hit rather than judging only by animations.

## 15.3 Reproducible arena configurations

Store test scenes with fixed spawn transforms. Add a deterministic or recorded random seed for AI behavior. Provide reset-to-start, spawn light enemy, spawn armored enemy, and spawn wall-bounce target controls. Use a CSV or text event log (`timestamp, attack, target, reaction, state_before, state_after, damage`) for hard-to-explain bugs. No analytics service is required.

## 15.4 Automated smoke tests

Unit/script tests can verify pure logic: attack windows, input buffer expiry, reaction priority, one-hit-per-instance, charge mark cleanup, sustain budgets, style decay, and attack-token allocation. Use in-engine integration tests to check real collision layers and wall normals. A pass of pure unit tests alone does not prove that hit detection works in the arena scene.

# 16. Build Order: Detailed Implementation Tasks

**Important:** Each phase has a pass/fail gate. Do not expand features while a gate is failing. This prevents accumulating flashy attacks over an unresponsive core.

## Phase 0 — Technical scaffolding

**Implement:** Godot project, input map, scene tree, player capsule/sprite, one enemy dummy, rectangular walls, fixed arena camera, reset button, debug overlay shell. Set combat layers (world, player body, enemy body, hurtbox, attack detection, visual-only). Set 60 FPS design target and verify physics independence from render FPS.

**Acceptance:** Player moves and aims with mouse. Dash collides with walls. Cursor-to-world math is correct under camera transforms and non-default viewport sizes. Test at 60 and 120 render FPS; movement distances remain consistent.

**Stop condition:** Do not add gun attacks until aim and movement work reliably.

## Phase 1 — Shared combat pipeline

**Implement:** `AttackData`, `HitEvent`, `CombatResolver`, hitscan query, one-shot-per-target gate, HP, death, hit-confirmed event, primitive effects. Fire pistol on LMB. Draw actual shot ray in debug mode.

**Acceptance:** A shot damages exactly one valid enemy or the allowed sequence of targets for a designated piercing attack. Walls stop shots. No duplicated hits from overlapping colliders. Releasing/repressing fire behaves predictably.

## Phase 2 — Launch, sustain, and reaction visualization

**Implement:** Pseudo-height, gravity, launch attack, airborne state, sustain detection, shadow/elevation marker, limited sustain count, landing and recovery. Display full reaction state in HUD.

**Acceptance:** At least three different timed sequences work: launch-only landing, launch → 2 sustain shots → landing, and launch → shot missed → early landing. Sustain cannot suspend a target forever when button is held continuously.

## Phase 3 — Shotgun and switching

**Implement:** Weapon data, direct 1/2 selection, shotgun cone/hitscan with pellet reaction aggregation, strong knockback, legal cancel windows, 0.10 s input buffer. Add distinct visual/audio weight to shotgun.

**Acceptance:** Player can repeatedly perform launcher → pistol shots → shotgun shot on purpose. Switch command works during legal windows and buffers appropriately during illegal ones. Shotgun blast applies at most one reaction per target.

## Phase 4 — Wall and enemy collisions

**Implement:** Knockback motion integration, contact normal, bounce reflection, per-combo bounce limit, body collision speed gate, collision cooldown, one-level chain propagation, collision effects.

**Acceptance:** Aim angle predicts bounce direction; an enemy cannot pinball indefinitely. Two stationary enemies touching each other do not deal damage. One knocked-back enemy can strike and stagger another, with debug record for each collision.

## Phase 5 — Enemy pressure and core feel

**Implement:** Rusher AI, telegraph, dodge defense, optional armor foe, one-versus-many director with two attack tokens, basic camera/audio feedback, repeated-play tuning. Test 1/3/6 enemies.

**Acceptance:** Player can make short combos while under pressure, but cannot stand motionless firing the safest move and win every encounter. A player who practices placement and redirection performs better than one who only spams tap-fire.

## Phase 6 — Advanced moves

**Implement:** Charge/mark/explosion, dash blast, recoil shot, additional cancel windows and poses, style scoring. Add controller mapping and optional aim assist only if manual tuning indicates a need.

**Acceptance:** Each advanced attack creates at least one new player decision beyond higher DPS. Delayed explosions and collision chains never double-apply or recursively trigger themselves.

## Phase 7 — Presentation and 3D decision

**Implement:** Polished animations, effects, sound mix, accessibility settings, enemy variety, stronger style UI. Only after core fun is proven: assess whether a 3D third-person version adds enough expressive value to justify replacing camera and movement presentation.

**Acceptance:** A new tester can understand an enemy launch, sustain, and collision without reading the debug overlay. Inputs remain responsive under visual load and dense enemy situations.

# 17. Test Matrix and Quantitative Acceptance Gates

These are **starting validation targets**, not research-derived facts. Adjust them based on playtests rather than treating them as universal standards.

| Area | Repeatable test | Desired result |
|---|---|---|
| Input | Press fire while running in any of 8 directions | Shot appears at first legal opportunity; no unexpected full stop. |
| Aim | Fire at two adjacent enemies, intentionally switching mouse target | Correct target chosen in ≥9 of 10 controlled tries after player learns aim convention. |
| Launch | Launcher connects within 85 px | Enemy airborne, clear shadow separation, no double impulse. |
| Sustain | Launch then fire 2–3 timed shots | Enemy remains available long enough for shotgun follow-up. |
| Sustain abuse | Hold pistol fire continuously into a launched dummy | Target eventually falls without special meter or infinite lock. |
| Shotgun reaction | Blast same target at close/medium ranges | Predictable direction; one knockback per blast. |
| Weapon switch | Fire pistol → select shotgun during cancel window | Shotgun can act at defined timing; no input lost unexpectedly. |
| Wall bounce | Knock enemy into arena wall | Zero or one eligible bounce by profile; never infinite recursion. |
| Body collision | Redirect A into B at sufficient speed | B gets one secondary reaction; no duplicate frame damage. |
| Defense | Enemy telegraphs 0.45 s attack | Dodge or interrupt window feels learnable; on-screen cue visible. |
| Crowd | 1 vs 6 light enemies | Token cap enforced; enemies still reposition and threaten. |
| Performance | 6 active enemies, frequent shots and effects | Stable target framerate on dev machine; no unbounded allocations or effects. |
| Regression | Reset and repeat same test ten times | Same inputs/environment produce consistent core reactions. |

Record subjective answers as well: Does the player **intend** the knockback direction or merely hope for it? Do they understand why a launch failed? Does weapon switching feel rewarding without being mandatory? Can they improvise when Enemy B interrupts their plan? A technical pass is not enough if interactions are unreadable.

# 18. GDScript Implementation Examples

These examples specify **interfaces and algorithm boundaries**, not complete drop-in production modules. Add input wiring, physics layers, error handling, animation hooks, and tests in the real project. Use only one source of truth for state; do not paste each sample into independent scripts that duplicate ownership.

## 18.1 AttackData.gd (starter Resource)

```gdscript
class_name AttackData
extends Resource

@export var id: StringName = &"unnamed"
@export var weapon_id: StringName = &"shared"
@export var damage: float = 10.0

@export var startup_s: float = 0.10
@export var active_s: float = 0.04
@export var recovery_s: float = 0.20
@export var max_range_px: float = 250.0

@export_enum("flinch", "stagger", "launch", "sustain", "knockback")
var reaction_type: String = "flinch"
@export var reaction_power: float = 0.0
@export var stun_s: float = 0.0
@export var launch_vel_z: float = 0.0
@export var knockback_speed: float = 0.0
@export var fall_speed_cap: float = -90.0

@export var movement_multiplier: float = 1.0
@export var cancel_after_s: float = 0.10
@export var allowed_cancels: Array[StringName] = []
@export var max_hits_per_target: int = 1

func total_duration_s() -> float:
    return startup_s + active_s + recovery_s
```

Later, replace the simple `cancel_after_s` with a resource array of cancel intervals, possibly conditioned on hit-confirmed status. Prefer typed move-category identifiers over arbitrary strings once the system grows.

## 18.2 HitEvent.gd and central resolver

```gdscript
class_name HitEvent
extends RefCounted

var attack: AttackData
var attacker: Node2D
var target: Node2D
var attack_instance_id: int
var hit_position: Vector2
var aim_direction: Vector2
var extra_tags: Array[StringName] = []
```

```gdscript
# CombatResolver.gd (illustrative)
extends Node
signal hit_confirmed(event: HitEvent)

var registered_hits: Dictionary = {}

func try_deliver(event: HitEvent) -> bool:
    if not is_instance_valid(event.target):
        return false
    if not event.target.has_method("receive_combat_hit"):
        return false

    var target_id: int = event.target.get_instance_id()
    var key: String = "%d:%d" % [event.attack_instance_id, target_id]
    var count: int = int(registered_hits.get(key, 0))
    if count >= event.attack.max_hits_per_target:
        return false

    registered_hits[key] = count + 1
    event.target.receive_combat_hit(event)
    hit_confirmed.emit(event)
    return true

func clear_attack_instance(attack_instance_id: int) -> void:
    var prefix: String = "%d:" % attack_instance_id
    for key in registered_hits.keys():
        if String(key).begins_with(prefix):
            registered_hits.erase(key)
```

The resolver sample assumes **attack-instance IDs are unique for the encounter** and that the controller calls `clear_attack_instance()` after an attack ends. Do not make a new ID for every pellet of one shotgun blast. Actual validation also checks target alive state, invulnerability, range, team, and wall occlusion before the call.

## 18.3 Enemy pseudo-height and sustain

```gdscript
# EnemyReaction2D.gd (illustrative component)
class_name EnemyReaction2D
extends Node

signal landed(impact_speed: float)

@export var gravity_px_s2: float = 1200.0
@export var max_effective_sustain_hits: int = 4
@onready var sprite_pivot: Node2D = $"../SpritePivot"

var height_px: float = 0.0
var velocity_z: float = 0.0       # positive = rising
var stun_remaining_s: float = 0.0
var sustain_hits: int = 0

func launch(speed_px_s: float, stun_s: float) -> void:
    velocity_z = speed_px_s
    height_px = maxf(height_px, 1.0)
    stun_remaining_s = maxf(stun_remaining_s, stun_s)
    sustain_hits = 0

func sustain(fall_speed_cap: float, stun_s: float) -> void:
    if height_px <= 0.0:
        return
    if sustain_hits >= max_effective_sustain_hits:
        return
    # A descending enemy never falls faster than the cap after this hit.
    velocity_z = maxf(velocity_z, fall_speed_cap)
    stun_remaining_s = maxf(stun_remaining_s, stun_s)
    sustain_hits += 1

func _physics_process(delta: float) -> void:
    stun_remaining_s = maxf(0.0, stun_remaining_s - delta)
    if height_px > 0.0 or velocity_z > 0.0:
        velocity_z -= gravity_px_s2 * delta
        height_px += velocity_z * delta
        if height_px <= 0.0:
            var impact_speed: float = absf(velocity_z)
            height_px = 0.0
            velocity_z = 0.0
            landed.emit(impact_speed)
    sprite_pivot.position.y = -height_px
```

This demonstrates pseudo-Z, but a final system needs **airborne knockback, pause-aware hitstop integration, landing reaction, and a safe post-landing reset**. With the starting 480 px/s launch and 1200 px/s² gravity, the target should naturally land in approximately 0.8 s without a sustain hit. A landing bounce can intercept `landed` and apply a new vertical velocity if its budget is available.

## 18.4 Reaction resolution pseudocode

```text
receive_combat_hit(hit):
    if dead or temporarily invulnerable: reject
    health -= calculate_damage(hit, armor, resistance)
    if health <= 0: handle_death_and_pending_marks(); return

    effective_power = hit.reaction_power - armor_reaction_resistance
    if can_break_guard(hit): enter_guard_break(); return
    if should_reject_reaction(effective_power, current_state):
        play_armor_hit(); return

    match hit.reaction_type:
        launch:
            enter_airborne(hit.launch_vel_z)
        sustain:
            if airborne: extend_air_opportunity_with_budget()
            else: apply_minor_flinch_only()
        knockback:
            set_ground_impulse(hit.direction, hit.knockback_speed)
        stagger:
            stun_for_capped_duration(hit.stun_s)
        flinch:
            apply_short_flinch_if_not_immune()

    log_reaction_change()
```

The design **does not** force heavy reactions from every hit. Armor, move priority, and current state determine which reaction is legal.

## 18.5 Attack timing and buffering pseudocode

```text
on_action_input(action, now):
    replace_or_append_bounded_buffer(action, now + 0.10s)

physics_tick(delta):
    update_current_attack_elapsed(delta)
    if crossing_attack_startup_end_this_tick:
        perform_one_shot_active_hit_query()
    if current_attack_duration_complete:
        finish_and_clear_attack_instance()
    remove_expired_buffer_commands()
    for each buffered request by priority:
        if can_enter_action(request, current_attack, elapsed):
            commit_to_action(request)
            remove_request()
            break

can_enter_action(action, current, elapsed):
    if current == null: return true
    if current.category_allows_cancel(action.category)
       and elapsed within legal_cancel_window(action.category):
        return true
    return false
```

This prototype uses a single hit query when startup completes. Multi-stage attacks and sustained fire should schedule explicit active ticks; otherwise the same query will be incorrectly reused every physics frame.

## 18.6 Directional knockback and wall reflection

```gdscript
# Called when a valid knockback collision occurs.
func wall_bounce(
        current_velocity: Vector2,
        wall_normal: Vector2,
        retention: float
) -> Vector2:
    var reflected: Vector2 = current_velocity.bounce(
        wall_normal.normalized()
    )
    return reflected * clampf(retention, 0.0, 1.0)
```

**Collision caveat:** `CharacterBody2D` wall collisions typically derive from movement via `move_and_slide()` or a dedicated physics motion query. Read collision normals from real physics contacts; do not invent a bounce normal from an arbitrary wall sprite. Apply the reflected velocity only when target speed and available bounce budget satisfy the rule.

## 18.7 Collision-chain safety pseudocode

```text
on_knockback_body_contact(projectile_enemy, struck_enemy):
    if projectile_enemy.speed < threshold: return
    if projectile_enemy.body_collision_budget <= 0: return
    if pair_recently_collided(projectile_enemy, struck_enemy): return
    if struck_enemy == projectile_enemy or struck_enemy.dead: return

    projectile_enemy.body_collision_budget -= 1
    register_pair_cooldown(0.30s)
    dispatch_one_secondary_hit(struck_enemy, FROM_BODY_COLLISION)
    play_impact_effect()
```

**Budget scope:** count only **valid** collisions against other enemies, not contacts with scenery or overlaps that failed the speed threshold. Keep per-pair cooldown entries bounded and expire them.

# 19. Top-Down vs Third-Person Adaptation

The current design is optimized for 2D top-down. If the project changes perspective, reuse **attack meaning** and **reaction semantics**, but replace view-dependent implementation rather than forcing 2D methods into 3D.

| System | Top-down Godot 2D | Third-person Godot 3D |
|---|---|---|
| Movement | `CharacterBody2D`, `Vector2` | `CharacterBody3D`, camera-relative `Vector3` |
| Aiming | World mouse ray on 2D floor; simple cone selection | Camera raycast, muzzle alignment, crosshair aim point, lock-on as needed |
| Target visual | Ground shadow, pseudo-height offset | True vertical separation with camera/depth cues |
| Air juggling | Scalar height simulation with controller-defined sustain | 3D vertical physics/motion with juggle-preserving reaction rules |
| Knockback | 2D floor vector and wall normal | Horizontal 3D plane impulse and collision normal |
| Dash blast | Captured 2D trajectory | Camera/facing-aware 3D trajectory and camera collision |
| Visual layering | AnimatedSprite2D/AnimationPlayer | AnimationTree upper/lower body blends and root-motion policy |
| Target switching | Cursor direct aim and restrained assist | Mouse ray/lock-on target handoff with explicit UI and LOS |
| Crowd visibility | All nearby enemies often visible at once | Camera can hide threats; audio/UI indicators need more work |

**Design recommendation:** In top-down, emphasize **horizontal redirection, wall bounces, and enemy-to-enemy collisions**. Keep launcher/sustain as a secondary expressive layer unless playtests show that pseudo-height is readable. In third-person, airborne juggling can become a bigger part of the player's movement and camera fantasy.

# 20. Pitfalls and Explicit Anti-Patterns

| Pitfall | Why it harms the game | Corrective action |
|---|---|---|
| Pistols repeatedly stunlock grounded enemies | Safe dominant ranged strategy | Low standing stagger; reserve strong control for launches, charge, close-range attacks. |
| All attacks launch or knock back equally | Moves lose identity | Use distinct reactions with predictable strengths and commitments. |
| Every powerful attack is dodge-cancelable immediately | Heavy attacks have no risk | Lock startup/commit frames; allow earlier cancels only after justified hit confirms. |
| Free infinite juggle | Player never needs positioning | Sustain budget, gravity, recovery, AI disruption. |
| Uncontrolled ragdolls | Follow-up aim becomes random | Controlled reaction movement; ragdoll only for finish/death presentation. |
| Shotgun pellets each apply full stagger | Bugs and absurd multi-hit forces | Aggregate damage by chosen rule; one reaction per target per attack. |
| Assist selects through walls | Aiming feels unfair and mysterious | Visibility validation and debug target indicators. |
| AI attacks every frame from every direction | No space for stylish play | Telegraphs plus limited attack tokens; non-token actors reposition. |
| AI waits passively while player combos | No threat or interesting decisions | Pressure through flanking and ranged threats, not constant attacks. |
| Flashy animation blocks input too long | Stylish appearance, unresponsive control | Attack-driven cancel windows and real input buffer. |
| Style meter rewards empty weapon swaps | Busywork rather than expression | Award interaction events, not raw button variety. |
| Expand to five guns before testing two | Large rework risk | Milestone gates and one repeatable combat benchmark. |
| Treat DMC numbers as confirmed | Tuning becomes misleading | Document all values as original prototype experiments. |

# 21. A Specific Playtest Protocol

**Session A: Reaction clarity (10–15 minutes).** Use one dummy and display reaction HUD. Ask tester to perform launcher, sustain, directional blast, and wall bounce without explanation beyond the controls. Track whether they understand outcomes. Fix reaction/aim readability before new attacks.

**Session B: Combo ownership (10–15 minutes).** Turn off style points and most VFX. Let tester invent three sequences, including one that hits a second enemy. If players use a fixed auto-combo without making decisions, increase meaningful directional choices rather than adding attack effects.

**Session C: Pressure (10–15 minutes).** Add three light rushers, then one armored foe. Observe whether attacks are interrupted too often or whether enemies never threaten the player. Tune telegraphs, token cap, and dodge recovery before enemy damage.

**Session D: Dominant-strategy hunt (10–15 minutes).** Ask tester to deliberately exploit the game. Try endless pistol fire, dodge spam, shotgun only, repeated launch, corner bounce, and safe kiting. Document which strategy beats all others and why. Change one relevant variable at a time.

**Session E: Controller and accessibility (later).** Verify target choice and movement under a stick. Offer an aim-assist slider rather than making mouse and controller use identical assistance. Test reduced screen shake and flashes without losing reaction clarity.

For every session record: `build_version`, `arena_seed`, `settings`, `successful/failed sequence`, `player confusion`, and **one most important fix**. Video capture is preferable if available, but do not block testing on it.

# 22. Copy-Paste Build Brief for Codex

> **Task:** Implement a minimal Godot 4.x PC-first top-down arena prototype of a stylish gunfighter. Read this entire document before coding. Do not invent a more conventional shooter, automatic combo system, reload-survival loop, or heavy aim-locking system. Prioritize precise input, predictable reactions, and player-authored combos.
>
> **Milestone 1:** Create player WASD movement, mouse aim, dash, dummy enemy, walls, debug overlay, and reset. Use simple shapes. No custom art dependency.
>
> **Milestone 2:** Build data-driven `AttackData`, `HitEvent`, `CombatResolver`, clean hitscan and one-hit-per-target safeguards. Implement pistol tap.
>
> **Milestone 3:** Build pseudo-Z launch/sustain/landing and a short-range launcher, limited juggle sustain, shadow/height indicator. Keep the actual collision footprint grounded. Add explicit reaction state debug.
>
> **Milestone 4:** Implement shotgun standard and directional knockback, weapon switching, cancel windows, and 100 ms input buffering. Make a deliberate launcher → pistol sustain → shotgun follow-up possible.
>
> **Milestone 5:** Add one wall bounce and controlled enemy-to-enemy collision with strictly limited propagation and no duplicate hit events.
>
> **Milestone 6:** Add a telegraphed rusher and a small crowd director to test the mechanics under pressure. Do not add extra weapons until these mechanics pass tests.
>
> **Quality requirements:** Expose combat values as Resources/exports; avoid scripts that own targeting, movement, hit resolution, and reaction together. Use Godot 4's supported APIs. Provide a control legend and test instructions. Print or display attack ID, target, hit state, enemy height and reaction. Include automated tests for pure calculation logic where practical. Treat the numerical defaults as tuning suggestions and label any deviations. Do not present unverified DMC animation timings or mechanics as measured facts.
>
> **Before declaring completion:** Demonstrate the baseline combo in an arena and run all acceptance tests for the implemented milestone. Report precisely what is implemented, what remains a stub, and what is known to be broken.

# 23. DMC Research Basis and What Is Original

The design intentionally separates **observed DMC-inspired principles** from **new mechanics recommended for this game**.

| DMC-inspired principle | Original adaptation in this specification |
|---|---|
| Dante's Ebony & Ivory provide gunfire that can support aerial combos and frequent transitions. | Two properties on a basic pistol: tap fire and state-aware air sustain with a limited sustain budget. |
| Dante's shotgun has close-range and movement-oriented special attacks (e.g., Gun Stinger / Cut-ins). | Directional blast, captured-trajectory dash blast, and recoil-vector mobility in top-down. |
| Lady has a strongly firearm-centered style, launch-capable gun moves, and close-range shotgun control. | Gun-only launcher accessible as a core action, plus gun-focused role separation. |
| Nero's Blue Rose uses charge and delayed impact effects. | One-charge mark object with a controlled, testable delayed explosion and stacking policy. |
| DMC's style systems favor varied play and chaining. | Interaction-based style awards for collisions and wall follow-ups, with bounded repetition rewards. |
| DMC's hit reactions and cancels allow player-built sequences. | Modular hit resolver, explicit cancel windows, controlled pseudo-Z and horizontal body impacts. |

**Not asserted as literal DMC mechanics:** enemy-to-enemy body collision propagation, prescribed top-down wall bounce rules, the exact attack token AI director, the recommended input map, all numerical tuning values, the pseudo-Z system, and all provided GDScript architecture. Those are deliberate proposals for an original game.

For further verification of DMC move behavior before animation or control tuning, consult the already discussed reference material:

- *DMC5 Dante Firearms and SDT Movelist*, DMC Wiki: https://dmc.wiki/dmc5:chapters:nero_dante_v_info:dante_fire_arms_sdt
- *DMC5 Dante Guide*, BK Brent: https://bkbrent.com/dmc5/dante/
- *DMC5 Full Dante Gameplay Guide* video: https://www.youtube.com/watch?v=Nv158AdWtJY
- *DMC4 Special Edition: Lady Complete Moveset* video: https://www.youtube.com/watch?v=GCtlwotpCCs
- *Capcom TV Dante Combat Showcase*: https://www.youtube.com/watch?v=PSnXZXy1Ftk

This specification should be maintained as a living document. When a move feels wrong, record the observed failure, change one measurable property, retest the minimum combo, and only then update the value above.

# 24. Optional Move-by-Move DMC Translation Guide

The core weapon kit is intentionally small. This section records **additional firearm techniques from the DMC research** so none are lost when implementing later milestones. The names below identify references for comparison; use original names, animations, assets, and exact input sequences in your own released game. Entries are proposals for adapting functions, not claims of one-to-one behavior.

## 24.1 Dual-pistol variants

| Reference move / feature | Original implementation proposal | Trigger idea | Dependency and acceptance |
|---|---|---|---|
| **Ebony Shot**: stronger individual shot | Precision control shot with increased stagger, a short commit, and single-target impact. It does not replace the existing charged explosive mark. | Aim + precision modifier + tap, or a dedicated unlock. | Requires poise rules. A light foe visibly staggers; an armored foe shows resistance. |
| **Ivory Shot**: quick burst | Fixed three-round burst with independent fire ticks, limited target tracking, and one brief stagger result per short burst. | Fire while a “burst mode” modifier is held, or an alternate pistol special. | Requires event scheduling during attack ACTIVE. Three discrete shots, no accidental six-hit damage. |
| **Twosome Time**: multi-directional fire | Fire from two muzzle origins in two distinct, player-understandable directions. For top-down, use fixed angles around main cursor direction (e.g., ±25°); **do not silently auto-target the entire arena**. | Hold alternate stance and LMB. | Requires two hit queries and cone readability. A target outside both lanes is not struck. |
| **Honeycomb Fire**: sustained rapid barrage | A committed channeled attack with increasing shot density but restricted movement and poise-resistant enemies that can threaten it. No infinite stun loop. | Hold a special pistol command; release to exit. | Requires repeated active-fire ticks and channel cancellation. The move cannot dominate safe long-range damage. |
| **Rainstorm**: airborne firing spin | For top-down, use a short-lived controllable spinning barrage while crossing or leaping a group. It attacks nearby enemies and permits modest steering. In 3D, use real aerial height and downward aim. | Aerial modifier + special, after player jump exists. | Requires player aerial state, crowd targeting, camera readability. Do not implement as long uninterruptible animation. |

**Priority:** Precision shot and three-round burst only after core pistol/shotgun switching works. Twosome Time and Honeycomb Fire are later experiments; Rainstorm should wait for a demonstrated need for player airborne combat.

## 24.2 Shotgun and movement variants

| Reference move / feature | Original implementation proposal | Trigger idea | Dependency and acceptance |
|---|---|---|---|
| **Gun Stinger**: advancing close-range shotgun attack | Dash blast already specified: commit to a short approach vector, then fire at a defined attack frame. | Dash + shotgun fire. | Requires dash trajectory, collision, attack window. No teleport/homing on moving target. |
| **Cut-ins**: direction-changing continuation | After a successful dash blast, let player select a short left/right/away reposition during late recovery. Preserve momentum and risk. | L/R movement command during follow-up window. | Requires follow-up state and one continuation budget. Cannot chain infinite free evasions. |
| **Fireworks**: spinning shotgun crowd attack | Close-radius area attack with a controlled rotating muzzle sweep, causing brief stagger to multiple nearby foes. Use timed radial rays or a short circular overlap; damage only during active arc. | Shotgun + area special (later). | Requires multi-target aggregation. One spin does not repeatedly stagger the same target every frame. |
| **Backslide**: rearward shot | Fire a short-range blast opposite character-facing/aim facing while maintaining or starting a backward movement beat. Keep the direction visually explicit. | Shotgun + backward move + special. | Requires directional action recognition. Attack fires rearward intentionally, not based on arbitrary enemy proximity. |
| **Ground Zero / recoil**: recoil-based retreat | Recoil shot already specified: fire and propel player backward/diagonally; direction has a limited steering envelope. | Shotgun recoil command. | Requires PlayerMovement impulse and wall-safe slide. Recoil destination is predictable. |

**Priority:** Dash blast first, then recoil, then optional Cut-ins. Fireworks and Backslide are interesting only if group positioning makes them meaningfully different from ordinary shotgun fire.

## 24.3 Lady and Nero reference translations

| Reference move / feature | Original implementation proposal | Dependency and acceptance |
|---|---|---|
| **Lady Two Hand**: firearm-centered launcher | Already specified as a close-range launcher with independently controlled follow-up shots. | Air state and `Q` attack; launch → sustain → redirect works. |
| **Lady weapon-range specialization** | Pistols remain flexible; shotgun controls close-range; a future launcher/missile weapon trades responsiveness for area impact. | No gun should win equally at long range, close range, control, and safety. |
| **Lady Rush Hour**: shotgun advance | Use dash blast, keeping active firing and movement on a single timeline. | Input can be canceled only in documented windows. |
| **Nero Color Up**: stronger loaded ammunition | Optional “prepared shots” stock of up to three that increases reaction type/damage for the next selected pistol shots. Keep preparation separate from delayed mark status. | UI must clearly show loaded count; spent ammo is consumed exactly once on valid attack fire. |
| **Nero delayed Charge Shot** | Charged pistol shot applies a timed mark and a later explosion. | Mark survives weapon switching; death and stacking policies execute exactly once. |

## 24.4 Why the moves must remain optional

Adding all of these moves immediately would create a tuning problem: six overlapping ways to stagger an enemy, multiple unclear special inputs, and too many sources of defensive mobility. Each move should pass a **differentiation test** before being accepted: (1) What decision does it add? (2) What counterplay does it create? (3) Why does it coexist with the other attacks? (4) Is its effect readable in top-down? (5) Does it break the existing combo and AI tests?

Introduce at most **one** additional move per playtest cycle. If its best use is identical to an existing move, redesign it or cut it rather than keeping it simply because it looks like DMC.