// account auto fill from two public CORS-open apis:
//   wise old man  -> boss kcs + clue casket counts (tracks the hiscores)
//   wikisync      -> which collection log slots you own, IF the account has
//                    the WikiSync runelite plugin and synced its log
// both are best effort. anything we cant learn stays manual.

import { ITEMS } from './items.js';

const WOM = 'https://api.wiseoldman.net/v2/players/';
const SYNC = 'https://sync.runescape.wiki/runelite/player/';

export async function lookupAccount(name) {
  const user = name.trim();
  if (!user) throw new Error('type your osrs name first');
  const [wom, clog] = await Promise.all([fetchWom(user), fetchClog(user)]);
  if (!wom && !clog) {
    throw new Error('nothing found for that name. is it spelled right?');
  }

  const out = { kc: {}, owned: null, womOk: !!wom, clogOk: !!clog };

  if (wom) {
    const bosses = wom.latestSnapshot?.data?.bosses ?? {};
    const acts = wom.latestSnapshot?.data?.activities ?? {};
    for (const item of ITEMS) {
      if (!item.wom) continue;
      const kc = item.womKind === 'activity' ? acts[item.wom]?.score : bosses[item.wom]?.kills;
      if (Number.isFinite(kc) && kc > 0) out.kc[item.id] = kc;
    }
  }

  if (clog) {
    out.owned = {};
    for (const item of ITEMS) {
      // no clog ids on file for this grind = ownership is unknowable from
      // the log, never "not owned"
      out.owned[item.id] = item.clogIds?.length ? item.clogIds.some((id) => clog.has(id)) : null;
    }
  }

  return out;
}

async function fetchWom(user) {
  const enc = encodeURIComponent(user);
  try {
    let res = await fetch(WOM + enc);
    if (res.status === 404) {
      // not tracked yet: this asks wom to fetch them off the hiscores and
      // returns the fresh snapshot directly
      res = await fetch(WOM + enc, { method: 'POST' });
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchClog(user) {
  try {
    const res = await fetch(SYNC + encodeURIComponent(user) + '/STANDARD');
    if (!res.ok) return null;
    const j = await res.json();
    const arr = Array.isArray(j.collection_log) ? j.collection_log : [];
    // an empty log means the account never synced it, not that it owns
    // nothing. unknown stays unknown.
    if (!arr.length) return null;
    return new Set(arr.map(Number));
  } catch {
    return null;
  }
}
