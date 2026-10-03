// Test de MUTATION du socle dégressif de `checkTrameSymptoms` : la porte doit
// ÉCHOUER dès qu'un doublon apparaît que le socle ne connaît pas, et rester
// verte sinon. Sans ce test, un socle régénéré à l'aveugle laisserait passer
// toute régression. Chaque mutation est annulée en `finally`.
// Usage : node --test scripts/checkTrameSymptoms.test.mjs   (≈ 1 min)
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox } from './mutationSandbox.mjs';

// Toutes les mutations s'appliquent à une COPIE de travail (M2) : un SIGKILL
// ne laisse jamais `seedCases.ts` ou `symptoms.ts` mutés dans le dépôt.
const sb = sandbox();
after(() => sb.dispose());
const gate = () => sb.run('checkTrameSymptoms.mjs');
const symptoms = 'src/data/guides/symptoms.ts';
const baseline = 'scripts/fixtures/trame-symptoms-baseline.json';

test('socle intact → porte verte', { timeout: 300_000 }, () => {
  assert.equal(gate().status, 0);
});

test('nouveau doublon de concept → porte rouge', { timeout: 300_000 }, () => {
  // `fach-rheuma-systemisch` est une énumération de dépistage : la déclarer
  // comme CHERCHANT la fièvre crée un doublon avec la Vegetative Anamnese.
  const r = sb.mutate(symptoms,
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
const cases = 'src/data/seedCases.ts';

test('socle vide → une annotation `relu` annulée rouvre la porte', { timeout: 300_000 }, () => {
  const b = JSON.parse(sb.read(baseline));
  assert.equal(b.findings.length, 0, 'le socle doit être vide après la série 3');
  const r = sb.mutate(cases,
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell', relu: true },",
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell' },",
    gate);
  assert.equal(r.status, 1, 'une relecture annulée doit rouvrir la porte');
  assert.match(r.stdout, /case-lyme/);
});

// Revue série 3, M4 : `relu: true` éteint `checkTrameSymptoms` pour une
// question. Une annotation ajoutée sans relecture ne doit pas passer en
// silence : leur nombre est un compteur du socle, qui ne remonte jamais.
test('M4 — une annotation `relu` de plus fait échouer la porte', { timeout: 300_000 }, () => {
  const r = sb.mutate(cases,
    "{ frage: 'Gehen bei Ihnen dabei Blutklumpen ab — wie groß sind die etwa?', kapitel: 'aktuell' },",
    "{ frage: 'Gehen bei Ihnen dabei Blutklumpen ab — wie groß sind die etwa?', kapitel: 'aktuell', relu: true },",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /relu/);
});

test('M4 — `--bless` refuse de graver une annotation `relu` de plus', { timeout: 300_000 }, () => {
  const before = sb.read(baseline);
  sb.mutate(baseline, '"count"', '"count"', () => {
    const r = sb.mutate(cases,
      "{ frage: 'Gehen bei Ihnen dabei Blutklumpen ab — wie groß sind die etwa?', kapitel: 'aktuell' },",
      "{ frage: 'Gehen bei Ihnen dabei Blutklumpen ab — wie groß sind die etwa?', kapitel: 'aktuell', relu: true },",
      () => sb.run('checkTrameSymptoms.mjs', '--bless'));
    assert.equal(r.status, 1);
    assert.equal(sb.read(baseline), before);
  });
});

// Re-revue I-3 : `sucht: []` est vrai en JS, n'efface rien et n'est compté
// nulle part — il ne doit pas exempter une question de la relecture.
test('I-3 — `sucht: []` n\'éteint pas la porte', { timeout: 300_000 }, () => {
  const r = sb.mutate(cases,
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell', relu: true },",
    "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell', sucht: [] },",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /case-lyme/);
});

// Revue finale I-7 : un `sucht` NON VIDE n'exempte que les symptômes qu'il
// déclare. Ni un concept inconnu (7a) ni un concept que le texte ne cite pas
// (7b) ne doivent faire taire la relecture de ce que la question cite.
const ZIEL = "{ frage: 'Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?', kapitel: 'aktuell', relu: true },";
for (const [name, sucht] of [['7a concept inconnu', "['zzz']"], ['7b concept non cité', "['durst']"]]) {
  test(`I-7 ${name} — \`sucht\` ne fait pas taire ce qu'il ne déclare pas`, { timeout: 300_000 }, () => {
    const r = sb.mutate(cases, ZIEL, ZIEL.replace('relu: true', `sucht: ${sucht}`), gate);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /case-lyme/);
  });
}
