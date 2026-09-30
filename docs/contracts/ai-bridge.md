# Contrat — Le pont vers une IA externe

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-ai-externe-serie3.md`.
> Dépend de : `docs/contracts/simulation-run.md` (point d'ancrage),
> `docs/contracts/training-journal.md` (chemin de retour).
> Consommé par : C3 (pont IA), C2 (montage dans `PlayArea`).

**Périmètre.** L'IA **externe** uniquement : `lib/externalAi/*`,
`features/simulation/ExternalAiSheet.tsx`, `PendingExternalSimCard.tsx`.
L'assistant **interne** (`lib/onlineAi.ts`, `lib/serverAi.ts`,
`supabase/functions/_shared/aiChain.ts`) n'est pas concerné : les deux chaînes
sont disjointes (audit §0).

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q8** | Quelles cibles restent proposées, et **a-t-on le droit d'afficher leurs logos** (CGU, marques) ? | Les 5 cibles actuelles restent, **en texte**, sans logo. Aucun glyphe de marque n'est ajouté à `icons.tsx` avant réponse à Q8 et vérification §4 point 4. |
| **Q9** | Une séance jouée dans une IA externe, auto-déclarée au retour, compte-t-elle dans l'indice de préparation ? | Non — voir `training-journal.md` Q3. `selbstbewertet: true`, historique et temps investi seulement. |
| **Q10** | Le candidat peut-il **coller la transcription** au retour pour cocher la checklist automatiquement ? | Non construit. Le retour est une auto-déclaration simple (§6). Le collage de transcription est hors périmètre de C3. |

---

## 1. La règle fondatrice

> **On n'affiche jamais une promesse que la cible ne tient pas.**

Forme opposable : le libellé, l'icône et le texte d'aide du bouton de lancement
sont une **fonction pure d'un enregistrement de capacité daté et sourcé**
(§3.2). Il n'existe aucun chemin de code où le libellé promet un
pré-remplissage sans qu'un `TargetCapability` vérifié l'atteste.

Contre-exemple mesuré, celui qu'on ferme : `buildLaunchUrl`
(`targets.ts:27-32`) retombe sur `t.base` dès que l'URL dépasse
`PREFILL_MAX = 6000` — et **0/130 cas (0 %) passent sous ce seuil**. Le bouton
dit « Copier et ouvrir <IA> » en promettant une ouverture pré-remplie qui
n'arrive jamais. Tout l'appareillage `prefill` / `submits` / `prefilled` est du
code mort en production.

---

## 2. Le prompt — deux temps, allemand, sans fuite

### 2.1 Structure

```ts
export type RolleModus = 'patient' | 'oberarzt';

export interface PromptPaket {
  anrede: string;    // TEMPS 1 — l'amorce.  ≤ 900 caractères. TOUJOURS envoyée.
  akte: string;      // TEMPS 2 — la fiche.  Envoyée en second message si possible.
  modus: RolleModus;
  caseId: CaseId;
}

export function buildPromptPaket(c: Case, teil: AnkerTeil): PromptPaket
```

### 2.2 Temps 1 — l'amorce (`anrede`)

Contenu, dans cet ordre, **et rien d'autre** :

1. le rôle (« Du bist … »),
2. le cadre (deux phrases : examen FSP, entretien oral, le candidat est le
   médecin),
3. la consigne d'ouverture,
4. **une seule instruction de sortie**.

Règles opposables :

| # | Règle | Vérifiable par |
|---|---|---|
| A1 | `anrede.length ≤ 900` pour les 130 cas. | test corpus |
| A2 | `anrede` est **intégralement en allemand**. Aucun caractère de la `persona` française n'y entre. | test corpus (liste de mots-outils FR interdits) |
| A3 | `anrede` contient **exactement une** instruction de sortie, littéralement : « Antworte ausschließlich mit deiner ersten Patientenäußerung. » (mode patient) / « Antworte ausschließlich mit deiner ersten Frage als Oberarzt. » (mode oberarzt) | test d'égalité de chaîne |
| A4 | `anrede` ne contient **aucune** demande d'évaluation, de résumé, de commentaire, de feedback. | test corpus (motifs interdits : `Feedback`, `bewerte`, `Fehler`, `Korrektur`, `Note`) |
| A5 | `anrede` ne décrit **qu'un seul rôle**. Les mots `Oberarzt` et `Patient` ne coexistent jamais dans une même `anrede`. | test corpus |
| A6 | **Premier tour déterministe** : l'amorce ne demande jamais deux comportements pour un même tour. Le motif « … und warte … Dann … » est interdit. | test corpus |

A6 ferme le défaut `prompt.ts:226` (« Antworte … nur mit *Bereit.* und warte auf
die Begrüßung. **Dann** stell dich mit einem Satz vor. »), qui fait voler la
salutation au candidat.

### 2.3 Temps 2 — la fiche (`akte`)

- Contenu : le script de rôle compact. Les réponses y figurent **comme faits**,
  jamais comme scénario, jamais comme régie.
- **Aucune régie française.** La `persona` FR n'est pas injectée
  (`prompt.ts:215` disparaît) : un prompt multilingue avec consigne de ne pas
  lire une partie est un déclencheur de fuite.
- Envoyée **en second message** si le service en accepte un ; sinon repliée
  dans l'amorce sous l'entête `# Deine Akte`, après la ligne d'instruction de
  sortie.

### 2.4 La non-fuite du diagnostic

| Mode | Le diagnostic est-il dans le prompt ? | Justification |
|---|---|---|
| `patient` | **Jamais.** Ni dans `anrede`, ni dans `akte`. | Le patient ne connaît pas son diagnostic ; l'IA qui l'a le trahit au deuxième tour. |
| `oberarzt` | **Oui, il le doit.** | Le senior connaît le cas ; le candidat vient de le lui présenter. |

Règles opposables :

| # | Règle | Vérifiable par |
|---|---|---|
| D1 | En mode `patient`, ni `c.pathology`, ni `c.name`, ni aucun terme de `c.linkedFachbegriffeIds` de niveau diagnostic n'apparaît dans `anrede ∪ akte`. | test corpus, 130 cas, **zéro tolérance** |
| D2 | En mode `patient`, les annotations `(erwartet: …)` (`prompt.ts:165`) sont **supprimées** du rendu. | test corpus |
| D3 | `DIAGNOSIS_NOTE` (`prompt.ts:87`) est supprimé. Une note qui dit « seul l'Oberarzt sait cela » dans le même message que le rôle patient n'est pas une protection. | grep |

Le test corpus existant (`prompt.corpus.test.ts:97-106`) compte **16 fuites
« tolérées »** avant le marqueur Teil 3. Le nouveau seuil est **0**. La tolérance
disparaît avec la fusion des rôles.

### 2.5 Le mode « Oberarzt seul » — prérequis bloquant

Aucun scope actuel ne produit le rôle senior sans embarquer toute l'anamnèse :
`'exam'` (`prompt.ts:222`) = tout le script patient **+** Teil 3. Ancrer la
feature au Teil Fallvorstellung enverrait ~20 k caractères d'anamnèse inutiles.

```
buildPromptPaket(c, 'fallvorstellung') ⇒ modus: 'oberarzt'
  anrede : rôle Oberarzt, cadre Teil 3, une instruction de sortie
  akte   : c.examinerSheet + c.examinerQuestions + le diagnostic
           SANS # Was du weißt, SANS rollenskript, SANS antworten patient
```

| # | Règle | Vérifiable par |
|---|---|---|
| O1 | En mode `oberarzt`, `akte` ne contient aucune entrée de `patientSheet.antworten` ni de `negativeFindings`. | test corpus |
| O2 | `len(anrede + akte)` en mode `oberarzt` ≤ **8 000** caractères sur les 130 cas. | test corpus |
| O3 | `len(anrede + akte)` en mode `patient` ≤ **12 000** caractères sur les 130 cas. | test corpus |

Repère mesuré aujourd'hui : médiane 31 906, max 44 231 caractères (scope
`exam+feedback`, un seul message). O2/O3 divisent par ~3.

### 2.6 Ce qui disparaît du prompt

| Élément | `fichier:ligne` | Devenir |
|---|---|---|
| `Scope` (`'anamnese' \| 'exam' \| 'exam+feedback'`) | `prompt.ts:24` | **supprimé** — remplacé par le Teil d'ancrage (§3.1) |
| `FeedbackLang` | `prompt.ts:25` | **supprimé** — l'allemand est le seul registre |
| bloc `# Feedback` | `prompt.ts:178-189,223` | **supprimé** (A4) |
| `oberarzt(..., withFeedback)` | `prompt.ts:160,171` | signature réduite à `oberarzt(c)` |
| `DIAGNOSIS_NOTE` | `prompt.ts:87` | **supprimé** (D3) |
| cascade de compaction | `prompt.ts:228-232`, `PROMPT_MAX = 56000` | **supprimée** — jamais déclenchée (130/130 en `'full'`) ; remplacée par les bornes O2/O3, qui sont des **tests**, pas une compaction au vol |

Le bloc `# Feedback` demandait au modèle de juger le Konjunktiv I d'une
conversation orale non transcrite dont il a produit la moitié
(`prompt.ts:183`). C'est une grille de correcteur humain appliquée à un
partenaire de jeu.

---

## 3. Le lancement

### 3.1 Signature et ancrage

```ts
export type AnkerTeil = 'anamnese' | 'fallvorstellung';

openExternalAi(caseId: CaseId, teil?: AnkerTeil): void
```

- `teil` **remplace** `Scope`. C'est la sortie qui rend le retrait peu coûteux :
  `Scope` est le discriminant qui pilote l'écriture dans `simulations`
  (`teil` vs `full`) ; le Teil d'ancrage sert exactement le même besoin.
- Le déclencheur vit dans **`PlayArea`** (`SimulationRunner.tsx:450-456`),
  conditionné à `part === 'anamnese' || part === 'fallvorstellung'`.
- La puce d'en-tête globale (`SimulationRunner.tsx:275`), aveugle au Teil
  courant et visible pendant `dokumentation` et `aufklaerung`, est **retirée**.
- `teil` absent (`CaseDetailPage.tsx:48`, écran de résultat) ⇒ mode `patient`,
  ancrage `anamnese`.
- **Choix de forme et de langue supprimés de l'UI** : le radiogroup `Scope`
  (`ExternalAiSheet.tsx:138-145`) et le sélecteur de langue (`:147-156`)
  disparaissent. Le défaut mesuré était `feedbackLang: 'fr'`
  (`targets.ts:51`) — contraire à la consigne.

### 3.2 L'enregistrement de capacité — aucun fait deviné

```ts
export interface TargetCapability {
  targetId: TargetId;
  prefillParam: string | null;     // null = pas de pré-remplissage web
  maxPrefillChars: number | null;  // limite EFFECTIVE mesurée, pas supposée
  autoSubmits: boolean;
  nativeScheme: string | null;     // schéma d'app, null si non documenté
  nativeAcceptsText: boolean;
  verifiedAt: string;              // ISO date de la vérification à la source
  evidence: string;                // URL de la doc ou chemin du relevé de test
}
```

Règles opposables :

| # | Règle |
|---|---|
| C1 | Un `TargetCapability` sans `evidence` non vide et sans `verifiedAt` est **invalide**. Le validateur CI échoue. |
| C2 | `verifiedAt` plus vieux que **90 jours** ⇒ la cible est traitée comme `prefillParam: null` (repli §3.3). Aucune alerte utilisateur, juste le repli. |
| C3 | `prefillParam !== null` ⇒ `maxPrefillChars !== null`. On ne pré-remplit jamais sans connaître la limite. |
| C4 | Le commentaire `targets.ts:2-4` (« Vérifié 2026-09-17… ») est supprimé : ce n'est pas une preuve. Il est remplacé par des `TargetCapability` ou par `null`. |

### 3.3 L'échelle de repli — honnête à chaque barreau

```
si capability.prefillParam !== null
   ET len(encodeURIComponent(anrede)) ≤ capability.maxPrefillChars
   ET capability.verifiedAt < 90 jours
→ NIVEAU 1 : ouverture pré-remplie
   libellé « Ouvrir <IA> avec le prompt »   (le seul barreau qui promet)

sinon
→ NIVEAU 2 : copie + ouverture, avec confirmation VISIBLE
   libellé « Copier le prompt et ouvrir <IA> »
   confirmation « Prompt copié — colle-le dans le chat. »
   la confirmation est rendue APRÈS que l'écriture presse-papiers a réussi
```

| # | Règle |
|---|---|
| F1 | Le libellé du bouton est `f(capability, anrede)` — pur, testable sans DOM. |
| F2 | `opened: true` n'est jamais affirmé : `window.open(url,'_blank','noopener')` renvoie `null` qu'on ait ouvert ou qu'un bloqueur ait bloqué (`targets.ts:36-38,45-47`). Le champ `opened` est **supprimé** du retour de `launch()`. |
| F3 | La confirmation de copie est conditionnée à la **résolution** de `navigator.clipboard.writeText` ; un échec affiche un repli « copie manuelle » avec le texte sélectionnable. |
| F4 | Les 4 étapes numérotées (`ExternalAiSheet.tsx:158-167`) et les `voiceHint` (`targets.ts:19-23`) sont réécrites pour décrire le barreau réellement atteint, jamais le niveau 1 par défaut. |

### 3.4 Les 4 faits à établir à la source — ne rien deviner

`source-driven-development` obligatoire **avant** la première ligne de C3.
Chaque réponse produit un `TargetCapability` ou un `null` explicite, avec
`evidence`.

1. **Paramètre de requête encore supporté et limite de longueur effective**
   (URL et champ de saisie) pour `chatgpt.com`, `claude.ai`, `perplexity.ai`,
   `grok.com` ; existence d'un paramètre pour Gemini
   (`gemini.google.com/app` : `prefill` déclaré `null` aujourd'hui).
2. **Schémas d'URL / universal links documentés** des applications natives iOS
   et Android des 5 cibles, et **s'ils acceptent un texte initial**. Le dépôt
   n'en contient aucun (`grep` sur `lib/externalAi/` : aucun `chatgpt://`,
   `claude://`, `intent://`).
3. **Comportement réel d'un collage très long** dans chaque interface :
   conversion en pièce jointe, troncature silencieuse, ou refus.
4. **CGU de chaque service** sur l'ouverture programmatique et sur l'usage des
   marques et des logos (conditionne Q8).

**Aucun de ces quatre faits n'est deviné dans ce contrat.** Tant qu'un fait
n'est pas établi, la valeur est `null` et le comportement est le niveau 2.

---

## 4. L'état mémorisé

| Clé `meta` | Devenir |
|---|---|
| `externalAi.target` | **conservée**. Écrite à **chaque** changement de cible, pas seulement dans `go()` (corrige `ExternalAiSheet.tsx:91`, où « Copier le prompt » ne persistait rien). |
| `externalAi.scope` | **orpheline**. Jamais lue, jamais écrite. Non supprimée (inoffensive). |
| `externalAi.feedbackLang` | **orpheline**, idem. |

L'état initial de la cible n'est plus codé en dur à `'chatgpt'`
(`ExternalAiSheet.tsx:24`) : la feuille ne rend sa liste qu'après résolution des
préférences, sans quoi le premier rendu est toujours ChatGPT puis saute.

---

## 5. `PendingExternalSim` — la trace de séance

```ts
export interface PendingExternalSim {
  caseId: CaseId;
  teil?: AnkerTeil;        // REMPLACE `scope`
  target: TargetId;
  startedAt: number;       // la fenêtre de retour reste 12 h
}
```

Lecture tolérante des traces déjà posées (`targets.ts:68`, ≤ 12 h) :

```
scope === 'anamnese'                  → teil = 'anamnese'
scope === 'exam' | 'exam+feedback'    → teil = undefined  (séance complète)
scope absent                          → teil = undefined
```

`PendingExternalSimCard.tsx:25-26,64-65,79-80` mappe désormais `teil` vers
l'écriture dans `simulations`, sans passer par `scope`.

---

## 6. Le chemin de retour — l'IA externe écrit dans le journal

Au retour dans l'app, la `PendingExternalSimCard` propose de déclarer la séance.
L'acceptation écrit **exactement un** `TrainingEvent`
(`training-journal.md` §1) :

```
kind          = 'simulation'
caseId        = pending.caseId
teile         = pending.teil ? [pending.teil] : ['anamnese','dokumentation','fallvorstellung']
source        = résolu par la règle de satisfaction de tâche (§3.4 du journal)
spentMin      = déclaré par le candidat, entier ≥ 0
selbstbewertet = true
laufId        = id du Lauf créé, mode 'external-ai'
scores        = renseignés seulement si le candidat remplit la checklist
```

Conséquences opposables :

- Une séance faite dans l'IA externe **apparaît dans l'historique** et **compte
  dans le temps investi du jour** (INV-5, INV-6 du journal).
- Elle **ne modifie pas** `case_progress` (INV-11), parce que son score n'est
  pas mesuré. C'est la forme testable de « on n'affiche jamais une promesse que
  la cible ne tient pas », appliquée à nos propres statistiques.
- Elle peut **satisfaire une tâche du plan du jour** si elle porte le même cas
  et le même Teil.
- Refuser la déclaration n'écrit rien. La trace expire à 12 h.

---

## 7. Invariants — propriétés testables

| Id | Propriété |
|---|---|
| **INV-30** | Sur les 130 cas et les 2 modes : A1 (≤ 900), A3 (une instruction), A4, A5, A6. |
| **INV-31** | Sur les 130 cas, mode `patient` : D1 à zéro fuite. |
| **INV-32** | Sur les 130 cas : O2 (≤ 8 000 en oberarzt), O3 (≤ 12 000 en patient). |
| **INV-33** | `libelléBouton(capability, anrede)` est pur et ne retourne le libellé de niveau 1 que si les trois conditions de §3.3 sont vraies. |
| **INV-34** | Aucun `TargetCapability` du dépôt ne viole C1, C2, C3. |
| **INV-35** | Toute déclaration de séance externe écrit exactement un `TrainingEvent` à `selbstbewertet: true`, et `case_progress` est inchangé. |
| **INV-36** | `buildPromptPaket` ne contient aucune chaîne française : test sur `anrede ∪ akte`, 130 cas, 2 modes. |

---

## 8. Tests de contrat à écrire (C3)

| Fichier | Ce qu'il prouve |
|---|---|
| `app/src/lib/externalAi/prompt.corpus.test.ts` (réécrit) | INV-30, INV-31, INV-32, INV-36 — tolérance ramenée de 16 à 0 |
| `app/src/lib/externalAi/prompt.test.ts` | A3 par égalité de chaîne ; O1 (mode oberarzt sans script patient) |
| `app/src/lib/externalAi/capability.test.ts` | INV-34 (C1–C3), et l'expiration à 90 jours |
| `app/src/lib/externalAi/launchLabel.test.ts` | INV-33 — table complète capability × longueur |
| `app/src/features/simulation/PendingExternalSimCard.test.tsx` | INV-35 + lecture tolérante de `scope` legacy (§5) |
| `app/src/features/simulation/PlayArea.externalAi.test.tsx` | le déclencheur n'existe que sur `anamnese` et `fallvorstellung` |

Environ 22 réécritures de tests sont attendues (`prompt.test.ts` 11 occurrences
de `scope`, `targets.test.ts:34-41`, `ExternalAiSheet.test.tsx:27-28`,
`PendingExternalSimCard.test.tsx` 7 occurrences).

---

## 9. Contradictions relevées entre sources — non tranchées en silence

1. **Coût du retrait de `Scope`.** Le dossier d'analyse §2.2 présente la
   disparition du choix de forme comme un simple retrait d'UI ; l'audit §3
   mesure que `Scope` est le discriminant qui pilote **l'écriture dans
   `simulations`** et la carte de retour, soit ~22 réécritures de tests et une
   donnée persistée. **Tranché ici par l'architecture, pas par arbitrage** : le
   Teil d'ancrage remplace `Scope` un pour un (§3.1, §5). Aucune fonction n'est
   perdue, aucune décision produit n'est prise.
2. **« Sans fuite du diagnostic » et le mode Oberarzt.** La consigne, prise à la
   lettre, interdirait le diagnostic dans **tous** les prompts — ce qui rend le
   mode Oberarzt impossible à jouer. **Tranché ici par l'architecture** (§2.4) :
   la non-fuite est une propriété du **mode patient**. Le senior connaît le cas
   par construction. Si la direction veut la lettre plutôt que l'esprit, le mode
   `oberarzt` doit être abandonné — ce serait une décision de direction, et elle
   n'est pas prise ici.
3. **`PREFILL_MAX` et la cible de 900 caractères.** Avec `anrede ≤ 900`, le
   pré-remplissage web redevient **techniquement atteignable** pour la première
   fois (0/130 aujourd'hui). Cela ne le rend pas **vrai** : sans les réponses
   §3.4, `prefillParam` reste `null` et le barreau atteint reste le niveau 2. Le
   contrat interdit explicitement de conclure « ça passe maintenant » depuis la
   seule longueur.
