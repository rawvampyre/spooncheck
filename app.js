import { ITEMS, iconUrl } from './items.js';
import { luckOfGet, luckOfDry, stillDryChance, multiplier, overallPercentile, verdictFor } from './math.js';
import { lookupAccount } from './lookup.js';

const CONFIG = {
  handle: 'rawvampyre',
  twitch: 'twitch.tv/rawvampyre',
};

const STORE_KEY = 'spooncheck-v1';

// ---- state ----------------------------------------------------------------

let state = load();

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
  entry: document.getElementById('entry'),
  wrap: document.getElementById('wrap'),
};

function show(name) {
  for (const [k, el] of Object.entries(screens)) el.classList.toggle('hidden', k !== name);
  window.scrollTo(0, 0);
}

document.getElementById('start-btn').addEventListener('click', () => show('entry'));

// ---- entry screen ---------------------------------------------------------

const list = document.getElementById('item-list');
const renderFns = [];

for (const item of ITEMS) {
  const card = document.createElement('div');
  card.className = 'item-card';
  const unit = item.unit ?? 'kc';

  const icon = document.createElement('img');
  icon.className = 'item-icon';
  icon.src = iconUrl(item);
  icon.alt = item.name;
  icon.loading = 'lazy';

  const info = document.createElement('div');
  info.className = 'item-info';
  const nm = document.createElement('div');
  nm.className = 'item-name';
  nm.textContent = item.name;
  const sub = document.createElement('div');
  sub.className = 'item-sub';
  sub.textContent = `1/${item.rate} from ${item.from}${item.note ? ` (${item.note})` : ''}`;
  info.append(nm, sub);

  const modes = document.createElement('div');
  modes.className = 'item-modes';
  const kcWrap = document.createElement('div');
  kcWrap.className = 'kc-wrap hidden';
  const kcInput = document.createElement('input');
  kcInput.type = 'number';
  kcInput.min = '1';
  kcInput.inputMode = 'numeric';
  kcInput.placeholder = unit;
  const kcLabel = document.createElement('span');
  kcLabel.className = 'kc-label';
  kcWrap.append(kcInput, kcLabel);

  const btns = {};
  for (const [mode, label] of [
    ['skip', 'skip'],
    ['got', 'got it'],
    ['dry', 'still dry'],
  ]) {
    const b = document.createElement('button');
    b.className = 'mode-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      entryFor(item.id).mode = mode;
      save();
      render();
      if (mode !== 'skip' && !kcInput.value) kcInput.focus();
    });
    modes.appendChild(b);
    btns[mode] = b;
  }

  function render() {
    const e = entryFor(item.id);
    for (const [m, b] of Object.entries(btns)) b.classList.toggle('on', e.mode === m);
    card.classList.toggle('active', e.mode !== 'skip');
    kcWrap.classList.toggle('hidden', e.mode === 'skip');
    kcLabel.textContent = e.mode === 'got' ? `${unit} it dropped at` : `${unit} so far, no drop`;
    if (String(e.kc) !== kcInput.value) kcInput.value = e.kc;
  }

  kcInput.addEventListener('input', () => {
    entryFor(item.id).kc = kcInput.value;
    save();
  });

  card.append(icon, info, modes, kcWrap);
  list.appendChild(card);
  render();
  renderFns.push(render);
}

function renderAll() {
  renderFns.forEach((fn) => fn());
}

// ---- account auto fill ----------------------------------------------------

const lookupBtn = document.getElementById('lookup-btn');
const lookupName = document.getElementById('lookup-name');
const lookupStatus = document.getElementById('lookup-status');

async function runLookup() {
  const name = lookupName.value;
  lookupBtn.disabled = true;
  lookupStatus.textContent = 'looking your account up...';
  try {
    const r = await lookupAccount(name);
    let touched = 0;
    for (const item of ITEMS) {
      const e = entryFor(item.id);
      const kc = r.kc[item.id];
      const owned = r.owned?.[item.id];
      if (owned === true) {
        e.mode = 'got';
        if (kc && !e.kc) e.kc = kc;
        touched++;
      } else if (owned === false && kc) {
        e.mode = 'dry';
        e.kc = kc;
        touched++;
      } else if (kc && e.mode === 'skip') {
        // kc known but ownership unknown: prefill the number, you pick
        e.kc = kc;
      } else {
        continue;
      }
    }
    save();
    renderAll();
    const bits = [];
    bits.push(r.womOk ? 'kcs pulled from the hiscores' : 'no hiscores data (name wrong or too low kc)');
    bits.push(
      r.clogOk
        ? 'collection log synced, got/dry filled in for you. for items you own the kc shown is your CURRENT kc so lower it to the actual drop kc if you remember'
        : 'no wikisync collection log found so tap got it / still dry yourself (sync it with the WikiSync runelite plugin + opening your log)',
    );
    lookupStatus.textContent = bits.join('. ');
    if (!touched && !Object.keys(r.kc).length) lookupStatus.textContent = 'account found but no usable kcs. fill it in manually';
  } catch (err) {
    lookupStatus.textContent = err.message ?? 'lookup failed, fill it in manually';
  } finally {
    lookupBtn.disabled = false;
  }
}

lookupBtn.addEventListener('click', runLookup);
lookupName.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') runLookup();
});

// ---- computing the wrap ---------------------------------------------------

function computeResults() {
  const rows = [];
  for (const item of ITEMS) {
    const e = state[item.id];
    if (!e || e.mode === 'skip') continue;
    const kc = Math.round(Number(e.kc));
    if (!Number.isFinite(kc) || kc < 1) continue;
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

document.getElementById('wrap-btn').addEventListener('click', () => {
  const rows = computeResults();
  if (rows.length < 3) {
    const btn = document.getElementById('wrap-btn');
    btn.classList.remove('shake');
    void btn.offsetWidth;
    btn.classList.add('shake');
    document.getElementById('entry-hint').textContent = 'need at least 3 grinds filled in (with kc)';
    return;
  }
  buildWrap(rows);
  show('wrap');
});

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
  const s = document.createElement('div');
  s.className = `slide ${cls}`;
  s.append(...children);
  return s;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function itemImg(item, cls) {
  const img = el('img', cls);
  img.src = iconUrl(item);
  img.alt = item.name;
  return img;
}

function buildWrap(rows) {
  const spoons = rows.filter((r) => r.u > 0.5).sort((a, b) => b.u - a.u);
  const fries = rows.filter((r) => r.u < 0.5).sort((a, b) => a.u - b.u);
  const pct = overallPercentile(rows.map((r) => r.u));
  const verdict = verdictFor(pct);

  const slides = [];

  slides.push(
    slide(
      'slide-count',
      el('div', 'small-title', 'this account logged'),
      el('div', 'big-number countup', String(rows.length)),
      el('div', 'small-title', 'grinds'),
      el('div', 'muted', 'lets see the damage'),
      el('div', 'tap-hint', 'tap to continue'),
    ),
  );

  if (spoons.length) {
    const s = spoons[0];
    slides.push(
      slide(
        'slide-spoon',
        el('div', 'small-title', 'your biggest spoon'),
        itemImg(s.item, 'hero-icon pop'),
        el('div', 'hero-name', s.item.name),
        el('div', 'hero-line', `dropped at ${s.kc.toLocaleString()} ${s.item.unit ?? 'kc'}`),
        el('div', 'hero-stat gold', `${fmtMult(s.mult)} the rate`),
        el('div', 'muted', `${fmtPct(100 * s.dryChance)}% of accounts take longer than you did`),
        sparkles(),
      ),
    );
  }

  if (fries.length) {
    const f = fries[0];
    slides.push(
      slide(
        'slide-fry',
        el('div', 'small-title', 'your deepest fry'),
        itemImg(f.item, 'hero-icon fry-tilt'),
        el('div', 'hero-name', f.item.name),
        el(
          'div',
          'hero-line',
          f.got
            ? `finally dropped at ${f.kc.toLocaleString()} ${f.item.unit ?? 'kc'}`
            : `${f.kc.toLocaleString()} dry and counting`,
        ),
        el('div', 'hero-stat red', `${fmtMult(f.mult)} the rate`),
        el(
          'div',
          'muted',
          f.got
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
        row.append(
          itemImg(r.item, 'board-icon'),
          el('span', 'board-name', r.item.name),
          el('span', 'board-mult', fmtMult(r.mult)),
        );
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

  slidesEl.replaceChildren(...slides);
  barsEl.replaceChildren(...slides.map(() => el('div', 'story-bar')));
  slideEls = slides;
  slideIdx = 0;
  showSlide(0);
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
  if (spoons[0]) bits.push(`biggest spoon: ${spoons[0].item.name} at ${fmtMult(spoons[0].mult)} rate`);
  if (fries[0]) {
    const f = fries[0];
    bits.push(`deepest fry: ${f.got ? '' : 'still '}${f.kc.toLocaleString()} ${f.got ? 'kc for' : 'dry at'} ${f.item.name}`);
  }
  bits.push(`check yours: ${location.origin}${location.pathname}`);
  return bits.join('\n');
}

function shareRow(spoons, fries, pct, verdict) {
  const row = el('div', 'share-row');
  const shareBtn = el('button', 'share-btn', 'share it');
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
  againBtn.addEventListener('click', () => show('entry'));

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
      `${f.item.name}, ${f.got ? `${f.kc.toLocaleString()} kc` : `${f.kc.toLocaleString()} dry and counting`}`,
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
