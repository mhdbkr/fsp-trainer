# Backlog — retours d'usage réel (simulation complète, août 2026)

> Source : Mehdi, après avoir joué lui-même une simulation. Verdict global :
> « l'app reste bonne dans son ensemble », mais le ressenti est **machinal** —
> pas de logique de raisonnement fluide quand on parcourt les détails.
>
> Ce fichier est la **source de vérité** du chantier. Chaque item porte un id
> stable (`FB-…`), une priorité, la zone de code concernée et un critère
> d'acceptation testable. Il est conçu pour être consommé par des agents
> autant que par un humain.

Priorités : **P0** = casse l'expérience de simulation · **P1** = friction
nette à chaque usage · **P2** = polish / confort.

---

## A · L'anamnèse ne s'adapte pas au patient  — *le cœur du « machinal »*

Zone : `features/simulation/AnamneseGuide.tsx`, `ImmersiveMode.tsx`,
`data/guides/anamneseChapters.ts`, `data/seedCases.ts` (patientSheet).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-A1** ✅ | P0 | Les questions affichées sont toujours les mêmes questions standards, quel que soit le profil du patient. Un cas avec des particularités (comorbidité, âge, sexe, contexte) devrait modifier ce qu'on demande. | Pour deux cas de profils distincts, le guide affiche un jeu de questions **différent** là où le profil le justifie (ex. patiente → Frauenanamnese intégrée au bon endroit ; diabétique → sondes de complications ; personne âgée → chutes/autonomie). Les particularités du cas remontent dans le guide. |
| **FB-A2** ✅ | P1 | Des questions d'interrogatoire **se répètent** entre chapitres d'anamnèse. | Aucune question (ou paraphrase évidente) n'apparaît dans deux chapitres d'un même guide. Un script de détection de doublons existe et passe. |
| **FB-A3** ✅ | P0 | Il arrive qu'une question soit dans le guide mais **sans réponse dans la fiche rôle-patient**. Le simulant patient est alors muet. | Contrat : toute question affichée dans le guide a une réponse dans `patientSheet` du cas joué. Vérifié mécaniquement (`checkProbeCoverage` étendu aux questions réellement affichées, pas seulement aux sondes). |

## B · Questions conditionnelles et progressives

Zone : `AnamneseGuide.tsx`, `ImmersiveMode.tsx`, `data/guides/phrases.ts`
(`phraseFollowUp`), `PatientScreen.tsx` / fiche simulant.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-B1** ✅ | P1 | Les variantes conditionnelles (« falls ja », « anfallsartig », « sehr stark »…) sont rendues par une **petite flèche discrète** en dessous — ça n'invite pas à interagir. | Remplacées par des **toggles / boutons** : ja/nein, échelle de douleur 0-10, choix contextuels. Cliquer révèle la suite adaptée. |
| **FB-B2** ✅ | P0 | Les **questions progressives** (plusieurs informations dans une seule question) créent un décalage entre les deux simulants : le médecin ne sait pas où s'arrêter en lisant, le patient ne sait pas où s'arrêter en répondant. | Un composant dédié affiche la question **par étapes** (une sous-question révélée à la fois, contrôlée par le médecin), et la **fiche patient est découpée en miroir** pour que chaque étape ait sa réponse. Normal ET focus (focus = version plus immersive). |
| **FB-B3** ✅ | P1 | Conséquence : la **structure des données** des questions progressives doit être revue côté médecin (guide) *et* côté simulant (fiche), en cohérence. | Un type `ProgressiveQuestion { steps: {frage, antwortKey}[] }` (ou équivalent) remplace les questions concaténées ; les fiches patient stockent une réponse par étape. Migration des cas existants. |

## C · Variantes de phrases

Zone : `AnamneseGuide.tsx`, `VorstellungGuide.tsx`, `ImmersiveMode.tsx`,
`phrases.ts` (`phraseAlts`).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-C1** ✅ | P1 | Les variantes sont peu mises en valeur (petit « ⇄ 2 variantes »). | Le bouton variante est un vrai affordance ; cliquer ouvre les variantes avec une **animation**, en sélectionner une la fait **remplacer la phrase standard en douceur** (transition, pas de saut). |
| **FB-C2** ✅ | P2 | Avec plusieurs variantes, pas de sélection agréable. | Liste dynamique avec **surbrillance au survol**, sélection au clic, retour possible à la standard. |
| **FB-C3** ✅ | P1 | Le mode focus doit être **plus immersif** pour ce choix. | En focus : toggles/choix animés plein cadre, navigation clavier (← → pour parcourir les variantes, Entrée pour choisir). |

## D · Pastilles conseils

Zone : `AnamneseGuide.tsx`, `ImmersiveMode.tsx` (showTip).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-D1** ✅ | P2 | Les conseils sont fermés, il faut cliquer. | **Ouverts par défaut en mode assisté**, fermés en mode autonome. L'état respecte `assistance`. |

## E · Prise de notes en mode focus

Zone : `ImmersiveMode.tsx`, `AnamneseBogen.tsx`, store `simSession`.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-E1** ✅ | P1 | Aucun champ pour noter les réponses du patient en focus. | Des champs de notes **intégrés au focus**, disposition sleek fidèle à l'identité (verre, mono readout), synchronisés avec le Bogen de la vue normale (même store), sans casser l'immersion (apparition à la demande / raccourci). |

## F · Aufklärung à la demande

Zone : `SimulationRunner.tsx` (AufklaerungArea), `features/aufklaerung/*`,
routing.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-F1** ✅ | P1 | Depuis un cas, cliquer Aufklärung ouvre une page **quasi vide / mal disposée**. | La page met en valeur les Aufklärung **liées au cas** (probableAufklaerungIds) en premier, puis les autres. |
| **FB-F2** ✅ | P0 | Le bouton d'une Aufklärung envoie **en début de la page** Aufklärung, il faut chercher l'examen à la main. | Le lien mène **exactement** à l'examen visé, section **ouverte**, avec **défilement animé** jusqu'à elle et animation d'ouverture (ancre + état ouvert + `scrollIntoView` smooth). |

## G · Page pré-simulation

Zone : `PreSimulationPage.tsx`, `SimulationSetup.tsx`, `data/caseMuster.ts`,
store `ui` (muster).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-G1** ✅ | P1 | Le Musterbogen se choisit **par ville** ; il devrait se choisir **par modèle**. | Le sélecteur propose les **modèles** ; chaque modèle liste en petit les villes qui l'utilisent. |
| **FB-G2** ✅ | P1 | On ne voit pas la différence entre les modèles avant de choisir. | Chaque modèle a un **aperçu schématique minimaliste, animé** (squelette des sections) qui élucide la différence. |

## H · Couches (layers)

Zone : store `ui` (layer), `lib/scoring.ts`, `features/stats/*`,
`ProgramConfig`.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-H1** ✅ | P1 | L'avancement et le choix des couches sont manuels. | La couche recommandée est **calculée** depuis l'historique et les stats (scores pondérés, régularité, maîtrise par cas) ; l'utilisateur peut surcharger ; la règle est expliquée (« pourquoi cette couche »). |

## I · Vision : équipe d'agents et mise en production

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-I1** ✅ | — | Mehdi n'a pas l'œil pour tout repérer ; il veut une **équipe virtuelle d'agents** aux rôles et skills distincts, dans un **organigramme adapté à une app médicale**, qui communiquent pour améliorer l'app en continu. | Un document d'organisation (rôles, responsabilités, canaux, rituels) + des définitions d'agents exécutables. Livré : `app/docs/AGENTIC-TEAM.md` + 5 agents dans `.claude/agents/`. |
| **FB-I2** ✅ | — | Missions de l'équipe : tester, détecter anomalies et bugs, signaler la rédaction excessive ou le contenu inadapté, optimiser le front. | Chaque mission a un agent responsable et un livrable vérifiable. |
| **FB-I3** ✅ | — | Préparer la **production** : publication, financement, déploiement en ligne après la fin du développement. | Livré : `app/docs/ROADMAP-PRODUCTION.md`. |

---

## Ordre de traitement proposé

1. **FB-F2, FB-F1** — Aufklärung : périmètre net, gain immédiat, zéro migration de données.
2. **FB-D1** — conseils ouverts : trivial, on le prend en passant.
3. **FB-B1, FB-C1, FB-C2** — toggles conditionnels + variantes animées : composants UI purs.
4. **FB-G1, FB-G2** — pré-simulation par modèle + aperçus.
5. **FB-B2, FB-B3, FB-A3** — questions progressives + contrat guide↔fiche : touche la **structure des données** et les 32 cas, donc après les chantiers UI, avec migration scriptée.
6. **FB-A1, FB-A2** — anamnèse adaptative + anti-doublons : le plus profond, s'appuie sur B3.
7. **FB-E1** — notes en focus : après B2 pour réutiliser le composant d'étapes.
8. **FB-H1** — couches automatiques : algorithme + stats, indépendant.
9. **FB-I** — équipe d'agents : ouvert **après** les correctifs, avec ce backlog comme premier carnet de commandes.

---
---

# Série 2 — retours d'usage réel (anamnèse seule, 17 sept. 2026)

> Source : Mehdi, après plusieurs simulations de la **partie anamnèse seule**.
> Verdict global : le point n° 1 qui casse l'expérience et « donne l'impression
> d'une app vibecodée amateur » est une anamnèse **trop standardisée et
> statique** — pas assez adaptée au cas joué. Le reste est du polish de
> design (AI slop à éradiquer) et deux features « game changer » (simulation
> par Teil, notes personnelles).
>
> Étalon de lecture : `app/docs/DIRECTION-STYLE.md` — ce que Mehdi attend, et
> pourquoi ces constats ont été jugés « fautes d'application », pas détails.

Priorités : **P0** = casse l'expérience · **P1** = friction nette · **P2** = polish.
Le préfixe de série est `FB2-`.

## J · L'anamnèse ne raisonne pas sur le cas  — *le cœur du problème, à nouveau*

Zone : `data/guides/anamneseChapters.ts` (`aktuell`, `personalia`,
`familie-sozial`, `frauenanamnese`, `abschluss`), `data/guides/anamneseProbes.ts`,
`data/seedCases.ts` (`patientSheet`, `caseSpecificQuestions`, âge/sexe),
`features/simulation/AnamneseGuide.tsx`, `ImmersiveMode.tsx`,
`lib/` (résolution du guide par cas), `scripts/check*.mjs`.

Principe directeur donné par Mehdi : **garder des modèles standardisés pour
apprendre par cœur, mais DÉCLINÉS selon la nature du cas** — pas un modèle
unique appliqué partout, et surtout pas « le modèle Schmerzen où l'on remplace
Schmerzen par Beschwerden » (ça produit des questions inutiles). Les questions
existent déjà pour l'essentiel : il faut les **agencer**, ajouter ce qui manque
sans allonger à l'infini.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-J1** ✅ | P0 | `aktuell` applique le même modèle OPQRST/douleur à tous les cas : questions de Schmerzen posées à un cas sans douleur, **Skala** (une échelle de douleur par nature) posée pour des Beschwerden non douloureuses. | Le chapitre `aktuell` existe en **variantes par nature du motif** (au minimum : douleur · dyspnée/essoufflement · fièvre/infection · neurologique (vertige, déficit, céphalée = douleur) · digestif (nausée/vomissement/diarrhée/ictère) · saignement · psychique/fatigue · dermato/tuméfaction · trauma/chute) ; chaque cas déclare sa nature (`leitsymptomKategorie` ou dérivé) ; le guide affiche la variante du cas. Aucune Skala hors douleur ; chaque variante a ses propres axes pertinents (dyspnée : effort/repos, orthopnée, œdèmes ; fièvre : frissons, courbe, voyages…). Validateur : chaque cas résout vers une variante existante, et chaque question de la variante a une réponse dans `patientSheet`. |
| **FB2-J2** ✅ | P0 | Le **métier** est demandé 2 fois (`pers-beruf` dans `personalia`, `fam-beruf` dans `familie-sozial`), 3 fois avec une Fachanamnese qui l'inclut (`fach-pneumo-noxen`). | Le métier n'est demandé **qu'une fois** par trame, à l'endroit choisi (Sozialanamnese) ; les autres chapitres n'en gardent que la **sous-question spécifique** (« exposition professionnelle à … ? ») conditionnée à ce que le métier a déjà été demandé. `checkGuideDuplicates` (à créer ou étendre) échoue sur toute paraphrase d'une même sonde dans deux chapitres. Revu sur les 130 cas. |
| **FB2-J3** ✅ | P1 | La question sur les parents propose deux options de **même sens** : « Verstorben » et « Nein » (contrôle `kind: 'ja'` avec label « verstorben » → `[Verstorben, Nein]`). | Contrôle `kind: 'wahl'` avec options **« Leben noch » / « Verstorben »** ; « Verstorben » ouvre « Woran, und wann ? » avec la formule d'empathie. Aucun toggle de l'app ne propose deux libellés synonymes (revue de tous les `kind: 'ja'` dont le label n'est pas une réponse « oui »). |
| **FB2-J4** ✅ | P1 | Les **« Questions d'anamnèse à ne pas oublier »** (`caseSpecificQuestions`, affichées en pré-simulation) ne sont pas dans le guide pendant la simulation. | Chaque question du cas est **insérée dans son sous-chapitre** (chaque `caseSpecificQuestion` porte un `kapitel`), avec un **traitement visuel distinct** (pas une couleur criarde : un marqueur sobre, ex. liseré pétrole + libellé « Für diesen Fall » en petit, animation d'apparition) qui signale « importante pour ce cas ». Migration des 130 cas : attribution du chapitre, script de vérification que 100 % en ont un. |
| **FB2-J5** ✅ | P1 | **Wechseljahre** est posée systématiquement dans toute `frauenanamnese`, y compris à une patiente de 25 ans. | La question n'apparaît que si `patientSheet.alter ≥ 45` (seuil à trancher avec le relecteur clinique ; périménopause ~45–55) ; en dessous, la question est absente — pas grisée. Même principe pour la **grossesse/contraception** : absente au-delà d'un âge plafond (~55). Règle documentée dans le guide (« pourquoi cette question est là »). |
| **FB2-J6** ✅ | P1 | Dans `personalia`, la dernière question « Nur zur Sicherheit wiederhole ich kurz Ihre Daten… » a une boîte **« nächster Teil »** qui ne sert à rien et répète ce qui vient d'être posé. | La boîte est **supprimée** ; la question de récapitulation reste (elle est pédagogiquement utile) mais ne déclenche aucun contrôle. Revue de chaque `control` du guide : un contrôle qui n'ouvre rien ou répète est retiré. |
| **FB2-J7** ✅ | P1 | `abschluss` est trop mince pour entraîner à **conclure** un entretien. | Le chapitre est enrichi avec des **tournures standardisées** déclinées par cas : (1) résumer et annoncer la **Verdachtsdiagnose** en langage patient, (2) annoncer les **examens** prévus (tirés de `medicalView.diagnostik` du cas, formulés patient), (3) esquisser la **thérapie** en une phrase, (4) rassurer et vérifier la compréhension, (5) clore. Chaque bloc a une alt. Validateur : pour chaque cas, les examens cités existent dans sa `medicalView`. Pas de mur de texte : 5 blocs max. |

## K · Fachanamnese vasculaire

Zone : `data/guides/anamneseChapters.ts` (`F(...)` ; il n'existe que `kardio`
pour le cœur), `data/seedCases.ts` (`specialty`/lien Fachanamnese), module
Fachanamnese.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-K1** ✅ | P1 | Les cas vasculaires (`case-tvt`, `case-pavk`, `case-lungenembolie`, `case-bauchaortenaneurysma`, varices…) tombent sur la Fachanamnese **cardio**, inadaptée. | Une Fachanamnese **`gefaess`** (Angiologie/Gefäßchirurgie) distincte : claudication (Gehstrecke, Ruheschmerz), œdème unilatéral, immobilisation/voyage/OP récente, contraception/hormones, thrombose ou embolie antérieures (perso/famille), tabac, ulcères/plaies qui ne guérissent pas, froideur/pâleur d'un membre, facteurs de risque. Associée aux cas concernés ; présente dans le **module Fachanamnese** ; chaque question a une réponse dans les fiches de ces cas (validateur). Relue par `fsp-clinical-reviewer` et `fsp-language-reviewer`. |

## L · Évaluation objective de l'anamnèse  — *idées, pas encore un chantier*

Zone : `features/simulation/PartEvaluation.tsx` (checklist auto-déclarée +
curseur « ressenti »), `lib/scoring.ts`, `AnamneseBogen`, store `simSession`.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-L1** | P0 | L'évaluation repose sur ce que l'utilisateur **déclare** avoir fait — biais d'objectivité énorme, aucune fiabilité. | Voir les pistes ci-dessous ; à spécifier (`product-spec-writer`) avant tout code. L'auto-déclaration ne peut rester qu'en **complément** d'au moins une mesure indépendante. |

Pistes proposées (à trancher en brainstorming) :

1. **Trace d'interaction = preuve.** Le guide *sait* déjà ce que le candidat a
   ouvert : chapitres parcourus, questions révélées, toggles actionnés, temps
   par chapitre, questions « Für diesen Fall » atteintes ou non. Score de
   **couverture** calculé depuis cette trace, pas depuis une case cochée.
   Gratuit, hors-ligne, immédiat. Limite : « révélé » ≠ « posé à voix haute ».
2. **Le simulant note, pas le candidat.** En binôme, la fiche patient affiche
   pour chaque sonde un micro-contrôle « posée / non posée / mal posée » que le
   *simulant* touche en répondant (il le sait, lui). Deux regards → score
   croisé ; l'écart candidat/simulant est lui-même une information.
3. **Bogen comme épreuve.** Le candidat remplit l'Anamnesebogen à l'issue ;
   on le compare **mécaniquement** à la `patientSheet` (champ par champ :
   allergie manquée, médicament oublié, ATCD ignoré). C'est exactement ce que
   le jury lit. Objectif, rejouable, et il entraîne la Doku au passage.
4. **Rappel actif.** Avant d'afficher la fiche, 5 questions à choix sur le
   patient (« Quelle allergie ? », « Depuis quand ? ») : on ne peut répondre
   que si on a réellement posé la question. Score de rétention.
5. **Reconnaissance vocale (plus tard, en ligne).** Transcription de ce qui a
   été *dit* et alignement sur les sondes (déjà dans la vision patient IA) —
   l'objectivité maximale, au prix du réseau et des crédits.
6. **Indice de préparation composite** : couverture (1) × exactitude du Bogen
   (3) × rappel (4), pondéré par le barème officiel ; l'auto-évaluation
   devient une simple « note de ressenti » affichée à côté, jamais dans le
   score. Le pédagogue (`product-pedagogy-designer`) a un veto sur la mécanique.

## M · Doctopus & « expliquer »

Zone : `components/Doctopus.tsx`, `components/SelectionExplainer.tsx`,
`lib/onlineAi.ts`, `lib/dictionary.ts` (`DOCTOPUS_SYSTEM`, `buildBriefPrompt`),
`components/Shell.tsx` (`<main overflow-y-auto>`).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-M1** ✅ | P1 | Impossible de **scroller la page** quand Doctopus est ouvert. | Le popover ne capture pas le scroll de `<main>` ; la page défile normalement derrière ; le popover garde son propre scroll interne. Vérifié en navigateur (playwright, wheel sur la page avec le popover ouvert → `scrollTop` change). |
| **FB2-M2** ✅ | P1 | « Expliquer » ne s'active que sur **un seul mot** ; une phrase sélectionnée ne déclenche rien. | Toute sélection de 1 à ~200 caractères déclenche le bouton ; au-delà d'un mot, le prompt devient « explique cette tournure / cette phrase » (pas une définition de terme) ; réponse bornée (2–3 phrases). |
| **FB2-M3** ✅ | P0 | Le mode **hover** attribue la sélection à un **autre mot** du glossaire qui *ressemble* (correspondance floue), puis répond « (réponse vide) ». | (a) Résolution glossaire **exacte** (forme de base, insensible à la casse) ou rien — jamais de fuzzy qui invente ; si pas d'entrée exacte → IA directement. (b) « (réponse vide) » n'est plus jamais affiché : réponse vide → message honnête « Pas de réponse du modèle, réessayer » + retry automatique une fois. La cause principale (raisonnement mangeant le budget) est corrigée (`pickReasoning`, 17 sept.). |
| **FB2-M4** ✅ | P1 | Les réponses de Doctopus sont **médiocres** — pas plus longues, mais meilleures, au niveau de l'app. | `DOCTOPUS_SYSTEM` réécrit : rôle (tuteur FSP, C1, jury), registre (patient vs Fachbegriff explicité), format (réponse d'abord, exemple de phrase prêt à dire, 1 nuance max), interdits (pas de disclaimer, pas de liste à puces réflexe, pas de paraphrase de la question), langue de réponse = celle de la question. Jeu de 20 questions de référence évalué avant/après (`ai-eval-engineer`). |

## N · Glossaire auto-lié

Zone : `components/AutoLink.tsx` (et tout consommateur : cas, Fachwissen,
simulation, Aufklärung).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-N1** ✅ | P0 | Les termes du glossaire sont soulignés **à l'intérieur d'autres mots** : « sonde » dans « be**sonde**ren ». Partout dans l'app. | Correspondance sur **mots entiers** uniquement (frontières Unicode, umlauts/ß compris), insensible à la casse pour l'initiale seulement ; un terme n'est lié qu'une fois par paragraphe ; test unitaire avec « besonderen / Sonde », « Magen / Magenspiegelung » (composé ≠ mot), « Herz / Herzinfarkt ». Vérifié sur toutes les surfaces qui utilisent `AutoLink`. |

## O · Design — éradiquer l'AI slop

Zone : `components/PhraseControls.tsx` (variantes, `Option "Standard"` l.56,
libellé « Antwort des Patienten » l.126), flèche orange des suggestions,
`tailwind.config` (`font-mono` en libellés capitales), `Shell.tsx`, tous les
`.label`.

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-O1** ✅ | P1 | Les **variantes d'expression** : boutons et case déroulante « génériques, AI slop, imposants, trop visibles », hors du design premium. | Redessiné avec `taste-skill` + `impeccable` : contrôle **discret au repos** (affordance fine, pas un bloc), révélation en place sans saut, hiérarchie : la phrase reste la vedette. Validé par `front-design-keeper` avec capture avant/après. |
| **FB2-O2** ✅ | P2 | L'option **« Standard »** est répétée dans la liste alors que la phrase standard est déjà affichée au-dessus. | Supprimée de la liste ; revenir à la standard = re-cliquer la variante active (ou un « ↺ » discret). |
| **FB2-O3** ✅ | P1 | La variante choisie n'est **pas mémorisée**. | La variante choisie pour une phrase (clé stable = id de phrase) est **enregistrée dans les préférences du profil** et devient l'affichage par défaut dans toutes les simulations suivantes — touche de personnalisation. Remise à zéro possible depuis les réglages. |
| **FB2-O4** ✅ | P2 | « **Antwort des Patienten** » en texte sous les toggles ja/nein. | Remplacé par une **icône premium** (glyphe patient/bulle, trait fin, cohérente avec le set `Icon`), tooltip pour l'accessibilité. |
| **FB2-O5** ✅ | P1 | La **flèche orange** des suggestions de questions : « très AI slop et cheap ». | Remplacée par un marqueur élaboré, homogène avec l'identité (ex. tiret pétrole animé au reveal, ou chevron fin en `signal` avec parcimonie) — décidé par `ux-motion-designer` + `front-design-keeper`, capture avant/après. |
| **FB2-O6** ✅ | P1 | La **police « robotique, générique »** des libellés (« Recherche », « Centre », « Statut », « Tri », « Méthode », « Le parcours », « CONSENTEMENT ÉCLAIRÉ ») — c'est **IBM Plex Mono en capitales espacées**, le « mono readout » que la charte appelait signature. Mehdi la rejette pour l'UI. | **Décision de charte** : le mono n'est plus utilisé pour les libellés d'interface. Les `.label` passent en **Plex Sans** (petites capitales ou graisse medium, tracking modéré) ; le mono reste réservé aux **données** (chiffres, chronos, codes, terminologie affichée comme donnée). `fsp-brand-identity` et `dept-experience` mis à jour ; ADR courte. Aucune surface oubliée (grep `font-mono` + `.label`). |

## P · Simulation par Teil  — *game changer n° 1*

Zone : `features/simulation/SimulationHub.tsx` (bouton « Commencer »),
`PreSimulationPage.tsx`, `SimulationRunner.tsx`, `simulationStep`, store
`simSession`, `lib/scoring.ts`, stats/profil (`features/stats/*`, streak,
programme).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-P1** ✅ | P0 | On ne peut jouer que la **simulation entière** (3 Teile). | On peut lancer **un seul Teil** (Anamnese · Aufklärung/Doku · Fallvorstellung) ou la simulation complète. Entrée 1 : au survol de « Commencer », **3 sous-boutons icône glissent depuis le bord droit du bouton** (animation fluide, interruptible, clavier accessible : focus révèle aussi). Entrée 2 : une **pastille de mode** en page pré-simulation. |
| **FB2-P2** ✅ | P0 | Conséquences à raccorder : avancement, stats, profil. | Une session de Teil seul est **enregistrée comme telle** (`scope: 'teil' | 'full'`, `teil`) ; le score alimente les stats **de ce Teil** et la maîtrise du cas au prorata ; le streak compte une session de Teil ; le programme peut *prescrire* un Teil ; les tableaux de bord distinguent complet/partiel ; aucune régression sur les sessions complètes existantes (migration de schéma Dexie versionnée). Spec par `product-spec-writer`, veto pédagogique sur la pondération. |

## Q · Notes personnelles partout  — *game changer n° 2*

Zone : nouveau module `features/notes/*`, store Dexie, `Shell.tsx`
(point d'entrée global), sync (`progress_events` plus tard).

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB2-Q1** | P0 | Pas de **notes personnelles** : le candidat veut noter depuis **n'importe quelle page** et retrouver ses notes dans l'app. | **À spécifier avec Mehdi** (il veut en discuter en détail — `interview-me` puis `product-spec-writer`). Enregistré ici avec les questions ouvertes : ancrage (note liée à un cas / une fiche / une question / libre ?), point d'entrée (raccourci global, bouton flottant à côté de Doctopus, sélection → « noter » ?), format (texte, surlignage, tags ?), retrouvage (page Notes, recherche, dans le contexte d'origine ?), sync entre appareils (Supabase), export. Effort maximal attendu. |

---

## Suivi (17 sept. 2026)

Livrés et vérifiés en prod : lots 1 (N1, M1, M2, M3), 2 (J2, J3, J6 + porte
`checkGuideDuplicates`), 3 (O1–O6 + porte `checkUiTells`, ADR-0016) et 4
(J5, J4 + porte `checkCaseQuestionChapters`). Rapports du gardien dans
`app/docs/reports/`. Découvert en chemin, à traiter :

- **FB2-J8** (P1) — les questions du cas n'ont pas de **réponse dédiée** dans
  `patientSheet.antworten` (pas de sonde) : le simulant improvise depuis la
  fiche. Critère : chaque question du cas porte une clé de réponse (ou une
  sonde générée `cas-<id>-<n>`) ; `checkGuideCoverage` l'exige.
- **FB2-O7** (P2) — remise à zéro des formulations retenues depuis un
  réglage (`clearPreferredVariants` existe, non branché — pas de page
  Réglages aujourd'hui).
- **FB2-J1 ↔ PAINLESS_TEXT** — l'adaptation « sans douleur » actuelle
  (`anamneseChapters.ts`) est exactement le « Schmerzen → Beschwerden » que
  la direction rejette (point 13) : à remplacer par les variantes par nature
  du motif, pas à retoucher.

Lot 5 (17 sept.) livré : J1/13 (8 natures du motif, 78 cas hors douleur,
279 réponses, `PAINLESS_TEXT` supprimé), J7 (`patientWorte` ×130, Abschluss
en 5 blocs), K1 (Fachanamnese `gefaess`, 6 cas). Corrections du gardien sur
le lot 4 : Frauenanamnese > 55 adaptée (saignement post-ménopausique),
urologie sans Erektion/Prostata chez une femme, passe éditoriale sur les
questions du cas (1 466 → 906 : doublons de trame, lignes multi-infos,
formulations télégraphiques, notes révélant la réponse, signes d'examen).
Spec : `docs/superpowers/specs/2026-09-17-anamnese-vivante-lot5-design.md`.
Après revue du gardien (lot 5) : dix natures au lieu de huit (`ausscheidung`,
`nerven`), règle « un seul endroit par trame » (`FACH_COVERS`), `aktuellSkip`
par cas, règles de Fach par sexe/âge (`FACH_RULES`), porte `checkPlayedTrame`
sur le montage réel. Rapports : `app/docs/reports/direction-keeper-serie2-lot5.md`.

Lots 6–7 (17 sept.) : M4 (prompt Doctopus au niveau d'un examinateur, jeu de
référence 20 questions, `scripts/evalDoctopus.mjs` — run réel avec
`OPENROUTER_API_KEY`), P1/P2 (simulation par Teil, spec
`docs/superpowers/specs/2026-09-17-simulation-par-teil-design.md`).

## Ordre de traitement proposé (série 2)

1. **FB2-M3, FB2-N1, FB2-M1** — correctifs nets, zéro migration : glossaire mots entiers, résolution exacte, scroll. *(M3-cause principale déjà corrigée le 17 sept.)*
2. **FB2-J3, FB2-J6, FB2-J2** — fautes d'application visibles à chaque simulation : toggle parents, boîte inutile, métier ×3. Petits diffs sur `anamneseChapters.ts`, validateur anti-doublons.
3. **FB2-O6, FB2-O2, FB2-O4, FB2-O5, FB2-O1, FB2-O3** — pass design « anti-slop » d'un bloc, avec `front-design-keeper` en gate ; commence par la décision de charte (O6).
4. **FB2-J5, FB2-J4** — règles d'âge et questions du cas dans le guide : touche les 130 cas (migration scriptée).
5. **FB2-J1, FB2-J7, FB2-K1** — variantes d'`aktuell` par nature du motif, `abschluss` enrichi, Fachanamnese vasculaire : le chantier de fond, relu par les 3 relecteurs contenu.
6. **FB2-M2, FB2-M4** — expliquer sur phrase + reprompt Doctopus, avec evals.
7. **FB2-P1, FB2-P2** — simulation par Teil : spec → plan → build.
8. **FB2-L1** — évaluation objective : brainstorming sur les 6 pistes, puis spec.
9. **FB2-Q1** — notes personnelles : interview d'abord.
10. **FB2-J8** — réponses dédiées aux questions du cas (dernier lot, décision de la direction du 17 sept.) : 1 466 réponses patient à authorer ou dériver, contrat étendu, relecture langue + clinique.
