import { ITEMS, STAGES, itemsInStage, iconUrl, POOLS } from './items.js';
import { luckOfGet, luckOfDry, luckOfCount, countTail, ladderDist, toaUniqueChance, stillDryChance, multiplier, overallPercentile, verdictFor } from './math.js';
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
    el('p', 'step-sub', 'type your rsn to fill your kill counts in from the hiscores'),
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
    // importing a different account starts a clean sheet, the old
    // account's answers dont belong to this one
    const rsn = name.trim().toLowerCase();
    if (state._lastImport && state._lastImport !== rsn) {
      for (const item of ITEMS) delete state[item.id];
      state._pools = {};
    }
    state._lastImport = rsn;
    // imported numbers overwrite whatever is in the fields
    for (const [poolName, vals] of Object.entries(r.pools)) {
      const ps = poolState(poolName);
      for (const [k, v] of Object.entries(vals)) if (v) ps[k] = v;
    }
    let filled = 0;
    for (const item of ITEMS) {
      const kc = r.kc[item.id];
      if (!kc) continue;
      entryFor(item.id).kc = kc;
      filled++;
    }
    save();
    importSummary = [
      `kcs filled in for ${filled} grinds off the hiscores`,
      'mark got it or still dry on each grind as you go through, kcs for untracked monsters stay manual',
    ];
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
          ? `${unit} when it dropped`
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
        // share of accounts with this few or fewer at this kc
        dryChance: countTail(rate, kc, count),
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
    head.appendChild(btn('review-edit', 'edit', () => {
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
  ['cross checking the drop rates...', 900],
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
            ? `only ${fmtPct(100 * f.dryChance)}% of accounts run it this bad`
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
      shareRow(),
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

// hand-pixelled sprites in the osrs inventory style: hard black outline,
// flat gold banding, drawn on tiny canvases and scaled up chunky
const PX_PAL = { '#': '#000000', d: '#4a3410', m: '#8a6a1f', l: '#c9a13b', h: '#eed37a' };

function px(rowsArr, scale, className) {
  const c = document.createElement('canvas');
  c.width = rowsArr[0].length * scale;
  c.height = rowsArr.length * scale;
  const g = c.getContext('2d');
  rowsArr.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (!PX_PAL[ch]) return;
      g.fillStyle = PX_PAL[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  c.className = `pxc ${className ?? ''}`;
  return c;
}

const BEAM_MAP = [
  '########################################################',
  '#hhhhhhhhhhhhhhhhhhhhhhhhhlllllhhhhhhhhhhhhhhhhhhhhhhh#',
  '#mmmmmmmmmmmmmmmmmmmmmmmmmlllllmmmmmmmmmmmmmmmmmmmmmmm#',
  '########################################################',
];

const POST_MAP = Array.from({ length: 30 }, () => '#lml#');

const BASE_MAP = [
  '.......###########.......',
  '......#lllllllllll#......',
  '....##mmmmmmmmmmmmm##....',
  '...#lllllllllllllllll#...',
  '.###mmmmmmmmmmmmmmmmm###.',
  '#lllllllllllllllllllllll#',
  '#########################',
];

const PAN_MAP = [
  '..##..................##..',
  '..#m..................#m..',
  '..##..................##..',
  '..#m..................#m..',
  '..##..................##..',
  '..#m..................#m..',
  '..##..................##..',
  '..#m..................#m..',
  '..##..................##..',
  '..#m..................#m..',
  '..######################..',
  '.#dddddddddddddddddddddd#.',
  '#dddddddddddddddddddddddd#',
  '#mllllllllllllllllllllllm#',
  '.#llllllllllllllllllllll#.',
  '..####################....',
];

// a small non-deterministic gravity sim: every grind is a circle that
// falls into the pan, bounces off the dish, the walls and each other,
// and settles into a pile
function runPile(field, entries) {
  const wallL = 12;
  const wallR = 92;
  const floorY = 148;
  const bodies = entries.map((e2, i) => ({
    el: e2.el,
    r: e2.r,
    x: wallL + e2.r + Math.random() * (wallR - wallL - 2 * e2.r),
    y: -30 - i * 34 - Math.random() * 18,
    vx: (Math.random() - 0.5) * 40,
    vy: 0,
    start: i * 0.16,
  }));
  let t = 0;
  let last = performance.now();
  const G = 950;
  function frame(now) {
    const dt = Math.min(0.03, (now - last) / 1000);
    last = now;
    t += dt;
    for (const b of bodies) {
      if (t < b.start) continue;
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x - b.r < wallL) { b.x = wallL + b.r; b.vx *= -0.4; }
      if (b.x + b.r > wallR) { b.x = wallR - b.r; b.vx *= -0.4; }
      if (b.y + b.r > floorY) {
        b.y = floorY - b.r;
        b.vy *= -0.22;
        b.vx *= 0.82;
        if (Math.abs(b.vy) < 25) b.vy = 0;
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (let a = 0; a < bodies.length; a++) {
        for (let c = a + 1; c < bodies.length; c++) {
          const A = bodies[a];
          const B = bodies[c];
          if (t < A.start || t < B.start) continue;
          const dx = B.x - A.x;
          const dy = B.y - A.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const min = A.r + B.r - 3;
          if (dist < min) {
            const push = (min - dist) / 2;
            const nx = dx / dist;
            const ny = dy / dist;
            A.x -= nx * push;
            A.y -= ny * push;
            B.x += nx * push;
            B.y += ny * push;
            A.vx -= nx * push * 5;
            A.vy -= ny * push * 5;
            B.vx += nx * push * 5;
            B.vy += ny * push * 5;
          }
        }
      }
    }
    for (const b of bodies) {
      if (t < b.start) continue;
      b.el.style.transform = `translate(${(b.x - b.r).toFixed(1)}px, ${(b.y - b.r).toFixed(1)}px)`;
      b.el.style.opacity = '1';
    }
    if (t < 4.5) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// the balance: a pixel scale in the osrs style. grinds fall into their
// pan sized by how hard they pull the verdict, pile up with a bit of
// gravity, then the beam swings hard into the account's lean
function scaleSlide(rows, pct) {
  const spoons = rows.filter((r) => r.u > 0.5).sort((a, b) => impact(b) - impact(a));
  const dries = rows.filter((r) => r.u < 0.5).sort((a, b) => impact(b) - impact(a));
  // polarized: even a modest lean swings hard, capped at 20 degrees
  const d = pct - 50;
  const tilt = d === 0 ? 0 : Math.sign(d) * Math.min(1, Math.abs(d) / 35) ** 0.6 * 20;

  const piles = [];
  const pan = (rs, cls) => {
    const p = el('div', `s-pan ${cls}`);
    const field = el('div', 'pan-phys');
    const entries = rs.slice(0, 9).map((r) => {
      const img = itemImg(r.item, 'pan-icon');
      const size = Math.round(Math.min(42, 16 + impact(r) * 26));
      img.style.width = `${size}px`;
      field.appendChild(img);
      return { el: img, r: size / 2 };
    });
    p.append(field, px(PAN_MAP, 4));
    piles.push({ field, entries });
    return p;
  };

  const beam = el('div', 's-beam');
  beam.style.setProperty('--tilt', `${tilt.toFixed(1)}deg`);
  beam.append(px(BEAM_MAP, 5), pan(dries, 'left'), pan(spoons, 'right'));
  const scale = el('div', 'scale');
  scale.append(px(POST_MAP, 5, 's-post'), px(BASE_MAP, 5, 's-base'), beam);
  const labels = el('div', 'scale-labels');
  labels.append(el('span', null, 'dry'), el('span', null, 'spoon'));

  const s = slide(
    'slide-scale',
    el('div', 'small-title', 'the balance'),
    scale,
    labels,
    el('div', 'muted', tilt > 3 ? 'the account leans spooned' : tilt < -3 ? 'the account leans dry' : 'dead even'),
    plugLine(),
  );
  // physics kicks off the first time the slide is shown
  s._onActive = () => piles.forEach((pl) => runPile(pl.field, pl.entries));
  return s;
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
  document.getElementById('wrap-prev').disabled = i === 0;
  document.getElementById('wrap-next').disabled = i === slideEls.length - 1;
  const active = slideEls[i];
  if (active._onActive && !active.dataset.ranActive) {
    active.dataset.ranActive = '1';
    active._onActive();
  }
  const counter = slideEls[i].querySelector('.countup');
  if (counter && !counter.dataset.ran) {
    counter.dataset.ran = '1';
    countUp(counter);
  }
}

document.getElementById('wrap-prev').addEventListener('click', () => {
  if (slideIdx > 0) showSlide(slideIdx - 1);
});
document.getElementById('wrap-next').addEventListener('click', () => {
  if (slideIdx < slideEls.length - 1) showSlide(slideIdx + 1);
});
document.addEventListener('keydown', (ev) => {
  if (screens.wrap.classList.contains('hidden') || !slideEls.length) return;
  if (ev.key === 'ArrowLeft' && slideIdx > 0) showSlide(slideIdx - 1);
  if (ev.key === 'ArrowRight' && slideIdx < slideEls.length - 1) showSlide(slideIdx + 1);
});

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

function shareRow() {
  const row = el('div', 'share-row');
  const againBtn = el('button', 'share-btn ghost', 'edit answers');
  againBtn.addEventListener('click', () => {
    stepIdx = STEPS.length - 1;
    show('flow');
    renderStep();
  });
  row.appendChild(againBtn);
  return row;
}
