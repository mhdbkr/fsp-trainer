# Références d'inspiration

Matériel **de référence uniquement**. Rien ici n'est notre charte : on en prend la **méthode**, jamais les formes ni les valeurs (cf. `../INSPIRATION-ORVIO.md` §2 et §6.2 — ce qu'il ne faut pas copier).

| Dossier | Source | Ce que c'est |
|---|---|---|
| `auros/` | `auros.global`, extrait par Refero le 2026-07-03 | Terminal fintech « abyssal » : canvas teal quasi noir, orbes de données, couleur rationnée. Fourni par la direction les 17 et 25/09 |
| — (planches) | identité fictive « ORVIO » (biotech) | 16 planches analysées dans `../INSPIRATION-ORVIO.md` §1–§5 |

## `auros/` — ce qu'il y a dedans

| Fichier | Contenu |
|---|---|
| `STYLE-REFERENCE.md` | La fiche de style complète : palette commentée rôle par rôle, composants, do/don't, surfaces, élévation, imagerie, layout |
| `tokens.json` | **Le plus utile** — format W3C Design Tokens (DTCG) : couleurs, polices, **17 pas typographiques complets**, espacements, rayons, surfaces |
| `variables.css` | Les mêmes jetons en propriétés CSS |
| `theme.css` | Les mêmes jetons en bloc `@theme` Tailwind v4 |

## Ce que `tokens.json` apprend et que la fiche markdown ne dit pas

1. **Les pas typographiques sont des triplets verrouillés, pas des axes séparés.** 17 pas nommés (`xs`, `xs-2`, `sm`, `sm-2`, `sm-3`, `base`, `xl`…`xl-5`, `2xl`, `4xl`, `4xl-2`, `5xl`…`5xl-4`), chacun figeant **famille + taille + graisse + interlignage + tracking** ensemble. C'est ça qui empêche la dérive : on ne choisit pas « 20 px » puis un tracking au jugé — on choisit `xl-3`.
2. **Le tracking suit une courbe continue avec la taille** : +0,15 em à 10 px → +0,12 à 12 px → +0,055 à 13 px → 0 à 16 px → −0,013 à 24 px → −0,04 à 61 px → −0,046 à 86 px. Large pour les micro-étiquettes, serré pour l'affichage. Une seule règle, appliquée partout.
3. **Cinq variantes à 20 px** (`xl` à `xl-5`) — même taille, tracking de +0,24 em à −0,02 em selon le rôle. La taille ne suffit jamais à définir un rôle.
4. **L'échelle d'espacement n'est pas une rampe de 4 px** : 12·16·20·24·28·32·36·40·48 puis saut à 64·80·120·140·160·164. Dense pour les composants, très espacée pour le rythme des sections.
5. **Trois rayons dans les jetons** (6 / 12 / 16) alors que la fiche n'en revendique que deux — le 12 px est un reste non documenté.

## Pièges si on réutilise ces fichiers tels quels

- `--card-padding: 36-48px` (dans `variables.css`) n'est **pas une valeur CSS valide** : c'est une plage écrite à la main par l'extracteur. Ne pas la copier.
- `--color-bioluminescent-gradient: #00827c` et `--color-aurora-gradient: #cbfffc` sont des **aplats de repli** pour des dégradés ; les vrais dégradés sont les `--gradient-*`. Confusion facile.
- La fiche elle-même prévient : « mesures normalisées, rôles et recommandations interprétés, exemples HTML reconstruits ». Ce n'est pas le code source d'Auros.
- Palette, rose-lavande, dégradé aurora, sphère de particules : **leur territoire**. Notre signal reste le corail, notre matière reste le verre du hero + les personnages.

## Ce qu'on en retient pour Doctopus

La méthode des jetons — **pas typographiques verrouillés, courbe de tracking, pile de surfaces d'une seule teinte sans ombre, couleur rationnée** — alimente directement notre `DESIGN.md` et les jetons à trois couches (`app/docs/site/SKILLS-ET-AGENTS.md` §2bis, `../INSPIRATION-ORVIO.md` §6.4).
