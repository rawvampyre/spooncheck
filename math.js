// spooncheck scoring. every entry becomes a luck score u in (0,1):
// 1 = maximum spoon, 0 = maximum fry, 0.5 = perfectly average.
//
// for a drop you GOT at kc n with rate 1/r:
//   u = chance a fresh account is still dry after n kills (plus a mid-p
//   nudge so the discrete distribution centers right). if you got it at
//   1 kc that's ~1 (you beat everyone), at 5x rate it's tiny.
// for a drop you're STILL DRY on at kc n:
//   all we know is your final kc is somewhere past n, so your luck is
//   uniform on [0, (1-p)^n] — we score the expected value, half that.
//   dry at 0 kc = 0.5 = no information, exactly right.

export function luckOfGet(rate, kc) {
  const p = 1 / rate;
  const n = Math.max(1, Math.round(kc));
  return Math.pow(1 - p, n) + (p * Math.pow(1 - p, n - 1)) / 2;
}

export function luckOfDry(rate, kc) {
  const p = 1 / rate;
  const n = Math.max(0, Math.round(kc));
  return Math.pow(1 - p, n) / 2;
}

// how rare the raw observation is, for per-item display lines
export function stillDryChance(rate, kc) {
  return Math.pow(1 - 1 / rate, Math.max(0, Math.round(kc)));
}

// ladder grinds (the defender grind): cyclopes always drop the NEXT
// defender you need, bronze through rune at 1/50 each and dragon at
// 1/100, so "kc to dragon defender" is a sum of 8 geometric waits. this
// walks the exact phase distribution kill by kill and returns
// tail  = P(still not done after kc kills)
// exact = P(finishing exactly on kill kc)
// got at kc: u = tail + exact/2. still grinding at kc: u = tail/2.
export function ladderDist(rates, kc) {
  const n = Math.max(1, Math.round(kc));
  const ps = rates.map((r) => 1 / r);
  const last = ps.length - 1;
  const state = ps.map(() => 0);
  state[0] = 1;
  let done = 0;
  let exact = 0;
  for (let k = 0; k < n; k++) {
    exact = state[last] * ps[last];
    done += exact;
    for (let i = last; i > 0; i--) {
      state[i] = state[i] * (1 - ps[i]) + state[i - 1] * ps[i - 1];
    }
    state[0] *= 1 - ps[0];
  }
  return { tail: Math.max(0, 1 - done), exact };
}

// toa unique chance from average raid level, per the wiki formula: 1%
// per (10500 - 20 * scaledLevel) points, capped at 55%, with the raid
// level scaling squeezed above 310. assumes a typical completion earns
// about 65 points per raid level, which lands on the community-quoted
// rates (about 1/23 at 300, about 1/14 at 400)
export function toaUniqueChance(raidLevel) {
  const rl = Math.max(0, Math.min(600, Number(raidLevel) || 0));
  const scaled = rl <= 310 ? rl : rl <= 430 ? 310 + (rl - 310) / 3 : 350 + (rl - 430) / 6;
  const points = 65 * rl;
  return Math.min(0.55, points / (10500 - 20 * scaled) / 100);
}

// each toa unique's share of the purple. the weightings drift between
// raid level 300 and 500 (fang and lightbearer get relatively rarer,
// the rest more common), so interpolate between the wiki chest page's
// published rows and hold flat outside them
const TOA_SHARE = {
  rl: [300, 350, 400, 450, 500],
  fang: [7 / 24, 1 / 3.67, 1 / 4.75, 1 / 4.5, 1 / 5.5],
  lightb: [7 / 24, 1 / 3.67, 1 / 3.8, 1 / 4.5, 1 / 4.71],
  ward: [3 / 24, 1 / 7.33, 1 / 6.33, 1 / 6, 1 / 5.5],
  masori: [2 / 24, 1 / 11, 1 / 9.5, 1 / 9, 1 / 8.25],
  shadow: [1 / 24, 1 / 22, 1 / 19, 1 / 18, 1 / 16.5],
};
export function toaItemShare(key, raidLevel) {
  const s = TOA_SHARE[key];
  if (!s) return 0;
  const rls = TOA_SHARE.rl;
  const rl = Math.max(rls[0], Math.min(rls[rls.length - 1], Number(raidLevel) || 0));
  let i = 0;
  while (i < rls.length - 2 && rl > rls[i + 1]) i++;
  const t = (rl - rls[i]) / (rls[i + 1] - rls[i]);
  return s[i] + (s[i + 1] - s[i]) * t;
}

// multi-drop grinds (zenytes: you usually want 4): "I have `count` at
// `kc` kills". under the null the count is Binomial(kc, p), so the luck
// score is the mid-p tail P(X < count) + P(X = count)/2 — more drops
// than the rate owes you = spoon, fewer = fry. count 0 reduces exactly
// to luckOfDry. terms computed iteratively, stable for small counts.
export function luckOfCount(rate, kc, count) {
  const p = 1 / rate;
  const n = Math.max(0, Math.round(kc));
  const k = Math.max(0, Math.round(count));
  let term = Math.pow(1 - p, n); // P(X = 0)
  let below = 0;
  for (let i = 0; i < k; i++) {
    below += term;
    term *= ((n - i) / (i + 1)) * (p / (1 - p)); // P(X = i+1)
  }
  return Math.min(1, below + term / 2);
}

// a FINISHED dupe-protected set (moon sets, noxious pieces): the count
// is capped, so the observation is "at least `cap` drops", not "exactly
// `cap`". mid-p over the whole >= cap mass — extra kc past completion
// carries no dryness. u = P(X < cap) + P(X >= cap)/2 = (1 + P(X<cap))/2.
export function luckOfCapped(rate, kc, cap) {
  const below = countTail(rate, kc, cap - 1); // P(X < cap)
  return Math.min(1, below + (1 - below) / 2);
}

export function multiplier(rate, kc) {
  return kc / rate;
}

// P(X <= count) for counted grinds: the share of accounts who'd have
// this few or fewer by now — the honest "only X% do this badly" number.
// (the score u uses mid-p, which halves the tied mass for ranking; that's
// right for percentiles but understates the tail for display.)
export function countTail(rate, kc, count) {
  const p = 1 / rate;
  const n = Math.max(0, Math.round(kc));
  const k = Math.max(0, Math.round(count));
  let term = Math.pow(1 - p, n);
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += term;
    term *= ((n - i) / (i + 1)) * (p / (1 - p));
  }
  return Math.min(1, sum);
}

// overall account percentile: under pure average rng each score is
// ~uniform, so the weighted mean of k of them is ~normal with
// var = sum(w^2) / (12 * sum(w)^2). weights let the grinds that define an
// account (dwh, tbow, oathplate) move the verdict more than a berserker
// ring ever should. the CLT holds up fine from ~3 entries for a meme
// verdict. binary-scored window entries (toa/yama/doom) actually carry
// less than uniform variance, so using 1/12 for everything slightly
// understates extremes — deliberately: it also protects the normal
// approximation when only a few grinds are declared.
export function overallPercentile(scores, weights) {
  const k = scores.length;
  if (!k) return 50;
  const w = weights ?? scores.map(() => 1);
  const W = w.reduce((a, b) => a + b, 0);
  if (!(W > 0)) return 50; // every grind weighted out = no information
  const mean = scores.reduce((a, s, i) => a + s * w[i], 0) / W;
  const sd = Math.sqrt(w.reduce((a, b) => a + b * b, 0) / (12 * W * W));
  return 100 * phi((mean - 0.5) / sd);
}

export function phi(z) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// Abramowitz & Stegun 7.1.26, plenty for two displayed digits
function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

import { VERDICTS } from './config.js';

export { VERDICTS };

export function verdictFor(pct) {
  // sort defensively: the config editor lets bands be reordered, and a
  // mis-sorted list would hand out wrong verdicts
  const bands = [...VERDICTS].sort((a, b) => b.min - a.min);
  return bands.find((v) => pct >= v.min) ?? bands[bands.length - 1];
}
