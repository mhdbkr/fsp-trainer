import { describe, it, expect } from 'vitest';
import type { TrainingEvent } from '@/db/types';
import { bilanErreurs } from './bilanErreurs';

// training-journal.md §13.3, « Sortie, bilan » : « cochée cette fois » ou « encore manquée (n/5) ».
// Le signal (≥ 3 manques sur les 5 dernières, sur ≥ 2 cas) est celui du journal ANTÉRIEUR à la partie.

const ev = (i: number, caseId: string, manquees: string[], over: Partial<TrainingEvent> = {}): TrainingEvent => ({
  id: `te-s${i}`, at: 1_000 * i, kind: 'simulation', caseId, teile: ['anamnese'], source: 'libre', spentMin: 20,
  laufId: `s${i}`, scores: { anamnese: 70 }, manques: { anamnese: manquees }, ...over,
} as TrainingEvent);

const passe = [ev(1, 'a', ['anam-allergien']), ev(2, 'b', ['anam-allergien']), ev(3, 'a', ['anam-allergien', 'anam-noxen']), ev(4, 'c', [])];

describe('bilanErreurs — la sortie « bilan » des erreurs transversales', () => {
  it('l’item manqué d’habitude, coché cette fois : « cochée cette fois »', () => {
    const lignes = bilanErreurs([...passe, ev(5, 'd', [])], 's5');
    expect(lignes).toEqual([expect.objectContaining({ teil: 'anamnese', item: 'anam-allergien', cochee: true, libelle: 'Allergien inkl. Medikamentenallergien' })]);
  });

  it('encore manqué : n/5 compte cette partie', () => {
    const [l] = bilanErreurs([...passe, ev(5, 'd', ['anam-allergien'])], 's5');
    expect(l).toMatchObject({ cochee: false, manques: 4, sur: 5 });
  });

  it('pas de signal avant la partie, ou Teil non joué avec checklist : rien', () => {
    expect(bilanErreurs([ev(1, 'a', ['anam-allergien']), ev(2, 'b', [])], 's2')).toEqual([]);
    expect(bilanErreurs([...passe, ev(5, 'd', [], { manques: undefined })], 's5')).toEqual([]);
  });

  it('rouvert plus tard : les parties POSTÉRIEURES ne changent pas le bilan de celle-ci', () => {
    const ensuite = [ev(6, 'e', ['anam-allergien', 'anam-noxen']), ev(7, 'f', ['anam-allergien', 'anam-noxen'])];   // un signal NOUVEAU (noxen) après coup
    expect(bilanErreurs([...passe, ev(5, 'd', []), ...ensuite], 's5')).toEqual(bilanErreurs([...passe, ev(5, 'd', [])], 's5'));
  });
});

describe('vientDeSouder (fixeur M2) — la soudure de CETTE partie, pas d’une plus ancienne', () => {
  it('égalité stricte entre pretAt et la date de la partie', async () => {
    const { vientDeSouder } = await import('./bilanErreurs');
    expect(vientDeSouder({ etat: 'pret', pretAt: 5 }, { date: 5 })).toBe(true);
    expect(vientDeSouder({ etat: 'pret', pretAt: 9 }, { date: 5 })).toBe(false);    // soudé par une partie POSTÉRIEURE
    expect(vientDeSouder({ etat: 'solide', pretAt: 5 }, { date: 5 })).toBe(false);
  });
});
