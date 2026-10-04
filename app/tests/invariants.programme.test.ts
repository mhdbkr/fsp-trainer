// C6 — invariants du Programme, en propriété (contrat training-journal.md §7).
//   INV-1  cocher une tâche ne fait jamais grandir les tâches ouvertes du jour
//   INV-2  la session du jour appartient toujours au plan du jour
//   INV-4  deux spécialités identiques ne se suivent jamais dans un plan
// Le monde est le vrai : 130 cas, fake-indexeddb, horloge injectable. Rien du
// code applicatif n'est mocké hors réseau. Une graine = un parcours rejouable.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

// 30 s par défaut ; les tests de PROPRIÉTÉ (boucles de tirages) déclarent leur propre délai, plus long.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { logTraining, markTaskDone, rebuildJournal } from '@/lib/journal';
import { saveSimulation } from '@/lib/simulationSave';
import { ensureDayPlan, sessionDuJour } from '@/lib/program';
import type { DayPlan, ProgramConfig, TaskInstance } from '@/db/types';
import { forAll, type Rng } from './helpers/prop';
import {
  CORPUS, TEILE, addDaysISO, partResult, randomConfig, resetTime, resetWorld, startOn,
} from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const open = (p: DayPlan | undefined | null) => (p?.tasks ?? []).filter((t) => t.doneAt === undefined);
const planOf = async (date: string) => (await db.day_plans.get(date))!;

/** Un geste de candidat. `coche` est celui que INV-1 garde ; les autres sont
 *  des exercices libres ou des redémarrages qui ne doivent RIEN ajouter. */
type Geste = 'coche' | 'double-coche' | 'drill-libre' | 'fiche-libre' | 'sim-libre' | 'redemarrage' | 'reconstruction';
const GESTES: Geste[] = ['coche', 'coche', 'coche', 'double-coche', 'drill-libre', 'fiche-libre', 'sim-libre', 'redemarrage', 'reconstruction'];

async function jouer(r: Rng, g: Geste, date: string, tick: () => void): Promise<void> {
  const plan = await planOf(date);
  const restantes = open(plan);
  tick();
  switch (g) {
    case 'coche': if (restantes.length) await markTaskDone(r.pick(restantes), r.int(0, 30)); break;
    case 'double-coche': if (restantes.length) { const t = r.pick(restantes); await Promise.all([markTaskDone(t), markTaskDone(t)]); } break;
    case 'drill-libre': await logTraining({ kind: 'drill', spentMin: r.int(1, 20) }); break;
    case 'fiche-libre': await logTraining({ kind: 'fiche', caseId: r.pick(CORPUS).id, spentMin: r.int(1, 15) }); break;
    case 'sim-libre': {
      const teile = r.shuffle(TEILE).slice(0, r.int(1, 3));
      await saveSimulation({
        c: r.pick(CORPUS), assistance: 'autonome', layer: r.pick([1, 2, 3] as const),
        parts: Object.fromEntries(teile.map((t) => [t, partResult(r.int(20, 100))])),
        scope: teile.length === 3 ? 'full' : 'teil', ...(teile.length === 1 ? { teil: teile[0] } : {}),
      });
      break;
    }
    case 'redemarrage': await ensureDayPlan(date); break;
    case 'reconstruction': await rebuildJournal(); break;
  }
}

describe('INV-1 et INV-2 — cocher ne fait pas grandir le jour, la session reste dans le plan', () => {
  it('sur 24 parcours aléatoires de 5 jours, quel que soit le geste', async () => {
    const mesures = { coches: 0, ferme: 0, jours: 0 };
    expect(CORPUS.length).toBeGreaterThanOrEqual(130);
    await forAll(24, async (r) => {
      await resetWorld();
      await db.meta.put({ key: 'program', value: randomConfig(r) } as never);
      for (let j = 0; j < 5; j++) {
        const date = addDaysISO('2026-10-05', j);
        const tick = startOn(date);
        const plan = await ensureDayPlan(date);
        if (!plan || plan.tasks.length === 0) continue;
        mesures.jours++;
        const ids = plan.tasks.map((t) => t.id).sort();
        for (let k = 0, n = r.int(2, 8); k < n; k++) {
          const g = r.pick(GESTES);
          const avant = open(await planOf(date)).length;
          await jouer(r, g, date, () => tick(r.int(1, 3_600_000)));
          const p = await planOf(date);
          if (g === 'coche' && open(p).length < avant) mesures.coches++;
          if (open(p).length === 0) mesures.ferme++;
          expect(open(p).length, `« ${g} » a fait grandir les tâches ouvertes (${avant} → ${open(p).length}) le ${date}`).toBeLessThanOrEqual(avant);
          expect(p.tasks.map((t) => t.id).sort(), `« ${g} » a changé la liste des tâches du ${date}`).toEqual(ids);
          // INV-2 : la session du jour est une tâche DU plan — la première non faite, ou rien.
          const s = sessionDuJour(p);
          if (open(p).length === 0) expect(s, `plan fini le ${date} mais une session est proposée`).toBeNull();
          else expect(p.tasks.map((t) => t.id), `la session « ${s?.label} » n'est pas dans le plan du ${date}`).toContain(s!.id);
        }
      }
    });
    // La preuve ne passe pas à vide : des coches ont VRAIMENT fermé des tâches, sur des jours réels.
    expect(mesures.jours).toBeGreaterThan(60);
    expect(mesures.coches).toBeGreaterThan(100);
  }, 180_000);

  it('INV-2 — tout état de plan, y compris tronqué ou vide', async () => {
    await forAll(300, (r) => {
      const n = r.int(0, 8);
      const tasks = Array.from({ length: n }, (_, i) => ({
        id: `t${i}`, date: '2026-10-05', kind: 'simulation', label: `L${i}`, estMin: 20, source: 'plan', reason: 'x',
        ...(r.bool() ? { doneAt: i } : {}),
      })) as TaskInstance[];
      const plan = { date: '2026-10-05', materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 60, tasks } as DayPlan;
      const s = sessionDuJour(plan);
      if (s) { expect(tasks).toContain(s); expect(s.doneAt).toBeUndefined(); expect(tasks.slice(0, tasks.indexOf(s)).every((t) => t.doneAt !== undefined)).toBe(true); }
      else expect(tasks.every((t) => t.doneAt !== undefined)).toBe(true);
      expect(sessionDuJour(null)).toBeNull();
      expect(sessionDuJour(undefined)).toBeNull();
    });
  }, 120_000);
});

describe('INV-4 — deux spécialités identiques ne se suivent jamais dans un plan', () => {
  it('14 jours ouvrés de préparation (20 jours calendaires) sur le corpus complet, en teil-first, plan après plan', async () => {
    const vues: string[] = [];
    await forAll(6, async (r, seed) => {
      await resetWorld();
      const cfg: ProgramConfig = randomConfig(r, { modus: 'teil-first', hoursPerSession: r.pick([2, 3]), intensity: 'intensiv' });
      await db.meta.put({ key: 'program', value: cfg } as never);
      let sims = 0;
      for (let j = 0; j < 20 && sims < 14 * 3; j++) {
        const date = addDaysISO('2026-10-05', j);
        const tick = startOn(date);
        const plan = await ensureDayPlan(date);
        if (!plan || plan.tasks.length === 0) continue;
        const sp = plan.tasks.filter((t) => t.specialty);
        for (let i = 1; i < sp.length; i++) {
          if (sp[i].specialty === sp[i - 1].specialty && sp[i].diversityRelaxed !== true) {
            throw new Error(`${date} : « ${sp[i - 1].label} » puis « ${sp[i].label} » = ${sp[i].specialty}, sans relâchement tracé`);
          }
        }
        sims += plan.tasks.filter((t) => t.kind === 'simulation').length;
        vues.push(`${seed}:${date}:${sp.length}`);
        // le candidat joue la journée : ce que le plan sait du lendemain change vraiment
        for (const t of plan.tasks.filter((x) => x.doneAt === undefined)) {
          tick(60_000);
          if (t.kind === 'simulation' && t.caseId && r.bool(0.6)) {
            const c = CORPUS.find((x) => x.id === t.caseId)!;
            const teile = t.teil ? [t.teil] : TEILE;
            await saveSimulation({ c, assistance: 'autonome', layer: 2, taskId: t.id,
              parts: Object.fromEntries(teile.map((x) => [x, partResult(r.int(30, 95))])),
              scope: t.teil ? 'teil' : 'full', ...(t.teil ? { teil: t.teil } : {}) });
          } else await markTaskDone(t, 5);
        }
      }
    });
    // la preuve ne passe pas à vide : des plans à ≥ 2 spécialités ont bien été mesurés
    expect(vues.filter((v) => Number(v.split(':')[2]) >= 2).length).toBeGreaterThan(20);
  }, 240_000);
});
