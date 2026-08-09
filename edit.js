// the spooncheck editor: section titles, grouping, order, item weights
// and verdict messages. saves overrides to this browser, and generates a
// complete config.js for the repo so edits deploy for everyone.

import { HANDLE, TWITCH, SECTION_TITLES, ORDER, VERDICTS, PROCESSING_LINES } from './config.js';
import { ITEMS } from './items.js';

const byId = new Map(ITEMS.map((i) => [i.id, i]));

// working model, seeded from the current (override-merged) config
const model = {
  titles: { ...SECTION_TITLES },
  order: Object.fromEntries(Object.entries(ORDER).map(([k, v]) => [k, v.filter((id) => byId.has(id))])),
  weights: Object.fromEntries(ITEMS.map((i) => [i.id, i.weight ?? 1])),
  verdicts: VERDICTS.map((v) => ({ ...v })),
  processing: PROCESSING_LINES.map((l) => [...l]),
};
// anything not placed by ORDER joins its default section
for (const item of ITEMS) {
  const placed = Object.values(model.order).some((ids) => ids.includes(item.id));
  if (!placed) (model.order[item.stage] ??= []).push(item.id);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// ---- verdicts -------------------------------------------------------------

function renderVerdicts() {
  const wrap = document.getElementById('ed-verdicts');
  wrap.replaceChildren();
  for (const v of model.verdicts) {
    const row = el('div', 'ed-verdict');
    const min = el('input', 'ed-min');
    min.type = 'number';
    min.value = v.min;
    min.addEventListener('input', () => { v.min = Number(min.value); });
    const name = el('input', 'ed-name');
    name.value = v.name;
    name.addEventListener('input', () => { v.name = name.value; });
    const blurb = el('input', 'ed-blurb');
    blurb.value = v.blurb;
    blurb.addEventListener('input', () => { v.blurb = blurb.value; });
    row.append(min, name, blurb);
    wrap.appendChild(row);
  }
}

// ---- processing lines ------------------------------------------------------

function renderProcessing() {
  const wrap = document.getElementById('ed-processing');
  wrap.replaceChildren();
  model.processing.forEach((line, i) => {
    const row = el('div', 'ed-proc');
    const ms = el('input', 'ed-min');
    ms.type = 'number';
    ms.step = '100';
    ms.min = '200';
    ms.value = line[1];
    ms.addEventListener('input', () => { line[1] = Number(ms.value) || 900; });
    const text = el('input', 'ed-blurb');
    text.value = line[0];
    text.addEventListener('input', () => { line[0] = text.value; });
    const del = el('button', 'ed-arrow', '✕');
    del.addEventListener('click', () => {
      model.processing.splice(i, 1);
      renderProcessing();
    });
    row.append(ms, text, del);
    wrap.appendChild(row);
  });
}

document.getElementById('ed-addline').addEventListener('click', () => {
  model.processing.push(['new line...', 900]);
  renderProcessing();
});

// ---- sections -------------------------------------------------------------

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function renderSections() {
  const wrap = document.getElementById('ed-sections');
  wrap.replaceChildren();
  const keys = Object.keys(model.order);
  keys.forEach((key, ki) => {
    const box = el('div', 'ed-section');
    const head = el('div', 'ed-sec-head');
    const title = el('input', 'ed-sec-title');
    title.value = model.titles[key] ?? key;
    title.addEventListener('input', () => { model.titles[key] = title.value; });
    const up = el('button', 'ed-arrow', '▲');
    const down = el('button', 'ed-arrow', '▼');
    up.addEventListener('click', () => { reorderSections(ki, -1); });
    down.addEventListener('click', () => { reorderSections(ki, 1); });
    head.append(title, up, down);
    box.appendChild(head);

    model.order[key].forEach((id, ii) => {
      const item = byId.get(id);
      if (!item) return;
      const row = el('div', 'ed-item');
      const nm = el('span', 'ed-item-name', item.name);
      const w = el('input', 'ed-weight');
      w.type = 'number';
      w.step = '0.25';
      w.min = '0';
      w.max = '3';
      w.value = model.weights[id];
      w.title = 'weight, 0 removes it from the verdict';
      w.addEventListener('input', () => {
        const n = Number(w.value);
        model.weights[id] = Number.isFinite(n) && n >= 0 ? Math.min(3, n) : 1;
      });
      const sel = el('select', 'ed-move');
      for (const k2 of keys) {
        const o = el('option', null, model.titles[k2] ?? k2);
        o.value = k2;
        if (k2 === key) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        model.order[key] = model.order[key].filter((x) => x !== id);
        model.order[sel.value].push(id);
        renderSections();
      });
      const iup = el('button', 'ed-arrow', '▲');
      const idown = el('button', 'ed-arrow', '▼');
      iup.addEventListener('click', () => { move(model.order[key], ii, -1); renderSections(); });
      idown.addEventListener('click', () => { move(model.order[key], ii, 1); renderSections(); });
      row.append(nm, w, sel, iup, idown);
      box.appendChild(row);
    });
    wrap.appendChild(box);
  });
}

function reorderSections(i, dir) {
  const keys = Object.keys(model.order);
  const j = i + dir;
  if (j < 0 || j >= keys.length) return;
  [keys[i], keys[j]] = [keys[j], keys[i]];
  model.order = Object.fromEntries(keys.map((k) => [k, model.order[k]]));
  renderSections();
}

// ---- save / download / reset ----------------------------------------------

const status = document.getElementById('ed-status');

document.getElementById('ed-save').addEventListener('click', () => {
  localStorage.setItem('spooncheck-config-v2', JSON.stringify(model));
  status.textContent = 'saved. refresh the main page to see it';
});

document.getElementById('ed-reset').addEventListener('click', () => {
  localStorage.removeItem('spooncheck-config-v2');
  status.textContent = 'browser overrides cleared, reloading...';
  setTimeout(() => location.reload(), 600);
});

document.getElementById('ed-download').addEventListener('click', () => {
  const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const lines = [];
  lines.push('// turbospoon config, generated by /edit.html');
  lines.push('');
  lines.push(`export const HANDLE = ${q(HANDLE)};`);
  lines.push(`export const TWITCH = ${q(TWITCH)};`);
  lines.push('');
  lines.push('export const PROCESSING_LINES = [');
  for (const [t, d] of model.processing) lines.push(`  [${q(t)}, ${Number(d) || 900}],`);
  lines.push('];');
  lines.push('');
  lines.push('export const VERDICTS = [');
  for (const v of model.verdicts) lines.push(`  { min: ${v.min}, name: ${q(v.name)}, blurb: ${q(v.blurb)} },`);
  lines.push('];');
  lines.push('');
  lines.push('export const WEIGHTS = {');
  for (const [id, w] of Object.entries(model.weights)) {
    if ((byId.get(id)?.weight ?? 1) !== w || true) lines.push(`  ${q(id)}: ${w},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const SECTION_TITLES = {');
  for (const k of Object.keys(model.order)) lines.push(`  ${q(k)}: ${q(model.titles[k] ?? k)},`);
  lines.push('};');
  lines.push('');
  lines.push('export function sectionTitle(key) {');
  lines.push('  return SECTION_TITLES[key] ?? key;');
  lines.push('}');
  lines.push('');
  lines.push('export const ORDER = {');
  for (const [k, ids] of Object.entries(model.order)) lines.push(`  ${q(k)}: [${ids.map(q).join(', ')}],`);
  lines.push('};');
  lines.push('');
  lines.push('// browser-side overrides saved by /edit.html take effect on top of');
  lines.push('// this file.');
  lines.push('try {');
  lines.push("  if (typeof localStorage !== 'undefined') {");
  lines.push("    const ov = JSON.parse(localStorage.getItem('spooncheck-config-v2') ?? 'null');");
  lines.push('    if (ov) {');
  lines.push('      if (ov.titles) Object.assign(SECTION_TITLES, ov.titles);');
  lines.push('      if (ov.order && Object.keys(ov.order).length) {');
  lines.push('        for (const k of Object.keys(ORDER)) delete ORDER[k];');
  lines.push('        Object.assign(ORDER, ov.order);');
  lines.push('      }');
  lines.push('      if (ov.weights) Object.assign(WEIGHTS, ov.weights);');
  lines.push('      if (ov.verdicts?.length) {');
  lines.push('        VERDICTS.length = 0;');
  lines.push('        VERDICTS.push(...ov.verdicts);');
  lines.push('      }');
  lines.push('      if (ov.processing?.length) {');
  lines.push('        PROCESSING_LINES.length = 0;');
  lines.push('        PROCESSING_LINES.push(...ov.processing);');
  lines.push('      }');
  lines.push('    }');
  lines.push('  }');
  lines.push('} catch {');
  lines.push('  /* a broken override never breaks the app */');
  lines.push('}');
  lines.push('');
  const blob = new Blob([lines.join('\n')], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.download = 'config.js';
  a.href = URL.createObjectURL(blob);
  a.click();
  status.textContent = 'config.js downloaded. replace the one in the repo and push';
});

renderVerdicts();
renderProcessing();
renderSections();
