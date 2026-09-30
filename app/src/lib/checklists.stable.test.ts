import { describe, it, expect } from 'vitest';
import {
  alleChecklistItems, checklistFor, itemForKapitel, CHECKLIST_PREFIX,
  type ChecklistTeil,
} from './checklists';
import { LEGACY_CHECKLIST_IDS, LEGACY_ID_PATTERN, migriereChecklist, migriereSimulation } from './checklists.legacy';
import { ALLGEMEINE_ANAMNESE, abschlussChapterFor, aktuellChapterFor } from '@/data/guides/anamneseChapters';
import type { Simulation } from '@/db/types';

// ============================================================================
// Contrat §4 / INV-27. Ce qu'on verrouille : les ids de checklist sont des
// CONSTANTES SÉMANTIQUES, plus jamais un compteur de module (`uid` remis à
// 0/100/200/300), et la table de traduction legacy est TOTALE.
// ============================================================================

const TEILE: ChecklistTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung', 'aufklaerung'];

describe('INV-27 — aucun id positionnel dans le source', () => {
  it('aucun id ne correspond à /^cl-\\d+$/', () => {
    const offenders = alleChecklistItems().filter((i) => LEGACY_ID_PATTERN.test(i.id));
    expect(offenders.map((i) => i.id)).toEqual([]);
  });

  it('chaque id porte le préfixe de son Teil', () => {
    for (const t of TEILE) {
      for (const i of checklistFor(t)) expect(i.id.startsWith(CHECKLIST_PREFIX[t])).toBe(true);
    }
  });

  it('les ids sont uniques sur les quatre listes réunies', () => {
    const ids = alleChecklistItems().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('checklistFor rend une copie fraîche — jamais la constante partagée', () => {
    const a = checklistFor('anamnese');
    a[0].checked = true;
    expect(checklistFor('anamnese')[0].checked).toBe(false);
  });

  it('les longueurs et l’ordre de l’audit §2 sont inchangés (13 / 11 / 11 / 9)', () => {
    expect(checklistFor('anamnese')).toHaveLength(13);
    expect(checklistFor('dokumentation')).toHaveLength(11);
    expect(checklistFor('fallvorstellung')).toHaveLength(11);
    expect(checklistFor('aufklaerung')).toHaveLength(9);
  });

  it('les pondérations sont conservées à l’identique', () => {
    // `checklistPct` est pondéré (`scoring.ts:25-30`) : une pondération perdue
    // déplacerait silencieusement tous les scores de l'historique.
    const poids = (t: ChecklistTeil) => checklistFor(t).map((i) => i.axisWeight ?? 1);
    expect(poids('anamnese')).toEqual([1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2]);
    expect(poids('dokumentation')).toEqual([1, 2, 2, 1, 1, 1, 2, 1, 1, 2, 1]);
    expect(poids('fallvorstellung')).toEqual([1, 2, 1, 2, 2, 1, 1, 1, 2, 1, 1]);
    expect(poids('aufklaerung')).toEqual([1, 1, 2, 1, 2, 2, 1, 1, 2]);
  });
});

describe('§4.4 — la table legacy est totale et sans collision', () => {
  it('couvre exactement les 44 anciens ids', () => {
    const anciens = Object.keys(LEGACY_CHECKLIST_IDS);
    expect(anciens).toHaveLength(44);
    const attendus = [
      ...Array.from({ length: 13 }, (_, i) => `cl-${i}`),
      ...Array.from({ length: 11 }, (_, i) => `cl-${100 + i}`),
      ...Array.from({ length: 11 }, (_, i) => `cl-${200 + i}`),
      ...Array.from({ length: 9 }, (_, i) => `cl-${300 + i}`),
    ];
    expect(anciens.sort()).toEqual(attendus.sort());
  });

  it('chaque ancien id a exactement une image, et cette image existe', () => {
    const connus = new Set(alleChecklistItems().map((i) => i.id));
    const images = Object.values(LEGACY_CHECKLIST_IDS);
    expect(new Set(images).size).toBe(images.length);
    for (const img of images) expect(connus.has(img)).toBe(true);
  });

  it('respecte la table du contrat §4.3 pour l’Anamnese', () => {
    expect(LEGACY_CHECKLIST_IDS['cl-0']).toBe('anam-eroeffnung');
    expect(LEGACY_CHECKLIST_IDS['cl-2']).toBe('anam-aktuell-opqrst');
    expect(LEGACY_CHECKLIST_IDS['cl-9']).toBe('anam-register');
    expect(LEGACY_CHECKLIST_IDS['cl-12']).toBe('anam-verdachtsdiagnose');
  });

  it('l’image d’un ancien id est l’item de MÊME RANG dans la liste actuelle', () => {
    const rang = (t: ChecklistTeil, base: number) =>
      checklistFor(t).forEach((it, k) => expect(LEGACY_CHECKLIST_IDS[`cl-${base + k}`]).toBe(it.id));
    rang('anamnese', 0); rang('dokumentation', 100);
    rang('fallvorstellung', 200); rang('aufklaerung', 300);
  });

  it('migriereChecklist traduit sans toucher aux cases cochées', () => {
    const avant = [{ id: 'cl-2', label: 'x', checked: true, axisWeight: 2 }];
    const apres = migriereChecklist(avant);
    expect(apres[0]).toEqual({ id: 'anam-aktuell-opqrst', label: 'x', checked: true, axisWeight: 2 });
  });

  it('une liste déjà stable est rendue TELLE QUELLE (même référence)', () => {
    const deja = [{ id: 'anam-eroeffnung', label: 'x', checked: false }];
    expect(migriereChecklist(deja)).toBe(deja);
  });

  it('migriereSimulation traduit chaque partie sans réécrire la base', () => {
    const sim = {
      id: 's1', caseId: 'c1', date: 1, parts: {
        anamnese: { done: true, durationSec: 1, feeling: 50, contentPct: 0, officialPct: 0, checklist: [{ id: 'cl-1', label: 'p', checked: true }] },
      }, notes: {}, prioritizedCorrections: [], passed: true, assistance: 'assiste', layer: 1,
    } as unknown as Simulation;
    expect(migriereSimulation(sim).parts.anamnese!.checklist[0].id).toBe('anam-personalia');
    expect(sim.parts.anamnese!.checklist[0].id).toBe('cl-1');   // l'original intact
  });
});

describe('§4.2 règle 3 — `kapitel` est le seul pont, et il est vrai', () => {
  it('chaque `kapitel` déclaré existe réellement dans la trame d’anamnèse', () => {
    // Le pont serait inutile s'il pointait vers un chapitre inexistant : c'est
    // la garde qui empêche la dérive entre `lib/` et `data/guides/`.
    const ids = new Set<string>([
      ...ALLGEMEINE_ANAMNESE.map((ch) => ch.id),
      aktuellChapterFor('schmerz').id,
      abschlussChapterFor().id,
    ]);
    const kapitel = checklistFor('anamnese').map((i) => i.kapitel).filter(Boolean) as string[];
    expect(kapitel.length).toBeGreaterThan(0);
    for (const k of kapitel) expect(ids.has(k)).toBe(true);
  });

  it('un chapitre coché se retrouve sur un item unique', () => {
    expect(itemForKapitel('vegetativ')?.id).toBe('anam-vegetativ');
    expect(itemForKapitel('abschluss')?.id).toBe('anam-verdachtsdiagnose');
    // Pas de pont là où il n'y en a pas : la Fachanamnese n'est pas un critère.
    expect(itemForKapitel('fach')).toBeUndefined();
  });

  it('les Teile sans trame d’anamnèse n’ont aucun `kapitel`', () => {
    for (const t of ['dokumentation', 'fallvorstellung', 'aufklaerung'] as ChecklistTeil[]) {
      expect(checklistFor(t).every((i) => i.kapitel === undefined)).toBe(true);
    }
  });
});
