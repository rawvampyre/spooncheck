import { ITEMS, STAGES, itemsInStage, iconUrl, POOLS } from './items.js';
import { luckOfGet, luckOfDry, luckOfCount, ladderDist, toaUniqueChance, stillDryChance, multiplier, overallPercentile, verdictFor } from './math.js';
import { lookupAccount } from './lookup.js';

const CONFIG = {
  handle: 'rawvampyre',
  twitch: 'twitch.tv/rawvampyre',
};

const STORE_KEY = 'spooncheck-v2';

// ---- state ----------------------------------------------------------------

let state = load();
let importSummary = null;

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) ?? {};
    // items whose input style changed leave stale modes behind. counted
    // items accept got/dry answers as counts (dry = 0, got = fill in),
    // plain items with a leftover count mode reset to skip.
    for (const item of ITEMS) {
      const e = s[item.id];
      if (!e) continue;
      if (!item.multi && e.mode === 'count') e.mode = 'skip';
      if (item.multi && (e.mode === 'got' || e.mode === 'dry')) {
        if (e.mode === 'dry') e.count = 0;
        e.mode = 'count';
      }
    }
    return s;
  } catch {
    return {};
  }
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function entryFor(id) {
  return (state[id] ??= { mode: 'skip', kc: '' });
}

// section-level inputs (toa raid level, yama solo/duo kills...)
function poolState(name) {
  state._pools ??= {};
  return (state._pools[name] ??= {});
}

function poolHasData(name) {
  const ps = state._pools?.[name];
  return Boolean(ps && Object.values(ps).some((v) => Number(v) > 0));
}

// ---- screens --------------------------------------------------------------

const screens = {
  intro: document.getElementById('intro'),
  flow: document.getElementById('flow'),
  wrap: document.getElementById('wrap'),
};

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
  window.scrollTo(0, 0);
}

// ---- the guided flow ------------------------------------------------------
// steps: import -> one per chart era -> review. friendly assistant energy,
// maximum spoon guaranteed or your gp back.

const STEPS = ['import', ...STAGES, 'review'];
let stepIdx = 0;

const flowBar = document.getElementById('flow-bar');
const flowStep = document.getElementById('flow-step');
const flowBody = document.getElementById('flow-body');

const SECTION_BLURB = 'mark what youve done here, skip what you havent';

document.getElementById('start-btn').addEventListener('click', () => {
  stepIdx = 0;
  show('flow');
  renderStep();
});

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function btn(cls, label, onClick) {
  const b = el('button', cls, label);
  b.addEventListener('click', onClick);
  return b;
}

function renderStep() {
  const step = STEPS[stepIdx];
  flowBar.style.setProperty('--flow-pct', `${Math.round((stepIdx / (STEPS.length - 1)) * 100)}%`);
  flowStep.textContent = step === 'import' ? 'auto fill' : step === 'review' ? 'review' : `section ${stepIdx} of ${STAGES.length}`;
  flowBody.replaceChildren();
  window.scrollTo(0, 0);
  if (step === 'import') renderImport();
  else if (step === 'review') renderReview();
  else renderSection(step);
}

function navRow(nextLabel = 'continue') {
  const row = el('div', 'nav-row');
  if (stepIdx > 0) row.appendChild(btn('nav-btn ghost', 'back', () => { stepIdx--; renderStep(); }));
  row.appendChild(btn('nav-btn', nextLabel, () => { stepIdx++; renderStep(); }));
  return row;
}

// ---- step: import ---------------------------------------------------------

function renderImport() {
  flowBody.append(
    el('h2', 'step-title', 'auto fill'),
    el('p', 'step-sub', 'type your rsn to fill your grinds in from the hiscores and your collection log'),
  );

  const row = el('div', 'import-row');
  const input = el('input', 'import-input');
  input.placeholder = 'in game name';
  input.maxLength = 12;
  input.autocomplete = 'off';
  input.value = state._rsn ?? '';
  input.addEventListener('input', () => {
    state._rsn = input.value;
    save();
  });
  const go = btn('nav-btn', 'auto fill', () => runImport(input.value, go, status));
  row.append(input, go);
  const status = el('p', 'import-status', '');
  flowBody.append(row, status);

  if (importSummary) flowBody.appendChild(importSummaryBox());

  const alt = el('div', 'nav-row');
  alt.appendChild(btn('nav-btn ghost', 'fill it in manually', () => { stepIdx++; renderStep(); }));
  if (importSummary) alt.appendChild(btn('nav-btn', 'continue', () => { stepIdx++; renderStep(); }));
  flowBody.appendChild(alt);

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') runImport(input.value, go, status);
  });
}

function importSummaryBox() {
  const box = el('div', 'ok-box');
  box.appendChild(el('div', 'ok-title', 'import complete'));
  for (const line of importSummary) box.appendChild(el('div', 'ok-line', line));
  return box;
}

async function runImport(name, goBtn, status) {
  goBtn.disabled = true;
  status.textContent = 'reviewing your account...';
  try {
    const r = await lookupAccount(name);
    let got = 0;
    let dry = 0;
    let skipped = 0;
    // prefill section inputs where the hiscores carry them
    if (r.pools) {
      for (const [poolName, vals] of Object.entries(r.pools)) {
        const ps = poolState(poolName);
        for (const [k, v] of Object.entries(vals)) if (!ps[k] && v) ps[k] = v;
      }
    }
    for (const item of ITEMS) {
      const e = entryFor(item.id);
      const kc = r.kc[item.id];
      const owned = r.owned?.[item.id];
      const pieces = r.counts?.[item.id];
      if (item.multi && pieces !== undefined) {
        // the log counts these piece by piece
        if (pieces > 0 || kc) {
          e.mode = 'count';
          e.count = pieces;
          if (kc && !e.kc) e.kc = kc;
          if (pieces > 0) got++;
          else dry++;
        } else {
          e.mode = 'skip';
          e.kc = '';
          skipped++;
        }
        continue;
      }
      if (owned === true) {
        // multi-drop grinds: the log only proves you have at least one,
        // you still tell us how many and at what kc
        e.mode = item.multi ? 'count' : 'got';
        if (kc && !e.kc) e.kc = kc;
        got++;
      } else if (owned === false && kc) {
        if (item.multi) {
          e.mode = 'count';
          e.count = 0;
        } else {
          e.mode = 'dry';
        }
        e.kc = kc;
        dry++;
      } else if (owned === false) {
        e.mode = 'skip';
        e.kc = '';
        skipped++;
      } else if (kc && e.mode === 'skip') {
        e.kc = kc;
      }
    }
    save();
    importSummary = [];
    if (r.clogOk) {
      importSummary.push(`${got} grinds marked got from your collection log`);
      importSummary.push(`${dry} grinds marked still dry with kcs on record`);
      importSummary.push(`${skipped} grinds skipped, our records show you havent started them`);
      importSummary.push('heads up: for items you own we filled in your CURRENT kc. lower it to the real drop kc if you remember');
    } else {
      importSummary.push(`kcs imported for ${Object.keys(r.kc).length} grinds`);
      importSummary.push(
        r.clogStatus === 'nolog'
          ? 'wikisync sees this account but the collection log part was never uploaded. in game: open your collection log and click the sync button wikisync adds inside the log window, then run this again'
          : 'wikisync has never heard of this name. WikiSync is a plugin hub plugin: in runelite open the plugin hub (puzzle piece icon), search WikiSync, install it, turn it on and log in. if its already on, double check this is the exact in game name',
      );
    }
    if (!r.womOk) importSummary.push('hiscores had nothing for that name btw, spelling?');
    status.textContent = '';
    renderStep();
  } catch (err) {
    status.textContent = err.message ?? 'import failed. do it by hand like our ancestors';
  } finally {
    goBtn.disabled = false;
  }
}

// ---- step: era section ----------------------------------------------------

function renderSection(stage) {
  const items = itemsInStage(stage);
  flowBody.append(
    el('h2', 'step-title', stage),
    el('p', 'step-sub', SECTION_BLURB),
  );
  const answered = items.filter((i) => state[i.id] && state[i.id].mode !== 'skip').length;
  if (importSummary && !answered) {
    flowBody.appendChild(el('p', 'section-empty', 'nothing started here according to your import. continue, or correct it below'));
  }
  const pool = items.find((i) => i.pool)?.pool;
  if (pool) flowBody.appendChild(poolInputs(pool));
  const list = el('div', 'item-list');
  for (const item of items) list.appendChild(itemCard(item));
  flowBody.append(list, navRow('continue'));
}

// shared numbers for a whole section (raid level, solo and duo kills,
// delves per level, group size)
function poolInputs(name) {
  const ps = poolState(name);
  const wrap = el('div', 'pool-row');
  for (const [key, label, min] of POOLS[name].fields) {
    const box = el('label', 'pool-field');
    const input = el('input');
    input.type = 'number';
    input.min = String(min ?? 0);
    input.inputMode = 'numeric';
    input.placeholder = String(min ?? 0);
    input.value = ps[key] ?? '';
    input.addEventListener('input', () => {
      ps[key] = input.value;
      save();
    });
    box.append(el('span', 'pool-label', label), input);
    wrap.appendChild(box);
  }
  return wrap;
}

function itemCard(item) {
  const card = el('div', 'item-card');
  const unit = item.unit ?? 'kc';
  // window pools (toa, yama, doom): kills live in the section inputs, the
  // card only answers got or dry
  const windowPool = item.pool && POOLS[item.pool].kind === 'window';

  const icon = el('img', 'item-icon');
  icon.src = iconUrl(item);
  icon.alt = item.name;
  icon.loading = 'lazy';

  const info = el('div', 'item-info');
  const sub = el('div', 'item-sub');
  info.append(el('div', 'item-name', item.name), sub);
  if (item.note) info.appendChild(el('div', 'item-note', item.note));

  const modes = el('div', 'item-modes');
  const kcWrap = el('div', 'kc-wrap hidden');

  let variantSel = null;
  if (item.variants) {
    // the rate depends on where you grind it
    variantSel = el('select', 'pick-sel');
    for (const [label, r] of item.variants) {
      const o = el('option', null, label);
      o.value = r;
      variantSel.appendChild(o);
    }
    kcWrap.appendChild(variantSel);
  }
  let groupSel = null;
  if (item.group) {
    // contribution-scaled drops: your damage share divides the rate.
    // groupMax caps the options for solo-or-duo-only content
    groupSel = el('select', 'pick-sel');
    const opts = [['solo', '1'], ['duo', '2'], ['trio', '3'], ['mass', 'mass']].filter(
      ([, v]) => (v === 'mass' ? (item.groupMax ?? 99) > 3 : Number(v) <= (item.groupMax ?? 99)),
    );
    for (const [label, v] of opts) {
      const o = el('option', null, label);
      o.value = v;
      groupSel.appendChild(o);
    }
    kcWrap.appendChild(groupSel);
  }
  let massInput = null;
  if (item.group && (item.groupMax ?? 99) > 3) {
    // picking mass asks how many players it actually was
    massInput = el('input', 'hidden');
    massInput.type = 'number';
    massInput.min = '4';
    massInput.max = '100';
    massInput.inputMode = 'numeric';
    massInput.placeholder = 'players';
    kcWrap.appendChild(massInput);
  }
  let countInput = null;
  if (item.multi) {
    countInput = el('input');
    countInput.type = 'number';
    countInput.min = '0';
    countInput.max = '9';
    countInput.inputMode = 'numeric';
    countInput.placeholder = 'how many';
    kcWrap.appendChild(countInput);
  }
  let kcInput = null;
  const kcLabel = el('span', 'kc-label');
  if (!windowPool) {
    kcInput = el('input');
    kcInput.type = 'number';
    kcInput.min = '1';
    kcInput.inputMode = 'numeric';
    kcInput.placeholder = unit;
    kcWrap.append(kcInput, kcLabel);
  }

  const modeDefs = item.multi
    ? [['skip', 'skip'], ['count', 'count']]
    : [['skip', 'skip'], ['got', 'got it'], ['dry', 'still dry']];
  const btns = {};
  for (const [mode, label] of modeDefs) {
    const b = btn('mode-btn', label, () => {
      entryFor(item.id).mode = mode;
      save();
      render();
      if (mode !== 'skip') (countInput && !countInput.value ? countInput : kcInput)?.focus();
    });
    modes.appendChild(b);
    btns[mode] = b;
  }

  function render() {
    const e = entryFor(item.id);
    for (const [m, b] of Object.entries(btns)) b.classList.toggle('on', e.mode === m);
    card.classList.toggle('active', e.mode !== 'skip');
    const hasControls = Boolean(variantSel || groupSel || countInput || kcInput);
    kcWrap.classList.toggle('hidden', e.mode === 'skip' || !hasControls);
    const vRate = item.variants ? Number(e.variant) || item.variants[0][1] : item.rate;
    sub.textContent = windowPool || item.ladder ? item.from : `1/${vRate} from ${item.from}`;
    kcLabel.textContent = item.multi
      ? `${unit} so far`
      : item.ladder
        ? e.mode === 'got'
          ? `total ${unit} when it completed`
          : `total ${unit} so far`
        : e.mode === 'got'
          ? `${unit} it dropped at`
          : `${unit} so far, no drop`;
    if (kcInput && String(e.kc) !== kcInput.value) kcInput.value = e.kc;
    if (countInput && String(e.count ?? '') !== countInput.value) countInput.value = e.count ?? '';
    if (variantSel && String(Number(e.variant) || item.variants[0][1]) !== variantSel.value) {
      variantSel.value = String(Number(e.variant) || item.variants[0][1]);
    }
    if (groupSel) {
      const g = Number(e.group) || 1;
      const isMass = g > 3;
      groupSel.value = isMass ? 'mass' : String(g);
      if (massInput) {
        massInput.classList.toggle('hidden', !isMass);
        if (isMass && String(g) !== massInput.value) massInput.value = g;
      }
    }
  }

  kcInput?.addEventListener('input', () => {
    entryFor(item.id).kc = kcInput.value;
    save();
  });
  countInput?.addEventListener('input', () => {
    entryFor(item.id).count = countInput.value;
    save();
  });
  variantSel?.addEventListener('change', () => {
    entryFor(item.id).variant = Number(variantSel.value);
    save();
    render();
  });
  groupSel?.addEventListener('change', () => {
    const v = groupSel.value;
    entryFor(item.id).group = v === 'mass' ? Number(massInput?.value) || 10 : Number(v);
    save();
    render();
    if (v === 'mass') massInput?.focus();
  });
  massInput?.addEventListener('input', () => {
    const n = Number(massInput.value);
    entryFor(item.id).group = n >= 4 ? n : 10;
    save();
  });

  card.append(icon, info, modes, kcWrap);
  render();
  return card;
}

// ---- step: review ---------------------------------------------------------

function computeResults() {
  const rows = [];
  for (const item of ITEMS) {
    const e = state[item.id];
    if (!e || e.mode === 'skip') continue;

    // window pools: the kill window lives in the section inputs, the
    // answer is just got or dry inside it. q = chance of still being dry
    // over the whole window, scored as a binary outcome.
    if (item.pool && POOLS[item.pool].kind === 'window') {
      if (e.mode !== 'got' && e.mode !== 'dry') continue;
      const got = e.mode === 'got';
      const ps = poolState(item.pool);
      let q = 1;
      let window = 0;
      let expected = 0;
      if (item.pool === 'toa') {
        const raids = Math.round(Number(ps.raids) || 0);
        const p = (toaUniqueChance(ps.raidLevel) * item.pweight) / 24;
        // no raids or no raid level = nothing to score against
        if (!raids || !(p > 0)) continue;
        q = Math.pow(1 - p, raids);
        window = raids;
        expected = raids * p;
      } else if (item.pool === 'yama') {
        const solo = Math.round(Number(ps.soloKc) || 0);
        const duo = Math.round(Number(ps.duoKc) || 0);
        if (!solo && !duo) continue;
        q = Math.pow(1 - 1 / item.rate, solo) * Math.pow(1 - 1 / (2 * item.rate), duo);
        window = solo + duo;
        expected = solo / item.rate + duo / (2 * item.rate);
      } else if (item.pool === 'doom') {
        let delves = 0;
        (item.delveRates ?? []).forEach((r, i) => {
          const n = Math.round(Number(ps[`d${i + 2}`]) || 0);
          if (!r || !n) return;
          q *= Math.pow(1 - 1 / r, n);
          delves += n;
          expected += n / r;
        });
        if (!delves) continue;
        window = delves;
      }
      rows.push({
        item,
        got,
        kc: window,
        // mult keeps its meaning: expected drops over the window
        u: got ? (1 + q) / 2 : q / 2,
        mult: expected,
        dryChance: q,
      });
      continue;
    }

    const kc = Math.round(Number(e.kc));
    if (!Number.isFinite(kc) || kc < 1) continue;
    const variantRate = item.variants ? Number(e.variant) || item.variants[0][1] : item.rate;
    const groupMult = item.group ? Math.max(1, Number(e.group) || 1) : 1;
    const nexMult = item.pool === 'nex' ? Math.max(1, Number(poolState('nex').group) || 1) : 1;
    const rate = variantRate * groupMult * nexMult;

    if (item.multi) {
      if (e.mode !== 'count') continue;
      const count = Math.max(0, Math.round(Number(e.count) || 0));
      rows.push({
        item,
        got: count > 0,
        kc,
        count,
        u: luckOfCount(rate, kc, count),
        // average rates spent per drop: 1x = exactly on rate
        mult: multiplier(rate, kc) / Math.max(1, count),
        dryChance: stillDryChance(rate, kc),
      });
      continue;
    }
    if (item.ladder) {
      if (e.mode !== 'got' && e.mode !== 'dry') continue;
      const got = e.mode === 'got';
      const { tail, exact } = ladderDist(item.ladder.map((r) => r * groupMult), kc);
      rows.push({
        item,
        got,
        kc,
        u: got ? Math.min(1, tail + exact / 2) : tail / 2,
        mult: multiplier(rate, kc), // rate = the grind's expected total
        dryChance: tail,
      });
      continue;
    }
    if (e.mode !== 'got' && e.mode !== 'dry') continue;
    const got = e.mode === 'got';
    rows.push({
      item,
      got,
      kc,
      u: got ? luckOfGet(rate, kc) : luckOfDry(rate, kc),
      mult: multiplier(rate, kc),
      dryChance: stillDryChance(rate, kc),
    });
  }
  return rows;
}

function renderReview() {
  const rows = computeResults();
  flowBody.append(
    el('h2', 'step-title', 'review'),
    el('p', 'step-sub', `${rows.length} grinds filled in. check them over, then submit`),
  );

  const list = el('div', 'review-list');
  for (const stage of STAGES) {
    const inStage = rows.filter((r) => r.item.stage === stage);
    if (!inStage.length) continue;
    const box = el('div', 'review-stage');
    const head = el('div', 'review-head');
    head.append(el('span', 'review-stage-name', stage), btn('review-edit', 'edit', () => {
      stepIdx = STEPS.indexOf(stage);
      renderStep();
    }));
    box.appendChild(head);
    for (const r of inStage) {
      const line = el('div', 'review-row');
      const ic = el('img', 'board-icon');
      ic.src = iconUrl(r.item);
      ic.alt = r.item.name;
      line.append(
        ic,
        el('span', 'review-name', r.item.name),
        el(
          'span',
          `review-verdict ${r.u >= 0.5 ? 'ok' : 'bad'}`,
          r.count !== undefined
            ? `${r.count} at ${r.kc.toLocaleString()}`
            : r.got
              ? `got at ${r.kc.toLocaleString()}`
              : `${r.kc.toLocaleString()} dry`,
        ),
      );
      box.appendChild(line);
    }
    list.appendChild(box);
  }
  flowBody.appendChild(list);

  const row = el('div', 'nav-row');
  row.appendChild(btn('nav-btn ghost', 'back', () => { stepIdx--; renderStep(); }));
  const submit = btn('nav-btn big', 'submit', () => {
    if (rows.length < 3) {
      submit.classList.remove('shake');
      void submit.offsetWidth;
      submit.classList.add('shake');
      hint.textContent = 'needs at least 3 grinds with kcs';
      return;
    }
    runProcessing(rows);
  });
  row.appendChild(submit);
  const hint = el('p', 'review-hint', rows.length < 3 ? 'needs at least 3 grinds with kcs' : '');
  flowBody.append(row, hint);
}

// ---- the processing gag ---------------------------------------------------

const PROCESSING_LINES = [
  ['reviewing your grinds...', 900],
  ['cross checking the collection log...', 900],
  ['consulting the rng gods...', 1000],
  ['your account has been selected for a random audit...', 1400],
  ['audit passed. congratulations', 900],
  ['calculating your final assessment...', 900],
];

function runProcessing(rows) {
  const proc = el('div', 'processing');
  // everything they declared spirals into the vortex while we calculate
  const vortex = el('div', 'vortex');
  for (const r of rows.slice(0, 24)) {
    const img = itemImg(r.item, 'vortex-icon');
    img.style.setProperty('--a0', `${Math.round(Math.random() * 360)}deg`);
    img.style.setProperty('--d', `${(1.5 + Math.random() * 1.5).toFixed(2)}s`);
    img.style.animationDelay = `${(Math.random() * 1.8).toFixed(2)}s`;
    vortex.appendChild(img);
  }
  const lines = el('div', 'proc-lines');
  proc.append(vortex, lines);
  flowBody.replaceChildren(proc);
  flowStep.textContent = 'processing';
  let t = 300;
  for (const [line, dur] of PROCESSING_LINES) {
    setTimeout(() => {
      lines.appendChild(el('div', `proc-line${line.includes('audit...') ? ' audit' : ''}`, line));
    }, t);
    t += dur;
  }
  setTimeout(() => {
    buildWrap(rows);
    show('wrap');
  }, t + 400);
}

// ---- the wrapped reveal ---------------------------------------------------

const slidesEl = document.getElementById('slides');
const barsEl = document.getElementById('story-bars');
let slideIdx = 0;
let slideEls = [];

function fmtMult(m) {
  return `${m < 10 ? m.toFixed(m < 1 ? 2 : 1) : Math.round(m)}x`;
}

function fmtPct(x) {
  if (x >= 99.5) return '99+';
  if (x < 1) return '<1';
  return String(Math.round(x));
}

function slide(cls, ...children) {
  const s = el('div', `slide ${cls}`);
  s.append(...children);
  return s;
}

function itemImg(item, cls) {
  const img = el('img', cls);
  img.src = iconUrl(item);
  img.alt = item.name;
  return img;
}

// importance-weighted distance from average: a 2x-rate dry on oathplate
// outranks a 3x dry on a berserker ring
function impact(r) {
  return Math.abs(r.u - 0.5) * (r.item.weight ?? 1);
}

function buildWrap(rows) {
  const spoons = rows.filter((r) => r.u > 0.5).sort((a, b) => impact(b) - impact(a));
  const fries = rows.filter((r) => r.u < 0.5).sort((a, b) => impact(b) - impact(a));
  const pct = overallPercentile(rows.map((r) => r.u), rows.map((r) => r.item.weight ?? 1));
  const verdict = verdictFor(pct);

  const slides = [];

  slides.push(
    slide(
      'slide-count',
      el('div', 'small-title', 'this account logged'),
      el('div', 'big-number countup', String(rows.length)),
      el('div', 'small-title', 'grinds'),
      el('div', 'tap-hint', 'tap to continue'),
    ),
  );

  if (spoons.length) {
    const s = spoons[0];
    const unit = s.item.unit ?? 'kc';
    slides.push(
      slide(
        'slide-spoon',
        el('div', 'small-title', 'your biggest spoon'),
        itemImg(s.item, 'hero-icon pop'),
        el('div', 'hero-name', s.item.name),
        el(
          'div',
          'hero-line',
          s.count !== undefined
            ? `${s.count} in ${s.kc.toLocaleString()} ${unit}`
            : s.item.ladder
              ? `completed at ${s.kc.toLocaleString()} ${unit}`
              : `dropped at ${s.kc.toLocaleString()} ${unit}`,
        ),
        el('div', 'hero-stat gold', `${fmtMult(s.mult)} the rate`),
        el(
          'div',
          'muted',
          s.count !== undefined
            ? `better rng than ${fmtPct(100 * s.u)}% of accounts at this kc`
            : `${fmtPct(100 * s.dryChance)}% of accounts take longer than you did`,
        ),
        sparkles(),
      ),
    );
  }

  if (fries.length) {
    const f = fries[0];
    const unit = f.item.unit ?? 'kc';
    slides.push(
      slide(
        'slide-fry',
        el('div', 'small-title', 'your driest grind'),
        itemImg(f.item, 'hero-icon fry-tilt'),
        el('div', 'hero-name', f.item.name),
        el(
          'div',
          'hero-line',
          f.count !== undefined
            ? f.count
              ? `only ${f.count} in ${f.kc.toLocaleString()} ${unit}`
              : `${f.kc.toLocaleString()} ${unit}, not a single one`
            : f.got
              ? f.item.ladder
                ? `finally completed at ${f.kc.toLocaleString()} ${unit}`
                : `finally dropped at ${f.kc.toLocaleString()} ${unit}`
              : `${f.kc.toLocaleString()} dry and counting`,
        ),
        el('div', 'hero-stat red', `${fmtMult(f.mult)} the rate`),
        el(
          'div',
          'muted',
          f.count !== undefined
            ? `only ${fmtPct(100 * f.u)}% of accounts run it this bad`
            : f.got
              ? `only ${fmtPct(100 * f.dryChance)}% of accounts go this deep`
              : `only ${fmtPct(100 * f.dryChance)}% of accounts are still dry here`,
        ),
      ),
    );
  }

  if (spoons.length + fries.length > 1) {
    const board = el('div', 'board');
    const col = (title, rs, cls) => {
      const c = el('div', `board-col ${cls}`);
      c.appendChild(el('div', 'board-title', title));
      for (const r of rs.slice(0, 3)) {
        const row = el('div', 'board-row');
        row.append(itemImg(r.item, 'board-icon'), el('span', 'board-name', r.item.name), el('span', 'board-mult', fmtMult(r.mult)));
        c.appendChild(row);
      }
      if (!rs.length) c.appendChild(el('div', 'muted', 'none'));
      return c;
    };
    board.append(col('spoons', spoons, 'spoon-col'), col('dry streaks', fries, 'fry-col'));
    slides.push(slide('slide-board', el('div', 'small-title', 'spoons and dry streaks'), board));
  }

  slides.push(
    slide(
      'slide-verdict',
      el('div', 'small-title', 'this account has better rng than'),
      el('div', 'big-number countup gold', `${fmtPct(pct)}%`),
      el('div', 'small-title', 'of osrs accounts'),
      el('div', 'verdict-name', verdict.name),
      el('div', 'muted verdict-blurb', verdict.blurb),
      shareRow(spoons, fries, pct, verdict),
      plugLine(),
    ),
  );

  slides.push(receiptsSlide(rows));
  slides.push(scaleSlide(rows, pct));

  slidesEl.replaceChildren(...slides);
  barsEl.replaceChildren(...slides.map(() => el('div', 'story-bar')));
  slideEls = slides;
  slideIdx = 0;
  showSlide(0);
}

// one human-readable clause per grind, for the why-sentence and shares
function describe(r) {
  if (r.count !== undefined) {
    return `${r.count} ${r.item.name.toLowerCase()} in ${r.kc.toLocaleString()} ${r.item.unit ?? 'kc'}`;
  }
  return r.got
    ? `${r.item.name.toLowerCase()} at ${fmtMult(r.mult)} rate`
    : `${fmtMult(r.mult)} dry at ${r.item.name.toLowerCase()}`;
}

// the receipts: every grind as a bar from center — left is fried, right
// is spooned, length is how far from average, thick bars carry more
// weight in the verdict
function receiptsSlide(rows) {
  const signed = [...rows].sort(
    (a, b) => (b.u - 0.5) * (b.item.weight ?? 1) - (a.u - 0.5) * (a.item.weight ?? 1),
  );
  const drivers = [...rows].sort((a, b) => impact(b) - impact(a)).filter((r) => impact(r) > 0.05).slice(0, 2);
  const why = drivers.length
    ? `driven mostly by ${drivers.map(describe).join(' and ')}`
    : 'no single grind stands out';

  const graph = el('div', 'graph');
  const shown = signed.slice(0, 12);
  for (const r of shown) {
    const row = el('div', 'g-row');
    const ic = itemImg(r.item, 'g-icon');
    const track = el('div', 'g-track');
    const bar = el('div', `g-bar ${r.u >= 0.5 ? 'spoon' : 'fry'}${(r.item.weight ?? 1) >= 1.5 ? ' heavy' : ''}`);
    bar.style.setProperty('--len', `${Math.min(50, Math.abs(r.u - 0.5) * 100).toFixed(1)}%`);
    track.appendChild(bar);
    row.append(ic, el('span', 'g-name', r.item.name), track, el('span', 'g-val', fmtMult(r.mult)));
    graph.appendChild(row);
  }
  const extras = [el('div', 'g-legend', '◀ dry · spooned ▶')];
  if (rows.length > shown.length) extras.push(el('div', 'muted', `plus ${rows.length - shown.length} quieter grinds`));

  return slide(
    'slide-receipts',
    el('div', 'small-title', 'the breakdown'),
    el('div', 'why-line', why),
    ...extras,
    graph,
    el('div', 'muted g-note', 'bar length = how far off the rate. thick bars matter more to the verdict'),
    plugLine(),
  );
}

// clickable twitch plug — the slide tap handler already ignores links
const TWITCH_SVG =
  '<svg viewBox="0 0 24 24" fill="#9146FF" aria-hidden="true"><path d="M4.265 3 3 6.236v13.223h4.502V21l2.531 2.459L12.567 21h3.797L23 14.346V3H4.265zm16.207 10.578-2.899 2.82h-4.633l-2.531 2.459v-2.459H6.47V4.641h14.002v8.937zM17.61 7.463v4.922h-1.688V7.463h1.688zm-4.502 0v4.922H11.42V7.463h1.688z"/></svg>';

function plugLine() {
  const p = el('div', 'plug');
  p.append('made by ');
  const a = el('a', 'twitch-link');
  a.href = `https://${CONFIG.twitch}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = TWITCH_SVG;
  a.append(CONFIG.handle);
  p.appendChild(a);
  return p;
}

// the balance: every grind sits on a weighing scale, dry side against
// spooned side, tipped by the account's weighted lean
function scaleSlide(rows, pct) {
  const spoons = rows.filter((r) => r.u > 0.5);
  const dries = rows.filter((r) => r.u < 0.5);
  const tilt = Math.max(-14, Math.min(14, ((pct - 50) / 50) * 14));

  const pan = (rs, cls) => {
    const p = el('div', `pan ${cls}`);
    const icons = el('div', 'pan-icons');
    for (const r of rs.slice(0, 9)) {
      const img = itemImg(r.item, 'pan-icon');
      img.style.width = `${Math.round(16 + Math.min(3, r.item.weight ?? 1) * 5)}px`;
      icons.appendChild(img);
    }
    p.append(icons, el('div', 'pan-plate'));
    return p;
  };

  const beam = el('div', 'scale-beam');
  beam.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
  beam.append(pan(dries, 'left'), pan(spoons, 'right'));
  const scale = el('div', 'scale');
  scale.append(beam, el('div', 'scale-post'));
  const labels = el('div', 'scale-labels');
  labels.append(el('span', null, 'unlucky'), el('span', null, 'lucky'));

  return slide(
    'slide-scale',
    el('div', 'small-title', 'the balance'),
    scale,
    labels,
    el('div', 'muted', tilt > 2 ? 'the account leans spooned' : tilt < -2 ? 'the account leans dry' : 'dead even'),
    plugLine(),
  );
}

function sparkles() {
  const wrap = el('div', 'sparkles');
  for (let i = 0; i < 8; i++) {
    const sp = el('span', 'sparkle', '✨');
    sp.style.left = `${8 + Math.random() * 84}%`;
    sp.style.top = `${10 + Math.random() * 70}%`;
    sp.style.animationDelay = `${(Math.random() * 1.4).toFixed(2)}s`;
    wrap.appendChild(sp);
  }
  return wrap;
}

function showSlide(i) {
  slideIdx = i;
  slideEls.forEach((s, j) => s.classList.toggle('active', j === i));
  [...barsEl.children].forEach((b, j) => {
    b.classList.toggle('done', j < i);
    b.classList.toggle('now', j === i);
  });
  const counter = slideEls[i].querySelector('.countup');
  if (counter && !counter.dataset.ran) {
    counter.dataset.ran = '1';
    countUp(counter);
  }
}

function countUp(node) {
  const target = node.textContent;
  const num = parseFloat(target) || 0;
  const t0 = performance.now();
  const dur = 1100;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - k, 3);
    node.textContent = target.replace(String(num), String(Math.round(num * eased)));
    if (k < 1) requestAnimationFrame(tick);
    else node.textContent = target;
  };
  node.textContent = target.replace(String(num), '0');
  requestAnimationFrame(tick);
}

slidesEl.addEventListener('click', (ev) => {
  if (ev.target.closest('button, a')) return;
  const goBack = ev.clientX < window.innerWidth * 0.28;
  if (goBack && slideIdx > 0) showSlide(slideIdx - 1);
  else if (!goBack && slideIdx < slideEls.length - 1) showSlide(slideIdx + 1);
});

// ---- sharing --------------------------------------------------------------

function shareText(spoons, fries, pct, verdict) {
  const bits = [`my osrs account has better rng than ${fmtPct(pct)}% of accounts (${verdict.name.toLowerCase()})`];
  if (spoons[0]) bits.push(`biggest spoon: ${describe(spoons[0])}`);
  if (fries[0]) bits.push(`driest grind: ${describe(fries[0])}`);
  bits.push(`check yours: ${location.origin}${location.pathname}`);
  return bits.join('\n');
}

function shareRow(spoons, fries, pct, verdict) {
  const row = el('div', 'share-row');
  const shareBtn = el('button', 'share-btn');
  shareBtn.textContent = 'share it';
  shareBtn.addEventListener('click', async () => {
    const text = shareText(spoons, fries, pct, verdict);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* user closed the sheet, fall through to clipboard */
      }
    }
    await navigator.clipboard.writeText(text);
    shareBtn.textContent = 'copied!';
    setTimeout(() => (shareBtn.textContent = 'share it'), 1500);
  });

  const cardBtn = el('button', 'share-btn', 'save card');
  cardBtn.addEventListener('click', () => downloadCard(spoons, fries, pct, verdict, (state._rsn ?? '').trim()));

  const againBtn = el('button', 'share-btn ghost', 'edit answers');
  againBtn.addEventListener('click', () => {
    stepIdx = STEPS.length - 1;
    show('flow');
    renderStep();
  });

  row.append(shareBtn, cardBtn, againBtn);
  return row;
}

// text-only card so the canvas never taints on cross-origin wiki images
function downloadCard(spoons, fries, pct, verdict, rsn) {
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1d1710');
  grad.addColorStop(1, '#0f0c07');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#55492e';
  g.lineWidth = 10;
  g.strokeRect(24, 24, W - 48, H - 48);

  const center = (txt, y, px, color) => {
    g.fillStyle = color;
    g.font = `${px}px RSBold, sans-serif`;
    g.textAlign = 'center';
    g.fillText(txt, W / 2, y);
  };

  center('SPOONCHECK', 150, 72, '#ffcc33');
  center('osrs rng check', 210, 40, '#998f76');
  center(verdict.name, 420, 92, pct >= 45 ? '#ffcc33' : '#ff6b3d');
  center(`better rng than ${fmtPct(pct)}% of accounts`, 500, 46, '#fff');
  center(verdict.blurb, 560, 34, '#998f76');

  let y = 720;
  if (spoons[0]) {
    center('🥄 biggest spoon', y, 40, '#b5ffb0');
    center(`${spoons[0].item.name} at ${fmtMult(spoons[0].mult)} the rate`, y + 56, 44, '#fff');
    y += 160;
  }
  if (fries[0]) {
    const f = fries[0];
    center('🦴 driest grind', y, 40, '#ff9d7a');
    center(
      `${f.item.name}, ${
        f.count !== undefined
          ? `${f.count} in ${f.kc.toLocaleString()} ${f.item.unit ?? 'kc'}`
          : f.got
            ? `${f.kc.toLocaleString()} kc`
            : `${f.kc.toLocaleString()} dry and counting`
      }`,
      y + 56,
      44,
      '#fff',
    );
    y += 160;
  }

  if (rsn) center(rsn, H - 210, 46, '#fff');
  center(`made by ${CONFIG.handle}`, H - 150, 40, '#998f76');
  center(CONFIG.twitch, H - 95, 44, '#ffcc33');

  const a = document.createElement('a');
  a.download = 'spooncheck.png';
  a.href = c.toDataURL('image/png');
  a.click();
}
