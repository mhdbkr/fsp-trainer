import { describe, it, expect } from 'vitest';
import type { Case, PartResult, Simulation, TaskInstance } from '@/db/types';
import { computeLayerAdvice } from '@/lib/layerAdvice';
import { couchePour, niveauDeDepart } from './niveau';

// Fixeur S4-3, I2 (décision de main) : le niveau d'assistance de la pré-simulation.
//   · une tâche qui prescrit un niveau l'emporte, et sa raison s'affiche ;
//   · sinon, au moins un passage : le conseil est présélectionné, avec une raison — jamais le mot « couche » ;
//   · 0 passage : le dernier choix du candidat, sans badge ;
//   · M7 : la couche écrite se DÉDUIT du niveau choisi.

const c = (layerProgress?: 1 | 2 | 3) => ({ id: 'c1', ...(layerProgress ? { layerProgress } : {}) } as Case);
const part = (score: number): PartResult => ({ done: true, durationSec: 60, checklist: [], feeling: score, contentPct: score, officialPct: score, languageGrid: { aussprache: 5 * score / 100, wortschatz: 5 * score / 100, grammatik: 5 * score / 100, redefluss: 5 * score / 100, kommunikation: 5 * score / 100 } });
const sim = (i: number, score: number, assistance: 'assiste' | 'autonome', layer: 1 | 2 | 3 = 1): Simulation => ({
  id: `s${i}`, caseId: 'c1', date: i, parts: { anamnese: part(score) }, notes: {}, prioritizedCorrections: [],
  passed: score >= 60, assistance, layer,
} as Simulation);
const depart = (sims: Simulation[], courant: 'assiste' | 'autonome' = 'autonome', tache?: Partial<TaskInstance>, layerProgress?: 1 | 2 | 3) =>
  niveauDeDepart({ advice: computeLayerAdvice(c(layerProgress), sims), sims, caseId: 'c1', courant, tache: tache as TaskInstance | undefined, layerProgress });

describe('niveauDeDepart — qui choisit le niveau, et pourquoi', () => {
  it('la tâche prescrit : son niveau l’emporte, sa raison est dite', () => {
    const n = depart([], 'assiste', { assistance: 'autonome', reason: 'Répétition générale : conditions réelles, sans aide.' });
    expect(n).toEqual({ assistance: 'autonome', raison: 'Répétition générale : conditions réelles, sans aide.', conseil: 'autonome' });
  });

  it('0 passage, sans tâche : le dernier choix du candidat, sans badge ni raison', () => {
    expect(depart([], 'autonome')).toEqual({ assistance: 'autonome', raison: null, conseil: null });
    expect(depart([], 'assiste')).toEqual({ assistance: 'assiste', raison: null, conseil: null });
  });

  it('dernier essai raté : consolide en Assisté', () => {
    expect(depart([sim(1, 40, 'autonome')])).toMatchObject({ assistance: 'assiste', conseil: 'assiste', raison: 'Dernier essai à 40 % : consolide en Assisté.' });
  });
  it('réussi en Assisté : passe en Autonome', () => {
    expect(depart([sim(1, 70, 'assiste')], 'assiste')).toMatchObject({ assistance: 'autonome', raison: 'Réussi en Assisté (70 %) : passe en Autonome.' });
  });
  it('≥ 80 en Autonome : continue sans filet', () => {
    expect(depart([sim(1, 85, 'autonome', 2)])).toMatchObject({ assistance: 'autonome', raison: '85 % en Autonome : continue sans filet.' });
  });
  it('déjà maîtrisé : entretiens-le en Autonome', () => {
    expect(depart([sim(1, 90, 'autonome', 3)], 'assiste', undefined, 3)).toMatchObject({ assistance: 'autonome', raison: 'Déjà maîtrisé (meilleur 90 %) : entretiens-le en Autonome.' });
  });
  it('réussi entre 60 et 79 en Autonome : encore un passage, vise 80 %', () => {
    expect(depart([sim(1, 70, 'autonome', 2)])).toMatchObject({ assistance: 'autonome', raison: 'Réussi à 70 % : encore un passage en Autonome, vise 80 %.' });
  });
  it('aucune raison ne dit « couche »', () => {
    for (const s of [[sim(1, 40, 'autonome')], [sim(1, 70, 'assiste')], [sim(1, 85, 'autonome', 2)], [sim(1, 70, 'autonome', 2)]]) {
      expect(depart(s).raison ?? '').not.toMatch(/couche/i);
    }
  });
});

describe('M7 — la couche se déduit du niveau choisi', () => {
  const advice = (layer: 1 | 2 | 3) => ({ layer, reason: '', attempts: 1, bestScore: null, lastScore: null, suggestAutonome: false });
  it('Assisté ⇒ couche 1, quel que soit le conseil', () => {
    expect(couchePour('assiste', advice(3))).toBe(1);
  });
  it('Autonome ⇒ au moins la couche 2, ou la couche conseillée si elle est plus haute', () => {
    expect(couchePour('autonome', advice(1))).toBe(2);
    expect(couchePour('autonome', advice(3))).toBe(3);
  });
  it('une tâche qui prescrit sa couche la donne', () => {
    expect(couchePour('autonome', advice(1), { layer: 3 } as TaskInstance)).toBe(3);
  });
});
