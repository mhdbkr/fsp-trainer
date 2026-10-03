# C3 — Le pont vers l'IA externe : rapport de `lead-s3-ia`

> Branche `feat/s3-ia`, worktree `doctopus-s3-ia`, base `main` @ `d74c2ae`.
> 3 oct. 2026. Contrat : `docs/contracts/ai-bridge.md`. Faits sources :
> `app/docs/reports/lead-s3-ia-sources.md` (commité avant tout code).

## 1. Commits

| Commit | Unité |
|---|---|
| `58246ff` | Faits sources (étape 1), avant toute ligne de code |
| `ae51259` | Prompt : deux temps, un seul rôle, pas de fuite du diagnostic, mode Oberarzt seul |
| `56f010c` | Cibles ChatGPT et Gemini, capacités sourcées, libellé pur, mémoire, trace tolérante |
| `0e117f0` | `TeilAiLauncher` : le lanceur autonome |
| `09e5780` | `ExternalAiSheet` réduite à une coquille autour du panneau du lanceur |
| `37490b5` | `PendingExternalSimCard` : Teil d'ancrage, séance auto-déclarée |
| `aa047c3` | Correctifs relevés au navigateur (ordre d'allumage, débordement à 390 px) |
| `0fb616f` | Ce rapport |
| `e161b9a` → `7238cd0` | Corrections de la revue indépendante, un commit par item (§9) |

Vérifié par code de sortie après la revue : `npx tsc -b --noEmit` → 0 ;
`npx vitest run --dir src/lib/externalAi` → 0 (23 tests) ;
`npx vitest run --dir src/features/simulation` → 0 (31 tests). En parallèle, sous une charge machine de 27 (autres agents), deux
tests différents à chaque passage dépassent le délai de 5 s sur leur premier
rendu. En série, tout passe. C'est la charge, pas le code, mais la CI doit le
confirmer.

## 2. Faits sources (résumé ; détail et citations dans `lead-s3-ia-sources.md`)

| Question | ChatGPT | Gemini |
|---|---|---|
| Paramètre de pré-remplissage | `?q=` reconnu par OpenAI dans son fichier de liens universels (**établi**). Il remplit le champ selon des sources tierces (**indirect**). **Limite de longueur non mesurable** : Cloudflare bloque les outils automatiques. | Aucun paramètre (**indirect**, plusieurs sources concordantes). |
| Ouvrir l'app | `https://chatgpt.com/#native` ouvre l'app iOS sur une conversation neuve (déclaré par OpenAI). Android : l'app est autorisée sur le domaine ; les chemins qu'elle intercepte ne sont pas publiés. | Aucun lien de conversation dans le fichier iOS. L'app Android est autorisée sur le domaine, sans plus de précision. |
| Texte initial dans l'app | Non établi | Non |
| Collage long | Plus de 10 000 caractères ⇒ **pièce jointe** (notes de version OpenAI, 22 juin 2026) | Non établi |
| Logo | Autorisé sous conditions (règles de marque OpenAI) | **Demande d'autorisation obligatoire** (icônes produit Google) |

**Ce que ça décide.** Les deux cibles sont au **niveau 2** : le prompt est copié
dans le geste, l'app s'ouvre par un vrai lien, et la confirmation n'apparaît
qu'après une copie réussie. Rien ne promet un pré-remplissage. **Noms seuls**,
pour les deux cibles : un logo ChatGPT à côté du simple mot « Gemini » avantagerait une
marque, et l'icône Gemini exige l'accord de Google. Aucun glyphe n'a été ajouté à
`icons.tsx`, et `app/public/` n'a pas changé.

**Pour que « le prompt arrive déjà collé » dans ChatGPT**, il ne manque qu'une
mesure de 5 minutes par la direction, dans un vrai navigateur connecté. Le
protocole est au §6 des sources. Une fois `maxPrefillChars` et la preuve
renseignés, le libellé passe tout seul au niveau 1 : `launchPlan` est pur et
testé sur toute la table de capacités.

## 3. Le prompt — avant / après, mesuré sur les 130 cas

| | Avant | Après |
|---|---|---|
| Structure | 3 rôles dans un seul message (patient, Oberarzt, correcteur) | **1 rôle**, choisi par le Teil |
| Amorce | aucune ; premier tour « Bereit. … Dann … » | min 646 · médiane 725 · p90 772 · **max 821** (≤ 900) |
| Texte collé, Anamnese | portée `anamnese` : min 9 697 · médiane 17 989 · max 22 890 | **patient** : min 2 897 · médiane **8 307** · p90 9 580 · max 11 873 |
| Texte collé, complet | `exam+feedback` : min 11 864 · médiane **31 906** · max 44 231 | **Oberarzt** : min 1 280 · médiane **5 713** · p90 6 508 · max 7 627 (≤ 8 000, O2) |
| Diagnostic en mode patient | dans le message dès le tour 0 (+ 16 fuites « tolérées ») | **0** : aucune chaîne de `medicalView`, aucune tête de diagnostic, aucune justification « (gegen …) » |
| Langue | régie `persona` en français, feedback en français par défaut | allemand seul (test INV-36 sur 260 textes) |
| Évaluation demandée | Konjunktiv I, Fachbegriffe, 3 forces / 3 points faibles | aucune (A4) |

**Patient (Teil Anamnese).** Le texte reprend les faits de la fiche patient, et
seulement eux : les répliques en verbatim, chapitre par chapitre, sans la
question. Il exclut `medicalView`, la `persona` française et les négatifs, qui
portent la justification différentielle (« (gegen Perikarditis) »). Les
répliques qui ne font que nier sont retirées aussi : l'amorce pose la règle
« ce qui n'est pas dans l'Akte, tu ne l'as pas ». Le texte finit sur
`Meine Begrüßung:` : **le candidat salue en premier**, dans le même message,
puis l'IA répond par sa première réplique de patient. Un seul comportement par
tour (A6).

**Oberarzt (Teil Fallvorstellung).** Le texte donne :
- `## Der Fall` : les faits structurés de la fiche (identité, âge, sexe,
  métier, antécédents, opérations, traitements, allergies, noxes). Ce sont des
  données du dossier, pas des répliques : O1 tient. Ajouté en revue (I3).
- le diagnostic, les différentiels, les Leitbefunde ;
- les questions de l'examinateur, dans l'ordre.

Il ne contient pas le script du patient (O1), et l'amorce ne dit jamais
« Patient » (A5). L'Oberarzt ouvre en demandant la présentation du cas.

**Écart au contrat §2.5.** Le contrat met `c.examinerSheet` dans l'Akte, réponses
attendues comprises. Elles en sont retirées **pour la taille**, pas pour O1 :
elles pèsent à elles seules médiane 8 575, max 17 530 caractères (mesure du
relecteur). Avec elles, O2 (≤ 8 000) et le seuil de pièce jointe de ChatGPT
seraient dépassés pour la plupart des cas. L'IA juge les réponses avec son
propre savoir médical, guidée par le diagnostic et les différentiels.

**Code mort supprimé** : la cascade de compaction (`PROMPT_MAX`, niveaux
`a`/`ac`), `PREFILL_MAX`, `buildLaunchUrl`, `launch()` et son `opened: true`,
`Scope`, `FeedbackLang`, le bloc Feedback, `DIAGNOSIS_NOTE`, `stripFrenchDirections`,
les 3 cibles retirées.

## 4. Le lanceur — `app/src/features/simulation/ai/TeilAiLauncher.tsx`

- **Au repos** : un bouton discret, « Avec ton IA » (icône spark).
- **Ouvert** : un panneau `.glass glass-edge` en portail, recalé à 16 px des
  bords. Il contient :
  1. **Trois temps animés.** Patient : « On prépare le patient → L'IA l'incarne
     → Tu mènes l'entretien ». Oberarzt : « On prépare l'Oberarzt → L'IA le joue
     → Tu présentes le cas ». La piste se trace (1,1 s), les étapes s'allument
     dans l'ordre (délais 50 / 600 / 1 150 ms, mesurés dans le DOM), et un point
     de signal corail la parcourt une seule fois. Rien ne boucle.
  2. **ChatGPT / Gemini**, avec un indicateur qui glisse en 320 ms. Courbe
     mesurée image par image : 163 → 142 → 117 → 84 → 52 → … → 5 px. Les flèches
     du clavier fonctionnent aussi.
  3. **Le choix est mémorisé dès le changement de cible**, et à chaque
     copie ou ouverture. Il est rappelé à l'ouverture avec « comme la dernière
     fois ». Les cibles ne s'affichent qu'une fois la mémoire lue : plus de saut
     depuis ChatGPT. Une ancienne cible retirée (`claude`…) est oubliée.
  4. **« Copier et ouvrir ChatGPT »** est un vrai lien `<a target="_blank">`.
     Sur iOS, ce lien ouvre l'app. La copie démarre dans le même geste, avant
     que la page ne perde le focus.
  5. **Bouton Copier avec icône** : l'icône copier laisse place à une coche
     animée, avec le libellé « Copié ». Largeur fixe, donc rien ne saute ; icône
     seule sous `sm`.
  6. **Confirmation** affichée seulement après une copie réussie : « Prompt
     copié — colle-le dans ChatGPT, écris ta salutation, envoie. » En cas
     d'échec : « Copie impossible… », avec le texte sélectionné dans une zone de
     lecture.
- **Mouvement réduit** : la feuille de style du composant
  (`ai/teilAi.css`) neutralise **durées et délais**. Mesuré : 0 animation, les
  légendes à opacité 1, le signal masqué.
- **Mesuré au navigateur** (Chromium sans tête, page de vérification locale non
  commitée, lecture du DOM de l'app) : 1 280 px clair, 390 px clair et sombre,
  Anamnese et Fallvorstellung, mouvement réduit. Deux défauts trouvés de cette
  façon, puis corrigés (`aa047c3`) :
  - la première étape s'allumait en dernier, parce que `nth-child` comptait la
    piste et le signal ;
  - le panneau débordait à 390 px (`scrollWidth` 485).

`ExternalAiSheet` (montée dans `Shell`, ouverte par `useUi.openExternalAi`
depuis la fiche du cas, l'écran amont et le résultat) rend le même panneau,
avec le Teil Anamnese. Le choix de forme et le choix de langue ont disparu.

## 5. Contrat de montage dans `PlayArea` (pour `main`)

```tsx
import { TeilAiLauncher } from './ai/TeilAiLauncher';

// dans PlayArea, ligne d'outils du Teil courant :
{(part === 'anamnese' || part === 'fallvorstellung') && (
  <TeilAiLauncher caseId={c.id} teil={part} />
)}
```

- Props : `caseId: string`, `teil: 'anamnese' | 'fallvorstellung'`. Le
  composant ne dépend pas du store : il lit le cas (Dexie) et la cible
  mémorisée, et pose `meta.externalAi.pending` avec le Teil.
- Le composant rend un bouton en ligne ; son panneau vit dans un portail
  (`fixed`, `z-50`). Le parent n'a besoin ni de `relative` ni d'`overflow`.
- À retirer au montage (contrat §3.1) : la puce d'en-tête globale
  `SimulationRunner.tsx:275` (« Continuer avec ton IA »), qui reste visible
  pendant Dokumentation et Aufklärung sans connaître le Teil.
- Test à écrire par `main` (contrat §8) :
  `PlayArea.externalAi.test.tsx`. Le déclencheur existe en Anamnese et en
  Fallvorstellung, et seulement là.
- `useUi.openExternalAi(caseId)` reste inchangé (hors périmètre) et ouvre la
  feuille en Anamnese.

## 6. Le retour — `PendingExternalSimCard`

- La carte suit le Teil d'ancrage. Un Teil seul ⇒ seule cette partie est
  évaluée, avec toute la durée ; `simulations.scope = 'teil'` et `teil` est
  posé. Une ancienne trace sans Teil ⇒ séance complète, avec deux tiers de la
  durée pour l'anamnèse et un tiers pour la Fallvorstellung.
- Lecture tolérante (`readPending`) : `scope: 'anamnese'` ⇒ Teil Anamnese ;
  `exam` et `exam+feedback` ⇒ séance complète. Testé avec une trace `claude`
  posée par l'ancien code.
- La carte affiche : « Séance auto-déclarée : elle compte dans ton historique et
  ta série. » Vrai aujourd'hui (`computeStreak`, `stats.ts:90`). La suite
  « …, pas dans l'indice de préparation » est retirée en revue (I1) : elle
  serait **fausse** tant que `saveSimulation` recalcule la confiance et que
  `computeReadiness` ne filtre pas le mode. Elle reviendra quand le chantier
  Programme la rendra vraie (commentaire dans le composant).

## 7. Ce qui est prouvé, ce qui ne l'est pas

**Prouvé** (test ou mesure) :
- INV-30 à INV-32, INV-34 et INV-36, sur 130 cas × 2 Teile ;
- INV-33 : table capacité × longueur × fraîcheur ;
- la mémoire de la cible, la trace posée avec le Teil, la lecture tolérante ;
- la copie réussie ou refusée ;
- au navigateur : l'animation, la sélection, le mouvement réduit, 390 px sans
  défilement horizontal, le mode sombre.

**Non prouvé** :
- le pré-remplissage ChatGPT et sa limite (bloqué par Cloudflare ; protocole
  dans les sources §6) ;
- l'effet de `#native` dans ChatGPT sur ordinateur (le fragment est
  vraisemblablement ignoré, non observé) ;
- l'ouverture effective des apps natives depuis Doctopus sur un iPhone ou un
  Android réels ;
- la copie dans Safari iOS au moment où le lien ouvre l'app (vérifiée dans
  Chromium seulement) ;
- le comportement de Gemini au collage d'un long texte ;
- **la qualité du jeu des IA elles-mêmes** : aucune séance réelle n'a été
  jouée dans ChatGPT ou Gemini. C'est la prochaine preuve à apporter, sur
  2 cas de nature différente (CAP et non-douleur).

## 8. Écarts au contrat et points pour l'intégration

1. **D1 à la lettre est inapplicable.**
   - `c.name` est aujourd'hui un **titre-symptôme** (« Brennen beim
     Wasserlassen »), que le patient doit dire.
   - `Fachbegriff` n'a **aucun niveau « diagnostic »**.

   Ce qui est appliqué à la place, à zéro tolérance :
   - la tête du diagnostic retenu n'apparaît jamais ;
   - aucune chaîne de `medicalView` n'apparaît, sauf si elle figure aussi dans
     la fiche patient ;
   - aucune justification « (gegen …) » ;
   - la pathologie n'apparaît jamais dans le gabarit.

   **Deux cas** gardent le nom de la pathologie **dans la bouche du patient**,
   parce que c'est son propre savoir :
   - `case-migraene` : « das sei Migräne », dit par le médecin traitant ;
   - `case-lungenembolie` : « meine Mutter ist an einer Lungenembolie
     gestorben ».

   Les retirer effacerait l'indice que le candidat doit trouver. Validé en
   revue ; la liste est désormais un **cliquet bloquant** dans le test corpus.
2. **PASTE_MAX plutôt que O3.** Le seuil de 10 000 caractères (pièce jointe
   ChatGPT) est plus strict que O3 (12 000). Les 130 cas tiennent O3. 5 cas
   patient dépassent encore 10 000 caractères, gelés par un cliquet dans le
   test :
   - `delir`
   - `karpaltunnel`
   - `metabolisches-syndrom`
   - `pankreaskarzinom`
   - `ulcus-cruris`

   Leurs répliques sont les plus longues du corpus. Les raccourcir relève du
   **pôle Contenu**. Pas de compaction à la volée : le contrat l'interdit.
3. **Faits structurés (« coup d'œil ») écartés** des chapitres secondaires :
   mesuré, ils font entrer des diagnostics nommés (Asthma bronchiale, Erysipel,
   Magenkarzinom…) et du registre médical.
4. **INV-11 non tenu aujourd'hui.** La carte écrit via `saveSimulation` avec
   `mode: 'external-ai'`, qui recalcule la confiance du cas
   (`lib/simulationSave.ts:62-73`, hors périmètre) ; `computeReadiness` ne
   filtre pas le mode. Le journal (`training-journal.md`) dérive
   `selbstbewertet` de ce mode. À tenir par le chantier Programme / Journal à
   l'intégration ; la carte ne promet plus rien à ce sujet (I1).
5. **Noms de champs de la trace.** On garde `targetId` / `at` (traces existantes)
   au lieu de `target` / `startedAt` (contrat §5) : aucune migration, la
   lecture reste tolérante.
6. **Tests regroupés.** `capability.test.ts` et `launchLabel.test.ts`
   (contrat §8) vivent dans `targets.test.ts`.
7. **Charte.**
   - `.glass` porte encore une ombre portée sur `main`. Le chantier Primitives
     la retire : rien à faire ici.
   - `.btn-glass` et `.panel` ne sont pas utilisés.
   - Le panneau suit le contrat « popover = `.glass glass-edge` ».
8. **Documents périmés, hors périmètre.**
   - `app/scripts/e2e/external-ai.spec.md` décrit encore `PREFILL_MAX` et les
     5 cibles.
   - Le contrat lui-même (Q8, §3.4 « 5 cibles ») est à mettre à jour par
     `platform-architect`.
9. **Répliques conditionnelles gardées (écart au contrat §2.3).**
   « Wenn es schwierig wird » contient des répliques mises en scène
   (« (auf die Ankündigung einer CT) „Muss das sein?“ »). Le contrat veut des
   faits, « jamais comme scénario ». Décision de `main` : on les **garde**,
   elles font réagir l'IA comme un vrai patient aux moments durs. `main`
   amendera le contrat.
10. **Type `externalTarget` (proposition, `db/types.ts` hors périmètre).**
   `Simulation.externalTarget: TargetId` vaut désormais `'chatgpt' | 'gemini'`,
   mais les simulations déjà enregistrées portent `'claude'`, `'perplexity'`,
   `'grok'` : le type ment sur les anciennes données. Proposition :
   `externalTarget?: TargetId | LegacyTargetId`, avec
   `type LegacyTargetId = 'claude' | 'perplexity' | 'grok'` exporté de
   `lib/externalAi/targets.ts`. `SimulationHub` affiche déjà l'identifiant brut
   en repli.
11. **Graphe.** `graphify update app/src` n'a pas été lancé depuis ce worktree.
   C'est à faire après le merge.

## 9. Revue indépendante de `0fb616f` — corrections

Un test rouge d'abord, puis un commit par item.

| Item | Constat | Correction | Commit |
|---|---|---|---|
| I1 | La carte promettait « pas dans l'indice de préparation », faux aujourd'hui | Phrase réduite à ce qui est vrai (historique et série) ; commentaire pour la rétablir à l'intégration | `e161b9a` |
| I2 | `launchPlan` ignorait `autoSubmits` : un `?q=` qui envoie seul partirait avec la salutation vide | `capabilityProblems` refuse `AUTO_SUBMIT` ⇒ jamais de niveau 1 ; ligne ajoutée à la table. Statut rendu pur (`launchStatus`) : au niveau 1 ouvert, un échec de la copie de secours ne dit plus « Copie impossible » | `21e0fcd` |
| I3 | L'Oberarzt ignorait les faits du cas | `## Der Fall` depuis les champs structurés ; Oberarzt min 1 280 · médiane 5 713 · max 7 627. Un négatif repris dans un champ structuré (`case-morbus-crohn` : « keine Bauchoperationen… ») compte comme fait du dossier dans O1 | `89ce5b9` |
| M6 | `case-delir` : 44 répliques « Die Tochter: … » sans cadre | Ligne d'amorce « Deine Tochter ist dabei und antwortet manchmal für dich… » quand la fiche contient des répliques d'un proche ; équivalence vérifiée sur les 130 cas | `e859558` |
| M5 | Relevé non bloquant des cas où le patient nomme sa pathologie | Cliquet bloquant `['case-lungenembolie', 'case-migraene']` | `34511e9` |
| M7 | `getPending` sans appelant | Supprimé ; `readPending` seule lecture | `b2a5b9b` |
| M1 | Lien activable au clavier avec texte vide | `preventDefault` tant que le texte n'est pas prêt | `d10ba12` |
| M2 | Pas de focus à l'ouverture | Focus sur la cible cochée (lanceur et feuille) | `33c497f` |
| M4 | Flèches Haut/Bas absentes | Haut/Bas = Gauche/Droite | `daba6d4` |
| M3 | Le panneau pouvait sortir par le bas | Hauteur bornée à l'espace disponible ; ouverture au-dessus s'il reste moins de 320 px en bas (vérifié en jsdom, pas au navigateur) | `7238cd0` |
| M9 | Chiffres du rapport | Alignés sur la mesure actuelle (§3) | ce commit |
| M8, M11 | Type `externalTarget`, répliques conditionnelles | Proposition et écart notés (§8, points 9 et 10) | ce commit |
| M10, I4 | Ombre de `.glass`, montage dans `PlayArea` + retrait de la puce `SimulationRunner.tsx:275` | Laissés à `main`, à l'intégration | — |
