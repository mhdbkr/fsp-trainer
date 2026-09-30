// ============================================================================
// Le mode d'avancement — DÉDUIT, puis PROPOSÉ. Jamais demandé à l'inscription.
//
// Décision de direction (30 sept. 2026) : l'app n'ouvre pas sur un
// questionnaire de stratégie. Personne ne sait, au jour zéro, « comment il veut
// avancer » — la question demande au candidat de trancher ce que seul l'usage
// révèle. L'app OBSERVE, et au bout de quelques séances elle propose :
// « tu avances par Teil, je cale le programme là-dessus ? ». Le candidat
// confirme ou refuse ; le refus se retient (on ne repropose pas le même mode).
//
// Ce qui est observé, et ce qui ne l'est pas : seules les séances MESURÉES
// portant un cas comptent. Une séance auto-déclarée dans une IA externe
// (`selbstbewertet`) entre dans l'historique et dans la série, mais elle ne
// dit rien de fiable sur la FORME du travail — elle ne vote pas ici non plus.
// ============================================================================
import type { Case, Fortschrittsmodus, Specialty, TrainingEvent } from '@/db/types';
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
export function observeModus(
  events: TrainingEvent[],
  cases: Case[],
  minSeances = MIN_SEANCES,
): Fortschrittsmodus | null {
  // Seules les séances mesurées et rattachées à un cas votent (cf. en-tête).
  const seances = events.filter((e) => e.caseId && e.selbstbewertet !== true);
  if (seances.length < minSeances) return null;

  const recent = seances.slice(-FENETRE);
  const part = (n: number) => n / recent.length;

  // 1. Examen blanc — des runs déclarés en conditions d'examen. Le genre porte
  //    déjà l'information, inutile de la redéduire.
  if (part(recent.filter((e) => e.kind === 'examen-blanc').length) >= 0.5) return 'examen-blanc';

  // 2. Cas complet — la séance couvre le cas en entier avant de passer au suivant.
  if (part(recent.filter((e) => e.teile.length >= TEIL_KEYS.length).length) >= 0.5) return 'cas-complet';

  // 3. Par partie — une seule partie à la fois, ET c'est LA MÊME d'une séance à
  //    l'autre, sur des cas DIFFÉRENTS. Les deux conditions comptent : refaire
  //    l'Anamnese du même cas trois fois, c'est de l'acharnement sur un cas,
  //    pas une progression par Teil.
  const uniques = recent.filter((e) => e.teile.length === 1);
  if (part(uniques.length) >= 0.6) {
    const top = dominant(uniques.map((e) => e.teile[0]));
    if (top && top.count >= minSeances) {
      const casDuTeil = new Set(uniques.filter((e) => e.teile[0] === top.value).map((e) => e.caseId));
      if (casDuTeil.size >= 2) return 'teil-first';
    }
  }

  // 4. Spécialité — le cap reste dans le même système, quelle que soit la partie.
  const specOf = new Map(cases.map((c) => [c.id, c.specialty]));
  const specs = recent.map((e) => specOf.get(e.caseId!)).filter((s): s is Specialty => s !== undefined);
  const topSpec = dominant(specs);
  if (topSpec && specs.length === recent.length && part(topSpec.count) >= 0.7) return 'specialite';

  return null;
}

/**
 * Faut-il proposer quelque chose, ici, maintenant ? Trois raisons de se taire :
 * le journal ne dit rien de net, le mode observé est DÉJÀ celui du programme,
 * ou le candidat a déjà refusé celui-là. Un refus vaut pour ce mode seulement :
 * si l'usage change et désigne un autre mode, la question redevient légitime.
 */
export function modusAProposer(
  observe: Fortschrittsmodus | null,
  actuel: Fortschrittsmodus,
  refuse: Fortschrittsmodus | null,
): Fortschrittsmodus | null {
  if (!observe || observe === actuel || observe === refuse) return null;
  return observe;
}
