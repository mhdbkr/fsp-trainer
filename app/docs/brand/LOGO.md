# Logo Doctopus — marque officielle

Le mark : pieuvre stylisée qui lit aussi comme un « A » — arche-manteau, yeux en
feuilles, tentacules en éventail. Pas de wordmark pour l'instant.

## Fichiers (source de vérité)

| Usage | Fichier |
|---|---|
| UI de l'app (React, prend la couleur du texte) | `app/src/components/icons.tsx` → `doctopus` |
| Fond clair (site, README, e-mail) | `app/public/logo.svg` — pétrole `#0b4e46` |
| Fond sombre / photo | `app/public/logo-white.svg` |
| Favicon, app icon, og | `app/public/favicon.svg` — tuile pétrole 512, rayon 112, mark blanc à 72 % |

Fichier Figma : <https://www.figma.com/design/aPWyVYV3tQhO1NKSFBQ7hG> (board
pétrole + board blanc sur transparent).

## Règles d'emploi

- Un seul chemin, `fill-rule="evenodd"` — jamais de contour (`stroke`) ajouté.
- Couleurs autorisées : pétrole `#0b4e46` (brand-700), blanc, ou `currentColor`
  dans l'app. Le coral `signal` ne colore jamais le mark.
- Zone de respiration : la hauteur d'un œil (~7 % du côté) sur les quatre bords.
- Taille minimale : 20 px. En dessous, les yeux se ferment — utiliser la tuile
  `favicon.svg`, dessinée pour ces tailles.
- Ne pas déformer, incliner, ajouter d'ombre portée ni de dégradé sur le mark
  lui-même. La tuile du favicon porte le seul dégradé autorisé (brand-500 →
  brand-700).

## Provenance

Vectorisé depuis le rendu d'origine : seuil sur le blanc pur, symétrisation sur
l'axe vertical, nettoyage morphologique, puis refit — droite exacte là où la
source est droite, Bézier fluide ailleurs. 37 segments droits, 77 courbes.
Les trois losanges (deux latéraux, un bas) du rendu d'origine ont été retirés.
