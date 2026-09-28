import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Le registre profond (PHILOSOPHIE.md §04) empile des surfaces d'une seule teinte pétrole,
// luminosité décroissante, sans ombre portée : la profondeur se lit au contraste, pas à
// l'ombre. Ce test verrouille la condition qui rend cette pile lisible — le texte papier
// tient AA (4,5:1) sur CHAQUE palier, et le signal corail reste lisible sur le fond de
// section. Si une assertion casse, c'est le jeton qu'il faut éclaircir, jamais le seuil :
// baisser le seuil rendrait la charte conforme à elle-même en la vidant.
const tokens = JSON.parse(readFileSync(new URL('../../../packages/tokens/tokens.json', import.meta.url), 'utf8'));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('le texte du registre profond tient AA sur chaque palier', () => {
  const paper = tokens.color.paper.DEFAULT;
  for (const step of ['0', '1', '2', '3', '4']) {
    const r = ratio(paper, tokens.color.depth[step]);
    assert.ok(r >= 4.5, `paper sur depth.${step} : ${r.toFixed(2)}:1 < 4,5:1`);
  }
});

test('le signal corail reste lisible sur le fond de section profond', () => {
  const r = ratio(tokens.color.signal['300'], tokens.color.depth['2']);
  assert.ok(r >= 4.5, `signal.300 sur depth.2 : ${r.toFixed(2)}:1 < 4,5:1`);
});
