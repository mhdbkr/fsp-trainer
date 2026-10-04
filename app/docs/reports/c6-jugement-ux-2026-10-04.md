# Jugement C6 : 14 jours de Léa, vue de la candidate

**Verdict.** La mécanique tient : le plan reste figé et explique ce qu'il fait, une partie interrompue reprend à l'identique, et l'exercice libre est bien compté. Les chiffres, eux, découragent. Le premier soir, la courbe montre une baisse qu'elle n'a pas causée. Un « point faible » ne bouge plus pendant 14 jours, et le score est pour un tiers fait de valeurs qu'elle n'a jamais saisies. On sait quoi faire chaque jour. On ne sait pas ce que valent les nombres, et c'est ce qui pousse à arrêter le soir.

Je n'avais pas d'outil Skill pour invoquer `dept-experience` : le jugement s'appuie sur DIRECTION-STYLE §1, sur la série FB3 de BACKLOG-FEEDBACK et sur le code source, consulté en lecture seule.

### Ruptures, de la plus grave à la moins grave

1. **Elle « régresse » avant d'avoir joué.** Bug connu BUG-C6-1, présent les 14 soirs. Le premier soir, Stats affiche « 3 simulations complètes » et une courbe qui part de 65–75 % pour retomber à 43 % à sa première vraie partie. La trajectoire commence le « 4 oct. », la veille de son premier jour. Ce qu'elle comprend : « j'étais meilleure avant ». La première chose qu'elle apprend de l'app est fausse, et elle est décourageante.
   Captures : `soir-01.png`, `KO-D5s-jour_1…png`, `soir-14.png` (le creux 73 → 43 reste visible au jour 14).
   → Ne jamais charger de démos dans la base d'un·e candidat·e ; afficher à la place un état vide (« ta première partie dessinera ta courbe »).

2. **« Point faible détecté : Fachbegriffe (0 %) » s'affiche les 14 soirs, sans changer.** Elle a pourtant fait la tâche Fachbegriffe du plan le jour 1 et un drill libre le jour 6. L'axe calcule la part de termes « Gelernt » sur tout le glossaire (`lib/stats.ts:36-41`), donc 4 cartes par jour ne peuvent pas le faire bouger. C'est une mesure de couverture présentée comme une faiblesse : exactement ce qu'interdit FB3-D4.
   Captures : `soir-01.png`, `soir-11.png`, `soir-14.png`.
   → Mesurer l'axe sur la rétention des cartes déjà vues, ou ne pas l'afficher tant qu'elle n'a pas vu au moins N termes.

3. **Un tiers du score ne vient pas d'elle.** La grille de langue est préremplie à 3/5 partout (`scoring.ts:22`) et le Ressenti à 50. Avec la pondération 0,55 / 0,30 / 0,15 (`scoring.ts:46`), environ 25 points sur 100 tombent sans qu'elle touche à rien. Résultat : 30 % de critères cochés donnent 43 %, 92 % donnent 78 %. Les scores de C6 correspondent à ces valeurs par défaut. En plus, la grille porte le titre « barème officiel · Ce que le jury note vraiment » (`PartEvaluation.tsx:117-120`), ce qui viole la garde EXAM_CLAIM ; à router vers `direction-keeper`.
   Capture : `spike4-Termi.png` (spike d'avant le parcours, mais même source).
   → Laisser les curseurs vides et afficher « contenu seul » tant qu'elle n'a pas noté sa langue.

4. **La « session du jour » est Fachbegriffe 14 jours sur 14.** Elle annonce « 0 terme dû » 6 fois et « dûs » 7 fois (bugs connus). Ressenti : le premier bloc de chaque soirée est une tâche qui se dit vide, qu'elle saute, et qui devient du décor. Le vrai travail (les cas) commence plus bas. Ajouté au point 2, l'app réclame des Fachbegriffe à deux endroits sans jamais compter ce qu'elle y fait.
   Captures : `KO-D3-jour_1…png`, `spike3-prog.png`.
   → Nommer ce que la tâche contient vraiment (« 4 nouveaux termes · 4 min ») et, quand rien n'est dû, la placer après la première partie.

5. **La série retombe à 0 chaque lundi** (bug connu). Elle a fait 5 jours ouvrés sur 5, et c'est son propre programme qui met le week-end en repos. La tuile corail « 0 jours de suite » en haut de l'accueil la punit d'avoir suivi son plan, les 12 et 19 octobre.
   Capture manquante : il n'existe pas de capture de l'accueil un lundi ; seule la tuile du jour 1 est visible (`KO-D3`).
   → Compter la série en jours du programme, ou afficher « 5/5 jours du plan cette semaine ».

6. **Les jours manqués passent sous silence.** Le jour 6, aucun rattrapage n'est proposé. C'est bien de ne pas culpabiliser ni surcharger (106 min prévues), mais rien ne lui dit ce qui a glissé, ce qui va contre FB3-D10. Capture manquante pour le jour 6.
   → Afficher une ligne au retour : « 2 jours manqués : X et Y ont glissé, [Rattraper] ou [Laisser] ».

7. **Des chiffres et des termes qui ne s'expliquent pas.** « Trajectoire 42 % » côtoie des scores à 78 % sans que le lien soit dit. « Couche 1 · assisté », « budget » : du jargon. Sur l'accueil à 1280 px, les titres de cas sont tronqués (« Obere GI-B… », « Ambulant e… ») sur 5 lignes qui portent toutes le même « pourquoi ».
   Captures : `soir-14.png`, `KO-D3-jour_1…png`.
   → Ajouter sous la trajectoire une ligne qui dit ce que mesure l'indice, et afficher le titre du cas en entier avant le « pourquoi ».

### Ce qui respecte l'intention
- Le plan est figé et le dit : « Ce plan est figé. Cocher marque fait ; rien ne prend la place. »
- Chaque proposition porte un vrai « pourquoi », par exemple « restée à 43 % — on la reprend ».
- Le mode par Teil est suivi.
- L'exercice libre est enregistré (« Noté dans ton historique »).
- La carte IA ne s'affiche que si la séance a eu lieu hors de l'app, et « Ce n'était pas une simulation » est respecté.
- Une partie interrompue reprend à l'identique.

### Non vérifié (captures manquantes)
- L'accueil les lundis 12 et 19 octobre.
- Le message affiché au passage en « Cas complet » le jour 7.
- La carte IA du jour 9.
- Ce qu'ouvre « Réviser » quand 0 terme est dû.
- Si le drill libre du jour 6 a coché la tâche du plan.
- Le choix de quelle partie on travaille en mode « par partie ».
- Le mobile : tout le parcours tourne en desktop 1280 px.
- Le soir : l'horloge du parcours est à 08:xx, donc l'app affiche « Guten Morgen ».

Pour `fsp-qa-tester` : les démos portent sur des cas (Pankreatitis, Leberzirrhose) qui sont probablement hors du palier gratuit.

**Statut : DONE_WITH_CONCERNS.** Je n'ai écrit aucun fichier (lecture seule). Sources :
- `/Users/MehdiBoukari/Downloads/FSP VB/doctopus-s3-c6/app/docs/reports/c6-parcours-2026-10-04.md`
- les captures dans `/private/tmp/claude-501/-Users-MehdiBoukari-Downloads-FSP-VB-Claude-FSP/fab928bf-94b4-4f3f-b28b-69e62e6e776f/scratchpad/c6/`
