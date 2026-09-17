import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, caseTexts } from './linkCaseTerms.mjs';

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
test('caseTexts aplatit antworten, questions, muster, medicalView, examinerSheet', () => {
  const c = { patientSheet: { antworten: { a: 'Hämatemesis seit gestern' } }, caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], medicalView: { x: { y: 'Magen' } }, examinerSheet: [{ title: 't', items: ['Ulkus'] }] };
  const txt = caseTexts(c, { dokumentation: 'Muster A', fallvorstellung: 'Muster B' }).join('\n');
  for (const w of ['Hämatemesis', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'Muster B']) assert.ok(txt.includes(w), w);
});
