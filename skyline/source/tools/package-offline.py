"""Package native modules into one directly openable offline HTML file."""
from pathlib import Path
import re, base64, json, sys
root = Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
# Strip @import rules completely. The old pattern r'@import[^;]+;' stopped at the first ';'
# inside the Google Fonts URL and left 'family=...display=swap');' junk at the top of the CSS,
# which made browsers drop the first :root rule.
css = re.sub(r'@import\s+url\([^)]*\)[^;]*;', '', css)
css = re.sub(r'''@import\s+(["']).*?\1[^;]*;''', '', css)
for junk in ('@import', 'family=', 'display=swap', 'fonts.googleapis'):
    if junk in css:
        sys.exit(f'Packaging aborted: leftover {junk!r} in built CSS')
sprite_names = ['Block','Hit','Death','Idle','Run','Jump','Attack1','Attack2','Attack3','JumpAttack1','JumpAttack2','CrouchAttack','Slide']
sprite_data = {character+name: 'data:image/png;base64,' + base64.b64encode((root / f'assets/Characters PackV2/{character}/{character}{name}.png').read_bytes()).decode() for character in ['WarriorMan','WarriorWoman'] for name in sprite_names}
parts = ['globalThis.SKYLINE_SPRITE_DATA = ' + json.dumps(sprite_data) + ';']
for name in ['moves', 'skills', 'resources', 'style', 'combat-events', 'juggle', 'guard', 'enemy', 'buffer', 'game', 'input', 'sprites', 'render', 'settings', 'checklist', 'main']:
    source = (root / f'src/{name}.js').read_text()
    source = re.sub(r'^import .*?;\n', '', source, flags=re.M)
    source = re.sub(r'\bexport ', '', source)
    source = source.replace('import.meta.url', 'document.baseURI')
    if name == 'game':
        source = 'const T = TUNE;\n' + source
    parts.append(source)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = html.replace('<script type="module" src="src/main.js"></script>', '<script>\n(() => {\n' + '\n'.join(parts) + '\n})();\n</script>')
html = html.replace('<body>', '<body><div id="launch-status" style="position:fixed;z-index:100;inset:0;padding:24px;background:#14231c;color:#e5efd7;font:16px sans-serif">Opening game…<p>If this message stays visible, this viewer is not running JavaScript. Open the HTML in a web browser rather than a file preview.</p></div>')
html = html.replace('(() => {\n', '(() => {\ndocument.getElementById("launch-status").remove();\n')
# Default output is the file GitHub Pages serves: skyline/index.html (one folder above source/).
out = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root.parent / 'index.html'
if re.search(r'(?:src|href)=["\']?https?://|url\(\s*["\']?https?://', html) or '@import' in html:
    sys.exit('Packaging aborted: built HTML references an external URL')
out.write_text(html, encoding='utf8')
print(f'Created {out} — no server, network, or install required')
