// Page du simulateur : lit les données, appelle le moteur et dessine le résultat.
import { calculerVerdict, VERDICTS, SEUIL_VERIFIE, SEUIL_CONTESTE, SEUIL_STUDIO_PREVENU } from './verdict.mjs';
import { fiche } from './jeux.mjs';

const data = await (await fetch('verdict-data.json')).json();
const { besoins, profils, jeux, scenario, plateformes } = data;

const h = (tag, attrs = {}, ...enfants) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const e of enfants.flat()) {
    if (e == null || e === false) continue;
    el.append(e instanceof Node ? e : document.createTextNode(String(e)));
  }
  return el;
};

const ICONES = { jouable: '✓', 'avec-adaptations': '+', 'pas-jouable': '✕', aucun: '?' };
const STATUTS = {
  couvert: { icone: '✓', texte: 'Couvert' },
  compense: { icone: '+', texte: 'Compensé' },
  bloquant: { icone: '✕', texte: 'Bloquant' },
  inconnu: { icone: '?', texte: 'Inconnu' },
};
const NIVEAUX = { indispensable: 'Indispensable', utile: 'Utile', aucun: 'Pas concerné' };

const etat = {
  profilId: profils[0].id,
  jeuId: 'clair-obscur-expedition-33',
  plateforme: 'PC',
  niveaux: {},
  materiel: new Set(profils[0].materiel),
};

const profilCourant = () => {
  const base = profils.find((p) => p.id === etat.profilId);
  const niveaux = new Map(base.besoins.map((b) => [b.id, b.niveau]));
  for (const b of besoins) {
    const choisi = etat.niveaux[b.id] ?? niveaux.get(b.id) ?? 'aucun';
    niveaux.set(b.id, choisi);
  }
  return {
    ...base,
    materiel: [...etat.materiel],
    besoins: [...niveaux].filter(([, n]) => n !== 'aucun').map(([id, niveau]) => ({ id, niveau })),
  };
};

const calcul = (jeu, plateforme, profil = profilCourant()) =>
  calculerVerdict(profil, besoins, fiche(jeu, plateforme, scenario));

function explication(b) {
  if (b.statut === 'couvert')
    return b.verifie
      ? 'Le jeu couvre ce besoin, et des joueurs ou une session l\'ont vérifié.'
      : 'Le jeu déclare de quoi couvrir ce besoin. Personne ne l\'a encore vérifié.';
  if (b.statut === 'compense') return 'Le jeu ne couvre pas ce besoin, mais une compensation vérifiée existe.';
  if (b.statut === 'bloquant')
    return b.raison === 'conteste'
      ? 'La déclaration a été contestée : elle ne compte plus comme une couverture.'
      : 'La source lue ne déclare rien qui couvre ce besoin, et rien de vérifié ne le compense.';
  if (b.raison === 'aucune-source') return 'Aucune source sur cette plateforme. On ne sait pas.';
  return 'Aucune information sur ce besoin. On ne sait pas.';
}

function carteBesoin(b) {
  const s = STATUTS[b.statut];
  return h(
    'li',
    { class: `besoin ${b.statut}` },
    h('p', { class: 'besoin-tete' }, h('span', { class: 'puce', 'aria-hidden': 'true' }, s.icone), h('strong', {}, b.nom), h('span', { class: 'etiquette' }, NIVEAUX[b.niveau]), h('span', { class: 'statut' }, s.texte)),
    h('p', {}, explication(b), b.niveau === 'utile' ? ' Ce besoin est utile : il est affiché mais ne change pas le verdict.' : ''),
    b.preuves.length ? h('p', { class: 'detail' }, 'Preuves : ', b.preuves.join(', '), '.') : null,
    b.aides.length ? h('p', { class: 'detail' }, 'Aide aussi : ', b.aides.join(', '), '.') : null,
    b.note ? h('p', { class: 'detail' }, b.note) : null,
    b.studioPrevenu ? h('p', { class: 'detail' }, `Le studio est prévenu (${SEUIL_STUDIO_PREVENU} contestations ou plus).`) : null,
  );
}

function verdictCarte(r, jeu) {
  const cle = r.verdict ?? 'aucun';
  const cert = r.certitude;
  const libCert = { elevee: 'Élevée', moyenne: 'Moyenne', faible: 'Faible' }[cert.niveau] ?? 'Sans objet';
  return h(
    'section',
    { class: `verdict ${cle}`, 'aria-live': 'polite' },
    h('p', { class: 'verdict-ligne' }, h('span', { class: 'puce grosse', 'aria-hidden': 'true' }, ICONES[cle]), h('strong', {}, r.libelle)),
    h('p', {}, `${jeu.nom} sur ${etat.plateforme}, pour ${profilCourant().nom}.`),
    h('p', {}, cert.total ? `Certitude : ${libCert}, ${cert.verifies} information${cert.verifies > 1 ? 's' : ''} vérifiée${cert.verifies > 1 ? 's' : ''} sur ${cert.total} (${cert.pourcentage} %).` : 'Certitude : sans objet, aucun besoin indispensable.'),
    r.complet ? null : h('p', { class: 'incomplet' }, r.verdict ? `Verdict incomplet : on ne sait pas encore pour ${r.manquants.join(', ')}.` : 'Verdict impossible : il manque trop d\'informations pour répondre.'),
  );
}

function matrice() {
  const profil = profilCourant();
  const tete = h('tr', {}, h('th', {}, 'Jeu'), ...plateformes.map((p) => h('th', {}, p)));
  const lignes = jeux.map((j) =>
    h('tr', {}, h('th', { scope: 'row' }, j.nom), ...plateformes.map((p) => {
      const r = calcul(j, p, profil);
      const cle = r.verdict ?? 'aucun';
      return h('td', {}, h('button', { type: 'button', class: `cellule ${cle}`, 'aria-label': `${j.nom} sur ${p} : ${r.libelle}${r.complet ? '' : ', incomplet'}`, onclick: () => { etat.jeuId = j.id; etat.plateforme = p; rendre(); document.getElementById('resultat').scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, h('span', { 'aria-hidden': 'true' }, ICONES[cle] + ' '), r.libelle, r.complet || !r.verdict ? '' : ' (incomplet)'));
    })),
  );
  return h('table', { class: 'matrice' }, h('thead', {}, tete), h('tbody', {}, lignes));
}

function ecarts() {
  const profil = profilCourant();
  const lignes = [];
  for (const a of scenario.attendu) {
    const jeu = jeux.find((j) => j.id === a.jeu);
    for (const p of plateformes) {
      const r = calcul(jeu, p, profil);
      const ok = r.verdict === a.verdict;
      lignes.push(h('tr', { class: ok ? 'ok' : 'ko' }, h('td', {}, jeu.nom), h('td', {}, p), h('td', {}, VERDICTS[a.verdict]), h('td', {}, r.libelle), h('td', {}, ok ? '✓ Identique' : '✕ Écart'), h('td', {}, a.source)));
    }
  }
  return h('table', { class: 'matrice' }, h('thead', {}, h('tr', {}, ...['Jeu', 'Plateforme', 'Dans les maquettes', 'Selon le moteur', 'Résultat', 'Origine'].map((t) => h('th', {}, t)))), h('tbody', {}, lignes));
}

function selecteur(id, libelle, options, valeur, onchange) {
  return h('label', { class: 'champ', for: id }, libelle, h('select', { id, onchange: (e) => onchange(e.target.value) }, options.map(([v, t]) => h('option', { value: v, selected: v === valeur }, t))));
}

function controles() {
  const profil = profils.find((p) => p.id === etat.profilId);
  const courant = profilCourant();
  return h(
    'div',
    { class: 'controles' },
    selecteur('jeu', 'Jeu', jeux.map((j) => [j.id, j.nom]), etat.jeuId, (v) => { etat.jeuId = v; rendre(); }),
    selecteur('plateforme', 'Plateforme', plateformes.map((p) => [p, p]), etat.plateforme, (v) => { etat.plateforme = v; rendre(); }),
    h('fieldset', { class: 'besoins-profil' }, h('legend', {}, `Les besoins de ${profil.nom}`), ...besoins.map((b) => {
      const niveau = courant.besoins.find((x) => x.id === b.id)?.niveau ?? 'aucun';
      return selecteur(`b-${b.id}`, b.nom, Object.entries(NIVEAUX), niveau, (v) => { etat.niveaux[b.id] = v; rendre(); });
    })),
    h('fieldset', { class: 'besoins-profil' }, h('legend', {}, 'Matériel de la personne'), ...[...new Set(profils.flatMap((p) => p.materiel))].map((m) => h('label', { class: 'case' }, h('input', { type: 'checkbox', checked: etat.materiel.has(m), onchange: (e) => { e.target.checked ? etat.materiel.add(m) : etat.materiel.delete(m); rendre(); } }), m))),
  );
}

function rendre() {
  const focus = document.activeElement?.id;
  const jeu = jeux.find((j) => j.id === etat.jeuId);
  const r = calcul(jeu, etat.plateforme);
  const f = fiche(jeu, etat.plateforme, scenario);
  document.getElementById('controles').replaceChildren(controles());
  document.getElementById('resultat').replaceChildren(
    verdictCarte(r, jeu),
    h('h2', {}, 'Besoin par besoin'),
    h('ul', { class: 'besoins' }, r.besoins.map(carteBesoin)),
    h('p', { class: 'detail' }, f.lecture === 'lue' ? `Sources lues : ${f.sources.join(', ')}. ${f.items.filter((i) => i.declare).length} tags AGI déclarés.` : `Aucune source lue pour ${etat.plateforme} (${f.sources.join(', ') || 'aucune source'}).`),
  );
  document.getElementById('matrice').replaceChildren(matrice());
  document.getElementById('ecarts').replaceChildren(ecarts());
  if (focus) document.getElementById(focus)?.focus();
}

document.getElementById('regles').textContent = `Une information est vérifiée après ${SEUIL_VERIFIE} confirmations, contestée après ${SEUIL_CONTESTE} contestations, et le studio est prévenu à ${SEUIL_STUDIO_PREVENU}. Une session CapGame suffit à elle seule.`;
document.getElementById('scenario-note').textContent = scenario.note;
document.getElementById('besoins-note').textContent = data.besoinsNote;
rendre();
