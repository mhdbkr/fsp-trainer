// ============================================================================
// L'ENTRÉE du plan d'un jour — et rien d'autre (training-journal.md §12.4 · ADR-0021 I1 · INV-55).
//
// Le plan du jour D ne dépend que de ce qui PRÉCÈDE ce jour :
//
//     J_D      = les événements d'occurred_at < debutJour(D)   (journal, plans, SRS, config)
//     journal  = projectTrainingEvents(J_D)
//     progress = computeCaseProgress(journal)         JAMAIS db.case_progress (qui contient le jour D)
//     srs      = le dernier srs.reviewed de chaque carte dans J_D
//     config   = le dernier program.configured VALIDE de J_D, sinon le PREMIER du jour D (jour de création)
//
// Deux appareils qui ont le même journal antérieur — et le même contenu publié (limite connue m-a) — produisent
// donc le même plan, quel que soit l'instant de matérialisation dans la journée. Cette fonction est PURE : elle ne lit
// ni la base ni l'horloge.
// ============================================================================

import type { Case, CaseProgress, Fachbegriff, ProgramConfig, Srs, TrainingEvent } from '@/db/types';
import { projectTrainingEvents } from '@/lib/journal';
import { computeCaseProgress } from '@/lib/progression';
import { sortEvents } from '@/lib/collections/project';
import { freshSrs, isNew } from '@/lib/srs';
import { newBudget, retention7d } from '@/lib/srsBudget';
import { effectiveDaily, projectSrsSettings, type SrsSettings } from '@/lib/srsSettings';
import { lireConfig } from '@/lib/sync/configProjetee';
import type { ProgressEvent } from '@/lib/sync/events';
import { workingDaysUntilExam } from './calendrier';
import { debutJour } from './fuseau';

export interface EntreeParams {
  date: string;
  tz?: string;
  /** TOUS les `progress_events` locaux. */
  events: readonly ProgressEvent[];
  cases: readonly Case[];
  /** Le glossaire tel que `db.fachbegriffe` le porte — son état SRS LIVE n'est pas cru : il est reconstruit. */
  begriffe: readonly Fachbegriff[];
  /** Termes personnels jamais présentés (compte dans le budget de nouveaux termes). */
  personalFresh: number;
  /** `db.meta['program']` : le repli quand le journal ne porte aucune config valide. */
  configLocale?: ProgramConfig;
  /** `db.meta['srs.settings']` : le repli quand le journal ne porte aucun `srs.settings_changed`. */
  reglagesLocaux?: SrsSettings;
  /** L'instant de coupure du journal. Défaut : `debutJour(date, tz)`. `Infinity` : tout le journal (replanifier, projection). */
  coupure?: number;
  /** Remplace la config déduite du journal (replanifier et projection prennent la config COURANTE). */
  configForcee?: ProgramConfig;
}

export interface Entree {
  config: ProgramConfig | undefined;
  trainingEvents: TrainingEvent[];
  progress: Map<string, CaseProgress>;
  begriffe: Fachbegriff[];
  newPerDay: number;
}

/** La config du jour D : la dernière valide d'AVANT le jour, sinon la première du jour D (la création du programme). */
export function configDuJour(events: readonly ProgressEvent[], debut: number, repli?: ProgramConfig): ProgramConfig | undefined {
  const valides = sortEvents(events.filter((e) => e.type === 'program.configured') as ProgressEvent[])
    .map((e) => ({ at: Date.parse(e.occurred_at), config: lireConfig(e.payload) }))
    .filter((x): x is { at: number; config: ProgramConfig } => x.config !== null);
  const avant = valides.filter((x) => x.at < debut).pop();
  return (avant ?? valides.find((x) => x.at >= debut))?.config ?? repli;
}

/** L'état SRS d'un terme (Fachbegriff ou terme personnel) AVANT l'instant `coupure`. Un terme dont les seules révisions
 *  datent d'après redevient neuf. Les instants se comparent par `Date.parse` (revue m5) : un `occurred_at` serveur en
 *  `+00:00` ne se compare pas comme chaîne à un `…Z` local. */
export function begriffeAvant<T extends { id: string; srs?: Srs }>(begriffe: readonly T[], events: readonly ProgressEvent[], coupure: number): T[] {
  const avant = new Map<string, { t: number; e: ProgressEvent }>();
  const connus = new Set<string>();
  for (const e of events) {
    if (e.type !== 'srs.reviewed' || !e.subject_id) continue;
    connus.add(e.subject_id);
    const t = Date.parse(e.occurred_at);
    if (t < coupure) { const p = avant.get(e.subject_id); if (!p || t > p.t) avant.set(e.subject_id, { t, e }); }
  }
  return begriffe.map((b) => {
    const e = avant.get(b.id)?.e;
    if (e) return { ...b, srs: e.payload as Srs };
    return connus.has(b.id) ? { ...b, srs: freshSrs(0) } : b;       // révisé seulement APRÈS : il était neuf ce jour-là
  });
}

export function entreeDuJour(p: EntreeParams): Entree {
  const debut = debutJour(p.date, p.tz);
  const coupure = p.coupure ?? debut;
  const limite = Number.isFinite(coupure) ? new Date(coupure).toISOString() : '9999-12-31T00:00:00.000Z';
  const avant = p.events.filter((e) => e.occurred_at < limite);
  const trainingEvents = projectTrainingEvents(p.events as ProgressEvent[]).filter((e) => e.at < coupure);
  const progress = new Map(computeCaseProgress(trainingEvents).map((cp) => [cp.caseId, cp]));
  const begriffe = begriffeAvant(p.begriffe, p.events, coupure);
  const config = p.configForcee ?? configDuJour(p.events, debut, p.configLocale);

  // Le budget de nouveaux termes du jour, reconstruit sur le journal ANTÉRIEUR (même formule que le drill annonce).
  let newPerDay = 10;
  if (config) {
    const instant = Number.isFinite(coupure) ? coupure : debut;
    const budget = newBudget({
      freshRemaining: begriffe.filter((b) => isNew(b.srs)).length + p.personalFresh,
      workingDaysToExam: config.examDate ? workingDaysUntilExam(config.examDate, new Date(instant), config) : null,
      retention7d: retention7d(avant as ProgressEvent[], instant),
    });
    // Le journal fait foi ; la clé locale ne sert que tant qu'aucun réglage n'y a jamais été écrit.
    const settings = p.events.some((e) => e.type === 'srs.settings_changed') ? projectSrsSettings(avant as ProgressEvent[]) : (p.reglagesLocaux ?? projectSrsSettings([]));
    newPerDay = effectiveDaily(settings, { budget, intensity: config.intensity }).newPerDay;
  }
  return { config, trainingEvents, progress, begriffe, newPerDay };
}
