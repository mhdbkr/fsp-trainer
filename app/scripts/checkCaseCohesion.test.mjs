// node --test scripts/checkCaseCohesion.test.mjs — le détecteur de DD non neutralisées
// (série 3, 1d) : acronymes en minuscule, annotation « (gegen X) », DD déclarée non
// concurrente, liste motivée des DD sans négatif possible, budget par catégorie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { RAISON, checkCohesion, verdict, verifierListe } from './checkCaseCohesion.mjs';

const cas = (dd, negativeFindings = [], antworten = {}, unterscheidung = 'x') => ({
  id: 'case-x',
  patientSheet: { negativeFindings, antworten },
  medicalView: { differenzialdiagnosen: [{ dd, unterscheidung }] },
});
const ddOrph = (c, liste) => checkCohesion(c, liste).find((i) => i.cat === 'ddNonNeutralisee')?.v ?? [];
const PAVK = 'Periphere arterielle Verschlusskrankheit (pAVK)';

test('un acronyme à minuscule initiale (pAVK) nomme la DD', () => {
  assert.deepEqual(ddOrph(cas(PAVK, ['keine Claudicatio (gegen pAVK)'])), []);
  assert.deepEqual(ddOrph(cas(PAVK, ['keine Claudicatio'])), [PAVK]);
});

test('un négatif qui ne nomme pas la DD compte s’il porte l’annotation « (gegen X) »', () => {
  const dd = 'Riesenzellarteriitis';
  assert.deepEqual(ddOrph(cas(dd, ['kein Schläfenschmerz, kein Kauschmerz (gegen Riesenzellarteriitis)'])), []);
  assert.deepEqual(ddOrph(cas(dd, ['kein Schläfenschmerz, kein Kauschmerz'])), [dd]);
});

test('une réplique niée ne neutralise pas la DD : sur le corpus, cette règle n’attrapait que des faux (vaccin, famille, allergie)', () => {
  const dd = 'Typhus abdominalis';
  assert.deepEqual(ddOrph(cas(dd, [], { 'imp-reise': 'Gegen Typhus nicht, Gelbfieber war nicht nötig.' })), [dd]);
});

test('une entrée déclarée non concurrente (complication, terrain) n’est pas à neutraliser', () => {
  for (const u of ['Keine Alternativdiagnose, sondern die gefürchtete Folge.', 'Keine Differenzialdiagnose im engeren Sinn, aber auszuschließen.', 'keine konkurrierende Diagnose']) {
    assert.deepEqual(ddOrph(cas('Myokarditis', [], {}, u)), [], u);
  }
});

test('une DD de la liste motivée n’est plus comptée ; la liste refuse raison vague, DD inconnue et entrée devenue inutile', () => {
  const dd = 'Magenlymphom (MALT)';
  const c = cas(dd);
  const liste = { 'case-x': { [dd]: 'histologie — seule la biopsie distingue le lymphome du carcinome' } };
  assert.deepEqual(ddOrph(c, liste['case-x']), []);
  assert.deepEqual(verifierListe([c], liste), []);
  assert.ok(RAISON.test(liste['case-x'][dd]));
  assert.ok(!RAISON.test('ÖGD'));
  assert.equal(verifierListe([c], { 'case-x': { [dd]: 'à voir' } }).length, 1);
  assert.equal(verifierListe([c], { 'case-x': { 'Ulkus': 'endoscopie — la ÖGD tranche' } }).length, 1);
  assert.equal(verifierListe([c], { 'case-y': { [dd]: 'histologie — biopsie' } }).length, 1);
  const neutralisee = cas(dd, ['kein Nachtschweiß (gegen Magenlymphom)']);
  assert.equal(verifierListe([neutralisee], liste).length, 1);
});

test('budget : chaque catégorie au-dessus de son plafond est une faute, une catégorie absente du budget aussi', () => {
  assert.deepEqual(verdict({ ddNonNeutralisee: 2 }, { ddNonNeutralisee: 2 }), []);
  assert.equal(verdict({ ddNonNeutralisee: 3 }, { ddNonNeutralisee: 2 }).length, 1);
  assert.equal(verdict({ reponseCourte: 1 }, {}).length, 1);
});

test('le corpus tient son budget (code de sortie 0)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./checkCaseCohesion.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.slice(-2000) + r.stderr);
});
