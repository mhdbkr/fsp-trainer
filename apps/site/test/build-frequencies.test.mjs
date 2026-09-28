import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseAnalyse, slugify } from '../scripts/build-frequencies.mjs';
const md = readFileSync(new URL('./fixtures/analyse-extract.md', import.meta.url), 'utf8');

test('slugify', () => {
  assert.equal(slugify('Ösophaguskarzinom'), 'oesophaguskarzinom');
  assert.equal(slugify('Ulcus / Gastritis'), 'ulcus-gastritis');
  assert.equal(slugify('Bandscheibenvorfall (HWS/LWS)'), 'bandscheibenvorfall-hws-lws');
  assert.equal(slugify('Zöliakie/Sprue'), 'zoeliakie-sprue');
});
test('header figures are quoted verbatim', () => {
  const f = parseAnalyse(md);
  assert.equal(f.n, 580);
  assert.deepEqual(f.centers.map((c) => c.n), [91, 169, 151, 182]);
  assert.equal(f.nByCenterSum, 593);
});
test('section 3.1 gives 20 top rows with byCenter and specialty', () => {
  const top = parseAnalyse(md).pathologies.filter((p) => p.tier === 'top');
  assert.equal(top.length, 20);
  const dep = top.find((p) => p.id === 'depression');
  assert.deepEqual(dep, { id: 'depression', name: 'Depression', specialty: 'Psychiatrie', total: 30, byCenter: { Fr: 1, Ka: 11, Re: 7, St: 11 }, tier: 'top' });
  const oes = top.find((p) => p.id === 'oesophaguskarzinom');
  assert.deepEqual(oes.byCenter, { Fr: 1, Ka: 9, Re: 0, St: 12 });
});
test('section 3.2 gives frequent rows without byCenter, parenthetical stripped', () => {
  const f = parseAnalyse(md).pathologies.filter((p) => p.tier === 'frequent');
  assert.equal(f.length, 34);
  assert.deepEqual(f.find((p) => p.name === 'Fibromyalgie'), { id: 'fibromyalgie', name: 'Fibromyalgie', specialty: null, total: 8, byCenter: null, tier: 'frequent' });
});
test('section 3.3 gives rare rows with null totals', () => {
  const r = parseAnalyse(md).pathologies.filter((p) => p.tier === 'rare');
  assert.equal(r.length, 27);
  assert.equal(r[0].name, 'Tonsillitis'); assert.equal(r[0].total, null);
});
test('trends quote 3.4 verbatim', () => {
  const t = parseAnalyse(md).trends;
  assert.equal(t.length, 5);
  assert.equal(t[0].center, 'Re');
  assert.ok(t[0].summary.startsWith('nette dominante'));
});
test('unparsable table row throws with line', () => {
  assert.throws(() => parseAnalyse(md.replace('| 30 | **Depression** | Fr1 Ka11 Re7 St11 |', '| 30 | Depression | Fr1 Ka11 |')), /ligne/);
});
