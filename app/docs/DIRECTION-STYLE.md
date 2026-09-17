# Direction — ce que Mehdi attend, et comment il le dit

> Guide opposable à tout agent et à toute session. Il est né de l'analyse de
> deux séries de retours d'usage réel (`BACKLOG-FEEDBACK.md`, août et
> septembre 2026) et des corrections données en cours de développement. Il
> décrit **le style de direction** de Mehdi pour que les livrables atteignent
> ses attentes du premier coup — pas après trois allers-retours.
>
> Gardien : `direction-keeper` (`.claude/agents/`), invoqué avant tout
> rapport « fait » sur une feature visible.

## 1. Comment Mehdi juge

Il **joue l'app comme un candidat**, puis remonte ce qui a cassé l'illusion.
Ses constats ne sont pas des bugs : ce sont des **ruptures de crédibilité**.
Ses mots quand ça rate : *« vibecodé amateur »*, *« AI slop »*, *« générique »*,
*« cheap »*, *« choix à l'aveugle »*, *« manque de raisonnement »*, *« ça
m'énerve de te voir faire des fautes pareilles, applique-toi »*.

Ce vocabulaire dit une chose : il n'évalue pas si ça marche, il évalue **si
quelqu'un a réfléchi**. Une question de douleur posée à un patient sans
douleur n'est pas un bug d'affichage — c'est la preuve qu'un modèle a été
copié sans lecture du cas. C'est cela qu'il sanctionne.

## 2. Les cinq exigences (ordre de gravité)

### 2.1 Raisonner sur le cas, jamais copier un modèle
Le contenu doit **refléter une adaptation réelle** à son contexte (cas
clinique, âge, sexe, motif). Standardiser pour apprendre par cœur : oui.
Appliquer un gabarit à l'aveugle : non. Le test : *« est-ce que cette
question/phrase/écran aurait un sens pour CE patient ? »*. Si la réponse est
non, l'item est faux, même s'il est bien écrit.

Corollaire : **ne pas remplacer un mot dans un gabarit** (« Schmerzen » →
« Beschwerden ») et croire que c'est adapté. Ça produit des questions
inutiles, et Mehdi le voit immédiatement.

### 2.2 Zéro répétition, zéro incohérence
Une information demandée deux fois (métier ×3), deux options synonymes
(« verstorben / nein »), un contrôle qui répète ce qui vient d'être posé : ce
sont des **fautes d'application**, pas du polish. Elles minent la confiance
plus que n'importe quel bug. Un validateur mécanique doit les attraper avant
lui.

### 2.3 Premium, sobre, homogène — jamais « AI slop »
Ce qu'il rejette : boutons génériques, blocs imposants qui « se font trop
remarquer dans la vue d'ensemble », flèches orange, libellés en mono capitales
(jugés « robotiques »), texte là où une icône fine suffirait. Ce qu'il veut :
**discret au repos, élégant à l'usage**, cohérent avec l'identité de l'app.
La phrase est la vedette ; le contrôle est un serviteur. Un composant qui
attire l'œil sans raison est un défaut.

Attention : la charte peut évoluer sous ses retours (le « mono readout » en
libellé, signature initiale, est maintenant rejeté pour l'UI). **Quand il
tranche contre la charte, la charte change** — on met à jour
`fsp-brand-identity` et `dept-experience`, on ne défend pas l'ancien choix.

### 2.4 Ne pas allonger inutilement
« Sans chercher midi à quatorze heures », « sans allonger avec un infini de
questions », « meilleures réponses ne veut pas dire plus longues ». Il veut
**agencer ce qui existe** avant d'ajouter, et **enrichir avec des tournures
standardisées** plutôt qu'avec du volume. Un mur de texte est un échec, même
juste.

### 2.5 Personnaliser = se soucier de l'utilisateur
Mémoriser la variante choisie, adapter à l'âge, proposer un Teil seul, des
notes partout : il veut que **l'app montre qu'elle se souvient et s'adapte**.
« Une touche de personnalisation… le user va apprécier qu'on se soucie de
lui. » Chaque feature doit être lue sous cet angle : qu'est-ce qu'elle
retient de la personne ?

## 3. Son style de direction (à respecter tel quel)

| Trait | Ce que ça implique pour l'agent |
|---|---|
| **Il constate, il ne théorise pas.** Un exemple précis (« sonde dans besonderen »), un lieu (« sous-chapitre persönliche Daten, dernière question »). | Répondre au même niveau : fichier, ligne, capture. Jamais « on pourrait envisager ». |
| **Il attend l'initiative.** « Tu peux ajouter tes questions », « je te laisse raccorder les conséquences », « réfléchis et donne-moi tes idées innovantes ». | Proposer, décider dans le périmètre, **raccorder les dépendances sans qu'il les liste** (stats, profil, migrations). Ne pas demander ce qu'un senior déduirait seul. |
| **Il distingue ce qu'il tranche maintenant de ce dont il veut discuter.** « Enregistre ça, on en discutera en détail. » | Enregistrer sans implémenter ; préparer les questions ouvertes ; **ne pas coder une feature qu'il a mise en attente**. |
| **Il nomme les outils qu'il veut voir utilisés.** « Check taste skill pour arranger ça. » | Invoquer le skill nommé, dire qu'on l'a fait, montrer le résultat. |
| **Il vérifie en production, pas dans le terminal.** « Tu es sûr d'avoir tout déployé ? », « on dirait qu'il utilise toujours llama ». | « Fait » = **déployé et vérifié là où il teste** (bundle live, navigateur). `tsc` vert n'est pas une preuve. |
| **Il tranche la stratégie produit, et en profondeur.** Sur le Teil : « toute simulation, quel que soit le mode, influence l'avancement et les stats ; le programme doit être vivant et adaptatif ». | Une règle pédagogique que j'avais posée seul (« un Teil ne compte pas pour la maîtrise ») a été renversée : quand une règle touche la progression de l'utilisateur, la lui soumettre AVANT de coder, avec l'alternative. |
| **Il veut un effort maximal sur ce qu'il désigne comme game changer.** | Y mettre les meilleurs agents (Opus), spec complète, animations soignées, pas un MVP honteux. |
| **Il tolère mal la répétition d'une erreur déjà signalée.** La série 2 rouvre des thèmes de la série 1 (adaptation, doublons) marqués ✅. | Un ✅ est une **hypothèse jusqu'à ce qu'il rejoue**. Prévoir le validateur mécanique qui empêche le retour du défaut, pas seulement la correction ponctuelle. |
| **Il écrit vite, en français oral, sans ponctuation.** | Ne jamais confondre style d'écriture et niveau d'exigence : l'exigence est celle d'un praticien qui va passer cet examen. |

## 4. Check-list avant de dire « fait » sur une feature visible

1. **Raisonnement sur le cas** : l'item a-t-il été confronté à au moins deux
   cas de natures différentes (douleur / non-douleur, homme / femme,
   jeune / âgé) ? Cite-les.
2. **Doublons et synonymes** : un script (ou une grep documentée) prouve
   l'absence de répétition ; les toggles n'ont pas d'options de même sens.
3. **Anti-slop** : capture avant/après ; le composant est-il discret au repos ?
   Un `front-design-keeper` ou `direction-keeper` l'a vu.
4. **Concision** : aucun texte ajouté qui n'aide pas à passer l'examen ;
   volume en baisse ou stable.
5. **Personnalisation** : la feature retient-elle quelque chose de
   l'utilisateur quand c'est pertinent ?
6. **Déployé et vérifié en prod** : commit, push, workflows verts, bundle live
   contrôlé, comportement observé en navigateur.
7. **Validateur pour l'avenir** : le défaut corrigé a-t-il une porte CI qui
   empêche son retour ?

## 5. Anti-patterns vus (à ne pas reproduire)

- Déclarer « fait » sur `tsc` + `build`, sans push ni vérification live
  (81 commits non poussés, 3 modèles changés « pour rien »).
- Copier un gabarit d'un chapitre à l'autre en changeant un mot.
- Demander le métier dans trois chapitres parce que trois sources le
  mentionnaient.
- Une case « Standard » dans une liste de variantes alors que la standard est
  affichée juste au-dessus : logique de développeur, pas d'utilisateur.
- Marquer ✅ un chantier « adaptation au cas » sur la base d'un mécanisme,
  sans avoir rejoué des cas de natures différentes.
- Proposer une flèche orange, un bouton générique, un libellé texte là où
  une icône fine suffit.
- Des icônes qui « glissent depuis le bord » d'un bouton (jugé cheap, pas
  ergonomique) ; ce qui a été validé à la place : **retourner la carte
  entière**, verso en verre, la complète d'un bloc au-dessus et les trois
  parties **nées d'une division** en dessous — le dessin dit ce que fait
  l'action (« purpose engineering »). Des icônes génériques pour des actions
  précises (une partie de l'examen mérite son propre glyphe).
- Des pastilles de choix rangées dans la boîte d'action principale : un
  choix qui change la nature de l'action a sa propre boîte, au-dessus.

## 6. Mise à jour de ce guide

Ce guide se met à jour **à chaque série de retours** de Mehdi : ajouter les
nouveaux mots-clés de rejet, les nouvelles exigences, les anti-patterns.
Il ne remplace ni `PRODUCT-VISION.md` ni la charte : il dit **comment** la
direction juge ce qui les applique.
