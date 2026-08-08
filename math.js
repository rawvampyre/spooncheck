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
  const rl = Math.max(0, Math.min(1000, Number(raidLevel) || 0));
  const scaled = rl <= 310 ? rl : rl <= 430 ? 310 + (rl - 310) / 3 : 350 + (rl - 430) / 6;
  const points = 65 * rl;
  return Math.min(0.55, points / (10500 - 20 * scaled) / 100);
}

// multi-drop grinds (zenytes: you usually want 4): "I have `count` at
// `kc` kills". under the null the count is Binomial(kc, p), so the luck
// score is the mid-p tail P(X < count) + P(X = count)/2 — more drops
// than the rate owes you = spoon, fewer = fry. count 0 reduces exactly
// to luckOfDry. terms computed iteratively, stable for small counts.
export function luckOfCount(rate, kc, count) {
  const p = 1 / rate;
  const n = Math.max(1, Math.round(kc));
  const k = Math.max(0, Math.round(count));
  let term = Math.pow(1 - p, n); // P(X = 0)
  let below = 0;
  for (let i = 0; i < k; i++) {
    below += term;
    term *= ((n - i) / (i + 1)) * (p / (1 - p)); // P(X = i+1)
  }
  return Math.min(1, below + term / 2);
}

export function multiplier(rate, kc) {
  return kc / rate;
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

export function verdictFor(pct) {
  return VERDICTS.find((v) => pct >= v.min);
}
