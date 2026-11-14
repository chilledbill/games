# Puny Characters sprites: handoff for new games

Read this before building a game with the Puny Characters pixel art. It records how the sheets are laid out, which frames are which, and how Loopguild uses them, so you do not have to rediscover it.

## Where the files are

- **In this repo:** `assets/puny-characters/*.png` (20 sheets with their original names, plus two reference images).
- **Original pack on the owner's PC:** `D:\claudegames\pixelasset\Puny-Characters` (this folder had an `Environment` subfolder with tiles, which has not been looked at).
- **Already cut and embedded for web use:** `loopguild/src/sprites.json` maps sheet name to a base64 PNG data URI. Each character strip is 768x64 and holds only two rows of the full sheet (row 2, facing right, on top; row 6, facing left, below). Slime is the full sheet. `loopguild/src/build.py` shows how it is injected into a single HTML file.
- **License:** the pack is a third-party asset. Check its license before making this repo public, because `index.html` files embed the art.

Open `assets/puny-characters/reference-all-frames-Warrior-Red.png` to see every frame with its column and row numbers. `reference-row2-facing-right-Warrior-Red.png` is the same for the right-facing row at larger scale.

## Sheet format

- Every character sheet is **768x256 px**: **24 columns x 8 rows** of **32x32** frames. All character sheets share one layout, and every sheet has every animation.
- The character stands in the lower part of the frame. **The feet are at about y = 29** inside the 32 px frame, so anchor drawing at the feet: `dy = footY - 29`.
- The art is only about 16 px wide and 25 px tall, so characters look small. Scale up with integer factors and turn off image smoothing (`ctx.imageSmoothingEnabled = false`, and `image-rendering: pixelated` in CSS).
- Backgrounds are transparent.

### Rows (facing direction)

| Row | View |
|---|---|
| 0 | front (facing the camera) |
| 1 | front, turned toward the right (3/4) |
| **2** | **right profile (faces right)** |
| 3 | back, turned toward the right (3/4) |
| 4 | back (facing away) |
| 5 | back, turned toward the left (3/4) |
| **6** | **left profile (faces left)** |
| 7 | front, turned toward the left (3/4) |

Rows 0, 2, 4 and 6 were checked closely. The diagonal rows (1, 3, 5, 7) are 3/4 views; which side each leans toward was read off the reference image, so confirm before relying on them. For a side-on battle scene, use **row 2 for the player side, row 6 for enemies**.

### Columns (animation frames)

| Columns | What they show |
|---|---|
| 0-3 | walk cycle (column 0 is also the standing idle pose) |
| 4-5 | melee wind-up, weapon raised |
| 6 | slash effect, a white arc (draw it as the hit moment) |
| 7 | thrust / stab |
| 8-11 | bow: nock, then draw and hold |
| 12-14 | staff / magic: raise (12-13), then thrust forward with an orb (14) |
| 15-18 | extra stance frames (alternate standing poses). Their exact use was never confirmed, so look at them first |
| 19 | **solid white silhouette: use as the hit flash** (1-2 frames, about 0.08 s) |
| 20 | hurt face (mouth open) |
| 21 | neutral standing |
| 22-23 | lying on the ground: use as the **death / knocked-down** frame |

Held items (sword, bow, staff, orb) are drawn into the frames, and the art differs a little per sheet. Classes are not locked: any sheet can swing, shoot and cast, so a "Warrior" sheet is only a look. Check a sheet's frames before assuming what it carries.

## Slime (`Slime.png`)

- 480x32, one row of **15 frames** of 32x32. Facing is not an issue.
- Frames 0-5: a bounce (squash at 1-2, stretch up to 5). 7-8: landing. 6 and 9: white flash (hit). 10-14: death burst.
- Hop idle used in Loopguild: `[0,1,2,3,4,5,7,8]`. Attack lunge: `[2,3,4,5]`.

## The sheets

Heroes and humans: `Warrior-Red`, `Warrior-Blue`, `Soldier-Red`, `Soldier-Blue`, `Soldier-Yellow`, `Human-Soldier-Red`, `Human-Soldier-Cyan`, `Archer-Green`, `Archer-Purple`, `Mage-Red`, `Mage-Cyan`, `Human-Worker-Red`, `Human-Worker-Cyan`, `Character-Base` (plain unarmored body, good as a blank template).

Enemies: `Slime`, `Orc-Peon-Red`, `Orc-Peon-Cyan`, `Orc-Grunt`, `Orc-Soldier-Red`, `Orc-Soldier-Cyan`.

Colour suffixes (Red, Cyan, Blue, ...) are team or palette variants of the same layout.

## How to draw a frame (canvas)

```js
const FW = 32;
// sheet = loaded Image of a full 768x256 sheet
function drawFrame(ctx, sheet, col, row, footX, footY, scale = 1, alpha = 1) {
  const w = FW * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(sheet, col * FW, row * FW, FW, FW,
    Math.round(footX - w / 2), Math.round(footY - 29 * scale), w, w);
  ctx.globalAlpha = 1;
}
```

With Loopguild's cut strips (768x64), the player side is row 0 and the enemy side is row 1 of the strip.

Animation tables used in Loopguild:

```js
const WALK  = [0, 1, 2, 3];      // loop at ~9 fps
const MELEE = [4, 5, 6, 7];      // hit lands about half way
const BOW   = [8, 9, 10, 11];    // release the arrow on the last frame
const MAGIC = [12, 13, 14];      // spawn the orb on the last frame
const FLASH = 19;                // hit flash
const DEAD  = 22;                // fade out while lying down
```

For a CSS portrait, use the sheet as a `background-image` with `background-size: 1536px 128px` (2x) and `image-rendering: pixelated`. Position `0 0` gives the front-facing idle, `0 -64px` on a strip gives the left-facing row.

## Tips and traps

- Turn smoothing off, or the pixel art blurs when scaled.
- Make big enemies by drawing the same frame at `scale` 1.3 to 1.8; the feet anchor keeps them on the ground.
- Draw a soft shadow under each unit and sort units by foot `y` so rows overlap correctly.
- Layering frame 19 over any unit for a few frames is a cheap, readable hit effect.
- Slime and the other sheets use different file sizes, so give them separate loading code.
- For left-facing units, use the real row 6 rather than flipping row 2 (Loopguild does this and it reads well).

## Loopguild reference

`loopguild/src/loopguild.src.html` is a full working example: the hero and enemy tables, the draw functions (`drawHero`, `drawEnemy`, `frame`), projectile art (arrows and orbs are drawn in code, not sprites), and the dungeon background, which is drawn procedurally. The background tiles in the pack's `Environment` folder have not been used.
