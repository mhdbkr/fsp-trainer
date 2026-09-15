# Protocole de synchronisation de la progression

**Modèle** — journal d'événements additifs, serveur autoritaire, `id` uuid v4 généré client. Tables : `progress_events` (serveur ET Dexie), `outbox` (Dexie, non acquittés).

**Synchronisé** : `simulation.completed`, `srs.reviewed`, `plan.done`, `case.layer_reached`, `program.configured`.
**Local uniquement** : Bogen en cours, session en pause, préférences d'affichage, simulations de **démo** (`sim-demo-*`, jamais migrées).

**Push** — `syncQueue.push(ev)` : écrit `progress_events` + `outbox` en une transaction, puis `flush()` sans bloquer l'appelant (les écrans ne dépendent jamais du réseau).
`flush()` : single-flight ; anonyme → no-op ; `POST /events` par lots de 100.
- 2xx : `acked` retirés de l'outbox ; **`received[id]` rétro-rempli** dans `progress_events` (sinon un appareil qui n'émet que garderait un curseur à l'époque) ; `rejected` retirés et journalisés — pas de rejeu.
- 4xx (lot) : tout le lot rejeté. 5xx / réseau : conservé, `attempts` **par ligne**, backoff 1 s × 2^max(attempts), plafond 5 min.
- Page pleine (100) → relance après levée du verrou : un backlog draine sans attendre le timer.
Déclencheurs : après chaque push, `online`, **au démarrage**, intervalle 2 min si outbox non vide.

**Pull** — `GET /events?since=<max received_at LOCAL>` (horloge **serveur** ; jamais `occurred_at` client, qui ferait rater les événements poussés en retard par un autre appareil). Insertion des ids inconnus (bulkGet), puis `rebuildProjections()` si nouveautés : `simulations`, `fachbegriffe.srs` (dernier `srs.reviewed` par terme, par `occurred_at`), `cases.layerProgress` (max). Déclencheurs : démarrage, après chaque flush, `online`.

**Conflits** — aucun par construction (additif). Seule mutation logique : SRS d'un terme → last-write-wins par `occurred_at`.
**Horloges** — `occurred_at` client (affichage) ; `received_at` serveur (curseur, quotas, ligue).
**Migration** — `migrateLocalProgress(uid)` : réattribue `user_id:'local'`, convertit simulations réelles / SRS non-`Neu` / couches / config programme ; idempotent (`meta.migratedLocal`).
**Vérifié** — deux appareils, un compte : une simulation jouée sur A apparaît sur un appareil C neuf sans intervention (Task 15).

---

## Événement `exam_day.completed` — sous réserve G2 (pipeline `pruefungstag`, 2026-09-16)

> Statut : **brouillon sous réserve G2** tant que Mehdi n'a pas validé le spec
> `docs/superpowers/specs/2026-09-16-pruefungstag-design.md`. Motivation : le serveur a
> besoin d'un résumé **stable et petit** d'un Prüfungstag (conversion Free → Pro,
> ligue #9, fidélité) sans dépendre du payload complet d'une `Simulation` (Bogen,
> Arztbrief, conversation).

### Décision 1 — le Prüfungstag EST une `Simulation` ; `exam_day.completed` est un résumé dérivé
- La simulation est persistée dans `simulations` et émise en `simulation.completed` comme
  aujourd'hui, avec trois champs **optionnels** ajoutés à `Simulation` (`app/src/db/types.ts`) :
  `context?: 'training' | 'pruefungstag'`, `withSimulant?: boolean`,
  `examDay?: { startedAt; endedAt; land: 'BW'; partTimes }`. Pas d'index Dexie, donc **pas de
  bump de version** ; une base existante lit `context === undefined` comme `'training'`.
- Pourquoi sur `Simulation` et pas seulement dans le payload : le Bereitschaftsindex est
  calculé **client**, depuis `db.simulations` (spec D9), et `db.simulations` est reconstruit
  sur un appareil neuf par `rebuildProjections()` depuis `simulation.completed`. Si
  `context`/`withSimulant` ne vivaient que dans `exam_day.completed`, un second appareil
  ne saurait pas qu'une simulation est un Prüfungstag → poids 3 et plafond 79 faux.
- Le client émet, dans cet ordre et en deux `syncQueue.push` distincts :
  `simulation.completed` (payload = la `Simulation`) puis `exam_day.completed`.

### Décision 2 — l'indice est une projection PURE à la lecture, pas une table
Confirmé. `BI = f(db.simulations, cases, now)` dépend de `now` (décroissance 30/90 j,
plafond « < 30 j ») : une valeur stockée serait fausse le lendemain. `rebuildProjections()`
**ignore** `exam_day.completed` (aucune table dérivée) — un `switch` exhaustif n'est pas
nécessaire, le filtre par type existant suffit. Les valeurs `bereitschaft.before/after`
du payload sont un **instantané client, non fiable** : le serveur ne s'en sert que pour
l'analytics, jamais pour un droit, une récompense ou un classement (la ligue #9 recalcule).

### Décision 3 — `subject_id = simulationId` (et non `caseId`)
`exam_day.completed` est le résumé 1:1 d'une simulation. Avec `subject_id = simulationId`,
l'index `(user_id, type, subject_id)` permet (a) de joindre au `simulation.completed`
correspondant (`payload.id`), (b) d'imposer plus tard « un résumé par simulation » par index
unique partiel, (c) une récompense de ligue idempotente par `(reason, ref = simulationId)`
comme `credit_ledger`. Avec `caseId` (spec §8, choix provisoire), rien de cela ne tient :
le même cas peut être rejoué. `caseId` reste dans le payload.

### Payload v1 (`ExamDayCompletedPayload`, `app/src/lib/sync/events.ts`)
```json
{
  "v": 1,
  "simulationId": "sim-…", "caseId": "…", "specialty": "Kardiologie", "land": "BW", "muster": "Stuttgart",
  "withSimulant": true,
  "weightClass": "pruefungstag",
  "startedAt": "2026-09-16T09:00:00.000Z", "endedAt": "2026-09-16T10:01:30.000Z",
  "parts": {
    "anamnese":        { "score": 71, "contentPct": 68, "officialPct": 76, "durationSec": 1200, "passed": true },
    "dokumentation":   { "score": 58, "contentPct": 55, "officialPct": 0,  "durationSec": 1200, "passed": false },
    "fallvorstellung": { "score": 66, "contentPct": 60, "officialPct": 72, "durationSec": 1140, "passed": true },
    "aufklaerung":     null
  },
  "passed": false,
  "bereitschaft": { "before": 61, "after": 64, "capped": "no_recent_exam_day" },
  "appVersion": "1.4.0"
}
```
- `v` : version du payload ; un consommateur serveur ignore les versions inconnues (ne
  rejette pas). Tout changement de forme = `v: 2` et nouveau paragraphe ici.
- `weightClass: 'pruefungstag' | 'solo'` — classification **effective** de la séance dans
  l'indice (poids 3 et lève le plafond / poids 2 et ne le lève pas). Demande de `pedagogy`
  (`capped: 'solo' | null`) **acceptée, amendée** : un champ nullable redondant avec
  `withSimulant === false` dériverait ; `weightClass` est non nul, nomme la règle, et reste
  extensible (ex. futur `'ai_patient'`) sans casser les lecteurs.
- `withSimulant` : **assertion client**. Sur le même appareil, la fenêtre simulant se
  signale par `request-active` (canal ci-dessous) ; sur un smartphone via QR il n'existe
  aucun canal — la valeur vient alors d'une déclaration au setup. Le serveur la traite
  comme non vérifiée.
- `parts.*.score` = `weightedPartScore` (`lib/scoring.ts`) ; `durationSec` = temps réellement
  consommé, `≤ 1200` ; `passed` par partie = `officialPct`/`contentPct` ≥ 60 selon
  `simulationPassed`. Une partie non tentée est évaluée à 0, jamais `null` ; seul
  `aufklaerung` peut être `null` (non ouverte).
- `bereitschaft.capped: 'none' | 'no_recent_exam_day'` = état du plafond **après** la séance
  (miroir de `Bereitschaft.capped`, spec §6.3).
- Taille : < 2 Ko. Aucun texte libre (pas de Bogen, pas d'Arztbrief).

### Idempotence et rejeu
- `id` uuid v4 client comme tout événement ; `upsert … ignoreDuplicates` côté serveur.
- Émis en invité : `user_id: 'local'`, réattribué par `migrateLocalProgress` (déjà le cas
  pour tout `progress_events`), flushé après connexion. **Aucune ré-émission** depuis
  `db.simulations` à la migration (contrairement à `simulation.completed`) : le résumé
  d'une séance jouée avant la version qui l'émet n'existe pas, et c'est acceptable (le BI
  ne dépend pas de lui).

### Ordre de déploiement (OBLIGATOIRE — perte de données sinon)
`app/supabase/functions/events/index.ts` valide `type` par `z.enum` : un lot qui contient un
type inconnu répond **400**, et le client (`queue.ts`) **rejette le lot entier sans
rejeu** — la `simulation.completed` poussée dans le même lot serait perdue.
Donc, dans cet ordre : (1) migration `psql` (CHECK) ; (2) Edge Function redéployée avec
`'exam_day.completed'` dans l'enum ; (3) seulement ensuite un client qui émet.
Test de contrat : un lot `[simulation.completed, exam_day.completed]` contre Supabase local
→ `acked.length === 2`, `rejected.length === 0`.

### Canal `fsp-patient-sync` — message `exam-phase`
Canal `BroadcastChannel('fsp-patient-sync')` (même appareil ; `usePatientSync.ts`). Ajout :
```ts
{ type: 'exam-phase', phase: 'setup' | 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'ended' }
```
- Émis par la fenêtre candidat à chaque transition et en réponse à `request-active`
  (comme `active-case` / `guide-chapter`). La fenêtre simulant affiche la fiche patient
  en `anamnese`, rien en `dokumentation`, `ExaminerSheetView` en `fallvorstellung`.
- Rétro-compatible : un récepteur ancien ignore les types inconnus (`if (e.data?.type === …)`).
- `guide-chapter` / `guide-probe` ne sont **pas** émis en Prüfungstag (aucun guide).
- Hors de portée : un simulant sur un autre appareil (QR) ne reçoit pas ce message — il
  change de fiche à la main ; la page simulant affiche les deux onglets.

### Tests de contrat à écrire (plan)
1. `events.ts` : `ProgressEventType` contient `'exam_day.completed'` ; un payload conforme
   compile contre `ExamDayCompletedPayload`.
2. `projections.test.ts` : `rebuildProjections` avec un journal contenant
   `exam_day.completed` ne lève pas et ne crée aucune ligne dérivée ; `simulationsFrom`
   restitue `context`, `withSimulant`, `examDay`.
3. Intégration (`scripts/testRls.mjs` ou test Deno) : lot mixte accepté (ci-dessus) ;
   type `'exam_day.bogus'` → 400.
4. SQL : `insert … type='exam_day.completed'` passe ; `type='x'` viole
   `progress_events_type_check`.
