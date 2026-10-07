// node --test scripts/checkGeburtsdatum.test.mjs — la garde lit la date sous ses trois formes, rougit sur chaque écart, et le corpus passe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REFERENZDATUM, alterAm, checkCase, parseFeld, parseReplik } from './checkGeburtsdatum.mjs';

const fall = (age, gd, replik, einleitung, id = 'case-x') => ({
  id,
  patientSheet: { personalia: { age, geburtsdatum: gd }, antworten: { 'pers-alter': replik } },
  musterSaetze: { arztbrief: { einleitung } },
});
const sain = fall(61, '01.03.1965', 'Ich bin 61 Jahre alt, geboren am 1. März 1965.', 'über Herrn X, geboren am 01.03.1965, einen 61-jährigen Patienten');

test('REFERENZDATUM est une date ISO unique, au jour du lot', () => {
  assert.equal(REFERENZDATUM, '2026-10-07');
});

test('âge révolu : anniversaire passé ou non à la date de référence', () => {
  assert.equal(alterAm({ t: 7, m: 10, j: 1960 }), 66); // le jour même
  assert.equal(alterAm({ t: 8, m: 10, j: 1960 }), 65); // demain
  assert.equal(alterAm({ t: 3, m: 11, j: 1953 }), 72);
});

test('le champ exige JJ.MM.AAAA et une date réelle', () => {
  assert.deepEqual(parseFeld('01.03.1962'), { t: 1, m: 3, j: 1962 });
  for (const s of ['1.3.1962', '31.02.1970', '', undefined]) assert.equal(parseFeld(s), null, String(s));
});

test('la réplique se lit en chiffres comme en toutes lettres', () => {
  assert.deepEqual(parseReplik('Ich bin 61, geboren am 1. März 1962.'), [{ t: 1, m: 3, j: 1962 }]);
  assert.deepEqual(parseReplik('geboren am zwölften März 1947'), [{ t: 12, m: 3, j: 1947 }]);
  assert.deepEqual(parseReplik('geboren am vierzehnten März neunzehnhundertneunundsiebzig'), [{ t: 14, m: 3, j: 1979 }]);
  assert.deepEqual(parseReplik('Geboren am einunddreißigsten Mai zweitausend.'), [{ t: 31, m: 5, j: 2000 }]);
  assert.deepEqual(parseReplik('Ich bin 61 Jahre alt.'), []);
  // revue langue S3 : « Geboren bin ich am … » et l'année abrégée d'une personne âgée
  assert.deepEqual(parseReplik('Geboren bin ich am 17. Januar 1994.'), [{ t: 17, m: 1, j: 1994 }]);
  assert.deepEqual(parseReplik('Geboren am elften Juni sechsunddreißig.'), [{ t: 11, m: 6, j: 1936 }], 'année abrégée → la plus récente non postérieure à REFERENZDATUM');
  assert.deepEqual(parseReplik('geboren am 3. Mai zwanzig'), [{ t: 3, m: 5, j: 2020 }]);
});

test('le sain passe', () => assert.deepEqual(checkCase(sain), []));

test('âge incohérent avec REFERENZDATUM → rouge', () => {
  const c = fall(61, '01.03.1962', 'Ich bin 61, geboren am 1. März 1962.', 'geboren am 01.03.1962');
  assert.equal(checkCase(c).length, 1);
});

test('date absente du champ, de la réplique ou de l’Arztbrief → rouge', () => {
  assert.equal(checkCase(fall(61, undefined, 'x', 'y')).length, 1);
  assert.equal(checkCase(fall(61, '01.03.1965', 'Ich bin 61 Jahre alt.', 'geboren am 01.03.1965')).length, 1);
  assert.equal(checkCase(fall(61, '01.03.1965', 'geboren am 1. März 1965', 'einen 61-jährigen Patienten')).length, 1);
});

test('date divergente entre champ, réplique et Arztbrief → rouge', () => {
  assert.equal(checkCase(fall(61, '01.03.1965', 'geboren am 2. März 1965', 'geboren am 01.03.1965')).length, 1);
  assert.equal(checkCase(fall(61, '01.03.1965', 'geboren am 1. März 1965', 'geboren am 01.03.1964')).length, 1);
});

test('l’exception de réplique ne dispense ni du champ ni de l’Arztbrief', () => {
  const c = fall(83, '08.03.1943', 'Geboren bin ich im März.', 'Herrn X, 83 Jahre alt', 'case-demenz');
  assert.deepEqual(checkCase(c), ['arztbrief.einleitung sans « geboren am JJ.MM.AAAA »']);
});

test('aucune date calendaire dans les Muster (Arztbrief, Vorstellung) hors date de naissance', () => {
  const avecDate = (sec, k, v) => ({ ...sain, musterSaetze: { arztbrief: { ...sain.musterSaetze.arztbrief }, vorstellung: {}, [sec]: { ...(sec === 'arztbrief' ? sain.musterSaetze.arztbrief : {}), [k]: v } } });
  assert.deepEqual(checkCase(avecDate('arztbrief', 'einleitung', 'Herrn X, geboren am 01.03.1965, der sich am 15.06.2021 vorstellte')), ['arztbrief.einleitung : date calendaire « 15.06.2021 » (seule la date de naissance est admise)']);
  assert.equal(checkCase(avecDate('arztbrief', 'diagnostik', 'Blutbild vom 3.9.2026')).length, 1);
  assert.equal(checkCase(avecDate('vorstellung', 'persoenliche-daten', 'der sich am 07.11.2024 vorgestellt hat')).length, 1);
  assert.deepEqual(checkCase(avecDate('arztbrief', 'diagnostik', 'Kontrolle in 3 Monaten, Hb 11.4 g/dl')), []);
});

test('pas d’« Aufnahmetag » dans une einleitung ambulatoire (Sprechstunde, Ambulanz), sauf admission listée', () => {
  const avec = (e, id = 'case-x') => ({ ...sain, id, musterSaetze: { arztbrief: { einleitung: e } } });
  assert.deepEqual(checkCase(avec('Herrn X, geboren am 01.03.1965, der sich am Aufnahmetag in unserer Ambulanz vorstellte')), ['arztbrief.einleitung : « am Aufnahmetag » pour une consultation en Sprechstunde/Ambulanz (→ « am heutigen Tag »)']);
  assert.deepEqual(checkCase(avec('Herrn X, geboren am 01.03.1965, der sich am heutigen Tag in unserer Sprechstunde vorstellte')), []);
  assert.deepEqual(checkCase(avec('Herrn X, geboren am 01.03.1965, der sich am Aufnahmetag in unserer Notaufnahme vorstellte')), []);
  assert.deepEqual(checkCase(avec('Herrn X, geboren am 01.03.1965, der sich am Aufnahmetag in unserer Ambulanz vorstellte', 'case-itp')), []);
  assert.equal(checkCase(avec('Herrn X, geboren am 01.03.1965, der sich am heutigen Tage vorstellte')).length, 1, '« am heutigen Tage » → « am heutigen Tag »');
});

test('le corpus passe (code de sortie 0)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./checkGeburtsdatum.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout.split('\n').slice(-3).join('\n') + r.stderr);
});
