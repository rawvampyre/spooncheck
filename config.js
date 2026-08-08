// spooncheck config. edit the values on the RIGHT of each colon.
// the left side is the internal key — leave it alone or answers
// stop matching up.

export const HANDLE = 'rawvampyre';
export const TWITCH = 'twitch.tv/rawvampyre';

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
