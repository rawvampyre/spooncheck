// the actual Ladlor chart flow (ladlorchart.com, 2026), RNG nodes only —
// deterministic unlocks (quests, minigame points, capes, potions, prayers)
// don't roll dice so they can't spoon you. rates verified against the osrs
// wiki august 2026. special cases are modeled, not skipped:
//   - raids use PURPLES as the kc unit (the in-purple weights are exact
//     flat numbers; per-raid purple chance depends on points so we don't
//     pretend to know it)
//   - crafted uniques track the actual rng piece (synapse, nihil horn,
//     araxyte fang, mokhaiotl cloth...)
//   - vestiges use the wiki's long-run effective rate (invisible 3-roll)
//   - depth/tier-scaled drops state their baseline in `note`
//
// weight = how much this grind matters to the overall verdict. being dry
// at doom is not the same as being dry on a berserker ring.
// wom     = wise old man metric carrying this grind's kc (boss kills
//           unless womKind 'activity'). purples/off-hiscores = manual.
// clogIds = collection log item ids, kept around in case a log import
//           comes back some day. nothing reads them right now.

export const WIKI_IMG = 'https://oldschool.runescape.wiki/images/';

// the barrows goal for an iron is tank gear, slot by slot: any melee
// brother's piece fills the slot (dharok/guthan/torag/verac)
const TANK_HELMS = [4716, 4724, 4745, 4753];
const TANK_BODIES = [4720, 4728, 4749, 4757];
const TANK_LEGS = [4722, 4730, 4751, 4759];

export const ITEMS = [
  // ---- the early game ----
  { id: 'bring', stage: 'the early game', name: 'Berserker ring', rate: 128, from: 'dagannoth rex', icon: 'Berserker_ring.png', wom: 'dagannoth_rex', clogIds: [6737], weight: 0.5 },
  // barrows: 7 rolls a chest at 1/102 unique per roll with all 6 killed,
  // a specific piece is ~1/350 a chest, so any of a 4-piece slot is ~1/88
  { id: 'tankhelm', stage: 'the early game', name: 'Barrows tank helm', rate: 88, from: 'barrows', icon: "Verac's_helm.png", note: 'any of the 4 melee helms, killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_HELMS, weight: 0.75 },
  { id: 'tankbody', stage: 'the early game', name: 'Barrows tank body', rate: 88, from: 'barrows', icon: "Dharok's_platebody.png", note: 'any of the 4 melee bodies, killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_BODIES, weight: 0.75 },
  { id: 'tanklegs', stage: 'the early game', name: 'Barrows tank legs', rate: 88, from: 'barrows', icon: "Verac's_plateskirt.png", note: 'any of the 4 melee legs, killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_LEGS, weight: 0.75 },
  { id: 'ddef', stage: 'the early game', name: 'Dragon defender', rate: 450, from: 'cyclopes', icon: 'Dragon_defender.png', note: 'bronze through rune are 1/50 each, dragon is 1/100, about 450 kc average. enter your total cyclopes kc', ladder: [50, 50, 50, 50, 50, 50, 50, 100], clogIds: [12954], weight: 0.5 },
  { id: 'zaxe', stage: 'the early game', name: 'Zombie axe', rate: 800, from: 'armoured zombies', icon: 'Zombie_axe.png', clogIds: [28810, 28813], weight: 0.5 },
  { id: 'spine', stage: 'the early game', name: "Scurrius' spines", rate: 33, from: 'scurrius', icon: "Scurrius'_spine.png", multi: 3, wom: 'scurrius', clogIds: [], weight: 0.5 },
  { id: 'wsceptre', stage: 'the early game', name: 'Warped sceptre', rate: 320, from: 'warped creatures', icon: 'Warped_sceptre.png', clogIds: [], weight: 0.5 },
  { id: 'hallowfell', stage: 'the early game', name: 'Hallowfell', rate: 128, from: 'mad angel', icon: 'Hallowfell.png', wom: 'mad_angel', clogIds: [], weight: 0.75 },

  // ---- varlamore era ----
  // full moon sets: with all 3 moons killed, each chest rolls 1/56 per
  // moon for that moon's set, and a set never repeats a piece until it's
  // complete — so a full set is 4 hits at 1/56, about 224 chests. the
  // pieces are separate log slots so the import counts them exactly.
  { id: 'bloodset', stage: 'varlamore era', name: 'Full blood moon set', rate: 56, from: 'lunar chests', icon: 'Blood_moon_chestplate.png', note: 'a new piece every 1/56, full set about 224 chests', multi: 4, protected: true, unit: 'chests', wom: 'lunar_chests', clogIds: [29028, 29022, 29025, 28997], weight: 0.75 },
  { id: 'blueset', stage: 'varlamore era', name: 'Full blue moon set', rate: 56, from: 'lunar chests', icon: 'Blue_moon_chestplate.png', note: 'a new piece every 1/56, full set about 224 chests', multi: 4, protected: true, unit: 'chests', wom: 'lunar_chests', clogIds: [29019, 29013, 29016, 28988], weight: 0.75 },
  { id: 'eclipseset', stage: 'varlamore era', name: 'Full eclipse moon set', rate: 56, from: 'lunar chests', icon: 'Eclipse_moon_chestplate.png', note: 'a new piece every 1/56, full set about 224 chests', multi: 4, protected: true, unit: 'chests', wom: 'lunar_chests', clogIds: [29010, 29004, 29007, 29000], weight: 0.75 },
  // royal titans and hueycoatl drops scale linearly with your damage
  // share (1/75 solo is 1/150 in an even duo), so these carry the group
  // size picker
  // the scrolls only roll when you loot that titan's corpse, and you
  // loot one corpse per kill, so the kc asked for is loots of that giant
  { id: 'deadeye', stage: 'varlamore era', name: 'Deadeye prayer scroll', rate: 75, from: 'eldric the ice king', icon: 'Deadeye_prayer_scroll.png', note: 'only rolls when you loot eldric, full contribution rate', unit: 'eldric loots', group: true, groupMax: 2, clogIds: [30626], weight: 0.5 },
  { id: 'vigour', stage: 'varlamore era', name: 'Mystic vigour prayer scroll', rate: 75, from: 'branda the fire queen', icon: 'Mystic_vigour_prayer_scroll.png', note: 'only rolls when you loot branda, full contribution rate', unit: 'branda loots', group: true, groupMax: 2, clogIds: [30627], weight: 0.5 },
  // one crown per titan, looting the corpse you still need: 1/75 per
  // kill each phase, about 150 kills for both at full contribution
  { id: 'twinflame', stage: 'varlamore era', name: 'Twinflame staff crowns', rate: 150, from: 'royal titans', icon: 'Twinflame_staff.png', note: 'one crown per titan, loot the one you still need, 1/75 each at full contribution', ladder: [75, 75], group: true, groupMax: 2, wom: 'the_royal_titans', clogIds: [], weight: 0.5 },
  { id: 'dhwand', stage: 'varlamore era', name: 'Dragon hunter wand', rate: 105, from: 'the hueycoatl', icon: 'Dragon_hunter_wand.png', note: 'full contribution rate', group: true, wom: 'the_hueycoatl', clogIds: [30070], weight: 0.5 },

  // ---- the big unlocks ----
  { id: 'dpick', stage: 'the big unlocks', name: 'Dragon pickaxe', rate: 358, from: 'wilderness bosses', icon: 'Dragon_pickaxe.png', variants: [['wildy singles', 358], ['chaos elemental', 256], ['kalphite queen', 400]], variantIsSource: true, clogIds: [11920], weight: 0.5 },
  { id: 'dwh', stage: 'the big unlocks', name: 'Dragon warhammer', rate: 3000, from: 'lizardman shamans', icon: 'Dragon_warhammer.png', variants: [['1/3000', 3000], ['old rate 1/5000', 5000]], clogIds: [13576], weight: 2 },
  { id: 'zenyte', stage: 'the big unlocks', name: 'Zenyte shards', rate: 300, from: 'demonic gorillas', icon: 'Zenyte_shard.png', multi: 4, clogIds: [19529], weight: 1.5 },
  { id: 'jaw', stage: 'the big unlocks', name: 'Basilisk jaw', rate: 1000, from: 'basilisk knights', icon: 'Basilisk_jaw.png', variants: [['on task', 1000], ['off task', 5000]], clogIds: [24268], weight: 1 },

  // ---- demon business ----
  { id: 'synapse', stage: 'demon business', name: 'Tormented synapses', rate: 500, from: 'tormented demons', icon: 'Tormented_synapse.png', multi: 2, clogIds: [29580], weight: 1 },
  { id: 'bclaw', stage: 'demon business', name: 'Burning claws', rate: 501, from: 'tormented demons', icon: 'Burning_claw.png', multi: 2, clogIds: [29574], weight: 1 },

  // ---- the gauntlet ----
  { id: 'cseed', stage: 'the gauntlet', name: 'Crystal armour seeds', rate: 50, from: 'corrupted gauntlet', icon: 'Crystal_armour_seed.png', note: 'cg rate', multi: 6, wom: 'the_corrupted_gauntlet', clogIds: [23956], weight: 1 },
  { id: 'bowfa', stage: 'the gauntlet', name: 'Enh. crystal weapon seeds', rate: 400, from: 'corrupted gauntlet', icon: 'Enhanced_crystal_weapon_seed.png', note: 'cg rate', multi: 2, wom: 'the_corrupted_gauntlet', clogIds: [25859], weight: 2 },

  // ---- slayer era ----
  { id: 'tanz', stage: 'slayer era', name: 'Tanzanite fang', rate: 512, from: 'zulrah', icon: 'Tanzanite_fang.png', note: 'two rolls of 1/1024 per kill', wom: 'zulrah', clogIds: [12922], weight: 1.5 },
  { id: 'trident', stage: 'slayer era', name: 'Trident of the seas', rate: 200, from: 'krakens', icon: 'Trident_of_the_seas.png', variants: [['cave krakens', 200], ['kraken boss', 512]], variantIsSource: true, clogIds: [11905, 11907], weight: 1 },
  { id: 'tent', stage: 'slayer era', name: 'Kraken tentacle', rate: 400, from: 'kraken', icon: 'Kraken_tentacle.png', wom: 'kraken', clogIds: [12004], weight: 0.5 },
  { id: 'whip', stage: 'slayer era', name: 'Abyssal whip', rate: 512, from: 'abyssal demons', icon: 'Abyssal_whip.png', variants: [['abyssal demons', 512], ['abyssal sire', 1067]], variantIsSource: true, clogIds: [4151], weight: 1 },
  { id: 'unsired', stage: 'slayer era', name: 'Unsired', rate: 100, from: 'abyssal sire', icon: 'Unsired.png', wom: 'abyssal_sire', clogIds: [13273], weight: 0.5 },
  { id: 'occult', stage: 'slayer era', name: 'Occult necklace', rate: 350, from: 'thermy', icon: 'Occult_necklace.png', variants: [['thermy', 350], ['smoke devils', 512]], variantIsSource: true, wom: 'thermonuclear_smoke_devil', clogIds: [12002], weight: 1 },
  { id: 'icon', stage: 'slayer era', name: 'Ancient icon', rate: 50, from: 'phantom muspah', icon: 'Ancient_icon.png', wom: 'phantom_muspah', clogIds: [27627], weight: 0.5 },
  { id: 'venator', stage: 'slayer era', name: 'Venator shards', rate: 100, from: 'phantom muspah', icon: 'Venator_shard.png', note: 'the bow needs 5', multi: 5, wom: 'phantom_muspah', clogIds: [], weight: 1 },

  // ---- superiors ----
  // the heart and gem roll per superior kill at a rate set by the
  // monster's slayer requirement, so the section asks for kills of the
  // five standard heart grinds
  { id: 'heart', stage: 'superiors', name: 'Imbued heart', rate: 350, pool: 'superiors', fieldRates: [224, 256, 352, 440, 520, 680], from: 'superior slayer monsters', icon: 'Imbued_heart.png', unit: 'superiors', clogIds: [], weight: 1.5 },
  { id: 'egem', stage: 'superiors', name: 'Eternal gem', rate: 350, pool: 'superiors', fieldRates: [224, 256, 352, 440, 520, 680], from: 'superior slayer monsters', icon: 'Eternal_gem.png', unit: 'superiors', clogIds: [], weight: 0.5 },

  // ---- god wars ----
  { id: 'bhilt', stage: 'god wars', name: 'Bandos hilt', rate: 508, from: 'general graardor', icon: 'Bandos_hilt.png', wom: 'general_graardor', clogIds: [11818], weight: 0.75 },
  { id: 'bcp', stage: 'god wars', name: 'Bandos chestplate', rate: 381, from: 'general graardor', icon: 'Bandos_chestplate.png', wom: 'general_graardor', clogIds: [11832], weight: 1 },
  { id: 'tass', stage: 'god wars', name: 'Bandos tassets', rate: 381, from: 'general graardor', icon: 'Bandos_tassets.png', wom: 'general_graardor', clogIds: [11834], weight: 1 },
  { id: 'zspear', stage: 'god wars', name: 'Zamorakian spear', rate: 127, from: 'kril tsutsaroth', icon: 'Zamorakian_spear.png', wom: 'kril_tsutsaroth', clogIds: [11824], weight: 0.75 },

  // ---- the wilderness section ----
  { id: 'vwgem', stage: 'the wilderness section', name: 'Voidwaker gem', rate: 912, from: 'spindel', icon: 'Voidwaker_gem.png', wom: 'spindel', clogIds: [27687], weight: 1 },
  { id: 'vwblade', stage: 'the wilderness section', name: 'Voidwaker blade', rate: 912, from: 'calvarion', icon: 'Voidwaker_blade.png', wom: 'calvarion', clogIds: [27684], weight: 1 },
  { id: 'vwhilt', stage: 'the wilderness section', name: 'Voidwaker hilt', rate: 912, from: 'artio', icon: 'Voidwaker_hilt.png', wom: 'artio', clogIds: [27681], weight: 1 },

  // ---- cerberus ----
  { id: 'prim', stage: 'cerberus', name: 'Primordial crystal', rate: 520, from: 'cerberus', icon: 'Primordial_crystal.png', wom: 'cerberus', clogIds: [13231], weight: 1 },
  { id: 'eternal', stage: 'cerberus', name: 'Eternal crystal', rate: 520, from: 'cerberus', icon: 'Eternal_crystal.png', wom: 'cerberus', clogIds: [13227], weight: 1 },
  { id: 'peg', stage: 'cerberus', name: 'Pegasian crystal', rate: 520, from: 'cerberus', icon: 'Pegasian_crystal.png', wom: 'cerberus', clogIds: [13229], weight: 1 },

  // ---- hydra ----
  { id: 'claw', stage: 'hydra', name: "Hydra's claw", rate: 1001, from: 'alchemical hydra', icon: "Hydra's_claw.png", wom: 'alchemical_hydra', clogIds: [22966], weight: 1.5 },
  { id: 'hleather', stage: 'hydra', name: 'Hydra leather', rate: 514, from: 'alchemical hydra', icon: 'Hydra_leather.png', wom: 'alchemical_hydra', clogIds: [22983], weight: 1 },

  // ---- araxxor ----
  { id: 'nox', stage: 'araxxor', name: 'Noxious pieces', rate: 200, from: 'araxxor', icon: 'Noxious_point.png', note: 'any piece is 1/200 with no duplicates, full halberd about 600 kc', multi: 3, protected: true, wom: 'araxxor', clogIds: [29790, 29792, 29794], weight: 1 },
  { id: 'afang', stage: 'araxxor', name: 'Araxyte fang', rate: 600, from: 'araxxor', icon: 'Araxyte_fang.png', wom: 'araxxor', clogIds: [29799], weight: 1 },

  // ---- maggot king ----
  { id: 'efang', stage: 'maggot king', name: 'Elder venator fang', rate: 340, from: 'maggot king', icon: 'Elder_venator_fang.png', note: 'open stomach rate', wom: 'maggot_king', clogIds: [], weight: 1 },
  { id: 'kisten', stage: 'maggot king', name: 'Crimson kisten', rate: 520, from: 'maggot king', icon: 'Crimson_kisten.png', note: 'open stomach rate', wom: 'maggot_king', clogIds: [], weight: 1 },

  // ---- tombs of amascut ----
  // purple chance comes from the section's average raid level input via
  // the wiki formula, then each item takes its weight of the unique roll
  { id: 'fang', stage: 'tombs of amascut', name: "Osmumten's fang", rate: 3.43, pweight: 7, pool: 'toa', from: 'toa', icon: "Osmumten's_fang.png", note: '7 of 24 unique rolls', unit: 'raids', clogIds: [26219], weight: 1.5 },
  { id: 'lightb', stage: 'tombs of amascut', name: 'Lightbearer', rate: 3.43, pweight: 7, pool: 'toa', from: 'toa', icon: 'Lightbearer.png', note: '7 of 24 unique rolls', unit: 'raids', clogIds: [25975], weight: 1 },
  { id: 'ward', stage: 'tombs of amascut', name: "Elidinis' ward", rate: 8, pweight: 3, pool: 'toa', from: 'toa', icon: "Elidinis'_ward.png", note: '3 of 24 unique rolls', unit: 'raids', clogIds: [25985], weight: 1 },
  { id: 'mmask', stage: 'tombs of amascut', name: 'Masori mask', rate: 12, pweight: 2, pool: 'toa', from: 'toa', icon: 'Masori_mask.png', note: '2 of 24 unique rolls', unit: 'raids', clogIds: [27226], weight: 1 },
  { id: 'mbody', stage: 'tombs of amascut', name: 'Masori body', rate: 12, pweight: 2, pool: 'toa', from: 'toa', icon: 'Masori_body.png', note: '2 of 24 unique rolls', unit: 'raids', clogIds: [27229], weight: 1 },
  { id: 'mchaps', stage: 'tombs of amascut', name: 'Masori chaps', rate: 12, pweight: 2, pool: 'toa', from: 'toa', icon: 'Masori_chaps.png', note: '2 of 24 unique rolls', unit: 'raids', clogIds: [27232], weight: 1 },
  { id: 'shadow', stage: 'tombs of amascut', name: "Tumeken's shadow", rate: 24, pweight: 1, pool: 'toa', from: 'toa', icon: "Tumeken's_shadow.png", note: '1 of 24 unique rolls', unit: 'raids', clogIds: [27275, 27277], weight: 2.5 },

  // ---- yama ----
  // duo kills roll at half the solo rate, the section asks for both kcs
  { id: 'horn', stage: 'yama', name: 'Soulflame horn', rate: 300, pool: 'yama', from: 'yama', icon: 'Soulflame_horn.png', unit: 'kills', clogIds: [30759], weight: 1 },
  { id: 'oathhelm', stage: 'yama', name: 'Oathplate helm', rate: 600, pool: 'yama', from: 'yama', icon: 'Oathplate_helm.png', unit: 'kills', clogIds: [30750], weight: 1.5 },
  { id: 'oathchest', stage: 'yama', name: 'Oathplate chest', rate: 600, pool: 'yama', from: 'yama', icon: 'Oathplate_chest.png', unit: 'kills', clogIds: [30753], weight: 1.5 },
  { id: 'oathlegs', stage: 'yama', name: 'Oathplate legs', rate: 600, pool: 'yama', from: 'yama', icon: 'Oathplate_legs.png', unit: 'kills', clogIds: [30756], weight: 1.5 },

  // ---- doom of mokhaiotl ----
  // rates deepen with the delve level, the section asks how many delves
  // at each level. delveRates run levels 2,3,4,5,6,7,8,9+
  { id: 'ayak', stage: 'doom of mokhaiotl', name: 'Eye of ayak', rate: 540, pool: 'doom', fieldRates: [2000, 2000, 1350, 810, 765, 720, 630, 540], from: 'doom of mokhaiotl', icon: 'Eye_of_ayak.png', unit: 'delves', clogIds: [31115], weight: 1.5 },
  { id: 'cloth', stage: 'doom of mokhaiotl', name: 'Mokhaiotl cloth', rate: 540, pool: 'doom', fieldRates: [2500, 2000, 1350, 810, 765, 720, 630, 540], from: 'doom of mokhaiotl', icon: 'Mokhaiotl_cloth.png', unit: 'delves', clogIds: [31109], weight: 1 },
  { id: 'treads', stage: 'doom of mokhaiotl', name: 'Avernic treads', rate: 540, pool: 'doom', fieldRates: [null, null, 1350, 810, 765, 720, 630, 540], from: 'doom of mokhaiotl', icon: 'Avernic_treads.png', note: 'delve 4 or deeper only', unit: 'delves', clogIds: [31088], weight: 1.5 },

  // ---- desert treasure 2 ----
  { id: 'ultor', stage: 'desert treasure 2', name: 'Ultor vestige', rate: 1088, from: 'vardorvis', icon: 'Ultor_vestige.png', note: 'long-run rate', wom: 'vardorvis', clogIds: [28285], weight: 1.5 },
  { id: 'magus', stage: 'desert treasure 2', name: 'Magus vestige', rate: 720, from: 'duke sucellus', icon: 'Magus_vestige.png', note: 'long-run rate', wom: 'duke_sucellus', clogIds: [28281], weight: 1.5 },
  { id: 'axehead', stage: 'desert treasure 2', name: "Executioner's axe head", rate: 1088, from: 'vardorvis', icon: "Executioner's_axe_head.png", wom: 'vardorvis', clogIds: [28319], weight: 1 },
  { id: 'dukeeye', stage: 'desert treasure 2', name: 'Eye of the duke', rate: 720, from: 'duke sucellus', icon: 'Eye_of_the_duke.png', wom: 'duke_sucellus', clogIds: [28321], weight: 1 },
  { id: 'lure', stage: 'desert treasure 2', name: "Leviathan's lure", rate: 768, from: 'the leviathan', icon: "Leviathan's_lure.png", wom: 'the_leviathan', clogIds: [28325], weight: 1 },
  { id: 'siren', stage: 'desert treasure 2', name: "Siren's staff", rate: 512, from: 'the whisperer', icon: "Siren's_staff.png", wom: 'the_whisperer', clogIds: [28323], weight: 1 },

  // ---- chambers of xeric ----
  { id: 'dex', stage: 'chambers of xeric', name: 'Dexterous prayer scroll', rate: 3.45, from: 'cox purples', icon: 'Dexterous_prayer_scroll.png', note: '20/69 of purples', unit: 'purples', clogIds: [21034], weight: 1 },
  { id: 'arcane', stage: 'chambers of xeric', name: 'Arcane prayer scroll', rate: 3.45, from: 'cox purples', icon: 'Arcane_prayer_scroll.png', note: '20/69 of purples', unit: 'purples', clogIds: [21079], weight: 1 },
  { id: 'dclaws', stage: 'chambers of xeric', name: 'Dragon claws', rate: 23, from: 'cox purples', icon: 'Dragon_claws.png', note: '3/69 of purples', unit: 'purples', clogIds: [13652], weight: 1.5 },
  { id: 'anchat', stage: 'chambers of xeric', name: 'Ancestral hat', rate: 23, from: 'cox purples', icon: 'Ancestral_hat.png', note: '3/69 of purples', unit: 'purples', clogIds: [21018], weight: 1 },
  { id: 'anctop', stage: 'chambers of xeric', name: 'Ancestral robe top', rate: 23, from: 'cox purples', icon: 'Ancestral_robe_top.png', note: '3/69 of purples', unit: 'purples', clogIds: [21021], weight: 1 },
  { id: 'ancbot', stage: 'chambers of xeric', name: 'Ancestral robe bottom', rate: 23, from: 'cox purples', icon: 'Ancestral_robe_bottom.png', note: '3/69 of purples', unit: 'purples', clogIds: [21024], weight: 1 },
  { id: 'emaul', stage: 'chambers of xeric', name: 'Elder maul', rate: 34.5, from: 'cox purples', icon: 'Elder_maul.png', note: '2/69 of purples', unit: 'purples', clogIds: [21003], weight: 1 },
  { id: 'tbow', stage: 'chambers of xeric', name: 'Twisted bow', rate: 34.5, from: 'cox purples', icon: 'Twisted_bow.png', note: '2/69 of purples', unit: 'purples', clogIds: [20997], weight: 3 },

  // ---- theatre of blood ----
  { id: 'avernic', stage: 'theatre of blood', name: 'Avernic defender hilt', rate: 2.375, from: 'tob purples', icon: 'Avernic_defender_hilt.png', note: '8/19 of purples', unit: 'purples', clogIds: [22477], weight: 1.5 },
  { id: 'scythe', stage: 'theatre of blood', name: 'Scythe of vitur', rate: 19, from: 'tob purples', icon: 'Scythe_of_vitur.png', note: '1/19 of purples', unit: 'purples', clogIds: [22325, 22486], weight: 2.5 },

  // ---- phosanis nightmare ----
  { id: 'inqmace', stage: 'phosanis nightmare', name: "Inquisitor's mace", rate: 1129, from: 'phosanis nightmare', icon: "Inquisitor's_mace.png", wom: 'phosanis_nightmare', clogIds: [], weight: 2 },
  { id: 'inqhelm', stage: 'phosanis nightmare', name: "Inquisitor's great helm", rate: 700, from: 'phosanis nightmare', icon: "Inquisitor's_great_helm.png", wom: 'phosanis_nightmare', clogIds: [], weight: 1 },
  { id: 'inqhauberk', stage: 'phosanis nightmare', name: "Inquisitor's hauberk", rate: 700, from: 'phosanis nightmare', icon: "Inquisitor's_hauberk.png", wom: 'phosanis_nightmare', clogIds: [], weight: 1 },
  { id: 'inqskirt', stage: 'phosanis nightmare', name: "Inquisitor's plateskirt", rate: 700, from: 'phosanis nightmare', icon: "Inquisitor's_plateskirt.png", wom: 'phosanis_nightmare', clogIds: [], weight: 1 },
  { id: 'nstaff', stage: 'phosanis nightmare', name: 'Nightmare staff', rate: 507, from: 'phosanis nightmare', icon: 'Nightmare_staff.png', wom: 'phosanis_nightmare', clogIds: [], weight: 1 },
  { id: 'eldritch', stage: 'phosanis nightmare', name: 'Eldritch orb', rate: 1600, from: 'phosanis nightmare', icon: 'Eldritch_orb.png', wom: 'phosanis_nightmare', clogIds: [], weight: 1 },
  { id: 'volatile', stage: 'phosanis nightmare', name: 'Volatile orb', rate: 1600, from: 'phosanis nightmare', icon: 'Volatile_orb.png', wom: 'phosanis_nightmare', clogIds: [], weight: 1.5 },
  { id: 'harm', stage: 'phosanis nightmare', name: 'Harmonised orb', rate: 1600, from: 'phosanis nightmare', icon: 'Harmonised_orb.png', wom: 'phosanis_nightmare', clogIds: [], weight: 1.5 },

  // ---- nex ----
  // the quoted rates are per kill, your share splits with the team, so
  // the section asks for an average group size
  { id: 'torvahelm', stage: 'nex', name: 'Torva full helm', rate: 258, pool: 'nex', from: 'nex', icon: 'Torva_full_helm.png', wom: 'nex', clogIds: [26376, 26382], weight: 1.5 },
  { id: 'torvabody', stage: 'nex', name: 'Torva platebody', rate: 258, pool: 'nex', from: 'nex', icon: 'Torva_platebody.png', wom: 'nex', clogIds: [26378, 26384], weight: 1.5 },
  { id: 'torvalegs', stage: 'nex', name: 'Torva platelegs', rate: 258, pool: 'nex', from: 'nex', icon: 'Torva_platelegs.png', wom: 'nex', clogIds: [26380, 26386], weight: 1.5 },
  { id: 'nihil', stage: 'nex', name: 'Nihil horn', rate: 258, pool: 'nex', from: 'nex', icon: 'Nihil_horn.png', wom: 'nex', clogIds: [26372], weight: 1.5 },
  { id: 'vambs', stage: 'nex', name: 'Zaryte vambraces', rate: 172, pool: 'nex', from: 'nex', icon: 'Zaryte_vambraces.png', wom: 'nex', clogIds: [26235], weight: 1 },
];

// section-level inputs shared by every item in that pool. kind 'window'
// pools replace per-item kc inputs (the answer is just got or dry inside
// that window), 'modifier' pools only adjust the rate.
export const POOLS = {
  toa: { kind: 'window', fields: [['raidLevel', 'average raid level'], ['raids', 'total raids']] },
  yama: { kind: 'window', fields: [['soloKc', 'solo kills'], ['duoKc', 'duo kills']] },
  doom: {
    kind: 'window',
    fields: [
      ['d2', 'delve 2s'], ['d3', 'delve 3s'], ['d4', 'delve 4s'], ['d5', 'delve 5s'],
      ['d6', 'delve 6s'], ['d7', 'delve 7s'], ['d8', 'delve 8s'], ['d9', 'delve 9+'],
    ],
  },
  nex: { kind: 'modifier', fields: [['group', 'average group size', 1]] },
  // superiors show the monster's picture instead of a name label
  superiors: {
    kind: 'window',
    fields: [
      ['araxyte', 'dreadborn araxytes', 0, 'Dreadborn_Araxyte.png'],
      ['nightbeast', 'night beasts', 0, 'Night_beast.png'],
      ['gabyssal', 'greater abyssal demons', 0, 'Greater_abyssal_demon.png'],
      ['nechryarch', 'nechryarchs', 0, 'Nechryarch.png'],
      ['gargoyle', 'marble gargoyles', 0, 'Marble_gargoyle.png'],
      ['choke', 'choke devils', 0, 'Choke_devil.png'],
    ],
  },
};

// section layout comes from config.js ORDER — the streamer's file to
// regroup and reorder. anything not listed there falls back into the
// section its item definition names. WEIGHTS overrides item importance.
import { ORDER, WEIGHTS } from './config.js';

for (const it of ITEMS) {
  if (WEIGHTS[it.id] != null) it.weight = Number(WEIGHTS[it.id]) || it.weight;
}

const byId = new Map(ITEMS.map((i) => [i.id, i]));
const RESOLVED = new Map();
for (const [sec, ids] of Object.entries(ORDER)) {
  RESOLVED.set(sec, ids.map((id) => byId.get(id)).filter(Boolean));
}
for (const item of ITEMS) {
  const listed = [...RESOLVED.values()].some((arr) => arr.includes(item));
  if (!listed) {
    if (!RESOLVED.has(item.stage)) RESOLVED.set(item.stage, []);
    RESOLVED.get(item.stage).push(item);
  }
}

export const STAGES = [...RESOLVED.keys()];

export function itemsInStage(stage) {
  return RESOLVED.get(stage) ?? [];
}

export function sectionOf(id) {
  for (const [sec, arr] of RESOLVED) {
    if (arr.some((i) => i.id === id)) return sec;
  }
  return null;
}

// icons ship with the site (tools/list-icons.mjs + the fetch step keeps
// the folder complete); the wiki is only a fallback for a missing file
export function iconUrl(item) {
  return 'icons/' + encodeURI(item.icon);
}

export function wikiIconUrl(item) {
  return WIKI_IMG + encodeURI(item.icon);
}
