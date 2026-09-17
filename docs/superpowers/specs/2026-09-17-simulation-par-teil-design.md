# Spec — Simulation par Teil (FB2-P1, FB2-P2)

**Statut** : livré le 2026-09-17 (décisions ci-dessous prises par le coordinateur, veto pédagogique à exercer sur la règle de maîtrise si besoin).

## Intention (Mehdi, point 17)
Pouvoir jouer **un seul Teil** (Anamnese · Dokumentation · Fallvorstellung) ou la simulation complète. Deux entrées : au survol de « Commencer » (page Simulation), trois sous-boutons icône glissent depuis le bord droit ; et une pastille de mode en page pré-simulation. Raccorder les conséquences (avancement, stats, profil).

## Modèle
`Simulation.scope: 'full' | 'teil'` et `Simulation.teil?: Part` (absent sur l'historique = complète). Une session de Teil n'a que cette partie dans `parts`. Rien d'autre ne change de forme : les stats par axe itèrent déjà sur les parties faites.

## Règles
1. **Stats par axe** (Anamnese / Doku / Vorstellung) : toute partie faite compte, complète ou Teil — c'est l'axe qu'on entraîne.
2. **Streak et activité** : une session de Teil compte comme une session.
3. **Maîtrise d'un cas** (score du cas, couches, `confidence`/`status`) : seules les sessions **complètes** la font évoluer. Un Teil réussi ne « maîtrise » pas un cas — on ne valide pas une couche sur une partie. (Veto pédagogique possible : alternative = maîtrise au prorata des parties faites.)
4. **Tableaux de bord** : « n complètes · m par partie ».
5. **Programme** : peut prescrire un Teil plus tard (hors périmètre ici).

## UI
- Page Simulation : « Commencer » = complète ; au survol/focus, trois icônes glissent depuis le bord droit du bouton (fluide, interruptible, clavier : focus-within), chacune vers `/pre?teil=…`.
- Pré-simulation : pastille de mode (Complète / Anamnese / Dokumentation / Fallvorstellung), pré-sélectionnée par l'URL ; « Entrer en simulation » porte le mode.
- Runner : seules les parties du mode sont dans le fil ; en Teil, « Terminer la partie » mène au bilan ; l'en-tête nomme le mode.

## Critères d'acceptation
- Lancer « Anamnese seule » sur un cas → le fil ne montre que l'anamnèse, le bilan s'ouvre après son évaluation, `db.simulations` reçoit `{ scope: 'teil', teil: 'anamnese', parts: { anamnese } }`.
- Les stats par axe intègrent cette session ; le score du cas et la couche ne bougent pas.
- Une simulation complète se comporte comme avant (régression : tests `program`/`stats`).
- Survol clavier : Tab sur « Commencer » révèle les trois icônes ; chacune est un lien nommé.
