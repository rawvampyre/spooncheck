// spooncheck config. edit the values on the RIGHT of each colon.
// the left side is the internal key — leave it alone or answers
// stop matching up. easier: open /edit.html, tweak everything there,
// then download this file from it.

export const HANDLE = 'rawvampyre';
export const TWITCH = 'twitch.tv/rawvampyre';

// verdict bands, top band first: min = the percentile where it starts
export const VERDICTS = [
  { min: 99, name: 'THE CHOSEN ONE', blurb: 'jagex loves you and its not even close' },
  { min: 90, name: 'CERTIFIED SPOON', blurb: 'born lucky built different' },
  { min: 70, name: 'LIGHTLY SPOONED', blurb: 'rng carries you and you dont even say thanks' },
  { min: 45, name: 'PAINFULLY AVERAGE', blurb: 'the math looked at your account and shrugged' },
  { min: 25, name: 'GOING DRY', blurb: 'the grind respects you a little too much' },
  { min: 8, name: 'DRY', blurb: 'you have seen drop tables no account should see' },
  { min: 1, name: 'BONE DRY', blurb: 'the desert sends you postcards' },
  { min: -1, name: 'STATISTICALLY CURSED', blurb: 'this account is a warning to others' },
];

// per-item importance overrides: how hard a grind pulls the verdict.
// anything not listed keeps the default weight from items.js.
export const WEIGHTS = {};

// section titles as shown in the flow, in order. change the right-hand
// text to whatever you want.
export const SECTION_TITLES = {
  'the early game': 'the early game',
  'varlamore era': 'varlamore era',
  'the big unlocks': 'the big unlocks',
  'demon business': 'demon business',
  'the gauntlet': 'the gauntlet',
  'slayer era': 'slayer era',
  'superiors': 'superiors',
  'god wars': 'god wars',
  'the wilderness section': 'the wilderness section',
  'cerberus': 'cerberus',
  'hydra': 'hydra',
  'araxxor': 'araxxor',
  'maggot king': 'maggot king',
  'tombs of amascut': 'tombs of amascut',
  'yama': 'yama',
  'doom of mokhaiotl': 'doom of mokhaiotl',
  'desert treasure 2': 'desert treasure 2',
  'chambers of xeric': 'chambers of xeric',
  'theatre of blood': 'theatre of blood',
  'phosanis nightmare': 'phosanis nightmare',
  'nex': 'nex',
};

export function sectionTitle(key) {
  return SECTION_TITLES[key] ?? key;
}

// the whole layout: which grinds sit in which section, and in what
// order. move ids between arrays to regroup, reorder ids to reorder
// cards, move whole blocks to reorder sections. an id you delete from
// here falls back into its default section instead of disappearing.
export const ORDER = {
  // (edit via /edit.html or by hand)
  'the early game': ['bring', 'tankhelm', 'tankbody', 'tanklegs', 'ddef', 'zaxe', 'spine', 'wsceptre', 'hallowfell'],
  'varlamore era': ['bloodset', 'blueset', 'eclipseset', 'deadeye', 'vigour', 'twinflame', 'dhwand'],
  'the big unlocks': ['dpick', 'dwh', 'zenyte', 'jaw'],
  'demon business': ['synapse', 'bclaw'],
  'the gauntlet': ['cseed', 'bowfa'],
  'slayer era': ['tanz', 'trident', 'tent', 'whip', 'unsired', 'occult', 'icon', 'venator'],
  'superiors': ['heart', 'egem'],
  'god wars': ['bhilt', 'bcp', 'tass', 'zspear'],
  'the wilderness section': ['vwgem', 'vwblade', 'vwhilt'],
  'cerberus': ['prim', 'eternal', 'peg'],
  'hydra': ['claw', 'hleather'],
  'araxxor': ['nox', 'afang'],
  'maggot king': ['efang', 'kisten'],
  'tombs of amascut': ['fang', 'lightb', 'ward', 'mmask', 'mbody', 'mchaps', 'shadow'],
  'yama': ['horn', 'oathhelm', 'oathchest', 'oathlegs'],
  'doom of mokhaiotl': ['ayak', 'cloth', 'treads'],
  'desert treasure 2': ['ultor', 'magus', 'axehead', 'dukeeye', 'lure', 'siren'],
  'chambers of xeric': ['dex', 'arcane', 'dclaws', 'anchat', 'anctop', 'ancbot', 'emaul', 'tbow'],
  'theatre of blood': ['avernic', 'scythe'],
  'phosanis nightmare': ['inqmace', 'inqhelm', 'inqhauberk', 'inqskirt', 'nstaff', 'eldritch', 'volatile', 'harm'],
  'nex': ['torvahelm', 'torvabody', 'torvalegs', 'nihil', 'vambs'],
};

// browser-side overrides saved by /edit.html take effect on top of this
// file. "download config.js" on that page bakes them in permanently.
try {
  if (typeof localStorage !== 'undefined') {
    const ov = JSON.parse(localStorage.getItem('spooncheck-config') ?? 'null');
    if (ov) {
      if (ov.titles) Object.assign(SECTION_TITLES, ov.titles);
      if (ov.order && Object.keys(ov.order).length) {
        for (const k of Object.keys(ORDER)) delete ORDER[k];
        Object.assign(ORDER, ov.order);
      }
      if (ov.weights) Object.assign(WEIGHTS, ov.weights);
      if (ov.verdicts?.length) {
        VERDICTS.length = 0;
        VERDICTS.push(...ov.verdicts);
      }
    }
  }
} catch {
  /* a broken override never breaks the app */
}
