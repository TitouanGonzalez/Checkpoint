import { ratio, requiredRatio } from './contrast.mjs';

// Les règles viennent du CLAUDE.md du projet Checkpoint. "error" bloque la conformité, "warning"
// demande une relecture, "info" signale un cas à confirmer.
export const RULES = {
  couleur: {
    label: 'Couleur libre',
    severity: 'error',
    why: 'Toute couleur doit être liée à une variable, sauf celles des jaquettes de jeux.',
    how: 'Lie le remplissage ou le contour à une variable de la collection Checkpoint.',
  },
  contraste: {
    label: 'Contraste insuffisant',
    severity: 'error',
    why: 'Le texte doit atteindre 4,5:1 (3:1 pour les grands textes), niveau AA.',
    how: 'Change la couleur du texte ou du fond vers une paire de la palette qui passe.',
  },
  espacement: {
    label: 'Espacement hors échelle',
    severity: 'error',
    why: 'Les marges et écarts suivent l\'échelle Carbon : 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, 160. Seule exception : la marge de 120 des écrans ordinateur.',
    how: 'Prends la valeur de l\'échelle la plus proche et lie-la à une variable espace.',
  },
  rayon: {
    label: 'Rayon hors échelle',
    severity: 'error',
    why: 'Les rayons valent 4 (petit), 8 (moyen), 16 (grand) ou une pilule.',
    how: 'Utilise la variable rayon la plus proche.',
  },
  cible: {
    label: 'Cible trop petite',
    severity: 'error',
    why: 'Toute zone cliquable fait 48 px au minimum.',
    how: 'Agrandis le composant, ou ajoute une marge invisible autour.',
  },
  texteSansStyle: {
    label: 'Texte sans style',
    severity: 'error',
    why: 'Tout texte utilise un style de texte lié aux variables, jamais une taille libre.',
    how: 'Applique le style de texte qui correspond à son rôle.',
  },
  mode: {
    label: 'Mauvais mode de typographie',
    severity: 'error',
    why: 'Un écran mobile est en mode Mobile, une tablette en mode Tablette, un ordinateur en mode Ordinateur.',
    how: 'Règle le mode de la collection Typographie sur l\'écran.',
  },
  espacementLibre: {
    label: 'Espacement non lié',
    severity: 'warning',
    why: 'La valeur est sur l\'échelle, mais elle n\'est pas liée à une variable espace.',
    how: 'Lie la valeur à la variable espace correspondante.',
  },
  rayonLibre: {
    label: 'Rayon non lié',
    severity: 'warning',
    why: 'La valeur est correcte (ou une pilule), mais elle n\'est pas liée à une variable de rayon.',
    how: 'Lie le rayon à une variable rayon.',
  },
  capitales: {
    label: 'Texte en capitales',
    severity: 'warning',
    why: 'Pas de capitales : surtitres et en-têtes sont en casse normale.',
    how: 'Réécris le texte en casse normale.',
  },
  chevauchement: {
    label: 'Écart négatif',
    severity: 'info',
    why: 'Un écart négatif fait se chevaucher des éléments, par exemple une pile d\'avatars.',
    how: 'À confirmer : c\'est normal pour une pile d\'avatars, sinon corrige.',
  },
};

// Textes courts en capitales qui sont des sigles ou des noms de plateformes, pas des titres.
const SIGLE = /^[A-Z0-9 ,+/&.-]{1,12}$/;

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

export function analyseScreen(screen) {
  const issues = [];
  const push = (rule, count, samples) =>
    issues.push({ rule, severity: RULES[rule].severity, count, samples });

  for (const [rule, entry] of Object.entries(screen.r ?? {})) {
    if (!RULES[rule]) continue;
    if (rule === 'espacement' && entry.s.length && entry.s.every((s) => /-\d/.test(s[2]))) {
      push('chevauchement', entry.n, entry.s);
    } else if (rule === 'capitales' && entry.s.every((s) => SIGLE.test(s[2]))) {
      continue;
    } else {
      push(rule, entry.n, entry.s);
    }
  }

  if (screen.mode !== screen.expected) {
    push('mode', 1, [[screen.id, screen.name, `${screen.mode ?? 'aucun'} au lieu de ${screen.expected}`]]);
  }

  const fails = [];
  for (const [fg, bg, size, bold, count, nodeId] of screen.pairs ?? []) {
    const r = ratio(fg, bg);
    const need = requiredRatio(size, bold === 1);
    if (r < need) fails.push({ fg, bg, size, count, nodeId, ratio: r, need });
  }
  if (fails.length) {
    push(
      'contraste',
      fails.reduce((n, f) => n + f.count, 0),
      fails.slice(0, 3).map((f) => [f.nodeId, `${f.fg} sur ${f.bg}`, `${f.ratio.toFixed(2)}:1 pour ${f.need}:1 (${f.size}px)`]),
    );
  }

  issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.count - a.count);
  const sum = (sev) => issues.filter((i) => i.severity === sev).reduce((n, i) => n + i.count, 0);
  return {
    id: screen.id,
    name: screen.name,
    width: screen.w,
    height: screen.h,
    mode: screen.mode,
    nodes: screen.nodes,
    instances: screen.instances,
    textPairs: (screen.pairs ?? []).reduce((n, p) => n + p[4], 0),
    issues,
    errors: sum('error'),
    warnings: sum('warning'),
    infos: sum('info'),
    status: sum('error') === 0 ? (sum('warning') === 0 ? 'conforme' : 'a relire') : 'a corriger',
  };
}

// Paires de la palette à vérifier dans chaque mode. "text" demande 4,5:1, "ui" demande 3:1.
const TEXT_ON = {
  encre: ['fond', 'surface', 'champ', 'survol', 'primaire-doux', 'jouable-doux', 'adaptations-doux', 'bloquant-doux'],
  'encre-douce': ['fond', 'surface', 'champ', 'primaire-doux'],
  primaire: ['fond', 'surface', 'primaire-doux'],
  jouable: ['jouable-doux', 'surface'],
  adaptations: ['adaptations-doux', 'surface'],
  bloquant: ['bloquant-doux', 'surface'],
  'sur-couleur': ['primaire', 'jouable', 'adaptations', 'bloquant', 'inverse', 'primaire-survol', 'primaire-actif'],
};
const UI_ON = { 'bordure-forte': ['fond', 'surface', 'champ'], focus: ['fond', 'surface'] };

export function analysePalette(variables) {
  const byName = new Map(variables.map((v) => [v.name.replace(/^couleur\//, ''), v]));
  const modes = Object.keys(variables[0] ?? {}).filter((k) => k !== 'name');
  const rows = [];
  const add = (kind, fg, bgs, need) => {
    for (const bg of bgs) {
      for (const mode of modes) {
        const a = byName.get(fg)?.[mode];
        const b = byName.get(bg)?.[mode];
        if (!a || !b) continue;
        const r = ratio(a, b);
        rows.push({ kind, fg, bg, mode, fgHex: a, bgHex: b, ratio: r, need, pass: r >= need });
      }
    }
  };
  for (const [fg, bgs] of Object.entries(TEXT_ON)) add('texte', fg, bgs, 4.5);
  for (const [fg, bgs] of Object.entries(UI_ON)) add('composant', fg, bgs, 3);
  return { modes, rows, failing: rows.filter((r) => !r.pass) };
}

export function buildReport(pages, variables, meta = {}) {
  const outPages = pages.map((p) => {
    const screens = p.screens.map(analyseScreen);
    return {
      id: p.id,
      name: p.page ?? p.name,
      screens,
      errors: screens.reduce((n, s) => n + s.errors, 0),
      warnings: screens.reduce((n, s) => n + s.warnings, 0),
      infos: screens.reduce((n, s) => n + s.infos, 0),
    };
  });
  const all = outPages.flatMap((p) => p.screens);
  const perRule = {};
  for (const s of all)
    for (const i of s.issues) {
      const e = (perRule[i.rule] ??= { count: 0, screens: 0 });
      e.count += i.count;
      e.screens += 1;
    }
  return {
    meta,
    totals: {
      pages: outPages.length,
      screens: all.length,
      conformes: all.filter((s) => s.status === 'conforme').length,
      aRelire: all.filter((s) => s.status === 'a relire').length,
      aCorriger: all.filter((s) => s.status === 'a corriger').length,
      errors: all.reduce((n, s) => n + s.errors, 0),
      warnings: all.reduce((n, s) => n + s.warnings, 0),
      infos: all.reduce((n, s) => n + s.infos, 0),
      nodes: all.reduce((n, s) => n + s.nodes, 0),
      textPairs: all.reduce((n, s) => n + s.textPairs, 0),
    },
    perRule,
    pages: outPages,
    palette: analysePalette(variables),
  };
}
