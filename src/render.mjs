import { RULES } from './audit.mjs';

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
:root{--fond:#f7f4ee;--surface:#ffffff;--encre:#14161f;--encre-douce:#4a4f5e;--ligne:#dcd7cc;--primaire:#3b33cc;--primaire-doux:#e7e5fb;--jouable:#1d6b45;--jouable-doux:#dcefe3;--adaptations:#8a4b0f;--adaptations-doux:#fbe9d2;--bloquant:#a12620;--bloquant-doux:#f8dedb;--champ:#f2eee6;--font:'Atkinson Hyperlegible Next','Atkinson Hyperlegible',system-ui,'Segoe UI',Arial,sans-serif}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--encre);font:17px/1.55 var(--font)}
a{color:var(--primaire);font-weight:600}
a:focus-visible,summary:focus-visible{outline:2px solid var(--primaire);outline-offset:4px}
header,main,footer{max-width:1120px;margin:0 auto;padding:0 24px}
header{padding-top:48px}
.eyebrow{color:var(--primaire);font-weight:700;font-size:15px;margin:0 0 8px}
h1{font-size:clamp(30px,5vw,44px);line-height:1.15;margin:0 0 12px;font-weight:800}
h2{font-size:28px;line-height:1.2;margin:48px 0 8px;font-weight:800}
p{color:var(--encre-douce);margin:0 0 16px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:32px 0}
.card{background:var(--surface);border:1px solid var(--ligne);border-radius:16px;padding:16px 20px}
.card b{display:block;font-size:40px;line-height:1.1;font-weight:800;color:var(--encre)}
.card span{color:var(--encre-douce);font-size:15px}
.card.ok{background:var(--jouable-doux)}.card.ok b{color:var(--jouable)}
.card.warn{background:var(--adaptations-doux)}.card.warn b{color:var(--adaptations)}
.card.err{background:var(--bloquant-doux)}.card.err b{color:var(--bloquant)}
table{width:100%;border-collapse:separate;border-spacing:0;font-size:15px;background:var(--surface);border:1px solid var(--ligne);border-radius:16px;overflow:hidden}
th,td{text-align:left;padding:12px 16px;border-bottom:1px solid var(--ligne);vertical-align:top}
tr:last-child td{border-bottom:0}
th{background:var(--champ);color:var(--encre);font-weight:700}
tr.ko td{color:var(--bloquant);font-weight:600}
.sw{display:inline-block;width:14px;height:14px;border:1px solid var(--encre-douce);border-radius:4px;margin-right:8px;vertical-align:-2px}
.screen{background:var(--surface);border:1px solid var(--ligne);border-radius:16px;margin:12px 0;overflow:hidden}
.screen summary{display:grid;grid-template-columns:40px 1fr auto auto auto;gap:16px;align-items:center;min-height:56px;padding:8px 16px;cursor:pointer;list-style:none}
.screen summary::-webkit-details-marker{display:none}
.screen[open] summary{border-bottom:1px solid var(--ligne)}
.badge{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:var(--jouable-doux);color:var(--jouable);font-weight:800}
.screen.a-corriger .badge{background:var(--bloquant-doux);color:var(--bloquant)}
.screen.a-relire .badge{background:var(--adaptations-doux);color:var(--adaptations)}
.s-name a{font-weight:700}
.s-meta,.s-count{color:var(--encre-douce);font-size:15px}
.s-status{font-weight:800}
.screen.conforme .s-status{color:var(--jouable)}.screen.a-relire .s-status{color:var(--adaptations)}.screen.a-corriger .s-status{color:var(--bloquant)}
.issue{border-top:1px solid var(--ligne);padding:16px 20px 8px}
.issue:first-of-type{border-top:0}
.issue-head{color:var(--encre);margin-bottom:4px}
.sev{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:999px;margin-right:8px;font-size:14px;font-weight:800}
.issue.error .sev{background:var(--bloquant-doux);color:var(--bloquant)}
.issue.warning .sev{background:var(--adaptations-doux);color:var(--adaptations)}
.issue.info .sev{background:var(--primaire-doux);color:var(--primaire)}
.sev-text{font-weight:700;margin-left:4px}
.issue.error .sev-text{color:var(--bloquant)}.issue.warning .sev-text{color:var(--adaptations)}.issue.info .sev-text{color:var(--primaire)}
.count{background:var(--champ);border-radius:999px;padding:2px 10px;margin:0 6px;font-weight:700}
.why,.how{font-size:15px;margin-bottom:8px}
.samples{margin:0 0 12px;padding-left:20px;font-size:15px}
.samples span{color:var(--encre-douce);margin-left:8px}
.clean{padding:16px 20px;margin:0}
.page-sum{margin-bottom:16px}
footer{padding:48px 24px 72px}
footer p{font-size:15px}
@media (max-width:760px){.screen summary{grid-template-columns:40px 1fr}.s-meta,.s-status,.s-count{grid-column:2}}
</style>
<style>:root{${tokenCss}}</style>
</head>
<body>
<header>
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
