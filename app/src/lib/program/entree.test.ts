// Revue S4-2 m5 : les instants du journal se comparent par Date.parse, jamais comme chaînes — le serveur renvoie
// `+00:00`, le client écrit `…Z` : à la seconde près de la coupure, l'ordre lexical ment.
import { describe, it, expect } from 'vitest';
import type { Fachbegriff, Srs } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { refusRythme } from '@/lib/sync/configProjetee';
import { begriffeAvant } from './entree';

const COUPURE = Date.parse('2026-10-11T22:00:00.000Z');
const serveur = (ms: number) => new Date(ms).toISOString().replace('.000Z', '+00:00');   // « 2026-10-11T22:00:00+00:00 »
const srs: Srs = { interval: 3, easeFactor: 2.5, dueDate: 0, repetitions: 1, lapses: 0, state: 'Gelernt' };
const ev = (o: Partial<ProgressEvent>): ProgressEvent => ({ id: Math.random().toString(36), user_id: 'u', type: 'srs.reviewed', subject_id: 'fb1', payload: srs, occurred_at: '', ...o });

describe('m5 — Date.parse, jamais l’ordre des chaînes', () => {
  it('une révision horodatée par le serveur PILE à la coupure n’est pas « avant »', () => {
    const [b] = begriffeAvant([{ id: 'fb1' } as Fachbegriff], [ev({ occurred_at: serveur(COUPURE) })], COUPURE);
    expect(b.srs?.state, 'la révision du jour D compte pour la veille').not.toBe('Gelernt');
    const [a] = begriffeAvant([{ id: 'fb1' } as Fachbegriff], [ev({ occurred_at: serveur(COUPURE - 1000) })], COUPURE);
    expect(a.srs?.state).toBe('Gelernt');
  });
  it('refus de rythme : un refus APRÈS la config, horodaté au format Postgres (« 2026-10-12 08:00:01+00 »), compte bien', () => {
    const config = ev({ type: 'program.configured', subject_id: null, payload: { startDate: '2026-09-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6] }, occurred_at: '2026-10-12T08:00:00.000Z' });
    const refus = ev({ type: 'rythme.refused', subject_id: '2026-W42', payload: {}, occurred_at: '2026-10-12 08:00:01+00' });   // une seconde APRÈS
    expect(refusRythme([config, refus]).depuisDerniereConfig).toBe(1);
  });
});
