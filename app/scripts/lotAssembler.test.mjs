// L'assembleur garde ce que l'étape « cohérence » exige (revue K5, I1) : un champ de la fiche absent de la whitelist
// `SHEET` disparaît en silence à l'assemblage — le profil déclaré par l'auteur n'arriverait jamais à la porte (INV-80).
// Usage : node --test scripts/lotAssembler.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const assemble = (raw) => {
  const py = `import json,sys\nfrom lotAssembler import norm_case\nprint(json.dumps(norm_case(json.loads(sys.stdin.read()))))`;
  const r = spawnSync('python3', ['-c', py], { cwd: dir, input: JSON.stringify(raw), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

test('I1 : profil, aktuellSkip, fachSkip, leitsymptomKategorie et motiv survivent à l\'assemblage ; un champ inventé non', () => {
  const sheet = {
    personalia: { name: 'X', age: 40 }, leitsymptomKategorie: 'neurologisch', motiv: { trauma: true, region: 'obere' },
    profil: { tags: ['neurologisch', 'sturz'], exclut: { ausstrahlung: 'raison' } }, aktuellSkip: ['akt-ort'], fachSkip: ['fach-neuro-aura'],
    invente: 'x',
  };
  const q = { frage: 'Sind Sie gestürzt?', kapitel: 'aktuell', sucht: ['sturz'], braucht: ['beginn'] };
  const c = assemble({ case: { id: 'case-x', name: 'X', patientSheet: sheet, caseSpecificQuestions: [q] } });
  for (const k of ['profil', 'aktuellSkip', 'fachSkip', 'leitsymptomKategorie', 'motiv']) assert.deepEqual(c.patientSheet[k], sheet[k], k);
  assert.equal(c.patientSheet.invente, undefined, 'la whitelist reste stricte');
  assert.deepEqual(c.caseSpecificQuestions, [q], 'sucht et braucht des questions du cas passent');
});
