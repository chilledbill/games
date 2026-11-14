# Loopguild

A pixel-art dungeon incremental where you command several squads at once. Each squad runs its own 8-room dungeon loop (skirmishes, treasure, elite, shrine, boss) on its own, while you fire hero skills, choose relics and shrine blessings, and spend a shared pool of gold. Clear stages for Honor, then spend it in the Honor Shop on permanent upgrades, new heroes, more squads, Autopilot and a Quartermaster.

Open `index.html` in a browser. Progress saves in `localStorage`.

## Controls

- Click or tap a hero card to use its skill. Keys: squad 1 `1`-`5`, squad 2 `Q`-`T`, squad 3 `A`-`G`, squad 4 `Z`-`B`. `Space` pauses.
- Each squad panel has Prev/Next (change dungeon) and a mode button: Push (advance after a clear), Farm (repeat), Loop (repeat harder).

## Editing

`index.html` is generated and self-contained (sprites are embedded as base64). Edit `src/loopguild.src.html`, then run:

    python3 loopguild/src/build.py

`src/sprites.json` holds the embedded sprite strips (rows for facing right and facing left, cut from the Puny Characters sheets).
