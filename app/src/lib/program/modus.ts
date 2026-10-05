// ============================================================================
// Le mode d'avancement — OBSERVÉ en silence, jamais proposé ni demandé.
// Contrat : training-journal.md §12.5 · INV-57 · ADR-0021 décision 1 (I8).
//
// Décision de direction du 4 oct. 2026 : l'app n'ouvre pas sur un questionnaire de
// stratégie, et elle ne propose plus « tu avances par Teil, je cale le programme ? ».
// `examen-blanc` et `specialite` restent des CHOIX EXPLICITES du candidat, respectés.
// Pour le reste, l'usage décide, entre deux valeurs seulement : `cas-complet` et la
// pondération interne `teil-first`. L'observation ne rend JAMAIS `examen-blanc` ni
// `specialite` : un plan qui pose des examens à blanc ferait observer « examen-blanc »,
// qui en poserait davantage — la boucle écartée.
//
// Ce qui est observé, et ce qui ne l'est pas : seules les séances MESURÉES portant un
// cas comptent. Une séance auto-déclarée dans une IA externe (`selbstbewertet`) entre
// dans l'historique et dans la série, mais elle ne dit rien de fiable sur la FORME du
// travail — elle ne vote pas ici non plus.
// ============================================================================
import type { Case, Fortschrittsmodus, ProgramConfig, SimTeil, Specialty, TrainingEvent } from '@/db/types';
import { TEILE } from '@/lib/simScope';

/** Trois séances : le seuil de la direction (« au bout d'environ trois
 *  sessions »). En dessous, on n'a pas une habitude, on a un échantillon. */
export const MIN_SEANCES = 3;

/** Fenêtre d'observation : le mode RÉCENT, pas la moyenne d'une vie. Quelqu'un
 *  qui a changé de méthode il y a trois séances doit se voir proposer la
 *  nouvelle, pas celle qu'il a abandonnée. */
const FENETRE = 8;

const TEIL_KEYS = TEILE.map((t) => t.key);

/** Le plus fréquent, et son compte. `null` sur une liste vide. */
function dominant<T>(xs: T[]): { value: T; count: number } | null {
  const tally = new Map<T, number>();
  for (const x of xs) tally.set(x, (tally.get(x) ?? 0) + 1);
  let best: { value: T; count: number } | null = null;
  for (const [value, count] of tally) if (!best || count > best.count) best = { value, count };
  return best;
}

/**
 * Ce que le journal DIT de la façon d'avancer — ou `null` quand il ne dit rien
 * d'assez net (trop peu de séances, ou aucune forme dominante). `null` est une
 * réponse normale : ne rien proposer vaut mieux que proposer au hasard.
 *
 * ponytail : heuristique de forme, pas de classifieur. Plafond assumé — elle
 * lit la répartition des Teile et des spécialités sur huit séances, rien de
 * plus. Si les propositions tombent à côté, la piste est de pondérer par les
 * minutes passées plutôt que par le nombre de séances ; pas un modèle appris.
 */
export function observation(
  events: readonly TrainingEvent[],
  cases: readonly Case[],
  minSeances = MIN_SEANCES,
): { modus: Fortschrittsmodus | null; teilHabituel?: SimTeil } {
  // Seules les séances mesurées et rattachées à un cas votent (cf. en-tête).
  // M4 : une coche manuelle porte le Teil de la TÂCHE — elle ne ferait que
  // refléter le plan. Seul un score mesuré fait d'un événement une séance.
  const seances = events.filter((e) => e.caseId && e.selbstbewertet !== true && !!e.scores && Object.keys(e.scores).length > 0);
  if (seances.length < minSeances) return { modus: null };

  const recent = seances.slice(-FENETRE);
  const part = (n: number) => n / recent.length;

  // 1. Examen blanc — des runs déclarés en conditions d'examen. Le genre porte
  //    déjà l'information, inutile de la redéduire.
  if (part(recent.filter((e) => e.kind === 'examen-blanc').length) >= 0.5) return { modus: 'examen-blanc' };

  // 2. Cas complet — la séance couvre le cas en entier avant de passer au suivant.
  if (part(recent.filter((e) => e.teile.length >= TEIL_KEYS.length).length) >= 0.5) return { modus: 'cas-complet' };

  // 3. Par partie — une seule partie à la fois, ET c'est LA MÊME d'une séance à
  //    l'autre, sur des cas DIFFÉRENTS. Les deux conditions comptent : refaire
  //    l'Anamnese du même cas trois fois, c'est de l'acharnement sur un cas,
  //    pas une progression par Teil. `teilHabituel` : le Teil que le candidat joue
  //    seul d'habitude — la durée d'une tâche se compte sur lui (§13.4, m13).
  const uniques = recent.filter((e) => e.teile.length === 1);
  if (part(uniques.length) >= 0.6) {
    const top = dominant(uniques.map((e) => e.teile[0]));
    if (top && top.count >= minSeances) {
      const casDuTeil = new Set(uniques.filter((e) => e.teile[0] === top.value).map((e) => e.caseId));
      if (casDuTeil.size >= 2) return { modus: 'teil-first', teilHabituel: top.value };
    }
  }

  // 4. Spécialité — le cap reste dans le même système, quelle que soit la partie.
  const specOf = new Map(cases.map((c) => [c.id, c.specialty]));
  const specs = recent.map((e) => specOf.get(e.caseId!)).filter((s): s is Specialty => s !== undefined);
  const topSpec = dominant(specs);
  if (topSpec && specs.length === recent.length && part(topSpec.count) >= 0.7) return { modus: 'specialite' };

  return { modus: null };
}

/** Le comportement BRUT de l'observation (série 3) : peut rendre `examen-blanc` ou `specialite`. Ne pilote plus rien
 *  seul — voir `observeMode`. */
export const observeModus = (events: readonly TrainingEvent[], cases: readonly Case[], minSeances = MIN_SEANCES): Fortschrittsmodus | null =>
  observation(events, cases, minSeances).modus;

/** Le mode OBSERVÉ (§12.5) : `teil-first` quand l'usage est de jouer une seule partie, `cas-complet` sinon — jamais
 *  `examen-blanc` ni `specialite`, qui ne se déduisent pas. */
export const observeMode = (events: readonly TrainingEvent[], cases: readonly Case[]): 'cas-complet' | 'teil-first' =>
  observeModus(events, cases) === 'teil-first' ? 'teil-first' : 'cas-complet';

/**
 * Le mode du jour (§12.5, INV-57). `examen-blanc` et `specialite` sont des choix EXPLICITES, respectés. Tout le reste
 * est observé sur le journal ANTÉRIEUR au jour : un `teil-first` explicite (ou `strategy`) d'une config série 3 devient
 * `cas-complet`, l'observation pouvant ensuite le retrouver.
 */
export function modeDuJour(config: Pick<ProgramConfig, 'modus'>, events: readonly TrainingEvent[], cases: readonly Case[]): Fortschrittsmodus {
  return config.modus === 'examen-blanc' || config.modus === 'specialite' ? config.modus : observeMode(events, cases);
}
