// the classic ironman progression grinds off the Ladlor chart, each with
// its commonly quoted drop rate. rates with an assumption baked in say so
// in `note`. icons hotlink straight to the wiki.
//
// wom      = wise old man metric that carries this grind's kc (boss kills
//            unless womKind is 'activity'). missing = not on hiscores,
//            kc stays manual (cyclopes, slayer mobs, shamans, gorillas...)
// clogIds  = collection log item ids that count as owning this item, for
//            WikiSync auto fill (their API returns owned slot ids)

export const WIKI_IMG = 'https://oldschool.runescape.wiki/images/';

export const ITEMS = [
  { id: 'ddef', name: 'Dragon defender', rate: 100, from: 'cyclopes', icon: 'Dragon_defender.png', clogIds: [12954] },
  { id: 'whip', name: 'Abyssal whip', rate: 512, from: 'abyssal demons', icon: 'Abyssal_whip.png', clogIds: [4151] },
  { id: 'trident', name: 'Trident of the seas', rate: 512, from: 'kraken', icon: 'Trident_of_the_seas.png', wom: 'kraken', clogIds: [11905, 11907] },
  { id: 'occult', name: 'Occult necklace', rate: 350, from: 'thermy', icon: 'Occult_necklace.png', note: 'thermy rate', wom: 'thermonuclear_smoke_devil', clogIds: [12002] },
  { id: 'dwh', name: 'Dragon warhammer', rate: 5000, from: 'lizardman shamans', icon: 'Dragon_warhammer.png', clogIds: [13576] },
  { id: 'prim', name: 'Primordial crystal', rate: 512, from: 'cerberus', icon: 'Primordial_crystal.png', wom: 'cerberus', clogIds: [13231] },
  { id: 'peg', name: 'Pegasian crystal', rate: 512, from: 'cerberus', icon: 'Pegasian_crystal.png', wom: 'cerberus', clogIds: [13229] },
  { id: 'tanz', name: 'Tanzanite fang', rate: 512, from: 'zulrah', icon: 'Tanzanite_fang.png', wom: 'zulrah', clogIds: [12922] },
  { id: 'mfang', name: 'Magic fang', rate: 512, from: 'zulrah', icon: 'Magic_fang.png', wom: 'zulrah', clogIds: [12932] },
  { id: 'zenyte', name: 'Zenyte shard', rate: 300, from: 'demonic gorillas', icon: 'Zenyte_shard.png', clogIds: [19529] },
  { id: 'bcp', name: 'Bandos chestplate', rate: 381, from: 'general graardor', icon: 'Bandos_chestplate.png', wom: 'general_graardor', clogIds: [11832] },
  { id: 'tass', name: 'Bandos tassets', rate: 381, from: 'general graardor', icon: 'Bandos_tassets.png', wom: 'general_graardor', clogIds: [11834] },
  { id: 'acb', name: 'Armadyl crossbow', rate: 508, from: 'kree arra', icon: 'Armadyl_crossbow.png', wom: 'kreearra', clogIds: [11785] },
  { id: 'jaw', name: 'Basilisk jaw', rate: 1000, from: 'basilisk knights', icon: 'Basilisk_jaw.png', clogIds: [24268] },
  { id: 'claw', name: "Hydra's claw", rate: 1000, from: 'alchemical hydra', icon: "Hydra's_claw.png", wom: 'alchemical_hydra', clogIds: [22966] },
  { id: 'rangers', name: 'Ranger boots', rate: 1133, from: 'medium clues', icon: 'Ranger_boots.png', unit: 'caskets', wom: 'clue_scrolls_medium', womKind: 'activity', clogIds: [2577] },
];

export function iconUrl(item) {
  return WIKI_IMG + encodeURI(item.icon);
}
