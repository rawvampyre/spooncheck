import { ITEMS, STAGES, itemsInStage, iconUrl } from './items.js';
import { luckOfGet, luckOfDry, luckOfCount, stillDryChance, multiplier, overallPercentile, verdictFor } from './math.js';
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
    return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {};
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

const SECTION_BLURBS = [
  'a few quick questions about this era of your account',
  'lets see how this chapter treated you',
  'reviewing this section for spoon credits',
  'our records need a little more detail here',
  'almost there. how did these grinds go',
];

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
  flowStep.textContent = step === 'import' ? 'getting started' : step === 'review' ? 'final review' : `section ${stepIdx} of ${STAGES.length}`;
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
    el('h2', 'step-title', 'lets make this easy'),
    el('p', 'step-sub', 'type your rsn and we will import your grinds straight off the hiscores and your collection log. most accounts qualify for instant import'),
  );

  const row = el('div', 'import-row');
  const input = el('input', 'import-input');
  input.placeholder = 'osrs username';
  input.maxLength = 12;
  input.autocomplete = 'off';
  const go = btn('nav-btn', 'import my account', () => runImport(input.value, go, status));
  row.append(input, go);
  const status = el('p', 'import-status', '');
  flowBody.append(row, status);

  if (importSummary) flowBody.appendChild(importSummaryBox());

  const alt = el('div', 'nav-row');
  alt.appendChild(btn('nav-btn ghost', 'ill do it by hand like our ancestors', () => { stepIdx++; renderStep(); }));
  if (importSummary) alt.appendChild(btn('nav-btn', 'looks right, continue', () => { stepIdx++; renderStep(); }));
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
    for (const item of ITEMS) {
      const e = entryFor(item.id);
      const kc = r.kc[item.id];
      const owned = r.owned?.[item.id];
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
      importSummary.push('no synced collection log found so mark got it / still dry yourself (WikiSync plugin + open your log in game)');
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
    el('p', 'step-sub', SECTION_BLURBS[stepIdx % SECTION_BLURBS.length]),
  );
  const answered = items.filter((i) => state[i.id] && state[i.id].mode !== 'skip').length;
  if (importSummary && !answered) {
    flowBody.appendChild(el('p', 'section-empty', 'our records show nothing started in this era. tap continue, or correct us below'));
  }
  const list = el('div', 'item-list');
  for (const item of items) list.appendChild(itemCard(item));
  flowBody.append(list, navRow(answered ? 'looks right, continue' : 'continue'));
}

function itemCard(item) {
  const card = el('div', 'item-card');
  const unit = item.unit ?? 'kc';

  const icon = el('img', 'item-icon');
  icon.src = iconUrl(item);
  icon.alt = item.name;
  icon.loading = 'lazy';

  const info = el('div', 'item-info');
  info.append(
    el('div', 'item-name', item.name),
    el('div', 'item-sub', `1/${item.rate} from ${item.from}${item.note ? ` (${item.note})` : ''}`),
  );

  const modes = el('div', 'item-modes');
  const kcWrap = el('div', 'kc-wrap hidden');
  const kcInput = el('input');
  kcInput.type = 'number';
  kcInput.min = '1';
  kcInput.inputMode = 'numeric';
  kcInput.placeholder = unit;
  let countInput = null;
  if (item.multi) {
    // sharded grinds (zenytes, seeds...): how many you have, at what kc
    countInput = el('input');
    countInput.type = 'number';
    countInput.min = '0';
    countInput.max = '9';
    countInput.inputMode = 'numeric';
    countInput.placeholder = 'how many';
    kcWrap.appendChild(countInput);
  }
  const kcLabel = el('span', 'kc-label');
  kcWrap.append(kcInput, kcLabel);

  const modeDefs = item.multi
    ? [['skip', 'skip'], ['count', 'count em']]
    : [['skip', 'skip'], ['got', 'got it'], ['dry', 'still dry']];
  const btns = {};
  for (const [mode, label] of modeDefs) {
    const b = btn('mode-btn', label, () => {
      entryFor(item.id).mode = mode;
      save();
      render();
      if (mode !== 'skip') (countInput && !countInput.value ? countInput : kcInput).focus();
    });
    modes.appendChild(b);
    btns[mode] = b;
  }

  function render() {
    const e = entryFor(item.id);
    for (const [m, b] of Object.entries(btns)) b.classList.toggle('on', e.mode === m);
    card.classList.toggle('active', e.mode !== 'skip');
    kcWrap.classList.toggle('hidden', e.mode === 'skip');
    kcLabel.textContent = item.multi
      ? `of ${item.multi} youd want, and ${unit} so far`
      : e.mode === 'got'
        ? `${unit} it dropped at`
        : `${unit} so far, no drop`;
    if (String(e.kc) !== kcInput.value) kcInput.value = e.kc;
    if (countInput && String(e.count ?? '') !== countInput.value) countInput.value = e.count ?? '';
  }

  kcInput.addEventListener('input', () => {
    entryFor(item.id).kc = kcInput.value;
    save();
  });
  countInput?.addEventListener('input', () => {
    entryFor(item.id).count = countInput.value;
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
    const kc = Math.round(Number(e.kc));
    if (!Number.isFinite(kc) || kc < 1) continue;
    if (item.multi) {
      if (e.mode !== 'count') continue;
      const count = Math.max(0, Math.round(Number(e.count) || 0));
      rows.push({
        item,
        got: count > 0,
        kc,
        count,
        u: luckOfCount(item.rate, kc, count),
        // average rates spent per drop: 1x = exactly on rate
        mult: multiplier(item.rate, kc) / Math.max(1, count),
        dryChance: stillDryChance(item.rate, kc),
      });
      continue;
    }
    const got = e.mode === 'got';
    rows.push({
      item,
      got,
      kc,
      u: got ? luckOfGet(item.rate, kc) : luckOfDry(item.rate, kc),
      mult: multiplier(item.rate, kc),
      dryChance: stillDryChance(item.rate, kc),
    });
  }
  return rows;
}

function renderReview() {
  const rows = computeResults();
  flowBody.append(
    el('h2', 'step-title', 'final review'),
    el('p', 'step-sub', `${rows.length} grinds declared. one last look before we run your assessment`),
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
  const submit = btn('nav-btn big', 'submit for assessment', () => {
    if (rows.length < 3) {
      submit.classList.remove('shake');
      void submit.offsetWidth;
      submit.classList.add('shake');
      hint.textContent = 'we need at least 3 grinds with kcs to run an assessment';
      return;
    }
    runProcessing(rows);
  });
  row.appendChild(submit);
  const hint = el('p', 'review-hint', rows.length < 3 ? 'we need at least 3 grinds with kcs to assess you' : 'assessments are final until you run another one');
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
  flowBody.replaceChildren(el('div', 'processing'));
  flowStep.textContent = 'processing';
  const box = flowBody.firstChild;
  let t = 300;
  PROCESSING_LINES.forEach(([line, dur], i) => {
    setTimeout(() => {
      const l = el('div', `proc-line${line.includes('audit...') ? ' audit' : ''}`, line);
      box.appendChild(l);
      box.scrollTop = box.scrollHeight;
    }, t);
    t += dur;
  });
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
      el('div', 'small-title', 'assessment complete. this account logged'),
      el('div', 'big-number countup', String(rows.length)),
      el('div', 'small-title', 'grinds'),
      el('div', 'muted', 'lets see the damage'),
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
          s.count !== undefined ? `${s.count} in ${s.kc.toLocaleString()} ${unit}` : `dropped at ${s.kc.toLocaleString()} ${unit}`,
        ),
        el('div', 'hero-stat gold', `${fmtMult(s.mult)} the rate`),
        el(
          'div',
          'muted',
          s.count !== undefined
            ? `luckier than ${fmtPct(100 * s.u)}% of accounts at this kc`
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
        el('div', 'small-title', 'your deepest fry'),
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
              ? `finally dropped at ${f.kc.toLocaleString()} ${unit}`
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
      if (!rs.length) c.appendChild(el('div', 'muted', 'none. incredible'));
      return c;
    };
    board.append(col('spoons', spoons, 'spoon-col'), col('fries', fries, 'fry-col'));
    slides.push(slide('slide-board', el('div', 'small-title', 'the full menu'), board));
  }

  slides.push(
    slide(
      'slide-verdict',
      el('div', 'small-title', 'this account is luckier than'),
      el('div', 'big-number countup gold', `${fmtPct(pct)}%`),
      el('div', 'small-title', 'of osrs accounts'),
      el('div', 'verdict-name', verdict.name),
      el('div', 'muted verdict-blurb', verdict.blurb),
      shareRow(spoons, fries, pct, verdict),
      el('div', 'plug', `made by ${CONFIG.handle} live on ${CONFIG.twitch}`),
    ),
  );

  slides.push(receiptsSlide(rows));

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
    : 'no grind stands out, this account is just like this';

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
  const extras = [el('div', 'g-legend', '◀ fried · spooned ▶')];
  if (rows.length > shown.length) extras.push(el('div', 'muted', `plus ${rows.length - shown.length} quieter grinds`));

  return slide(
    'slide-receipts',
    el('div', 'small-title', 'the receipts'),
    el('div', 'why-line', why),
    ...extras,
    graph,
    el('div', 'muted g-note', 'bar length = how far off the rate. thick bars matter more to the verdict'),
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
  const bits = [`my osrs account is luckier than ${fmtPct(pct)}% of accounts (${verdict.name.toLowerCase()})`];
  if (spoons[0]) bits.push(`biggest spoon: ${describe(spoons[0])}`);
  if (fries[0]) bits.push(`deepest fry: ${describe(fries[0])}`);
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
  cardBtn.addEventListener('click', () => downloadCard(spoons, fries, pct, verdict));

  const againBtn = el('button', 'share-btn ghost', 'run it back');
  againBtn.addEventListener('click', () => {
    stepIdx = STEPS.length - 1;
    show('flow');
    renderStep();
  });

  row.append(shareBtn, cardBtn, againBtn);
  return row;
}

// text-only card so the canvas never taints on cross-origin wiki images
function downloadCard(spoons, fries, pct, verdict) {
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
  center('osrs luck, wrapped', 210, 40, '#998f76');
  center(verdict.name, 420, 92, pct >= 45 ? '#ffcc33' : '#ff6b3d');
  center(`luckier than ${fmtPct(pct)}% of accounts`, 500, 46, '#fff');
  center(verdict.blurb, 560, 34, '#998f76');

  let y = 720;
  if (spoons[0]) {
    center('🥄 biggest spoon', y, 40, '#b5ffb0');
    center(`${spoons[0].item.name} at ${fmtMult(spoons[0].mult)} the rate`, y + 56, 44, '#fff');
    y += 160;
  }
  if (fries[0]) {
    const f = fries[0];
    center('🍳 deepest fry', y, 40, '#ff9d7a');
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

  center(`made by ${CONFIG.handle}`, H - 150, 40, '#998f76');
  center(CONFIG.twitch, H - 95, 44, '#ffcc33');

  const a = document.createElement('a');
  a.download = 'spooncheck.png';
  a.href = c.toDataURL('image/png');
  a.click();
}
