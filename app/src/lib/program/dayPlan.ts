// ============================================================================
// Le plan du jour FIGÉ.
// Contrat : docs/contracts/training-journal.md §3, §7, §12.4 · ADR-0017 §2 et §3 · ADR-0021 · ADR-0022.
//
// L'audit conclut en une phrase : « le plan est une fonction pure recalculée
// depuis `now`, jamais un état matérialisé ». Tout est là. `schedule()` repartait
// de zéro à chaque rendu, depuis trois endroits concurrents, et son bin-packing
// glouton reprenait immédiatement toute minute libérée — cocher une tâche en
// faisait apparaître une autre à sa place.
//
// Ici : le jour est construit UNE FOIS, à la première ouverture, et stocké.
// Cocher pose `doneAt` (dérivé du journal) ; RIEN d'autre ne bouge. Le plan ne
// change qu'à l'action nommée « replanifier ».
//
// *[S4]* Ce que le plan est, depuis la série 4 :
//  • des tâches de CAS : « il te reste la Dokumentation · 10 min » — jamais une tâche d'un seul Teil (INV-50) ;
//  • déterministe : il ne dépend que du journal ANTÉRIEUR au jour (INV-55) — `entree.ts` ;
//  • budgété sur les minutes réelles : UNE tâche forcée par jour, puis un remplissage glouton (INV-58) ;
//  • un mode observé en silence (INV-57), des cas solides qui reviennent à leur échéance (INV-60).
// ============================================================================

import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type {
  Case, CaseProgress, DayPlan, Fachbegriff, Favorite, Layer, ProgramConfig, SimTeil, Specialty, TaskInstance, TrainingEvent,
} from '@/db/types';
import { db } from '@/db/db';
import { newId } from '@/lib/sync/events';
import { fnv1a32 } from '@/lib/collections/personalTerms';
import { counts } from '@/lib/stats';
import { INTENSITY_FACTOR } from '@/lib/intensity';
import { TEILE } from '@/lib/simScope';
import { blankProgress } from '@/lib/journal';
import { dayKey, now as clockNow } from '@/lib/clock';
import { introducedToday } from '@/lib/srsBudget';
import { getSrsSettings } from '@/lib/srsSettings';
import { estTacheDeCas, evaluerTache } from './completion';
import { isWorkingDay, fenetreDUnTrait, nextWorkingDay, programEnd, taperDays } from './calendrier';
export { isWorkingDay, nextWorkingDay, programEnd, taperDays };
import { dureesTeile } from './durees';
import { erreursTransversales, poserRappels } from './erreurs';
import { entreeDuJour } from './entree';
import { debutJour, finJour, fuseauLocal } from './fuseau';
import { modeDuJour, observation } from './modus';
import { D_UN_TRAIT_ACTIF, SEUIL_FREQUENT } from './parametres';
import { pickWithDiversity, pourquoiAujourdhui, raisonDUnTrait, rankCandidates, violatesDiversity, type Scored, type SelectContext } from './select';
import { restePlan } from './tacheDeCas';

const NEW_PER_DAY_DEFAULT = 10;
const FACHWISSEN_MIN = 15;
const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

/** Ce que la tâche Fachbegriffe contient VRAIMENT : « 3 termes dus · 10 nouveaux termes ».
 *  Jamais « 0 terme dû » — une tâche ne se présente pas par ce qu'elle n'a pas. */
const drillReason = (due: number, fresh: number): string => [
  due > 0 ? `${due} terme${due > 1 ? 's dus' : ' dû'}` : null,
  fresh > 0 ? `${fresh} nouveau${fresh > 1 ? 'x termes' : ' terme'}` : null,
].filter(Boolean).join(' · ');

/** Complément de la tâche drill (lot F point 4) : « dont N favoris de ta séance ».
 *  Calculé à l'AFFICHAGE depuis l'état courant (`queueCounts().favorites`), jamais
 *  à la matérialisation : le plan figé (INV-55) ne dépend pas d'un favori du jour. */
export const drillFavorisNote = (n: number): string | null =>
  n > 0 ? `dont ${n} favori${n > 1 ? 's' : ''} de ta séance` : null;

/** Sans terme DÛ, les nouveaux termes ne sont jamais urgents : le drill passe
 *  juste APRÈS la première tâche de travail (C6-B). Dû ⇒ il reste en tête.
 *  Ne touche qu'à la génération : un jour déjà figé n'est jamais retraité. */
function drillApresLaPremierePartie(tasks: TaskInstance[], due: number): TaskInstance[] {
  if (due > 0 || tasks.length < 2 || tasks[0].kind !== 'drill') return tasks;
  return [tasks[1], tasks[0], ...tasks.slice(2)];
}

export interface BuildInput {
  config: ProgramConfig;
  date: string;                       // ISO yyyy-MM-dd
  cases: Case[];
  progress: Map<string, CaseProgress>;
  /** Le journal à partir duquel on planifie : celui d'AVANT le jour (`entreeDuJour`), jamais celui qui le contient. */
  trainingEvents: TrainingEvent[];
  begriffe: Fachbegriff[];
  /** L'instant de matérialisation. Il n'entre QUE dans `creeA` (INV-55) : la sélection lit `debutJour(date)`, le drill `finJour(date)`. */
  now: number;
  /** Nouveaux termes par jour : le réglage EFFECTIF du drill (`effectiveDaily`).
   *  Absent ⇒ 10, comme le repli du drill. */
  newPerDay?: number;
  /** Budget restant, s'il n'est pas le budget plein du jour (replanifier, I3). */
  budgetMin?: number;
  /** Le fuseau du plan (bornes du jour, `DayPlan.tz`). Absent : le fuseau local. */
  tz?: string;
  /** `creeA` des tâches posées. Défaut : `now`. */
  creeA?: number;
  /** La garde « d'un trait » (§12.12). Défaut : `D_UN_TRAIT_ACTIF`, `false` jusqu'à ce que S4-3 soit en production. */
  dUnTraitActif?: boolean;
  /** `false` quand le jour porte déjà sa tâche de cas (replanifier après une tâche faite) : « une seule tâche forcée par jour »
   *  (INV-58) — la première tâche de cas ne dépasse alors pas le budget restant. Défaut : `true`. */
  forcerLaPremiere?: boolean;
  /** Favoris projetés du journal coupé (`entreeDuJour`, INV-55) : l'échéance avancée d'un favori appris (lot F)
   *  compte dans les dus du plan — jamais un favori posé le jour D dans le plan de D. */
  favorites?: Favorite[];
}

/** La spécialité de plus forte dette agrégée — mode `specialite`. */
export function specialiteLaPlusEnDette(progress: Map<string, CaseProgress>, cases: Case[], date?: string, tz?: string): Specialty | undefined {
  const jour = date ?? dayKey(clockNow());
  const debt = new Map<Specialty, number>();
  for (const c of cases) {
    const n = restePlan(progress.get(c.id) ?? blankProgress(c.id), jour, tz).length;
    if (n) debt.set(c.specialty, (debt.get(c.specialty) ?? 0) + n);
  }
  return [...debt.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
}

const layerFor = (cp: CaseProgress | undefined): Layer =>
  !cp || cp.overall === 'vierge' ? 1 : cp.overall === 'entame' ? 2 : 3;

/**
 * Construit les tâches d'un jour. FONCTION PURE : mêmes entrées, mêmes sorties,
 * y compris les identifiants si `mkId` est déterministe. Elle ne lit ni la base
 * ni l'horloge — `input.now` est passé, jamais pris, et ne sert qu'à `creeA`.
 *
 * Le budget (§12.4, I7) : le drill d'abord ; en dernière ligne droite ou en mode `examen-blanc` explicite, l'examen à
 * blanc est LA tâche forcée (il dépasse le budget s'il le faut) ; sinon la première tâche de cas l'est. Tout le reste
 * respecte le budget, par remplissage glouton sur les `estMin` réels : on s'arrête quand aucun candidat ne tient.
 */
export function buildTasks(input: BuildInput, mkId: () => string = newId): TaskInstance[] {
  const { config, date, cases, progress, begriffe } = input;
  const day = parseISO(date);
  if (!isWorkingDay(day, config)) return [];
  if (day >= startOfDay(programEnd(config))) return [];      // le jour de l'examen reste vide

  const tz = input.tz;
  const debut = debutJour(date, tz), fin = finJour(date, tz);
  const creeA = input.creeA ?? input.now;
  const modus = modeDuJour(config, input.trainingEvents, cases);
  const teilHabituel = modus === 'teil-first' ? observation(input.trainingEvents, cases).teilHabituel : undefined;
  const actif = input.dUnTraitActif ?? D_UN_TRAIT_ACTIF;
  const targetMin = input.budgetMin ?? dayTargetMin(config);
  const durees = dureesTeile(input.trainingEvents);             // apprises (§13.4), calculées une fois
  const duree = (t: SimTeil) => durees[t];
  const sommeTrois = TEIL_KEYS.reduce((s, t) => s + duree(t), 0);
  const taper = taperDays(config);
  const isTaper = taper.has(date);
  const dansFenetre = actif && fenetreDUnTrait(config).has(date);

  const tasks: TaskInstance[] = [];
  let used = 0;
  const push = (t: Omit<TaskInstance, 'id' | 'date' | 'source'>) => {
    tasks.push({ ...t, id: mkId(), date, source: 'plan' });
    used += t.estMin;
  };

  // 1. Le drill. Son coût est FIGÉ avec le jour : faire ses cartes ne libère
  //    plus de minutes, donc n'attire plus de nouvelles simulations
  //    (audit §2.4 — l'effet existait sans rien cocher). Les termes DUS se comptent à la fin du jour (§12.4).
  // Dus PENDANT D (§12.4) : sur [debut, fin), d'où `fin - 1`. Un favori appris posé le jour D est dû à minuit de D+1
  // (= fin) : le drill ne le sert que demain, il ne compte donc jamais dans un plan (même replanifié) de D (revue delta I1).
  const terms = counts(begriffe, fin - 1, input.favorites);
  const fresh = Math.min(terms.fresh, input.newPerDay ?? NEW_PER_DAY_DEFAULT);
  const drillTotal = terms.due + fresh;
  if (drillTotal > 0 && targetMin > 0) {   // ni dû ni nouveau : pas de tâche, donc jamais la session de tête (C6-B)
    push({
      // M-a : borné au budget du jour — un gros arriéré ne remplit pas la journée au-delà.
      kind: 'drill', label: 'Fachbegriffe', estMin: Math.min(Math.ceil(drillTotal * 0.4), targetMin),
      reason: drillReason(terms.due, fresh),
    });
  }

  // 2. L'examen à blanc occupe la dernière ligne droite, et le mode dédié. C'est la tâche FORCÉE du jour : il peut dépasser le
  //    budget (le seul à le pouvoir en dernière ligne droite) ; ce jour-là, les tâches de cas respectent le budget (m-c).
  // La fin commune : les rappels d'erreurs transversales (§13.3, lus dans le journal d'AVANT le jour), puis le drill à sa place.
  const finir = () => drillApresLaPremierePartie(poserRappels(tasks, erreursTransversales(input.trainingEvents)), terms.due);
  const ctx = selectContext(input, debut);
  const ranked = rankCandidates(cases, ctx);
  let examenForce = false;
  if (modus === 'examen-blanc' || isTaper) {
    const best = (dansFenetre ? ranked.find((s) => progress.get(s.c.id)?.etat === 'solide' && s.parts.freq >= SEUIL_FREQUENT) : undefined) ?? ranked[0];
    if (best) {
      examenForce = true;
      push({
        kind: 'examen-blanc', label: best.c.name, estMin: sommeTrois, caseId: best.c.id, teile: [...TEIL_KEYS], creeA,
        specialty: best.c.specialty, layer: 3, assistance: 'autonome', ...(dansFenetre ? { dUnTrait: true as const } : {}),
        // Une tâche d'un trait dit ce qu'elle exige (§12.3, I5).
        reason: isTaper ? (dansFenetre ? `Répétition générale : d'un trait et sans aide.` : `Répétition générale : conditions réelles, sans aide.`)
          : dansFenetre ? raisonDUnTrait(best, ctx) : pourquoiAujourdhui(best, ctx),
      });
    }
    if (modus === 'examen-blanc') return finir();
  }

  // 3. Les tâches de cas. Un seul moteur de sélection dans le dépôt.
  const alreadyToday = new Set(tasks.map((t) => t.caseId).filter(Boolean));
  let candidates = ranked.filter((s) => !alreadyToday.has(s.c.id));
  if (modus === 'specialite') {
    const sp = specialiteLaPlusEnDette(progress, cases, date, tz);
    if (sp) candidates = candidates.filter((s) => s.c.specialty === sp);
  }
  if (teilHabituel) {                                   // observé « par Teil » : les cas où ce Teil reste à faire, si l'on en a —
    // un cas solide DÛ reste candidat : sa consolidation (§13.1) ne dépend pas de la façon de jouer.
    const sous = candidates.filter((s) => s.parts.du || restePlan(progress.get(s.c.id), date, tz).includes(teilHabituel));
    if (sous.length) candidates = sous;
  }
  // « D'un trait » (m-l) : entre J-15 ouvrés et la dernière ligne droite, un cas solide non prêt et fréquent passe en tête.
  const unTrait = new Set<string>();
  if (dansFenetre && !isTaper) {
    const choisi = cases
      .filter((c) => progress.get(c.id)?.etat === 'solide' && !alreadyToday.has(c.id))
      .sort((a, b) => b.frequency - a.frequency || (a.id < b.id ? -1 : 1))[0];
    if (choisi && choisi.frequency / Math.max(1, ctx.freqMax) >= SEUIL_FREQUENT) {
      unTrait.add(choisi.id);
      const deja = candidates.find((s) => s.c.id === choisi.id);
      // Hors échéance (`du: false`) : sa raison est la fin de la préparation ; `decrire` en fait quand même une révision entière.
      candidates = [deja ?? { c: choisi, score: Infinity, parts: { freq: choisi.frequency / Math.max(1, ctx.freqMax), urgence: 1, dette: 0, fraicheur: 1, du: false } }, ...candidates.filter((s) => s.c.id !== choisi.id)];
    }
  }

  /** Ce que la tâche de ce candidat demande : un cas solide dû revient en entier (`revision`) ; sinon ce qui reste (`simulation`). */
  const decrire = (s: Scored) => {
    if (s.parts.du || unTrait.has(s.c.id)) {
      const dUnTrait = actif && dansFenetre && s.parts.freq >= SEUIL_FREQUENT;
      return { kind: 'revision' as const, teile: [...TEIL_KEYS], estMin: sommeTrois, dUnTrait };
    }
    const teile = restePlan(progress.get(s.c.id), date, tz);
    const probable = teilHabituel && teile.includes(teilHabituel) ? teilHabituel : teile[0];
    // Observé « par Teil » : on compte la durée du Teil le plus probable seul (m13) ; sinon la somme de ce qui reste.
    const estMin = teilHabituel ? duree(probable) : teile.reduce((sum, t) => sum + duree(t), 0);
    return { kind: 'simulation' as const, teile, estMin, dUnTrait: false };
  };

  const specialties: Specialty[] = tasks.map((t) => t.specialty).filter((x): x is Specialty => !!x);
  let premiere = !examenForce && input.forcerLaPremiere !== false;
  while (candidates.length) {
    const room = targetMin - used;
    // La PREMIÈRE tâche de cas est posée même au-delà du budget (ADR-0021, contradiction 5) ; les suivantes doivent tenir.
    const pool = premiere ? candidates : candidates.filter((s) => decrire(s).estMin <= room);
    if (!pool.length) break;
    const [pick] = pickWithDiversity(pool, 1, modus !== 'specialite', specialties);
    if (!pick) break;
    candidates = candidates.filter((s) => s.c.id !== pick.scored.c.id);
    const cp = progress.get(pick.scored.c.id);
    const d = decrire(pick.scored);
    const layer = layerFor(cp);
    const dUnTrait = d.dUnTrait || unTrait.has(pick.scored.c.id);
    push({
      kind: d.kind, label: pick.scored.c.name, estMin: d.estMin, caseId: pick.scored.c.id, teile: d.teile, creeA,
      specialty: pick.scored.c.specialty, layer, assistance: layer === 1 ? 'assiste' : 'autonome',
      ...(dUnTrait ? { dUnTrait: true as const } : {}),
      ...(pick.diversityRelaxed ? { diversityRelaxed: true } : {}),
      reason: dUnTrait ? raisonDUnTrait(pick.scored, ctx) : pourquoiAujourdhui(pick.scored, ctx),       // elle dit ce qu'elle exige (I5)
    });
    specialties.push(pick.scored.c.specialty);
    premiere = false;
  }

  // 4. La théorie liée au premier cas découvert aujourd'hui, si le budget reste.
  const first = tasks.find((t) => t.kind === 'simulation' && t.layer === 1 && t.caseId);
  const linked = first && cases.find((c) => c.id === first.caseId)?.linkedFachwissenId;
  if (linked && used + FACHWISSEN_MIN <= targetMin) {
    // I4 : la tâche de théorie entre dans la liste soumise à C1/C2 ; seul
    // candidat possible, elle porte `diversityRelaxed` si elle les viole.
    const relaxed = modus !== 'specialite' && !!first!.specialty
      && violatesDiversity(tasks.map((t) => t.specialty).filter((x): x is Specialty => !!x), first!.specialty);
    push({
      kind: 'fachwissen', label: cases.find((c) => c.id === first!.caseId)!.pathology,
      estMin: FACHWISSEN_MIN, caseId: first!.caseId, specialty: first!.specialty,
      ...(relaxed ? { diversityRelaxed: true } : {}),
      reason: `La théorie du cas que tu découvres aujourd'hui.`,
    });
  }
  return finir();
}

export const dayTargetMin = (config: ProgramConfig): number =>
  Math.round(config.hoursPerSession * 60 * INTENSITY_FACTOR[config.intensity]);

/**
 * Le contexte de sélection du jour D. `now` y vaut le DÉBUT du jour (jamais l'instant de matérialisation, INV-55) : la
 * fraîcheur d'un cas se mesure depuis minuit, le plan de D est le même à 8 h et à 14 h. `lastPlayedAt` vient du journal
 * passé en entrée, qui ne contient pas le jour D.
 */
function selectContext(input: BuildInput, debut: number): SelectContext {
  const lastPlayedAt = new Map<string, number>();
  for (const te of input.trainingEvents) {
    if (!te.caseId || !te.teile.length) continue;             // « dernier JEU » : une fiche lue n'est pas un jeu
    const prev = lastPlayedAt.get(te.caseId);
    if (prev === undefined || te.at > prev) lastPlayedAt.set(te.caseId, te.at);
  }
  const end = startOfDay(programEnd(input.config));
  return {
    daysUntilExam: input.config.examDate ? Math.max(0, differenceInCalendarDays(end, parseISO(input.date))) : null,
    freqMax: input.cases.reduce((m, c) => Math.max(m, c.frequency), 1),
    now: debut,
    lastPlayedAt,
    progress: input.progress,
    jour: input.date,
    tz: input.tz,
  };
}

// ---------------------------------------------------------------------------
// La source unique de la session du jour (contrat §7)
// ---------------------------------------------------------------------------

/**
 * La première tâche non faite du plan figé. RIEN d'autre.
 *
 * `pickSessionCase` a disparu avec son second barème : deux moteurs de
 * sélection concurrents étaient la cause de la discordance « Leberzirrhose »,
 * où le hero de l'accueil ignorait totalement le plan qu'il affichait dessous.
 */
export const sessionDuJour = (plan: DayPlan | null | undefined): TaskInstance | null =>
  plan?.tasks.find((t) => t.doneAt === undefined) ?? null;

/**
 * Faites, entamées, total — jamais « manquées » (INV-52, §12.3). Une tâche est ENTAMÉE quand elle n'est pas faite et
 * qu'une partie du cas en a fait avancer au moins un Teil : le candidat a commencé, le reste revient en tête le
 * lendemain, proposé. Sans le journal (`events`), seules les faites sont comptées.
 */
export function planProgress(plan: DayPlan | null | undefined, events: readonly TrainingEvent[] = []): { faites: number; entamees: number; total: number } {
  const tasks = plan?.tasks ?? [];
  const faites = tasks.filter((t) => t.doneAt !== undefined).length;
  const entamees = events.length ? tasks.filter((t) => t.doneAt === undefined && evaluerTache(t, events, plan?.tz).statut === 'entamee').length : 0;
  return { faites, entamees, total: tasks.length };
}

// ---------------------------------------------------------------------------
// Matérialisation et replanification
// ---------------------------------------------------------------------------

/**
 * L'entrée d'un jour, lue dans la base (`entree.ts` fait le calcul, pur). `coupure` : l'instant avant lequel on lit le
 * journal — `debutJour(date)` à la matérialisation (INV-55), `Infinity` pour replanifier et projeter (tout ce qu'on sait).
 * `courante` : planifier avec la config COURANTE (replanifier, projection) plutôt que celle d'avant le jour.
 */
async function loadBuildInput(date: string, tz: string, at: number, opts: { coupure?: number; courante?: boolean; restant?: boolean } = {}): Promise<{ input: BuildInput; config: ProgramConfig } | null> {
  const [cases, begriffe, events, personal, meta, reglagesLocaux] = await Promise.all([
    db.cases.toArray(), db.fachbegriffe.toArray(), db.progress_events.toArray(), db.personal_terms.toArray(), db.meta.get('program'), getSrsSettings(),
  ]);
  const locale = meta?.value as ProgramConfig | undefined;
  const e = entreeDuJour({
    date, tz, events, cases, begriffe, configLocale: locale, reglagesLocaux, coupure: opts.coupure,
    personal,
    ...(opts.courante && locale ? { configForcee: locale } : {}),
  });
  if (!e.config) return null;                                     // pas de programme : rien à planifier
  // Replanifier : le budget de nouveaux termes d'AUJOURD'HUI est entamé par ce qui a déjà été introduit (compteur local).
  const newPerDay = opts.restant ? Math.max(0, e.newPerDay - await introducedToday(new Date(at))) : e.newPerDay;
  return { config: e.config, input: { config: e.config, date, cases, begriffe: e.begriffe, trainingEvents: e.trainingEvents, progress: e.progress, now: at, newPerDay, tz, favorites: e.favorites } };
}

/** Les ids des tâches d'un plan, dérivés de sa graine (M2) : rejouables. */
export function idsFromSeed(seed: string): () => string {
  const h = fnv1a32(seed).toString(16).padStart(8, '0');
  let n = 0;
  return () => `t-${h}-${n++}`;
}

/**
 * Matérialise le jour s'il ne l'est pas encore, et le rend.
 *
 * **Pure de tout rendu.** Appelée UNE FOIS au démarrage de l'app, jamais par un
 * composant : un rendu qui ne trouve pas le `DayPlan` du jour affiche « pas
 * encore ouvert », il ne le crée pas. Aucun jour futur n'est matérialisé, et le
 * passé ne l'est jamais rétroactivement — un jour sans `DayPlan` est un jour où
 * l'app n'a pas été ouverte ; il s'affiche vide, pas « en retard ».
 */
export function ensureDayPlan(date = dayKey(clockNow())): Promise<DayPlan | null> {
  // Single-flight par date : deux appels concurrents partagent LA MÊME matérialisation
  // (sinon deux `plan.materialized` pour un jour, `loadDrillContext` ayant élargi la fenêtre).
  const enVol = materialisations.get(date);
  if (enVol) return enVol;
  const p = materialiser(date).finally(() => materialisations.delete(date));
  materialisations.set(date, p);
  return p;
}
const materialisations = new Map<string, Promise<DayPlan | null>>();

async function materialiser(date: string): Promise<DayPlan | null> {
  const existing = await db.day_plans.get(date);
  if (existing) return existing;                                  // « figé » veut dire que le premier fige
  // M7 : une horloge qui recule (réglage manuel, fuseau) ne matérialise jamais
  // un jour antérieur au dernier figé — le passé n'est jamais rétroactif.
  const last = await db.day_plans.orderBy('date').last();
  if (last && date < last.date) return null;

  const at = clockNow();
  const tz = fuseauLocal();
  const charge = await loadBuildInput(date, tz, at);
  if (!charge) return null;
  const { input, config } = charge;
  // INV-55 : l'entrée est le journal d'AVANT le jour. Le mode se lit sur elle ; il est figé avec le plan.
  const mode = modeDuJour(config, input.trainingEvents, input.cases);
  // M2 : la graine porte l'instant de matérialisation et FONDE les ids — le
  // plan se rejoue depuis elle, et deux appareils n'ont jamais d'ids communs.
  const seed = `${date}:${mode}:${input.trainingEvents.length}:${at}`;
  const tasks = buildTasks(input, idsFromSeed(seed));
  const plan: DayPlan = { date, materializedAt: at, mode, seed, targetMin: dayTargetMin(config), tasks, tz };
  // L'événement D'ABORD, horodaté à l'instant de matérialisation : la
  // reconstruction dérive `materializedAt` de `occurred_at` — un autre
  // horodatage changerait le plan au redémarrage (INV-9).
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({
    type: 'plan.materialized', subject_id: date, occurred_at: new Date(at).toISOString(),
    payload: { tasks, mode: plan.mode, seed: plan.seed, targetMin: plan.targetMin, tz },
  }).catch((e) => console.warn('[sync]', e));
  await db.day_plans.put(plan);
  return plan;
}

/**
 * « Replanifier » — la SEULE chose qui change un jour figé, et seulement sur
 * un geste explicite. Elle CONSERVE à l'identique (id compris) toutes les
 * tâches déjà faites, et ne remplace que les non faites (INV-8). Elle porte sur
 * le jour courant seul : aucun jour futur n'est matérialisé.
 *
 * Le journal lu va jusqu'à MAINTENANT (ce qui a été joué aujourd'hui compte : un Teil déjà joué ne revient pas) et
 * les tâches neuves ont un `creeA` neuf.
 */
export async function replanifier(date = dayKey(clockNow())): Promise<DayPlan | null> {
  const plan = await db.day_plans.get(date);
  if (!plan) return null;

  const at = clockNow();
  const charge = await loadBuildInput(date, plan.tz ?? fuseauLocal(), at, { coupure: Infinity, courante: true, restant: true });
  if (!charge) return null;
  const { input, config } = charge;
  const done = plan.tasks.filter((t) => t.doneAt !== undefined);
  const doneCaseIds = new Set(done.map((t) => t.caseId).filter(Boolean));
  // I3 : le budget des tâches faites est CONSOMMÉ — cocher ne libère rien.
  const budgetMin = Math.max(0, (plan.targetMin || dayTargetMin(config)) - done.reduce((s, t) => s + t.estMin, 0));
  const fresh = buildTasks({ ...input, budgetMin, forcerLaPremiere: !done.some((t) => estTacheDeCas(t.kind)), cases: input.cases.filter((c) => !doneCaseIds.has(c.id)) })
    .filter((t) => !done.some((d) => d.kind === t.kind && d.caseId === t.caseId));

  const tasks = [...done, ...fresh];
  const next: DayPlan = { ...plan, tasks, replannedAt: at };
  // Événement d'abord, horodaté au geste : `replannedAt` reconstruit = rendu.
  const { syncQueue } = await import('@/lib/sync/queue');
  await syncQueue.push({ type: 'plan.replanned', subject_id: date, occurred_at: new Date(at).toISOString(), payload: { tasks, reason: 'manuel' } })
    .catch((e) => console.warn('[sync]', e));
  await db.day_plans.put(next);
  return next;
}

/**
 * La projection NON FIGÉE des jours à venir : ce que le calendrier montre, marqué
 * comme tel (contrat §3.2, §7 — I6). Elle n'a pas d'identité (`projection:…`),
 * elle ne se coche pas, et elle ne crée rien. Seuls les jours STRICTEMENT futurs
 * sont projetés : aujourd'hui est figé, le passé n'est jamais rétroactif. L'état
 * est chargé une fois pour toutes les dates.
 */
export async function projectedDays(dates: string[]): Promise<Map<string, TaskInstance[]>> {
  const out = new Map<string, TaskInstance[]>();
  const at = clockNow();
  const today = dayKey(at);
  const future = dates.filter((d) => d > today);
  if (!future.length) return out;
  const charge = await loadBuildInput(today, fuseauLocal(), at, { coupure: Infinity, courante: true });
  if (!charge) return out;
  for (const date of future) {
    let n = 0;
    const tasks = buildTasks({ ...charge.input, date }, () => `projection:${date}:${n++}`);
    if (tasks.length) out.set(date, tasks);
  }
  return out;
}
