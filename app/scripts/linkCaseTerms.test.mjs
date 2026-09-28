import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, caseTexts, buildIndex, orderCaseTerms, diagnosisTexts, isNegated, sentences, caseParts, linkCorpus } from './linkCaseTerms.mjs';
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
test('linkTerms accepte un index préconstruit (construit une fois dans main)', () => {
  const index = buildIndex(terms);
  assert.deepEqual(linkTerms(['Puls 80/min'], index), ['fb-puls']);
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

// --- F4a §3.1 : champs exclus, contextuels, constats principaux ------------------
test('caseTexts : questionnaire et signes niés exclus ; anamnèse systématique et DD contextuelles ; constats principaux', () => {
  const c = {
    patientSheet: {
      leitsymptome: ['Hämatemesis'], begleitsymptome: ['Schwindel'], schmerz: { ort: 'Epigastrium' },
      antworten: { a: 'Antwort-Text' }, antwortenEmotional: { a: { calm: 'Ruhig-Text' } }, frageAntworten: [{ frage: 'F', antwort: 'Frage-Text' }],
      negativeFindings: ['Negativ-Text'], vegetativeAnamnese: ['Nachtschweiß'], voroperationen: ['Jochbeinfraktur'], noxen: { tabak: 'Nikotin' },
    },
    caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], examinerSheet: [{ title: 't', interactions: [{ frage: 'Magen' }] }],
    medicalView: { verdachtsdiagnose: 'Ulkus', differenzialdiagnosen: [{ dd: 'Gastritis', unterscheidung: 'x' }] },
    musterSaetze: { arztbrief: { 'aktuelle-beschwerden': 'Muster A', 'allergien-noxen': 'Muster Noxen', 'familie-sozial': 'Muster Familie' }, vorstellung: { drogen: 'Muster Drogen' } },
  };
  const { core, contextual, primary } = caseTexts(c, undefined, { pathology: 'x', definition: 'FW-Text', differenzialdiagnosen: [{ dd: 'FW-DD' }] });
  const coreTxt = core.join('\n'); const ctxTxt = contextual.join('\n'); const all = coreTxt + ctxTxt;
  for (const w of ['Hämatemesis', 'Schwindel', 'Epigastrium', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'FW-Text']) assert.ok(coreTxt.includes(w), 'core : ' + w);
  for (const w of ['Nachtschweiß', 'Jochbeinfraktur', 'Nikotin', 'Gastritis', 'Muster Noxen', 'Muster Familie', 'Muster Drogen', 'FW-DD']) { assert.ok(ctxTxt.includes(w), 'contextuel : ' + w); assert.ok(!coreTxt.includes(w), 'pas en core : ' + w); }
  for (const w of ['Antwort-Text', 'Ruhig-Text', 'Frage-Text', 'Negativ-Text']) assert.ok(!all.includes(w), 'exclu : ' + w);
  assert.deepEqual(primary, ['Hämatemesis', 'Schwindel', 'Epigastrium']);
});
test('caseParts : génériques retirés partout ; diagnostic non filtré par la négation', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-anamnese', term: 'Anamnese' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Kein Ulkus', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, patientSheet: { leitsymptome: ['Fieber'] }, caseSpecificQuestions: ['Anamnese: Fieber seit gestern.'] };
  const p = caseParts(c, { index: buildIndex(t), generic: new Set(['fb-anamnese']) });
  assert.deepEqual(p.diagnosis, ['fb-ulkus']);
  assert.deepEqual(p.core, ['fb-fieber', 'fb-ulkus']);
  assert.deepEqual(p.primary, ['fb-fieber']);
});
test('linkCorpus : > 20 % des cas → gardé seulement où il est diagnostic ou constat principal', () => {
  const parts = {};
  for (let i = 0; i < 10; i++) parts[`c${i}`] = { core: ['fb-fieber', `fb-rare${i}`], primary: i === 0 ? ['fb-fieber'] : [], diagnosis: [`fb-rare${i}`] };
  const out = linkCorpus(parts);
  assert.deepEqual(out.c0, ['fb-rare0', 'fb-fieber']);
  assert.deepEqual(out.c1, ['fb-rare1']);
  const broad = Object.values(out).flat().filter((id) => id === 'fb-fieber').length;
  assert.equal(broad, 1);
});
test('linkCorpus : le diagnostic est lié même absent du core ; ordre diagnostic puis DF asc + id', () => {
  const out = linkCorpus({ a: { core: ['fb-y', 'fb-x'], primary: [], diagnosis: ['fb-d'] }, b: { core: ['fb-x'], primary: [], diagnosis: [] }, c: { core: [], primary: [], diagnosis: [] }, d: { core: [], primary: [], diagnosis: [] }, e: { core: [], primary: [], diagnosis: [] }, f: { core: [], primary: [], diagnosis: [] }, g: { core: [], primary: [], diagnosis: [] }, h: { core: [], primary: [], diagnosis: [] }, i: { core: [], primary: [], diagnosis: [] }, j: { core: [], primary: [], diagnosis: [] } });
  assert.deepEqual(out.a, ['fb-d', 'fb-y', 'fb-x']);  // fb-x DF 2 (= 20 %, gardé), fb-y DF 1
});
test('ordre : diagnostic d\'abord, même s\'il est le plus fréquent du corpus', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-pyrosis', term: 'Pyrosis' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Ulcus ventriculi', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, caseSpecificQuestions: ['Pyrosis und Fieber, Ulkus'] };
  const index = buildIndex(t);
  const { core, contextual } = caseTexts(c);
  const parts = { core: linkTerms(core, index), contextual: linkTerms(contextual, index), diagnosis: linkTerms(diagnosisTexts(c), index) };
  const df = new Map([['fb-ulkus', 100], ['fb-fieber', 50], ['fb-pyrosis', 1]]);
  assert.deepEqual(orderCaseTerms(parts, df), ['fb-ulkus', 'fb-pyrosis', 'fb-fieber']);
});
