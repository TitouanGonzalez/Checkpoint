import { RULES } from './audit.mjs';
import { BASE_CSS, NAV_CSS } from './style.mjs';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STATUS = {
  conforme: { icon: '✓', text: 'Conforme' },
  'a relire': { icon: '!', text: 'À relire' },
  'a corriger': { icon: '✕', text: 'À corriger' },
};
const SEV = {
  error: { icon: '✕', text: 'Erreur' },
  warning: { icon: '!', text: 'À relire' },
  info: { icon: 'i', text: 'À confirmer' },
};

const figmaLink = (meta, id) =>
  `https://www.figma.com/design/${meta.fileKey}?node-id=${String(id).replace(':', '-')}`;

function issueRow(meta, issue) {
  const rule = RULES[issue.rule];
  const sev = SEV[issue.severity];
  const samples = issue.samples
    .map(
      (s) =>
        `<li><a href="${esc(figmaLink(meta, s[0]))}" target="_blank" rel="noreferrer">${esc(s[1])}</a> <span>${esc(s[2])}</span></li>`,
    )
    .join('');
  return `<div class="issue ${issue.severity}">
  <p class="issue-head"><span class="sev" aria-hidden="true">${sev.icon}</span><strong>${esc(rule.label)}</strong> <span class="count">${issue.count}</span> <span class="sev-text">${sev.text}</span></p>
  <p class="why">${esc(rule.why)}</p>
  <ul class="samples">${samples}</ul>
  <p class="how">À faire : ${esc(rule.how)}</p>
</div>`;
}

function screenBlock(meta, s) {
  const st = STATUS[s.status];
  const body = s.issues.length
    ? s.issues.map((i) => issueRow(meta, i)).join('')
    : '<p class="clean">Aucun constat sur cet écran.</p>';
  return `<details class="screen ${s.status.replace(' ', '-')}">
  <summary>
    <span class="badge" aria-hidden="true">${st.icon}</span>
    <span class="s-name"><a href="${esc(figmaLink(meta, s.id))}" target="_blank" rel="noreferrer">${esc(s.name)}</a></span>
    <span class="s-meta">${s.width} px, mode ${esc(s.mode ?? 'aucun')}</span>
    <span class="s-status">${st.text}</span>
    <span class="s-count">${s.errors} erreur${s.errors > 1 ? 's' : ''}, ${s.warnings} à relire</span>
  </summary>
  ${body}
</details>`;
}

function paletteTable(palette) {
  const rows = palette.rows
    .map(
      (r) => `<tr class="${r.pass ? 'ok' : 'ko'}">
<td>${esc(r.kind)}</td><td><i class="sw" style="background:${r.fgHex}"></i>${esc(r.fg)}</td><td><i class="sw" style="background:${r.bgHex}"></i>${esc(r.bg)}</td><td>${esc(r.mode)}</td><td>${r.ratio.toFixed(2)}:1</td><td>${r.need}:1</td><td>${r.pass ? '✓ Réussi' : '✕ Échec'}</td></tr>`,
    )
    .join('');
  return `<table class="palette"><thead><tr><th>Usage</th><th>Premier plan</th><th>Fond</th><th>Mode</th><th>Contraste</th><th>Minimum</th><th>Résultat</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const TOKEN_VARS = ['fond','surface','encre','encre-douce','ligne','primaire','primaire-doux','jouable','jouable-doux','adaptations','adaptations-doux','bloquant','bloquant-doux','champ'];

export function renderReport(report) {
  const { meta, totals, perRule, pages, palette, tokens = {} } = report;
  const tokenCss = TOKEN_VARS.filter((k) => /^#[0-9a-f]{6}$/i.test(tokens[k] ?? '')).map((k) => `--${k}:${tokens[k]}`).join(';');
  const rules = Object.entries(RULES)
    .map(([id, r]) => {
      const n = perRule[id];
      return `<tr><td>${esc(r.label)}</td><td>${SEV[r.severity].text}</td><td>${esc(r.why)}</td><td>${n ? `${n.count} sur ${n.screens} écran${n.screens > 1 ? 's' : ''}` : 'Aucun'}</td></tr>`;
    })
    .join('');
  const pageBlocks = pages
    .map(
      (p) => `<section class="page">
  <h2>${esc(p.name)}</h2>
  <p class="page-sum">${p.screens.length} écrans, ${p.errors} erreur${p.errors > 1 ? 's' : ''}, ${p.warnings} à relire, ${p.infos} à confirmer.</p>
  ${p.screens.map((s) => screenBlock(meta, s)).join('')}
</section>`,
    )
    .join('');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit Checkpoint</title>
<style>
${BASE_CSS}${NAV_CSS}
</style>
<style>:root{${tokenCss}}</style>
</head>
<body>
<header>
<nav class="topnav" aria-label="Pages du rapport"><a href="index.html" aria-current="page">Audit des maquettes</a><a href="verdict.html">Simulateur de verdict</a></nav>
<p class="eyebrow">Audit du fichier Figma</p>
<h1>Checkpoint, où en sont les maquettes ?</h1>
<p>${esc(meta.fileName ?? '')}, relevé du ${esc(meta.extractedAt ?? '')}. ${totals.screens} écrans sur ${totals.pages} pages, ${totals.nodes} éléments contrôlés, ${totals.textPairs} textes testés en contraste.</p>
<div class="cards">
<div class="card ok"><b>${totals.conformes}</b><span>écrans conformes</span></div>
<div class="card warn"><b>${totals.aRelire}</b><span>écrans à relire</span></div>
<div class="card err"><b>${totals.aCorriger}</b><span>écrans à corriger</span></div>
<div class="card err"><b>${totals.errors}</b><span>erreurs</span></div>
<div class="card warn"><b>${totals.warnings}</b><span>points à relire</span></div>
<div class="card"><b>${palette.failing.length}</b><span>paires de la palette en échec</span></div>
</div>
</header>
<main>
<h2>Les règles contrôlées</h2>
<p>Elles viennent des règles du projet : base Carbon pour les espacements et les cibles, rayons propres à Checkpoint, tout lié à des variables, contraste AA.</p>
<table><thead><tr><th>Règle</th><th>Niveau</th><th>Pourquoi</th><th>Résultat</th></tr></thead><tbody>${rules}</tbody></table>
<h2>Écran par écran</h2>
<p>Ouvre un écran pour voir les éléments concernés. Chaque nom est un lien vers le nœud dans Figma. Le statut est toujours écrit, jamais porté par la couleur seule.</p>
${pageBlocks}
<h2>La palette, dans les deux modes</h2>
<p>Chaque couleur de texte est testée sur les fonds où elle sert, en mode Clair et en mode Contraste élevé. Les bordures et le focus demandent 3:1.</p>
${paletteTable(palette)}
</main>
<footer>
<p>Limites : le contrôle porte sur les écrans numérotés des pages 01 à 06. L'intérieur des composants est audité à part, sur leur planche. Les jaquettes de jeux gardent des couleurs libres, c'est voulu. Les sigles courts en capitales (PS5, PC) ne sont pas signalés.</p>
</footer>
</body>
</html>`;
}
