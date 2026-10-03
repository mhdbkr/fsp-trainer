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

| **FB2-J10** ✅ | P0 | Série 3 (17 sept., CAP joué) : la **fièvre demandée trois fois** entre `aktuell`, la Fachanamnese et `vegetativ` — et la même chose ailleurs (Schüttelfrost, voyage, poids, selles, sommeil…). Les questions du guide ne sont pas en cause : c'est la trame du cas qui ne se module pas. | **Un symptôme, une question** par trame jouée : carte explicite sonde → symptômes cherchés (`symptoms.ts`), parcours dans l'ordre de l'entretien ; une question dont tous les symptômes ont déjà été cherchés disparaît, une question partiellement couverte se réduit à ce qui reste (`parts`, rédigé à la main). Les questions du cas déclarent `sucht` (remplace la générale de son chapitre) ou `vertieft` (approfondit, relue). Porte `checkTrameSymptoms` : aucun symptôme cherché deux fois sur 130 cas, toute question du cas citant un symptôme déjà cherché est annotée. |
| **FB2-J11** ✅ | P1 | Plusieurs questions « Für diesen Fall » à la suite = le titre répété ligne après ligne. | Les questions du cas consécutives d'un chapitre sont **regroupées dans un cadre** (pointillé pétrole, un seul titre), comme la Fachanamnese en violet. |
| **FB2-J12** ✅ | P1 | Les dimensions d'`aktuell` (Beginn, Verlauf, Herd, Auslöser, Frühere Episoden…) sont noyées dans le texte de la question. | La dimension en tête de question (« Beginn — … ») est rendue comme une **étiquette de verre** (`.dim-tag`), au-dessus de la question, dans le guide et en focus ; le texte affiché est la question seule. |
| **FB2-J13** ✅ | P2 | « Wie ist Ihr Familienstand? Haben Sie Kinder — wie viele, und sind sie gesund? » pose la relance en même temps que la question. | « Haben Sie Kinder? » puis relance **Ja/Nein** « Wie viele, und sind sie gesund? ». |

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
`checkGuideDuplicates`), 3 (O1–O6 + porte `checkUiTells`, ADR-0016), 4
(J5, J4 + porte `checkCaseQuestionChapters`). Série 3 du 17 sept. (J10–J13 +
porte `checkTrameSymptoms`) : livrée, bundle `index-CXNjGEmM.js` contrôlé en
prod, contenu republié. Rapports du gardien dans
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

Retour direction sur P (17 sept.) : glissement d'icônes rejeté → carte
retournable + verso en verre + boîte de mode dédiée en pré-simulation, icônes
par Teil ; stratégie inversée : maîtrise au prorata des trois parties, courbe
d'apprentissage `teil-first` / `full` dans le programme, plan recalculé à
chaque session (`8e59f58`).

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

---

# Série 3 — retours d'usage réel (préparation suivie, 30 sept. 2026)

> Registre fidèle des constats. L'analyse, l'enrichissement et la carte des
> chantiers : `docs/superpowers/specs/2026-09-30-serie3-analyse-et-chantiers.md`.
> Quatre dettes d'architecture expliquent les vingt constats : le contenu n'a
> pas de modèle de question (A), rien ne journalise ce que le candidat fait
> (D), les parcours n'ont pas d'automate (C), l'identité n'a pas de
> primitives (E).

## A · Les questions composées — *le contenu ne se pose pas à l'oral*

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-A1** | P0 | Modèles et Muster sont truffés de questions qui en empilent plusieurs dans une phrase (« Trugen Sie einen Helm? Sind Sie dabei ohnmächtig geworden? Haben Sie sich noch woanders verletzt? », « Hatten Sie dabei Kopfschmerzen, Übelkeit, Doppelbilder, Bewusstlosigkeit oder ein Zucken? »). Contre-nature à poser, impossible à mémoriser. | La question devient un **type** : une question = un « ? », relances (`nachfragen`) en arbre replié, rendu en *progressive disclosure* au lieu d'un mur de texte. Validateur `checkFrageAtomar`. |
| **FB3-A2** | P0 | Doublon : Kopfschmerzen demandés dans les Begleitbeschwerden puis redemandés en Fachanamnese — malgré le dispositif « un symptôme, une question » (FB2-J10). Régression ou trou de couverture à qualifier. | Étendre `checkTrameSymptoms` aux énumérations internes d'une question composée : chaque item énuméré compte comme un symptôme cherché. |
| **FB3-A3** | P0 | Rupture d'ordre clinique : « was hat Ihr Glukosesensor kurz vor dem Unfall angezeigt? » posé avant d'avoir appris que la patiente est diabétique. | `braucht` : une question déclare ce qui doit déjà avoir été demandé ; validateur `checkFrageOrdnung` sur l'ordre réel de la trame. |
| **FB3-A4** | P0 | Gabarits non résolus : « Hand oder der Fuß », « das Bein oder der Arm » — le cas sait lequel. Faute `DIRECTION-STYLE` §2.1. | `variante` résolue par le cas ; `checkVarianteAufgeloest` interdit qu'une alternative non résolue atteigne l'écran. |
| **FB3-A5** | P1 | En orthopédie, « strahlen die Schmerzen » et « was hilft oder verschlimmert » posés deux fois. | Même dispositif que FB3-A2. |
| **FB3-A6** | P1 | *(enrichissement, corrigé par la mesure)* Le défaut existe côté **réponses patient** (découper les questions sans découper les réponses casserait le contrat sonde ↔ réponse) et dans les **471 questions d'Oberarzt**. En revanche `caseMuster.ts` et `seedAufklaerungen.ts` sont **mesurés propres** (0 occurrence) : ils sont déclaratifs. | Traiter question + réponse dans le même lot ; ne pas toucher aux Muster ni aux Aufklärungen. |
| **FB3-A7** | P0 | *(mesuré)* **Ampleur** : 1 059 répliques à > 1 « ? », 322 énumérations ≥ 3 items, 75 alternatives collées — 1 399 énoncés sur 15 591 (9,0 %), mais **1 293 textes distincts** (ratio 1,08). Aucun gabarit partagé : rien ne se propage. Pire bloc : `AKTUELL_VARIANT_PROBES` 27/35 (77 %). | **Aucun découpage par script n'est possible** (préfixe d'étiquette, subordonnée portée, ellipse de composé, relance conditionnelle). Semi-auto sur les 322 énumérations via `parts` (déjà supporté). Validateur `checkQuestionAtomicity.mjs` à **budget dégressif** : on part du plancher mesuré et il échoue si le total remonte. |
| **FB3-A8** | P0 | *(mesuré)* **270 doublons échappent** au garde-fou sur 104/130 cas, parce que `dedupeBySymptom` ne connaît que **16 symptômes** et `PROBE_SUCHT` que **48 sondes sur 229**. `kopfschmerz` n'existe pas dans le type `Symptom` — le doublon vécu était structurellement invisible. Trois paires portent 411/438 : `aktuell→fach`, `aktuell→vegetativ`, `vegetativ→fach`. | Porter le lexique de 16 à ~36 concepts et compléter `PROBE_SUCHT` : **107 des 270 doublons deviennent visibles sans un seul script nouveau**. Premier geste du chantier. |
| **FB3-A9** | P2 | *(mesuré)* Les ruptures d'ordre sont **rares** : 3 occurrences nettes (dont le Glukosesensor, retrouvé mécaniquement) + 29 candidats à précision ~2/3. Ordre de grandeur ~30, pas ~500. | Job **informatif** en CI, jamais bloquant : le coût du faux positif dépasserait le gain. |

## B · Le pont vers l'IA externe

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-B1** | P1 | UI pauvre : pas de logo des IA cibles, pas d'icône sur « copier », choix d'IA non mémorisé, aucune animation. « Tu n'as pas fourni assez d'effort en motion design et en qualité des éléments visuels. » | Logos, nom révélé au survol, choix mémorisé et rappelé, copier avec icône et état de succès animé. |
| **FB3-B2** | P0 | « Ouvrir » ne fait que rediriger vers un lien ; on veut l'**application ouverte avec le prompt déjà en place**, l'utilisateur n'ayant qu'à lancer la discussion. | Pré-remplissage **vérifié à la source** par cible ; échelle de repli honnête (pré-remplissage → sinon copie + ouverture avec confirmation visible). Aucune promesse que la cible ne tient pas. |
| **FB3-B3** | P0 | Choix superflus : forme du prompt (anamnèse seule / examen complet) et langue — l'allemand est le défaut. Le lancement doit se faire **depuis l'intérieur de la simulation**, aux Teile Anamnese et Fallvorstellung. Le cadre « répartition des rôles » doit **fusionner** avec « autre façon de simuler », et sa sélection doit entrer dans la simulation. | Un seul cadre « avec qui tu joues » en pré-simulation ; un lanceur ancré dans le Teil. |
| **FB3-B4** | P0 | La plupart des IA bloquent ou hallucinent : prompt trop long, mal structuré. | Amorce courte (< 900 car.), allemand, **une seule instruction de sortie** (« réponds uniquement par ta première réplique »), **aucune fuite du diagnostic**, plus de demande d'évaluation. |
| **FB3-B5** | P2 | Aucune explication de la feature. | Courte animation en trois temps dans le cadre fusionné : on prépare le patient → l'IA l'incarne → tu mènes l'entretien. |
| **FB3-B6** | P1 | *(enrichissement)* Rien ne capte le **retour** : la simulation faite dans l'IA externe n'existe nulle part. | Émettre un événement d'entraînement au retour ; coller la transcription pour cocher la checklist. |

## C · Le parcours de simulation — entrée, sortie, transitions

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-C1** | P0 | **Gros bug** : après la fin de la simulation, la démarche n'est ni claire ni fluide ; « valider la partie » **renvoie en arrière**. | Automate explicite `préparation → en cours → bilan → checklist → [Arztbrief] → enregistré` ; aucune transition vers un état antérieur ; écriture **idempotente** sur l'identifiant de partie. |
| **FB3-C2** | P0 | La checklist de fin ne reprend pas les cases cochées **pendant** la simulation ; pas de « tout sélectionner ». | Un seul état de checklist, porté par la partie ; action « tout sélectionner ». |
| **FB3-C3** | P1 | « Entrer — Dokumentation / Anamnese », pastilles qui se retournent, boutons à fond blanc : AI slop, l'identité Doctopus est tuée. | Surfaces de matière (verre, profondeur) issues des primitives ; le verre marque les moments, il n'est pas une texture de fond. |
| **FB3-C4** | P1 | La page pré-simulation change selon le Teil choisi. | Une seule page, une seule anatomie ; le Teil change le contenu, jamais la structure. |
| **FB3-C5** | P1 | Aucune transition entre les pages. | Transitions de page portées par le shell, interruptibles, `prefers-reduced-motion` respecté. |
| **FB3-C6** | P1 | *(enrichissement)* Une partie interrompue (rafraîchissement, veille) est perdue — inacceptable sur 60 minutes. | `en cours` persisté à chaque étape ; reprise proposée. |

## D · Le programme — *le pilier, et la faiblesse la plus grave*

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-D1** | P0 | Marquer une tâche faite en fait apparaître **une autre à sa place** : le système propose toujours quoi faire, on avance dans le vide. | **Plan du jour figé** : matérialisé une fois, stocké ; cocher marque faite, rien ne prend la place ; ne change qu'à une action nommée « replanifier ». |
| **FB3-D2** | P0 | Enchaînements de cas de la **même spécialité**, alors que la priorité devrait être la fréquence. | Score = fréquence × urgence × dette de Teil × fraîcheur, **sous contrainte dure de diversité** (jamais deux spécialités identiques consécutives), testée comme invariant. |
| **FB3-D3** | P0 | « Leberzirrhose bei Alkoholabhängigkeit » reste la session du jour alors qu'il n'est pas au programme du jour. | La session du jour **est** la première tâche non faite du plan figé. Source unique. |
| **FB3-D4** | P0 | Un cas travaillé volontairement sur **un seul Teil** est compté inachevé et remonte en **point faible**. | Progrès **par Teil**, pas en pourcentage de cas ; un point faible se décide sur la **performance**, jamais sur l'absence. Un **mode d'avancement** explicite (par Teil / cas complet / spécialité / examen blanc) adapte plan, vocabulaire et statistiques. |
| **FB3-D5** | P0 | Un exercice ou une tâche fait **hors programme** n'est ni historisé, ni compté au jour, ni dans les statistiques. | **Journal d'entraînement append-only** : tout ce qui est fait écrit un événement ; un exercice libre peut **satisfaire une tâche du plan**. |
| **FB3-D6** | P1 | Pas de page **historique** de ce qui a été fait. | Page dédiée depuis la barre latérale : frise inversée, filtres (Teil, spécialité, source), total honnête. Dérivée du journal. |
| **FB3-D7** | P1 | « — Anamnese seule », « — Dokumentation seule », comptes du drill « 12/20 » collés au titre : cheap, et la lecture de la tâche en devient confuse. | **Étiquette de partie** exploitant la largeur : marque du Teil, spécialité, mesure en lecture secondaire. Anatomie définie une fois dans les primitives. |
| **FB3-D8** | P1 | Critique demandée du module et de son aperçu d'accueil. L'utilité de la **heatmap** est mise en doute, comme le format en **jauges empilées** de « Où le plan met l'accent ». | Heatmap **retirée** (mesure l'assiduité, pas la préparation) → **frise de trajectoire** vers la date d'examen. Jauges empilées **retirées** → **champ de couverture** spécialités × Teile, interactif. Aperçu d'accueil resserré à : la tâche du jour, son explication en une ligne, l'avancement du plan figé. |
| **FB3-D9** | P1 | *(enrichissement)* Le programme ne s'explique jamais. | Chaque proposition porte son « pourquoi aujourd'hui » en une ligne. |
| **FB3-D10** | P2 | *(enrichissement)* Les jours manqués s'accumulent en silence. | Le rattrapage est une décision proposée, pas une dette imposée. |

## E · Identité et mouvement

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-E1** | P1 | Drill Fachbegriffe : pendant l'animation, **le mot suivant est visible trop tôt** ; fluidité à corriger. | État de sortie manquant dans la transition : le suivant ne peut pas entrer avant la fin de la sortie du précédent. Primitive de transition partagée. |
| **FB3-E2** | P1 | *(enrichissement)* Chaque écran ré-invente sa surface, d'où l'hétérogénéité. | Primitives livrées **avant** les autres chantiers : surfaces, étiquette de partie, transitions de page, transitions de liste. |

## F · Fiabilité — l'agent qui teste à la place de la direction

| Code | Prio | Constat | Réponse visée |
|---|---|---|---|
| **FB3-F1** | P0 | « Il faudrait construire un agent qui teste l'app à ma place et qui simule une préparation réelle, pour un produit 100 % fiable. » | Trois couches : **horloge injectable** (prérequis : sans elle, aucun test ne peut jouer « le jour 2 »), **invariants** testés en propriété, **candidat synthétique** qui joue quatorze jours en accéléré (stratégie par Teil, jours manqués, exercice libre, interruption en pleine partie) ; par-dessus, `ux-user-advocate` pour ce qu'aucune assertion ne dit. |
| **FB3-F2** | P0 | *(enrichissement)* Les trois bugs les plus graves de la série sont **déterministes** — ils se prouvent, ils ne se jugent pas. | Invariants opposables : cocher une tâche n'augmente jamais les tâches ouvertes du jour ; la session du jour ∈ plan du jour ; aucun cas travaillé n'est point faible par absence ; jamais deux spécialités identiques consécutives ; un exercice libre apparaît toujours dans l'historique ; la fin de partie ne revient jamais en arrière ; valider deux fois produit un seul enregistrement. |
