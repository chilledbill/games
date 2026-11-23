# REACH // DMC-inspired Gun Combat Experiment

This branch tests stylish gun-combat principles in the existing **LongMelee** 3D browser game. The original melee version remains on `main`.

## Play

Open `index.html` in a desktop browser, or host the `LongMelee` directory with GitHub Pages. The prototype uses a single HTML file with no build process or dependencies.

## Controls

| Input | Action |
|---|---|
| WASD | Move |
| Mouse hover | Acquire a sticky soft-lock target; hovering another opponent switches targets |
| Left click / hold | Fire current weapon |
| Right click or Q | Launch selected enemy |
| 1 / 2 | Switch pistols / shotgun |
| E | Directional blast |
| F | Aerial slam |
| Space | Dodge |
| Esc / P | Pause / settings |

## Experiment

The goal is a player-authored sequence:

**Launch → sustain an enemy in the air with pistols → switch to shotgun → redirect into a wall or another enemy.**

Pistols emphasize frequent shots and sustaining the target; the shotgun emphasizes stronger single hits and displacement. Collision rules and in-game combat milestones help evaluate the loop. Existing 3D camera, adjustable feel settings, and PC hover targeting are retained. Settings are saved in the browser separately from the original REACH melee experiment.

See [Stylish Gun Combat Implementation Spec](docs/Stylish_Gun_Combat_Implementation_Spec.md) for the broader design and test goals. Its original 2D Godot assumptions have been adapted to this 3D WebGL prototype.

This is a **focused first experiment**, not a complete DMC-style combat system or a faithful reproduction of Devil May Cry assets or move timing. Manual hitscan aim, extensive poise profiles, delayed charge shots, and full cancel tables are not included yet.
