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
// clogIds = collection log item ids that count as owning it (WikiSync).

export const WIKI_IMG = 'https://oldschool.runescape.wiki/images/';

// the barrows goal for an iron is tank gear, slot by slot: any melee
// brother's piece fills the slot (dharok/guthan/torag/verac)
const TANK_HELMS = [4716, 4724, 4745, 4753];
const TANK_BODIES = [4720, 4728, 4749, 4757];
const TANK_LEGS = [4722, 4730, 4751, 4759];

// collecting 4 distinct 1/224 pieces: 4 missing -> 1 missing
const MOON_LADDER = [56, 74.67, 112, 224];

export const ITEMS = [
  // ---- the early game ----
  { id: 'bring', stage: 'the early game', name: 'Berserker ring', rate: 128, from: 'dagannoth rex', icon: 'Berserker_ring.png', wom: 'dagannoth_rex', clogIds: [6737], weight: 0.5 },
  { id: 'tankhelm', stage: 'the early game', name: 'Barrows tank helm', rate: 102, from: 'barrows', icon: "Verac's_helm.png", note: 'any of the 4 melee helms, rate assumes killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_HELMS, weight: 0.75 },
  { id: 'tankbody', stage: 'the early game', name: 'Barrows tank body', rate: 102, from: 'barrows', icon: "Dharok's_platebody.png", note: 'any of the 4 melee bodies, rate assumes killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_BODIES, weight: 0.75 },
  { id: 'tanklegs', stage: 'the early game', name: 'Barrows tank legs', rate: 102, from: 'barrows', icon: "Verac's_plateskirt.png", note: 'any of the 4 melee legs, rate assumes killing all 6 per run', unit: 'chests', wom: 'barrows_chests', clogIds: TANK_LEGS, weight: 0.75 },
  { id: 'ddef', stage: 'the early game', name: 'Dragon defender', rate: 450, from: 'cyclopes', icon: 'Dragon_defender.png', note: 'bronze through rune are 1/50 each, dragon is 1/100, about 450 kc average. enter your total cyclopes kc', ladder: [50, 50, 50, 50, 50, 50, 50, 100], clogIds: [12954], weight: 0.5 },
  { id: 'zaxe', stage: 'the early game', name: 'Zombie axe', rate: 600, from: 'armoured zombies', icon: 'Zombie_axe.png', note: 'fort rate', clogIds: [28810, 28813], weight: 0.5 },

  // ---- varlamore era ----
  // full moon sets: 4 pieces each at 1/224 from the chest, so completing
  // a set is phases of 4/224 -> 3/224 -> 2/224 -> 1/224, about 467
  // chests on average. owning the set means every piece is in the log.
  { id: 'bloodset', stage: 'varlamore era', name: 'Full blood moon set', rate: 467, from: 'lunar chests', icon: 'Blood_moon_chestplate.png', note: 'all 4 pieces, each 1/224, about 467 chests average', ladder: MOON_LADDER, unit: 'chests', wom: 'lunar_chests', clogIds: [29028, 29022, 29025, 28997], clogAll: true, weight: 0.75 },
  { id: 'blueset', stage: 'varlamore era', name: 'Full blue moon set', rate: 467, from: 'lunar chests', icon: 'Blue_moon_chestplate.png', note: 'all 4 pieces, each 1/224, about 467 chests average', ladder: MOON_LADDER, unit: 'chests', wom: 'lunar_chests', clogIds: [29019, 29013, 29016, 28988], clogAll: true, weight: 0.75 },
  { id: 'eclipseset', stage: 'varlamore era', name: 'Full eclipse moon set', rate: 467, from: 'lunar chests', icon: 'Eclipse_moon_chestplate.png', note: 'all 4 pieces, each 1/224, about 467 chests average', ladder: MOON_LADDER, unit: 'chests', wom: 'lunar_chests', clogIds: [29010, 29004, 29007, 29000], clogAll: true, weight: 0.75 },
  { id: 'deadeye', stage: 'varlamore era', name: 'Deadeye prayer scroll', rate: 75, from: 'royal titans', icon: 'Deadeye_prayer_scroll.png', wom: 'the_royal_titans', clogIds: [30626], weight: 0.5 },
  { id: 'vigour', stage: 'varlamore era', name: 'Mystic vigour prayer scroll', rate: 75, from: 'royal titans', icon: 'Mystic_vigour_prayer_scroll.png', wom: 'the_royal_titans', clogIds: [30627], weight: 0.5 },
  { id: 'twinflame', stage: 'varlamore era', name: 'Twinflame staff crown', rate: 75, from: 'royal titans', icon: 'Twinflame_staff.png', note: 'per crown, staff needs both', wom: 'the_royal_titans', clogIds: [], weight: 0.5 },
  { id: 'dhwand', stage: 'varlamore era', name: 'Dragon hunter wand', rate: 105, from: 'the hueycoatl', icon: 'Dragon_hunter_wand.png', wom: 'the_hueycoatl', clogIds: [30070], weight: 0.5 },

  // ---- the big unlocks ----
  { id: 'dpick', stage: 'the big unlocks', name: 'Dragon pickaxe', rate: 400, from: 'kalphite queen', icon: 'Dragon_pickaxe.png', note: 'kalphite queen rate, wilderness bosses differ', wom: 'kalphite_queen', clogIds: [11920], weight: 0.5 },
  { id: 'dwh', stage: 'the big unlocks', name: 'Dragon warhammer', rate: 5000, from: 'lizardman shamans', icon: 'Dragon_warhammer.png', clogIds: [13576], weight: 2 },
  { id: 'zenyte', stage: 'the big unlocks', name: 'Zenyte shards', rate: 300, from: 'demonic gorillas', icon: 'Zenyte_shard.png', note: 'you usually want 4', multi: 4, clogIds: [19529], weight: 1.5 },
  { id: 'jaw', stage: 'the big unlocks', name: 'Basilisk jaw', rate: 1000, from: 'basilisk knights', icon: 'Basilisk_jaw.png', clogIds: [24268], weight: 1 },

  // ---- demon business ----
  { id: 'synapse', stage: 'demon business', name: 'Tormented synapses', rate: 500, from: 'tormented demons', icon: 'Tormented_synapse.png', note: 'want 2, emberlight + scorching bow', multi: 2, clogIds: [29580], weight: 1 },
  { id: 'bclaw', stage: 'demon business', name: 'Burning claws', rate: 500, from: 'tormented demons', icon: 'Burning_claw.png', note: 'want 2 for the pair', multi: 2, clogIds: [29574], weight: 1 },

  // ---- the gauntlet ----
  { id: 'cseed', stage: 'the gauntlet', name: 'Crystal armour seeds', rate: 50, from: 'corrupted gauntlet', icon: 'Crystal_armour_seed.png', note: 'cg rate, full set needs 6', multi: 6, wom: 'the_corrupted_gauntlet', clogIds: [23956], weight: 1 },
  { id: 'bowfa', stage: 'the gauntlet', name: 'Enh. crystal weapon seeds', rate: 400, from: 'corrupted gauntlet', icon: 'Enhanced_crystal_weapon_seed.png', note: 'cg rate, some want 2', multi: 2, wom: 'the_corrupted_gauntlet', clogIds: [25859], weight: 2 },

  // ---- slayer era ----
  { id: 'tanz', stage: 'slayer era', name: 'Tanzanite fang', rate: 512, from: 'zulrah', icon: 'Tanzanite_fang.png', wom: 'zulrah', clogIds: [12922], weight: 1.5 },
  { id: 'trident', stage: 'slayer era', name: 'Trident of the seas', rate: 512, from: 'kraken', icon: 'Trident_of_the_seas.png', wom: 'kraken', clogIds: [11905, 11907], weight: 1 },
  { id: 'tent', stage: 'slayer era', name: 'Kraken tentacle', rate: 400, from: 'kraken', icon: 'Kraken_tentacle.png', wom: 'kraken', clogIds: [12004], weight: 0.5 },
  { id: 'whip', stage: 'slayer era', name: 'Abyssal whip', rate: 512, from: 'abyssal demons', icon: 'Abyssal_whip.png', clogIds: [4151], weight: 1 },
  { id: 'unsired', stage: 'slayer era', name: 'Unsired', rate: 100, from: 'abyssal sire', icon: 'Unsired.png', note: 'bludgeon needs ~6', wom: 'abyssal_sire', clogIds: [13273], weight: 0.5 },
  { id: 'occult', stage: 'slayer era', name: 'Occult necklace', rate: 350, from: 'thermy', icon: 'Occult_necklace.png', note: 'thermy rate', wom: 'thermonuclear_smoke_devil', clogIds: [12002], weight: 1 },
  { id: 'icon', stage: 'slayer era', name: 'Ancient icon', rate: 50, from: 'phantom muspah', icon: 'Ancient_icon.png', wom: 'phantom_muspah', clogIds: [27627], weight: 0.5 },

  // ---- god wars ----
  { id: 'bhilt', stage: 'god wars', name: 'Bandos hilt', rate: 508, from: 'general graardor', icon: 'Bandos_hilt.png', wom: 'general_graardor', clogIds: [11818], weight: 0.75 },
  { id: 'bcp', stage: 'god wars', name: 'Bandos chestplate', rate: 381, from: 'general graardor', icon: 'Bandos_chestplate.png', wom: 'general_graardor', clogIds: [11832], weight: 1 },
  { id: 'tass', stage: 'god wars', name: 'Bandos tassets', rate: 381, from: 'general graardor', icon: 'Bandos_tassets.png', wom: 'general_graardor', clogIds: [11834], weight: 1 },
  { id: 'zspear', stage: 'god wars', name: 'Zamorakian spear', rate: 128, from: 'kril tsutsaroth', icon: 'Zamorakian_spear.png', wom: 'kril_tsutsaroth', clogIds: [11824], weight: 0.75 },

  // ---- the wilderness section ----
  { id: 'vwgem', stage: 'the wilderness section', name: 'Voidwaker gem', rate: 360, from: 'venenatis', icon: 'Voidwaker_gem.png', note: 'big boss rate', wom: 'venenatis', clogIds: [27687], weight: 1 },
  { id: 'vwblade', stage: 'the wilderness section', name: 'Voidwaker blade', rate: 360, from: 'vetion', icon: 'Voidwaker_blade.png', note: 'big boss rate', wom: 'vetion', clogIds: [27684], weight: 1 },
  { id: 'vwhilt', stage: 'the wilderness section', name: 'Voidwaker hilt', rate: 360, from: 'callisto', icon: 'Voidwaker_hilt.png', note: 'big boss rate', wom: 'callisto', clogIds: [27681], weight: 1 },

  // ---- cerberus ----
  { id: 'prim', stage: 'cerberus', name: 'Primordial crystal', rate: 512, from: 'cerberus', icon: 'Primordial_crystal.png', wom: 'cerberus', clogIds: [13231], weight: 1 },
  { id: 'eternal', stage: 'cerberus', name: 'Eternal crystal', rate: 512, from: 'cerberus', icon: 'Eternal_crystal.png', wom: 'cerberus', clogIds: [13227], weight: 1 },
  { id: 'peg', stage: 'cerberus', name: 'Pegasian crystal', rate: 512, from: 'cerberus', icon: 'Pegasian_crystal.png', wom: 'cerberus', clogIds: [13229], weight: 1 },

  // ---- hydra ----
  { id: 'claw', stage: 'hydra', name: "Hydra's claw", rate: 1000, from: 'alchemical hydra', icon: "Hydra's_claw.png", wom: 'alchemical_hydra', clogIds: [22966], weight: 1.5 },
  { id: 'hleather', stage: 'hydra', name: 'Hydra leather', rate: 514, from: 'alchemical hydra', icon: 'Hydra_leather.png', wom: 'alchemical_hydra', clogIds: [22983], weight: 1 },

  // ---- araxxor ----
  { id: 'nox', stage: 'araxxor', name: 'Noxious pieces', rate: 66.7, from: 'araxxor', icon: 'Noxious_point.png', note: 'each piece 1/200 with no duplicates, halberd needs 3', multi: 3, wom: 'araxxor', clogIds: [29790, 29792, 29794], weight: 1 },
  { id: 'afang', stage: 'araxxor', name: 'Araxyte fang', rate: 600, from: 'araxxor', icon: 'Araxyte_fang.png', note: 'makes rancour', wom: 'araxxor', clogIds: [29799], weight: 1 },

  // ---- tombs of amascut ----
  { id: 'fang', stage: 'tombs of amascut', name: "Osmumten's fang", rate: 3.43, from: 'toa purples', icon: "Osmumten's_fang.png", note: '7/24 of purples', unit: 'purples', clogIds: [26219], weight: 1.5 },
  { id: 'lightb', stage: 'tombs of amascut', name: 'Lightbearer', rate: 3.43, from: 'toa purples', icon: 'Lightbearer.png', note: '7/24 of purples', unit: 'purples', clogIds: [25975], weight: 1 },
  { id: 'ward', stage: 'tombs of amascut', name: "Elidinis' ward", rate: 8, from: 'toa purples', icon: "Elidinis'_ward.png", note: '3/24 of purples', unit: 'purples', clogIds: [25985], weight: 1 },
  { id: 'mmask', stage: 'tombs of amascut', name: 'Masori mask', rate: 12, from: 'toa purples', icon: 'Masori_mask.png', note: '2/24 of purples', unit: 'purples', clogIds: [27226], weight: 1 },
  { id: 'mbody', stage: 'tombs of amascut', name: 'Masori body', rate: 12, from: 'toa purples', icon: 'Masori_body.png', note: '2/24 of purples', unit: 'purples', clogIds: [27229], weight: 1 },
  { id: 'mchaps', stage: 'tombs of amascut', name: 'Masori chaps', rate: 12, from: 'toa purples', icon: 'Masori_chaps.png', note: '2/24 of purples', unit: 'purples', clogIds: [27232], weight: 1 },
  { id: 'shadow', stage: 'tombs of amascut', name: "Tumeken's shadow", rate: 24, from: 'toa purples', icon: "Tumeken's_shadow.png", note: '1/24 of purples', unit: 'purples', clogIds: [27275, 27277], weight: 2.5 },

  // ---- yama ----
  { id: 'horn', stage: 'yama', name: 'Soulflame horn', rate: 300, from: 'yama', icon: 'Soulflame_horn.png', note: 'solo rate', wom: 'yama', clogIds: [30759], weight: 1 },
  { id: 'oathhelm', stage: 'yama', name: 'Oathplate helm', rate: 600, from: 'yama', icon: 'Oathplate_helm.png', wom: 'yama', clogIds: [30750], weight: 1.5 },
  { id: 'oathchest', stage: 'yama', name: 'Oathplate chest', rate: 600, from: 'yama', icon: 'Oathplate_chest.png', wom: 'yama', clogIds: [30753], weight: 1.5 },
  { id: 'oathlegs', stage: 'yama', name: 'Oathplate legs', rate: 600, from: 'yama', icon: 'Oathplate_legs.png', wom: 'yama', clogIds: [30756], weight: 1.5 },
  { id: 'rite', stage: 'yama', name: 'Rite of vile transference', rate: 182, from: 'yama', icon: 'Rite_of_vile_transference.png', note: 'effective solo', wom: 'yama', clogIds: [30806], weight: 0.5 },

  // ---- doom of mokhaiotl ----
  { id: 'ayak', stage: 'doom of mokhaiotl', name: 'Eye of ayak', rate: 540, from: 'doom of mokhaiotl', icon: 'Eye_of_ayak.png', note: 'delve 9+ rate', wom: 'doom_of_mokhaiotl', clogIds: [31115], weight: 1.5 },
  { id: 'cloth', stage: 'doom of mokhaiotl', name: 'Mokhaiotl cloth', rate: 540, from: 'doom of mokhaiotl', icon: 'Mokhaiotl_cloth.png', note: 'delve 9+ rate, makes confliction', wom: 'doom_of_mokhaiotl', clogIds: [31109], weight: 1 },
  { id: 'treads', stage: 'doom of mokhaiotl', name: 'Avernic treads', rate: 540, from: 'doom of mokhaiotl', icon: 'Avernic_treads.png', note: 'delve 9+ rate', wom: 'doom_of_mokhaiotl', clogIds: [31088], weight: 1.5 },

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

  // ---- nex ----
  { id: 'torvahelm', stage: 'nex', name: 'Torva full helm', rate: 258, from: 'nex', icon: 'Torva_full_helm.png', wom: 'nex', clogIds: [26376, 26382], weight: 1.5 },
  { id: 'torvabody', stage: 'nex', name: 'Torva platebody', rate: 258, from: 'nex', icon: 'Torva_platebody.png', wom: 'nex', clogIds: [26378, 26384], weight: 1.5 },
  { id: 'torvalegs', stage: 'nex', name: 'Torva platelegs', rate: 258, from: 'nex', icon: 'Torva_platelegs.png', wom: 'nex', clogIds: [26380, 26386], weight: 1.5 },
  { id: 'nihil', stage: 'nex', name: 'Nihil horn', rate: 258, from: 'nex', icon: 'Nihil_horn.png', note: 'makes zaryte crossbow', wom: 'nex', clogIds: [26372], weight: 1.5 },
  { id: 'vambs', stage: 'nex', name: 'Zaryte vambraces', rate: 172, from: 'nex', icon: 'Zaryte_vambraces.png', wom: 'nex', clogIds: [26235], weight: 1 },
];

// wizard sections in chart order
export const STAGES = [...new Set(ITEMS.map((i) => i.stage))];

export function itemsInStage(stage) {
  return ITEMS.filter((i) => i.stage === stage);
}

export function iconUrl(item) {
  return WIKI_IMG + encodeURI(item.icon);
}
