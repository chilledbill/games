# Ember Road

A portrait, mobile-first side-scrolling idle RPG. Your party walks right and fights on its own. Spend gold on upgrades, beat each stage's boss within 30 seconds, and grow from one Knight to a party of six.

Open `index.html` in a browser. Progress saves in `localStorage`.

## Party

| Member | Joins at | Row | Ability |
|---|---|---|---|
| Knight | start | Front | Shield Bash: 5x hit and a 2 s stun |
| Archer | Stage 10 | Back | Arrow Rain: 8 arrows from the sky |
| Healer | Stage 25 | Back | Heal: heals and revives the front row |
| Mage | Stage 50 | Back | Meteor: 10x hit |
| Tank | Stage 75 | Front | Guard: party takes 75% less damage |
| Rogue | Stage 100 | Back | Shadow: 3 guaranteed critical daggers |

Enemies only hit the front row (Tank first, then Knight).

## Controls

- Tap the scene to hit enemies, even while they approach.
- Tap the round buttons to use abilities, or turn on Auto.
- Hold an upgrade button to buy repeatedly. The 1x/2x/3x button sets game speed.

## Editing

`index.html` is generated and self-contained. Edit `src/ember-road.src.html`, then run:

    python3 ember-road/src/build.py

The build embeds sprites from `loopguild/src/sprites.json` (Puny Characters strips: row 0 faces right, row 1 faces left). In these strips the feet sit at y = 23 in each 32 px frame (Slime: y = 20). All balance numbers are in the `C` block and the `UP` table near the top of the script.

## Roadmap

1. Core loop (done)
2. Stages, bosses, HP and armor (done)
3. First recruit (done)
4. Roles, recruits and abilities (done)
5. Gear drops, buy x10 / buy max, milestone bonuses
6. Offline progress
7. Rebirth (prestige)
8. Zones, ascension, relics, daily quests
