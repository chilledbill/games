# Martial Idler: taskbar overlay

A thin Electron wrapper that shows the game as a transparent strip along the bottom of your screen.

## Run it

Keep `overlay/` next to `index.html`, `content.js`, `sim.js` and `editor.js` (the wrapper loads `../index.html`, which loads the others), then:

    cd overlay
    npm install
    npm start

`npm install` downloads Electron (roughly 100 MB). It is only needed for this wrapper; the game itself runs in any browser.

## What it does

- Transparent, frameless window along the bottom of the work area, just above the taskbar.
- Always on top, hidden from the taskbar, and **click-through** so it never blocks your work.
- Loads the game with `?overlay=1`: no menu, no temple backdrop, Auto on (Hero buys upgrades and keeps fighting).
- Progress is saved in the app's local storage, and offline progress still applies when you reopen it.

## Keys

| Keys | Action |
|---|---|
| Ctrl+Alt+O | Toggle interactive mode (clicks reach the game: click enemies to dash and parry, Hero for the Focus blast) |
| Ctrl+Alt+Q | Quit |

## Try the overlay layout in a normal browser

Open `index.html?overlay=1`. (The page background will not be transparent in a normal tab; that part needs Electron.)

## Notes / not done yet

- Not tested on multi-monitor setups; it uses the primary display.
- The three.js libraries are loaded from a CDN, so the first run needs internet.
- To tweak the strip height, change `STRIP_HEIGHT` in `main.js`.
