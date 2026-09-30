# ADR-0018 — Une partie de simulation est un automate, pas une suite de conditions

**Statut** : proposé · **Date** : 2026-09-30 · **Chantier** : P0 série 3

## Contexte

« Valider la partie » renvoie en arrière. L'audit
(`app/docs/reports/audit-simflow-serie3.md`) montre que ce n'est pas un bug de
clic mais l'absence d'automate : tous les états sont locaux au runner
(`active`, `phase: 'play'|'eval'`, `aufklaerungOpen`, `results`, `elapsed`,
`finished` non persisté), et la navigation est faite de poussées de route et de
conditions locales.

Six causes cumulées, toutes mesurées :

- `SimulationRunner.tsx:189-190` : `if (idx < flow.length - 1) setActive(...)`.
  En Teil seul, `flow.length === 1`, donc aucune avance ; avec le
  `setPhase('play')` de `:186`, « Valider » ne fait que réafficher l'exercice
  terminé. Même effet sur la 3ᵉ partie d'un run complet.
- « Valider » et « Retour » mènent tous deux à `setPhase('play')` : deux
  boutons, une destination.
- Le chrono de la partie validée redémarre (`useTimer.ts:13-20` relancé par
  l'effet `:438`) — lecture utilisateur : « on m'a remis au début ».
- La branche Aufklärung force `setActive('anamnese')` en dur : retour littéral
  au Teil 1, hors du scope déclaré.
- Aucun reset de défilement.
- Le CTA de sortie est rendu tout en bas du JSX et **n'existe jamais pendant
  l'évaluation**, moment où l'utilisateur le cherche.

Trois défauts de modèle s'y ajoutent :

- `saveSimulation` écrit `id: sim-${Date.now()}` (`simulationSave.ts:44`) : deux
  clics rapprochés écrasent le même enregistrement, ou en créent deux.
- La checklist de fin est **reconstruite** à neuf (`PartEvaluation.tsx:16` →
  `checklistFor`) avec `checked: false` en dur, et les ids sont **positionnels**
  (`checklists.ts:9-15`, compteur de module remis à 0/100/200/300) face à des
  chapitres à ids sémantiques. C'est un problème de modèle, pas de câblage.
- `isFullSimulation` (`simScope.ts:19-23`) retourne `true` dès
  `scope === 'full'`, **avant** de compter les parties : un run abandonné après
  une partie est compté « simulation complète ».
- `Simulation.profileId` n'est jamais écrit alors que `layerAdvice.ts:40` filtre
  dessus.

## Décision

1. **Un objet `Lauf` unique, à identifiant stable (uuid v4), porte l'état.**
   La checklist, les Teile couverts, le minutage et le score en sont des
   **champs**, pas des états parallèles. Un `useState` qui reconstruit l'un des
   quatre est un défaut de contrat.
2. **Six états, un ordre total** :
   `vorbereitung → laufend(Teil n) → bilanz → checkliste → [arztbrief] →
   gespeichert`. **Aucune transition ne va vers un état antérieur** : une
   transition dont la cible est d'index inférieur ou égal est refusée par la
   fonction de transition. Deux exceptions, toutes deux nommées :
   `partieSuivante()` (`bilanz(t) → laufend(t+1)`, progression dans le run) et
   `zurueckZurPartie()` (la seule régression, depuis `bilanz` seulement,
   déclenchée par un geste explicite).
3. **Chaque état a une URL.** Il existe désormais une route de bilan ; l'écran
   de résultat est rechargeable et ne réaffiche jamais un runner vierge.
4. **L'écriture finale est idempotente sur l'identifiant de partie.**
   `put` sur `lauf.id`, `subject_id` de l'événement = `lauf.id`,
   `TrainingEvent.id = te-${lauf.id}` : n appels, une ligne, un événement.
5. **`laufend` est persisté à chaque transition**, dans Dexie et non plus en
   `sessionStorage` : reprise après interruption, brouillon d'évaluation et
   checklist compris.
6. **`ChecklistItem.id` devient sémantique et stable**, avec un champ `kapitel`
   optionnel qui est le seul pont explicite vers le guide d'anamnèse. Les 44
   ids positionnels de l'historique sont traduits **à la lecture** par une table
   figée, sans réécriture de `db.simulations`.
7. **La portée jouée est un fait, pas une intention.** `istVollstaendig` lit
   `teileGespielt`, jamais `scope`.
8. **`profileId` est obligatoire** à la création du `Lauf`.

Contrat : `docs/contracts/simulation-run.md`.

## Alternatives écartées

- **Corriger `savePart` au clic.** L'audit le dit : un correctif qui n'ajoute
  pas d'état terminal explicite laisse le symptôme intact sur le dernier Teil.
- **Réutiliser `lib/simulationStep.ts`** (125 lignes, aucun import externe) : il
  décrit un automate concurrent. Il est supprimé, pour qu'il n'en existe qu'un.
- **Garder les ids positionnels et ajouter une table de correspondance
  chapitre → index.** La correspondance serait à maintenir à chaque insertion
  d'item ; l'id sémantique la rend inutile et débloque l'analyse longitudinale
  (« ce critère, tu le rates toujours »).
- **Conserver `sessionStorage` pour la reprise.** Il ne survit pas à la
  fermeture d'onglet, et pour un examen à 60 minutes une interruption perdue
  est inacceptable.

## Conséquences

- `features/simulation/*` et `lib/sim*` sont refondus (chantier C2).
  `lib/simulationStep.ts` est supprimé.
- Index Dexie : `simulations: 'id, caseId, date, role, profileId, teil'`.
- Le pont IA externe s'ancre dans `PlayArea` sur l'état `laufend`, restreint à
  `anamnese` et `fallvorstellung` (ADR non nécessaire : contrat `ai-bridge.md`).
- **Blocage explicite** : `motionSafe.test.ts:14-23` exclut aujourd'hui
  `features/simulation`, et `SimulationRunner.tsx:238/245/250` échouerait s'il y
  était inclus. Aucune transition nouvelle n'est ajoutée à `features/simulation`
  tant que ce périmètre de contrat n'est pas tranché (catégorie E, C5).
- Neuf invariants (INV-20 à INV-28) sont écrits avant le code.
