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

// Item 12 (revue du site) : la fiche et l'export suivent la trame JOUÉE du cas.
describe('Rollenskript — trame jouée', () => {
  const s = { ...sheet, antworten: { 'akt-motiv': 'Ich habe Bauchschmerzen.', 'frau-wechseljahre': 'Noch nicht.', 'veg-uebelkeit': 'Mir ist übel.' } } as unknown as PatientSheet;
  const played = new Map([['akt-motiv', 'Was führt Sie heute zu uns?']]);
  const lines = (qs: CaseQuestion[] = []) => buildRollenskript(s, qs, played).flatMap((c) => c.lines);
  it('pose la question jouée, et garde sans question la réplique d’une sonde non posée', () => {
    expect(lines().find((l) => l.probeId === 'akt-motiv')!.frage).toBe('Was führt Sie heute zu uns?');
    const w = lines().find((l) => l.probeId === 'frau-wechseljahre')!;
    expect(w.frage).toBeUndefined();
    expect(w.antwort).toBe('Noch nicht.');
  });
  it('la question du cas qui remplace une sonde (`sucht`) en reprend la réplique', () => {
    const q: CaseQuestion = { frage: 'War Blut im Erbrochenen?', kapitel: 'aktuell', sucht: ['uebelkeit'] };
    const l = lines([q]).find((x) => x.frage === 'War Blut im Erbrochenen?')!;
    expect(l.antwort).toBe('Mir ist übel.');
    expect(l.improvise).toBeUndefined();
    expect(lines([q]).some((x) => x.probeId === 'veg-uebelkeit')).toBe(false);
  });
});
