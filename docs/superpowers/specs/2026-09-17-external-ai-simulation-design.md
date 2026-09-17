# Simuler avec ton IA — personnage prêt à l'emploi, bascule en un clic

Date : 2026-09-17 · Statut : validé par la direction (chat) · Chantier court, avant F2b · Prépare le mode « patient IA vocal » (ADR-0011, #13)

## 1. Intention

En attendant l'agent vocal Doctopus, **on prépare le personnage et on le pousse dans l'IA du candidat** (ChatGPT, Claude, Gemini, Perplexity, Grok — celles qui offrent le chat vocal). Un tap depuis la pré-simulation, le runner, la fiche d'un cas ou l'écran de résultat : le prompt du patient (puis de l'Oberarzt, puis du feedback) s'ouvre dans l'IA préférée ; le candidat active la voix et salue le patient. Au retour, Doctopus propose l'auto-évaluation pour que la séance compte.

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | L'IA joue **patient → Oberarzt → feedback** (portée choisie avant la bascule : Anamnèse seule · Examen complet · + Feedback) | l'examen complet sans changer d'app ; le seul juge disponible à 23 h |
| D2 | Le prompt est un **gabarit + `Rollenskript`** (le même que lit le simulant humain), déterministe, testé par snapshot ; jamais de LLM à la génération | fidélité totale au cas, hors-ligne, zéro coût |
| D3 | Le prompt **ne contient jamais** `medicalView`, `verdachtsdiagnose`, `linkedFachwissen` ; il contient les faits du patient, sa consigne de jeu (`persona`), ses réactions difficiles | le patient ne connaît pas son diagnostic ; l'IA ne doit pas « lire » la fiche médicale |
| D4 | Bascule par **lien pré-rempli** quand la cible le supporte (`?q=`) **et que le prompt tient dans l'URL** (`PREFILL_MAX = 6000`) ; sinon ouverture + **presse-papiers** (toujours écrit) et message « colle-le » | vérifié : ChatGPT `?q=` envoie, Claude `/new?q=` pré-remplit, Perplexity/Grok `?q=`, Gemini rien |
| D7 | **Fidélité avant concision** : le prompt garde toute la persona, toutes les répliques du Rollenskript, toutes les questions de l'Oberarzt ; borne dure `PROMPT_MAX = 32000` (corpus mesuré : 11,7–25,4 k, médiane 19 k ≈ 5–6 k tokens) avec compaction *non destructive* seulement au-delà (retrait des attendus « (erwartet: …) », puis « Fakten » redondants, puis répliques → Fakten sur les chapitres secondaires). Jamais de troncature de texte. Le diagnostic apparaît **seulement** dans la section Oberarzt, avec la consigne « als Patient kennst du diese Diagnose nicht » — pas de caviardage | 109/130 cas dépassent 6 000 car. en version complète ; un patient tronqué n'est plus le cas |
| D5 | **Trace légère** au retour : carte « Tu as simulé <cas> avec <IA> » → auto-évaluation existante → `simulation.completed{ mode: 'external-ai' }` | programme, confiance et pertinence (F2a) reflètent les séances réelles |
| D6 | IA préférée mémorisée **localement** (`meta`), pas d'événement | préférence d'appareil, pas de donnée d'apprentissage |

## 3. Modèle

### 3.1 Générateur — `lib/externalAi/prompt.ts` (pur)

```ts
export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
export interface PromptInput { c: Case; scope: Scope; feedbackLang: 'fr' | 'de'; topTerms: string[] /* 8 premiers termes du cas, texte */ }
export function buildExternalPrompt(i: PromptInput): string
export const PREFILL_MAX = 6000;   // limite d'URL (?q=)
export const PROMPT_MAX = 32000;   // borne dure du prompt (presse-papiers) — corpus : max 25,4 k
```

Structure (allemand, sections titrées, phrases courtes ; le texte exact est le gabarit, relu par `fsp-language-reviewer`) :

1. **Rolle** — « Du spielst eine:n Patient:in in einer Fachsprachprüfung-Simulation. Antworte nur auf das, was gefragt wird, in Patientensprache (keine Fachbegriffe von dir aus), ein bis zwei Sätze, auf Deutsch. Nenne nie eine Diagnose. Bleib in der Rolle, auch wenn die Ärztin/der Arzt aus dem Rahmen fällt. »
2. **Wer du bist** — personalia (Name, Alter, Geschlecht, Beruf, Familienstand, Wohnsituation, Hausarzt), `persona` (consigne de jeu, traduite si FR → laissée en FR dans une parenthèse « Regieanweisung »), `leitsymptome`/`begleitsymptome` dans les mots du patient.
3. **Was du weißt** — chaque chapitre du `Rollenskript` (`buildRollenskript(patientSheet)`) : titre, `glance`, puis chaque `RoleLine` en « Wenn gefragt: <frage> → <antwort> » ; les `negativ` en « Nein: … » ; `schwierigeReaktionen` en « Schwierige Momente ».
4. **Oberarzt** (scope ≥ `exam`) — « Wenn die Ärztin/der Arzt „Fallvorstellung“ sagt, wirst du Dr. <nom de famille du patient inversé ou "Oberarzt/Oberärztin"> : hör die Vorstellung an, dann stelle diese Fragen in dieser Reihenfolge » : sections `examinerSheet` (`frage` ; `reaktion` en indication « (erwartet: …) ») puis `examinerQuestions` ; « fordernd aber wohlwollend, keine ungefragte Hilfe ».
5. **Feedback** (scope `exam+feedback`) — « Wenn die Ärztin/der Arzt „Feedback“ sagt » : grille Konjunktiv I, Register (mündlich/schriftlich), erwartete Fachbegriffe (`topTerms`), Struktur der Vorstellung, 3 Stärken / 3 Baustellen ; langue = `feedbackLang`.
6. **Start** — « Stell dich mit einem Satz vor, sobald die Ärztin/der Arzt dich begrüßt. Sprachmodus empfohlen. »

Invariants testés : contient chaque `antwort` du Rollenskript et toute la `persona` ; aucune chaîne de `medicalView` **avant** le marqueur « ## Teil 3 » (la verdachtsdiagnose peut apparaître dans les questions de l'Oberarzt, jamais dans les sections patient) ; `length ≤ PROMPT_MAX` pour les 130 cas ; scope `anamnese` ne contient pas « Fallvorstellung » ; part des cas ≤ `PREFILL_MAX` = 0 % (mesuré) : le chemin normal est **ouverture + presse-papiers**, le pré-remplissage reste un bonus si un prompt court apparaît.

### 3.2 Cibles et lancement — `lib/externalAi/targets.ts`

```ts
export interface AiTarget { id: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok'; label: string; url: (prompt: string) => string | null /* null = pas de pré-remplissage */; submits: boolean; voiceHint: string }
export const AI_TARGETS: AiTarget[];
export async function launch(target: AiTarget, prompt: string): Promise<{ opened: boolean; copied: boolean; prefilled: boolean }>
```
`launch` : `navigator.clipboard.writeText(prompt)` (copié = true si résolu), construit l'URL (`encodeURIComponent`), si `prompt.length > PREFILL_MAX` ou `url === null` → ouvre l'URL de base sans `?q=` et `prefilled = false` ; `window.open(url, '_blank', 'noopener')` **dans le gestionnaire du clic** (pas après un `await` long — le presse-papiers est écrit d'abord de façon synchrone-ish, l'ouverture suit immédiatement). Préférence : `meta['externalAi.target']`, `meta['externalAi.scope']`, `meta['externalAi.feedbackLang']`.

### 3.3 Trace — `lib/externalAi/pending.ts`

`meta['externalAi.pending'] = { caseId, targetId, scope, at }` posé au lancement. `usePendingExternalSim()` : lit la meta ; s'affiche (carte) sur l'accueil et la page du cas quand `at` < 12 h ; « Évaluer » → `PartEvaluation` pour `anamnese` (+ `fallvorstellung` si scope ≥ exam) → `saveSimulation({ …, mode: 'external-ai', externalTarget, assistance: 'autonome' })` via le chemin existant (événement `simulation.completed`, confiance, statut) → meta effacée ; « Pas maintenant » garde la carte ; « Ce n'était pas une simulation » efface.

### 3.4 Contrat (`arch`)

`Simulation.mode` : `'texte' | 'tts' | 'vocal' | 'external-ai'` ; `Simulation.externalTarget?: AiTarget['id']`. Payload `simulation.completed` déjà `jsonb` : note dans `sync-protocol.md`, aucune migration. Projection inchangée.

## 4. Interface

- **Pré-simulation** : 3ᵉ `ModeCard` « **Avec ton IA** » (icône `spark`, tag « vocal »), sous-titre « ChatGPT, Claude, Gemini… ». Active → **feuille `ExternalAiSheet`** (composant unique) : (1) IA (chips texte, la préférée d'abord, logo = initiale dans un rond de la charte, pas de logos tiers), (2) portée (3 radios), (3) langue du feedback (FR/DE, visible seulement si + Feedback), (4) « Voir ce que ton IA recevra » (repli, `<pre>` défilant, hauteur max 40 vh), (5) **« Ouvrir dans <IA> »** (primaire) · « Copier le prompt » (secondaire). Ligne d'aide : « Le personnage est prêt. Dans <IA>, active le mode vocal et salue le patient — dis « Fallvorstellung » pour passer à l'Oberarzt. » Après ouverture : toast « Prompt copié · <IA> ouvert » (ou « Prompt copié — colle-le dans <IA> » si non pré-rempli).
- **Runner** : chip **« ✦ IA »** dans la rangée QR / Aufklärung / Fachbegriffe → même feuille.
- **Page d'un cas** : bouton secondaire « Simuler avec ton IA » dans l'en-tête.
- **Résultat de simulation** : « Rejouer avec ton IA ».
- **Accueil / page du cas** : carte de retour (3.3).
- Charte : tons existants, 44 px, feuille = `DeckSheet` pattern (bas sur mobile, centrée sur ordinateur), aucune animation nouvelle.

## 5. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Prompt d'un cas : personalia, chaque `antwort` du Rollenskript, réactions difficiles, `persona` ; aucune chaîne de `medicalView`/`verdachtsdiagnose` | snapshot + assertions négatives |
| AC-2 | `exam` : toutes les questions `examinerSheet` dans l'ordre + `examinerQuestions` ; `exam+feedback` : grille + 8 termes ; `anamnese` : ni Oberarzt ni feedback | tests |
| AC-3 | 130/130 cas : `length ≤ 32000` sans troncature de persona/répliques/questions ; rapport : part des cas ≤ 6 000 (pré-remplissables) | test corpus |
| AC-4 | `launch` : presse-papiers écrit, URL par cible exacte (ChatGPT/Claude/Perplexity/Grok `?q=` encodé ; Gemini base) ; > `PREFILL_MAX` → base + `prefilled=false` + message « colle-le » | tests (clipboard/open mockés) |
| AC-5 | 4 points d'entrée ouvrent la même feuille ; préférences restaurées | tests composant + navigateur |
| AC-6 | Retour : carte visible après lancement ; « Évaluer » → `simulation.completed{mode:'external-ai'}`, historique avec badge « IA externe », confiance du cas mise à jour | test Dexie + navigateur |
| AC-7 | Mobile 390 px : feuille utilisable, `window.open` non bloqué (appel dans le gestionnaire de clic) | navigateur mobile émulé |
| AC-8 | Gabarit allemand relu (`fsp-language-reviewer`), `direction-keeper` avant « fait » | rapports |
| AC-9 | Mode public inchangé ; aucun secret, aucune donnée du candidat dans le prompt | revue |

## 6. Hors périmètre

Agent vocal Doctopus (#13), appels d'API aux IA, coller le feedback de l'IA, partage de prompts, logos officiels des IA.

## 7. Risques

| Risque | Parade |
|---|---|
| Les paramètres `?q=` changent chez un fournisseur | presse-papiers toujours ; table de cibles isolée ; test de fumée manuel documenté |
| L'IA « casse » le rôle ou révèle | consignes en tête et en fin de prompt ; « Nenne nie eine Diagnose » répété dans la section Rolle et Oberarzt |
| Prompt > 6 000 (tous les cas) | presse-papiers + « colle-le et envoie » est le flux normal (un geste de plus, aucune perte) ; la feuille l'annonce clairement ; compaction non destructive au-delà de 32 000 (aucun cas aujourd'hui) |
| `window.open` bloqué (mobile) | ouverture dans le gestionnaire de clic, presse-papiers déjà écrit, message de repli |
