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

/** Blocs `.surface { … }` au sens strict : le sélecteur, seul sur sa ligne
 * (indentation mise à part), doit être exactement `.surface`. Ancré en début
 * de ligne pour ne PAS capturer un sélecteur composé comme
 * `.register-work .surface { … }` (une redéfinition légitime par registre,
 * qui n'a pas à respecter la même règle lift/veil) ni `.surface-raised { … }`.
 * Avec `/g`, balaie TOUTES les occurrences du fichier (y compris sous un
 * `@media`), pas seulement la première trouvée textuellement — en CSS c'est
 * la dernière qui l'emporte en cascade. */
function findSurfaceBlocks() {
  return css.match(/^[ \t]*\.surface\s*\{[^}]*\}/gm) ?? [];
}

test('la lumière vient du haut : le bord supérieur porte lift, les autres portent veil', () => {
  const blocks = findSurfaceBlocks();
  assert.ok(blocks.length > 0, 'bloc .surface introuvable');

  blocks.forEach((block, index) => {
    const decls = parseDeclarations(block);

    const topDecls = decls.filter(([p]) => p === 'border-top' || p === 'border-top-color');
    const otherBorderDecls = decls.filter(([p]) =>
      ['border', 'border-color', 'border-right', 'border-bottom', 'border-left',
        'border-right-color', 'border-bottom-color', 'border-left-color'].includes(p),
    );

    assert.ok(topDecls.length > 0,
      `bloc .surface #${index} : aucune déclaration pour le bord supérieur (border-top / border-top-color)\n${block}`);
    assert.ok(otherBorderDecls.length > 0,
      `bloc .surface #${index} : aucune déclaration pour les autres bords (border / border-color)\n${block}`);

    for (const [prop, value] of topDecls) {
      assert.match(value, /--dt-color-depth-lift\b/,
        `bloc .surface #${index} : le bord supérieur ("${prop}: ${value}") doit porter --dt-color-depth-lift\n${block}`);
      assert.ok(!/--dt-color-depth-veil\b/.test(value),
        `bloc .surface #${index} : le bord supérieur ("${prop}: ${value}") ne doit pas porter --dt-color-depth-veil (lumière inversée)\n${block}`);
    }
    for (const [prop, value] of otherBorderDecls) {
      assert.match(value, /--dt-color-depth-veil\b/,
        `bloc .surface #${index} : le bord "${prop}: ${value}" doit porter --dt-color-depth-veil\n${block}`);
      assert.ok(!/--dt-color-depth-lift\b/.test(value),
        `bloc .surface #${index} : le bord "${prop}: ${value}" ne doit pas porter --dt-color-depth-lift (lumière inversée)\n${block}`);
    }
  });
});

test('.surface garde un rendu lisible hors de tout registre (repli des variables)', () => {
  const blocks = findSurfaceBlocks();
  assert.ok(blocks.length > 0, 'bloc .surface introuvable');

  blocks.forEach((block, index) => {
    const decls = parseDeclarations(block);
    const bg = decls.find(([p]) => p === 'background-color')?.[1] ?? '';
    const fg = decls.find(([p]) => p === 'color')?.[1] ?? '';
    assert.match(bg, /^var\(--surface\s*,\s*.+\)$/,
      `bloc .surface #${index} : background-color doit fournir un repli à --surface, sinon fond transparent hors registre : "${bg}"\n${block}`);
    assert.match(fg, /^var\(--on-surface\s*,\s*.+\)$/,
      `bloc .surface #${index} : color doit fournir un repli à --on-surface, sinon texte invisible hors registre : "${fg}"\n${block}`);
  });
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
