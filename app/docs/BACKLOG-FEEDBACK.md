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
| **FB-E1** | P1 | Aucun champ pour noter les réponses du patient en focus. | Des champs de notes **intégrés au focus**, disposition sleek fidèle à l'identité (verre, mono readout), synchronisés avec le Bogen de la vue normale (même store), sans casser l'immersion (apparition à la demande / raccourci). |

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
| **FB-H1** | P1 | L'avancement et le choix des couches sont manuels. | La couche recommandée est **calculée** depuis l'historique et les stats (scores pondérés, régularité, maîtrise par cas) ; l'utilisateur peut surcharger ; la règle est expliquée (« pourquoi cette couche »). |

## I · Vision : équipe d'agents et mise en production

| id | P | Constat | Critère d'acceptation |
|---|---|---|---|
| **FB-I1** | — | Mehdi n'a pas l'œil pour tout repérer ; il veut une **équipe virtuelle d'agents** aux rôles et skills distincts, dans un **organigramme adapté à une app médicale**, qui communiquent pour améliorer l'app en continu. | Un document d'organisation (rôles, responsabilités, canaux, rituels) + des définitions d'agents exécutables. Voir `docs/AGENTIC-TEAM.md` (à créer). |
| **FB-I2** | — | Missions de l'équipe : tester, détecter anomalies et bugs, signaler la rédaction excessive ou le contenu inadapté, optimiser le front. | Chaque mission a un agent responsable et un livrable vérifiable. |
| **FB-I3** | — | Préparer la **production** : publication, financement, déploiement en ligne après la fin du développement. | Feuille de route production distincte du développement produit. |

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
