"""Build loopguild/index.html from the template and the embedded sprite data.

Run from anywhere:  python3 loopguild/src/build.py
"""
import json, pathlib

here = pathlib.Path(__file__).resolve().parent
src = (here / "loopguild.src.html").read_text(encoding="utf-8")
sprites = json.loads((here / "sprites.json").read_text(encoding="utf-8"))
page = src.replace("/*SPRITES*/{}", json.dumps(sprites))

# The template starts with head content (title, fonts, style) followed by body markup.
head, body = page.split("</style>", 1)
out = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + head + "</style>\n</head>\n<body>" + body + "\n</body>\n</html>\n"
)
(here.parent / "index.html").write_text(out, encoding="utf-8")
print("wrote", here.parent / "index.html", len(out), "bytes")
