import type { ChecklistItem } from '@/db/types';

// ============================================================================
// Checklists de fin de partie — régénérées à neuf à chaque simulation.
// Dérivées des attentes FSP réelles (livre Rogoveanu + templates ODAK).
// Ces critères concrets remplacent la note 1-5 : le score contenu = % cochés.
// ============================================================================

let uid = 0;
const mk = (label: string, axisWeight = 1): ChecklistItem => ({
  id: `cl-${uid++}`,
  label,
  checked: false,
  axisWeight,
});

export function anamneseChecklist(): ChecklistItem[] {
  uid = 0;
  return [
    mk('Gesprächseröffnung + Einverständnis eingeholt'),
    mk('Personalia vollständig (Name, Alter, Größe, Gewicht, Beruf)'),
    mk('Aktuelle Beschwerden mit Schmerzanalyse (OPQRST)', 2),
    mk('Vegetative Anamnese abgefragt'),
    mk('Vorerkrankungen / Voroperationen'),
    mk('Medikamente (mit Dosierung)'),
    mk('Allergien inkl. Medikamentenallergien'),
    mk('Noxen: Tabak (py), Alkohol (Konsum), Drogen'),
    mk('Familien- + Sozialanamnese'),
    mk('Patientengerechtes Register (kein Fachchinesisch)', 2),
    mk('Empathie gezeigt, wo nötig'),
    mk('Gesprächskontrolle (schwieriger Patient gemeistert)'),
    mk('Verdachtsdiagnose dem Patienten mitgeteilt', 2),
  ];
}

export function dokumentationChecklist(): ChecklistItem[] {
  uid = 100;
  return [
    mk('Formelle Anrede + korrekter Briefkopf'),
    mk('Anamnese im Konjunktiv I wiedergegeben', 2),
    mk('Maßnahmen in Passiv-Konstruktionen', 2),
    mk('Haupt-/Nebenbeschwerden vollständig (Dativ-Paragraf)'),
    mk('Vegetative Anamnese, Vorerkrankungen, Medikamente, Allergien'),
    mk('Noxen korrekt (py, "Alkoholkonsum" statt -abusus)'),
    mk('Verdachtsdiagnose + Differenzialdiagnosen genannt', 2),
    mk('Diagnostik-Maßnahmen sinnvoll (keine Peinlichkeiten)'),
    mk('Therapie / Procedere skizziert'),
    mk('Schlussformeln nicht vergessen', 2),
    mk('Abkürzungen korrekt (Z. n., V. a., b. B., o. g.)'),
  ];
}

export function fallvorstellungChecklist(): ChecklistItem[] {
  uid = 200;
  return [
    mk('Begrüßung + Erlaubnis zur Vorstellung'),
    mk('Fachsprache benutzt (kein Patientenregister)', 2),
    mk('Struktur: AZ/EZ → Orientierung → Beschwerden'),
    mk('Anamnese im Konjunktiv I vorgetragen', 2),
    mk('Verdachtsdiagnose + DD präsentiert', 2),
    mk('Diagnostik in Reihenfolge (körperlich → Labor → apparativ)'),
    mk('Therapie / Prognose genannt'),
    mk('Redefluss / souveräner Vortrag'),
    mk('Fragen der Prüfer souverän beantwortet', 2),
    mk('Fachbegriffe korrekt geklärt'),
    mk('"Das weiß ich nicht" + Rückfrage statt Blackout'),
  ];
}

export function aufklaerungChecklist(): ChecklistItem[] {
  uid = 300;
  return [
    mk('Einleitung + Rücksprache mit OA erwähnt'),
    mk('Metakommunikation (langsam/nachfragen angeboten)'),
    mk('Warum + Ablauf verständlich erklärt', 2),
    mk('Vorbereitung (Nüchternheit, KM, Antikoagulation…)'),
    mk('Standardrisiken genannt (Zugang, KM, Blutung)', 2),
    mk('Spezifische Risiken der Maßnahme genannt', 2),
    mk('Patientengerechtes Register'),
    mk('Rückfragen des Patienten gemeistert'),
    mk('Einverständnis + Unterschrift eingeholt', 2),
  ];
}

export function checklistFor(part: 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung'): ChecklistItem[] {
  switch (part) {
    case 'anamnese': return anamneseChecklist();
    case 'dokumentation': return dokumentationChecklist();
    case 'fallvorstellung': return fallvorstellungChecklist();
    case 'aufklaerung': return aufklaerungChecklist();
  }
}
