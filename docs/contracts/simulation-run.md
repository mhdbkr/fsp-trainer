# Contrat — `Lauf` : l'automate d'une partie de simulation

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-simflow-serie3.md`.
> Dépend de : `docs/contracts/training-journal.md` (§8 sortie du journal).
> Consommé par : C2 (simulation), C3 (pont IA), C6 (harnais).

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q5** | L'Arztbrief est-il une **étape du run** (obligatoire en Dokumentation) ou un **exercice séparé** lancé depuis le bilan ? | Étape **facultative** : l'état `arztbrief` n'est atteint que si le candidat le demande depuis `checkliste`. Sauter l'étape n'est jamais signalé comme un manque. |
| **Q6** | « Tout cocher » sur la checklist de fin est-il autorisé, et si oui comment est-il rendu visiblement comme **raccourci de saisie** et non comme un score offert ? | Le bouton **existe** (`toutCocher()`), il est neutre visuellement, placé au-dessus de la liste, et son action est annulable (`toutDecocher()`). Aucun libellé de félicitation. |
| **Q7** | Le périmètre de `motionSafe.test.ts:14-23` (qui exclut aujourd'hui `features/simulation`) doit-il être étendu ? | **Non tranché ici** — contrat de la catégorie E (C5). Aucune transition nouvelle n'est ajoutée à `features/simulation` tant que Q7 n'est pas répondue. Contradiction relevée au §8. |

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
  modus: LaufModus;                  // l'INTENTION déclarée
  geplanteTeile: SimTeil[];          // l'intention : 3 Teile, ou 1
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
  muster?: MusterCity;
  mode: SimulationMode;              // 'texte' | 'tts' | 'vocal' | 'external-ai'
  taskId?: string;                   // TaskInstance du plan, si lancé depuis le plan
}

export interface TeilLauf {
  done: boolean;
  durationSec: number;
  languageGrid?: LanguageGrid;
  feeling: number;
  contentPct: number;
  officialPct: number;
  assistanceUsed: AssistanceMode;    // RENSEIGNÉ (corrige db/types.ts:451, jamais écrit)
  hints: number;                     // aides consultées (corrige AnamneseGuide.tsx:33)
}
```

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
checkliste ──arztbriefSchreiben()──▶ arztbrief       [facultatif, Q5]
checkliste ──speichern()──▶ gespeichert
arztbrief ──speichern()──▶ gespeichert
```

### 2.1 Règles opposables

1. **Aucune transition ne va vers un état antérieur.** L'ordre est
   `vorbereitung < laufend < bilanz < checkliste < arztbrief < gespeichert`.
   Une transition dont la cible est d'index inférieur ou égal est **refusée**
   par la fonction de transition (elle retourne le `Lauf` inchangé).
   Exception unique et nommée : `partieSuivante()`, `bilanz(t) → laufend(t+1)`,
   autorisée **seulement** s'il reste un Teil de `geplanteTeile` non joué. C'est
   une progression dans le run, pas un retour dans l'état.
2. **« Revenir » est une action nommée.** `zurueckZurPartie()` est la seule
   transition régressive autorisée, disponible **depuis `bilanz` seulement**,
   vers `laufend(t)` avec `t = aktuellerTeil`. Elle est déclenchée par un geste
   explicite, jamais par un effet de bord. Toute autre régression est un bug.
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
   `geplanteTeile`, jamais à `'anamnese'`.
8. **L'action de sortie est toujours atteignable.** Le bouton
   `versChecklist()` est rendu dans l'en-tête collant, visible dans `bilanz`
   comme dans `laufend` dès que `teileGespielt.length ≥ 1` (corrige
   `SimulationRunner.tsx:397-401`, rendu en bas de page et jamais pendant
   l'évaluation).

### 2.2 URL et historique

Chaque état a une URL distincte :

```
/simulation/:caseId/pre?teil=        vorbereitung
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
- Un `Lauf` actif de plus de 24 h est abandonné : il est écrit tel quel en
  `gespeichert` s'il a au moins un Teil `done`, sinon supprimé.

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
| **INV-20** | Pour toute suite de transitions, `indice(zustand)` est non décroissant, sauf par `zurueckZurPartie()`. |
| **INV-21** | `terminerPartie()` depuis `laufend(t)` mène à `bilanz(t)`, pour tout `t`, y compris quand `geplanteTeile.length === 1` et quand `t` est le dernier. |
| **INV-22** | `speichern(lauf)` appelée n fois (n ≥ 1) produit **une** ligne dans `db.simulations` et **un** `TrainingEvent`. |
| **INV-23** | Un `Lauf` sérialisé puis restauré est structurellement égal à l'original, `zustand`, `checkliste`, chronos et brouillon d'évaluation compris. |
| **INV-24** | Un item coché dans `AnamneseGuide` est coché dans `lauf.checkliste` : il n'existe aucun chemin où la checklist de `checkliste` est vierge alors que des chapitres ont été cochés. |
| **INV-25** | `istVollstaendig(lauf) === true` ⇒ `teileGespielt.length === 3`. |
| **INV-26** | Tout `Lauf` écrit a un `profileId` non vide. |
| **INV-27** | Aucun `ChecklistItem.id` produit par le source ne correspond à `/^cl-\d+$/` ; la table de traduction legacy couvre les 44 anciens ids. |
| **INV-28** | Le chrono total d'un `Lauf` est monotone croissant : aucun aller-retour `bilanz → laufend → bilanz` ne le fait décroître ni doubler. |

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
