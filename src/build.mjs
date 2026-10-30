import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport } from './audit.mjs';
import { renderReport } from './render.mjs';
import { renderVerdictPage } from './render-verdict.mjs';
import { parseCsv, construireJeux, PLATEFORMES } from './jeux.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));
const out = join(root, 'report');
mkdirSync(out, { recursive: true });

// 1. L'audit des maquettes
const files = readdirSync(join(root, 'data'))
  .filter((f) => /^screens-.*.json$/.test(f))
  .sort();
const pages = files.flatMap((f) => read(`data/${f}`));
const report = buildReport(pages, read('data/variables.json'), read('data/meta.json'));
writeFileSync(join(out, 'index.html'), renderReport(report));
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2));

// 2. Le simulateur de verdict : la page, le moteur et les données dans le même dossier
const jeux = construireJeux(parseCsv(readFileSync(join(root, 'data/jeux.csv'), 'utf8')));
const besoins = read('data/besoins.json');
writeFileSync(
  join(out, 'verdict-data.json'),
  JSON.stringify({
    besoins: besoins.besoins,
    besoinsNote: besoins.note,
    profils: read('data/profils.json').profils,
    scenario: read('data/scenario.json'),
    jeux,
    plateformes: PLATEFORMES,
  }),
);
writeFileSync(join(out, 'verdict.html'), renderVerdictPage({}, report.tokens));
for (const [src, dst] of [['src/verdict.mjs', 'verdict.mjs'], ['src/jeux.mjs', 'jeux.mjs'], ['src/client-verdict.js', 'client-verdict.js']])
  copyFileSync(join(root, src), join(out, dst));

const t = report.totals;
console.log(
  `Rapport écrit dans report/ : ${t.screens} écrans, ${t.conformes} conformes, ${t.aRelire} à relire, ${t.aCorriger} à corriger, ${t.errors} erreurs. Simulateur : ${jeux.length} jeux.`,
);
