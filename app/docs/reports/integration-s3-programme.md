# Plan d'intégration de `feat/s3-programme` dans `main`

> Revue de clôture (Opus) sur `8efa388` contre `origin/main` @ `63da323f`
> (#54 simulation, #55 contenu, #56 IA) : **Approve with minors**.
> `git merge-tree` : aucun conflit textuel. Arbre fusionné : tsc 0,
> vitest 974/974 (`--maxWorkers=2`), build 0, checkUiTells 0.
> Condition : **I-A doit arriver avec R-C4**, sinon R-C4 coche la mauvaise tâche.

## Ordre

`git fetch` puis `git merge origin/main` (sans conflit), puis **un commit par
point**, test **rouge d'abord** pour chacun, `tsc -b --noEmit` à chaque étape.

## Collisions de sens (fichiers que la branche ne touchait pas)

- `lib/simulationSave.ts` réécrit par `main` : id idempotent, `subject_id: sim.id`,
  `selfDeclared` dans le payload, bloc « DÉVIATION ASSUMÉE… à retirer dans le MÊME
  merge que `case_progress` ». **Garder la base de `main`.** Ne PAS reprendre
  `subject_id: i.c.id` de l'ancien snippet : `main` envoie `sim.id`, déjà en production.
- `lib/lauf/` : `erstelleLauf` porte déjà `taskId`, mais `projektion` ne le transmet pas.
- `PendingExternalSimCard` (#56) lit encore `c.layerProgress`.

## 4.1 R-C2 + R-C5 — `app/src/lib/simulationSave.ts` (un seul commit)

```ts
import { now } from '@/lib/clock';
import { applySimulationToJournal, resolveSimulationTask } from '@/lib/journal';
// supprimer : import { caseMastery } from '@/lib/simScope';

export interface SaveInput { /* …inchangé… */ taskId?: string }   // R-C4

export async function saveSimulation(i: SaveInput): Promise<Simulation> {
  const parts = { ...i.parts };
  const id = i.id ?? `sim-${now()}`;
  const draft: Simulation = {
    id, caseId: i.c.id, date: now(),                       // horloge de l'app (I10)
    /* …champs de main inchangés… */
    ...(i.taskId ? { taskId: i.taskId } : {}),
  };
  draft.passed = simulationPassed(draft);
  // D-C4 / R-C4 : la tâche est résolue AVANT l'écriture, persistée dans la ligne et l'événement.
  const sim = await resolveSimulationTask(draft);
  const nouveau = await db.transaction('rw', db.simulations, async () => {
    const deja = await db.simulations.get(id);
    if (deja) { sim.date = deja.date; if (deja.taskId) sim.taskId = deja.taskId; else delete sim.taskId; }
    await db.simulations.put(sim);
    return !deja;
  });
  if (!nouveau) return sim;
  const selfDeclared = sim.mode === 'external-ai';
  // AWAIT : le journal se reconstruit depuis progress_events ; la projection ne doit pas le devancer.
  await syncQueue.push({ type: 'simulation.completed', subject_id: sim.id, payload: { ...sim, selfDeclared } })
    .catch((e) => console.warn('[sync]', e));
  await applySimulationToJournal(sim);                     // R-C2
  // R-C5 : plus de confidence / status / lastSimulationId — case_progress fait foi.
  // layerProgress garde des lecteurs (layerAdvice.ts:49, PendingExternalSimCard) : max, comme la projection.
  if (Object.values(parts).some((p) => p?.done)) {
    const prev = (await db.cases.get(i.c.id))?.layerProgress ?? 0;
    if (i.layer > prev) await db.cases.update(i.c.id, { layerProgress: i.layer });
    syncQueue.push({ type: 'case.layer_reached', subject_id: i.c.id, payload: { layer: i.layer } })
      .catch((e) => console.warn('[sync]', e));
  }
  return sim;
}
```
Aucun écran ne lit `Case.confidence`, `Case.status` ni `lastSimulationId` dans l'arbre
fusionné (seule la définition inutilisée de `StatusBadge`). `layerProgress` en maximum :
redescendre de couche ne le fait plus baisser localement — cohérent avec `rebuildProjections`.

## 4.2 R-C4 — faire suivre le `taskId`

```ts
// features/program/TaskLine.tsx — taskLink, branche simulation / examen-blanc
return `/simulation/${t.caseId}/pre?${new URLSearchParams({ ...(t.teil ? { teil: t.teil } : {}), task: t.id })}`;
// features/simulation/PreSimulationPage.tsx
const taskId = params.get('task') ?? undefined;
<SimulationSetup caseId={c.id} teil={teil} taskId={taskId} />
// features/simulation/SimulationSetup.tsx
export function SimulationSetup({ caseId, teil, taskId }: { caseId: string; teil: SimTeil | null; taskId?: string }) {
const entrer = () => navigate(`/simulation/${caseId}/run?${new URLSearchParams({ ...(teil ? { teil } : {}), ...(taskId ? { task: taskId } : {}) })}`, { viewTransition: true });
// features/simulation/SimulationRunner.tsx
const taskId = params.get('task') ?? undefined;
const steuerung = useLauf(simId ? undefined : c, teil, taskId);
// features/simulation/useLauf.ts
export function useLauf(c: Case | undefined, teil: SimTeil | null, taskId?: string): LaufSteuerung { /* erstelleLauf({ …, taskId }) */ }
// lib/lauf/speichern.ts — projektion
    mode: lauf.mode,
    taskId: lauf.taskId,
```
⚠️ `SimulationSetup.tsx` est aussi touché par l'intégration des primitives (dans le
worktree de la direction) : garder `{ viewTransition: true }` dans `entrer()`.

## 4.3 I-A + m-1 — `app/src/lib/journal.ts` (avec R-C4)

Sonde PA de la revue : une tâche **Anamnese** se fait cocher par une partie
**Dokumentation** (`taskId kept true · task checked true`) — `resolveSimulationTask`
(`journal.ts:442-453`) ne contrôle un `taskId` explicite que pour une tâche sans Teil.

```ts
export async function resolveSimulationTask(input: Simulation): Promise<Simulation> {
  let sim = input;
  const te = trainingEventFromSimulation(sim);
  if (sim.taskId) {
    const plan = await db.day_plans.filter((p) => p.tasks.some((t) => t.id === sim.taskId)).first();
    const task = plan?.tasks.find((t) => t.id === sim.taskId);
    // Explicite (R-C4) : gardé seulement si CETTE partie satisfait la tâche — même cas,
    // Teil compatible, le mode prime (D-C4). Sinon, résolution par le contenu.
    if (plan && task && satisfiedTask({ ...plan, tasks: [{ ...task, doneAt: undefined }] }, te, new Set(),
        await teileJouesLeJour(te.at, te.caseId, te.teile))) return sim;
    const { taskId: _drop, ...rest } = sim;
    sim = rest;
  }
  const taskId = await resolveTask(te.at, te);
  return taskId ? { ...sim, taskId } : sim;
}
// m-1 : une séance IA externe complète en couche 3 devenait « Examen à blanc » (sonde PB)
const isExamenBlanc = (sim: Simulation): boolean =>
  isFullSimulation(sim) && sim.assistance === 'autonome' && sim.layer === 3 && sim.mode !== 'external-ai';
```
Tests rouges d'abord : sonde PA (taskId Anamnese + partie Dokumentation → tâche non
cochée), sonde PB.

## 4.4 R-C3 — `app/src/features/fachbegriffe/DrillPage.tsx`

Hooks avant les `return` anticipés.
```ts
import { logTraining } from '@/lib/journal';
import { now } from '@/lib/clock';
const startedAt = useRef<number | null>(null);
const logged = useRef(false);
// dans start(), après setStarted(true) :
startedAt.current = now(); logged.current = false;
const finished = started && queue.length > 0 && idx >= queue.length;
useEffect(() => {
  if (!finished || logged.current || startedAt.current === null || stats.done === 0) return;
  logged.current = true;
  // ≥ 1 min : à 0 min avec un taskId résolu, ce serait une « coche nue » absorbable (isCocheNue).
  void logTraining({ kind: 'drill', spentMin: Math.max(1, Math.round((now() - startedAt.current) / 60_000)), ...(caseId ? { caseId } : {}) })
    .catch((e) => console.warn('[journal]', e));
}, [finished, stats.done, caseId]);
```
Décision de `main` : journaliser **aussi au démontage** si `stats.done > 0` (une séance
quittée en cours de route est du travail fait — point 8 de la direction). Un seul
événement par séance (`logged`).
Puis `HistoriquePage.tsx:79` : « Tout ce que tu as fait, du plan ou libre —
simulations, drill, fiches lues, Aufklärungen, tâches cochées. Rien n'est arrondi. »
⚠️ `DrillPage.tsx` est aussi touché par la branche primitives : changement minimal,
localisé (imports, refs, un effet).

## 4.5 La phrase « pas dans l'indice » — `PendingExternalSimCard.tsx` (après 4.1)

Supprimer le commentaire JSX (≈ l.115-118) ; dans l'en-tête (≈ l.18-21) remplacer
« L'exclusion… n'est pas encore tenue » par « hors de l'indice : `indiceAt` lit
`case_progress`, où une séance auto-déclarée ne bouge aucun statut (INV-11) » ; texte :
« Séance auto-déclarée : elle compte dans ton historique et ta série, pas dans
l'indice de préparation. »
Test : une séance IA externe enregistrée par `saveSimulation` laisse `indiceAt`
inchangé, et l'Historique la montre aussitôt (sans redémarrage, grâce à R-C2).

## Mineurs

- **m-2** : test que les coches nues sont exclues des Teiles joués le jour même
  (`teileJouesLeJour` : retirer `!isCocheNue(te)` laisse tout vert aujourd'hui) —
  scénario : coche d'un cas complet, puis Anamnese réelle.
- **m-3** : `rebuildRace.test.ts` (3 000 événements, délai 5 s) — délai explicite
  suffisant pour tenir sous charge en CI.
- **m-4** : `ProgramPage.tsx:132,166,167,404,436` lisent `todayKey()` au rendu → lire
  le store « aujourd'hui ».
- **INV-11** : à amender (un cas joué seulement en IA externe a une ligne
  `case_progress` « vierge » avec `nonMesureAt` — voulu par I-4).

## Fin

`npx tsc -b --noEmit`, `npx vitest run --dir src` (sans `--maxWorkers` aussi, comme la
CI), `npm run build`, `node scripts/e2e/programmeInvariants.mjs` 6/6. Puis
`git push -u origin feat/s3-programme`. `main` ouvre la PR.
