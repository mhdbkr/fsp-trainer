# Fachbegriffe F4a — Clarté : termes liés aux cas, fiche lisible, cartes personnelles maîtrisées · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ne lier un terme qu'aux cas où il est central, rendre la fiche d'un terme lisible au premier regard (Bedeutung → Définition complète → Dans l'entretien) et donner aux cartes personnelles une création, un rangement, une correction et une suppression maîtrisés.

**Architecture:** Tranche A — `linkCaseTerms.mjs` lit les cas par champ (exclus / contextuels / centraux), ignore les occurrences niées (`isNegated`, règle pure testée sur des phrases réelles), retire une liste relue de mots d'examen et applique un seuil de spécificité ; le validateur verrouille les invariants. Tranche B — un événement `term.personal_updated` (Bedeutung modifiable), la suppression différée (plan au clic, émission d'un bloc à l'expiration ou au `pagehide`), la phrase de contexte tirée du `Range` DOM, un type IA `bedeutung` nettoyé côté serveur. Tranche C — un composant de fiche unique (`TermSheet` + `TermUsage`), la carte recto/verso extraite du drill (`CardFlip`), une seule notion de rangement (`StarButton`, `DeckChecklist`, `CardToast`), la mini-fiche de création (`NewCardSheet`). Tranche D — validateur `checkBedeutung.mjs` et reformulation des Bedeutungen signalées.

**Tech Stack:** React 18, Vite 7, TypeScript (lib `ES2022.Intl` ajoutée pour `Intl.Segmenter`), Dexie 4 + dexie-react-hooks, Zustand, Vitest + @testing-library/react + fake-indexeddb, `node:test` pour les scripts, Supabase Edge Functions (Deno 2, zod 3), Postgres, playwright-cli, MCP Supabase (`apply_migration`, `deploy_edge_function`).

Spec : `docs/superpowers/specs/2026-09-28-fachbegriffe-f4a-clarte-design.md` (source de vérité). Style : `docs/superpowers/plans/2026-09-25-fachbegriffe-f3.md`.

## Global Constraints

- Branche `feat/fachbegriffe-f4-clarte`, worktree `/Users/MehdiBoukari/Downloads/FSP VB/doctopus-fachbegriffe-f4`. Commandes depuis `app/` sauf mention. Node ≥ 22 (CI : 22).
- Gates après chaque tâche de code : `npm run typecheck; echo exit=$?`, `npx vitest run --dir src; echo exit=$?`, `npm run build; echo exit=$?` → `exit=0`. Tâches scripts : `node --test scripts/<fichier>.test.mjs; echo exit=$?` → 0. Vérifier par **code de sortie**, jamais par un message lu via un pipe.
- Les tests vitest passent **sans** `app/.env` (vérifié en E1 : `mv .env .env.bak`, gates, restaurer).
- Stager **fichier par fichier** (`git add <chemin>`), jamais `git add -A` ; **aucun** trailer `Co-Authored-By` ; un seul writer par worktree ; le brief d'un sous-agent contient sa tâche, pas le plan entier.
- `docs/contracts/` n'est modifié qu'en Task B1 (rôle `platform-architect`).
- Fichiers de contenu > 1 Mo (`src/data/seed*.ts`, `caseMuster.ts`) : `grep -n` puis lecture de la plage utile.
- Migrations et fonctions appliquées au projet EU `hwpwoblpygvxwbztconc` **uniquement** par le contrôleur via MCP (Task B6), **avant merge**. `npm run db:reset` interdit (efface le contenu publié) : migrations locales par `psql`.
- Liaison (spec §3.1) : champs exclus `patientSheet.antworten`, `antwortenEmotional`, `frageAntworten`, `negativeFindings` ; contextuels `medicalView.differenzialdiagnosen` + sections d'anamnèse systématique (mêmes clés que `CONTEXTUAL_SHEET_KEYS`, étendues) ; négation = tokens entiers `kein/keine/keinen/keinem/keiner/keines, ohne, nicht, verneint, negativ, unauffällig, ausgeschlossen`, jamais dans un composé ; le diagnostic échappe au filtre de négation ; seuil **> 20 %** des cas ; « constats principaux » = `patientSheet.leitsymptome`, `begleitsymptome`, `schmerz` (le type n'a ni `medicalView.leitsymptome` ni `befunde`).
- Validateur de liaison : **au plus 10 termes** liés à > 20 % des cas ; aucun id de `genericTerms.json` lié ; **≥ 8 termes par cas** ; terme du diagnostic lié quand il existe dans le glossaire (exceptions listées).
- Bedeutung (`s` → `translationSimple`) : **≤ 6 mots**, pas une phrase de définition ; `def` inchangé, affiché replié. Aucune étiquette « patientengerecht » dans `app/src/components` ni `app/src/features`.
- Termes personnels : `term.personal_created` inchangé ; `explanation` = Bedeutung (non vide à la création dans l'UI) ; `context` = **une** phrase (offset du `Range`, `Intl.Segmenter('de', { granularity: 'sentence' })` + garde des abréviations), ≤ 300 car. ; `term.personal_updated` (subject `pt-…`, payload `{ explanation }` **seulement**), appliqué s'il suit le dernier `personal_created` (ordre `sortEvents`), vide ignoré ; le **mot** ne se modifie jamais.
- Suppression (D10) : icône corbeille + **Annuler pendant 5 s** ; masquage local immédiat ; événements émis à l'expiration ou au `pagehide`, en **une** transaction ; Annuler = rien n'est émis.
- IA `bedeutung` : texte brut **≤ 6 mots**, **sans emoji**, avec la phrase de contexte ; 1 appel à l'ouverture de la mini-fiche ; cache serveur **30 j par mot** ; serveur d'abord, repli clé ; mode public inchangé.
- Rangement (D6) : Favoris = `term.favorited` (deck réservé `deck-favorites`) ; autres decks = `deck.term_added/removed` ; ★ pleine = le terme est dans **au moins un** deck ; « Changer de deck » = **déplacer** (retrait + ajout).
- Icônes « Dans l'entretien » : dessinées maison dans `components/icons.tsx` — **ni emoji, ni icône stock**.
- Charte actuelle (AC-12) : cibles ≥ 44 px (`h-11`/`min-h-11`), tons existants (`brand`, `signal` jamais en texte courant), mouvement `transform/opacity` ≤ 150 ms, `motion-reduce` respecté, 390 px sans débordement. Pas de glass nouveau ni de refonte (chantier 2).

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `app/src/data/sentenceAbbreviations.json` | abréviations partagées script ↔ app | A1 |
| `app/scripts/negation.fixtures.mjs` | 46 cas (40 réels, 26 phrases réelles distinctes) | A1 |
| `app/scripts/linkCaseTerms.mjs` | phrases, `isNegated`, champs, génériques, seuil, `linkCorpus` | A1, A2 |
| `app/scripts/linkCaseTerms.test.mjs` | tests `node:test` | A1, A2 |
| `app/src/data/genericTerms.json` | mots d'examen (relus clinique) | A2, A4 |
| `app/scripts/checkCaseTermLinks.mjs` + `.test.mjs` | invariants CI | A3 |
| `.github/workflows/quality.yml` | étapes CI | A3, D2 |
| `app/src/data/caseTermLinks.json` | régénéré | A2, A4 |
| `app/src/data/fachbegriffe.json` | registre de `fb-inguinalhernie` ; Bedeutungen reformulées | A4, D2 |
| `app/docs/reports/f4a-liaison.md` | rapport de mesure + relecture | A4 |
| `docs/contracts/sync-protocol.md`, `docs/contracts/schema.sql` | contrat `term.personal_updated` | B1 |
| `app/supabase/migrations/20260928000015_personal_updated_event.sql` | check `type` | B1 |
| `app/supabase/functions/events/index.ts`, `app/supabase/tests/events.test.ts` | enum zod | B1 |
| `app/src/lib/sync/events.ts` | `ProgressEventType` | B1 |
| `app/src/lib/collections/personalTerms.ts` (+ test) | projection `updated`, `updatePersonalExplanation`, plan/commit suppression ; retrait `starSelection` | B2, B3, C7 |
| `app/src/lib/sync/queue.ts` (+ test) | `pushMany` (une transaction) | B3 |
| `app/src/lib/collections/pendingDeletion.ts` (+ test) | suppression différée | B3 |
| `app/src/hooks/useData.ts` | `useAllTerms` masque ; `useTermsInDecks` | B3, C3 |
| `app/tsconfig.json`, `app/src/lib/sentence.ts` (+ test) | phrase de contexte | B4 |
| `app/supabase/functions/_shared/prompts.ts`, `ai/guards.ts`, `ai/index.ts`, `supabase/tests/ai.test.ts` | type `bedeutung` | B5 |
| `app/src/lib/{serverAi,onlineAi,dictionary}.ts` (+ tests) | `askBedeutung` | B5 |
| `app/src/components/icons.tsx`, `TermUsage.tsx`, `TermSheet.tsx` (+ test) | fiche unique | C1 |
| `app/src/components/CardFlip.tsx` (+ test), `features/fachbegriffe/DrillPage.tsx` (+ test) | carte extraite | C2 |
| `app/src/lib/collections/{query,index}.ts` (+ tests), `app/src/store/cardToast.ts` | decks d'un terme, déplacer | C3 |
| `app/src/components/{DeckChecklist,StarButton,CardToast}.tsx`, `StarButton.test.tsx`, `Shell.tsx` | étoile + confirmation | C4 |
| `app/src/features/fachbegriffe/{TermList,FachbegriffePage,CaseTermsPanel}.tsx`, `components/TermHoverCard.tsx` (+ tests) | câblage | C5 |
| `app/src/components/GlossaryDrawer.tsx` (+ test) | tiroir | C6 |
| `app/src/components/{NewCardSheet,SelectionExplainer,TermRegister}.tsx` (+ tests) | création | C7 |
| `app/scripts/checkBedeutung.mjs` (+ test), `app/src/data/bedeutung.search.test.ts` | validateur + non-régression | D1 |
| `app/scripts/e2e/fachbegriffe-f4a.spec.md` | preuve navigateur | E2 |

## Mesures faites en rédigeant ce plan (prototype exécuté sur le corpus réel)

| Mesure | Avant (main) | Après (code de ce plan) |
|---|---|---|
| Liens cas ↔ termes | 16 248 | 7 325 |
| Termes liés à > 20 % des cas | 156 | 1 (`fb-gewichtsverlust`, 31 cas) |
| Termes liés (distincts) | 1 354 | 1 261 (dont 1 nouveau : `fb-inguinalhernie`, sans registre) |
| Min · médiane · max par cas | — | 19 · 57 · 102 |
| Cas sans terme de diagnostic (hors génériques) | 6 (spec) | **9** : les 6 + `case-aortendissektion`, `case-ptbs`, `case-alkoholentzug` (leur diagnostic ne contient que `akut`/`chronisch`/`anamnestisch`) |
| Bedeutungen signalées (termes liés) | 38 (> 6 mots, spec) | 43 : 36 > 6 mots + 7 phrases de définition |
| `isNegated` sur les fixtures | — | 46/46 |

Les valeurs « après » sont les **cibles** : un écart > 2 % sur les liens ou un minimum par cas < 19 doit être expliqué dans le rapport A4 avant de continuer.

---

# Tranche A — Liaison cas ↔ termes (spec §3.1)

### Task A1 : Phrases et négation (`isNegated`), testées sur des phrases réelles

**Files:**
- Create: `app/src/data/sentenceAbbreviations.json`
- Create: `app/scripts/negation.fixtures.mjs`
- Modify: `app/scripts/linkCaseTerms.mjs` (ajouts avant `buildIndex` ; `linkTerms` réécrite)
- Test: `app/scripts/linkCaseTerms.test.mjs`

**Interfaces:**
- Produces : `sentences(text: string): string[]`, `endsWithAbbreviation(s: string): boolean`, `isNegated(sentence: string, at: number): boolean`, `linkTerms(texts, index, { negation?: boolean } = {})` (sans option : comportement F2a inchangé). Liste `src/data/sentenceAbbreviations.json` (lue aussi par `src/lib/sentence.ts`, B4).

- [ ] **Step 1 : fixtures et tests qui échouent**

Créer `app/src/data/sentenceAbbreviations.json` :

```json
["ca.", "bzw.", "ggf.", "evtl.", "tgl.", "Dr.", "Pat.", "inkl.", "sog.", "vs.", "bds.", "Std.", "Min.", "max.", "mind.", "Nr.", "re.", "li.", "Tbl.", "Mio."]
```

Créer `app/scripts/negation.fixtures.mjs` (phrases relevées dans le corpus par `grep` sur les Muster, `pruefungsfallen` et `medicalView.diagnostik` ; cas et champ en commentaire) :

```js
// Phrases RÉELLES du corpus (cas et champ en commentaire) + 5 synthétiques marquées.
// [phrase, mot cherché (première occurrence), nié ?]. Toute régression de
// isNegated se lit ici : ajouter la phrase qui a trompé la règle, jamais l'ôter.
export const NEGATION_FIXTURES = [
  // case-leberzirrhose · arztbrief.aktuelle-beschwerden
  ['Der Patient berichtete über seit drei Monaten langsam zunehmende, ständige, dumpfe und diffuse Bauchschmerzen ohne Ausstrahlung (Intensität 5/10).', 'Ausstrahlung', true],
  ['Der Patient berichtete über seit drei Monaten langsam zunehmende, ständige, dumpfe und diffuse Bauchschmerzen ohne Ausstrahlung (Intensität 5/10).', 'Bauchschmerzen', false],
  ['Ein Ikterus, Fieber, Bluterbrechen oder Teerstuhl sowie eine Verwirrtheit wurden verneint.', 'Teerstuhl', true],
  ['Ein Ikterus, Fieber, Bluterbrechen oder Teerstuhl sowie eine Verwirrtheit wurden verneint.', 'Ikterus', true],
  ['Begleitend bestünden eine Zunahme des Bauchumfangs, spontane Hämatome, eine Leistungsminderung, ein heller Stuhl und Beinödeme sowie eine Gewichtszunahme von etwa fünf Kilogramm.', 'Hämatome', false],
  // case-cholezystitis · arztbrief.allergien-noxen
  ['Allergien seien keine bekannt.', 'Allergien', true],
  // case-ulcus · arztbrief.vorerkrankungen
  ['An chronischen Vorerkrankungen leide der Patient nicht; gelegentlich bestünden Spannungskopfschmerzen.', 'Spannungskopfschmerzen', false],
  // case-depression · vorstellung.aktuelle-beschwerden
  ['Frühere manische Phasen und psychotische Symptome seien verneint worden.', 'Symptome', true],
  // case-reizdarm · vorstellung.aktuelle-beschwerden
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Erbrechen', true],
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Sodbrennen', false],
  ['Begleitend träten ein ausgeprägter Meteorismus, Übelkeit ohne Erbrechen, Sodbrennen und ein Gefühl der unvollständigen Entleerung auf.', 'Meteorismus', false],
  // case-hyperthyreose · pruefungsfallen (« nicht nur » n'est pas une négation)
  ['Der Rauchstopp ist bei dieser Patientin (30 Packungsjahre) nicht nur eine allgemeine Empfehlung, sondern eine gezielte Therapiemaßnahme wegen der endokrinen Orbitopathie — das wird von den Prüfern honoriert.', 'Orbitopathie', false],
  // case-herzinsuffizienz · vorstellung.aktuelle-beschwerden
  ['Brustschmerzen, Fieber und eine einseitige Beinschwellung seien verneint worden.', 'Fieber', true],
  // case-gicht · vorstellung.familienanamnese
  ['Ein Onkel väterlicherseits habe an einer Gicht gelitten; Nierensteine und rheumatische Erkrankungen seien in der Familie nicht bekannt.', 'Gicht', false],
  ['Ein Onkel väterlicherseits habe an einer Gicht gelitten; Nierensteine und rheumatische Erkrankungen seien in der Familie nicht bekannt.', 'Nierensteine', true],
  // case-eug · vorstellung.aktuelle-beschwerden (négation dans une subordonnée)
  ['Sie berichtet über seit drei Tagen bestehende krampfartig-ziehende Schmerzen im rechten Unterbauch mit einer Intensität von 5 von 10, die wellenförmig verlaufen, nicht ausstrahlen und nicht gewandert sind; verstärkt werden sie durch Bewegung, Aufstehen und Geschlechtsverkehr, gelindert durch Ruhe und Wärme.', 'Unterbauch', false],
  // case-panikstoerung · vorstellung.drogen
  ['Einen Drogenkonsum habe sie verneint; sie trinke jedoch etwa sechs Tassen Kaffee und zusätzlich einen Energydrink täglich, insgesamt etwa 620 mg Koffein.', 'Drogenkonsum', true],
  ['Einen Drogenkonsum habe sie verneint; sie trinke jedoch etwa sechs Tassen Kaffee und zusätzlich einen Energydrink täglich, insgesamt etwa 620 mg Koffein.', 'Kaffee', false],
  // case-lagerungsschwindel · vorstellung.frauenanamnese
  ['Eine Schwangerschaft sei ausgeschlossen, eine Verhütung und eine Hormonersatztherapie bestünden nicht; die gynäkologische Vorsorge nehme sie jährlich wahr, zuletzt vor vier Monaten ohne auffälligen Befund.', 'Hormonersatztherapie', true],
  ['Eine Schwangerschaft sei ausgeschlossen, eine Verhütung und eine Hormonersatztherapie bestünden nicht; die gynäkologische Vorsorge nehme sie jährlich wahr, zuletzt vor vier Monaten ohne auffälligen Befund.', 'Vorsorge', false],
  // case-delir · vorstellung.diagnostik-procedere
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Benzodiazepine', true],
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Antipsychotikum', false],
  ['Parallel die nichtmedikamentösen Basismaßnahmen mit Reorientierung, Brille und Hörgerät, Tag-Nacht-Rhythmus, Frühmobilisation und Einbeziehung der Tochter; ein Antipsychotikum nur bei Gefährdung, keine Benzodiazepine und keine Fixierung.', 'Frühmobilisation', false],
  // case-nephrotisches-syndrom · arztbrief.vorerkrankungen
  ['An Vorerkrankungen seien eine seit etwa fünf Jahren bekannte, bislang gut eingestellte arterielle Hypertonie, eine Gonarthrose rechts seit etwa drei Jahren sowie eine allergische Rhinitis bekannt; ein Diabetes mellitus und Nierenerkrankungen wurden verneint.', 'Gonarthrose', false],
  ['An Vorerkrankungen seien eine seit etwa fünf Jahren bekannte, bislang gut eingestellte arterielle Hypertonie, eine Gonarthrose rechts seit etwa drei Jahren sowie eine allergische Rhinitis bekannt; ein Diabetes mellitus und Nierenerkrankungen wurden verneint.', 'Diabetes mellitus', true],
  // case-lumboischialgie · medicalView.diagnostik
  ['Systematische Red-Flag-Anamnese — bei diesem Patienten sämtlich negativ: Alter 42, kein Trauma, keine Osteoporose, kein Kortison, kein Fieber, kein Infekt, keine Tumoranamnese, kein Gewichtsverlust, kein Ruhe- oder Nachtschmerz ohne Lageabhängigkeit, keine Morgensteifigkeit über 30 Minuten, kein Kribbeln, keine Taubheit, keine Schwäche, keine Reithosenanästhesie, keine Blasen- oder Mastdarmstörung, kein intravenöser Drogenkonsum', 'Osteoporose', true],
  ['Systematische Red-Flag-Anamnese — bei diesem Patienten sämtlich negativ: Alter 42, kein Trauma, keine Osteoporose, kein Kortison, kein Fieber, kein Infekt, keine Tumoranamnese, kein Gewichtsverlust, kein Ruhe- oder Nachtschmerz ohne Lageabhängigkeit, keine Morgensteifigkeit über 30 Minuten, kein Kribbeln, keine Taubheit, keine Schwäche, keine Reithosenanästhesie, keine Blasen- oder Mastdarmstörung, kein intravenöser Drogenkonsum', 'Alter', false],
  // case-arterielle-hypertonie · vorstellung.diagnostik-procedere
  ['Die anamnestischen Angaben und der Befund sprechen am ehesten für eine hypertensive Entgleisung ohne akuten Endorganschaden bei bekannter, schlecht eingestellter arterieller Hypertonie — ausgelöst durch das Absetzen des Ramipril, die Ibuprofen-Einnahme und den Stress; zusätzlich vermute ich ein obstruktives Schlafapnoe-Syndrom.', 'Hypertonie', false],
  ['Die anamnestischen Angaben und der Befund sprechen am ehesten für eine hypertensive Entgleisung ohne akuten Endorganschaden bei bekannter, schlecht eingestellter arterieller Hypertonie — ausgelöst durch das Absetzen des Ramipril, die Ibuprofen-Einnahme und den Stress; zusätzlich vermute ich ein obstruktives Schlafapnoe-Syndrom.', 'Endorganschaden', true],
  // case-cml · pruefungsfallen
  ['Die Lymphknoten sind bei der CML NICHT vergrößert — wer Lymphadenopathie dokumentiert, die der Patient verneint, verrät, dass er an CLL oder Lymphom denkt.', 'Lymphknoten', true],
  // case-bph · vorstellung.sozialanamnese
  ['Er wohne mit seiner Ehefrau in einer Wohnung im ersten Stock ohne Aufzug, versorge sich vollständig selbst und gehe dreimal wöchentlich zum Kegeln; Busausflüge und Kinobesuche meide er inzwischen, weil er ständig eine Toilette in der Nähe brauche.', 'Ehefrau', false],
  // case-septische-arthritis · vorstellung.aktuelle-beschwerden
  ['Ein Trauma, ein Befall weiterer Gelenke, eine verlängerte Morgensteifigkeit, ein Zeckenstich sowie ein vorangegangener Racheninfekt seien verneint worden.', 'Zeckenstich', true],
  // case-schizophrenie · arztbrief.medikation
  ['Die Einnahme von Antikoagulanzien, Glukokortikoiden und Psychopharmaka wurde verneint.', 'Psychopharmaka', true],
  // case-bronchialkarzinom · arztbrief.medikation (« ohne » ne nie que son groupe)
  ['In Selbstmedikation seien Hustensaft und ein schleimlösendes Präparat ohne Wirkung eingenommen worden.', 'Hustensaft', false],
  // case-struma · arztbrief.vorerkrankungen
  ['Eine Bestrahlung im Kopf- oder Halsbereich in der Kindheit wurde verneint.', 'Bestrahlung', true],
  // case-abszess · vorstellung.aktuelle-beschwerden
  ['Eine Ausstrahlung ins Bein, Taubheitsgefühle, perianale Beschwerden und ein Trauma seien verneint worden; Paracetamol sei wirkungslos geblieben.', 'Taubheitsgefühle', true],
  ['Eine Ausstrahlung ins Bein, Taubheitsgefühle, perianale Beschwerden und ein Trauma seien verneint worden; Paracetamol sei wirkungslos geblieben.', 'Paracetamol', false],
  // case-anaphylaxie · vorstellung.alkohol
  ['Am Wochenende trinkt sie ein bis zwei Gläser Weißwein; heute hat sie keinen Alkohol getrunken.', 'Weißwein', false],
  ['Am Wochenende trinkt sie ein bis zwei Gläser Weißwein; heute hat sie keinen Alkohol getrunken.', 'Alkohol', true],
  // case-endokarditis · arztbrief.allergien-noxen
  ['Ein Drogenkonsum, insbesondere intravenös, sei verneint worden.', 'Drogenkonsum', true],
  // SYNTHÉTIQUES — verbe de négation antéposé, adversative, composés
  ['Der Patient verneint Fieber und Nachtschweiß, klagt aber über Husten.', 'Nachtschweiß', true],
  ['Der Patient verneint Fieber und Nachtschweiß, klagt aber über Husten.', 'Husten', false],
  ['Kein Hinweis auf eine Pneumonie, aber eine Pleuritis.', 'Pneumonie', true],
  ['Kein Hinweis auf eine Pneumonie, aber eine Pleuritis.', 'Pleuritis', false],
  ['Es handelt sich um einen Nicht-ST-Hebungsinfarkt.', 'Nicht-ST-Hebungsinfarkt', false],
  ['Therapie mit nichtsteroidalen Antirheumatika.', 'Antirheumatika', false],
];
```

Dans `app/scripts/linkCaseTerms.test.mjs`, remplacer la ligne d'import par :

```js
import { linkTerms, caseTexts, buildIndex, orderCaseTerms, diagnosisTexts, isNegated, sentences } from './linkCaseTerms.mjs';
import { NEGATION_FIXTURES } from './negation.fixtures.mjs';
```

et ajouter à la fin du fichier :

```js
// --- F4a §3.1 : phrases, négation ---------------------------------------------
test(`isNegated : ${NEGATION_FIXTURES.length} phrases (dont ≥ 20 réelles du corpus)`, () => {
  assert.ok(new Set(NEGATION_FIXTURES.slice(0, -6).map(([s]) => s)).size >= 20, '≥ 20 phrases réelles distinctes');
  for (const [s, word, negated] of NEGATION_FIXTURES) {
    const at = s.indexOf(word);
    assert.ok(at >= 0, `mot absent : ${word}`);
    assert.equal(isNegated(s, at), negated, `${negated ? 'nié' : 'affirmé'} attendu : « ${word} » dans « ${s.slice(0, 80)}… »`);
  }
});
test('sentences : abréviations du corpus gardées dans la phrase', () => {
  assert.deepEqual(sentences('Z. n. Nagelosteosynthese am Bein. Danach gut.').map((s) => s.trim()), ['Z. n. Nagelosteosynthese am Bein.', 'Danach gut.']);
  assert.deepEqual(sentences('Schmerzen, z. B. beim Gehen, bzw. Treppensteigen. V. a. Pneumonie bei Fieber.').map((s) => s.trim()), ['Schmerzen, z. B. beim Gehen, bzw. Treppensteigen.', 'V. a. Pneumonie bei Fieber.']);
  assert.deepEqual(sentences('Gewichtszunahme von ca. 5 kg. Ikterus verneint.').map((s) => s.trim()), ['Gewichtszunahme von ca. 5 kg.', 'Ikterus verneint.']);
});
test('linkTerms { negation } : un terme cité seulement nié n\'est pas lié ; affirmé ailleurs, il l\'est', () => {
  const t = [{ id: 'fb-fieber', term: 'Fieber' }, { id: 'fb-ikterus', term: 'Ikterus' }];
  assert.deepEqual(linkTerms(['Kein Fieber. Ein Ikterus wurde verneint.'], t, { negation: true }), []);
  assert.deepEqual(linkTerms(['Kein Fieber. Seit gestern Fieber.'], t, { negation: true }), ['fb-fieber']);
  assert.deepEqual(linkTerms(['Kein Fieber.'], t), ['fb-fieber']);                 // sans l'option : comportement F2a
});
```

- [ ] **Step 2 : vérifier l'échec** — `node --test scripts/linkCaseTerms.test.mjs; echo exit=$?` → ≠ 0 (`isNegated` n'est pas exporté).

- [ ] **Step 3 : implémentation** — dans `app/scripts/linkCaseTerms.mjs`, après la ligne `const escapeRe = …`, ajouter :

```js
const ABBREVIATIONS = JSON.parse(readFileSync(join(here, '../src/data/sentenceAbbreviations.json'), 'utf8'));

// --- Phrases ---------------------------------------------------------------
// Même règle que src/lib/sentence.ts (l'app) : Intl.Segmenter + garde des
// abréviations (lettre isolée suivie d'un point : « z. B. », « Z. n. », « V. a. » ;
// liste partagée src/data/sentenceAbbreviations.json : « ca. », « bzw. »…).
const SEG = new Intl.Segmenter('de', { granularity: 'sentence' });
export const endsWithAbbreviation = (s) => {
  const t = s.trimEnd();
  if (/(?:^|[\s(])\p{L}\.$/u.test(t)) return true;
  return ABBREVIATIONS.some((a) => t.endsWith(a) && (t.length === a.length || /[\s(]/.test(t[t.length - a.length - 1])));
};
export function sentences(text) {
  const out = [];
  for (const { segment } of SEG.segment(String(text ?? ''))) {
    if (out.length && endsWithAbbreviation(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

// --- Négation --------------------------------------------------------------
// Règle PURE, testée sur des phrases réelles du corpus (negation.fixtures.mjs).
// Portée = la PROPOSITION : la phrase est coupée aux « ; », « : », tirets
// d'incise et conjonctions adversatives (aber, jedoch, sondern, allerdings,
// dafür, während). Dans la proposition, un mot de négation — token entier,
// jamais dans un composé (« nichtsteroidal », « Nicht-ST-Hebungsinfarkt ») — est
//  - ANTÉPOSÉ (« ohne », ou suivi d'un nom avant la virgule suivante) : il nie
//    jusqu'à cette virgule (« ohne Ausstrahlung », « kein Fieber, kein Husten ») ;
//  - POSTPOSÉ sinon (« … wurden verneint », « Allergien seien keine bekannt ») :
//    il nie toute l'énumération qui précède, depuis le début de la proposition
//    ou de la subordonnée qui le porte (« , die … nicht ausstrahlen »).
// « nicht nur » n'est pas une négation.
// ponytail : heuristique de surface (majuscule = nom), pas d'analyse syntaxique —
// suffit pour « le terme n'est cité QUE nié » ; un analyseur viendra si une
// fixture réelle l'exige.
const NEGATION = /(?<![\p{L}\p{N}-])(kein(?:e|en|em|er|es)?|ohne|nicht|verneint|negativ|unauffällig|ausgeschlossen)(?![\p{L}\p{N}-])/giu;
const SUBORDINATE = /,\s+(?:die|der|das|den|dem|deren|dessen|welche[rsnm]?|dass|weil|wenn|da|sodass|nachdem|obwohl|wobei)(?![\p{L}])/giu;
const CLAUSE_BREAK = /;|:|\s[—–]\s|,?\s+(?:aber|jedoch|sondern|allerdings|dafür|während)\s/giu;
/** Vrai si l'occurrence qui commence à `at` dans `sentence` est niée. */
export function isNegated(sentence, at) {
  let start = 0; let end = sentence.length;
  for (const m of sentence.matchAll(CLAUSE_BREAK)) {
    if (m.index + m[0].length <= at) start = m.index + m[0].length;
    else if (m.index >= at) { end = m.index; break; }
  }
  const clause = sentence.slice(start, end); const rel = at - start;
  for (const n of clause.matchAll(NEGATION)) {
    const word = n[1].toLowerCase(); const after = clause.slice(n.index + n[0].length);
    if (word === 'nicht' && /^\s+nur(?![\p{L}])/iu.test(after)) continue;
    const untilComma = after.split(',')[0];
    if (word === 'ohne' || /(?<![\p{L}])\p{Lu}/u.test(untilComma)) {
      if (rel > n.index && rel < n.index + n[0].length + untilComma.length) return true;
    } else {
      let from = 0;
      for (const s of clause.slice(0, n.index).matchAll(SUBORDINATE)) from = s.index + s[0].length;
      if (rel >= from && rel < n.index) return true;
    }
  }
  return false;
}
```

puis remplacer `linkTerms` par :

```js
/** Ids des termes trouvés dans `texts`. `index` = tableau de termes ou résultat
 *  de `buildIndex`. `negation: true` : texte découpé en phrases, occurrences
 *  niées ignorées. */
export function linkTerms(texts, index, { negation = false } = {}) {
  const { re, byKey } = Array.isArray(index) ? buildIndex(index) : index;
  const found = new Set();
  for (const text of texts) {
    for (const s of negation ? sentences(text) : [String(text ?? '')]) {
      for (const m of s.matchAll(re)) {
        const id = byKey.get(m[1].toLowerCase());
        if (id && !(negation && isNegated(s, m.index))) found.add(id);
      }
    }
  }
  return [...found].sort();
}
```

- [ ] **Step 4 : vérifier** — `node --test scripts/linkCaseTerms.test.mjs; echo exit=$?` → 0 ; `node scripts/linkCaseTerms.mjs --check; echo exit=$?` → 0 (sortie inchangée : l'option n'est pas encore utilisée).

- [ ] **Step 5 : commit**
```bash
git add src/data/sentenceAbbreviations.json
git add scripts/negation.fixtures.mjs
git add scripts/linkCaseTerms.mjs
git add scripts/linkCaseTerms.test.mjs
git commit -m "feat(liaison): phrases et négation par proposition, testées sur 26 phrases réelles du corpus (F4a)"
```

---

### Task A2 : Champs exclus/contextuels, mots d'examen, seuil de spécificité, diagnostic toujours lié

**Files:**
- Modify: `app/scripts/linkCaseTerms.mjs` (fichier complet ci-dessous)
- Create: `app/src/data/genericTerms.json` (proposition, relue en A4)
- Modify: `app/src/data/caseTermLinks.json` (régénéré)
- Test: `app/scripts/linkCaseTerms.test.mjs` (fichier complet ci-dessous)

**Interfaces:**
- Consumes : `sentences`, `isNegated`, `linkTerms(…, { negation })` (A1).
- Produces : `EXCLUDED_KEYS`, `CONTEXTUAL_SHEET_KEYS` (étendue), `caseTexts(c, muster?, fw?) → { core, contextual, primary }`, `caseParts(c, { muster, fw, index, generic }) → { core, primary, diagnosis }`, `linkCorpus(parts, share = SPECIFICITY_SHARE) → Record<caseId, string[]>`, `SPECIFICITY_SHARE = 0.2`, `loadGeneric(): Set<string>`, `diagnosisTexts(c)` (inchangée). Utilisés par `checkCaseTermLinks.mjs` (A3).

- [ ] **Step 1 : tests qui échouent** — remplacer `app/scripts/linkCaseTerms.test.mjs` par (les trois anciens tests qui lisaient `antworten` en core sont réécrits : `antworten` est désormais exclu) :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkTerms, caseTexts, buildIndex, orderCaseTerms, diagnosisTexts, isNegated, sentences, caseParts, linkCorpus } from './linkCaseTerms.mjs';
import { NEGATION_FIXTURES } from './negation.fixtures.mjs';

const terms = [{ id: 'fb-haematemesis', term: 'Hämatemesis' }, { id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-magen', term: 'Magen' }, { id: 'fb-puls', term: 'Puls' }, { id: 'fb-in', term: 'in' }];

test('occurrence entière, insensible à la casse, umlauts ; pas dans les composés', () => {
  assert.deepEqual(linkTerms(['Der Patient berichtet über hämatemesis und ein Ulkus.'], terms), ['fb-haematemesis', 'fb-ulkus']);
  assert.deepEqual(linkTerms(['Magenspiegelung geplant'], terms), []);            // « Magen » dans un composé = autre mot
  assert.deepEqual(linkTerms(['Puls 80/min'], terms), ['fb-puls']);
});
test('formes fléchies simples -e/-en/-s/-n', () => {
  assert.deepEqual(linkTerms(['zwei Ulkusse? nein: Ulzera; aber Ulkusen'], terms), ['fb-ulkus']);
});
test('termes < 4 lettres ignorés ; liste d\'exclusion', () => {
  assert.deepEqual(linkTerms(['in der Nacht'], terms), []);
});
test('liste d\'exclusion couvre aussi un mot ≥ 4 lettres', () => {
  const t = [{ id: 'fb-seit', term: 'seit' }];
  assert.deepEqual(linkTerms(['seit gestern'], t), []);
});
test('linkTerms accepte un index préconstruit (construit une fois dans main)', () => {
  const index = buildIndex(terms);
  assert.deepEqual(linkTerms(['Puls 80/min'], index), ['fb-puls']);
});

// --- F4a §3.1 : phrases, négation ---------------------------------------------
test(`isNegated : ${NEGATION_FIXTURES.length} phrases (dont ≥ 20 réelles du corpus)`, () => {
  assert.ok(new Set(NEGATION_FIXTURES.slice(0, -6).map(([s]) => s)).size >= 20, '≥ 20 phrases réelles distinctes');
  for (const [s, word, negated] of NEGATION_FIXTURES) {
    const at = s.indexOf(word);
    assert.ok(at >= 0, `mot absent : ${word}`);
    assert.equal(isNegated(s, at), negated, `${negated ? 'nié' : 'affirmé'} attendu : « ${word} » dans « ${s.slice(0, 80)}… »`);
  }
});
test('sentences : abréviations du corpus gardées dans la phrase', () => {
  assert.deepEqual(sentences('Z. n. Nagelosteosynthese am Bein. Danach gut.').map((s) => s.trim()), ['Z. n. Nagelosteosynthese am Bein.', 'Danach gut.']);
  assert.deepEqual(sentences('Schmerzen, z. B. beim Gehen, bzw. Treppensteigen. V. a. Pneumonie bei Fieber.').map((s) => s.trim()), ['Schmerzen, z. B. beim Gehen, bzw. Treppensteigen.', 'V. a. Pneumonie bei Fieber.']);
  assert.deepEqual(sentences('Gewichtszunahme von ca. 5 kg. Ikterus verneint.').map((s) => s.trim()), ['Gewichtszunahme von ca. 5 kg.', 'Ikterus verneint.']);
});
test('linkTerms { negation } : un terme cité seulement nié n\'est pas lié ; affirmé ailleurs, il l\'est', () => {
  const t = [{ id: 'fb-fieber', term: 'Fieber' }, { id: 'fb-ikterus', term: 'Ikterus' }];
  assert.deepEqual(linkTerms(['Kein Fieber. Ein Ikterus wurde verneint.'], t, { negation: true }), []);
  assert.deepEqual(linkTerms(['Kein Fieber. Seit gestern Fieber.'], t, { negation: true }), ['fb-fieber']);
  assert.deepEqual(linkTerms(['Kein Fieber.'], t), ['fb-fieber']);                 // sans l'option : comportement F2a
});

// --- F4a §3.1 : champs exclus, contextuels, constats principaux ------------------
test('caseTexts : questionnaire et signes niés exclus ; anamnèse systématique et DD contextuelles ; constats principaux', () => {
  const c = {
    patientSheet: {
      leitsymptome: ['Hämatemesis'], begleitsymptome: ['Schwindel'], schmerz: { ort: 'Epigastrium' },
      antworten: { a: 'Antwort-Text' }, antwortenEmotional: { a: { calm: 'Ruhig-Text' } }, frageAntworten: [{ frage: 'F', antwort: 'Frage-Text' }],
      negativeFindings: ['Negativ-Text'], vegetativeAnamnese: ['Nachtschweiß'], voroperationen: ['Jochbeinfraktur'], noxen: { tabak: 'Nikotin' },
    },
    caseSpecificQuestions: [{ frage: 'Haben Sie Ulkus?' }], examinerQuestions: ['Puls?'], examinerSheet: [{ title: 't', interactions: [{ frage: 'Magen' }] }],
    medicalView: { verdachtsdiagnose: 'Ulkus', differenzialdiagnosen: [{ dd: 'Gastritis', unterscheidung: 'x' }] },
    musterSaetze: { arztbrief: { 'aktuelle-beschwerden': 'Muster A', 'allergien-noxen': 'Muster Noxen', 'familie-sozial': 'Muster Familie' }, vorstellung: { drogen: 'Muster Drogen' } },
  };
  const { core, contextual, primary } = caseTexts(c, undefined, { pathology: 'x', definition: 'FW-Text', differenzialdiagnosen: [{ dd: 'FW-DD' }] });
  const coreTxt = core.join('\n'); const ctxTxt = contextual.join('\n'); const all = coreTxt + ctxTxt;
  for (const w of ['Hämatemesis', 'Schwindel', 'Epigastrium', 'Ulkus', 'Puls', 'Magen', 'Muster A', 'FW-Text']) assert.ok(coreTxt.includes(w), 'core : ' + w);
  for (const w of ['Nachtschweiß', 'Jochbeinfraktur', 'Nikotin', 'Gastritis', 'Muster Noxen', 'Muster Familie', 'Muster Drogen', 'FW-DD']) { assert.ok(ctxTxt.includes(w), 'contextuel : ' + w); assert.ok(!coreTxt.includes(w), 'pas en core : ' + w); }
  for (const w of ['Antwort-Text', 'Ruhig-Text', 'Frage-Text', 'Negativ-Text']) assert.ok(!all.includes(w), 'exclu : ' + w);
  assert.deepEqual(primary, ['Hämatemesis', 'Schwindel', 'Epigastrium']);
});
test('caseParts : génériques retirés partout ; diagnostic non filtré par la négation', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-anamnese', term: 'Anamnese' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Kein Ulkus', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, patientSheet: { leitsymptome: ['Fieber'] }, caseSpecificQuestions: ['Anamnese: Fieber seit gestern.'] };
  const p = caseParts(c, { index: buildIndex(t), generic: new Set(['fb-anamnese']) });
  assert.deepEqual(p.diagnosis, ['fb-ulkus']);
  assert.deepEqual(p.core, ['fb-fieber', 'fb-ulkus']);
  assert.deepEqual(p.primary, ['fb-fieber']);
});
test('linkCorpus : > 20 % des cas → gardé seulement où il est diagnostic ou constat principal', () => {
  const parts = {};
  for (let i = 0; i < 10; i++) parts[`c${i}`] = { core: ['fb-fieber', `fb-rare${i}`], primary: i === 0 ? ['fb-fieber'] : [], diagnosis: [`fb-rare${i}`] };
  const out = linkCorpus(parts);
  assert.deepEqual(out.c0, ['fb-rare0', 'fb-fieber']);
  assert.deepEqual(out.c1, ['fb-rare1']);
  const broad = Object.values(out).flat().filter((id) => id === 'fb-fieber').length;
  assert.equal(broad, 1);
});
test('linkCorpus : le diagnostic est lié même absent du core ; ordre diagnostic puis DF asc + id', () => {
  const out = linkCorpus({ a: { core: ['fb-y', 'fb-x'], primary: [], diagnosis: ['fb-d'] }, b: { core: ['fb-x'], primary: [], diagnosis: [] }, c: { core: [], primary: [], diagnosis: [] }, d: { core: [], primary: [], diagnosis: [] }, e: { core: [], primary: [], diagnosis: [] }, f: { core: [], primary: [], diagnosis: [] }, g: { core: [], primary: [], diagnosis: [] }, h: { core: [], primary: [], diagnosis: [] }, i: { core: [], primary: [], diagnosis: [] }, j: { core: [], primary: [], diagnosis: [] } });
  assert.deepEqual(out.a, ['fb-d', 'fb-y', 'fb-x']);  // fb-x DF 2 (= 20 %, gardé), fb-y DF 1
});
test('ordre : diagnostic d\'abord, même s\'il est le plus fréquent du corpus', () => {
  const t = [{ id: 'fb-ulkus', term: 'Ulkus' }, { id: 'fb-pyrosis', term: 'Pyrosis' }, { id: 'fb-fieber', term: 'Fieber' }];
  const c = { name: 'Ulcus ventriculi', pathology: 'Ulkus', medicalView: { verdachtsdiagnose: 'Ulkus' }, caseSpecificQuestions: ['Pyrosis und Fieber, Ulkus'] };
  const index = buildIndex(t);
  const { core, contextual } = caseTexts(c);
  const parts = { core: linkTerms(core, index), contextual: linkTerms(contextual, index), diagnosis: linkTerms(diagnosisTexts(c), index) };
  const df = new Map([['fb-ulkus', 100], ['fb-fieber', 50], ['fb-pyrosis', 1]]);
  assert.deepEqual(orderCaseTerms(parts, df), ['fb-ulkus', 'fb-pyrosis', 'fb-fieber']);
});
```

- [ ] **Step 2 : vérifier l'échec** — `node --test scripts/linkCaseTerms.test.mjs; echo exit=$?` → ≠ 0 (`caseParts`, `linkCorpus` absents).

- [ ] **Step 3 : implémentation** — `app/src/data/genericTerms.json` (proposition : mots d'examen et adjectifs de méthode ; ids vérifiés présents dans `fachbegriffe.json` ; relue en A4) :

```json
[
  "fb-anamnese",
  "fb-anamnestisch",
  "fb-therapie",
  "fb-therapeutisch",
  "fb-diagnose",
  "fb-diagnostik",
  "fb-verdachtsdiagnose",
  "fb-differenzialdiagnose",
  "fb-befund",
  "fb-prognose",
  "fb-indikation",
  "fb-symptom",
  "fb-syndrom",
  "fb-invasiv",
  "fb-chronisch",
  "fb-akut",
  "fb-stationaere-aufnahme",
  "fb-inspektion",
  "fb-palpation",
  "fb-auskultation",
  "fb-perkussion",
  "fb-genese",
  "fb-aetiologie",
  "fb-progredient",
  "fb-status",
  "fb-trias",
  "fb-manifestation",
  "fb-initial",
  "fb-kausal",
  "fb-konsil",
  "fb-empathie",
  "fb-letalitaet",
  "fb-pathologisch",
  "fb-prophylaxe",
  "fb-asymptomatisch",
  "fb-procedere"
]
```

`app/scripts/linkCaseTerms.mjs` devient :

```js
// ============================================================================
// Liaison cas ↔ Fachbegriffe PAR OCCURRENCE TEXTUELLE (spec F2a 3.5, resserrée
// en F4a §3.1). Même règle de mot entier Unicode que l'autolink de l'app ;
// écrit src/data/caseTermLinks.json.
// Usage : node scripts/linkCaseTerms.mjs [--check]   (--check : exit 1 si le
// fichier diffère du résultat régénéré — utilisé par checkCaseTermLinks.mjs)
//
// F4a — un terme n'est lié à un cas que s'il y est CENTRAL :
//  - champs EXCLUS (le questionnaire standard et les signes niés, déjà
//    structurés) : EXCLUDED_KEYS ;
//  - champs CONTEXTUELS (anamnèse systématique, diagnostics différentiels) :
//    CONTEXTUAL_SHEET_KEYS — ils ne lient rien à eux seuls ;
//  - dans les champs centraux, une occurrence NIÉE ne compte pas (isNegated) ;
//  - les mots d'examen (src/data/genericTerms.json) ne sont liés à aucun cas ;
//  - un terme présent dans plus de SPECIFICITY_SHARE des cas n'est gardé que là
//    où il figure dans le diagnostic ou les constats principaux (leitsymptome,
//    begleitsymptome, schmerz de la fiche patient) ;
//  - les termes du diagnostic sont toujours liés (sauf génériques).
// ORDRE par cas (inchangé) : diagnostic, puis le reste par fréquence
// documentaire (DF) ascendante puis id. Les consommateurs tronquent à N.
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '../src/data/caseTermLinks.json');
const GENERIC = join(here, '../src/data/genericTerms.json');
const ABBREVIATIONS = JSON.parse(readFileSync(join(here, '../src/data/sentenceAbbreviations.json'), 'utf8'));
export const SPECIFICITY_SHARE = 0.2;
/** Mots trop ambigus pour lier un cas (homographes du quotidien). */
const EXCLUDE = new Set(['in', 'vor', 'nach', 'bei', 'seit', 'ohne', 'mit', 'oder', 'und', 'aber', 'dann', 'noch', 'schon', 'sehr', 'gut', 'ganz']);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// --- Phrases ---------------------------------------------------------------
// Même règle que src/lib/sentence.ts (l'app) : Intl.Segmenter + garde des
// abréviations (lettre isolée suivie d'un point : « z. B. », « Z. n. », « V. a. » ;
// liste partagée src/data/sentenceAbbreviations.json : « ca. », « bzw. »…).
const SEG = new Intl.Segmenter('de', { granularity: 'sentence' });
export const endsWithAbbreviation = (s) => {
  const t = s.trimEnd();
  if (/(?:^|[\s(])\p{L}\.$/u.test(t)) return true;
  return ABBREVIATIONS.some((a) => t.endsWith(a) && (t.length === a.length || /[\s(]/.test(t[t.length - a.length - 1])));
};
export function sentences(text) {
  const out = [];
  for (const { segment } of SEG.segment(String(text ?? ''))) {
    if (out.length && endsWithAbbreviation(out[out.length - 1])) out[out.length - 1] += segment;
    else out.push(segment);
  }
  return out;
}

// --- Négation --------------------------------------------------------------
// Règle PURE, testée sur des phrases réelles du corpus (negation.fixtures.mjs).
// Portée = la PROPOSITION : la phrase est coupée aux « ; », « : », tirets
// d'incise et conjonctions adversatives (aber, jedoch, sondern, allerdings,
// dafür, während). Dans la proposition, un mot de négation — token entier,
// jamais dans un composé (« nichtsteroidal », « Nicht-ST-Hebungsinfarkt ») — est
//  - ANTÉPOSÉ (« ohne », ou suivi d'un nom avant la virgule suivante) : il nie
//    jusqu'à cette virgule (« ohne Ausstrahlung », « kein Fieber, kein Husten ») ;
//  - POSTPOSÉ sinon (« … wurden verneint », « Allergien seien keine bekannt ») :
//    il nie toute l'énumération qui précède, depuis le début de la proposition
//    ou de la subordonnée qui le porte (« , die … nicht ausstrahlen »).
// « nicht nur » n'est pas une négation.
// ponytail : heuristique de surface (majuscule = nom), pas d'analyse syntaxique —
// suffit pour « le terme n'est cité QUE nié » ; un analyseur viendra si une
// fixture réelle l'exige.
const NEGATION = /(?<![\p{L}\p{N}-])(kein(?:e|en|em|er|es)?|ohne|nicht|verneint|negativ|unauffällig|ausgeschlossen)(?![\p{L}\p{N}-])/giu;
const SUBORDINATE = /,\s+(?:die|der|das|den|dem|deren|dessen|welche[rsnm]?|dass|weil|wenn|da|sodass|nachdem|obwohl|wobei)(?![\p{L}])/giu;
const CLAUSE_BREAK = /;|:|\s[—–]\s|,?\s+(?:aber|jedoch|sondern|allerdings|dafür|während)\s/giu;
/** Vrai si l'occurrence qui commence à `at` dans `sentence` est niée. */
export function isNegated(sentence, at) {
  let start = 0; let end = sentence.length;
  for (const m of sentence.matchAll(CLAUSE_BREAK)) {
    if (m.index + m[0].length <= at) start = m.index + m[0].length;
    else if (m.index >= at) { end = m.index; break; }
  }
  const clause = sentence.slice(start, end); const rel = at - start;
  for (const n of clause.matchAll(NEGATION)) {
    const word = n[1].toLowerCase(); const after = clause.slice(n.index + n[0].length);
    if (word === 'nicht' && /^\s+nur(?![\p{L}])/iu.test(after)) continue;
    const untilComma = after.split(',')[0];
    if (word === 'ohne' || /(?<![\p{L}])\p{Lu}/u.test(untilComma)) {
      if (rel > n.index && rel < n.index + n[0].length + untilComma.length) return true;
    } else {
      let from = 0;
      for (const s of clause.slice(0, n.index).matchAll(SUBORDINATE)) from = s.index + s[0].length;
      if (rel >= from && rel < n.index) return true;
    }
  }
  return false;
}

// --- Index et occurrences ----------------------------------------------------
/** Index des termes → regex Unicode mot entier + formes fléchiées simples. */
export function buildIndex(terms) {
  const byKey = new Map(); const alts = []; const dupes = new Map();
  for (const t of terms) {
    const key = t.term.trim(); if (key.length < 4 || EXCLUDE.has(key.toLowerCase())) continue;
    const lower = key.toLowerCase();
    if (byKey.has(lower)) { dupes.set(lower, (dupes.get(lower) ?? 1) + 1); continue; }
    byKey.set(lower, t.id); alts.push(key);
  }
  if (dupes.size) {
    for (const [text, count] of dupes) console.error(`⚠ terme dupliqué ignoré : "${text}" (${count} occurrences)`);
  }
  alts.sort((a, b) => b.length - a.length);
  const re = new RegExp('(?<![\\p{L}\\p{N}])(' + alts.map(escapeRe).join('|') + ')(?:e|en|s|n)?(?![\\p{L}\\p{N}])', 'giu');
  return { re, byKey };
}

/** Ids des termes trouvés dans `texts`. `index` = tableau de termes ou résultat
 *  de `buildIndex`. `negation: true` : texte découpé en phrases, occurrences
 *  niées ignorées. */
export function linkTerms(texts, index, { negation = false } = {}) {
  const { re, byKey } = Array.isArray(index) ? buildIndex(index) : index;
  const found = new Set();
  for (const text of texts) {
    for (const s of negation ? sentences(text) : [String(text ?? '')]) {
      for (const m of s.matchAll(re)) {
        const id = byKey.get(m[1].toLowerCase());
        if (id && !(negation && isNegated(s, m.index))) found.add(id);
      }
    }
  }
  return [...found].sort();
}

// --- Textes d'un cas ---------------------------------------------------------
const flatten = (v, out = []) => { if (v == null) return out; if (typeof v === 'string') out.push(v); else if (Array.isArray(v)) v.forEach((x) => flatten(x, out)); else if (typeof v === 'object') Object.values(v).forEach((x) => flatten(x, out)); return out; };
/** Questionnaire standard (réponses aux sondes) et signes niés : jamais lus. */
export const EXCLUDED_KEYS = ['antworten', 'antwortenEmotional', 'frageAntworten', 'negativeFindings'];
/** Anamnèse systématique (fiche, Muster, Arztbrief) et diagnostics différentiels :
 *  contextuels — ils ne lient aucun terme à eux seuls. */
export const CONTEXTUAL_SHEET_KEYS = [
  'vorerkrankungen', 'voroperationen', 'familienanamnese', 'sozialanamnese', 'medikamente', 'allergien', 'unvertraeglichkeiten', 'noxen',
  'vegetativeAnamnese', 'medikation', 'allergien-noxen', 'familie-sozial', 'rauchen', 'alkohol', 'drogen', 'frauenanamnese',
  'differenzialdiagnosen',
];
const flattenSplit = (v, core, contextual, ctx = false) => {
  if (v == null) return;
  if (typeof v === 'string') (ctx ? contextual : core).push(v);
  else if (Array.isArray(v)) v.forEach((x) => flattenSplit(x, core, contextual, ctx));
  else if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (EXCLUDED_KEYS.includes(k)) continue;
      flattenSplit(x, core, contextual, ctx || CONTEXTUAL_SHEET_KEYS.includes(k));
    }
  }
};
/** Textes d'un cas : `core` (lient), `contextual` (ne lient pas), `primary`
 *  (constats principaux : leitsymptome, begleitsymptome, schmerz). `fw` = la
 *  fiche Fachwissen de la pathologie (ses champs de liaison sont ignorés). */
export function caseTexts(c, muster, fw) {
  const core = []; const contextual = [];
  flattenSplit(c.patientSheet, core, contextual);
  flattenSplit(c.musterSaetze, core, contextual);
  flattenSplit(muster, core, contextual);
  flattenSplit(c.medicalView, core, contextual);
  if (fw) flattenSplit({ ...fw, id: undefined, linkedCaseIds: undefined, linkedAufklaerungIds: undefined, keyFachbegriffeIds: undefined, pathology: undefined, specialty: undefined }, core, contextual);
  core.push(
    ...flatten(c.caseSpecificQuestions), ...flatten(c.examinerQuestions),
    ...flatten(c.examinerSheet), ...flatten(c.pruefungsfallen),
    ...flatten(c.referenceArztbrief),
  );
  const ps = c.patientSheet ?? {};
  const primary = [...flatten(ps.leitsymptome), ...flatten(ps.begleitsymptome), ...flatten(ps.schmerz)];
  return { core, contextual, primary };
}
/** Textes qui nomment le diagnostic du cas (rang 1). */
export function diagnosisTexts(c) { return [c.medicalView?.verdachtsdiagnose, c.name, c.pathology]; }

/** Ordre final d'un cas : diagnostic, puis CORE par DF asc + id, puis CONTEXTUEL seul par DF asc + id.
 *  `df` : Map id → fréquence documentaire sur tout le corpus. L'ensemble = core ∪ contextual. */
export function orderCaseTerms({ core, contextual, diagnosis }, df) {
  const cmp = (a, b) => ((df.get(a) ?? 0) - (df.get(b) ?? 0)) || (a < b ? -1 : a > b ? 1 : 0);
  const all = new Set([...core, ...contextual]);
  const diag = new Set(diagnosis.filter((id) => all.has(id)));
  const coreOnly = core.filter((id) => !diag.has(id));
  const coreSet = new Set(core);
  const ctxOnly = contextual.filter((id) => !diag.has(id) && !coreSet.has(id));
  return [...[...diag].sort(cmp), ...coreOnly.sort(cmp), ...ctxOnly.sort(cmp)];
}

/** Parts d'un cas (ids) : `core` et `primary` filtrés par négation, `diagnosis` non filtré ; génériques retirés. */
export function caseParts(c, { muster, fw, index, generic }) {
  const { core, primary } = caseTexts(c, muster, fw);
  const keep = (ids) => ids.filter((id) => !generic.has(id));
  return {
    core: keep(linkTerms(core, index, { negation: true })),
    primary: keep(linkTerms(primary, index, { negation: true })),
    diagnosis: keep(linkTerms(diagnosisTexts(c), index)),
  };
}

/** Liaison du corpus (pure) : seuil de spécificité puis ordre. `parts` : caseId → { core, primary, diagnosis }. */
export function linkCorpus(parts, share = SPECIFICITY_SHARE) {
  const n = Object.keys(parts).length;
  const coreDf = new Map();
  for (const p of Object.values(parts)) for (const id of new Set(p.core)) coreDf.set(id, (coreDf.get(id) ?? 0) + 1);
  const kept = {};
  for (const [caseId, p] of Object.entries(parts)) {
    const central = new Set([...p.primary, ...p.diagnosis]);
    kept[caseId] = [...new Set([...p.diagnosis, ...p.core.filter((id) => coreDf.get(id) <= n * share || central.has(id))])];
  }
  const df = new Map();
  for (const ids of Object.values(kept)) for (const id of ids) df.set(id, (df.get(id) ?? 0) + 1);
  const out = {};
  for (const [caseId, ids] of Object.entries(kept)) out[caseId] = orderCaseTerms({ core: ids, contextual: [], diagnosis: parts[caseId].diagnosis }, df);
  return out;
}

export const loadGeneric = () => new Set(JSON.parse(readFileSync(GENERIC, 'utf8')));

async function main() {
  const check = process.argv.includes('--check');
  const { loadAll } = await import('./loadCases.mjs');
  const { cases, fachwissen, muster } = await loadAll();
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8')).map((r) => ({ id: r.id, term: r.t }));
  const index = buildIndex(fb);   // UNE fois : l'avertissement « doublon » n'est émis qu'une fois
  const generic = loadGeneric();
  const fwByPath = new Map(fachwissen.map((f) => [f.pathology, f]));
  const parts = {};
  for (const c of cases) parts[c.id] = caseParts(c, { muster: muster?.[c.id], fw: fwByPath.get(c.pathology), index, generic });
  const result = linkCorpus(parts);
  const json = JSON.stringify(result, null, 0) + '\n';
  if (check) {
    let current = ''; try { current = readFileSync(OUT, 'utf8'); } catch { /* absent */ }
    if (current.replace(/\r\n/g, '\n') !== json.replace(/\r\n/g, '\n')) { console.error('caseTermLinks.json est périmé : relancer `npm run content:link`'); process.exit(1); }
    console.log('caseTermLinks.json à jour'); return;
  }
  writeFileSync(OUT, json);
  const sizes = Object.values(result).map((a) => a.length).sort((a, b) => a - b);
  const byTerm = new Map(); for (const ids of Object.values(result)) for (const id of ids) byTerm.set(id, (byTerm.get(id) ?? 0) + 1);
  const broad = [...byTerm].filter(([, k]) => k > cases.length * SPECIFICITY_SHARE).length;
  console.log(`${cases.length} cas liés · ${sizes.reduce((a, b) => a + b, 0)} liens · min ${sizes[0]} · médiane ${sizes[Math.floor(sizes.length / 2)]} · max ${sizes[sizes.length - 1]} · ${broad} terme(s) > 20 %`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 4 : vérifier et régénérer**
  - `node --test scripts/linkCaseTerms.test.mjs; echo exit=$?` → 0.
  - `node scripts/linkCaseTerms.mjs; echo exit=$?` → 0 et la ligne `130 cas liés · 7325 liens · min 19 · médiane 57 · max 102 · 1 terme(s) > 20 %` (± 2 % sur les liens ; sinon s'arrêter et comparer avec la section « Mesures »).
  - `node scripts/linkCaseTerms.mjs --check; echo exit=$?` → 0.
  - Attendu jusqu'à A4 : `node scripts/checkTermRegister.mjs --require-all` → 1 (`fb-inguinalhernie`, nouvellement lié par le diagnostic de `case-leistenhernie`, n'a pas de registre).

- [ ] **Step 5 : commit**
```bash
git add scripts/linkCaseTerms.mjs
git add scripts/linkCaseTerms.test.mjs
git add src/data/genericTerms.json
git add src/data/caseTermLinks.json
git commit -m "feat(liaison): un terme n'est lié qu'aux cas où il est central — champs, négation, mots d'examen, seuil 20 % (F4a)"
```

---

### Task A3 : Validateur `checkCaseTermLinks.mjs` — invariants F4a en CI

**Files:**
- Modify: `app/scripts/checkCaseTermLinks.mjs` (fichier complet)
- Create: `app/scripts/checkCaseTermLinks.test.mjs`
- Modify: `.github/workflows/quality.yml` (étape de tests)

**Interfaces:**
- Consumes : `buildIndex`, `linkTerms`, `diagnosisTexts`, `loadGeneric` (A2) ; `loadAll` (`loadCases.mjs`).
- Produces : `checkLinks({ links, knownIds, generic, diagnosis, exceptions?, minPerCase?, share?, maxBroad? }) → { errors: string[], infos: string[] }`, `DIAGNOSIS_EXCEPTIONS` (9 cas).

- [ ] **Step 1 : tests qui échouent** — créer `app/scripts/checkCaseTermLinks.test.mjs` :

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLinks } from './checkCaseTermLinks.mjs';

const ids = (k) => Array.from({ length: k }, (_, i) => `fb-t${i}`);
const knownIds = new Set([...ids(30), 'fb-anamnese', 'fb-d', 'fb-broad']);
const base = { knownIds, generic: new Set(['fb-anamnese']), exceptions: ['case-x'] };

test('valide : ≥ 8 termes, diagnostic lié', () => {
  const r = checkLinks({ ...base, links: { a: ['fb-d', ...ids(8)] }, diagnosis: { a: ['fb-d'] } });
  assert.deepEqual(r.errors, []);
});
test('< 8 termes, id inconnu, id générique → erreurs', () => {
  const r = checkLinks({ ...base, links: { a: ['fb-d', 'fb-zzz', 'fb-anamnese'] }, diagnosis: { a: ['fb-d'] } });
  assert.ok(r.errors.some((e) => e.includes('< 8')));
  assert.ok(r.errors.some((e) => e.includes('inconnu fb-zzz')));
  assert.ok(r.errors.some((e) => e.includes("mot d'examen lié fb-anamnese")));
});
test('diagnostic non lié → erreur ; sans terme de diagnostic → erreur sauf exception', () => {
  assert.ok(checkLinks({ ...base, links: { a: ids(8) }, diagnosis: { a: ['fb-d'] } }).errors.some((e) => e.includes('non lié fb-d')));
  assert.ok(checkLinks({ ...base, links: { a: ids(8) }, diagnosis: { a: [] } }).errors.some((e) => e.includes('aucun terme de diagnostic')));
  assert.deepEqual(checkLinks({ ...base, links: { 'case-x': ids(8) }, diagnosis: { 'case-x': [] } }).errors, []);
});
test('plus de 10 termes liés à > 20 % des cas → erreur ; 10 → info', () => {
  const links = {}; for (let i = 0; i < 10; i++) links[`c${i}`] = ids(11);   // 11 termes présents dans 100 % des cas
  assert.ok(checkLinks({ ...base, links, diagnosis: {}, exceptions: Object.keys(links) }).errors.some((e) => e.includes('11 termes liés à > 20 %')));
  for (const k of Object.keys(links)) links[k] = ids(10);
  assert.deepEqual(checkLinks({ ...base, links, diagnosis: {}, exceptions: Object.keys(links), minPerCase: 8 }).errors, []);
});
```

- [ ] **Step 2 : vérifier l'échec** — `node --test scripts/checkCaseTermLinks.test.mjs; echo exit=$?` → ≠ 0 (`checkLinks` absent).

- [ ] **Step 3 : implémentation** — `app/scripts/checkCaseTermLinks.mjs` devient (la liste d'exceptions contient les 6 cas de la spec **et 3 cas mesurés** dont le diagnostic ne contient que des mots d'examen — voir « Questions ouvertes » : la direction tranche en A4) :

```js
// Invariant CI (bloquant, F4a §3.1) : chaque cas a ≥ 8 Fachbegriffe liés,
// aucun id orphelin ni générique, au plus 10 termes liés à > 20 % des cas, le
// terme du diagnostic lié quand il existe dans le glossaire (exceptions listées),
// JSON à jour. Informatif : cas < 15 termes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Cas dont le diagnostic n'a pas de terme dans le glossaire. Les 6 premiers :
 *  mesurés par la spec F4a §3.1. Les 3 suivants : leur diagnostic ne contenait
 *  QUE des mots d'examen (akut, chronisch, anamnestisch — genericTerms.json) ;
 *  Aortendissektion, Posttraumatische Belastungsstörung et
 *  Alkoholentzugssyndrom n'existent pas dans le glossaire (question ouverte :
 *  les ajouter au glossaire retirerait ces exceptions). */
export const DIAGNOSIS_EXCEPTIONS = [
  'case-gerd', 'case-oesophaguskarzinom', 'case-magenkarzinom', 'case-bandscheibenvorfall', 'case-tvt', 'case-opioidabhaengigkeit',
  'case-aortendissektion', 'case-ptbs', 'case-alkoholentzug',
];

/** Règles pures. `diagnosis` : caseId → ids du diagnostic (génériques déjà retirés). */
export function checkLinks({ links, knownIds, generic, diagnosis, exceptions = DIAGNOSIS_EXCEPTIONS, minPerCase = 8, share = 0.2, maxBroad = 10 }) {
  const errors = []; const infos = [];
  const n = Object.keys(links).length;
  for (const [caseId, ids] of Object.entries(links)) {
    if (ids.length < minPerCase) errors.push(`${caseId} : ${ids.length} termes (< ${minPerCase})`);
    else if (ids.length < 15) infos.push(`${caseId} : ${ids.length} termes (< 15)`);
    for (const t of ids) {
      if (!knownIds.has(t)) errors.push(`${caseId} : terme inconnu ${t}`);
      if (generic.has(t)) errors.push(`${caseId} : mot d'examen lié ${t}`);
    }
    const diag = diagnosis[caseId] ?? [];
    if (!diag.length && !exceptions.includes(caseId)) errors.push(`${caseId} : aucun terme de diagnostic dans le glossaire (hors exceptions)`);
    if (diag.length && exceptions.includes(caseId)) infos.push(`${caseId} : exception obsolète (diagnostic ${diag.join(', ')})`);
    for (const d of diag) if (!ids.includes(d)) errors.push(`${caseId} : terme du diagnostic non lié ${d}`);
  }
  const byTerm = new Map(); for (const ids of Object.values(links)) for (const t of ids) byTerm.set(t, (byTerm.get(t) ?? 0) + 1);
  const broad = [...byTerm].filter(([, k]) => k > n * share).sort((a, b) => b[1] - a[1]);
  if (broad.length > maxBroad) errors.push(`${broad.length} termes liés à > ${share * 100} % des cas (max ${maxBroad}) : ${broad.slice(0, 20).map(([t, k]) => `${t}(${k})`).join(', ')}`);
  else if (broad.length) infos.push(`termes liés à > ${share * 100} % des cas : ${broad.map(([t, k]) => `${t}(${k})`).join(', ')}`);
  return { errors, infos };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const { buildIndex, linkTerms, diagnosisTexts, loadGeneric } = await import('./linkCaseTerms.mjs');
  const { loadAll } = await import('./loadCases.mjs');
  const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
  const fb = JSON.parse(readFileSync(join(here, '../src/data/fachbegriffe.json'), 'utf8'));
  const generic = loadGeneric();
  const index = buildIndex(fb.map((r) => ({ id: r.id, term: r.t })));
  const { cases } = await loadAll();
  const diagnosis = Object.fromEntries(cases.map((c) => [c.id, linkTerms(diagnosisTexts(c), index).filter((id) => !generic.has(id))]));
  const { errors, infos } = checkLinks({ links, knownIds: new Set(fb.map((r) => r.id)), generic, diagnosis });
  for (const i of infos) console.log(`ℹ ${i}`);
  for (const e of errors) console.error(`✗ ${e}`);
  let stale = 0;
  try { execFileSync('node', [join(here, 'linkCaseTerms.mjs'), '--check'], { stdio: 'inherit' }); } catch { stale = 1; }
  if (errors.length + stale) { console.error(`❌ ${errors.length + stale} manquement(s)`); process.exit(1); }
  console.log(`✓ ${Object.keys(links).length} cas, liaison par texte valide`);
}
```

Dans `.github/workflows/quality.yml`, après l'étape `Tests du script de liaison (node:test)`, ajouter :

```yaml
      - name: Tests du validateur de liaison (node:test)
        run: node --test scripts/checkCaseTermLinks.test.mjs
```

et renommer l'étape `Liaison cas ↔ Fachbegriffe (texte) — ≥ 8 termes par cas, JSON à jour` en `Liaison cas ↔ Fachbegriffe — ≥ 8 termes par cas, ≤ 10 termes > 20 %, diagnostic lié, aucun mot d'examen, JSON à jour`.

- [ ] **Step 4 : vérifier** — `node --test scripts/checkCaseTermLinks.test.mjs; echo exit=$?` → 0 ; `node scripts/checkCaseTermLinks.mjs; echo exit=$?` → 0 (ligne `ℹ termes liés à > 20 % des cas : fb-gewichtsverlust(31)`).

- [ ] **Step 5 : commit**
```bash
git add scripts/checkCaseTermLinks.mjs
git add scripts/checkCaseTermLinks.test.mjs
git add ../.github/workflows/quality.yml
git commit -m "ci(liaison): ≤ 10 termes liés à > 20 % des cas, diagnostic lié, aucun mot d'examen (F4a)"
```

---

### Task A4 : Relecture clinique des mots d'examen, registre du terme nouvellement lié, rapport de mesure

Relecteurs en **lecture seule** ; un seul writer (l'implémenteur) applique.

- [ ] **Step 1 : relecture clinique** — dispatcher `fsp-clinical-reviewer` (Opus) avec ce brief :
> Relis `app/src/data/genericTerms.json` (36 ids). Critère : un terme de cette liste ne doit **jamais** être le sujet clinique d'un cas (mot de méthode d'examen, d'étape du raisonnement ou adjectif de temporalité). Pour chaque id : garder / retirer (si c'est un vrai constat clinique, ex. un syndrome nommé) avec une phrase de justification. Propose au plus 10 ajouts pris dans `node -e 'const l=require("./app/src/data/caseTermLinks.json");const m=new Map();for(const a of Object.values(l))for(const t of a)m.set(t,(m.get(t)??0)+1);console.log([...m].sort((a,b)=>b[1]-a[1]).slice(0,40))'` s'ils sont des mots d'examen. Vérifie aussi que les 3 cas `case-aortendissektion`, `case-ptbs`, `case-alkoholentzug` n'ont pas de terme de diagnostic dans le glossaire (`grep -n '"t":"Aortendissektion"\|"t":"Posttraumatische Belastungsstörung"\|"t":"Alkoholentzugssyndrom"' app/src/data/fachbegriffe.json`). Rends : tableau `id → décision → raison`.

- [ ] **Step 2 : appliquer** — modifier `genericTerms.json` selon la relecture ; `node scripts/linkCaseTerms.mjs; echo exit=$?` → 0 ; `node scripts/checkCaseTermLinks.mjs; echo exit=$?` → 0 (sinon : un cas passe sous 8 termes ou un diagnostic n'est plus lié → rapporter, ne pas contourner).

- [ ] **Step 3 : registre du terme nouvellement lié** — `node scripts/checkTermRegister.mjs --require-all; echo exit=$?` → ≠ 0 attendu avec `✗ fb-inguinalhernie lié à un cas sans registre` (lien de diagnostic de `case-leistenhernie`). Créer `../scratchpad/register-f4a.patch.json` :
```json
{ "fb-inguinalhernie": { "pa": "Ich habe eine Beule in der Leiste.", "vo": "Sonographisch zeigte sich eine reponible Inguinalhernie.", "an": "Haben Sie eine Schwellung in der Leiste bemerkt?" } }
```
`node scripts/registerLots.mjs apply ../scratchpad/register-f4a.patch.json; echo exit=$?` → 0 ; `fsp-language-reviewer` relit ces trois phrases (registre oral du patient, phrase de Vorstellung, question sans le terme) ; corriger au besoin et ré-appliquer ; `node scripts/checkTermRegister.mjs --require-all; echo exit=$?` → 0. Si d'autres termes apparaissent après Step 2, même traitement, un patch unique.

- [ ] **Step 4 : rapport** — créer `app/docs/reports/f4a-liaison.md` avec : tableau avant/après (reprendre les commandes ci-dessous), les 10 termes les plus liés après, la liste générique finale et les décisions du relecteur, les cas au minimum, la liste `DIAGNOSIS_EXCEPTIONS` et sa justification. Mesures :
```bash
git show main:app/src/data/caseTermLinks.json > ../scratchpad/links-before.json
node -e 'for (const f of ["../scratchpad/links-before.json","src/data/caseTermLinks.json"]) { const l=require(require("path").resolve(f)); const n=Object.keys(l).length; const m=new Map(); for (const a of Object.values(l)) for (const t of a) m.set(t,(m.get(t)??0)+1); const s=Object.values(l).map(a=>a.length).sort((a,b)=>a-b); console.log(f, "liens", s.reduce((a,b)=>a+b,0), "termes", m.size, ">20%", [...m.values()].filter(k=>k>n*0.2).length, "min", s[0], "médiane", s[n>>1]); }'
```

- [ ] **Step 5 : commit**
```bash
git add src/data/genericTerms.json
git add src/data/caseTermLinks.json
git add src/data/fachbegriffe.json
git add docs/reports/f4a-liaison.md
git commit -m "content(liaison): mots d'examen relus (clinique), registre de fb-inguinalhernie, rapport de mesure (F4a)"
```

---

# Tranche B — Contrat et données

### Task B1 : Contrat `term.personal_updated` (platform-architect)

**Files:**
- Modify: `docs/contracts/sync-protocol.md` (phrase « **Synchronisé** », ligne 5)
- Create: `app/supabase/migrations/20260928000015_personal_updated_event.sql`
- Modify: `app/supabase/functions/events/index.ts` (enum zod)
- Modify: `app/src/lib/sync/events.ts`
- Modify: `docs/contracts/schema.sql` (régénéré)
- Test: `app/supabase/tests/events.test.ts`

**Interfaces:**
- Produces : `ProgressEventType` inclut `'term.personal_updated'` ; le serveur l'accepte.

- [ ] **Step 1 : test qui échoue** — dans `app/supabase/tests/events.test.ts`, après le test F3 `accepte term.personal_created et term.personal_deleted (F3)` :

```ts
  it('accepte term.personal_updated (F4a)', async () => {
    const r = await post(A, [
      { id: crypto.randomUUID(), type: 'term.personal_created', subject_id: 'pt-0a1b2c3e', payload: { term: 'Belastungsdyspnoe', createdAt: '2026-09-28T10:00:00Z' }, occurred_at: '2026-09-28T10:00:00Z' },
      { id: crypto.randomUUID(), type: 'term.personal_updated', subject_id: 'pt-0a1b2c3e', payload: { explanation: 'Atemnot bei Belastung' }, occurred_at: '2026-09-28T10:01:00Z' },
    ]);
    expect(r.rejected).toEqual([]); expect(r.acked).toHaveLength(2);
  });
```

- [ ] **Step 2 : vérifier l'échec** — Supabase local démarré, `supabase functions serve --env-file supabase/.env` lancé depuis ce worktree ; `node scripts/testRls.mjs; echo exit=$?` → ≠ 0 (400 : type inconnu).

- [ ] **Step 3 : implémentation**

```sql
-- 20260928000015_personal_updated_event.sql — Fachbegriffe F4a : la Bedeutung
-- d'une carte personnelle se corrige (term.personal_updated) ; le mot, jamais.
alter table public.progress_events drop constraint if exists progress_events_type_check;
alter table public.progress_events add constraint progress_events_type_check check (type in (
  'simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
  'term.favorited','term.unfavorited',
  'deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
  'srs.settings_changed',
  'term.personal_created','term.personal_deleted','term.personal_updated'
));
```

`app/supabase/functions/events/index.ts` — l'enum devient :
```ts
  type: z.enum(['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured',
    'term.favorited','term.unfavorited','deck.created','deck.renamed','deck.query_changed','deck.deleted','deck.term_added','deck.term_removed',
    'srs.settings_changed','term.personal_created','term.personal_deleted','term.personal_updated']),
```

```diff
--- a/app/src/lib/sync/events.ts
+++ b/app/src/lib/sync/events.ts
@@ -3,7 +3,7 @@
   | 'term.favorited' | 'term.unfavorited'
   | 'deck.created' | 'deck.renamed' | 'deck.query_changed' | 'deck.deleted' | 'deck.term_added' | 'deck.term_removed'
   | 'srs.settings_changed'
-  | 'term.personal_created' | 'term.personal_deleted';
+  | 'term.personal_created' | 'term.personal_deleted' | 'term.personal_updated';
 export interface ProgressEvent {
   id: string;            // uuid client
   user_id: string;       // 'local' tant qu'anonyme ; réattribué à la migration
```

`docs/contracts/sync-protocol.md` — ajouter à la fin de la phrase « **Synchronisé** » (après « …ne touche jamais `personal_terms`. ») :
« Bedeutung d'un terme personnel (F4a) : `term.personal_updated` (subject `pt-…`, payload `{ explanation }` **seulement**, ≤ 600, tronqué) ; projection : appliqué seulement s'il suit le dernier `term.personal_created` de ce subject dans l'ordre de projection, une valeur vide ou non textuelle est ignorée ; le mot (`term`) ne change jamais — il fonde l'id. Suppression (F4a) : les événements `term.unfavorited`, `deck.term_removed` et `term.personal_deleted` d'une même suppression sont écrits dans le journal en **une** transaction locale ; le client ne les écrit qu'à l'expiration du délai d'annulation (5 s) ou au `pagehide`. »

- [ ] **Step 4 : appliquer localement, vérifier** — `docker exec -i supabase_db_app psql -U postgres < supabase/migrations/20260928000015_personal_updated_event.sql; echo exit=$?` → 0 ; relancer `supabase functions serve --env-file supabase/.env` ; `node scripts/testRls.mjs; echo exit=$?` → 0 ; `npm run typecheck; echo exit=$?` → 0 ; `node scripts/dumpSchema.mjs && git diff --stat ../docs/contracts/schema.sql` → la contrainte seulement.

- [ ] **Step 5 : commit**
```bash
git add ../docs/contracts/sync-protocol.md
git add ../docs/contracts/schema.sql
git add supabase/migrations/20260928000015_personal_updated_event.sql
git add supabase/functions/events/index.ts
git add src/lib/sync/events.ts
git add supabase/tests/events.test.ts
git commit -m "feat(contrat): term.personal_updated — la Bedeutung d'une carte personnelle se corrige (F4a)"
```

---

### Task B2 : Projection de `term.personal_updated` + `updatePersonalExplanation` (platform-sync-engineer)

**Files:**
- Modify: `app/src/lib/collections/personalTerms.ts`
- Test: `app/src/lib/collections/personalTerms.test.ts`

**Interfaces:**
- Consumes : `'term.personal_updated'` (B1).
- Produces : `projectPersonalTerms` applique `term.personal_updated` ; `updatePersonalExplanation(id: string, explanation: string): Promise<void>` (erreurs `not_personal`, `explanation_empty`, `personal_term_missing`).

- [ ] **Step 1 : tests qui échouent** — dans `personalTerms.test.ts`, ajouter `updatePersonalExplanation` à l'import de `./personalTerms` ; dans `describe('projectPersonalTerms')`, avant le test `createdAt invalide…` :

```ts
  it('term.personal_updated après la création → nouvelle Bedeutung (F4a D8)', () => {
    const [t] = projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'Atemnot bei Belastung' }, 2)]);
    expect(t.explanation).toBe('Atemnot bei Belastung');
  });
  it('personal_updated : ignoré avant la création, vide ou non-texte ; tronqué à 600', () => {
    expect(projectPersonalTerms([ev('term.personal_updated', id, { explanation: 'avant' }, 1), created(2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: '   ' }, 2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 42 }, 2)])[0].explanation).toBeUndefined();
    expect(projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'e'.repeat(900) }, 2)])[0].explanation!.length).toBe(PT_LIMITS.explanation);
  });
  it('personal_updated puis suppression et re-création → la Bedeutung d\'avant ne revient pas', () => {
    const [t] = projectPersonalTerms([created(1), ev('term.personal_updated', id, { explanation: 'alt' }, 2), ev('term.personal_deleted', id, {}, 3), created(4, 'c')]);
    expect(t.explanation).toBeUndefined();
  });
```

et dans `describe('create / delete / rebuild')`, avant `rebuildProjections : srs.reviewed pt-…` :

```ts
  it('updatePersonalExplanation : un événement, projection à jour ; vide → refus sans événement (AC-7)', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    await updatePersonalExplanation(id, '  Atemnot  ');
    expect((await db.personal_terms.get(id))!.explanation).toBe('Atemnot');
    await expect(updatePersonalExplanation(id, '   ')).rejects.toThrow('explanation_empty');
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_updated')).toHaveLength(1);
  });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/collections/personalTerms.test.ts; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation** — remplacer `projectPersonalTerms` par :

```ts
/** Projection PURE : par id, dernier created/deleted gagne (ordre sortEvents) ;
 *  srs = dernier srs.reviewed APRÈS la dernière création, sinon freshSrs ;
 *  explanation = dernier term.personal_updated non vide APRÈS la dernière
 *  création (F4a D8), sinon celle de la création. */
export function projectPersonalTerms(events: ProgressEvent[]): PersonalTerm[] {
  const live = new Map<string, { ev: ProgressEvent; srs: Srs | null; explanation?: string }>();
  for (const e of sortEvents(events)) {
    const id = e.subject_id;
    if (!id || !isPersonalId(id)) continue;
    if (e.type === 'term.personal_created') live.set(id, { ev: e, srs: null });
    else if (e.type === 'term.personal_deleted') live.delete(id);
    else if (e.type === 'srs.reviewed') { const cur = live.get(id); if (cur) cur.srs = e.payload as Srs; }
    else if (e.type === 'term.personal_updated') {
      const cur = live.get(id);
      const raw = (e.payload as { explanation?: unknown } | null)?.explanation;
      const explanation = typeof raw === 'string' ? cut(raw, PT_LIMITS.explanation) : undefined;
      if (cur && explanation) cur.explanation = explanation;
    }
  }
  const out: PersonalTerm[] = [];
  for (const [id, { ev, srs, explanation }] of live) {
    const p = sanitizePersonalTerm(ev.payload as PersonalTermInput);
    if (!p) continue;
    const payloadCreatedAt = (ev.payload as { createdAt?: string }).createdAt;
    const createdAt = payloadCreatedAt && !Number.isNaN(Date.parse(payloadCreatedAt)) ? payloadCreatedAt : ev.occurred_at;
    out.push({ id, ...p, ...(explanation ? { explanation } : {}), createdAt, srs: srs ?? freshSrs(Date.parse(createdAt)) });
  }
  return out;
}
```

et ajouter avant `deletePersonalTerm` :

```ts
/** Bedeutung d'une carte personnelle (F4a D8) : UN événement term.personal_updated.
 *  Le mot ne change jamais (il fonde l'id). Vide → refusé, rien n'est émis. */
export async function updatePersonalExplanation(id: string, explanation: string): Promise<void> {
  if (!isPersonalId(id)) throw new Error('not_personal');
  const x = cut(explanation, PT_LIMITS.explanation);
  if (!x) throw new Error('explanation_empty');
  if (!(await db.personal_terms.get(id))) throw new Error('personal_term_missing');
  await syncQueue.push({ type: 'term.personal_updated', subject_id: id, payload: { explanation: x } });
  await reprojectPersonalTerms();
}
```

(`rebuildProjections` appelle déjà `projectPersonalTerms` : un 2ᵉ appareil reçoit la Bedeutung au pull, sans autre changement.)

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/collections/personalTerms.test.ts; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/lib/collections/personalTerms.ts
git add src/lib/collections/personalTerms.test.ts
git commit -m "feat(fachbegriffe): Bedeutung d'une carte personnelle modifiable et projetée (F4a D8)"
```

---

### Task B3 : Suppression différée — `pushMany`, plan/commit, masquage local (platform-sync-engineer)

**Files:**
- Modify: `app/src/lib/sync/queue.ts`, `app/src/lib/sync/queue.test.ts`
- Modify: `app/src/lib/collections/personalTerms.ts`, `personalTerms.test.ts`
- Create: `app/src/lib/collections/pendingDeletion.ts`, `pendingDeletion.test.ts`
- Modify: `app/src/hooks/useData.ts` (`useAllTerms`)
- Modify: `app/src/components/GlossaryDrawer.test.tsx` (mock de la file : `pushMany`)

**Interfaces:**
- Produces : `syncQueue.pushMany(inputs: NewEvent[]): Promise<ProgressEvent[]>` (une transaction) ; `planPersonalDeletion(id): Promise<NewEvent[]>`, `commitPersonalDeletion(events: NewEvent[]): Promise<void>`, `deletePersonalTerm(id)` (= plan + commit) ; `DELETE_DELAY_MS = 5000`, `scheduleDeletion(id, delayMs?)`, `cancelDeletion(id): boolean`, `flushDeletions()`, `usePendingDeletions` (store `{ ids: ReadonlySet<string> }`) ; `useAllTerms()` n'expose plus les cartes en attente.

- [ ] **Step 1 : tests qui échouent**

`queue.test.ts` — avant `it('flush envoie par lot…` :
```ts
  it('pushMany écrit tous les événements et leurs lignes d\'outbox en une fois (F4a D10)', async () => {
    const evs = await syncQueue.pushMany([
      { type: 'term.unfavorited', subject_id: 'pt-1', payload: {} },
      { type: 'term.personal_deleted', subject_id: 'pt-1', payload: {} },
    ]);
    expect(evs).toHaveLength(2);
    expect(await db.progress_events.count()).toBe(2);
    expect(await db.outbox.count()).toBe(2);
  });
```

`personalTerms.test.ts` — remplacer le `vi.mock('@/lib/sync/queue', …)` par (même remplacement dans `src/components/GlossaryDrawer.test.tsx`) :
```ts
vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});
```
ajouter `planPersonalDeletion` à l'import de `./personalTerms`, et avant `rebuildProjections : srs.reviewed pt-…` :
```ts
  it('planPersonalDeletion : n\'émet rien ; liste favori, decks, puis le terme', async () => {
    const { id } = await createPersonalTerm({ term: 'Wort' });
    const { createDeck, addToDeck, toggleFavorite } = await import('./index');
    const deckId = await createDeck('Kardio', 'manual');
    await addToDeck(deckId, id); await toggleFavorite(id);
    const before = await db.progress_events.count();
    const plan = await planPersonalDeletion(id);
    expect(await db.progress_events.count()).toBe(before);
    expect(plan.map((e) => e.type)).toEqual(['term.unfavorited', 'deck.term_removed', 'term.personal_deleted']);
  });
```

Créer `app/src/lib/collections/pendingDeletion.test.ts` (minuteurs **réels** et délai court : fake-indexeddb lève `TransactionInactiveError` sous faux minuteurs) :

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { createPersonalTerm } from './personalTerms';
import { toggleFavorite } from './index';
import { scheduleDeletion, cancelDeletion, flushDeletions, usePendingDeletions } from './pendingDeletion';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

const DELAY = 40; // délai court en test : minuteurs réels (fake-indexeddb n'aime pas les faux minuteurs)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deletions = async () => (await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_deleted' || e.type === 'term.unfavorited');

describe('suppression différée (F4a D10, AC-9)', () => {
  let id: string;
  beforeEach(async () => {
    await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.deck_terms.clear();
    id = (await createPersonalTerm({ term: 'Belastungsdyspnoe' })).id;
    await toggleFavorite(id);
  });

  it('masquée tout de suite, rien émis ; Annuler → aucun événement, carte et favori intacts', async () => {
    await scheduleDeletion(id, DELAY);
    expect(usePendingDeletions.getState().ids.has(id)).toBe(true);
    expect(await deletions()).toEqual([]);
    expect(cancelDeletion(id)).toBe(true);
    await sleep(DELAY * 3);
    expect(await deletions()).toEqual([]);
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(await db.personal_terms.get(id)).toBeTruthy();
    expect(await db.favorites.get(id)).toBeTruthy();
  });
  it('expiration → événements émis, carte et favori retirés', async () => {
    await scheduleDeletion(id, DELAY);
    await sleep(DELAY * 3);
    await vi.waitFor(async () => expect((await deletions()).map((e) => e.type).sort()).toEqual(['term.personal_deleted', 'term.unfavorited']));
    expect(await db.personal_terms.get(id)).toBeUndefined();
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(cancelDeletion(id)).toBe(false);
  });
  it('pagehide → émis sans attendre le délai ; un seul lot', async () => {
    await scheduleDeletion(id, DELAY);
    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(async () => expect(await db.personal_terms.get(id)).toBeUndefined());
    await flushDeletions();
    await sleep(DELAY * 3);
    expect((await deletions()).filter((e) => e.type === 'term.personal_deleted')).toHaveLength(1);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/sync/queue.test.ts src/lib/collections/personalTerms.test.ts src/lib/collections/pendingDeletion.test.ts; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/lib/sync/queue.ts
+++ b/app/src/lib/sync/queue.ts
@@ -31,15 +31,20 @@
 export const syncQueue = {
   /** Écrit localement (l'UI se met à jour) et enfile. Ne bloque jamais sur le réseau. */
   async push(input: NewEvent): Promise<ProgressEvent> {
-    const ev: ProgressEvent = { id: newId(), user_id: uid(), occurred_at: input.occurred_at ?? new Date().toISOString(), type: input.type, subject_id: input.subject_id, payload: input.payload };
+    return (await syncQueue.pushMany([input]))[0];
+  },
+
+  /** Plusieurs événements en UNE transaction : tous écrits, ou aucun (F4a D10). */
+  async pushMany(inputs: NewEvent[]): Promise<ProgressEvent[]> {
+    const evs: ProgressEvent[] = inputs.map((input) => ({ id: newId(), user_id: uid(), occurred_at: input.occurred_at ?? new Date().toISOString(), type: input.type, subject_id: input.subject_id, payload: input.payload }));
     await db.transaction('rw', [db.progress_events, db.outbox], async () => {
-      await db.progress_events.put(ev);
-      await db.outbox.put({ id: ev.id, attempts: 0 });
+      await db.progress_events.bulkPut(evs);
+      await db.outbox.bulkPut(evs.map((e) => ({ id: e.id, attempts: 0 })));
     });
     await refreshPending();
     nextAllowed = 0;                                         // un nouvel événement mérite une tentative immédiate
     void syncQueue.flush();
-    return ev;
+    return evs;
   },
 
   /** POST par lots ; ack → retire ; 4xx/rejected → marque et retire ; 5xx/réseau → garde avec backoff. */
```

`personalTerms.ts` — import `import type { NewEvent, ProgressEvent } from '@/lib/sync/events';` ; `removeFromDeck` n'est plus importé de `./index` ; remplacer `deletePersonalTerm` par :
```ts
/** Événements d'une suppression (F4a D10), calculés AU CLIC : retrait du favori,
 *  de chaque deck manuel, puis le terme. Émis plus tard, d'un bloc. */
export async function planPersonalDeletion(id: string): Promise<NewEvent[]> {
  if (!isPersonalId(id)) throw new Error('not_personal');
  const out: NewEvent[] = [];
  if (await db.favorites.get(id)) out.push({ type: 'term.unfavorited', subject_id: id, payload: {} });
  for (const { deckId } of await db.deck_terms.where('termId').equals(id).toArray()) out.push({ type: 'deck.term_removed', subject_id: deckId, payload: { termId: id } });
  out.push({ type: 'term.personal_deleted', subject_id: id, payload: {} });
  return out;
}
/** Émet une suppression planifiée en UNE transaction (tout ou rien), puis reprojette. */
export async function commitPersonalDeletion(events: NewEvent[]): Promise<void> {
  await syncQueue.pushMany(events);
  await reprojectPersonalTerms();
  await reprojectCollections();
}
/** Suppression immédiate (sans délai) : plan + émission. */
export async function deletePersonalTerm(id: string): Promise<void> {
  await commitPersonalDeletion(await planPersonalDeletion(id));
}
```

Créer `app/src/lib/collections/pendingDeletion.ts` :

```ts
// ============================================================================
// Suppression différée d'une carte personnelle (F4a D10). Le journal est
// append-only : un « annuler » après émission remettrait le SRS à zéro. Donc :
// masquage LOCAL immédiat, événements planifiés au clic, émis d'un bloc à
// l'expiration du délai ou au `pagehide`. Annuler = rien n'est émis.
// ============================================================================
import { create } from 'zustand';
import type { NewEvent } from '@/lib/sync/events';
import { commitPersonalDeletion, planPersonalDeletion } from './personalTerms';

export const DELETE_DELAY_MS = 5000;
interface Pending { events: NewEvent[]; timer: ReturnType<typeof setTimeout>; committing: boolean }
const pending = new Map<string, Pending>();

/** Ids masqués en attente de suppression (lu par useAllTerms). */
export const usePendingDeletions = create<{ ids: ReadonlySet<string> }>(() => ({ ids: new Set() }));
const publish = () => usePendingDeletions.setState({ ids: new Set(pending.keys()) });

let listening = false;
export async function scheduleDeletion(id: string, delayMs = DELETE_DELAY_MS): Promise<void> {
  if (pending.has(id)) return;
  const events = await planPersonalDeletion(id);
  pending.set(id, { events, committing: false, timer: setTimeout(() => { void commit(id); }, delayMs) });
  publish();
  if (!listening && typeof window !== 'undefined') { window.addEventListener('pagehide', () => { void flushDeletions(); }); listening = true; }
}

/** Annule avant émission. Faux si trop tard (déjà en cours d'émission) ou inconnu. */
export function cancelDeletion(id: string): boolean {
  const p = pending.get(id);
  if (!p || p.committing) return false;
  clearTimeout(p.timer); pending.delete(id); publish();
  return true;
}

async function commit(id: string): Promise<void> {
  const p = pending.get(id);
  if (!p || p.committing) return;
  p.committing = true; clearTimeout(p.timer);
  try { await commitPersonalDeletion(p.events); }
  finally { pending.delete(id); publish(); }   // échec d'écriture : la carte réapparaît, rien de perdu
}

/** Émet tout ce qui attend (expiration anticipée : `pagehide`). */
export async function flushDeletions(): Promise<void> {
  await Promise.all([...pending.keys()].map(commit));
}
```

`app/src/hooks/useData.ts` — ajouter `import { usePendingDeletions } from '@/lib/collections/pendingDeletion';` et remplacer `useAllTerms` par :
```ts
/** Glossaire publié + termes personnels (F3), sans les cartes en attente de
 *  suppression (F4a D10). undefined tant que l'une des deux sources charge. */
export function useAllTerms(): AnyTerm[] | undefined {
  const fb = useFachbegriffe(); const pts = usePersonalTerms();
  const hidden = usePendingDeletions((s) => s.ids);
  return useMemo(() => (fb && pts ? mergeTerms(fb, pts.filter((p) => !hidden.has(p.id))) : undefined), [fb, pts, hidden]);
}
```

- [ ] **Step 4 : vérifier** — les trois fichiers de test → exit 0 ; `npx vitest run src/components/GlossaryDrawer.test.tsx; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/lib/sync/queue.ts
git add src/lib/sync/queue.test.ts
git add src/lib/collections/personalTerms.ts
git add src/lib/collections/personalTerms.test.ts
git add src/lib/collections/pendingDeletion.ts
git add src/lib/collections/pendingDeletion.test.ts
git add src/hooks/useData.ts
git add src/components/GlossaryDrawer.test.tsx
git commit -m "feat(fachbegriffe): suppression différée — masquée tout de suite, émise d'un bloc à l'expiration ou au pagehide (F4a D10)"
```

---

### Task B4 : Phrase de contexte (`lib/sentence.ts`)

**Files:**
- Modify: `app/tsconfig.json` (`lib` : `ES2022.Intl`)
- Create: `app/src/lib/sentence.ts`, `app/src/lib/sentence.test.ts`

**Interfaces:**
- Consumes : `src/data/sentenceAbbreviations.json` (A1).
- Produces : `CONTEXT_MAX = 300`, `splitSentences(text): { start: number; text: string }[]`, `sentenceAt(text, offset): string`, `sentenceOfRange(range: Range): string`, `highlightParts(sentence, word): [string, string, string] | null`.

- [ ] **Step 1 : tests qui échouent** — créer `app/src/lib/sentence.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { splitSentences, sentenceAt, sentenceOfRange, highlightParts, CONTEXT_MAX } from './sentence';

describe('sentence (F4a §3.3)', () => {
  it('abréviations du corpus : « z. B. », « Z. n. », « V. a. », « ca. », « bzw. » ne coupent pas la phrase', () => {
    const t = 'Z. n. Appendektomie vor ca. 5 Jahren. Schmerzen, z. B. beim Gehen, bzw. Treppensteigen. V. a. Pneumonie bei Fieber.';
    expect(splitSentences(t).map((s) => s.text.trim())).toEqual([
      'Z. n. Appendektomie vor ca. 5 Jahren.', 'Schmerzen, z. B. beim Gehen, bzw. Treppensteigen.', 'V. a. Pneumonie bei Fieber.',
    ]);
  });
  it('sentenceAt : la seule phrase qui contient l\'offset, espaces normalisés', () => {
    const t = 'Er hat Fieber.   Seit gestern  besteht Aszites. Kein Ikterus.';
    expect(sentenceAt(t, t.indexOf('Aszites'))).toBe('Seit gestern besteht Aszites.');
    expect(sentenceAt(t, 0)).toBe('Er hat Fieber.');
  });
  it('sentenceAt : phrase > 300 car. → fenêtre de 300 qui garde le mot', () => {
    const long = `${'Wort '.repeat(100)}Aszites ${'Ende '.repeat(100)}.`;
    const s = sentenceAt(long, long.indexOf('Aszites'));
    expect(s.length).toBeLessThanOrEqual(CONTEXT_MAX);
    expect(s).toContain('Aszites');
  });
  it('sentenceOfRange : offset pris dans le Range DOM, pas dans une recherche de texte', () => {
    document.body.innerHTML = '<p id="p">Aszites ist selten. Heute <b>Aszites</b> und Ödeme.</p>';
    const b = document.querySelector('b')!;
    const r = document.createRange(); r.selectNodeContents(b);
    expect(sentenceOfRange(r)).toBe('Heute Aszites und Ödeme.');
  });
  it('highlightParts : mot entier, casse et flexion simples ; absent → null', () => {
    expect(highlightParts('Aszitesflüssigkeit punktiert.', 'Aszites')).toBeNull();
    expect(highlightParts('Seit gestern besteht Aszites.', 'aszites')).toEqual(['Seit gestern besteht ', 'Aszites', '.']);
    expect(highlightParts('Beidseitige Ödeme.', 'Ödem')).toEqual(['Beidseitige ', 'Ödeme', '.']);
    expect(highlightParts('Sondenernährung', 'Sonde')).toBeNull();
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/sentence.test.ts; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/tsconfig.json
+++ b/app/tsconfig.json
@@ -2,7 +2,7 @@
   "compilerOptions": {
     "target": "ES2021",
     "useDefineForClassFields": true,
-    "lib": ["ES2021", "DOM", "DOM.Iterable"],
+    "lib": ["ES2021", "ES2022.Intl", "DOM", "DOM.Iterable"],
     "module": "ESNext",
     "skipLibCheck": true,
     "moduleResolution": "bundler",
```

```ts
// ============================================================================
// Contexte d'une carte personnelle (F4a §3.3) : la SEULE phrase qui contient la
// sélection. L'offset vient du Range DOM ; la segmentation est Intl.Segmenter
// avec la même garde des abréviations que scripts/linkCaseTerms.mjs (lettre
// isolée + point : « z. B. », « Z. n. », « V. a. » ; liste partagée
// src/data/sentenceAbbreviations.json : « ca. », « bzw. »…).
// ============================================================================
import ABBREVIATIONS from '@/data/sentenceAbbreviations.json';

export const CONTEXT_MAX = 300;
const SEG = new Intl.Segmenter('de', { granularity: 'sentence' });

const endsWithAbbreviation = (s: string): boolean => {
  const t = s.trimEnd();
  if (/(?:^|[\s(])\p{L}\.$/u.test(t)) return true;
  return ABBREVIATIONS.some((a) => t.endsWith(a) && (t.length === a.length || /[\s(]/.test(t[t.length - a.length - 1])));
};

/** Phrases de `text` avec leur position de départ. */
export function splitSentences(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  for (const { segment, index } of SEG.segment(text)) {
    const prev = out[out.length - 1];
    if (prev && endsWithAbbreviation(prev.text)) prev.text += segment;
    else out.push({ start: index, text: segment });
  }
  return out;
}

/** Phrase de `text` qui contient `offset`, espaces normalisés, ≤ 300 car. (fenêtre centrée sur l'offset). */
export function sentenceAt(text: string, offset: number): string {
  const all = splitSentences(text);
  const s = [...all].reverse().find((x) => x.start <= offset) ?? all[0];
  if (!s) return '';
  let raw = s.text;
  if (raw.length > CONTEXT_MAX) {
    const from = Math.max(0, Math.min(offset - s.start - CONTEXT_MAX / 2, raw.length - CONTEXT_MAX));
    raw = raw.slice(from, from + CONTEXT_MAX);
  }
  return raw.replace(/\s+/g, ' ').trim();
}

/** Phrase du début d'un Range (sélection) : bloc englobant + offset mesuré par un Range. */
export function sentenceOfRange(range: Range): string {
  const node = range.startContainer;
  const el = (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest('p, li, td, blockquote, div');
  if (!el) return '';
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return sentenceAt(el.textContent ?? '', pre.toString().length);
}

/** Découpe `sentence` autour de la 1re occurrence de `word` (mot entier, casse
 *  ignorée, formes -e/-en/-es/-n/-s) pour la surligner ; null si absent. */
export function highlightParts(sentence: string, word: string): [string, string, string] | null {
  const w = word.trim();
  if (!w) return null;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:e|en|es|n|s)?(?![\\p{L}\\p{N}])`, 'iu');
  const m = re.exec(sentence);
  return m ? [sentence.slice(0, m.index), m[0], sentence.slice(m.index + m[0].length)] : null;
}
```

- [ ] **Step 4 : vérifier** — test → 0 ; `npm run typecheck; echo exit=$?` → 0 (sans `ES2022.Intl` : `TS2339 'Segmenter'`).

- [ ] **Step 5 : commit**
```bash
git add tsconfig.json
git add src/lib/sentence.ts
git add src/lib/sentence.test.ts
git commit -m "feat(fachbegriffe): contexte = la seule phrase de la sélection, offset pris dans le Range (F4a §3.3)"
```

---

### Task B5 : Type IA `bedeutung` — serveur, cache, client (platform-implementer, puis security-auditor)

**Files:**
- Modify: `app/supabase/functions/_shared/prompts.ts`, `app/supabase/functions/ai/guards.ts`, `app/supabase/functions/ai/index.ts`
- Modify: `app/src/lib/serverAi.ts`, `app/src/lib/dictionary.ts`, `app/src/lib/onlineAi.ts`
- Test: `app/src/lib/prompts.shared.test.ts`, `app/src/lib/onlineAi.route.test.ts`, `app/supabase/tests/ai.test.ts`

**Interfaces:**
- Produces : `BEDEUTUNG_MAX_WORDS = 6`, `buildBedeutungPrompt(word, context?) → { system, user }`, `cleanBedeutung(raw): string` (feuille `_shared/prompts.ts`, ré-exportés par `dictionary.ts`) ; `collectText(stream): Promise<string>` (`ai/guards.ts`) ; corps serveur `{ kind: 'bedeutung', word (1–80), context? (≤ 300) }` → SSE d'un seul évènement, texte nettoyé, cache `bedeutung:<mot normalisé>` 30 j, chaîne `AI_CHAIN_BRIEF`, `max_tokens` 40 ; `askBedeutung(word, context?): Promise<string>` (`onlineAi.ts`).

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/lib/prompts.shared.test.ts
+++ b/app/src/lib/prompts.shared.test.ts
@@ -3,7 +3,7 @@
 import { fileURLToPath } from 'node:url';
 import { dirname, resolve } from 'node:path';
 import { DOCTOPUS_SYSTEM as fromApp, buildBriefPrompt as appBrief } from './dictionary';
-import { DOCTOPUS_SYSTEM as fromShared, buildBriefPrompt as sharedBrief } from '../../supabase/functions/_shared/prompts.ts';
+import { DOCTOPUS_SYSTEM as fromShared, buildBriefPrompt as sharedBrief, buildBedeutungPrompt, cleanBedeutung } from '../../supabase/functions/_shared/prompts.ts';
 
 describe('prompts partagés (F3 §3.5)', () => {
   it('app et serveur lisent la même source', () => {
@@ -15,4 +15,20 @@
     const src = readFileSync(resolve(here, '../../supabase/functions/_shared/prompts.ts'), 'utf8');
     expect(src).not.toMatch(/^\s*import\s/m);
   });
+  it('buildBedeutungPrompt : ≤ 6 mots, sans emoji, avec la phrase de contexte', () => {
+    const p = buildBedeutungPrompt('Belastungsdyspnoe', 'Seit Wochen besteht eine Belastungsdyspnoe.');
+    expect(p.system).toMatch(/HÖCHSTENS sechs Wörtern/);
+    expect(p.system).toMatch(/keine Emoji/);
+    expect(p.user).toContain('Satz: „Seit Wochen besteht eine Belastungsdyspnoe.“');
+    expect(buildBedeutungPrompt('Wort').user).toBe('Wort: „Wort“');
+  });
+  it('cleanBedeutung : texte brut ≤ 6 mots, sans emoji, guillemets, article ni ponctuation finale', () => {
+    expect(cleanBedeutung('die Atemnot 😮‍💨')).toBe('Atemnot');
+    expect(cleanBedeutung('„Flüssigkeit in der Bauchhöhle.“')).toBe('Flüssigkeit in der Bauchhöhle');
+    expect(cleanBedeutung('die Dyspnoe = Atemnot · 🇫🇷 dyspnée')).toBe('Atemnot');
+    expect(cleanBedeutung('eins zwei drei vier fünf sechs sieben acht')).toBe('eins zwei drei vier fünf sechs');
+    expect(cleanBedeutung('Bedeutung: Atemnot bei Belastung.\nErklärung …')).toBe('Atemnot bei Belastung');
+    expect(cleanBedeutung('zum Bauch gehörend')).toBe('zum Bauch gehörend');
+    expect(cleanBedeutung('🙂')).toBe('');
+  });
 });
```

```diff
--- a/app/src/lib/onlineAi.route.test.ts
+++ b/app/src/lib/onlineAi.route.test.ts
@@ -4,7 +4,7 @@
   return { ...real, serverAiAvailable: vi.fn(() => true), serverStream: vi.fn() };
 });
 import { serverAiAvailable, serverStream, ServerAiError } from './serverAi';
-import { askBrief, askConversation, setKey, canAskAi, type ChatTurn } from './onlineAi';
+import { askBrief, askBedeutung, askConversation, setKey, canAskAi, type ChatTurn } from './onlineAi';
 
 const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'via clé' } }] }), { status: 200 }));
 beforeEach(() => {
@@ -97,4 +97,15 @@
     expect(onToken).toHaveBeenCalledWith('déb');
     expect(fetchSpy).not.toHaveBeenCalled();
   });
+  it('bedeutung : serveur d\'abord (mot + phrase), réponse nettoyée (F4a AC-4)', async () => {
+    vi.mocked(serverStream).mockResolvedValue('die Atemnot bei Belastung 😮‍💨');
+    expect(await askBedeutung('Belastungsdyspnoe', 'Er hat Belastungsdyspnoe.')).toBe('Atemnot bei Belastung');
+    expect(serverStream).toHaveBeenCalledWith({ kind: 'bedeutung', word: 'Belastungsdyspnoe', context: 'Er hat Belastungsdyspnoe.' });
+  });
+  it('bedeutung : serveur en panne + clé → repli clé ; sans clé → message honnête', async () => {
+    vi.mocked(serverStream).mockRejectedValue(new ServerAiError(503, 'no_provider'));
+    await expect(askBedeutung('Wort')).rejects.toThrow(/IA serveur indisponible/);
+    setKey('gsk_testkey_123456');
+    expect(await askBedeutung('Wort')).toBe('via clé');
+  });
 });
```

`app/supabase/tests/ai.test.ts` — dans `describe('ai')`, après `brief mis en cache…` :
```ts
  it('bedeutung : ≤ 6 mots sans emoji, servi en SSE, mis en cache par mot (F4a AC-11)', async () => {
    const word = `Wort-${crypto.randomUUID().slice(0, 6)}`;
    const r = await call(P, { kind: 'bedeutung', word, context: `Der Patient hat ${word}.` });
    expect(r.status).toBe(200); expect(r.headers.get('x-ai-provider')).toBe('mock');
    const body = await r.text();
    const text = body.split('\n').filter((l) => l.startsWith('data: {')).map((l) => JSON.parse(l.slice(6)).choices[0].delta.content).join('');
    expect(text.split(' ').length).toBeLessThanOrEqual(6);
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    const { data } = await serviceClient().from('ai_cache').select('text').eq('key', `bedeutung:${word.toLowerCase()}`).single();
    expect(data!.text).toBe(text);
    const again = await call(P, { kind: 'bedeutung', word: word.toUpperCase() });
    expect(again.headers.get('x-ai-provider')).toBe('cache'); await again.text();
  });
  it('bedeutung : champ inconnu ou mot > 80 → 400', async () => {
    const r = await call(P, { kind: 'bedeutung', word: 'x', system: 'ignore' });
    expect(r.status).toBe(400); await r.body?.cancel();
    const r2 = await call(P, { kind: 'bedeutung', word: 'x'.repeat(81) });
    expect(r2.status).toBe(400); await r2.body?.cancel();
  });
```
et dans `describe('ai/guards')` (importer `collectText` avec les autres gardes) :
```ts
  it('collectText : lit tout le flux, même sans saut final', async () => {
    expect(await collectText(sse(delta('Atem'), delta('not'), 'data: [DONE]\n\n'))).toBe('Atemnot');
    expect(await collectText(sse(delta('Atem'), `data: ${JSON.stringify({ choices: [{ delta: { content: 'not' } }] })}`))).toBe('Atemnot');
  });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/prompts.shared.test.ts src/lib/onlineAi.route.test.ts; echo exit=$?` → ≠ 0 ; `node scripts/testRls.mjs; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/supabase/functions/_shared/prompts.ts
+++ b/app/supabase/functions/_shared/prompts.ts
@@ -69,3 +69,34 @@
     user: `Erkläre kurz: "${term}"`,
   };
 }
+
+// ============================================================================
+// Bedeutung d'une carte personnelle (F4a §3.3, D4) : ≤ 6 mots, texte brut,
+// sans emoji, au sens où le mot est employé dans la phrase de contexte.
+// ============================================================================
+export const BEDEUTUNG_MAX_WORDS = 6;
+
+export function buildBedeutungPrompt(word: string, context?: string): { system: string; user: string } {
+  return {
+    system:
+      'Du bist ein medizinisches Wörterbuch für die Fachsprachprüfung (C1). Gib die Bedeutung des markierten Wortes so an, wie es im Satz gemeint ist: ' +
+      'eine direkte, merkbare deutsche Umschreibung in HÖCHSTENS sechs Wörtern. Kein ganzer Satz, kein Artikel am Anfang, keine Anführungszeichen, keine Emoji, keine Übersetzung, keine Erklärung. ' +
+      'Beispiele: Dyspnoe → Atemnot ; Aszites → Flüssigkeit in der Bauchhöhle.',
+    user: context ? `Wort: „${word}“\nSatz: „${context}“` : `Wort: „${word}“`,
+  };
+}
+
+/** Nettoie une Bedeutung proposée : première ligne, sens après « = »/« → », sans
+ *  emoji, guillemets, article initial ni ponctuation finale, ≤ 6 mots. '' si rien. */
+export function cleanBedeutung(raw: string): string {
+  const line = raw.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
+  const meaning = line.split('·')[0].split(/[=→]/).pop() ?? '';
+  const plain = meaning
+    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, '')
+    .replace(/[„“”"'«»*_`]/g, '')
+    .replace(/^\s*(?:bedeutung\s*:\s*)?(?:der|die|das)?\s+/iu, ' ')
+    .replace(/[.;:!?,\s]+$/u, '')
+    .replace(/\s+/g, ' ')
+    .trim();
+  return plain.split(' ').filter(Boolean).slice(0, BEDEUTUNG_MAX_WORDS).join(' ');
+}
```

```diff
--- a/app/supabase/functions/ai/guards.ts
+++ b/app/supabase/functions/ai/guards.ts
@@ -32,3 +32,18 @@
     cancel() { onCancel(); void reader.cancel(); },
   });
 }
+
+/** Lit un flux SSE jusqu'au bout et rend le texte (Bedeutung : nettoyée AVANT d'être servie et mise en cache). */
+export async function collectText(upstream: ReadableStream<Uint8Array>): Promise<string> {
+  const reader = upstream.getReader(); const dec = new TextDecoder();
+  let buf = ''; let text = '';
+  for (;;) {
+    const r = await reader.read();
+    if (r.done) break;
+    buf += dec.decode(r.value, { stream: true });
+    const d = sseDeltas(buf); buf = d.rest; text += d.deltas.join('');
+  }
+  buf += dec.decode();
+  if (buf.trim()) text += sseDeltas(`${buf}\n\n`).deltas.join('');
+  return text;
+}
```

```diff
--- a/app/supabase/functions/ai/index.ts
+++ b/app/supabase/functions/ai/index.ts
@@ -7,9 +7,9 @@
 import { userClient, serviceClient } from '../_shared/supabase.ts';
 import { z, parse, BadRequest } from '../_shared/validate.ts';
 import { rateLimit, TooMany } from '../_shared/ratelimit.ts';
-import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind } from '../_shared/prompts.ts';
+import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind, buildBedeutungPrompt, cleanBedeutung } from '../_shared/prompts.ts';
 import { openStream, normalizeSelection, NoProvider, type OAIMessage } from '../_shared/aiChain.ts';
-import { MAX_BODY, MAX_CHAT_CHARS, mockAllowed, usableChain, relay } from './guards.ts';
+import { MAX_BODY, MAX_CHAT_CHARS, mockAllowed, usableChain, relay, collectText } from './guards.ts';
 
 const ALLOWED = /^(https:\/\/mhdbkr\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;
 const corsFor = (req: Request): Record<string, string> => {
@@ -23,9 +23,10 @@
 const Turn = z.object({ role: z.enum(['user', 'assistant']), text: z.string().min(1).max(2000) }).strict();
 const Body = z.discriminatedUnion('kind', [
   z.object({ kind: z.literal('brief'), selection: z.string().trim().min(1).max(220) }).strict(),
+  z.object({ kind: z.literal('bedeutung'), word: z.string().trim().min(1).max(80), context: z.string().trim().max(300).optional() }).strict(),
   z.object({ kind: z.literal('chat'), turns: z.array(Turn).min(1).max(20) }).strict(),
 ]).refine((b) => b.kind !== 'chat' || b.turns.reduce((n, t) => n + t.text.length, 0) <= MAX_CHAT_CHARS, 'chat_too_long');
-const MAX_TOKENS = { brief: 300, chat: 1200 } as const;
+const MAX_TOKENS = { brief: 300, bedeutung: 40, chat: 1200 } as const;
 const CACHE_DAYS = 30;
 const allowMock = mockAllowed(Deno.env.get('AI_ALLOW_MOCK'), Deno.env.get('SUPABASE_URL'));
 const keys = { GROQ_API_KEY: Deno.env.get('GROQ_API_KEY'), GEMINI_API_KEY: Deno.env.get('GEMINI_API_KEY') };
@@ -53,20 +54,20 @@
     const admin = serviceClient();
 
     let messages: OAIMessage[]; let cacheKey: string | null = null;
-    if (body.kind === 'brief') {
-      // Cache consulté AVANT le quota : une glose déjà connue ne coûte rien.
-      cacheKey = `brief:${normalizeSelection(body.selection)}`;
+    if (body.kind !== 'chat') {
+      // Cache consulté AVANT le quota : une glose ou une Bedeutung déjà connue ne coûte rien (30 j, par texte/mot).
+      cacheKey = `${body.kind}:${normalizeSelection(body.kind === 'brief' ? body.selection : body.word)}`;
       const since = new Date(Date.now() - CACHE_DAYS * 86400_000).toISOString();
       const { data: hit } = await admin.from('ai_cache').select('text').eq('key', cacheKey).gt('created_at', since).maybeSingle();
       if (hit) return new Response(sseOf(hit.text), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-ai-provider': 'cache', ...corsFor(req) } });
-      const { system, user: u } = buildBriefPrompt(body.selection, briefKind(body.selection));
+      const { system, user: u } = body.kind === 'brief' ? buildBriefPrompt(body.selection, briefKind(body.selection)) : buildBedeutungPrompt(body.word, body.context);
       messages = [{ role: 'system', content: system }, { role: 'user', content: u }];
     } else {
       messages = [{ role: 'system', content: DOCTOPUS_SYSTEM }, ...body.turns.map((t) => ({ role: t.role, content: t.text }))];
     }
 
     // Chaîne validée AVANT le quota : sans fournisseur appelable, 503 sans rien consommer.
-    const chain = usableChain(Deno.env.get(body.kind === 'brief' ? 'AI_CHAIN_BRIEF' : 'AI_CHAIN_CHAT'), keys, allowMock);
+    const chain = usableChain(Deno.env.get(body.kind === 'chat' ? 'AI_CHAIN_CHAT' : 'AI_CHAIN_BRIEF'), keys, allowMock);
     if (!chain.length) return j(req, { error: 'no_provider' }, 503);
 
     // rate_hit est révoqué pour authenticated : service role, clé = uid du JWT vérifié.
@@ -79,6 +80,14 @@
     try { opened = await openStream(chain, messages, MAX_TOKENS[body.kind], keys, upstreamAbort.signal); }
     catch (e) { if (e instanceof NoProvider) return j(req, { error: 'no_provider' }, 503); throw e; }
 
+    // Bedeutung : lue en entier, nettoyée (≤ 6 mots, sans emoji), mise en cache, servie en un seul évènement SSE.
+    if (body.kind === 'bedeutung') {
+      const text = cleanBedeutung(await collectText(opened.body));
+      if (!text) return j(req, { error: 'empty' }, 502);
+      await admin.from('ai_cache').upsert({ key: cacheKey!, text, created_at: new Date().toISOString() });
+      return new Response(sseOf(text), { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'x-ai-provider': opened.entry.provider, ...corsFor(req) } });
+    }
+
     // Relais : octets renvoyés tels quels ; brief mis en cache seulement si l'amont a fini ([DONE]).
     const key = cacheKey;
     const out = relay(opened.body,
```

```diff
--- a/app/src/lib/serverAi.ts
+++ b/app/src/lib/serverAi.ts
@@ -16,6 +16,7 @@
 
 type Body =
   | { kind: 'brief'; selection: string }
+  | { kind: 'bedeutung'; word: string; context?: string }
   | { kind: 'chat'; turns: { role: 'user' | 'assistant'; text: string }[] };
 
 export async function serverStream(body: Body, onToken?: (d: string) => void, signal?: AbortSignal): Promise<string> {
```

```diff
--- a/app/src/lib/dictionary.ts
+++ b/app/src/lib/dictionary.ts
@@ -100,4 +100,4 @@
   ];
 }
 
-export { DOCTOPUS_SYSTEM, buildLlmPrompt, briefKind, buildBriefPrompt, type BriefKind } from '../../supabase/functions/_shared/prompts.ts';
+export { DOCTOPUS_SYSTEM, buildLlmPrompt, briefKind, buildBriefPrompt, buildBedeutungPrompt, cleanBedeutung, BEDEUTUNG_MAX_WORDS, type BriefKind } from '../../supabase/functions/_shared/prompts.ts';
```

```diff
--- a/app/src/lib/onlineAi.ts
+++ b/app/src/lib/onlineAi.ts
@@ -1,5 +1,5 @@
 import { OpenRouter } from '@openrouter/sdk';
-import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind } from './dictionary';
+import { DOCTOPUS_SYSTEM, buildBriefPrompt, briefKind, buildBedeutungPrompt, cleanBedeutung } from './dictionary';
 import { AUTH_MODE } from '@/lib/auth/session';
 import { getActiveUserId } from '@/lib/auth/accounts';
 
@@ -299,3 +299,18 @@
   const { system, user } = buildBriefPrompt(selection, kind);
   return (await chat(system, [{ role: 'user', content: user }], kind === 'phrase' ? 220 : 120, 'none')).content.trim();
 }
+
+/** Bedeutung proposée pour une carte personnelle (F4a D4) : ≤ 6 mots, texte brut,
+ *  au sens de la phrase de contexte. Serveur d'abord (nettoyée et mise en cache
+ *  30 j par mot), repli clé navigateur. '' si le modèle ne rend rien d'utilisable. */
+export async function askBedeutung(word: string, context?: string): Promise<string> {
+  if (serverAiAvailable()) {
+    try {
+      return cleanBedeutung(await serverStream({ kind: 'bedeutung', word, ...(context ? { context } : {}) }));
+    } catch (e) {
+      if (!hasKey()) throw new Error(honestAiError(e));
+    }
+  }
+  const { system, user } = buildBedeutungPrompt(word, context);
+  return cleanBedeutung((await chat(system, [{ role: 'user', content: user }], 40, 'none')).content);
+}
```

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib; echo exit=$?` → 0 ; relancer `supabase functions serve --env-file supabase/.env` (avec `AI_ALLOW_MOCK=1`, `AI_CHAIN_BRIEF=mock:brief` déjà dans `supabase/.env` local) ; `node scripts/testRls.mjs; echo exit=$?` → 0 ; `security-auditor` (lecture seule) relit le diff : corps strict (`.strict()`), cache avant quota, pas de prompt système venu du client, texte nettoyé avant cache ; `gates`.

- [ ] **Step 5 : commit**
```bash
git add supabase/functions/_shared/prompts.ts
git add supabase/functions/ai/guards.ts
git add supabase/functions/ai/index.ts
git add supabase/tests/ai.test.ts
git add src/lib/serverAi.ts
git add src/lib/dictionary.ts
git add src/lib/onlineAi.ts
git add src/lib/prompts.shared.test.ts
git add src/lib/onlineAi.route.test.ts
git commit -m "feat(ia): type bedeutung — ≤ 6 mots, sans emoji, au sens de la phrase, cache 30 j par mot (F4a D4)"
```

---

### Task B6 : [CONTRÔLEUR] Migration en EU, redéploiement `events` et `ai`

Étape réservée au contrôleur (MCP Supabase), jamais à un sous-agent. Aucun code. **Avant merge** (AC-11).

- [ ] `list_migrations` (projet `hwpwoblpygvxwbztconc`) → `20260925000014` est la dernière appliquée.
- [ ] `apply_migration` : `name = "personal_updated_event"`, `query` = contenu exact de `supabase/migrations/20260928000015_personal_updated_event.sql`.
- [ ] `execute_sql` : `select pg_get_constraintdef(oid) from pg_constraint where conname = 'progress_events_type_check';` → contient `term.personal_updated`.
- [ ] `get_edge_function events` puis `deploy_edge_function` : `name = "events"`, `verify_jwt = true`, mêmes fichiers et **même forme de chemins** `../_shared/*.ts` que la version déployée lue juste avant.
- [ ] `get_edge_function ai` puis `deploy_edge_function` : `name = "ai"`, `verify_jwt = true`, fichiers `index.ts`, `guards.ts`, `../_shared/supabase.ts`, `../_shared/validate.ts`, `../_shared/ratelimit.ts`, `../_shared/prompts.ts`, `../_shared/aiChain.ts` (même forme que la version lue). `AI_ALLOW_MOCK` n'est **jamais** posé en EU.
- [ ] Vérifications : `get_edge_function ai` → le source contient `kind: z.literal('bedeutung')` ; depuis l'app locale pointée sur EU (compte Mehdi, premium) : créer une carte hors glossaire → la mini-fiche reçoit une Bedeutung ≤ 6 mots sans emoji (`x-ai-provider` ≠ `mock`) ; modifier la Bedeutung → l'événement `term.personal_updated` est `acked`.
- [ ] Consigner dans le ledger (versions de fonctions, horodatage).

---

# Tranche C — Interface

### Task C1 : `TermUsage` + `TermSheet` + icônes maison (front-implementer)

**Files:**
- Modify: `app/src/components/icons.tsx` (3 glyphes)
- Create: `app/src/components/TermUsage.tsx`, `app/src/components/TermSheet.tsx`, `app/src/components/TermSheet.test.tsx`

**Interfaces:**
- Consumes : `updatePersonalExplanation`, `PT_LIMITS` (B2) ; `highlightParts` (B4) ; `AnyTerm`, `isPersonalView` (F3).
- Produces : `USAGES` (ordre `patient` → `anamnese` → `vorstellung`), `TermUsage({ term })`, `TermSheet({ term: AnyTerm, compact?: boolean, actions?: ReactNode })`, `ContextSentence({ sentence, word })`. Libellés : `Bedeutung`, `Définition complète`, `Dans l'entretien`, `Le patient dit`, `Tu demandes`, `Tu présentes`, `à compléter`, bouton `Modifier la Bedeutung`.

- [ ] **Step 1 : tests qui échouent** — créer `app/src/components/TermSheet.test.tsx` :

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { toView } from '@/lib/collections/allTerms';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { TermSheet } from './TermSheet';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const aszites = {
  id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', definitionDetailed: 'Ansammlung freier Flüssigkeit in der Bauchhöhle.', pronunciation: 'asˈtsiːtəs',
  specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0),
  register: { patient: 'Mein Bauch wird immer dicker.', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' },
} as never;

describe('TermSheet (F4a D2/D3, AC-3)', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.personal_terms.clear(); });
  it('ordre : Bedeutung → Définition complète (repliée) → Dans l\'entretien (patient, demande, présentation) avec leur ligne d\'usage', () => {
    const { container } = render(<TermSheet term={aszites} />);
    const text = container.textContent!;
    const pos = ['Bedeutung', 'Définition complète', "Dans l'entretien", 'Le patient dit', 'Tu demandes', 'Tu présentes'].map((s) => text.indexOf(s));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
    expect(container.querySelector('details')!.open).toBe(false);
    expect([...container.querySelectorAll('[data-usage]')].map((li) => li.getAttribute('data-usage'))).toEqual(['patient', 'anamnese', 'vorstellung']);
    for (const li of container.querySelectorAll('[data-usage]')) expect(li.querySelectorAll('p').length).toBe(2);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
  it('sans registre : seulement la Bedeutung ; jamais « patientengerecht »', () => {
    const { container } = render(<TermSheet term={{ ...(aszites as object), register: undefined, definitionDetailed: undefined } as never} />);
    expect(container.textContent).not.toMatch(/Dans l'entretien|patientengerecht/i);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
  it('compacte : Bedeutung seule, ni définition ni usages', () => {
    const { container } = render(<TermSheet term={aszites} compact />);
    expect(container.querySelector('details')).toBeNull();
    expect(container.textContent).not.toMatch(/Dans l'entretien/);
  });
  it('carte personnelle sans Bedeutung → « à compléter » ; modifiable (D8), le mot non', async () => {
    const { id } = await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Seit Wochen Belastungsdyspnoe beim Treppensteigen.' });
    render(<TermSheet term={toView((await db.personal_terms.get(id))!)} />);
    expect(screen.getByText('à compléter')).toBeTruthy();
    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    expect(screen.queryByRole('textbox', { name: /terme|mot/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bedeutung' }), { target: { value: 'Atemnot bei Belastung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(async () => expect((await db.personal_terms.get(id))!.explanation).toBe('Atemnot bei Belastung'));
    expect((await db.progress_events.toArray()).map((e) => e.type).sort()).toEqual(['term.personal_created', 'term.personal_updated']);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/TermSheet.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/components/icons.tsx
+++ b/app/src/components/icons.tsx
@@ -79,6 +79,11 @@
   inbox: <><path d="M4 13.5 6.5 5h11L20 13.5" /><path d="M4 13.5V19h16v-5.5h-5.2a2.8 2.8 0 0 1-5.6 0H4z" /></>,
   globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
   trash: <path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" />,
+  // « Dans l'entretien » (F4a D2) — dessinés pour Doctopus : bulle patient (guillemets),
+  // bulle de question (point d'interrogation), pupitre de présentation (Vorstellung).
+  'say-patient': <><path d="M4 5.5h16v10H11l-4.5 3.5v-3.5H4z" /><path d="M9 9.2c-.8.3-1.2.9-1.2 1.8M12.6 9.2c-.8.3-1.2.9-1.2 1.8" /></>,
+  'say-ask': <><path d="M20 5.5H4v10h9l4.5 3.5v-3.5H20z" /><path d="M10.3 9a1.8 1.8 0 013.4.7c0 1.2-1.7 1.3-1.7 2.3M12 13.9h.01" /></>,
+  'say-present': <><path d="M6 20h12M12 16v4" /><path d="M5 4.5h14v8.5H5z" /><path d="M8.5 8h7M8.5 10.5h4" /></>,
   // Vraie roue dentée : dents COLLÉES à la jante (un soleil a des rayons détachés).
   gear: <><circle cx="12" cy="12" r="5.8" /><circle cx="12" cy="12" r="2" /><path d="M12 3.4v2.8M12 17.8v2.8M20.6 12h-2.8M6.2 12H3.4M18.1 5.9l-2 2M7.9 16.1l-2 2M18.1 18.1l-2-2M7.9 7.9l-2-2" /></>,
   target2: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></>,
```

```tsx
// ============================================================================
// « Dans l'entretien » (F4a D2) : les trois usages d'un terme, dans l'ordre où
// on les rencontre — le patient le dit, tu le demandes, tu le présentes. Chaque
// ligne porte son icône maison, son libellé, le texte, et UNE ligne qui dit à
// quoi elle sert. Sans registre : rien (la fiche n'affiche que la Bedeutung, D3).
// ============================================================================
import type { Fachbegriff } from '@/db/types';
import { Icon } from './icons';

export const USAGES = [
  { key: 'patient', icon: 'say-patient', label: 'Le patient dit', use: 'Reconnais le terme derrière ses mots.' },
  { key: 'anamnese', icon: 'say-ask', label: 'Tu demandes', use: 'La question d\'anamnèse, sans le Fachbegriff.' },
  { key: 'vorstellung', icon: 'say-present', label: 'Tu présentes', use: 'La phrase pour la Vorstellung ou l\'Arztbrief.' },
] as const;

export function TermUsage({ term }: { term: Pick<Fachbegriff, 'register'> }) {
  const r = term.register;
  if (!r) return null;
  return (
    <section aria-labelledby="term-usage-title">
      <h4 id="term-usage-title" className="label mb-2">Dans l'entretien</h4>
      <ol className="space-y-2">
        {USAGES.map((u) => (
          <li key={u.key} data-usage={u.key} className="flex gap-2.5 rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
            <Icon name={u.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" title={u.label} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{u.label}</div>
              <p className="break-words text-sm text-slate-800 dark:text-slate-100">{u.key === 'patient' ? `« ${r.patient} »` : r[u.key]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{u.use}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

```tsx
// ============================================================================
// Fiche d'un terme (F4a D2) — UN composant pour le tiroir latéral, la carte au
// survol (compacte) et le dos de la carte au drill. Ordre : Bedeutung →
// Définition complète (repliée) → Dans l'entretien. Carte personnelle : la
// Bedeutung se corrige (D8), le mot jamais ; sans Bedeutung → « à compléter ».
// ============================================================================
import { useState, type ReactNode } from 'react';
import { isPersonalView, type AnyTerm } from '@/lib/collections/allTerms';
import { updatePersonalExplanation, PT_LIMITS } from '@/lib/collections/personalTerms';
import { highlightParts } from '@/lib/sentence';
import { TermUsage } from './TermUsage';
import { Icon } from './icons';

export function ContextSentence({ sentence, word }: { sentence: string; word: string }) {
  const parts = highlightParts(sentence, word);
  return (
    <p className="text-sm text-slate-600 dark:text-slate-300">
      {parts ? <>{parts[0]}<mark className="rounded bg-brand-100 px-0.5 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100">{parts[1]}</mark>{parts[2]}</> : sentence}
    </p>
  );
}

function BedeutungEditor({ id, initial, onDone }: { id: string; initial: string; onDone: () => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try { await updatePersonalExplanation(id, value); onDone(); }
    catch { setError('Écris la signification.'); }
  };
  return (
    <div className="space-y-1.5">
      <input aria-label="Bedeutung" value={value} maxLength={PT_LIMITS.explanation} autoFocus onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') onDone(); }} className="input min-h-11 w-full" />
      <div className="flex gap-2">
        <button type="button" onClick={() => { void save(); }} disabled={!value.trim()} className="btn-primary min-h-11 text-sm">Enregistrer</button>
        <button type="button" onClick={onDone} className="btn-outline min-h-11 text-sm">Annuler</button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function TermSheet({ term, compact = false, actions }: { term: AnyTerm; compact?: boolean; actions?: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const personal = isPersonalView(term);
  const bedeutung = term.translationSimple.trim();
  return (
    <div className="space-y-4" data-term-sheet={term.id}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`${compact ? 'text-base' : 'text-lg'} break-words font-bold text-brand-700 dark:text-brand-300`}>{term.term}</h3>
          {term.pronunciation && <p className="text-sm text-slate-400">/{term.pronunciation}/</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>

      <section aria-labelledby={`bedeutung-${term.id}`}>
        <h4 id={`bedeutung-${term.id}`} className="label mb-1">Bedeutung</h4>
        {editing && personal ? (
          <BedeutungEditor id={term.id} initial={bedeutung} onDone={() => setEditing(false)} />
        ) : (
          <div className="flex items-start gap-2">
            <p className={`min-w-0 flex-1 ${bedeutung ? 'text-base text-slate-800 dark:text-slate-100' : 'text-sm italic text-slate-400'}`}>{bedeutung || 'à compléter'}</p>
            {personal && !compact && (
              <button type="button" aria-label="Modifier la Bedeutung" onClick={() => setEditing(true)} className="btn-ghost h-11 w-11 shrink-0 justify-center">
                <Icon name="pen" className="h-4 w-4" title="Modifier" />
              </button>
            )}
          </div>
        )}
      </section>

      {!compact && term.definitionDetailed && (
        <details className="group rounded-lg border border-slate-200 dark:border-slate-800">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Définition complète</summary>
          <p className="px-3 pb-3 text-sm text-slate-600 dark:text-slate-300">{term.definitionDetailed}</p>
        </details>
      )}

      {!compact && <TermUsage term={term} />}

      {!compact && personal && term.context && (
        <section aria-labelledby={`contexte-${term.id}`}>
          <h4 id={`contexte-${term.id}`} className="label mb-1">Contexte</h4>
          <ContextSentence sentence={term.context} word={term.term} />
        </section>
      )}
    </div>
  );
}
```

Les trois lignes d'usage sont du **copy à valider par `direction-keeper`** en E1 (concision, pas de doublon avec les libellés).

- [ ] **Step 4 : vérifier** — test → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/icons.tsx
git add src/components/TermUsage.tsx
git add src/components/TermSheet.tsx
git add src/components/TermSheet.test.tsx
git commit -m "feat(fachbegriffe): fiche unique — Bedeutung, définition repliée, « Dans l'entretien » (F4a D2/D3/D8)"
```

---

### Task C2 : `CardFlip` extraite du drill, règle de sens (front-implementer)

**Files:**
- Create: `app/src/components/CardFlip.tsx`, `app/src/components/CardFlip.test.tsx`
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx`, `DrillPage.test.tsx`

**Interfaces:**
- Consumes : `TermSheet` (C1).
- Produces : `CardDirection = 'term2simple' | 'simple2term'`, `cardFront(card, direction): string`, `CardFlip({ card, direction, revealed, onFlip, hint?, size?: 'full' | 'mini' })` — attribut `data-card-flip="recto|verso"` ; verso monté seulement une fois retourné.

- [ ] **Step 1 : tests qui échouent** — créer `app/src/components/CardFlip.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { freshSrs } from '@/lib/srs';
import { CardFlip, cardFront } from './CardFlip';

const card = {
  id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0),
  register: { patient: 'Mein Bauch wird dicker.', vorstellung: 'Es zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' },
} as never;
const personal = { id: 'pt-1', term: 'Übelkeit', translationSimple: '', personal: true, context: 'Sie berichtet über Übelkeit seit heute.', specialty: 'Allgemein', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never;

describe('CardFlip (F4a §3.4, AC-8)', () => {
  it('Terme → sens : recto = terme ; verso (monté seulement une fois retourné) = la fiche complète', () => {
    const { rerender, container } = render(<CardFlip card={card} direction="term2simple" revealed={false} onFlip={() => {}} />);
    expect(screen.getByText('Aszites')).toBeTruthy();
    expect(container.textContent).not.toContain('Bauchwasser');
    rerender(<CardFlip card={card} direction="term2simple" revealed onFlip={() => {}} />);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
    expect(screen.getByText("Dans l'entretien")).toBeTruthy();
  });
  it('Sens → terme : recto = Bedeutung ; verso = le terme seul, jamais la fiche', () => {
    render(<CardFlip card={card} direction="simple2term" revealed onFlip={() => {}} />);
    expect(screen.getAllByText('Bauchwasser')).toHaveLength(1);
    expect(screen.getByText('Aszites')).toBeTruthy();
    expect(screen.queryByText("Dans l'entretien")).toBeNull();
  });
  it('carte personnelle sans Bedeutung, Sens → terme : contexte masqué au recto', () => {
    expect(cardFront(personal, 'simple2term')).toBe('Sie berichtet über … seit heute.');
    expect(cardFront(personal, 'term2simple')).toBe('Übelkeit');
  });
  it('miniature : pas de bouton Révéler, verso compact', () => {
    render(<CardFlip card={card} direction="term2simple" revealed size="mini" onFlip={() => {}} />);
    expect(screen.queryByRole('button', { name: /révéler/i })).toBeNull();
    expect(screen.queryByText("Dans l'entretien")).toBeNull();
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
});
```

et dans `DrillPage.test.tsx` :

```diff
--- a/app/src/features/fachbegriffe/DrillPage.test.tsx
+++ b/app/src/features/fachbegriffe/DrillPage.test.tsx
@@ -166,7 +166,7 @@
     expect((await screen.findAllByText(/berichtet über … seit dem Frühstück/i)).length).toBeGreaterThan(0);
   });
 
-  it('terme personnel sans explication ni contexte : aucune face vide, hint sur le verso (I-1)', async () => {
+  it('terme personnel sans explication ni contexte : aucune face vide, « à compléter » au verso (I-1, F4a D8)', async () => {
     await db.fachbegriffe.clear();
     await db.personal_terms.put({ id: 'pt-noexpl01', term: 'Belastungsdyspnoe', createdAt: '2026-09-25T10:00:00Z', srs: freshSrs(0) } as never);
     renderAt('/fachbegriffe/drill');
@@ -175,6 +175,6 @@
     expect((await screen.findAllByText('Belastungsdyspnoe')).length).toBeGreaterThan(0);
     const revealBtn = await screen.findByRole('button', { name: /révéler/i });
     fireEvent.click(revealBtn);
-    expect((await screen.findAllByText(/pas encore d.explication/i)).length).toBeGreaterThan(0);
+    expect((await screen.findAllByText('à compléter')).length).toBeGreaterThan(0);
   });
 });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/CardFlip.test.tsx src/features/fachbegriffe/DrillPage.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```tsx
// ============================================================================
// La carte recto/verso — UNE pour le drill, le tiroir (« Carte », D9) et la
// miniature de confirmation (D7). Sens « Terme → sens » : recto = terme, verso
// = la fiche (TermSheet, compacte en miniature). Sens « Sens → terme » : recto =
// Bedeutung (déjà la réponse du sens), verso = le terme seul. Carte personnelle
// sans Bedeutung : le recto « Sens → terme » masque le terme dans son contexte ;
// jamais de face vide, jamais la réponse au recto (F3 I-1). Le verso n'est
// monté qu'une fois retourné : la réponse n'est ni lue ni trouvée avant.
// ============================================================================
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView } from '@/lib/collections/allTerms';
import { TermSheet } from './TermSheet';

export type CardDirection = 'term2simple' | 'simple2term';

// ponytail : masquage naïf (occurrences du terme entier, insensible à la casse, lookarounds
// Unicode — \b est ASCII-only) ; suffit pour un seul terme dans une phrase de contexte.
function maskTerm(text: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), '…');
}

/** Recto selon le sens. */
export function cardFront(card: AnyTerm, direction: CardDirection): string {
  if (direction === 'term2simple') return card.term;
  const bedeutung = card.translationSimple.trim();
  if (bedeutung) return bedeutung;
  const context = isPersonalView(card) ? card.context : undefined;
  return context ? maskTerm(context, card.term) : card.term;
}

export function CardFlip({ card, direction, revealed, onFlip, hint = '', size = 'full' }: {
  card: AnyTerm; direction: CardDirection; revealed: boolean; onFlip: () => void; hint?: string; size?: 'full' | 'mini';
}) {
  const mini = size === 'mini';
  const face = `card absolute inset-0 flex flex-col items-center [backface-visibility:hidden] ${mini ? 'p-3' : 'p-8'}`;
  return (
    <div className="[perspective:1200px]">
      <div data-card-flip={revealed ? 'verso' : 'recto'} className={`relative ${mini ? 'h-40' : 'h-[320px]'} transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className={`${face} justify-center text-center`} aria-hidden={revealed}>
          <div className="label">{direction === 'term2simple' ? 'Fachbegriff' : 'Bedeutung'}{mini ? '' : ` · ${card.specialty}`}</div>
          <div className={`${mini ? 'mt-1 text-lg' : 'mt-4 text-2xl'} font-display font-bold tracking-tightish`}>{cardFront(card, direction)}</div>
          {direction === 'term2simple' && card.pronunciation && !mini && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
          {!mini && <button type="button" onClick={onFlip} tabIndex={revealed ? -1 : 0} className="btn-outline mt-8">Révéler{hint}</button>}
        </div>
        <div className={`${face} overflow-y-auto text-left [transform:rotateY(180deg)]`} aria-hidden={!revealed}>
          {revealed && (direction === 'term2simple'
            ? <div className="w-full"><TermSheet term={card} compact={mini} /></div>
            : <div className="m-auto text-center">
                <div className={`${mini ? 'text-lg' : 'text-2xl'} font-display font-bold text-brand-700 dark:text-brand-300`}>{card.term}</div>
                {card.pronunciation && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
              </div>)}
        </div>
      </div>
    </div>
  );
}
```

```diff
--- a/app/src/features/fachbegriffe/DrillPage.tsx
+++ b/app/src/features/fachbegriffe/DrillPage.tsx
@@ -5,8 +5,8 @@
 import { Icon } from '@/components/icons';
 import { useAllTerms, useDecks, useDeckTerms, useFavorites, useCase } from '@/hooks/useData';
 import type { AnyTerm } from '@/lib/collections/allTerms';
-import { isPersonalView, rateTerm } from '@/lib/collections/allTerms';
-import { registerLine } from '@/components/TermRegister';
+import { rateTerm } from '@/lib/collections/allTerms';
+import { CardFlip, type CardDirection } from '@/components/CardFlip';
 import { FAVORITES_DECK_ID } from '@/db/types';
 import { reviewSrs, type Grade } from '@/lib/srs';
 import { markIntroduced, markReviewed } from '@/lib/srsBudget';
@@ -19,15 +19,6 @@
 
 const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };
 
-// ponytail: masquage naïf (occurrences du terme entier, insensible à la casse) — pas de
-// tokenizer linguistique ; suffisant pour un seul terme dans une phrase de contexte.
-// \b est ASCII-only (même piège que l'autolink, cf. autolink.tsx) : un terme à
-// umlaut/ß (Übelkeit, Ödem…) en début/fin de mot ne serait pas masqué → lookarounds Unicode.
-function maskTerm(text: string, term: string): string {
-  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
-  return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), '…');
-}
-
 // Drill SM-2 bidirectionnel. Priorité aux termes de la spécialité/pathologie
 // du cas travaillé, puis progression libre (couverture inclusive).
 // Un deck (ou les favoris) borne la file : jamais un terme hors du deck.
@@ -53,7 +44,7 @@
   const [started, setStarted] = useState(false);
   const [idx, setIdx] = useState(0);
   const [revealed, setRevealed] = useState(false);
-  const [direction, setDirection] = useState<'term2simple' | 'simple2term'>('term2simple');
+  const [direction, setDirection] = useState<CardDirection>('term2simple');
   const [stats, setStats] = useState({ done: 0, again: 0 });
   const [ctx, setCtx] = useState<DrillContext | null>(null);
 
@@ -174,27 +165,6 @@
   }
 
   const card = queue[idx];
-  // Terme personnel étoilé avant explication (I-1, review) : jamais de face
-  // vide, et jamais la réponse offerte au recto. Sans explication : le
-  // contexte (s'il existe) va au dos labellisé « Contexte » (Terme → sens),
-  // ou masqué au recto (Sens → terme, ponytail : \b + regex simple, pas de
-  // tokenizer — suffit pour un seul terme masqué).
-  const reformulation = registerLine(card);
-  const hasReformulation = reformulation.length > 0;
-  const context = isPersonalView(card) ? card.context : undefined;
-  let front: string;
-  let back: string;
-  let backLabel: string | null = null;
-  if (hasReformulation) {
-    front = direction === 'term2simple' ? card.term : card.translationSimple;
-    back = direction === 'term2simple' ? reformulation : card.term;
-  } else if (context) {
-    if (direction === 'term2simple') { front = card.term; back = context; backLabel = 'Contexte'; }
-    else { front = maskTerm(context, card.term); back = card.term; }
-  } else {
-    front = card.term;
-    back = 'Carte personnelle — pas encore d\'explication';
-  }
 
   const grade = async (g: Grade) => {
     const wasNew = card.srs.state === 'Neu';
@@ -221,27 +191,7 @@
         <div className="h-full bg-brand-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
       </div>
 
-      {/* Flashcard 3D — retournement rotateY : recto = question, verso = réponse.
-          Pédagogiquement juste (une carte se retourne) + « un peu de 3D » sobre. */}
-      <div className="[perspective:1200px]">
-        <div className={`relative h-[320px] transition-transform duration-500 [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
-          {/* Recto */}
-          <div className="card absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
-            <div className="label">{direction === 'term2simple' ? 'Fachbegriff' : 'Bedeutung'} · {card.specialty}</div>
-            <div className="mt-4 font-display text-2xl font-bold tracking-tightish">{front}</div>
-            {direction === 'term2simple' && card.pronunciation && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
-            <button onClick={() => setRevealed(true)} className="btn-outline mt-8">Révéler (Leertaste)</button>
-          </div>
-          {/* Verso */}
-          <div className="card absolute inset-0 flex flex-col items-center justify-center overflow-y-auto p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
-            <div className="label">{front}</div>
-            {backLabel && <div className="label">{backLabel}</div>}
-            <div className="mt-3 text-xl font-semibold text-brand-700 dark:text-brand-300">{back}</div>
-            {direction === 'term2simple' && card.register && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{card.register.anamnese}</p>}
-            {card.definitionDetailed && <p className="mx-auto mt-3 max-w-md text-sm text-slate-500 dark:text-slate-400">{card.definitionDetailed}</p>}
-          </div>
-        </div>
-      </div>
+      <CardFlip card={card} direction={direction} revealed={revealed} onFlip={() => setRevealed(true)} hint=" (Leertaste)" />
 
       {revealed && (
         <div className="grid grid-cols-4 gap-2">
```

- [ ] **Step 4 : vérifier** — tests → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/CardFlip.tsx
git add src/components/CardFlip.test.tsx
git add src/features/fachbegriffe/DrillPage.tsx
git add src/features/fachbegriffe/DrillPage.test.tsx
git commit -m "refactor(fachbegriffe): CardFlip extraite du drill — la fiche au dos en « Terme → sens », le terme seul en « Sens → terme » (F4a §3.4)"
```

---

### Task C3 : Decks d'un terme, « déplacer », store de confirmation (platform-sync-engineer)

**Files:**
- Modify: `app/src/lib/collections/query.ts`, `query.test.ts`, `index.ts`, `index.test.ts`
- Modify: `app/src/hooks/useData.ts`
- Create: `app/src/store/cardToast.ts`

**Interfaces:**
- Produces : `termIdsInDecks(favorites, deckTerms): Set<string>`, `decksOfTerm(termId, favorites, deckTerms): string[]` (Favoris d'abord) ; `addTermToDeck(deckId, termId, opts?)`, `removeTermFromDeck(deckId, termId)`, `moveTermToDeck(termId, fromDeckId, toDeckId, opts?)` (idempotents ; `FAVORITES_DECK_ID` → `term.favorited`/`term.unfavorited`) ; `useTermsInDecks(): Set<string>` ; `useCardToast` : `{ toast: CardToast | null; show(t); hide() }`, `CardToast = { kind: 'saved'; term: AnyTerm; deckId: string; caseId?: string } | { kind: 'deleted'; term: AnyTerm }`.

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/lib/collections/query.test.ts
+++ b/app/src/lib/collections/query.test.ts
@@ -1,5 +1,5 @@
 import { describe, it, expect } from 'vitest';
-import { applyQuery, termsOfDeck } from './query';
+import { applyQuery, termsOfDeck, termIdsInDecks, decksOfTerm } from './query';
 import { FAVORITES_DECK_ID, type Fachbegriff } from '@/db/types';
 import { freshSrs } from '@/lib/srs';
 
@@ -27,3 +27,13 @@
     expect(termsOfDeck({ id: FAVORITES_DECK_ID }, all, [], [{ termId: 'a', since: '' }]).map((x) => x.id)).toEqual(['a']);
   });
 });
+
+describe('decks d\'un terme (F4a D6)', () => {
+  const favorites = [{ termId: 'a', since: '' }];
+  const deckTerms = [{ deckId: 'd1', termId: 'a', addedAt: '' }, { deckId: 'd2', termId: 'b', addedAt: '' }];
+  it('termIdsInDecks : Favoris ∪ decks manuels', () => expect([...termIdsInDecks(favorites, deckTerms)].sort()).toEqual(['a', 'b']));
+  it('decksOfTerm : Favoris d\'abord', () => {
+    expect(decksOfTerm('a', favorites, deckTerms)).toEqual([FAVORITES_DECK_ID, 'd1']);
+    expect(decksOfTerm('c', favorites, deckTerms)).toEqual([]);
+  });
+});
```

```diff
--- a/app/src/lib/collections/index.test.ts
+++ b/app/src/lib/collections/index.test.ts
@@ -1,6 +1,6 @@
 import { describe, it, expect, beforeEach, vi } from 'vitest';
 import { db } from '@/db/db';
-import { toggleFavorite, createDeck, renameDeck, deleteDeck, addToDeck, removeFromDeck, setDeckQuery, normalizeDeckName } from './index';
+import { toggleFavorite, createDeck, renameDeck, deleteDeck, addToDeck, removeFromDeck, setDeckQuery, normalizeDeckName, addTermToDeck, removeTermFromDeck, moveTermToDeck } from './index';
 import { FAVORITES_DECK_ID } from '@/db/types';
 
 vi.mock('@/lib/sync/queue', async () => {
@@ -58,4 +58,23 @@
     expect(() => normalizeDeckName('   ')).toThrow('deck_name');
     expect(() => normalizeDeckName('x'.repeat(41))).toThrow('deck_name');
   });
+
+  it('addTermToDeck / removeTermFromDeck : Favoris = term.favorited ; idempotents (F4a D6)', async () => {
+    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1', { caseId: 'case-x' });
+    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1');
+    const deckId = await createDeck('Kardio', 'manual');
+    await addTermToDeck(deckId, 'fb-1'); await addTermToDeck(deckId, 'fb-1');
+    const evs = await db.progress_events.toArray();
+    expect(evs.map((e) => e.type).sort()).toEqual(['deck.created', 'deck.term_added', 'term.favorited']);
+    expect(evs.find((e) => e.type === 'term.favorited')!.payload).toEqual({ caseId: 'case-x' });
+    await removeTermFromDeck(FAVORITES_DECK_ID, 'fb-1'); await removeTermFromDeck(FAVORITES_DECK_ID, 'fb-1');
+    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.unfavorited')).toHaveLength(1);
+  });
+  it('moveTermToDeck : retiré de l\'ancien, ajouté au nouveau (Changer de deck = déplacer)', async () => {
+    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1');
+    const deckId = await createDeck('Kardio', 'manual');
+    await moveTermToDeck('fb-1', FAVORITES_DECK_ID, deckId);
+    expect(await db.favorites.get('fb-1')).toBeUndefined();
+    expect(await db.deck_terms.get([deckId, 'fb-1'])).toBeTruthy();
+  });
 });
```

(L'ordre de `toArray()` suit la clé primaire uuid : les types d'événements sont **triés** avant comparaison.)

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/collections/query.test.ts src/lib/collections/index.test.ts; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/lib/collections/query.ts
+++ b/app/src/lib/collections/query.ts
@@ -18,3 +18,15 @@
   const ids = new Set(deckTerms.filter((t) => t.deckId === d.id).map((t) => t.termId));
   return all.filter((b) => ids.has(b.id));
 }
+
+/** Ids des termes rangés dans au moins un deck, Favoris compris — ★ plein (F4a D6). */
+export function termIdsInDecks(favorites: Favorite[], deckTerms: DeckTerm[]): Set<string> {
+  return new Set([...favorites.map((f) => f.termId), ...deckTerms.map((t) => t.termId)]);
+}
+/** Decks (ids) qui contiennent le terme : Favoris d'abord, puis les decks manuels. */
+export function decksOfTerm(termId: string, favorites: Favorite[], deckTerms: DeckTerm[]): string[] {
+  return [
+    ...(favorites.some((f) => f.termId === termId) ? [FAVORITES_DECK_ID] : []),
+    ...deckTerms.filter((t) => t.termId === termId).map((t) => t.deckId),
+  ];
+}
```

```diff
--- a/app/src/lib/collections/index.ts
+++ b/app/src/lib/collections/index.ts
@@ -39,3 +39,27 @@
 export const deleteDeck = async (deckId: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.deleted', deckId, {}); };
 export const addToDeck = (deckId: string, termId: string, opts: { caseId?: string } = {}) => emit('deck.term_added', deckId, { termId, ...(opts.caseId ? { caseId: opts.caseId } : {}) });
 export const removeFromDeck = (deckId: string, termId: string) => emit('deck.term_removed', deckId, { termId });
+
+/** Range un terme dans un deck (F4a D6) : Favoris = term.favorited (deck réservé),
+ *  sinon deck.term_added. Idempotent : déjà rangé → rien n'est émis. */
+export async function addTermToDeck(deckId: string, termId: string, opts: { caseId?: string } = {}): Promise<void> {
+  if (deckId === FAVORITES_DECK_ID) {
+    if (!(await db.favorites.get(termId))) await emit('term.favorited', termId, opts.caseId ? { caseId: opts.caseId } : {});
+    return;
+  }
+  if (!(await db.deck_terms.get([deckId, termId]))) await addToDeck(deckId, termId, opts);
+}
+/** Retire un terme d'un deck (Favoris compris). Absent → rien n'est émis. */
+export async function removeTermFromDeck(deckId: string, termId: string): Promise<void> {
+  if (deckId === FAVORITES_DECK_ID) {
+    if (await db.favorites.get(termId)) await emit('term.unfavorited', termId, {});
+    return;
+  }
+  if (await db.deck_terms.get([deckId, termId])) await removeFromDeck(deckId, termId);
+}
+/** « Changer de deck » = DÉPLACER : retiré de l'ancien, ajouté au nouveau (D6). */
+export async function moveTermToDeck(termId: string, fromDeckId: string, toDeckId: string, opts: { caseId?: string } = {}): Promise<void> {
+  if (fromDeckId === toDeckId) return;
+  await removeTermFromDeck(fromDeckId, termId);
+  await addTermToDeck(toDeckId, termId, opts);
+}
```

`app/src/hooks/useData.ts` — ajouter `import { termIdsInDecks } from '@/lib/collections/query';` et, après `useFavorites` :
```ts
/** Termes rangés dans au moins un deck (Favoris compris) : l'étoile pleine (F4a D6). */
export function useTermsInDecks(): Set<string> {
  const favorites = useFavorites(); const deckTerms = useDeckTerms();
  return useMemo(() => termIdsInDecks(favorites ?? [], deckTerms ?? []), [favorites, deckTerms]);
}
```

```ts
// Confirmation d'une carte (F4a D7/D10) — montée une fois dans Shell, ouverte
// par l'étoile, la mini-fiche de création et la corbeille.
import { create } from 'zustand';
import type { AnyTerm } from '@/lib/collections/allTerms';

export type CardToast =
  | { kind: 'saved'; term: AnyTerm; deckId: string; caseId?: string }
  | { kind: 'deleted'; term: AnyTerm };

export const useCardToast = create<{ toast: CardToast | null; show: (t: CardToast) => void; hide: () => void }>((set) => ({
  toast: null,
  show: (toast) => set({ toast }),
  hide: () => set({ toast: null }),
}));
```

- [ ] **Step 4 : vérifier** — tests → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/lib/collections/query.ts
git add src/lib/collections/query.test.ts
git add src/lib/collections/index.ts
git add src/lib/collections/index.test.ts
git add src/hooks/useData.ts
git add src/store/cardToast.ts
git commit -m "feat(fachbegriffe): une seule notion de rangement — decks d'un terme, Favoris par défaut, déplacer (F4a D6)"
```

---

### Task C4 : `StarButton`, `DeckChecklist`, `CardToast` (front-implementer)

**Files:**
- Create: `app/src/components/DeckChecklist.tsx`, `StarButton.tsx`, `CardToast.tsx`, `StarButton.test.tsx`
- Modify: `app/src/components/Shell.tsx`

**Interfaces:**
- Consumes : C2 (`CardFlip`), C3, B3 (`cancelDeletion`, `DELETE_DELAY_MS`), `Portal`.
- Produces : `StarButton({ term, filled, caseId?, tone?: 'plain' | 'onBrand', buttonRef? })` — libellés `Ajouter aux favoris : <terme>` (vide) / `Decks de <terme>` (pleine, `aria-haspopup="menu"`) ; `DeckChecklist({ termId, caseId?, anchor: DOMRect, onClose })` (`role="menu"`, `data-keep-open`) ; `CardToast()` monté une fois dans `Shell` (`data-keep-open`). Convention : toute couche flottante porte `data-keep-open` ; la bulle de sélection et la carte au survol ne se ferment pas quand on la touche (C5, C7).

- [ ] **Step 1 : tests qui échouent** — créer `app/src/components/StarButton.test.tsx` :

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useCardToast } from '@/store/cardToast';
import { createDeck, addTermToDeck } from '@/lib/collections';
import { useTermsInDecks } from '@/hooks/useData';
import { StarButton } from './StarButton';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const term = { id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never;
function Harness({ caseId }: { caseId?: string }) {
  const inDecks = useTermsInDecks();
  return <><StarButton term={term} filled={inDecks.has('fb-aszites')} caseId={caseId} /><CardToast /></>;
}

describe('StarButton + CardToast (F4a D6/D7, AC-6)', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); await db.deck_terms.clear(); useCardToast.setState({ toast: null }); });

  it('★ vide → Favoris (+caseId), confirmation avec miniature, « Voir la carte » retourne', async () => {
    render(<Harness caseId="case-leberzirrhose" />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter aux favoris : Aszites' }));
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
    expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')!.payload).toEqual({ caseId: 'case-leberzirrhose' });
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('recto');
    fireEvent.click(screen.getByRole('button', { name: 'Voir la carte' }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('verso');
    expect(await screen.findByRole('button', { name: 'Decks de Aszites' })).toBeTruthy();
  });
  it('« Changer de deck » déplace : retiré de Favoris, ajouté au deck choisi', async () => {
    const deckId = await createDeck('Leber', 'manual');
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter aux favoris : Aszites' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Changer de deck' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leber' }));
    await waitFor(async () => expect(await db.deck_terms.get([deckId, 'fb-aszites'])).toBeTruthy());
    expect(await db.favorites.get('fb-aszites')).toBeUndefined();
    expect(await screen.findByText('Leber', { selector: 'strong' })).toBeTruthy();
  });
  it('★ pleine (terme dans un deck, pas en Favoris) → liste ses decks ; décocher retire', async () => {
    const deckId = await createDeck('Leber', 'manual');
    await addTermToDeck(deckId, 'fb-aszites');
    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Aszites' }));
    expect((await screen.findByRole('menuitemcheckbox', { name: /Favoris/ })).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Leber/ }));
    await waitFor(async () => expect(await db.deck_terms.get([deckId, 'fb-aszites'])).toBeUndefined());
    expect(await screen.findByRole('button', { name: 'Ajouter aux favoris : Aszites' })).toBeTruthy();
    expect(FAVORITES_DECK_ID).toBe('deck-favorites');
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/StarButton.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```tsx
// ============================================================================
// Les decks d'un terme (F4a D6) : ouverte par une ★ pleine. Favoris + decks
// manuels cochés ; toucher retire ou ajoute ; « + Nouveau deck » crée et range.
// Téléportée (Portal) et positionnée sous l'étoile : jamais rognée par une
// liste qui défile. `data-keep-open` : la bulle de sélection et la carte au
// survol ne se ferment pas quand on la touche.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, createDeck, removeTermFromDeck } from '@/lib/collections';
import { decksOfTerm } from '@/lib/collections/query';
import { Portal } from './Portal';

const W = 224;

export function DeckChecklist({ termId, caseId, anchor, onClose }: { termId: string; caseId?: string; anchor: DOMRect; onClose: () => void }) {
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const has = new Set(decksOfTerm(termId, favorites ?? [], deckTerms ?? []));
  const rows = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  const opts = caseId ? { caseId } : {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // L'étoile qui a ouvert la liste la referme elle-même (sinon : fermée ici puis rouverte par son clic).
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('[aria-haspopup="menu"][aria-expanded="true"]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [onClose]);

  const create = async () => {
    try { const id = await createDeck(name, 'manual'); await addTermToDeck(id, termId, opts); setName(''); setError(null); }
    catch (err) { setError(err instanceof Error && err.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de créer le deck.'); }
  };
  if (!decks || !deckTerms || !favorites) return null;   // états cochés inconnus : ne rien proposer à toucher
  const left = Math.max(8, Math.min(anchor.right - W, window.innerWidth - W - 8));
  return (
    <Portal>
      <div ref={ref} data-keep-open role="menu" aria-label="Decks de ce terme" style={{ position: 'fixed', top: anchor.bottom + 4, left, width: W }}
        className="z-[90] rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
        {rows.map((d) => (
          <button key={d.id} type="button" role="menuitemcheckbox" aria-checked={has.has(d.id)}
            onClick={() => { void (has.has(d.id) ? removeTermFromDeck(d.id, termId) : addTermToDeck(d.id, termId, opts)); }}
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
            {d.name}<span aria-hidden>{has.has(d.id) ? '✓' : ''}</span>
          </button>
        ))}
        <div className="mt-1 flex gap-1 border-t border-slate-100 p-1 dark:border-slate-800">
          <input aria-label="Nom du nouveau deck" value={name} maxLength={40} placeholder="Nouveau deck" onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} className="input min-h-11 flex-1" />
          <button type="button" onClick={() => { void create(); }} disabled={!name.trim()} className="btn-outline min-h-11 px-3">Créer</button>
        </div>
        {error && <p role="alert" className="px-2 pb-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Portal>
  );
}
```

```tsx
// ============================================================================
// L'étoile (F4a D6) — une seule notion : les decks. ★ vide → le terme est rangé
// dans Favoris (deck par défaut) et la confirmation montre la carte (D7).
// ★ pleine = le terme est dans au moins un deck → toucher liste ses decks.
// ============================================================================
import { useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { addTermToDeck } from '@/lib/collections';
import { useCardToast } from '@/store/cardToast';
import { DeckChecklist } from './DeckChecklist';

export function StarButton({ term, filled, caseId, tone = 'plain', buttonRef }: {
  term: AnyTerm; filled: boolean; caseId?: string; tone?: 'plain' | 'onBrand'; buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const show = useCardToast((s) => s.show);
  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (filled) { const r = e.currentTarget.getBoundingClientRect(); setAnchor((a) => (a ? null : r)); return; }
    if (busy.current) return;
    busy.current = true; setError(null);
    try {
      await addTermToDeck(FAVORITES_DECK_ID, term.id, caseId ? { caseId } : {});
      show({ kind: 'saved', term, deckId: FAVORITES_DECK_ID, ...(caseId ? { caseId } : {}) });
    } catch { setError('Impossible d\'enregistrer : réessaie.'); }
    finally { busy.current = false; }
  };
  const color = tone === 'onBrand'
    ? `hover:bg-brand-700 ${filled ? 'text-signal-300' : 'text-white'}`
    : filled ? 'text-signal-600 dark:text-signal-400' : 'text-slate-400 hover:text-signal-500 dark:text-slate-500';
  return (
    <>
      <button ref={buttonRef} type="button" onClick={(e) => { void onClick(e); }} aria-pressed={filled}
        aria-label={filled ? `Decks de ${term.term}` : `Ajouter aux favoris : ${term.term}`}
        aria-haspopup={filled ? 'menu' : undefined} aria-expanded={filled ? !!anchor : undefined}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${color}`}>{filled ? '★' : '☆'}</button>
      {anchor && filled && <DeckChecklist termId={term.id} caseId={caseId} anchor={anchor} onClose={() => setAnchor(null)} />}
      {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </>
  );
}
```

```tsx
// ============================================================================
// Confirmation d'une carte (F4a D7/D10). « Rangée » : la carte en miniature,
// « Voir la carte » (la retourne), « Changer de deck » (DÉPLACE, D6).
// « Supprimée » : Annuler pendant le délai — rien n'a encore été émis.
// Style minimal de la charte actuelle (la matière glass vient au chantier 2).
// ============================================================================
import { useEffect, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks } from '@/hooks/useData';
import { moveTermToDeck } from '@/lib/collections';
import { cancelDeletion, DELETE_DELAY_MS } from '@/lib/collections/pendingDeletion';
import { useCardToast } from '@/store/cardToast';
import { CardFlip } from './CardFlip';
import { Portal } from './Portal';

const SAVED_MS = 8000;
const box = 'fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-xl bg-white p-3 text-sm shadow-lg ring-1 ring-slate-200 motion-safe:animate-fade-in-fast dark:bg-slate-900 dark:ring-slate-700';

export function CardToast() {
  const toast = useCardToast((s) => s.toast);
  const show = useCardToast((s) => s.show);
  const hide = useCardToast((s) => s.hide);
  const decks = useDecks();
  const [flipped, setFlipped] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => { setFlipped(false); setChoosing(false); setTouched(false); }, [toast?.term.id, toast?.kind]);
  useEffect(() => {
    if (!toast || (touched && toast.kind === 'saved')) return;
    const t = setTimeout(hide, toast.kind === 'deleted' ? DELETE_DELAY_MS : SAVED_MS);
    return () => clearTimeout(t);
  }, [toast, touched, hide]);
  if (!toast) return null;

  if (toast.kind === 'deleted') {
    return (
      <Portal>
        <div role="status" data-keep-open className={`${box} flex items-center gap-3`}>
          <span className="flex-1">Carte « {toast.term.term} » supprimée</span>
          <button type="button" onClick={() => { cancelDeletion(toast.term.id); hide(); }} className="btn-outline min-h-11">Annuler</button>
        </div>
      </Portal>
    );
  }
  const targets = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  const deckName = targets.find((d) => d.id === toast.deckId)?.name ?? 'Favoris';
  return (
    <Portal>
      <div role="status" data-keep-open onPointerDown={() => setTouched(true)} onFocus={() => setTouched(true)} className={`${box} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <span>Rangée dans <strong>{deckName}</strong></span>
          <button type="button" aria-label="Fermer" onClick={hide} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
        <CardFlip card={toast.term} direction="term2simple" revealed={flipped} onFlip={() => setFlipped(true)} size="mini" />
        <div className="flex gap-2">
          <button type="button" onClick={() => setFlipped((f) => !f)} className="btn-outline min-h-11 flex-1">{flipped ? 'Recto' : 'Voir la carte'}</button>
          <button type="button" aria-expanded={choosing} onClick={() => setChoosing((c) => !c)} className="btn-outline min-h-11 flex-1">Changer de deck</button>
        </div>
        {choosing && (
          <div role="group" aria-label="Déplacer vers" className="space-y-1">
            {targets.filter((d) => d.id !== toast.deckId).map((d) => (
              <button key={d.id} type="button" onClick={async () => {
                await moveTermToDeck(toast.term.id, toast.deckId, d.id, toast.caseId ? { caseId: toast.caseId } : {});
                show({ ...toast, deckId: d.id }); setChoosing(false);
              }} className="flex min-h-11 w-full items-center rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">{d.name}</button>
            ))}
            {targets.length === 1 && <p className="px-2 text-xs text-slate-500">Aucun autre deck : crée-en un depuis Fachbegriffe.</p>}
          </div>
        )}
      </div>
    </Portal>
  );
}
```

```diff
--- a/app/src/components/Shell.tsx
+++ b/app/src/components/Shell.tsx
@@ -8,6 +8,7 @@
 import { Doctopus } from './Doctopus';
 import { ResumeSessionBar } from './ResumeSessionBar';
 import { SelectionExplainer } from './SelectionExplainer';
+import { CardToast } from './CardToast';
 
 // Barre latérale déportée dans ./Sidebar (modes déployé / dock immersif).
 // La palette ⌘K double chaque destination au clavier (NAV partagé, ./nav).
@@ -64,6 +65,8 @@
       <Doctopus />
       {/* Quick-search : bulle d'explication sur sélection de texte */}
       <SelectionExplainer />
+      {/* Confirmation d'une carte : rangée (miniature, deck) ou supprimée (Annuler) — F4a */}
+      <CardToast />
       {/* Barre « reprendre » d'une simulation en pause */}
       <ResumeSessionBar />
     </div>
```

- [ ] **Step 4 : vérifier** — `for i in 1 2 3 4 5; do npx vitest run src/components/StarButton.test.tsx >/dev/null 2>&1 || echo FAIL; done` → aucune ligne `FAIL` (la liste attend ses données avant d'afficher des cases : sans cette garde, un toucher trop tôt ajoutait au lieu de retirer) ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/DeckChecklist.tsx
git add src/components/StarButton.tsx
git add src/components/CardToast.tsx
git add src/components/StarButton.test.tsx
git add src/components/Shell.tsx
git commit -m "feat(fachbegriffe): étoile = decks, confirmation avec la carte en miniature, Voir la carte, Changer de deck (F4a D6/D7)"
```

---

### Task C5 : Câblage — liste A→Z, panneau du cas, carte au survol (front-implementer)

**Files:**
- Modify: `app/src/features/fachbegriffe/TermList.tsx`, `FachbegriffePage.tsx`, `FachbegriffePage.test.tsx`, `CaseTermsPanel.tsx`
- Modify: `app/src/components/TermHoverCard.tsx` (fichier complet), `TermHoverCard.test.tsx`

**Interfaces:**
- Consumes : `StarButton` (C4), `TermSheet` compact (C1), `useTermsInDecks` (C3).
- Produces : `TermList` prend `inDecks: Set<string>` (plus de `favorites` ni `onToggleFavorite`).

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/features/fachbegriffe/FachbegriffePage.test.tsx
+++ b/app/src/features/fachbegriffe/FachbegriffePage.test.tsx
@@ -36,7 +36,7 @@
     renderAt();
     await screen.findByText('Abdomen');
     expect(screen.getByRole('tab', { name: /tous/i })).toBeTruthy();
-    fireEvent.click(screen.getByRole('button', { name: /ajouter abdomen aux favoris/i }));
+    fireEvent.click(screen.getByRole('button', { name: /ajouter aux favoris : abdomen/i }));
     await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
     expect((await db.progress_events.toArray()).map((e) => e.type)).toContain('term.favorited');
     fireEvent.click(screen.getByRole('tab', { name: /favoris/i }));
```

```diff
--- a/app/src/components/TermHoverCard.test.tsx
+++ b/app/src/components/TermHoverCard.test.tsx
@@ -37,14 +37,15 @@
     expect(await screen.findByRole('dialog')).toBeTruthy();
     expect(screen.getByText('Abdomen')).toBeTruthy(); expect(screen.getByText(/Bauch/)).toBeTruthy();
   });
-  it('★ = favori immédiat avec caseId du store, puis extension deck ; second ★ retire', async () => {
+  it('★ = Favoris immédiat avec caseId du store ; ★ pleine → decks du terme, décocher Favoris retire (F4a D6)', async () => {
     act(() => useUi.getState().openHover(fb, anchor, 'c9'));
     render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
     fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
     await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c9' }));
-    expect(await screen.findByRole('button', { name: /Ajouter à un deck/ })).toBeTruthy();
-    fireEvent.click(screen.getByRole('button', { name: /Retirer des favoris/ }));
+    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
+    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Favoris/ }));
     await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(true));
+    expect(screen.getByRole('dialog')).toBeTruthy();   // la liste des decks ne referme pas la carte
   });
   it('Échap et clic extérieur ferment', async () => {
     act(() => useUi.getState().openHover(fb, anchor));
```

(`CaseTermsPanel.test.tsx` garde `Ajouter aux favoris : Blutung` : même libellé, même `caseId`.)

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/features/fachbegriffe/FachbegriffePage.test.tsx src/components/TermHoverCard.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/features/fachbegriffe/TermList.tsx
+++ b/app/src/features/fachbegriffe/TermList.tsx
@@ -4,16 +4,17 @@
 import { SRS_TONE } from '@/lib/srsTone';
 import { buildRows } from './letters';
 import { registerLine } from '@/components/TermRegister';
+import { StarButton } from '@/components/StarButton';
 
 export interface TermListHandle { jumpTo: (letter: string) => void }
-interface Props { terms: Fachbegriff[]; favorites: Set<string>; onOpen: (t: Fachbegriff) => void; onToggleFavorite: (t: Fachbegriff) => void; onRemove?: (t: Fachbegriff) => void }
+interface Props { terms: Fachbegriff[]; inDecks: Set<string>; onOpen: (t: Fachbegriff) => void; onRemove?: (t: Fachbegriff) => void }
 
 // Liste A→Z virtualisée (2 266 termes : ≤ 60 lignes montées). En-tête de
 // lettre flottant (overlay unique par-dessus le conteneur de scroll, calculé
 // depuis la première ligne visible — `sticky` ne fonctionne pas sur des
 // lignes positionnées en absolu) ; ligne 44 px ; étoile et « Retirer » sont
 // des boutons distincts de la ligne (pas d'imbrication de boutons).
-export const TermList = forwardRef<TermListHandle, Props>(function TermList({ terms, favorites, onOpen, onToggleFavorite, onRemove }, ref) {
+export const TermList = forwardRef<TermListHandle, Props>(function TermList({ terms, inDecks, onOpen, onRemove }, ref) {
   const parentRef = useRef<HTMLDivElement>(null);
   const { rows, firstIndexByLetter } = useMemo(() => buildRows(terms), [terms]);
   const v = useVirtualizer({
@@ -49,7 +50,7 @@
             const row = rows[it.index];
             const style = { position: 'absolute' as const, top: 0, left: 0, width: '100%', transform: `translateY(${it.start}px)`, height: it.size };
             if (row.kind === 'letter') return <div key={`L${row.letter}`} data-letter={row.letter} style={style} className="flex items-center border-b border-slate-100 bg-paper/95 px-4 text-xs font-bold tracking-wider text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">{row.letter}</div>;
-            const t = row.term; const fav = favorites.has(t.id); const tone = SRS_TONE[t.srs.state];
+            const t = row.term; const tone = SRS_TONE[t.srs.state];
             return (
               <div key={t.id} data-term-id={t.id} style={style} className="flex items-center gap-2 border-b border-slate-50 px-2 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-white/5">
                 <button type="button" onClick={() => onOpen(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left">
@@ -58,8 +59,7 @@
                 </button>
                 <span role="img" className={`chip shrink-0 ${tone.chip}`} title={t.srs.state} aria-label={t.srs.state}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
                 {onRemove && <button type="button" aria-label={`Retirer ${t.term} du deck`} onClick={() => onRemove(t)} className="btn-ghost h-11 w-11 shrink-0 justify-center text-slate-400">−</button>}
-                <button type="button" aria-label={fav ? `Retirer ${t.term} des favoris` : `Ajouter ${t.term} aux favoris`} aria-pressed={fav} onClick={() => onToggleFavorite(t)}
-                  className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
+                <StarButton term={t} filled={inDecks.has(t.id)} />
               </div>
             );
           })}
```

```diff
--- a/app/src/features/fachbegriffe/FachbegriffePage.tsx
+++ b/app/src/features/fachbegriffe/FachbegriffePage.tsx
@@ -1,14 +1,14 @@
 import { useEffect, useMemo, useRef, useState } from 'react';
 import { Link, useSearchParams } from 'react-router-dom';
-import { useAllTerms, useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
+import { useAllTerms, useDecks, useDeckTerms, useFavorites, useTermsInDecks } from '@/hooks/useData';
 import { Icon } from '@/components/icons';
 import { useUi } from '@/store/ui';
 import { counts as termCounts } from '@/lib/stats';
-import type { Specialty, Srs, Center, DeckQuery, Fachbegriff } from '@/db/types';
+import type { Specialty, Srs, Center, DeckQuery } from '@/db/types';
 import { FAVORITES_DECK_ID } from '@/db/types';
 import { EmptyState } from '@/components/ui';
 import { applyQuery, termsOfDeck } from '@/lib/collections/query';
-import { toggleFavorite, removeFromDeck, setDeckQuery } from '@/lib/collections';
+import { removeFromDeck, setDeckQuery } from '@/lib/collections';
 import { loadDrillContext } from '@/lib/collections/drillContext';
 import { drillMinutes } from '@/lib/collections/relevance';
 import { sortDe, letterOf } from './letters';
@@ -21,7 +21,7 @@
 const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };
 
 export function FachbegriffePage() {
-  const begriffe = useAllTerms(); const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
+  const begriffe = useAllTerms(); const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites(); const inDecks = useTermsInDecks();
   const openGlossary = useUi((s) => s.openGlossary);
   const [params, setParams] = useSearchParams();
   const activeId = params.get('deck');
@@ -112,8 +112,7 @@
       {empty || (
         <div className="flex gap-2">
           <div className="min-w-0 flex-1">
-            <TermList ref={listRef} terms={shown} favorites={favSet} onOpen={openGlossary}
-              onToggleFavorite={(t: Fachbegriff) => { void toggleFavorite(t.id); }}
+            <TermList ref={listRef} terms={shown} inDecks={inDecks} onOpen={openGlossary}
               onRemove={activeDeck && !isSmart && activeId !== FAVORITES_DECK_ID ? (t) => { void removeFromDeck(activeId!, t.id); } : undefined} />
           </div>
           <AlphabetRail available={available} onJump={(l) => listRef.current?.jumpTo(l)} />
```

```diff
--- a/app/src/features/fachbegriffe/CaseTermsPanel.tsx
+++ b/app/src/features/fachbegriffe/CaseTermsPanel.tsx
@@ -1,28 +1,27 @@
 import { useEffect, useMemo, useRef, useState } from 'react';
 import { useLiveQuery } from 'dexie-react-hooks';
 import { db } from '@/db/db';
-import { useFachbegriffe, useFavorites } from '@/hooks/useData';
+import { useFachbegriffe, useTermsInDecks } from '@/hooks/useData';
 import { useUi } from '@/store/ui';
 import { termsOfCase } from '@/lib/collections/caseTerms';
-import { toggleFavorite } from '@/lib/collections';
 import { counts } from '@/lib/stats';
 import { SRS_TONE } from '@/lib/srsTone';
 import { Icon } from '@/components/icons';
 import { registerLine } from '@/components/TermRegister';
+import { StarButton } from '@/components/StarButton';
 
 // Termes du cas (liés ∪ marqués pendant ce cas), ordre publié : diagnostic →
 // spécifiques → contextuels. Référence LIBRE (F2a D6) : n'écrit ni résultat ni
 // assistance. Partagé par le runner (tiroir) et la page du cas (inline).
 interface Props { caseId: string; mode: 'drawer' | 'inline'; onClose?: () => void; onDrill: () => void }
 export function CaseTermsPanel({ caseId, mode, onClose, onDrill }: Props) {
-  const begriffe = useFachbegriffe(); const favorites = useFavorites();
+  const begriffe = useFachbegriffe(); const inDecks = useTermsInDecks();
   const theCase = useLiveQuery(() => db.cases.get(caseId), [caseId]);
   const events = useLiveQuery(() => db.progress_events.where('type').anyOf(['term.favorited', 'deck.term_added']).toArray(), []);
   const openGlossary = useUi((s) => s.openGlossary);
   const [q, setQ] = useState('');
   const terms = useMemo(() => (begriffe && theCase ? termsOfCase(caseId, begriffe, theCase, events ?? []) : []), [begriffe, theCase, events, caseId]);
   const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? terms.filter((t) => `${t.term} ${registerLine(t)}`.toLowerCase().includes(n)) : terms; }, [terms, q]);
-  const favSet = useMemo(() => new Set((favorites ?? []).map((f) => f.termId)), [favorites]);
   const c = counts(terms);
   // Tiroir (runner) : vrai dialogue — Échap ferme, le focus entre dans le
   // panneau à l'ouverture et revient au déclencheur (chip) à la fermeture.
@@ -49,11 +48,11 @@
       </div>
       <div className="px-3 pb-2"><input type="search" role="searchbox" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="input w-full" /></div>
       <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
-        {shown.map((t) => { const fav = favSet.has(t.id); const tone = SRS_TONE[t.srs.state]; return (
+        {shown.map((t) => { const tone = SRS_TONE[t.srs.state]; return (
           <li key={t.id} className="flex min-h-11 items-center gap-2 px-2">
             <button type="button" onClick={() => openGlossary(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left"><span className="truncate font-semibold text-brand-700 dark:text-brand-300">{t.term}</span><span className="truncate text-xs text-slate-500">{registerLine(t)}</span></button>
             <span role="img" aria-label={t.srs.state} className={`chip shrink-0 ${tone.chip}`}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
-            <button type="button" aria-pressed={fav} aria-label={fav ? `Retirer des favoris : ${t.term}` : `Ajouter aux favoris : ${t.term}`} onClick={() => { void toggleFavorite(t.id, { caseId }); }} className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
+            <StarButton term={t} filled={inDecks.has(t.id)} caseId={caseId} />
           </li>); })}
         {shown.length === 0 && <li className="p-4 text-sm text-slate-500">Aucun terme.</li>}
       </ul>
```

`app/src/components/TermHoverCard.tsx` devient (carte compacte : `TermSheet compact` + étoile ; le bloc « Ajouter à un deck… » disparaît — la liste des decks vient de l'étoile pleine) :

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi } from '@/store/ui';
import { useTermsInDecks } from '@/hooks/useData';
import { SRS_TONE } from '@/lib/srsTone';
import { armClose, disarmClose } from './hoverTimer';
import { starRef } from './hoverStarRef';
import { TermSheet } from './TermSheet';
import { StarButton } from './StarButton';

// Hover-card ★ (spec F2b D2/D3, F4a D2/D6) : une seule carte, ancrée sur le
// terme survolé ou tapé — la fiche en version compacte (terme, Bedeutung),
// l'étoile (Favoris d'un geste, ou les decks du terme si elle est pleine) et
// « Voir la fiche ». Mouvement : opacity/transform ≤ 150 ms, reduced-motion
// respecté. Le minuteur de fermeture est partagé avec AutoLinkText via
// `hoverTimer`. `caseId` vient du store (voir ui.ts) : cette carte est montée
// dans Shell, hors de tout CaseContext.Provider.
const W = 280;

export function TermHoverCard() {
  const hover = useUi((s) => s.hoverTerm);
  const close = useUi((s) => s.closeHover);
  const openGlossary = useUi((s) => s.openGlossary);
  const inDecks = useTermsInDecks();
  const [measuredH, setMeasuredH] = useState(160);
  const ref = useRef<HTMLDivElement>(null);

  // M3 : le repli au-dessus est calculé sur la hauteur réellement rendue.
  useLayoutEffect(() => {
    if (!hover || !ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    if (h) setMeasuredH(h);
  }, [hover?.fb.id]);

  useEffect(() => {
    if (!hover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    // Un clic dans une couche flottante de la carte (decks, confirmation) ne la ferme pas.
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('[data-keep-open]')) close();
    };
    // M2 / I2 : un scroll referme la carte, sauf dans les 250 ms qui suivent l'ouverture.
    const openedAt = performance.now();
    const onScroll = () => { if (performance.now() - openedAt > 250) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [hover, close]);

  if (!hover) return null;
  const { fb, anchor, caseId } = hover;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.max(8, Math.min(anchor.left, vw - W - 8));
  const belowTop = anchor.bottom + 8;
  const fitsBelow = belowTop + measuredH + 8 <= vh;
  const top = Math.max(8, fitsBelow ? belowTop : anchor.top - 8 - measuredH);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={fb.term}
      style={{ position: 'fixed', left, width: W, top, zIndex: 60 }}
      tabIndex={-1}
      onMouseEnter={disarmClose}
      onMouseLeave={() => armClose(close, 300)}
      onFocus={disarmClose}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) armClose(close, 300); }}
      className="glass rounded-xl border border-slate-200 p-3 text-sm shadow-lg motion-safe:animate-fade-in dark:border-slate-700"
    >
      <TermSheet term={fb} compact actions={
        <StarButton term={fb} filled={inDecks.has(fb.id)} caseId={caseId ?? undefined} buttonRef={(el) => { starRef.current = el; }} />
      } />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span role="img" aria-label={fb.srs.state} className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
        <button type="button" onClick={() => { close(); openGlossary(fb); }} className="btn-ghost min-h-11">Voir la fiche →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : vérifier** — `npx vitest run src/features/fachbegriffe src/components/TermHoverCard.test.tsx; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/features/fachbegriffe/TermList.tsx
git add src/features/fachbegriffe/FachbegriffePage.tsx
git add src/features/fachbegriffe/FachbegriffePage.test.tsx
git add src/features/fachbegriffe/CaseTermsPanel.tsx
git add src/components/TermHoverCard.tsx
git add src/components/TermHoverCard.test.tsx
git commit -m "feat(fachbegriffe): même étoile partout ; carte au survol = fiche compacte (F4a D2/D6)"
```

---

### Task C6 : Tiroir latéral — fiche, « Carte », corbeille + Annuler, Bedeutung vivante (front-implementer)

**Files:**
- Modify: `app/src/components/GlossaryDrawer.tsx` (fichier complet), `GlossaryDrawer.test.tsx` (fichier complet)

**Interfaces:**
- Consumes : `TermSheet` (C1), `CardFlip` (C2), `StarButton` (C4), `useCardToast` (C3), `scheduleDeletion` (B3), `usePersonalTerms`, `toView`.
- Produces : boutons `Carte`/`Fiche` (`aria-pressed`), `Supprimer ma carte` (icône corbeille), `Fermer`.

- [ ] **Step 1 : tests qui échouent** — remplacer `app/src/components/GlossaryDrawer.test.tsx` par :

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { useCardToast } from '@/store/cardToast';
import { freshSrs } from '@/lib/srs';
import { toView } from '@/lib/collections/allTerms';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { GlossaryDrawer } from './GlossaryDrawer';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});
vi.mock('@/lib/collections/pendingDeletion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/collections/pendingDeletion')>('@/lib/collections/pendingDeletion');
  return { ...actual, scheduleDeletion: vi.fn(actual.scheduleDeletion) };
});
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() } as never;
const renderDrawer = () => render(<MemoryRouter><GlossaryDrawer /><CardToast /></MemoryRouter>);

describe('GlossaryDrawer (F4a)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await db.personal_terms.clear();
    useUi.setState({ glossaryTerm: fb, hoverTerm: null }); useCardToast.setState({ toast: null });
  });

  it('fiche : Bedeutung, jamais « patientengerecht »', async () => {
    renderDrawer();
    expect(await screen.findByText('Bauch')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/patientengerecht/i);
  });
  it('★ vide → Favoris ; ★ pleine → decks du terme, cocher un deck l\'y range (D6)', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter aux favoris : Abdomen' }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
  });
  it('« Carte » retourne la fiche en carte recto/verso comme au drill (D9, AC-8)', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Carte' }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('recto');
    fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('verso');
    expect(screen.getAllByText('Bauch').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Fiche' }));
    expect(document.querySelector('[data-card-flip]')).toBeNull();
  });
  it('Échap ferme le panneau ; avec la liste des decks ouverte, Échap ne ferme que la liste', async () => {
    await db.favorites.put({ termId: 'fb-a', since: '' } as never);
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
    await screen.findByRole('menu');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(useUi.getState().glossaryTerm).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(0);
  });
  it('changer de route ferme le panneau et démonte son fond', async () => {
    render(
      <MemoryRouter initialEntries={['/cas/c1']}>
        <GlossaryDrawer />
        <Routes>
          <Route path="/cas/c1" element={<Link to="/fachbegriffe">aller</Link>} />
          <Route path="/fachbegriffe" element={<p>Fachbegriffe</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByText('aller'));
    await screen.findByText('Fachbegriffe');
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(0);
  });
  it('ouvrir le panneau ferme la hover-card ★', async () => {
    useUi.setState({ glossaryTerm: null, hoverTerm: { fb, anchor: {} as DOMRect, caseId: null } });
    renderDrawer();
    useUi.getState().openGlossary(fb);
    await screen.findByText('Abdomen');
    await waitFor(() => expect(useUi.getState().hoverTerm).toBeNull());
  });
  it('terme du glossaire : pas de corbeille', async () => {
    renderDrawer();
    await screen.findByText('Abdomen');
    expect(screen.queryByRole('button', { name: 'Supprimer ma carte' })).toBeNull();
  });
});

describe('GlossaryDrawer — carte personnelle (D8, D10)', () => {
  let id: string;
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await db.personal_terms.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
    id = (await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Der Patient klagt über Belastungsdyspnoe.' })).id;
    useUi.setState({ glossaryTerm: toView((await db.personal_terms.get(id))!), hoverTerm: null });
  });

  it('corbeille → masquée, panneau fermé, confirmation « Annuler » ; rien n\'est émis ; Annuler rétablit (AC-9)', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ma carte' }));
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(usePendingDeletions.getState().ids.has(id)).toBe(true);
    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_deleted')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(await db.personal_terms.get(id)).toBeTruthy();
  });
  it('sans Bedeutung → « à compléter » ; modifiée, la fiche montre la nouvelle Bedeutung (AC-7)', async () => {
    renderDrawer();
    expect(await screen.findByText('à compléter')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bedeutung' }), { target: { value: 'Atemnot bei Belastung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Atemnot bei Belastung')).toBeTruthy();
  });
  it('contexte affiché une fois, mot surligné, jamais « Reformulation »', async () => {
    renderDrawer();
    expect(await screen.findByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    expect(screen.queryByText('Reformulation')).toBeNull();
    expect(screen.getAllByText(/klagt über/i).length).toBe(1);
  });
  it('suppression : échec → message, panneau ouvert', async () => {
    const { scheduleDeletion } = await import('@/lib/collections/pendingDeletion');
    vi.mocked(scheduleDeletion).mockRejectedValueOnce(new Error('offline'));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ma carte' }));
    expect(await screen.findByText(/impossible de supprimer/i)).toBeTruthy();
    expect(useUi.getState().glossaryTerm).not.toBeNull();
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/GlossaryDrawer.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation** — `app/src/components/GlossaryDrawer.tsx` devient (le menu « Ajouter à un deck… » et la confirmation texte disparaissent ; « Bedeutung (patientengerecht) » disparaît) :

```tsx
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCardToast } from '@/store/cardToast';
import { useCases, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
import { scheduleDeletion } from '@/lib/collections/pendingDeletion';
import { isPersonalView, toView } from '@/lib/collections/allTerms';
import { SRS_TONE } from '@/lib/srsTone';
import { TermSheet } from './TermSheet';
import { CardFlip } from './CardFlip';
import { StarButton } from './StarButton';
import { Icon } from './icons';

// Panneau latéral d'un Fachbegriff (F4a D2/D9/D10) : la fiche (TermSheet), ou
// la carte recto/verso comme au drill (« Carte ») ; l'étoile des decks ; la
// corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
export function GlossaryDrawer() {
  const opened = useUi((s) => s.glossaryTerm);
  const close = useUi((s) => s.closeGlossary);
  const closeHover = useUi((s) => s.closeHover);
  const showToast = useCardToast((s) => s.show);
  const { pathname } = useLocation();
  const cases = useCases();
  const personalTerms = usePersonalTerms();
  const inDecks = useTermsInDecks();
  const [view, setView] = useState<'sheet' | 'card'>('sheet');
  const [revealed, setRevealed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => { setView('sheet'); setRevealed(false); setDeleteError(null); }, [opened?.id]);

  // Ouverture : la hover-card ★ cède la place (une seule carte à l'écran).
  // Échap ferme le panneau — sauf si une liste de decks est ouverte (elle se ferme d'abord).
  const open = !!opened;
  useEffect(() => { if (open) closeHover(); }, [open, closeHover]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="menu"][data-keep-open]')) close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);
  // Changement de route : le panneau ne survit pas à la page où il a été ouvert.
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== openedOn.current) close();
    openedOn.current = pathname;
  }, [pathname, close]);

  if (!opened) return null;
  // Carte personnelle : la version VIVANTE (Bedeutung modifiée, D8), pas l'instantané de l'ouverture.
  const live = isPersonalView(opened) ? personalTerms?.find((p) => p.id === opened.id) : undefined;
  const fb = live ? toView(live) : opened;
  const personal = isPersonalView(fb);
  const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));

  const remove = () => {
    scheduleDeletion(fb.id)
      .then(() => { showToast({ kind: 'deleted', term: fb }); close(); })
      .catch(() => setDeleteError('Impossible de supprimer : réessaie.'));
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <aside className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col border-y-0 border-r-0">
        <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <div className="label">{personal ? 'Ma carte' : 'Fachbegriff'}</div>
          <div className="flex items-center gap-1">
            <StarButton term={fb} filled={inDecks.has(fb.id)} />
            <button type="button" aria-pressed={view === 'card'} onClick={() => { setView((v) => (v === 'card' ? 'sheet' : 'card')); setRevealed(false); }}
              className="btn-ghost min-h-11 px-2 text-sm">{view === 'card' ? 'Fiche' : 'Carte'}</button>
            {personal && (
              <button type="button" aria-label="Supprimer ma carte" onClick={remove} className="btn-ghost h-11 w-11 justify-center text-slate-500 hover:text-rose-600">
                <Icon name="trash" className="h-5 w-5" title="Supprimer" />
              </button>
            )}
            <button type="button" aria-label="Fermer" onClick={close} className="btn-ghost h-11 w-11 justify-center text-lg">✕</button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {view === 'card' ? (
            <div className="space-y-2">
              <CardFlip card={fb} direction="term2simple" revealed={revealed} onFlip={() => setRevealed(true)} />
              {revealed && <button type="button" onClick={() => setRevealed(false)} className="btn-outline min-h-11 w-full">Recto</button>}
            </div>
          ) : (
            <TermSheet term={fb} />
          )}
          {deleteError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{deleteError}</p>}

          <div className="flex flex-wrap gap-2">
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fb.specialty}</span>
            <span className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
          </div>

          {linkedCases.length > 0 && (
            <div>
              <div className="label mb-2">Erscheint in Fällen</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} onClick={close} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-900/20">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
        </div>
      </aside>
    </>
  );
}
```

- [ ] **Step 4 : vérifier** — test → 0 (3 exécutions de suite) ; `grep -rni --exclude='*.test.tsx' patientengerecht src/components src/features; echo exit=$?` → `exit=1` (aucune occurrence) ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/GlossaryDrawer.tsx
git add src/components/GlossaryDrawer.test.tsx
git commit -m "feat(fachbegriffe): tiroir — fiche ou carte recto/verso, corbeille avec Annuler, Bedeutung corrigée en direct (F4a D8/D9/D10)"
```

---

### Task C7 : Mini-fiche de création + bulle de sélection (front-implementer)

**Files:**
- Create: `app/src/components/NewCardSheet.tsx`
- Modify: `app/src/components/SelectionExplainer.tsx` (fichier complet), `SelectionExplainer.test.tsx` (fichier complet)
- Modify: `app/src/lib/collections/personalTerms.ts` (retrait de `starSelection`, `isStarred`, `StarResult`), `personalTerms.test.ts` (retrait du `describe('starSelection')`)
- Modify: `app/src/components/TermRegister.tsx`, `TermRegister.test.tsx` (le composant disparaît ; `registerLine` reste pour les listes)

**Interfaces:**
- Consumes : `askBedeutung`, `canAskAi` (B5) ; `sentenceOfRange` (B4) ; `createPersonalTerm`, `cleanSelection`, `personalTermId`, `PT_LIMITS` ; `addTermToDeck` (C3) ; `useCardToast` (C3) ; `StarButton` (C4) ; `TermSheet`, `ContextSentence` (C1).
- Produces : `CHIP_THRESHOLD = 4`, `selectionWords(selection): string[]`, `NewCardSheet({ selection, sentence, caseId?, onClose })` (`role="dialog"`, nom `Nouvelle carte`, champs `Mot`, `Bedeutung`, `Deck`, bouton `Créer`) ; bouton de la bulle hors glossaire : `Nouvelle carte : <sélection>`.

- [ ] **Step 1 : tests qui échouent** — remplacer `app/src/components/SelectionExplainer.test.tsx` par (les tests F3 de position, d'IA et du mode public sont conservés tels quels) :

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { useCardToast } from '@/store/cardToast';
import { SelectionExplainer } from './SelectionExplainer';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

vi.mock('@/lib/onlineAi', () => ({
  hasKey: () => true,
  canAskAi: vi.fn(() => true),
  honestAiError: (e: unknown) => (e as Error)?.message ?? String(e),
  noAiMessage: vi.fn(() => 'IA indisponible : connecte-toi (compte premium) ou ajoute une clé de repli dans les réglages Doctopus.'),
  askBrief: vi.fn(async () => 'Essoufflement à l\'effort.'),
  askBedeutung: vi.fn(async () => 'Atemnot bei Belastung'),
}));

function selectText(el: HTMLElement, rect?: Partial<DOMRect>) {
  const range = document.createRange(); range.selectNodeContents(el);
  const r = { left: 10, top: 100, width: 60, height: 16, right: 70, bottom: 116, x: 10, y: 100, toJSON() {}, ...rect };
  range.getBoundingClientRect = () => r as DOMRect;
  const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
}
const pill = () => act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });

describe('SelectionExplainer', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await db.fachbegriffe.clear(); await db.favorites.clear(); await db.personal_terms.clear(); await db.progress_events.clear(); await db.deck_terms.clear(); await db.decks.clear();
    await db.fachbegriffe.put({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
    useCardToast.setState({ toast: null });
  });
  afterEach(() => { vi.useRealTimers(); });
  it('selectionchange (sans souris) → pastille ★ + Expliquer après 250 ms (AC-4c)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    expect(await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Expliquer/ })).toBeTruthy();
  });
  it('★ sur un terme du glossaire → Favoris + confirmation avec miniature et « Changer de deck » (AC-6)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    const star = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    vi.useRealTimers();
    fireEvent.click(star); fireEvent.click(star);   // double appui : un seul rangement
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voir la carte' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de deck' })).toBeTruthy();
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.favorited')).toHaveLength(1);
  });
  it('hors glossaire → mini-fiche : Bedeutung proposée, Contexte = une seule phrase, mot surligné ; Créer → carte + deck (AC-4)', async () => {
    render(<><p data-testid="p">Er hat Fieber. Seit Wochen <span data-testid="t">Belastungsdyspnoe</span> beim Treppensteigen. Kein Husten.</p><SelectionExplainer /><CardToast /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    vi.useRealTimers();
    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    expect(dialog.textContent).toContain('Seit Wochen Belastungsdyspnoe beim Treppensteigen.');
    expect(dialog.textContent).not.toContain('Fieber');
    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
    const pt = (await db.personal_terms.toArray())[0];
    expect(pt).toMatchObject({ term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', context: 'Seit Wochen Belastungsdyspnoe beim Treppensteigen.' });
    expect(await db.favorites.get(pt.id)).toBeTruthy();
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
  });
  it('Créer impossible tant que la Bedeutung est vide ; fermer sans créer n\'écrit rien (AC-4)', async () => {
    const { askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(askBedeutung).mockResolvedValueOnce('');
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    vi.useRealTimers();
    expect(await screen.findByText(/écris la signification/i)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Créer' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog', { name: 'Nouvelle carte' })).toBeNull();
    expect(await db.progress_events.count()).toBe(0);
  });
  it('sélection de plus de 4 mots → pastilles ; le mot touché devient le terme, la phrase le contexte (AC-5)', async () => {
    render(<><p data-testid="t">Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen.</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: /Nouvelle carte/ }));
    vi.useRealTimers();
    expect(screen.queryByRole('textbox', { name: 'Bedeutung' })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'Belastungsdyspnoe' }));
    await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
    expect((screen.getByRole('textbox', { name: 'Mot' }) as HTMLInputElement).value).toBe('Belastungsdyspnoe');
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect((await db.personal_terms.toArray())[0]).toMatchObject({ term: 'Belastungsdyspnoe', context: 'Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen.' }));
  });
  it('IA indisponible → aucune demande, invite « Écris la signification »', async () => {
    const { canAskAi, askBedeutung } = await import('@/lib/onlineAi');
    vi.mocked(canAskAi).mockReturnValue(false); vi.mocked(askBedeutung).mockClear();
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t')); pill();
    fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
    expect(await screen.findByText(/écris la signification/i)).toBeTruthy();
    expect(askBedeutung).not.toHaveBeenCalled();
    vi.mocked(canAskAi).mockReturnValue(true);
  });
  it('un pointerup pendant que la sélection persiste ne referme pas la bulle (finding 5)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    await screen.findByText(/Bauchwasser/);
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    expect(screen.getByText(/Bauchwasser/)).toBeTruthy();
  });
  it('hors glossaire sans clé mais serveur dispo → explication IA (AC-7)', async () => {
    const { askBrief } = await import('@/lib/onlineAi');
    (askBrief as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce('die Dyspnoe = Atemnot');
    render(<><p data-testid="t">Dyspnoe unter Belastung</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    expect(await screen.findByText('die Dyspnoe = Atemnot')).toBeTruthy();
  });
  it('★ dans la bulle réponse (fond clair) n\'utilise pas la couleur blanche de la pastille (re-review)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    const starInBubble = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    expect(starInBubble.className).not.toMatch(/text-white/);
    expect(starInBubble.className).not.toMatch(/hover:bg-brand-700/);
  });
  it('sélection près du haut du viewport → pastille bascule sous la sélection, jamais hors écran (B1)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'), { top: 20, height: 16, bottom: 36 });
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    const box = document.querySelector('.fixed.z-\\[80\\]') as HTMLElement;
    expect(box.style.transform).toBe('translate(-50%, 0)');
    const top = parseFloat(box.style.top);
    expect(top).toBeGreaterThanOrEqual(36); // sous la sélection (bottom), jamais négatif à l'écran
  });
  it('sélection près du bord droit → pastille reste dans le viewport (16 px de marge)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'), { left: window.innerWidth - 20, right: window.innerWidth - 10, width: 10 });
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    const box = document.querySelector('.fixed.z-\\[80\\]') as HTMLElement;
    const left = parseFloat(box.style.left);
    expect(left).toBeLessThanOrEqual(window.innerWidth - 16);
  });
  it('IA indisponible en mode public → message honnête (ajouter une clé), jamais « compte premium » (FSP-B1)', async () => {
    const { canAskAi, noAiMessage } = await import('@/lib/onlineAi');
    (canAskAi as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);
    (noAiMessage as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce('IA indisponible : ajoute une clé dans les réglages Doctopus.');
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
    expect(await screen.findByText(/ajoute une clé dans les réglages Doctopus/)).toBeTruthy();
    expect(screen.queryByText(/premium|connecte-toi/i)).toBeNull();
  });
});
```

`TermRegister.test.tsx` devient :

```tsx
import { describe, it, expect } from 'vitest';
import { registerLine } from './TermRegister';

describe('registerLine', () => {
  it('parole du patient si registre, sinon Bedeutung', () => {
    expect(registerLine({ translationSimple: 'Bauchwasser', register: { patient: 'Wasser im Bauch', vorstellung: 'v', anamnese: 'a?' } })).toBe('Wasser im Bauch');
    expect(registerLine({ translationSimple: 'x' })).toBe('x');
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/SelectionExplainer.test.tsx; echo exit=$?` → ≠ 0.

- [ ] **Step 3 : implémentation**

```tsx
// ============================================================================
// Mini-fiche de création (F4a D4/D5) : ★ sur un mot hors glossaire. Le mot
// (modifiable), sa Bedeutung proposée par l'IA (modifiable), le Contexte = la
// seule phrase qui le contient, mot surligné, le deck (Favoris par défaut),
// « Créer ». Plus de 4 mots sélectionnés : on touche le mot à garder. Fermer
// sans créer n'écrit rien. IA indisponible : « Écris la signification ».
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { db } from '@/db/db';
import { useDecks } from '@/hooks/useData';
import { addTermToDeck } from '@/lib/collections';
import { cleanSelection, createPersonalTerm, PT_LIMITS } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { askBedeutung, canAskAi } from '@/lib/onlineAi';
import { useCardToast } from '@/store/cardToast';
import { ContextSentence } from './TermSheet';
import { Portal } from './Portal';

export const CHIP_THRESHOLD = 4;
/** Mots d'une sélection longue, nettoyés, sans doublon (≥ 2 lettres). */
export function selectionWords(selection: string): string[] {
  return [...new Set(selection.split(/\s+/).map(cleanSelection).filter((w) => w.length >= 2))];
}

export function NewCardSheet({ selection, sentence, caseId, onClose }: { selection: string; sentence: string; caseId?: string; onClose: () => void }) {
  const decks = useDecks();
  const show = useCardToast((s) => s.show);
  const chips = selectionWords(selection).length > CHIP_THRESHOLD ? selectionWords(selection) : null;
  const [word, setWord] = useState(chips ? '' : cleanSelection(selection));
  const [bedeutung, setBedeutung] = useState('');
  const [ai, setAi] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [deckId, setDeckId] = useState(FAVORITES_DECK_ID);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef<string | null>(null);
  const typed = useRef(false);

  // UN appel IA par mot choisi (à l'ouverture, ou au toucher d'une pastille).
  useEffect(() => {
    if (!word || asked.current !== null || !canAskAi()) { if (word && !canAskAi()) setAi('failed'); return; }
    asked.current = word; setAi('loading');
    askBedeutung(word, sentence || undefined)
      .then((b) => { if (!typed.current) setBedeutung(b); setAi(b ? 'idle' : 'failed'); })
      .catch(() => setAi('failed'));
  }, [word, sentence]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canCreate = !!word.trim() && word.length <= PT_LIMITS.term && !!bedeutung.trim();
  const create = async () => {
    if (!canCreate) return;
    try {
      const { id } = await createPersonalTerm({ term: word, explanation: bedeutung, context: sentence, caseId });
      await addTermToDeck(deckId, id, caseId ? { caseId } : {});
      const pt = await db.personal_terms.get(id);
      if (pt) show({ kind: 'saved', term: toView(pt), deckId, ...(caseId ? { caseId } : {}) });
      onClose();
    } catch { setError('Impossible de créer la carte : réessaie.'); }
  };

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Nouvelle carte" data-keep-open
        className="fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-md space-y-3 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-in-fast dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nouvelle carte</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
        {chips && (
          <div>
            <p className="label mb-1">Touche le mot à garder</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((w) => (
                <button key={w} type="button" aria-pressed={word === w} onClick={() => { setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{w}</button>
              ))}
            </div>
          </div>
        )}
        {word && (
          <>
            <label className="block"><span className="label">Mot</span>
              <input value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} className="input mt-1 min-h-11 w-full" />
            </label>
            <label className="block"><span className="label">Bedeutung</span>
              <input value={bedeutung} maxLength={PT_LIMITS.explanation} placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
                onChange={(e) => { typed.current = true; setBedeutung(e.target.value); }} className="input mt-1 min-h-11 w-full" />
            </label>
            {ai === 'failed' && !bedeutung && <p className="text-xs text-slate-500">Pas de proposition : écris la signification.</p>}
            {sentence && <div><span className="label">Contexte</span><ContextSentence sentence={sentence} word={word} /></div>}
            <label className="block"><span className="label">Deck</span>
              <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="input mt-1 min-h-11 w-full">
                <option value={FAVORITES_DECK_ID}>Favoris</option>
                {(decks ?? []).filter((d) => d.kind === 'manual').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full disabled:opacity-40">Créer</button>
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}
      </div>
    </Portal>
  );
}
```

`app/src/components/SelectionExplainer.tsx` devient :

```tsx
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { lookupTerm } from '@/lib/dictionary';
import { askBrief, canAskAi, honestAiError, noAiMessage } from '@/lib/onlineAi';
import { cleanSelection, personalTermId, PT_LIMITS } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { sentenceOfRange } from '@/lib/sentence';
import { TermSheet } from '@/components/TermSheet';
import { StarButton } from '@/components/StarButton';
import { NewCardSheet, selectionWords, CHIP_THRESHOLD } from '@/components/NewCardSheet';
import type { Fachbegriff } from '@/db/types';

// ============================================================================
// Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
// phrase (FB2-M2), une pastille apparaît près de la sélection. Au clic sur
// « Expliquer », une bulle donne une glose brève. L'étoile (F4a D4–D6) : un
// terme du glossaire (ou une carte déjà créée) se range comme partout
// (StarButton) ; un mot hors glossaire ouvre la mini-fiche de création
// (NewCardSheet), qui prend la phrase de la sélection pour contexte.
// Déclenchement par `selectionchange` (clavier, souris ET poignées tactiles)
// + `pointerup` (souris/tactile), anti-rebond 250 ms. « Voir plus → » ouvre
// Doctopus complet avec le terme pré-rempli. `data-keep-open` : les couches
// flottantes (decks, mini-fiche, confirmation) ne referment pas la bulle.
// ============================================================================

interface Anchor { text: string; sentence: string; x: number; y: number; bottom: number }
// ponytail : hauteurs estimées (pastille mesurée ~48px ; bulle réponse, taille
// variable, plafond prudent) plutôt qu'une mesure DOM réelle avant premier
// rendu — si une bulle très longue déborde encore en haut, mesurer via ref.
const PILL_H = 48;
const BUBBLE_H = 260;
const GUTTER = 16;
type Bubble = { loading: boolean; text?: string; error?: string; source?: 'glossaire' | 'IA'; fb?: Fachbegriff };

export function SelectionExplainer() {
  const begriffe = useFachbegriffe() ?? [];
  const openDoctopus = useUi((s) => s.openDoctopus);
  const personalTerms = usePersonalTerms();
  const inDecks = useTermsInDecks();
  const caseId = useCaseId() ?? undefined;
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [newCard, setNewCard] = useState<{ selection: string; sentence: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const seldom = window.getSelection();
      const text = seldom?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!text || text.length < 2 || text.length > 220) return;
      const node = seldom?.anchorNode?.parentElement;
      if (node?.closest('input, textarea, [contenteditable="true"]')) return;
      if (rootRef.current && node && rootRef.current.contains(node)) return;
      if (node?.closest('[data-keep-open]')) return;
      try {
        const rect = seldom!.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        // Même sélection qu'avant, au même endroit (ex. focus/tap sur un bouton relance
        // selectionchange sans que l'utilisateur ait resélectionné) : ne pas effacer
        // bulle/confirmation. Texte identique mais rect différent (ex. re-sélection au
        // clavier ailleurs dans la page) → nouvelle ancre, la bulle se déplace.
        if (anchorRef.current?.text === text && anchorRef.current.x === x && anchorRef.current.y === y) return;
        setAnchor({ text, sentence: sentenceOfRange(seldom!.getRangeAt(0)), x, y, bottom: rect.bottom });
        setBubble(null);
      } catch { /* sélection vide */ }
    };
    // selectionchange : clavier, souris ET poignées tactiles (mobile) ; anti-rebond 250 ms.
    const onSelChange = () => { clearTimeout(timer); timer = setTimeout(read, 250); };
    const onPointerUp = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('[data-keep-open]')) return;
      clearTimeout(timer); timer = setTimeout(read, 10);
    };
    const onScroll = () => { setAnchor(null); setBubble(null); };
    document.addEventListener('selectionchange', onSelChange);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('scroll', onScroll, true);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', onSelChange); document.removeEventListener('pointerup', onPointerUp); window.removeEventListener('scroll', onScroll, true); };
  }, []);

  // Fermer si on clique/touche ailleurs.
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('[data-keep-open]')) return;
      setAnchor(null); setBubble(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchor]);

  const hit = anchor ? lookupTerm(anchor.text, begriffe) : null;
  const clean = anchor ? cleanSelection(anchor.text) : '';
  const chips = !!anchor && selectionWords(anchor.text).length > CHIP_THRESHOLD;
  const existing = !hit && clean ? personalTerms?.find((p) => p.id === personalTermId(clean)) : undefined;
  const known: Fachbegriff | null = hit ?? (existing ? toView(existing) : null);
  const canCreate = !!clean && (chips || clean.length <= PT_LIMITS.term);
  const openNewCard = () => {
    if (!anchor) return;
    setNewCard({ selection: anchor.text, sentence: anchor.sentence });
    setAnchor(null); setBubble(null);
  };

  const explain = async () => {
    if (!anchor) return;
    const term = anchor.text;
    // 1) Glossaire local (correspondance exacte ou fléchie proche, jamais floue — FB2-M3).
    const h = lookupTerm(term, begriffe);
    if (h) {
      setBubble({ loading: false, source: 'glossaire', text: h.term, fb: h });
      return;
    }
    // 2) IA brève (serveur d'abord, clé navigateur en repli).
    if (!canAskAi()) {
      setBubble({ loading: false, error: noAiMessage() });
      return;
    }
    setBubble({ loading: true });
    try { setBubble({ loading: false, source: 'IA', text: await askBrief(term) }); }
    catch (e) { setBubble({ loading: false, error: honestAiError(e) }); }
  };

  const sheet = newCard && <NewCardSheet selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} onClose={() => setNewCard(null)} />;
  if (!anchor) return sheet || null;
  // Pas assez de place au-dessus (pastille ou bulle) : bascule sous la sélection
  // plutôt que de partir hors écran (bug B1). Demi-largeurs approximatives
  // (pastille compacte, bulle w-64 fixe) pour un clamp horizontal à 16 px du bord.
  const contentH = bubble ? BUBBLE_H : PILL_H;
  const flipBelow = anchor.y - contentH - 8 < 8;
  const top = flipBelow ? anchor.bottom + 8 : Math.max(8, anchor.y - 8);
  const transform = flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
  const halfWidth = bubble ? 128 : 140;
  const left = Math.min(Math.max(anchor.x, halfWidth + GUTTER), window.innerWidth - halfWidth - GUTTER);
  // 'pill' : pastille pétrole pleine (fond bg-brand-600) — ☆ blanc, survol foncé.
  // 'bubble' : carte claire — tons ardoise/signal lisibles sur les deux fonds.
  const starButton = (variant: 'pill' | 'bubble') => known
    ? <StarButton term={known} filled={inDecks.has(known.id)} caseId={caseId} tone={variant === 'pill' ? 'onBrand' : 'plain'} />
    : (
      <button type="button" onClick={openNewCard} disabled={!canCreate} aria-label={`Nouvelle carte : ${clean}`}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg disabled:opacity-40 ${variant === 'pill' ? 'text-white hover:bg-brand-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>☆</button>
    );
  return (
    <>
    {sheet}
    <div ref={rootRef} className="fixed z-[80]" style={{ left, top, transform }}>
      {!bubble ? (
        <div className="flex items-center gap-1 rounded-full bg-brand-600 p-0.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 motion-safe:animate-fade-in-fast">
          {starButton('pill')}
          <button type="button" onClick={() => { void explain(); }} className="flex h-11 items-center gap-1 rounded-full px-3 hover:bg-brand-700">
            <Icon name="search" className="h-3.5 w-3.5" />Expliquer
          </button>
        </div>
      ) : (
        <div className="flex w-64 items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] shadow-xl motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
          {!bubble.loading && !bubble.error && <div className="-m-0.5 -mt-1">{starButton('bubble')}</div>}
          <div className="min-w-0 flex-1">
            {bubble.loading ? (
              <div className="flex items-center gap-2 text-slate-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> Doctopus cherche…</div>
            ) : bubble.error ? (
              <div className="text-[12px] text-amber-600 dark:text-amber-400">{bubble.error}</div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">« {anchor.text} »</span>
                  <span className="chip py-0 text-[9px] text-slate-400">{bubble.source}</span>
                </div>
                {bubble.fb ? <TermSheet term={bubble.fb} compact /> : <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>}
              </>
            )}
            <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
              className="mt-1.5 w-full rounded-md bg-slate-100 py-1 text-[11px] font-medium text-brand-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-slate-700">
              Voir plus avec Doctopus →
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
```

`app/src/components/TermRegister.tsx` devient :

```tsx
// Ligne courte d'un terme dans une liste (TermList, CaseTermsPanel) : la parole
// du patient quand le registre existe, sinon la Bedeutung. La fiche complète
// vit dans TermSheet / TermUsage (F4a).
import type { Fachbegriff } from '@/db/types';

export const registerLine = (t: Pick<Fachbegriff, 'translationSimple' | 'register'>): string => t.register?.patient ?? t.translationSimple;
```

`personalTerms.ts` : supprimer `StarResult`, `starSelection`, `isStarred` ; retirer les imports devenus inutiles (`Fachbegriff`, `lookupTerm`, `toggleFavorite`) ; `personalTerms.test.ts` : supprimer `describe('starSelection', …)` et `starSelection` de l'import. Contrôle : `grep -rn "starSelection\|isStarred\|<TermRegister" src; echo exit=$?` → `exit=1`.

- [ ] **Step 4 : vérifier** — `npx vitest run src/components src/lib/collections; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/NewCardSheet.tsx
git add src/components/SelectionExplainer.tsx
git add src/components/SelectionExplainer.test.tsx
git add src/components/TermRegister.tsx
git add src/components/TermRegister.test.tsx
git add src/lib/collections/personalTerms.ts
git add src/lib/collections/personalTerms.test.ts
git commit -m "feat(fachbegriffe): mini-fiche de création — Bedeutung proposée, phrase de contexte, pastilles au-delà de 4 mots (F4a D4/D5)"
```

---

# Tranche D — Contenu

### Task D1 : Validateur `checkBedeutung.mjs` + non-régression de la recherche

**Files:**
- Create: `app/scripts/checkBedeutung.mjs`, `app/scripts/checkBedeutung.test.mjs`, `app/src/data/bedeutung.search.test.ts`

**Interfaces:**
- Consumes : `serialize` (`registerLots.mjs`), `caseTermLinks.json` (A4).
- Produces : `MAX_WORDS = 6`, `bedeutungIssue(s): string | null` ; CLI `node scripts/checkBedeutung.mjs [--list]` et `node scripts/checkBedeutung.mjs apply <patch.json>` (tout ou rien).

- [ ] **Step 1 : tests qui échouent**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { bedeutungIssue } from './checkBedeutung.mjs';

test('conforme : ≤ 6 mots, pas une phrase', () => {
  for (const s of ['Atemnot', 'zum Bauch gehörend', 'Harnproduktion unter 100 ml pro Tag']) assert.equal(bedeutungIssue(s), null, s);
});
test('> 6 mots → signalé', () => assert.equal(bedeutungIssue('Ausdehnung der Venen im Bereich des Nabels'), '> 6 mots'));
test('phrase de définition → signalée (point final, relative, verbe copule)', () => {
  assert.equal(bedeutungIssue('ausgebreitet (von Krankheitserregern).'), 'phrase de définition');
  assert.equal(bedeutungIssue('Stoff, der eine Allergie hervorrufen kann'), 'phrase de définition');
  assert.equal(bedeutungIssue('Medikamente, die den Eisprung unterdrücken'), 'phrase de définition');
});
test('vide → signalé', () => assert.equal(bedeutungIssue('  '), 'vide'));
```

```ts
// Non-régression de la recherche (F4a §3.2, AC-10) : la Bedeutung (`s`) sert au
// recto « Sens → terme », à la recherche (applyQuery : page Fachbegriffe, decks
// intelligents) et la sélection se résout par lookupTerm. Pour CHAQUE terme lié
// à un cas, réécrit ou non : retrouvé par son mot ET par sa Bedeutung.
import { describe, it, expect } from 'vitest';
import links from './caseTermLinks.json';
import { seedFachbegriffe } from './seedFachbegriffe';
import { lookupTerm } from '@/lib/dictionary';
import { applyQuery } from '@/lib/collections/query';

const all = seedFachbegriffe();
const linked = new Set(Object.values(links as Record<string, string[]>).flat());
const terms = all.filter((b) => linked.has(b.id));
/** Mesuré avant F4a : termes à ponctuation que lookupTerm ne résout pas (hors périmètre). */
const LOOKUP_KNOWN = ['fb-i-m', 'fb-oesophago-gastro-duodenoskopie-oegd', 'fb-digital-rektale-untersuchung-dru', 'fb-b-b'];

describe('recherche des termes liés (AC-10)', () => {
  it('lookupTerm(terme) résout le même id (hors 4 exceptions connues)', () => {
    expect(terms.filter((b) => lookupTerm(b.term, all)?.id !== b.id).map((b) => b.id).filter((id) => !LOOKUP_KNOWN.includes(id))).toEqual([]);
  });
  it('applyQuery trouve chaque terme par son mot et par sa Bedeutung', () => {
    expect(terms.filter((b) => !applyQuery({ q: b.term }, all).some((x) => x.id === b.id)).map((b) => b.id)).toEqual([]);
    expect(terms.filter((b) => !applyQuery({ q: b.translationSimple }, all).some((x) => x.id === b.id)).map((b) => b.id)).toEqual([]);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `node --test scripts/checkBedeutung.test.mjs; echo exit=$?` → ≠ 0. (`bedeutung.search.test.ts` passe déjà : c'est la **ligne de base** que D2 ne doit pas casser.)

- [ ] **Step 3 : implémentation**

```js
// ============================================================================
// Invariant CI (F4a §3.2) : la Bedeutung (`s`) d'un terme lié à un cas est une
// reformulation directe et retenable — ≤ 6 mots, jamais une phrase de
// définition (la définition vit dans `def`, affichée repliée).
// Usage :
//   node scripts/checkBedeutung.mjs            → exit 1 si un terme lié est signalé
//   node scripts/checkBedeutung.mjs --list     → JSON des termes signalés (brief d'auteur)
//   node scripts/checkBedeutung.mjs apply <patch.json>   ({ id: "nouvelle Bedeutung" } ; tout ou rien)
// ============================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const MAX_WORDS = 6;
const DEFINITION = /[.;]\s*$|(?<![\p{L}])(ist|sind|wird|werden|bezeichnet|bedeutet)(?![\p{L}])|,\s*(der|die|das|welche[rsnm]?)(?![\p{L}])/iu;

/** Motif du signalement, ou null si la Bedeutung est conforme. */
export function bedeutungIssue(s) {
  const t = String(s ?? '').trim();
  if (!t) return 'vide';
  if (t.split(/\s+/).length > MAX_WORDS) return `> ${MAX_WORDS} mots`;
  if (DEFINITION.test(t)) return 'phrase de définition';
  return null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fbPath = join(here, '../src/data/fachbegriffe.json');
  const fb = JSON.parse(readFileSync(fbPath, 'utf8'));
  const linked = new Set(Object.values(JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'))).flat());
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'apply') {
    const patch = JSON.parse(readFileSync(arg, 'utf8'));
    const byId = new Map(fb.map((e) => [e.id, e]));
    let bad = 0;
    for (const [id, s] of Object.entries(patch)) {
      const why = !byId.has(id) ? 'id inconnu' : bedeutungIssue(s);
      if (why) { console.error(`✗ ${id} : ${why} (« ${s} »)`); bad++; }
    }
    if (bad) { console.error(`❌ ${bad} entrée(s) refusée(s) — rien écrit`); process.exit(1); }
    for (const [id, s] of Object.entries(patch)) byId.get(id).s = s.trim();
    const { serialize } = await import('./registerLots.mjs');
    writeFileSync(fbPath, serialize(fb));
    console.log(`✓ ${Object.keys(patch).length} Bedeutungen appliquées`);
  } else {
    const flagged = fb.filter((e) => linked.has(e.id) && bedeutungIssue(e.s));
    if (cmd === '--list') { console.log(JSON.stringify(flagged.map((e) => ({ id: e.id, t: e.t, s: e.s, why: bedeutungIssue(e.s), def: e.def, sp: e.sp })), null, 2)); process.exit(0); }
    for (const e of flagged) console.error(`✗ ${e.id} « ${e.t} » : ${bedeutungIssue(e.s)} — « ${e.s} »`);
    if (flagged.length) { console.error(`❌ ${flagged.length} Bedeutung(en) à reformuler (sur ${linked.size} termes liés)`); process.exit(1); }
    console.log(`✓ Bedeutung : ${linked.size} termes liés, toutes ≤ ${MAX_WORDS} mots`);
  }
}
```

- [ ] **Step 4 : vérifier** — `node --test scripts/checkBedeutung.test.mjs; echo exit=$?` → 0 ; `node scripts/checkBedeutung.mjs; echo exit=$?` → **1** avec `❌ 43 Bedeutung(en) à reformuler (sur 1261 termes liés)` (nombre après A4 ; le noter) ; `npx vitest run src/data/bedeutung.search.test.ts; echo exit=$?` → 0.

- [ ] **Step 5 : commit**
```bash
git add scripts/checkBedeutung.mjs
git add scripts/checkBedeutung.test.mjs
git add src/data/bedeutung.search.test.ts
git commit -m "feat(contenu): validateur Bedeutung ≤ 6 mots + non-régression de la recherche (F4a §3.2)"
```

---

### Task D2 : Reformulation des Bedeutungen signalées (content-case-author × fsp-language-reviewer × fsp-clinical-reviewer)

**Files:**
- Modify: `app/src/data/fachbegriffe.json` (champ `s` des termes signalés)
- Create: `app/docs/reports/f4a-bedeutung.md`
- Modify: `.github/workflows/quality.yml`

- [ ] **Step 1 : lot** — `node scripts/checkBedeutung.mjs --list > ../scratchpad/bedeutung-lot.json; echo exit=$?` → 0 ; noter le nombre d'entrées.

- [ ] **Step 2 : auteur** — `content-case-author` (Sonnet), brief :
> Pour chaque entrée de `scratchpad/bedeutung-lot.json` (`t`, `s` actuelle, `def`, spécialité), écris une **Bedeutung** : reformulation allemande directe et retenable, **≤ 6 mots**, pas une phrase (pas de point final, pas de relative « , der/die/das … », pas de « ist/wird/bedeutet »), pas d'article initial, pas de parenthèse, pas d'emoji, pas de traduction. Elle doit rester fidèle à `def` et au sens clinique, et **différente** du terme lui-même. Exemples : « Caput medusae » → « erweiterte Bauchvenen um den Nabel » ; « Allergen » → « allergieauslösender Stoff ». Rends **seulement** `scratchpad/bedeutung.patch.json` : `{ "<id>": "<Bedeutung>" }`. Ne modifie aucun autre fichier.

- [ ] **Step 3 : validation mécanique** — `node scripts/checkBedeutung.mjs apply ../scratchpad/bedeutung.patch.json; echo exit=$?` → 0 (sinon renvoyer les refus à l'auteur) ; `node scripts/checkBedeutung.mjs; echo exit=$?` → 0 ; `npx vitest run src/data; echo exit=$?` → 0 (la recherche retrouve chaque terme par sa nouvelle Bedeutung).

- [ ] **Step 4 : relectures (lecture seule, en parallèle)** — `fsp-language-reviewer` : allemand C1 naturel, pas de faux ami, registre neutre ; `fsp-clinical-reviewer` : sens exact, rien de trahi par la réduction, cohérence avec `def`. Chacun rend `id → constat → correction` dans `app/docs/reports/f4a-bedeutung.md`. L'auteur corrige en un nouveau patch ; re-`apply` ; re-validateur ; re-tests.

- [ ] **Step 5 : CI** — dans `.github/workflows/quality.yml`, après `Tests du validateur de registre`, ajouter :
```yaml
      - name: Bedeutung des termes liés — ≤ 6 mots, pas une définition (F4a)
        run: node scripts/checkBedeutung.mjs
      - name: Tests du validateur Bedeutung
        run: node --test scripts/checkBedeutung.test.mjs
```

- [ ] **Step 6 : commit**
```bash
git add src/data/fachbegriffe.json
git add docs/reports/f4a-bedeutung.md
git add ../.github/workflows/quality.yml
git commit -m "content(fachbegriffe): Bedeutungen des termes liés reformulées ≤ 6 mots, relues langue + clinique (F4a)"
```

---

# Tranche E — Fin de branche

### Task E1 : Revue de branche

- [ ] Gates complets **avec et sans** `app/.env` (`mv .env .env.bak`, gates, `mv .env.bak .env`) : `npm run typecheck`, `npx vitest run --dir src`, `npm run build`, tous les `node scripts/check*.mjs` et `node --test scripts/*.test.mjs` de la CI → exit 0 ; `node scripts/testRls.mjs` → 0 (pile locale).
- [ ] `quality-branch-reviewer` (Opus) sur la branche entière : AC prouvés, suppression différée (pagehide, transaction), projection `updated`, `data-keep-open` cohérent entre bulle, survol, tiroir.
- [ ] `security-auditor` + skill `security-review` (contrat touché, fonction `ai`) : corps strict `bedeutung`, cache avant quota, aucun champ `system`, texte nettoyé avant cache, contrainte SQL.
- [ ] `front-design-keeper` (AC-12) : 44 px, tons (`signal` jamais en texte courant, surlignage en `brand`), `motion-reduce` sur `CardFlip`, 390 px ; icônes `say-*` lisibles en clair/sombre.
- [ ] `direction-keeper` : copy des lignes d'usage, « à compléter », libellés de la confirmation, anti-slop, zéro doublon.
- [ ] Un seul fixeur par série de constats, puis re-revue.

### Task E2 : Preuve navigateur par AC (playwright-cli, mesures depuis le DOM de l'app)

Créer `app/scripts/e2e/fachbegriffe-f4a.spec.md` (même forme que `fachbegriffe-f3.spec.md`) ; Supabase local avec la migration 15, `functions serve --env-file supabase/.env` de ce worktree (`AI_ALLOW_MOCK=1`, `AI_CHAIN_BRIEF=mock:brief`), compte premium local (`grantFounder.mjs`), app sur port libre. Ne jamais `import("/src/…")` dans une sonde : lire le DOM et IndexedDB via `indexedDB.open`.

- [ ] **AC-1/AC-2** : `/cas/case-leberzirrhose` → panneau des termes : aucun terme de `genericTerms.json` ; fiche de `Fieber` → « Erscheint in Fällen » ne liste que des cas où il est constat principal ; `?case=` du drill : même ensemble que le panneau.
- [ ] **AC-3** : fiche d'`Aszites` → ordre DOM `Bedeutung` → `Définition complète` (`details` fermé) → `Dans l'entretien` → 3 lignes `data-usage` dans l'ordre `patient, anamnese, vorstellung`.
- [ ] **AC-4** : sélectionner « Belastungsdyspnoe » dans une phrase d'un cas → `Nouvelle carte : …` → mini-fiche : Bedeutung `mock:brief` (texte brut), Contexte = une phrase, `mark` sur le mot ; vider la Bedeutung → `Créer` désactivé ; Fermer → IndexedDB `progress_events` inchangé.
- [ ] **AC-5** : sélectionner une phrase de 6+ mots → pastilles → toucher un mot → il devient `Mot`, la phrase est le contexte.
- [ ] **AC-6** : ★ sur `Aszites` (glossaire) → confirmation « Rangée dans Favoris » avec miniature ; « Voir la carte » → `data-card-flip="verso"` ; « Changer de deck » → deck choisi : `favorites` sans le terme, `deck_terms` avec.
- [ ] **AC-7** : carte personnelle → « Modifier la Bedeutung » → nouveau texte visible ; **2ᵉ contexte navigateur** même compte → après sync, même Bedeutung ; le mot n'a pas de champ ; ancienne carte sans Bedeutung → « à compléter ».
- [ ] **AC-8** : tiroir → « Carte » → recto (terme), Révéler → verso = fiche, identique au drill `Terme → sens`.
- [ ] **AC-9** : corbeille → carte absente des listes, confirmation « Annuler » ; Annuler → carte revenue, aucun `term.personal_deleted` dans `progress_events` ; re-corbeille puis attendre 6 s → événements présents ; re-corbeille puis fermer l'onglet (`page.close({ runBeforeUnload: true })`) → au rechargement, carte supprimée (ou présente si l'écriture n'a pas abouti — jamais à moitié : favori et carte vont ensemble).
- [ ] **AC-11 (local)** : build `VITE_AUTH_MODE=public` → la mini-fiche n'appelle pas `/functions/v1/ai` (requêtes réseau) ; sans clé → « Écris la signification ».
- [ ] **AC-12** : `--viewport 390x844` : `document.documentElement.scrollWidth <= 390` sur tiroir, mini-fiche, confirmation, carte au survol.
- [ ] Commit : `git add scripts/e2e/fachbegriffe-f4a.spec.md` puis `git commit -m "test(fachbegriffe): preuve navigateur F4a — AC-1 à AC-12"`.

### Task E3 : [CONTRÔLEUR] Vérification EU, PR, livraison

- [ ] Vérifier que B6 est fait (`list_migrations` → `20260928000015` ; `get_edge_function events` et `ai` à jour) — **avant** merge (AC-11).
- [ ] `git push -u origin feat/fachbegriffe-f4-clarte` ; `gh pr create` (corps : résumé par tranche, tableau AC → preuve, mesures avant/après, questions ouvertes tranchées, risques résiduels) ; CI verte.
- [ ] Merge par la direction ; `publishContent` publie `caseTermLinks` et les Bedeutungen (delta par hash) ; vérification sur `https://mhdbkr.github.io/…` (AC-4, AC-7 sur les deux comptes) ; mémoire.

---

## Couverture des critères d'acceptation

| AC | Tâches | Preuve |
|---|---|---|
| AC-1 | A1, A2, A3, A4, E2 | `linkCaseTerms.test.mjs` (46 fixtures, champs exclus/contextuels), `checkCaseTermLinks` (≤ 10 > 20 %, aucun générique), CI ; navigateur |
| AC-2 | A2, A3, A4 | `checkLinks` (≥ 8/cas, diagnostic lié, exceptions listées) |
| AC-3 | C1, C6, E2 | `TermSheet.test` (ordre, `details` fermé, 3 usages + lignes) ; `grep -rni --exclude='*.test.tsx' patientengerecht src/components src/features` → exit 1 |
| AC-4 | B4, B5, C7, E2 | `sentence.test`, `onlineAi.route.test`, `SelectionExplainer.test` (proposée, une phrase, `mark`, Créer bloqué, fermer = rien) ; navigateur |
| AC-5 | C7, E2 | `SelectionExplainer.test` (pastilles) ; navigateur |
| AC-6 | C3, C4, C7, E2 | `StarButton.test`, `SelectionExplainer.test` ; navigateur |
| AC-7 | B1, B2, C1, C6, B6, E2 | projection `personal_updated`, `updatePersonalExplanation`, `TermSheet.test`, `GlossaryDrawer.test` ; navigateur 2 contextes |
| AC-8 | C2, C6, E2 | `CardFlip.test`, `GlossaryDrawer.test` (« Carte ») ; navigateur |
| AC-9 | B3, C4, C6, E2 | `pendingDeletion.test` (Annuler, expiration, pagehide), `queue.test` (`pushMany`), `GlossaryDrawer.test` |
| AC-10 | D1, D2 | `checkBedeutung` en CI, `bedeutung.search.test.ts`, rapport `f4a-bedeutung.md` |
| AC-11 | B1, B5, B6, E1, E3 | `events.test.ts`, `ai.test.ts` (≤ 6 mots, sans emoji, cache), MCP, build public, gates sans `.env` |
| AC-12 | C1–C7, E1, E2 | `front-design-keeper` ; 390 px |

## Questions ouvertes (à trancher par la direction, défaut appliqué entre parenthèses)

1. **Exceptions de diagnostic** : la spec en liste 6 ; avec les mots d'examen retirés, `case-aortendissektion`, `case-ptbs`, `case-alkoholentzug` n'ont plus de terme de diagnostic (le glossaire n'a ni « Aortendissektion », ni « Posttraumatische Belastungsstörung », ni « Alkoholentzugssyndrom »). (Défaut : 9 exceptions ; alternative : ajouter ces 3 termes au glossaire dans un lot de contenu.)
2. **Nombre de Bedeutungen à reformuler** : 38 dans la spec (> 6 mots, liens d'avant) ; 43 mesurées après la nouvelle liaison (36 > 6 mots + 7 phrases de définition). (Défaut : les 43 — la règle « ou en phrase de définition » est dans la spec.)
3. **Sous-titre des listes** (`TermList`, `CaseTermsPanel`) : `registerLine` montre la parole du patient quand elle existe. Hors spec ; inchangé. (Défaut : inchangé ; passer à la Bedeutung serait une ligne.)
4. **Article** dans l'en-tête de la fiche (spec §3.4) : `fachbegriffe.json` n'a pas de champ article. (Défaut : terme + prononciation seulement ; l'article demanderait un lot de contenu.)
5. **Fermer l'app pendant le délai** (D10) : spec « garde la carte » vs « émis au `pagehide` ». (Défaut : `pagehide` émet en une transaction ; si l'écriture n'aboutit pas, la carte reste entière — jamais à moitié.)

## Auto-revue (faite)

- Couverture : D1–D10 et AC-1–AC-12 ont chacun une tâche (tableau ci-dessus) ; hors périmètre respecté (pas de glass, pas de motion premium, pas de réglages de cartes, le mot d'une carte n'est jamais modifiable).
- Placeholders : aucun « TBD » ; le code des tâches A1–D1 a été **exécuté** sur une copie du dépôt (typecheck vert, 500+ tests verts, scripts sur le corpus réel) avant d'être recopié ici.
- Noms : `sentences`, `endsWithAbbreviation`, `isNegated`, `caseTexts`, `caseParts`, `linkCorpus`, `loadGeneric`, `checkLinks`, `DIAGNOSIS_EXCEPTIONS` (A) ; `updatePersonalExplanation`, `planPersonalDeletion`, `commitPersonalDeletion`, `syncQueue.pushMany`, `scheduleDeletion`, `cancelDeletion`, `flushDeletions`, `usePendingDeletions`, `DELETE_DELAY_MS`, `sentenceAt`, `sentenceOfRange`, `highlightParts`, `buildBedeutungPrompt`, `cleanBedeutung`, `collectText`, `askBedeutung` (B) ; `TermUsage`, `USAGES`, `TermSheet`, `ContextSentence`, `CardFlip`, `cardFront`, `CardDirection`, `termIdsInDecks`, `decksOfTerm`, `addTermToDeck`, `removeTermFromDeck`, `moveTermToDeck`, `useTermsInDecks`, `useCardToast`, `StarButton`, `DeckChecklist`, `CardToast`, `NewCardSheet`, `selectionWords`, `CHIP_THRESHOLD` (C) ; `bedeutungIssue` (D).
- Points à vérifier à l'exécution, signalés dans les tâches : forme des chemins `_shared` au déploiement MCP (B6) ; nombre exact de Bedeutungen signalées après A4 (D1) ; `supabase/.env` local porte bien `AI_CHAIN_BRIEF=mock:brief` (B5).
