// ============================================================================
// La sélection — score multiplicatif, diversité en CONTRAINTE DURE.
// Contrat : docs/contracts/training-journal.md §5 · ADR-0017 §6.
//
//     score(c) = freq(c) × urgence(c) × detteTeil(c) × fraicheur(c)
//
// Quatre facteurs multiplicatifs, AUCUN terme additif. L'audit mesure pourquoi :
// dans l'ancien `(weakness + freq) × …` (`program.ts:71-78`), la fréquence était
// additive et plafonnée à 30 contre une faiblesse montant à 95 — l'épidémiologie
// pesait au mieux 30/105 ≈ 29 %, et disparaissait dès que des scores existaient.
//
// `disciplineBoost` est SUPPRIMÉ, pas réglé : c'était une boucle de rétroaction
// par spécialité (un mauvais score en Gastro relevait les 13 cas de Gastro, les
// plus fréquents du corpus) qui rendait le classement monochrome.
//
// Et la diversité n'est pas une pondération : une pondération se fait noyer.
// C'est une contrainte que le choix glouton refuse de violer.
// ============================================================================

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Case, CaseProgress, Specialty } from '@/db/types';
import { detteTeil } from '@/lib/journal';
import { DAY_MS, dayKey } from '@/lib/clock';
import { emptyTeil, raisonAConfirmer } from '@/lib/progression';
import { POIDS_CONSOLIDATION } from './parametres';
import { restePlan } from './tacheDeCas';

/** Horizon au-delà duquel l'examen ne met plus aucune pression. */
const PRESSURE_HORIZON_DAYS = 90;
/** Un cas revu il y a ≥ 14 jours est aussi « frais » qu'un cas jamais joué. */
const FRESH_FULL_DAYS = 14;
/** Plancher de fraîcheur : un cas joué à l'instant ne tombe jamais à zéro. */
const FRESH_FLOOR = 0.2;

export interface SelectContext {
  /** Jours calendaires jusqu'à l'examen. `null` = pas de date d'examen. */
  daysUntilExam: number | null;
  /** Fréquence maximale DU CORPUS chargé — jamais une constante en dur. */
  freqMax: number;
  /** Instant de référence (epoch ms). Vient de `lib/clock`, jamais de `Date.now()`. */
  now: number;
  /** Dernier passage par cas, epoch ms. Absent = jamais joué. */
  lastPlayedAt: Map<string, number>;
  progress: Map<string, CaseProgress>;
  /** Le JOUR DU PLAN (`yyyy-MM-dd`), passé explicitement (I1, INV-55). Défaut : le jour de `now` (appelants de transition). */
  jour?: string;
  /** Le fuseau du plan : deux appareils lisent les mêmes jours. */
  tz?: string;
}

/** ∈ (0, 1] — l'épidémiologie, à pleine échelle et jamais plafonnée. */
export const freq = (c: Case, freqMax: number): number =>
  Math.max(1, c.frequency) / Math.max(1, freqMax);

/** ∈ [0, 1] — 0 à plus de 90 jours, 1 la veille. */
export const pressionExamen = (daysUntilExam: number | null): number =>
  daysUntilExam === null ? 0 : Math.min(1, Math.max(0, 1 - daysUntilExam / PRESSURE_HORIZON_DAYS));

/** ∈ [1, 3] — l'urgence multiplie tout, elle ne réordonne rien à elle seule. */
export const urgence = (daysUntilExam: number | null): number => 1 + 2 * pressionExamen(daysUntilExam);

/** ∈ [0.2, 1] — jamais joué = 1. Le rappel espacé, vu du programme. */
export function fraicheur(lastAt: number | undefined, now: number): number {
  if (lastAt === undefined) return 1;
  const days = Math.max(0, (now - lastAt) / DAY_MS);
  return Math.min(1, Math.max(FRESH_FLOOR, days / FRESH_FULL_DAYS));
}

export interface Scored {
  c: Case;
  score: number;
  /** Les quatre facteurs, gardés pour écrire le « pourquoi aujourd'hui ». `dette` vaut `POIDS_CONSOLIDATION` pour un cas DÛ. */
  parts: { freq: number; urgence: number; dette: number; fraicheur: number; du: boolean };
}

/** Un cas solide (ses trois Teile) dont l'échéance de consolidation est arrivée (§13.1). */
export const estDu = (cp: CaseProgress | undefined, jour: string): boolean =>
  (cp?.etat === 'solide' || cp?.etat === 'pret') && !!cp.prochaineConsolidation && jour >= cp.prochaineConsolidation;

/**
 * `score(c) = freq × urgence × dette × fraicheur`. *[S4-2, §13.1]* Un cas solide SORT jusqu'à sa prochaine consolidation
 * (`dette = 0`) ; à l'échéance son score vaut `freq × urgence × POIDS_CONSOLIDATION × fraicheur` — un plancher de dette
 * le ramènerait chaque jour, sans espacement (ADR-0022, alternative (1) écartée).
 */
export function scoreCase(c: Case, ctx: SelectContext): Scored {
  const jour = ctx.jour ?? dayKey(ctx.now);
  const cp = ctx.progress.get(c.id);
  const dette = detteTeil(cp, jour, ctx.tz);
  const du = dette === 0 && estDu(cp, jour);
  const parts = {
    freq: freq(c, ctx.freqMax),
    urgence: urgence(ctx.daysUntilExam),
    dette: du ? POIDS_CONSOLIDATION : dette,
    fraicheur: fraicheur(ctx.lastPlayedAt.get(c.id), ctx.now),
    du,
  };
  return { c, score: parts.freq * parts.urgence * parts.dette * parts.fraicheur, parts };
}

/**
 * Le classement des candidats. `dette === 0` ⇒ `score === 0` ⇒ le cas SORT — sauf à l'échéance de sa consolidation :
 * c'est la seule exclusion du moteur. Il n'y a pas de liste d'exclus, pas de
 * `status === 'Maîtrisé'` (`pickSession.ts:32`), pas de `statusBoost`.
 *
 * Départage déterministe (fréquence, puis id) : deux appareils qui matérialisent
 * le même jour avec le même journal produisent le même plan.
 */
export function rankCandidates(cases: Case[], ctx: SelectContext): Scored[] {
  return cases
    .map((c) => scoreCase(c, ctx))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.c.frequency - a.c.frequency || (a.c.id < b.c.id ? -1 : 1));
}

// ---------------------------------------------------------------------------
// La diversité — une contrainte, jamais un malus
// ---------------------------------------------------------------------------

/** Fenêtre glissante de C2. */
const WINDOW = 5;
/** Occurrences maximales d'une spécialité dans la fenêtre. */
const MAX_PER_WINDOW = 2;

export type Relax = 'aucun' | 'C2' | 'C1';

/** C1 — adjacence : jamais deux spécialités identiques consécutives. */
const okC1 = (picked: Specialty[], next: Specialty): boolean =>
  picked.length === 0 || picked[picked.length - 1] !== next;

/** C2 — fenêtre : au plus deux fois la même spécialité par fenêtre de cinq. */
const okC2 = (picked: Specialty[], next: Specialty): boolean =>
  [...picked.slice(-(WINDOW - 1)), next].filter((s) => s === next).length <= MAX_PER_WINDOW;

const accepts = (picked: Specialty[], next: Specialty, relax: Relax): boolean =>
  (relax === 'C1' ? true : okC1(picked, next)) && (relax === 'aucun' ? okC2(picked, next) : true);

export interface Picked { scored: Scored; diversityRelaxed: boolean }

/**
 * Choix glouton par score décroissant qui SAUTE tout candidat violant C1 ou C2.
 * La contrainte n'est jamais convertie en malus de score.
 *
 * Relâchement : uniquement quand aucun candidat ne passe, une contrainte à la
 * fois, C2 d'abord, C1 ensuite. Toute tâche placée sous relâchement est tracée
 * — `diversityRelaxed === true` implique que TOUS les candidats restants
 * violaient la contrainte relâchée, et il n'existe pas d'autre chemin.
 *
 * `enforce: false` suspend les deux contraintes (modes `cas-complet` et
 * `specialite`, où un jour tient souvent en un seul cas ou une seule spécialité).
 */
/** Vrai si `next` viole C1 ou C2 derrière `picked` — pour une tâche posée hors
 *  de `pickWithDiversity` (Fachwissen), qui porte alors `diversityRelaxed`. */
export const violatesDiversity = (picked: Specialty[], next: Specialty): boolean =>
  !okC1(picked, next) || !okC2(picked, next);

/** `seed` : les spécialités des tâches DÉJÀ posées ce jour (examen à blanc) —
 *  INV-4 porte sur toute la liste, pas sur les seules simulations (I4). */
export function pickWithDiversity(ranked: Scored[], count: number, enforce = true, seed: Specialty[] = []): Picked[] {
  const out: Picked[] = [];
  const specialties: Specialty[] = [...seed];
  const remaining = [...ranked];

  while (out.length < count && remaining.length) {
    let chosen: { i: number; relaxed: boolean } | null = null;
    if (!enforce) {
      chosen = { i: 0, relaxed: false };
    } else {
      for (const relax of ['aucun', 'C2', 'C1'] as Relax[]) {
        const i = remaining.findIndex((s) => accepts(specialties, s.c.specialty, relax));
        if (i >= 0) { chosen = { i, relaxed: relax !== 'aucun' }; break; }
      }
    }
    if (!chosen) break;                                   // ne peut pas arriver : relax 'C1' accepte tout
    const [scored] = remaining.splice(chosen.i, 1);
    out.push({ scored, diversityRelaxed: chosen.relaxed });
    specialties.push(scored.c.specialty);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Le « pourquoi aujourd'hui »
// ---------------------------------------------------------------------------

const pct = (n: number) => `${Math.round(n)} %`;

/**
 * Une ligne, figée avec la tâche. La confiance ne vient pas de la précision de
 * l'algorithme, elle vient de sa lisibilité : on nomme le facteur DOMINANT,
 * celui qui a réellement porté ce cas en tête, et rien d'autre.
 */
export function pourquoiAujourdhui(s: Scored, ctx: SelectContext): string {
  const jour = ctx.jour ?? dayKey(ctx.now);
  const cp = ctx.progress.get(s.c.id);
  if (s.parts.du) return `${solideDepuis(s, ctx)} : on vérifie qu'il tient.`;     // texte de la direction (revue S4-2)
  const fragile = cp && Object.entries(cp.teile).find(([, p]) => p.status === 'fragile');
  if (fragile) {
    const [teil, p] = fragile;
    return `Ta dernière ${teilLabel(teil)} sur ce cas est restée à ${pct(p.lastScore ?? 0)} — on la reprend.`;
  }
  // Un Teil déjà réussi à 80 ou plus attend sa confirmation (revue P1) : ce n'est pas un Teil jamais travaillé, on le dit.
  const attendus = cp ? restePlan(cp, jour, ctx.tz) : [];
  const confirmer = cp && raisonAConfirmer({ ...cp, teile: Object.fromEntries(Object.entries(cp.teile).map(([k, p]) => [k, attendus.includes(k as never) ? p : emptyTeil()])) as CaseProgress['teile'] }, jour);
  if (confirmer) return confirmer;
  if (s.parts.dette === 1 && s.parts.freq >= 0.6 && !ctx.lastPlayedAt.has(s.c.id)) {
    return `Parmi les cas les plus vus à l'examen, et jamais travaillé.`;
  }
  if (ctx.daysUntilExam !== null && ctx.daysUntilExam <= 21 && s.parts.freq >= 0.5) {
    return `L'examen est dans ${ctx.daysUntilExam} jours : les cas fréquents passent devant.`;
  }
  const lastAt = ctx.lastPlayedAt.get(s.c.id);
  if (lastAt !== undefined) {
    const days = Math.round((ctx.now - lastAt) / DAY_MS);
    return `Vu il y a ${days} jour${days > 1 ? 's' : ''} — le rappel espacé tombe aujourd'hui.`;
  }
  return `Jamais rencontré, et il reste du temps pour le découvrir posément.`;
}

/** « Solide il y a 47 jours » ; jamais « 0 jour » — sans dernier jeu connu, on ne date pas. */
function solideDepuis(s: Scored, ctx: SelectContext): string {
  const dernier = ctx.lastPlayedAt.get(s.c.id);
  const n = dernier === undefined ? 0 : differenceInCalendarDays(parseISO(ctx.jour ?? dayKey(ctx.now)), parseISO(dayKey(dernier)));
  return n >= 1 ? `Solide il y a ${n} jour${n > 1 ? 's' : ''}` : 'Solide';
}

/** La raison d'une tâche « d'un trait » (§12.3, I5) : elle dit ce qu'elle exige. Une consolidation garde sa date, en une phrase. */
export function raisonDUnTrait(s: Scored, ctx: SelectContext): string {
  return s.parts.du
    ? `${solideDepuis(s, ctx)} : rejoue-le d'un trait, comme à l'examen.`
    : `Pour la fin de la préparation : ce cas, d'un trait, comme à l'examen.`;
}

const TEIL_LABELS: Record<string, string> = {
  anamnese: 'Anamnese', dokumentation: 'Dokumentation', fallvorstellung: 'Fallvorstellung',
};
const teilLabel = (k: string) => TEIL_LABELS[k] ?? k;
