// Feuille de style commune aux pages du rapport : les couleurs viennent des variables Figma.
export const BASE_CSS = `
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
`;

export const NAV_CSS = `
.topnav{display:flex;gap:8px;margin:0 0 28px;flex-wrap:wrap}
.topnav a{display:inline-flex;align-items:center;min-height:48px;padding:0 20px;border:1px solid var(--ligne);border-radius:8px;background:var(--surface);text-decoration:none;color:var(--encre)}
.topnav a[aria-current='page']{background:var(--primaire);border-color:var(--primaire);color:#fff}
`;
