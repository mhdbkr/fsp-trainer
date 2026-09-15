import { format, subDays } from 'date-fns';
import { db } from '@/db/db';
import type { Case, Fachbegriff, Fachwissen, AufklaerungItem, Simulation, PlanEntry, PartResult, ChecklistItem } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { checklistPct, languagePct, emptyLanguageGrid } from '@/lib/scoring';

// ----------------------------------------------------------------------------
// Linkage automatique : relie cas ↔ Fachbegriffe ↔ Fachwissen ↔ Aufklärungen
// de façon bidirectionnelle, sans avoir à maintenir les IDs à la main.
// Utilisé par contentLoader (src/lib/content/loader.ts) après application
// d'un delta de contenu — remplace l'ancien wiring fait dans ensureSeeded.
// ----------------------------------------------------------------------------
export function wireLinks(
  cases: Case[],
  fachbegriffe: Fachbegriff[],
  fachwissen: Fachwissen[],
  aufklaerungen: AufklaerungItem[],
) {
  // 1) Fachbegriff → cas : par correspondance pathologyTag ↔ case.pathology
  const casesByPathology = new Map<string, Case[]>();
  for (const c of cases) {
    const arr = casesByPathology.get(c.pathology) ?? [];
    arr.push(c);
    casesByPathology.set(c.pathology, arr);
  }
  for (const fb of fachbegriffe) {
    const linked = new Set<string>();
    for (const tag of fb.pathologyTags) {
      for (const c of casesByPathology.get(tag) ?? []) linked.add(c.id);
    }
    fb.linkedCaseIds = [...linked];
  }

  // 2) cas → Fachbegriffe : réciproque + termes de la même spécialité
  for (const c of cases) {
    const ids = new Set(c.linkedFachbegriffeIds);
    for (const fb of fachbegriffe) {
      if (fb.linkedCaseIds.includes(c.id)) ids.add(fb.id);
      else if (fb.pathologyTags.includes(c.pathology)) ids.add(fb.id);
    }
    c.linkedFachbegriffeIds = [...ids];
  }

  // 3) Fachwissen ↔ cas (par pathologie) + keyFachbegriffe (par tag)
  for (const fw of fachwissen) {
    fw.linkedCaseIds = cases.filter((c) => c.pathology === fw.pathology).map((c) => c.id);
    fw.keyFachbegriffeIds = fachbegriffe.filter((fb) => fb.pathologyTags.includes(fw.pathology)).map((fb) => fb.id);
    for (const cid of fw.linkedCaseIds) {
      const c = cases.find((x) => x.id === cid);
      if (c && !c.linkedFachwissenId) c.linkedFachwissenId = fw.id;
    }
  }

  // 4) Aufklärung ↔ cas (via probableAufklaerungIds des cas)
  for (const auf of aufklaerungen) {
    auf.linkedCaseIds = cases.filter((c) => c.probableAufklaerungIds.includes(auf.id)).map((c) => c.id);
  }
}

// ----------------------------------------------------------------------------
// Simulations de démonstration (pour peupler les stats dès le 1er lancement).
// ----------------------------------------------------------------------------
function mkPart(part: 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung', checkedRatio: number, feeling: number, withLang: boolean): PartResult {
  const checklist: ChecklistItem[] = checklistFor(part).map((it, i) => ({
    ...it,
    checked: i / checklistFor(part).length < checkedRatio,
  }));
  const grid = withLang ? { ...emptyLanguageGrid(), aussprache: 3, wortschatz: 3, grammatik: 4, redefluss: 3, kommunikation: 4 } : undefined;
  return {
    done: true,
    durationSec: part === 'anamnese' ? 1180 : part === 'dokumentation' ? 1150 : 720,
    checklist,
    languageGrid: grid,
    feeling,
    contentPct: checklistPct(checklist),
    officialPct: languagePct(grid),
  };
}

function demoSimulations(): Simulation[] {
  return [
    {
      id: 'sim-demo-1', caseId: 'case-angina-pectoris', date: subDays(new Date(), 6).getTime(), role: 'Candidat',
      parts: {
        anamnese: mkPart('anamnese', 0.7, 60, true),
        dokumentation: mkPart('dokumentation', 0.55, 45, false),
        fallvorstellung: mkPart('fallvorstellung', 0.5, 40, true),
      },
      notes: { aktuell: 'retrosternaler Druck, belastungsabh.', verdacht: 'Stabile AP bei KHK' },
      prioritizedCorrections: ['Konjunktiv I im Arztbrief üben', 'DD systematischer nennen'],
    },
    {
      id: 'sim-demo-2', caseId: 'case-pankreatitis', date: subDays(new Date(), 3).getTime(), role: 'Partenaire',
      parts: {
        anamnese: mkPart('anamnese', 0.85, 75, true),
        dokumentation: mkPart('dokumentation', 0.75, 65, false),
        fallvorstellung: mkPart('fallvorstellung', 0.7, 60, true),
        aufklaerung: mkPart('aufklaerung', 0.6, 55, true),
      },
      notes: { aktuell: 'gürtelförmiger Oberbauchschmerz', verdacht: 'akute biliäre Pankreatitis' },
      prioritizedCorrections: ['Aufklärung ÖGD flüssiger'],
    },
    {
      id: 'sim-demo-3', caseId: 'case-leberzirrhose', date: subDays(new Date(), 1).getTime(), role: 'Candidat',
      parts: {
        anamnese: mkPart('anamnese', 0.6, 50, true),
        fallvorstellung: mkPart('fallvorstellung', 0.45, 35, true),
      },
      notes: { aktuell: 'diffuse Bauchschmerzen, Aszites', verdacht: 'Leberzirrhose bei C2-Abusus' },
      prioritizedCorrections: ['Komplikationen der Zirrhose auswendig', 'Empathie beim Alkoholthema'],
    },
  ];
}

function demoPlan(): PlanEntry[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(subDays(new Date(), -1), 'yyyy-MM-dd');
  return [
    { id: 'plan-1', date: today, caseId: 'case-leberzirrhose', kind: 'simulation', label: 'Simulation Leberzirrhose', done: false },
    { id: 'plan-2', date: today, kind: 'drill', label: 'Drill Fachbegriffe (Gastro)', done: false },
    { id: 'plan-3', date: tomorrow, caseId: 'case-gib', kind: 'simulation', label: 'Simulation Obere GI-Blutung', done: false },
    { id: 'plan-4', date: format(subDays(new Date(), -3), 'yyyy-MM-dd'), caseId: 'case-angina-pectoris', kind: 'simulation', label: 'Simulation Angina pectoris', done: false },
  ];
}

/**
 * Seed des données de démo (simulations/plan) uniquement — le contenu
 * (cas, Fachwissen, Aufklärungen, guides, Fachbegriffe) est désormais géré
 * par contentLoader.sync() (src/lib/content/loader.ts), qui remplace
 * l'ancien ensureSeeded. Ne touche jamais aux tables de contenu.
 */
export async function ensureDemoData(): Promise<void> {
  await db.transaction('rw', [db.simulations, db.plan], async () => {
    if ((await db.simulations.count()) === 0) await db.simulations.bulkPut(demoSimulations());
    if ((await db.plan.count()) === 0) await db.plan.bulkPut(demoPlan());
  });
}
