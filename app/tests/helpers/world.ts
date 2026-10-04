// Le monde des tests d'invariants : le VRAI corpus (130 cas, 3 Teile), la VRAIE
// base (fake-indexeddb), la VRAIE horloge injectable. Seules les frontières
// réseau sont coupées (helpers/mocks.ts).
import { db } from '@/db/db';
import { seedCases } from '@/data/seedCases';
import { freezeAt, resetClock } from '@/lib/clock';
import type { Case, Fachbegriff, ProgramConfig, Fortschrittsmodus, Simulation, PartResult, SimTeil } from '@/db/types';
import type { Rng } from './prop';

/** Le corpus réel, allégé aux champs que le programme lit (le reste — fiches
 *  patient d'un mégaoctet — ne change aucun plan et ralentit chaque lecture). */
export const CORPUS: Case[] = seedCases().map((c) => ({
  id: c.id, name: c.name, pathology: c.pathology, specialty: c.specialty, frequency: c.frequency,
  centers: c.centers, linkedFachbegriffeIds: c.linkedFachbegriffeIds ?? [],
  ...(c.linkedFachwissenId ? { linkedFachwissenId: c.linkedFachwissenId } : {}),
} as unknown as Case));

export const TEILE: SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

export const begriffe = (n = 30): Fachbegriff[] => Array.from({ length: n }, (_, i) => ({
  id: `fb${i}`, term: `Begriff ${i}`, translationSimple: 'x', specialty: CORPUS[i % CORPUS.length].specialty,
  pathologyTags: [], centers: [], linkedCaseIds: [],
  srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' },
} as Fachbegriff));

const STORES = () => [
  db.simulations, db.progress_events, db.outbox, db.training_events, db.day_plans, db.case_progress,
  db.meta, db.cases, db.fachbegriffe,
];

/** Remet la base à neuf et y pose le corpus + des Fachbegriffe. */
export async function resetWorld(opts: { cases?: Case[]; begriffe?: number } = {}): Promise<void> {
  await Promise.all(STORES().map((t) => t.clear()));
  await db.cases.bulkPut(opts.cases ?? CORPUS);
  await db.fachbegriffe.bulkPut(begriffe(opts.begriffe ?? 30));
}

export const resetTime = () => resetClock();

/** 08:00 heure locale du jour ISO — la clé de jour de l'app est locale. */
export const morning = (iso: string, hour = 8) => new Date(`${iso}T${String(hour).padStart(2, '0')}:00:00`).getTime();
export const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Fige l'horloge au matin de `iso` et rend l'avanceur. */
export const startOn = (iso: string) => freezeAt(morning(iso));

export function randomConfig(r: Rng, over: Partial<ProgramConfig> = {}): ProgramConfig {
  const modus = r.pick<Fortschrittsmodus>(['teil-first', 'teil-first', 'cas-complet', 'specialite']);
  return {
    startDate: '2026-10-05', examDate: '2026-12-18', intensity: r.pick(['leicht', 'mittel', 'intensiv'] as never[]),
    hoursPerSession: r.pick([1, 2, 3]), offDays: [0, 6], prioritySpecialties: [], selfLevel: {},
    createdAt: 0, modus, ...over,
  } as ProgramConfig;
}

export const partResult = (score = 80, over: Partial<PartResult> = {}): PartResult => ({
  done: true, durationSec: 600, checklist: [], feeling: 70, contentPct: score, officialPct: score, ...over,
});

export const simulationOf = (id: string, caseId: string, date: number, teile: SimTeil[], score = 80, over: Partial<Simulation> = {}): Simulation => ({
  id, caseId, date, parts: Object.fromEntries(teile.map((t) => [t, partResult(score)])), notes: {},
  prioritizedCorrections: [], passed: score >= 60, assistance: 'autonome', layer: 2,
  scope: teile.length === 3 ? 'full' : 'teil', ...(teile.length === 1 ? { teil: teile[0] } : {}), ...over,
} as unknown as Simulation);
