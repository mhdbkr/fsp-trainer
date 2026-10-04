# S4-1 — la mesure · rapport de tâche

Branche `feat/s4-1-mesure` (base `origin/main` @ `bc5382ed`), worktree `doctopus-s4-1`. Statut : **DONE_WITH_CONCERNS** (voir « À trancher »).

Skills : l'outil Skill n'était pas disponible dans ce contexte ; j'ai lu à la main `dept-fondations` et `dept-coordination`
(`.claude/skills/*/SKILL.md`). Pas de `state.md` (aucun pipeline nommé) : le brief est le message de dispatch.

## Ce qui est livré

| Fichier | Rôle |
|---|---|
| `src/db/types.ts` | Tous les champs de la série 4 (§12.12 m-d), **optionnels** : `TaskInstance` (`teile`, `rappel`, `dUnTrait`, `creeA`), `DayPlan.tz`, `CaseProgress` (`couverture`, `maitrise`, `etat`, `solideDepuis`, `pretAt`, `prochaineConsolidation`, `pretManque`), `TeilProgress.solideDes`, `TrainingEvent` (`enchaine`, `examen`, `examenManque`, `minutesParTeil`, `manques`), `Simulation` (`enchaine`, `reihenfolge`, `dauerGesamtSec`, `muster: MusterCity \| MusterArt`), `MusterArt`, `ChecklistItemId`, `ConditionExamen`, `CaseEtat`. |
| `src/lib/program/parametres.ts` | La table du §13 en entier (un endroit chacun), plus `DATE_NOUVELLE_REGLE` et les trois gardes d'annonce. |
| `src/lib/progression.ts` (pure) | `statusSuivant` (automate solide stable), `computeCaseProgress` (couverture, maîtrise, échelle, soudure, `solideDes`, `prochaineConsolidation`, `pretManque`), `blankProgress`, `estNonMesure`. `journal.ts` les ré-exporte : aucun import à changer. |
| `src/lib/examen.ts` | UNE définition : `conditionsManquantes` / `conditionsExamen` / `isExamenBlanc` / `estSerie4`. |
| `src/lib/journal.ts` | `trainingEventFromSimulation` dérive `enchaine`, `examen`, `examenManque`, `minutesParTeil`, `manques`, `spentMin` depuis `dauerGesamtSec`. |
| `src/lib/dialData.ts` | `CaseDialData` + `dialData` (pure). |
| `src/lib/program/couverturePonderee.ts` | `couverturePonderee`, `phraseCouverture`, `frequencesDeRepli` (mesure ; affichage = S4-5). |
| `src/lib/program/trajectory.ts` | `indiceAt` figé avant `DATE_NOUVELLE_REGLE`, `Trajectory.repere`, pente qui ne traverse pas la marche. |
| `src/lib/program/tacheDeCas.ts` | `teileDeTache` seul (le cadran en a besoin) ; le reste est à S4-2. |
| `src/lib/annonceS4.ts`, `src/features/home/AnnonceS4.tsx` | L'annonce unique (§10.7), montée dans `HomePage` (2 lignes). |

## Invariants : rouge → vert → mutation

Rouge : `8d66663c` (tests seuls). Le fichier C6 échouait à l'import (modules absents), `journal.etatCas.test.ts` : 19 échecs sur 20.
Vert : `a0e2c1f2`. Mutations dans `scripts/parcours-mutations.mjs` (`a13ba333`), toutes dans `tests/invariants.mesure.test.ts`.

| Invariant | Test | Mutations tuées |
|---|---|---|
| INV-53 maîtrise | propriété 300 tirages + « un Teil à 90 → 90 » | `INV-53` (Σ/3) |
| INV-61 solide stable | propriété 400 séquences + table des écarts (jours calendaires, 48 h exactes, 26 h) | `INV-61a` (statut = dernier score), `INV-61b` (72 h) |
| INV-62 un cran | solide puis s ∈ [0,79], dont 0 | `INV-62` |
| INV-56 prêt / soudure | 6 scénarios + propriété 500 journaux | `INV-56a` (run antérieur), `56b` (`enchaine` seul), `56c` (retombée sans effet) |
| INV-59 cadran | pureté, couverture/maîtrise/soudure/nonMesure, ligne d'avant la série 4, **incrémental = reconstruit sur la vraie base** | `INV-59a` (maîtrise recalculée), `59b` (solide soudé) |
| INV-66 couverture pondérée | ventilée / repli / `Alle` / `Complément`, phrase, garde EXAM_CLAIM, 0 ≤ pct ≤ 100 | `INV-66a` (dénominateur), `66b` (repli silencieux) |
| INV-69 frise figée | oracle série 3 réécrit à part (même ordre d'addition), repère, pente | `INV-69a` (règle rétroactive), `69b` (pente traverse la marche) |
| INV-75 (moitié dérivation) | `at` = `date`, `spentMin` = `dauerGesamtSec` | `INV-75` |
| Décision (b) | kind ⇔ `examen` ⇔ conditions ; la couche n'y compte pas ; −1 manque, 0 est une note | `b-couche`, `b-ordre`, `b-grille` |
| Décision (e) | anciens runs : `examen-blanc` mais jamais `examen`, jamais prêts ; payload forgé ; lecture tolérante | `e-anciens` |

**INV-75, moitié écriture** (`Simulation.date = lauf.startedAt`) : `simulationSave.ts`, donc S4-3. Rien à mesurer ici.
**L'annonce** a été écrite avec ses tests dans le même geste (pas de phase rouge). Je l'ai compensé par 3 mutations manuelles (journal entier au lieu du journal arrêté à la date ; sans retrait des Teile redevenus solides ; sans « déjà fermée »), toutes tuées.

## Vérifications (par code de sortie)

| Commande | Résultat |
|---|---|
| `npx tsc -b --noEmit` | 0 |
| `npm run test:c6` | 0 — 6 fichiers, 52 tests |
| `node scripts/parcours-mutations.mjs` (**complet**, load 8) | 0 — baseline vert, **40/40** tuées (22 anciennes + 18 nouvelles) |
| `npx vitest run --dir src` | Dernière passe complète (load 11 → 80, la machine était saturée par d'autres) : 1293 passés, 8 échecs, **tous des délais dépassés dans des fichiers que je n'ai pas touchés** (7 « timed out » ; le huitième est dans le même cas) — les 6 fichiers relancés avec `--testTimeout=60000` : 36/36 verts. Une passe précédente à load ~10 : 1314 passés, 1 échec à moi (corrigé, ci-dessous). Baseline : 25 délais dépassés à load 22–29. |
| `npm run build` | 0 |
| `scripts/check*.mjs` (31) | 30 à 0. `checkProbeOverlap.mjs` = 1, **déjà 1 sur la base** et `|| true` dans la CI. `checkProtocolCoverage.py` = 1 ici (division par zéro : les sources brutes ne sont pas dans le worktree), 0 dans le dépôt principal. |
| `git merge-tree --write-tree origin/main HEAD` | 0 (origin/main a avancé jusqu'à `c1f99ff6`) |

Le 1 échec `src` (`journal.etatCas.test.ts`, `solideDes` attendu `null`, reçu `undefined`) a été corrigé et ce fichier relancé : 20/20. La passe complète faite après n'a eu que des délais dépassés (ligne ci-dessus).
Navigateur : `vite` local (`VITE_AUTH_MODE=public`, Supabase factice sur un port refusé : aucun contact avec le projet EU), base IndexedDB neuve, journal semé dans `progress_events`. Mesuré dans le DOM : l'encart apparaît, « Compris » le ferme et pose `annonce.s4.teile`, il ne revient pas au rechargement. Capture relue : sobre.

Les tests de la série 3 qui supposaient « une réussite ≥ 80 = solide » ont été mis à jour (`journal.test.ts`, `journal.write.test.ts`, `simulationSave.test.ts`, `sync/boot.test.ts`) : c'est la décision (e), pas une régression. `boot.test.ts` : c0 reçoit une seconde partie à 3 jours pour rester un cas solide.

## Décisions d'implémentation

- `computeCaseProgress(events, { regle: 'serie3' })` rejoue l'ancienne règle pour la frise ; tri total `(at, id)` (INV-59).
- `solideDepuis` = l'événement du dernier passage aux trois Teile solides, effacé par une retombée. `pretAt` = le run qualifiant le plus récent à `at ≥ solideDepuis`.
- Un Teil retombé de solide à acquis garde son ancienne réussite comme témoin : un seul ≥ 80 le rend solide à nouveau (la lettre du §13.2).
- `repere` n'existe que si la fenêtre de la frise contient les deux règles.
- Une `Simulation` est série 4 si `Array.isArray(reihenfolge)` (une valeur illisible se lit comme une ancienne).

## À trancher (contradictions et lacunes — rien tranché en silence)

1. **`pretManque` (§12.7) n'a aucune source** dans `TrainingEvent` ni `CaseProgress` (§12.6). Ajouts : `TrainingEvent.examenManque` (même fonction que `examen` : `[]` ⇔ `examen`) et `CaseProgress.pretManque`. *Proposition de contrat.*
2. **`solideDes` (§12.7) n'a pas de source non plus.** Ajout : `TeilProgress.solideDes` (absent quand `null`, normalisé par `dialData`). §12.12 dit que `TeilProgress` gagne des champs sans les nommer.
3. **« ids legacy `cl-N` traduits à la lecture » (§2.3) contre « ids d'origine stables » (§12.3, §13.3, INV-63).** Une fois traduits, on ne sait plus qu'ils étaient legacy. Implémenté : une partie à ids `cl-N` n'a **pas** de `manques[t]`. S4-2 peut s'y fier.
4. **`enchaine` de `conditionsExamen` (§2.3) ne dit pas « trois Teile faits »** alors que `TrainingEvent.enchaine` le dit. Une seule fonction (`estEnchaine`) sert les deux.
5. **`languageGridEntered({})` vaut `true`** (`every` sur un objet vide). Durcissement dans `examen.ts` : les cinq critères nommés doivent être saisis.
6. **Champs de `CaseProgress` optionnels** (consigne du dispatch) alors que le contrat les écrit obligatoires. `computeCaseProgress` et `blankProgress` les posent toujours ; `dialData` tolère leur absence.
7. **`DATE_NOUVELLE_REGLE = '2026-10-05'` est une hypothèse.** C'est « la date du déploiement de S4-1 », inconnue. **À re-dater le jour du merge.** Trop tôt, elle réécrirait des points de frise déjà montrés (INV-69) ; trop tard, elle fige quelques jours de plus (inoffensif).
8. **Fichiers de test nommés autrement que le §10.** `lib/journal/etatCas.test.ts` aurait côtoyé `lib/journal.ts` : `lib/journal.etatCas.test.ts`. Les propriétés vivent dans `tests/` parce que le harnais de mutation ne rejoue que ce dossier.
9. **Ce que S4-1 a pris à S4-2** : `prochaineConsolidation` (§13.1, c'est un champ de `CaseProgress`, donc à moi) et `teileDeTache`. S4-2 garde `resteTache`, `statutTache`, `lireTache`, et peut ajuster.
10. **`HomePage.tsx`** hors de ma liste : deux lignes pour monter `<AnnonceS4 />`. Le dispatch demande l'annonce ; le point de montage n'était pas nommé.

## Reste à S4-2 / S4-3 / S4-4

- **S4-2** : `restePlan` / `detteTeil` à la place de `detteTeil(cp)` (toujours « statut ≠ solide » ici, donc des Teile récemment joués comptent encore dans la dette) ; INV-60, 63, 64, 65, 67 ; consommer `prochaineConsolidation`, `manques`, `minutesParTeil` ; `layerFor` lit encore `overall` ; mettre `ANNONCE_MODE_ACTIVE = true` dans le commit qui livre la bascule du mode.
- **S4-3** : écrire `enchaine`, `reihenfolge`, `dauerGesamtSec`, `date = startedAt` (INV-73, INV-75 côté écriture) ; `musterArt()` ; `ANNONCE_MUSTER_ACTIVE = true` à la livraison. Tant que S4-3 n'écrit pas `reihenfolge`, **aucun run ne peut être « prêt »** : c'est voulu (décision (e)).
- **S4-4** : rendre `dialData` ; le dessin du `repere` de la frise (S4-5/6) — `AnnonceS4` ne promet pas ce repère tant que rien ne l'affiche.
- **Contenu** : la table `FrequenceProtocoles` ventilée (proposition du §13.6) ; `couverturePonderee` se replie sur `Case.frequency`.

## Non vérifié

- `parcours-mutations.mjs --navigateur` et le candidat synthétique (Supabase local requis).
- Tout fuseau autre que celui de la machine ; un changement d'heure pendant l'écart de 3 jours (les écarts utilisent `differenceInCalendarDays`).
- L'annonce sur un appareil à journal volumineux (performance de trois `computeCaseProgress` au montage).
- Affichage de l'annonce en thème sombre et sur mobile.
