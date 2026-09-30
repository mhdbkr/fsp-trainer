import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
// Et un troisième : 3. la PALETTE Tailwind elle-même (fix-s3 I4). Tant que
// `boxShadow` était sous `theme.extend`, `shadow-sm/md/lg/xl/2xl` restaient
// générés ; les 22 classes encore écrites dans features/ sont désormais
// inertes. Reste hors de portée de ce test : une ombre en `style` inline
// (TimeCapsule.tsx), listée dans app/docs/reports/fix-s3-primitives.md.
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

test('AUCUNE valeur de tokens.json ne porte une ombre portée, pas seulement la pile elevation', () => {
  // Pourquoi ce test existe : la première version du gate ne regardait QUE
  // `elevation`. `glass.light.shadow` et `glass.dark.shadow` ont donc survécu
  // au 30 sept. avec leur « 0 10px 34px -14px », en décrivant une ombre que la
  // règle CSS n'avait déjà plus. Un descripteur qui ment est pire qu'une ombre :
  // il la fait revenir à la prochaine recopie. La garde couvre maintenant le
  // fichier entier — toute clé, à toute profondeur, dont le NOM ou la VALEUR
  // parle d'ombre.
  const offenders = [];
  (function walk(node, path) {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'string') {
        if (!/shadow/i.test(p) && !/box-shadow/i.test(v)) continue;
        for (const layer of layers(v)) if (!isInner(layer)) offenders.push(`${p} : « ${layer} »`);
      } else if (v && typeof v === 'object') walk(v, p);
    }
  })(tokens, '');
  assert.deepEqual(offenders, [],
    `gate G2-a : ombre(s) portée(s) dans tokens.json —\n  ${offenders.join('\n  ')}\n`
    + 'La profondeur se déclare par elevation (filet interne), le flou et le bord supérieur.');
});

test('chaque matériau en verre déclare un filet supérieur plus clair que son bord (tokens)', () => {
  // Jumeau côté jetons du test CSS plus bas : ce que le CSS dessine, tokens.json
  // le décrit, et check-parity vérifie que les deux disent la même chose. Sans
  // ça, retirer l'ombre serait une perte de profondeur au lieu d'une discipline.
  const alpha = (v) => Number(v.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? NaN);
  for (const name of ['glass', 'card']) {
    for (const mode of ['light', 'dark']) {
      const { border, borderTop } = tokens[name][mode];
      assert.ok(borderTop, `${name}.${mode}.borderTop manquant — c'est lui qui a remplacé l'ombre portée`);
      assert.ok(alpha(borderTop) > alpha(border),
        `${name}.${mode} : le filet supérieur (${borderTop}) doit être plus clair que le bord (${border})`);
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

test('la palette Tailwind ne génère aucune ombre portée : boxShadow REMPLACE le thème, il ne l’étend pas', async () => {
  const appDir = resolve(process.env.DOCTOPUS_APP_DIR ?? join(pkg, '..', '..', 'app'));
  const { theme } = (await import(pathToFileURL(join(appDir, 'tailwind.config.js')).href)).default;
  assert.equal(theme.extend?.boxShadow, undefined,
    'boxShadow sous theme.extend : Tailwind garde alors shadow-sm/md/lg/xl/2xl (gate G2-a)');
  const offenders = Object.entries(theme.boxShadow ?? {})
    .filter(([, v]) => !/^var\(--e\d\)$/.test(v) && !layers(v).every(isInner))
    .map(([k, v]) => `shadow-${k} : « ${v} »`);
  assert.deepEqual(offenders, [], `gate G2-a : la palette génère des ombres portées —\n  ${offenders.join('\n  ')}`);
});
