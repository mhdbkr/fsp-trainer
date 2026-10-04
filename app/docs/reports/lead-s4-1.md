# S4-1 — la mesure · rapport de tâche

Branche `feat/s4-1-mesure` (base `origin/main` @ `bc5382ed`), worktree `doctopus-s4-1`. Statut : **DONE_WITH_CONCERNS** (voir « À trancher »).

Skills : l'outil Skill n'était pas disponible dans ce contexte ; j'ai lu à la main `dept-fondations` et `dept-coordination`
(`.claude/skills/*/SKILL.md`). Pas de `state.md` (aucun pipeline nommé) : le brief est le message de dispatch.

## Revues et corrections (4–5 oct.)

**Verdicts.** Mécanique (Opus) : *Needs fixes* — mesure juste, pure, déterministe ; rejeu sur 3 journaux réalistes : INV-69 tenu, l'annonce compte exactement les Teile qui changent. Pédagogie (droit de veto) : *accord avec réserves*, aucun veto. Le contrat a été amendé en conséquence (`bd61914e` : grille = cinq critères, bascule au lendemain du merge, invariant `solide ⇔ pretManque non vide`).

| Item | Correction | Commit | Preuve |
|---|---|---|---|
| I1 la projection disparaissait le jour de la bascule | la pente se lit sur les `slopeDays+1` derniers jours **recalculés avec la nouvelle règle** (`indiceAt(…, regle)`) ; points affichés inchangés | `c79863f7` | rouge : `indiceProjete` nul à J+0, J+1, J+3, J+10 ; mutation `I1-pente` tuée (le test d'origine ne la discriminait pas : la pente ne dépend que des extrémités, il lui faut une réussite unique au début de la fenêtre) |
| I2 `solide ⇔ pretManque` faux à instants égaux | la soudure retient sa **position** (`soudureIdx`) ; `qual` et `pretManque` se cherchent après elle | `1cdba8a0` | rouge : contre-exemple de la revue + propriété à instants égaux (800 tirages, > 100 journaux à instants égaux) ; mutation `I2-egalite` tuée |
| P1 les cas redevenus acquis envahissaient le plan | `detteTeil(cp, jour)` : Teil « à confirmer » (acquis, déjà réussi ≥ 80, `solideDes` passé) = `POIDS_CONSOLIDATION`. `raisonAConfirmer(cp, jour)` pure : « Réussi à 85 le 12 sept. — une seconde partie à 80 ou plus le confirme. » | `cadd3e42` | rouge : dix cas fréquents redevenus acquis ; le plan du lendemain garde un cas jamais joué ; mutation `P1-dette` tuée |
| P2 « jamais travaillé » sur un cas joué | `select.ts` : `&& !ctx.lastPlayedAt.has(s.c.id)` (une ligne) | `ded8c592` | rouge d'abord (`select.test.ts`) |
| m1 | INV-61 : automate indépendant, **deux sens**, 500 tirages ; INV-56 : `solideDepuis` recalculé par préfixes ; mutations `INV-61c` (témoin = dernière réussite) et `P3-solideDepuis` | `1cdba8a0`, `c7e1932a` | 44 mutations |
| m2 texte de l'annonce | titre et corps de la pédagogie, date de la marche = `DATE_NOUVELLE_REGLE` formatée | `08137c6a` | texte comparé au caractère près |
| m3 / m4 | commentaire `TaskInstance.teil` ; « 26 h » → « 50 h » | `55eb2b47`, `1cdba8a0` | — |

Ajouts de contrat qui en découlent (à ratifier) : `TeilProgress.premiereReussite { at, score }` (la phrase de P1 a besoin du score) ; `detteTeil` prend un jour (défaut : l'horloge, `dayKey(now())`) — **S4-2 doit le passer explicitement** (`restePlan` le remplacera) ; `pretManque` ignore les runs à `examenManque = []` (déjà qualifiants : ils auraient soudé).
Non fait, comme demandé : `DATE_NOUVELLE_REGLE` (`main` la pose au merge) ; l'affichage de `solideDes` et de la maîtrise (S4-4).
Réserve de l'annonce : « une nouvelle partie à 80 ou plus suffit » est exact une fois `solideDes` passé ; pour une réussite de la veille de la bascule, il faut attendre l'écart de trois jours. C'est le texte validé.
Un `git stash` (`stash@{0}: autostash`) existe dans ce dépôt : il n'est pas de moi (je n'en ai jamais fait), je n'y ai pas touché.

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
| `npm run test:c6` | 0 — 6 fichiers, 59 tests |
| `node scripts/parcours-mutations.mjs` (**complet**) | 0 — baseline vert, **44/44** tuées (22 anciennes, 17 de la livraison, 5 des revues ; INV-69b remplacée par I1-pente), load 10 |
| `npx vitest run --dir src` (après les revues) | 1314 passés, 2 échecs (`TermSheet`, `ResultScreen`) : délais dépassés sous charge (load 20), fichiers non touchés ; relancés avec `--testTimeout=60000` : 12/12 verts. |
| `npm run build` | 0 |
| `scripts/check*.mjs` (31) | 30 à 0. `checkProbeOverlap.mjs` = 1, **déjà 1 sur la base** et `|| true` dans la CI. `checkProtocolCoverage.py` = 1 ici (division par zéro : les sources brutes ne sont pas dans le worktree), 0 dans le dépôt principal. |
| `git merge-tree --write-tree origin/main HEAD` | 0 |

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
