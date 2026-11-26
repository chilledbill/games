# Holdfast changelog

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
