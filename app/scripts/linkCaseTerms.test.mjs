import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, caseTexts, buildIndex, orderCaseTerms, diagnosisTexts, isNegated, sentences } from './linkCaseTerms.mjs';
import { NEGATION_FIXTURES } from './negation.fixtures.mjs';

const terms = [{ id: 'fb-haematemesis', term: 'Hämatemesis' }, { id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-magen', term: 'Magen' }, { id: 'fb-puls', term: 'Puls' }, { id: 'fb-in', term: 'in' }];

test('occurrence entière, insensible à la casse, umlauts ; pas dans les composés', () => {
  assert.deepEqual(linkTerms(['Der Patient berichtet über hämatemesis und ein Ulkus.'], terms), ['fb-haematemesis', 'fb-ulkus']);
  assert.deepEqual(linkTerms(['Magenspiegelung geplant'], terms), []);            // « Magen » dans un composé = autre mot
  assert.deepEqual(linkTerms(['Puls 80/min'], terms), ['fb-puls']);
});
test('formes fléchies simples -e/-en/-s/-n', () => {
  assert.deepEqual(linkTerms(['zwei Ulkusse? nein: Ulzera; aber Ulkusen'], terms), ['fb-ulkus']);
});
test('termes < 4 lettres ignorés ; liste d\'exclusion', () => {
  assert.deepEqual(linkTerms(['in der Nacht'], terms), []);
});
test('liste d\'exclusion couvre aussi un mot ≥ 4 lettres', () => {
  const t = [{ id: 'fb-seit', term: 'seit' }];
  assert.deepEqual(linkTerms(['seit gestern'], t), []);
});
test('ordre par DF ascendante puis id (convention consommateur, testée sur linkTerms brut)', () => {
  const t2 = [{ id: 'fb-x', term: 'Xterm' }, { id: 'fb-y', term: 'Yterm' }];
  const caseA = linkTerms(['Xterm und Yterm'], t2);
  const caseB = linkTerms(['Nur Xterm'], t2);
  // Xterm apparaît dans les 2 cas (DF=2), Yterm dans 1 seul (DF=1) : Y doit
  // précéder X une fois trié par DF ascendante, comme le fait linkCaseTerms.mjs
  // sur le résultat complet.
  const df = { 'fb-x': 2, 'fb-y': 1 };
  const sorted = caseA.slice().sort((a, b) => (df[a] - df[b]) || (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(sorted, ['fb-y', 'fb-x']);
  assert.deepEqual(caseB, ['fb-x']);
});
test('caseTexts : core vs contextuel — antworten, questions, muster, medicalView, examinerSheet en core ; antécédents en contextuel', () => {
  const c = {
    patientSheet: { antworten: { a: 'Hämatemesis seit gestern' }, voroperationen: ['Jochbeinfraktur (Os zygomaticum)'], vorerkrankungen: ['Asthma'], noxen: { tabak: 'Nikotin' } },
    caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], medicalView: { x: { y: 'Magen' } }, examinerSheet: [{ title: 't', items: ['Ulkus'] }],
    musterSaetze: { arztbrief: { vorerkrankungen: 'Z. n. Appendektomie', diagnose: 'Ulkus' } },
  };
  const { core, contextual } = caseTexts(c, { arztbrief: { vorerkrankungen: 'Z. n. Jochbeinfraktur', beschwerden: 'Muster A' }, vorstellung: 'Muster B' });
  const coreTxt = core.join('\n'); const ctxTxt = contextual.join('\n');
  for (const w of ['Hämatemesis', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'Muster B']) assert.ok(coreTxt.includes(w), w);
  for (const w of ['Os zygomaticum', 'Asthma', 'Nikotin', 'Appendektomie', 'Jochbeinfraktur']) { assert.ok(ctxTxt.includes(w), w); assert.ok(!coreTxt.includes(w), 'pas en core : ' + w); }
});
test('linkTerms accepte un index préconstruit (construit une fois dans main)', () => {
  const index = buildIndex(terms);
  assert.deepEqual(linkTerms(['Puls 80/min'], index), ['fb-puls']);
});
test('ordre : diagnostic d\'abord, même s\'il est le plus fréquent du corpus', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-pyrosis', term: 'Pyrosis' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Ulcus ventriculi', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, patientSheet: { antworten: { a: 'Pyrosis und Fieber, Ulkus' } } };
  const index = buildIndex(t);
  const { core, contextual } = caseTexts(c);
  const parts = { core: linkTerms(core, index), contextual: linkTerms(contextual, index), diagnosis: linkTerms(diagnosisTexts(c), index) };
  const df = new Map([['fb-ulkus', 100], ['fb-fieber', 50], ['fb-pyrosis', 1]]);
  assert.deepEqual(orderCaseTerms(parts, df), ['fb-ulkus', 'fb-pyrosis', 'fb-fieber']);
});
test('ordre : un terme trouvé SEULEMENT en contexte (antécédent) arrive en dernier, même rare ; l\'ensemble est inchangé', () => {
  const t = [{ id: 'fb-os-zygomaticum', term: 'Os zygomaticum' }, { id: 'fb-pyrosis', term: 'Pyrosis' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Ulcus', medicalView: { verdachtsdiagnose: 'Ulcus' }, patientSheet: { antworten: { a: 'Pyrosis und Fieber' }, voroperationen: ['Jochbeinfraktur (Os zygomaticum)', 'Fieber danach'] } };
  const index = buildIndex(t);
  const { core, contextual } = caseTexts(c);
  const parts = { core: linkTerms(core, index), contextual: linkTerms(contextual, index), diagnosis: linkTerms(diagnosisTexts(c), index) };
  const df = new Map([['fb-os-zygomaticum', 1], ['fb-fieber', 50], ['fb-pyrosis', 10]]);
  const ordered = orderCaseTerms(parts, df);
  assert.deepEqual(ordered, ['fb-pyrosis', 'fb-fieber', 'fb-os-zygomaticum']);   // Fieber est aussi en core → reste core
  assert.deepEqual([...ordered].sort(), [...new Set([...parts.core, ...parts.contextual])].sort());
});

// --- F4a §3.1 : phrases, négation ---------------------------------------------
test(`isNegated : ${NEGATION_FIXTURES.length} phrases (dont ≥ 20 réelles du corpus)`, () => {
  assert.ok(new Set(NEGATION_FIXTURES.slice(0, -6).map(([s]) => s)).size >= 20, '≥ 20 phrases réelles distinctes');
  for (const [s, word, negated] of NEGATION_FIXTURES) {
    const at = s.indexOf(word);
    assert.ok(at >= 0, `mot absent : ${word}`);
    assert.equal(isNegated(s, at), negated, `${negated ? 'nié' : 'affirmé'} attendu : « ${word} » dans « ${s.slice(0, 80)}… »`);
  }
});
test('sentences : abréviations du corpus gardées dans la phrase', () => {
  assert.deepEqual(sentences('Z. n. Nagelosteosynthese am Bein. Danach gut.').map((s) => s.trim()), ['Z. n. Nagelosteosynthese am Bein.', 'Danach gut.']);
  assert.deepEqual(sentences('Schmerzen, z. B. beim Gehen, bzw. Treppensteigen. V. a. Pneumonie bei Fieber.').map((s) => s.trim()), ['Schmerzen, z. B. beim Gehen, bzw. Treppensteigen.', 'V. a. Pneumonie bei Fieber.']);
  assert.deepEqual(sentences('Gewichtszunahme von ca. 5 kg. Ikterus verneint.').map((s) => s.trim()), ['Gewichtszunahme von ca. 5 kg.', 'Ikterus verneint.']);
});
test('linkTerms { negation } : un terme cité seulement nié n\'est pas lié ; affirmé ailleurs, il l\'est', () => {
  const t = [{ id: 'fb-fieber', term: 'Fieber' }, { id: 'fb-ikterus', term: 'Ikterus' }];
  assert.deepEqual(linkTerms(['Kein Fieber. Ein Ikterus wurde verneint.'], t, { negation: true }), []);
  assert.deepEqual(linkTerms(['Kein Fieber. Seit gestern Fieber.'], t, { negation: true }), ['fb-fieber']);
  assert.deepEqual(linkTerms(['Kein Fieber.'], t), ['fb-fieber']);                 // sans l'option : comportement F2a
});
