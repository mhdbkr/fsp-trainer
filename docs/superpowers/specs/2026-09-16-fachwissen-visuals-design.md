# Doctopus — Fachwissen visuel · spec de design

> Sous-projet #7 (epic GitHub #8) · pipeline `fachwissen-visuals` · branche
> `feat/fachwissen-visuals` · auteur `spec-fachwissen-visuals` · 2026-09-16.
> Prose en français ; contenu clinique cité en allemand.

## 1. Objectif

**Intention** — le candidat à trois semaines de l'oral doit pouvoir *dire*
une fiche Fachwissen (Fallvorstellung, questions Arzt-Arzt), pas seulement la
lire. Les 134 fiches (`reports/inventory.md`) sont riches — 8 000 à 70 000
caractères — mais elles se présentent comme une colonne de texte : la
structure du raisonnement (stable/instable, stade A/B/C, ligne 1/ligne 2)
est enfouie dans des puces.

**Problème** — une fiche encombrée produit exactement la « rupture de
symbiose » décrite dans `BACKLOG-FEEDBACK.md` : l'outil est *machinal*, il
livre l'information sans épouser la forme sous laquelle on la récite. À
l'oral, l'examinateur demande « Wie unterscheiden Sie stabile von instabiler
Angina pectoris ? » ; la réponse est un embranchement, pas un paragraphe.

**Ce qu'on construit** — *un système, pas des illustrations* (PRODUCT-VISION,
innovation 10) : une bibliothèque de **7 composants pilotés par les données**
et une **spec visuelle par pathologie** qui déclare quoi montrer plutôt
qu'écrire. Aucune image statique : tout est rendu par code depuis des
données typées, donc versionnable, testable, cohérent avec la charte, et
reproductible sur les 131 fiches restantes par `content-fachwissen-visualizer`.

**Réussite** — sur les 3 pilotes, chaque bloc visuel remplace visiblement une
portion de texte (repliée, jamais supprimée), le rendu passe les critères
AC-1…AC-18, et un quatrième spec peut être écrit par un agent Sonnet à partir
du seul brief §6 sans toucher au code.

**Persona** — candidat à 3 semaines, non-natif, souvent sur mobile (≤ 390 px),
qui révise une fiche entre deux simulations.

## 2. Décisions prises (et alternatives écartées)

| # | Décision | Alternatives écartées |
|---|---|---|
| D1 | **Spec par pathologie = module TypeScript** `app/src/data/fachwissenVisuals/<fwId>.ts` exportant un objet `FachwissenVisualSpec`, agrégé par un index. | JSON pur : perd le typage à l'écriture et l'autocomplétion ; les erreurs ne sortent qu'au validateur. Stockage Supabase : hors périmètre #7, et le visuel n'a pas de tier propre (il suit la fiche). |
| D2 | **Spec dans le bundle, pas dans Dexie ni Supabase.** Le visuel n'existe que si la fiche est chargée (`useFachwissen`) ; le tier est donc hérité de la fiche. | Publier la spec avec le contenu : impose une migration + un contrat de sync — reporté à un ADR ultérieur si le volume l'exige (§10, T4). |
| D3 | **Références par clé stable, jamais par index** : `therapie` par `label`, `klassifikation` par `name`, `diagnostik` par `stufe`, `differenzialdiagnosen` par `dd`, `klinik`/`redFlags` par texte exact. | Index numériques : cassent silencieusement à la première réécriture de fiche. |
| D4 | **Déchargement = repli, jamais suppression.** Un bloc déclare `replaces` ; la page replie la section source sous un `<details>` « Text anzeigen ». Le texte reste dans `seedFachwissen.ts` ; une coupe = proposition de diff à `main`. | Supprimer le texte : viole le périmètre du pipeline et casse `checkTherapieLabels.mjs` (identité fiche-cas). |
| D5 | **Rendu SVG/DOM natif, aucune librairie de dataviz.** | d3/recharts/reactflow : poids, style importé, accessibilité à reprendre ; nos 7 formes sont simples. |
| D6 | **Validation en deux couches** : garde de type TS à l'écriture + `app/scripts/checkFachwissenVisuals.mjs` en CI (charge la fiche via esbuild comme `loadCases.mjs`). Pas de `zod` (absent de `package.json`, aucune dépendance ajoutée). | zod runtime : dépendance nouvelle pour un contenu qui ne varie pas au runtime. |
| D7 | **Dégradé sans exception** : toute référence introuvable au runtime → le bloc ne s'affiche pas, la section texte s'affiche dépliée, `console.warn` en dev. La fiche est toujours lisible. | Afficher un bloc partiel : montre une structure fausse à l'oral. |
| D8 | **Aucune donnée cliniques inventée par un visuel** : chaque nœud/cellule cite ou paraphrase un élément de la fiche (`source` obligatoire) ; un ajout est marqué `source: 'ergänzt'` et bloque la CI tant qu'il n'est pas relu par `content-*` (liste blanche dans le spec). | Laisser le visualizer écrire librement : un arbre faux est pire qu'un paragraphe vrai. |
| D9 | **Réponse dépliée au clic, jamais au survol seul** (tactile). Le survol ne fait que surligner. | Hover-only : invisible sur mobile. |

**ADR candidate (à écrire par `documentation-and-adrs`, pas ici)** :
« Visuels Fachwissen = spec JSON/TS rendue par code ; jamais d'illustration
statique. » Motifs : versionnable, testable, cohérent charte, généralisable.

## 3. Architecture

```
app/src/data/fachwissenVisuals/
  types.ts            ← FachwissenVisualSpec, VisualBlock (union discriminée), refs
  index.ts            ← Record<fwId, FachwissenVisualSpec> (import statique)
  fw-khk.ts · fw-leberzirrhose.ts · fw-depression.ts   ← pilotes
app/src/components/visuals/
  VisualBlock.tsx     ← dispatch par `kind` + résolution des refs + dégradé
  AnatomyMap.tsx  DecisionTree.tsx  SyndromeMap.tsx  Timeline.tsx
  CompareTable.tsx  TherapyToggles.tsx  ScoreGauge.tsx
  primitives.tsx      ← Grid (papier millimétré), Readout (mono), Node, Edge
  resolve.ts          ← résout une `SectionRef` contre une Fachwissen
app/src/features/fachwissen/
  FachwissenDetailPage.tsx  ← insertion + repli (`replaces`)
  useVisualSpec.ts          ← spec ← index[fw.id], résolution, liste des sections repliées
app/scripts/checkFachwissenVisuals.mjs  ← validateur CI (esbuild)
```

Flux : `FachwissenDetailPage` → `useVisualSpec(fw)` → pour chaque bloc,
`resolve(block, fw)` renvoie `{ ok, data }` ou `{ ok: false, reason }` →
`VisualBlock` rend le composant ou rien → la page replie les sections listées
dans `replaces` des blocs **résolus** uniquement.

Périmètre d'écriture (team-protocol §5) : `components/visuals/`,
`data/fachwissenVisuals/`, `features/fachwissen/`, `scripts/checkFachwissenVisuals.mjs`
(script nouveau, ajout d'une ligne dans `quality.yml` = proposition à `main`).

## 4. Modèle de données

### 4.1 Références vers la fiche

```ts
type SectionKey = 'klinik' | 'diagnostik' | 'therapie' | 'klassifikation'
  | 'differenzialdiagnosen' | 'redFlags' | 'risikofaktoren' | 'prognose' | 'aetiologie';

type SectionRef =
  | { section: 'therapie'; label: string }              // TherapieSektion.label exact
  | { section: 'klassifikation'; name: string }          // klassifikation[].name exact
  | { section: 'diagnostik'; stufe: DiagnostikStufe }
  | { section: 'differenzialdiagnosen'; dd: string }
  | { section: 'klinik' | 'redFlags' | 'risikofaktoren'; text: string } // texte exact
  | { section: 'prognose' | 'aetiologie' };

/** Provenance d'un libellé porté par le visuel. */
type Source = SectionRef | 'ergänzt';
```

### 4.2 Spec par pathologie

```ts
interface FachwissenVisualSpec {
  fwId: string;                 // = Fachwissen.id ; le fichier porte ce nom
  version: 1;
  blocks: VisualBlock[];        // ordre d'affichage
}

interface BlockBase {
  id: string;                   // unique dans la spec, kebab-case
  kind: VisualKind;
  title: string;                // allemand, ≤ 60 caractères
  /** Sections/entrées que ce bloc DÉCHARGE : repliées dans la page. */
  replaces: SectionRef[];
  /** Où il s'insère : juste avant la section nommée. */
  anchor: SectionKey;
  /** Une phrase à réciter, lue par le bloc pour l'oral. */
  merke?: string;
}
```

### 4.3 Les sept formes (union discriminée `VisualBlock`)

| kind | Données propres | Consomme (via refs) |
|---|---|---|
| `anatomy-map` | `figure: 'torso' \| 'abdomen' \| 'body'`, `hotspots: { region: RegionId; label; source; tone?: 'brand' \| 'signal' }[]` | `klinik`, `redFlags` |
| `decision-tree` | `root: TreeNode` ; `TreeNode = { question; source } \| { answer; source; tone? }` avec `branches: { label; child }[]` ; profondeur ≤ 4 ; ≤ 12 nœuds | `klinik`, `differenzialdiagnosen`, `diagnostik`, `askedInExam` (lecture seule, non repliable) |
| `syndrome-map` | `center: string`, `spokes: { label; items: { text; source }[] }[]` ; ≤ 6 rayons, ≤ 5 items/rayon | `klinik`, `klassifikation`, `redFlags` |
| `timeline` | `axis: 'zeit' \| 'stadium' \| 'schritt'`, `points: { at: string; label; detail?; source; tone? }[]` ; 3–8 points | `diagnostik`, `redFlags`, `prognose`, `therapie` |
| `compare-table` | `columns: string[]` (2–3), `rows: { criterion; cells: string[]; source }[]` ; ≤ 8 lignes | `differenzialdiagnosen`, `klinik`, `klassifikation` |
| `therapy-toggles` | `options: { label; ref: { section: 'therapie'; label }; akut?: boolean }[]` ; 2–5 options ; `default: number` | `therapie` (items lus depuis la fiche, jamais recopiés) |
| `score-gauge` | `score: { name; ref: { section: 'klassifikation'; name } }`, `criteria: { label; points: number[] ; unit? }[]`, `bands: { label; min; max; tone }[]` ; `interactive: true` | `klassifikation` |

Contraintes transverses vérifiées par le validateur (§6) :
- chaque `source` non `'ergänzt'` résout contre la fiche du même `fwId` ;
- chaque `replaces` résout ; deux blocs ne replient pas la même entrée ;
- `'ergänzt'` n'est accepté que si `id` du bloc figure dans
  `data/fachwissenVisuals/reviewed.ts` (liste blanche mise à jour par un
  relecteur `content-*`, jamais par le visualizer) ;
- pas d'emoji ni de caractères hors plan de base dans les libellés ;
- bornes de taille ci-dessus ; `title` ≤ 60 ; ≤ 4 blocs par fiche.

### 4.4 Local vs synchronisé

Tout est **statique dans le bundle**. Aucun état utilisateur n'est
persisté par les visuels (le toggle sélectionné et la jauge sont de l'état
React éphémère). Rien ne transite par Supabase, aucun crédit IA.

## 5. Composants

Conventions communes (`primitives.tsx`) : fond « papier millimétré »
(`Grid`, motif SVG 8 px, opacité 0,08 clair / 0,05 sombre) ; valeurs et
étiquettes de stade en `font-mono` (`Readout`) ; pétrole (`brand-500/600`)
pour la structure, coral (`signal-500`) **uniquement** pour le point de
bascule (urgence, stade C, réponse « instabil ») ; `paper`/`ink` pour fonds ;
icônes SVG de `components/icons.tsx` (ajout d'icônes dans `visuals/icons.tsx`
si besoin, jamais d'emoji). `prefers-reduced-motion` → transitions à 0 ms,
aucune animation d'entrée. Tous les composants exposent `role`, `aria-label`,
navigation clavier (Tab, flèches, Entrée/Espace) et un titre visible.

### `AnatomyMap` — où ça se manifeste
- **Pédagogie** : la Fallvorstellung commence par « Der Patient stellte sich
  mit … vor » ; localiser les signes sur une silhouette fixe l'ordre de
  l'examen clinique (Leberhautzeichen, Aszites, Ödeme).
- **Consomme** : hotspots ← `klinik` / `redFlags`.
- **Interactions** : clic ou Entrée sur une région → panneau latéral avec le
  libellé et la citation source ; survol/focus → surlignage ; flèches
  gauche/droite parcourent les hotspots ; `tone: 'signal'` marque un red flag.
- **Vide/fallback** : < 2 hotspots résolus → non rendu. Silhouettes : trois
  figures SVG internes (`body`, `torso`, `abdomen`) avec régions nommées
  (`RegionId`, énumération fermée ≈ 24 régions).

### `DecisionTree` — comment on tranche
- **Pédagogie** : les questions Arzt-Arzt « Wie unterscheiden Sie … ? » et
  « Welche Diagnostik in welcher Reihenfolge ? » sont des arbres.
- **Consomme** : nœuds ← `klinik`, `differenzialdiagnosen`, `diagnostik`.
- **Interactions** : les branches sont repliées au-delà du niveau 1 ; clic /
  Entrée déplie un nœud ; Échap replie ; « Alles aufklappen » (bouton) ;
  feuille `tone: 'signal'` = issue d'urgence.
- **Vide/fallback** : racine sans branche résolue → non rendu ; branche
  non résolue → élaguée (le validateur interdit ce cas en CI ; au runtime
  seul un décalage de contenu publié peut le produire).

### `SyndromeMap` — ce qui constitue le tableau
- **Pédagogie** : un syndrome (Depression, Zirrhose) se récite par axes :
  Hauptsymptome / Zusatzsymptome / somatisches Syndrom / Red Flags.
- **Consomme** : `klinik`, `klassifikation`, `redFlags`.
- **Interactions** : rayons repliés sur mobile (liste accordéon), déployés en
  étoile ≥ 768 px ; clic sur un rayon le met en avant et grise les autres.
- **Vide/fallback** : < 3 rayons résolus → non rendu.

### `Timeline` — dans quel ordre / à quel stade
- **Pédagogie** : « Was passiert, wenn … ? » — enchaînement des
  complications ou des étapes diagnostiques.
- **Consomme** : `diagnostik` (axe `schritt`), `redFlags`/`prognose`
  (axe `zeit` ou `stadium`).
- **Interactions** : points focalisables ; clic ouvre `detail` sous l'axe ;
  axe horizontal ≥ 640 px, vertical en dessous.
- **Vide/fallback** : < 3 points → non rendu.

### `CompareTable` — ce qui distingue
- **Pédagogie** : différencier deux entités voisines (stabile/instabile AP,
  Depression/Dysthymie/Bipolar) est la question DD type.
- **Consomme** : `differenzialdiagnosen` (+ `klinik` pour la colonne de la
  pathologie elle-même).
- **Interactions** : entête collant ; clic sur une ligne la surligne ; sur
  mobile, les colonnes deviennent des cartes empilées par critère.
- **Vide/fallback** : < 2 lignes → non rendu.

### `TherapyToggles` — quelle ligne de traitement
- **Pédagogie** : « Wie behandeln Sie ? » attend l'ordre : Anfall → Basis →
  Dauer → Revaskularisation. Le toggle force à nommer la section avant d'en
  lire le contenu.
- **Consomme** : `therapie[].items` **lus depuis la fiche** (jamais recopiés)
  via `ref.label`.
- **Interactions** : groupe `role="tablist"` ; flèches gauche/droite changent
  d'onglet ; `akut` reçoit la teinte `signal` ; onglet par défaut = `default`.
- **Vide/fallback** : une option non résolue est retirée ; < 2 options → non
  rendu et la section Therapie reste dépliée.

### `ScoreGauge` — combien de points, quel stade
- **Pédagogie** : Child-Pugh, CURB-65, GOLD… sont *toujours* demandés avec
  leurs critères et leurs bornes ; les manipuler ancre les seuils.
- **Consomme** : `klassifikation[].name` (titre + `inhalt` en légende).
- **Interactions** : `interactive: true` → chaque critère est un groupe de
  boutons radio (`points[]`) ; total en `Readout` mono ; bande courante
  surlignée ; `signal` pour la bande la plus grave. Reset. Pas d'état
  persisté.
- **Vide/fallback** : `criteria` vide → jauge statique des bandes seules ;
  `ref` non résolue → non rendu.

## 6. Généralisation — `content-fachwissen-visualizer`

**Brief type** (un fichier par fiche, envoyé par `build-*` ou un pipeline
contenu ultérieur) :

1. Entrée : `fwId`, la fiche (extrait `grep -n`/`sed -n`, jamais le fichier
   entier), `types.ts`, un spec pilote comme exemple, ce spec §4–§5.
2. Question unique : « Que faut-il *montrer* plutôt qu'écrire ? » — choisir
   1 à 4 blocs parmi les 7, chacun avec sa justification orale (quelle
   question Arzt-Arzt il prépare).
3. Règles : chaque libellé cite la fiche (`source`) ; `'ergänzt'` seulement
   si indispensable et signalé dans le rapport ; `replaces` déclare ce qui se
   replie ; allemand clinique ; aucune abréviation non présente dans la fiche.
4. Sortie : `app/src/data/fachwissenVisuals/<fwId>.ts` + ligne dans
   `index.ts` + `node scripts/checkFachwissenVisuals.mjs` **code de sortie 0**.
5. Relecture : `content-*` relit la liste `ergänzt` et ajoute à
   `reviewed.ts` ce qu'il accepte ; sinon le visualizer réécrit.

**Validateur `checkFachwissenVisuals.mjs`** : charge `seedFachwissen.ts` et
`fachwissenVisuals/index.ts` via esbuild (pattern `loadCases.mjs`), applique
les contraintes §4.3, imprime un rapport par fiche et sort **1** au premier
manquement. Branché dans `quality.yml` après `checkTherapieLabels.mjs`
(proposition à `main`, le workflow est hors périmètre).

Heuristique de choix (aide, pas règle) : `klassifikation` avec points →
`score-gauge` ; ≥ 2 DD avec critères symétriques → `compare-table` ;
`klinik` avec `atypisch` marquant une bascule → `decision-tree` ; ≥ 4
sections `therapie` → `therapy-toggles` ; `redFlags` qui s'enchaînent →
`timeline` ; signes cutanés/abdominaux/thoraciques → `anatomy-map` ;
syndrome psychiatrique ou multi-organes → `syndrome-map`.

## 7. Identité — reconnaissable sans logo

- **Couleurs** : structure en pétrole (`brand-600` traits, `brand-50` fonds
  clairs, `brand-900/25` sombres) ; **un seul** accent coral par bloc, réservé
  au point de bascule ; neutres `paper`/`ink`. Jamais de vert/rouge
  sémaphore (le rose/ambre de la page restent aux encarts existants).
- **Typographie** : titres en `font-display`, corps `font-sans`, **tout
  chiffre, score, stade, unité en `font-mono`** (IBM Plex Mono, tracking
  0,16 em pour les eyebrows).
- **Grille** : fond millimétré 8 px sur chaque bloc ; nœuds et cellules
  alignés sur la grille ; coins `rounded-lg`, traits 1,5 px.
- **Formes** : nœud = rectangle ; question = rectangle à bord gauche
  pétrole 3 px ; issue d'urgence = même rectangle à bord coral ; arêtes
  orthogonales (jamais courbes) ; hotspots = cercle 10 px + anneau au focus.
- **Icônes** : SVG uniquement (`components/icons.tsx`) ; jamais d'emoji.
- **Mouvement** : transition `fluid` 200 ms sur dépliage ; nulle sous
  `prefers-reduced-motion`.
- Référence : skill `dataviz` si disponible pour l'agent (non présent dans
  `.claude/skills` au 2026-09-16 — les règles ci-dessus font foi).

## 8. Hors périmètre explicite

- Higgsfield, héros, illustrations statiques, images raster ou PNG/SVG
  importés depuis l'extérieur.
- `app/src/characters/`, `app/src/features/akademie/`, `public/voice-demo`.
- Toute migration, table ou fonction Supabase ; toute synchronisation.
- Toute coupe ou réécriture dans `seedFachwissen.ts` (proposition de diff à
  `main` uniquement) ; toute modification de `quality.yml` (proposition).
- Visuels dans les cas (`seedCases.ts`), dans les Aufklärungen, dans la
  simulation.
- Les 131 fiches non pilotes (produites ensuite par le visualizer, §6).
- Un éditeur visuel de specs ; le stockage d'état utilisateur.

## 9. Intégration dans `FachwissenDetailPage`

- `useVisualSpec(fw)` renvoie `{ blocks: ResolvedBlock[], collapsed: Set<RefKey> }`.
- **Insertion** : chaque bloc résolu s'insère **juste avant** la `Section`
  nommée par `anchor`, dans la colonne principale, dans une `Section` au même
  gabarit (`card card-accent`) avec un eyebrow mono « Visuell ».
- **Repli** : la section source dont *toutes* les entrées sont dans
  `collapsed` s'affiche en `<details>` (résumé « Text anzeigen · N Punkte ») ;
  une section partiellement repliée garde les entrées non couvertes dépliées
  et replie les autres dans le même `<details>`.
- **Sans spec** (`index[fw.id]` absent) : la page est **strictement
  inchangée** (snapshot DOM identique, AC-13).
- **Dégradé** : bloc non résolu → absent ; ses `replaces` ne replient rien ;
  `console.warn('[visuals] …')` en `import.meta.env.DEV` seulement.
- Colonne latérale, Merksatz, encarts Red Flags/Prüfungsfallen : non
  modifiés. Les `AutoLink` continuent d'opérer sur le texte replié.

## 10. Les trois pilotes

### `fw-khk` — Angina pectoris / KHK (Kardiologie)
Pourquoi : fiche la plus « embranchée » — stable/instable est LA question
(`askedInExam[1]`), la thérapie a 4 sections ordonnées, pas de
`klassifikation` ni `redFlags` (le pilote prouve qu'on visualise sans score).
1. `decision-tree` « Stabil oder instabil ? » — racine : « Retrosternales
   Druck-/Engegefühl » ; branches : belastungsabhängig/reproduzierbar →
   *stabile AP* (source `klinik`) · neu/in Ruhe/zunehmend → *ACS – Notfall*
   (`klinik` atypisch, tone `signal`) ; sous-branche ACS : Troponin/EKG →
   NSTEMI vs STEMI (`differenzialdiagnosen` « Akuter Myokardinfarkt / ACS »).
   `replaces` : les deux entrées `klinik` stable/instable + la DD ACS.
   `anchor: 'klinik'`.
2. `compare-table` « KHK vs. Differenzialdiagnosen » — colonnes : KHK ·
   DD ; lignes = les 5 `differenzialdiagnosen` (critère = `unterscheidung`).
   `replaces` : les 5 DD. `anchor: 'differenzialdiagnosen'`.
3. `therapy-toggles` — 4 options = les 4 `therapie[].label` (Kupierung
   `akut`, Basistherapie, Dauertherapie, Revaskularisation), `default: 0`.
   `replaces` : les 4 sections. `anchor: 'therapie'`.

### `fw-leberzirrhose` — Leberzirrhose (Gastroenterologie)
Pourquoi : score à points canonique (Child-Pugh), complications qui
s'enchaînent, signes cutanés localisables.
1. `score-gauge` « Child-Pugh » — `ref` klassifikation « Child-Pugh » ;
   critères : Bilirubin, Albumin, INR, Aszites, Enzephalopathie (points
   1/2/3 chacun) ; bandes A 5–6, B 7–9, C 10–15 (C en `signal`). Les seuils
   numériques par critère ne sont **pas** dans `inhalt` → `source: 'ergänzt'`
   sur `criteria`, à relire par `content-*` (§4.3). `replaces` :
   klassifikation « Child-Pugh ». `anchor: 'klassifikation'`.
2. `timeline` axe `stadium` « Dekompensation » — 4 points = les 4
   `redFlags` (Varizenblutung, Enzephalopathie, SBP, hepatorenales Syndrom),
   tous `signal` ; `merke` = `merksatz`. `replaces` : les 4 redFlags.
   `anchor: 'redFlags'` (le bloc s'insère en colonne principale avant
   Klassifikation ; l'encart latéral Red Flags se replie).
3. `anatomy-map` figure `body` « Leberhautzeichen & Stauung » — hotspots :
   Ikterus (Sklera), Spider naevi (Thorax), Palmarerythem (Hände), Caput
   medusae/Aszites (Abdomen), Beinödeme (Unterschenkel), Flapping tremor
   (Hände, `signal`). `replaces` : les entrées `klinik` correspondantes.
   `anchor: 'klinik'`.

### `fw-depression` — Depression (Psychiatrie)
Pourquoi : syndrome par axes, 9 DD, thérapie en 3 lignes dont une de crise.
1. `syndrome-map` centre « Depressive Episode ≥ 2 Wochen » — rayons :
   Hauptsymptome / Zusatzsymptome / Somatisches Syndrom (source
   `klinik`), Schweregrad (klassifikation « ICD-10 F32 — Schweregrad »),
   Red Flags (`redFlags`, `signal`). `replaces` : entrées `klinik` citées +
   klassifikation Schweregrad. `anchor: 'klinik'`.
2. `therapy-toggles` — 3 options : Psychotherapie & Basismaßnahmen ·
   Pharmakotherapie · Bei Therapieresistenz / Krise (`akut`). `replaces` :
   les 3 sections. `anchor: 'therapie'`.
3. `compare-table` « Depression · Dysthymie · Bipolar » — 3 colonnes ;
   lignes Dauer, Verlauf, Manie/Hypomanie, Schweregrad, sources = DD
   « Bipolare affektive Störung », « Dysthymie » + klassifikation
   « Verlaufsformen ». `replaces` : ces 2 DD + « Verlaufsformen ».
   `anchor: 'differenzialdiagnosen'`.

Couverture : les 7 formes apparaissent au moins une fois sur les 3 pilotes
(decision-tree, compare-table ×2, therapy-toggles ×2, score-gauge, timeline,
anatomy-map, syndrome-map).

## 11. Erreurs et cas limites

| Cas | Comportement |
|---|---|
| Fiche absente de Dexie (tier) | page inchangée (« Chargement… ») — le visuel n'est jamais rendu seul |
| Ref introuvable (fiche republiée) | bloc masqué, texte déplié, warn dev |
| Deux blocs replient la même entrée | CI rouge (validateur) |
| `'ergänzt'` hors liste blanche | CI rouge |
| Écran < 390 px | tous les blocs en pile verticale, aucun scroll horizontal |
| JS désactivé / erreur de rendu | `ErrorBoundary` par bloc → section texte dépliée |
| Mode sombre | tokens `ink`, grille 0,05 ; contraste ≥ 4,5:1 mesuré |

## 12. Sécurité

Contenu statique, aucune entrée utilisateur persistée, aucun `dangerouslySetInnerHTML`,
aucun appel réseau. Les libellés passent par `AutoLink` (texte, pas HTML).

## 13. Tests

- **Unitaires (vitest, `src/`)** : `resolve.ts` (chaque variante de
  `SectionRef`, échec propre) ; `useVisualSpec` (repli calculé, dégradé) ;
  un test de rendu par composant avec données minimales et vides.
- **Validateur CI** : `checkFachwissenVisuals.mjs` sur les 3 pilotes, plus
  un test négatif (fixture avec ref cassée → code 1).
- **Navigateur (`playwright-cli`, port 5107, session `fachwissen-visuals`)** :
  mesures **depuis le DOM de l'app** (jamais via `import("/src/…")`) :
  présence des blocs, `<details>` fermés, clavier, `prefers-reduced-motion`,
  390 px, dark.

## 14. Critères d'acceptation (testables)

- **AC-1** `node app/scripts/checkFachwissenVisuals.mjs` sort 0 sur les 3 pilotes ; une fixture à ref cassée fait sortir 1.
- **AC-2** `npm run typecheck` passe ; `types.ts` refuse à la compilation un `kind` inconnu et un `replaces` mal typé (test `// @ts-expect-error`).
- **AC-3** Sur `/fachwissen/fw-khk`, le DOM contient `[data-visual="decision-tree"]`, `[data-visual="compare-table"]`, `[data-visual="therapy-toggles"]`, dans cet ordre, chacun avant la `Section` de son `anchor`.
- **AC-4** Sur `/fachwissen/fw-leberzirrhose`, `[data-visual="score-gauge"]`, `[data-visual="timeline"]`, `[data-visual="anatomy-map"]` sont présents ; sur `fw-depression`, `syndrome-map`, `therapy-toggles`, `compare-table`.
- **AC-5** Sur `fw-khk`, la section Therapie est rendue dans un `<details>` fermé (`open` absent) dont le résumé contient « Text anzeigen » ; après clic, les 4 labels d'origine sont visibles et identiques mot pour mot à `therapie[].label`.
- **AC-6** Sur une fiche sans spec (ex. `fw-pankreatitis`), le `innerHTML` de la colonne principale est identique à celui de `main` (snapshot) — aucun `[data-visual]`, aucun `<details>` supplémentaire.
- **AC-7** Un test unitaire qui fournit une fiche où le `label` visé par un `therapy-toggles` a été renommé rend la page **sans** ce bloc et **avec** la section Therapie dépliée ; aucune exception levée.
- **AC-8** `ScoreGauge` Child-Pugh : sélectionner 3 points à chaque critère affiche `15` dans un élément `font-mono` et la bande « C » porte `data-active="true"` ; le reset revient à la bande la plus basse.
- **AC-9** `TherapyToggles` : `role="tablist"`, flèche droite déplace `aria-selected` sur l'onglet suivant ; l'onglet `akut` porte une classe `signal`.
- **AC-10** `DecisionTree` : au chargement, seules les branches de niveau 1 sont visibles ; Entrée sur un nœud déplie ; « Alles aufklappen » rend visibles tous les nœuds (`count == spec.nodes`).
- **AC-11** `AnatomyMap` : chaque hotspot est un `button` focalisable avec `aria-label` ; flèche droite déplace le focus ; Entrée ouvre le panneau contenant le libellé source.
- **AC-12** Sous `prefers-reduced-motion: reduce` (émulé), aucune propriété `transition-duration` > 0 ms n'est calculée sur un `[data-visual] *` au dépliage.
- **AC-13** À 390 px de large, `document.documentElement.scrollWidth <= 390` sur les 3 pilotes.
- **AC-14** Aucun caractère emoji (plages `\p{Extended_Pictographic}`) dans `data/fachwissenVisuals/**` ni dans le DOM rendu des blocs (test unitaire + grep CI).
- **AC-15** Contraste texte/fond ≥ 4,5:1 sur les nœuds, cellules et readouts en clair et en sombre (mesure axe-core ou calcul depuis `getComputedStyle`).
- **AC-16** Chaque bloc porte un `<h3>` visible, `role="region"` et `aria-label`; les blocs ne contiennent pas d'`<img>`.
- **AC-17** Tous les libellés avec `source: 'ergänzt'` des pilotes sont listés dans `reviewed.ts` ; le validateur échoue sinon (test négatif).
- **AC-18** `git diff main -- app/src/data/seedFachwissen.ts app/src/characters app/src/features/akademie .github/workflows` est vide sur la branche.

## 15. Impacts sur l'existant

- `FachwissenDetailPage.tsx` : + insertion et repli (~40 lignes) ; extraction
  possible de `Section` vers `visuals/primitives.tsx` si la limite 500 lignes
  approche.
- `quality.yml` : **proposition** d'une étape `checkFachwissenVisuals.mjs`.
- `CONTEXT.md` : termes §17 (proposition, pas d'édition).
- Contrats : `docs/contracts/fachwissen-visuals.md` à produire par
  `arch-fachwissen-visuals` (schéma §4, règles §4.3, validateur §6).
- Aucun impact Supabase, Stripe, sync, crédits.

## 16. Red-team — hypothèses non dites, trous

| # | Hypothèse / trou | Statut |
|---|---|---|
| R1 | Le contenu publié (Dexie) peut diverger du bundle : une fiche republiée après un renommage de label rend le bloc muet. | **Fermé** par D3 + D7 + AC-7 ; reporté (T1) : afficher un badge dev « spec désynchronisée ». |
| R2 | Child-Pugh à points exige des seuils absents de `inhalt` (Bilirubin < 2 / 2–3 / > 3 mg/dl…). Le visualizer « inventerait ». | **Fermé** par D8 + `reviewed.ts` + AC-17 : `ergänzt` bloquant tant que non relu. |
| R3 | L'accent coral « unique par bloc » est violé par Timeline Zirrhose (4 points signal). | **Fermé** : sur `timeline`, `signal` marque l'axe entier (bande), pas chaque point ; règle ajoutée §7 à préciser par `ux` lors du plan. |
| R4 | `anchor: 'redFlags'` place un bloc en colonne principale alors que l'encart est latéral : où se replie l'encart ? | **Fermé** §9 : l'encart latéral devient le `<details>` ; le bloc s'insère avant Klassifikation. Reporté (T2) : valider en revue UX. |
| R5 | Silhouettes SVG : qui les dessine ? Elles ne sont pas des « illustrations statiques » ? | **Fermé** : figures = chemins SVG internes, régions nommées, teintées par tokens — code, pas image. Reporté (T3) : ≈ 24 régions à fixer par `arch`/`ux`. |
| R6 | 3 blocs par fiche × 134 fiches = charge bundle. | **Fermé** : specs ≈ 3–6 Ko chacune ; `index.ts` en import statique acceptable jusqu'à ~50 fiches ; reporté (T4) : `import()` paresseux par fiche ou publication Supabase au-delà. |
| R7 | Le repli cache du texte que `checkTherapieLabels.mjs` compare : le validateur lit le fichier, pas le DOM → aucun effet. | **Fermé**, vérifié (`readFileSync` sur `seedFachwissen.ts`). |
| R8 | `AutoLink` sur les libellés des visuels crée des liens glossaire dans un SVG. | **Fermé** : `AutoLink` uniquement dans les panneaux HTML (détail, cellules), jamais dans `<text>` SVG. |
| R9 | Mobile : un arbre de 12 nœuds ne tient pas en 390 px. | **Fermé** : branches repliées par défaut + pile verticale ; AC-13. |
| R10 | `pedagogy-*` doit-il relire ? Ce spec touche la pédagogie sans gamification ni prix. | **Fermé** : handoff vers `arch` (schéma/contrat) ; `pedagogy` consulté en revue (étape 5), pas en veto. |
| R11 | Fallvorstellung « Muster » (`caseMuster.ts`) : les visuels devraient-ils aussi apparaître dans les cas ? | **Reporté (T5)** : hors périmètre §8. |
| R12 | Impression / export PDF de la fiche. | **Reporté (T6)** : `<details>` s'imprime fermé ; règle `@media print { details { open } }` à décider. |

Trous reportés (à ouvrir comme issues par `plan-*`) : T1–T6.

## 17. Termes nouveaux pour `CONTEXT.md` (proposition, pas d'édition)

- **Bloc visuel** — unité rendue par code depuis une spec typée, d'une des 7 formes, ancrée avant une section de fiche.
- **Spec visuelle** — fichier `fachwissenVisuals/<fwId>.ts` déclarant 1–4 blocs pour une fiche Fachwissen.
- **Déchargement** — repli (jamais suppression) d'une entrée de fiche couverte par un bloc visuel ; réversible par « Text anzeigen ».
- **Référence de section** (`SectionRef`) — pointeur stable vers une entrée de fiche par clé (label, name, stufe, dd, texte).
- **Ergänzt** — libellé porté par un visuel sans source dans la fiche ; interdit en CI tant qu'il n'est pas dans `reviewed.ts`.
- **Point de bascule** — l'unique élément d'un bloc teinté coral (`signal`) : urgence, stade le plus grave, réponse qui change la conduite.
- **Readout** — valeur, score ou stade affiché en IBM Plex Mono.
