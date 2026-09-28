import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findViolations, checkText, normalize, scan } from '../scripts/check-no-promise.mjs';
import { htmlCorpus } from '../scripts/lib/dist.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const lex = JSON.parse(readFileSync(resolve(here, '../scripts/no-promise.lexicon.json'), 'utf8'));

test('garantiert bestehen is blocking', () => {
  assert.ok(findViolations('Du wirst garantiert bestehen.', lex).some((v) => v.term === 'garantiert'));
});

test('keine Garantie is allowed (negation)', () => {
  assert.equal(findViolations('Es gibt keine Garantie.', lex).length, 0);
});

test('Erfolgsgarantie in disclaimer does not match whole-word Garantie', () => {
  assert.equal(findViolations('keine Erfolgsgarantie', lex).length, 0);
});

test('nur noch 3 Stunden matches X wildcard', () => {
  assert.ok(findViolations('Nur noch 3 Stunden!', lex).some((v) => v.section === '6.4'));
});

test('Streak verloren and ein Klick are blocking', () => {
  assert.ok(findViolations('Streak verloren', lex).length);
  assert.ok(findViolations('Kündigung mit einem Klick', lex).length);
});

test('accents normalized', () => {
  assert.ok(findViolations('Prufung garantiert', lex).length);
});

test('informative terms do not block', () => {
  const r = checkText('revolutionär', lex);
  assert.equal(r.blocking.length, 0);
  assert.equal(r.informative.length, 1);
});

test('normalize strips diacritics and lowercases', () => {
  assert.equal(normalize('Prüfung GARANTIERT'), 'prufung garantiert');
});

test('voice:allow exception is listed via findViolations term match but exempted at CLI scan level', () => {
  // findViolations elle-même reste neutre à l'allow-list : c'est le scan CLI qui filtre.
  assert.ok(findViolations('Du wirst garantiert bestehen.', lex).length > 0);
});

test('100% sans espace est bloquant au même titre que 100 % (revue T1.6 I1)', () => {
  assert.ok(findViolations('100% Erfolg garantiert nach diesem Kurs.', lex).some((v) => v.term === '100 %'));
});

test('non-negated occurrence far from negation word still blocks', () => {
  // "keine" n'est pas le mot immédiatement précédent (> 1 mot) -> reste bloquant
  assert.ok(findViolations('keine Ahnung, aber garantiert bestehen wirst du.', lex).some((v) => v.term === 'garantiert'));
});

// I3 (revue finale) — « Mit Erfolgsgarantie zur bestandenen Prüfung. » passait cette porte :
// aucun terme ne tenait le composé (« Garantie » est borné, il ne mord pas dans
// « Erfolgsgarantie »). docs/brand/voice.md §6.1 nomme désormais Erfolgsgarantie et
// Bestehensgarantie. L'avertissement légal, qui les NIE, passe par la négation ET par son
// exception de phrase exacte ; l'exception ne couvre que sa phrase (lib/dist.mjs, allowCovers).
const NOTICE = 'Doctopus ist ein Sprachlernwerkzeug zur Vorbereitung auf die FSP — kein Medizinprodukt, keine klinische Entscheidungshilfe, keine Erfolgsgarantie.';
const NOTICE_HTML = `<!-- voice:allow "${NOTICE}" --><p data-notice="language-tool">${NOTICE}</p>`;

test('I3 — Erfolgsgarantie et Bestehensgarantie promises sont bloquantes', () => {
  assert.ok(findViolations('Mit Erfolgsgarantie zur bestandenen Prüfung.', lex).some((v) => v.term === 'Erfolgsgarantie'));
  assert.ok(findViolations('Mit Bestehensgarantie.', lex).some((v) => v.term === 'Bestehensgarantie'));
});

test('I3 — scan : la promesse posée à côté de l\'avertissement bloque, l\'avertissement seul passe', () => {
  assert.equal(scan('a.html', htmlCorpus(`<html><body>${NOTICE_HTML}</body></html>`), lex, []), false);
  const lines = [];
  assert.equal(scan('a.html', htmlCorpus(`<html><body><p>Mit Erfolgsgarantie zur bestandenen Prüfung.</p>${NOTICE_HTML}</body></html>`), lex, lines), true);
  assert.ok(lines.some((l) => l.startsWith('✗') && l.includes('Erfolgsgarantie')), lines.join('\n'));
});

test('I3 — scan : une exception de phrase ne lève que les correspondances qu\'elle contient', () => {
  const allow = '<!-- voice:allow "Kündigung mit einem Klick, ohne Begründung" -->';
  assert.equal(scan('a.html', htmlCorpus(`${allow}<p>Kündigung mit einem Klick, ohne Begründung.</p>`), lex, []), false);
  assert.equal(scan('a.html', htmlCorpus(`${allow}<p>Kündigung mit einem Klick, ohne Begründung.</p><p>Jederzeit kündbar.</p>`), lex, []), true);
});
