# Fachbegriffe F4c — Finition visuelle et ergonomique · Spec

> Retours de la direction du 3 oct. 2026 sur F4b (PR #53) en production, 7 points. Maquette interactive montrée le 3 oct. Aucune donnée, aucun événement, aucune migration : matière, mise en page, mouvement.

## Décisions

| # | Retour | Décision |
|---|---|---|
| C1 | La pilule « Rangée dans Favoris » ne disparaît pas ; « Révéler/Recto » moche et mal placé | Cause : le focus posé par « Créer » marquait la pilule « touchée » → aucun délai. Elle se retire seule en **6 s**, un filet pétrole qui se vide montre le temps restant ; elle attend au survol souris, dès qu'on y agit au clavier (WCAG 2.2.1) ou miniature/choix ouverts, puis repart pour 6 s (filet plein et fixe pendant l'attente). « Révéler » quitte la pilule. Un **sélecteur Recto \| Verso gravé dans la carte** (pastille pétrole qui glisse) partout où la carte se retourne : miniature, tiroir (le bouton « Recto » pleine largeur disparaît), drill. Toucher la carte la retourne aussi ; au drill, rappel clavier « Espace retourne · 1–4 notent ». |
| C2 | Bedeutung à mettre en valeur | Le seul bloc teinté de la fiche : fond pétrole 50, filet pétrole à gauche, texte en Bricolage semi-gras 20 px (16 px compact). |
| C3 | Icônes patient / demande / présentation hors identité | Tags de marque `.dim-tag` aux noms des phases d'examen (**Patient · Anamnese · Vorstellung**), reliés par un fil pétrole à nœuds ; la ligne d'usage remplace l'ancien libellé redondant ; icônes `say-*` supprimées. Pas de mono majuscule (retiré des libellés d'UI par la charte). |
| C4 | Mini-fiche disproportionnée, liseré vert décalé (aussi « Nouveau deck »), titres trop petits | `.field-line` : le focus EST le soulignement 2 px pétrole (plus de cadre `outline` décalé autour d'un champ souligné), appliqué à la mini-fiche, DeckSheet, renommage (DeckManager, DeckRail), Bedeutung modifiée. `.field-label` 13 px semi-gras (Bedeutung, Contexte, Nom du deck…). Titre de fiche en Bricolage 15 px ; mot à 22 px ; pied séparé par un filet (decks + « Créer la carte »). |
| C5 | Choix du sens statique, police cheap | Chaque option MONTRE son sens : une carte d'exemple (terme hors file du jour, jamais la réponse à venir) se retourne une fois au choix, puis au survol / focus ; libellés en Bricolage avec flèche qui glisse ; une ligne d'explication. |
| C6 | Verso du drill qui défile | Faces empilées dans une même cellule de grille : la carte prend la hauteur de sa face la plus haute ; plus de défilement interne. |
| C7 | « ≈ 14 min » à côté du bouton Drill | Une horloge et la durée DANS le bouton ; au survol / focus les aiguilles font un tour. La largeur du bouton ne bouge jamais (revue mouvement : un déploiement poussait les voisins) ; téléphone : Decks / Répétitions en icône seule, Drill sans retour à la ligne ; nom accessible « Drill (N), environ X min ». |

Retourner : le verso est monté à mi-rotation puis reste monté (revenir au recto ne tourne plus vers un dos vide) ; face cachée `inert` ; au drill, chaque carte est un composant neuf (pas de rotation inverse après la note). Choix du sens : démo (animation) et survol (transition) sur deux enveloppes distinctes, sans saut.

Mouvement : CSS seulement (aucun coût `motion`), courbe `fluid`, rien sous `prefers-reduced-motion` (règle globale).

## Critères d'acceptation

- **AC-1** Pilule « Rangée » retirée seule ≤ 7 s après « Créer » ou ★, même focalisée (test + mesure navigateur) ; attente au survol puis délai entier.
- **AC-2** Aucun bouton « Révéler » ni « Recto » hors carte ; sélecteur Recto|Verso dans miniature, tiroir, drill (`aria-pressed`, ≥ 44 px).
- **AC-3** Bloc `[data-bedeutung]` en Bricolage ≥ 20 px (fiche pleine).
- **AC-4** `[data-usage]` : 0 `svg`, tags Patient/Anamnese/Vorstellung.
- **AC-5** Champs soulignés : `outline: none` au focus, soulignement `--focus-ring` 2 px ; libellés 13 px.
- **AC-6** Verso du drill : aucune face avec `scrollHeight > clientHeight`.
- **AC-7** Plus de « ≈ » à côté du bouton Drill ; horloge + durée dans le bouton, aiguilles au survol, largeur fixe.
- **AC-8** Aucune régression : suites vertes ×3, build, 390 px sans défilement horizontal.
