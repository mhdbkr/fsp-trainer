# Audit identité visuelle & mouvement — app, série 3 (30 sept. 2026)

> Audit lecture seule. Charte lue : `app/docs/DIRECTION-STYLE.md`,
> `app/tailwind.config.js`, `app/src/styles/index.css`.

## 0. La charte se contredit elle-même
`index.css:221-231` écrit : « le verre n'habille QUE la couche navigation (sidebar, topbar,
dock, FAB) — JAMAIS le contenu ». Or `.card` (`index.css:88-97`) **est déjà du verre**
(blur 16, saturate 160 %, liseré `::after`). Il y a donc **deux matériaux verre** et un
commentaire qui prétend qu'il n'y en a qu'un. Racine de l'incohérence : tout ce qui n'est ni
`.card` ni `.glass` (un `border-slate-200` nu) devient un **troisième matériau non nommé**.

`DIRECTION-STYLE.md:45-51` rejette « boutons génériques » et « blocs imposants ».
`DIRECTION-STYLE.md:119-124` : le flip de carte entière **a été validé** ; les pastilles de
choix dans la boîte d'action principale **ont été rejetées**.

## 1. Surfaces qui cassent l'identité

### 1.1 Boutons à fond blanc
| Lieu | Classe | Pourquoi ça jure |
|---|---|---|
| `HomePage.tsx:102` | `btn … bg-white px-6 py-3 text-base font-bold text-brand-700` | **Le pire cas** : CTA du hero « Session du jour », posé sur le dégradé `from-brand-600 to-brand-800` (`:88`). Rectangle blanc pur, hors de tout token (le blanc de la charte est `paper #f4f5f2`, `tailwind.config.js:24`). Aucune variante `.btn-*`. Pas de `dark:`. |
| `ModeChooser.tsx:32,35` | `bg-white text-brand-800 ring-1 ring-slate-200` | Les 4 pastilles de choix de Teil en ton `card` sont **plates et blanches**, zéro élévation, zéro verre — alors que le composant **sait faire du verre** (branche `tone='glass'`, mêmes lignes). |
| `SimulationRunner.tsx:476`, `VorstellungGuide.tsx:56` | `bg-slate-900 text-white … dark:bg-white` | « Mode focus » en **noir/blanc purs** : ni `brand`, ni `signal`, ni `ink` (`slate-900` ≠ `ink #0c1a17`, `tailwind.config.js:25`). Dupliqué, donc pas de composant. |
| `DrillPage.tsx:117-118` | `bg-white shadow-sm dark:bg-slate-700` | **Réimplémente `.seg`** (`index.css:327-333`) à la main, sans `aria-pressed`, avec `slate-700/800` au lieu d'`ink`. |
| `CaseDetailPage.tsx:55,58` · `PatientScreen.tsx:46-47` · `ProgramPage.tsx:208,463` | idem | **Cinq réimplémentations supplémentaires** du même segmenté, cinq jeux de neutres différents. |

**Transversal** : `bg-white` apparaît **38 fois** hors tests ; `slate-*` sert de neutre sombre
à la place d'`ink-*` dans la majorité des cas, alors qu'`ink` est le neutre d'identité
déclaré (`tailwind.config.js:25-26`). C'est le « générique » de `DIRECTION-STYLE.md:16`.

### 1.2 Cartes plates
**44 occurrences** de `rounded-{lg,xl,2xl} border border-slate-200` — un conteneur qui
*ressemble* à une carte sans être `.card` : pas de verre, pas de liseré, pas d'ombre, pas de
token de rayon. Les plus coûteuses :
- `HomePage.tsx:126` — **les lignes « À faire aujourd'hui »**, le bloc le plus regardé :
  `rounded-lg border border-slate-200 px-3 py-2`. Aucun hover, aucune élévation, aucune
  transition. Ligne de tableau, pas d'objet.
- `HomePage.tsx:195` — « Points faibles », `hover:border-brand-400` seul (la couleur change,
  rien ne bouge).
- `ProgramPage.tsx:360` (**`BlockRow`**, l'unité atomique du Programme) et `:137`. Séparateur
  interne `:374` en `border-t border-slate-100` — encore un neutre différent.
- `AnamneseBogen.tsx:20` — `rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm`.
  **Le document que le candidat remplit pendant toute l'Anamnese.** `border-2` (seule
  occurrence de l'app), `bg-white` opaque, `shadow-sm` générique. 12 références
  `border-slate-*` dans 93 lignes, **0 `.card`, 0 token, 0 transition**. Surface la plus
  longuement regardée de l'app et la plus éloignée de la charte.
- `PreSimulationPage.tsx:40` — `bg-white/60` **sans `backdrop-filter`** : translucide sans
  être du verre. **Le pire des deux mondes** sur le fond à grille — on perd l'opacité *et* on
  n'obtient pas la réfraction.
- `PreSimulationPage.tsx:45` — `border-brand-200 bg-brand-50/50` : bloc teinté « imposant qui
  se fait trop remarquer » (`DIRECTION-STYLE.md:46`) pour deux boutons.

### 1.3 Les flips
- `SimulationHub.tsx:78-119` `FlipCaseCard` — **conforme** au patron validé
  (`DIRECTION-STYLE.md:119-122`) : carte entière (`:88`, `duration-500 ease-fluid`,
  `motion-reduce:transition-none`), verso `glass glass-edge` (`:101`), `ModeChooser
  tone="glass"` monté seulement quand `flipped` (`:113`).
- `PreSimulationPage.tsx:40-42` — **le même `ModeChooser` sans flip, en ton `card`**, donc en
  aplat blanc. Le candidat qui arrive par le Hub voit le choix en verre ; celui qui arrive par
  le programme le voit en aplat blanc. **Deux identités pour le même choix.**

Défauts propres au flip :
- `SimulationHub.tsx:88` — conteneur `grid` + `preserve-3d` : **les deux faces sont montées en
  permanence** (contrairement à `CardFlip.tsx:48` qui conditionne le verso). Le verso en
  `glass` est composité en continu sur chaque carte — coût GPU inutile, et `backdrop-filter`
  sur une face à 180° rend de façon instable selon le navigateur.
- `SimulationHub.tsx:90` recto `.card` (blur 16) + `:101` verso `.glass` (blur 20) →
  **empilement de deux plans de verre**, explicitement interdit par `index.css:225-227`.
- `ModeChooser.tsx:47,50` — `animate-split-{l,c,r}` rejouent **à chaque montage** avec
  `animationDelay` 120–200 ms. Au Hub c'est le geste voulu ; en pré-simulation
  (`PreSimulationPage.tsx:41`) le composant est monté au chargement, donc les trois pastilles
  « se divisent » **sans qu'aucune action ne l'ait déclenché**. L'animation raconte un geste
  qui n'a pas eu lieu.

### 1.4 Le bouton « Entrer — X seule » (`PreSimulationPage.tsx:47`)
1. **Le libellé change de longueur du simple au double** (`Entrer en simulation` 20 car. →
   `Entrer — Fallvorstellung seule` 30 car.) sans largeur réservée : le bouton et la barre
   `flex-wrap` (`:45`) **sautent** à chaque clic de pastille ; sur mobile la barre passe de 1
   à 2 lignes.
2. **Le tiret cadratin comme séparateur sémantique** — même anti-pattern que les étiquettes
   de tâche (§4) : deux informations de nature différente fondues dans une chaîne.
3. `font-bold text-base px-8 py-3` **surcharge `.btn-primary`** (`index.css:139-142`, calibré
   `text-sm font-medium px-3 py-2`) : **2,5× la taille du token**.
4. Le mot « seule » est **redondant** avec le ModeChooser affiché 5 px au-dessus, qui montre
   déjà la pastille sélectionnée en `bg-brand-600 text-white` (`ModeChooser.tsx:34`).

## 2. La matière disponible

| Primitive | Lieu | État |
|---|---|---|
| `.glass` | `index.css:232-248` | Complète : blur 20 / sat 180, liseré, variante sombre, **repli `prefers-reduced-transparency`** (`:275-278`) et **repli `@supports not backdrop-filter`** (`:279-282`). Excellente. |
| `.glass-edge` | `index.css:252-267` | Liseré spéculaire par masque `xor`. Correct. |
| `.glass-tint` | `index.css:271-272` | **Déclarée, jamais utilisée.** Token mort. |
| `.card` | `index.css:88-134` | Verre à 0,72 + `::after` + `.card-interactive`. Replis a11y présents. |
| `.dim-tag` / `.dim-tag-xl` | `index.css:172-188` | **La seule vraie étiquette premium** : dégradé 135°, `blur(10px) saturate(160%)`, bordure `brand` 0,45, **triple ombre**. **C'est l'anatomie à réutiliser au §4.** |
| `.seg` / `.seg-scale` / `.seg-focus` / `.seg-xl` | `index.css:327-339` | Complet, `aria-pressed`, variante `data-hot`. **Contourné 6 fois.** |
| `.chip`, `.mono-tag`, `.idx`, `.kbd`, `.label`, `.eyebrow` | `index.css:147,163-168,216,219` | Aplats. Pas de matière. |

**Tokens manquants** : **aucun token de rayon** (4 valeurs Tailwind au hasard) et **aucun
token d'élévation** (`shadow-sm/md/lg/xl/2xl` + 7 `box-shadow` littéraux dans `index.css`).
`packages/tokens/tokens.json` déclare `radius.card: 0.75rem` et `radius.control: 0.5rem` —
**l'app ne les consomme pas**, elle s'y conforme par hasard.

**Dégradés** : `body` (`index.css:30-38`) porte 4 radiaux d'ambiance + grille 30 px,
`background-attachment: fixed`. **La meilleure idée graphique de l'app** — et quasi invisible,
parce que tout le contenu est empilé en aplats opaques par-dessus : **le blur du verre n'a
rien à réfracter**.

### 2.2 Ce que le site apporte
Le canal existe déjà : `packages/tokens/` (`@doctopus/tokens`) avec `tokens.json`, `build.mjs`
et `scripts/check-parity.mjs` qui **échoue en CI si `tokens.json` dérive de l'app**. Autrement
dit : **les tokens sont copiés de l'app vers le paquet ; l'app ne les lit pas.** `tokens.json`
contient déjà `glass.{blur,saturate,light,dark,tint}`, `motion.{easeFluid,easeOut,durationFast,duration}`,
`radius.{card,control}`.

| Signature du site | Lieu | Réutilisable ? | Coût |
|---|---|---|---|
| Caustiques WebGL du hero | `Hero.astro:21` + `scripts/home/hero.ts` (295 l.) | **Non.** Boucle WebGL plein écran ; une app ouverte 40 min/jour ne peut pas la payer. | Rédhibitoire |
| **`.glass-capsule` / `.glass-panel`** | `doctopus-site/apps/site/src/styles/global.css:83-102` | **Oui, la recette** : blur 24-26 / sat 175, `border-top-color` **plus clair** (0,34 vs 0,12) → la lumière vient d'en haut, et **aucune ombre portée** (verrouillé par `glass.test.mjs`). Plus disciplinée que `.glass` de l'app, qui garde `0 10px 34px -14px`. | ~8 lignes CSS, mais **arbitrage de charte** à soumettre |
| Pile `depth-0…4` + `veil`/`lift` | `tokens.json`, `"$siteOnly": true` | **Le concept, pas les valeurs** : une teinte, luminosité décroissante, **profondeur jamais par ombre**. Comble exactement le manque §2. Valeurs sombres inadaptées au mode clair. | Moyen : **dériver** une pile claire |
| `@view-transition { navigation: auto }` | `global.css:191-204`, neutralisé sous reduced-motion | Mécanisme oui, syntaxe non (MPA vs SPA) — voir §3 | Nul |

**Verdict** : rien à dupliquer. Le seul geste structurant serait d'**ajouter `elevation` et
`radius` à `tokens.json` et de les faire consommer par `tailwind.config.js`** — ce qui
retourne le sens du flux sans casser `check-parity` (qui n'itère que sur `brand` et `signal`).

## 3. Le motion

**Bibliothèque : aucune.** Pas de framer-motion, pas de motion, pas d'auto-animate. Tout est
CSS. Mais **`react-router-dom` est en 6.30.4 et expose déjà `viewTransition?: boolean`** sur
`<Link>`, `useNavigate()` et `useLinkClickHandler`. **La View Transitions API est donc
disponible à coût zéro, sans nouvelle dépendance** — `grep -rn "viewTransition" src/` → **0**.

| Primitive | Lieu | Usages |
|---|---|---|
| Keyframes Tailwind (`fade-in`, `fade-in-fast`, `slide-in`, `pulse-line`, `pop`, `float`, `split-*`) | `tailwind.config.js` | 22 au total |
| `reveal-up` + `.reveal` + `.stagger` | `index.css:290,298-307` | `.reveal` ×13, **`.stagger` ×2 seulement** |
| `bl-draw` | `index.css:345-351` | `MusterModelPicker` uniquement |
| `progFade` | `ProgramPage.tsx:79` — **`<style>` inline dans le JSX** | 1 (`:468`) |
| `ease-fluid` | `tailwind.config.js` | 9, tous dans `SimulationRunner.tsx:238-317`, `SimulationHub.tsx:88`, `ImmersiveMode.tsx:263`, `MusterModelPicker.tsx:26` |
| `--ease-out`, `--dur-fast`, `--dur` | `index.css:8-10` | `--ease-out` ×3 ; **`--dur-fast` et `--dur` : 0. Variables mortes.** |

Le vocabulaire existe et il est bon (la condensation d'en-tête `SimulationRunner.tsx:238-317`
est du travail de qualité). Mais il est **concentré sur 2 écrans sur 12**. `transition-all`
apparaît **9 fois** sans durée ni courbe → 150 ms `ease` par défaut de Tailwind, jamais
`ease-fluid`. **Deux grammaires de mouvement cohabitent.**

**`prefers-reduced-motion`** : bien couvert (garde globale `index.css:69-76` + 37 `motion-*`),
**sauf les `animation-delay`** — `ModeChooser.tsx:47,50` pose 120–200 ms inline, donc sous
mouvement réduit les pastilles restent **invisibles 120–200 ms puis apparaissent d'un coup**
(`both` fill-mode). `index.css:71-75` devrait poser `animation-delay: 0ms !important`.

### 3.4 Transitions de page — confirmé : il n'y en a pas
`Shell.tsx:51` : `<div key={pathname} className="reveal …"><Outlet /></div>`.
C'est un **remontage forcé**, pas une transition :
1. `key={pathname}` **démonte l'arbre entier** de la page sortante et monte le suivant dans le
   même commit → disparition **instantanée**, aucun état de sortie, aucun fondu croisé, aucun
   élément partagé.
2. `.reveal` = `reveal-up 0.25s` — **entrée seule**.
3. Le remontage **jette tout l'état local** (scroll, accordéons, brouillons non persistés) et
   **relance tous les `useEffect`**, y compris les requêtes Dexie.
4. `.reveal` anime `transform` → le wrapper devient un **containing block** pour les
   descendants `position: fixed` : dette documentée en `index.css:285-289` avec son
   contournement (`components/Portal.tsx`) — **dette causée par la fausse transition**.

Même famille : `ProgramPage.tsx:468`, `WeekCalendar.tsx:101`, `PhraseLine.tsx:69-71`,
`AufklaerungPage.tsx:129`.

**Sortie à coût nul** : supprimer `key={pathname}` (règle aussi la dette `Portal`) + poser
`viewTransition` sur les `<Link>` + `::view-transition-*` sous `prefers-reduced-motion` —
contrat déjà écrit par le site (`global.css:198-204`).

### 3.5 Animations de listes — quasi inexistantes
`.stagger` n'est utilisé que **2 fois**, sur des conteneurs **statiques**
(`FachwissenDetailPage.tsx:144,276`) — jamais sur une vraie liste. Les listes qui changent
n'animent rien : `HomePage.tsx:119-137` (`key={i}` **index comme clé** sur une liste
régénérée à chaque `generateProgram`), `ProgramPage.tsx:131-152` (idem). `DrillPage.tsx:183`
pousse une carte en fin de file → le dénominateur change et la barre `:196` **recule**.

## 4. Étiquettes de tâche — la racine est dans le moteur, pas dans la vue

`lib/program.ts` construit des **chaînes concaténées** qui fondent titre et type :

| Ligne | Chaîne produite |
|---|---|
| `program.ts:167` | `'Examen à blanc — simulation complète'` |
| `program.ts:218` | `` `${wc.name} — ${t.label} seule` `` |
| `program.ts:252` | `` `${c.name} — ${t.label} seule` `` |
| `program.ts:268` | `` `${c.name} — Couche ${layer}` `` |
| `program.ts:278` | `` `Fachwissen : ${c.pathology}` `` |
| `program.ts:286` | `` `Drill · ${terms.due} dus + ${fresh} nouveaux (≈ ${estMin} min)` `` |
| `ProgramPage.tsx:259` | `` `Révision : ${c.name}` `` |
| `simScope.ts:47` | `` `${t.label} seule` `` (`scopeLabel`, réutilisé `SimulationHub.tsx:60`) |

**Le problème est structurel** : `ProgramBlock` (`db/types.ts:586-600`) porte **déjà** ces
données en champs typés — `kind`, `teil`, `layer`, `assistance`, `estMin`, `axis`, `specialty`,
`reason`, `phase`, `manual`. La concaténation **détruit une information que le type possède**,
puis la vue la ré-affiche à côté. D'où les redondances :
- `ProgramPage.tsx:364` affiche `b.label` (« Divertikulitis — Anamnese seule »)…
- …`:368` affiche juste dessous `{meta.label} · {b.estMin} min` → **le type est écrit deux
  fois** ;
- `:369` ajoute `Couche {b.layer} · {b.assistance}` alors que `b.layer` est **déjà dans le
  label** (`program.ts:268`).
- `HomePage.tsx:130-131` : même chose.

Drill : `program.ts:286` enterre les comptes dans le label ; `DrillPage.tsx:110` les écrit en
prose (5 données numériques en `text-slate-500`) alors que `.mono-tag` (`index.css:168`) et
`.tnum` (`:295`) existent ; `DrillPage.tsx:193` (`{idx+1} / {queue.length}`) n'a pas `tnum` →
**les chiffres changent de largeur de 9 à 10, la ligne sautille à chaque carte**.

### 4.2 Anatomie proposée (non codée)
L'espace est là : `BlockRow` occupe toute la largeur (jusqu'à `max-w-6xl` ≈ 1150 px) et le
titre est `truncate` (`ProgramPage.tsx:364`) **alors que la moitié droite est vide**.

Un seul objet `<TaskLabel block={b} />` dérivé de `ProgramBlock` — **plus aucune concaténation
dans `lib/program.ts`** (le champ `label` y devient le seul **nom du sujet**). Cinq zones :

```
[1 glyphe]  [2 sujet ─────────── ]  [3 portée]   [4 état]    [5 coût]   [action]
   ⬡        Divertikulitis          ANAMNESE     Couche 2    20 min     [Lancer]
                                                 · assisté
```

1. **Glyphe de type** — `meta.icon` + `meta.badge` (`ProgramPage.tsx:17-23`), **existe déjà**.
   Il porte `kind` entièrement : le mot « Simulation » de `:368` **disparaît**.
2. **Sujet** — le nom du cas seul, `font-medium`. Plus de tiret, plus de suffixe. Il gagne la
   largeur libérée → plus de `truncate` sur les noms courants.
3. **Portée (`teil`)** — **la pièce nouvelle, la seule qui mérite de la matière** : reprendre
   littéralement `.dim-tag` (`index.css:172-188`). Le mot est le Teil **seul**
   (`Anamnese`), jamais « seule » : la pastille *est* la marque de partialité. **Absente quand
   `teil` est `undefined`** → la simulation complète se lit à l'absence de pastille. Un glyphe
   par Teil (`TEILE[].icon`, déjà `dialog`/`document`/`present`, `simScope.ts:11-13`), comme
   le réclame `DIRECTION-STYLE.md:121-122`.
4. **État (`layer` + `assistance`)** — `.label` (`index.css:163`), aligné à droite, discret.
5. **Coût (`estMin`)** — `.mono-tag` + `.tnum` : **c'est une donnée**, donc mono — exactement
   le périmètre laissé au mono par la décision de charte du 17 sept. (`index.css:156-162`).
   Largeur tabulaire → plus de sautillement de 9 à 12 min.

**Drill** : même anatomie, la zone 3 devient une **paire de compteurs** (`12` en `brand` dus /
`8` en `slate` nouveaux) en `.mono-tag`+`.tnum` ; la phrase de `DrillPage.tsx:110` se réduit à
« Répétition espacée (SM-2), cartes bidirectionnelles. ».

**Gain** : une seule étiquette pour les **cinq lieux** qui concatènent aujourd'hui —
`ProgramPage.tsx:364`, `:144`, `HomePage.tsx:130`, `SimulationHub.tsx:60`,
`PreSimulationPage.tsx:47` — et ce dernier redevient « **Entrer en simulation** », largeur
constante (§1.4 points 1, 2 et 4 réglés d'un coup).

## 5. Drill — le mot suivant apparaît trop tôt

**Cause exacte.** `DrillPage.tsx:174-187` :
```tsx
const grade = async (g: Grade) => {
  const wasNew = card.srs.state === 'Neu';
  await rateTerm(card, g);   // ← 176 : écriture IndexedDB AVANT tout retour visuel
  …
  setRevealed(false);        // ← 185
  setIdx((i) => i + 1);      // ← 186 — MÊME BATCH REACT
};
```
et `CardFlip.tsx:40` : `transition-transform duration-500 … ${revealed ? '[transform:rotateY(180deg)]' : ''}`.

**Trois fautes cumulées :**

**(a) Aucune clé sur `<CardFlip>` (`DrillPage.tsx:199`).** Le composant n'est jamais remonté :
la carte N et la carte N+1 sont **le même nœud DOM**, donc le même élément en cours
d'animation.

**(b) `setRevealed(false)` et `setIdx(i+1)` sont dans le même batch React 18.** Un unique
commit retire `rotateY(180deg)` (→ transition de **500 ms**) **et** remplace `card` par la
suivante (`:167`). La face recto (`CardFlip.tsx:41-46`, `cardFront(card, direction)`)
**contient déjà le mot suivant au premier frame**.

Déroulé image par image :
- t=0 : rotation à 180°, `backface-visibility:hidden` masque le recto, on voit le verso.
- t=0 aussi : `CardFlip.tsx:48` `{revealed && (…)}` → `revealed` est **déjà `false`**, donc le
  **verso est vidé instantanément** : pendant 250 ms l'utilisateur regarde une **carte vide
  qui tourne**, la réponse qu'il vient de noter ayant disparu sans transition.
- t≈250 ms : passage par 90°, le recto devient visible — **il porte le mot suivant**, qui
  apparaît donc en pleine rotation, de biais.
- t=500 ms : immobilisation.

**(c) `await rateTerm(card, g)` (`:176`) précède le premier retour visuel.** Le délai
clic → début d'animation est la **latence IndexedDB, ~5 à ~60 ms selon la pression disque** :
d'un clic à l'autre le départ n'a pas le même timing — source du caractère **saccadé**,
indépendamment du bug de contenu.

**Aggravants** : `CardFlip.tsx:41` `aria-hidden={revealed}` repasse à `false` dès t=0 → un
lecteur d'écran **annonce le mot suivant 500 ms avant qu'il soit lisible**. Et
`DrillPage.tsx:183` (`setQueue([...q, …])` sur « Wieder ») change le dénominateur dans le même
frame → le compteur `:193` et la barre `:196` **reculent** pendant que la carte tourne.

**En une phrase** : il n'existe **aucun état de sortie** — deux états (`revealed` vrai/faux)
pour trois moments (question / réponse / passage). Le troisième n'est pas modélisé.

### 5.2 Le même bug ailleurs
Toutes reposent sur « animation d'entrée seule + démontage instantané » :
`Shell.tsx:51` (le plus visible, à chaque navigation) · `ProgramPage.tsx:468` ·
`WeekCalendar.tsx:101` · `PhraseLine.tsx:69-71` (le commentaire dit vouloir un remplacement
« en douceur » — c'est l'inverse qui se produit) · `PhraseControls.tsx:73,169,181` (apparition
animée, **disparition sèche**) · `AufklaerungPage.tsx:129,189` ·
**`ImmersiveMode.tsx:248` (strictement le même bug que le Drill, en mode focus)** ·
barres en `transition-all` sans durée : `DrillPage.tsx:196`, `ProgramPage.tsx:294`,
`VorstellungGuide.tsx:67`.

## 6. Écrans par temps passé × distance à la charte

| # | Écran | Temps | Distance | Pourquoi |
|---|---|---|---|---|
| **1** | `AnamneseBogen.tsx` | Très élevé (~20 min/session, actif) | **Maximale** | 93 l., **0 `.card`, 0 token, 0 transition** ; `bg-white` + `border-2 border-slate-300`, 12 `border-slate-*`. |
| **2** | `DrillPage.tsx` | Très élevé (quotidien, ~30 interactions) | Élevée | Bug §5 **à chaque carte** ; `.seg` réimplémenté (`:117`), `GradeBtn` (`:215-228`) sur 4 palettes hors charte (`rose`/`amber`/`emerald`/`sky`) sans `brand` ni `signal` ; comptes en prose (`:110`) ; compteur sans `tnum` (`:193`). |
| **3** | `SimulationRunner.tsx` | Très élevé (40 min) | Moyenne | Meilleur mouvement de l'app (`:238-317`) et 6 `.card`, mais **0 `glass`** sur la chrome, « Mode focus » en `bg-slate-900` (`:476`, dupliqué), modale QR (`:377`) posée à la main. |
| **4** | `HomePage.tsx` | Élevé (plusieurs fois/jour) | Élevée | CTA du hero en `bg-white` (`:102`) — **premier objet interactif vu chaque jour** ; listes plates (`:126`,`:195`), `key={i}`, **2 `transition-` en 287 lignes**. |
| **5** | `ProgramPage.tsx` | Élevé | Élevée | 587 l., **14 `border-slate-*`, 5 `bg-white`** ; 2 segmentés réimplémentés (`:208`,`:463`), menu `bg-white shadow-lg` (`:423`), keyframe inline (`:79`), 3 barres `transition-all`. |
| **6** | `PreSimulationPage.tsx` | Moyen mais **à chaque session** | Élevée | 92 lignes pour **4 surfaces contradictoires** ; `ModeChooser` en aplat blanc alors qu'il est en verre au Hub. **Distance/ligne la plus forte de l'app.** |
| **7** | `CaseDetailPage.tsx` | Moyen | Moyenne | 2 segmentés réimplémentés, `bg-white` ×3, **0 `transition-`, 0 `animate-`** en 192 lignes. |
| **8** | `FachwissenDetailPage.tsx` | Moyen | Moyenne | 462 l., 12 `border-slate-*` vs 7 `.card` ; **seul écran à utiliser `.stagger`** — sur des conteneurs statiques, donc inutile. |
| **9** | `ImmersiveMode.tsx` | Moyen | Moyenne | Bien animé (`ease-fluid` `:263`) mais `bg-slate-900/80 … backdrop-blur-xl` à la main (`:264`) au lieu de `.glass`. Bug §5.2 (`:248`). |
| **10** | `SimulationHub.tsx` | Moyen | **Faible** | **Le meilleur écran de l'app** : `glass glass-edge`, flip conforme, `ease-fluid`, `motion-reduce`. Restent l'empilement de verre et les deux faces montées (§1.3). **À propager, pas à corriger.** |
| **11** | `StatsPage.tsx` | Faible | Faible | 7 `.card`, 0 `bg-white`. Cohérent. |
| **12** | `FachbegriffePage.tsx` | Faible | Faible | 127 l., propre. |

**Ordre de priorité** : `AnamneseBogen` (1) et `DrillPage` (2) d'abord — les deux écrans où le
candidat passe le plus de temps **et** les deux plus éloignés de la charte. Puis
`PreSimulationPage` (6), le plus rentable au ratio lignes-touchées/gain (92 lignes, 4 défauts,
traversé à chaque session). Puis `HomePage` (4) pour le CTA blanc.
**`SimulationHub` ne se corrige pas : il se copie.**
