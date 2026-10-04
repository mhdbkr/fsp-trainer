import type { Case, Fachbegriff, Fachwissen, AufklaerungItem } from '@/db/types';

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
  //    + réciproque des liaisons par occurrence textuelle (spec F2a 3.5 : le
  //    contenu publié porte `case.linkedFachbegriffeIds` ; sans ce report,
  //    « Erscheint in Fällen » resterait vide pour tout terme non taggé).
  const casesByTerm = new Map<string, string[]>();
  for (const c of cases) {
    for (const termId of c.linkedFachbegriffeIds ?? []) {
      const arr = casesByTerm.get(termId);
      if (arr) arr.push(c.id); else casesByTerm.set(termId, [c.id]);
    }
  }
  for (const fb of fachbegriffe) {
    const linked = new Set<string>();
    for (const tag of fb.pathologyTags) {
      for (const c of casesByPathology.get(tag) ?? []) linked.add(c.id);
    }
    for (const cid of casesByTerm.get(fb.id) ?? []) linked.add(cid);
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
