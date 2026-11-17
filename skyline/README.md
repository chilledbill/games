# Skyline Combat Lab

Touch-first 2D side-view sword-combat prototype (Canvas 2D, no dependencies).
Fight a WarriorWoman AI rival with combos, launch/chase, air juggles, Enemy Step,
dodge/perfect-dodge counters and hold-to-Block.

- **Play:** open `index.html` in a browser. It is one self-contained file with all
  sprites embedded, so it works offline and needs no server.
- **Controls:** Attack / Jump / Dodge / Block (keyboard: `J` / `Space` / `K` / hold `L`,
  move with `A`/`D`, `W` = launch modifier). Full details in `HANDOFF.md`.
- **Handoff notes:** `HANDOFF.md` describes the design, mechanics, tuning and history.

## Source

The modular source lives in `source/` (ES modules, tests, packager, original sprite sheets).

```sh
cd source
npm test            # 81 tests
npm run check       # syntax-check every module
npm run build       # regenerates ../index.html (the single file GitHub Pages serves)
```

Edit `source/`, then run `npm run build` and commit both. Do not hand-edit `index.html`.

## Controls (Milestone 4)

Attack / Jump / Dodge / Block, plus **Rising Phoenix**: hold **↓** with the left thumb, then press **B**
(keyboard: `I`, or hold `S` and press `L`). A plain Block press still guards; Skill never falls back to Block or Dodge.
7 s cooldown shared by ground and air versions. Hits fill **Focus**; with full Focus, keep holding that same Skill press
through the first Phoenix hit for **Phoenix Break**. **Style** rank (D to SS) is feedback only. Help has control size,
opacity and reduced-effects settings, saved in the browser.
