// C6 — invariants de la partie (contrat simulation-run.md §7, §7.1).
//   INV-20/21/28  l'automate du Lauf ne revient jamais à un état antérieur
//   INV-22        une partie validée n fois produit UN enregistrement
//   [S4] INV-70/71/72 dans les mêmes suites aléatoires : entrée unique, « Terminer ici »
//   permis à chaque bilan, `springeZu` / `partieSuivante(t')` sous leurs gardes, aucun
//   Teil joué deux fois (simulation-run.md §8 : « INV-20/21/28 avec springeZu »).
// L'automate est testé en propriété sur des suites d'actions aléatoires, y
// compris les actions interdites (elles doivent être refusées, pas ignorées
// par hasard) ; l'écriture, sur la vraie chaîne hook → speichern → journal.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configure, act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

// 30 s par défaut ; les tests de PROPRIÉTÉ (boucles de tirages) déclarent leur propre délai, plus long.
configure({ asyncUtilTimeout: 10_000 });   // le défaut de 1 s de Testing Library déborde dès que la machine est chargée
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { checklistFor } from '@/lib/checklists';
import {
  erstelleLauf, erlaubt, tickChrono, transition, zustandIndex, type LaufAktion,
} from '@/lib/lauf/automat';
import { speichern } from '@/lib/lauf/speichern';
import type { Lauf } from '@/lib/lauf/types';
import { useLauf } from '@/features/simulation/useLauf';
import type { SimTeil } from '@/db/types';
import { forAll, type Rng } from './helpers/prop';
import { CORPUS, TEILE, partResult, resetTime, resetWorld, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const MODELLE = () => [...checklistFor('anamnese'), ...checklistFor('dokumentation'), ...checklistFor('fallvorstellung'), ...checklistFor('aufklaerung')];

function zufallsAktion(r: Rng): LaufAktion {
  switch (r.int(0, 10)) {
    case 0: return { typ: 'demarrer', teil: r.bool() ? r.pick(TEILE) : undefined, checkliste: MODELLE() };
    case 1: return { typ: 'aufklaerungOeffnen', checkliste: MODELLE() };
    case 2: case 3: return { typ: 'terminerPartie', ergebnis: partResult(r.int(0, 100), { durationSec: r.int(0, 900) }) };
    case 4: case 5: return { typ: 'partieSuivante', ...(r.bool() ? { teil: r.pick(TEILE) } : {}) };
    case 10: return { typ: 'springeZu', teil: r.pick(TEILE) };
    case 6: return { typ: 'versChecklist' };
    case 7: return r.bool() ? { typ: 'zurueckZurPartie' } : { typ: 'zurueckZumBilanz' };
    case 8: return { typ: 'arztbriefSchreiben' };
    default: return { typ: 'speichern' };
  }
}

/** Les SEULES transitions autorisées à baisser l'indice d'état (contrat §2.1, 3 exceptions nommées). */
const EXCEPTIONS = new Set<LaufAktion['typ']>(['partieSuivante', 'zurueckZurPartie', 'zurueckZumBilanz']);

describe('INV-20 / INV-21 / INV-28 — l’automate du Lauf ne revient jamais en arrière', () => {
  it('sur 500 suites d’actions aléatoires (permises ou non), à chaque pas', async () => {
    const vu = { gespeichert: 0, bilanz: 0, refus: 0, partieSuivante: 0, retours: 0, springeZu: 0, terminerIci: 0 };
    await forAll(500, (r) => {
      // [S4] Un Lauf neuf n'a qu'une forme (INV-70) ; les plans à un Teil sont des `lauf.aktiv` série 3
      // repris tels quels (§3.1), que l'automate sait encore finir.
      const serie3: SimTeil[] | null = r.pick([null, null, null, ['anamnese'], ['dokumentation', 'fallvorstellung'], ['fallvorstellung']] as (SimTeil[] | null)[]);
      let l: Lauf = serie3
        ? { ...erstelleLauf({ caseId: 'c1', assistance: 'autonome', layer: 2, mode: 'texte' }), geplanteTeile: serie3, modus: 'teil' }
        : erstelleLauf({ caseId: 'c1', assistance: 'autonome', layer: 2, mode: 'texte' });
      if (!serie3) expect(l.geplanteTeile, 'INV-70 : un Lauf neuf ne porte pas les trois Teile').toEqual(TEILE);
      for (let pas = 0; pas < 40; pas++) {
        const avant = l;
        const a = r.bool(0.15) ? null : zufallsAktion(r);
        if (!a) { l = tickChrono(l, r.pick([...TEILE, 'aufklaerung'] as const), r.int(-10, 3000)); }
        else l = transition(l, a);
        const ctx = `pas ${pas} ${a?.typ ?? 'tick'} : ${avant.zustand}/${avant.aktuellerTeil} → ${l.zustand}/${l.aktuellerTeil}`;

        if (a) {
          expect(erlaubt(avant, a), `erlaubt() contredit transition() — ${ctx}`).toBe(l !== avant);
          if (l === avant) vu.refus++;
          // INV-20 : baisser l'indice n'est permis qu'aux trois exceptions NOMMÉES.
          if (!EXCEPTIONS.has(a.typ)) expect(zustandIndex(l.zustand), `indice en recul sans exception — ${ctx}`).toBeGreaterThanOrEqual(zustandIndex(avant.zustand));
          if (a.typ === 'zurueckZurPartie' || a.typ === 'zurueckZumBilanz') { if (l !== avant) vu.retours++; }
          if (a.typ === 'partieSuivante' && l !== avant) {
            vu.partieSuivante++;
            // « Valider » ne ré-affiche jamais l'exercice qu'on vient de terminer :
            // la partie suivante est un Teil qu'on n'a PAS encore joué.
            expect(avant.teileGespielt, `partieSuivante ramène un Teil déjà joué — ${ctx}`).not.toContain(l.aktuellerTeil);
            // INV-72 : après une Aufklärung, le Teil interrompu d'abord.
            const interrompu = avant.teilVorAufklaerung && !avant.teileGespielt.includes(avant.teilVorAufklaerung) ? avant.teilVorAufklaerung : null;
            if (interrompu) expect(l.aktuellerTeil, `partieSuivante saute le Teil interrompu par l'Aufklärung — ${ctx}`).toBe(interrompu);
          }
          if (a.typ === 'springeZu' && l !== avant) {
            vu.springeZu++;
            // INV-72 : depuis laufend(t0), aucun SimTeil joué, jamais pendant une Aufklärung, vers un autre Teil planifié.
            expect(avant.zustand, ctx).toBe('laufend');
            expect(avant.aktuellerTeil, `springeZu pendant une Aufklärung — ${ctx}`).not.toBe('aufklaerung');
            expect(avant.teileGespielt.filter((t) => t !== 'aufklaerung'), `springeZu après un Teil terminé — ${ctx}`).toEqual([]);
            expect(l.aktuellerTeil, ctx).not.toBe(avant.aktuellerTeil);
            expect(avant.geplanteTeile, ctx).toContain(l.aktuellerTeil);
          }
          // INV-21 : terminer une partie en cours mène TOUJOURS au bilan.
          if (a.typ === 'terminerPartie' && avant.zustand === 'laufend' && avant.aktuellerTeil) {
            expect(l.zustand, `terminerPartie depuis laufend ne mène pas au bilan — ${ctx}`).toBe('bilanz');
            vu.bilanz++;
          }
        }
        // Terminal : aucune TRANSITION ne sort de `gespeichert` (le chrono est un champ, pas une transition).
        if (avant.zustand === 'gespeichert') {
          if (a) expect(l, `gespeichert n’est pas terminal — ${ctx}`).toBe(avant);
          else expect(l.zustand, `un tick a sorti le Lauf de gespeichert — ${ctx}`).toBe('gespeichert');
        }
        // Une partie jouée n’est jamais défaite.
        expect(l.teileGespielt.slice(0, avant.teileGespielt.length), `teileGespielt a reculé — ${ctx}`).toEqual(avant.teileGespielt);
        // INV-72 : un Teil n'est jamais joué deux fois dans un Lauf.
        expect(new Set(l.teileGespielt).size, `un Teil joué deux fois — ${ctx}`).toBe(l.teileGespielt.length);
        // INV-71 : à chaque bilan, « Terminer ici » est permis — quel que soit le reste.
        if (l.zustand === 'bilanz') {
          expect(erlaubt(l, { typ: 'versChecklist' }), `« Terminer ici » refusé au bilan — ${ctx}`).toBe(true);
          if (l.geplanteTeile.some((t) => !l.teileGespielt.includes(t))) vu.terminerIci++;
        }
        // INV-28 : aucun chrono ne décroît.
        for (const [t, s] of Object.entries(avant.sekundenProTeil)) {
          expect(l.sekundenProTeil[t as SimTeil] ?? 0, `chrono de ${t} en recul — ${ctx}`).toBeGreaterThanOrEqual(s as number);
        }
        if (l.zustand === 'gespeichert') vu.gespeichert++;
      }
    });
    // La preuve ne passe pas à vide : l'espace exploré contient bien les cas durs.
    expect(vu.bilanz).toBeGreaterThan(300);
    expect(vu.partieSuivante).toBeGreaterThan(100);
    expect(vu.retours).toBeGreaterThan(20);
    expect(vu.refus).toBeGreaterThan(3000);
    expect(vu.gespeichert).toBeGreaterThan(50);
    expect(vu.springeZu, 'springeZu jamais accepté : la garde n’est pas explorée').toBeGreaterThan(30);
    expect(vu.terminerIci, 'aucun bilan avec un Teil restant').toBeGreaterThan(100);
  }, 120_000);

  it('INV-21 [S4] — « Teil seul » = trois Teile planifiés, un seul joué : bilan, puis « Terminer ici »', () => {
    for (const depart of TEILE) {
      let l = transition(erstelleLauf({ caseId: 'c1', assistance: 'autonome', layer: 2 }), { typ: 'demarrer', teil: depart, checkliste: MODELLE() });
      l = transition(l, { typ: 'terminerPartie', ergebnis: partResult() });
      expect(l.zustand).toBe('bilanz');
      expect(l.aktuellerTeil).toBe(depart);
      expect(erlaubt(l, { typ: 'versChecklist' })).toBe(true);
    }
  });

  it('INV-21 — un Lauf série 3 à un Teil, repris : y compris le dernier, finit toujours par le bilan', () => {
    for (const plan of [['anamnese'], ['dokumentation'], ['fallvorstellung'], TEILE] as SimTeil[][]) {
      let l = erstelleLauf({ caseId: 'c1', geplanteTeile: plan, assistance: 'autonome', layer: 2 });   // série 3 : `geplanteTeile` n'est plus passé que par le harnais
      l = transition(l, { typ: 'demarrer', checkliste: MODELLE() });
      for (let i = 0; i < plan.length; i++) {
        l = transition(l, { typ: 'terminerPartie', ergebnis: partResult() });
        expect(l.zustand).toBe('bilanz');
        if (i < plan.length - 1) l = transition(l, { typ: 'partieSuivante' });
      }
      expect(erlaubt(l, { typ: 'versChecklist' })).toBe(true);
    }
  });
});

// ------------------------------------------------------------------- INV-22

const cas = () => CORPUS[0];
function lauf3(): Lauf {
  let l = erstelleLauf({ caseId: cas().id, caseName: cas().name, assistance: 'autonome', layer: 2, mode: 'texte' });
  l = transition(l, { typ: 'demarrer', checkliste: MODELLE() });
  for (let i = 0; i < 3; i++) {
    l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(70 + i) });
    if (i < 2) l = transition(l, { typ: 'partieSuivante' });
  }
  return transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
}

async function compte() {
  const evs = await db.progress_events.toArray();
  return {
    lignes: await db.simulations.count(),
    completed: evs.filter((e) => e.type === 'simulation.completed').length,
    journal: await db.training_events.count(),
  };
}

describe('INV-22 — une partie validée plusieurs fois produit un seul enregistrement', () => {
  it('speichern(lauf) × n, en série ou en rafale : une ligne, un événement de synchro, un événement de journal', async () => {
    await forAll(20, async (r) => {
      await resetWorld();
      startOn('2026-10-05');
      const l = lauf3();
      const n = r.int(2, 6);
      if (r.bool()) { for (let i = 0; i < n; i++) await speichern(l, cas()); }
      else await Promise.all(Array.from({ length: n }, () => speichern(l, cas())));
      expect(await compte()).toEqual({ lignes: 1, completed: 1, journal: 1 });
    });
  }, 120_000);

  it('le double clic sur « Enregistrer » dans le runner (beenden × 2 sans attendre) : un seul enregistrement', async () => {
    await db.cases.put(cas());
    startOn('2026-10-05');
    const { result } = renderHook(() => useLauf(cas(), null));
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('laufend'));
    for (let i = 0; i < 3; i++) {
      act(() => result.current.terminerPartie());
      if (i < 2) act(() => result.current.dispatch({ typ: 'partieSuivante' }));
    }
    act(() => result.current.versChecklist());
    await waitFor(() => expect(result.current.lauf?.zustand).toBe('checkliste'));
    let ids: (string | null)[] = [];
    await act(async () => { ids = await Promise.all([result.current.beenden(), result.current.beenden()]); });
    expect(ids.filter(Boolean).length).toBeGreaterThanOrEqual(1);
    expect(await compte()).toEqual({ lignes: 1, completed: 1, journal: 1 });
  });
});
