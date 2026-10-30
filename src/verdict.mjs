// Moteur de verdict de Checkpoint. Il applique les règles de la page La méthode (6.1) :
//  - on ne regarde que les besoins indispensables, les besoins utiles sont affichés sans peser ;
//  - Jouable : tous les besoins indispensables sont couverts ;
//  - Avec adaptations : un besoin n'est pas couvert, mais un réglage, un logiciel ou le matériel
//    de la personne le compense, et c'est vérifié ;
//  - Pas jouable en l'état : un besoin indispensable n'est pas couvert et rien de vérifié ne le compense ;
//  - quand on ne sait pas, on l'écrit : le verdict est signalé incomplet, jamais arrondi.
// Code pur, sans accès au navigateur ni au disque, pour pouvoir le tester.

export const VERDICTS = {
  jouable: 'Jouable',
  'avec-adaptations': 'Jouable avec adaptations',
  'pas-jouable': 'Pas jouable en l\'état',
};

export const SEUIL_VERIFIE = 3;
export const SEUIL_CONTESTE = 3;
export const SEUIL_STUDIO_PREVENU = 5;

// État d'une information, selon ce que disent les joueurs concernés.
// Une session CapGame suffit à elle seule à vérifier ou contester.
export function etat(info = {}) {
  const { confirmations = 0, contestations = 0, session = null, declare = false } = info;
  if (session === 'confirme') return 'verifie';
  if (session === 'conteste') return 'conteste';
  const ok = confirmations >= SEUIL_VERIFIE;
  const ko = contestations >= SEUIL_CONTESTE;
  if (ok && ko) return contestations >= confirmations ? 'conteste' : 'verifie';
  if (ko) return 'conteste';
  if (ok) return 'verifie';
  return declare ? 'declare' : 'inconnu';
}

export const studioPrevenu = (info = {}) => (info.contestations ?? 0) >= SEUIL_STUDIO_PREVENU;

const compte = (a, b) => ({
  confirmations: (a.confirmations ?? 0) + (b.confirmations ?? 0),
  contestations: (a.contestations ?? 0) + (b.contestations ?? 0),
  session: b.session ?? a.session ?? null,
  declare: Boolean(a.declare || b.declare),
});

// Regroupe les informations d'une fiche : une déclaration de boutique et des retours de joueurs sur
// le même tag (ou le même besoin) forment une seule information.
export function fusionner(items) {
  const par = new Map();
  for (const it of items) {
    const cle = it.tag ? `tag:${it.tag}` : `besoin:${it.besoin}`;
    const prev = par.get(cle);
    par.set(cle, prev ? { ...prev, ...compte(prev, it), sources: [...(prev.sources ?? []), ...(it.source ? [it.source] : [])] } : { ...it, ...compte({}, it), sources: it.source ? [it.source] : [] });
  }
  return [...par.values()];
}

const NIVEAUX = { indispensable: 'indispensable', utile: 'utile' };

export function evaluerBesoin(besoin, fiche, profil) {
  const infos = fusionner(fiche.items ?? []);
  const couvrants = infos.filter((i) => (i.tag ? besoin.couvertPar.includes(i.tag) : i.besoin === besoin.id));
  const etats = couvrants.map((i) => ({ info: i, etat: etat(i) }));
  const valides = etats.filter((e) => e.etat === 'verifie' || e.etat === 'declare');
  const aides = infos.filter((i) => i.tag && (besoin.aidePar ?? []).includes(i.tag) && etat(i) !== 'conteste');
  const contestes = etats.filter((e) => e.etat === 'conteste');

  const utilisables = (fiche.compensations ?? []).filter((c) => {
    if (c.besoin !== besoin.id) return false;
    if (c.via === 'materiel') return (profil.materiel ?? []).includes(c.materiel);
    return true;
  });
  const compensations = utilisables.map((c) => ({ ...c, etat: etat(c) }));
  const compensationVerifiee = compensations.find((c) => c.etat === 'verifie');

  const base = {
    id: besoin.id,
    nom: besoin.nom,
    aides: aides.map((a) => a.tag),
    studioPrevenu: couvrants.some((i) => studioPrevenu(i)),
  };
  if (valides.length) {
    const verifie = valides.some((e) => e.etat === 'verifie');
    return { ...base, statut: 'couvert', verifie, preuves: valides.map((e) => describe(e.info, e.etat)) };
  }
  if (compensationVerifiee) {
    return { ...base, statut: 'compense', verifie: true, preuves: [compensationVerifiee.label ?? compensationVerifiee.via] };
  }
  const nonVerifiees = compensations.filter((c) => c.etat !== 'verifie');
  const note = nonVerifiees.length ? `Compensation pas encore vérifiée : ${nonVerifiees.map((c) => c.label ?? c.via).join(', ')}.` : null;
  if (contestes.length) {
    return { ...base, statut: 'bloquant', verifie: false, raison: 'conteste', preuves: contestes.map((e) => describe(e.info, e.etat)), note };
  }
  if (besoin.couvertPar.length && fiche.lecture === 'lue') {
    return { ...base, statut: 'bloquant', verifie: false, raison: 'non-declare', preuves: [], note };
  }
  return { ...base, statut: 'inconnu', verifie: false, raison: fiche.lecture === 'lue' ? 'aucun-tag' : 'aucune-source', preuves: [], note };
}

function describe(info, e) {
  const quoi = info.tag ?? 'retour de joueurs';
  const d = { verifie: 'vérifié', declare: 'déclaré', conteste: 'contesté' }[e] ?? e;
  return `${quoi} (${d})`;
}

export function certitude(evaluations) {
  const total = evaluations.length;
  if (!total) return { pourcentage: null, niveau: null, verifies: 0, total: 0 };
  const verifies = evaluations.filter((e) => e.verifie).length;
  const p = Math.round((verifies / total) * 100);
  const niveau = p >= 75 ? 'elevee' : p >= 40 ? 'moyenne' : 'faible';
  return { pourcentage: p, niveau, verifies, total };
}

// Verdict d'un profil pour une fiche (un jeu sur une plateforme).
export function calculerVerdict(profil, besoins, fiche) {
  const par = new Map(besoins.map((b) => [b.id, b]));
  const evaluations = profil.besoins
    .filter((b) => NIVEAUX[b.niveau] && par.has(b.id))
    .map((b) => ({ ...evaluerBesoin(par.get(b.id), fiche, profil), niveau: b.niveau }));
  const indispensables = evaluations.filter((e) => e.niveau === 'indispensable');
  const statuts = (s) => indispensables.filter((e) => e.statut === s);
  const inconnus = statuts('inconnu');

  let verdict = null;
  if (statuts('bloquant').length) verdict = 'pas-jouable';
  else if (statuts('compense').length) verdict = 'avec-adaptations';
  else if (statuts('couvert').length) verdict = 'jouable';

  return {
    verdict,
    libelle: verdict ? VERDICTS[verdict] : 'Pas assez d\'informations',
    complet: inconnus.length === 0 && verdict !== null,
    manquants: inconnus.map((e) => e.nom),
    bloquants: statuts('bloquant').map((e) => e.nom),
    compenses: statuts('compense').map((e) => e.nom),
    certitude: certitude(indispensables),
    besoins: evaluations,
  };
}
