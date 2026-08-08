// account auto fill from wise old man (CORS-open, tracks the hiscores):
// boss kill counts, clue casket counts, and the section inputs the
// hiscores carry. got or dry stays a manual answer on every card.

import { ITEMS } from './items.js';

const WOM = 'https://api.wiseoldman.net/v2/players/';

export async function lookupAccount(name) {
  const user = name.trim();
  if (!user) throw new Error('type your osrs name first');
  const wom = await fetchWom(user);
  if (!wom) throw new Error('nothing found for that name. use your exact in game name');

  const out = { kc: {}, pools: {} };
  const bosses = wom.latestSnapshot?.data?.bosses ?? {};
  const acts = wom.latestSnapshot?.data?.activities ?? {};
  for (const item of ITEMS) {
    if (!item.wom) continue;
    const kc = item.womKind === 'activity' ? acts[item.wom]?.score : bosses[item.wom]?.kills;
    if (Number.isFinite(kc) && kc > 0) out.kc[item.id] = kc;
  }

  // section inputs the hiscores carry. yama kc lands in the solo box as
  // a best guess, the player corrects the split
  const raids = (bosses.tombs_of_amascut?.kills ?? 0) + (bosses.tombs_of_amascut_expert?.kills ?? 0);
  if (raids > 0) out.pools.toa = { raids };
  const yamaKills = bosses.yama?.kills ?? 0;
  if (yamaKills > 0) out.pools.yama = { soloKc: yamaKills };

  return out;
}

async function fetchWom(user) {
  const enc = encodeURIComponent(user);
  try {
    // ask wom to refresh the player off the hiscores first so the kcs
    // are current (this also tracks brand new names). if the update is
    // cooling down or fails, fall back to their last snapshot.
    let res = await fetch(WOM + enc, { method: 'POST' });
    if (!res.ok) res = await fetch(WOM + enc);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
