import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLexicon } from '../scripts/build-lexicon.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const voiceMd = readFileSync(resolve(here, '../../../docs/brand/voice.md'), 'utf8');
const lexicon = buildLexicon(voiceMd);

const hasBlocking = (term) => lexicon.blocking.some((t) => t.term === term);
const hasInformative = (term) => lexicon.informative.some((t) => t.term === term);

test('generatedFrom pointe voice.md §6', () => {
  assert.equal(lexicon.generatedFrom, 'docs/brand/voice.md §6');
});

test('blocking contient garantiert (6.1, DE)', () => {
  assert.ok(lexicon.blocking.some((t) => t.term === 'garantiert' && t.lang === 'de' && t.section === '6.1'));
});

test('blocking contient nur noch X Stunden (6.4)', () => {
  assert.ok(lexicon.blocking.some((t) => t.term === 'nur noch X Stunden' && t.section === '6.4'));
});

test('blocking contient Streak verloren (6.4)', () => {
  assert.ok(hasBlocking('Streak verloren'));
});

test('informative contient revolutionär (6.2), ganz Deutschland (6.3), quiz (6.5)', () => {
  assert.ok(lexicon.informative.some((t) => t.term === 'revolutionär' && t.section === '6.2'));
  assert.ok(lexicon.informative.some((t) => t.term === 'ganz Deutschland' && t.section === '6.3'));
  assert.ok(lexicon.informative.some((t) => t.term === 'quiz' && t.section === '6.5'));
});

test('aucune parenthèse ni * dans un term', () => {
  for (const t of [...lexicon.blocking, ...lexicon.informative]) {
    assert.ok(!t.term.includes('('), `parenthèse dans « ${t.term} »`);
    assert.ok(!t.term.includes(')'), `parenthèse dans « ${t.term} »`);
    assert.ok(!t.term.includes('*'), `astérisque dans « ${t.term} »`);
  }
});

test('Kündigung mit einem Klick présent (blocking, ajout fixe)', () => {
  assert.ok(hasBlocking('Kündigung mit einem Klick'));
  assert.ok(hasBlocking('ein Klick'));
  assert.ok(hasBlocking('mit einem Klick'));
});

test("jederzeit kündbar présent en 6.4, astérisque retiré", () => {
  assert.ok(lexicon.blocking.some((t) => t.term === 'jederzeit kündbar' && t.section === '6.4'));
});

test('--check est idempotent sur le JSON committé', () => {
  const committed = JSON.parse(readFileSync(resolve(here, '../scripts/no-promise.lexicon.json'), 'utf8'));
  assert.deepEqual(committed, lexicon);
});
