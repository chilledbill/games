# Characters PackV2

Extracted from the user-supplied `Characters PackV2.rar`, preserving original names and PNG bytes. 54 sprite sheets: 27 WarriorMan and 27 WarriorWoman. WarriorMan uses 64×64 frames; WarriorWoman uses 80×64 frames. Both are horizontal strips, facing right; standing feet are at pixel Y=48. `manifest.json` records dimensions, frame counts and SHA-256 hashes for every sheet.

The archive included only PNGs, with no license, author metadata or animation timing file. No attribution or usage terms have been invented.

The player uses WarriorMan and AI opponents use WarriorWoman. Unused animations remain available in their original folders. `src/sprites.js` maps gameplay states to twelve selected sheets for each character and aligns strike frames to logical startup/active/recovery. Frame pacing is derived from combat timing, not supplied animation metadata. Ground dodge uses Slide, sweep uses CrouchAttack; launcher/relaunch/plunge/charge reuse available attacks because the pack has no dedicated sheets for these moves. Physics and collision remain independent of image size.

`tools/package-offline.py` embeds the 24 selected PNGs from both characters as data URLs in `Skyline-Play.html`. Other extracted PNGs remain in the project but do not increase the offline game's size.
