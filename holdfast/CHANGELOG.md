# Holdfast changelog

## v0.9 — Mobile pacing
- v0.8 feedback: too aggressive to switch targets on mobile. Only one active windup at once, 1.50s minimum telegraph and 1.55x original windup duration (heavy 1.922s, feint 2.2165s). Global 1.4s breathing room after any attack resolves, is interrupted, or its attacker dies; eligible attackers rotate through slots. Initial wave grace 0.9s. No immediate replacement attack after stagger/parry/kill. Larger nearest-enemy touch radius (min 50px).
- Three enemies, directional guard, combos, posture, half damage, healing, parry timing and player cooldowns unchanged. No skill added. 15 deterministic DOM-stub checks passed, including sustained minimum spacing, rotated attacks, and parry after switching. Actual phone feel and Pages deployment not verified.

## v0.8 — Surrounded arena
- Separate versioned arena; v0.7 remains playable. Fixed central player, 3 enemies in distinct positions, tap living enemy to select/facing (PC 1/2/3). Committed swings lock their victim; next attacks follow selection, including light combos across targets. Guard/parry only covers selected enemy; switch while guarding without refreshing parry timing. Auto-select living enemy after kill. Kill cancels buffered attacks.
- Independent HP, posture, stagger, shield and enemy attack timers. Up to two simultaneous windups; prospective impacts spaced by >=0.70s. Clear all three to spawn next group after 0.8s. Mixed and basic practice modes. Prior v0.7 health damage, healing, posture and recovery preserved. No skills yet; no player movement.
- Overhead arena, facing arrow, selected ring, enemy-local health/posture, windup lines and countdown, threat cue. Export tracks target switches, off-target hits, waves and max simultaneous windups, enemy IDs on events. 18 DOM-stub checks passed. Mobile controls and actual browser visual rendering not verified.

## v0.7 — Half player health damage
- All outgoing health damage multiplied by 0.5 after opening, combo, shield and posture bonuses. Exact half HP increments retained; telemetry reports actual scaled damage and bonus contributions. Light 13→6.5, shielded light 3→1.5, perfect 39→19.5, overcharge 45→22.5, triple bonus 8→4, posture punish bonus 25→12.5.
- All posture damage, decay, break duration, enemy HP, incoming damage, healing, controls and attack recovery unchanged. Isolate whether enemies survive long enough to exploit posture.
- 13 deterministic DOM-stub checks passed; mobile feel and live Pages not verified.

## v0.6 — Enemy posture
- Gold posture meter fills from light 8, light finisher 15, shielded light 5, heavy 24, perfect 32, overcharge 36, parry 32. Enemy maxima: swordsman 42, shield 50, assassin 34, berserker 60, duelist 46, captain 95. Decay 9/s after 1.5s without posture hits.
- Full posture cancels current enemy action, including armored windup, and creates a 2.2s broken state. Light damage continues but does not extend the opening or build posture. First charged heavy hit in the window receives +25 damage (capped by remaining HP), consumes opening, resets posture. Normal heavy cooldown remains. A heavy that causes the break is not itself a punish. Unused opening expires and resets posture. Shield temporarily exposed while broken; a heavy punish removes shield.
- Added kneeling pose, gold ground ring, break/finish impact, sound, countdown meter, Heavy button highlight, posture telemetry by source and enemy, break/punish counts and expired openings. Existing health, healing, attack inputs and enemy moves unchanged. Guard Endurance not implemented.
- 27 deterministic DOM-stub checks passed; live mobile feel and Pages not verified.

## v0.5 — Separate Light / Heavy
- Three buttons: Guard, Light, Heavy. Light fires on tap/press; hold does not repeat. Heavy requires 0.30s charge then release; early release cancels. Perfect charge window and overcharge preserved. Keyboard Z/C/X.
- Light has a three-strike chain, short 0.12s animation link after first two strikes (no attack cooldown), third strike 0.65s recovery with +8 damage on a completed unblocked combo. Whiffs advance chain to preserve third-strike commitment. Single buffered next input during light animation; finisher buffer only in last 0.10s.
- Charged heavy ends a chain early or acts alone; 0.80s normal, 0.50s perfect, 1.20s overcharge. Removed separate Armor Breaker / Riposte recipe bonuses to simplify; normal heavy still breaks shields and parry still creates opening. Guard and damage cancel queued inputs; guard may cancel charging or light links.
- Enemy stats, healing, parry and anti-stunlock rule unchanged. Guard Endurance still planned. Export records heavy taps and chain enders.
- 29 deterministic DOM-stub checks passed; live Pages and touch feel not verified.

## v0.4 — Combo flow
- Quick starters and second strikes recover in 0.25s; Triple Slash 0.65s, Armor Breaker 0.90s, Riposte 0.60s. Regular heavy/perfect/overcharge remain 0.80/0.50/1.20s. Overcharge retains 1.20s even as a finisher; whiffed non-finisher quick attacks retain 0.45s.
- Single input buffer in final 0.10s of attack recovery; held input starts charging only after recovery, released input queues a quick attack. Guard or damage cancels queued attack. No early execution.
- Relaxed combo continuation window to 1.0s after recovery; riposte window 1.0s after prompt guard release. Finishers reset chain. Damage, guard, miss, timeout reset chain; committed finisher recovery is not shortened by interruption.
- HUD shows queued input; export tracks accepted/executed/canceled buffers and recovery per attack. Enemy stats, healing, parry and anti-stunlock rules unchanged; Guard Endurance still planned.
- 23 deterministic DOM-stub checks passed; live deployment and mobile feel not yet verified.

## v0.3 — Player combos
- Quick → Quick → Quick: +8 damage on unblocked final hit.
- Quick → Quick → any charged release: +5 damage and stronger stagger (0.8s when stagger is allowed); shield contacts can build the chain.
- Parry → any charged release: +12 damage.
- Chain input window 0.45s after recovery; riposte 0.7s after successful parry recovery (assuming prompt guard release). Start charging within the window; damage, guard, miss, timeout, or enemy defeat resets the sequence. No cooldown bypass.
- On-screen combo sequence, timing meter, finisher effects, result counts and JSON telemetry.
- Existing enemy behavior, healing (10 HP), attack and parry cooldowns unchanged. Guard Endurance remains planned, not implemented.
- 13 deterministic DOM-stub logic checks passed. Live Pages and mobile touch feel not yet verified.

## v0.2 — Attack commitment
- Quick/heavy/perfect/overcharge recovery 0.45/0.80/0.50/1.20s; failed parry 0.60s, successful 0.15s.
- Guard available halfway through attack recovery; successful parry clears attack lock. One quick interrupt before enemy retaliation. Recovery telemetry.
- Player confirmed the cooldown reduced spam in a v0.2 test: 13 kills, 187 damage taken, 38 HP after 85s.

## v0.1 — Initial combat lab
- Auto approach, manual quick/charged/perfect strikes, tap parry/hold block, six enemy types, two-minute test modes and JSON export.
