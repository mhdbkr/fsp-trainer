# FSP Trainer v2 — Module 2 (Simulation) Implementation Plan

> **For agentic workers:** implement task-by-task. UI tasks are verified via the Claude Preview browser (build + snapshot), pure-logic tasks via Node/TDD. Steps use `- [ ]`.

**Goal:** Refondre le Mode Simulation en une expérience à deux niveaux d'assistance (Assisté / Autonome), fidèle aux supports FSP (ODAK Vorstellung, Muster-Bogen par ville, Fachanamnese, Kommunikative Strategien), avec fiche patient sur 2ᵉ écran, guides interactifs jamais auto-générés, et une UI illustrative (anti-mur-de-texte).

**Architecture:** React 18 + TS + Vite + Dexie (local, offline). Le contenu-guide (chapitres d'anamnèse, Redewendungen de Vorstellung, Fachanamnese, Kommunikative Strategien, Aufklärung) vit comme données typées dans `src/data/guides/`. La simulation est une machine à états (mode × partie × couche) ; la fiche patient est une route responsive `#/patient/:caseId` synchronisée par BroadcastChannel (même appareil) + broker LAN optionnel (smartphone).

**Tech Stack:** React, TypeScript, Dexie, Zustand, TailwindCSS, Recharts, date-fns, `qrcode` (génération QR locale), `@mlc-ai/web-llm` (Module 5, plus tard).

## Global Constraints
- 100 % local/offline, zéro cloud, zéro API payante.
- Interface FR, termes médicaux DE.
- **Rien que le candidat doit produire n'est auto-généré** (Arztbrief, trame orale de Vorstellung) — l'app guide/structure/compare uniquement.
- **UI illustrative** : illustrations/pictos SVG, iconographie par chapitre & spécialité, cartes & blocs colorés, mindmaps, steppers/jauges ; pas de murs de texte (texte dense = replié).
- Deux niveaux d'assistance partout : **Assisté** (guidage visible) / **Autonome** (raccourcis, chapitres « en tête »).
- Le niveau d'assistance et la **couche** (1 Assisté → 2-3 Autonome) pondèrent le score.

---

## File Structure (nouveaux / modifiés)

**Données-guide (nouveau dossier `src/data/guides/`)**
- `anamneseChapters.ts` — chapitres Allgemeine Anamnese (id, titre, icône, mots-clés, questions).
- `fachanamnese.ts` — sous-guides Spezielle Anamnese par spécialité (13).
- `vorstellungChapters.ts` — 13 chapitres Vorstellung + Redewendungen alternatives (source ArztbriefVorstellung_2).
- `kommunikativeStrategien.ts` — 6 situations + parades.
- `musterBogen.ts` — layout des 5 Muster (ODAK + Freiburg/Karlsruhe/Reutlingen/Stuttgart).

**Modèle**
- `src/db/types.ts` — +AssistanceMode, +Layer, +MusterCity, +champs Simulation, +Case.referenceArztbrief, +Case.kommunikativeSituationIds.
- `src/db/db.ts` — bump schéma si besoin (index inchangés).

**Lib (pure, TDD)**
- `src/lib/scoring.ts` — +pondération assistance×couche.
- `src/lib/arztbriefCompare.ts` — comparateur léger (structure/registre/blocs manquants).
- `src/features/simulation/simState.ts` — machine à états simulation.

**UI Simulation (`src/features/simulation/`)**
- `SimulationSetup.tsx` — écran de choix mode + couche + Muster + rôle + ambiance d'entrée.
- `AmbianceIntro.tsx` — animation d'entrée « salle d'examen ».
- `AnamneseGuide.tsx` — guide chapitres (toggles, mots-clés surlignés, liens Fachbegriffe/Fachwissen, cases à cocher) + sous-chapitre Fachanamnese.
- `AnamneseBogen.tsx` — Notizen refondus = Muster-Bogen par ville (remplace NotesCanvas dans le flux).
- `VorstellungGuide.tsx` — vue stepper (curseur progressif) + vue mindmap, Redewendungen cochables.
- `ArztbriefGuide.tsx` — guide rédaction + zone de saisie + bouton « comparer au corrigé ».
- `ArztbriefDiff.tsx` — rendu du feedback formatif.
- `KommunikationTrigger.tsx` — répliques difficiles déclenchables (dans la sim).
- `PatientScreen.tsx` — route `#/patient/:caseId` responsive (2ᵉ écran) + QR.
- `usePatientSync.ts` — BroadcastChannel + (optionnel) broker LAN.
- Modifs : `SimulationRunner.tsx` (orchestration modes/couches), `useData.ts`, `store/ui.ts` (assistance, muster).

**Composants illustratifs (`src/components/`)**
- `icons.tsx` — pictogrammes SVG (chapitres d'anamnèse, spécialités, systèmes d'organes).
- `Stepper.tsx`, `Mindmap.tsx`, `ProgressRing` (déjà partiel) — visuels réutilisables.

---

## Tasks

### Task 1 — Modèle: modes, couches, Muster, champs simulation
**Files:** Modify `src/db/types.ts`; Modify `src/store/ui.ts`.
**Interfaces produites:** `AssistanceMode='assiste'|'autonome'`, `Layer=1|2|3`, `MusterCity='ODAK'|'Freiburg'|'Karlsruhe'|'Reutlingen'|'Stuttgart'`, `Simulation.assistance`, `Simulation.layer`, `Simulation.muster`, `Case.referenceArztbrief?: string`, `Case.kommunikativeSituationIds?: string[]`, `PartResult.assistanceUsed`.
- [ ] Ajouter les types + champs (rétro-compatibles, tous optionnels).
- [ ] `store/ui.ts`: +`assistance`, `setAssistance`, `muster`, `setMuster`.
- [ ] `npx tsc -b --noEmit` → 0 erreur. Commit.

### Task 2 — Données-guide: chapitres d'anamnèse + Fachanamnese (illustratif)
**Files:** Create `src/data/guides/anamneseChapters.ts`, `src/data/guides/fachanamnese.ts`.
**Interfaces produites:** `AnamneseChapter{id,title,icon,keywords[],questions[]}`, `FachanamneseGuide{specialty,chapters:AnamneseChapter[]}`, `getFachanamnese(specialty)`.
- [ ] Encoder les 11 chapitres Allgemeine + Schmerzanalyse (livre 2.1/2.2.1) avec `icon` (clé picto) et `keywords` (mots à surligner).
- [ ] Encoder les 13 Fachanamnesen (2.2.2–2.2.14).
- [ ] Test node: `getFachanamnese('Gastroenterologie')` renvoie ≥1 chapitre. Commit.

### Task 3 — Données-guide: Vorstellung (13 chapitres + Redewendungen)
**Files:** Create `src/data/guides/vorstellungChapters.ts`.
**Interfaces produites:** `VorstellungChapter{id,order,title,icon,redewendungen:string[],keywords[]}`, `VORSTELLUNG_CHAPTERS: VorstellungChapter[]` (13, ordre §1 de l'analyse).
- [ ] Encoder les 13 chapitres + Redewendungen alternatives (verbatim ODAK) + keywords surlignables.
- [ ] Test node: longueur = 13, ordres uniques 1..13. Commit.

### Task 4 — Données-guide: Kommunikative Strategien + Muster-Bogen
**Files:** Create `src/data/guides/kommunikativeStrategien.ts`, `src/data/guides/musterBogen.ts`.
**Interfaces produites:** `KommunikativeSituation{id,title,icon,cue,parades[]}` (6) ; `MusterBogenSpec{city,instruction,fields:BogenField[]}` (5) où `BogenField{key,label,kind:'header'|'box'|'split',hint}`.
- [ ] Encoder les 6 situations (2.4.x) + `cue` (réplique patient) + parades.
- [ ] Encoder les 5 Muster (layouts relevés §2 de l'analyse: Freiburg/Karlsruhe/Reutlingen[+Medikamente]/Stuttgart/ODAK).
- [ ] Test node: 6 situations, 5 Muster, Reutlingen contient un field `medikamente`. Commit.

### Task 5 — Pictogrammes SVG (illustratif)
**Files:** Create `src/components/icons.tsx`.
**Interfaces produites:** `<ChapterIcon name=... />`, `<SpecialtyIcon specialty=... />` (SVG inline, `currentColor`, `role=img`).
- [ ] Créer 12–16 pictos (Beschwerden, vegetativ, Vorerkrankungen, Medikamente, Allergien, Noxen, Familie, Sozial, herz, lunge, magen, niere, hirn, knochen…).
- [ ] Build OK. Commit.

### Task 6 — Scoring pondéré (assistance × couche) [TDD]
**Files:** Modify `src/lib/scoring.ts`; Create `src/lib/scoring.test.mjs` (node).
**Interfaces produites:** `weightedPartScore(part, {assistance, layer}): number` — Autonome > Assisté ; couche ↑ = exigence ↑.
- [ ] Écrire test: même PartResult, `assistance:'autonome'` score > `assistance:'assiste'`; couche 3 pondère plus que couche 1.
- [ ] Run → FAIL. Implémenter le multiplicateur. Run → PASS. Commit.

### Task 7 — Comparateur Arztbrief léger [TDD]
**Files:** Create `src/lib/arztbriefCompare.ts`, `src/lib/arztbriefCompare.test.mjs`.
**Interfaces produites:** `compareArztbrief(userText, reference): {blocksPresent[], blocksMissing[], registerFlags[], coveragePct}` — détecte présence des blocs (Anrede, Anamnese, VD, DD, Diagnostik, Therapie, Schlussformel), registre (Konjunktiv I / Passiv indices), sans « corriger ».
- [ ] Test: texte sans Schlussformel → `blocksMissing` contient `schlussformel`; texte avec « wurde … » → registre passiv détecté.
- [ ] Run → FAIL → implémenter (heuristiques regex/mots-clés) → PASS. Commit.

### Task 8 — Machine à états simulation
**Files:** Create `src/features/simulation/simState.ts`.
**Interfaces produites:** `useSimMachine(caseId)` → `{mode, layer, muster, part, setPart, next, ...}`.
- [ ] Implémenter transitions Anamnese→Doku→Vorstellung→(Aufklärung), garde le mode/couche.
- [ ] Build OK. Commit.

### Task 9 — Écran Setup + Ambiance d'entrée (illustratif)
**Files:** Create `SimulationSetup.tsx`, `AmbianceIntro.tsx`; Modify `SimulationRunner.tsx`, `PreSimulationPage.tsx`.
- [ ] Setup: choix **Mode** (Assisté/Autonome, cartes illustrées), **Couche** (1/2/3), **Muster** (5 villes, mini-aperçu), **Rôle**, bouton QR fiche patient.
- [ ] Ambiance: courte animation (respiration + « Prüfungsraum », 2–3 s, skippable, discrète).
- [ ] Preview: snapshot Setup + intro. Commit.

### Task 10 — AnamneseGuide + Fachanamnese (illustratif, interconnecté)
**Files:** Create `AnamneseGuide.tsx`; use `anamneseChapters`, `fachanamnese`, `icons`, `AutoLink`.
- [ ] Chapitres en toggles avec `ChapterIcon`, mots-clés surlignés, `AutoLink` (Fachbegriffe) + raccourci Fachwissen ; case à cocher/chapitre.
- [ ] Si cas ∈ spécialité → **sous-chapitre extra Fachanamnese** injecté.
- [ ] Autonome: chapitres repliés (titres + icônes), révélation à la demande.
- [ ] Preview snapshot. Commit.

### Task 11 — AnamneseBogen (Notizen refondus, Muster par ville)
**Files:** Create `AnamneseBogen.tsx`; use `musterBogen`.
- [ ] Rendu du Bogen selon `muster` (header + boxes/split selon la ville), saisie par champ.
- [ ] Assisté: placeholders = questions-clés ; Autonome: épuré.
- [ ] Persistance dans `Simulation.notes` (structure étendue par champ).
- [ ] Preview snapshot pour 2 villes. Commit.

### Task 12 — VorstellungGuide (stepper + mindmap)
**Files:** Create `VorstellungGuide.tsx`, `src/components/Mindmap.tsx`, `src/components/Stepper.tsx`.
- [ ] Vue stepper: 13 chapitres, chapitre actif ouvert, Redewendungen cochables, barre « maîtrisés ».
- [ ] Vue mindmap: radial cas→chapitres→Redewendungen, commutable.
- [ ] Autonome: titres seuls + révélation flash. **Aucune trame auto.**
- [ ] Preview snapshot des 2 vues. Commit.

### Task 13 — ArztbriefGuide + Diff
**Files:** Create `ArztbriefGuide.tsx`, `ArztbriefDiff.tsx`; seed `Case.referenceArztbrief` pour Leberzirrhose.
- [ ] Guide (chapitres + Redewendungen + blocs standard) à gauche, zone de saisie à droite (le candidat rédige).
- [ ] Bouton « Comparer au corrigé » → `compareArztbrief` → `ArztbriefDiff` (blocs présents/manquants colorés, drapeaux registre). **Pas de courrier auto.**
- [ ] Preview snapshot. Commit.

### Task 14 — Kommunikative Strategien (sim + guide dédié)
**Files:** Create `KommunikationTrigger.tsx`; Modify `GuidesPage.tsx` (guide dédié + drill); seed `Case.kommunikativeSituationIds`.
- [ ] En sim: répliques déclenchables (cartes) pour les situations du cas.
- [ ] Guide dédié « Schwieriger Patient »: 6 situations illustrées + parades + mini-drill (cue→parade).
- [ ] Preview snapshot. Commit.

### Task 15 — Fiche patient 2ᵉ écran (route + QR + sync)
**Files:** Create `PatientScreen.tsx`, `usePatientSync.ts`; Modify `main.tsx` (route `#/patient/:caseId`).
- [ ] Route responsive mobile: fiche rôle + répliques difficiles ; pas d'auto-link (script patient).
- [ ] QR (lib `qrcode`) dans la sim → ouvre l'URL LAN `#/patient/<caseId>`.
- [ ] BroadcastChannel: même appareil, la fenêtre patient suit le cas actif.
- [ ] Preview: ouvrir la route, snapshot mobile. Commit.

### Task 16 — Intégration Runner + vérif de bout en bout (cas pilote Leberzirrhose)
**Files:** Modify `SimulationRunner.tsx`; seed enrichi Leberzirrhose (referenceArztbrief, situations).
- [ ] Câbler Setup→Anamnese(Guide+Bogen)→Doku(Guide+Diff)→Vorstellung(stepper/mindmap)→Aufklärung, dans les 2 modes.
- [ ] `npm run build` OK ; preview: dérouler le cas pilote en Assisté puis Autonome ; snapshots.
- [ ] `superpowers:requesting-code-review`. Commit.

---

## Roadmap post-M2 (plans séparés)
- **M1 Programme dynamique** (`2026-…-module1-programme.md`) : onboarding, moteur capacité/pondération, SM-2 + couches, agenda accueil + onglet.
- **M3 Barème/indicateurs** : critères par axe, indicateur « prêt ? », interconnexion accueil/heatmap/programme.
- **M4 Cas** (harmonisation design illustratif) · **M5 Dictionnaire** (skill-creator + FreeDict + WebLLM, deep-link B) · **M6 Mémo réflexes** (surcouche transitions).

## Self-Review
- Couverture spec M2: modes ✓(T1,6,9,10,12), Muster-Bogen ✓(T4,11), Fachanamnese ✓(T2,10), Vorstellung non-auto ✓(T3,12), Arztbrief comparatif ✓(T7,13), Kommunikative ✓(T4,14), 2ᵉ écran ✓(T15), ambiance ✓(T9), illustratif ✓(T5 + partout), pondération assistance/couche ✓(T6).
- Types cohérents entre tâches (AssistanceMode, Layer, MusterCity partagés dès T1).
