# REACH — Combo Mechanics Lab

Standalone HTML game for GitHub Pages. This folder contains the latest implemented playable version from the conversation (PC hover soft-lock, fast strike chains, launch, blast, air slam, enemy collisions, perfect evade, camera zoom, feel sliders and milestone tracker).

## Install in the local repository

Extract/copy this **RangeMelee** folder into:

`C:\Users\load2\Documents\Claude-KHlike\incrementalgame\incrementalgame\RangeMelee`

The file must be at:

`C:\Users\load2\Documents\Claude-KHlike\incrementalgame\incrementalgame\RangeMelee\index.html`

If a `RangeMelee` folder already exists, copy the files **inside** it rather than creating `RangeMelee\RangeMelee`.

## Test locally

Open `index.html` in a modern browser with WebGL enabled. No installation, network connection, package manager, build tools or dependencies are required.

## Publish with GitHub Pages

1. Commit `RangeMelee/index.html` to the branch being published by GitHub Pages.
2. In your GitHub repository, select **Settings > Pages** and publish the branch from the repository's root (`/(root)`) if that's where your Pages site is deployed.
3. If that Pages deployment publishes the repo root, the game's URL will be:

   `https://YOUR-USERNAME.github.io/YOUR-REPO/RangeMelee/`

If your repo instead uses a `/docs` publishing source or a GitHub Actions workflow that publishes only a particular folder, the `RangeMelee` folder must be included in that published site output. GitHub Pages branch deployment doesn't offer an arbitrary subfolder such as `/RangeMelee` as its publishing source.

## PC controls

- WASD: move
- Mouse hover: target an enemy; soft-lock persists over empty space
- Left mouse: strike / hold to combo
- Right mouse: launch
- E: blast
- F: air slam
- Space: dodge / perfect evade
- Esc or P: pause and adjust settings

Mobile touch support is retained. In-game milestones help evaluate the combat mechanics.
