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

export function multiplier(rate, kc) {
  return kc / rate;
}

// overall account percentile: under pure average luck each score is
// ~uniform, so the mean of k of them is ~normal(0.5, 1/12k). the CLT is
// doing the heavy lifting here and it holds up fine from ~3 entries for
// a meme verdict.
export function overallPercentile(scores) {
  const k = scores.length;
  if (!k) return 50;
  const mean = scores.reduce((a, b) => a + b, 0) / k;
  const z = (mean - 0.5) * Math.sqrt(12 * k);
  return 100 * phi(z);
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
  { min: 25, name: 'OVERCOOKED', blurb: 'the grind respects you a little too much' },
  { min: 8, name: 'FRIED', blurb: 'you have seen drop tables no account should see' },
  { min: 1, name: 'DEEP FRIED', blurb: 'the desert sends you postcards' },
  { min: -1, name: 'STATISTICALLY CURSED', blurb: 'this account is a warning to others' },
];

export function verdictFor(pct) {
  return VERDICTS.find((v) => pct >= v.min);
}
