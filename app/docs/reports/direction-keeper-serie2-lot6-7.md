# direction-keeper — Série 2, lots 6–7 (FB2-M4 prompt Doctopus · FB2-P1/P2 simulation par Teil)

> Revue faite le 17 sept. 2026 sur `main` @ `1a2ebdb` (commits revus : `2b17ae9` M4,
> `59ef0b3` P1/P2, `4f39060` backlog, `1a2ebdb` fix eval) contre
> `docs/superpowers/specs/2026-09-17-simulation-par-teil-design.md`, le point 16 de Mehdi
> (« de meilleures réponses ne veut pas dire plus longues ») et `DIRECTION-STYLE.md` §2/§4.
> Mesures : `git`, `gh run list/view`, `curl` sur le bundle GitHub Pages
> (`assets/index-DaAOeFto.js`), DOM de l'app via `playwright-cli -s=keeper` headless sur le
> Vite local (5173, hash router) — page Simulation à 640/768/900/1024/1280 px, pré-simulation
> `case-gib?teil=anamnese`, Runner Anamnese seule joué jusqu'au bilan, quitter/reprendre par
> la barre de session, Accueil, Simulation (historique), Stats, fiche du cas, IndexedDB
> `fsp-cockpit` lue depuis la page. La grille d'évaluation a été sondée avec des réponses
> synthétiques en chargeant `grade()` depuis le fichier réel (`scripts/evalDoctopus.mjs`).
> Sans `OPENROUTER_API_KEY` : aucun appel réel au modèle. Lecture seule.

## Verdict court

**Déployé** : les deux commits sont poussés, Qualité et Pages verts sur `59ef0b3` et
`1a2ebdb` (l'échec sur `4f39060` est un rate-limit du téléchargement de la CLI Supabase,
pas le code) ; le bundle live contient `group/start`, « auf dem Niveau eines Prüfers »,
« Sag es so », « simulations complètes ». Dans le DOM : les trois icônes sont invisibles au
repos (`opacity 0`, `translateX(12px)`, `pointer-events none`), glissent au survol
(`opacity 1`, `translateX(0)`, 300 ms) et au clavier (18 Tab → « Commencer » les révèle,
Tab suivant = lien `aria-label="Anamnese seule"` vers `pre?teil=anamnese`) ; la pastille
pré-sélectionne « Anamnese seule » depuis l'URL et le bouton devient « Entrer — Anamnese
seule » ; le Runner n'a qu'une colonne dans le fil, le chip dit « Assisté · Couche 1 ·
Anamnese seule », le bilan s'ouvre et `db.simulations` reçoit
`{ scope: 'teil', teil: 'anamnese', parts: ['anamnese'] }` ; la fiche du cas reste
`confidence 0 / À faire`. Le mécanisme nominal est là.

Mais deux « ✅ » du backlog ont été posés sur des hypothèses, l'anti-pattern n° 1 du guide :
**M4 est marqué fait alors que le seul run réel a rendu 20 réponses vides** (message du
commit `1a2ebdb`) — aucun avant/après n'existe, et la grille, sondée, laisse passer un mur
de 300 mots sur une ligne, une dose inventée, une réponse 100 % allemande à une question
française, et recale la réponse correcte « Der Aszites » (regex sensible à la casse). Côté
Teil, **la session perd sa portée dès qu'on quitte et reprend** (barre « 0/3 parties » →
`run` sans `?teil` → fil à 3 parties), l'Accueil affiche « Confiance 26 % · dernier score
26 % » pour un cas que la fiche déclare « À faire » (règle 3 de la spec non raccordée dans
`weakCases`), et à 1024 px les trois icônes recouvrent « mencer ». Enfin la spec a tranché
« pas de maîtrise sur un Teil » là où le critère de Mehdi dit « au prorata », sans que le
backlog ne soit mis à jour ni le veto pédagogique exercé.

---

## (a) FB2-M4 — prompt système, jeu de référence, harnais

### [BLOQUANT] « Fait » sans mesure : aucun avant/après, le seul run réel a rendu 20 réponses vides
- **Où** : `app/docs/BACKLOG-FEEDBACK.md` (FB2-M4 ✅ posé par `4f39060`), `app/scripts/evalDoctopus.mjs`, commit `1a2ebdb`
- **Constat** : le critère d'acceptation exige « jeu de 20 questions de référence évalué avant/après » ; aucun score n'existe nulle part, et le commit de correction dit lui-même que le premier run a compté 20 vides.
- **Preuve** : `1a2ebdb` : « Le premier run réel a noté 20 réponses vides comme des échecs de prompt. » ; `grep -rn "OPENROUTER\|evalDoctopus\|avant/après" app/docs/reports docs/superpowers/specs` → aucun résultat chiffré ; la CI ne lance que `--dry` (`.github/workflows/quality.yml:57-58`), qui ne valide que la forme du JSON et un échantillon codé en dur.
- **Correctif** : statut « pas fait » tant qu'un run réel (ancien prompt vs nouveau, même modèle que l'app) n'est pas joint au rapport avec ses 20 réponses `--verbose` ; la CI dry ne compte pas comme porte.

### [MAJEUR] La grille mesure des lignes, pas la longueur — le point 16 n'est pas mesuré
- **Où** : `app/scripts/evalDoctopus.mjs:47` (`const lines = text.split('\n').filter(...).length`)
- **Constat** : « pas plus longues » est le cœur du point 16 ; un mur de texte sur une ligne passe.
- **Preuve** : sonde sur `grade()` réel — `term-de-1` avec « die Belastungsdyspnoe, -n. » suivi de 300 × « ein Wort » sur une ligne → `PASSE`.
- **Correctif** : borner en mots (ou caractères) par `kind` (terme ≤ 40 mots, concept ≤ 90, comparaison ≤ 120) en plus des lignes ; le seuil doit refléter « deux lignes pour un terme » du prompt.

### [MAJEUR] Contrôles poreux : « des » vaut du français, une citation de la question vaut « phrase prête à dire », une dose inventée passe
- **Où** : `evalDoctopus.mjs:50` (`/🇫🇷|\b(le|la|les|un|une|des)\b/`), `:52` (`« .{10,} »` en repli de `sagEsSo`), `unsure-1` dans `doctopus.reference.json`
- **Constat** : trois règles se laissent satisfaire par une réponse fausse ou hors consigne.
- **Preuve** : sondes — `term-fr-1` « Atemnot des Patienten bei Anstrengung: die Belastungsdyspnoe » (0 mot de français) → `PASSE` ; `exam-2` « Man beginnt mit « Guten Tag, mein Name ist … ». » → `PASSE` ; `unsure-1` « Metamizol i.v. beim Kind: 50 mg/kg als Bolus. » (dose fausse, sans réserve) → `PASSE` alors que l'item s'appelle *unsure* et que le prompt dit « Erfinde nichts… « unsicher — nachschlagen » » ; `brief-1` « Ja, das ist richtig. « …er hat Schmerzen » … habe » → `PASSE` (mustMatch `habe` ne teste pas la correction).
- **Correctif** : `french` = détecter des mots-outils exclusivement français (`est|sont|pour|avec|chez`) et exclure « des » ; `sagEsSo` = exiger « Sag es so »/« Dis-le ainsi » sans repli ; `unsure-1` = `mustMatch: "unsicher|nachschlagen|Fachinformation"` ou retirer l'item ; `brief-1` = `mustNotMatch: "richtig\\b(?!.*falsch)"` ou un item qui teste une réponse fausse.

### [MAJEUR] La grille contredit le prompt : casse de l'article, guillemets, registres en français
- **Où** : `evalDoctopus.mjs:45` (`ARTICLE = /\b(der|die|das)\s+[A-ZÄÖÜ]…/` sans `i`), `:55` (extraction `«…»` après « Sag es so »), `:53` (marqueurs de registre tous allemands) ; `dictionary.ts:96` (« Sag es so: … » — les guillemets entourent l'étiquette, pas la phrase)
- **Constat** : une réponse qui suit le prompt à la lettre est recalée.
- **Preuve** : `term-de-2` « Der Aszites, kein Plural. » → `pas d’article` (le même item a `mustMatch: "der Aszites"` en `/i`, qui passe) ; `reform-2` « Sag es so: "Wir entfernen Ihren Blinddarm." Nuance: Appendektomie sagt man dem Patienten nicht. » → `Fachbegriff « Appendektomie » dans la reformulation patient` (la nuance nomme le terme, ce que le prompt autorise, mais sans « » le corps analysé est tout le texte) ; `register-2` (question en français) « Pour le patient : « … » / Pour le jury : « … » » → `registres non distingués` alors que le prompt impose « Erklärung auf Französisch ».
- **Correctif** : `ARTICLE` en `/i` ; imposer dans le prompt le gabarit exact `Sag es so: « … »` (guillemets autour de la phrase) et l'accepter aussi avec `"…"` ; ajouter `pour le patient|pour le jury|au patient|au jury` aux marqueurs de registre.

### [MAJEUR] Règles du prompt qu'un modèle 2,6 B ne suivra pas — et qui produiront du bruit
- **Où** : `app/src/lib/dictionary.ts:91-104`
- **Constat** : cinq règles reposent sur un jugement conditionnel ou un comptage que LFM 2.5 2.6B (modèle par défaut, `onlineAi.ts:36`) ne tient pas ; deux se contredisent.
- **Preuve** : (1) `:91` « Antworte in der Sprache der Frage (… Französisch → Deutsch für alles Medizinische, Erklärung auf Französisch) » — trois clauses, une langue mixte à décider mot à mot ; (2) `:92` « 🇫🇷-Glosse nur, wenn die Frage auf Französisch kam **oder der Begriff schwer ist** » — si la question est en français l'explication est déjà en français (glose = doublon), et « schwer » rouvre le rituel que `term-de-1` (`french: false`) sanctionne ; (3) `:96` « Ein Begriff: zwei Zeilen » contre `:94-95` « ein bis drei Sätze » + « EIN Satz zum Nachsprechen » + « EINE Nuance » = jusqu'à cinq blocs ; (4) `:98` « Aufzählungen aus Reflex (nur wenn die Sache selbst eine Liste ist) » et « Rückfragen — außer … wirklich zweideutig » — jugement ; (5) `:103` « einfache Lautschrift, Betonung markiert » — un petit modèle invente l'API ; (6) `:89` « Er will nicht belehrt, er will präzise bedient werden » — rhétorique sans instruction (slop de prompt).
- **Correctif** : une règle de langue en une phrase (« Frage auf Deutsch → alles auf Deutsch. Frage auf Französisch → Erklärung auf Französisch, alle deutschen Wörter/Sätze auf Deutsch, keine 🇫🇷-Glosse. ») ; supprimer « oder der Begriff schwer ist » ; un seul budget par `kind` exprimé en phrases (terme : 2 phrases + « Sag es so ») ; retirer la phrase rhétorique et la Lautschrift (ou la limiter à la syllabe accentuée en majuscules).

### [MINEUR] Le harnais n'évalue pas ce que l'app envoie
- **Où** : `evalDoctopus.mjs:66,71` vs `onlineAi.ts:109-113,156-162,223`
- **Constat** : liste de repli, budget et raisonnement diffèrent de l'app ; le commentaire « Même liste de repli que l'app » est faux ; conversation multi-tour (`askConversation`) et `buildBriefPrompt` (sélection « expliquer », M2) ne sont pas couverts.
- **Preuve** : eval `FALLBACKS = ['nvidia/nemotron…', 'google/gemma-4-26b-a4b-it:free']`, `max_tokens: 700`, aucun `reasoning` ; app `OPENROUTER_FALLBACKS = ['liquid/lfm…', 'nvidia/nemotron…', 'meta-llama/llama-3.1-8b-instruct:free']`, `800`, `reasoningEffort: pickReasoning(turns)`.
- **Correctif** : exporter la liste et les paramètres depuis `onlineAi.ts` et les importer dans le harnais (esbuild, comme `DOCTOPUS_SYSTEM`) ; ajouter 3 items « sélection de phrase » sur `buildBriefPrompt` et 1 item second tour.

### [MINEUR] Couverture du jeu : pas de phrase de Fallvorstellung, `(e.noDisclaimer || true)` toujours vrai
- **Où** : `doctopus.reference.json` (`exam-1` est un « comment ça se passe », pas une tournure), `evalDoctopus.mjs:49`
- **Preuve** : aucun item ne demande « Ich stelle Ihnen Herrn … vor » / « Bei Aufnahme präsentierte sich … » ; `(e.noDisclaimer || true)` — condition morte, l'option du JSON n'a aucun effet.
- **Correctif** : 2 items Fallvorstellung (ouverture, Verdachtsdiagnose au jury) ; supprimer `|| true` ou l'option.

## (b) FB2-P1/P2 — simulation par Teil

### [BLOQUANT] La session perd son Teil quand on quitte et reprend — le fil redevient complet
- **Où** : `app/src/components/ResumeSessionBar.tsx:24,35`, `app/src/store/simSession.ts:11-22` (`SessionSnapshot` sans `teil`), `SimulationRunner.tsx:51`
- **Constat** : quitter le Runner minimise la session ; « Reprendre » navigue sur `/run` sans `?teil=`, la barre annonce « 0/3 parties », et la partie seule devient une simulation complète (qui serait enregistrée `scope: 'full'` à la fin).
- **Preuve** : DOM — avant : `url "#/simulation/case-gib/run?teil=anamnese"`, chip « Assisté · Couche 1 · Anamnese seule », fil `repeat(1, …)` `["Anamnese"]` ; barre : « Simulation en pause · Obere GI-Blutung… Anamnese · 0/3 parties Reprendre » ; après « Reprendre » : `url "#/simulation/case-gib/run"`, chip « Assisté · Couche 1 », fil `repeat(3, …)` `["Anamnese","Dokumentation","Fallvorstellung"]`. Code : `navigate(\`/simulation/${snapshot.caseId}/run\`)`, `{doneCount}/3 parties`.
- **Correctif** : `SessionSnapshot.teil?: SimTeil` écrit par le Runner ; `resumeSim` ajoute `?teil=` ; la barre affiche `{doneCount}/{teil ? 1 : 3}` ou « Anamnese seule » ; en restauration, ignorer un snapshot dont le Teil diffère de l'URL. Test vitest sur le store + parcours playwright quitter/reprendre.

### [BLOQUANT] Trois surfaces, trois vérités sur la maîtrise d'un cas après un Teil
- **Où** : `app/src/lib/stats.ts:103-111` (`weakCases` sans filtre de portée), `HomePage.tsx:42`, `lib/readiness.ts:66`, `SimulationRunner.tsx:196-201`
- **Constat** : la spec (règle 3) dit qu'un Teil ne fait pas évoluer la maîtrise ; c'est appliqué à la fiche mais pas à l'Accueil, qui affiche un score de cas issu du Teil.
- **Preuve** : après la session Anamnese seule (26 %) : Accueil « Points faibles … Confiance 26 % · Obere GI-Blutung… dernier score 26 % » ; IndexedDB `cases/case-gib` → `{ confidence: 0, status: 'À faire' }` ; « Suis-je prêt ? … 12 cas jamais simulés » ; `weakCases` : `for (const sim of [...sims].sort(...)) lastByCase.set(sim.caseId, sim)` — aucun `isFullSimulation`.
- **Correctif** : filtrer `isFullSimulation` dans `weakCases` (et tout agrégat « par cas » : `readiness` « jamais simulés » doit lire les sims, pas `status`), ou — si le veto pédagogique choisit le prorata — l'appliquer partout d'un seul geste via une fonction `caseScore(sims)` unique. Test : une sim `scope:'teil'` ne change ni `weakCases` ni `lastScoreByCase`.

### [MAJEUR] Règle « pas de maîtrise sur un Teil » tranchée contre le critère écrit de Mehdi, sans veto ni mise à jour
- **Où** : spec §Règles 3 (« Veto pédagogique possible : alternative = maîtrise au prorata ») ; `BACKLOG-FEEDBACK.md` FB2-P2 ✅ (« la maîtrise du cas au prorata … veto pédagogique sur la pondération »)
- **Constat** : la règle est défendable (on ne valide pas une couche FSP sur un tiers de l'examen ; le jury exige ≥ 60 % dans chaque partie) mais elle contredit le critère coché ✅, et le coût utilisateur est réel : après une Anamnese jouée, le cas reste « À faire / jamais simulé » — l'app ne montre pas qu'elle se souvient (§2.5).
- **Preuve** : spec : « Statut : livré … décisions prises par le coordinateur, veto pédagogique à exercer … si besoin » ; backlog ✅ inchangé « au prorata » ; fiche `case-gib` `status: 'À faire'` après la session.
- **Correctif** : faire trancher (pédagogue ou Mehdi) puis aligner backlog ↔ spec ; quelle que soit la règle, mémoriser sur le cas « Anamnese jouée le 17/09 · 26 % » (`lastTeilByPart`) et l'afficher sur la fiche et la carte — c'est la personnalisation attendue.

### [MAJEUR] À 1024 px et en dessous, les icônes recouvrent le libellé « Commencer »
- **Où** : `SimulationHub.tsx:40-49` (`absolute inset-y-0 right-0` sur un bouton `w-full justify-center`)
- **Constat** : vérifié à une seule largeur ; dès que la carte fait 232 px (3 colonnes à 1024 px), 96 px d'icônes chevauchent le texte centré de 40 px.
- **Preuve** : DOM survolé — 1280 px : bouton 283 px, texte finit à 474, icônes commencent à 476 (**−2 px**, elles touchent) ; 1024 px : bouton 198 px, texte 431 / icônes 391 → **40 px de recouvrement** ; 768 px : 43 px ; 640 px : 23 px. Capture `scratchpad/hub-1024-hover.png` : on lit « Com » + trois tuiles.
- **Correctif** : au survol, décaler le libellé (`group-hover/start:pr-[100px]` ou `justify-start pl-4`) ou faire glisser le bouton principal en largeur (`flex-1` + conteneur d'icônes en flux, largeur 0 → 96 px animée) ; vérifier à 1024/768 en CI (playwright) — c'est ce que Mehdi verra sur un laptop.

### [MAJEUR] La pré-simulation ne raisonne pas sur le Teil choisi
- **Où** : `PreSimulationPage.tsx` (`teil` n'est lu que pour la pastille et le bouton)
- **Constat** : en « Anamnese seule », la page continue de faire préparer le Muster-Bogen (Doku) et les phrases de Fallvorstellung — gabarit inchangé, mur de sections hors sujet (§2.1, §2.4).
- **Preuve** : DOM `pre?teil=anamnese` → sections « Répartition des rôles », « Muster-Bogen (feuille de notes) », « Notions clés », « Questions d'anamnèse à ne pas oublier », « Phrases de Fallvorstellung », « Fachbegriffe du thème (0) » ; `grep -n teil PreSimulationPage.tsx` → 7 occurrences, toutes dans la barre d'action.
- **Correctif** : masquer Muster-Bogen et Phrases de Fallvorstellung en `anamnese` ; masquer les questions d'anamnèse en `dokumentation`/`fallvorstellung` ; garder rôles et assistance.

### [MAJEUR] Le bilan parle de « parties » et de « Bestanden-Simulation » pour une seule partie
- **Où** : `SimulationRunner.tsx:547-549` (`ResultScreen`)
- **Constat** : texte de la simulation complète servi tel quel.
- **Preuve** : DOM après Anamnese seule : « Encore un effort · … score moyen 26 % · Au moins une partie sous les 60 % — retravaille-la. » ; code pour le cas réussi : « Bestanden-Simulation ! » / « Toutes les parties tentées ≥ 60% (règle FSP) » — un Teil ne « besteht » rien.
- **Correctif** : en `teil` : titre « Anamnese seule · 26 % », phrase « ≥ 60 % sur cette partie — objectif du jury » / « sous les 60 % — rejoue-la », pas de « score moyen ».

### [MINEUR] `scopeLabel` n'est utilisé nulle part ; l'historique n'affiche pas la portée
- **Où** : `lib/simScope.ts:24`, `SimulationHub.tsx:74`
- **Preuve** : `grep -rn scopeLabel app/src` → seulement `simScope.ts` et son test ; historique DOM : « 26 % Obere GI-Blutung… 17/09/2026 · anamnese Rejouer » (clé brute, pas « Anamnese seule »).
- **Correctif** : `scopeLabel(sim)` dans l'historique et « Rejouer » qui reprend `?teil=`.

### [MINEUR] Pastille : « seule » ×3 et « Complète · 3 Teile » (mélange FR/DE)
- **Où** : `PreSimulationPage.tsx:42-47`
- **Preuve** : radios « Complète · 3 Teile », « Anamnese seule », « Dokumentation seule », « Fallvorstellung seule » (capture `scratchpad/pre-anamnese.png`).
- **Correctif** : « Complète » · « Anamnese » · « Dokumentation » · « Fallvorstellung » (le groupe s'appelle « Mode ») ; garder « seule » sur le bouton d'entrée uniquement.

### [MINEUR] Glyphes non parlants (goutte, horloge, stéthoscope) — cohérents avec le Runner, mais muets sans survol
- **Où** : `lib/simScope.ts:9-13` (`pain`, `history`, `stethoscope`), `SimulationRunner.tsx:30-32` (mêmes icônes)
- **Constat** : pas un choix à l'aveugle (même set que le fil du Runner et la page Guides), mais une horloge pour « Dokumentation » ne se devine pas ; `title` seul.
- **Correctif** : un tooltip visible au survol d'une icône (libellé qui glisse sous l'icône) ou remplacer `history` par `nav-clipboard`.

---

## Check-list §4

| # | Point | Statut | Preuve |
|---|---|---|---|
| 1 | Raisonnement sur le cas | **Non** pour P (pré-sim et bilan identiques quel que soit le Teil ; `case-gib` joué en Anamnese seule ; `case-angina-pectoris` sur le hub) ; n/a pour M4 (prompt générique par nature, mais le jeu couvre 20 usages) | sections DOM pré-sim ; ResultScreen |
| 2 | Doublons / synonymes | « seule » ×3 dans la pastille ; TEILE (simScope) duplique FLOW (Runner) et la liste de GuidesPage — trois sources pour les mêmes 3 parties | grep `icon: 'pain'` ×3 fichiers |
| 3 | Anti-slop | Repos discret (opacity 0, pointer-events none) ; survol cohérent ; **mais** chevauchement ≤ 1024 px | mesures DOM 5 largeurs |
| 4 | Concision | M4 : concision non mesurée (lignes) ; P : bilan et pré-sim gonflés de sections hors Teil | sondes `grade()` ; DOM |
| 5 | Personnalisation | Un Teil ne laisse aucune trace sur le cas (« À faire ») ; le mode choisi n'est pas mémorisé entre deux cas | IndexedDB `cases/case-gib` |
| 6 | Déployé | Oui — runs verts sur `59ef0b3` et `1a2ebdb`, bundle `index-DaAOeFto.js` contient les deux features | `gh run list`, `curl` |
| 7 | Validateur | M4 : la CI ne joue que `--dry` (aucune porte sur la qualité réelle) ; P : `simScope.test.ts` seul, rien sur la barre de reprise ni sur `weakCases` | `quality.yml:57`, tests |

## Mehdi dirait

« Tu m'as mis ✅ sur Doctopus alors que ton propre commit dit que les 20 réponses étaient vides, et sur le Teil je quitte, je reprends, et je me retrouve avec les 3 parties — tu as vérifié un seul chemin, applique-toi. »

## Non vérifié

- **Qualité réelle des réponses Doctopus** (ancien vs nouveau prompt, LFM 2.5 / repli) : pas de clé API — je juge le prompt et la grille, pas les réponses.
- **Comportement des `models[]` de repli** d'OpenRouter avec `reasoningEffort` : non observé.
- **Sync Supabase** d'une sim `scope:'teil'` (`progress_events`, projections `lib/sync/projections.ts`) : non testée (Supabase local non lancé dans cette revue).
- **Mobile/tactile** : le survol n'existe pas ; l'entrée 2 (pastille) couvre le cas, mais non mesuré sur viewport mobile.
- **« 12 cas jamais simulés »** sur l'Accueil alors que 3 sims complètes existent (angina 64 %) : probablement antérieur au lot (readiness lit `status`, pas les sims) — cité comme contexte, pas comme constat de ce lot.
- **`prefers-reduced-motion`** : classe `motion-reduce:transition-none` présente, effet non observé (media query non émulée).
- Captures : `scratchpad/hub-1280-rest.png`, `hub-1280-hover.png`, `hub-1024-hover.png`, `pre-anamnese.png`, `runner-teil.png`, `result-teil.png` (session-locales, non committées).
