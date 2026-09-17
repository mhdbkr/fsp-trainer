import { describe, expect, it } from 'vitest';
import { generateProgram } from './program';
import type { Case, ProgramConfig, Simulation } from '@/db/types';

// Courbe « teil-first » (FB2-P, retour direction) : le plan propose chaque
// partie seule tant qu'elle n'est pas acquise, puis passe à la complète — et se
// recalcule à partir des sessions réellement jouées.
const config: ProgramConfig = { startDate: '2026-09-14', weeks: 4, intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'teil-first' };
const c = { id: 'case-x', name: 'X', specialty: 'Kardiologie', pathology: 'p', centers: [], frequency: 5, difficulty: 'mittel', linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], examinerQuestions: [], status: 'À faire', patientSheet: { personalia: { name: 'X', age: 40 } }, medicalView: {} } as unknown as Case;
const blocks = (sims: Simulation[], cfg = config) => generateProgram(cfg, { cases: [c], sims, begriffe: [] }, 30, new Date('2026-09-14T08:00:00')).flatMap((d) => d.blocks).filter((b) => b.caseId === 'case-x' && b.kind === 'simulation');
const done = (pct: number) => ({ done: true, durationSec: 60, checklist: [], feeling: pct, contentPct: pct, officialPct: pct, languageGrid: {} as never });

describe('programme — courbe par parties', () => {
  it('sans session : Anamnese seule, puis Dokumentation, puis Fallvorstellung, puis la complète', () => {
    const b = blocks([]);
    expect(b.slice(0, 3).map((x) => x.teil)).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(b[3].teil).toBeUndefined();
    expect(b[3].layer).toBe(1);
  });
  it('une Anamnese seule acquise (≥ 60 %) fait passer le plan à la Dokumentation', () => {
    const sim: Simulation = { id: 's', caseId: 'case-x', date: Date.parse('2026-09-13'), scope: 'teil', teil: 'anamnese', parts: { anamnese: done(80) }, notes: {}, prioritizedCorrections: [] };
    const b = blocks([sim]);
    expect(b[0].teil).toBe('dokumentation');
    expect(b.some((x) => x.teil === 'anamnese')).toBe(false);
  });
  it('courbe « complète d’emblée » : pas de partie seule planifiée', () => {
    expect(blocks([], { ...config, strategy: 'full' }).every((x) => !x.teil)).toBe(true);
  });
});
