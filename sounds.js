// real osrs sound effects, played at moments rather than every tap.
// sound is never load-bearing: a missing file or blocked autoplay is
// silently ignored.

const SOUNDS = {
  click: 'sounds/chop.ogg', // short thock for buttons and pile landings
  jingle: 'sounds/clue_jingle.ogg', // treasure trail complete
  mega: 'sounds/land_mega.wav', // unique drop
  moan: 'sounds/ghost_moan.wav',
  splash: 'sounds/spell_splash.wav',
  cast: 'sounds/tb_cast.wav',
  firework: 'sounds/firework.ogg', // level up
};

const cache = {};
const lastAt = {};

export function play(name, vol = 0.5) {
  try {
    const src = SOUNDS[name];
    if (!src) return;
    const now = performance.now();
    if (now - (lastAt[name] ?? 0) < 60) return; // never machine-gun a sound
    lastAt[name] = now;
    const base = (cache[name] ??= new Audio(src));
    const a = base.cloneNode();
    a.volume = vol;
    a.play().catch(() => {});
  } catch {
    /* silence over crashes, always */
  }
}
