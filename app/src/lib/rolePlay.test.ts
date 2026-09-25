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
  it('sans questions du cas, le script est inchangé', () => {
    expect(buildRollenskript(sheet).every((c) => c.lines.every((l) => !l.improvise))).toBe(true);
  });
});
