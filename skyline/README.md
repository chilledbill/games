# Skyline Combat Lab

Touch-first 2D side-view sword-combat prototype (Canvas 2D, no dependencies).
Fight a WarriorWoman AI rival with combos, launch/chase, air juggles, Enemy Step,
dodge/perfect-dodge counters and hold-to-Block.

- **Play:** open `index.html` in a browser. It is one self-contained file with all
  sprites embedded, so it works offline and needs no server.
- **Controls:** Attack / Jump / Dodge / Block (keyboard: `J` / `Space` / `K` / hold `L`,
  move with `A`/`D`, `W` = launch modifier). Full details in `HANDOFF.md`.
- **Handoff notes:** `HANDOFF.md` describes the design, mechanics, tuning and history.

## Source status

`index.html` is the generated release build. The original modular source
(`src/*.js`, `style.css`, `tools/package-offline.py`, `tests/`, `assets/Characters PackV2/`)
described in `HANDOFF.md` lives in the Codex workspace and is **not yet in this repo**.
Until it is added, edit `index.html` directly; its script is the concatenated modules.
