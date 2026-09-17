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
test('caseTexts aplatit antworten, questions, muster, medicalView, examinerSheet', () => {
  const c = { patientSheet: { antworten: { a: 'Hämatemesis seit gestern' } }, caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], medicalView: { x: { y: 'Magen' } }, examinerSheet: [{ title: 't', items: ['Ulkus'] }] };
  const txt = caseTexts(c, { dokumentation: 'Muster A', fallvorstellung: 'Muster B' }).join('\n');
  for (const w of ['Hämatemesis', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'Muster B']) assert.ok(txt.includes(w), w);
});
