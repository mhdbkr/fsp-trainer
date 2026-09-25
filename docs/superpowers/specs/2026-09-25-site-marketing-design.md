# Site marketing Doctopus — conception

Date : 2026-09-25 · Statut : validé par la direction (chat), à planifier
Références : `app/docs/PRODUCT-VISION.md` §6 · `app/docs/brand/INSPIRATION-ORVIO.md` · `app/docs/brand/references/` · `app/docs/site/SKILLS-ET-AGENTS.md` · ADR-0014 (site DE, analytics EU, contenu = recueil personnel) · ADR-0015 (deux trajectoires)

## 1. Intention

Le site est la **première interface du produit**. Ce n'est pas une plaquette : c'est l'endroit où un médecin étranger comprend la procédure allemande, comprend la méthode de travail qu'on propose, et décide de s'abonner. Il doit être **premium, sobre, animé, et rapide** — et refléter par sa qualité la qualité de l'outil.

Priorité des visiteurs, dans cet ordre (décision de la direction) :

1. **B — le médecin déjà en Allemagne, date d'examen fixée.** Il veut voir l'outil. La vitrine est faite pour lui.
2. **A — le médecin encore dans son pays.** Il ne sait pas ce qu'est la FSP. Le centre de ressources et la feuille de route sont faits pour lui.
3. **C — celui qui a déjà échoué une fois.** La page Méthode est faite pour lui.
4. Le reste.

Atouts de vente à porter (direction) : **sérénité · tout-en-un, ne plus s'éparpiller entre dix ressources · flexibilité horaire · préparation personnalisée · corpus vivant de cas réels, mis à jour en continu · contenu exemplaire.**

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | **Deux étages** : une vitrine courte qui convertit, un centre de ressources profond qui renseigne | un site qui convertit est dirigé, un site où l'on trouve tout est ramifié ; les mélanger tue les deux |
| D2 | **Pas de facette par Land.** La procédure est quasi identique partout ; le Land n'est qu'une mention là où c'est utile | seize dossiers seraient seize fois le même texte, et il faudrait aller les vérifier |
| D3 | Le centre a **deux portes** : « La procédure » (courte, définitive, par étape) et « L'examen » (profonde — c'est notre matière) | chaque porte reçoit la profondeur que sa matière mérite |
| D4 | **Vitrine en allemand · porte Procédure en DE + EN · porte Examen en DE** | B vise le C1 et passe une épreuve allemande ; A cherche encore en anglais. On ne prépare pas une épreuve allemande en anglais |
| D5 | Le walkthrough montre **la méthode de travail par le produit lui-même** : six fragments d'interface agrandis, une phrase chacun. **Aucune mise en scène** (pas de salle, pas de patient dessiné, pas de personnage) | une illustration ratée tue la page ; le produit est déjà beau |
| D6 | **La pieuvre est une signature discrète, jamais une mascotte** : courbe, rythme de ventouses, encre, ondulation. Rien au premier écran | une pieuvre reconnaissable comme animal sur un site médical premium détruit la crédibilité |
| D7 | **La 3D est un seul objet**, le symbole en verre, **en clôture** juste avant l'essai — pas dans le hero | discrétion demandée ; et ça rend le hero instantané |
| D8 | **Astro statique + trois îlots React** (hero fragment, six démonstrations, feuille de route), chargés à l'entrée dans l'écran | un hero riche et des pages de contenu à zéro JavaScript |
| D9 | **La vitrine bouge ; le centre a ses propres animations utiles**, bâties sur **quatre composants réutilisables** (frise de délais, enchaînement d'étapes, comparaison, jauge) | C choisi par la direction ; les composants évitent treize chantiers sur mesure |
| D10 | Le visiteur qui n'est pas prêt repart avec **sa feuille de route** (six questions → plan personnalisé), puis peut la garder en créant un compte gratuit | A est à un ou deux ans de l'examen ; sans ça on le perd. L'outil est déjà l'onboarding de l'app |
| D11 | **Aucun témoignage tant qu'il n'y a pas de vrais utilisateurs.** La section existe, vide | un faux témoignage est la seule erreur dont on ne se relève pas |
| D12 | **Aucun comparatif nominatif** avec les écoles de prépa | juridiquement risqué et contraire au ton ; le comparatif se fait en creux, page Méthode |
| D13 | Base de travail : **la branche `feat/site` existante**, rebasée sur `main` | 123 commits, Astro, contenus DE relus, et surtout **8 validateurs mécaniques** (promesse illégale, pages légales, parité de prix, Lighthouse, lexique) qu'il serait absurde de jeter |

## 3. La carte

### Étage 1 · Vitrine *(allemand)*

| URL | Page | Rôle | Cible |
|---|---|---|---|
| `/` | Accueil | Le walkthrough, la bascule tout-en-un, la preuve, le prix en une ligne, l'essai | B |
| `/produkt` | Produit | Les piliers un par un, chacun avec sa mise en valeur | B |
| `/methode` | Méthode | Pourquoi on échoue à la FSP, ce qu'on fait autrement | C |
| `/preise` | Prix | Free / Pro / Premium, crédits, résiliation en un clic | tous |
| `/fahrplan` | Ta feuille de route | L'outil : six questions → plan personnalisé | A |

### Étage 2 · Centre de ressources — `/wissen`

**Porte 1 — « La procédure »** *(DE + EN)* — courte, définitive, chronologique
```
/wissen/verfahren/anerkennung          Faire reconnaître son diplôme
/wissen/verfahren/gleichwertigkeit     La Gleichwertigkeitsprüfung
/wissen/verfahren/fachsprachpruefung   La FSP — ce que c'est vraiment
/wissen/verfahren/approbation          L'Approbation
/wissen/verfahren/erste-stelle         Le premier poste
/wissen/verfahren/kenntnispruefung     La Kenntnisprüfung
```
Miroir anglais sous `/en/wissen/verfahren/…`.

**Porte 2 — « L'examen »** *(DE)* — profonde
```
/wissen/pruefung/anamnese              L'anamnèse : attendus, pièges, exemple réel
/wissen/pruefung/dokumentation         La documentation et l'Arztbrief
/wissen/pruefung/fallvorstellung       La présentation au médecin senior
/wissen/pruefung/aufklaerung           L'Aufklärung
/wissen/pruefung/fachbegriffe          Le vocabulaire — registre double
/wissen/pruefung/fachwissen            Le savoir médical attendu
/wissen/pruefung/was-drankommt         Ce qui tombe vraiment — preuve d'autorité
```

**Couche transversale** — `/wissen/fragen/<slug>` : réponses autonomes, complètes, citables telles quelles par un moteur de réponse. Absorbe la FAQ actuelle (8 entrées existantes).

**`/journal`** — articles de fond (les deux existants y déménagent).

### Étage 3 · Confiance
`/ueber` (qui, pourquoi, **d'où vient le contenu**) · `/support` · `/status` · `/impressum` · `/datenschutz` · `/agb` · `/widerruf`.

### Domaines
`doctopus.co` (site) · **`app.doctopus.co`** (l'application). Le nom de domaine reste à confirmer (ADR-0014 le donne comme provisoire).

## 4. Le walkthrough (page d'accueil)

**Règle** : un seul fragment d'interface réel, agrandi, isolé sur fond profond, une seule phrase. **La seule chose qui bouge est la fonctionnalité qui se démontre**, puis elle s'arrête.

| # | Ce qu'on montre | Phrase |
|---|---|---|
| Ouverture | Phrase en escalier + **le premier fragment** : un extrait médical, un mot qui s'allume. Beaucoup de vide | *(promesse — à écrire avec `brand-messaging`)* |
| 1 | Le mot dans sa phrase, avec son **registre double** (terme technique / formulation patient) | Tu apprends le mot là où il se dit. |
| 2 | La **formule Muster** qui se propose au moment où elle sert | La bonne formulation au bon moment. |
| 3 | La **correction dans la marge** : Konjunktiv I, registre oral dans l'écrit, terme attendu absent | Corrigé comme à l'examen. Tout de suite. |
| 4 | Le **drill** : les termes croisés dans le cas d'hier remontent ; ce qui n'est pas dû n'apparaît pas | Tu ne révises jamais au hasard. |
| 5 | Le **programme à rebours** de la date, qui se réajuste | Le plan s'adapte à toi. |
| 6 | L'**indice de préparation** et ce qui reste pour le faire monter | Tu sais où tu en es. |
| Bascule | Le registre passe au **clair** — tout cela au même endroit | Ne plus s'éparpiller. |
| Preuve | Plus de 130 cas cliniques — **déjà tombés ou susceptibles de tomber** — mis à jour en continu ; fréquences par pathologie | Ce n'est pas une méthode inventée. |
| Signature | Le **symbole en verre 3D**, une seule fois | — |
| Essai | Prix en une ligne · *Commencer gratuitement* · *Ma feuille de route* | — |

**Mention obligatoire** partout où une évaluation apparaît : c'est la **grille d'entraînement de Doctopus**, pas le barème officiel d'une Landesärztekammer. Le « 60 points / 60 % » n'est pas sourcé (commit 3f48b96) et ne doit réapparaître nulle part.

## 5. L'outil feuille de route (`/fahrplan`)

Six questions — pays de diplôme, Land visé, niveau d'allemand, étape de la procédure, date d'examen si connue, spécialité d'origine — et un résultat immédiat : **les étapes restantes dans l'ordre, avec des délais réalistes, et le moment où il faudra commencer à s'entraîner.**

- Le résultat s'affiche **sans compte** et sans e-mail.
- « Garde ta feuille de route » crée le **compte gratuit** en un geste et **pré-remplit le profil de l'app** (les quatre champs sont ceux de l'onboarding existant).
- À partir de là, c'est le **produit** qui reprend contact au bon moment, pas une liste marketing.
- Collecte de données personnelles → consentement explicite + mise à jour de la Datenschutzerklärung. `compliance-checker` rédige, un juriste valide.

## 6. Identité appliquée

### Deux registres
**Sombre** = moments de marque (accueil, walkthrough, signature). **Clair** = travail et lecture (centre de ressources, prix, feuille de route). Profondeur par **pile de surfaces d'une seule teinte, sans ombre portée** ; dégradés de **luminosité**, jamais de teinte (leçon Auros/ORVIO).

### La pieuvre — gradation stricte
- **Premier écran : rien.** Aucune évocation animale.
- **Dès le deuxième écran** : la **courbe**, fine, presque effacée, qui accompagne le scroll et sert d'indicateur de progression.
- **Le rythme des ventouses** (cercles décroissants tangents) devient le système de formes : jalons, puces, points de courbe.
- **L'encre** : diffusion sombre du registre profond. Double sens — l'encre de la pieuvre, l'encre de l'Arztbrief.
- **L'ondulation** : la signature de mouvement ; les courbes d'accélération ondulent, ne claquent jamais.
- **Interdits** : yeux, animal dessiné, mascotte, tout ce qui est mignon.

### La matière
La matière atmosphérique est **voulue** — verre, profondeur, lumière. Ce qui est interdit, c'est l'**exécution cheap** et le **décor sans intention**. Le site **amplifie** le produit : une fonctionnalité peut être magnifiée, mise en scène plus belle que dans l'app, **tant qu'elle ne ment pas sur ce que l'outil fait**.

### Typographie
Pas typographiques **verrouillés** (famille + taille + graisse + interlignage + tracking ensemble), courbe de tracking continue — large en capitales aux petites tailles, serré aux grandes. Titres de marque en **escalier**.

## 7. Technique

| Élément | Choix |
|---|---|
| Socle | **Astro**, statique par défaut ; `feat/site` rebasée sur `main` |
| Îlots **React** | hero fragment · six démonstrations · feuille de route — `client:visible` |
| 3D | **React Three Fiber**, un seul objet, **sous la ligne de flottaison**, chargé en différé avec image fixe d'attente |
| Scroll | **GSAP ScrollTrigger** pour l'orchestration de la vitrine |
| Centre de ressources | **zéro JavaScript** par défaut ; les quatre composants de schéma sont des îlots ponctuels |
| Composants de schéma réutilisables | frise de délais · enchaînement d'étapes · comparaison avant/après · jauge |
| Analytics | EU, sans cookie (ADR-0014) |
| Hébergement | **à trancher** : Vercel (previews par PR, edge) ou GitHub Pages (comme l'app). Recommandation : Vercel |

### Lois de mouvement
1. **Une seule chose bouge à la fois.**
2. **Le mouvement démontre, puis s'arrête.** Rien ne boucle en fond.
3. **`prefers-reduced-motion` supprime tout** : la courbe devient un trait fixe, les démonstrations leur état final, la 3D son image fixe. **Le site reste entier et l'histoire se lit intégralement.**
4. **Mobile** : les six moments deviennent six panneaux empilés ; pas de scroll épinglé au pouce.

## 8. Vérité du contenu

- **Ne jamais citer le nombre de comptes rendus sources** (décision de direction du 25/09, cf. `app/docs/brand/POSITIONNEMENT.md` §08 bis). Formulation unique : « plus de 130 cas cliniques, déjà tombés ou susceptibles de tomber, mis à jour en continu ».
- Toute affirmation sur la FSP, l'Approbation, la Gleichwertigkeit ou la KP passe par **`product-exam-fidelity-analyst`**, source à l'appui. Rien d'inventé sur une procédure administrative.
- Les **8 validateurs existants** restent bloquants en CI : `check-no-promise` (aucune promesse de réussite), `check-legal` (pages légales présentes et signalées comme brouillons), `check-pricing-parity`, `check-cta`, `check-frequencies`, `check-lighthouse`, `build-lexicon`, `build-frequencies`.
- **Pas de témoignage inventé** (D11), **pas de comparatif nominatif** (D12).

## 9. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | `/` : LCP < 2,5 s en mobile 4G ; aucun octet de 3D chargé avant que l'objet n'entre dans l'écran | Lighthouse mobile (médiane de 3) + trace réseau |
| AC-2 | Pages du centre de ressources : **0 Ko de JavaScript** hors îlot de schéma explicitement posé | analyse du build |
| AC-3 | `prefers-reduced-motion: reduce` : aucune transformation animée ; les six moments affichent leur état final ; le texte complet reste lisible | navigateur, mesure DOM |
| AC-4 | JavaScript désactivé : le walkthrough reste lisible de bout en bout (texte + états finaux) | navigateur, `javaScriptEnabled: false` |
| AC-5 | Aucune évocation animale au premier écran ; le symbole 3D n'apparaît qu'après la preuve | navigateur, position de l'élément |
| AC-6 | Parcours feuille de route : six questions → plan affiché **sans compte** ; « garder » crée le compte et pré-remplit les quatre champs du profil | navigateur, 2 contextes |
| AC-7 | Routage des langues : `/wissen/verfahren/*` existe en DE et EN ; `/wissen/pruefung/*` en DE seul ; aucune page orpheline ni lien mort | validateur de liens + build |
| AC-8 | Lighthouse mobile : performance ≥ 95 sur `/`, ≥ 98 sur une page `/wissen` ; accessibilité ≥ 95 ; SEO 100 | `check-lighthouse.mjs` |
| AC-9 | Les 8 validateurs existants sortent en code 0 ; `check-no-promise` détecte toujours une promesse injectée | CI |
| AC-10 | Contraste ≥ 4,5:1 sur tout texte, dans les deux registres | axe + mesure DOM |
| AC-11 | 390 px : aucun débordement horizontal ; les six moments empilés ; cibles tactiles ≥ 44 px | navigateur |
| AC-12 | Chaque réponse de `/wissen/fragen/*` est autonome (compréhensible hors contexte) et porte ses données structurées | validateur de schéma |
| AC-13 | Aucun témoignage, aucun nom de concurrent, aucune mention d'un barème officiel non sourcé | `check-no-promise` étendu |

## 10. Hors périmètre

Institutions / B2B · comparatif nominatif · témoignages · facette par Land · traduction arabe ou russe (réserve, uniquement la porte Procédure si le référencement le justifie) · animations sur mesure au-delà des quatre composants réutilisables · le contenu encyclopédique complet des deux portes (chantier de contenu distinct, la charpente sort d'abord).

## 11. Risques

| Risque | Parade |
|---|---|
| La 3D fait chuter la vitesse | elle est sous la ligne de flottaison, différée, avec image fixe ; bascule possible vers une séquence d'images pré-rendues sans rien changer d'autre |
| La pieuvre glisse vers la mascotte | gradation stricte (§6), relecture `front-design-keeper` et `brand-creative-director` avant merge |
| Le walkthrough tombe dans l'AI slop | voix de design unique (bake-off à trancher), `review-animations` en gate, `taste-skill` en audit |
| Les six démonstrations divergent du produit réel | chaque fragment est tiré d'un écran existant de l'app ; l'amplification porte sur la mise en valeur, jamais sur la fonction |
| Contenu de procédure faux | `product-exam-fidelity-analyst` bloquant, source citée par affirmation |
| Le centre de ressources reste vide au lancement | la charpente sort avec la procédure complète (6 pages, corpus fini) et 3 pages d'examen ; le reste s'ajoute |

## 12. À trancher avant le plan

1. **Hébergement** : Vercel ou GitHub Pages.
2. **La voix de design** : `taste-skill` / `refero-design` / `bencium-impact-designer` — bake-off proposé sur le hero (`app/docs/site/SKILLS-ET-AGENTS.md` §8).
3. **Les prix** : Free / Pro / Premium et les montants — décision de direction, relue par `product-pedagogy-designer` (veto, ADR-0008).
4. **Le nom de domaine** : `doctopus.co` confirmé ou non.
5. **Session marque** (demandée par la direction) : positionnement, messages, récit — à faire avant d'écrire les textes de la vitrine.
