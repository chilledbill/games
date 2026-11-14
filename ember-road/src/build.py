"""Build ember-road/index.html from the template and the Puny Characters sprite strips.

Run from anywhere:  python3 ember-road/src/build.py

The sprites come from loopguild/src/sprites.json (strips cut from the Puny Characters
sheets: row 0 faces right, row 1 faces left). Only the sheets Ember Road uses are embedded.
"""
import json, pathlib

here = pathlib.Path(__file__).resolve().parent
src = (here / "ember-road.src.html").read_text(encoding="utf-8")
all_sprites = json.loads((here.parent.parent / "loopguild" / "src" / "sprites.json").read_text(encoding="utf-8"))

USED = [
    "Warrior-Red", "Archer-Green", "Mage-Cyan", "Mage-Red", "Soldier-Yellow", "Archer-Purple",
    "Slime", "Orc-Peon-Cyan", "Orc-Peon-Red", "Orc-Grunt", "Orc-Soldier-Cyan", "Orc-Soldier-Red",
]
sprites = {k: all_sprites[k] for k in USED}

marker = "/*SPRITES*/{}"
assert src.count(marker) == 1, "sprite marker missing from template"
out = src.replace(marker, json.dumps(sprites))
(here.parent / "index.html").write_text(out, encoding="utf-8")
print("wrote", here.parent / "index.html", len(out), "bytes")
