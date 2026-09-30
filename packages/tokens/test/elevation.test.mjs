import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ════════════════════════════════════════════════════════════════════════════
// GATE G2-a — L'OMBRE PORTÉE EST INTERDITE DANS L'APP.
//
// Décision de direction du 30 sept. 2026 : l'app adopte la discipline déjà
// verrouillée côté site (apps/site/test/glass.test.mjs) — la profondeur vient
// du BORD SUPÉRIEUR PLUS CLAIR, parce que la lumière vient d'en haut. Jamais
// d'une ombre portée. Aucune exception : ni au repos, ni au survol, ni sur un
// élément actionnable.
//
// Ce fichier est l'exécution mécanique de cette décision. Un commentaire de
// charte se contourne par distraction ; un code de sortie non. Il couvre les
// deux seuls endroits où l'app peut redéclarer de la profondeur elle-même :
//   1. la pile `elevation` de tokens.json (que tailwind.config.js expose en
//      `shadow-e0…e3`) — la PALETTE ;
//   2. les box-shadow littéraux de app/src/styles/index.css — les MATÉRIAUX.
//
// Hors périmètre de ce test, et c'est assumé : les ~50 usages de `shadow-sm`,
// `shadow-md`, `shadow-lg`… restants dans app/src/**/*.tsx. Ce sont les ombres
// par défaut de Tailwind, posées composant par composant ; elles appartiennent
// aux périmètres des autres chantiers et sont listées dans
// app/docs/reports/lead-s3-primitives.md. Un test vert ici ne dit donc PAS
// « l'app n'a plus une seule ombre », il dit « la charte n'en produit plus ».
// ════════════════════════════════════════════════════════════════════════════

const pkg = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(pkg, 'tokens.json'), 'utf8'));
const cssPath = resolve(process.env.DOCTOPUS_APP_DIR ?? join(pkg, '..', '..', 'app'), 'src/styles/index.css');
const css = readFileSync(cssPath, 'utf8');
/** CSS sans commentaires : une ombre citée dans une note de charte n'est pas une ombre. */
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Découpe une valeur de box-shadow en couches, en ignorant les virgules
 * internes aux fonctions (`rgb(255 255 255 / 0.5)` n'a pas de virgule, mais
 * `rgba(0,0,0,.2)` en a trois : on ne peut pas se contenter de split(',')). */
function layers(value) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

/** Une couche est licite si elle est `none` ou commence par `inset`. */
const isInner = (layer) => layer.toLowerCase() === 'none' || /^inset\b/i.test(layer);

/** Entrées à plat de la pile elevation : [nom lisible, valeur]. */
function elevationEntries() {
  return Object.entries(tokens.elevation)
    .flatMap(([k, v]) =>
      k.startsWith('$') ? []
        : k === 'dark' ? Object.entries(v).map(([d, dv]) => [`elevation.dark.${d}`, dv])
          : [[`elevation.${k}`, v]]);
}

test('la pile elevation ne contient aucune ombre portée (inset ou none, jamais autre chose)', () => {
  const entries = elevationEntries();
  assert.ok(entries.length >= 8, `pile elevation trop courte : ${entries.length} crans`);
  for (const [name, value] of entries) {
    for (const layer of layers(value)) {
      assert.ok(
        isInner(layer),
        `${name} : ombre portée interdite (gate G2-a) — couche « ${layer} » dans « ${value} ». `
        + 'La profondeur se dit par le bord supérieur plus clair, pas par une ombre.',
      );
    }
  }
});

test('les quatre crans existent en clair et en sombre, et le cran de survol est le filet le plus clair', () => {
  const alpha = (v) => Number(v.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? 0);
  for (const scope of [tokens.elevation, tokens.elevation.dark]) {
    for (const k of ['0', '1', '2', '3']) assert.ok(scope[k], `cran ${k} manquant`);
    assert.equal(scope['0'], 'none', 'le cran 0 doit être « none » : au repos dans le flux, rien.');
    // Cran 2 = survol. C'est le seul moment où la surface change d'état, donc
    // le seul endroit où le filet doit être franchement plus présent qu'au repos.
    assert.ok(alpha(scope['2']) > alpha(scope['1']),
      `le filet de survol (${scope['2']}) doit être plus clair que celui du repos (${scope['1']})`);
    assert.ok(alpha(scope['3']) > alpha(scope['1']),
      `le filet de la chrome flottante (${scope['3']}) doit être plus clair que celui d'une carte (${scope['1']})`);
  }
});

test('index.css ne déclare plus un seul box-shadow externe (charte entière, pas seulement le verre)', () => {
  const offenders = [];
  const re = /box-shadow\s*:\s*([^;{}]+);/g;
  let m;
  while ((m = re.exec(cssCode))) {
    for (const layer of layers(m[1])) {
      if (!isInner(layer)) {
        const line = cssCode.slice(0, m.index).split('\n').length;
        offenders.push(`index.css (≈ligne ${line} du code hors commentaires) : « ${layer} »`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `gate G2-a : ombre(s) portée(s) réintroduite(s) dans la charte —\n  ${offenders.join('\n  ')}`);
});

test('les matériaux en verre portent un filet supérieur plus clair que leur bord (la lumière vient d’en haut)', () => {
  // Même contrat que apps/site/test/glass.test.mjs : c'est ce filet qui remplace
  // l'ombre portée. S'il disparaît, la suppression de l'ombre devient une perte
  // de profondeur sèche, et non un changement de discipline.
  const alpha = (v) => Number(v.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? NaN);
  /** Dernière valeur d'une propriété parmi les blocs CLAIRS du sélecteur (cascade en
   * ordre de fichier). Les variantes sombres sont écartées : elles portent la même
   * classe mais une autre échelle d'alpha, et les comparer au bord clair n'a aucun
   * sens (c'est le piège que ce helper existe pour éviter). */
  const decl = (name, prop) => {
    const re = new RegExp(`([^{}]*?\\${name}(?![\\w-])[^{]*)\\{([^}]*)\\}`, 'g');
    let value;
    let m;
    while ((m = re.exec(cssCode))) {
      if (/dark/.test(m[1])) continue;
      const v = m[2].match(new RegExp(`(?:^|[;{\\s])${prop}:\\s*([^;]+);`))?.[1]?.trim();
      if (v) value = v;
    }
    return value;
  };
  for (const selector of ['.glass', '.card', '.btn-glass']) {
    const base = decl(selector, 'border');
    const top = decl(selector, 'border-top-color');
    assert.ok(base, `${selector} : pas de bordure de base`);
    assert.ok(top, `${selector} : pas de border-top-color — sans filet supérieur, retirer l'ombre appauvrit au lieu de discipliner`);
    assert.ok(alpha(top) > alpha(base),
      `${selector} : le filet supérieur (${top}) n'est pas plus clair que le bord (${base})`);
  }
});
