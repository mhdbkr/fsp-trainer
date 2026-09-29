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

// --- Retour direction n°1 : le top 10 vient du cas, jamais d'un terme de l'autre sexe ---
test('top 10 : un terme absent du texte du cas lui-même → erreur ; au-delà du 10ᵉ rang, toléré', () => {
  const links = { a: ['fb-d', ...ids(12)] };
  const own = { a: new Set(['fb-d', ...ids(8)]) };                     // fb-t8 (10ᵉ) absent, fb-t9 à t11 hors top 10
  const r = checkLinks({ ...base, links, diagnosis: { a: ['fb-d'] }, own, maxBroad: 100 });
  assert.deepEqual(r.errors, ['a : fb-t8 au top 10 sans figurer dans le cas (fiche patient, vue médicale hors DD)']);
});
test('termes sexués : gynéco/obstétrique dans un cas masculin, andrologie dans un cas féminin → erreur', () => {
  const sexTerms = { w: new Set(['fb-t20']), m: new Set(['fb-t21']) };
  const links = { h: ['fb-d', ...ids(8), 'fb-t20'], f: ['fb-d', ...ids(8), 'fb-t21'], ok: ['fb-d', ...ids(8), 'fb-t21'] };
  const r = checkLinks({ ...base, links, diagnosis: { h: ['fb-d'], f: ['fb-d'], ok: ['fb-d'] }, sex: { h: 'm', f: 'w', ok: 'm' }, sexTerms, maxBroad: 100 });
  assert.deepEqual(r.errors.sort(), ['f : terme andrologique lié à un cas féminin fb-t21', 'h : terme gynécologique/obstétrical lié à un cas masculin fb-t20']);
});
test('sexSpecificTerms.json : chaque id existe et correspond aux radicaux ; tout id des radicaux est listé ou exclu avec raison', async () => {
  const { SEX_STEMS, sexStemHits } = await import('./checkCaseTermLinks.mjs');
  const { readFileSync } = await import('node:fs');
  const fb = JSON.parse(readFileSync(new URL('../src/data/fachbegriffe.json', import.meta.url), 'utf8'));
  const list = JSON.parse(readFileSync(new URL('../src/data/sexSpecificTerms.json', import.meta.url), 'utf8'));
  for (const k of ['w', 'm']) {
    const hits = sexStemHits(fb, SEX_STEMS[k]);
    assert.deepEqual([...list[k]].sort(), hits.filter((id) => !(id in list.excluded)).sort(), k);
  }
  for (const [id, why] of Object.entries(list.excluded)) {
    assert.ok(sexStemHits(fb, SEX_STEMS.w).includes(id) || sexStemHits(fb, SEX_STEMS.m).includes(id), 'exclusion sans objet : ' + id);
    assert.ok(why.length > 5, 'raison : ' + id);
  }
});
