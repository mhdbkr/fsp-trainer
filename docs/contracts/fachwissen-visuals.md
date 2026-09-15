# Contrat — Fachwissen visuel (sous-projet #7, epic #8)

> **v1 — aligné sur le spec, sous réserve du gate G2.** Source :
> `docs/superpowers/specs/2026-09-16-fachwissen-visuals-design.md` (fe22692).
> En cas de divergence, le spec gagne et ce contrat est amendé par
> `arch-fachwissen-visuals` (tableau « Amendements » en fin de fichier).
>
> Vérité partagée entre `spec`, `plan`, `build` et `review`. Un implémenteur qui
> a besoin d'autre chose propose un amendement ici, il ne contourne pas.

## 0. Portée et principes

- **Un système, pas des illustrations** (PRODUCT-VISION §innovation 10) : sept
  composants génériques pilotés par une spec typée par pathologie. Aucune
  donnée clinique dans le code des composants ; tout vient de la spec ou de la
  fiche (résolution des refs).
- **Le texte se décharge, il n'est pas supprimé** : un bloc *replie* les entrées
  de fiche qu'il déclare dans `replaces` ; `seedFachwissen.ts` n'est jamais
  modifié par ce pipeline (une coupe = proposition de diff à `main`).
- **Aucune donnée clinique inventée** (spec D8) : chaque libellé porté par un
  visuel cite sa provenance (`source`) ; un ajout est `'ergänzt'` et bloque la
  CI tant qu'un relecteur `content-*` ne l'a pas inscrit dans `reviewed.ts`.
- **Hors-ligne d'abord, simple** : import statique, pas de table, pas de RLS,
  pas de sync, aucun crédit IA. Le tier d'un visuel est celui de sa fiche.
- **Spec absente = page inchangée.** Les 131 fiches sans spec se rendent
  exactement comme aujourd'hui.
- Tout texte affiché à l'apprenant est en **allemand** ; identifiants et
  commentaires en anglais/français ; jamais d'emoji.

## 1. Schéma — `FachwissenVisualSpec`

Fichier de types : `app/src/data/fachwissenVisuals/types.ts` (source de vérité
TypeScript ; le validateur `.mjs` charge les vrais objets, §5). `types.ts`
n'importe depuis `@/db/types` que des **types** (`import type`) : le chargeur
esbuild neutralise l'alias `@/` (§5), toute valeur importée par `@/` serait
`undefined` au validateur.

### 1.1 Références vers la fiche (spec §4.1)

```ts
import type { DiagnostikStufe } from '@/db/types';

export type SectionKey =
  | 'klinik' | 'diagnostik' | 'therapie' | 'klassifikation'
  | 'differenzialdiagnosen' | 'redFlags' | 'risikofaktoren' | 'prognose' | 'aetiologie';

/** Pointeur stable vers une entrée de fiche — par clé, jamais par index. */
export type SectionRef =
  | { section: 'therapie'; label: string }                  // TherapieSektion.label exact
  | { section: 'klassifikation'; name: string }              // klassifikation[].name exact
  | { section: 'diagnostik'; stufe: DiagnostikStufe }        // toutes les entrées de la stufe
  | { section: 'differenzialdiagnosen'; dd: string }         // differenzialdiagnosen[].dd exact
  | { section: 'klinik' | 'redFlags' | 'risikofaktoren'; text: string }  // texte exact
  | { section: 'prognose' | 'aetiologie' };                  // champ entier

/** Provenance d'un libellé porté par un visuel. */
export type Source = SectionRef | 'ergänzt';
```

Clé canonique d'une ref (`refKey`, utilisée par le validateur et
`useVisualSpec`) : `section` + `':'` + valeur (`label`/`name`/`stufe`/`dd`/
`text`, vide pour `prognose`/`aetiologie`). Comparaison **exacte** (pas de
normalisation) : une faute de frappe est une ref cassée, donc CI rouge.

### 1.2 Spec et bloc (spec §4.2)

```ts
export const VISUAL_SCHEMA_VERSION = 1 as const;

export type Tone = 'neutral' | 'accent' | 'signal' | 'warn';
// neutral = ink/slate · accent = pétrole (structure) · signal = coral (le point
// de bascule, un seul par bloc, §6) · warn = ambre (atypique). Pas de cinquième.

export type VisualKind =
  | 'anatomy-map' | 'decision-tree' | 'syndrome-map' | 'timeline'
  | 'compare-table' | 'therapy-toggles' | 'score-gauge';

interface BlockBase<K extends VisualKind, D> {
  /** Unique dans la spec ; kebab-case ; préfixé par le kind (ex. `tree-ap`). */
  id: string;
  kind: K;
  /** Titre affiché (allemand), ≤ 60 caractères. */
  title: string;
  /** Entrées de fiche DÉCHARGÉES par ce bloc (repliées, §3). Peut être vide. */
  replaces: SectionRef[];
  /** Section avant laquelle le bloc s'insère, colonne principale (§3.3). */
  anchor: SectionKey;
  /** Départage plusieurs blocs sur le même anchor ; défaut = index dans `blocks`. */
  order?: number;
  /** Une phrase à réciter, lue par le bloc pour l'oral. */
  merke?: string;
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
  fachwissenId: string;          // = Fachwissen.id ; le fichier porte ce nom
  version: typeof VISUAL_SCHEMA_VERSION;
  blocks: VisualBlock[];         // 1 à 4
}
```

**Règle `source`** : tout libellé clinique porté par un visuel (hotspot, nœud,
item de rayon, point, ligne, option, critère, bande) porte `source: Source`
obligatoire. Exemptés, car rubriques structurelles et non clinicales : `title`,
`merke`, `center`, `spokes[].label`, `columns[]`, `branches[].label` (arête
« ja »/« nein »), `points[].at`. Un `'ergänzt'` n'est accepté que s'il figure
dans `reviewed.ts` (§4).

### 1.3 `anatomy-map` — silhouette cliquable

```ts
export const ANATOMY_REGIONS = [
  'head', 'eyes', 'neck', 'jaw', 'chest', 'retrosternal', 'left-arm', 'right-arm',
  'epigastrium', 'right-upper-quadrant', 'left-upper-quadrant', 'periumbilical',
  'right-lower-quadrant', 'left-lower-quadrant', 'flank-left', 'flank-right',
  'back', 'lumbar', 'pelvis', 'left-leg', 'right-leg', 'legs', 'hands', 'feet', 'skin',
] as const;
export type AnatomyRegion = (typeof ANATOMY_REGIONS)[number];
export type AnatomyFigure = 'body' | 'torso' | 'abdomen';

export interface AnatomyHotspot {
  region: AnatomyRegion;
  label: string;     // court, allemand (« Ikterus (Sklera) »)
  source: Source;    // entrée klinik/redFlags citée (plusieurs hotspots peuvent citer la même)
  tone?: Tone;       // défaut 'accent' ; 'signal' = red flag
}
export interface AnatomyMapData {
  figure: AnatomyFigure;
  hotspots: AnatomyHotspot[];  // ≥ 2 ; une région au plus une fois
}
```

Régions par figure (le validateur refuse une région hors de sa figure) :
`abdomen` = `epigastrium … flank-right` ; `torso` = `abdomen` + `neck`, `jaw`,
`chest`, `retrosternal`, `left-arm`, `right-arm`, `back`, `lumbar`, `pelvis` ;
`body` = toutes. `skin` est valide sur les trois figures (marqueur hors
silhouette). L'enum est **fermé** : ajouter une région = amendement daté +
nouveau path SVG. Couverture vérifiée sur les pilotes du spec §10 : Sklera →
`eyes`, Thorax → `chest`, Hände → `hands`, Abdomen → `periumbilical`,
Unterschenkel → `legs`.

### 1.4 `decision-tree` — arbre décisionnel

```ts
export type TreeNode =
  | { question: string; source: Source; branches: { label: string; child: TreeNode }[] } // ≥ 2 branches
  | { answer: string; source: Source; text?: string; tone?: Tone };                        // feuille
export interface DecisionTreeData {
  root: TreeNode;   // profondeur ≤ 4 (racine = 1) ; ≤ 12 nœuds au total
}
```

La forme est récursive (spec §4.3), donc acyclique par construction ; le
validateur compte les nœuds et la profondeur. Une feuille `tone: 'signal'` est
l'issue d'urgence — au plus une par arbre.

### 1.5 `syndrome-map` — carte de syndrome

```ts
export interface SyndromeSpoke {
  label: string;                                     // rubrique (« Hauptsymptome »)
  tone?: Tone;
  items: { text: string; source: Source }[];         // 1 à 5
}
export interface SyndromeMapData {
  center: string;               // « Depressive Episode ≥ 2 Wochen »
  spokes: SyndromeSpoke[];      // 3 à 6
}
```

### 1.6 `timeline` — frise

```ts
export interface TimelinePoint {
  at: string;                   // position libre : « 0–10 min », « Stadium C »
  label: string;
  detail?: string;
  source: Source;
  tone?: Exclude<Tone, 'signal'>;   // le coral n'est jamais porté par un point (R3)
}
export interface TimelineData {
  axis: 'zeit' | 'stadium' | 'schritt';
  axisTone?: 'neutral' | 'signal';  // 'signal' = toute la bande est un point de bascule
  points: TimelinePoint[];      // 3 à 8, ordre = ordre du tableau
}
```

### 1.7 `compare-table` — tableau comparatif

```ts
export interface CompareTableData {
  columns: string[];            // 2 à 3 en-têtes (« KHK », « DD »)
  rows: {
    criterion: string;
    cells: string[];            // cells.length === columns.length
    source: Source;
    emphasis?: number;          // index de colonne mise en avant, au plus une par ligne
  }[];                          // 2 à 8
}
```

### 1.8 `therapy-toggles` — sections de thérapie commutables

```ts
export interface TherapyOption {
  label: string;                                  // onglet (peut abréger le label de la fiche)
  ref: { section: 'therapie'; label: string };    // items LUS depuis la fiche, jamais recopiés
  akut?: boolean;                                 // teinte 'signal' ; au plus une option
}
export interface TherapyTogglesData {
  options: TherapyOption[];     // 2 à 5
  default: number;              // index dans options
}
```

`ref` vaut `source` : aucun texte clinique n'est recopié dans ce kind.

### 1.9 `score-gauge` — jauge de score

```ts
export interface ScoreCriterion {
  label: string;                // « Bilirubin (mg/dl) »
  points: number[];             // valeurs sélectionnables, croissantes (ex. [1, 2, 3])
  choices?: string[];           // libellé par valeur (« < 2 », « 2–3 », « > 3 »), même longueur
  source: Source;               // seuils absents de `inhalt` → 'ergänzt' (spec R2)
}
export interface ScoreBand { label: string; min: number; max: number; tone: Tone; source: Source }
export interface ScoreGaugeData {
  score: { name: string; ref: { section: 'klassifikation'; name: string } };
  criteria: ScoreCriterion[];   // peut être vide → jauge statique des bandes
  bands: ScoreBand[];           // contiguës, couvrent [Σ min(points), Σ max(points)] sans trou
  interactive: boolean;
  unit?: string;                // « Punkte » par défaut
}
```

### 1.10 Exemple minimal (`fw-leberzirrhose`, extrait)

```ts
import type { FachwissenVisualSpec } from './types';
export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-leberzirrhose', version: 1,
  blocks: [{
    id: 'anatomy-leberhautzeichen', kind: 'anatomy-map', title: 'Leberhautzeichen & Stauung',
    anchor: 'klinik',
    replaces: [
      { section: 'klinik', text: 'Ikterus (Gelbfärbung), Juckreiz' },
      { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
    ],
    data: { figure: 'body', hotspots: [
      { region: 'eyes', label: 'Ikterus (Sklera)',
        source: { section: 'klinik', text: 'Ikterus (Gelbfärbung), Juckreiz' } },
      { region: 'chest', label: 'Spider naevi',
        source: { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' } },
    ] },
  }],
};
```

## 2. Contrat de rendu

- **Résolution** (`app/src/components/visuals/resolve.ts`) :
  `resolve(ref: SectionRef, fw: Fachwissen): ResolvedRef | undefined`. Une ref
  est résolue si l'entrée existe **exactement** dans la fiche chargée (Dexie),
  pas dans le bundle. `resolveBlock(block, fw)` renvoie `{ ok: true, block }`
  si toutes les refs de `replaces` et tous les `source` (hors `'ergänzt'`) et
  `ref` résolvent ; sinon `{ ok: false, reason }`.
- **Dégradé sans exception** (spec D7) : bloc non résolu → **absent** du DOM ;
  ses `replaces` ne replient rien (la section reste dépliée) ;
  `console.warn('[visuals]', fachwissenId, blockId, reason)` uniquement si
  `import.meta.env.DEV`. Jamais de bloc partiel.
- **`ErrorBoundary` par bloc** : une exception de rendu retire ce bloc seul ;
  ses `replaces` sont traités comme non résolus (section dépliée) ; `warn` dev.
- **Bloc de kind inconnu** (spec plus récente que le client) : ignoré,
  `warn` dev, aucune exception.
- **Spec absente** : `getVisualSpec(id)` renvoie `undefined`, la page rend
  exactement le DOM actuel (AC-6/AC-13 du spec).
- **Validation d'exécution** : aucune au-delà de la résolution des refs. Un
  `data` malformé qui a passé la CI est un bug du validateur, pas du composant.
- **Aucune donnée clinique dans les composants** : pas de chaîne allemande
  codée en dur hors libellés d'interface génériques (« Text anzeigen »,
  « Text ausblenden », « Alles aufklappen », « Zurücksetzen »).
- **Liens glossaire** : `<AutoLink>` sur les panneaux HTML (détail, cellules,
  items), jamais dans `<text>` SVG (spec R8).
- Attributs de contrat sur le cadre : `data-visual="<kind>"`,
  `data-block="<id>"`, `role="region"`, `aria-label={title}`, `<h3>` visible.

## 3. Déchargement du texte — règles

1. **Repli par entrée.** La page calcule `collapsed = Set<refKey>` = union des
   `replaces` des blocs **résolus**. Une section dont toutes les entrées sont
   dans `collapsed` est rendue dans un `<details>` fermé (`open` absent),
   résumé « Text anzeigen · N Punkte » (ouvert : « Text ausblenden »), placé à
   l'emplacement habituel de la section. Une section partiellement repliée garde
   ses entrées non couvertes dépliées et replie les autres dans le même
   `<details>`. L'état ouvert/fermé n'est pas persisté.
2. Une entrée repliée reste dans le DOM (recherche, AutoLink, lecteurs
   d'écran) ; rien n'est retiré de `seedFachwissen.ts`.
3. **Insertion** : un bloc s'insère juste **avant** la `Section` nommée par
   `anchor`, colonne principale, dans une `Section` au même gabarit
   (`card card-accent`, eyebrow mono « Visuell »). Plusieurs blocs sur le même
   anchor : `order` croissant, défaut = index dans `blocks`.
   `anchor: 'redFlags'` : le bloc s'insère avant Klassifikation (ou avant
   Differenzialdiagnosen si la fiche n'a pas de `klassifikation`) et l'encart
   latéral Red Flags devient lui-même le `<details>` (spec §9, R4). Un `anchor`
   dont la section est absente de la fiche (ex. `klassifikation` sur `fw-khk`)
   suit la même règle : section suivante dans l'ordre de la page.
4. **Unicité** : deux blocs d'une même spec ne replient jamais la même entrée
   (`refKey` unique sur l'union des `replaces`). `source` n'est pas soumis à
   cette règle : plusieurs libellés peuvent citer la même entrée.
5. **Couverture déclarative** : `replaces` est vérifié par existence exacte de
   chaque ref dans la fiche (CI, §5) — plus aucune heuristique de sous-chaîne.
   Le jugement « le bloc couvre bien ce qu'il replie » revient au relecteur
   `content-*` (étape 5), pas au validateur.
6. Les champs `pruefungsfallen`, `askedInExam`, `merksatz`, `definition` ne
   sont **pas** repliables ni référençables par `SectionRef` (ils sont l'examen
   lui-même). Un `decision-tree` peut s'en inspirer, sans `source` possible :
   c'est un `'ergänzt'` à relire.

## 4. Emplacement et chargement

```
app/src/data/fachwissenVisuals/
  types.ts            ← §1
  index.ts            ← export const VISUAL_SPECS: Record<string, FachwissenVisualSpec>
                        + export function getVisualSpec(id: string) { return VISUAL_SPECS[id]; }
  reviewed.ts         ← export const REVIEWED: { fachwissenId: string; blockId: string; text: string }[]
  fw-khk.ts · fw-leberzirrhose.ts · fw-depression.ts   ← export const spec
app/src/components/visuals/
  VisualBlock.tsx (dispatch + ErrorBoundary) · resolve.ts · primitives.tsx · registry.ts
  AnatomyMap.tsx · DecisionTree.tsx · SyndromeMap.tsx · Timeline.tsx
  CompareTable.tsx · TherapyToggles.tsx · ScoreGauge.tsx
app/src/features/fachwissen/useVisualSpec.ts
```

- `reviewed.ts` : liste blanche des `'ergänzt'` acceptés ; `text` = le libellé
  exact (`label`, `answer`, `criterion`, …) porté par le champ marqué
  `'ergänzt'`. Écrit **uniquement** par un relecteur `content-*` ; le visualizer
  ne s'y inscrit jamais lui-même.
- Import **statique** (3 pilotes, quelques Ko). Les specs importent leurs types
  par chemin relatif (`./types`), jamais par `@/`.
- Tier : hérité de la fiche. `publishContent.mjs` n'est pas modifié.
- **Évolution notée, hors périmètre** (spec T4) : au-delà de ~50 specs,
  `import()` par id ; publication Supabase `content_items.kind =
  'fachwissen_visual'` — exige une migration du CHECK
  `content_items_kind_check` (`docs/contracts/schema.sql` l.61), un ADR et un
  `payload` = ce schéma tel quel (`version` porte la compatibilité, §7).

## 5. Validation mécanique — `app/scripts/checkFachwissenVisuals.mjs`

**Chargement tranché** : esbuild (déjà présent via vite), même pattern que
`app/scripts/loadCases.mjs` — entrée temporaire qui ré-exporte
`seedFachwissen`, `VISUAL_SPECS`, `REVIEWED` ; `bundle: true`, plugin
`stub-alias` sur `@/`. Pas de `zod`, pas de `tsx`, aucune dépendance ajoutée.
Sortie : `process.exit(1)` au **premier** manquement (message préfixé
`[visuals]`, avec fiche + bloc + champ) ; sinon résumé
`OK n specs / m blocs / k ergänzt relus` et exit 0.

| # | Règle | Message d'échec |
|---|---|---|
| 1 | chaque `fw-*.ts` du dossier est dans `index.ts` et réciproquement ; `fachwissenId` = nom de fichier | `index désynchronisé: <id>` |
| 2 | `fachwissenId` existe dans `seedFachwissen` | `fiche inconnue: <id>` |
| 3 | `version === 1` | `version non supportée` |
| 4 | 1 à 4 blocs ; `id` uniques, kebab-case, préfixés par le kind ; `title` ≤ 60 | `bloc invalide: <détail>` |
| 5 | `kind`, `tone`, `anchor`, `axis`, `figure` dans leurs enums ; `order` unique par anchor | `enum invalide: <champ>=<valeur>` |
| 6 | **refs résolues** contre la fiche réelle : chaque élément de `replaces`, chaque `source` ≠ `'ergänzt'`, chaque `ref` | `ref introuvable (<bloc>): <refKey>` |
| 7 | **unicité du repli** : aucun `refKey` dans deux `replaces` de la même spec | `double repli: <refKey> (<bloc-a>, <bloc-b>)` |
| 8 | **`ergänzt`** : chaque champ `'ergänzt'` a une ligne `{ fachwissenId, blockId, text }` exacte dans `REVIEWED` ; une ligne de `REVIEWED` sans champ correspondant est aussi une erreur (liste morte) | `ergänzt non relu: <bloc> "<text>"` |
| 9 | forme par kind : anatomy ≥ 2 hotspots, régions ∈ enum, ∈ figure, uniques ; tree ≥ 2 branches par question, profondeur ≤ 4, ≤ 12 nœuds ; syndrome 3–6 rayons, 1–5 items ; timeline 3–8 points, aucun `tone: 'signal'` sur un point ; table 2–3 colonnes, 2–8 lignes, `cells.length === columns.length`, `emphasis` dans les bornes ; toggles 2–5 options, `default` dans les bornes, ≤ 1 `akut` ; gauge `points` croissants, `choices` de même longueur, bandes contiguës couvrant exactement `[Σ min, Σ max]` | `data invalide (<kind>/<bloc>): <détail>` |
| 10 | **signal** : au plus un `tone: 'signal'` par bloc (feuille, hotspot, rayon, bande, colonne) ; sur `timeline` seul `axisTone` peut le porter ; `akut` compte comme le signal du bloc | `signal multiple: <bloc>` |
| 11 | aucun texte affiché vide ; aucun emoji (`\p{Extended_Pictographic}`) ; pas de français détectable (mots entiers : « le », « la », « les », « avec », « chez », « et », « pour ») | `texte vide / non allemand / emoji` |

**CI** (proposition à `main`, `.github/workflows/quality.yml` après
`checkTherapieLabels.mjs`, bloc bloquant, pas `|| true`) :

```yaml
      - name: Fachwissen visuals — schéma, refs, ergänzt
        run: node scripts/checkFachwissenVisuals.mjs
```

## 6. Composants — props, accessibilité, style

```ts
export interface VisualBlockProps<B extends VisualBlock = VisualBlock> {
  block: B;
  fw: Fachwissen;                            // pour lire les items (toggles) et légendes (gauge)
  onOpenGlossary?: (term: string) => void;   // délégué à AutoLink
}
```

Le cadre commun `VisualBlockFrame` (dans `VisualBlock.tsx`) rend : eyebrow
mono « Visuell · <forme en allemand> » (« Anatomie », « Entscheidungsbaum »,
« Syndrom », « Verlauf », « Vergleich », « Therapie », « Score ») ; `<h3>` =
`title` (jamais `<h2>`, AC-16) ; `merke` en citation mono si présent ; le
composant sous `ErrorBoundary` ; un slot `after?: ReactNode` où la page peut
placer le `<details>` du repli lorsque la section repliée est celle de
l'`anchor` (sinon le `<details>` reste à l'emplacement habituel, §3.1).

**Accessibilité (opposable en revue)**

- `AnatomyMap` : SVG `role="img"` avec `<title>` ; chaque hotspot est un
  `<button>` (pas un `<path onClick>`), `aria-pressed`, `aria-label`, focusable,
  flèches gauche/droite entre hotspots, Entrée/Espace ouvre le panneau ; le
  panneau (`<p aria-live="polite">`, hors SVG) montre libellé + citation
  source. Liste textuelle des hotspots toujours rendue (`<ul>`).
- `DecisionTree` : `<ul role="tree">`, `role="treeitem"`, `aria-expanded` ;
  niveau 1 visible au chargement, Entrée déplie, Échap replie, bouton
  « Alles aufklappen » ; feuille `signal` = bord coral + icône, `aria-label`
  incluant « Notfall » s'il figure dans `answer`.
- `TherapyToggles` : `role="tablist"` / `tab` / `tabpanel`, flèches
  gauche/droite, `aria-selected` ; onglet `akut` porte la classe `signal`.
- `ScoreGauge` : `role="meter"`, `aria-valuemin/max/now` ; total en `font-mono`
  ; critères = groupes `role="radiogroup"` ; bande active `data-active="true"`
  ; bouton « Zurücksetzen » ; bandes listées en `<ol>`.
- `Timeline`, `SyndromeMap`, `CompareTable` : DOM sémantique (`<ol>`, `<ul>`,
  `<table>` avec `<th scope>`), pas de SVG pour le texte ; réponse au clic,
  jamais au survol seul (spec D9).
- Tons décoratifs vs porteurs de sens : `neutral` et `accent` sont
  décoratifs (structure) — la couleur seule est autorisée ; `signal` et `warn`
  portent un sens clinique — libellé textuel ou icône SVG
  (`components/icons.tsx`) obligatoire, jamais la couleur seule.
- `prefers-reduced-motion: reduce` : aucune transition (`motion-safe:` sur
  toute transition Tailwind) ; sinon ≤ 200 ms, non essentielle.
- Contraste ≥ 4.5:1 clair et sombre ; aucun `<img>` ; aucun
  `dangerouslySetInnerHTML` ; largeur 390 px sans scroll horizontal.

**Tokens de style** (`app/tailwind.config.js`, `app/src/styles/index.css`)

| Tone | Fond / bordure | Texte | Usage |
|---|---|---|---|
| `neutral` | `border-slate-200 dark:border-slate-800` | `text-slate-600 dark:text-slate-300` | défaut |
| `accent` | `bg-brand-50 border-brand-200 dark:bg-brand-900/25` | `text-brand-700 dark:text-brand-300` | pétrole, structure |
| `signal` | `bg-signal-50 border-signal-200` (coral) | `text-signal-600 dark:text-signal-300` | le point de bascule, un par bloc |
| `warn` | `bg-amber-50 border-amber-200` | `text-amber-700 dark:text-amber-300` | atypique, Vorsicht |

Sémantique : `neutral`/`accent` = décoratifs (couleur seule autorisée) ;
`signal`/`warn` = porteurs de sens (texte ou icône obligatoire).

Fond « papier millimétré » 8 px (`Grid`, opacité 0,08 clair / 0,05 sombre) ;
nœud = rectangle `rounded-lg`, trait 1,5 px, bord gauche pétrole 3 px pour une
question, coral pour l'issue d'urgence ; arêtes orthogonales ; hotspot = cercle
10 px + anneau au focus ; chiffres, scores, stades, unités en `font-mono`
(`Readout`). Aucune couleur hexadécimale nouvelle dans les composants.

## 7. Versionnement, compatibilité, tests de contrat

- `version` est un entier ; ce contrat définit **1**. Un changement additif
  (champ optionnel, nouveau kind, nouvelle région) reste en version 1 avec un
  amendement daté. Un changement de forme (renommage, champ obligatoire)
  incrémente la version ; le client garde un adaptateur `v(n-1) → v(n)` pendant
  une release, puis les specs sont migrées.
- **Client existant** : aucune API, table ou route touchée ; `Fachwissen`
  (`app/src/db/types.ts`) n'est pas modifié ; les fiches sans spec ne changent
  pas. Compatibilité totale par construction. `checkTherapieLabels.mjs` lit le
  fichier, pas le DOM : le repli est sans effet sur lui (spec R7).
- **Tests de contrat à écrire** (plan, étape 3) :
  1. Validateur, exit ≠ 0 sur une fixture : (a) `replaces` avec `text` erroné
     d'un caractère → `ref introuvable` ; (b) `source: 'ergänzt'` absent de
     `REVIEWED` → `ergänzt non relu` ; (c) même `refKey` dans deux blocs →
     `double repli` ; (d) région hors figure ; (e) bande de score trouée ;
     (f) deux `tone: 'signal'` dans un bloc ; (g) `tone: 'signal'` sur un point
     de timeline. Exit 0 sur les trois pilotes.
  2. Rendu : `fw-pankreatitis` (sans spec) — `innerHTML` de la colonne
     principale identique avant/après, aucun `[data-visual]`, aucun `<details>`.
  3. Rendu : un bloc `kind: 'unknown'` injecté → non rendu, `console.warn` en
     dev, aucune exception.
  4. Rendu dégradé (AC-7) : fiche où un `therapie[].label` visé par un
     `therapy-toggles` est renommé → bloc absent, section Therapie dépliée,
     aucune exception ; même chose si le composant lève (`ErrorBoundary`).
  5. Rendu repli : `fw-khk`, Therapie dans un `<details>` fermé, résumé
     « Text anzeigen » ; après clic, les 4 labels identiques mot pour mot à
     `therapie[].label`. Repli partiel : une entrée `klinik` non couverte reste
     dépliée hors du `<details>`.
  6. Rendu `anchor: 'redFlags'` (`fw-leberzirrhose`) : `[data-visual="timeline"]`
     est avant la `Section` Klassifikation en colonne principale ; l'encart
     latéral Red Flags est un `<details>` fermé.
  7. Typage : `// @ts-expect-error` sur un `kind` inconnu et sur un `replaces`
     par index (AC-2).
  8. a11y : `axe` sans violation sur les trois pilotes ; parcours clavier
     hotspots / toggles / arbre ; `prefers-reduced-motion` ; 390 px ; sombre
     (Playwright, mesuré depuis le DOM de l'app, jamais via `import("/src/…")`).

## Amendements

| Date | Auteur | Changement | Motivation |
|---|---|---|---|
| 2026-09-16 | arch-fachwissen-visuals | création (brouillon, sous réserve G2) | epic #8 |
| 2026-09-16 | arch-fachwissen-visuals | alignement sur le spec (repli par entrée `replaces: SectionRef[]`, `source` obligatoire + `reviewed.ts`, `anchor` remplace `placement`, dégradé D7 + `ErrorBoundary`, validateur esbuild, signal sur l'axe de `timeline`, `data` de chaque kind selon spec §4.3) ; régions `eyes` et `legs` ajoutées (pilote Leberzirrhose) ; invariant de couverture par sous-chaîne supprimé | spec fe22692 gagne (règle du contrat) |
| 2026-09-16 | arch-fachwissen-visuals | §6 : `VisualBlockFrame` nommé, `<h3>` explicite, slot `after` pour le `<details>` | demande lead (alignement sur le code, AC-16) |
| 2026-09-16 | arch-fachwissen-visuals | §6 : `neutral`/`accent` décoratifs (couleur seule OK), `signal`/`warn` porteurs de sens (texte ou icône obligatoire) | demande lead, a11y |
