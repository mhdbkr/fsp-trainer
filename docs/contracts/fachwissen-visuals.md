# Contrat — Fachwissen visuel (sous-projet #7, epic #8)

> **BROUILLON — sous réserve du gate G2.** Rédigé en parallèle du spec
> `docs/superpowers/specs/2026-09-16-fachwissen-visuals-design.md` (absent au
> moment de l'écriture). Si le spec validé diverge, le spec gagne et ce contrat
> est amendé par `arch-fachwissen-visuals` avant l'étape 4.
>
> Vérité partagée entre `spec`, `plan`, `build` et `review`. Un implémenteur qui
> a besoin d'autre chose propose un amendement ici, il ne contourne pas.

## 0. Portée et principes

- **Un système, pas des illustrations** (PRODUCT-VISION §innovation 10) : sept
  composants génériques pilotés par une spec typée par pathologie. Aucune
  donnée clinique dans le code des composants ; tout vient de la spec.
- **Le texte se décharge, il n'est pas supprimé** : un visuel *replie* la
  section textuelle qu'il couvre ; `seedFachwissen.ts` n'est jamais modifié par
  ce pipeline.
- **Hors-ligne d'abord, simple** : import statique, pas de table, pas de RLS,
  pas de sync. Le tier d'un visuel est celui de sa fiche (rien à publier).
- **Spec absente = page inchangée.** Les 131 fiches sans spec se rendent
  exactement comme aujourd'hui.
- Tout texte affiché à l'apprenant est en **allemand** (titres de blocs,
  libellés, hotspots). Les identifiants et commentaires sont en anglais/français.

## 1. Schéma — `FachwissenVisualSpec`

Fichier de types : `app/src/data/fachwissenVisuals/types.ts` (source de vérité
TypeScript ; le validateur `.mjs` en est la copie mécanique, voir §5).

```ts
export const VISUAL_SCHEMA_VERSION = 1 as const;

export type Tone = 'neutral' | 'accent' | 'signal' | 'warn';
// neutral = ink/slate · accent = pétrole (brand) · signal = coral (rare, un
// point de bascule) · warn = ambre (atypique, Vorsicht). Pas de cinquième tone.

export type FachwissenSectionRef =
  | 'klinik' | 'diagnostik' | 'therapie' | 'klassifikation'
  | 'differenzialdiagnosen' | 'redFlags' | 'aetiologie'
  | 'risikofaktoren' | 'prognose';

export type VisualKind =
  | 'anatomy-map' | 'decision-tree' | 'syndrome-map' | 'timeline'
  | 'compare-table' | 'therapy-toggles' | 'score-gauge';

export interface Placement {
  /** Ordre croissant dans la colonne ; deux blocs ne partagent pas un ordre. */
  order: number;
  /** 'main' = colonne 2/3 (sections) ; 'side' = colonne latérale (red flags…). */
  column: 'main' | 'side';
}

interface BlockBase<K extends VisualKind, D> {
  /** Unique dans la spec ; kebab-case ; préfixé par le kind (ex. `tree-ap`). */
  id: string;
  kind: K;
  /** Titre affiché (allemand). */
  title: string;
  /** Section textuelle repliée par ce bloc (§3). Absent = le bloc s'ajoute. */
  replaces?: FachwissenSectionRef;
  placement: Placement;
  data: D;
}

export type VisualBlock =
  | BlockBase<'anatomy-map', AnatomyMapData>
  | BlockBase<'decision-tree', DecisionTreeData>
  | BlockBase<'syndrome-map', SyndromeMapData>
  | BlockBase<'timeline', TimelineData>
  | BlockBase<'compare-table', CompareTableData>
  | BlockBase<'therapy-toggles', TherapyTogglesData>
  | BlockBase<'score-gauge', ScoreGaugeData>;

export interface FachwissenVisualSpec {
  fachwissenId: string;          // doit exister dans seedFachwissen.ts
  version: typeof VISUAL_SCHEMA_VERSION;
  blocks: VisualBlock[];         // ≥ 1
}
```

### 1.1 `anatomy-map` — silhouette cliquable

```ts
export const ANATOMY_REGIONS = [
  'head', 'neck', 'jaw', 'chest', 'retrosternal', 'left-arm', 'right-arm',
  'epigastrium', 'right-upper-quadrant', 'left-upper-quadrant', 'periumbilical',
  'right-lower-quadrant', 'left-lower-quadrant', 'flank-left', 'flank-right',
  'back', 'lumbar', 'pelvis', 'left-leg', 'right-leg', 'hands', 'feet', 'skin',
] as const;
export type AnatomyRegion = (typeof ANATOMY_REGIONS)[number];

export interface AnatomyHotspot {
  region: AnatomyRegion;
  label: string;   // court, allemand (« Ausstrahlung linker Arm »)
  text: string;    // phrase clinique complète (allemand)
  tone?: Tone;     // défaut 'accent'
}
export interface AnatomyMapData {
  view: 'front' | 'back';
  hotspots: AnatomyHotspot[];  // ≥ 1 ; une région au plus une fois par vue
}
```

L'enum de régions est **fermé** : ajouter une région = amendement de ce contrat
+ nouveau path SVG dans le composant. Une région inconnue fait échouer le
validateur (§5), elle n'est pas ignorée silencieusement.

### 1.2 `decision-tree` — arbre décisionnel

```ts
export interface DecisionNode {
  id: string;                 // unique dans le bloc
  question: string;           // allemand ; vide interdit
  answers: DecisionEdge[];    // ≥ 2
}
export interface DecisionEdge {
  label: string;              // « ja », « nein », « Troponin↑ »
  /** Exactement l'un des deux. */
  next?: string;              // id d'un DecisionNode
  leaf?: DecisionLeaf;
}
export interface DecisionLeaf {
  label: string;              // conclusion (« ACS → Notfall »)
  text?: string;              // justification / conduite
  tone?: Tone;                // défaut 'neutral'
}
export interface DecisionTreeData {
  root: string;               // id du nœud racine
  nodes: DecisionNode[];      // graphe acyclique, tous atteignables depuis root
}
```

### 1.3 `syndrome-map` — mindmap de syndrome

```ts
export interface SyndromeLeaf { label: string; text?: string; tone?: Tone }
export interface SyndromeBranch {
  label: string;              // « Leberhautzeichen », « Portale Hypertension »
  tone?: Tone;
  leaves: SyndromeLeaf[];     // ≥ 1
}
export interface SyndromeMapData {
  center: { label: string; text?: string };
  branches: SyndromeBranch[]; // 2 à 8
}
```

### 1.4 `timeline` — frise

```ts
export interface TimelineStep {
  at: string;                 // libellé de position, libre : « 0–10 min », « Woche 2 »
  label: string;
  text?: string;
  tone?: Tone;
}
export interface TimelineData {
  orientation?: 'horizontal' | 'vertical';  // défaut 'horizontal', vertical < 640 px
  steps: TimelineStep[];      // ≥ 2, ordre = ordre du tableau
}
```

### 1.5 `compare-table` — tableau comparatif

```ts
export interface CompareTableData {
  /** Première colonne = critère (en-tête de ligne). */
  columns: { key: string; label: string; tone?: Tone }[];   // ≥ 2
  rows: {
    criterion: string;
    cells: Record<string, string>;   // clé = columns[].key ; toutes les clés présentes
    emphasis?: string;               // key de la colonne à mettre en avant
  }[];                                // ≥ 1
}
```

### 1.6 `therapy-toggles` — sections de thérapie commutables

```ts
export interface TherapyOption {
  key: string;
  label: string;              // même vocabulaire que TherapieSektion.label
  items: string[];            // ≥ 1
  akut?: boolean;             // rendu tone 'signal' + icône alerte, comme la fiche
}
export interface TherapyTogglesData {
  options: TherapyOption[];   // 2 à 6
  defaultKey?: string;        // défaut : première option ; l'option akut si présente
}
```

### 1.7 `score-gauge` — jauge de score

```ts
export interface ScoreBand { from: number; to: number; label: string; tone: Tone }
export interface ScoreGaugeData {
  name: string;               // « CURB-65 », « Child-Pugh »
  min: number;
  max: number;                // > min
  bands: ScoreBand[];         // couvrent [min, max] sans trou ni chevauchement
  items?: { label: string; points: number; text?: string }[];  // critères
  unit?: string;              // « Punkte » par défaut
}
```

### 1.8 Exemple minimal (fw-khk, extrait)

```ts
import type { FachwissenVisualSpec } from './types';
export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-khk', version: 1,
  blocks: [{
    id: 'anatomy-ap', kind: 'anatomy-map', title: 'Schmerzlokalisation und Ausstrahlung',
    replaces: 'klinik', placement: { order: 10, column: 'main' },
    data: { view: 'front', hotspots: [
      { region: 'retrosternal', label: 'Retrosternales Druck-/Engegefühl',
        text: 'Retrosternales Druck-/Engegefühl, belastungsabhängig, Besserung in Ruhe/auf Nitro' },
      { region: 'left-arm', label: 'Ausstrahlung linker Arm',
        text: 'Ausstrahlung in linken Arm, Hals, Unterkiefer, Epigastrium' },
    ] },
  }],
};
```

## 2. Contrat de rendu

- **Registre** `app/src/components/visuals/registry.ts` :
  `Record<VisualKind, React.ComponentType<VisualBlockProps>>`. La page ne
  connaît que le registre ; ajouter un kind = une entrée + un type `data`.
- **Bloc inconnu** (kind absent du registre, spec plus récente que le client) :
  ignoré au rendu, `console.warn('[visuals] unknown kind', kind, blockId)` en
  dev uniquement (`import.meta.env.DEV`). Jamais d'erreur bloquante.
- **Spec absente** : `getVisualSpec(id)` renvoie `undefined`, la page rend
  exactement le DOM actuel. Test de contrat : snapshot de `fw-pankreatitis`
  (sans spec) identique avant/après.
- **Validation d'exécution** : aucune. La validation est mécanique en CI (§5)
  ; le rendu fait confiance à la spec. Un `data` malformé qui a passé la CI est
  un bug du validateur, pas du composant.
- **Aucune donnée clinique dans les composants** : pas de chaîne allemande
  codée en dur hors libellés d'interface génériques (« Text anzeigen »,
  « Text ausblenden », « ja »/« nein » ne sont PAS génériques : ils viennent de
  la spec).
- **Liens glossaire** : les textes des blocs passent par `<AutoLink>` comme les
  sections existantes ; `onOpenGlossary` est fourni par la page.

## 3. Déchargement du texte — règles

1. Un bloc avec `replaces: S` **replie** la section `S` de la fiche : la
   section est rendue dans un `<details>` fermé (`open` = false par défaut),
   sommaire « Text anzeigen » (ouvert : « Text ausblenden »), placée
   immédiatement sous le bloc visuel. L'état ouvert/fermé n'est pas persisté.
2. Une section repliée reste dans le DOM (recherche, AutoLink, lecteurs
   d'écran) ; rien n'est retiré de `seedFachwissen.ts`.
3. Au plus **un** bloc par `FachwissenSectionRef` dans une spec.
4. **Invariant de couverture** : chaque item textuel de la section repliée doit
   être couvert par le bloc. Un item est couvert si sa forme normalisée
   (minuscules, accents et ponctuation retirés, espaces réduits) partage avec au
   moins un texte du bloc (`label`, `text`, `question`, `answers[].label`,
   cellules, `items`, `bands[].label`) une sous-chaîne commune d'au moins
   `COVERAGE_MIN_CHARS` caractères (défaut **24**, configurable en tête du
   validateur). Sinon le bloc **ne peut pas** déclarer `replaces` : le
   validateur échoue en nommant l'item manquant.
5. Items par section : `klinik[].text`, `diagnostik[].text`,
   `therapie[].items[]` (tous les items de toutes les sections),
   `klassifikation[].inhalt`, `differenzialdiagnosen[].dd + unterscheidung`,
   `redFlags[]`, `risikofaktoren[]`, `aetiologie` et `prognose` (une phrase =
   un item, découpage sur `. `).
6. Les sections `pruefungsfallen`, `askedInExam`, `merksatz`, `definition` ne
   sont **pas** repliables (elles sont l'examen lui-même, pas le savoir).

## 4. Emplacement et chargement

```
app/src/data/fachwissenVisuals/
  types.ts            ← §1
  index.ts            ← export const VISUAL_SPECS: Record<string, FachwissenVisualSpec>
                        + export function getVisualSpec(id: string) { return VISUAL_SPECS[id]; }
  fw-khk.ts           ← export const spec: FachwissenVisualSpec
  fw-leberzirrhose.ts
  fw-depression.ts
app/src/components/visuals/
  registry.ts · AnatomyMap.tsx · DecisionTree.tsx · SyndromeMap.tsx · Timeline.tsx
  CompareTable.tsx · TherapyToggles.tsx · ScoreGauge.tsx · VisualBlockFrame.tsx
```

- Import **statique** pour cette phase (3 pilotes, quelques Ko). La page fait
  `getVisualSpec(fw.id)` — pas de Dexie, pas de réseau.
- Tier : hérité de la fiche. `publishContent.mjs` n'est pas modifié.
- **Évolution notée, hors périmètre** : au-delà de ~20 specs, passer à
  `import()` par id (index = `Record<string, () => Promise<…>>`) ; publication
  Supabase `content_items.kind = 'fachwissen_visual'` — exige une migration du
  CHECK `content_items_kind_check` (`docs/contracts/schema.sql` l.61), un ADR et
  un `payload` = ce schéma tel quel (le `version` porte la compatibilité, §7).

## 5. Validation mécanique — `app/scripts/checkFachwissenVisuals.mjs`

Validation **manuelle** (pas de `zod` : absent de `app/package.json`, aucune
dépendance ajoutée pour un validateur de 200 lignes). Suit le style de
`checkTherapieLabels.mjs` : lecture des sources par regex/parse, sortie
`process.exit(1)` sur toute violation, résumé `OK n specs / m blocs` sinon.

Vérifie, dans l'ordre :

| # | Règle | Message d'échec (préfixe `[visuals]`) |
|---|---|---|
| 1 | chaque `fw-*.ts` du dossier est référencé dans `index.ts` et réciproquement | `index désynchronisé: <id>` |
| 2 | `fachwissenId` existe dans `seedFachwissen.ts` (`id: '<id>'`) et égale le nom de fichier | `fiche inconnue: <id>` |
| 3 | `version === 1` | `version non supportée` |
| 4 | `blocks.length ≥ 1`, `id` uniques, kebab-case, préfixés par le kind | `id de bloc invalide/dupliqué` |
| 5 | `kind` dans l'enum ; `tone` dans l'enum ; `replaces` dans l'enum ; `placement.order` unique par colonne | `enum invalide: <champ>=<valeur>` |
| 6 | `data` conforme au kind : régions dans `ANATOMY_REGIONS` et uniques par vue ; arbre : `root` existe, `next` résolus, exactement `next` xor `leaf`, acyclique, tous atteignables ; table : toutes les clés de colonne dans chaque ligne ; gauge : bandes contiguës couvrant `[min,max]` ; toggles : 2–6 options, `defaultKey` résolu ; timeline ≥ 2 étapes ; syndrome 2–8 branches | `data invalide (<kind>/<bloc>): <détail>` |
| 7 | au plus un `replaces` par section ; couverture §3.4 pour chaque bloc `replaces` | `couverture insuffisante (<bloc> → <section>): "<item>"` |
| 8 | aucun texte affiché vide ; aucun texte contenant du français détectable (liste courte : « le », « la », « les », « avec », « chez » comme mots entiers) | `texte vide / non allemand` |

Lecture des specs : le script importe les `.ts` via `tsx`/`node --import`
si disponible dans `devDependencies`, sinon parse un export JSON équivalent —
**choix laissé au plan**, à trancher avant la tâche « validateur » ; le contrat
impose seulement le comportement et le code de sortie.

**CI** (ligne à ajouter par `build`, dans `.github/workflows/quality.yml` après
`checkAllergyConflicts.mjs`, bloc bloquant, pas `|| true`) :

```yaml
      - name: Fachwissen visuals — schéma, couverture, ids
        run: node scripts/checkFachwissenVisuals.mjs
```

## 6. Composants — props, accessibilité, style

```ts
export interface VisualBlockProps<B extends VisualBlock = VisualBlock> {
  block: B;
  onOpenGlossary?: (term: string) => void;   // délégué à AutoLink
}
```

`VisualBlockFrame` (cadre commun) rend : `.eyebrow` = kind lisible en allemand
(« Anatomie », « Entscheidungsbaum », « Syndrom », « Verlauf », « Vergleich »,
« Therapie », « Score ») ; `<h2>` = `block.title` ; le composant ; puis, si
`replaces`, le `<details>` de §3.

**Accessibilité (opposable en revue)**

- `AnatomyMap` : SVG `role="img"` avec `<title>` ; chaque hotspot est un
  `<button>` (pas un `<path onClick>`), `aria-pressed`, focusable, navigable
  Tab/Shift-Tab, activable Entrée/Espace ; le texte du hotspot sélectionné est
  rendu dans un `<p aria-live="polite">` hors du SVG. Liste textuelle des
  hotspots toujours rendue (`<ul>` visuellement sous la silhouette).
- `DecisionTree` : arbre rendu comme liste imbriquée (`<ul role="tree">`,
  `role="treeitem"`, `aria-expanded`) ; flèches haut/bas/gauche/droite ; les
  feuilles `tone: 'signal'` portent `aria-label` incluant le mot « Notfall »
  s'il figure dans le label.
- `TherapyToggles` : `role="tablist"` / `role="tab"` / `role="tabpanel"`,
  flèches gauche/droite, `aria-selected`.
- `ScoreGauge` : `role="meter"`, `aria-valuemin/max/now` ; bandes listées en
  texte (`<ol>`).
- `Timeline`, `SyndromeMap`, `CompareTable` : DOM sémantique (`<ol>`, `<ul>`,
  `<table>` avec `<th scope>`), pas de SVG pour le texte.
- Couleur jamais seule porteuse de sens : chaque `tone` a un marqueur textuel
  ou une icône (`Icon name="alert"` pour `warn`/`signal`).
- `prefers-reduced-motion: reduce` : aucune transition/animation (les
  transitions Tailwind sont conditionnées par `motion-safe:`). Toute animation
  est ≤ 200 ms et non essentielle.
- Contraste ≥ 4.5:1 en clair et sombre pour tout texte.

**Tokens de style** (Tailwind `app/tailwind.config.js`, `app/src/styles/index.css`)

| Tone | Fond / bordure | Texte | Usage |
|---|---|---|---|
| `neutral` | `border-slate-200 dark:border-slate-800` | `text-slate-600 dark:text-slate-300` | défaut |
| `accent` | `bg-brand-50 border-brand-200 dark:bg-brand-900/25` | `text-brand-700 dark:text-brand-300` | pétrole, structure |
| `signal` | `bg-signal-50 border-signal-200` (coral) | `text-signal-600 dark:text-signal-300` | un point de bascule par bloc au plus |
| `warn` | `bg-amber-50 border-amber-200` | `text-amber-700 dark:text-amber-300` | atypique, Vorsicht |

Réutiliser `.card card-accent`, `.eyebrow`, `.mono-tag`, `.label`, `chip` ;
valeurs numériques et noms de scores en `font-mono` (Plex Mono, signature
« readout »). Aucune couleur hexadécimale nouvelle dans les composants.

## 7. Versionnement et compatibilité

- `version` est un entier ; ce contrat définit **1**. Un changement additif
  (champ optionnel, nouveau kind, nouvelle région) reste en version 1 et
  s'accompagne d'un amendement daté ci-dessous. Un changement de forme
  (renommage, champ obligatoire) incrémente la version ; le client garde un
  adaptateur `v(n-1) → v(n)` pendant une release, puis les specs sont migrées.
- **Client existant** : aucune API, table ou route touchée ; `Fachwissen`
  (`app/src/db/types.ts`) n'est pas modifié ; les fiches sans spec ne changent
  pas. Compatibilité totale par construction.
- **Tests de contrat à écrire** (plan, étape 3) :
  1. `checkFachwissenVisuals.mjs` échoue (exit ≠ 0) sur une fixture avec région
     inconnue, un `next` non résolu, une bande de score trouée, une couverture
     `replaces` insuffisante ; réussit sur les trois pilotes.
  2. Rendu : `fw-pankreatitis` (sans spec) — DOM identique avant/après.
  3. Rendu : un bloc `kind: 'unknown'` injecté → non rendu, `console.warn` en
     dev, aucune exception.
  4. Rendu : bloc `replaces: 'klinik'` → la section Klinik est dans un
     `<details>` fermé ; « Text anzeigen » l'ouvre ; son contenu textuel est
     identique à la version sans spec.
  5. a11y : `axe` sans violation sur les trois pilotes ; parcours clavier des
     hotspots et des toggles (Playwright, mesuré depuis le DOM de l'app).

## Amendements

| Date | Auteur | Changement | Motivation |
|---|---|---|---|
| 2026-09-16 | arch-fachwissen-visuals | création (brouillon, sous réserve G2) | epic #8 |
