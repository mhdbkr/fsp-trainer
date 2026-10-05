import { describe, it, expect } from 'vitest';
import type { ChecklistItem, PartResult, SimTeil } from '@/db/types';
import type { Lauf } from './types';
import {
  REPRISE_TOLERANZ_MIN, enchainiert, erlaubt, erstelleLauf, naechsterTeil, nimmWiederAuf, tickChrono, transition, wegZu,
} from './automat';

// ============================================================================
// Série 4 — la partie, le cas entier (simulation-run.md §10, ADR-0021 déc. 1, 2).
//   INV-70  entrée unique : trois Teile planifiés, `komplett` ; le départ ne change que `demarrer`
//   INV-71  « Terminer ici » : `versChecklist` permis dès qu'un Teil est joué
//   INV-72  départ ailleurs : `springeZu` / `partieSuivante(t')`, gardes nommées
//   INV-73  enchaînement réel : `enchainiert`, `nimmWiederAuf` (tolérance de 5 min)
// ============================================================================

const CL = (id: string): ChecklistItem => ({ id, label: id, checked: false });
const MODELE = [CL('anam-eroeffnung'), CL('doku-anrede'), CL('fall-begruessung')];
const AUFK = [CL('aufk-einleitung')];
const resultat = (over: Partial<PartResult> = {}): PartResult => ({
  done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 70, officialPct: 60, ...over,
});

/** Un Lauf série 4 : AUCUN périmètre n'est passé — c'est l'entrée unique. */
const neu = () => erstelleLauf({ caseId: 'c1', caseName: 'Cas', profileId: 'p1', assistance: 'autonome', layer: 3, mode: 'texte' });
const demarre = (teil?: SimTeil) => transition(neu(), { typ: 'demarrer', teil, checkliste: MODELE });
const termine = (l: Lauf) => transition(l, { typ: 'terminerPartie', ergebnis: resultat() });

describe('INV-70 — entrée unique : la partie porte toujours les trois Teile', () => {
  it('un Lauf neuf planifie les trois Teile, dans l’ordre d’examen, en `komplett`', () => {
    const l = neu();
    expect(l.geplanteTeile).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(l.modus).toBe('komplett');
  });

  it('le départ ne change que le Teil de `demarrer`, jamais `geplanteTeile`', () => {
    for (const t of ['anamnese', 'dokumentation', 'fallvorstellung'] as const) {
      const l = demarre(t);
      expect(l.aktuellerTeil).toBe(t);
      expect(l.geplanteTeile).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
      expect(l.modus).toBe('komplett');
    }
  });
});

describe('INV-71 — « Terminer ici » : on s’arrête dès qu’un Teil est joué', () => {
  it('bilan de la première partie, deux Teile restent : `versChecklist` est permis', () => {
    const l = termine(demarre());
    expect(naechsterTeil(l)).toBe('dokumentation');               // il reste des Teile…
    expect(erlaubt(l, { typ: 'versChecklist' })).toBe(true);      // …et on peut s'arrêter
    expect(erlaubt(l, { typ: 'partieSuivante' })).toBe(true);     // « Continuer » et « Terminer ici » : les deux sorties
    expect(transition(l, { typ: 'versChecklist' }).zustand).toBe('checkliste');
  });

  it('[fixeur I4] seule l’Aufklärung jouée : « Terminer ici » est refusé — elle n’est pas un Teil (règle 7, §3.1)', () => {
    let l = transition(demarre(), { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    l = termine(l);
    expect(l.zustand).toBe('bilanz');
    expect(erlaubt(l, { typ: 'versChecklist' })).toBe(false);
    expect(transition(l, { typ: 'partieSuivante' }).aktuellerTeil).toBe('anamnese');   // « Continuer » ramène au Teil interrompu
  });

  it('plus aucun Teil : « Terminer ici » est la seule sortie', () => {
    let l = demarre();
    for (let i = 0; i < 3; i++) { l = termine(l); if (i < 2) l = transition(l, { typ: 'partieSuivante' }); }
    expect(erlaubt(l, { typ: 'partieSuivante' })).toBe(false);
    expect(erlaubt(l, { typ: 'versChecklist' })).toBe(true);
  });
});

describe('INV-72 — départ sur un autre Teil (`springeZu`), choix du suivant (`partieSuivante(t\')`)', () => {
  it('springeZu depuis laufend(t0), rien de joué, chrono de t0 pas lancé : laufend(t)', () => {
    const l = transition(demarre(), { typ: 'springeZu', teil: 'dokumentation' });
    expect(l.zustand).toBe('laufend');
    expect(l.aktuellerTeil).toBe('dokumentation');
    expect(l.teileGespielt).toEqual([]);                          // t0 n'est pas « joué »
    expect(l.geplanteTeile).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
  });

  // Fixeur I11 (décision de main, §10.2 amendé) : « commencer par » un autre Teil, c'est avant de commencer.
  // Une fois le chrono de t0 lancé, la pastille ne quitte plus un Teil en cours (esprit de la règle 8).
  it('[fixeur I11] springeZu refusé dès que le chrono du Teil de départ a démarré', () => {
    const l = tickChrono(demarre(), 'anamnese', 1);
    expect(erlaubt(l, { typ: 'springeZu', teil: 'dokumentation' })).toBe(false);
    expect(wegZu(l, 'dokumentation')).toBeNull();
  });

  it('springeZu refusé : vers le Teil courant, hors laufend, après un Teil terminé, pendant une Aufklärung', () => {
    const l = demarre();
    expect(erlaubt(l, { typ: 'springeZu', teil: 'anamnese' })).toBe(false);
    expect(erlaubt(neu(), { typ: 'springeZu', teil: 'dokumentation' })).toBe(false);
    const bilan = termine(l);
    expect(erlaubt(bilan, { typ: 'springeZu', teil: 'dokumentation' })).toBe(false);
    const apres = transition(bilan, { typ: 'partieSuivante' });   // laufend(dokumentation), l'Anamnese jouée
    expect(erlaubt(apres, { typ: 'springeZu', teil: 'fallvorstellung' })).toBe(false);
    const aufk = transition(l, { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    expect(erlaubt(aufk, { typ: 'springeZu', teil: 'dokumentation' })).toBe(false);
  });

  it('springeZu refusé vers un Teil non planifié (Lauf série 3 à un Teil, repris tel quel)', () => {
    const serie3: Lauf = { ...neu(), geplanteTeile: ['anamnese'], modus: 'teil' };
    const l = transition(serie3, { typ: 'demarrer', checkliste: MODELE });
    expect(erlaubt(l, { typ: 'springeZu', teil: 'dokumentation' })).toBe(false);
  });

  it('springeZu reste permis après une Aufklärung terminée (elle n’est pas un Teil joué)', () => {
    let l = transition(demarre(), { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    l = transition(termine(l), { typ: 'partieSuivante' });         // retour à l'Anamnese
    expect(l.aktuellerTeil).toBe('anamnese');
    expect(erlaubt(l, { typ: 'springeZu', teil: 'fallvorstellung' })).toBe(true);
  });

  it('partieSuivante(t\') choisit un Teil non joué ; refuse un Teil déjà joué', () => {
    const bilan = termine(demarre());                             // Anamnese jouée
    const l = transition(bilan, { typ: 'partieSuivante', teil: 'fallvorstellung' });
    expect(l.zustand).toBe('laufend');
    expect(l.aktuellerTeil).toBe('fallvorstellung');
    expect(erlaubt(bilan, { typ: 'partieSuivante', teil: 'anamnese' })).toBe(false);
  });

  it('bilanz(aufklaerung) avec le Teil interrompu non joué : seul ce Teil est accepté', () => {
    let l = transition(demarre('dokumentation'), { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    l = termine(l);
    expect(l.aktuellerTeil).toBe('aufklaerung');
    expect(erlaubt(l, { typ: 'partieSuivante', teil: 'anamnese' })).toBe(false);
    expect(erlaubt(l, { typ: 'partieSuivante', teil: 'fallvorstellung' })).toBe(false);
    expect(transition(l, { typ: 'partieSuivante', teil: 'dokumentation' }).aktuellerTeil).toBe('dokumentation');
    expect(transition(l, { typ: 'partieSuivante' }).aktuellerTeil).toBe('dokumentation');
  });

  it('départ sur la Dokumentation : « Continuer » propose ensuite le premier Teil non joué dans l’ordre', () => {
    let l = termine(transition(demarre(), { typ: 'springeZu', teil: 'dokumentation' }));
    expect(l.teileGespielt).toEqual(['dokumentation']);
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.aktuellerTeil).toBe('anamnese');
  });
});

describe('§10.2 — le fil d’étapes demande à l’automate (`wegZu`)', () => {
  it('en partie, rien de joué : « commencer par » les autres Teile, jamais le Teil courant', () => {
    const l = demarre();
    expect(wegZu(l, 'anamnese')).toBeNull();
    expect(wegZu(l, 'dokumentation')).toEqual({ typ: 'springeZu', teil: 'dokumentation' });
  });
  it('au bilan : « continuer par » un AUTRE Teil restant ; ni un Teil joué, ni celui de « Continuer — X » (M6)', () => {
    const l = termine(demarre());
    expect(wegZu(l, 'anamnese')).toBeNull();
    expect(wegZu(l, 'dokumentation')).toBeNull();              // le Teil par défaut : « Continuer — Dokumentation » le fait déjà
    expect(wegZu(l, 'fallvorstellung')).toEqual({ typ: 'partieSuivante', teil: 'fallvorstellung' });
  });
  it('en partie après un Teil joué, et pendant une Aufklärung : aucun saut', () => {
    const l = transition(termine(demarre()), { typ: 'partieSuivante' });
    expect(wegZu(l, 'fallvorstellung')).toBeNull();
    const a = transition(demarre(), { typ: 'aufklaerungOeffnen', checkliste: AUFK });
    expect(wegZu(a, 'dokumentation')).toBeNull();
  });
});

describe('INV-73 — l’enchaînement réel', () => {
  const troisJoues = (over: Partial<Lauf> = {}) => {
    let l = demarre();
    for (let i = 0; i < 3; i++) { l = termine(l); if (i < 2) l = transition(l, { typ: 'partieSuivante' }); }
    return { ...l, ...over };
  };

  it('les trois Teile d’une même partie, sans interruption, hors IA externe ⇒ enchaîné', () => {
    expect(enchainiert(troisJoues())).toBe(true);
    expect(enchainiert(troisJoues({ unterbrochen: true }))).toBe(false);
    expect(enchainiert(troisJoues({ mode: 'external-ai' }))).toBe(false);
    expect(enchainiert(termine(demarre()))).toBe(false);
  });

  it('enchaîné ne contraint pas l’ordre : D → A → F l’est aussi', () => {
    let l = termine(transition(demarre(), { typ: 'springeZu', teil: 'dokumentation' }));
    l = termine(transition(l, { typ: 'partieSuivante', teil: 'anamnese' }));
    l = termine(transition(l, { typ: 'partieSuivante', teil: 'fallvorstellung' }));
    expect(l.teileGespielt).toEqual(['dokumentation', 'anamnese', 'fallvorstellung']);
    expect(enchainiert(l)).toBe(true);
  });

  it('nimmWiederAuf : une pause de 30 s ou de 4 min 59 s ne casse rien ; 5 min, si', () => {
    const t0 = Date.UTC(2026, 9, 5, 18, 0, 0);
    const l: Lauf = { ...demarre(), zuletztAktiv: t0 };
    expect(nimmWiederAuf(l, t0 + 30_000)).toBe(l);
    expect(nimmWiederAuf(l, t0 + 4 * 60_000 + 59_000)).toBe(l);
    expect(nimmWiederAuf(l, t0 + REPRISE_TOLERANZ_MIN * 60_000).unterbrochen).toBe(true);
  });

  it('[fixeur M3] les trois Teile joués : une pause au bilan final ou à la checklist n’interrompt rien', () => {
    let l = demarre();
    for (let i = 0; i < 3; i++) { l = termine(l); if (i < 2) l = transition(l, { typ: 'partieSuivante' }); }
    const t0 = Date.UTC(2026, 9, 5, 18, 0, 0);
    expect(nimmWiederAuf({ ...l, zuletztAktiv: t0 }, t0 + 60 * 60_000).unterbrochen).toBeUndefined();
    const ck = transition({ ...l, zuletztAktiv: t0 }, { typ: 'versChecklist' });
    expect(nimmWiederAuf(ck, t0 + 60 * 60_000).unterbrochen).toBeUndefined();
    expect(enchainiert(nimmWiederAuf(ck, t0 + 60 * 60_000))).toBe(true);
  });

  it('un Lauf série 3 sans `zuletztAktiv` repris est interrompu ; la marque n’est jamais retirée', () => {
    const l = demarre();
    expect(l.zuletztAktiv).toBeUndefined();
    const repris = nimmWiederAuf(l, Date.now());
    expect(repris.unterbrochen).toBe(true);
    expect(nimmWiederAuf({ ...repris, zuletztAktiv: Date.now() }, Date.now()).unterbrochen).toBe(true);
  });

  it('aucune transition ne pose ni ne retire `unterbrochen` (seul nimmWiederAuf le pose)', () => {
    let l: Lauf = { ...demarre(), unterbrochen: true };
    l = termine(l);
    l = transition(l, { typ: 'partieSuivante' });
    expect(l.unterbrochen).toBe(true);
    let m = termine(demarre());
    m = transition(m, { typ: 'zurueckZurPartie' });
    expect(m.unterbrochen).toBeUndefined();
  });
});
