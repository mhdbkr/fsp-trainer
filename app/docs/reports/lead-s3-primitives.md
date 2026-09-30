# s3-primitives — tranche 1 (les primitives) · rapport de chantier

Branche `feat/s3-primitives`, base `eb493bb`. Writer unique : `lead-s3-primitives`.
Rôle : **implémenteur** (la relecture revient à `front-design-keeper`).
Date de la mesure : 30 sept. 2026.

---

## 1 · Les trois matériaux et leur règle

La règle précédente — « le verre n'habille QUE la navigation, JAMAIS le
contenu » — était fausse le jour où elle a été écrite : `.card` **est** du
verre. Deux matériaux, une règle qui n'en reconnaissait qu'un, et donc un
troisième matériau non nommé qui a proliféré sans surveillance.

| | Classe | Flou | Élévation | Emploi |
|---|---|---|---|---|
| 1 | `.glass` (+ `.glass-edge`, `.btn-glass`) | 20 px / sat 180 | e3 | La chrome qui FLOTTE au-dessus du contenu, et les moments. Rare. |
| 2 | `.card` | 16 px / sat 160 | e1 (e2 au survol si `.card-interactive`) | L'objet de contenu : une fiche, un cas, un bloc de programme. |
| 3 | `.panel` | aucun | e0 | Ce qui vit À L'INTÉRIEUR d'une carte : ligne de liste, encart, section. |

**La règle : la profondeur DESCEND, elle ne remonte jamais.**
`glass ⊃ card ⊃ panel ⊃ panel…` Un `.glass` ne se pose pas dans un `.card`.
Un `.card` ne contient ni `.card` ni `.glass`. Un seul plan de flou par zone :
deux plans empilés se ré-échantillonnent et le rendu devient instable.

**Portée de la règle — ajoutée le 30 sept. pour couper court à une mauvaise
lecture.** Les trois matériaux sont des SURFACES. Les CONTRÔLES (`.input`,
`.btn-glass`) floutent aussi et vivent forcément dans une carte : c'est le cas
prévu, pas une infraction. Un contrôle est petit, il ne ré-échantillonne pas
une zone, et son flou est ce qui le fait lire comme posé SUR la surface plutôt
que découpé dedans. Personne ne doit venir « réparer » `.input`.

**Reste ouvert — le POPOVER flottant, quatrième rôle non nommé.** Trois copies
de la même chaîne de classes (`AccountSwitcher.tsx:67`, `DeckChecklist.tsx:47`,
`SelectionExplainer.tsx:168`). Aucun des trois matériaux ne lui va : il flotte
au-dessus d'un contenu inconnu, donc il doit être OPAQUE (le verre par-dessus
une carte empile deux plans de flou, interdit), mais `.panel` le rendrait sans
bord — son bord est `rgb(255 255 255 / 0.55)`, invisible sur un fond blanc
opaque. **Le nommer est une décision de direction, pas d'implémentation.**
Laissé tel quel, signalé. C'est la seule contradiction sur laquelle je me suis
arrêté au lieu de trancher.

---

## 2 · La décision sur l'ombre

### AUCUNE OMBRE PORTÉE. Nulle part. Jamais.

Ni au repos, ni au survol, ni sur un actionnable, ni « juste une petite ».
La profondeur se dit par trois choses et trois seulement : le **bord supérieur
plus clair** que le reste du bord (le filet spéculaire — c'est lui qui fait
lire une matière et non un rectangle), la **teinte** du fond, le **flou**. Un
`box-shadow` reste licite tant qu'il est `inset` : un filet de lumière interne
n'est pas une ombre, c'est un bord.

**L'exception « ombre courte, seulement au survol, seulement sur un
actionnable » est REFUSÉE.** Raison, écrite dans `index.css` pour qu'elle ne se
perde pas : une ombre qui existe dans la palette finit posée au repos — et
c'est exactement par là qu'elle était revenue, `shadow-e1` au repos sur `.card`
alors qu'elle était née « ombre de survol ». Et le survol n'en a pas besoin :
`.card-interactive` porte déjà une translation d'un pixel, un liseré pétrole et
le cran d'élévation au-dessus. Trois signaux d'affordance, aucun n'est une
ombre.

`drop-shadow-*` sur un glyphe compte aussi. C'est un filtre, pas un
`box-shadow`, donc aucune garde ne l'attrape — et c'est le genre de survivance
qui fait dire « il en reste une, donc la règle n'est pas vraie ». Celle du
mascotte est retirée (`Doctopus.tsx`, commit `2bd4305`).

**Verrouillage par code de sortie**, pas par commentaire :
`packages/tokens/test/elevation.test.mjs` sort en 1 si une valeur non-`inset`
apparaît (a) dans la pile `elevation`, (b) **n'importe où dans `tokens.json`**,
à toute profondeur, (c) dans un `box-shadow` de `index.css`. La garde (b) a été
ajoutée le 30 sept. parce que la première version ne regardait que `elevation` :
`glass.light.shadow` et `glass.dark.shadow` ont survécu avec leur
`0 10px 34px -14px`, en décrivant une ombre que la règle CSS ne portait déjà
plus. **Un descripteur qui ment est pire qu'une ombre : il la fait revenir à la
prochaine recopie.**

---

## 3 · La liste de passation — lieu par lieu, avec le remplacement exact

### 3.0 · Le chiffre annoncé était faux

« 44 conteneurs `rounded-* border border-slate-200` » était un compte de
LIGNES de `grep`. Remesuré sur les chaînes de classes complètes (continuations
comprises, famille `border border-{slate,gray}-{100,200,300}` + `rounded-*`) :

> **41 occurrences dans 27 fichiers** — 29 dans `features/`, 12 dans
> `components/`.

Surtout, **le motif mélange trois familles** et « remplacer les 41 par
`.panel` » est faux tel quel. Dans `components/`, ce ne sont presque pas des
surfaces : 4 boutons de chrome, 3 champs, 3 popovers, 1 piste de jauge,
1 dessin de feuille. C'est pour ça que les remplacements ci-dessous sont
donnés un par un, et pas comme une règle de substitution.

### 3.1 · Appliqué par moi (`components/` + `DrillPage.tsx`)

| Lieu | Avant | Après | Commit |
|---|---|---|---|
| `DrillPage.tsx:130` | `flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800` + 2 boutons `min-h-11 rounded px-3` avec ternaire `bg-white shadow-sm` | `seg` + 2 boutons `min-h-11 px-3` avec `aria-pressed` | `a639ff4` |
| `Shell.tsx:106` | `flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 active:scale-95 dark:border-ink-600 dark:text-slate-300` | `btn-outline gap-1 px-2.5 py-1.5 text-xs hover:text-brand-600` | `c4ee342` |
| `Shell.tsx:107` | `rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 active:scale-95 dark:border-ink-600` | `btn-outline px-2 py-1.5 text-xs` | `c4ee342` |
| `Shell.tsx:108` | `flex items-center rounded-lg border border-slate-200 px-2 py-1.5 text-slate-500 …` | `btn-outline px-2 py-1.5 hover:text-brand-600` | `c4ee342` |
| `Shell.tsx:112` | `ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs …` | `btn-outline ml-auto gap-1.5 px-2.5 py-1.5 text-xs hover:text-brand-600` | `c4ee342` |
| `Doctopus.tsx:133` | `w-full resize-none rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-white/5` | `input resize-none` | `2bd4305` |
| `Doctopus.tsx:143` | `grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-300/80 text-slate-500 …` | `btn-outline h-9 w-9 shrink-0 p-0 disabled:opacity-40` | `2bd4305` |
| `Doctopus.tsx:99` | `… hover:bg-brand-600 hover:shadow-e2 active:scale-95` | idem sans `hover:shadow-e2` | `2bd4305` |
| `Doctopus.tsx:103` | `relative h-8 w-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]` | `relative h-8 w-8` | `2bd4305` |
| `RolePlayView.tsx:82` | `min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900` | `input min-w-0 flex-1` | `5898eed` |

**Cause racine traitée, pas le symptôme.** Les quatre boutons du bandeau se
redessinaient à la main parce que `.btn-outline` répondait au survol en
`slate-400` — un gris, quand tout le reste de l'app éclaire son liseré en
pétrole. La primitive était fausse, quatre sites l'évitaient. Corrigée chez la
primitive (`hover:border-brand-400`), donc pour **ses 47 appelants d'un coup**.

**Deux exceptions motivées, laissées en place :**
- `MusterModelPicker.tsx:82` — `mm-sheet rounded-lg border border-slate-200/90
  bg-white p-2 shadow-inner` : ce n'est pas une sous-surface, c'est le DESSIN
  d'une feuille de papier. La rendre translucide détruirait la lecture. (Et
  `shadow-inner` est interne, donc licite.)
- `ScoreGauge.tsx:140` — `rounded-full border border-slate-200` : la piste
  d'une jauge, pas un panneau.

### 3.2 · À passer au chantier **Simulation** (`features/simulation/`)

**`AnamneseBogen.tsx` d'abord** — mesurée la surface la plus longuement
regardée de l'app (≈ 20 min par session) et la plus éloignée de la charte.

| Lieu | Avant | Après |
|---|---|---|
| `AnamneseBogen.tsx:65` | `rounded-md border border-slate-200 p-2 dark:border-slate-700` | `panel p-2` |
| `AnamneseBogen.tsx:81` | `mt-1 w-full resize-y rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-[13px] outline-none focus:border-brand-400 dark:border-slate-700` | `input mt-1 resize-y bg-transparent px-2 py-1.5 text-[13px]` |
| `AnamneseBogen.tsx:20` | `… shadow-sm …` | retirer `shadow-sm` |
| `AnamneseGuide.tsx:56` | `flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900` | `card flex items-center gap-3 px-4 py-2` — **pas `.panel`** : aucun ancêtre `.card` (vérifié : `SimulationRunner.tsx:478` → `div.min-w-0` → `div.flex` → `div.space-y-4`), c'est une surface posée sur le fond (fix-s3 I5) |
| `ArztbriefGuide.tsx:55` | `w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900` | `input resize-y p-3 text-[13px] leading-relaxed` — **sans `font-mono`** : un Arztbrief est de la prose, le mono est réservé aux données (fix-s3 I6) |
| `ExternalAiSheet.tsx:159` | `space-y-1 rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300` | `panel space-y-1 p-3 text-sm text-slate-600 dark:text-slate-300` |
| `KommunikationPanel.tsx:30` | `rounded-lg border border-slate-200 p-2.5 dark:border-slate-800` | `panel p-2.5` |
| `PreSimulationPage.tsx:40` | `mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/60 p-3 dark:border-ink-600 dark:bg-ink-800/60` | `card mx-auto max-w-lg p-3` — **pas `.panel`** : `.panel` n'existe qu'à l'intérieur d'une carte, ce `<section>` est à la racine de la page (fix-s3 I5) |
| `SimulationSetup.tsx:135` | `mt-3 flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row` | `panel mt-3 flex flex-col items-center gap-3 p-4 sm:flex-row` — ancêtre `.card` vérifié (`:117` `div.card p-4`) |
| `TimeCapsule.tsx:43-47` | `boxShadow` en `style` inline : `inset 0 1px 0 0 …`, **`0 20px 44px -24px <aura>`**, **`0 3px 12px -6px rgb(4 30 27 / 0.18)`** — deux ombres portées invisibles à tout grep de classes | garder la seule couche `inset` ; la lueur de l'aura passe par la teinte du fond (`backgroundImage`), pas par une ombre (fix-s3 I5) |
| `PatientScreen.tsx:45` | `mt-2 flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800` + boutons `shadow-sm` (`:46`, `:47`) | `seg mt-2` + boutons sans ternaire de fond, avec `aria-pressed` |

**`SimulationHub.tsx` — interdit par la règle des matériaux.** La carte de
retournement empile deux plans de flou sur le même rectangle :
- `:90` recto — `card p-4 [grid-area:1/1] [backface-visibility:hidden]`
- `:101` verso — `glass glass-edge flex flex-col rounded-2xl p-3 [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]`

Les deux faces occupent `[grid-area:1/1]`, donc la même zone : `.glass`
(blur 20) posé sur `.card` (blur 16). **Correctif : le verso passe en `.card`**
— `card flex flex-col p-3 [grid-area:1/1] [backface-visibility:hidden]
[transform:rotateY(180deg)]` (le `rounded-2xl` tombe, `.card` porte
`rounded-card`). Le verso d'une carte reste une carte ; le verre marque un
MOMENT, pas le dos d'un objet. Si le verso doit se distinguer, c'est par la
TEINTE (`glass-tint`), pas par un second plan de flou.

### 3.3 · À passer au chantier **Programme** (`features/program/`, `home/`, `stats/`)

| Lieu | Avant | Après |
|---|---|---|
| `ProgramPage.tsx:137` | `group flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition-colors hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive group flex items-center gap-3 px-3 py-2.5` |
| `ProgramPage.tsx:336` | `mb-2 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900` | `input mb-2 px-2 py-1.5 text-sm` |
| `ProgramPage.tsx:360` | `rounded-xl border border-slate-200 dark:border-slate-800` | `panel` |
| `ProgramPage.tsx:205` | `flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-ink-700` (+ `shadow-sm` `:208`) | `seg` |
| `ProgramPage.tsx:461` | `flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800` (+ `shadow-sm` `:463`) | `seg` |
| `ProgramSetup.tsx:80-81` | deux `btn flex-1 justify-center text-sm` avec ternaire `bg-brand-600 text-white` | `seg` (piste) + deux boutons `flex-1 justify-center` avec `aria-pressed` |
| `HomePage.tsx:126` | `flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800` | `panel flex items-center gap-3 px-3 py-2` — ancêtre `.card` vérifié (`:112` `section.card p-5`) |
| `HomePage.tsx:195` | `flex items-center gap-3 rounded-lg border border-slate-200 p-2 hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive flex items-center gap-3 p-2` |
| `WeekCalendar.tsx:101` | `reveal mt-3 rounded-xl border border-slate-200 p-3 dark:border-ink-600` | `panel reveal mt-3 p-3` — ancêtre `.card` vérifié (`:61` `section.card p-5`) |
| `StatsPage.tsx:132` | `flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive flex items-center justify-between p-3` — ancêtre `.card` vérifié (`:128` `section.card p-5`) |
| `ProgramPage.tsx:17` `BLOCK_META` | table locale type → icône/couleur, relue par `HomePage` | lire `TASK_GLYPH` (`components/TaskLabel.tsx:56`) : un seul glyphe par type dans l'app (fix-s3 M3) |

### 3.4 · À passer au chantier **Contenu / navigation** (`cases/`, `fachwissen/`, `guides/`, `aufklaerung/`, `fachbegriffe/`)

| Lieu | Avant | Après |
|---|---|---|
| `CaseDetailPage.tsx:54` | `flex rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800` | `seg` |
| `CaseDetailPage.tsx:67` | `inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm dark:border-slate-700 dark:bg-slate-900` | `seg` (variante bordée du même contrôle) |
| `CaseDetailPage.tsx:160` | `block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive block px-3 py-2 text-sm` |
| `CasePreviewPanel.tsx:41` et `:55` | `relative overflow-hidden rounded-xl border border-slate-200 p-3 pl-4 dark:border-slate-800` | `panel relative overflow-hidden p-3 pl-4` |
| `FachwissenDetailPage.tsx:310` | `group rounded-lg border border-slate-200 dark:border-slate-800` | `panel group` |
| `FachwissenDetailPage.tsx:325` | `block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive block px-3 py-2 text-sm` |
| `FachwissenDetailPage.tsx:336` | `flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800` | `panel panel-interactive flex items-center gap-1.5 px-3 py-2 text-sm` |
| `FachwissenDetailPage.tsx:409` | `rounded-lg border border-slate-200 p-2.5 dark:border-slate-800` | `panel p-2.5` |
| `visualSections.tsx:47` | `group mt-2 rounded-lg border border-slate-200 dark:border-slate-800` | `panel group mt-2` |
| `GuidesPage.tsx:222` | `rounded-xl border border-slate-100 p-3 dark:border-slate-800/60` | `panel p-3` |
| `KommunikationGuide.tsx:56` | `rounded-xl border border-slate-200 p-3 dark:border-slate-800` | `panel p-3` |
| `AufklaerungPage.tsx:129` | `reveal mx-5 mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-ink-600 dark:bg-ink-700/40` | `panel reveal mx-5 mb-4 p-4` |

### 3.5 · Les six segmentés réimplémentés — récapitulatif

La signature mesurée d'un segmenté redessiné : une piste
`flex rounded-lg bg-slate-100 p-0.5|p-1 dark:bg-slate-800` contenant des
boutons dont l'état sélectionné est un ternaire de classes.

| # | Lieu | Chantier | État |
|---|---|---|---|
| 1 | `DrillPage.tsx:130` | **moi** | fait, `a639ff4` |
| 2 | `CaseDetailPage.tsx:54` | contenu | à faire |
| 3 | `PatientScreen.tsx:45` | simulation | à faire |
| 4 | `ProgramPage.tsx:205` | programme | à faire |
| 5 | `ProgramPage.tsx:461` | programme | à faire |
| 6 | `ProgramSetup.tsx:80-81` | programme | à faire (paire de `.btn`, même rôle) |
| (7) | `CaseDetailPage.tsx:67` | contenu | variante bordée, non comptée dans les six |

Chacun gagne trois choses : `aria-pressed` (l'état existe pour le lecteur
d'écran, pas seulement pour l'œil), `shadow-e1` interne au lieu de `shadow-sm`
qui est une ombre portée, et la piste/les crans en jetons.

### 3.6 · Les classes d'ombre portée restantes — INERTES depuis fix-s3 I4

`boxShadow` ne s'étend plus, il remplace le thème (`tailwind.config.js`) :
`shadow-sm/md/lg/xl/2xl` ne sont plus générés (mesuré sur `dist/assets/*.css` :
classes `shadow-*` produites = `e1 e2 e3 inner` + `hover:shadow-e2`). Les
occurrences ci-dessous ne peignent donc plus rien : ce sont des **classes
mortes à retirer**, pas des ombres à arbitrer. Recompte hors commentaires le
30 sept. 2026 : 23 occurrences dans 15 fichiers.

`AufklaerungPage.tsx:178` · `CaseDetailPage.tsx:55,58,87,90,136` ·
`CasePreviewPanel.tsx:26` · `CasesPage.tsx:141` · `medSections.tsx:28` ·
`AlphabetRail.tsx:50` · `GuidesPage.tsx:148` · `ProgramPage.tsx:208,423,463` ·
`ProgramSetup.tsx:66` · `AnamneseBogen.tsx:20` · `ImmersiveMode.tsx:264` ·
`PatientScreen.tsx:46,47` · `SimulationRunner.tsx:302,476` ·
`SimulationSetup.tsx:163` · `VorstellungGuide.tsx:56`.

La seule ombre portée encore PEINTE est inline : `TimeCapsule.tsx:43-47`
(§3.2).

**Le popover est tranché** (décision de `main`, fix-s3 I3) : c'est le rôle 1,
`.glass glass-edge`. Donc `ProgramPage.tsx:423` (menu, `shadow-lg`) →
`glass glass-edge` + retrait du fond/bord/ombre dessinés à la main ;
`ProgramSetup.tsx:66` (modale, `shadow-2xl`) → idem. Appliqué dans
`components/` : `AccountSwitcher`, `DeckChecklist`, `SelectionExplainer`,
`CardToast`, `NewCardSheet`.

---

## 4 · Les preuves

### 4.1 · Portes mécaniques (code de sortie, pas lecture d'un message)

| Porte | Commande | Code |
|---|---|---|
| Jetons | `packages/tokens $ node --test` | **0** — 13/13 |
| Parité jetons ↔ app | `packages/tokens $ node scripts/check-parity.mjs` | **0** |
| Types | `app $ npx tsc -b --noEmit` | **0** |
| Build | `app $ npm run build` | **0** |
| Suites unitaires | `app $ npx vitest run --dir src` | **577 / 577**, 90 fichiers |

**Ce que je casse vs ce qui échouait déjà.** À la tranche 1, la suite rendait
571 passés / 6 échoués, les 6 préexistants (`ExternalAiSheet`, `Doctopus`,
`SrsSettingsSheet`, `CaseTermsPanel`, `prompt.corpus`) — tous des dépassements
de 5 000 ms, vérifiés sur un worktree détaché au commit de base. Ces 6 échecs
ont disparu : c'étaient des symptômes de l'environnement, réparé par `main`
le 30 sept. (Supabase local relancé, cache Vite isolé par worktree, `d74c2ae`
cueilli sur cette branche).

**J'ai cassé un test, et c'est le test qui avait tort.** `Doctopus.test.tsx:17`
faisait `getByRole('button', { name: 'gear' })` : il verrouillait le nom
accessible ACCIDENTEL du bouton de réglages — le titre de son SVG — parce que
le bouton n'avait pas d'`aria-label`. Poser `aria-label="Réglages IA"` a
changé ce nom et fait tomber le test. Le test est corrigé pour attendre
`Réglages IA`, avec la raison écrite sur place : un bouton se nomme par son
œuvre, pas par son icône. C'est le seul échec introduit par cette tranche, et
il est refermé.

### 4.2 · Vérification navigateur

Sonde : `app/docs/reports/lead-s3-primitives.verify.mjs`, journal complet :
`app/docs/reports/lead-s3-primitives.verify.log`. Captures (32 PNG, 4,7 Mo,
non committées) dans le répertoire de travail de la session.

- `playwright-cli` headless, `vite preview` sur le `dist/` de CE worktree
  (preuve : `curl http://localhost:4317/assets/<hash>.css | grep -c btn-glass`
  → 1, et la classe n'existe que sur cette branche) ;
- **mesuré depuis le DOM de l'app** : `getComputedStyle` sur les nœuds rendus,
  aucun `import("/src/…")` ;
- Supabase local debout (relancé par `main`), contenu réel — le drill affiche
  « 0 dus · 10 nouveaux · Ancré sur ton cas récent : Stabile Angina pectoris
  (KHK) » ;
- quatre combinaisons : **clair / sombre × 390 px / 1440 px**.

**Résultat : 64 assertions OK, 4 KO.** Les 4 KO sont les quatre
`net::ERR_FAILED` de la fonte distante `rsms.me`, que la sonde coupe
délibérément pour ne pas dépendre du réseau public. Aucun KO de charte.

Mesures qui portent :

| Point | Clair | Sombre |
|---|---|---|
| `.glass` filet haut > bord | `0.88 > 0.55` | `0.26 > 0.10` |
| `.glass` flou rendu | `blur(20px) saturate(1.8)` | idem |
| `.card` filet haut > bord | `0.90 > 0.60` | `0.20 > 0.08` |
| `.card` flou rendu | `blur(16px) saturate(1.6)` | idem |
| `.panel` fond / rayon / flou | `rgba(255,255,255,0.45)` / `12px` / **aucun** | `rgba(255,255,255,0.035)` / `12px` / **aucun** |
| `.btn-glass` filet haut > bord | `0.85 > 0.45`, `blur(20px) saturate(1.8)` | `0.26 > 0.10`, idem |
| `.seg` cran actif | `rgba(255,255,255,0.55) 0 1px 0 0 inset` | idem |
| `.seg` cibles tactiles | `94 × 44 px` ×2 | idem |
| `.seg` bascule | un seul `aria-pressed="true"` après clic | idem |
| Ombres portées dans le document | **0** sur les 15 `box-shadow` de l'accueil, les 22 du tiroir Doctopus, les 8 du drill | idem |

Le balayage d'ombres distingue trois cas, sans quoi il crie au loup : une
couche `inset` est un filet ; une couche transparente est un emplacement vide
de Tailwind (`--tw-shadow`, `--tw-ring-shadow`) ; une couche à décalage **et**
flou nuls est un `ring-*`, c'est-à-dire un bord dessiné en `spread`. Seul le
reste est une ombre portée.

### 4.3 · Ce que la vérification navigateur a trouvé, et que rien d'autre n'aurait trouvé

#### [BLOQUANT] `.btn-glass` n'existait pas dans le CSS livré
- **Où** : `app/dist/assets/*.css`, et le DOM de l'app en clair.
- **Constat** : la primitive livrée en T3 était absente du build en mode clair.
- **Preuve** : sur les sept règles portant `.btn-glass` dans le CSS livré, il
  ne restait que `:is(.dark) .btn-glass` (× 3) et les deux replis sous
  `@media (prefers-reduced-transparency: reduce)` et
  `@supports not (backdrop-filter: blur(1px))`. Aucune règle de base en clair,
  aucun survol, aucun état pressé. Dans le navigateur, en clair, aux deux
  largeurs, un `<button class="btn-glass">` greffé dans la page réelle
  calculait `border-top-color: rgb(229, 231, 235)` (le gris de preflight),
  `box-shadow: none`, `backdrop-filter: none`.
- **Cause** : la purge des règles `@layer components` de Tailwind se fonde sur
  les classes trouvées dans `content`, et `.btn-glass` a **zéro occurrence**
  en `.tsx` — la primitive n'a jamais été branchée. Les variantes
  `:is(.dark) …` et celles imbriquées dans une at-rule échappent à
  l'extracteur, d'où ce reste en lambeaux : plus trompeur qu'une absence
  franche, puisque le mode sombre semblait marcher.
- **Correctif** : `safelist: ['btn-glass']` dans `app/tailwind.config.js`,
  commit `6dc0f3c`, avec la règle de sortie écrite sur place. Après : 15 règles
  `.btn-glass` dans le CSS livré, et la sonde passe de 6 KO à 0 KO de charte.
- **Ce qui reste à faire, et qui n'est pas à moi** : brancher `.btn-glass` sur
  les trois moments nommés dans son propre commentaire (entrer dans un Teil,
  les pastilles de Teil, la feuille IA) — tous dans `features/simulation/`.
  **Tant que personne ne l'emploie, c'est une ligne de `safelist` qui tient en
  vie une classe morte.** Si le chantier Simulation ne la branche pas, la
  bonne décision est de supprimer la classe, pas de garder la ligne.

#### [MAJEUR] Les deux boutons de l'en-tête Doctopus n'avaient pas de nom accessible
- **Où** : `app/src/components/Doctopus.tsx:121-122`.
- **Constat** : la roue dentée et la croix de fermeture n'avaient qu'un
  `title`. Pour la croix, le nom accessible tombait sur son contenu textuel, le
  caractère « ✕ ».
- **Preuve** : `grep -n aria-label src/components/Doctopus.tsx` ne rendait que
  `Ouvrir Doctopus` (ligne 98) et `Nouvelle conversation` (ligne 142).
- **Correctif** : `aria-label="Réglages IA"` et `aria-label="Fermer Doctopus"`,
  commit `21be909`. Trouvé en voulant fermer le tiroir depuis la sonde : aucun
  sélecteur par rôle ne l'atteignait. Une interface qu'une sonde ne sait pas
  nommer, un lecteur d'écran ne la nomme pas non plus.

#### [MINEUR] Le bouton flottant perdait un cran d'élévation en s'élevant
- **Où** : `app/src/components/Doctopus.tsx:99`.
- **Constat** : `shadow-e3` au repos, `hover:shadow-e2` au survol — un cran de
  MOINS pendant que le bouton monte de `-translate-y-0.5`.
- **Preuve** : la chaîne exacte était
  `… animate-float … shadow-e3 … hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-e2 active:scale-95`.
- **Correctif** : `hover:shadow-e2` retiré, commit `2bd4305`. e3 est déjà le
  cran le plus haut : le survol ne touche plus à l'élévation.

#### [MINEUR] Deux champs recopiaient `.input` en oubliant son anneau de focus
- **Où** : `Doctopus.tsx:133`, `RolePlayView.tsx:82`.
- **Constat** : les deux reprenaient rayon, padding et `focus:border-brand-400`
  de `.input`, mais pas `focus:ring-2 focus:ring-brand-500/25`.
- **Preuve** : `.input` déclare
  `focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25` ; les deux
  chaînes recopiées ne portent que `focus:border-brand-400`.
- **Correctif** : `input` (+ modificateurs locaux), commits `2bd4305`,
  `5898eed`.

---

## 5 · Non vérifié

1. **Les 29 remplacements de `features/` ne sont pas vérifiés en navigateur** —
   ils ne sont pas appliqués. La liste du §3 est une prescription, pas un
   constat. Chaque chantier doit remesurer après application.
2. **`.btn-glass` n'est mesuré que greffé dans le DOM vivant**, pas en place
   dans un écran : aucun `.tsx` ne l'emploie. La cascade, les jetons et le
   thème sont ceux de l'app ; l'emplacement réel ne l'est pas. Le rendu dans un
   contexte réel (sur `.card`, sur fond photographique) reste à voir.
3. **Le changement de survol de `.btn-outline` (`slate-400` → `brand-400`)
   n'est vu que sur les 4 boutons du bandeau.** Ses **47 appelants** n'ont pas
   été revus un par un. Le risque est faible (un liseré de survol passe de gris
   à pétrole, conforme au reste de la charte) mais il n'est pas nul.
4. **Aucune mesure sous `prefers-reduced-motion: reduce` ni
   `prefers-reduced-transparency: reduce`.** La sonde tourne en
   `no-preference`. Les replis opaques existent dans le CSS et sont couverts
   par `check-parity`, mais leur RENDU n'a pas été vu.
5. **Aucune mesure de performance.** L'empilement de plans de flou est justifié
   par une instabilité de rendu observée ailleurs, pas par un profil mesuré sur
   cette branche.
6. **Le quatrième rôle (popover) n'est pas tranché** — c'est délibéré (§1),
   mais tant qu'il ne l'est pas, trois copies de la même chaîne de classes
   restent dans `components/` et deux ombres portées restent dans
   `features/program/`.
7. **La sonde n'est pas dans la CI.** Elle vit dans `app/docs/reports/` parce
   que `app/scripts/` est hors de mon périmètre d'écriture. **Proposition de
   changement de contrat au coordinateur** : la déplacer en
   `app/scripts/check-materials.mjs` et la brancher dans
   `.github/workflows/quality.yml`. Sans ça, la charte reste gardée par des
   tests statiques et un humain, et une régression comme celle de `.btn-glass`
   repassera.
