// the ironman progression grinds off the Ladlor chart, in rough
// progression order, each with its commonly quoted flat drop rate. rates
// with an assumption baked in say so in `note`. point-based content
// (raids, nightmare, dt2) has no flat rate and gets handled case by case
// later. icons hotlink straight to the wiki.
//
// wom      = wise old man metric that carries this grind's kc (boss kills
//            unless womKind is 'activity'). missing = not on hiscores,
//            kc stays manual (cyclopes, slayer mobs, shamans, gorillas...)
// clogIds  = collection log item ids that count as owning this item, for
//            WikiSync auto fill (their API returns owned slot ids)

export const WIKI_IMG = 'https://oldschool.runescape.wiki/images/';

const BARROWS_IDS = [
  4708, 4710, 4712, 4714, // ahrim
  4716, 4718, 4720, 4722, // dharok
  4724, 4726, 4728, 4730, // guthan
  4732, 4734, 4736, 4738, // karil
  4745, 4747, 4749, 4751, // torag
  4753, 4755, 4757, 4759, // verac
];

export const ITEMS = [
  { id: 'ddef', name: 'Dragon defender', rate: 100, from: 'cyclopes', icon: 'Dragon_defender.png', clogIds: [12954] },
  { id: 'barrows', name: 'First Barrows unique', rate: 17, from: 'barrows', icon: "Dharok's_greataxe.png", note: 'any unique, 6 brothers', unit: 'chests', wom: 'barrows_chests', clogIds: BARROWS_IDS },
  { id: 'mask', name: 'Black mask', rate: 512, from: 'cave horrors', icon: 'Black_mask.png', clogIds: [8901] },
  { id: 'dboots', name: 'Dragon boots', rate: 128, from: 'spiritual mages', icon: 'Dragon_boots.png', clogIds: [11840] },
  { id: 'whip', name: 'Abyssal whip', rate: 512, from: 'abyssal demons', icon: 'Abyssal_whip.png', clogIds: [4151] },
  { id: 'trident', name: 'Trident of the seas', rate: 512, from: 'kraken', icon: 'Trident_of_the_seas.png', wom: 'kraken', clogIds: [11905, 11907] },
  { id: 'occult', name: 'Occult necklace', rate: 350, from: 'thermy', icon: 'Occult_necklace.png', note: 'thermy rate', wom: 'thermonuclear_smoke_devil', clogIds: [12002] },
  { id: 'dwh', name: 'Dragon warhammer', rate: 5000, from: 'lizardman shamans', icon: 'Dragon_warhammer.png', clogIds: [13576] },
  { id: 'tanz', name: 'Tanzanite fang', rate: 512, from: 'zulrah', icon: 'Tanzanite_fang.png', wom: 'zulrah', clogIds: [12922] },
  { id: 'mfang', name: 'Magic fang', rate: 512, from: 'zulrah', icon: 'Magic_fang.png', wom: 'zulrah', clogIds: [12932] },
  { id: 'serp', name: 'Serpentine visage', rate: 512, from: 'zulrah', icon: 'Serpentine_visage.png', wom: 'zulrah', clogIds: [12927] },
  { id: 'prim', name: 'Primordial crystal', rate: 512, from: 'cerberus', icon: 'Primordial_crystal.png', wom: 'cerberus', clogIds: [13231] },
  { id: 'peg', name: 'Pegasian crystal', rate: 512, from: 'cerberus', icon: 'Pegasian_crystal.png', wom: 'cerberus', clogIds: [13229] },
  { id: 'eternal', name: 'Eternal crystal', rate: 512, from: 'cerberus', icon: 'Eternal_crystal.png', wom: 'cerberus', clogIds: [13227] },
  { id: 'sotd', name: 'Staff of the dead', rate: 508, from: 'kril tsutsaroth', icon: 'Staff_of_the_dead.png', wom: 'kril_tsutsaroth', clogIds: [11791] },
  { id: 'zspear', name: 'Zamorakian spear', rate: 128, from: 'kril tsutsaroth', icon: 'Zamorakian_spear.png', wom: 'kril_tsutsaroth', clogIds: [11824] },
  { id: 'bcp', name: 'Bandos chestplate', rate: 381, from: 'general graardor', icon: 'Bandos_chestplate.png', wom: 'general_graardor', clogIds: [11832] },
  { id: 'tass', name: 'Bandos tassets', rate: 381, from: 'general graardor', icon: 'Bandos_tassets.png', wom: 'general_graardor', clogIds: [11834] },
  { id: 'acb', name: 'Armadyl crossbow', rate: 508, from: 'kree arra', icon: 'Armadyl_crossbow.png', wom: 'kreearra', clogIds: [11785] },
  { id: 'acp', name: 'Armadyl chestplate', rate: 381, from: 'kree arra', icon: 'Armadyl_chestplate.png', wom: 'kreearra', clogIds: [11828] },
  { id: 'zenyte', name: 'Zenyte shard', rate: 300, from: 'demonic gorillas', icon: 'Zenyte_shard.png', clogIds: [19529] },
  { id: 'visage', name: 'Draconic visage', rate: 5000, from: 'vorkath', icon: 'Draconic_visage.png', note: 'vorkath rate', wom: 'vorkath', clogIds: [11286] },
  { id: 'jaw', name: 'Basilisk jaw', rate: 1000, from: 'basilisk knights', icon: 'Basilisk_jaw.png', clogIds: [24268] },
  { id: 'claw', name: "Hydra's claw", rate: 1000, from: 'alchemical hydra', icon: "Hydra's_claw.png", wom: 'alchemical_hydra', clogIds: [22966] },
  { id: 'bowfa', name: 'Enh. crystal weapon seed', rate: 400, from: 'corrupted gauntlet', icon: 'Enhanced_crystal_weapon_seed.png', note: 'cg rate', wom: 'the_corrupted_gauntlet', clogIds: [25859] },
  { id: 'rangers', name: 'Ranger boots', rate: 1133, from: 'medium clues', icon: 'Ranger_boots.png', unit: 'caskets', wom: 'clue_scrolls_medium', womKind: 'activity', clogIds: [2577] },
];

export function iconUrl(item) {
  return WIKI_IMG + encodeURI(item.icon);
}
