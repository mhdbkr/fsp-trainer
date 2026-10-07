import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { ersterSatz, vorstellungsDiagnose, vorstellungsSatz } from './PreSimulationPage';

// Revue de langue Q3 : « … der sich mit Stabile Angina pectoris… » — un diagnostic libre ne se décline pas après « mit ».
// La phrase s'arrête au patient ; le diagnostic suit à part (« Verdachtsdiagnose: … »), sans flexion, et seulement sa
// première phrase (décision de main) ; la ligne rendue tient en 200 caractères.
const cases = seedCases();
const zeile = (c: (typeof cases)[number]) => {
  const d = vorstellungsDiagnose(c);
  return `${vorstellungsSatz(c)} Verdachtsdiagnose: ${d.text}${d.offen ? '…' : ''}`;
};

describe('Fallvorstellung — la phrase d\'ouverture, sur les 130 cas', () => {
  it('« Herr/Frau X ist ein/eine N-jährige(r) Patient(in). » — accord du genre, aucune préposition qui régirait le diagnostic', () => {
    expect(cases).toHaveLength(130);
    for (const c of cases) {
      const s = vorstellungsSatz(c);
      const w = c.patientSheet.personalia.geschlecht === 'w';
      expect(s, c.id).toMatch(w ? /^Frau \S+ ist eine \d+-jährige Patientin\.$/ : /^Herr \S+ ist ein \d+-jähriger Patient\.$/);
      expect(s, c.id).not.toMatch(/\bmit\b|\/|der\/die|ein\/e/);
    }
  });
  it('le diagnostic : un début de la Verdachtsdiagnose, jamais coupé après une abréviation ; la ligne fait au plus 200 caractères', () => {
    for (const c of cases) {
      const d = vorstellungsDiagnose(c);
      expect(zeile(c).length, c.id).toBeLessThanOrEqual(200);
      expect(c.medicalView.verdachtsdiagnose.trim().startsWith(d.text), c.id).toBe(true);
      expect(d.text.length, c.id).toBeGreaterThan(10);
      expect(d.text, c.id).not.toMatch(/(?:^|[\s(])(?:[A-Za-zÄÖÜ]|\d+|ca|bzw)\.$/);
      if (!d.offen) expect(d.text, c.id).toMatch(/[.!?]$/);   // une phrase complète, sans « … »
      expect(d.text, c.id).not.toMatch(/\s(?:der|die|das|des|dem|den|und|oder|mit|von|bei|einer|eines)$/);   // jamais coupé sur un mot-outil
      expect((d.text.match(/\(/g) ?? []).length, c.id).toBe((d.text.match(/\)/g) ?? []).length);   // aucune parenthèse laissée ouverte
    }
  });
  // Lc2 à Lc4 (FB3-G7), puis le lot VD : sur les 130 cas, la phrase prononcée tient entière et se dit à voix haute —
  // ni « … », ni « Patient(in) » redit après l'amorce, ni code de classification (ICD, ICHD, F32.2), ni abréviation
  // écrite, ni symbole.
  it('la phrase de Fallvorstellung tient entière et se dit à voix haute', () => {
    const fautes = cases.flatMap((c) => {
      const d = ersterSatz(c.medicalView.verdachtsdiagnose);
      return [
        vorstellungsDiagnose(c).offen && 'coupée',
        /Patient/.test(d) && 'Patient',
        /\b(?:ICD|ICHD|DSM)\b|\b[A-Z]\d{2}\.\d|\bF\d{2}\b/.test(d) && 'code',
        /Z\. ?n\.|i\. ?v\.|bzw\.|z\. ?B\.|ggf\.|evtl\.|[=<>]/.test(d) && 'abréviation ou symbole',
      ].filter(Boolean).map((f) => `${c.id} : ${f}`);
    });
    expect(fautes).toEqual([]);
  });
  it('ersterSatz : coupe au premier point de fin de phrase, pas après « Z. », « A. », « ca. », « (31. »', () => {
    expect(ersterSatz('Ulcus ventriculi. Zweiter Satz.')).toBe('Ulcus ventriculi.');
    expect(ersterSatz('Pneumonie bei Risikoprofil (Diabetes, Z. n. Splenektomie). Weiteres.')).toBe('Pneumonie bei Risikoprofil (Diabetes, Z. n. Splenektomie).');
    expect(ersterSatz('Schlaganfall im Gebiet der A. cerebri media links. Rest.')).toBe('Schlaganfall im Gebiet der A. cerebri media links.');
    expect(ersterSatz('Adipositas (BMI ca. 34). Rest.')).toBe('Adipositas (BMI ca. 34).');
    expect(ersterSatz('Stabile Angina pectoris')).toBe('Stabile Angina pectoris');
  });
});
