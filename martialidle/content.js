/* Martial Idler content. Plain JSON after "window.CONTENT =". Edit by hand or with the in-game editor.
   Times are FRAMES at 60 per second (60 = 1 second) unless a field says seconds. */
window.CONTENT = {
  "version": 1,

  "settings": {
    "arenaX": 12, "zMax": 2.3,
    "hpGrowth": 1.13, "dmgGrowth": 1.09, "chiGrowth": 1.08,
    "waveBase": 4, "wavePerLevel": 1.4, "waveMax": 28, "maxAlive": 12, "spawnGap": 1.1,
    "bossEvery": 5, "bossNames": ["Tiger Master", "Crane Master", "Snake Master", "Iron Master", "Dragon Master"],
    "offlineBase": 600, "blastBase": 6,
    "fxDefaults": { "crit": "spark_crit", "block": "spark_block", "guardBreak": "guardbreak_fx", "heroHurt": "hero_hurt", "kill": "spark_chi" }
  },

  "hero": {
    "name": "Hero", "model": "hero", "props": [],
    "hp": 100, "damage": 5, "reach": 2.0, "move": 5.5,
    "combo": ["jab", "cross", "finisher"],
    "moves": {
      "jab":      { "name": "Jab",            "anim": "punch_left", "startup": 9, "active": 3, "recovery": 30, "damage": 1,   "knockback": 1.2, "hitstop": 2, "focus": 4, "onSwing": ["slash_white"], "onHit": ["spark_small"] },
      "cross":    { "name": "Cross",          "anim": "punch_left", "startup": 9, "active": 3, "recovery": 30, "damage": 1.1, "knockback": 1.5, "hitstop": 2, "focus": 4, "onSwing": ["slash_white"], "onHit": ["spark_small"] },
      "finisher": { "name": "Spinning Kick",  "anim": "strong_kick", "startup": 14, "active": 4, "recovery": 26, "damage": 2.2, "knockback": 5,   "stun": 36, "hitstop": 4, "focus": 4, "breakGuard": true, "finisher": true, "onSwing": ["slash_gold", "ring_gold"], "onHit": ["spark_big"] },
      "click":    { "name": "Dash Strike",    "anim": "kick_head", "damage": 1.5, "knockback": 1.8, "hitstop": 2, "focus": 8, "onSwing": ["slash_cyan"], "onHit": ["spark_small"] },
      "parry":    { "name": "Parry Counter",  "anim": "punch_left", "damage": 3,   "knockback": 5,   "stun": 78, "hitstop": 6, "focus": 20, "breakGuard": true, "parry": true, "onSwing": ["slash_cyan"], "onHit": ["spark_parry"] },
      "blast":    { "name": "Focus Blast",    "knockback": 5, "stun": 48, "hitstop": 7, "breakGuard": true, "onUse": ["blast_fx"], "onHit": ["spark_big"] }
    }
  },

  "attacks": {
    "jab_thug":    { "anim": "punch_left", "name": "Thug Jab",     "kind": "melee", "startup": 36, "active": 3, "recovery": 21, "cooldown": 78,  "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "jab_fast":    { "anim": "punch_left", "name": "Quick Jab",    "kind": "melee", "startup": 24, "active": 3, "recovery": 21, "cooldown": 60,  "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "heavy_swing": { "anim": "strong_kick", "name": "Heavy Swing",  "kind": "melee", "startup": 54, "active": 4, "recovery": 21, "cooldown": 126, "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "shield_bash": { "anim": "strong_kick", "name": "Shield Bash",  "kind": "melee", "startup": 48, "active": 3, "recovery": 21, "cooldown": 114, "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "staff_sweep": { "anim": "kick_head", "name": "Staff Sweep",  "kind": "melee", "startup": 51, "active": 4, "recovery": 21, "cooldown": 132, "damage": 1, "hitbox": { "offsetX": 0, "reachX": 3.9, "halfZ": 1.1 }, "telegraph": ["tg_pulse"] },
    "stab":        { "anim": "punch_left", "name": "Ninja Stab",   "kind": "melee", "startup": 27, "active": 3, "recovery": 21, "cooldown": 96,  "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "arrow_shot":  { "name": "Arrow Shot",   "kind": "projectile", "startup": 48, "active": 1, "recovery": 24, "cooldown": 144, "damage": 1, "speed": 14, "track": true, "trail": "#ffe9a0", "telegraph": ["tg_pulse", "tg_aim_line"], "onActive": ["shot_fx"] },
    "heal_pulse":  { "name": "Heal Pulse",   "kind": "heal", "startup": 42, "active": 1, "recovery": 24, "cooldown": 180, "heal": 0.3, "telegraph": ["tg_pulse", "tg_heal_link"], "onActive": ["heal_fx"] },
    "fuse_blast":  { "name": "Fuse Blast",   "kind": "burst", "startup": 33, "active": 1, "recovery": 0, "cooldown": 0, "damage": 1, "radius": 2.2, "zRadius": 1.3, "hitsHero": true, "hitsEnemies": true, "enemyDamage": 1.5, "knockback": 4, "selfDestruct": true, "telegraph": ["tg_pulse_fuse"], "onStart": ["fuse_ring"], "onActive": ["explode_fx"] },
    "death_blast": { "name": "Death Blast",  "kind": "burst", "startup": 0, "active": 1, "recovery": 0, "cooldown": 0, "damage": 1, "radius": 2.2, "zRadius": 1.3, "hitsHero": false, "hitsEnemies": true, "enemyDamage": 1.5, "knockback": 4, "onActive": ["explode_fx"] },
    "vanish_strike": { "name": "Vanish Strike", "kind": "teleport", "startup": 33, "active": 1, "recovery": 0, "cooldown": 300, "invisible": true, "behind": 1.4, "then": "stab", "onStart": ["smoke_puff", "smoke_warn"], "onActive": ["smoke_puff"] },
    "boss_melee":  { "anim": "strong_kick", "name": "Boss Strike",  "kind": "melee", "startup": 72, "active": 4, "recovery": 21, "cooldown": 144, "damage": 1, "hitbox": { "offsetX": 0, "reachX": 2.3, "halfZ": 0.7 }, "telegraph": ["tg_pulse"] },
    "boss_slam":   { "anim": "strong_kick", "name": "Ground Slam",  "kind": "burst", "startup": 84, "active": 2, "recovery": 36, "cooldown": 144, "damage": 1.5, "radius": 3.5, "zRadius": 2.0, "hitsHero": true, "hitsEnemies": false, "telegraph": ["tg_pulse", "tg_ground_ring"], "onActive": ["slam_fx"] },
    "boss_charge": { "name": "Bull Charge",  "kind": "charge", "startup": 60, "active": 30, "recovery": 60, "cooldown": 144, "damage": 1.2, "speed": 16, "track": true, "hitbox": { "offsetX": 0, "reachX": 1.0, "halfZ": 0.8 }, "telegraph": ["tg_pulse", "tg_path"] }
  },

  "effects": {
    "slash_white":  [ { "type": "slash", "color": "#ffffff", "size0": 0.5, "size1": 1.3, "stretch": 3,   "life": 8,  "y": 1.15, "offsetX": 1.0, "rot": 0.55 },
                      { "type": "sparks", "count": 3, "color": "#ffffff", "offsetX": 1.3 } ],
    "slash_cyan":   [ { "type": "slash", "color": "#9be8ff", "size0": 0.7, "size1": 2.0, "stretch": 3.4, "life": 11, "y": 1.2,  "offsetX": 1.0, "rot": 0.55 },
                      { "type": "ring", "color": "#7fe3ff", "max": 1.6, "life": 13, "y": 1.1, "offsetX": 1.2 },
                      { "type": "sparks", "count": 6, "color": "#9be8ff", "offsetX": 1.3 } ],
    "slash_gold":   [ { "type": "slash", "color": "#ffd24a", "size0": 1.0, "size1": 3.0, "stretch": 3,   "life": 14, "y": 1.2,  "offsetX": 1.1, "rot": 0.55 },
                      { "type": "slash", "color": "#ffffff", "size0": 0.5, "size1": 1.8, "stretch": 2.2, "life": 11, "y": 1.2,  "offsetX": 1.1, "rot": 0.55 },
                      { "type": "sparks", "count": 10, "color": "#ffd24a", "offsetX": 1.4 } ],
    "ring_gold":    [ { "type": "ring", "color": "#ffe9a0", "max": 3.5, "life": 19, "y": 0.9 } ],
    "spark_small":  [ { "type": "sparks", "count": 6,  "color": "#ffe9a0" }, { "type": "shake", "amount": 0.05 } ],
    "spark_big":    [ { "type": "sparks", "count": 14, "color": "#ffd24a" }, { "type": "shake", "amount": 0.22 } ],
    "impact_frame": [ { "type": "impactFrame", "frames": 3, "color": "#ffffff", "opacity": 0.65, "shake": 0.25 } ],
    "spark_crit":   [ { "type": "sparks", "count": 10, "color": "#ff9f43" }, { "type": "shake", "amount": 0.12 } ],
    "spark_parry":  [ { "type": "sparks", "count": 14, "color": "#ffffff" }, { "type": "ring", "color": "#ffffff", "max": 2.4, "life": 18, "y": 1.1 },
                      { "type": "flash", "color": "#ffffff", "opacity": 0.3 }, { "type": "shake", "amount": 0.3 } ],
    "spark_block":  [ { "type": "sparks", "count": 3, "color": "#b8c4d6" }, { "type": "text", "text": "BLOCK", "style": "block" } ],
    "spark_chi":    [ { "type": "sparks", "count": 5, "color": "#7fe3ff" } ],
    "guardbreak_fx":[ { "type": "ring", "color": "#ffd24a", "max": 2.2, "life": 18, "y": 1 }, { "type": "text", "text": "GUARD BREAK", "style": "big" } ],
    "hero_hurt":    [ { "type": "flash", "color": "#ff2828", "opacity": 0.2 }, { "type": "shake", "amount": 0.15 } ],
    "blast_fx":     [ { "type": "ring", "color": "#7fe3ff", "max": 5, "life": 24, "y": 1.1 }, { "type": "flash", "color": "#78c8ff", "opacity": 0.35 }, { "type": "shake", "amount": 0.55 } ],
    "smoke_puff":   [ { "type": "smoke", "count": 12, "color": "#8a8aa8" } ],
    "smoke_warn":   [ { "type": "smoke", "count": 5, "color": "#9a7aff", "at": "target" }, { "type": "ring", "color": "#9a7aff", "max": 1.6, "life": 33, "y": 0.06, "flat": true, "at": "target" } ],
    "fuse_ring":    [ { "type": "ring", "color": "#ff7a3a", "max": 2.2, "life": 33, "y": 0.06, "flat": true } ],
    "explode_fx":   [ { "type": "ring", "color": "#ff8a3a", "max": 2.9, "life": 24, "y": 0.06, "flat": true }, { "type": "ring", "color": "#ffd24a", "max": 2.2, "life": 18, "y": 1 },
                      { "type": "sparks", "count": 18, "color": "#ffb04a" }, { "type": "flash", "color": "#ff963c", "opacity": 0.3 }, { "type": "shake", "amount": 0.4 } ],
    "slam_fx":      [ { "type": "ring", "color": "#ff5d3a", "max": 4.2, "life": 27, "y": 0.06, "flat": true }, { "type": "ring", "color": "#ffd24a", "max": 2.45, "life": 18, "y": 0.06, "flat": true },
                      { "type": "sparks", "count": 16, "color": "#ffb04a" }, { "type": "flash", "color": "#ff5a3c", "opacity": 0.25 }, { "type": "shake", "amount": 0.55 } ],
    "heal_fx":      [ { "type": "ring", "color": "#7dffa0", "max": 1.8, "life": 24, "y": 1, "at": "target" }, { "type": "text", "text": "HEAL", "style": "chi", "at": "target" },
                      { "type": "rise", "count": 8, "color": "#7dffa0", "at": "target" } ],
    "shot_fx":      [ { "type": "sparks", "count": 3, "color": "#ffe9a0" } ],
    "tg_pulse":       { "type": "telegraph", "shape": "pulse", "color": "#ff3333", "speed": 30 },
    "tg_pulse_fuse":  { "type": "telegraph", "shape": "pulse", "color": "#ff3333", "speed": 40 },
    "tg_aim_line":    { "type": "telegraph", "shape": "aimLine", "color": "#ff4a4a" },
    "tg_heal_link":   { "type": "telegraph", "shape": "link", "color": "#7dffa0" },
    "tg_path":        { "type": "telegraph", "shape": "pathLine", "color": "#ff4a4a", "length": 10 },
    "tg_ground_ring": { "type": "telegraph", "shape": "groundRing", "color": "#ff5d3a", "radius": 3.5 }
  },

  "enemies": {
    "thug":   { "name": "Thug",          "hp": 12,  "speed": 2.2, "damage": 4,  "scale": 1.0,  "chi": 1.5, "unlock": 1,  "weight": 10, "ai": "melee",  "stand": 1.3, "tint": "#8fe89a", "model": "hero", "props": [],                           "attacks": [ { "use": "jab_thug" } ] },
    "fast":   { "name": "Runner",        "hp": 7,   "speed": 3.8, "damage": 3,  "scale": 0.85, "chi": 1.8, "unlock": 2,  "weight": 5,  "ai": "melee",  "stand": 1.3, "tint": "#d29bff", "model": "hero", "props": [],                           "attacks": [ { "use": "jab_fast" } ] },
    "brute":  { "name": "Brute",         "hp": 34,  "speed": 1.3, "damage": 9,  "scale": 1.3,  "chi": 4,   "unlock": 3,  "weight": 3,  "ai": "melee",  "stand": 1.3, "tint": "#7d7d8c", "model": "hero", "props": [],                           "attacks": [ { "use": "heavy_swing" } ] },
    "archer": { "name": "Archer",        "hp": 9,   "speed": 2.4, "damage": 5,  "scale": 0.95, "chi": 2.5, "unlock": 4,  "weight": 4,  "ai": "ranged", "keep": [4.2, 7], "lineUp": true, "tint": "#ffc070", "model": "hero", "props": ["bow", "bow_string"], "tip": "Shoots from range. Click it to dash in.", "attacks": [ { "use": "arrow_shot", "range": [3.5, 10], "zTol": 1.1 } ] },
    "shield": { "name": "Shield Bearer", "hp": 30,  "speed": 1.5, "damage": 7,  "scale": 1.15, "chi": 4,   "unlock": 6,  "weight": 3,  "ai": "melee",  "stand": 1.3, "tint": "#9cbcff", "model": "hero", "props": ["shield_round"], "guard": { "damageTaken": 0.2, "breakStun": 60 }, "tip": "Blocks normal hits. Finishers and parries break the guard.", "attacks": [ { "use": "shield_bash" } ] },
    "bomber": { "name": "Firecracker",   "hp": 8,   "speed": 4.2, "damage": 14, "scale": 0.85, "chi": 3,   "unlock": 7,  "weight": 3,  "ai": "rusher", "tint": "#ff8a6a", "model": "hero", "props": ["bomb_pack", "bomb_fuse"], "onDeath": "death_blast", "tip": "Explodes near Hero. Kill it early or knock it into the crowd.", "attacks": [ { "use": "fuse_blast", "range": [0, 1.1], "zTol": 0.9 } ] },
    "ninja":  { "name": "Ninja",         "hp": 9,   "speed": 4.2, "damage": 6,  "scale": 0.9,  "chi": 3.5, "unlock": 8,  "weight": 3,  "ai": "melee",  "stand": 1.3, "tint": "#5a5a70", "model": "hero", "props": ["katana"], "tip": "Teleports behind Hero.", "attacks": [ { "use": "vanish_strike", "range": [2.5, 10] }, { "use": "stab" } ] },
    "healer": { "name": "Healer Monk",   "hp": 14,  "speed": 2.0, "damage": 0,  "scale": 0.95, "chi": 4,   "unlock": 9,  "weight": 1.2, "maxPerWave": 2, "ai": "support", "keep": [6, 8], "lineUp": false, "tint": "#c6ffb8", "model": "hero", "props": ["halo"], "tip": "Heals its allies. Take it out first.", "attacks": [ { "use": "heal_pulse", "range": [0, 99] } ] },
    "staff":  { "name": "Staff Master",  "hp": 40,  "speed": 1.6, "damage": 10, "scale": 1.25, "chi": 7,   "unlock": 11, "weight": 2,  "ai": "melee",  "stand": 3.0, "tint": "#f0a8e8", "model": "hero", "props": ["staff_pole", "staff_tip"], "tip": "Long reach. Close in on it.", "attacks": [ { "use": "staff_sweep", "range": [0, 3.5] } ] },
    "boss":   { "name": "Boss",          "hp": 170, "speed": 1.0, "damage": 18, "scale": 1.8,  "chi": 30,  "unlock": 0,  "weight": 0,  "ai": "melee",  "stand": 1.3, "tint": "#ffe066", "model": "hero", "props": ["crown"],
                "attacks": [ { "use": "boss_melee", "weight": 4.5, "range": [0, 2.1] }, { "use": "boss_slam", "weight": 3, "range": [0, 99] }, { "use": "boss_charge", "weight": 3, "range": [0, 99] } ] }
  },

  "branches": [ ["tiger", "Tiger", "offense"], ["crane", "Crane", "mobility"], ["iron", "Iron", "defense"], ["chi", "Chi", "spirit & idle"] ],

  "upgrades": [
    { "id": "str", "branch": "tiger", "name": "Iron Fist",        "desc": "+20% damage",                                  "baseCost": 10, "growth": 1.45, "max": 99, "mods": [ { "stat": "damage", "op": "addPct", "value": 0.2 } ] },
    { "id": "spd", "branch": "tiger", "name": "Swift Strikes",    "desc": "-7% attack delay, +4% move speed",             "baseCost": 15, "growth": 1.5,  "max": 20, "mods": [ { "stat": "attackScale", "op": "pow", "value": 0.93 }, { "stat": "move", "op": "addPct", "value": 0.04 } ] },
    { "id": "crt", "branch": "tiger", "name": "Tiger Claws",      "desc": "+5% crit chance (crits do x2.5)",              "baseCost": 40, "growth": 1.6,  "max": 10, "requires": { "str": 3 }, "mods": [ { "stat": "crit", "op": "add", "value": 0.05, "cap": 0.5 } ] },
    { "id": "fin", "branch": "tiger", "name": "Rending Finisher", "desc": "+30% finisher damage",                         "baseCost": 60, "growth": 1.6,  "max": 10, "requires": { "spd": 3 }, "mods": [ { "stat": "finisherMult", "op": "addPct", "value": 0.3 } ] },
    { "id": "leg", "branch": "crane", "name": "Light Feet",       "desc": "+8% move speed",                               "baseCost": 12, "growth": 1.45, "max": 15, "mods": [ { "stat": "move", "op": "addPct", "value": 0.08 } ] },
    { "id": "rch", "branch": "crane", "name": "Long Reach",       "desc": "+reach; every 2 levels cleave +1 enemy",       "baseCost": 25, "growth": 1.6,  "max": 10, "mods": [ { "stat": "reach", "op": "add", "value": 0.25 }, { "stat": "cleave", "op": "add", "value": 1, "per": 2 } ] },
    { "id": "swp", "branch": "crane", "name": "Whirlwind",        "desc": "Every strike hits both sides",                 "baseCost": 60, "growth": 1,    "max": 1,  "requires": { "rch": 2 }, "mods": [ { "stat": "sweep", "op": "add", "value": 1 } ] },
    { "id": "dod", "branch": "crane", "name": "Crane Dodge",      "desc": "+4% chance to evade any hit",                  "baseCost": 70, "growth": 1.7,  "max": 10, "requires": { "leg": 3 }, "mods": [ { "stat": "dodge", "op": "add", "value": 0.04, "cap": 0.4 } ] },
    { "id": "bod", "branch": "iron", "name": "Iron Body",         "desc": "+25 max HP, +4% damage reduction",             "baseCost": 12, "growth": 1.45, "max": 99, "mods": [ { "stat": "maxHp", "op": "add", "value": 25 }, { "stat": "armor", "op": "add", "value": 0.04, "cap": 0.5 } ] },
    { "id": "reg", "branch": "iron", "name": "Calm Breath",       "desc": "+0.5 HP/s regen while fighting",               "baseCost": 30, "growth": 1.5,  "max": 20, "mods": [ { "stat": "regen", "op": "add", "value": 0.5 } ] },
    { "id": "thn", "branch": "iron", "name": "Stone Skin",        "desc": "Attackers take 12% of the damage they deal",   "baseCost": 55, "growth": 1.6,  "max": 10, "requires": { "bod": 3 }, "mods": [ { "stat": "thorns", "op": "add", "value": 0.12 } ] },
    { "id": "rev", "branch": "iron", "name": "Second Wind",       "desc": "Get back up at 40% HP, once per wave per level", "baseCost": 90, "growth": 2,  "max": 3,  "requires": { "reg": 3, "bod": 5 }, "mods": [ { "stat": "revives", "op": "add", "value": 1 } ] },
    { "id": "chi", "branch": "chi", "name": "Chi Flow",           "desc": "+15% chi gain, +10% Focus gain",               "baseCost": 20, "growth": 1.55, "max": 99, "mods": [ { "stat": "chiMult", "op": "add", "value": 0.15 }, { "stat": "focusGain", "op": "add", "value": 0.1 } ] },
    { "id": "trn", "branch": "chi", "name": "Deep Trance",        "desc": "Hero keeps fighting longer while you are away (+5 min)", "baseCost": 25, "growth": 1.6, "max": 10, "mods": [ { "stat": "offline", "op": "add", "value": 300 } ] },
    { "id": "spr", "branch": "chi", "name": "Spirit Hands",       "desc": "Auto strikes and parries. Lv2+: auto Focus blast", "baseCost": 80, "growth": 1.8, "max": 8, "requires": { "chi": 2 }, "mods": [ { "stat": "spirit", "op": "add", "value": 1 } ] },
    { "id": "foc", "branch": "chi", "name": "Focus Mastery",      "desc": "+25% blast damage, +8% Focus gain",            "baseCost": 50, "growth": 1.6,  "max": 10, "requires": { "chi": 2 }, "mods": [ { "stat": "blastMult", "op": "addPct", "value": 0.25 }, { "stat": "focusGain", "op": "add", "value": 0.08 } ] }
  ],

  "models": {
    "hero": { "file": "hero.glb", "yaw": 90, "height": 0, "pose": "arms_down",
              "anims": { "idle": "idle_stance", "move": "run", "hurt": "hit_head", "stun": "hit_side", "defeat": "knockdown" },
              "bones": { "head": "mixamorigHead", "hand_r": "mixamorigRightHand", "hand_l": "mixamorigLeftHand", "foot_l": "mixamorigLeftFoot", "foot_r": "mixamorigRightFoot", "back": "mixamorigSpine2", "hips": "mixamorigHips",
                         "upperarm_l": "mixamorigLeftArm", "forearm_l": "mixamorigLeftForeArm", "upperarm_r": "mixamorigRightArm", "forearm_r": "mixamorigRightForeArm" } }
  },

  "props": {
    "shield_round": { "shape": "disc",   "color": "#a9bed3", "size": [1.3, 1, 1.1],      "offset": [0.62, 1.05, 0],    "rot": [0, 0, 90] },
    "staff_pole":   { "shape": "box",    "color": "#7a5230", "size": [0.07, 2.3, 0.07],  "offset": [0.15, 1.15, 0.5] },
    "staff_tip":    { "shape": "box",    "color": "#ffd24a", "size": [0.14, 0.14, 0.14], "offset": [0.15, 2.35, 0.5] },
    "bow":          { "shape": "bow",    "color": "#8a5a2a", "size": [1, 1, 1],          "offset": [0.32, 1.15, 0.3],  "rot": [0, 0, -90] },
    "bow_string":   { "shape": "box",    "color": "#e8e8e8", "size": [0.02, 1.1, 0.02],  "offset": [0.32, 1.15, 0.3] },
    "halo":         { "shape": "halo",   "color": "#e8ff6a", "size": [1, 1, 1],          "offset": [0, 2.05, 0],       "rot": [90, 0, 0] },
    "bomb_pack":    { "shape": "box",    "color": "#c0392b", "size": [0.24, 0.36, 0.3],  "offset": [-0.24, 1.1, 0] },
    "bomb_fuse":    { "shape": "box",    "color": "#ffd24a", "size": [0.03, 0.2, 0.03],  "offset": [-0.24, 1.38, 0] },
    "katana":       { "shape": "box",    "color": "#d0d8e0", "size": [0.04, 0.95, 0.04], "offset": [-0.22, 1.25, 0.12], "rot": [0, 0, 34] },
    "crown":        { "shape": "box",    "color": "#ffd24a", "size": [0.34, 0.12, 0.34], "offset": [0, 0.3, 0], "bone": "head" }
  }
};
