import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { flatten, toCss, toTs } from '../build.mjs';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokens = JSON.parse(readFileSync(join(pkg, 'tokens.json'), 'utf8'));
const appDir = join(pkg, '..', '..', 'app');

test('aucun token vide, aucune clé de métadonnée dans le CSS', () => {
  const flat = flatten(tokens);
  assert.ok(flat.length >= 50);
  for (const [k, v] of flat) { assert.ok(v.trim(), `vide : ${k}`); assert.ok(!k.includes('$'), k); }
  const css = toCss(tokens);
  assert.match(css, /--dt-color-brand-500: #158375;/);
  assert.match(css, /--dt-color-paper: #f4f5f2;/);
  assert.match(css, /--dt-font-display: "Bricolage Grotesque Variable"/);
  assert.doesNotMatch(css, /\$src/);
});

test('l\'export TS ne porte pas les métadonnées et reste du JS valide', async () => {
  const { js, dts } = toTs(tokens);
  assert.doesNotMatch(js, /\$src/);
  assert.match(dts, /export declare const tokens/);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  assert.equal(mod.tokens.color.signal[500], '#d84a24');
});

test('check-parity sort 0 sur l\'app réelle', () => {
  const r = spawnSync(process.execPath, [join(pkg, 'scripts/check-parity.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('check-parity sort 1 quand l\'app dérive (couleur, easing, verre)', () => {
  const fake = mkdtempSync(join(tmpdir(), 'dt-parity-'));
  mkdirSync(join(fake, 'src/styles'), { recursive: true });
  cpSync(join(appDir, 'tailwind.config.js'), join(fake, 'tailwind.config.js'));
  const css = readFileSync(join(appDir, 'src/styles/index.css'), 'utf8')
    .replace('--ease-out: cubic-bezier(0.16, 1, 0.3, 1);', '--ease-out: ease;')
    // ANCRAGE : `.btn-glass` déclare le MÊME `backdrop-filter` et apparaît plus
    // haut dans le fichier ; un `.replace` sur la seule déclaration mutait donc
    // le bouton, que check-parity ne lit pas — la dérive du verre n'était jamais
    // simulée et ce garde-fou passait à vide (mesuré : 2 dérives au lieu de 3).
    // On ancre sur le bloc `.glass {` lui-même.
    .replace(/(\.glass\s*\{[\s\S]*?)backdrop-filter: blur\(20px\)/, '$1backdrop-filter: blur(12px)');
  writeFileSync(join(fake, 'src/styles/index.css'), css);
  writeFileSync(join(fake, 'tailwind.config.js'), readFileSync(join(fake, 'tailwind.config.js'), 'utf8').replace("500: '#158375'", "500: '#000000'"));
  const r = spawnSync(process.execPath, [join(pkg, 'scripts/check-parity.mjs')], { encoding: 'utf8', env: { ...process.env, DOCTOPUS_APP_DIR: fake } });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /color\.brand\.500/);
  assert.match(r.stderr, /motion\.easeOut/);
  assert.match(r.stderr, /glass\.blur\+saturate/);
  assert.match(r.stderr, /3 dérive/);
});

test('les jetons de profondeur existent et descendent en luminosité', async () => {
  const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
  const depth = tokens.color.depth;
  assert.ok(depth, 'color.depth absent');

  // Cinq paliers, du plus clair (0) au plus profond (4).
  const steps = ['0', '1', '2', '3', '4'].map((k) => depth[k]);
  for (const [i, hex] of steps.entries()) {
    assert.match(hex ?? '', /^#[0-9a-f]{6}$/, `color.depth.${i} manquant ou mal formé`);
  }

  // Luminance relative strictement décroissante : la pile descend, elle ne chatoie pas.
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const lums = steps.map(lum);
  for (let i = 1; i < lums.length; i++) {
    assert.ok(lums[i] < lums[i - 1], `depth.${i} n'est pas plus profond que depth.${i - 1}`);
  }

  // Le texte « paper » doit rester lisible sur le palier le plus clair de la pile.
  const contrast = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  assert.ok(contrast(tokens.color.paper.DEFAULT, depth['0']) >= 4.5,
    'paper sur depth.0 sous 4,5:1');
});

test('les paliers de color.depth partagent une seule teinte (jamais de dérive de couleur)', () => {
  const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
  const depth = tokens.color.depth;
  const keys = ['0', '1', '2', '3', '4'];

  // Teinte (hue HSL, en degrés) calculée à la main — paquet à zéro dépendance,
  // pas de bibliothèque de conversion de couleur.
  const hue = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return null; // gris pur : aucune teinte à comparer
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    return h < 0 ? h + 360 : h;
  };

  const hues = keys.map((k) => hue(depth[k]));
  const known = hues.filter((h) => h !== null).sort((a, b) => a - b);

  // Médiane vraie, correcte pour un nombre pair ou impair de paliers (moyenne
  // des deux valeurs centrales si pair, valeur centrale si impair) — plutôt
  // que known[floor(length/2)] qui ne donnait la vraie médiane que pour un
  // compte impair et se serait tu si la pile changeait de taille.
  const mid = Math.floor(known.length / 2);
  const median = known.length % 2 === 0 ? (known[mid - 1] + known[mid]) / 2 : known[mid];

  // Seuil : sur les 5 hex actuels, la teinte mesure entre 170,0° (depth.3, depth.4)
  // et 172,5° (depth.2) — un écart d'environ 2,5°, dû à l'arrondi du pétrole très
  // sombre sur 8 bits par canal (à cette luminosité, un seul pas de bleu ou de vert
  // sur 255 déplace la teinte de plusieurs dixièmes de degré). 6° laisse une marge
  // de ~2,4x sur cet écart réel tout en refusant une vraie dérive de teinte : une
  // autre famille de couleur (vert franc, bleu, brun) tenue à la même luminance
  // s'écarte d'au moins plusieurs dizaines de degrés, jamais de quelques degrés.
  const TOLERANCE_DEG = 6;
  for (const [i, h] of hues.entries()) {
    // Achromatique (r === g === b) n'est jamais une exception à sauter : un
    // palier gris est exactement la dérive de teinte que ce test doit attraper.
    assert.ok(h !== null,
      `color.depth.${keys[i]} est achromatique (saturation nulle, teinte indéfinie) : un palier gris est une dérive, pas une exception`);
    const delta = Math.abs(h - median);
    assert.ok(delta <= TOLERANCE_DEG,
      `color.depth.${keys[i]} dérive en teinte : ${h.toFixed(1)}° (médiane des 5 paliers : ${median.toFixed(1)}°, écart ${delta.toFixed(1)}° > tolérance ${TOLERANCE_DEG}°)`);
  }
});

test('veil et lift sont des filets de lumière translucides, jamais une ombre — lift au moins aussi marqué que veil', () => {
  const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
  const depth = tokens.color.depth;
  const shape = /^rgb\(\s*\d+\s+\d+\s+\d+\s*\/\s*([\d.]+)\s*\)$/;

  const veilMatch = shape.exec(depth.veil);
  const liftMatch = shape.exec(depth.lift);
  assert.ok(veilMatch, `color.depth.veil n'est pas un voile rgb(r g b / a) : ${depth.veil}`);
  assert.ok(liftMatch, `color.depth.lift n'est pas un voile rgb(r g b / a) : ${depth.lift}`);
  assert.doesNotMatch(depth.veil, /shadow|inset|px/, 'veil ressemble à une ombre portée, pas à un voile de lumière');
  assert.doesNotMatch(depth.lift, /shadow|inset|px/, 'lift ressemble à une ombre portée, pas à un voile de lumière');

  const veilAlpha = parseFloat(veilMatch[1]);
  const liftAlpha = parseFloat(liftMatch[1]);
  assert.ok(veilAlpha > 0 && veilAlpha < 1, `alpha de veil hors plage (0,1) : ${veilAlpha}`);
  assert.ok(liftAlpha > 0 && liftAlpha < 1, `alpha de lift hors plage (0,1) : ${liftAlpha}`);

  // La lumière vient d'en haut (PHILOSOPHIE.md §04) : le filet supérieur (lift)
  // doit être au moins aussi marqué que le voile général (veil).
  assert.ok(liftAlpha >= veilAlpha,
    `lift (${liftAlpha}) devrait être >= veil (${veilAlpha}) : la lumière vient d'en haut`);
});
