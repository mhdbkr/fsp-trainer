import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { vorstellungsSatz } from './PreSimulationPage';

// Revue de langue Q3 : « … der sich mit Stabile Angina pectoris… » — un diagnostic libre ne se décline pas après « mit ».
// La phrase s'arrête au patient ; le diagnostic suit à part (« Verdachtsdiagnose: … »), sans flexion.
describe('Fallvorstellung — la phrase d\'ouverture est grammaticale sur les 130 cas', () => {
  const cases = seedCases();
  it('« Herr/Frau X ist ein/eine N-jährige(r) Patient(in). » — accord du genre, aucune préposition qui régirait le diagnostic', () => {
    expect(cases).toHaveLength(130);
    for (const c of cases) {
      const s = vorstellungsSatz(c);
      const w = c.patientSheet.personalia.geschlecht === 'w';
      expect(s, c.id).toMatch(w ? /^Frau \S+ ist eine \d+-jährige Patientin\.$/ : /^Herr \S+ ist ein \d+-jähriger Patient\.$/);
      expect(s, c.id).not.toMatch(/\bmit\b|\/|der\/die|ein\/e/);
      expect(c.medicalView.verdachtsdiagnose.trim(), c.id).not.toBe('');
    }
  });
});
