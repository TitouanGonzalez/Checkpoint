import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from './audit.mjs';
import { renderReport } from './render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));

const files = readdirSync(join(root, 'data'))
  .filter((f) => /^screens-.*\.json$/.test(f))
  .sort();
const pages = files.flatMap((f) => read(`data/${f}`));
const report = buildReport(pages, read('data/variables.json'), read('data/meta.json'));

mkdirSync(join(root, 'report'), { recursive: true });
writeFileSync(join(root, 'report', 'index.html'), renderReport(report));
writeFileSync(join(root, 'report', 'report.json'), JSON.stringify(report, null, 2));

const t = report.totals;
console.log(
  `Rapport écrit dans report/index.html : ${t.screens} écrans, ${t.conformes} conformes, ${t.aRelire} à relire, ${t.aCorriger} à corriger, ${t.errors} erreurs.`,
);
