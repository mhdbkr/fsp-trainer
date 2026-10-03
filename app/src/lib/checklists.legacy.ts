import type { ChecklistItem, PartResult, Simulation } from '@/db/types';

// ============================================================================
// Traduction À LA LECTURE des 44 ids positionnels de l'historique.
// Contrat : docs/contracts/simulation-run.md §4.4.
//
// Les anciens ids venaient d'un compteur de module remis à 0/100/200/300
// (`checklists.ts:9-15` avant la série 3). L'ordre des quatre listes est figé
// depuis l'origine, donc la traduction est TOTALE et sans perte.
//
// La table est écrite LITTÉRALEMENT, pas dérivée d'un index : dérivée, elle
// changerait silencieusement de sens le jour où un item serait inséré au milieu
// d'une liste. C'est précisément le défaut dont on sort.
//
// `db.simulations` n'est JAMAIS réécrite : on traduit ce qu'on lit.
// ============================================================================

export const LEGACY_CHECKLIST_IDS: Readonly<Record<string, string>> = {
  // Anamnese
  'cl-0': 'anam-eroeffnung',
  'cl-1': 'anam-personalia',
  'cl-2': 'anam-aktuell-opqrst',
  'cl-3': 'anam-vegetativ',
  'cl-4': 'anam-vorerkrankungen',
  'cl-5': 'anam-medikamente',
  'cl-6': 'anam-allergien',
  'cl-7': 'anam-noxen',
  'cl-8': 'anam-familie-sozial',
  'cl-9': 'anam-register',
  'cl-10': 'anam-empathie',
  'cl-11': 'anam-gespraechskontrolle',
  'cl-12': 'anam-verdachtsdiagnose',
  // Dokumentation
  'cl-100': 'doku-anrede',
  'cl-101': 'doku-konjunktiv',
  'cl-102': 'doku-passiv',
  'cl-103': 'doku-beschwerden',
  'cl-104': 'doku-vegetativ-vor-med-all',
  'cl-105': 'doku-noxen',
  'cl-106': 'doku-verdacht-dd',
  'cl-107': 'doku-diagnostik',
  'cl-108': 'doku-therapie',
  'cl-109': 'doku-schlussformeln',
  'cl-110': 'doku-abkuerzungen',
  // Fallvorstellung
  'cl-200': 'fall-begruessung',
  'cl-201': 'fall-fachsprache',
  'cl-202': 'fall-struktur',
  'cl-203': 'fall-konjunktiv',
  'cl-204': 'fall-verdacht-dd',
  'cl-205': 'fall-diagnostik-reihenfolge',
  'cl-206': 'fall-therapie-prognose',
  'cl-207': 'fall-redefluss',
  'cl-208': 'fall-pruefer-fragen',
  'cl-209': 'fall-fachbegriffe',
  'cl-210': 'fall-blackout',
  // Aufklärung
  'cl-300': 'aufk-einleitung',
  'cl-301': 'aufk-metakommunikation',
  'cl-302': 'aufk-warum-ablauf',
  'cl-303': 'aufk-vorbereitung',
  'cl-304': 'aufk-standardrisiken',
  'cl-305': 'aufk-spezifische-risiken',
  'cl-306': 'aufk-register',
  'cl-307': 'aufk-rueckfragen',
  'cl-308': 'aufk-einverstaendnis',
};

export const LEGACY_ID_PATTERN = /^cl-\d+$/;

/** Id stable d'un item, quelle que soit son époque. Un id inconnu est rendu
 *  tel quel : on préfère un id orphelin à une perte d'information. */
export function stabilerItemId(id: string): string {
  return LEGACY_CHECKLIST_IDS[id] ?? id;
}

export function migriereChecklist<T extends ChecklistItem>(items: T[]): T[] {
  let geaendert = false;
  const out = items.map((it) => {
    const id = stabilerItemId(it.id);
    if (id === it.id) return it;
    geaendert = true;
    return { ...it, id };
  });
  return geaendert ? out : items;
}

/** Traduit les ids d'une `Simulation` LUE en base. Ne l'écrit pas. */
export function migriereSimulation(sim: Simulation): Simulation {
  let geaendert = false;
  const parts: Simulation['parts'] = {};
  for (const [teil, p] of Object.entries(sim.parts) as [keyof Simulation['parts'], PartResult | undefined][]) {
    if (!p) continue;
    const checklist = migriereChecklist(p.checklist ?? []);
    if (checklist !== p.checklist) geaendert = true;
    parts[teil] = checklist === p.checklist ? p : { ...p, checklist };
  }
  return geaendert ? { ...sim, parts } : sim;
}
