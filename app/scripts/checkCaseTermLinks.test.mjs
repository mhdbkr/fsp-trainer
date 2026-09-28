import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLinks } from './checkCaseTermLinks.mjs';

const ids = (k) => Array.from({ length: k }, (_, i) => `fb-t${i}`);
const knownIds = new Set([...ids(30), 'fb-anamnese', 'fb-d', 'fb-broad']);
const base = { knownIds, generic: new Set(['fb-anamnese']), exceptions: ['case-x'] };

test('valide : ≥ 8 termes, diagnostic lié', () => {
  const r = checkLinks({ ...base, links: { a: ['fb-d', ...ids(8)] }, diagnosis: { a: ['fb-d'] } });
  assert.deepEqual(r.errors, []);
});
test('< 8 termes, id inconnu, id générique → erreurs', () => {
  const r = checkLinks({ ...base, links: { a: ['fb-d', 'fb-zzz', 'fb-anamnese'] }, diagnosis: { a: ['fb-d'] } });
  assert.ok(r.errors.some((e) => e.includes('< 8')));
  assert.ok(r.errors.some((e) => e.includes('inconnu fb-zzz')));
  assert.ok(r.errors.some((e) => e.includes("mot d'examen lié fb-anamnese")));
});
test('diagnostic non lié → erreur ; sans terme de diagnostic → erreur sauf exception', () => {
  assert.ok(checkLinks({ ...base, links: { a: ids(8) }, diagnosis: { a: ['fb-d'] } }).errors.some((e) => e.includes('non lié fb-d')));
  assert.ok(checkLinks({ ...base, links: { a: ids(8) }, diagnosis: { a: [] } }).errors.some((e) => e.includes('aucun terme de diagnostic')));
  assert.deepEqual(checkLinks({ ...base, links: { 'case-x': ids(8) }, diagnosis: { 'case-x': [] } }).errors, []);
});
test('plus de 10 termes liés à > 20 % des cas → erreur ; 10 → info', () => {
  const links = {}; for (let i = 0; i < 10; i++) links[`c${i}`] = ids(11);   // 11 termes présents dans 100 % des cas
  assert.ok(checkLinks({ ...base, links, diagnosis: {}, exceptions: Object.keys(links) }).errors.some((e) => e.includes('11 termes liés à > 20 %')));
  for (const k of Object.keys(links)) links[k] = ids(10);
  assert.deepEqual(checkLinks({ ...base, links, diagnosis: {}, exceptions: Object.keys(links), minPerCase: 8 }).errors, []);
});
