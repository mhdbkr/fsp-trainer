import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkEntry, termForms } from './checkTermRegister.mjs';

const ok = { t: 'Aszites', r: { pa: 'Mein Bauch ist voller Wasser.', vo: 'Sonographisch zeigte sich ein Aszites.', an: 'Haben Sie bemerkt, dass Ihr Bauch dicker geworden ist?' } };
test('entrée valide', () => assert.deepEqual(checkEntry(ok), []));
test('pa = terme → erreur', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'aszites' } }).some((e) => e.includes('pa'))));
test('pa n\'est pas une phrase → erreur (fragment)', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'Wasser im Bauch' } }).some((e) => e.includes('phrase')));
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'wasser im bauch.' } }).some((e) => e.includes('phrase')));
  assert.deepEqual(checkEntry({ ...ok, r: { ...ok.r, pa: 'Ist das schlimm?' } }), []);
});
test('vo sans le terme → erreur ; forme fléchie acceptée', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, vo: 'Sonographisch unauffällig.' } }).some((e) => e.includes('vo')));
  assert.deepEqual(checkEntry({ t: 'Ödem', r: { pa: 'Meine Beine sind geschwollen.', vo: 'Es bestehen beidseitige Ödeme.', an: 'Sind Ihre Beine geschwollen?' } }), []);
});
test('an contient le terme ou ne finit pas par ? → erreur', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Haben Sie Aszites?' } }).some((e) => e.includes('an')));
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Ihr Bauch ist dick.' } }).some((e) => e.includes('an')));
});
test('longueurs bornées', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'x'.repeat(61) } }).some((e) => e.includes('pa'))));
test('termForms : mot entier seulement', () => {
  assert.ok(termForms('Sonde').test('eine Sonde legen')); assert.ok(termForms('Sonde').test('zwei Sonden'));
  assert.ok(!termForms('Sonde').test('Sondenernährung'));
});

// Régression : le garde d'entrée du script comparait `import.meta.url` (encodé,
// espace → %20) à `file://${process.argv[1]}` (brut) — toujours faux dès que le
// chemin contient un espace, donc `main()` ne tournait jamais (exit 0 silencieux).
// Reproduit ici dans un répertoire temporaire dont le nom contient un espace,
// indépendamment du chemin réel du dépôt.
test('main() tourne quand le chemin du script contient un espace', () => {
  // realpath : sur macOS, os.tmpdir() vit sous /var, symlink vers /private/var ;
  // sans résolution, process.argv[1] (brut) et import.meta.url (résolu par Node)
  // pointeraient vers deux chemins différents — un faux négatif sans rapport
  // avec l'espace qu'on veut tester.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'fsp check reg ')));
  try {
    const scriptsDir = join(root, 'app', 'scripts');
    const dataDir = join(root, 'app', 'src', 'data');
    mkdirSync(scriptsDir, { recursive: true });
    mkdirSync(dataDir, { recursive: true });
    copyFileSync(fileURLToPath(import.meta.resolve('./checkTermRegister.mjs')), join(scriptsDir, 'checkTermRegister.mjs'));
    copyFileSync(fileURLToPath(import.meta.resolve('./labelVariants.mjs')), join(scriptsDir, 'labelVariants.mjs'));
    copyFileSync(fileURLToPath(import.meta.resolve('../src/data/labelVariantExclusions.json')), join(dataDir, 'labelVariantExclusions.json'));
    writeFileSync(join(dataDir, 'fachbegriffe.json'), JSON.stringify([{ id: 'fb-x', t: 'Beispiel' }]));
    writeFileSync(join(dataDir, 'caseTermLinks.json'), JSON.stringify({}));
    const out = execFileSync('node', [join(scriptsDir, 'checkTermRegister.mjs')], { encoding: 'utf8' });
    assert.match(out, /registre :/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('libellé composé : la vo peut contenir une de ses variantes', () => {
  const r = { pa: 'Mein Blutdruck ist immer zu hoch.', vo: 'Es bestand eine arterielle Hypertonie.', an: 'Wurde bei Ihnen ein hoher Blutdruck gemessen?' };
  assert.deepEqual(checkEntry({ t: 'Hypertonie/Hypertonus', r }), []);
  assert.ok(checkEntry({ t: 'Hypertonie/Hypertonus', r: { ...r, vo: 'Es bestand ein erhöhter Blutdruck.' } }).includes('vo ne contient pas le terme'));
});
