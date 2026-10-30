import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ratio, requiredRatio, luminance, hexToRgb } from '../src/contrast.mjs';
import { analyseScreen, analysePalette, buildReport, RULES } from '../src/audit.mjs';
import { renderReport } from '../src/render.mjs';

const screen = (over = {}) => ({
  id: '1:1',
  name: '1.1 Test',
  w: 390,
  h: 800,
  mode: 'Mobile',
  expected: 'Mobile',
  nodes: 10,
  instances: 2,
  r: {},
  pairs: [],
  ...over,
});

test('contraste : noir sur blanc vaut 21, deux couleurs égales valent 1', () => {
  assert.equal(Math.round(ratio('#000000', '#ffffff')), 21);
  assert.equal(ratio('#3b33cc', '#3b33cc'), 1);
  assert.equal(ratio('#ffffff', '#000000'), ratio('#000000', '#ffffff'));
});

test('contraste : valeurs connues et luminance', () => {
  assert.ok(Math.abs(ratio('#777777', '#ffffff') - 4.48) < 0.02);
  assert.ok(luminance('#ffffff') > 0.99 && luminance('#000000') === 0);
  assert.deepEqual(hexToRgb('#8BC46A'), [139, 196, 106]);
  assert.throws(() => hexToRgb('rouge'));
});

test('contraste : un grand texte demande 3, un petit texte 4,5', () => {
  assert.equal(requiredRatio(24, false), 3);
  assert.equal(requiredRatio(19, true), 3);
  assert.equal(requiredRatio(19, false), 4.5);
  assert.equal(requiredRatio(14, true), 4.5);
});

test('un écran sans constat est conforme', () => {
  const s = analyseScreen(screen());
  assert.equal(s.status, 'conforme');
  assert.equal(s.errors, 0);
});

test('une couleur libre est une erreur, un rayon non lié une relecture', () => {
  const s = analyseScreen(
    screen({
      r: {
        couleur: { n: 2, s: [['1:2', 'Rect', 'fills #ff0000']] },
        rayonLibre: { n: 1, s: [['1:3', 'Barre', 'rayon 3']] },
      },
    }),
  );
  assert.equal(s.errors, 2);
  assert.equal(s.warnings, 1);
  assert.equal(s.status, 'a corriger');
  assert.equal(s.issues[0].rule, 'couleur');
});

test('seuls des avertissements donnent "a relire"', () => {
  const s = analyseScreen(screen({ r: { rayonLibre: { n: 1, s: [['1:3', 'B', 'rayon 3']] } } }));
  assert.equal(s.status, 'a relire');
});

test('un écart négatif est à confirmer, pas une erreur', () => {
  const s = analyseScreen(screen({ r: { espacement: { n: 1, s: [['1:4', 'Avatars', 'itemSpacing -8']] } } }));
  assert.equal(s.errors, 0);
  assert.equal(s.infos, 1);
  assert.equal(s.issues[0].rule, 'chevauchement');
});

test('un écart hors échelle positif reste une erreur', () => {
  const s = analyseScreen(screen({ r: { espacement: { n: 2, s: [['1:5', 'Hero', 'paddingLeft 240']] } } }));
  assert.equal(s.errors, 2);
});

test('les sigles en capitales ne sont pas signalés, les titres si', () => {
  const sigle = analyseScreen(screen({ r: { capitales: { n: 1, s: [['1:6', 'PS5, PC', 'PS5, PC']] } } }));
  assert.equal(sigle.issues.length, 0);
  const titre = analyseScreen(screen({ r: { capitales: { n: 1, s: [['1:7', 'T', 'CONSEIL DU JOUR']] } } }));
  assert.equal(titre.warnings, 1);
});

test('un mauvais mode de typographie est une erreur', () => {
  const s = analyseScreen(screen({ mode: 'Ordinateur', expected: 'Mobile' }));
  assert.equal(s.errors, 1);
  assert.equal(s.issues[0].rule, 'mode');
});

test('contraste de texte : une paire faible est signalée avec son nombre', () => {
  const s = analyseScreen(
    screen({ pairs: [['#aaaaaa', '#ffffff', 14, 0, 3, '1:8'], ['#14161f', '#ffffff', 14, 0, 5, '1:9']] }),
  );
  const c = s.issues.find((i) => i.rule === 'contraste');
  assert.ok(c);
  assert.equal(c.count, 3);
  assert.equal(s.textPairs, 8);
});

test('contraste de texte : un grand texte à 3,5:1 passe', () => {
  const s = analyseScreen(screen({ pairs: [['#8d8a82', '#ffffff', 32, 1, 1, '1:10']] }));
  assert.equal(s.issues.length, 0);
});

test('chaque règle a un libellé, un niveau, une raison et une action', () => {
  for (const [id, r] of Object.entries(RULES)) {
    assert.ok(r.label && r.why && r.how, id);
    assert.ok(['error', 'warning', 'info'].includes(r.severity), id);
    assert.ok(!/[–—«»→  ]/.test(r.label + r.why + r.how), `${id} : caractère interdit`);
  }
});

test('la palette : une paire faible est repérée dans un mode', () => {
  const vars = [
    { name: 'couleur/encre', Clair: '#14161f', Sombre: '#aaaaaa' },
    { name: 'couleur/fond', Clair: '#ffffff', Sombre: '#ffffff' },
  ];
  const p = analysePalette(vars);
  assert.ok(p.rows.length > 0);
  assert.ok(p.failing.some((r) => r.mode === 'Sombre'));
  assert.ok(!p.failing.some((r) => r.mode === 'Clair'));
});

test('le rapport totalise les écrans, les erreurs et les règles', () => {
  const pages = [
    {
      page: 'P',
      id: '7:1',
      screens: [screen(), screen({ id: '1:2', r: { couleur: { n: 4, s: [['1:2', 'R', 'fills #f00000']] } } })],
    },
  ];
  const rep = buildReport(pages, [{ name: 'couleur/encre', Clair: '#000000' }, { name: 'couleur/fond', Clair: '#ffffff' }], { fileKey: 'K' });
  assert.equal(rep.totals.screens, 2);
  assert.equal(rep.totals.conformes, 1);
  assert.equal(rep.totals.aCorriger, 1);
  assert.equal(rep.totals.errors, 4);
  assert.equal(rep.perRule.couleur.count, 4);
});

test('la page de rapport échappe le HTML et contient les liens Figma', () => {
  const pages = [
    { page: 'P <b>', id: '7:1', screens: [screen({ r: { couleur: { n: 1, s: [['9:99', '<script>x</script>', 'fills #ff0000']] } } })] },
  ];
  const html = renderReport(buildReport(pages, [{ name: 'couleur/encre', Clair: '#000000' }, { name: 'couleur/fond', Clair: '#ffffff' }], { fileKey: 'KEY', fileName: 'F', extractedAt: '2026-10-30' }));
  assert.ok(!html.includes('<script>x'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('https://www.figma.com/design/KEY?node-id=9-99'));
  assert.ok(html.includes('lang="fr"'));
  assert.ok(!/[–—«»→  ]/.test(html.replace(/✓|✕/g, '')));
});

test('les données réelles se chargent et donnent un rapport cohérent', () => {
  const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
  const pages = [...read('screens-01-03.json'), ...read('screens-04-06.json')];
  const rep = buildReport(pages, read('variables.json'), read('meta.json'));
  assert.equal(rep.totals.pages, 6);
  assert.equal(rep.totals.screens, 35);
  assert.equal(rep.totals.conformes + rep.totals.aRelire + rep.totals.aCorriger, 35);
});
