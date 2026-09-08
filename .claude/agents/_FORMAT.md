# Format partagé des constats (ne pas invoquer — référence)

Tous les agents de revue FSP rendent leurs constats dans CE format, pour que
plusieurs rapports fusionnent sans retraitement.

```
### [BLOQUANT|MAJEUR|MINEUR] Titre court et factuel
- **Où** : `chemin/fichier.ts:123` ou « écran Simulation → guide Anamnèse »
- **Constat** : ce qui ne va pas, en une phrase
- **Preuve** : la citation EXACTE des données ou la mesure relevée
- **Correctif** : l'action concrète, pas une intention
```

**Sévérité**
- `BLOQUANT` — erreur médicale, contradiction interne, contrat rompu, l'app casse.
- `MAJEUR` — friction nette à chaque usage, contenu inadapté, faute de registre.
- `MINEUR` — polish, confort.

**RÈGLE ABSOLUE — aucun constat sans preuve citée.**
Sur ce projet, une lentille de vérification a produit 2 faux positifs sur 5 :
elle a déclaré des Muster « absents » alors qu'ils étaient seulement tronqués
dans l'objet qu'on lui avait transmis, et une prognose « contradictoire » alors
que c'était une fourchette cohérente. Coût : du temps perdu à corriger ce qui
allait bien, et un risque d'abîmer du contenu juste.

Donc :
1. **Cite la donnée** telle qu'elle est dans le fichier. Si tu ne peux pas la
   citer, tu n'as pas de constat.
2. **Distingue « faux » de « je n'ai pas pu vérifier ».** Termine tout rapport
   par une section `## Non vérifié` listant ce que tu n'as pas pu contrôler
   (contenu tronqué, fichier trop gros, écran inaccessible). C'est une
   information utile, pas un aveu.
3. **Ne propose jamais de supprimer** un contenu clinique sans avoir vérifié ce
   qu'il apporte. Sur les 27 recouvrements de sondes détectés, 24 ajoutaient un
   axe clinique décisif : les supprimer aurait appauvri l'app.
