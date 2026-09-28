# Fachbegriffe F4a — Clarté : termes vraiment liés aux cas, fiche lisible, cartes personnelles maîtrisées

Date : 2026-09-28 · Statut : validé en conversation par la direction ; red-team appliqué (10 constats) · Epic : #4 (suite) · Chantier 1/3 des retours du 28 sept. (2 = couche premium glass/motion, 3 = personnalisation des cartes)

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
| D6 | **Une seule notion : les decks.** Favoris = deck par défaut. ★ vide → range dans le deck choisi (Favoris présélectionné). ★ **plein = le terme est dans au moins un deck** ; toucher un ★ plein ouvre la confirmation qui liste ses decks (retirer d'un deck, en ajouter un). « Changer de deck » = **déplacer** (retiré de l'ancien, ajouté au nouveau) | favori/deck se chevauchaient |
| D7 | Après Créer (ou ★ sur un terme du glossaire) : confirmation qui **montre la carte en miniature**, avec « Voir la carte » (retourne) et « Changer de deck » | on ne voyait pas ce qui était créé |
| D8 | **Bedeutung modifiable** depuis la fiche d'une carte personnelle ; le **mot** ne se modifie pas (il fonde l'id qui évite les doublons) — pour changer le mot : supprimer, recréer. Anciennes cartes sans signification : « à compléter » | corriger après coup sans casser la déduplication |
| D9 | Bouton **« Carte »** dans la fiche latérale : la fiche se retourne en carte (recto / verso) exactement comme au drill | voir la flashcard sans aller au drill |
| D10 | Suppression : **icône corbeille** + **Annuler** pendant 5 s. La carte est masquée localement ; les événements de suppression ne partent qu'à l'expiration (ou `pagehide`). Annuler = rien n'est envoyé, SRS intact. Fermer l'app pendant le délai garde la carte | le journal est append-only : un « annuler » après coup remettrait le SRS à zéro |

## 3. Modèle

### 3.1 Liaison cas ↔ termes (`scripts/linkCaseTerms.mjs`, `src/data/caseTermLinks.json`)

Mesure de départ (red-team, corpus réel) : 16 248 liens ; 156 termes dans > 20 % des cas.

- **Champs exclus de la liaison** (par champ, pas par analyse de texte) : `patientSheet.antworten`, `antwortenEmotional`, `frageAntworten`, `negativeFindings` (les signes niés sont déjà structurés). Mesuré : −32 % de liens, minimum par cas 29.
- **Champs requalifiés en contextuels** (ne lient que si le terme est aussi dans un champ central) : `medicalView.differenzialdiagnosen`, les sections d'anamnèse systématique des Muster et de l'Arztbrief (vegetative Anamnese, Noxen, Allergien, Familie/Sozial, Vorerkrankungen — mêmes clés que `CONTEXTUAL_SHEET_KEYS`).
- **Négation dans les champs centraux** : mots de négation comme **tokens entiers** (kein/keine/keinen/keinem/keiner/keines, ohne, nicht, verneint, negativ, unauffällig, ausgeschlossen) — jamais dans un composé (« nichtsteroidal », « Nicht-ST-Hebungsinfarkt ») ; portée = la phrase ; une négation **en fin de phrase** (« … wurden verneint ») couvre toute l'énumération qui précède. Règle pure `isNegated(sentence, matchIndex)`, testée sur **≥ 20 phrases réelles** du corpus. Les termes du **diagnostic** échappent au filtre de négation.
- **Liste des mots d'examen** `src/data/genericTerms.json` (ids, formes dérivées incluses : Anamnese, anamnestisch, Therapie, therapeutisch, Diagnose, Diagnostik, Verdachtsdiagnose, Differenzialdiagnose, Befund, Prognose, Indikation, Symptom, Syndrom, invasiv, chronisch, akut…), relue par `fsp-clinical-reviewer` ; liée à aucun cas.
- **Seuil de spécificité** : un terme lié à > 20 % des cas après ces filtres n'est gardé dans un cas que s'il figure dans son diagnostic ou ses constats principaux (`medicalView.leitsymptome`/`befunde` ou équivalent — champs exacts fixés au plan après lecture du type).
- Sortie : même format ; ordre (diagnostic → core par DF → contextuel) inchangé.
- Validateur `checkCaseTermLinks.mjs` : **au plus 10 termes liés à > 20 % des cas** ; aucun id générique lié ; **minimum 8 termes par cas** (inchangé) ; le terme du diagnostic est lié **quand il existe dans le glossaire** — 6 cas n'en ont pas (gerd, oesophaguskarzinom, magenkarzinom, bandscheibenvorfall, tvt, opioidabhaengigkeit), listés en exception.
- Effets : `CaseTermsPanel`, « Erscheint in Fällen », drill `?case=`, pertinence lisent la même source. `--require-all` reste valide (les liens ne font que diminuer) ; les registres des termes déliés restent.

### 3.2 Bedeutung (contenu)

- `s` (→ `translationSimple`) = **Bedeutung** : reformulation directe et retenable. Il sert aussi de recto « Sens → terme » au drill, à la recherche (`query.ts`, `dictionary.ts` → `lookupTerm`) et d'indice dans la palette de commandes : toute réécriture passe un test de non-régression de la recherche et de `lookupTerm`.
- Validateur `checkBedeutung.mjs` : les `s` des termes liés de plus de 6 mots ou en phrase de définition sont signalés (mesuré : **38 termes liés > 6 mots**). Ces 38 sont reformulés (≤ 6 mots) en un lot relu langue + clinique. `def` inchangé, affiché replié.

### 3.3 Termes personnels (contrat `sync-protocol.md`)

- Création : `term.personal_created` inchangé ; `explanation` = **Bedeutung** (non vide dans l'UI) ; `context` = **une phrase** : l'offset vient du `Range` de la sélection, segmentation `Intl.Segmenter('de', { granularity: 'sentence' })` avec garde des abréviations du corpus (« z. B. », « Z. n. », « V. a. », « ca. », « bzw. »…), ≤ 300 car.
- Nouveau `term.personal_updated` (subject `pt-…`, payload `{ explanation }` **seulement**) ; projection : appliqué seulement s'il suit le dernier `personal_created` (ordre `sortEvents`), passé par `sanitizePersonalTerm`, une Bedeutung vide est ignorée. Migration du check SQL + zod `events` + `ProgressEventType` ; appliqué en EU + `events` redéployée **avant merge**.
- Suppression différée (D10) : `deletePersonalTerm` n'émet qu'à l'expiration du délai ; masquage local immédiat.
- Proposition de Bedeutung : nouveau type de requête IA `bedeutung` (serveur `ai` + prompt dans `_shared/prompts.ts`) : **texte brut ≤ 6 mots, sans emoji**, avec la phrase de contexte ; déclenché à l'ouverture de la mini-fiche (1 appel ; cache serveur 30 j par mot). `ai` redéployée avant merge.
- Rangement (D6) : Favoris = `term.favorited` (deck réservé) ; autres decks = `deck.term_added/removed` ; « déplacer » = retrait + ajout.

### 3.4 Composants

- `TermSheet` (nouveau, unique) : en-tête (terme, article, prononciation) · Bedeutung · Définition complète (repliée) · `TermUsage` (« Dans l'entretien », 3 lignes avec icône maison — pas d'emoji, pas d'icône stock — libellé, texte, ligne d'usage) · actions (★, deck, Carte, corbeille pour un terme personnel). Utilisé par le tiroir latéral, la carte au survol (version compacte), le dos du drill.
- `NewCardSheet` (nouveau) : mini-fiche de création (D4, D5), IA via `askBrief` (serveur d'abord, repli clé), état chargement / échec (« Écris la signification »), Créer désactivé tant que la Bedeutung est vide.
- `CardFlip` : la carte recto/verso du drill, extraite, prend `direction` ; le dos affiche la fiche complète (`TermSheet`) **en `term2simple` seulement** — en « Sens → terme », le dos montre le terme (la Bedeutung est déjà au recto). D9 utilise `term2simple`.
- Confirmation (D7) : composant `CardToast` (miniature + 2 actions + Annuler pour la suppression) ; style minimal cohérent charte (le glass vient au chantier 2).
- `SelectionExplainer` : ★ ouvre `NewCardSheet` hors glossaire, toggle Favoris + `CardToast` dans le glossaire.

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Au plus 10 termes liés à > 20 % des cas (156 aujourd'hui) ; aucun terme de `genericTerms.json` lié ; un terme présent seulement dans une négation, les réponses du questionnaire ou les diagnostics différentiels n'est pas lié ; `isNegated` vert sur ≥ 20 phrases réelles | tests `linkCaseTerms` + validateur + CI |
| AC-2 | Chaque cas garde ≥ 8 termes liés ; le terme du diagnostic est lié quand il existe dans le glossaire (6 exceptions listées) | validateur |
| AC-3 | Fiche : ordre Bedeutung → Définition complète (repliée) → Dans l'entretien (3 usages dans l'ordre, chacun avec sa ligne d'usage) ; aucune occurrence de « patientengerecht » dans le code UI (`app/src/components`, `app/src/features`) | tests composant + grep ciblé |
| AC-4 | ★ hors glossaire ouvre la mini-fiche avec Bedeutung proposée, Contexte = une seule phrase avec le mot surligné ; Créer impossible si Bedeutung vide ; fermer sans créer n'écrit rien | tests + navigateur |
| AC-5 | Sélection > 4 mots : pastilles, le mot touché devient le terme, la phrase le contexte | tests + navigateur |
| AC-6 | Confirmation avec miniature, « Voir la carte », « Changer de deck » ; ★ sur terme du glossaire = Favoris + même confirmation | tests + navigateur |
| AC-7 | Bedeutung d'une carte personnelle modifiable, synchronisée sur un 2ᵉ appareil ; mot non modifiable ; anciennes cartes vides = « à compléter » | tests projection + navigateur 2 contextes |
| AC-8 | « Carte » dans la fiche latérale retourne la fiche en carte recto/verso identique au drill | tests + navigateur |
| AC-9 | Suppression par icône + Annuler pendant 5 s : Annuler n'émet aucun événement (SRS, decks intacts) ; expiration ou `pagehide` → événements de suppression | tests |
| AC-10 | `checkBedeutung.mjs` vert (38 termes liés reformulés ≤ 6 mots, relus langue + clinique) ; recherche et `lookupTerm` sans régression | CI + tests + rapport |
| AC-11 | `personal_updated` appliqué en EU + `events` redéployée ; `ai` redéployée avec le type `bedeutung` (texte ≤ 6 mots, sans emoji) ; mode public inchangé ; tests sans `.env` verts | MCP + CI |
| AC-12 | Charte actuelle respectée (44 px, tons, reduced-motion) — pas de refonte visuelle (chantier 2) | front-design-keeper |

## 5. Hors périmètre

Liquid glass, étoile cristal, onglets flottants des decks, motion premium (chantier 2) ; styles/ratios/éléments des cartes (chantier 3) ; notes par cas ; changement du mot d'une carte personnelle.

## 6. Risques

| Risque | Parade |
|---|---|
| Filtrer trop : un cas perd ses termes clés | seuil minimal par cas + diagnostic toujours lié + relecture clinique de la liste générique |
| Détection de négation naïve (« kein Hinweis auf X, aber Y ») | portée limitée à la proposition (jusqu'à la virgule/conjonction), tests sur phrases réelles du corpus |
| Bedeutung « améliorée » qui trahit le sens | lots relus langue + clinique, `def` intact |
| IA indisponible à la création | champ vide + invite à écrire ; Créer bloqué tant que vide |
