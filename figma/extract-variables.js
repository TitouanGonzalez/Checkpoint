// A coller dans use_figma. Lecture seule. Exporte les variables de couleur de la collection
// Checkpoint, avec leur valeur dans chaque mode, pour data/variables.json.
const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
const cols = await figma.variables.getLocalVariableCollectionsAsync();
const col = cols.find((c) => c.name === 'Checkpoint');
const out = [];
for (const id of col.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id);
  if (v.resolvedType !== 'COLOR') continue;
  const modes = {};
  for (const m of col.modes) {
    let val = v.valuesByMode[m.modeId];
    let guard = 0;
    while (val && val.type === 'VARIABLE_ALIAS' && guard++ < 5) {
      const a = await figma.variables.getVariableByIdAsync(val.id);
      val = a.valuesByMode[m.modeId] ?? Object.values(a.valuesByMode)[0];
    }
    modes[m.name] = hex(val);
  }
  out.push({ name: v.name, ...modes });
}
return out;
