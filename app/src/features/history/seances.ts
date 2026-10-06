// S4-6 — le carnet de séances (spec 2026-10-04 « 5 · Historique »). PUR : tout se dérive du journal
// (training-journal.md §1.2 r. 4), aucune séance n'est stockée. Invariants : tests/invariants.historique.test.ts.
import { startOfWeek, subWeeks } from 'date-fns';
import type { CaseProgress, Favorite, SimTeil, TermeCherche, TrainingEvent } from '@/db/types';
import { PART_OK, blankProgress, computeCaseProgress } from '@/lib/journal';
import { bilanErreurs } from '@/features/simulation/bilanErreurs';
import { erreursTransversales } from '@/lib/program/erreurs';

/** Au-delà de cette pause entre la fin d'un exercice et le début du suivant, une nouvelle séance commence. */
export const SEANCE_PAUSE_MIN = 30;
const MIN = 60_000;
const TEILE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

export interface Seance {
  debut: number;
  /** La fin du dernier exercice : `at` + minutes mesurées, ou l'enregistrement s'il est plus tard. */
  fin: number;
  /** Ordre (at, id). */
  events: TrainingEvent[];
  /** Σ `spentMin` : le temps MESURÉ, jamais `fin − debut`. */
  minutes: number;
}

const ordre = (a: TrainingEvent, b: TrainingEvent) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const finDe = (e: TrainingEvent) => Math.max(e.at + e.spentMin * MIN, e.enregistreA ?? 0);

/** Les séances, de la plus récente à la plus ancienne. */
export function seances(journal: readonly TrainingEvent[]): Seance[] {
  const out: Seance[] = [];
  let cur: Seance | null = null;
  for (const e of [...journal].sort(ordre)) {
    if (cur && e.at - cur.fin <= SEANCE_PAUSE_MIN * MIN) {
      cur.events.push(e); cur.fin = Math.max(cur.fin, finDe(e)); cur.minutes += e.spentMin;
    } else {
      cur = { debut: e.at, fin: finDe(e), events: [e], minutes: e.spentMin };
      out.push(cur);
    }
  }
  return out.reverse();
}

/** Un cas joué pendant la séance : ses cadrans avant et après, ce qu'il a donné, et les actions qui en découlent. */
export interface CasDeSeance {
  caseId: string;
  ids: string[];
  avant: CaseProgress;
  apres: CaseProgress;
  /** Le dernier score MESURÉ de chaque Teil dans la séance. */
  scores: Partial<Record<SimTeil, number>>;
  autoEvalue: boolean;
  /** La dernière partie de la séance et ses oublis : `n` = les « encore manquée » de son bilan (`bilanErreurs`), le nombre
   *  exact que montre sa page d'arrivée. Proposé tant qu'un d'eux est TOUJOURS un signal aujourd'hui
   *  (`erreursTransversales` du journal entier) : quand tous sont corrigés, il n'y a plus rien à revoir. */
  oublis: { simId: string; n: number } | null;
  /** Le Teil le plus faible sous `PART_OK`, mesuré dans la séance et nulle part depuis : seule la séance la plus récente qui
   *  l'a mesuré propose de le rejouer (pas de lien en double), et un Teil remonté depuis ne se propose plus. */
  aRejouer: SimTeil | null;
}

const estPartie = (e: TrainingEvent) => (e.kind === 'simulation' || e.kind === 'examen-blanc') && !!e.caseId;
const progres = (caseId: string, events: TrainingEvent[]) => computeCaseProgress(events)[0] ?? blankProgress(caseId);

export function casDeSeance(s: Seance, journal: readonly TrainingEvent[]): CasDeSeance[] {
  const signaux = erreursTransversales(journal);
  const parCas = new Map<string, TrainingEvent[]>();
  for (const e of s.events) if (estPartie(e)) parCas.set(e.caseId!, [...(parCas.get(e.caseId!) ?? []), e]);
  return [...parCas].map(([caseId, ici]) => {
    const passe = journal.filter((e) => e.caseId === caseId && e.at < s.debut);
    const scores: Partial<Record<SimTeil, number>> = {};
    for (const e of ici) if (e.selbstbewertet !== true) for (const t of e.teile) { const v = e.scores?.[t]; if (typeof v === 'number') scores[t] = v; }
    const derniere = [...ici].reverse().find((e) => e.id.startsWith('te-'));
    const manquees = derniere ? bilanErreurs(journal, derniere.id.slice(3)).filter((l) => !l.cochee) : [];
    const aRevoir = manquees.some((l) => signaux.some((x) => x.teil === l.teil && x.item === l.item));
    const mesureDepuis = (t: SimTeil) => journal.some((e) =>
      e.caseId === caseId && e.at > s.fin && e.selbstbewertet !== true && typeof e.scores?.[t] === 'number');
    // Pas re-mesuré depuis ⇒ son dernier score d'aujourd'hui EST celui de la séance (`lastScore` ignore l'auto-évaluation).
    const faibles = TEILE.filter((t) => (scores[t] ?? 100) < PART_OK && !mesureDepuis(t))
      .sort((a, b) => scores[a]! - scores[b]!);
    return {
      caseId, ids: ici.map((e) => e.id),
      avant: progres(caseId, passe), apres: progres(caseId, [...passe, ...ici]),
      scores,
      autoEvalue: ici.some((e) => e.selbstbewertet === true),
      oublis: derniere && aRevoir ? { simId: derniere.id.slice(3), n: manquees.length } : null,
      aRejouer: faibles[0] ?? null,
    };
  });
}

/** Une carte de drill : un Fachbegriff ou une carte personnelle. */
export interface Carte { id: string; term: string }
export interface MotDeSeance { termId: string; terme: string; favori: boolean; cherche: number }

/**
 * « Pendant cette séance » : les termes mis en favori pendant la séance, et les mots cherchés au moins deux fois.
 * Fenêtre : du début de la séance à sa fin + la pause (ce qui suit d'un trait lui appartient). Un mot qui ne mène à aucune
 * carte n'est pas montré : il n'y aurait rien à envoyer au drill.
 */
export function motsDeSeance(
  s: Seance, favoris: readonly Favorite[], cherches: readonly TermeCherche[],
  resoudre: (terme: string) => Carte | null, cartes: ReadonlyMap<string, Carte>,
): MotDeSeance[] {
  const dans = (at: number) => at >= s.debut && at <= s.fin + SEANCE_PAUSE_MIN * MIN;
  const compte = new Map<string, number>();
  for (const c of cherches) { if (!dans(c.at)) continue; const k = resoudre(c.terme); if (k) compte.set(k.id, (compte.get(k.id) ?? 0) + 1); }
  const favoriIds = new Set(favoris.map((f) => f.termId));
  const poses = favoris.filter((f) => dans(Date.parse(f.since)) && cartes.has(f.termId)).sort((a, b) => Date.parse(a.since) - Date.parse(b.since));
  const out: MotDeSeance[] = poses.map((f) => ({ termId: f.termId, terme: cartes.get(f.termId)!.term, favori: true, cherche: compte.get(f.termId) ?? 0 }));
  const cherchesDeuxFois = [...compte].filter(([id, n]) => n >= 2 && !out.some((m) => m.termId === id))
    .map(([id, n]) => ({ termId: id, terme: cartes.get(id)?.term ?? id, favori: favoriIds.has(id), cherche: n }))
    .sort((a, b) => b.cherche - a.cherche || a.terme.localeCompare(b.terme));
  return [...out, ...cherchesDeuxFois];
}

// --- La ligne de semaine ------------------------------------------------------------------------------------------
export interface LigneSemaine { cas: number; teilesAcquis: number; fachbegriffe: number; seances: number; casSemaineDerniere: number }

const RANG = { vierge: 0, fragile: 1, acquis: 2, solide: 3 } as const;
const casJoues = (journal: readonly TrainingEvent[], de: number, a: number) =>
  new Set(journal.filter((e) => estPartie(e) && e.at >= de && e.at <= a).map((e) => e.caseId!)).size;

/** Lundi → `maintenant`. La tendance compare à la même heure la semaine dernière (`subWeeks` : le changement d'heure ne
 *  décale rien), jamais à une semaine entière. */
export function ligneSemaine(
  journal: readonly TrainingEvent[], revus: readonly { subject_id: string | null; occurred_at: string }[], maintenant: number,
): LigneSemaine {
  const lundi = startOfWeek(maintenant, { weekStartsOn: 1 }).getTime();
  const jusque = journal.filter((e) => e.at <= maintenant);
  const avant = new Map(computeCaseProgress(jusque.filter((e) => e.at < lundi)).map((p) => [p.caseId, p]));
  let teilesAcquis = 0;
  for (const p of computeCaseProgress(jusque)) for (const t of TEILE) {
    if (RANG[p.teile[t].status] >= RANG.acquis && RANG[avant.get(p.caseId)?.teile[t].status ?? 'vierge'] < RANG.acquis) teilesAcquis++;
  }
  const fachbegriffe = new Set(revus.filter((r) => { const at = Date.parse(r.occurred_at); return r.subject_id && at >= lundi && at <= maintenant; }).map((r) => r.subject_id)).size;
  return {
    cas: casJoues(journal, lundi, maintenant), teilesAcquis, fachbegriffe,
    seances: seances(jusque.filter((e) => e.at >= lundi)).length,
    casSemaineDerniere: casJoues(journal, subWeeks(lundi, 1).getTime(), subWeeks(maintenant, 1).getTime()),
  };
}

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n === 1 ? un : plusieurs}`;

export function texteSemaine(l: LigneSemaine): string {
  const parts = [
    l.cas && pluriel(l.cas, 'cas', 'cas'),
    l.teilesAcquis && pluriel(l.teilesAcquis, 'Teil acquis', 'Teile acquis'),
    l.fachbegriffe && pluriel(l.fachbegriffe, 'Fachbegriff', 'Fachbegriffe'),
  ].filter(Boolean);
  if (parts.length) return `Cette semaine : ${parts.join(', ')}.`;
  return l.seances ? `Cette semaine : ${pluriel(l.seances, 'séance', 'séances')}, sans partie jouée.` : 'Cette semaine : pas encore de séance.';
}

/** La tendance, en cas joués, à la même heure la semaine dernière. `null` quand il n'y a rien à comparer. */
export function tendanceSemaine(l: LigneSemaine): { sens: 'hausse' | 'baisse' | 'egal'; texte: string } | null {
  if (!l.cas && !l.casSemaineDerniere) return null;
  const d = l.cas - l.casSemaineDerniere;
  if (d === 0) return { sens: 'egal', texte: 'autant de cas que la semaine dernière à la même heure' };
  return { sens: d > 0 ? 'hausse' : 'baisse', texte: `${pluriel(Math.abs(d), 'cas', 'cas')} de ${d > 0 ? 'plus' : 'moins'} que la semaine dernière à la même heure` };
}
