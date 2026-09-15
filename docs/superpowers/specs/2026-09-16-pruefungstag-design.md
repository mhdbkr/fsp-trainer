# Doctopus — Prüfungstag-Simulator + Bereitschaftsindex · spec de design

> Sous-projet #2 (epic #3) · pôle Produit · auteur `spec-pruefungstag` · 2026-09-16 · statut : **en attente G2** · avis pédagogique : `docs/specs/pedagogy/2026-09-16-bereitschaftsindex-review.md` (APPROVED_WITH_CHANGES, appliqué)
> Périmètre de code : `app/src/features/readiness/`, `app/src/lib/readiness/`, `app/src/features/simulation/examDay*`, un point d'entrée « mode examen » dans `SimulationRunner.tsx`. Tout autre besoin est listé en §13 comme proposition de contrat.

## 1. Objectif

Donner au candidat une réponse honnête à « passerais-je la FSP aujourd'hui ? » :

1. **Prüfungstag** — un mode « jour d'examen » : un cas tiré au sort, 20 + 20 + 20 minutes réelles enchaînées, aucune aide, évaluation complète à la fin, verdict au barème officiel (≥ 60 % par partie).
2. **Bereitschaftsindex** — un indice 0–100 dont la formule est affichée au candidat, nourri par ses simulations (Prüfungstag > Autonome > Assisté), sa couverture des spécialités et sa courbe de langue. Le chiffre est gratuit ; le chemin vers 80 est Pro. Un axe jamais joué vaut 0 (affiché « — »), jamais un chiffre inventé.

Rupture de symbiose visée : l'indice actuel (`lib/readiness.ts`) mesure des simulations jouées avec guides et coups de pouce — des conditions que l'examen n'offre pas. L'humain doit deviner si son score assisté « vaut » quelque chose. Ici, c'est la machine qui fait la conversion, en clair.

Intention validée à G1 : voir `.superpowers/teams/pruefungstag/reports/spec-intention.md`.

## 2. Personas

| Persona | Ce qu'il attend | Ce qui le ferait décrocher |
|---|---|---|
| Candidat à 3 semaines | Un verdict binaire et un plan court ; sentir la pression du vrai chrono. | Un indice qu'il ne comprend pas ; un mode examen où il peut « tricher » (révéler un guide). |
| Binôme à distance | Le simulant reçoit la fiche patient puis la fiche examinateur au bon moment, sans que le candidat les voie. | Devoir dire le cas à voix haute ; ne pas savoir quand passer d'un rôle à l'autre. |
| Non-natif mobile | Un écran examen qui tient sur un téléphone en focus. | Un chrono illisible ; un Bogen impossible à remplir au pouce. |

## 3. Portée

**In**
- Mode Prüfungstag : setup, tirage du cas, déroulé 3 parties minutées, verrouillage, transitions, fin dure, évaluation complète en fin, écran de résultat.
- Bereitschaftsindex v2 : formule, composantes, verdict, explication en clair, page dédiée, carte d'accueil (via proposition §13).
- Free vs Pro : chiffre + composantes gratuits ; plan d'actions chiffré, historique, projection en Pro.
- Événement `exam_day.completed` (besoin exprimé, payload souhaité ; contrat rédigé par `arch-pruefungstag`).
- Vocabulaire : propositions pour `CONTEXT.md` (§14) ; ADR-0013 (brouillon).

**Out** (explicite)
- Toute modification du mode entraînement (`SimulationRunner.tsx` hors point d'entrée), y compris ses durées.
- Évaluation par IA (Arztbrief IA = #4, patient vocal = #13) ; aucun crédit consommé ici.
- Ligue / points serveur (#9) — mais `exam_day.completed` est conçu pour l'alimenter.
- Fidélité par Land autre que BW (les minutages affichés portent la mention « BW » tant que `docs/exam/<land>.md` n'existe pas).
- Calcul serveur de l'indice, e-mails, notifications.

## 4. Décisions prises (et alternatives écartées)

| # | Décision | Alternatives écartées | Pourquoi |
|---|---|---|---|
| D1 | Le Prüfungstag **est une `Simulation`** enregistrée comme les autres, marquée `context: 'pruefungstag'`, et émet `simulation.completed` (projections inchangées) **plus** un événement résumé `exam_day.completed`. | (a) Un type d'entité distinct `ExamDay` ; (b) un seul événement `exam_day.completed` avec projection dédiée. | (a) doublerait stats/heatmap/SRS ; (b) obligerait à réécrire `rebuildProjections`. Le résumé sert au serveur (conversion, ligue #9) sans dupliquer le payload complet. |
| D2 | Minutage **20 / 20 / 20**, fin dure à 0:00, transitions ≤ 60 s, pas de pause, pas de reprise différée. | 20/20/12 (Runner actuel) ; prolongation « +2 min » ; pause autorisée. | 20/20/20 est la seule valeur sourcée (§1 du rapport d'intention). Une simulation qu'on peut mettre en pause ne mesure pas la tenue en 60 minutes. |
| D3 | Chrono **horloge murale** (`startedAt` par partie, epoch ms) et non un compteur d'intervalle. | Réutiliser `useTimer` tel quel. | `useTimer` s'arrête si l'onglet est gelé ou le Runner démonté (`setInterval`) ; à l'examen le temps continue. |
| D4 | Verrouillage **total** : aucun guide, Muster, Redewendung, pastille, AutoLink, glossaire ni fiche patient côté candidat ; il reste le Bogen (notes) et la zone Arztbrief. | Réutiliser l'Autonome (qui laisse révéler « si tu bloques »). | L'Autonome mesure la progression ; le Prüfungstag mesure l'examen. Un seul coup de pouce et la mesure ne vaut plus rien. |
| D5 | Cas **tiré au sort** pondéré par `frequency`, hors cas joués < 14 j, dans le tier du plan ; révélé au simulant (QR), et au candidat par « nom, âge, motif de consultation » au top départ. | Cas choisi par le candidat. | À l'examen on ne choisit pas. Un cas choisi biaise l'indice vers le haut. |
| D6 | Évaluation **en fin** des trois parties (+ Aufklärung si jouée), même grilles que `PartEvaluation`, remplies par candidat et simulant ensemble ; verdict « bestanden » ssi chaque partie ≥ 60 %. | Évaluer après chaque partie (comme en entraînement). | Une évaluation intermédiaire casse l'enchaînement et donne une information que l'examen ne donne pas. |
| D7 | Formule `BI = 0,5·S + 0,25·C + 0,25·L` ; S sur les **3 parties de l'examen** (l'Aufklärung entre dans l'axe Anamnese) ; plafond **79** sans Prüfungstag **avec simulant** réussi dans les 30 derniers jours ; un axe jamais testé vaut **0** et s'affiche « — nicht getestet ». | Moyenne simple des 6 axes (existant) ; formule opaque « ML » ; « axe non testé = 30 » (refusé par `pedagogy` : 30 points pour n'avoir rien fait récompensent l'inaction) ; plafond levé par un Prüfungstag solo (refusé : une Anamnese sans interlocuteur ne mesure ni Hörverstehen ni Kommunikation). | Le candidat doit pouvoir recalculer son indice à la main. Un « Prêt » sans avoir tenu 60 min face à quelqu'un serait un mensonge. L'examen note 3 parties, pas 4. |
| D8 | Free = mode examen illimité, indice, verdict, 3 composantes et leur phrase d'explication. Pro = plan d'actions chiffré, historique, projection à la date d'examen. | Limiter le nombre de Prüfungstage en Free ; cacher les composantes en Free. | « Le cœur est illimité » (`CONTEXT.md`). Cacher les composantes serait un dark pattern (ADR-0008). Le Pro vend du temps gagné, pas de l'information retenue. |
| D9 | Calcul **client**, depuis Dexie, pur et testable (`computeBereitschaftsindex(input) → Readiness2`). | Calcul serveur (RPC). | Hors-ligne d'abord ; le serveur reçoit la valeur dans `exam_day.completed`. |
| D10 | `lib/readiness.ts` devient `lib/readiness/index.ts` (API `computeReadiness` inchangée, re-export) + `lib/readiness/bereitschaft.ts`. | Nouveau module à côté. | Le périmètre est le dossier `lib/readiness/` ; les imports `@/lib/readiness` de `HomePage` et `StatsPage` ne bougent pas. |

## 5. Design du mode Prüfungstag

### 5.1 Déroulé

```
Setup (ExamDaySetup)
  │  Land/Muster (préréglé depuis le store ui) · QR simulant · rappel des règles (BW, 20/20/20, sans aide)
  │  Sous-structure P3 affichée : « ≈ 15 min Arzt-Arzt-Gespräch + ≈ 5 min Fachbegriffe-Liste (BW) »
  │  Conseil pédagogique (étiqueté comme tel, jamais bloquant) : « au plus un Prüfungstag par semaine,
  │  après ≥ 3 simulations Autonome ; le dernier 3 à 5 jours avant l'examen »
  │  [Bouton] « Commencer le Prüfungstag »  → tirage du cas → startedAt.exam = now
  ▼
Partie 1 · Anamnese · 20:00            Bogen éditable · Aufklärung jouable dans ce temps
  │ 0:00 → fin dure → Bogen figé
  ▼ Transition ≤ 60 s (« Notes ramassées. Prépare-toi à rédiger. »)  [Bouton] « Prêt » ou auto
Partie 2 · Dokumentation · 20:00       Zone Arztbrief éditable · Bogen en lecture seule
  │ 0:00 → fin dure → Arztbrief figé
  ▼ Transition ≤ 60 s (simulant : passe à la fiche examinateur)
Partie 3 · Fallvorstellung · 20:00     Bogen + Arztbrief en lecture seule · rien d'autre
  │ 0:00 → fin dure
  ▼
Évaluation (ExamDayEvaluation)          3 (ou 4) grilles, dans l'ordre, candidat + simulant
  ▼
Résultat (ExamDayResult)               verdict par partie, verdict global, BI avant → après, CTA
```

Le candidat peut à tout moment **abandonner** (bouton discret, confirmation) : rien n'est enregistré ni émis ; l'indice n'en tient pas compte. Aucune pause.

### 5.2 Minutage (faits d'examen, BW)

| Partie | Durée | Source | Fin |
|---|---|---|---|
| Anamnese | 20:00 | `ANALYSE.md` l.31 ; `00 FSP Stuttgart.md` l.512 | dure |
| Dokumentation | 20:00 | `ANALYSE.md` l.32 ; `00 FSP Reutlingen.md` l.331, l.2771 | dure |
| Fallvorstellung | 20:00 | `ANALYSE.md` l.33 (livre) ; décomposée dans les protocoles BW en ≈ 15 min Arzt-Arzt-Gespräch + ≈ 5 min Fachbegriffe-Liste : `00 FSP Freiburg.md` l.1378, `00 FSP Stuttgart.md` l.1449, l.3964, l.4211 | dure |
| Aufklärung | dans le temps de l'Anamnese | `CONTEXT.md` § Examen | — |
| Transitions | ≤ 60 s, **choix de design** (pas un fait d'examen) | `00 FSP Reutlingen.md` l.2771 (transition existe, durée non sourcée) | auto |

L'étape « Fachbegriffe-Liste » (5 min, termes du cas, à l'écrit, sans aide) n'est **pas** implémentée ici : la P3 dure 20:00 d'un bloc et le setup affiche la sous-structure sourcée (§5.1). Ticket de suite proposé par `pedagogy` (avis §4) — aucune durée inventée.

Les durées sont des constantes exportées (`EXAM_DAY_PLAN`) indexées par Land (`'BW'` seul aujourd'hui), pour que #12 Kammern les surcharge sans toucher au Runner.

Comportement du chrono :
- Chaque partie porte `startedAt` (epoch ms) ; `remaining = target − (now − startedAt)`. Un onglet gelé ou un Runner démonté ne gagnent pas de temps.
- À `remaining ≤ 0` : saisie verrouillée immédiatement, bandeau « Zeit ist um », transition.
- Alertes : à 5:00 et 1:00 restantes (visuel + son court si `TimeAmbiance` l'autorise ; réutiliser `timeAmbiance.ts`).
- Quitter le Runner (nav, lien) : le chrono continue ; la barre « reprendre » existante (`useSimSession`) ramène à la partie en cours. Si à la reprise toutes les parties sont échues et l'évaluation n'a pas été faite : proposer l'évaluation (les temps sont enregistrés tels quels).
- Fermer l'onglet / recharger : la session persiste (`useSimSession`) ; à la reprise, même règle. Un Prüfungstag non évalué **24 h** après `startedAt.exam` est purgé (abandon silencieux).

### 5.3 Verrouillage — ce qui est masqué

| Élément | Entraînement Autonome | Prüfungstag |
|---|---|---|
| Guide de questions (Anamnese) | masqué, révélable « si tu bloques » | **absent** |
| Fachanamnese (chapitre généré) | idem | **absent** |
| Pastilles conseils, Redewendungen, Muster (Arztbrief, Fallvorstellung) | raccourcis flash | **absents** |
| AutoLink / glossaire au survol | actif | **inactif** |
| Fiche patient / fiche examinateur côté candidat | accessible via QR/2ᵉ fenêtre | **inaccessible depuis l'écran candidat** ; uniquement via l'URL simulant |
| Checklist contenu | après chaque partie | **en fin seulement** |
| Bogen (feuille de notes) | éditable | éditable en P1, lecture seule ensuite |
| Zone Arztbrief | éditable en P2 | éditable en P2, lecture seule en P3 |
| Choix Assisté/Autonome, couche | libre | **forcé** `assistance:'autonome'`, `layer:3`, non modifiable |
| Mode focus (ImmersiveMode) | optionnel | disponible, mêmes restrictions |
| Aufklärung | modale avec fiche | modale **sans** fiche (le simulant a la sienne) |

La liste est **exhaustive** : tout élément d'aide non listé est masqué par défaut (principe « rien sauf ce qui est autorisé »).

### 5.4 Simulant

- Le QR du setup ouvre l'URL simulant existante (`patientUrl(caseId)`) : fiche patient en P1, bascule automatique vers `ExaminerSheetView` en P3 via le canal `fsp-patient-sync` (message `guide-chapter` existant ou nouveau message `exam-phase` — voir §13).
- Détection : si un simulant s'est connecté avant le top départ → `withSimulant:true`. Sinon la sim est jouée quand même (Q1, défaut), pèse comme une Autonome dans l'indice **et ne lève pas le plafond 79** (§6.2) ; le résultat le dit en clair (§5.5).
- Le simulant remplit l'évaluation avec le candidat en fin (même écran, même appareil ou lecture à voix haute) — pas de saisie distante dans ce périmètre.

### 5.5 Évaluation et résultat

- `ExamDayEvaluation` enchaîne `PartEvaluation` (composant existant, réutilisé tel quel) pour Anamnese, Dokumentation, Fallvorstellung, puis Aufklärung si elle a été ouverte. `durationSec` = temps réellement consommé (≤ 1200).
- Verdict : `simulationPassed()` existant (chaque partie tentée ≥ `PASS_THRESHOLD`). Une partie non tentée (chrono écoulé sans rien) est **évaluée quand même** (le candidat coche ce qu'il a fait ; typiquement 0) — jamais ignorée.
- `ExamDayResult` affiche, **dans cet ordre** (le débrief avant le chiffre — condition pédagogique, avis §1.8) : (1) score par partie avec seuil 60 et verdict « Bestanden / Nicht bestanden (BW) » ; (2) **débrief** : les items de checklist manqués par partie, le critère de langue le plus bas, le temps consommé par partie ; (3) **une** action suivante gratuite (« rejoue ce cas en Autonome » / « fais un Arztbrief sur ce cas ») ; (4) **BI avant → après** ; (5) un seul CTA : Free → « Voir mon Bereitschaftsindex » ; Pro → « Voir mon plan ». Jamais de carte pricing sur cet écran.
- Si `withSimulant:false` : bandeau « Joué sans simulant — ce Prüfungstag compte comme une simulation Autonome et ne lève pas le plafond 79 ».
- Persistance : `db.simulations.put(sim)` avec `context:'pruefungstag'`, `assistance:'autonome'`, `layer:3`, `withSimulant`, `examDay:{ startedAt, endedAt, land:'BW', partTimes }` ; puis `syncQueue.push('simulation.completed')` et `syncQueue.push('exam_day.completed')`. Mise à jour `cases.confidence/status` comme en entraînement.

## 6. Design du Bereitschaftsindex

### 6.1 Formule (affichée telle quelle au candidat)

```
BI = 0,5 · S + 0,25 · C + 0,25 · L          (0..100, arrondi)

S  Simulationen  — moyenne de tes scores pondérés sur les 3 parties de l'examen (Anamnese,
                   Dokumentation, Fallvorstellung ; une Aufklärung compte dans l'Anamnese).
                   Chaque simulation pèse : Prüfungstag 3 · Autonome 2 · Assisté 1,
                   × 1 si < 30 j, × 0,5 si 30–90 j, × 0,25 au-delà.
                   Une partie jamais jouée vaut 0 (affichée « — nicht getestet »).
C  Abdeckung     — part des spécialités de ton plan (pondérée par leur fréquence dans les
                   protocoles) où tu as au moins une simulation Autonome ou Prüfungstag ≥ 60 %.
                   Affiché : « N des M spécialités de ton plan ; les protocoles en comptent 16 ».
L  Sprachkurve   — moyenne de ta grille de langue (officialPct) sur tes 5 dernières
                   parties orales, +5 si la tendance monte, −5 si elle descend
                   (moins de 3 parties orales : L plafonne à 30).

Plafond : sans Prüfungstag avec simulant réussi dans les 30 derniers jours, BI ≤ 79.
         (affiché avec la date : « valable jusqu'au JJ.MM » ou « fais un Prüfungstag avec simulant »)
```

Verdicts (inchangés) : ≥ 80 Prêt · ≥ 65 Presque prêt · ≥ 40 En route · sinon Pas encore.

### 6.2 Définitions précises (pour l'implémentation et les tests)

- **Poids d'une partie** `w = wSource × wRecency` avec `wSource = 3 | 2 | 1` selon `sim.context === 'pruefungstag' && sim.withSimulant !== false` → 3 ; sinon `sim.assistance === 'autonome'` → 2 ; sinon 1. `wRecency` par `now − sim.date` : `< 30 j → 1`, `< 90 j → 0,5`, sinon `0,25`.
- **Score d'une partie** : `weightedPartScore(res, { assistance, layer })` existant (`lib/scoring.ts`), pour rester cohérent avec la confiance des cas.
- **S** : par axe `a ∈ {Anamnese, Dokumentation, Fallvorstellung}` : `axis[a] = Σ(w·score)/Σw` ou `null` si aucune partie. Le pool `Anamnese` contient les parties `anamnese` (poids `w`) **et** `aufklaerung` (poids `w × 0,5`, sous-partie courte notée dans l'Anamnese à l'examen). `eff[a] = axis[a] ?? 0` — un axe jamais joué vaut **0** dans la formule et s'affiche « — nicht getestet · compte 0 jusqu'à ta première simulation » (décision `pedagogy` : aucun point sans preuve ; l'implémentation actuelle de `computeReadiness`, `min(score ?? 0, 30)`, donne déjà 0 malgré son commentaire) ; `S = mean(eff)` sur 3 axes.
- **C** : `spec(c)` = spécialité du cas ; `F(s) = Σ frequency` des cas de la spécialité **dans le plan courant** (cas visibles) ; couverte si ∃ sim sur un cas de `s` avec `context==='pruefungstag' || assistance==='autonome'` et `simulationPassed(sim)`. `C = 100 · Σ_{s couverte} F(s) / Σ_s F(s)`. Si le plan n'expose aucune sim possible sur une spécialité, elle n'entre pas au dénominateur — et la page affiche **les deux nombres et la liste hors plan** : « N des M spécialités de ton plan ; les protocoles en comptent 16 ; hors plan : Dermatologie, Infektiologie, … ». Fait vérifié : les 12 cas Free couvrent 8 spécialités sur 16 (`seedCases.ts`, `tier: 1`). `c.outsidePlan` = spécialités présentes dans `cases` mais absentes de `visibleCases`.
- **L** : parties orales = `anamnese`, `fallvorstellung`, `aufklaerung` avec `languageGrid` défini, triées par `sim.date` ; `last5` ; `L0 = mean(officialPct)` ; tendance = `mean(3 dernières) − mean(3 premières)` sur les 5 (si 5 disponibles) : `> +5 → +5`, `< −5 → −5`, sinon 0 ; `L = clamp(L0 + tendance, 0, 100)` ; si `< 3` parties : `L = min(L, 30)`.
- **Plafond** : `hasRecentPassedExamDay = ∃ sim (context==='pruefungstag' ∧ withSimulant === true ∧ passed ∧ now − date < 30 j)` ; sinon `BI = min(BI, 79)`. `capExpiresAt` = `date + 30 j` du Prüfungstag qualifiant le plus récent (ou `null`) — affiché sur la page, **jamais notifié**.
- **Levier** : `leverage` = la composante (S, C ou L) dont la marge pondérée `poids × (100 − valeur)` est la plus grande — affichée en Free (c'est une explication du chiffre, pas le plan).
- Les simulations de démo (`sim-demo-*`) sont exclues.

### 6.3 Réutilisation / extension de `computeReadiness`

- `computeReadiness` (6 axes, verdict, recommandations) **reste** : il alimente `HomePage` et `StatsPage` sans changement. Il déménage dans `lib/readiness/index.ts`.
- `lib/readiness/bereitschaft.ts` expose `computeBereitschaftsindex(input: ReadinessInput, now = Date.now()): Bereitschaft` avec :

```ts
interface ReadinessInput { sims: Simulation[]; cases: Case[]; visibleCases: Case[] }
interface Bereitschaft {
  value: number;                       // BI 0..100
  verdict: Readiness['verdict'];
  capped: 'none' | 'no_recent_exam_day';
  capExpiresAt: number | null;         // epoch ms ; null si plafonné
  leverage: 's' | 'c' | 'l';           // composante à plus grande marge pondérée (Free)
  s: { value: number; byAxis: { axis: 'Anamnese' | 'Dokumentation' | 'Fallvorstellung'; score: number; tested: boolean }[]; weights: { pruefungstag: 3; autonome: 2; assiste: 1 } };
  c: { value: number; covered: Specialty[]; missing: { specialty: Specialty; share: number }[]; outsidePlan: Specialty[]; denominator: number; corpusTotal: number };
  l: { value: number; base: number; trend: -5 | 0 | 5; samples: number };
  explain: string[];                   // les 4 phrases de §6.1, avec les valeurs du candidat
  actions: ReadinessAction[];          // Pro — §7
}
interface ReadinessAction { kind: 'exam_day' | 'cover_specialty' | 'axis' | 'language'; label: string; gain: number; target?: string }
```

- `actions` est **toujours calculé** (pur), l'affichage est gaté (§7). Chaque action a un `gain` = BI recalculé avec l'hypothèse « action réussie à 70 % » − BI actuel, arrondi ; tri décroissant ; 3 à 5 actions. L'hypothèse « réussie à 70 % » est **affichée** à côté de chaque gain en Pro (un chiffre sans hypothèse est une promesse).
- Le calcul du gain simule sur des copies de l'entrée (pas de mutation).

## 7. Free vs Pro

| Affichage | Free | Pro / Premium |
|---|---|---|
| Mode Prüfungstag | illimité (sur les cas du tier) | illimité |
| BI (chiffre + verdict + plafond expliqué avec sa date d'expiration) | oui | oui |
| Les 3 composantes S, C, L avec leur phrase | oui | oui |
| Spécialités couvertes / manquantes (noms) + spécialités hors plan (noms) | oui (listes) | oui |
| Levier principal (« ta plus grande marge : Abdeckung ») | oui | oui |
| **Plan d'actions chiffré** (« +6 si tu couvres Neurologie ≥ 60 % », hypothèse 70 % affichée) | non — carte « Voir comment progresser » vers `/pricing` | oui |
| **Historique** de l'indice (courbe par semaine) | non | oui |
| **Projection** à la date d'examen (`ProgramConfig.examDate` si présent) | non | oui |

- Gate : `useEntitlements().has('readiness.plan')` — feature à ajouter à la matrice (§13, via `arch`). Aucun `plan === 'pro'` dans le code.
- Le fallback Free n'invente pas de chiffre (« tu pourrais gagner jusqu'à +X ») : il dit ce que le plan contient, sans le chiffre. Relu par `pedagogy` (avis §2) — **quatre conditions** : (1) le Free voit le levier principal (explication du chiffre, pas le plan) ; (2) la carte nomme exactement les trois éléments Pro (plan chiffré, historique, projection) — pas de « jusqu'à +X », pas de compte à rebours, pas de couleur d'alerte, jamais sur l'écran de résultat d'un Prüfungstag ; (3) titre « Voir comment progresser » (pas « atteindre 80 ») ; (4) en Pro, l'hypothèse « réussie à 70 % » figure à côté de chaque gain.
- **Aucune relance** : pas de notification, e-mail, badge ni compteur lié au plafond ou à la fréquence des Prüfungstage ; la date d'expiration n'existe que sur la page.
- Les recommandations gratuites de `computeReadiness` (accueil) restent gratuites.
- Persuasion : la page ne masque rien qui soit nécessaire pour comprendre le chiffre. Un Free qui veut recalculer son indice à la main le peut.

## 8. Événement `exam_day.completed` (besoin ; contrat par `arch`)

- **Pourquoi** un événement distinct de `simulation.completed` : le serveur a besoin d'un résumé stable et petit pour la conversion (Free ayant fait ≥ 1 Prüfungstag), la future ligue (#9, points validés serveur) et l'analytics de fidélité (temps consommé par partie), sans dépendre du payload complet d'une `Simulation` (Bogen, texte d'Arztbrief).
- **Payload souhaité** (`subject_id` = `caseId`) :

```json
{
  "simulationId": "sim-…", "caseId": "…", "specialty": "Kardiologie", "land": "BW", "muster": "Stuttgart",
  "withSimulant": true,
  "startedAt": "ISO", "endedAt": "ISO",
  "parts": {
    "anamnese":        { "score": 71, "contentPct": 68, "officialPct": 76, "durationSec": 1200, "passed": true },
    "dokumentation":   { "score": 58, "contentPct": 55, "officialPct": 0,  "durationSec": 1200, "passed": false },
    "fallvorstellung": { "score": 66, "contentPct": 60, "officialPct": 72, "durationSec": 1140, "passed": true },
    "aufklaerung":     null
  },
  "passed": false,
  "bereitschaft": { "before": 61, "after": 64, "capped": "none" },
  "appVersion": "…"
}
```

- Besoins côté `arch` : ajouter `'exam_day.completed'` à la contrainte CHECK de `progress_events.type` (migration sur la base vivante, `psql`), au type `ProgressEventType`, à `sync-protocol.md` (« synchronisé »), et à `openapi.yaml` si le type y est énuméré. Pas de projection Dexie (D1). Idempotence : `id` uuid client comme les autres.

## 9. Composants

Nouveaux fichiers (tous < 500 lignes) :

| Fichier | Rôle |
|---|---|
| `lib/readiness/index.ts` | ancien `readiness.ts` (API inchangée) + re-export de `bereitschaft` |
| `lib/readiness/bereitschaft.ts` | `computeBereitschaftsindex`, helpers purs (`sourceWeight`, `recencyWeight`, `coverage`, `languageCurve`, `actions`) |
| `lib/readiness/bereitschaft.test.ts` | tests §11 |
| `features/simulation/examDayPlan.ts` | `EXAM_DAY_PLAN['BW']`, constantes de durées, types `ExamDayPhase` |
| `features/simulation/examDayPick.ts` | tirage du cas (pur, injectable `rng`) |
| `features/simulation/examDayClock.ts` | hook horloge murale (`useExamDayClock`) |
| `features/simulation/examDaySetup.tsx` | écran setup (règles, QR, bouton départ) |
| `features/simulation/examDayRunner.tsx` | déroulé P1→P3, verrouillage, transitions ; réutilise `AnamneseBogen`, `ImmersiveMode`, zone Arztbrief |
| `features/simulation/examDayEvaluation.tsx` | enchaîne `PartEvaluation` |
| `features/simulation/examDayResult.tsx` | résultat + BI avant/après + CTA |
| `features/readiness/ReadinessPage.tsx` | page `/bereitschaft` : chiffre, verdict, composantes, `Gate feature="readiness.plan"` |
| `features/readiness/ReadinessCard.tsx` | carte compacte pour l'accueil (insertion via §13) |
| `features/readiness/ReadinessPlan.tsx` | plan d'actions, historique, projection (Pro) |

Point d'entrée dans `SimulationRunner.tsx` (seule modification autorisée, ≤ 5 lignes) : si `searchParams.get('modus') === 'pruefungstag'` → `return <ExamDayRunner caseId={caseId} />` avant tout état du Runner entraînement.

## 10. Erreurs et cas limites

| Cas | Comportement |
|---|---|
| Aucun cas éligible au tirage (tous joués < 14 j) | on relâche la contrainte des 14 j ; si toujours aucun (plan vide) : message et retour au Hub |
| Simulant jamais connecté | on joue quand même ; `withSimulant:false` ; badge « joué sans simulant » sur le résultat |
| Horloge système reculée pendant l'examen | `remaining` recalculé ; si `now < startedAt`, la partie est considérée échue (jamais de temps gagné) |
| Onglet fermé pendant P2, rouvert 3 h plus tard | toutes les parties échues → évaluation proposée, temps enregistrés à 1200 ; si > 24 h → purge |
| Deux Prüfungstage en parallèle (deux onglets) | un seul snapshot `useSimSession` : le second onglet reprend le premier |
| Sync hors-ligne | `syncQueue.push` ne bloque jamais ; l'écran de résultat ne dépend pas du réseau |
| Utilisateur anonyme | tout fonctionne en local ; migration à la connexion via `migrateLocalProgress` (les sims `context:'pruefungstag'` sont des sims réelles → migrées) |
| `visibleCases` vide (contenu pas encore chargé) | BI non calculé : état « chargement », jamais 0 affiché |
| Free avec 12 cas | C calculé sur les 8 spécialités des 12 cas ; phrase à deux nombres (« N des 8 spécialités de ton plan ; les protocoles en comptent 16 ») + liste hors plan |
| Prüfungstag solo réussi (`withSimulant:false`) | poids 2 dans S ; ne lève pas le plafond ; bandeau explicite sur le résultat |

## 11. Tests

Unitaires (Vitest, purs) :
- `bereitschaft.test.ts` : poids source/récence ; S sur 3 axes avec axe non testé = 0 et Aufklärung dans le pool Anamnese (× 0,5) ; C avec spécialités partielles, dénominateur du plan et `outsidePlan` ; L avec < 3, 3, 5 échantillons et tendance ± ; plafond 79 levé seulement par `withSimulant:true` + `capExpiresAt` ; `leverage` ; exclusion `sim-demo-*` ; `actions` triées et gain non négatif ; idempotence (deux appels, même entrée, même sortie).
- `examDayPick.test.ts` : exclusion < 14 j, pondération par fréquence (rng injecté), tier du plan.
- `examDayClock.test.ts` : `remaining` depuis `startedAt` avec `now` injecté ; horloge reculée → échu.

Navigateur (`playwright-cli` headless, session `-s=pruefungstag`, port 5102, mesure **depuis le DOM de l'app**) :
- Setup → départ → le cas n'apparaît nulle part dans le DOM candidat avant le top ; après, seulement nom/âge/motif.
- P1 : aucun élément `[data-guide]`, `[data-muster]`, `.autolink` dans le DOM ; Bogen éditable.
- Forcer `startedAt` à `now − 1200 s` via l'UI de test (`?debugClock`, dev uniquement) → bandeau « Zeit ist um », Bogen `readonly`.
- Fin → 3 grilles → résultat avec BI avant/après ; `db.simulations` contient `context:'pruefungstag'` ; `outbox` contient deux événements.
- `/bereitschaft` en Free : composantes visibles, plan absent, carte pricing présente ; en Pro (compte `pruefungstag-pro@test.dev`) : plan visible.

## 12. Critères d'acceptation

| id | Critère | Vérification |
|---|---|---|
| CA-1 | Un Prüfungstag dure exactement 3 × 20:00 min de jeu (+ transitions ≤ 60 s chacune) ; chaque partie se termine seule à 0:00 sans action du candidat. | test horloge + sonde DOM |
| CA-2 | Pendant un Prüfungstag, le DOM candidat ne contient aucun guide, Muster, Redewendung, pastille, AutoLink, glossaire, fiche patient ni checklist avant la fin. | sonde DOM (sélecteurs listés §11) |
| CA-3 | Le cas est tiré au sort pondéré par fréquence, jamais un cas joué < 14 j (sauf plan épuisé), dans le tier du plan ; le candidat ne voit que nom, âge, motif au départ. | test `examDayPick` + sonde |
| CA-4 | Quitter la page ou geler l'onglet ne suspend pas le chrono ; la barre « reprendre » ramène à la partie en cours. | sonde (navigation puis retour) |
| CA-5 | L'évaluation enchaîne les 3 parties (+ Aufklärung si jouée) avec les grilles existantes ; verdict « Bestanden » ssi chaque partie ≥ 60 %. | test + sonde |
| CA-6 | Une `Simulation` `context:'pruefungstag'` est écrite dans Dexie et deux événements (`simulation.completed`, `exam_day.completed`) sont enfilés, le second avec le payload §8. | sonde Dexie/outbox |
| CA-7 | `computeBereitschaftsindex` applique la formule §6.1 à l'unité près sur les jeux de données de test (S sur 3 axes, axe non testé = 0, C, L, plafond 79). | Vitest |
| CA-8 | La page `/bereitschaft` affiche le chiffre, le verdict, les 3 composantes, les 4 phrases d'explication avec les valeurs du candidat, le levier principal, les deux nombres de couverture et la liste hors plan ; un axe non testé s'affiche « — », jamais « 0 % » — pour tous les plans. | sonde Free |
| CA-9 | Le plan d'actions, l'historique et la projection ne sont rendus que si `has('readiness.plan')` ; le fallback Free ne contient aucun chiffre de gain. | sonde Free / Pro |
| CA-10 | Chaque action Pro affiche un gain ≥ 0 égal à `BI(hypothèse) − BI(actuel)` ; les actions sont triées par gain décroissant. | Vitest |
| CA-11 | Sans Prüfungstag **avec simulant** réussi < 30 j, BI ≤ 79 et la raison est affichée ; avec, le plafond est levé et la date d'expiration est affichée ; un Prüfungstag solo réussi ne le lève pas. | Vitest + sonde |
| CA-12 | `computeReadiness` conserve sa signature et ses résultats (tests existants verts) ; `HomePage`/`StatsPage` inchangés. | `npm test`, CI |
| CA-13 | Les durées affichées portent la mention « BW » ; aucune durée codée en dur hors `examDayPlan.ts`. | grep en CI (`check*.mjs` à étendre par `build`) |
| CA-14 | Hors-ligne, un Prüfungstag complet (setup → résultat) fonctionne sans erreur réseau visible. | sonde réseau coupé |
| CA-15 | Abandon : rien n'est écrit dans `simulations` ni `outbox`. | sonde |
| CA-16 | L'écran de résultat montre le débrief (items manqués par partie, critère de langue le plus bas, temps consommé, une action gratuite) **avant** le BI ; aucune carte pricing n'y figure, quel que soit le plan. | sonde Free / Pro |
| CA-17 | Aucune notification, e-mail, badge ou compteur n'est déclenché par le plafond, son expiration ou l'absence de Prüfungstag (grep : aucun appel `Notification`, `push`, `mail` dans `features/readiness/` et `examDay*`). | grep en CI |

## 13. Impacts sur l'existant — propositions de contrat (hors mon périmètre)

| Cible | Propriétaire | Proposition |
|---|---|---|
| `app/src/db/types.ts` — `Simulation` | `arch` | `context?: 'training' \| 'pruefungstag'` ; `withSimulant?: boolean` ; `examDay?: { startedAt: number; endedAt: number; land: 'BW'; partTimes: Partial<Record<Part, number>> }` (optionnels, rétrocompat). |
| `progress_events` CHECK + `ProgressEventType` + `sync-protocol.md` + `openapi.yaml` | `arch` | ajouter `exam_day.completed` (§8). |
| `docs/contracts/entitlements.md` + `supabase/seed.sql` | `arch` | feature `readiness.plan` : Free —, Pro ∞, Premium ∞. |
| `app/src/main.tsx` | `plan`/`build` (hors périmètre V1 de #2) | 2 routes : `simulation/pruefungstag` → `ExamDaySetup`, `bereitschaft` → `ReadinessPage`. |
| `HomePage.tsx`, `SimulationHub.tsx`, nav | idem | une ligne : `<ReadinessCard />` ; bouton « Prüfungstag » dans le Hub. |
| `usePatientSync` | `arch` (canal) | message `exam-phase` (`'anamnese' \| 'dokumentation' \| 'fallvorstellung'`) pour basculer la fiche simulant ; à défaut, réutiliser `guide-chapter`. |
| `check*.mjs` | `build` | grep « 20 * 60 » hors `examDayPlan.ts` interdit. |
| `SEED_VERSION` | — | non concerné (pas de contenu). |

## 14. Vocabulaire — propositions pour `CONTEXT.md`

- **Prüfungstag** — simulation en conditions d'examen : cas tiré au sort, 20/20/20 min réelles, aucune aide, évaluation en fin. Une `Simulation` avec `context:'pruefungstag'`.
- **Bereitschaftsindex** (compléter la ligne existante) — indice 0–100 : `0,5·S + 0,25·C + 0,25·L`, plafond 79 sans Prüfungstag réussi < 30 j. **S** Simulationen, **C** Abdeckung (couverture des spécialités), **L** Sprachkurve.
- **Fin dure** — arrêt d'une partie à 0:00 sans prolongation possible.
- **Plan vers 80** — liste d'actions chiffrées (Pro) qui augmentent le Bereitschaftsindex.
- **withSimulant** — un Prüfungstag joué avec un simulant connecté (poids 3, lève le plafond) ou sans (**Prüfungstag solo** : poids 2, ne lève pas le plafond).
- **Débrief** — sur l'écran de résultat, avant le chiffre : items manqués, critère de langue le plus bas, temps consommé, une action gratuite.

## 15. Risques

| Risque | Mitigation |
|---|---|
| L'indice paraît « faux » à un candidat fort qui n'a fait que de l'Assisté | le plafond 79 et la phrase « fais un Prüfungstag » rendent la cause visible ; c'est voulu |
| Le Free se sent puni par C (12 cas) | dénominateur = spécialités du plan, affiché ; veto pédagogique demandé |
| Sur mobile, 60 minutes d'onglet actif → mise en veille | horloge murale (D3) ; conseil « désactive la mise en veille » dans le setup |
| Le simulant ne sait pas quand basculer de fiche | message `exam-phase` (§13) ; à défaut bandeau sur la fiche « quand le candidat te présente le cas, passe en examinateur » |
| Régression du Runner entraînement | modification limitée à un early-return de ≤ 5 lignes ; tests existants |
| Le mode entraînement dit 12 min pour la Fallvorstellung, le Prüfungstag 20 | hors périmètre confirmé par `pedagogy` ; recommandation (ticket) : 15 min de Fallvorstellung + le « Drill des termes du cas » existant comme Fachbegriffe-Liste de 5 min (sources : Freiburg l.1378, Stuttgart l.1449/l.3964) |
| Un Free finit par connaître ses 12 cas → indice gonflé par la familiarité | exclusion < 14 j, tirage par fréquence ; la phrase C à deux nombres rappelle que l'examen tire dans 16 spécialités ; pas d'autre mitigation dans ce périmètre |
| La détection « simulant connecté » est peu fiable → plafond punitif par accident | à tester par `build` (CA-11) ; si le canal est instable, `pedagogy` accepte un bouton « j'ai un simulant » déclaratif au setup plutôt qu'une détection silencieuse |

## 16. Self-review

- Placeholders : aucun (`…` uniquement dans les exemples de payload).
- Contradictions : la seule identifiée (12 vs 20 min) est hors périmètre et signalée. Un axe non testé vaut 0 dans les deux indices (§6.2 ; `computeReadiness` le fait déjà malgré son commentaire) ; l'écart entre les deux est le nombre d'axes (3 vs 6) et les poids — documenté, `computeReadiness` inchangé pour ne pas modifier l'accueil.
- Périmètre : tout ce qui sort des quatre dossiers est en §13 comme proposition, pas comme modification. Deux routes et une carte d'accueil sont indispensables au produit : sans elles, la feature n'est pas atteignable — décision attendue de `lead` (extension de périmètre minimale ou ticket dédié).
- Ambiguïtés levées : « sans assistance » (liste exhaustive §5.3) ; « fin du temps » (fin dure, §5.2) ; « courbe de langue » (définie §6.2) ; « Free vs Pro » (tableau §7).
- Faits d'examen : chacun est sourcé (§5.2) ; les choix de design sont étiquetés comme tels.

## 17. Red-team (trous fermés / reportés)

| Attaque | Fermé ? | Comment |
|---|---|---|
| Ouvrir la fiche patient dans un second onglet pendant le Prüfungstag | reporté | impossible à empêcher côté client ; le résultat porte `withSimulant` et l'utilisateur ne triche que lui-même ; le serveur ne valide rien ici (ligue #9 tranchera) |
| Refaire un Prüfungstag jusqu'à tomber sur un cas connu | fermé partiellement | exclusion < 14 j ; tirage par fréquence ; le résumé serveur garde `caseId` (détection possible plus tard) |
| Régler l'horloge du système | fermé | temps reculé = échu ; temps avancé = fin plus tôt (jamais de gain) |
| Coup de pouce via ImmersiveMode (pastilles) | fermé | `tipDefault` forcé à `false` et pastilles non montées en `context:'pruefungstag'` |
| Free contourne le gate `readiness.plan` en lisant `actions` dans Dexie | reporté | les actions sont calculées client (D9) ; un Free motivé peut les lire dans la console — acceptable : ce n'est pas une donnée serveur, et l'honnêteté prime |
| Un Prüfungstag « réussi » fabriqué en cochant tout | reporté | inhérent à l'auto-évaluation (comme en entraînement) ; l'IA (#4) et la ligue serveur (#9) réduiront l'incitation |
