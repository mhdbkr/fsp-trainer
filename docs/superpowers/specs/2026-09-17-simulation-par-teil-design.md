# Spec — Simulation par Teil (FB2-P1, FB2-P2)

**Statut** : livré le 2026-09-17 (décisions ci-dessous prises par le coordinateur, veto pédagogique à exercer sur la règle de maîtrise si besoin).

## Intention (Mehdi, point 17)
Pouvoir jouer **un seul Teil** (Anamnese · Dokumentation · Fallvorstellung) ou la simulation complète. Deux entrées : au survol de « Commencer » (page Simulation), trois sous-boutons icône glissent depuis le bord droit ; et une pastille de mode en page pré-simulation. Raccorder les conséquences (avancement, stats, profil).

## Modèle
`Simulation.scope: 'full' | 'teil'` et `Simulation.teil?: Part` (absent sur l'historique = complète). Une session de Teil n'a que cette partie dans `parts`. Rien d'autre ne change de forme : les stats par axe itèrent déjà sur les parties faites.

## Règles
1. **Stats par axe** (Anamnese / Doku / Vorstellung) : toute partie faite compte, complète ou Teil — c'est l'axe qu'on entraîne.
2. **Streak et activité** : une session de Teil compte comme une session.
3. **Maîtrise d'un cas** (score, `confidence`/`status`, programme) : **au prorata des trois parties** — pour chaque Teil, la dernière session jouée compte, complète ou seule ; une partie jamais jouée vaut 0 (décision de la direction, 17 sept., qui remplace la règle initiale « complètes seulement »). Toute session fait avancer le cas et remet le plan à jour.
3b. **Courbe d'apprentissage** (`ProgramConfig.strategy`) : `teil-first` (défaut) planifie chaque partie seule dans l'ordre de l'examen tant qu'elle n'est pas acquise (≥ 60 %), puis les complètes ; `full` commence en complète. Le plan est recalculé à chaque session depuis les résultats réels.
4. **Tableaux de bord** : « n complètes · m par partie ».
5. **Programme** : peut prescrire un Teil plus tard (hors périmètre ici).

## UI
- Page Simulation : « Commencer » **retourne la carte** ; le verso, en verre, propose la complète au-dessus et les trois Teile en dessous, nés d'une division (v2, retour direction : le glissement latéral était jugé cheap).
- Pré-simulation : **boîte de mode dédiée** au-dessus de l'action, même dessin (complète / division en trois) ; « Entrer » porte le mode. Icônes qui disent le Teil : dialogue, document, présentation.
- Runner : seules les parties du mode sont dans le fil ; en Teil, « Terminer la partie » mène au bilan ; l'en-tête nomme le mode.

## Critères d'acceptation
- Lancer « Anamnese seule » sur un cas → le fil ne montre que l'anamnèse, le bilan s'ouvre après son évaluation, `db.simulations` reçoit `{ scope: 'teil', teil: 'anamnese', parts: { anamnese } }`.
- Les stats par axe intègrent cette session ; le score du cas et la couche ne bougent pas.
- Une simulation complète se comporte comme avant (régression : tests `program`/`stats`).
- Survol clavier : Tab sur « Commencer » révèle les trois icônes ; chacune est un lien nommé.
