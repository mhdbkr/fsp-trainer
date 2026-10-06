# S4-7 — l'Examen · rapport

**Statut : DONE_WITH_CONCERNS** (§6).
Branche `feat/s4-7-examen`, worktree `doctopus-s4-7-examen`, partie de `origin/main` `c53b46bf`. Poussée, sans PR.
Aucun serveur Supabase, aucune prod touchée. Portage à la main depuis `feat/pruefungstag` (lue par `git show`, jamais fusionnée).

Contrat : `docs/contracts/simulation-run.md` §11 (nouveau) ; `training-journal.md` §1 et §2.3 (`modeExamen`) ; ADR-0021, journal des décisions (6 oct.) ; `CONTEXT.md` (« Examen », « Bereitschaftsindex » abandonné).

## 1. Ce qui est livré

- **Un seul moteur.** L'Examen est un `Lauf` ordinaire : `useLauf(c, null, taskId, { examen: true })`, `transition`, `speichern`. Seul champ ajouté au `Lauf` : `examen: { teilBeginn, aufklaerung? }`, écrit comme un champ (`stempleTeilBeginn`). Ni nouvel événement de sync, ni version Dexie.
- **Automate** (`lib/lauf/automat.ts`) : en examen, Autonome et couche 3 à la création ; `springeZu` et `zurueckZurPartie` refusés ; `demarrer` part de l'Anamnese ; `partieSuivante(t')` n'accepte que le Teil suivant ; `aufklaerungOeffnen` seulement si le cas a un acte, et depuis l'Anamnese.
- **`/examen`** (`features/examen/ExamenPage.tsx`) : avant (tirage caché, `PartnerCard` sans IA, Muster guidé ou libre), pendant (`ExamenRunner`), après (`?sim=<id>` : le cas révélé, `ResultScreen` avec son `CaseDial`, conditions d'examen remplies ou manquantes). Aucun id de cas dans l'URL ; le runner relit le cas depuis `lauf.aktiv`.
- **Runner** (`ExamenRunner.tsx`) : horloge murale (`horloge.ts`, sur `now()` de `lib/clock`), échéance → `terminerPartie`, transition de 60 s (« Prêt » l'abrège) → `partieSuivante`, Fallvorstellung → `versChecklist` → auto-évaluation. Bogen figé après l'Anamnese, Arztbrief figé après la Dokumentation. Alertes stylées à 5:00 et 1:00 (classes Tailwind `signal-*`, `role="status"` : la `.exam-alert` sans règle CSS de la branche n'existe plus). `?debugClock=` en dev seulement.
- **Aufklärung incluse** (direction, 6 oct.) : `Lauf.examen.aufklaerung` = premier acte de `probableAufklaerungIds` (120 cas sur 130). Elle occupe la **fin du créneau de l'Anamnese**, intercalée selon la règle 7 (ouverte depuis l'Anamnese, retour à l'Anamnese, puis transition à la fin du créneau). À l'écran : la demande du jury et le Bogen, rien d'autre. Elle s'évalue à la fin, sa grille n'est pas exigée.
- **Tirage** (`lib/examen/tirage.ts`) : fréquence tous centres par pathologie, partagée entre ses cas éligibles ; vierge ×2 ; plancher hors source ; 14 jours d'exclusion, levée si elle vide tout ; `prêt` non exclu. La ville visée vit dans **une** fonction, `raffinementVille`, qui se retire avec `EntreeTirage.ville`.
- **Fin** : grilles de langue A et F exigées pour « Enregistrer l'examen ». La projection pose `Simulation.modeExamen`.
- **Abandon** : `aufgeben` = `gibAuf` (écrit après un Teil, rien avant), la persistance en vol coupée d'abord. L'Historique dit « Examen » ou « Examen interrompu ».
- **Reprise** : la reprise exige le même cas **et** le même mode. La barre « Reprendre » dit « Examen en cours » et mène à `/examen` ; le miroir de session n'a pas le nom du cas.
- **Navigation** : « Examen » remplace « Simulation » dans le menu (même place) ; `/simulation` → `/examen` ; `SimulationHub` et son test supprimés ; la tâche « examen à blanc » → `/examen?task=<id>` (son cas, sans tirage). Les routes sont extraites dans `src/routes.tsx` pour être testables.
- **Garde statique** : `scripts/checkExamen.mjs` (règles 1 à 3), liste d'aides unique `features/examen/aidesInterdites.json` (lue aussi par INV-E7), `checkExamen.test.mjs`. Branchés en CI (job contrats), avec la sonde `examen390.mjs` (job candidat).

## 2. Décisions — toutes arrêtées par la direction (6 oct.)

| # | Décision | Où |
|---|---|---|
| 1 | Tirage pondéré par pathologie (une fois), fréquence **tous centres** ; ville visée = raffinement optionnel isolé (`raffinementVille`) ; vierge ×2, plancher, 14 jours, `prêt` non exclu | `tirage.ts`, contrat §11.5 |
| 2 | Une table sourcée, BW 20/20/20, transition de 60 s ; `FLOW` d'entraînement inchangé | `plan.ts`, §11.2, §11.9 |
| 3 | Abandon selon `gibAuf` ; « Examen interrompu » à l'Historique | `useLauf.aufgeben`, §11.4 |
| 4 | Grilles A et F obligatoires à la fin | `ExamenRunner.grillesCompletes` |
| 5 | Menu « Examen » ; `/simulation` → `/examen` ; hub supprimé | `routes.tsx`, `nav.ts` |
| 6 | Tâche « examen à blanc » : son cas, sans tirage, cochable comme avant | `taskLink` |
| 7 | Le partenaire n'est pas enregistré | §11.6 bis |
| 8 | Bereitschaftsindex abandonné ; `prêt` seule mesure | ADR-0021 (journal), `CONTEXT.md` |
| 9 | **Remplacée** : l'Aufklärung du cas est incluse, sans aide ; sans acte, A → D → F | §11.1, INV-E13 |
| 10 | Aucune limite ni message sur la fréquence des examens | §11.6 bis |

## 3. Invariants et TDD

`app/tests/invariants.examen.test.tsx` : INV-E1 à INV-E13 et la tâche du plan, 24 tests.
- INV-E1 à E12 écrits **d'abord**, commités rouges (`1f851821`, modules absents), puis le code.
- INV-E13 est écrit avec le code (décision arrivée en cours de lot) ; sa rougeur est prouvée par sa mutation.
- Chaque invariant a sa mutation dans `parcours-mutations.mjs` (INV-E1 à INV-E13). Résultat : §4.

## 4. Vérifications (codes de sortie)

| Porte | Résultat |
|---|---|
| `tsc -b` | 0 |
| `vitest --dir src` (`--maxWorkers=2`) | 0 — 2 011 tests |
| `npm run test:c6` | 0 — 207 tests |
| `npm run build` | 0 |
| `scripts/check*.mjs` (24) | 0, sauf `checkProbeOverlap.mjs` = 1 : **informatif** en CI (`|| true`), contenu non touché par ce lot |
| `node --test scripts/*.test.mjs` (15) | 0 |
| `parcours-mutations.mjs` (une fois) | 1 — baseline **vert** ; 179 mutations sur 180 tuées, dont **INV-E1 à INV-E13 toutes tuées** ; **INV-20a inapplicable** (voir §6) ; aucun `c6-mut-*` restant |
| `merge-tree` contre `origin/main` (`bed75a6c`) | 0, aucun conflit (Q5 pas encore mergé) |
| Sonde `examen390.mjs --captures` | 0 — 19 vérifications |

Sonde, mesurée dans le DOM, horloge pilotée par `page.clock` : `/examen` et un Teil tiennent à 390 et 1280 px ; aucun des 130 cas (nom, id) dans le DOM ni l'URL avant le départ, ni le cas tiré pendant ; **deux onglets** : la seconde fenêtre du simulant montre le patient du cas tiré, le médecin ne voit rien ; examen complet accéléré (Aufklärung sans aide, transitions, auto-évaluation, conditions remplies, cas révélé) ; rechargement à 4 min : 649 s restants pour 900 (l'horloge a continué) ; minuteries gelées 25 min puis visibilité : Anamnese finie, Dokumentation commencée ; abandon pendant l'Anamnese : rien ; après : « Examen interrompu ». Témoin : la première exécution est sortie à 1 (bornes du rechargement trop strictes, cibles du Shell comptées), corrigée ensuite.

Captures : `app/docs/reports/s4-7-examen-{390,1280}.png` (page), `s4-7-teil-{390,1280}.png` (Anamnese en cours).

## 5. Écarts et ajouts signalés

1. **`FLOW` d'entraînement** : Fallvorstellung à 12 min (`SimulationRunner.tsx:45`) contre 20 dans la table sourcée. Non touché (décision 2).
2. **Durée de l'Aufklärung non sourcée** : la table de la branche n'en a pas. 5 min, reprises du runner d'entraînement, marquées « NON SOURCÉ » dans `plan.ts`. Sa place (fin du créneau de l'Anamnese) est un choix de lecture de la règle 7 : le jury interrompt l'entretien.
3. **Ajout technique `Simulation.modeExamen` / `TrainingEvent.modeExamen`** : sans lui, rien ne distingue un examen interrompu d'une partie d'entraînement partielle (§11.6). Champ de payload, sans nouvel événement ni version Dexie.
4. **Hors de mon périmètre nominal** (`features/simulation`, `data/guides`), le brief m'a fait écrire dans `lib/lauf`, `lib/examen`, `store/simSession.ts`, `components/{ResumeSessionBar,SelectionExplainer,nav,Shell}`, `features/{history,program}`, `routes.tsx`/`main.tsx`, `scripts`, la CI et les docs. `SelectionExplainer` ignore désormais `[data-examen]` (aucune explication pendant l'Examen).
5. **Non portés** (pas de valeur ajoutée) : `ExpiredBanner` (la transition dit déjà la fin), `purgeAfterMs` (`LAUF_MAX_ALTER_MS` le fait), `TransitionView` en allemand (l'interface est en français).
6. **Interprétation** : « D si la checklist l'exige » est lu ainsi : la checklist de la Dokumentation est proposée, non exigée (`conditionsExamen` ne la lit pas).

## 6. Concerns (DONE_WITH_CONCERNS)

- **INV-20a, ancre cassée puis restaurée, non rejouée.** Le passage unique de `parcours-mutations` a rendu INV-20a « inapplicable » : ma première garde d'examen dans `demarrer` (`automat.ts`) avait changé la ligne qui sert d'ancre. Corrigé après coup (`aktuellerTeil: lauf.examen ? … : teil`, ancre d'origine intacte). Les 180 ancres sont uniques (vérifié statiquement), `vitest` et C6 sont verts sur le commit final, mais la mutation INV-20a n'a **pas** été rejouée : la consigne était un seul passage. Commande pour le faire : `node scripts/parcours-mutations.mjs --only INV-20a`.
- **Un passage accidentel interrompu** : une vérification d'ancres mal écrite a importé `parcours-mutations.mjs`, ce qui l'a lancé. Arrêté aussitôt ; le dossier `c6-mut-0G6dTV` qu'il avait créé a été supprimé. Le passage complet ci-dessus est le seul arrivé au bout.

- Pendant un **onglet gelé**, l'Aufklärung échue est « jouée » en zéro seconde réelle (horloge murale) : elle entre au journal avec 300 s. Conforme à la règle murale, mais c'est une mesure fictive.
- La **barre du Shell** (← Retour, →, Accueil, ⌘K) a des cibles < 44 px à 390 px : préexistant, hors lot ; la sonde ne mesure que la page de l'Examen.
- Le bouton flottant Doctopus recouvre le bas du Bogen à 390 px (capture `s4-7-teil-390.png`) : préexistant, global.

## Non vérifié

- La CI distante (job candidat `continue-on-error`) n'a pas encore exécuté `examen390.mjs` sur un runner Ubuntu.
- Mode sombre de l'Examen : non capturé.
- `graphify update app/src` : pas de graphe dans ce worktree.
