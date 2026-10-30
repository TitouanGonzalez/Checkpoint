import { BASE_CSS, NAV_CSS } from './style.mjs';

const CSS = `
.controles{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:24px 0}
.champ{display:flex;flex-direction:column;gap:6px;font-weight:700;color:var(--encre)}
select{min-height:48px;padding:0 12px;border:1px solid var(--encre-douce);border-radius:8px;background:var(--champ);color:var(--encre);font:inherit;font-weight:400}
select:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--primaire);outline-offset:4px}
fieldset.besoins-profil{border:1px solid var(--ligne);border-radius:16px;background:var(--surface);padding:16px 20px;display:grid;gap:12px;margin:0}
fieldset legend{font-weight:800;padding:0 8px}
.case{display:flex;align-items:center;gap:12px;min-height:48px}
.case input{width:24px;height:24px}
.verdict{border-radius:16px;padding:20px 24px;margin:8px 0 24px;border:2px solid var(--ligne);background:var(--surface)}
.verdict p{margin:0 0 8px;color:var(--encre)}
.verdict-ligne{display:flex;align-items:center;gap:12px;font-size:28px}
.verdict.jouable{background:var(--jouable-doux);border-color:var(--jouable)}
.verdict.avec-adaptations{background:var(--adaptations-doux);border-color:var(--adaptations)}
.verdict.pas-jouable{background:var(--bloquant-doux);border-color:var(--bloquant)}
.verdict.aucun{background:var(--champ)}
.puce{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:999px;font-weight:800;font-size:15px;background:var(--champ);color:var(--encre)}
.puce.grosse{width:40px;height:40px;font-size:22px;color:#fff}
.jouable .puce.grosse{background:var(--jouable)}.avec-adaptations .puce.grosse{background:var(--adaptations)}.pas-jouable .puce.grosse{background:var(--bloquant)}.aucun .puce.grosse{background:var(--encre-douce)}
.incomplet{font-weight:700}
ul.besoins{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.besoin{background:var(--surface);border:1px solid var(--ligne);border-left-width:6px;border-radius:16px;padding:16px 20px}
.besoin p{margin:0 0 6px;color:var(--encre-douce)}
.besoin-tete{display:flex;align-items:center;flex-wrap:wrap;gap:10px;color:var(--encre)!important}
.etiquette{background:var(--champ);border-radius:999px;padding:2px 10px;font-size:14px}
.statut{margin-left:auto;font-weight:800}
.besoin.couvert{border-left-color:var(--jouable)}.besoin.couvert .puce,.besoin.couvert .statut{background:var(--jouable-doux);color:var(--jouable)}
.besoin.compense{border-left-color:var(--adaptations)}.besoin.compense .puce,.besoin.compense .statut{background:var(--adaptations-doux);color:var(--adaptations)}
.besoin.bloquant{border-left-color:var(--bloquant)}.besoin.bloquant .puce,.besoin.bloquant .statut{background:var(--bloquant-doux);color:var(--bloquant)}
.besoin.inconnu{border-left-color:var(--encre-douce)}
.besoin .statut{background:none!important}
.detail{font-size:15px}
.matrice td,.matrice th{padding:8px 12px}
.cellule{width:100%;min-height:48px;text-align:left;border:1px solid var(--ligne);border-radius:8px;background:var(--surface);color:var(--encre);font:inherit;cursor:pointer;padding:6px 12px}
.cellule.jouable{background:var(--jouable-doux)}.cellule.avec-adaptations{background:var(--adaptations-doux)}.cellule.pas-jouable{background:var(--bloquant-doux)}
.cellule:hover{border-color:var(--primaire)}
tr.ok td:nth-child(5){color:var(--jouable);font-weight:700}
@media (max-width:760px){.verdict-ligne{font-size:22px}.statut{margin-left:0}}
`;

const TOKEN_VARS = ['fond','surface','encre','encre-douce','ligne','primaire','primaire-doux','jouable','jouable-doux','adaptations','adaptations-doux','bloquant','bloquant-doux','champ'];

export function renderVerdictPage(meta = {}, tokens = {}) {
  const tokenCss = TOKEN_VARS.filter((k) => /^#[0-9a-f]{6}$/i.test(tokens[k] ?? '')).map((k) => `--${k}:${tokens[k]}`).join(';');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Simulateur de verdict Checkpoint</title>
<style>${BASE_CSS}${NAV_CSS}${CSS}</style>
<style>:root{${tokenCss}}</style>
</head>
<body>
<header>
<nav class="topnav" aria-label="Pages du rapport"><a href="index.html">Audit des maquettes</a><a href="verdict.html" aria-current="page">Simulateur de verdict</a></nav>
<p class="eyebrow">La méthode, appliquée pour de vrai</p>
<h1>Quel verdict pour quel profil ?</h1>
<p>Ce simulateur applique les règles de la page La méthode (6.1) aux relevés des boutiques du ${meta.releveDate ?? '26 octobre 2026'}. Choisis un jeu, une plateforme et des besoins : le verdict, la certitude et la raison de chaque besoin se calculent sous tes yeux.</p>
<p id="regles"></p>
</header>
<main>
<h2>Choisir</h2>
<div id="controles"></div>
<h2>Résultat</h2>
<div id="resultat" tabindex="-1"></div>
<h2>Tous les jeux, pour ce profil</h2>
<p>Clique sur une case pour voir le détail.</p>
<div id="matrice" style="overflow-x:auto"></div>
<h2>Écarts avec les maquettes</h2>
<p>Les maquettes affirment un verdict pour trois jeux. Voici ce que le moteur calcule avec les mêmes règles, sur chaque plateforme du profil. Un écart n'est pas forcément une erreur du moteur : il peut montrer une phrase des maquettes à préciser.</p>
<div id="ecarts" style="overflow-x:auto"></div>
</main>
<footer>
<p id="scenario-note"></p>
<p id="besoins-note"></p>
<p>Décisions du moteur : un besoin sans tag ni retour de joueurs reste inconnu et rend le verdict incomplet. Un besoin dont la source est lue mais ne déclare rien de couvrant est bloquant. À égalité de confirmations et de contestations, la contestation l'emporte.</p>
</footer>
<script type="module" src="client-verdict.js"></script>
</body>
</html>`;
}
