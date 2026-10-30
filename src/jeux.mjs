// Lit le relevé des boutiques (jeux.csv) et fabrique les fiches utilisées par le moteur de verdict.
export const PLATEFORMES = ['PC', 'Xbox Series'];
const SOURCES = { Steam: ['PC'], Xbox: ['Xbox Series'], Ubisoft: ['PC', 'Xbox Series'] };

// Lecture CSV avec séparateur point-virgule et guillemets doublés.
export function parseCsv(texte) {
  const t = texte.replace(/^﻿/, '');
  const lignes = [];
  let champ = '';
  let ligne = [];
  let guillemets = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === ';') {
      ligne.push(champ);
      champ = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      ligne.push(champ);
      champ = '';
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  const [tete, ...corps] = lignes;
  return corps.map((l) => Object.fromEntries(tete.map((k, i) => [k, l[i] ?? ''])));
}

export const slug = (s) =>
  s
    .toLowerCase()
    .replace(/['‘’ʼ´`]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const nomPropre = (s) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase()) : s;

// Une fiche par jeu et par plateforme : ce que les sources lues déclarent.
export function construireJeux(lignes) {
  const jeux = new Map();
  for (const l of lignes) {
    const id = slug(l.jeu);
    if (!jeux.has(id)) jeux.set(id, { id, nom: nomPropre(l.jeu), studio: l.studio, editeur: l.editeur, sortie: l.sortie, fiches: {} });
    const jeu = jeux.get(id);
    for (const plateforme of SOURCES[l.source] ?? []) {
      const f = (jeu.fiches[plateforme] ??= { plateforme, lecture: 'aucune', sources: [], items: [], propresXbox: [] });
      if (!f.sources.includes(l.source)) f.sources.push(l.source);
      if (l.statut_source !== 'Lue') continue;
      f.lecture = 'lue';
      if (l.tag_agi && !f.items.some((i) => i.tag === l.tag_agi)) f.items.push({ tag: l.tag_agi, declare: true, source: l.source });
      if (l.famille === 'Propre à Xbox' && l.libelle_source && !f.propresXbox.includes(l.libelle_source)) f.propresXbox.push(l.libelle_source);
    }
  }
  return [...jeux.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

// Ajoute à une fiche les retours et compensations du scénario de démonstration.
export function fiche(jeu, plateforme, scenario = {}) {
  const base = jeu.fiches[plateforme] ?? { plateforme, lecture: 'aucune', sources: [], items: [], propresXbox: [] };
  const retours = (scenario.retours ?? []).filter((r) => r.jeu === jeu.id && r.plateforme === plateforme);
  const compensations = (scenario.compensations ?? []).filter((c) => c.jeu === jeu.id && c.plateforme === plateforme);
  return { ...base, items: [...base.items, ...retours], compensations };
}
