// Calcul des contrastes selon WCAG 2.2 (niveau AA).
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`Couleur invalide : ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

// Rapport de contraste entre deux couleurs, de 1 à 21.
export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Un texte est "grand" à partir de 24 px, ou de 18,66 px en gras. Il demande alors 3:1 au lieu de 4,5:1.
export function requiredRatio(size, bold) {
  const large = size >= 24 || (bold && size >= 18.66);
  return large ? 3 : 4.5;
}
