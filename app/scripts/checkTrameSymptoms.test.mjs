// Test de MUTATION du socle dégressif de `checkTrameSymptoms` : la porte doit
// ÉCHOUER dès qu'un doublon apparaît que le socle ne connaît pas, et rester
// verte sinon. Sans ce test, un socle régénéré à l'aveugle laisserait passer
// toute régression. Chaque mutation est annulée en `finally`.
// Usage : node --test scripts/checkTrameSymptoms.test.mjs   (≈ 1 min)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gate = () => spawnSync(process.execPath, [join(here, 'checkTrameSymptoms.mjs')], { encoding: 'utf8' });
const withMutation = (file, from, to, fn) => {
  const before = readFileSync(file, 'utf8');
  assert.ok(before.includes(from), `ancre introuvable dans ${file} : ${from}`);
  try { writeFileSync(file, before.replace(from, to)); return fn(); } finally { writeFileSync(file, before); }
};

const symptoms = join(here, '../src/data/guides/symptoms.ts');
const baseline = join(here, 'fixtures/trame-symptoms-baseline.json');

test('socle intact → porte verte', { timeout: 300_000 }, () => {
  assert.equal(gate().status, 0);
});

test('nouveau doublon de concept → porte rouge', { timeout: 300_000 }, () => {
  // `fach-rheuma-systemisch` est une énumération de dépistage : la déclarer
  // comme CHERCHANT la fièvre crée un doublon avec la Vegetative Anamnese.
  const r = withMutation(symptoms,
    "'fach-rheuma-haut': ['ausschlag'],",
    "'fach-rheuma-haut': ['ausschlag'], 'fach-rheuma-systemisch': ['fieber'],",
    gate);
  assert.equal(r.status, 1, 'la porte aurait dû échouer');
  assert.match(r.stdout, /NOUVEAU\(X\) doublon/);
  assert.match(r.stdout, /case-polymyalgia/);
});

// Le socle est VIDE depuis l'arbitrage des 85 constats (série 3) : il n'y a
// plus de constat à amputer. La propriété qui compte a changé de nature — ce
// n'est plus « le socle ne remonte jamais », c'est « le socle ne masque plus
// rien ». On le prouve en annulant une seule annotation de relecture : le
// constat qu'elle éteignait doit rouvrir la porte, sans exception de socle.
const cases = join(here, '../src/data/seedCases.ts');

test('socle vide → une annotation `relu` annulée rouvre la porte', { timeout: 300_000 }, () => {
  const b = JSON.parse(readFileSync(baseline, 'utf8'));
  assert.equal(b.findings.length, 0, 'le socle doit être vide après la série 3');
  const r = withMutation(cases,
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell', relu: true },",
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell' },",
    gate);
  assert.equal(r.status, 1, 'une relecture annulée doit rouvrir la porte');
  assert.match(r.stdout, /case-lyme/);
});
