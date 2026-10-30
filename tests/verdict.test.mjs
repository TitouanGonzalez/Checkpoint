import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { etat, studioPrevenu, calculerVerdict, certitude, fusionner } from '../src/verdict.mjs';
import { parseCsv, construireJeux, fiche, slug } from '../src/jeux.mjs';

const lire = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const { besoins } = lire('besoins.json');
const { profils } = lire('profils.json');
const scenario = lire('scenario.json');
const titouan = profils[0];

const profil = (niveaux, materiel = []) => ({
  id: 'p',
  materiel,
  besoins: Object.entries(niveaux).map(([id, niveau]) => ({ id, niveau })),
});
const tag = (t) => ({ tag: t, declare: true, source: 'Steam' });
const lue = (items, compensations = []) => ({ lecture: 'lue', items, compensations });

test('état : 3 confirmations vérifient, 3 contestations contestent, rien ne dit inconnu', () => {
  assert.equal(etat({}), 'inconnu');
  assert.equal(etat({ declare: true }), 'declare');
  assert.equal(etat({ confirmations: 2, declare: true }), 'declare');
  assert.equal(etat({ confirmations: 3 }), 'verifie');
  assert.equal(etat({ contestations: 3, declare: true }), 'conteste');
});

test('état : une session CapGame suffit à elle seule', () => {
  assert.equal(etat({ session: 'confirme' }), 'verifie');
  assert.equal(etat({ session: 'conteste', confirmations: 10 }), 'conteste');
});

test('état : à égalité, la contestation l\'emporte', () => {
  assert.equal(etat({ confirmations: 4, contestations: 4 }), 'conteste');
  assert.equal(etat({ confirmations: 5, contestations: 3 }), 'verifie');
});

test('le studio est prévenu à 5 contestations, pas avant', () => {
  assert.equal(studioPrevenu({ contestations: 4 }), false);
  assert.equal(studioPrevenu({ contestations: 5 }), true);
});

test('Jouable : tous les besoins indispensables sont couverts', () => {
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable', dialogues: 'indispensable' }), besoins, lue([tag('Large Text'), tag('Large & Clear Subtitles')]));
  assert.equal(r.verdict, 'jouable');
  assert.equal(r.complet, true);
});

test('Pas jouable : un besoin indispensable n\'est pas couvert et rien ne le compense', () => {
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable', dialogues: 'indispensable' }), besoins, lue([tag('Large Text')]));
  assert.equal(r.verdict, 'pas-jouable');
  assert.deepEqual(r.bloquants, ['Suivre les dialogues']);
});

test('Avec adaptations : un réglage vérifié compense', () => {
  const comp = { besoin: 'une-main', via: 'reglage', label: 'Mode simple', confirmations: 3 };
  const r = calculerVerdict(profil({ 'une-main': 'indispensable' }), besoins, lue([], [comp]));
  assert.equal(r.verdict, 'avec-adaptations');
  assert.deepEqual(r.compenses, ['Jouer d\'une seule main']);
});

test('une compensation seulement déclarée ne suffit pas', () => {
  const comp = { besoin: 'une-main', via: 'reglage', label: 'Mode simple', confirmations: 1, declare: true };
  const r = calculerVerdict(profil({ 'une-main': 'indispensable' }), besoins, lue([], [comp]));
  assert.equal(r.verdict, 'pas-jouable');
  assert.match(r.besoins[0].note, /pas encore vérifiée/);
});

test('le matériel ne compense que s\'il appartient à la personne', () => {
  const comp = { besoin: 'une-main', via: 'materiel', materiel: 'manette adaptative Xbox', session: 'confirme' };
  const sans = calculerVerdict(profil({ 'une-main': 'indispensable' }), besoins, lue([], [comp]));
  const avec = calculerVerdict(profil({ 'une-main': 'indispensable' }, ['manette adaptative Xbox']), besoins, lue([], [comp]));
  assert.equal(sans.verdict, 'pas-jouable');
  assert.equal(avec.verdict, 'avec-adaptations');
});

test('les besoins utiles ne changent jamais le verdict', () => {
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable', 'sans-maintien': 'utile' }), besoins, lue([tag('Large Text')]));
  assert.equal(r.verdict, 'jouable');
  const utile = r.besoins.find((b) => b.id === 'sans-maintien');
  assert.equal(utile.statut, 'bloquant');
  assert.equal(utile.niveau, 'utile');
});

test('une déclaration contestée ne couvre plus le besoin', () => {
  const f = lue([tag('Full Input Remapping'), { tag: 'Full Input Remapping', contestations: 5 }]);
  const r = calculerVerdict(profil({ 'une-main': 'indispensable' }), besoins, f);
  assert.equal(r.verdict, 'pas-jouable');
  assert.equal(r.besoins[0].raison, 'conteste');
  assert.equal(r.besoins[0].studioPrevenu, true);
});

test('une déclaration confirmée par des joueurs devient vérifiée', () => {
  const f = lue([tag('Large Text'), { tag: 'Large Text', confirmations: 3 }]);
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable' }), besoins, f);
  assert.equal(r.besoins[0].verifie, true);
  assert.equal(r.certitude.niveau, 'elevee');
});

test('sans source lue, on ne sait pas : le verdict est absent, pas arrondi', () => {
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable' }), besoins, { lecture: 'aucune', items: [] });
  assert.equal(r.verdict, null);
  assert.equal(r.complet, false);
  assert.equal(r.besoins[0].statut, 'inconnu');
});

test('un besoin sans tag, sans retour de joueurs, reste inconnu et rend le verdict incomplet', () => {
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable', flashs: 'indispensable' }), besoins, lue([tag('Large Text')]));
  assert.equal(r.verdict, 'jouable');
  assert.equal(r.complet, false);
  assert.deepEqual(r.manquants, ['Éviter les flashs']);
});

test('un retour de joueurs peut couvrir un besoin sans tag', () => {
  const f = lue([tag('Large Text'), { besoin: 'flashs', confirmations: 4 }]);
  const r = calculerVerdict(profil({ 'petits-textes': 'indispensable', flashs: 'indispensable' }), besoins, f);
  assert.equal(r.complet, true);
  assert.equal(r.besoins.find((b) => b.id === 'flashs').verifie, true);
});

test('certitude : 75 % ou plus élevée, de 40 à 74 moyenne, moins de 40 faible', () => {
  const mk = (v, t) => Array.from({ length: t }, (_, i) => ({ verifie: i < v }));
  assert.equal(certitude(mk(3, 4)).niveau, 'elevee');
  assert.equal(certitude(mk(2, 4)).niveau, 'moyenne');
  assert.equal(certitude(mk(1, 4)).niveau, 'faible');
  assert.equal(certitude([]).niveau, null);
});

test('fusionner : la déclaration et les retours sur le même tag forment une information', () => {
  const m = fusionner([tag('Large Text'), { tag: 'Large Text', confirmations: 2 }, { besoin: 'flashs', confirmations: 1 }]);
  assert.equal(m.length, 2);
  assert.equal(m.find((i) => i.tag === 'Large Text').confirmations, 2);
  assert.equal(m.find((i) => i.tag === 'Large Text').declare, true);
});

test('CSV : guillemets doublés et points-virgules dans un champ', () => {
  const rows = parseCsv('"a";"b"\n"x;y";"dit ""oui"""\n');
  assert.deepEqual(rows, [{ a: 'x;y', b: 'dit "oui"' }]);
});

test('relevé réel : les 8 jeux et les plateformes se chargent', () => {
  const jeux = construireJeux(parseCsv(readFileSync(new URL('../data/jeux.csv', import.meta.url), 'utf8')));
  assert.equal(jeux.length, 8);
  assert.ok(jeux.find((j) => j.id === 'elden-ring'));
  const co = jeux.find((j) => j.id === 'clair-obscur-expedition-33');
  assert.equal(co.fiches['PC'].items.length, 6);
  assert.equal(co.fiches['Xbox Series'].items.length, 1);
  assert.equal(slug('Baldur\'s Gate 3'), 'baldurs-gate-3');
});

test('scénario : les cas de référence des maquettes donnent le verdict attendu sur PC', () => {
  const jeux = construireJeux(parseCsv(readFileSync(new URL('../data/jeux.csv', import.meta.url), 'utf8')));
  for (const a of scenario.attendu) {
    const jeu = jeux.find((j) => j.id === a.jeu);
    const r = calculerVerdict(titouan, besoins, fiche(jeu, 'PC', scenario));
    assert.equal(r.verdict, a.verdict, `${a.jeu} sur PC : ${r.verdict}`);
  }
});

test('les textes du moteur n\'ont pas de caractère interdit', () => {
  const src = readFileSync(new URL('../src/verdict.mjs', import.meta.url), 'utf8') + readFileSync(new URL('../data/besoins.json', import.meta.url), 'utf8');
  assert.ok(!/[–—«»→  ]/.test(src));
});
