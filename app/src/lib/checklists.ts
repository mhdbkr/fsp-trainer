import type { ChecklistItem } from '@/db/types';

// ============================================================================
// Checklists de fin de partie — dérivées des attentes FSP réelles
// (livre Rogoveanu + templates ODAK). Le score contenu = % pondéré de cochés.
//
// Contrat : docs/contracts/simulation-run.md §4. Ce qui a changé et POURQUOI :
// les ids étaient POSITIONNELS, produits par un compteur de module remis à
// 0/100/200/300 — face à des chapitres d'anamnèse à ids sémantiques. Deux
// espaces d'identifiants disjoints : ce qui était coché pendant la partie ne
// pouvait pas remonter, et aucune analyse longitudinale (« ce critère, tu le
// rates toujours ») n'était possible. Les ids sont désormais des CONSTANTES
// LITTÉRALES écrites dans le source — aucun compteur, aucun index — et `kapitel`
// est le seul pont, explicite, vers la trame d'anamnèse.
//
// La liste rendue ici est un MODÈLE. L'instance vivante est `Lauf.checkliste`,
// créée une fois à `demarrer()` et jamais reconstruite (`PartEvaluation.tsx:16`
// la régénérait avec `checked: false` en dur à chaque ouverture du bilan).
// ============================================================================

/** Chapitres de la trame d'anamnèse (`data/guides/anamneseChapters.ts`).
 *  Réécrit ici plutôt qu'importé : `app/src/data/` appartient au chantier
 *  Contenu. `checklists.kapitel.test.ts` vérifie que les deux restent alignés. */
export type KapitelId =
  | 'eroeffnung' | 'personalia' | 'aktuell' | 'vegetativ' | 'vorerkrankungen'
  | 'medikamente' | 'allergien' | 'noxen' | 'familie-sozial' | 'frauenanamnese'
  | 'abschluss';

/** `ChecklistItem` + le pont vers la trame. Le champ `kapitel` n'est pas encore
 *  dans `db/types.ts` (chantier Programme, hors périmètre) ; le typage
 *  structurel de TypeScript le laisse passer partout où un `ChecklistItem` est
 *  attendu, et il est réellement persisté. Proposition de contrat ouverte :
 *  le remonter dans `db/types.ts:426`. */
export interface ChecklistModelItem extends ChecklistItem {
  kapitel?: KapitelId;
}

export type ChecklistTeil = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

/** Préfixe par Teil (§4.2 règle 2) — c'est ce qui permet à `Lauf.checkliste`
 *  d'être UNE liste plate : « la checklist de ce Teil » est un filtre. */
export const CHECKLIST_PREFIX: Record<ChecklistTeil, string> = {
  anamnese: 'anam-', dokumentation: 'doku-', fallvorstellung: 'fall-', aufklaerung: 'aufk-',
};

const ANAMNESE: readonly ChecklistModelItem[] = [
  { id: 'anam-eroeffnung', label: 'Gesprächseröffnung + Einverständnis eingeholt', checked: false, kapitel: 'eroeffnung' },
  { id: 'anam-personalia', label: 'Personalia vollständig (Name, Alter, Größe, Gewicht, Beruf)', checked: false, kapitel: 'personalia' },
  { id: 'anam-aktuell-opqrst', label: 'Aktuelle Beschwerden mit Schmerzanalyse (OPQRST)', checked: false, axisWeight: 2, kapitel: 'aktuell' },
  { id: 'anam-vegetativ', label: 'Vegetative Anamnese abgefragt', checked: false, kapitel: 'vegetativ' },
  { id: 'anam-vorerkrankungen', label: 'Vorerkrankungen / Voroperationen', checked: false, kapitel: 'vorerkrankungen' },
  { id: 'anam-medikamente', label: 'Medikamente (mit Dosierung)', checked: false, kapitel: 'medikamente' },
  { id: 'anam-allergien', label: 'Allergien inkl. Medikamentenallergien', checked: false, kapitel: 'allergien' },
  { id: 'anam-noxen', label: 'Noxen: Tabak (py), Alkohol (Konsum), Drogen', checked: false, kapitel: 'noxen' },
  { id: 'anam-familie-sozial', label: 'Familien- + Sozialanamnese', checked: false, kapitel: 'familie-sozial' },
  // Sans `kapitel` : ce sont des qualités de conduite d'entretien, pas des
  // chapitres de la trame. Le pont est explicite, jamais déduit (§4.2 règle 3).
  { id: 'anam-register', label: 'Patientengerechtes Register (kein Fachchinesisch)', checked: false, axisWeight: 2 },
  { id: 'anam-empathie', label: 'Empathie gezeigt, wo nötig', checked: false },
  { id: 'anam-gespraechskontrolle', label: 'Gesprächskontrolle (schwieriger Patient gemeistert)', checked: false },
  { id: 'anam-verdachtsdiagnose', label: 'Verdachtsdiagnose dem Patienten mitgeteilt', checked: false, axisWeight: 2, kapitel: 'abschluss' },
];

const DOKUMENTATION: readonly ChecklistModelItem[] = [
  { id: 'doku-anrede', label: 'Formelle Anrede + korrekter Briefkopf', checked: false },
  { id: 'doku-konjunktiv', label: 'Anamnese im Konjunktiv I wiedergegeben', checked: false, axisWeight: 2 },
  { id: 'doku-passiv', label: 'Maßnahmen in Passiv-Konstruktionen', checked: false, axisWeight: 2 },
  { id: 'doku-beschwerden', label: 'Haupt-/Nebenbeschwerden vollständig (Dativ-Paragraf)', checked: false },
  { id: 'doku-vegetativ-vor-med-all', label: 'Vegetative Anamnese, Vorerkrankungen, Medikamente, Allergien', checked: false },
  { id: 'doku-noxen', label: 'Noxen korrekt (py, "Alkoholkonsum" statt -abusus)', checked: false },
  { id: 'doku-verdacht-dd', label: 'Verdachtsdiagnose + Differenzialdiagnosen genannt', checked: false, axisWeight: 2 },
  { id: 'doku-diagnostik', label: 'Diagnostik-Maßnahmen sinnvoll (keine Peinlichkeiten)', checked: false },
  { id: 'doku-therapie', label: 'Therapie / Procedere skizziert', checked: false },
  { id: 'doku-schlussformeln', label: 'Schlussformeln nicht vergessen', checked: false, axisWeight: 2 },
  { id: 'doku-abkuerzungen', label: 'Abkürzungen korrekt (Z. n., V. a., b. B., o. g.)', checked: false },
];

const FALLVORSTELLUNG: readonly ChecklistModelItem[] = [
  { id: 'fall-begruessung', label: 'Begrüßung + Erlaubnis zur Vorstellung', checked: false },
  { id: 'fall-fachsprache', label: 'Fachsprache benutzt (kein Patientenregister)', checked: false, axisWeight: 2 },
  { id: 'fall-struktur', label: 'Struktur: AZ/EZ → Orientierung → Beschwerden', checked: false },
  { id: 'fall-konjunktiv', label: 'Anamnese im Konjunktiv I vorgetragen', checked: false, axisWeight: 2 },
  { id: 'fall-verdacht-dd', label: 'Verdachtsdiagnose + DD präsentiert', checked: false, axisWeight: 2 },
  { id: 'fall-diagnostik-reihenfolge', label: 'Diagnostik in Reihenfolge (körperlich → Labor → apparativ)', checked: false },
  { id: 'fall-therapie-prognose', label: 'Therapie / Prognose genannt', checked: false },
  { id: 'fall-redefluss', label: 'Redefluss / souveräner Vortrag', checked: false },
  { id: 'fall-pruefer-fragen', label: 'Fragen der Prüfer souverän beantwortet', checked: false, axisWeight: 2 },
  { id: 'fall-fachbegriffe', label: 'Fachbegriffe korrekt geklärt', checked: false },
  { id: 'fall-blackout', label: '"Das weiß ich nicht" + Rückfrage statt Blackout', checked: false },
];

const AUFKLAERUNG: readonly ChecklistModelItem[] = [
  { id: 'aufk-einleitung', label: 'Einleitung + Rücksprache mit OA erwähnt', checked: false },
  { id: 'aufk-metakommunikation', label: 'Metakommunikation (langsam/nachfragen angeboten)', checked: false },
  { id: 'aufk-warum-ablauf', label: 'Warum + Ablauf verständlich erklärt', checked: false, axisWeight: 2 },
  { id: 'aufk-vorbereitung', label: 'Vorbereitung (Nüchternheit, KM, Antikoagulation…)', checked: false },
  { id: 'aufk-standardrisiken', label: 'Standardrisiken genannt (Zugang, KM, Blutung)', checked: false, axisWeight: 2 },
  { id: 'aufk-spezifische-risiken', label: 'Spezifische Risiken der Maßnahme genannt', checked: false, axisWeight: 2 },
  { id: 'aufk-register', label: 'Patientengerechtes Register', checked: false },
  { id: 'aufk-rueckfragen', label: 'Rückfragen des Patienten gemeistert', checked: false },
  { id: 'aufk-einverstaendnis', label: 'Einverständnis + Unterschrift eingeholt', checked: false, axisWeight: 2 },
];

const MODELLE: Record<ChecklistTeil, readonly ChecklistModelItem[]> = {
  anamnese: ANAMNESE, dokumentation: DOKUMENTATION,
  fallvorstellung: FALLVORSTELLUNG, aufklaerung: AUFKLAERUNG,
};

/** La liste MODÈLE d'un Teil — copie fraîche, jamais la constante. */
export function checklistFor(part: ChecklistTeil): ChecklistModelItem[] {
  return MODELLE[part].map((i) => ({ ...i }));
}

export function anamneseChecklist() { return checklistFor('anamnese'); }
export function dokumentationChecklist() { return checklistFor('dokumentation'); }
export function fallvorstellungChecklist() { return checklistFor('fallvorstellung'); }
export function aufklaerungChecklist() { return checklistFor('aufklaerung'); }

/** Tous les items modèles, tous Teile confondus — pour les validateurs. */
export function alleChecklistItems(): ChecklistModelItem[] {
  return (Object.keys(MODELLE) as ChecklistTeil[]).flatMap(checklistFor);
}

/** L'item de checklist qui correspond à un chapitre de la trame d'anamnèse.
 *  C'est le SEUL pont entre les deux espaces d'identifiants (§4.2 règle 3), et
 *  il est explicite : rien n'est déduit d'un index ni d'un ordre. */
export function itemForKapitel(kapitel: string): ChecklistModelItem | undefined {
  return ANAMNESE.find((i) => i.kapitel === kapitel);
}
