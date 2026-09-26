import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from '../scripts/check-voice.mjs';

test('attrape le vouvoiement', () => {
  const v = findViolations('a.html', '<p>Sie können hier üben.</p>');
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'vouvoiement');
});

test('attrape le verbe scolaire', () => {
  const v = findViolations('a.html', '<h1>Medizinisches Deutsch lernen</h1>');
  assert.deepEqual(v.map((x) => x.rule), ['scolaire']);
});

test('attrape la métaphore explicitée', () => {
  const v = findViolations('a.html', '<p>Wie ein Oktopus im Ozean.</p>');
  assert.ok(v.some((x) => x.rule === 'metaphore_explicitee'));
});

test('attrape le point d\'exclamation', () => {
  const v = findViolations('a.html', '<p>Jetzt starten!</p>');
  assert.deepEqual(v.map((x) => x.rule), ['exclamation']);
});

test('ignore ce qui est dans une balise script ou style', () => {
  const v = findViolations('a.html', '<script>const lernen = 1;</script><style>.x{}</style>');
  assert.deepEqual(v, []);
});

test('ignore les attributs : seul le texte visible compte', () => {
  const v = findViolations('a.html', '<a href="/de/kurs/" data-x="lernen">Training</a>');
  assert.deepEqual(v, []);
});

test('laisse passer une page propre', () => {
  const v = findViolations('a.html', '<h1>Dein Trainingsraum für die Sprache der Medizin.</h1><p>Du sprichst. Wir kennen die Tiefe.</p>');
  assert.deepEqual(v, []);
});

// Le nom de la marque contient « ctopus », pas « ktopus » : \boktopus\b ne peut
// matcher nulle part dans « doctopus » (pas seulement à cause de \b — la sous-chaîne
// « oktopus » n'existe pas dans « doctopus »). On le prouve : c'est le faux positif
// le plus coûteux imaginable (bloquer la marque elle-même), et rien d'autre ne le couvre.
test('le nom de la marque ne déclenche pas la règle de métaphore', () => {
  const v = findViolations('a.html', '<h1>Doctopus</h1><p>Doctopus hilft dir bei der Fachsprachprüfung.</p>');
  assert.deepEqual(v, []);
});

// Arbitrage tâche 5, réserve n°1 (retenue) : la règle `vouvoiement` est levée UNIQUEMENT sur
// les 4 pages légales (usage juridique allemand du Sie ; formules statutaires de la
// Widerrufsbelehrung qu'on ne réécrit pas au tutoiement). Bornée à ces 4 chemins.
test('la règle vouvoiement est exemptée sur les pages légales (arbitrage tâche 5)', () => {
  const v = findViolations('/de/agb/index.html', '<p>Sie können Ihr Abonnement jederzeit kündigen.</p>');
  assert.deepEqual(v, []);
});

test('la règle vouvoiement reste active hors des pages légales', () => {
  const v = findViolations('/de/ueber/index.html', '<p>Sie können Ihr Abonnement jederzeit kündigen.</p>');
  assert.deepEqual(v.map((x) => x.rule), ['vouvoiement']);
});

// Preuve que l'exemption est bornée à `vouvoiement` seul : une promesse de réussite dans les
// AGB reste une faute — sans ce test, l'exemption serait une porte ouverte à toutes les règles.
test('une règle non exemptée (promesse) déclenche toujours sur une page légale', () => {
  const v = findViolations('/de/agb/index.html', '<p>Der Erfolg ist garantiert.</p>');
  assert.ok(v.some((x) => x.rule === 'promesse'));
});

// Arbitrage tâche 5, réserve n°2 (retenue) : reprend le mécanisme de négation de
// check-no-promise.mjs (mot immédiatement précédent dans l'ensemble de négateurs).
// « keine Erfolgsquote » dit l'inverse de ce que la règle `promesse` signale.
test('le contexte nié ne déclenche pas la règle promesse (keine Erfolgsquote)', () => {
  const v = findViolations('a.html', '<p>Wir versprechen keine Erfolgsquote.</p>');
  assert.deepEqual(v, []);
});

test('la même occurrence sans négation déclenche toujours la règle promesse', () => {
  const v = findViolations('a.html', '<p>Wir bieten eine hohe Erfolgsquote.</p>');
  assert.ok(v.some((x) => x.rule === 'promesse'));
});
