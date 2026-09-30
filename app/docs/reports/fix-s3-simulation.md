# fix-s3-simulation — rapport du fixeur unique (branche `feat/s3-simulation`)

Worktree `doctopus-s3-simulation`, base `3a43329`, tête `5453e21`, 11 commits
(dont le cherry-pick `d7ae6fe` du cache Vite par worktree). Entrée : la revue de
branche Opus (Request changes) et la décision de `main` sur la règle 8.

**Statut : DONE_WITH_CONCERNS** — tous les items de la liste sont corrigés,
testés rouge → vert et rejoués au navigateur. Les réserves sont listées en §4.

---

## 1. Chaque item → commit → test rouge → vert

Chaque test a été lancé **avant** le correctif et a échoué avec le message cité,
puis est passé après. Aucun n'a été écrit après coup.

| item | commit | test | rouge observé |
|---|---|---|---|
| **C1** fin par l'automate | `3f2f4fd` | `features/simulation/useLauf.test.tsx` › C1 (3 tests, dont la sonde du relecteur) | `expected '0edb2796-…' to be null` (beenden() écrivait depuis `laufend`) ; `versChecklist is not a function` |
| **I1** pas de sortie d'un clic en jeu | `3f2f4fd` | pas de test unitaire — prouvé au navigateur (C2) | — voir §4 |
| **I2** reprise par mode exact, run joué écrit | `49a5fe6` | `useLauf.test.tsx` › I2 (5 tests) | (a) `expected '88d7…' not to be '88d7…'` ; (b) `expected undefined to be true` ; (c) `expected undefined to be defined` |
| **I2** la barre lit `lauf.aktiv` | `5b4c6cc` | `store/simSession.test.ts` › « la barre lit lauf.aktiv » (4) ; `useLauf.test.tsx` › pause au démontage (1) | `hydriereAusLauf is not a function` ; ✕ : `expected { key: 'lauf.aktiv', … } to be undefined` ; démontage : `expected false to be true` |
| **I3** « Anamnese seule » pour un run à deux parties | `59fcdbc` | `lib/lauf/speichern.test.ts` (2) ; `SimulationHub.test.ts` (4) ; `ResultScreen.test.tsx` (1) | `expected 'anamnese' to be undefined` ; hub : fonction absente ; résultat : `<p>Cette partie…</p>` rendu |
| **M2** un seul repli `profileId` | `d8d5c86` | `useLauf.test.tsx` › M2 (2) ; `speichern.test.ts` › restauriere | `expected 'local' to be undefined` ; `expected '' to be undefined` |
| **M4** seconde Aufklärung | `e626b65` | `lib/lauf/automat.test.ts` › M4 | `expected {…} to be {…}` (la transition était acceptée) |
| **M5** transition nouvelle | `9c6b12a` | `AnamneseBogen.motion.test.ts` | `expected [ 'transition-colors' ] to be null` |
| **M6** référence de test fantôme | `46804c5` | `checklists.stable.test.ts` › M6 | `checklists.kapitel.test.ts: expected false to be true` |
| **M9** date réécrite | `2ec250f` | `lib/simulationSave.test.ts` › M9 | `expected 9000 to be 1000` |
| **M7** (phrase du spec) | `5453e21` | — | « trois clics » → « deux clics » dans B5, A4 et le résumé |

### Ce que chaque correctif change

- **C1 + I1.** `useLauf.beenden()` n'écrit plus rien si l'automate refuse
  `speichern` (`fertig === l` ⇒ `null`), et pose `gespeichert` dans l'état React
  **avant** d'attendre la base. Le hook expose `versChecklist()` et
  `arztbriefSchreiben()`. Le runner rend l'état `checkliste` (nouvel écran
  `Abschluss.tsx`, « Fin de la simulation ») et l'état `arztbrief`
  (`ArztbriefGuide` + « Enregistrer la simulation → »). « Terminer la
  simulation → » n'apparaît dans l'en-tête qu'en `bilanz`. La sonde du relecteur
  est gardée comme test.
- **I2.** La reprise exige le cas **et** le mode (`modus` + `geplanteTeile[0]`).
  Un Lauf qu'on quitte pour un autre mode ou un autre cas passe par
  `gibAuf()` : écrit s'il a au moins un Teil joué, supprimé sinon (§3.1). La même
  fonction sert l'abandon à 24 h. La barre : `hydriereAusLauf()` relit
  `lauf.aktiv` au démarrage et prime sur le miroir `sessionStorage` ; un snapshot
  en pause sans Lauf derrière est effacé ; le ✕ (`end()`) applique `gibAuf()`.
  Le couple `resume()`/`minimize()` au montage/démontage du runner, perdu avec
  les `useState` de l'ancien runner, est rendu à `useLauf` — sans lui la barre
  n'apparaissait **qu'après un rechargement**. Une seule projection
  `snapshotAusLauf()` pour le runner et le réveil.
- **I3.** `projektion()` ne pose `teil` que si exactement un `SimTeil` a été
  joué. `porteeHistorique()` (hub) liste les parties dès qu'il y en a plus
  d'une (« Simulation partielle (Anamnese, Dokumentation) »). `ResultScreen`
  lit `sim.teil` au lieu de `scope` pour dire « Cette partie » — **extension
  assumée** de I3 : c'est le même défaut sur la surface suivante, et le parcours
  l'aurait montré.
- **M2.** `Lauf.profileId` devient optionnel ; `useLauf` passe
  `getActiveUserId() ?? undefined` ; le seul repli reste `saveSimulation`.
  Une chaîne vide fournie est toujours refusée (INV-26). `restauriere` ne
  fabrique plus `''`.
- **M4.** Choix : **une Aufklärung par run**. Le Lauf n'a qu'une place pour elle
  (`teile.aufklaerung`), et c'est la forme de l'examen. `aufklaerungOeffnen` est
  refusé une fois l'Aufklärung jouée ; le bouton d'en-tête est désactivé.
- **M5 / M6 / M9.** Voir le tableau ; M9 relit la date existante dans la même
  transaction.

---

## 2. Amendement de contrat à appliquer par `main` — `docs/contracts/simulation-run.md`

Je n'écris pas dans `docs/contracts/`. Texte proposé, déjà reporté en tête de
`lib/lauf/automat.ts` :

**§2.1 règle 8 — remplacer par :**

> 8. **On ne quitte pas une partie en cours d'un seul clic.** Pendant `laufend`,
> l'en-tête n'offre que « Terminer la partie ». « Terminer la simulation » est
> rendu dans l'en-tête collant **en `bilanz` seulement** (et dans le bilan
> lui-même), et passe toujours par l'automate :
> `bilanz → versChecklist → checkliste → [arztbriefSchreiben → arztbrief] →
> speichern → gespeichert`. `speichern` hors de `checkliste`/`arztbrief` est
> refusé, et l'appelant n'écrit rien quand il est refusé. `gespeichert` est posé
> dans l'état avant l'écriture.

Deux compléments à trancher par `main` en même temps (appliqués dans le code,
à ratifier) :

- **§1 / §6 / INV-26** : `profileId` est **absent** quand aucun compte n'est
  actif (décision M2) ; seule la chaîne vide est interdite. INV-26 devient :
  « tout `Lauf` écrit a un `profileId` non vide **ou absent** ; jamais une
  valeur fabriquée ».
- **§2.1 règle 7** : « une Aufklärung **au plus** par `Lauf` » (M4).
- **§3.1** : l'abandon par changement de mode ou de cas suit la même règle que
  l'abandon à 24 h (écrit si un Teil est joué, supprimé sinon) ; la barre de
  reprise lit `lauf.aktiv`, et son ✕ est un abandon au sens de §3.1.
- **Q5 (Arztbrief)** : l'étape est proposée depuis `checkliste` **seulement si la
  Dokumentation n'a pas été jouée** — sinon la lettre existe déjà et la proposer
  serait un doublon. C'est une hypothèse d'implémentation, pas une décision de
  direction : à confirmer.

---

## 3. Preuve de parcours et portes

Parcours C ajouté à `app/scripts/e2e/simulation-s3.spec.md` (commit `5453e21`) :
`playwright-cli` headless, mesures depuis le DOM de l'app et IndexedDB, jamais
depuis un module importé. Serveur vérifié comme servant **ce** worktree
(`lsof` : cwd `doctopus-s3-simulation/app` ; `/src/features/simulation/Abschluss.tsx`
servi, fichier qui n'existe que sur cette branche), cache Vite par worktree
(`d7ae6fe`). Supabase local laissé tel quel.

| chemin jamais joué avant | étape | verdict |
|---|---|---|
| « Terminer la simulation » depuis le bilan → `checkliste` → `arztbrief` → `gespeichert` (Teil seul) | C1 | **PASS** — 3 → 4 lignes pour deux clics, id = `lauf.id`, `lauf.aktiv` absent 4 s après |
| idem, run complet (pas d'Arztbrief proposé) | C6 | **PASS** — `scope: full` |
| pas de sortie d'un clic pendant une partie en cours | C2 | **PASS** — en `laufend(dokumentation)` avec une partie jouée : seul « Terminer la partie ✓ » |
| la barre survit à un onglet rouvert, « Reprendre » restitue l'état | C3 | **PASS** |
| changement de mode avec un run en cours (joué ⇒ écrit ; vide ⇒ supprimé ; pas de reprise croisée) | C4, C5 | **PASS** |
| run complet abandonné après deux parties | C4 | **PASS** — `teil: null`, hub « Simulation partielle (Anamnese, Aufklärung, Dokumentation) » |

Portes, par **code de sortie**, sur `5453e21` :

| commande | exit |
|---|---|
| `npx tsc -b --noEmit` | **0** |
| `npx vitest run --dir src lauf checklists simulationSave features/simulation store/simSession` (12 fichiers, 165 tests) | **0** |
| `npx vitest run --dir src` (94 fichiers, 693 tests) | **0** — deux exécutions, aucun échec cette fois (le flake décrit dans `lead-s3-simulation.md` §4.1 ne s'est pas manifesté) |
| `node scripts/checkGuideCoverage.mjs` (contrat guide ↔ fiche) | **0** |
| `checkProbeCoverage` / `checkMusterCoverage` / `checkPlayedTrame` / `checkUiTells` | **0** / **0** / **0** / **0** |

---

## 4. Réserves et consignés (non corrigés, sur instruction)

- **I1 sans test unitaire.** Le rendu conditionnel de l'en-tête n'a pas de test
  rouge → vert : monter `SimulationRunner` en jsdom demande de simuler
  `useCase`, Dexie, le chrono et le routeur. La preuve est au navigateur (C2).
  Si `main` l'exige, c'est un test de composant à écrire.
- **M1** — `migriereSimulation` n'est pas branché sur la lecture de
  `db.simulations` (reporté explicitement).
- **M3** — `externalAiTeil` et le `?teil=` de l'écran patient restent du code mort
  jusqu'au chantier IA.
- **M7** — seule la phrase du spec est corrigée (deux clics, pas trois).
- **M8** — la session `fsp.simSession` d'avant déploiement est perdue une fois :
  le réveil lit désormais `lauf.aktiv`, et un snapshot en pause sans Lauf est
  effacé.
- **`sync/migrateLocal.ts:16`** — hors périmètre, non touché.
- **Observé, hors liste :** `ResumeSessionBar.tsx:24` compte l'Aufklärung dans
  « x/3 parties » (mesuré : « 3/3 parties » pour Anamnese + Aufklärung +
  Dokumentation). Composant hors de mon périmètre ; comportement identique sur
  `main` (le runner y mettait déjà l'Aufklärung dans `results`).
- **Observé, hors liste :** `SimulationSetup.tsx` ajoute un
  `motion-safe:transition-colors` sur un élément nouveau (diff vs `main`) — même
  règle que M5, non signalé par la revue, non corrigé.
- **Non vérifié :** deux onglets simultanés (médecin + simulant) ; le parcours C
  n'a été joué que sans compte actif (l'attribution à un compte n'est prouvée
  que par `useLauf.test.tsx`) ; la fermeture complète du navigateur (simulée
  par `sessionStorage.clear()` + `reload`).
- **Skills.** L'outil Skill n'est pas disponible dans cette session :
  `dept-produit`, `fsp-simulation` et `test-driven-development` n'ont pas été
  invoqués ; la discipline TDD a été appliquée à la main (§1).

---

## 5. Re-revue de `72f9570` (Opus, Request changes) — corrections

Mêmes règles : un commit par correctif, test lancé **rouge avant** le
correctif (message cité), vert après. Tête : `957249e`.

| item | commit | test | rouge observé |
|---|---|---|---|
| **IMPORTANT** abandon qui lève ⇒ runner bloqué sur tous les cas | `7ba8b74` | `useLauf.test.tsx` › « un abandon qui échoue ne bloque jamais le runner » (P3 cas disparu ; écriture qui lève) ; `simSession.test.ts` › « le ✕ de la barre ne lève jamais » | P3 : `expected true to be false` (`laedt` bloqué), `Error: speichern: cas introuvable (ghost)` ; ✕ : `promise rejected "Error: speichern: cas introuvable (ghost)"` |
| **mineur 11 / P4** Lauf invalide ou d'ancien format | `9e387f5` | `speichern.test.ts` › ancien format écarté, `checkliste: {}` écarté, `zustand` inconnu écarté, Lauf valide à ids legacy traduit ; `useLauf.test.tsx` › P4 | 4 échecs (les trois Lauf invalides étaient repris ; un champ `undefined` écrasait sa valeur neutre dans `restauriere`) |
| **mineur 10** lecture hors file | `7dcbd16` | `speichern.test.ts` › « la lecture passe par la file » | `expected undefined to be '2ebe48f4-…'` |
| **mineur 9** écran figé sur « Enregistrement… » | `24f981d` | `useLauf.test.tsx` › « un échec d'écriture ne fige jamais l'écran » | `Error: QuotaExceeded` non géré |
| **mineur 1** règle Arztbrief dans la vue | `96f0a32` | `automat.test.ts` › « Q5 — l'automate, pas la vue » | `expected {…} to be {…}` (transition acceptée) ; `erlaubt is not a function` |
| **mineur 2** I1 sans test | `9f7d5c6` | `automat.test.ts` › « I1 — visible qu'au bilan » | `simulationBeendbar is not a function` |
| **mineur 3** Aufklärung listée comme partie | `6bbf121` | `SimulationHub.test.ts` (2 cas) | `expected 'Anamnese seule (Anamnese, Aufklärung)' to be 'Anamnese seule'` |
| **mineur 4** barre « 3/3 » avec l'Aufklärung | `58b9d42` | `simSession.test.ts` › mineur 4 | `expected [ 'aufklaerung', 'anamnese' ] to deeply equal [ 'anamnese' ]` |
| **mineur 5** transition de `PartnerChoice` | `01078e9` | `transitions.test.ts` (ex-`AnamneseBogen.motion.test.ts`) : plafond par fichier = compte sur `main` | `expected 3 to be less than or equal to 2` |
| **mineur 7** `abbrechen` mort | `e0f3467` | `useLauf.test.tsx` › mineur 7 | `'abbrechen' in result.current` valait `true` |
| **décision 6** Aufklärung seule à l'abandon | `3f8f77e` | `speichern.test.ts` › décision 6 | `expected 1 to be +0` (le Lauf était écrit) |
| **décision 8** retour au bilan depuis la checklist | `957249e` | `automat.test.ts` › table exhaustive étendue (6 lignes) + 2 tests | 8 échecs (action inconnue de l'automate) |

### Ce que chaque correctif change

- **IMPORTANT.** `gibAuf` ne lève plus : cas minimal `{ id, name }` si
  `db.cases` ne l'a plus, Lauf écarté si l'écriture échoue malgré tout.
  `useLauf` encadre `bereinigeAltenLauf` (échec ⇒ `verwerfeAktivenLauf()`, on
  continue) ; `end()` (✕ de la barre) encadre lecture et abandon.
- **Mineur 11.** `ladeAktivenLauf` vérifie une forme minimale (`zustand` connu,
  `modus`, `geplanteTeile` non vide, `checkliste`/`teileGespielt` tableaux,
  `teile`/`sekundenProTeil` objets) ; sinon la clé est **supprimée**. Le test
  d'origine « un Lauf legacy revient complet », qui validait justement la
  reprise d'un run vide, est remplacé par « écarté » ; la traduction des ids
  legacy reste prouvée sur un Lauf de forme valide.
- **Mineur 9.** `beenden()` rend le Lauf d'avant si `speichern` lève (annulation
  d'une écriture qui n'a pas eu lieu, pas une transition) et expose `fehler` ;
  l'écran de fin affiche « L'enregistrement a échoué (…). Rien n'est perdu :
  réessaie. » et le bouton se rejoue.
- **Mineurs 1 et 2.** `erlaubt(lauf, aktion)` : un bouton existe ssi sa
  transition existe. `arztbriefSchreiben` est refusé quand la Dokumentation est
  jouée ; `simulationBeendbar(lauf)` pilote l'en-tête.
- **Décision 8.** `zurueckZumBilanz` : `checkliste → bilanz`, `aktuellerTeil` =
  dernière partie jouée, puis « Partie suivante » reprend le run. Bouton
  « ← Revenir au bilan » sur l'écran de fin. Refusé depuis `arztbrief`.

### Portes (par code de sortie, sur `957249e`)

| commande | exit |
|---|---|
| `npx tsc -b --noEmit` | **0** |
| `npx vitest run --dir src` (94 fichiers, 719 tests) | **0** |
| `node scripts/checkGuideCoverage.mjs` / `checkUiTells.mjs` | **0** / **0** |

### Amendement de contrat — complément pour `main`

À ajouter à l'amendement du §2 :
- **§2.1 règle 2** : une seconde action régressive nommée, `zurueckZumBilanz`
  (`checkliste → bilanz` de la dernière partie jouée), depuis `checkliste`
  seulement. INV-20 : « sauf par `zurueckZurPartie` **ou `zurueckZumBilanz`** ».
- **§3.1** : « au moins un Teil joué » = au moins un des **trois** Teile ;
  l'Aufklärung seule ne compte pas (décision 6). Un Lauf de forme invalide est
  supprimé à la lecture.
- **Q5** : la règle « Arztbrief proposé seulement si la Dokumentation n'a pas
  été jouée » est désormais **dans l'automate** — elle reste une hypothèse
  d'implémentation à confirmer par la direction.

### Non vérifié (re-revue)

- Pas de nouveau rejeu navigateur pour ces corrections : « ← Revenir au bilan »,
  le message d'échec d'enregistrement et le cas premium purgé ne sont prouvés
  que par les tests jsdom/fake-indexeddb ci-dessus.
- La purge réelle par `content/apply.ts` (perte de droits) n'a pas été jouée :
  le scénario est reproduit en retirant le cas de `db.cases`.
