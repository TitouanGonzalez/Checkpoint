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

export function renderReport(report) {
  const { meta, totals, perRule, pages, palette } = report;
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
:root{--bg:#121212;--surface:#1a1c18;--raised:#22251f;--line:#3a4233;--text:#f3e9d2;--dim:#b9b3a2;--brand:#8bc46a;--err:#ff9a8a;--warn:#ffd27a;--mono:'Cascadia Mono',Consolas,'Courier New',monospace}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 var(--mono)}
a{color:var(--brand)}
a:focus-visible,summary:focus-visible{outline:3px solid var(--text);outline-offset:3px}
header,main,footer{max-width:1100px;margin:0 auto;padding:0 20px}
header{padding-top:36px}
.eyebrow{color:var(--brand);letter-spacing:.18em;font-size:12px;margin:0 0 8px}
h1{font-size:clamp(28px,5vw,44px);margin:0 0 8px;letter-spacing:-.02em}
h2{font-size:22px;margin:40px 0 8px}
p{color:var(--dim);margin:0 0 12px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:24px 0}
.card{background:var(--surface);border:1px solid var(--line);padding:14px}
.card b{display:block;font-size:30px;color:var(--text)}
.card span{color:var(--dim);font-size:13px}
.card.err b{color:var(--err)}.card.warn b{color:var(--warn)}.card.ok b{color:var(--brand)}
table{width:100%;border-collapse:collapse;font-size:13px;background:var(--surface);border:1px solid var(--line)}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--brand)}
tr.ko td{color:var(--err)}
.sw{display:inline-block;width:12px;height:12px;border:1px solid var(--dim);margin-right:6px;vertical-align:-1px}
.screen{background:var(--surface);border:1px solid var(--line);margin:8px 0}
.screen summary{display:grid;grid-template-columns:28px 1fr auto auto auto;gap:12px;align-items:center;padding:10px 12px;cursor:pointer;list-style:none}
.screen summary::-webkit-details-marker{display:none}
.badge{display:grid;place-items:center;width:24px;height:24px;border:2px solid var(--brand);color:var(--brand);font-weight:700}
.screen.a-corriger .badge{border-color:var(--err);color:var(--err)}
.screen.a-relire .badge{border-color:var(--warn);color:var(--warn)}
.s-meta,.s-count{color:var(--dim);font-size:12px}
.s-status{font-weight:700}
.issue{border-top:1px solid var(--line);padding:12px 14px 4px 14px;margin:0}
.issue-head{color:var(--text);margin-bottom:4px}
.sev{display:inline-grid;place-items:center;width:20px;height:20px;border:2px solid currentColor;margin-right:8px;font-size:12px}
.issue.error .sev,.issue.error .sev-text{color:var(--err)}
.issue.warning .sev,.issue.warning .sev-text{color:var(--warn)}
.issue.info .sev,.issue.info .sev-text{color:var(--dim)}
.count{background:var(--raised);padding:0 8px;margin:0 6px}
.why,.how{font-size:13px;margin-bottom:6px}
.samples{margin:0 0 8px;padding-left:18px;font-size:13px}
.samples span{color:var(--dim);margin-left:6px}
.clean{padding:12px 14px;margin:0}
.page-sum{margin-bottom:12px}
footer{padding:40px 20px 60px;color:var(--dim);font-size:13px}
@media (max-width:760px){.screen summary{grid-template-columns:28px 1fr}.s-meta,.s-status,.s-count{grid-column:2}}
</style>
</head>
<body>
<header>
<p class="eyebrow">AUDIT DU FICHIER FIGMA</p>
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
