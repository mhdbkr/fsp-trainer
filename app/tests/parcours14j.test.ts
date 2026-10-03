// C6 — le candidat synthétique, COUCHE LOGIQUE : quatorze jours ouvrés de
// préparation joués en accéléré sur le vrai corpus, la vraie base, l'horloge
// injectable et l'automate réel de la partie. À chaque soir, tous les
// invariants sont vérifiés. La couche navigateur (scripts/parcours-candidat.mjs)
// rejoue la même préparation à travers l'interface ; celle-ci tranche vite, en
// CI, et nomme la graine du parcours fautif.
//
// Persona : candidate FSP, trois heures par jour, examen dans 10 semaines,
// d'abord par Teil, puis cas complets ; deux jours manqués (jours 4 et 5), un
// drill libre, une partie interrompue en plein jeu (rechargement) puis reprise.
//
// Invariants vérifiés chaque soir :
//   INV-1  cocher ne fait jamais grandir le jour           INV-9   le jour figé est bit-identique
//   INV-2  la session du jour est dans le plan             INV-10  le journal local == le journal reconstruit
//   INV-3  aucun point faible par absence                  INV-12  la phase ne change pas avec l'horloge
//   INV-4  jamais deux spécialités identiques de suite     INV-23  un Lauf interrompu se reprend à l'identique
//   + un jour manqué ne se matérialise jamais après coup, et ne gonfle pas le suivant.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

import { db } from '@/db/db';
import { checklistFor } from '@/lib/checklists';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { ladeAktivenLauf, speichereAktivenLauf, speichern } from '@/lib/lauf/speichern';
import { logTraining, markTaskDone, pointFaible, rebuildJournal } from '@/lib/journal';
import { ensureDayPlan, sessionDuJour, taperDays } from '@/lib/program';
import type { Case, DayPlan, ProgramConfig, TaskInstance } from '@/db/types';
import { forAll, type Rng } from './helpers/prop';
import { CORPUS, TEILE, addDaysISO, partResult, resetTime, resetWorld, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const MODELLE = () => [...checklistFor('anamnese'), ...checklistFor('dokumentation'), ...checklistFor('fallvorstellung')];
const open = (p: DayPlan) => p.tasks.filter((t) => t.doneAt === undefined);

/** Ce que « figé » veut dire : tout sauf l'état fait/pas fait. */
const structure = (p: DayPlan) => JSON.stringify({
  date: p.date, mode: p.mode, seed: p.seed, targetMin: p.targetMin, materializedAt: p.materializedAt,
  tasks: p.tasks.map((t) => ({ id: t.id, kind: t.kind, caseId: t.caseId, teil: t.teil, label: t.label, estMin: t.estMin, reason: t.reason, specialty: t.specialty })),
});

/** L'état du journal tel que l'app le stocke, normalisé (JSON ignore les `undefined`). */
async function etatJournal() {
  const byKey = <T>(xs: T[], k: (x: T) => string) => [...xs].sort((a, b) => (k(a) < k(b) ? -1 : 1));
  return JSON.stringify({
    te: byKey(await db.training_events.toArray(), (x) => x.id),
    cp: byKey(await db.case_progress.toArray(), (x) => x.caseId),
    dp: byKey(await db.day_plans.toArray(), (x) => x.date).map((p) => ({ ...p, tasks: p.tasks.map((t) => ({ ...t })) })),
  });
}

/** Joue une tâche par le vrai chemin de son genre. Rend une phrase pour le journal du parcours. */
async function jouer(r: Rng, t: TaskInstance, tick: (ms: number) => void): Promise<string> {
  tick(r.int(60_000, 20 * 60_000));
  if (t.kind === 'simulation' && t.caseId && r.bool(0.8)) {
    const c = CORPUS.find((x) => x.id === t.caseId)! as Case;
    const teile = t.teil ? [t.teil] : TEILE;
    let l = erstelleLauf({ caseId: c.id, caseName: c.name, geplanteTeile: teile, assistance: t.assistance ?? 'autonome', layer: t.layer ?? 2, mode: 'texte', taskId: t.id });
    l = transition(l, { typ: 'demarrer', checkliste: MODELLE() });
    for (let i = 0; i < teile.length; i++) {
      tick(r.int(60_000, 600_000));
      l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(r.int(25, 98), { durationSec: r.int(300, 900) }) });
      if (i < teile.length - 1) l = transition(l, { typ: 'partieSuivante' });
    }
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    await speichern(l, c);
    return `${t.label} (${t.teil ?? 'cas complet'}) joué`;
  }
  await markTaskDone(t, r.int(1, 25));
  return `${t.label} coché`;
}

describe('Candidate synthétique — 14 jours ouvrés, 2 jours manqués, un drill libre, une interruption', () => {
  it('tous les invariants tiennent chaque soir, pour 6 candidates différentes', async () => {
    const bilan = { jours: 0, manques: 0, sims: 0, interruptions: 0, libres: 0, tapers: 0 };
    await forAll(6, async (r, seed) => {
      await resetWorld();
      const cfg: ProgramConfig = {
        startDate: '2026-10-05', examDate: r.pick(['2026-12-18', '2026-10-23']), intensity: 'mittel', hoursPerSession: 3,
        offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, modus: 'teil-first',
      } as ProgramConfig;
      await db.meta.put({ key: 'program', value: cfg } as never);
      const taper0 = JSON.stringify([...taperDays(cfg)]);
      const figes = new Map<string, string>();       // date → structure à la matérialisation
      let jour = 0;

      for (let cal = 0; jour < 14; cal++) {
        const date = addDaysISO('2026-10-05', cal);
        const dow = new Date(`${date}T12:00:00`).getDay();
        if (dow === 0 || dow === 6) continue;
        jour++;
        const tick = startOn(date);
        const ctx = (m: string) => `candidate ${seed}, jour ${jour} (${date}) : ${m}`;

        // Jours 4 et 5 : la candidate n'ouvre pas l'app. Aucun plan ne naît.
        if (jour === 4 || jour === 5) {
          bilan.manques++;
          expect(await db.day_plans.get(date), ctx('un jour manqué a un plan')).toBeUndefined();
          continue;
        }
        // Jour 8 : elle passe aux cas complets (le mode est un choix du candidat, figé jour par jour).
        if (jour === 8) await db.meta.put({ key: 'program', value: { ...cfg, modus: 'cas-complet' } } as never);

        const plan = (await ensureDayPlan(date))!;
        expect(plan, ctx('pas de plan à l’ouverture')).toBeTruthy();
        bilan.jours++;
        figes.set(date, structure(plan));
        // Ni jour futur, ni jour manqué rétroactif : exactement les jours OUVERTS ont un plan.
        expect(await db.day_plans.count(), ctx('des plans existent pour des jours non ouverts')).toBe(figes.size);
        expect(plan.mode, ctx('le mode figé')).toBe(jour >= 8 ? 'cas-complet' : 'teil-first');
        expect(plan.targetMin, ctx('le jour dépasse le budget de la candidate')).toBeLessThanOrEqual(180);
        // Après des jours manqués, le jour ne se gonfle pas pour « rattraper » : même budget, jamais dépassé.
        const prevu = plan.tasks.filter((t) => t.kind !== 'examen-blanc').reduce((n, t) => n + t.estMin, 0);
        expect(prevu, ctx(`rattrapage silencieux : ${prevu} min prévues pour un budget de ${plan.targetMin}`)).toBeLessThanOrEqual(plan.targetMin);

        // Dernière ligne droite : la répétition générale (examen à blanc) entre dans le plan, sans le gonfler.
        if (taperDays(cfg).has(date)) {
          bilan.tapers++;
          expect(plan.tasks.some((t) => t.kind === 'examen-blanc'), ctx('INV-12 : jour de dernière ligne droite sans répétition générale')).toBe(true);
        }

        // INV-4 sur ce plan (teil-first : seul mode où la diversité est une contrainte dure).
        if (plan.mode === 'teil-first') {
          const sp = plan.tasks.filter((t) => t.specialty);
          for (let i = 1; i < sp.length; i++) if (sp[i].specialty === sp[i - 1].specialty) expect(sp[i].diversityRelaxed, ctx('même spécialité de suite')).toBe(true);
        }

        // Interruption en pleine partie (jour 3) : on sérialise un Lauf commencé, on « recharge », on reprend à l'identique.
        if (jour === 3) {
          const sim = plan.tasks.find((t) => t.kind === 'simulation' && t.caseId);
          if (sim) {
            let l = erstelleLauf({ caseId: sim.caseId!, geplanteTeile: sim.teil ? [sim.teil] : TEILE, assistance: 'autonome', layer: 2, taskId: sim.id });
            l = transition(l, { typ: 'demarrer', checkliste: MODELLE() });
            l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(70, { durationSec: 600 }) });
            await speichereAktivenLauf(l);
            const repris = await ladeAktivenLauf();
            expect(repris, ctx('INV-23 : le Lauf interrompu ne se reprend pas à l’identique')).toEqual(l);
            bilan.interruptions++;
            await db.meta.delete('lauf.aktiv');
          }
        }

        // La journée : le plan, dans l'ordre, avec un drill libre le jour 6.
        let avant = open(plan).length;
        for (const t of plan.tasks) {
          if (r.bool(0.12)) continue;                // elle n'a pas tout fini
          const courante = (await db.day_plans.get(date))!.tasks.find((x) => x.id === t.id);
          expect(courante, ctx(`INV-9 : la tâche « ${t.label} » a disparu du plan figé`)).toBeTruthy();
          if (courante!.doneAt !== undefined) continue;
          await jouer(r, t, tick);
          const p = (await db.day_plans.get(date))!;
          expect(open(p).length, ctx(`INV-1 après « ${t.label} »`)).toBeLessThanOrEqual(avant);
          expect(p.tasks.length, ctx('le nombre de tâches a bougé')).toBe(plan.tasks.length);
          avant = open(p).length;
          const s = sessionDuJour(p);
          if (s) expect(p.tasks.some((x) => x.id === s.id), ctx('INV-2')).toBe(true);
          if (r.bool(0.1)) await ensureDayPlan(date);       // elle rouvre l'app
        }
        if (jour === 6) { tick(300_000); await logTraining({ kind: 'drill', spentMin: 15 }); bilan.libres++; }
        bilan.sims += (await db.simulations.count());

        // INV-9 : le jour figé est identique à sa matérialisation, quelle que soit l'heure.
        tick(10 * 3_600_000);
        const fin = (await ensureDayPlan(date))!;
        expect(structure(fin), ctx('INV-9 : le plan figé a changé dans la journée')).toBe(figes.get(date));
        // …et tous les jours passés sont restés tels qu'ils ont été figés.
        for (const [d, s] of figes) expect(structure((await db.day_plans.get(d))!), ctx(`INV-9 : le plan du ${d} a bougé après coup`)).toBe(s);

        // INV-12 : la phase d'une préparation ne dépend pas du jour où on la regarde.
        expect(JSON.stringify([...taperDays(cfg)]), ctx('INV-12 : la fenêtre de la dernière ligne droite a glissé')).toBe(taper0);

        // INV-3 : aucun point faible sans essai mesuré.
        for (const cp of await db.case_progress.toArray()) {
          for (const t of TEILE) if (pointFaible(cp, t)) expect(cp.teile[t].attempts, ctx(`INV-3 : ${cp.caseId}/${t}`)).toBeGreaterThanOrEqual(1);
        }

        // INV-10 : ce que l'app a écrit au fil de la journée == ce qu'on reconstruit depuis le journal source.
        const local = await etatJournal();
        await rebuildJournal();
        const rebuilt = await etatJournal();
        expect(rebuilt, ctx('INV-10 : le journal reconstruit diffère du journal local')).toBe(local);
        await rebuildJournal();
        expect(await etatJournal(), ctx('INV-10 : la reconstruction n’est pas idempotente')).toBe(rebuilt);
      }
    });
    // La préparation a réellement eu lieu — pas un parcours vide.
    expect(bilan.jours).toBe(6 * 12);
    expect(bilan.manques).toBe(6 * 2);
    expect(bilan.interruptions).toBeGreaterThanOrEqual(5);
    expect(bilan.libres).toBe(6);
    expect(bilan.tapers, 'la dernière ligne droite a été jouée').toBeGreaterThanOrEqual(3);
    expect(bilan.sims).toBeGreaterThan(100);
  }, 300_000);
});
