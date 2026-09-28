# Fachbegriffe F4a — Clarté : termes vraiment liés aux cas, fiche lisible, cartes personnelles maîtrisées

Date : 2026-09-28 · Statut : validé en conversation par la direction, en relecture · Epic : #4 (suite) · Chantier 1/3 des retours du 28 sept. (2 = couche premium glass/motion, 3 = personnalisation des cartes)

## 1. Intention

Après F3 en production, la direction trouve l'écran Fachbegriffe confus : des mots généralistes (Anamnese, Befund, Fieber…) collés à tous les cas, une « Bedeutung (patientengerecht) » parfois vide dont on ne comprend pas le rôle, trois registres sans explication, un contexte illisible, une création de carte sans signification, une carte qu'on ne peut pas voir depuis la fiche, une suppression « en texte moche ». F4a rend chaque élément **compréhensible au premier regard** et **pédagogique** ; il ne change ni la matière (glass) ni le mouvement (chantier 2) ni les réglages des cartes (chantier 3).

## 2. Décisions (validées une à une avec la direction)

| # | Décision | Pourquoi |
|---|---|---|
| D1 | Un terme n'est lié à un cas que s'il y est **central** : présent dans le diagnostic ou les constats propres au cas, **jamais** seulement dans une négation (« kein Fieber ») ni dans le questionnaire standard ; plus une **liste relue** de mots d'examen (Anamnese, Befund, Therapie, Diagnose…) liés à **aucun** cas mais gardés dans le glossaire A→Z | 156 termes apparaissent dans > 20 % des cas ; « Erscheint in Fällen » est pollué |
| D2 | Fiche d'un terme (panneau latéral **et** dos de carte, même composant) : **Bedeutung** (signification courte d'origine, améliorée seulement si c'est une définition de dictionnaire) → « Définition complète » repliée → bloc **« Dans l'entretien »** : Le patient dit → Tu demandes (anamnèse) → Tu présentes (Vorstellung), chacun avec icône, libellé et **une ligne qui dit à quoi il sert** | l'examen attend une reformulation directe et retenable ; les registres sont un complément qu'il faut comprendre |
| D3 | Plus aucune étiquette « patientengerecht » ; un terme sans registre n'affiche que sa Bedeutung | l'étiquette était incomprise |
| D4 | ★ sur un mot hors glossaire ouvre une **mini-fiche** : mot (modifiable), **Bedeutung proposée par l'IA et modifiable**, **Contexte** = la seule phrase contenant le mot, mot surligné, **deck** (Favoris par défaut), bouton **Créer**. Fermer sans créer = rien n'est gardé | plus d'ordre ★/Expliquer à respecter ; la carte naît complète |
| D5 | Sélection de **plus de 4 mots** : la mini-fiche affiche les mots en pastilles, on **touche le mot à garder** ; la phrase devient le contexte | une phrase n'est pas une carte |
| D6 | **Une seule notion : les decks.** Favoris = deck par défaut ; ★ range dans Favoris ; la mini-fiche et la confirmation permettent d'en choisir un autre dans le même geste | favori/deck se chevauchaient |
| D7 | Après Créer (ou ★ sur un terme du glossaire) : confirmation qui **montre la carte en miniature**, avec « Voir la carte » (retourne) et « Changer de deck » | on ne voyait pas ce qui était créé |
| D8 | Carte personnelle **modifiable** depuis sa fiche (mot, Bedeutung) ; les anciennes cartes sans signification affichent « à compléter » | corriger après coup |
| D9 | Bouton **« Carte »** dans la fiche latérale : la fiche se retourne en carte (recto / verso) exactement comme au drill | voir la flashcard sans aller au drill |
| D10 | Suppression : **icône corbeille** + **Annuler** pendant quelques secondes (pas de confirmation bloquante) | le bouton texte était moche |

## 3. Modèle

### 3.1 Liaison cas ↔ termes (`scripts/linkCaseTerms.mjs`, `src/data/caseTermLinks.json`)

- **Négations** : une occurrence dans une proposition niée ne lie pas (« kein/keine/keinen/keinem/keiner », « ohne », « verneint », « nicht », « negativ », « unauffällig » dans la même proposition, avant ou juste après le terme). Règle pure, testée (`isNegated(sentence, matchIndex)`).
- **Questionnaire standard** : les réponses du patient aux sondes canoniques de l'anamnèse systématique (vegetative Anamnese, B-Symptome, Noxen, Allergien, Familie/Sozial) ne lient pas, sauf si le terme est aussi dans le diagnostic ou les constats (`medicalView`, `examinerSheet`, Muster hors sections d'antécédents).
- **Liste des mots d'examen** : `src/data/genericTerms.json` (ids), relue par `fsp-clinical-reviewer` ; ces ids ne sont liés à aucun cas.
- Sortie : même format ; l'ordre (diagnostic → core par DF → contextuel) inchangé.
- Validateur `checkCaseTermLinks.mjs` : seuil minimal par cas **revu** (mesuré après filtrage, documenté) ; aucun id générique lié ; `--check` inchangé.
- Effets : `CaseTermsPanel`, « Erscheint in Fällen », drill `?case=`, pertinence (termes du cas) lisent la même source. Le validateur du registre (`--require-all`) exige toujours un registre pour chaque terme **encore** lié ; les registres des termes déliés restent (affichés dans leur fiche).

### 3.2 Bedeutung (contenu)

- Champ `s` = Bedeutung. Un validateur `checkBedeutung.mjs` signale les `s` qui ressemblent à une définition (> 8 mots, ponctuation de phrase, mots-outils de définition : « bezeichnet », « versteht man », « Zustand, bei dem »…). Les termes signalés **et liés à un cas** sont reformulés par lots (content-case-author) en une expression courte et retenable (≤ 6 mots), relus langue + clinique. `def` (définition longue) inchangé, affiché replié.
- Pas de nouveau champ : `s` est amélioré en place ; l'ancienne valeur reste dans git.

### 3.3 Termes personnels (contrat `sync-protocol.md`)

- Création : `term.personal_created` inchangé, mais `explanation` devient la **Bedeutung** (obligatoire dans l'UI, non vide), `context` = **une phrase** (segmentation `splitSentence(text, matchIndex)`, ≤ 300 car.).
- Nouveau `term.personal_updated` (subject `pt-…`, payload `{ term?, explanation? }`) ; projection : dernier par `sortEvents` ; un changement de `term` ne change **pas** l'id (l'id reste celui de la création) ; migration SQL du check de type + zod `events` + `ProgressEventType` ; appliqué en EU + `events` redéployée **avant merge**.
- Rangement : Favoris reste `term.favorited` (deck réservé `deck-favorites`) ; un autre deck = `deck.term_added`. Aucun changement d'événement.

### 3.4 Composants

- `TermSheet` (nouveau, unique) : en-tête (terme, article, prononciation) · Bedeutung · Définition complète (repliée) · `TermUsage` (« Dans l'entretien », 3 lignes avec icône maison — pas d'emoji, pas d'icône stock — libellé, texte, ligne d'usage) · actions (★, deck, Carte, corbeille pour un terme personnel). Utilisé par le tiroir latéral, la carte au survol (version compacte), le dos du drill.
- `NewCardSheet` (nouveau) : mini-fiche de création (D4, D5), IA via `askBrief` (serveur d'abord, repli clé), état chargement / échec (« Écris la signification »), Créer désactivé tant que la Bedeutung est vide.
- `CardFlip` : la carte recto/verso du drill, extraite pour être réutilisée par la fiche latérale (D9).
- Confirmation (D7) : composant `CardToast` (miniature + 2 actions + Annuler pour la suppression) ; style minimal cohérent charte (le glass vient au chantier 2).
- `SelectionExplainer` : ★ ouvre `NewCardSheet` hors glossaire, toggle Favoris + `CardToast` dans le glossaire.

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Aucun terme de `genericTerms.json` lié à un cas ; un terme présent seulement dans « kein X » ou le questionnaire n'est pas lié ; « Fieber » reste lié à la pneumonie | tests `linkCaseTerms` + `--check` + CI |
| AC-2 | Chaque cas garde au moins le seuil minimal documenté de termes liés ; le diagnostic du cas est toujours lié | validateur |
| AC-3 | Fiche : ordre Bedeutung → Définition complète (repliée) → Dans l'entretien (3 usages dans l'ordre, chacun avec sa ligne d'usage) ; aucune occurrence de « patientengerecht » dans l'UI | tests composant + grep |
| AC-4 | ★ hors glossaire ouvre la mini-fiche avec Bedeutung proposée, Contexte = une seule phrase avec le mot surligné ; Créer impossible si Bedeutung vide ; fermer sans créer n'écrit rien | tests + navigateur |
| AC-5 | Sélection > 4 mots : pastilles, le mot touché devient le terme, la phrase le contexte | tests + navigateur |
| AC-6 | Confirmation avec miniature, « Voir la carte », « Changer de deck » ; ★ sur terme du glossaire = Favoris + même confirmation | tests + navigateur |
| AC-7 | Carte personnelle modifiable (mot, Bedeutung) ; synchronisée sur un 2ᵉ appareil ; anciennes cartes vides = « à compléter » | tests projection + navigateur 2 contextes |
| AC-8 | « Carte » dans la fiche latérale retourne la fiche en carte recto/verso identique au drill | tests + navigateur |
| AC-9 | Suppression par icône + Annuler (restaure la carte, ses decks et son SRS) | tests |
| AC-10 | Bedeutung des termes liés : `checkBedeutung.mjs` vert (aucune définition longue restante), lots relus langue + clinique | CI + rapports |
| AC-11 | `personal_updated` appliqué en EU + `events` redéployée avant merge ; mode public inchangé ; tests sans `.env` verts | MCP + CI |
| AC-12 | Charte actuelle respectée (44 px, tons, reduced-motion) — pas de refonte visuelle (chantier 2) | front-design-keeper |

## 5. Hors périmètre

Liquid glass, étoile cristal, onglets flottants des decks, motion premium (chantier 2) ; styles/ratios/éléments des cartes (chantier 3) ; notes par cas ; drill dans les deux sens.

## 6. Risques

| Risque | Parade |
|---|---|
| Filtrer trop : un cas perd ses termes clés | seuil minimal par cas + diagnostic toujours lié + relecture clinique de la liste générique |
| Détection de négation naïve (« kein Hinweis auf X, aber Y ») | portée limitée à la proposition (jusqu'à la virgule/conjonction), tests sur phrases réelles du corpus |
| Bedeutung « améliorée » qui trahit le sens | lots relus langue + clinique, `def` intact |
| IA indisponible à la création | champ vide + invite à écrire ; Créer bloqué tant que vide |
