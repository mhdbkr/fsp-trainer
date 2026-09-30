# Série 3 — analyse des failles, architecture de la réponse, carte des chantiers

> Retours d'usage réel de la direction, 30 septembre 2026. Ce document fait
> trois choses : il **classe** les failles, il **les enrichit** de ce que le
> constat ne dit pas encore, et il **propose l'ingénierie** qui les ferme
> définitivement plutôt qu'une par une. Registre fidèle des constats :
> `app/docs/BACKLOG-FEEDBACK.md` (codes FB3-*).

## 0. Le diagnostic d'ensemble

Les vingt constats ne sont pas vingt bugs. Ce sont **quatre dettes
d'architecture** qui affleurent à des endroits différents :

| Dette | Symptômes qu'elle produit |
|---|---|
| **D1 — Le contenu n'a pas de modèle de question** : une réplique est une chaîne de caractères. | Questions composées, doublons de sondes, questions qui présupposent ce qu'on n'a pas encore demandé, alternatives collées (« Hand oder Fuß »), prompts IA illisibles. |
| **D2 — Rien ne journalise ce que le candidat fait** : l'état est dérivé à la volée, à chaque rendu. | Le plan du jour se recalcule et remplace la tâche cochée ; la session du jour diverge du plan ; un exercice libre n'existe nulle part ; pas d'historique ; les stats ne savent pas qu'un Teil isolé était délibéré. |
| **D3 — Les parcours n'ont pas d'automate** : la navigation est faite de poussées de route et de conditions locales. | « Valider la partie » renvoie en arrière ; la checklist de fin ignore ce qui a été coché pendant ; la pré-simulation change de forme selon le Teil ; aucune transition. |
| **D4 — L'identité n'a pas de primitives** : chaque écran ré-invente sa surface. | Boutons blancs, pastilles qui se retournent, étiquettes en texte brut collées au titre, drill qui montre le mot suivant trop tôt, zéro matière (verre, profondeur). |

**Conséquence de méthode** : traiter les vingt constats un par un produirait
vingt rustines et une vingt-et-unième série de retours. On ferme les quatre
dettes, et les constats tombent par grappes.

---

## 1. Catégorie A — Le contenu : de la chaîne de caractères à la question

**Constats couverts** : FB3-A1 (questions composées), FB3-A2 (doublon
Kopfschmerzen), FB3-A3 (capteur de glycémie avant les antécédents), FB3-A4
(alternatives collées : « Hand oder der Fuß », « das Bein oder der Arm »),
FB3-A5 (« strahlen die Schmerzen » et « was hilft oder verschlimmert » posés
deux fois en orthopédie).

### 1.1 Ce que le constat dit
Poser trois questions dans une phrase n'est pas naturel à l'oral, et
impossible à mémoriser. Le candidat récite un bloc au lieu de conduire un
entretien.

### 1.2 Ce que le constat ne dit pas encore
1. **Le même défaut existe côté patient.** Si la question empile trois items,
   la fiche de rôle empile trois réponses. Découper les questions sans
   découper les réponses casse le contrat sonde ↔ réponse et fera échouer
   `checkProbeCoverage`.
2. **Il existe aussi dans l'Aufklärung** — expliquer une intervention d'une
   seule traite est exactement la faute que l'examen sanctionne.
3. **Et dans les questions de l'Oberarzt** (`caseSpecificQuestions`).
4. **Une question composée est souvent un arbre déguisé** : « Trugen Sie einen
   Helm? Sind Sie ohnmächtig geworden? » n'est pas une question, c'est une
   question d'ouverture suivie de deux relances conditionnelles. Le texte a
   aplati un arbre ; il faut le rendre au lecteur sous sa forme d'arbre.
5. **« Hand oder der Fuß » n'est pas une question composée, c'est un gabarit
   non résolu** : le cas sait si c'est la main ou le pied. C'est la faute
   §2.1 de `DIRECTION-STYLE.md` — un modèle copié sans lecture du cas. Elle
   se détecte mécaniquement et doit être **interdite par la CI**.

### 1.3 L'ingénierie proposée
**Introduire la question atomique comme type de première classe.**

```ts
type Frage = {
  id: FrageId
  text: string            // UNE question, un seul « ? »
  kapitel: KapitelId      // où elle vit dans la trame
  braucht?: FrageId[]     // ce qui doit déjà avoir été demandé
  nachfragen?: Frage[]    // relances conditionnelles (l'arbre rendu visible)
  variante?: VariantKey   // résolu par le cas : Hand | Fuß, Bein | Arm…
  deckt: ProbeId[]        // contrat existant préservé
}
```

Trois propriétés en découlent, chacune gardée par un validateur :

| Propriété | Validateur (exit ≠ 0) |
|---|---|
| Une question = un « ? », pas d'énumération de plus de deux items | `checkFrageAtomar.mjs` |
| `braucht` est satisfait par l'ordre de la trame (rien ne présuppose ce qui n'a pas été demandé) | `checkFrageOrdnung.mjs` |
| Aucune `variante` non résolue ne peut atteindre l'écran | `checkVarianteAufgeloest.mjs` |
| Une `ProbeId` n'est couverte qu'une fois par parcours joué | extension de `checkPlayedTrame` |

**L'UX qui va avec — et qui fait de la contrainte un atout.** Le guide
d'anamnèse n'affiche plus un mur de texte : il affiche **une question à la
fois, avec ses relances repliées**. Le candidat touche la question → la
relance apparaît. C'est du *progressive disclosure*, et c'est exactement ce
qui produit la mémorisation par segmentation (chunking) que le mur de texte
empêche. Le raisonnement devient visible : *cette relance-là n'existe que
parce que la réponse précédente était « oui »*.

**Le bénéfice qui n'était pas demandé** : une fois les questions atomiques,
elles deviennent des **cartes de drill** (SRS sur les questions, pas seulement
sur le vocabulaire). « Mémoriser la trame » devient un exercice mesurable —
et un argument de vente.

### 1.4 Ce qui est automatisable, ce qui ne l'est pas
- Découpage mécanique des répliques à plusieurs « ? » : **oui**, scripté, puis
  relecture langue.
- Résolution des variantes par le cas : **oui**, scripté (le cas connaît le
  membre atteint).
- Réécriture des énumérations cliniques en question + relances : **non**,
  jugement médical — lot par lot, relecteurs `fsp-clinical-reviewer` et
  `fsp-language-reviewer`.
- Réordonnancement des dépendances : **semi** — le validateur les liste, un
  humain tranche l'ordre.

---

## 2. Catégorie B — Le pont vers l'IA externe

**Constats couverts** : FB3-B1 (UI pauvre : pas de logo, pas d'icône copier,
choix non mémorisé, zéro motion), FB3-B2 (« Ouvrir » ne fait que rediriger,
on veut l'appli ouverte avec le prompt déjà en place), FB3-B3 (supprimer le
choix de forme et de langue — l'allemand est le défaut ; lancer depuis
l'intérieur de la simulation, au Teil concerné ; fusionner « répartition des
rôles » et « autre façon de simuler »), FB3-B4 (les IA bloquent ou hallucinent
— prompts trop longs, mal structurés), FB3-B5 (animation explicative).

### 2.1 Ce que le constat ne dit pas encore
1. **Le pré-remplissage n'est pas garanti par les cibles.** Certains services
   acceptent un paramètre de requête, d'autres non, et aucun schéma d'app
   natif n'est stable. Promettre « ça ouvre l'appli avec le prompt » sans
   vérifier à la source, c'est reproduire la faute que la direction
   sanctionne. → `source-driven-development` obligatoire, et **échelle de
   repli honnête** : pré-remplissage si le service le documente → sinon
   copie dans le presse-papiers + ouverture, avec une confirmation visible
   (« prompt copié, colle-le dans le chat »). On n'affiche jamais une promesse
   que la cible ne tient pas.
2. **Le prompt fuit la réponse.** Un prompt qui contient le diagnostic donne à
   l'IA de quoi trahir le cas dès la deuxième réplique. C'est probablement une
   cause d'« hallucination » ressentie : l'IA ne délire pas, elle récite ce
   qu'on lui a donné.
3. **Demander « évalue-moi » à froid ne marche pas** sur un chat généraliste.
   Puisque la forme « examen complet + évaluation » disparaît, le prompt doit
   ne demander **qu'une seule chose** : jouer le patient.
4. **Le chemin de retour n'existe pas.** Le candidat fait sa simulation dans
   l'IA externe et revient : rien ne l'enregistre. Il doit pouvoir dire « je
   l'ai fait » (→ journal, catégorie C/D), et idéalement coller la
   transcription pour cocher la checklist automatiquement.

### 2.2 L'ingénierie proposée
**Un prompt court, à deux temps, en allemand, sans fuite.**

- *Temps 1 — l'amorce* (cible : sous 900 caractères) : rôle, cadre, consigne
  d'ouverture, et **une seule instruction de sortie** : « réponds uniquement
  par ta première réplique de patient ». Rien d'autre. C'est ce qui empêche
  le modèle de résumer, commenter ou s'auto-évaluer.
- *Temps 2 — la fiche* : le script de rôle compact, envoyé **seulement si le
  service accepte un second message** ; sinon replié dans l'amorce sous un
  entête clair. Le diagnostic n'y figure jamais ; les réponses y figurent
  comme faits, pas comme scénario.

**Un lanceur ancré dans le Teil.** Plus d'écran de configuration amont : un
seul cadre en pré-simulation, « **Avec qui tu joues** », qui regroupe la
répartition des rôles et les autres façons de simuler ; le choisir ne
configure pas, il **entre dans la simulation** au Teil voulu, où un lanceur
IA est disponible pendant l'Anamnese et la Fallvorstellung.

**Le détail qui change l'expérience** (ce que la direction appelle le
premium) : logo de chaque cible, nom qui se révèle au survol, choix mémorisé
et rappelé (« comme la dernière fois »), bouton copier avec icône et état de
succès animé, et une **courte animation explicative** dans le cadre fusionné :
trois temps — *on prépare le patient → l'IA l'incarne → tu mènes l'entretien*.

---

## 3. Catégorie C — Le parcours de simulation : entrée, sortie, transitions

**Constats couverts** : FB3-C1 (« valider la partie » renvoie en arrière,
friction en fin de partie), FB3-C2 (checklist de fin qui ignore les cases
cochées pendant + pas de « tout sélectionner »), FB3-C3 (boutons « Entrer —
Dokumentation/Anamnese », pastilles qui se retournent, fonds blancs : AI
slop), FB3-C4 (pré-simulation unifiée quel que soit le Teil), FB3-C5
(transitions de page absentes).

### 3.1 Ce que le constat ne dit pas encore
1. **Le retour en arrière est le symptôme d'un état non modélisé.** Si la fin
   de partie est une suite de conditions locales et de poussées de route, il
   existe forcément un chemin où la condition d'affichage redevient fausse et
   l'utilisateur retombe à l'écran précédent. On ne le corrige pas au clic :
   on **modélise l'automate**.
2. **La sauvegarde doit être idempotente.** Sans identifiant de partie, un
   double clic sur « valider » écrit deux fois — ou pire, la seconde écriture
   écrase la première avec un état partiel.
3. **Rien ne gère l'interruption.** Un rafraîchissement, un appel entrant, une
   veille : la partie est perdue. Pour un examen à 60 minutes, c'est
   inacceptable ; il faut une reprise.
4. **La checklist perdue est un problème de source de vérité**, pas
   d'affichage : deux composants tiennent chacun leur liste. Un seul état,
   porté par la partie.

### 3.2 L'ingénierie proposée
**Un automate explicite pour la partie**, source unique :

```
préparation → en cours (Teil n) → bilan → checklist → [Arztbrief] → enregistré
```

Règles opposables :
- Une transition ne va **jamais** vers un état antérieur ; « revenir » est une
  action nommée, pas un effet de bord.
- L'état est porté par un objet `Lauf` unique (identifiant stable) ; la
  checklist, les Teile couverts, le minutage et le score en sont des champs,
  pas des états parallèles.
- L'écriture finale est **idempotente sur l'identifiant de partie**.
- `en cours` est persisté à chaque étape → **reprise après interruption**.
- Sortir de `enregistré` émet l'événement d'entraînement (catégorie D).

**Une pré-simulation unique.** Une seule page, une seule anatomie : le cas, le
mode (les trois Teile ou l'un d'eux), le cadre « avec qui tu joues », le
départ. Le Teil choisi change le *contenu* des blocs, jamais leur présence ni
leur ordre.

**Les surfaces.** Les pastilles qui se retournent et les fonds blancs
disparaissent au profit des primitives de la catégorie E. Le bouton d'entrée
dans un Teil devient une surface de matière, pas un bouton générique.

**Les transitions.** Un seul système de transition de page, respectant
`prefers-reduced-motion`, appliqué par le shell — pas au cas par cas.

---

## 4. Catégorie D — Le programme : le pilier

**Constats couverts** : FB3-D1 (cocher une tâche en fait apparaître une autre
— on avance dans le vide), FB3-D2 (enchaînements de la même spécialité alors
que la priorité est la fréquence), FB3-D3 (« Leberzirrhose bei
Alkoholabhängigkeit » en session du jour sans être au plan du jour), FB3-D4
(un cas travaillé volontairement sur un seul Teil est compté comme inachevé et
remonte en point faible), FB3-D5 (un exercice libre n'est ni historisé, ni
compté au jour, ni dans les stats), FB3-D6 (pas de page historique), FB3-D7
(étiquettes de type en texte brut collé au titre), FB3-D8 (critique du module :
heatmap et jauges « Où le plan met l'accent »).

C'est le chantier le plus lourd et le plus vendeur. La direction le dit :
*« je ne dois tolérer aucune faiblesse »*.

### 4.1 La critique de fond
Le module actuel **calcule ce qu'il devrait se rappeler**. Un plan qui se
recalcule à chaque ouverture n'est pas un plan, c'est une suggestion
permanente. D'où les trois symptômes les plus graves : la tâche remplacée, la
session du jour qui diverge, l'exercice libre qui n'existe pas. Tant que
l'état vit dans une fonction pure appelée au rendu, aucune correction locale
ne tiendra.

Deuxième faiblesse : **le progrès est modélisé comme un pourcentage de cas**.
Un candidat qui décide de faire les trois anamnèses avant les trois
documentations est, dans ce modèle, quelqu'un qui n'a rien fini. Le modèle
punit une stratégie légitime — et la direction l'a vécu comme une accusation.

Troisième faiblesse : **le programme ne s'explique pas**. Une jauge
« Où le plan met l'accent » empilée sur une heatmap donne une impression de
tableau de bord sans jamais répondre à la seule question qui compte : *pourquoi
ça, aujourd'hui ?*

### 4.2 L'ingénierie proposée

**(a) Un journal d'entraînement, append-only.** Tout ce que le candidat fait
écrit exactement un événement :

```ts
type TrainingEvent = {
  id: string; at: ISODate
  kind: 'simulation' | 'drill' | 'fiche' | 'aufklaerung' | 'examen-blanc'
  caseId?: CaseId
  teile: Teil[]              // ce qui a réellement été joué
  quelle: 'plan' | 'libre'   // d'où venait l'exercice
  dauerS: number
  ergebnis?: Score
}
```

Stats, historique, programme, indice de préparation **dérivent tous** de ce
journal. Un exercice libre est un événement comme un autre : il apparaît donc
dans l'historique, il compte dans les statistiques, et il peut **satisfaire une
tâche du plan** (si le candidat fait spontanément ce qui était prévu, la tâche
se coche toute seule — la machine doit s'adapter à l'humain, pas l'inverse).
Cela ferme FB3-D5 et FB3-D6, et c'est le socle des points 8 et 9.

**(b) Un plan du jour figé.** À la première ouverture de la journée, le plan
est **matérialisé** et stocké. Cocher une tâche la marque faite ; **rien ne
prend sa place**. Le plan ne change qu'à une action nommée
(« replanifier »), jamais en silence. Cela ferme FB3-D1.

**(c) La session du jour = la première tâche non faite du plan figé.** Une
seule source. Un cas ne peut plus s'inviter. Cela ferme FB3-D3.

**(d) Une sélection pondérée, avec la diversité en contrainte dure.**
Score d'un candidat-cas = fréquence dans le corpus × urgence (oubli, échéance)
× dette de Teil × fraîcheur, **sous contrainte** : jamais deux spécialités
identiques consécutives, et pas plus de deux par fenêtre glissante sauf si la
fréquence l'impose. La contrainte est un invariant testé, pas une pondération
qu'on espère suffisante. Cela ferme FB3-D2.

**(e) Le progrès par Teil, et la fin du « point faible par absence ».**
Un cas n'a plus un pourcentage ; il a trois états de Teil. Un point faible se
décide **sur la performance**, jamais sur l'absence. Ce qui n'a pas été tenté
est « pas encore travaillé » — une information neutre, affichée comme telle.
Cela ferme FB3-D4.

**(f) Le mode d'avancement, rendu explicite.** Plutôt que de deviner la
stratégie du candidat, on la lui demande une fois et on l'adapte ensuite :
*par Teil* (j'installe un geste à la fois), *par cas complet*, *par
spécialité*, *examen blanc*. Le plan, le vocabulaire et les statistiques
suivent ce choix. C'est la réponse directe à *« je veux que le programme et
les stats soient intelligents »* : l'intelligence, ici, c'est de ne pas
supposer.

**(g) Chaque proposition s'explique en une ligne.** « Aujourd'hui :
Cholezystitis — fréquent à Stuttgart, jamais joué, et ta documentation est en
retard de quatre jours. » La confiance ne vient pas de la précision de
l'algorithme, elle vient de sa lisibilité.

**(h) Le rattrapage est une décision, pas une accumulation.** Les jours
manqués ne s'empilent pas en silence : le programme propose un rattrapage et
attend un accord.

### 4.3 Les visualisations : ce qui part, ce qui reste
| Existant | Verdict | Remplacement |
|---|---|---|
| Heatmap de régularité | **Part.** Elle mesure l'assiduité, pas la préparation — et culpabilise. | Une **frise de trajectoire** : l'indice de préparation dans le temps, avec la date d'examen comme horizon et la projection « à ce rythme ». C'est le visuel qui vend. |
| Jauges « Où le plan met l'accent » empilées | **Part.** Dense, illisible, sans action. | Un **champ de couverture** : le corpus en spécialités × Teile, qui se remplit ; on y lit d'un coup ce qui est vierge, entamé, solide. Interactif : toucher une cellule propose l'exercice correspondant. |
| Aperçu accueil | **Reste, resserré.** | La tâche du jour, l'explication en une ligne, l'état d'avancement du plan figé. Rien d'autre. |
| — | **Nouveau.** | **Historique** : page accessible depuis la barre latérale, frise inversée des événements, filtres (Teil, spécialité, source), et le total honnête de ce qui a été fait. |

### 4.4 Les étiquettes (FB3-D7)
« — Anamnese seule », « — Dokumentation seule », « 12/20 » collés au titre :
le titre doit rester une phrase. Le type de tâche devient une **étiquette de
partie** qui exploite la largeur : marque du Teil, spécialité, et la mesure
(durée, mots) en lecture secondaire. Anatomie définie une fois dans les
primitives de la catégorie E, consommée partout.

---

## 5. Catégorie E — L'identité et le mouvement

**Constats couverts** : FB3-C3 (fonds blancs, pastilles), FB3-D7
(étiquettes), FB3-E1 (drill : le mot suivant est visible trop tôt), FB3-C5
(transitions), FB3-B1 (motion de la feuille IA).

### 5.1 Le principe
La direction demande « du verre, du 3D, du liquid glass » — mais
`DIRECTION-STYLE.md` §2.3 demande **discret au repos, élégant à l'usage**. Les
deux ne se contredisent pas si la matière est **une signature, pas une
texture** : le verre marque les moments (entrée dans un Teil, feuille IA,
bilan de fin), jamais le fond de chaque carte. Un site rapide avec un moment
de magie convertit mieux qu'un site lourd — la même règle vaut pour l'app.

### 5.2 Ce qui est produit
Un **jeu de primitives** livré avant les autres chantiers, parce que tout le
monde le consomme :
- surfaces (verre, élévation, profondeur) en tokens, alignées sur
  `docs/contracts/tokens.md` ;
- l'anatomie d'étiquette de partie ;
- les transitions de page du shell, interruptibles, `prefers-reduced-motion`
  respecté ;
- une primitive de transition de liste/carte qui corrige au passage le drill
  (le mot suivant ne peut pas être visible avant la fin de la sortie du
  précédent : c'est un état de sortie manquant, pas un réglage de durée).

---

## 6. Catégorie F — L'agent qui teste à la place de la direction

**Constat couvert** : FB3-F1 — *« il faudrait construire un agent qui teste
l'app à ma place et qui simule une préparation réelle »*.

### 6.1 Pourquoi un agent seul ne suffit pas
Un agent qui joue l'app trouve des ruptures de symbiose — il en a déjà trouvé.
Mais il ne les trouve pas **deux fois de suite de la même façon**, et il coûte
cher. Les trois bugs les plus graves de cette série (tâche remplacée, session
divergente, retour en arrière) sont **déterministes** : ils se prouvent par
un test, pas par un jugement. La couche mécanique tranche avant l'agent
(ADR-0001).

### 6.2 L'ingénierie proposée — trois couches

**(a) Une horloge injectable.** Prérequis architectural : tant que le code lit
l'heure directement, aucun test ne peut jouer « le jour 2 ». On centralise
l'accès au temps ; le test contrôle la date. C'est la condition de tout le
reste.

**(b) Des invariants, testés en propriété.** Des règles qui doivent tenir quoi
que fasse le candidat :
- cocher une tâche ne fait jamais grandir le nombre de tâches ouvertes du jour ;
- la session du jour appartient toujours au plan du jour ;
- aucun cas travaillé n'est jamais qualifié de point faible par absence ;
- deux spécialités identiques ne se suivent jamais dans un plan ;
- un exercice libre apparaît toujours dans l'historique et les stats ;
- la fin de partie ne revient jamais à un état antérieur ;
- une partie validée deux fois produit un seul enregistrement.

**(c) Le candidat synthétique.** Un harnais qui joue **une préparation
complète en accéléré** — quatorze jours, une persona, une stratégie (par Teil,
puis cas complets), des jours manqués, un exercice libre, une interruption en
pleine partie — et qui vérifie à chaque jour les invariants ci-dessus, puis
rend un rapport lisible par la direction. Par-dessus, l'agent de jugement
(`ux-user-advocate`) lit le même parcours et rapporte ce qu'aucune assertion
ne peut dire : *ça donne envie ? ça s'explique ? ça respecte l'intention ?*

C'est cette combinaison — horloge contrôlable, invariants, candidat
synthétique, agent de jugement — qui permet de dire « fiable » sans mentir.

---

## 7. La carte des chantiers

Périmètres d'écriture disjoints, pour travailler en parallèle. Un seul writer
par worktree (`CLAUDE.md`).

| # | Chantier | Périmètre d'écriture | Dépend de |
|---|---|---|---|
| **P0** | **Contrats** — modèle `Frage`, journal d'entraînement + plan figé, pont IA, primitives de surface/motion | `docs/contracts/*`, `docs/adr/*`, `CONTEXT.md` | — |
| **C1** | **Programme & historique** (le pilier) | `app/src/lib/program*`, `srs*`, `readiness.ts`, `app/src/features/program/*`, `app/src/features/stats/*`, aperçu de `HomePage.tsx`, migrations du journal | P0 |
| **C2** | **Simulation — entrée, sortie, reprise** | `app/src/features/simulation/*`, `app/src/lib/sim*`, `checklists.ts`, `scoring.ts` | P0, E |
| **C3** | **Pont IA externe** | `app/src/lib/externalAi/*`, prompts, composant lanceur autonome | P0 (contrat de montage avec C2) |
| **C4** | **Contenu — questions atomiques** | `app/src/data/**`, `app/src/lib/caseQuestions.ts`, `rolePlay.ts`, `app/scripts/check*.mjs` | P0 |
| **C5** | **Identité & mouvement** (primitives d'abord) | tokens, `app/src/components/*`, shell, `DrillPage.tsx` | P0 |
| **C6** | **Harnais de fiabilité** — horloge, invariants, candidat synthétique | `app/src/lib/clock.ts`, `app/tests/**`, `app/scripts/parcours*.mjs`, `.github/workflows` | C1, C2 (les invariants les visent) |

**Ordre réel** : P0 puis C4/C5 en tête (ils fournissent au reste), C1 et C2 en
parallèle immédiatement après les contrats, C3 se greffe sur C2, C6 en dernier
mais spécifié dès P0 — les invariants sont écrits **avant** le code qu'ils
gardent.

**Gates de direction** : un seul par chantier à l'intention (G1), un à la spec
(G2), un à la PR (G6). Tout est inscrit dans `.superpowers/teams/GATES.md`.
