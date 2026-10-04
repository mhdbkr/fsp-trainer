# Contrat — `Lauf` : l'automate d'une partie de simulation

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-simflow-serie3.md`.
> Dépend de : `docs/contracts/training-journal.md` (§8 sortie du journal).
> Consommé par : C2 (simulation), C3 (pont IA), C6 (harnais).
>
> **Amendé — série 4 (4 oct. 2026)** · `platform-architect` · ADR-0021.
> L'entrée est unique et la partie porte toujours les trois Teile. Le candidat
> peut s'arrêter avec « Terminer ici », ou partir sur un autre Teil. Un marqueur
> d'enchaînement s'ajoute, et le Muster passe à guidé ou libre : voir §10. La
> sentinelle « non saisi » (lot C6-A) est décrite au §1.1. Les sections
> amendées sont marquées *[S4]*.

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q5** | L'Arztbrief est-il une **étape du run** (obligatoire en Dokumentation) ou un **exercice séparé** lancé depuis le bilan ? | Étape **facultative** : l'état `arztbrief` n'est atteint que si le candidat le demande depuis `checkliste`. Sauter l'étape n'est jamais signalé comme un manque. |
| **Q6** | « Tout cocher » sur la checklist de fin est-il autorisé, et si oui comment est-il rendu visiblement comme **raccourci de saisie** et non comme un score offert ? | Le bouton **existe** (`toutCocher()`), il est neutre visuellement, placé au-dessus de la liste, et son action est annulable (`toutDecocher()`). Aucun libellé de félicitation. |
| **Q7** | Le périmètre de `motionSafe.test.ts:14-23` (qui exclut aujourd'hui `features/simulation`) doit-il être étendu ? | *[S4]* **Tranchée le 30 sept.** (s3-primitives T7, `motionSafe.test.ts:6-30`). Règle A, universelle : la garde globale de `index.css` remet durées et délais à zéro sous mouvement réduit. Règle B, locale : préfixe `motion-safe:` pour `components/visuals/*`. Le blocage de C2 est levé. `CaseDial` vit dans `components/visuals/` et suit la règle B. |

---

## 1. L'objet `Lauf` — une seule source de vérité

```ts
export type LaufZustand =
  | 'vorbereitung'   // pré-simulation
  | 'laufend'        // en cours, sur un Teil
  | 'bilanz'         // bilan de la partie qui vient d'être jouée
  | 'checkliste'     // checklist de fin
  | 'arztbrief'      // rédaction (facultative, Q5)
  | 'gespeichert';   // enregistré — état terminal

export type LaufModus = 'komplett' | 'teil';

export interface Lauf {
  id: string;                        // uuid v4, posé à l'entrée dans `laufend`
  caseId: CaseId;
  profileId: string;                 // TOUJOURS écrit (§6)
  modus: LaufModus;                  // l'INTENTION déclarée — [S4] toujours 'komplett' pour un Lauf neuf ; 'teil' lu seulement
  geplanteTeile: SimTeil[];          // l'intention : 3 Teile, ou 1 — [S4] toujours les 3 pour un Lauf neuf
  unterbrochen?: true;               // [S4] posé par `nimmWiederAuf` après une pause ≥ 5 min, jamais retiré (§3.1)
  zuletztAktiv?: number;             // [S4] epoch ms de la dernière persistance de `lauf.aktiv` (§3.1)
  zustand: LaufZustand;
  aktuellerTeil: SimTeil | null;     // null hors de `laufend`
  startedAt: number;
  endedAt?: number;

  // CHAMPS — pas des états parallèles
  teileGespielt: SimTeil[];          // le FAIT : Teile réellement terminés
  teile: Partial<Record<SimTeil, TeilLauf>>;
  checkliste: ChecklistItem[];       // UNE liste, portée par le Lauf (§4)
  minutenProTeil: Partial<Record<SimTeil, number>>;
  score: Partial<Record<SimTeil, number>>;
  notes: SketchNotes;
  bogen?: BogenNotes;
  arztbriefText?: string;
  assistance: AssistanceMode;
  layer: Layer;
  muster?: MusterArt;                // [S4] 'guide' | 'libre' ; les villes série 3 se lisent par `musterArt()` (§10.6)
  mode: SimulationMode;              // 'texte' | 'tts' | 'vocal' | 'external-ai'
  taskId?: string;                   // TaskInstance du plan, si lancé depuis le plan
}

export interface TeilLauf {
  done: boolean;
  durationSec: number;
  languageGrid?: LanguageGrid;       // [C6-A] chaque critère 0..5, ou NOT_ENTERED (−1) = non noté (§1.1)
  feeling: number;                   // [C6-A] 0..100, ou NOT_ENTERED (−1) = non saisi (§1.1)
  contentPct: number;
  officialPct: number;
  assistanceUsed: AssistanceMode;    // RENSEIGNÉ (corrige db/types.ts:451, jamais écrit)
  hints: number;                     // aides consultées (corrige AnamneseGuide.tsx:33)
}
```

### 1.1 *[C6-A]* La sentinelle « non saisi »

Source : `origin/feat/s3-c6a-chiffres`, `app/src/lib/scoring.ts:22-85`.

```ts
export const NOT_ENTERED = -1;
export const isEntered = (v: number | undefined | null): v is number => typeof v === 'number' && v >= 0;
export const emptyLanguageGrid = (): LanguageGrid   // les cinq critères à NOT_ENTERED
export const languageGridEntered = (g?: LanguageGrid): g is LanguageGrid  // les cinq critères saisis
export type ScoreBasis = 'contenu' | 'langue' | 'ressenti';
export function scoreBasis(p: PartResult): ScoreBasis[]   // 'contenu' toujours ; 'langue' si grille complète ; 'ressenti' si isEntered(feeling)
export function scoreBasisLabel(b: ScoreBasis[]): string  // « contenu seul », « contenu et ressenti »…
```

1. **Une valeur que le candidat n'a pas touchée vaut `NOT_ENTERED` (−1)**, pour
   `feeling` et pour chaque critère de `languageGrid`. Elle figure telle quelle
   dans `PartResult`, `Simulation.parts[t]` et le payload
   `simulation.completed`. Le serveur accepte ce payload sans schéma
   (`events/index.ts:14`). `0` reste une note.
2. **Le score ne porte que ce qui a été saisi.** `partScore` applique
   55/30/15 (oral) ou 80/20 (Dokumentation), **renormalisés** sur
   `scoreBasis(p)`. La langue n'entre que si les cinq critères sont saisis.
   Quand tout est saisi, on retrouve la formule historique **au point près**.
3. **L'historique n'est pas recalculé.** Une partie enregistrée avant C6-A
   porte de vraies valeurs (3, 50…). Elle est lue comme saisie, et son score
   ne bouge pas.
4. Le bilan affiche la base : « Calculé sur : contenu seul », via
   `scoreBasisLabel`.
5. **Aucune moyenne, aucun seuil ni aucun agrégat ne lit une valeur `−1`.**
   Tout lecteur de `feeling` ou de `languageGrid` hors de `scoring.ts` passe
   par `isEntered` / `languageGridEntered`. Exemple, sur la branche :
   `buildCorrections` (`simulationSave.ts:48`, `isEntered(v) && v <= 2`).
   Gardé par **INV-29**.


**Règle de modèle.** `checkliste`, `teileGespielt`, `minutenProTeil` et `score`
sont des **champs du `Lauf`**. Aucun composant n'en tient une copie locale.
Un `useState` qui reconstruit l'un de ces quatre est un défaut de contrat.

---

## 2. L'automate

```
vorbereitung ──démarrer(teil)──▶ laufend(teil)
laufend(t) ──terminerPartie()──▶ bilanz(t)
bilanz(t) ──partieSuivante()──▶ laufend(t+1)        [s'il reste un Teil planifié]
bilanz(t) ──versChecklist()──▶ checkliste            [sinon]
checkliste ──arztbriefSchreiben()──▶ arztbrief       [facultatif, Q5 ; seulement si la Dokumentation n'a pas été jouée]
checkliste ──zurueckZumBilanz()──▶ bilanz(dernier Teil joué)   [action régressive nommée]
checkliste ──speichern()──▶ gespeichert
arztbrief ──speichern()──▶ gespeichert

[S4]
laufend(t0) ──springeZu(t)──▶ laufend(t)            [aucun SimTeil terminé ; t ∈ geplanteTeile, t ≠ t0 ; exception nommée nº 4]
bilanz(t) ──partieSuivante(t'?)──▶ laufend(t')       [t' ∈ geplanteTeile \ teileGespielt ; défaut : naechsterTeil]
bilanz(t) ──versChecklist()──▶ checkliste            [« Terminer ici » : permis dès UN Teil joué, quel que soit le reste]
```

### 2.1 Règles opposables

1. **Aucune transition ne va vers un état antérieur.** L'ordre est
   `vorbereitung < laufend < bilanz < checkliste < arztbrief < gespeichert`.
   Une transition dont la cible est d'index inférieur ou égal est **refusée**
   par la fonction de transition (elle retourne le `Lauf` inchangé).
   Exception unique et nommée : `partieSuivante()`, `bilanz(t) → laufend(t+1)`,
   autorisée **seulement** s'il reste un Teil de `geplanteTeile` non joué. C'est
   une progression dans le run, pas un retour dans l'état.
2. **« Revenir » est une action nommée.** Deux transitions régressives, et
   deux seulement : `zurueckZurPartie()`, depuis `bilanz` seulement, vers
   `laufend(t)` avec `t = aktuellerTeil` ; et `zurueckZumBilanz()`, depuis
   `checkliste` seulement, vers le `bilanz` de la **dernière** partie jouée, la
   checklist conservée. Toutes deux sont déclenchées par un geste explicite,
   jamais par un effet de bord. Toute autre régression est un bug.
   *(Amendé à l'intégration, série 3.)*
3. **`terminerPartie()` n'a qu'une destination : `bilanz`.** Le bug racine
   (`SimulationRunner.tsx:189-190`, `if (idx < flow.length - 1)`) disparaît :
   il n'existe plus de branche qui, en Teil seul, ne fait rien et réaffiche
   l'exercice terminé.
4. **`versChecklist()` et `zurueckZurPartie()` ont des destinations
   distinctes.** Deux boutons, deux destinations (corrige
   `PartEvaluation.tsx:116-119`, où « Valider » et « Retour » menaient tous
   deux à `setPhase('play')`).
5. **La sortie de `laufend` arrête le chrono du Teil.** Entrer dans
   `laufend(t+1)` démarre un chrono **neuf**. `zurueckZurPartie()` reprend le
   chrono **là où il s'était arrêté**, jamais à zéro, jamais en double
   (corrige `useTimer.ts:13-20` relancé par l'effet `SimulationRunner.tsx:438`).
6. **Chaque transition remonte le `<main>` en haut** (corrige l'absence de
   `scrollTo`, audit §1.2(e)).
7. **La branche Aufklärung ne sort jamais du périmètre.** `setActive('anamnese')`
   en dur (`SimulationRunner.tsx:187`) est supprimé : une Aufklärung jouée est
   un Teil du `Lauf` comme un autre, et l'automate revient au Teil courant de
   `geplanteTeile`, jamais à `'anamnese'`. Une Aufklärung **au plus** par
   `Lauf` ; elle ne compte pas comme « Teil joué » (§3.1).
8. **On ne quitte pas une partie en cours d'un seul clic.** *(Amendé à
   l'intégration, série 3 — décision de la direction.)* Pendant `laufend`,
   l'en-tête n'offre que « Terminer la partie ». « Terminer la simulation »
   est rendu dans l'en-tête collant **en `bilanz` seulement**, une seule fois
   à l'écran (« zéro doublon »), et passe toujours par l'automate :
   `bilanz → versChecklist → checkliste → [arztbriefSchreiben → arztbrief] →
   speichern → gespeichert`. `speichern` hors de `checkliste`/`arztbrief` est
   refusé, et l'appelant n'écrit rien quand il est refusé. `gespeichert` est
   posé dans l'état avant l'écriture. La vue ne décide rien : elle demande à
   l'automate ce qui est permis (`erlaubt`, `simulationBeendbar`).

### 2.2 URL et historique

Chaque état a une URL distincte :

```
/simulation/:caseId/pre?teil=        vorbereitung   [S4] → ?depart=<teil>&task=<id> ; `?teil=` lu comme `?depart=`
/simulation/:laufId/teil/:teil       laufend
/simulation/:laufId/bilan/:teil      bilanz
/simulation/:laufId/checklist        checkliste
/simulation/:laufId/arztbrief        arztbrief
/simulation/:laufId/resultat         gespeichert
```

- **Il existe désormais une route de bilan** : le bilan n'est plus un état local
  du runner (audit §0).
- `gespeichert` est une URL **rechargeable** : elle relit le `Lauf` enregistré.
  Un `reload` sur `/resultat` ne réaffiche jamais un runner vierge
  (corrige audit §1.3).
- Le « ← Retour » du Shell depuis `gespeichert` ne ramène **pas** à `/pre` : il
  ramène au point d'entrée (programme ou hub).

---

## 3. Persistance et reprise

### 3.1 En vol

- Le `Lauf` complet est persisté **à chaque transition** et à chaque
  modification d'un de ses champs, dans `db.meta['lauf.aktiv']`.
  `sessionStorage` (`fsp.simSession`) n'est plus la source : il ne survit ni au
  rafraîchissement d'onglet fermé, ni à un changement d'appareil.
- Ce qui était **non couvert** par `SessionSnapshot` et l'est désormais, parce
  que ce sont des champs du `Lauf` : le brouillon d'évaluation (`grid`,
  `feeling`), la `checkliste` cochée pendant le jeu, les `hints`.
- **Reprise** : à l'ouverture de l'app, s'il existe un `lauf.aktiv` dont
  `zustand !== 'gespeichert'`, une barre de reprise propose de rouvrir son URL.
  Le `Lauf` est restitué **à l'identique**, `zustand` compris.
- **Abandon** — un `Lauf` actif de plus de 24 h, un changement de mode ou de
  cas avec une partie en cours, et le ✕ de la barre de reprise suivent la même
  règle : le `Lauf` est écrit tel quel en `gespeichert` s'il a au moins un des
  **trois** Teile joué (l'Aufklärung seule ne compte pas), sinon supprimé. La
  reprise exige le même cas **et** le même mode. L'abandon ne lève jamais : un
  cas disparu (perte de droits) est remplacé par un cas minimal, et un `Lauf`
  de forme invalide est écarté à la lecture — ses éléments illisibles retirés,
  jamais la partie jouée. La barre de reprise lit `lauf.aktiv`.
  *(Amendé à l'intégration, série 3.)*
- *[S4]* **Point d'entrée unique de l'interruption** (m7) :
  `nimmWiederAuf(lauf, jetzt): Lauf` (`lib/lauf/automat.ts`). Il est appelé
  par la **seule** branche de reprise de `useLauf`, `useLauf.ts:90-95` :
  restitution depuis `lauf.aktiv` par la barre, au rechargement, ou au retour
  sur le runner. Il pose `unterbrochen: true` si
  `jetzt − zuletztAktiv ≥ REPRISE_TOLERANZ_MIN` (5 min), et ne fait rien
  d'autre. Une reprise plus courte (incident technique) ne casse pas
  l'enchaînement (réserve INV-73). `speichereAktivenLauf` met à jour
  `zuletztAktiv` à chaque persistance. Un `Lauf` sans `zuletztAktiv` (série 3)
  repris est `unterbrochen`. La marque n'est jamais retirée.
- La reprise exige le même cas. Un `Lauf` neuf est toujours `komplett`, et
  un `lauf.aktiv` série 3 en `teil` se reprend tel quel jusqu'à son écriture.

### 3.2 À la fin — écriture idempotente

```ts
speichern(lauf: Lauf): Promise<void>
  // 1. db.simulations.put({ ...projection(lauf), id: lauf.id })
  // 2. syncQueue.push({ type: 'simulation.completed', subject_id: lauf.id, payload })
  // 3. journal: TrainingEvent id = `te-${lauf.id}`
  // 4. db.meta.delete('lauf.aktiv')
```

- **`id` = `lauf.id`, uuid v4 posé une seule fois** à l'entrée dans `laufend`.
  Le `sim-${Date.now()}` de `simulationSave.ts:44` est supprimé : deux clics
  rapprochés produisaient deux enregistrements — ou l'écrasement du premier par
  un second partiel.
- `put` sur la même clé ⇒ **une seule ligne**, quel que soit le nombre d'appels.
- `subject_id` de l'événement = `lauf.id` ⇒ le serveur déduplique déjà par
  `id` d'événement, et la projection est stable.
- `TrainingEvent.id` déterministe ⇒ un second `speichern()` ne crée pas un
  second événement de journal.
- `passed` n'est plus recalculé à la main (`simulationSave.ts:52`) : il vient de
  `simulationPassed()` (`scoring.ts:77-81`). Une seule source.
- `speichern()` **n'écrit plus dans `db.cases`** : `confidence`, `status`,
  `layerProgress` ne sont plus touchés (`training-journal.md` §4.1). Le saut de
  couche sur un Teil raté (`simulationSave.ts:72`) disparaît avec l'écriture.
- *[S4]* La projection vers `Simulation` change sur quatre points :
  - `date = lauf.startedAt` : le jour d'une partie est celui de son début, y
    compris à cheval sur minuit ou après une reprise le lendemain (m5).
    **Prérequis (m-h)** : `feat/s3-c6b-jour` (lot C6-B) est mergée, ce qui
    pose `startedAt` par `now()` de `lib/clock` et non par `Date.now()` ;
  - `enchaine = true` si et seulement si `enchainiert(lauf)` (§10.4), sinon
    le champ est absent ;
  - `reihenfolge` = `teileGespielt` limité aux `SimTeil`, dans l'ordre joué
    (sert aux conditions d'examen, `training-journal.md` §2.3) ;
  - `dauerGesamtSec` = Σ `sekundenProTeil`, **tous** les Teile commencés, y
    compris un Teil abandonné par `springeZu` ou « Terminer ici », et
    l'Aufklärung. `TrainingEvent.spentMin` s'en dérive (m6).

---

## 4. Le modèle de checklist — ids stables et rapprochables

### 4.1 Le problème de modèle

Deux espaces d'identifiants disjoints : chapitres d'anamnèse à ids sémantiques
(`aktuell`, `vegetativ`…) contre `ChecklistItem.id` **positionnels** produits par
un compteur de module (`checklists.ts:9-15`, `uid` remis à 0/100/200/300).
Conséquence mesurée : ce qui est coché pendant la partie ne peut pas remonter,
et aucune analyse longitudinale (« ce critère, tu le rates toujours ») n'est
possible (audit §2, dette 8.9).

### 4.2 Le trancher

```ts
export interface ChecklistItem {
  id: ChecklistItemId;     // SÉMANTIQUE et STABLE — jamais un compteur
  label: string;
  checked: boolean;
  axisWeight?: number;
  kapitel?: KapitelId;     // rapprochement avec le guide d'anamnèse
}
```

Règles :

1. `ChecklistItem.id` est une **constante littérale écrite dans le source**.
   Aucun compteur, aucune fonction, aucun index. Le validateur CI le vérifie.
2. Préfixe par Teil : `anam-`, `doku-`, `fall-`, `aufk-`.
3. `kapitel` est renseigné **uniquement** quand le critère correspond à un
   chapitre de la trame d'anamnèse. C'est le seul pont entre les deux espaces ;
   il est explicite, pas déduit.
4. Cocher un chapitre dans `AnamneseGuide` coche l'item de checklist dont
   `kapitel` vaut ce chapitre, sur le `Lauf`. `AnamneseGuide` n'a plus d'état
   `checked` local (`AnamneseGuide.tsx:32`) : il lit et écrit `lauf.checkliste`.
5. `checklistFor(teil)` retourne la liste **modèle** ; `Lauf.checkliste` en est
   l'instance vivante, créée à `démarrer()` et jamais reconstruite ensuite.
   `PartEvaluation` reçoit `lauf.checkliste` en propriété — il n'appelle plus
   `checklistFor` (corrige `PartEvaluation.tsx:16`).

### 4.3 Mapping — Anamnese (13 items, ordre inchangé)

| Ancien | Nouveau | `kapitel` |
|---|---|---|
| `cl-0` | `anam-eroeffnung` | `eroeffnung` |
| `cl-1` | `anam-personalia` | `personalia` |
| `cl-2` | `anam-aktuell-opqrst` | `aktuell` |
| `cl-3` | `anam-vegetativ` | `vegetativ` |
| `cl-4` | `anam-vorerkrankungen` | `vorerkrankungen` |
| `cl-5` | `anam-medikamente` | `medikamente` |
| `cl-6` | `anam-allergien` | `allergien` |
| `cl-7` | `anam-noxen` | `noxen` |
| `cl-8` | `anam-familie-sozial` | `familie-sozial` |
| `cl-9` | `anam-register` | — |
| `cl-10` | `anam-empathie` | — |
| `cl-11` | `anam-gespraechskontrolle` | — |
| `cl-12` | `anam-verdachtsdiagnose` | `abschluss` |

Dokumentation `cl-100…cl-110` → `doku-…`, Fallvorstellung `cl-200…cl-210` →
`fall-…`, Aufklärung `cl-300…cl-308` → `aufk-…` : mêmes règles, `kapitel`
absent (ces Teile n'ont pas la trame d'anamnèse pour référentiel). Les libellés
et l'ordre de `checklists.ts:17-83` sont repris **inchangés** ; seuls les ids
changent.

### 4.4 Compatibilité avec l'existant

Lecture des `Simulation` déjà enregistrées : un `ChecklistItem.id` qui
correspond à `/^cl-\d+$/` est traduit **à la lecture** par la table positionnelle
ci-dessus (l'ordre des listes est figé depuis l'origine, la traduction est
totale et sans perte). Aucune réécriture de `db.simulations`. La table de
traduction vit dans `lib/checklists.legacy.ts` et est couverte par un test qui
vérifie que les 44 anciens ids ont exactement une image.

---

## 5. Portée déclarée ≠ portée jouée

```ts
// INTENTION
lauf.modus         // 'komplett' | 'teil'
lauf.geplanteTeile // ['anamnese','dokumentation','fallvorstellung'] | [t]

// FAIT
lauf.teileGespielt // Teile dont teile[t].done === true
```

```ts
export function istVollstaendig(lauf: Lauf): boolean {
  return lauf.geplanteTeile.every(t => lauf.teileGespielt.includes(t))
      && lauf.geplanteTeile.length === 3;
}
```

- **Le mis-classement disparaît** : `isFullSimulation` (`simScope.ts:19-23`)
  retournait `true` dès `scope === 'full'`, **avant** de compter les parties. Un
  run complet abandonné après une partie était compté « simulation complète »
  (`StatsPage.tsx:44`). La classification se fait désormais sur le fait, jamais
  sur l'intention.
- Lecture de l'historique : `scope` absent ⇒ `geplanteTeile` dérivés du nombre
  de `parts.done` (≥ 2 ⇒ complète, sinon Teil seul) — l'heuristique de
  rétrocompat (`simScope.ts:22`) est conservée **pour la lecture seule**.
- `TrainingEvent.teile` (`training-journal.md` §1.1) reçoit `teileGespielt`,
  jamais `geplanteTeile`.
- `stats.ts:12-26` (`axisScores`) pondère un Teil isolé comme un Teil de run
  complet : le contrat n'impose rien ici, mais le calcul doit lire
  `teileGespielt` et non `scope` (dette 8.10, à traiter dans le même lot).

---

## 6. `profileId`

- `Lauf.profileId` est **obligatoire** et posé à la création, depuis le profil
  actif choisi en pré-simulation (`SimulationSetup.tsx:177-203`).
- `speichern()` l'écrit dans `Simulation.profileId` et dans
  `TrainingEvent.profileId`.
- Lecture de l'historique : `profileId` absent ⇒ profil par défaut (le premier
  de `db.meta['profiles']`). `layerAdvice.ts:40`, qui filtre déjà dessus, cesse
  de rendre un ensemble vide.
- Index Dexie ajouté : `simulations: 'id, caseId, date, role, profileId, teil'`.
  Le filtrage par profil cesse de se faire en mémoire après `toArray()`.

---

## 7. Invariants — propriétés testables

| Id | Propriété |
|---|---|
| **INV-20** | Pour toute suite de transitions, `indice(zustand)` est non décroissant, sauf par `zurueckZurPartie()` ou `zurueckZumBilanz()`. |
| **INV-21** | `terminerPartie()` depuis `laufend(t)` mène à `bilanz(t)`, pour tout `t`, y compris quand `geplanteTeile.length === 1` et quand `t` est le dernier. |
| **INV-22** | `speichern(lauf)` appelée n fois (n ≥ 1) produit **une** ligne dans `db.simulations` et **un** `TrainingEvent`. |
| **INV-23** | Un `Lauf` sérialisé puis restauré est structurellement égal à l'original, `zustand`, `checkliste`, chronos et brouillon d'évaluation compris. |
| **INV-24** | Un item coché dans `AnamneseGuide` est coché dans `lauf.checkliste` : il n'existe aucun chemin où la checklist de `checkliste` est vierge alors que des chapitres ont été cochés. |
| **INV-25** | `istVollstaendig(lauf) === true` ⇒ `teileGespielt.length === 3`. |
| **INV-26** | Tout `Lauf` écrit a un `profileId` non vide **ou absent** (aucun compte actif) — jamais une valeur fabriquée comme `'local'`. |
| **INV-27** | Aucun `ChecklistItem.id` produit par le source ne correspond à `/^cl-\d+$/` ; la table de traduction legacy couvre les 44 anciens ids. |
| **INV-28** | Le chrono total d'un `Lauf` est monotone croissant : aucun aller-retour `bilanz → laufend → bilanz` ne le fait décroître ni doubler. |
| **INV-29** *[C6-A]* | **Aucune moyenne ne lit une valeur `−1`.** Pour tout journal de parties où `feeling` et les critères de `languageGrid` valent `NOT_ENTERED` en tout ou partie, chaque agrégat (score de partie, moyennes et séries de `stats.ts`, `readiness`, `buildCorrections`, `case_progress`, maîtrise) est égal à celui calculé sur les seules valeurs saisies. Une partie entièrement saisie redonne la formule historique au point près. *Mutation qui doit rougir* : retirer un `isEntered` dans un lecteur (par exemple `v <= 2` nu dans `buildCorrections`, qui signale « Sprache verbessern » sur un critère non noté). |

**Modifiés *[S4]*.**
- **INV-21** : « Teil seul » désigne désormais un `Lauf` à trois Teile planifiés
  dont **un seul** est joué. `terminerPartie()` mène toujours à `bilanz(t)`.
- **INV-23** : l'égalité structurelle se lit **modulo `unterbrochen`**.
  `serialize ∘ deserialize` est l'identité stricte, et seule la *reprise* pose
  la marque (§3.1). Le test C6 (`parcours14j.test.ts:144`, `toEqual(l)`) est
  réécrit en conséquence.
- **INV-20** : `springeZu` (`laufend → laufend`, même indice) est la quatrième
  exception nommée à la règle 1. INV-20, qui interdit seulement les baisses
  d'indice, est inchangé.

### 7.1 Invariants série 4 — la partie

| Id | Propriété | Mutation qui doit rougir |
|---|---|---|
| **INV-70** | **Entrée unique** : tout `Lauf` créé par un client série 4 a `geplanteTeile` = les trois, dans l'ordre d'examen, et `modus = 'komplett'`. `?depart=t` (ou l'ancien `?teil=t`) ne change que le Teil de `demarrer`, jamais `geplanteTeile`. | `useLauf` relit `?teil=` comme périmètre (`useLauf.ts:100`) |
| **INV-71** | **« Terminer ici »** : depuis `bilanz(t)`, `versChecklist` est permis dès qu'un `SimTeil` est joué. La `Simulation` écrite a `parts` = `teileGespielt`, jamais `geplanteTeile`. | `versChecklist` refusé tant que `naechsterTeil(lauf) !== null` |
| **INV-72** | **Départ ailleurs** : `springeZu(t)` n'est permis que depuis `laufend(t0)`, avec `t0 ≠ 'aufklaerung'`, quand aucun `SimTeil` n'est encore joué, `t ≠ t0` et `t` non joué. `partieSuivante(t')` n'accepte que `t' ∈ geplanteTeile \ teileGespielt` ; en `bilanz('aufklaerung')` avec un `teilVorAufklaerung` non joué, il n'accepte que celui-ci. Un Teil n'est jamais joué deux fois dans un `Lauf`. Le chrono de `t0` est conservé (INV-28) et compté dans `dauerGesamtSec`. | `partieSuivante(t')` accepte un Teil déjà joué, ou saute le Teil interrompu par l'Aufklärung ; `springeZu` permis après un Teil terminé ou pendant une Aufklärung ; `dauerGesamtSec` = Σ des seuls Teile joués |
| **INV-73** | **Enchaînement réel** : `Simulation.enchaine === true` ⇔ les trois `SimTeil` ∈ `teileGespielt` ∧ `unterbrochen !== true` ∧ `mode !== 'external-ai'`. Seul `nimmWiederAuf` pose `unterbrochen`, et seulement si la pause mesure ≥ 5 min : une reprise de moins de 5 min ne casse pas l'enchaînement. | `enchaine = istVollstaendig(lauf)` seul ; `unterbrochen` posé à toute reprise (même de 30 s) ou remis à `undefined` ; un second chemin qui pose `unterbrochen` |
| **INV-74** | **Muster sans perte de notes** : pour tout `bogen` enregistré et tout `muster` (série 3 ou série 4), l'ensemble des valeurs non vides rendues par l'aperçu (`BogenPreview`) est **égal** à l'ensemble des valeurs non vides stockées. `musterArt(m)` est total sur `MusterCity ∪ MusterArt ∪ {undefined}`. | l'aperçu n'itère que `spec.fields` du nouveau Muster (`BogenPreview.tsx:33`) : une note `allergien` d'une simulation « Stuttgart » lue en « libre » disparaît |
| **INV-75** | **Le jour d'une partie est celui de son début** : `Simulation.date === lauf.startedAt`, donc `TrainingEvent.at` aussi, pour tout `Lauf` série 4, y compris à cheval sur minuit ou repris le lendemain. `TrainingEvent.spentMin = round(dauerGesamtSec / 60)`. | `date = now()` à l'écriture (`simulationSave.ts:57`) ; `spentMin` sur les seuls Teile joués |

---

## 8. Tests de contrat à écrire (C2 / C6)

| Fichier | Ce qu'il prouve |
|---|---|
| `app/src/lib/lauf/automat.test.ts` | INV-20, INV-21, INV-28 ; table de transitions exhaustive (6 états × toutes les actions) |
| `app/src/lib/lauf/speichern.test.ts` | INV-22, INV-26 (fake-indexeddb, double appel) |
| `app/src/lib/lauf/wiederaufnahme.test.ts` | INV-23 (sérialisation aller-retour sur `Lauf` généré) |
| `app/src/lib/checklists.stable.test.ts` | INV-27 + mapping legacy total |
| `app/src/lib/lauf/checklistBridge.test.ts` | INV-24 |
| `app/src/lib/simScope.test.ts` | INV-25 + non-régression du mis-classement `scope:'full'` à une partie |
| *[C6-A]* `app/src/lib/scoring.saisi.test.ts` (existe sur la branche) + `app/tests/invariants.sentinelle.test.ts` | INV-29 : parcours de tous les lecteurs de `feeling`/`languageGrid` sur un journal à valeurs `−1` |
| *[S4]* `app/src/lib/lauf/automat.test.ts` (étendu) | INV-70, INV-71, INV-72 ; table de transitions avec `springeZu` et `partieSuivante(t')` |
| *[S4]* `app/src/lib/lauf/enchaine.test.ts` | INV-73 : reprise par barre, par rechargement et par retour au runner, avec des pauses de 30 s, 4 min 59 s et 5 min |
| *[S4]* `app/src/lib/lauf/speichern.test.ts` (étendu) | INV-75 : partie commencée à 23 h 50, finie à 0 h 20 ; Teil abandonné |
| *[S4]* `app/src/lib/muster.legacy.test.ts` | INV-74 : 5 villes × bogens générés, et aperçu rendu |
| *[S4]* `app/tests/invariants.lauf.test.tsx` (C6 réécrit) | INV-20/21/28 avec `springeZu` dans les 500 suites aléatoires ; INV-23 modulo `unterbrochen` |

---

## 9. Contradictions relevées entre sources — non tranchées en silence

1. **Contrat de motion incohérent.** `motionSafe.test.ts:29-37` interdit toute
   classe `transition-*` / `animate-*` sans préfixe `motion-*`, mais son
   périmètre (`:14-23`) **exclut `features/simulation`** — et
   `SimulationRunner.tsx:238/245/250` échouerait s'il y était inclus. Ce contrat
   ne tranche pas : c'est le périmètre de C5 (catégorie E). **Blocage explicite**
   pour C2 : aucune transition nouvelle dans `features/simulation` avant
   réponse (Q7).
2. **Dette 8.1 — `lib/simulationStep.ts` est du code mort** (125 lignes, aucun
   import externe). Il décrit un automate concurrent de celui-ci. Il est
   **supprimé** par C2 dans le même lot, pour qu'il n'existe pas deux automates
   dans le dépôt. Ce n'est pas une décision produit.
3. **Le dossier d'analyse §3.2 écrit l'automate
   `préparation → en cours (Teil n) → bilan → checklist → [Arztbrief] →
   enregistré`** sans dire comment on passe du Teil n au Teil n+1 en run
   complet. **Tranché ici par l'architecture** (§2, règle 1, exception unique) :
   `bilanz(t) → laufend(t+1)` est une progression, pas un retour. Sans cette
   exception l'automate ne peut pas jouer trois Teile.
4. *[S4]* Registre unique des contradictions de la série 4 : ADR-0021,
   « Contradictions relevées ». Deux d'entre elles touchent ce contrat : Q7
   périmée (n° 10) et le Muster à double sens (n° 8). Une troisième relève du
   lot C6-A :
5. *[C6-A]* **`feeling` vaut 50 par défaut sur le chemin du `Lauf`.**
   `setzeEntwurf` (`automat.ts:144`, `feeling: 50`) et `bewerte`
   (`automat.ts:174`, `e?.feeling ?? 50`) donnent 50, et non `NOT_ENTERED`,
   à un ressenti jamais touché. `PartEvaluation.tsx:228` part bien de
   `NOT_ENTERED`. Sur `origin/feat/s3-c6a-chiffres`, le runner amorce le
   brouillon à `NOT_ENTERED`, **mais seulement s'il n'existe pas encore**
   (`SimulationRunner.tsx:189`, `sansBrouillon`). Or consulter un indice
   pendant l'Anamnese (`SimulationRunner.tsx:401`, `setzeEntwurfFeld('anamnese', { hinweise })`)
   crée ce brouillon **avant** le bilan, par `setzeEntwurf`, avec
   `feeling: 50`. L'amorce ne s'applique plus, et un ressenti jamais touché
   entre dans le score comme 50, contre §1.1.1. **Non vérifié en
   exécution** (lecture du code seulement). C'est le cas que la génération
   d'INV-29 doit couvrir. Correctif attendu : la valeur par défaut de
   `setzeEntwurf` et de `bewerte` devient `NOT_ENTERED`. **Pris en charge
   par le lot C6-A** (décision de `main`, m12, déjà dispatché). Ce contrat
   n'ajoute rien ; INV-29 garde le résultat.

---

## 10. *[S4]* La partie, le cas entier

> ADR-0021, décisions 1, 2, 5, 8 et 9.
>
> **Propriétaires (m-d)** : S4-3 possède `lib/lauf`, `features/simulation` et
> `lib/simulationSave.ts`. Les nouveaux champs de `db/types.ts` (`Lauf` mis à
> part, qui vit dans `lib/lauf/types.ts`) sont ajoutés par S4-1.

### 10.1 Entrée unique et pré-simulation

- `vorbereitung` n'offre **aucun choix de Teil** : `ModeChooser` et le paramètre
  `?teil=` comme périmètre disparaissent. Un seul bouton, « Démarrer ».
- **Ordre de l'écran, opposable** : (1) en-tête du cas avec `CaseDial` grand
  format et détail ouvert (`training-journal.md` §12.7) → (2) « Avec qui tu
  joues » (`PartnerCard`) → (3) niveau d'assistance → (4) Muster (§10.6).
- **La couche se fond dans le niveau d'assistance** (décision (d) de la
  direction, 4 oct.). Plus de bloc ni de mot « Couche » à l'écran. Le niveau
  est présélectionné par `layerAdvice` (`SimulationSetup.tsx:86`) ;
  `Lauf.layer` reste écrit, déduit de ce choix, pour l'historique et le
  scoring.
- `PartnerCard` et les textes d'aide dépendaient de `teil` (`SimulationSetup.tsx:150-204`) ;
  ils lisent désormais le Teil de **départ** (`?depart=`), ou l'Anamnese par
  défaut. Le pont IA reste restreint à `anamnese | fallvorstellung`
  (`ai-bridge.md`).

### 10.2 Transitions ajoutées ou étendues

1. **`springeZu(t)`**, exception nommée nº 4 à la règle 1 (§2.1), de
   `laufend` vers `laufend`. Elle est permise depuis `laufend(t0)` si et
   seulement si aucun `SimTeil` n'est encore dans `teileGespielt`,
   `t ∈ geplanteTeile` et `t ≠ t0`. C'est le fil d'étapes : « commencer par
   un autre Teil ». Le chrono de `t0` est conservé : il ne compte pas comme
   joué, mais il entre dans `dauerGesamtSec` (m6). Elle est refusée pendant
   une Aufklärung (`aktuellerTeil === 'aufklaerung'`).
2. **`partieSuivante(t'?)`** : `t'` est facultatif, et vaut par défaut
   `naechsterTeil(lauf)` (règle 7 inchangée après une Aufklärung). Il doit
   appartenir à `geplanteTeile \ teileGespielt`. Le fil d'étapes du bilan
   l'emploie pour choisir le Teil suivant. Après une Aufklärung
   (`bilanz('aufklaerung')`), si `teilVorAufklaerung` n'est pas joué, tout
   `t' ≠ teilVorAufklaerung` est **refusé** : on revient d'abord au Teil
   interrompu (règle 7, m6).
3. **« Continuer » / « Terminer ici »** sont les deux sorties de **chaque**
   `bilanz` : `partieSuivante` et `versChecklist`. La règle 8 reste en
   vigueur. La sortie est rendue une seule fois à l'écran, et son libellé
   devient « Terminer ici ». S'il ne reste aucun Teil, seule « Terminer ici »
   existe : elle est la seule transition permise, et la vue demande à
   `erlaubt`.

### 10.3 Routes et lancement depuis une tâche

**Routes réelles** (m7, `main.tsx:64-66`) : `/simulation` (hub),
`/simulation/:caseId/pre` (pré-simulation) et `/simulation/:caseId/run`
(runner, qui porte tous les états de `laufend` à `gespeichert`). Les URL par
état du §2.2 **ne sont pas implémentées**. Elles restent une cible, hors de
la série 4.

- `/simulation/:caseId/pre?task=<id>&depart=<t>` → « Démarrer » →
  `/simulation/:caseId/run?task=<id>&depart=<t>`.
- `depart` = premier Teil de `resteTache(task)` (`training-journal.md`
  §12.2), ou l'Anamnese. Il ne sert qu'à `demarrer(depart)`.
  **`depart` est lu une fois et n'entre pas dans les dépendances de l'effet
  de création** (`useLauf.ts:118`, aujourd'hui `[c?.id, teil]`). Un
  changement de `depart` ne recrée ni ne reprend le `Lauf`.
- `?teil=` (anciens liens) est lu comme `?depart=`.
- `geplanteTeile` reste à trois Teile (INV-70). `taskId` suit la règle
  R-C4, à titre informatif (`training-journal.md` §12.3).
- Toute tâche de cas, `revision` comprise, se lance ainsi (m8).

### 10.4 Le marqueur d'enchaînement

```ts
export const enchainiert = (lauf: Lauf): boolean =>
  (['anamnese', 'dokumentation', 'fallvorstellung'] as SimTeil[]).every((t) => lauf.teileGespielt.includes(t))
  && lauf.unterbrochen !== true
  && lauf.mode !== 'external-ai';
```

- « D'un trait » = les trois Teile dans **une même partie**, sans reprise de
  plus de 5 min. `enchaine` ne contraint pas l'ordre. Les **conditions
  d'examen** (décision (b)) — enchaîné, Autonome, ordre A → D → F, grilles
  saisies — sont une définition distincte, unique et partagée
  (`conditionsExamen`, `training-journal.md` §2.3). Elle fonde `prêt` et le
  classement `examen-blanc`. Une tâche `dUnTrait` n'exige qu'`enchaine`. Une
  Aufklärung intercalée ne l'interrompt pas : le jury peut l'appeler à tout
  moment. `zurueckZurPartie` et `zurueckZumBilanz` ne l'interrompent pas non
  plus : ce sont des gestes dans la partie.
- **Interruption** = une reprise depuis la persistance après une pause
  ≥ `REPRISE_TOLERANZ_MIN` (§3.1, `nimmWiederAuf`).
- `speichern` écrit `Simulation.enchaine = true` seulement si
  `enchainiert(lauf)` (§3.2). `TrainingEvent.enchaine` s'en dérive
  (`training-journal.md` §2.3). L'état `prêt` du cas se dérive de
  `examen` (§12.6, INV-56).

### 10.5 Écran de fin de partie

`gespeichert` affiche le `CaseDial` du cas avec
`vientDEtreJoue = teileGespielt ∩ SimTeil` (`training-journal.md` §12.7).
Ce Teil n'est plus annoncé comme un résultat isolé.

### 10.6 Muster guidé / libre

**Ce qui change** : `MusterCity` (`'Standard' | 'Freiburg' | 'Karlsruhe' |
'Reutlingen' | 'Stuttgart'`, `db/types.ts:65`) devient

```ts
export type MusterArt = 'guide' | 'libre';
/** Lecture tolérante, totale (INV-74). */
export const musterArt = (m: MusterArt | MusterCity | undefined | null): MusterArt =>
  m === 'libre' ? 'libre'
  : m === 'guide' || m === 'Standard' || m == null ? 'guide'
  : 'libre';                                        // Freiburg, Karlsruhe, Reutlingen, Stuttgart
```

- **Guidé** : toutes les rubriques de l'anamnèse, avec un champ par rubrique.
  Ses clés **incluent toutes les clés** du `Standard` actuel (`personalia`,
  `hauptbeschwerde`, `vegetativ`, `vorerkrankungen`, `sozial`, `familie`,
  `allergien`, `impfung`, `noxen.*`, `frauen`), plus `medikamente`. La liste
  exacte est un contenu, au pôle Expérience. Contrat : pas de clé `Standard`
  retirée.
- **Libre** : les rubriques d'identité (`personalia`), puis un grand champ de
  rédaction libre, à la clé **nouvelle** `freitext`.
- Les villes sont rangées en « libre » : leur forme réelle est « données de
  fond + Bericht » (`musterBogen.ts:56-86`).

**Inventaire de ce qui lit `MusterCity` / `muster` / `bogen`** (vérifié par
`grep` sur `app/src`, `app/supabase`, `app/scripts`) :

| Lecteur | Ce qu'il lit | Migration |
|---|---|---|
| `data/guides/musterBogen.ts:36-88` (`MUSTER_BOGEN`, `MUSTER_CITIES`) | specs par ville | remplacés par deux specs `guide` / `libre`. Les cinq specs de ville sont **conservées en lecture seule** (`MUSTER_BOGEN_LEGACY`), pour leurs libellés. |
| `data/guides/musterModels.ts`, `components/MusterModelPicker.tsx` | regroupement par forme, sélecteur à cinq villes | remplacés par un choix à deux options |
| `store/ui.ts:55,124-125` (`localStorage['fsp-muster']`) | réglage par défaut | lu par `musterArt()`, et réécrit en `guide`/`libre` au premier `setMuster` |
| `features/simulation/AnamneseBogen.tsx:25` | `MUSTER_BOGEN[muster]` pour la saisie | spec de `musterArt(lauf.muster)`. Une clé déjà saisie absente du nouveau spec reste éditable dans une rubrique « Autres notes ». |
| `features/simulation/ImmersiveMode.tsx:115-120` | champ de note courant | idem. Le repli `hauptbeschwerde` existe en guidé, `freitext` en libre. |
| `components/BogenPreview.tsx:15,33` (Dokumentation, Fallvorstellung) | itère **`spec.fields` seulement** | **doit** rendre toute clé non vide de `bogen`, libellée par le spec courant, sinon par `MUSTER_BOGEN_LEGACY`, sinon par la clé elle-même (INV-74). C'est le seul vrai risque de perte (d'affichage). |
| `ArztbriefGuide.tsx:22,35`, `VorstellungGuide.tsx:21,51`, `SimulationRunner.tsx:365,386,472,494` | transmettent `muster` à `BogenPreview` | type `MusterArt`. Aucune autre logique. |
| `lib/lauf/{types,automat,speichern}.ts`, `lib/simulationSave.ts:31,72`, `store/simSession.ts:33,124` | stockent `muster`/`bogen` tels quels | type `MusterArt`. `bogen` inchangé (`Record<string,string>`). |
| `db/types.ts:505` `Simulation.muster` | historique | **jamais réécrit**. Il est lu par `musterArt()`. |
| sync `simulation.completed` | payload sans schéma serveur (`events/index.ts`) | aucune migration. Un client série 3 qui lit `'guide'`/`'libre'` indexe `MUSTER_BOGEN[m]` → `undefined` (**plantage d'affichage possible** chez un client non mis à jour, lecture seule de l'historique). Accepté : deux comptes, une seule app déployée. |
| scoring (`scoring.ts`), Arztbrief IA, `case_progress` | **ne lisent pas** `muster` ni `bogen` | — |
| `data/caseMuster.ts` (`musterSaetze`) | **autre notion** : phrases modèles d'Arztbrief/Fallvorstellung | non concerné (ADR-0021, contradiction 8) |
| `content_items.kind = 'muster'` (`20260915000004_content.sql:9`) | contenu `caseMuster` publié | non concerné |

**Aucune perte de notes** : `bogen` n'est jamais réécrit, aucune clé n'est
renommée, et l'aperçu rend toutes les clés non vides (INV-74).

### 10.7 Annonce unique des changements rétroactifs

Décision (f) de la direction, 4 oct. Trois changements sont annoncés **une
fois** dans l'app, au premier lancement après S4-1 (Teile) ou S4-3 (mode et
Muster), par un encart neutre et fermable :

- des Teile solides redevenus acquis, qui reviennent donc dans le plan ;
- un `teil-first` explicite devenu cas complet ;
- un Muster de ville par défaut devenu « libre ».

Chaque annonce est tracée par une clé locale `db.meta['annonce.s4.<sujet>']`.
**Décidé** (`main`, 4 oct.) : l'annonce est faite une fois **par appareil**,
sans événement synchronisé, ce qui suffit pour deux utilisateurs. C'est la
résolution de m9.
