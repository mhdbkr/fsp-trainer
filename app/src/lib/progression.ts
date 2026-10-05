// ============================================================================
// La progression par Teil et par cas — PURE (aucune base, aucune horloge).
// Contrat : training-journal.md §4.1, §12.6, §13.1, §13.2 · ADR-0021 · ADR-0022.
//
// Un cas n'a pas de pourcentage : il a un état par Teil (`fragile`, `acquis`,
// `solide`), deux mesures séparées — la COUVERTURE (combien de Teile travaillés)
// et la MAÎTRISE (la moyenne des derniers scores des Teile joués) — et une
// échelle d'états : vierge → entamé → couvert → solide → prêt.
//
// Les séances auto-déclarées (`selbstbewertet`) n'entrent dans aucune mesure
// (INV-11) : elles ne laissent que `nonMesureAt`.
// ============================================================================

import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CaseEtat, CaseId, CaseProgress, ConditionExamen, SimTeil, TeilProgress, TeilStatus, TrainingEvent } from '@/db/types';
import { dayKey } from '@/lib/clock';
import { TEILE } from '@/lib/simScope';
import { CONSOLIDATION_JOURS, SOLIDE_ECART_JOURS } from '@/lib/program/parametres';

/** Seuils déjà portés par le dépôt : `simulationPassed()` (60) et l'ancien
 *  `status === 'Maîtrisé'` (80). Aucun seuil neuf n'est introduit. */
export const PART_OK = 60;
export const PART_SOLIDE = 80;

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);
const TOUTES_CONDITIONS: ConditionExamen[] = ['enchaine', 'autonome', 'ordre', 'grille'];

/** La règle SÉRIE 3 : le statut est une fonction du seul dernier score. Gardée pour la
 *  frise passée, qui est figée (INV-69, décision (e)). */
export const statusOf = (lastScore: number | null): TeilStatus =>
  lastScore === null ? 'vierge' : lastScore < PART_OK ? 'fragile' : lastScore < PART_SOLIDE ? 'acquis' : 'solide';

/**
 * Un pas de l'automate « solide stable » (§13.2). `premiereReussiteAt` = l'instant de la
 * PREMIÈRE réussite ≥ 80 déjà vue : c'est le meilleur témoin de l'écart.
 *  • solide + s ≥ 80 → solide ; solide + s < 80 → acquis, JAMAIS fragile (INV-62) ;
 *  • sinon s < 60 → fragile ; s < 80 → acquis ;
 *  • s ≥ 80 → solide seulement si une réussite ≥ 80 date d'au moins 3 jours calendaires (INV-61).
 */
export function statusSuivant(avant: TeilStatus, score: number, at: number, premiereReussiteAt: number | null): TeilStatus {
  if (avant === 'solide') return score >= PART_SOLIDE ? 'solide' : 'acquis';
  if (score < PART_OK) return 'fragile';
  if (score < PART_SOLIDE) return 'acquis';
  return premiereReussiteAt !== null && differenceInCalendarDays(at, premiereReussiteAt) >= SOLIDE_ECART_JOURS ? 'solide' : 'acquis';
}

export const emptyTeil = (): TeilProgress => ({ status: 'vierge', lastScore: null, lastAt: null, attempts: 0 });

/** « Faite — non mesurée » : déclarée faite, jamais mesurée (I-4). */
export const estNonMesure = (p: TeilProgress): boolean => p.status === 'vierge' && p.nonMesureAt != null;

/** L'état d'un cas jamais rencontré : trois Teile vierges. Jamais `undefined`,
 *  pour qu'aucun appelant n'ait à traiter l'absence comme un défaut. */
export const blankProgress = (caseId: CaseId): CaseProgress => ({
  caseId, teile: { anamnese: emptyTeil(), dokumentation: emptyTeil(), fallvorstellung: emptyTeil() }, overall: 'vierge',
  couverture: 0, maitrise: null, etat: 'vierge', solideDepuis: null, pretAt: null, prochaineConsolidation: null, pretManque: [],
});

const overallOf = (etat: CaseEtat): CaseProgress['overall'] =>
  etat === 'vierge' ? 'vierge' : etat === 'solide' || etat === 'pret' ? 'solide' : 'entame';

/**
 * Un Teil « à confirmer » (revue P1) : acquis, déjà réussi à 80 ou plus, et le jour `jour` est
 * celui où une seconde réussite le rendrait solide. Ce n'est pas un Teil jamais travaillé : il
 * attend sa confirmation, et ne pèse que `POIDS_CONSOLIDATION` dans la dette.
 */
export const teilAConfirmer = (p: TeilProgress, jour: string): boolean =>
  p.status === 'acquis' && p.solideDes != null && p.solideDes <= jour;

/** La raison lisible d'un cas dont des Teile sont à confirmer, ou `null`. Pure ; S4-2 l'affiche dans le plan. */
export function raisonAConfirmer(cp: CaseProgress, jour: string): string | null {
  const t = TEIL_KEYS.find((k) => teilAConfirmer(cp.teile[k], jour) && cp.teile[k].premiereReussite);
  const r = t && cp.teile[t].premiereReussite;
  return r ? `Réussi à ${r.score} le ${format(new Date(r.at), 'd MMM', { locale: fr })} — une seconde partie à 80 ou plus le confirme.` : null;
}

/** Un run qualifiant (§12.6) : en conditions d'examen, et chaque Teil ≥ 80. */
const qualifiant = (e: TrainingEvent): boolean =>
  e.examen === true && TEIL_KEYS.every((t) => e.teile.includes(t) && (e.scores?.[t] ?? -1) >= PART_SOLIDE);

interface Acc {
  cp: CaseProgress;
  premiere: Record<SimTeil, { at: number; score: number } | null>;   // première réussite ≥ 80 de chaque Teil
  solideDepuis: number | null;
  /** Position, dans `mesures`, de l'événement qui a soudé les trois Teile. On compare des POSITIONS
   *  et non des instants : deux événements d'un même instant se départagent par l'id, et seul ce qui
   *  suit réellement la soudure compte (revue I2). */
  soudureIdx: number | null;
  mesures: TrainingEvent[];                   // les `partieMesuree` du cas, dans l'ordre
}

/**
 * La progression de chaque cas rencontré, depuis le journal.
 *  • `regle: 'serie3'` applique l'ancienne règle de statut (pour la frise passée, INV-69) ;
 *  • sinon, l'automate « solide stable » (§13.2).
 * Le tri est total (`at`, puis `id`) : une progression incrémentale et une progression
 * reconstruite donnent la même valeur (INV-59).
 */
export function computeCaseProgress(trainingEvents: TrainingEvent[], opts: { regle?: 'serie3' } = {}): CaseProgress[] {
  const serie3 = opts.regle === 'serie3';
  const byCase = new Map<CaseId, Acc>();
  const sorted = [...trainingEvents].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const te of sorted) {
    if (!te.caseId) continue;
    let acc = byCase.get(te.caseId);
    if (!acc) {
      acc = { cp: blankProgress(te.caseId), premiere: { anamnese: null, dokumentation: null, fallvorstellung: null }, solideDepuis: null, soudureIdx: null, mesures: [] };
      byCase.set(te.caseId, acc);
    }
    let mesure = false;
    for (const t of te.teile) {
      if (!TEIL_KEYS.includes(t)) continue;                 // S-M1 : jamais `__proto__` ni une clé inconnue
      const p = acc.cp.teile[t];
      // INV-11 + M4 : auto-déclaré ou sans score n'est pas une mesure — status, attempts,
      // lastScore intacts ; seul `nonMesureAt` le note (I-4).
      const s = te.selbstbewertet === true ? null : te.scores?.[t];
      if (typeof s !== 'number' || !Number.isFinite(s)) { p.nonMesureAt = te.at; continue; }
      p.attempts += 1;
      p.lastScore = s; p.lastAt = te.at;
      p.status = serie3 ? statusOf(s) : statusSuivant(p.status, s, te.at, acc.premiere[t]?.at ?? null);
      if (s >= PART_SOLIDE && acc.premiere[t] === null) acc.premiere[t] = { at: te.at, score: s };
      mesure = true;
    }
    if (mesure) {
      acc.mesures.push(te);
      // `solideDepuis` : l'événement du DERNIER passage aux trois Teile solides ; une retombée l'efface.
      if (!TEIL_KEYS.every((t) => acc!.cp.teile[t].status === 'solide')) { acc.solideDepuis = null; acc.soudureIdx = null; }
      else if (acc.solideDepuis === null) { acc.solideDepuis = te.at; acc.soudureIdx = acc.mesures.length - 1; }
    }
  }
  return [...byCase.values()].map(finalise);
}

/** Les événements qui suivent la soudure, celui qui soude compris. */
const depuisSoudure = (acc: Acc): TrainingEvent[] => (acc.soudureIdx === null ? [] : acc.mesures.slice(acc.soudureIdx));

/** Les mesures dérivées d'un cas, une fois tout le journal lu. */
function finalise(acc: Acc): CaseProgress {
  const { cp } = acc;
  const joues = TEIL_KEYS.filter((t) => cp.teile[t].attempts >= 1);
  cp.couverture = joues.length as 0 | 1 | 2 | 3;
  cp.maitrise = joues.length ? Math.round(joues.reduce((s, t) => s + cp.teile[t].lastScore!, 0) / joues.length) : null;
  for (const t of TEIL_KEYS) {
    const p = cp.teile[t];
    const premiere = acc.premiere[t];
    if (premiere) p.premiereReussite = { ...premiere };
    if (p.status !== 'solide' && premiere) p.solideDes = dayKey(addDays(new Date(premiere.at), SOLIDE_ECART_JOURS));
  }
  const toutSolide = joues.length === 3 && TEIL_KEYS.every((t) => cp.teile[t].status === 'solide');
  const qual = toutSolide ? depuisSoudure(acc).filter(qualifiant) : [];
  cp.solideDepuis = toutSolide ? acc.solideDepuis : null;
  cp.etat = joues.length === 0 ? 'vierge' : joues.length < 3 ? 'entame' : !toutSolide ? 'couvert' : qual.length ? 'pret' : 'solide';
  cp.pretAt = qual.length ? qual[qual.length - 1].at : null;
  cp.overall = overallOf(cp.etat);
  cp.prochaineConsolidation = toutSolide ? prochaineConsolidation(acc) : null;
  cp.pretManque = cp.etat === 'solide' ? pretManque(acc) : [];
  return cp;
}

/** §13.1 : dernier jeu + 7, 21 puis 45 jours — selon les jours distincts, STRICTEMENT après la soudure, où le cas a été mesuré. */
function prochaineConsolidation(acc: Acc): string {
  const jourSoude = dayKey(acc.solideDepuis!);
  const k = new Set(acc.mesures.map((e) => dayKey(e.at)).filter((d) => d > jourSoude)).size;
  const dernierJeu = Math.max(...TEIL_KEYS.map((t) => acc.cp.teile[t].lastAt!));
  return dayKey(addDays(new Date(dernierJeu), CONSOLIDATION_JOURS[Math.min(k, CONSOLIDATION_JOURS.length - 1)]));
}

/** R1 : ce qui manque au run le plus proche de souder, depuis la soudure des trois Teile. Sans run
 *  série 4 depuis, il manque tout. À égalité, le plus récent. */
function pretManque(acc: Acc): ConditionExamen[] {
  const runs = depuisSoudure(acc).filter((e) => e.examenManque && e.examenManque.length > 0);   // `[]` = déjà qualifiant : il aurait soudé
  if (!runs.length) return [...TOUTES_CONDITIONS];
  const best = runs.reduce((b, e) => (e.examenManque!.length <= b.examenManque!.length ? e : b));
  return [...best.examenManque!];
}
