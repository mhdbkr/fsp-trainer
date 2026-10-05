import { describe, expect, it } from 'vitest';
import { buildRollenskript } from './rolePlay';
import type { CaseQuestion, PatientSheet } from '@/db/types';

// FB2-J8 : le simulant doit VOIR les questions propres au cas dans son
// chapitre, même sans réplique écrite — sinon il reste muet quand elles arrivent.
const sheet = {
  personalia: { name: 'X', age: 40 }, leitsymptome: ['Bauchschmerzen'], begleitsymptome: [], vegetativeAnamnese: [],
  vorerkrankungen: [], voroperationen: [], medikamente: ['Ibuprofen'], allergien: [], noxen: {}, familienanamnese: [], sozialanamnese: [],
  antworten: { 'akt-motiv': 'Ich habe Bauchschmerzen.' },
} as unknown as PatientSheet;

describe('Rollenskript — questions du cas', () => {
  it('range chaque question dans son chapitre, marquée à improviser', () => {
    const qs: CaseQuestion[] = [{ frage: 'Nehmen Sie Blutverdünner?', kapitel: 'medikamente' }];
    const ch = buildRollenskript(sheet, qs).find((c) => c.id === 'medikamente')!;
    const line = ch.lines.find((l) => l.frage === 'Nehmen Sie Blutverdünner?')!;
    expect(line.improvise).toBe(true);
    expect(line.antwort).toBe('');
  });
  it('Q0 : la relance de la question du cas suit sur la ligne (nachfrage)', () => {
    const qs: CaseQuestion[] = [{ frage: 'Nehmen Sie Blutverdünner?', kapitel: 'medikamente', followUp: 'Falls ja: Welche, und seit wann?' }];
    const ch = buildRollenskript(sheet, qs).find((c) => c.id === 'medikamente')!;
    expect(ch.lines.find((l) => l.frage === 'Nehmen Sie Blutverdünner?')!.nachfrage).toBe('Falls ja: Welche, und seit wann?');
  });
  it('Q0 : sans relance, pas de nachfrage', () => {
    const qs: CaseQuestion[] = ['Haben Sie Fieber?'];
    const lines = buildRollenskript(sheet, qs).flatMap((c) => c.lines);
    expect(lines.find((l) => l.frage === 'Haben Sie Fieber?')!.nachfrage).toBeUndefined();
  });
  it('Q2 : une réponse écrite (frageAntworten au texte exact) remplace la ligne à improviser et garde la relance', () => {
    const frage = 'Wissen Sie Ihre Blutgruppe?';
    const withAnswer = { ...sheet, frageAntworten: [{ frage, antwort: 'Ja, A positiv.', kapitel: 'medikamente' }] } as unknown as PatientSheet;
    const qs: CaseQuestion[] = [{ frage, kapitel: 'medikamente', followUp: 'Falls ja: Seit wann?' }];
    const lines = buildRollenskript(withAnswer, qs).flatMap((c) => c.lines).filter((l) => l.frage === frage);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ antwort: 'Ja, A positiv.', nachfrage: 'Falls ja: Seit wann?' });
    expect(lines[0].improvise).toBeUndefined();
  });
  it('sans questions du cas, le script est inchangé', () => {
    expect(buildRollenskript(sheet).every((c) => c.lines.every((l) => !l.improvise))).toBe(true);
  });
});

// Q-gyn (revue m1) : quand la Frauenanamnese est fondue dans la Fach gynéco, le
// simulant retrouve SES répliques dans l'onglet « Fachanamnese », en tête, dans
// l'ordre où le médecin les pose — pas dans un onglet Frauenanamnese à la fin.
describe('Rollenskript — Frauenanamnese fondue dans la Fach', () => {
  const gyn = {
    ...sheet,
    antworten: {
      'akt-motiv': 'Ich habe Unterbauchschmerzen.',
      'fach-gyn-blutung': 'Die Blutung ist stark.', 'fach-gyn-brust': 'Nichts an der Brust.',
      'frau-periode': 'Alle 28 Tage.', 'frau-schwanger': 'Nein.', 'frau-verhuetung': 'Die Pille.',
    },
  } as unknown as PatientSheet;
  const qs: CaseQuestion[] = [{ frage: 'Haben Sie bereits einen Schwangerschaftstest gemacht?', kapitel: 'frauenanamnese' }];

  it('par défaut : un onglet Frauenanamnese à part (inchangé)', () => {
    const ch = buildRollenskript(gyn, qs);
    expect(ch.find((c) => c.id === 'frauenanamnese')!.lines.map((l) => l.probeId ?? 'cas')).toEqual(['frau-periode', 'frau-schwanger', 'frau-verhuetung', 'cas']);
    expect(ch.find((c) => c.id === 'fach')!.lines.map((l) => l.probeId)).toEqual(['fach-gyn-blutung', 'fach-gyn-brust']);
  });
  it('frauInFach : plus d’onglet Frauenanamnese ; ses lignes ouvrent l’onglet Fach, dans l’ordre', () => {
    const ch = buildRollenskript(gyn, qs, true);
    expect(ch.some((c) => c.id === 'frauenanamnese')).toBe(false);
    expect(ch.find((c) => c.id === 'fach')!.lines.map((l) => l.probeId ?? 'cas'))
      .toEqual(['frau-periode', 'frau-schwanger', 'frau-verhuetung', 'cas', 'fach-gyn-blutung', 'fach-gyn-brust']);
  });
});
