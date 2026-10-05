# S4-2 — le plan · rapport du lead (reprise en Opus)

**Statut : DONE_WITH_CONCERNS.** Les concerns sont des points de contrat à confirmer (§4), pas des défauts ouverts.
Branche `feat/s4-2-plan`, worktree `doctopus-s4-2-plan`. `origin/main` fusionné deux fois, sans conflit : `b0f46dbd` (K0), puis `d8f7a91a` (#73, #74).
Rien n'a été déployé. Le Supabase local de `main` n'a été ni arrêté ni réinitialisé.

Source unique : ADR-0021, ADR-0022, `docs/contracts/training-journal.md` §12 et §13.
Les commits d'avant la reprise (`c5453c67` → `c4af91d7`) portent la migration 18, INV-68/76, INV-51/52/54, INV-4/50/55/57/58/60/67.

Commits de la reprise :
- `a6ee2154` : test rouge INV-63/64/65 (le fichier non suivi est repris et corrigé : `forAll` non attendu, aucun scénario « d'un trait » réel) ;
- `a6adb50f` : feat INV-63/64/65 ;
- `a3bd8fed` : fix INV-58 ;
- `342e7ded` et `4f86090c` : textes du plan ;
- `27fcda2a` : candidat C6 ;
- `a1e57e40` et `6459b5fa` : e2e série 4 ;
- `0330cda1` : mutations remises à jour.

## 1. Invariants (rouge → vert → mutation)

| Id | Rouge | Vert | Mutations (toutes tuées) |
|---|---|---|---|
| **INV-64** durées apprises | `a6ee2154` (`dureeTeil` ne rendait que le repli) | `a6adb50f` | moyenne au lieu de médiane · repli absent · séances IA comptées · Σ en `teil-first` sur une `simulation` · estimation réduite à un Teil sur `revision`/examen à blanc · consolidation filtrée en `teil-first` · reprise proportionnelle |
| **INV-63** erreurs transversales | `a6ee2154` (module absent) | `a6adb50f` | fenêtre ignorée · seuil « 2 cas » ignoré · séance IA dans la fenêtre · rappel sur examen à blanc · rappel sur tâche d'un trait · même rappel répété |
| **INV-65** rythme proposé | `a6ee2154` (module absent) | `a6adb50f` | proposition à la hausse · sous le plancher · seuil 60 % ignoré · jour off compté · P2 ignoré · refus local (non synchronisé) · accepter écrit un fragment |
| **INV-58** reprise hors budget | `a3bd8fed` (test d'abord rouge : `[c3, c9]`) | `a3bd8fed` | une reprise écrase la reprise insérée |
| INV-10, INV-12, INV-76a | — | — | mutations **inapplicables** depuis `c4af91d7`/`dec857ac`, réécrites au nouvel emplacement (`0330cda1`), tuées |

Oracles écrits à part, à la lettre du contrat : `app/tests/invariants.apprentissage.test.ts` (21 tests).

### Réserves pédagogiques (ADR-0022) — où elles sont tenues
- **T1** (aucun rappel sur une tâche `dUnTrait` ni sur un examen à blanc) : `erreurs.ts` `peutRappeler`. Le test produit des tâches d'un trait réelles (fenêtre du 1er déc., garde active). Les mutations `INV-63-d-un-trait` et `INV-63-examen-blanc` sont tuées.
- **T2** (texte neutre) : `« Allergien inkl. Medikamentenallergien » manque dans 3 de tes 5 dernières Anamnesen.` Le test refuse `échec|faute|erreur|toujours|encore|%|retard|faible|mauvais|oubli`.
- **P1** (la conséquence, jamais l'écart) : `À ce rythme, les N cas les plus fréquents seront travaillés le 12 déc. au lieu du 2 déc.` Aucun `%`.
- **P2** (deux refus de suite : plus de proposition jusqu'à la prochaine modification du programme) : `refusRythme().depuisDerniereConfig`. Le test couvre deux semaines puis une modification.
- **Durées : les minutes seulement.** `dureeTeil` n'est lue que par `estMin` (plan, reprise, carte de rythme). Aucun texte ne la cite.

### Absorbés par S4-2
- **Q-9** (config non synchronisée) : `b02898f7`, INV-68/76 (`tests/invariants.config.test.ts`, 14 tests).
- **M-b** (refus de rattrapage multi-appareils) : `dec857ac`, `rattrapage.refused`. Le refus de rythme suit le même modèle.
- **Single-flight conservé (C6-B)** : `ensureDayPlan` est inchangé, gardé par `src/lib/program/dayPlan.test.ts:359`.
- `D_UN_TRAIT_ACTIF = false` : inchangé (`parametres.ts`).

## 2. Défauts trouvés et corrigés (test rouge d'abord)

### [MAJEUR] En mode observé « par Teil », la consolidation ne revenait jamais
- **Où** : `app/src/lib/program/dayPlan.ts`, filtre `teilHabituel` (commit `c4af91d7`)
- **Constat** : un cas solide dû a `restePlan = []`. Le filtre `restePlan(...).includes(teilHabituel)` l'écartait, donc un candidat qui joue par Teil ne revoyait jamais ses cas solides.
- **Preuve** : le test `observé « par Teil » : un cas solide DÛ revient quand même` a d'abord échoué (`expected undefined to be defined`).
- **Correctif** : `s.parts.du || restePlan(...)` (`a6adb50f`), gardé par la mutation `INV-64-consolidation-teil-first`.

### [MAJEUR] Hors budget, une reprise remplaçait la reprise qu'on venait d'insérer
- **Où** : `app/src/lib/program/rattrapage.ts` `accepterRattrapage`
- **Constat** : avec les durées apprises, deux reprises de cas entiers (52 min) ne tiennent plus dans 90 min. La seconde remplaçait la première au lieu d'une tâche du jour (m-c).
- **Preuve** : `expected [ 'c3', 'c9' ] to deeply equal [ 'c1', 'c3' ]`.
- **Correctif** : on ne remplace qu'une tâche du jour (`!p.tasks.includes(t)`) (`a3bd8fed`). Tests ajoutés dans `rattrapage.test.ts` et `invariants.completion.test.ts`, plus une mutation.

## 3. Décisions prises (à relire par `main`)
1. **Jour figé pour le rythme** : un `DayPlan` **sans tâche** (jour off ouvert) n'est pas compté. `materialiser` lui donne pourtant `targetMin` = budget plein. Le compter proposerait une baisse du budget à qui ouvre l'app un dimanche. Gardé par une mutation (`INV-65-jour-off`).
2. **Reprise « finir hier »** : `estMin` = Σ `dureeTeil` de **ce qui reste**, même si le mode observé est `teil-first`. La reprise demande de *finir* le cas. Avant, l'estimation était une part proportionnelle de l'ancienne. Ce cas n'est pas écrit dans le contrat (voir §4.2).
3. **Médiane arrondie** à la minute entière (le contrat écrit `clamp(médiane)`).
4. **« Les N cas les plus fréquents »** = les cas avec `freq ≥ SEUIL_FREQUENT` (paramètre nommé existant), pas un 40 en dur.
5. **Modèle de la conséquence** : le travail compte chaque Teil non solide des cas fréquents, à sa durée apprise. Il est réparti sur les jours ouvrés à partir de demain, au budget proposé puis au budget actuel. C'est une projection comparative, pas une promesse. Rien à projeter : pas de phrase.
6. **Texte de la carte** : « Ton temps des derniers jours tient dans un budget de N min par jour. » Formule choisie pour rester vraie au plancher : à 5 min réelles, la valeur proposée vaut 20 min.
7. **Le rappel est figé, ses chiffres ne le sont pas** : la tâche ne porte que l'id de l'item (`TaskInstance.rappel`). « 3 de tes 5 » se relit sur le journal d'avant le jour. Une synchro tardive d'un événement plus ancien peut changer les chiffres affichés, jamais le rappel.
8. **Accueil** : `TaskList` (dans `features/program`) lit elle-même le plan figé et le journal. L'accueil dit donc « Il te reste… » sans aucun changement de `features/home`.

## 4. Contradictions et silences du contrat — non tranchés en silence
1. **§13.5 « figés = jours avec DayPlan »** contre les plans de jour off (tâches vides, `targetMin` plein). Proposition : écrire « jours avec un DayPlan **portant au moins une tâche** » (décision 1).
2. **§12.8 et §13.4** : l'`estMin` d'une reprise n'est pas défini. INV-64 (« tâche de cas = Σ dureeTeil ; `simulation` en `teil-first` = le Teil probable ») s'appliquerait littéralement à une reprise `simulation`. J'ai retenu Σ du reste (décision 2). **À confirmer par la direction.**
3. **§13.5** : la phrase d'exemple cite « 40 cas », mais aucun paramètre ne le nomme. Proposition : nommer l'ensemble (`freq ≥ SEUIL_FREQUENT`) dans la table §13.
4. **§13.3, sortie « bilan »** (« cochée cette fois » / « encore manquée (n/5) ») : elle se rend dans le bilan de partie, `features/simulation`, périmètre de S4-3. **Non faite ici.** Proposition : S4-3 consomme `erreursTransversales` et `libelleItem` (`lib/program/erreurs.ts`).
5. **INV-63** : « une tâche porte au plus un rappel » et « la tâche suivante qui contient ce Teil le dit ». L'affectation est gloutonne, dans l'ordre des tâches. Avec des tâches aux Teile hétérogènes, un signal peut rester tu alors qu'un couplage existerait. Le test ne l'exige que lorsque toutes les tâches éligibles portent les trois Teile.

## 5. Vérifications (codes de sortie)

**Commit vérifié : `d8f7a91a`**, fusion de `origin/main` `ccef1b0b` (#73 cadran S4-4, #74 K1), sans conflit. La batterie a tourné en séquence, charge 4 à 13 :
- `tsc -b --noEmit` 0 · `npm run build` 0
- `vitest run --dir src --maxWorkers=2` 0 : 160 fichiers, 1580 tests
- `npm run test:c6` 0 : 10 fichiers, 122 tests
- Les 19 validateurs bloquants de la CI sont à 0 : les 16 `check*.mjs`, `checkTermRegister --require-all`, `checkBudgetFloor origin/main` et `check-parity`. Avant cette fusion, `checkBudgetFloor` sortait à 1 : `main` avait abaissé ses fixtures (#74). Un faux positif de base périmée, levé par la fusion.

`node scripts/parcours-mutations.mjs` (complet) : **0, baseline vert, 104/104 tuées**.
- Cela comprend 21 nouvelles mutations S4-2.
- Trois mutations étaient **inapplicables** depuis les commits d'avant la reprise (INV-10, INV-12, INV-76a) ; elles ont été réécrites au nouvel emplacement (`0330cda1`).
- Sous forte charge, une mutation peut sortir « survivante » parce que le lanceur filtre les dépassements de délai. Cela est arrivé une fois (`INV-64-repli`) ; rejouée seule, elle est tuée.

Candidat synthétique C6 (`parcours-candidat.mjs`, build contre le Supabase local) : 0, **237/237**.
- **D15** évalué 15 fois. Une partie d'un seul Teil laisse la ligne non faite avec « Il te reste la Dokumentation et la Fallvorstellung ». Un cas entier coche la ligne.
- **D17**, chemin réel : « Obere GI-Blutung bei Ulcus ventriculi (lundi 5 octobre) : il te reste la Dokumentation et la Fallvorstellung. Finir aujourd'hui ? ». Accepté, il devient la reprise `[dokumentation, fallvorstellung]`, raison « Finir … ».
- **D13** est évalué pour la première fois. Il lisait des libellés disparus (« Les reprendre ») et n'était jamais exercé.

`scripts/e2e/programmeInvariants.mjs` (sur `6459b5fa`) : 0, **6/6**. Le script portait des hypothèses série 3, portées à la série 4 :
- P4 vaut en mode `cas-complet` (INV-4 modifié, §8) ;
- P3a joue un seul Teil d'une tâche de cas et constate : tâche non faite, « Il te reste … » ;
- P3b lit le cadran de #73 : « Dokumentation : pas encore travaillé. Fallvorstellung : pas encore travaillé. »

Le reste :
- **Migration et fonction** (Supabase local, second edge-runtime `s4-2-edge` qui sert ce worktree ; migration 18 déjà appliquée en local) : `vitest run --dir supabase/tests events rls` 0, 34/34.
- **Fusion** : `git merge-tree --write-tree origin/main HEAD` 0 avec `origin/main` `3c5c92a7`, qui n'ajoute qu'une ligne de registre (`serie3-avancement.md`), non fusionnée.
- **Visuel** (build servi, sonde Playwright, mesure depuis le DOM) : sur Programme et Accueil, la ligne du cas entamé rend « Il te reste la Dokumentation et la Fallvorstellung · 32 min ».

En début de session, la charge (39 à 67) a fait échouer des tests par délai : délais de 5 s, workers non démarrés, perf à 53 s pour 15 s. Rejoués fichier par fichier, ils passent tous. Aucun n'était une assertion de logique.

## 6. Procédure de déploiement production (projet EU `hwpwoblpygvxwbztconc`) — NON exécutée

Ordre impératif : **migration → fonction → client**. Le CI ne déploie que le client (Pages, au push sur `main`). La migration et la fonction se font donc **avant** la fusion de la PR. Accord de la direction requis (ADR-0015). Jamais `db reset`.

1. **Avant (lecture seule)** :
   - `select pg_get_constraintdef(oid) from pg_constraint where conname = 'progress_events_type_check';` : liste de `…17` attendue, sans les deux nouveaux types.
   - `select type, count(*) from public.progress_events group by type order by 1;` : chaque type figure dans la liste de `…18` (l'`ADD CONSTRAINT` relit la table sous un verrou exclusif bref ; elle est petite).
2. **Migration** : depuis `app/` lié au projet EU, `npx supabase db push`, qui n'applique que `20261004000018_s4_preference_events.sql` et l'enregistre dans l'historique. Si l'on passe par `psql -v ON_ERROR_STOP=1 -f …`, enregistrer aussi la version, sinon un `db push` ultérieur la rejouerait. Puis vérifier que la contrainte contient `rythme.refused` et `rattrapage.refused`.
3. **Fonction** : `npx supabase functions deploy events --project-ref hwpwoblpygvxwbztconc`, sans `--no-verify-jwt` (la config fait foi).
4. **Fumée**, avec un compte de test, **jamais** Mehdi ni Lydia. Les mêmes cas sont prouvés en local par `supabase/tests/events.test.ts`.
   - POST `rythme.refused` (sujet `2026-W42`, payload `{}`) → `acked` ;
   - `rythme.refused` avec la semaine `2026-W54` → `rejected` ;
   - `program.configured` avec `subject_id` non nul → `rejected` ;
   - `plan.materialized` avec `tz: 'Europe/Berlin'` → `acked` ;
   - `program.configured` à `hoursPerSession: 0.26` (ce qu'`accepterRythme` peut produire) → `acked`.
5. **Client** : seulement ensuite, fusion de la PR, puis Pages.
6. **Après, sur l'appareil de Mehdi puis de Lydia** :
   - au premier démarrage, la config locale part **une** fois (`program.configured`, garde `CONFIG_POUSSEE_S4` dans `meta`). En base : exactement un `program.configured` de plus par utilisateur ;
   - le plan du lendemain est fait de cas entiers et n'a plus de proposition de mode ;
   - l'annonce unique des changements rétroactifs apparaît (`ANNONCE_MODE_ACTIVE = true`) ;
   - aucune carte de rythme ne s'affiche avant 3 jours figés avec tâches.

**Si l'ordre n'est pas tenu** :
- *Client avant fonction* : `plan.materialized` porte `tz`, que l'ancienne fonction refuse (schéma `.strict()`, sans `retry`). L'événement sort alors de l'outbox et le plan ne gagne pas l'autre appareil. `rythme.refused` et `rattrapage.refused` sont gardés (`unknown_type` ⇒ `retry`).
- *Fonction avant migration* : les nouveaux types passent Zod, mais la contrainte les refuse ⇒ `retry`. Ils sont rejoués après la migration.

**Retour arrière** :
- *Client* : revert du commit de fusion sur `main` ⇒ Pages republie l'ancien client. Il ignore les deux nouveaux types (§12.10) et lit les plans série 4 sans cocher à tort (§12.11).
- *Fonction* : redéployer la version précédente de `events`. La nouvelle est un sur-ensemble et peut rester.
- *Migration* : la contrainte élargie est un sur-ensemble inoffensif. **Ne pas** la resserrer tant que des lignes des nouveaux types existent.
- *Données* : les événements sont additifs ; aucune donnée n'est réécrite.

## 7. Constats hors périmètre (propositions, rien modifié)

### [MINEUR] Le héros de l'accueil affiche l'estimation figée d'un cas entamé
- **Où** : `features/home/HomePage.tsx`, carte « Session du jour »
- **Constat** : le héros affiche l'estimation figée du cas, la ligne du plan les minutes de ce qui reste.
- **Preuve** : capture du build servi : héros « … · 52 min », ligne « Il te reste la Dokumentation et la Fallvorstellung · 32 min ».
- **Correctif** : le héros lit `lectureDuPlan` (exportée par `features/program/TaskLine.tsx`). Revient au propriétaire de l'accueil (S4-5).

### [MINEUR] La raison figée « jamais travaillé » reste affichée après une première partie
- **Où** : la raison figée de la tâche (`pourquoiAujourdhui`)
- **Constat** : la raison est figée par contrat (§3). Elle n'est donc pas un défaut de S4-2, mais elle se lit fausse une fois le cas entamé.
- **Preuve** : « Parmi les cas les plus vus à l'examen, et jamais travaillé. » affiché sous « Il te reste la Dokumentation et la Fallvorstellung ».
- **Correctif** : à arbitrer par la direction ou S4-5 (masquer la raison d'une tâche entamée ?).

### Observation sur le candidat synthétique
Il joue 1 à 4 min par Teil. Ses durées apprises tombent au plancher de 5 min, d'où une journée de 14 tâches en `teil-first` (« 0/14 faits · 81 min prévues »). Le budget est juste, c'est l'artefact d'un candidat irréaliste.

## Non vérifié
- **Deux appareils réels** (deux contextes navigateur) pour le refus de rythme et la config. C'est prouvé en tests (même journal, aucun état local), pas en navigateur.
- **La carte de rythme dans un navigateur** : elle est prouvée en test de composant (`RythmeCard.test.tsx`), pas capturée dans le build. Le candidat ne réunit pas 3 jours figés sous 60 % dans la même semaine ISO avant son refus éventuel.
- **Production** : rien déployé. La procédure §6 n'est pas exercée sur le projet EU.
- 10 000 événements : le test de perf existant (3 000 simulations, 2 000 `training.logged`, 5 000 révisions) passe à charge normale. Le coût de `dureesTeile` et de `erreursTransversales` par plan (un tri du journal chacun) n'est pas mesuré en navigateur.
