// Track sanity check: catch a bad track file before it breaks the game.
//   node test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { BLOCK_TYPES } from './src/config.js';

const dir = new URL('./tracks/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
let fails = 0;

const isCell = (c) => Array.isArray(c) && c.length === 3 && c.every((n) => Number.isInteger(n));

for (const f of files) {
  const errs = [];
  let t;
  try {
    t = JSON.parse(readFileSync(new URL(f, dir)));
  } catch (e) {
    console.log(`✗ ${f}: not valid JSON — ${e.message}`);
    fails++;
    continue;
  }

  if (!t.name) errs.push('missing name');
  for (const k of ['start', 'finish']) {
    if (!t[k] || !isCell(t[k].cell)) errs.push(`${k}.cell must be [int,int,int]`);
    if (t[k] && typeof t[k].yaw !== 'number') errs.push(`${k}.yaw must be a number`);
  }
  if (!Array.isArray(t.blocks) || !t.blocks.length) errs.push('blocks[] empty');

  const seen = new Set();
  for (const [i, b] of (t.blocks || []).entries()) {
    if (!BLOCK_TYPES.has(b.type)) errs.push(`block ${i}: unknown type "${b.type}"`);
    if (!isCell(b.cell)) { errs.push(`block ${i}: bad cell`); continue; }
    if (typeof b.yaw !== 'number') errs.push(`block ${i}: yaw must be a number`);
    const key = b.cell.join(',');
    if (b.type !== 'gap' && seen.has(key)) errs.push(`block ${i}: cell ${key} already used`);
    seen.add(key);
  }

  if (errs.length) {
    console.log(`✗ ${f}:\n   ${errs.join('\n   ')}`);
    fails++;
  } else {
    console.log(`✓ ${f}  (${t.blocks.length} blocks)`);
  }
}

if (fails) {
  console.log(`\n${fails} track(s) failed`);
  process.exit(1);
}
console.log(`\nall ${files.length} track(s) ok`);
