import { describe, it, expect } from 'vitest';
import type { Case, SimTeil, TrainingEvent, TrainingKind } from '@/db/types';
import { observeModus, modusAProposer, MIN_SEANCES } from './modus';

let seq = 0;
const ev = (over: Partial<TrainingEvent> = {}): TrainingEvent => ({
  id: `te-${seq++}`, at: 1_000 + seq * 1_000, kind: 'simulation' as TrainingKind,
  caseId: 'c1', teile: ['anamnese'] as SimTeil[], source: 'libre', spentMin: 20, scores: {},
  ...over,
});

const cas = (id: string, specialty: Case['specialty']): Case =>
  ({ id, specialty, name: id, pathology: id } as Case);

const CASES = [
  cas('c1', 'Kardiologie'), cas('c2', 'Kardiologie'), cas('c3', 'Kardiologie'),
  cas('c4', 'Neurologie'), cas('c5', 'Pneumologie'),
];

describe('observeModus — le mode se déduit du journal, il ne se demande pas', () => {
  it('se tait en dessous de trois séances : un échantillon n’est pas une habitude', () => {
    const deux = [ev({ caseId: 'c1' }), ev({ caseId: 'c2' })];
    expect(observeModus(deux, CASES)).toBeNull();
    expect(deux.length).toBeLessThan(MIN_SEANCES);
  });

  it('« par partie » : la MÊME partie, sur des cas DIFFÉRENTS', () => {
    const j = ['c1', 'c2', 'c3', 'c4'].map((caseId) => ev({ caseId, teile: ['anamnese'] }));
    expect(observeModus(j, CASES)).toBe('teil-first');
  });

  it('refuse « par partie » quand c’est la même partie du MÊME cas — c’est de l’acharnement, pas une progression', () => {
    const j = [0, 1, 2, 3].map(() => ev({ caseId: 'c1', teile: ['anamnese'] }));
    expect(observeModus(j, CASES)).not.toBe('teil-first');
  });

  it('« cas complet » : la séance couvre les trois parties', () => {
    const j = ['c1', 'c2', 'c3'].map((caseId) =>
      ev({ caseId, teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }));
    expect(observeModus(j, CASES)).toBe('cas-complet');
  });

  it('« examen blanc » : le genre porte déjà l’information', () => {
    const j = ['c1', 'c2', 'c3'].map((caseId) =>
      ev({ caseId, kind: 'examen-blanc', teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }));
    expect(observeModus(j, CASES)).toBe('examen-blanc');
  });

  it('« spécialité » : le cap reste dans le même système, parties mélangées', () => {
    const j: TrainingEvent[] = [
      ev({ caseId: 'c1', teile: ['anamnese'] }),
      ev({ caseId: 'c2', teile: ['dokumentation'] }),
      ev({ caseId: 'c3', teile: ['fallvorstellung'] }),
      ev({ caseId: 'c1', teile: ['dokumentation'] }),
    ];
    expect(observeModus(j, CASES)).toBe('specialite');
  });

  it('se tait quand rien ne domine — ne rien proposer vaut mieux que proposer au hasard', () => {
    const j: TrainingEvent[] = [
      ev({ caseId: 'c1', teile: ['anamnese'] }),
      ev({ caseId: 'c4', teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }),
      ev({ caseId: 'c5', teile: ['dokumentation'] }),
      ev({ caseId: 'c4', teile: ['fallvorstellung'] }),
    ];
    expect(observeModus(j, CASES)).toBeNull();
  });

  it('une séance auto-déclarée (IA externe) ne vote pas : elle ne dit rien de fiable sur la FORME', () => {
    const declarees = ['c1', 'c2', 'c3', 'c4'].map((caseId) =>
      ev({ caseId, teile: ['anamnese'], selbstbewertet: true }));
    expect(observeModus(declarees, CASES)).toBeNull();
  });

  it('ne regarde que les séances récentes : un mode abandonné ne se propose plus', () => {
    const vieux = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) =>
      ev({ caseId: `c${(i % 3) + 1}`, teile: ['anamnese', 'dokumentation', 'fallvorstellung'] }));
    const recent = ['c1', 'c2', 'c3', 'c4', 'c5'].map((caseId) => ev({ caseId, teile: ['dokumentation'] }));
    // Malgré 9 séances « cas complet » en amont, la fenêtre récente tranche.
    expect(observeModus([...vieux, ...recent], CASES)).toBe('teil-first');
  });
});

describe('modusAProposer — trois raisons de se taire', () => {
  it('rien d’observé ⇒ rien à proposer', () => {
    expect(modusAProposer(null, 'teil-first', null)).toBeNull();
  });
  it('le mode observé est DÉJÀ celui du programme ⇒ pas de question', () => {
    expect(modusAProposer('teil-first', 'teil-first', null)).toBeNull();
  });
  it('le candidat a déjà refusé CE mode ⇒ on ne le repropose pas', () => {
    expect(modusAProposer('cas-complet', 'teil-first', 'cas-complet')).toBeNull();
  });
  it('un refus ne vaut que pour le mode refusé : un autre mode redevient légitime', () => {
    expect(modusAProposer('specialite', 'teil-first', 'cas-complet')).toBe('specialite');
  });
});
