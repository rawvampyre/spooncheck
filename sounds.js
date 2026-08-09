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
  ags: 'sounds/ags_spec.wav', // for the 73s
};

const cache = {};
const lastAt = {};

// site-wide volume and mute, remembered per browser
let master = 1;
let muted = false;
try {
  const s = JSON.parse(localStorage.getItem('spooncheck-vol') ?? 'null');
  if (s) {
    master = Number.isFinite(s.v) ? s.v : 1;
    muted = !!s.m;
  }
} catch {
  /* defaults stand */
}

function persist() {
  try {
    localStorage.setItem('spooncheck-vol', JSON.stringify({ v: master, m: muted }));
  } catch {
    /* fine */
  }
}

export function getMaster() {
  return master;
}

export function setMaster(v) {
  master = Math.max(0, Math.min(1, v));
  persist();
  if (music) music.volume = musicVolume();
}

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = m;
  persist();
  if (music) music.volume = musicVolume();
}

// background music: flute salad on loop, quiet, riding the same master
// volume and mute
let music = null;
const MUSIC_BASE = 0.28;

function musicVolume() {
  return muted ? 0 : Math.max(0, Math.min(1, MUSIC_BASE * master));
}

export function startMusic() {
  try {
    if (!music) {
      music = new Audio('sounds/flute_salad.ogg');
      music.loop = true;
    }
    music.volume = musicVolume();
    if (music.paused) music.play().catch(() => {});
  } catch {
    /* music is never load-bearing */
  }
}

export function play(name, vol = 0.5) {
  try {
    if (muted || master <= 0) return;
    const src = SOUNDS[name];
    if (!src) return;
    const now = performance.now();
    if (now - (lastAt[name] ?? 0) < 60) return; // never machine-gun a sound
    lastAt[name] = now;
    const base = (cache[name] ??= new Audio(src));
    const a = base.cloneNode();
    a.volume = Math.max(0, Math.min(1, vol * master));
    a.play().catch(() => {});
  } catch {
    /* silence over crashes, always */
  }
}
