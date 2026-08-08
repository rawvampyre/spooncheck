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
  const [wom, clogRes] = await Promise.all([fetchWom(user), fetchClog(user)]);
  const clog = clogRes.set;
  if (!wom && !clog) {
    throw new Error('nothing found for that name. use your exact in game name');
  }

  const out = { kc: {}, owned: null, womOk: !!wom, clogOk: !!clog, clogStatus: clogRes.status };

  if (wom) {
    const bosses = wom.latestSnapshot?.data?.bosses ?? {};
    const acts = wom.latestSnapshot?.data?.activities ?? {};
    for (const item of ITEMS) {
      if (!item.wom) continue;
      const kc = item.womKind === 'activity' ? acts[item.wom]?.score : bosses[item.wom]?.kills;
      if (Number.isFinite(kc) && kc > 0) out.kc[item.id] = kc;
    }
    // section inputs the hiscores carry. yama kc lands in the solo box
    // as a best guess, the player corrects the split
    out.pools = {};
    const raids = (bosses.tombs_of_amascut?.kills ?? 0) + (bosses.tombs_of_amascut_expert?.kills ?? 0);
    if (raids > 0) out.pools.toa = { raids };
    const yamaKills = bosses.yama?.kills ?? 0;
    if (yamaKills > 0) out.pools.yama = { soloKc: yamaKills };
  }

  if (clog) {
    out.owned = {};
    out.counts = {};
    for (const item of ITEMS) {
      // no clog ids on file for this grind = ownership is unknowable from
      // the log, never "not owned". set grinds (clogAll) need every piece.
      out.owned[item.id] = item.clogIds?.length
        ? item.clogAll
          ? item.clogIds.every((id) => clog.has(id))
          : item.clogIds.some((id) => clog.has(id))
        : null;
      // piece-built counted grinds (moon sets, noxious halberd): every
      // piece is its own log slot, so the count is knowable exactly
      if (item.multi && (item.clogIds?.length ?? 0) >= item.multi) {
        out.counts[item.id] = item.clogIds.filter((id) => clog.has(id)).length;
      }
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

// status tells the caller WHY there's no log: 'none' = wikisync has never
// heard of this name (plugin not installed or wrong rsn), 'nolog' = the
// account syncs but the collection log part was never uploaded (needs the
// sync button inside the in-game log window), 'ok' = we have it
async function fetchClog(user) {
  try {
    const res = await fetch(SYNC + encodeURIComponent(user) + '/STANDARD');
    if (!res.ok) return { status: 'none', set: null };
    const j = await res.json();
    if (j.error) return { status: 'none', set: null };
    const arr = Array.isArray(j.collection_log) ? j.collection_log : [];
    if (!arr.length) return { status: 'nolog', set: null };
    return { status: 'ok', set: new Set(arr.map(Number)) };
  } catch {
    return { status: 'none', set: null };
  }
}
