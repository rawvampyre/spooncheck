// prints every icon filename the app uses, one per line. run the
// download step after adding items: node tools/list-icons.mjs > list,
// then fetch each from the wiki into icons/.
import { ITEMS, POOLS } from '../items.js';

const icons = new Set(['Wooden_spoon.png']);
for (const i of ITEMS) icons.add(i.icon);
for (const p of Object.values(POOLS)) {
  for (const f of p.fields ?? []) if (f[3]) icons.add(f[3]);
}
console.log([...icons].join('\n'));
