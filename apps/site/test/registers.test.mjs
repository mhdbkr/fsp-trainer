import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

/** Extrait les déclarations `prop: value` d'un bloc de règle CSS `{ ... }`.
 * Retire d'abord les commentaires /* ... *\/, sans quoi un commentaire
 * contenant ": " (courant en français) se ferait passer pour une déclaration
 * et avalerait la vraie déclaration suivante jusqu'au prochain `;`. */
function parseDeclarations(block) {
  const withoutComments = block.replace(/\/\*[\s\S]*?\*\//g, '');
  const decls = [];
  const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+);?/g;
  let m;
  while ((m = re.exec(withoutComments))) decls.push([m[1].trim(), m[2].trim()]);
  return decls;
}

/**
 * Toute déclaration qui produit une ombre portée, sur la famille entière des
 * propriétés concernées (box-shadow, text-shadow, leurs variantes préfixées,
 * et filter/backdrop-filter dès qu'ils portent un drop-shadow) — pas une
 * liste de noms qu'on contournera au mot suivant.
 */
function findShadowDeclarations(block) {
  return parseDeclarations(block).filter(([prop, value]) => {
    const isShadowProp = /shadow/i.test(prop) && value.toLowerCase() !== 'none';
    const hasDropShadowValue = /drop-shadow\s*\(/i.test(value);
    return isShadowProp || hasDropShadowValue;
  });
}

test('les deux registres existent', () => {
  assert.match(css, /\.register-deep\s*\{/, '.register-deep absent');
  assert.match(css, /\.register-work\s*\{/, '.register-work absent');
});

test('la profondeur ne se fait jamais par ombre portée, sous aucune forme', () => {
  const surfaces = css.match(/\.surface[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(surfaces.length > 0, 'aucune classe .surface');
  for (const block of surfaces) {
    const offending = findShadowDeclarations(block);
    assert.deepEqual(
      offending,
      [],
      `ombre portée interdite dans une surface — déclaration fautive : ` +
        `${offending.map(([p, v]) => `"${p}: ${v}"`).join(', ')}\n${block}`,
    );
  }
});

test('la lumière vient du haut : le bord supérieur porte lift, les autres portent veil', () => {
  const block = css.match(/\.surface\s*\{[^}]*\}/)?.[0] ?? '';
  assert.ok(block, 'bloc .surface introuvable');
  const decls = parseDeclarations(block);

  const topDecls = decls.filter(([p]) => p === 'border-top' || p === 'border-top-color');
  const otherBorderDecls = decls.filter(([p]) =>
    ['border', 'border-color', 'border-right', 'border-bottom', 'border-left',
      'border-right-color', 'border-bottom-color', 'border-left-color'].includes(p),
  );

  assert.ok(topDecls.length > 0, 'aucune déclaration pour le bord supérieur (border-top / border-top-color)');
  assert.ok(otherBorderDecls.length > 0, 'aucune déclaration pour les autres bords (border / border-color)');

  for (const [prop, value] of topDecls) {
    assert.match(value, /--dt-color-depth-lift\b/,
      `le bord supérieur ("${prop}: ${value}") doit porter --dt-color-depth-lift`);
    assert.ok(!/--dt-color-depth-veil\b/.test(value),
      `le bord supérieur ("${prop}: ${value}") ne doit pas porter --dt-color-depth-veil (lumière inversée)`);
  }
  for (const [prop, value] of otherBorderDecls) {
    assert.match(value, /--dt-color-depth-veil\b/,
      `le bord "${prop}: ${value}" doit porter --dt-color-depth-veil`);
    assert.ok(!/--dt-color-depth-lift\b/.test(value),
      `le bord "${prop}: ${value}" ne doit pas porter --dt-color-depth-lift (lumière inversée)`);
  }
});

test('.surface garde un rendu lisible hors de tout registre (repli des variables)', () => {
  const block = css.match(/\.surface\s*\{[^}]*\}/)?.[0] ?? '';
  assert.ok(block, 'bloc .surface introuvable');
  const decls = parseDeclarations(block);
  const bg = decls.find(([p]) => p === 'background-color')?.[1] ?? '';
  const fg = decls.find(([p]) => p === 'color')?.[1] ?? '';
  assert.match(bg, /^var\(--surface\s*,\s*.+\)$/,
    `background-color doit fournir un repli à --surface, sinon fond transparent hors registre : "${bg}"`);
  assert.match(fg, /^var\(--on-surface\s*,\s*.+\)$/,
    `color doit fournir un repli à --on-surface, sinon texte invisible hors registre : "${fg}"`);
});

test('le registre clair a deux paliers distincts, comme le registre sombre', () => {
  const workBlock = css.match(/\.register-work\s*\{[^}]*\}/)?.[0] ?? '';
  assert.ok(workBlock, '.register-work introuvable');
  const decls = parseDeclarations(workBlock);
  const surface = decls.find(([p]) => p === '--surface')?.[1]?.toLowerCase();
  const raised = decls.find(([p]) => p === '--surface-raised')?.[1]?.toLowerCase();
  assert.ok(surface && raised, '--surface ou --surface-raised absent de .register-work');
  assert.notEqual(
    surface,
    raised,
    `--surface et --surface-raised sont identiques (${surface}) : les deux paliers sont indiscernables`,
  );
});
