// A coller dans use_figma (lecture seule). Change PAGES pour choisir les pages à parcourir.
// Pour chaque écran numéroté, renvoie les constats bruts : couleurs libres, espacements, rayons,
// cibles, textes sans style, capitales, mode de typographie, et les paires de couleurs texte et
// fond. Le contraste et le classement des constats sont faits côté Node (src/audit.mjs).
// Enregistre le résultat dans data/screens-XX-YY.json.
const PAGES = ['7:437', '7:438', '7:439'];
const SCALE = [0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160];
const RADII = [0, 4, 8, 16];
const CAP = 3;
const INTERACTIVE =
  /^(Bouton|Champ|Liste déroulante|Case à cocher|Interrupteur|Puce|Choix segmenté|Onglet|Option|Zone de texte)/i;
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const typo = cols.find((c) => c.name === 'Typographie');
const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const solid = (paints) =>
  Array.isArray(paints) ? paints.filter((p) => p.type === 'SOLID' && p.visible !== false) : [];
const result = [];
for (const PAGE_ID of PAGES) {
  const page = await figma.getNodeByIdAsync(PAGE_ID);
  await figma.setCurrentPageAsync(page);
  const screens = page.children.filter((n) => n.type === 'FRAME' && /^\d+\.\d+/.test(n.name));
  const out = [];
  for (const screen of screens) {
    const r = {};
    const add = (rule, node, detail) => {
      const e = (r[rule] ??= { n: 0, s: [] });
      e.n++;
      if (e.s.length < CAP) e.s.push([node.id, node.name.slice(0, 40), detail]);
    };
    const pairs = new Map();
    let nodes = 0;
    let instances = 0;
    const bgOf = (node) => {
      for (let p = node.parent; p && p.type !== 'PAGE'; p = p.parent) {
        const f = solid(p.fills)[0];
        if (f) return hex(f.color);
      }
      return null;
    };
    const walk = async (node) => {
      if (node.visible === false) return;
      nodes++;
      if (node.type === 'INSTANCE') {
        instances++;
        const mc = await node.getMainComponentAsync();
        const name = mc?.parent?.type === 'COMPONENT_SET' ? mc.parent.name : mc?.name ?? '';
        if (INTERACTIVE.test(name)) {
          const small = node.height < 47.5 || (/icône/i.test(name) && node.width < 47.5);
          if (small) add('cible', node, `${name} ${Math.round(node.width)}x${Math.round(node.height)}`);
        }
        return; // l'intérieur d'une instance appartient au composant
      }
      for (const key of ['fills', 'strokes']) {
        if (node.type === 'TEXT' && key === 'strokes') continue;
        for (const p of solid(node[key])) {
          if (!p.boundVariables?.color) add('couleur', node, `${key} ${hex(p.color)}`);
        }
      }
      if (node.layoutMode && node.layoutMode !== 'NONE') {
        const props = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];
        if (node.primaryAxisAlignItems !== 'SPACE_BETWEEN') props.push('itemSpacing');
        for (const k of props) {
          const v = node[k];
          if (typeof v !== 'number' || v === 0) continue;
          const wide = screen.width >= 1200 && v === 120 && k.startsWith('padding');
          if (!SCALE.includes(v) && !wide) add('espacement', node, `${k} ${v}`);
          else if (!node.boundVariables?.[k] && !wide) add('espacementLibre', node, `${k} ${v}`);
        }
      }
      if (typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
        const v = node.cornerRadius;
        const pill = v >= Math.min(node.width, node.height) / 2 - 0.5;
        const bound = ['topLeftRadius', 'cornerRadius'].some((k) => node.boundVariables?.[k]);
        if (!RADII.includes(v) && !pill) add('rayon', node, `rayon ${v}`);
        else if (!bound) add('rayonLibre', node, `rayon ${v}`);
      }
      if (node.type === 'TEXT') {
        const segs = node.getStyledTextSegments(['textStyleId', 'fontSize', 'fontWeight']);
        if (segs.some((s) => !s.textStyleId))
          add('texteSansStyle', node, `${segs[0].fontSize}px ${node.characters.slice(0, 24)}`);
        const t = node.characters;
        if (t.length >= 4 && t === t.toUpperCase() && t !== t.toLowerCase())
          add('capitales', node, t.slice(0, 30));
        const fg = solid(node.fills)[0];
        const bg = bgOf(node);
        if (fg && bg) {
          const k = `${hex(fg.color)}|${bg}|${segs[0].fontSize}|${segs[0].fontWeight >= 600 ? 1 : 0}`;
          const e = pairs.get(k);
          if (e) e[4]++;
          else pairs.set(k, [hex(fg.color), bg, segs[0].fontSize, segs[0].fontWeight >= 600 ? 1 : 0, 1, node.id]);
        }
      }
      if ('children' in node) for (const c of node.children) await walk(c);
    };
    await walk(screen);
    const modeId = typo ? screen.resolvedVariableModes?.[typo.id] : null;
    const mode = typo?.modes.find((m) => m.modeId === modeId)?.name ?? null;
    const expected = screen.width >= 1300 ? 'Ordinateur' : screen.width >= 1000 ? 'Tablette' : 'Mobile';
    out.push({ id: screen.id, name: screen.name, w: Math.round(screen.width), h: Math.round(screen.height), mode, expected, nodes, instances, r, pairs: [...pairs.values()].slice(0, 40) });
  }
  result.push({ page: page.name, id: PAGE_ID, screens: out });
}
return result;
