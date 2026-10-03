# Audit du pont IA externe — série 3 (30 sept. 2026)

> Audit lecture seule sur `main`. Mesures faites sur le corpus réel (130 cas).

## 0. Deux « IA » distinctes, à ne pas confondre
- **IA externe (le sujet)** : `lib/externalAi/prompt.ts`, `lib/externalAi/targets.ts`,
  `features/simulation/ExternalAiSheet.tsx`, `features/simulation/PendingExternalSimCard.tsx`.
  Aucune clé, aucun appel réseau : on construit un texte, on l'ouvre/colle chez un tiers.
- **Assistant interne (hors sujet)** : `lib/aiModels.ts:14-21`, `lib/onlineAi.ts`,
  `lib/serverAi.ts:22`, `supabase/functions/_shared/aiChain.ts`. `lib/prompts.shared.ts`
  **n'existe pas** dans `app/src` (seul son test existe, `prompts.shared.test.ts:6`, qui
  teste `supabase/functions/_shared/prompts.ts`).
  **Les deux chaînes sont disjointes** : refondre l'IA externe n'a aucun impact sur l'interne.

## 1. « Ouvrir » n'ouvre rien — et le pré-remplissage est mort, c'est mesuré

### URLs réellement utilisées (`targets.ts:18-24`)
| Cible | `base` (ce qui s'ouvre) | `prefill` déclaré | `submits` |
|---|---|---|---|
| ChatGPT | `https://chatgpt.com/` (`:19`) | `?q=` | `true` |
| Claude | `https://claude.ai/new` (`:20`) | `/new?q=` | `false` |
| Gemini | `https://gemini.google.com/app` (`:21`) | **`null`** | `false` |
| Perplexity | `https://www.perplexity.ai/` (`:22`) | `/search?q=` | `true` |
| Grok | `https://grok.com/` (`:23`) | `?q=` | `false` |

### Le fait central
`buildLaunchUrl` (`targets.ts:27-32`) retombe sur `t.base` dès que l'URL encodée dépasse
`PREFILL_MAX = 6000` (`prompt.ts:30`).
**Mesure corpus : 0/130 cas (0 %) passent sous ce seuil.**

Donc `launch()` (`targets.ts:34-48`) ouvre **toujours la page d'accueil nue** + écrit le
presse-papiers. Tout l'appareillage `prefill` / `submits` / `prefilled` (`targets.ts:15,17,19-23,29-31`,
`ExternalAiSheet.tsx:78-79,100-101`, `targets.test.ts:10-21`) est **du code mort en
production** : il n'existe que pour des chaînes de test courtes.

Conséquences : le bouton dit toujours `Copier et ouvrir <IA>` (`ExternalAiSheet.tsx:79`) ;
le toast est toujours la branche dégradée (`:102`) ; les 4 étapes numérotées (`:158-167`)
et les `voiceHint` (`targets.ts:19-23`) documentent cette impuissance.
`opened: true` est **optimiste, jamais mesuré** (`targets.ts:36-38,45-47`) :
`window.open(..., 'noopener')` renvoie `null` qu'on ait ouvert ou qu'un bloqueur ait bloqué.

### App native : rien dans le dépôt
`grep` sur `lib/externalAi/` : **aucun** schéma (`chatgpt://`, `claude://`, `intent://`),
aucun `location.href`. Tout passe par `window.open(url,'_blank','noopener')` (`targets.ts:38`).
Sur mobile, l'universal link peut être capté par l'app installée — comportement OS non
contrôlé, et l'app reçoit alors l'URL **sans** le `?q=` (jamais émis).

### Ce qui NE PEUT PAS être vérifié depuis le dépôt — à vérifier à la source
Le commentaire `targets.ts:2-4` affirme « Vérifié 2026-09-17 : ChatGPT `?q=` pré-remplit ET
envoie ; Claude `/new?q=` pré-remplit ; Gemini n'a aucun paramètre ». **Aucun test ni trace
n'étaye cette affirmation** — `targets.test.ts:9-16` ne teste qu'une concaténation de chaînes.
À établir avant toute décision produit :
1. Paramètre de requête encore supporté et **limite de longueur effective** (URL et champ)
   pour chatgpt.com, claude.ai, perplexity.ai, grok.com ; existence d'un paramètre Gemini.
2. Schémas d'URL / universal links documentés des apps natives iOS et Android des 5 cibles,
   et **s'ils acceptent un texte initial**.
3. Comportement réel d'un collage très long dans chaque UI (conversion en pièce jointe,
   troncature silencieuse, refus).
4. CGU de chaque service sur l'ouverture programmatique et l'usage des marques/logos.

**Sans ces réponses, le seul mécanisme universellement fiable reste presse-papiers +
ouverture** — ce que le code fait déjà. La demande « prompt déjà collé » n'est réalisable
que si (1) ou (2) le permet.

## 2. UI — inventaire exact
- **Logos absents** : puces en texte nu (`ExternalAiSheet.tsx:130-135`). `components/icons.tsx`
  n'a **aucune marque d'IA** ; seule marque présente : `google` (`icons.tsx:97`), rendue par
  `Icon` avec `fill="none" stroke="currentColor"` (`:106-113`) — un logo plein s'afficherait
  en contour, sauf à faire comme `doctopus` (`:101`) qui force `fill`/`stroke` en ligne.
  `app/public/` ne contient que `favicon.svg`, `logo.svg`, `logo-white.svg`.
  **Manque : 5 glyphes de marque + une convention de rendu `fill` dans `Icon`.**
- **Bouton copier sans icône** : `ExternalAiSheet.tsx:179` est un `btn-outline` texte nu,
  alors que `copy` (`icons.tsx:93`), `check` (`:62`) et `external` (`:92`) existent et sont
  inutilisés ici. Le bouton principal, lui, porte `spark` (`:180`).
- **Mémorisation : existe mais partielle.** `loadPrefs`/`savePrefs` (`targets.ts:52-66`, clés
  `externalAi.target|scope|feedbackLang`) sont câblés (`ExternalAiSheet.tsx:39-46`). Deux
  défauts : `savePrefs` n'est appelé que dans `go()` (`:91`) — changer d'IA puis cliquer
  **« Copier le prompt »** (`:108-111`) ne persiste **rien** ; et l'état initial est codé en
  dur `'chatgpt'` (`:24`) avant l'arrivée asynchrone des prefs → premier rendu toujours
  ChatGPT, puis saut. L'ordre des puces est figé à la première charge (`:29-31,44`).
- **Zéro animation** : `ExternalAiSheet.tsx:115-117`, overlay et dialogue apparaissent d'un
  coup. Les tokens existent et servent ailleurs (`Doctopus.tsx:110` `animate-pop`,
  `CaseTermsPanel.tsx:69` `animate-slide-in`, `CardToast.tsx:17`). Manquent aussi : transition
  de sélection de cible, état « copié » animé (le `check` n'apparaît jamais), toast non animé
  (`:174`).

## 3. Choix superflus — coût réel du retrait
- **`Scope`** : `prompt.ts:24` (`'anamnese' | 'exam' | 'exam+feedback'`), libellés `:37` ;
  UI `ExternalAiSheet.tsx:138-145`, état `:25`, reset `:56`.
- **`FeedbackLang`** : `prompt.ts:25` ; UI `ExternalAiSheet.tsx:147-156`, état `:26`.
- **Défauts** : `targets.ts:51` → `scope: 'exam+feedback'`, **`feedbackLang: 'fr'`**.
  Le défaut de langue est donc **le français** — contraire à la consigne. Rendu `prompt.ts:179`.

| Dépendance | `fichier:ligne` | Nature |
|---|---|---|
| Branches de règles de rôle | `prompt.ts:207-211` | logique prompt |
| Inclusion de Teil 3 | `prompt.ts:222` | logique prompt |
| Inclusion du bloc Feedback | `prompt.ts:223` | logique prompt |
| `oberarzt(..., withFeedback)` | `prompt.ts:160,171` | logique prompt |
| `feedback(lang, topTerms)` | `prompt.ts:178-189` | logique prompt |
| Mots de bascule dans l'UI | `ExternalAiSheet.tsx:69-73` | UI |
| Persistance | `targets.ts:50-66` (3 clés `meta`) | **données utilisateur** |
| Trace de séance | `targets.ts:68` `PendingExternalSim.scope` | **données persistées** |
| Carte de retour | `PendingExternalSimCard.tsx:25-26,64-65,79-80` | **métier + écriture `simulations`** |
| Tests | `prompt.test.ts` (11 occ.), `targets.test.ts:34-41`, `ExternalAiSheet.test.tsx:27-28`, `PendingExternalSimCard.test.tsx` (7 occ.) | ~22 réécritures |

**Verdict.** Retirer la **langue** est quasi gratuit (~5 fichiers, 0 migration ; une clé
`meta` orpheline est inoffensive). Retirer **`Scope`** est **plus cher qu'il n'y paraît** :
c'est le discriminant qui pilote l'auto-évaluation post-séance et donc ce qui est écrit dans
`simulations` (`teil` vs `full`). La bonne sortie est de le **remplacer par le Teil d'où la
feuille a été ouverte** (§5) — ça sert les deux besoins. Les traces `externalAi.pending`
déjà posées (≤ 12 h, `PendingExternalSimCard.tsx:36`) contiennent un `scope` : prévoir une
lecture tolérante.

## 4. Prompts — longueur et structure mesurées

```
scope exam+feedback, 130 cas :
n=130  min=11 864  médiane=31 906  max=44 231 caractères
≤ PREFILL_MAX(6000)  = 0/130   (0 %)
≤ PROMPT_MAX(56000)  = 130/130 (100 %) → niveau 'full' partout, cascade jamais déclenchée
```
Tokens approximatifs (allemand, ~3–3,6 car./token — estimation, pas un tokenizer) :
**min ≈ 3 300–4 000, médiane ≈ 8 900–10 600, max ≈ 12 300–14 700 tokens**, à coller en
**un seul message**.

Poids de Teil 3 : sur `data/seedCases.ts`, les `reaktion` totalisent **1 013 281 caractères**
(≈ 7 800/cas) et les `frage` d'examinateur **260 607** (≈ 2 000/cas) — soit **~10 k car./cas,
≈ 30 % du prompt médian**, uniquement pour Teil 3.

**Structure produite** (`prompt.ts:200-227`) : `# Rolle` (`:201-211`) → `# Wer du bist`
(`:213-217`) → `# Was du weißt` (tout le Rollenskript, `:219-220`) → `# Schwierige Momente`
(`:221`) → `# Teil 3 – Oberarzt` (`:222`→`:169-175`) → `# Feedback` (`:223`→`:180-188`) →
`# Start` (`:225-226`).

### Défauts de structure
1. **Trois rôles antagonistes dans un seul message** : patient (`:202-206`), Oberarzt (`:171`,
   « Die Patientenregeln oben gelten jetzt nicht mehr »), correcteur qui « verlässt jede
   Rolle » (`:182`). Le modèle doit arbitrer sur mots-clés (`Fallvorstellung`, `Feedback`,
   `Ende`) — **premier facteur de refus** (« je ne peux pas jouer un patient et l'évaluer »).
2. **Fuite du diagnostic dès le tour 0** : `DIAGNOSIS_NOTE` (`:87`) dit « seul l'Oberarzt sait
   cela », mais le texte est **dans le même message** que le rôle patient, et les
   `(erwartet: …)` (`:165`, commentaire `:156-159`) **peuvent nommer le diagnostic**. Le test
   corpus ne garantit qu'une **non-fuite textuelle avant le marqueur Teil 3**
   (`prompt.corpus.test.ts:97-106`, 16 fuites « tolérées » comptées) — pas une non-fuite
   d'inférence. **Cause la plus probable des « hallucinations ».**
3. **Instructions contradictoires** : `:203` « Antworte auf das, was gefragt wird » ET, dans
   la même puce, « Was die Regieanweisung dir vorgibt … sprichst du von dir aus an » ; `:205`
   « Erfinde keine neuen Fakten … sag *Das weiß ich nicht* » contre la régie qui demande
   d'initier.
4. **Prompt multilingue** : la `persona` est injectée **en français** au milieu d'un prompt
   allemand, avec consigne de ne pas la lire (`:215`) ; feedback demandé en français par
   défaut (`:179`, `targets.ts:51`). Déclencheur classique de fuite (le modèle cite la régie).
5. **Premier tour ambigu** (`:226`) : « Antworte … nur mit *Bereit.* und warte auf die
   Begrüßung. **Dann** stell dich mit einem Satz vor. » Deux comportements pour un seul tour →
   le modèle enchaîne les deux et **vole la salutation au candidat**, qui est l'objet de
   l'exercice.
6. **Évaluation impossible demandée** : juger le **Konjunktiv I** « correct / manquant / faux »
   (`:183`) sur une conversation **orale non transcrite** dont le modèle a produit la moitié ;
   vérifier a posteriori 8 Fachbegriffe sur 20–30 min (`:185`) ; « 3 Stärken, 3 Baustellen »
   (`:187`). Grille de correcteur humain appliquée à un partenaire de jeu.
7. **Bornes mal calibrées** : `PROMPT_MAX = 56000` (`:36`) est dimensionné pour que la cascade
   de compaction (`:228-232`) **ne se déclenche jamais** (130/130 en `'full'`). Second bloc de
   code jamais exercé en production.

**Causes de blocage, par vraisemblance** : (a) longueur — 9–15 k tokens en un message, que
plusieurs UI convertissent en pièce jointe ou tronquent (**à vérifier à la source**) ;
(b) rôle ambigu ×3 avec auto-évaluation → refus ; (c) diagnostic dans le contexte →
hallucination orientée ; (d) premier tour non déterministe → le modèle joue tout seul.

## 5. Invocation depuis l'intérieur de la simulation

**État actuel** — 4 points d'entrée, tous via `useUi.openExternalAi(caseId)`
(`store/ui.ts:62-63,125-127` — signature **`caseId` seul**) :
`SimulationSetup.tsx:94` (écran amont, le cas critiqué) · `CaseDetailPage.tsx:48` ·
`SimulationRunner.tsx:275` (**déjà dans le runner**, mais dans la barre d'en-tête globale :
visible aussi pendant `dokumentation` et `aufklaerung`, et **aveugle au Teil courant**) ·
`SimulationRunner.tsx:598` (écran de résultat).

**Le point d'ancrage existe déjà** : `type Part` (`SimulationRunner.tsx:32`), `flow` (`:34-36`),
état `active` (`:59`), rendu par partie dans `PlayArea` (`:450-456` — `part === 'anamnese'` →
`AnamneseArea` `:453` ; `part === 'fallvorstellung'` → `VorstellungGuide` `:455`).

Ancrage minimal, en 3 points :
1. Élargir `openExternalAi(caseId, teil?)` (`store/ui.ts:63,126`) et stocker le Teil à côté
   d'`externalAiCaseId` (`:62,125`).
2. Placer le déclencheur **dans `PlayArea`**, conditionné à
   `part === 'anamnese' || part === 'fallvorstellung'`, et restreindre/supprimer la puce
   d'en-tête `:275`.
3. Dans la feuille, **dériver** le contenu du Teil reçu au lieu de le demander (supprime le
   radiogroup `:138-145`) et propager ce Teil dans `setPending` (`:91`) pour que
   `PendingExternalSimCard.tsx:64-65,79-80` continue de mapper `scope`/`teil`.

**Obstacle bloquant.** Il n'existe **aucun scope produisant uniquement le rôle Oberarzt** :
`'exam'` (`prompt.ts:222`) = tout le script patient **+** Teil 3. Ancrer la feature au Teil
Fallvorstellung enverrait donc ~20 k caractères d'anamnèse inutiles à une IA qui ne doit
jouer que le senior. **Un mode « Oberarzt seul » (`prompt.ts:169-175` + un `# Rolle` dédié,
sans `# Was du weißt`) est un prérequis du point 5 — et il divise le prompt par ~3, ce qui
sert directement le point 4.**
