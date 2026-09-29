import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, countTerms, caseTexts, buildIndex, orderCaseTerms, diagnosisTexts, isNegated, sentences, caseParts, linkCorpus } from './linkCaseTerms.mjs';
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
    caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], examinerSheet: [{ title: 't', interactions: [{ frage: 'Magen' }] }], pruefungsfallen: ['Falle'],
    medicalView: { verdachtsdiagnose: 'Ulkus', differenzialdiagnosen: [{ dd: 'Gastritis', unterscheidung: 'x' }] },
    musterSaetze: { arztbrief: { 'aktuelle-beschwerden': 'Muster A', 'allergien-noxen': 'Muster Noxen', 'familie-sozial': 'Muster Familie' }, vorstellung: { drogen: 'Muster Drogen' } },
  };
  const { core, contextual, primary } = caseTexts(c, undefined, { pathology: 'x', definition: 'FW-Text', differenzialdiagnosen: [{ dd: 'FW-DD' }] });
  const coreTxt = core.join('\n'); const ctxTxt = contextual.join('\n'); const all = coreTxt + ctxTxt;
  for (const w of ['Hämatemesis', 'Schwindel', 'Epigastrium', 'Ulkus', 'Muster A']) assert.ok(coreTxt.includes(w), 'core : ' + w);
  // Retour direction n°1 : seul ce que dit le CAS lie — la fiche Fachwissen (générique de la pathologie),
  // les questions d'examinateur, les pièges et les questions du candidat sont contextuels.
  for (const w of ['Nachtschweiß', 'Jochbeinfraktur', 'Nikotin', 'Gastritis', 'Muster Noxen', 'Muster Familie', 'Muster Drogen', 'FW-DD', 'FW-Text', 'Puls', 'Magen', 'Haben Sie Ulkus?', 'Falle']) { assert.ok(ctxTxt.includes(w), 'contextuel : ' + w); assert.ok(!coreTxt.includes(w), 'pas en core : ' + w); }
  for (const w of ['Antwort-Text', 'Ruhig-Text', 'Frage-Text', 'Negativ-Text']) assert.ok(!all.includes(w), 'exclu : ' + w);
  assert.deepEqual(primary, ['Hämatemesis', 'Schwindel', 'Epigastrium']);
  assert.deepEqual(caseTexts(c).patient, ['Hämatemesis', 'Schwindel', 'Epigastrium']);   // ce que dit le patient (hors exclus et contextuels)
});
test('caseTexts : toute clé de diagnostic différentiel (dd, unterscheidung) est contextuelle, où qu\'elle soit', () => {
  const { core, contextual } = caseTexts({ medicalView: { verdachtsdiagnose: 'Appendizitis', diagnostik: [{ dd: 'Adnexitis', unterscheidung: 'Endometriose' }] } });
  assert.deepEqual(core, ['Appendizitis']);
  assert.deepEqual(contextual.sort(), ['Adnexitis', 'Endometriose']);
});
test('countTerms : occurrences affirmées par terme', () => {
  const t = [{ id: 'fb-fieber', term: 'Fieber' }, { id: 'fb-ikterus', term: 'Ikterus' }];
  assert.deepEqual(Object.fromEntries(countTerms(['Fieber seit gestern. Kein Ikterus.', 'Hohes Fieber.'], buildIndex(t), { negation: true })), { 'fb-fieber': 2 });
});
test('caseParts : génériques retirés partout ; diagnostic non filtré par la négation', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-anamnese', term: 'Anamnese' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Kein Ulkus', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, patientSheet: { leitsymptome: ['Fieber'] }, caseSpecificQuestions: ['Anamnese: Fieber seit gestern.'] };
  const p = caseParts(c, { index: buildIndex(t), generic: new Set(['fb-anamnese']) });
  assert.deepEqual(p.diagnosis, ['fb-ulkus']);
  assert.deepEqual(p.core, ['fb-fieber', 'fb-ulkus']);
  assert.deepEqual(p.primary, ['fb-fieber']);
  assert.deepEqual(p.patient, ['fb-fieber']);
  assert.deepEqual(p.counts, { 'fb-fieber': 1, 'fb-ulkus': 1 });
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
  // symptôme clé (primary) avant le reste, même fréquent (revue A2 : Fieber 34ᵉ dans la pneumonie)
  assert.deepEqual(orderCaseTerms({ ...parts, primary: ['fb-fieber'] }, df), ['fb-ulkus', 'fb-fieber', 'fb-pyrosis']);
});
test('ordre du reste : ce que dit le patient avant le reste ; dans un rang, le plus cité dans le cas, puis le plus spécifique', () => {
  const df = new Map([['fb-rare', 1], ['fb-mv', 2], ['fb-pat', 30], ['fb-pat2', 5], ['fb-pat3', 4]]);
  const parts = { core: ['fb-rare', 'fb-mv', 'fb-pat', 'fb-pat2', 'fb-pat3'], contextual: [], diagnosis: [], primary: [], patient: ['fb-pat', 'fb-pat2', 'fb-pat3'],
    counts: { 'fb-rare': 1, 'fb-mv': 3, 'fb-pat': 4, 'fb-pat2': 1, 'fb-pat3': 1 } };
  // fb-pat (cité 4 fois) avant fb-pat3/fb-pat2 (1 fois, DF 4 < 5) ; puis hors patient : fb-mv (3 fois) avant fb-rare
  assert.deepEqual(orderCaseTerms(parts, df), ['fb-pat', 'fb-pat3', 'fb-pat2', 'fb-mv', 'fb-rare']);
});
test('linkCorpus : transmet patient et counts à l\'ordre', () => {
  const empty = { core: [], primary: [], diagnosis: [], patient: [], counts: {} };
  const parts = { a: { core: ['fb-x', 'fb-y'], primary: [], diagnosis: [], patient: ['fb-y'], counts: { 'fb-x': 5, 'fb-y': 1 } } };
  for (let i = 0; i < 9; i++) parts[`e${i}`] = empty;
  assert.deepEqual(linkCorpus(parts).a, ['fb-y', 'fb-x']);
});
test('caseTexts : une PHRASE de diagnostic différentiel (Muster, vue médicale) est contextuelle, le reste du texte lie', () => {
  const c = {
    medicalView: { verdachtsdiagnose: 'Appendizitis', diagnostik: [{ text: 'Sonographie. Differenzialdiagnostisch ist eine Adnexitis auszuschließen.' }] },
    musterSaetze: { arztbrief: { diagnose: 'Akute Appendizitis. Als Differenzialdiagnosen kommen eine Gastroenteritis und eine Leistenhernie in Betracht.' } },
  };
  const { core, contextual } = caseTexts(c);
  const coreTxt = core.join('\n'); const ctxTxt = contextual.join('\n');
  for (const w of ['Sonographie', 'Akute Appendizitis']) assert.ok(coreTxt.includes(w), 'core : ' + w);
  for (const w of ['Adnexitis', 'Gastroenteritis', 'Leistenhernie']) { assert.ok(ctxTxt.includes(w), 'contextuel : ' + w); assert.ok(!coreTxt.includes(w), 'pas en core : ' + w); }
});
test('ownTexts : fiche patient (hors exclus) + vue médicale hors DD (clés et phrases)', async () => {
  const { ownTexts } = await import('./linkCaseTerms.mjs');
  const own = ownTexts({ patientSheet: { leitsymptome: ['Bauchschmerz'], antworten: { a: 'Antwort' }, vorerkrankungen: ['Asthma'] },
    medicalView: { verdachtsdiagnose: 'Appendizitis', differenzialdiagnosen: [{ dd: 'Adnexitis' }], diagnostik: [{ text: 'Ausschluss einer Endometriose.' }] } }).join('\n');
  for (const w of ['Bauchschmerz', 'Asthma', 'Appendizitis']) assert.ok(own.includes(w), w);
  for (const w of ['Antwort', 'Adnexitis', 'Endometriose']) assert.ok(!own.includes(w), w);
});
test('ordre : ce que dit le patient, puis la vue médicale (hors DD), puis ce que seuls les Muster disent', () => {
  const df = new Map();
  const parts = { core: ['fb-muster', 'fb-mv', 'fb-pat'], contextual: [], diagnosis: [], primary: [], patient: ['fb-pat'], own: ['fb-pat', 'fb-mv'], counts: { 'fb-muster': 9, 'fb-mv': 1, 'fb-pat': 1 } };
  assert.deepEqual(orderCaseTerms(parts, df), ['fb-pat', 'fb-mv', 'fb-muster']);
});
test('caseTexts : persona (consignes de jeu en français) exclue', () => {
  const { core, contextual } = caseTexts({ patientSheet: { persona: 'Tu es bavard : le médecin doit t\'interrompre (interruption).', leitsymptome: ['Nykturie'] } });
  assert.ok(![...core, ...contextual].join('\n').includes('bavard'));
});
test('caseParts : own = ids de la fiche patient et de la vue médicale hors DD', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-fieber', term: 'Fieber' }, { id: 'fb-pyrosis', term: 'Pyrosis' }];
  const c = { patientSheet: { leitsymptome: ['Fieber'] }, medicalView: { verdachtsdiagnose: 'Ulkus' }, musterSaetze: { a: { b: 'Pyrosis' } } };
  assert.deepEqual(caseParts(c, { index: buildIndex(t), generic: new Set() }).own, ['fb-fieber', 'fb-ulkus']);
});
