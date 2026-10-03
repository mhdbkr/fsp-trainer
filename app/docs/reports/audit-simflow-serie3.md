# Audit du parcours de simulation — série 3 (30 sept. 2026)

> Audit lecture seule sur `main`. Périmètre : `app/src/features/simulation/*`,
> `app/src/lib/{simulationStep,simScope,simulationSave,scoring,checklists}.ts`,
> `main.tsx`, `Shell`/`Sidebar`.

## 0. Carte du parcours

| Étape | Route | Composant |
|---|---|---|
| Hub | `/simulation` | `SimulationHub.tsx:12` |
| Carte retournable → choix du Teil | — | `FlipCaseCard` `SimulationHub.tsx:78` + `ModeChooser.tsx:26` |
| Pré-simulation | `/simulation/:caseId/pre?teil=` | `PreSimulationPage.tsx:15` |
| Runner (jeu + éval + bilan) | `/simulation/:caseId/run?teil=` | `SimulationRunner.tsx:39` |
| Écran patient | `/patient/:caseId` | `main.tsx:81`, hors Shell |

Routes `main.tsx:62-64`. **Il n'existe aucune route de bilan** : le bilan est
un état local du runner.

## 1. Le gros bug — « valider la partie » renvoie en arrière

### 1.1 L'automate réel
Tous les états sont locaux au runner : `active` (`:59`), `phase: 'play'|'eval'`
(`:60`), `aufklaerungOpen` (`:65`), `results` (`:64`), `elapsed` (`:66`),
`finished` (`:67`, **non persisté**), dérivé `partKey` (`:204`).

```
play  --[« Terminer la partie ✓ » :343]-->  eval
eval  --[« Retour » PartEvaluation.tsx:117 → onCancel :354]-->  play   (même écran)
eval  --[« Valider la partie ✓ » PartEvaluation.tsx:118 → onSave :353]--> savePart :184
        setResults :185 ; setPhase('play') :186 ;
        si aufklaerung → setActive('anamnese') :187 ;
        sinon avance SEULEMENT si idx < flow.length-1 :189-190
play (doneCount>0) --[« Terminer la simulation » :399]--> finishSimulation :193
finished --> ResultScreen :180/:558   (URL inchangée : /simulation/:caseId/run)
```

### 1.2 Six causes cumulées

**(a) Cause racine — `SimulationRunner.tsx:189-190`**
```ts
const idx = flow.findIndex((f) => f.key === part);
if (idx < flow.length - 1) setActive(flow[idx + 1].key);
```
`flow` est filtré au Teil courant (`:49`). En Teil seul, `flow.length === 1`,
donc `idx === 0 === flow.length - 1` → **aucune avance**. Avec le
`setPhase('play')` de `:186`, « Valider » ne fait que refermer l'évaluation et
**réafficher l'exercice terminé**. Même effet sur la 3ᵉ partie d'un run complet.

**(b) « Valider » et « Retour » sont indiscernables** — `PartEvaluation.tsx:116-119` :
les deux mènent à `setPhase('play')` (`:354` et `:186`). Deux boutons, une
destination.

**(c) Le chrono de la partie validée redémarre** — `SimTimer` est monté avec
`key={partKey}` (`:213`) ; en Teil seul `partKey` ne change pas → pas de
remontage, et l'effet `:438` repasse `running = true` puisque `phase==='play'`
→ `useTimer.ts:13-20` relance l'intervalle sur un `elapsed` déjà consommé.
Lecture utilisateur : « on m'a remis au début ».

**(d) La branche Aufklärung saute hors périmètre** — `:187` force
`setActive('anamnese')` en dur. En `?teil=dokumentation`, `'anamnese'` n'est
pas dans `flow` → `navIdx = Math.max(0,-1) = 0` (`:221`) → `PlayArea` rend
`AnamneseArea` (`:453`). Retour littéral au Teil 1, hors scope déclaré.

**(e) Aucun reset de défilement** — pas de `scrollTo` dans le runner ; `merged`
(`:93`, seuils `:116`) et la position du `<main>` survivent à l'aller-retour.

**(f) Le CTA de sortie est hors champ** — le bloc « Fin de simulation » est
rendu tout en bas du JSX, après la modale QR (`:397-401`), alors que les
autres contrôles vivent dans l'en-tête collant (`:335-345`). Rendu
conditionnel `phase === 'play' && doneCount > 0` : il **n'existe jamais
pendant l'évaluation**, moment où l'utilisateur le cherche.

### 1.3 Après le bilan
`finishSimulation` (`:193-200`) : `saveSimulation` → `useSimSession.end()`
(`simSession.ts:76-79`, purge sessionStorage) → `setFinished(sim)`.
`ResultScreen` s'affiche **sur l'URL `/run`** : pas d'entrée d'historique
« bilan », « ← Retour » (`Shell.tsx:88`) ramène à `/pre`, et tout remontage
(reload, retour/avant) réaffiche un runner **vierge** sur le même cas.

## 2. La checklist de fin ne reprend pas les cases cochées

**Cause racine — `PartEvaluation.tsx:16`**
```ts
const [checklist, setChecklist] = useState<ChecklistItem[]>(() => checklistFor(part));
```
`checklistFor` (`checklists.ts:85-92`) **reconstruit** la liste avec
`checked: false` en dur (`checklists.ts:10-15`). Aucune prop d'entrée, aucun
store lu ; le commentaire `checklists.ts:4` l'assume.

Ce qui est coché pendant la simulation ne peut pas remonter :
- `AnamneseGuide.tsx:32` — `checked` est un état **local**, jamais levé ; sa
  seule sortie est `setGuideChapter` (`:47-51`), qui ne publie que **l'id du
  chapitre le plus loin** (`simSession.ts:42`, scalaire).
- `hints` (`AnamneseGuide.tsx:33`), censé « impacter le score » (`:16`), ne
  quitte jamais le composant.
- **Espaces d'identifiants disjoints** : chapitres à ids sémantiques
  (`aktuell`, `vegetativ`…) contre checklist à ids **positionnels**
  (`checklists.ts:9-15`, `uid` remis à 0/100/200/300). `ChecklistItem`
  (`db/types.ts:426-431`) n'a ni `chapterId` ni clé stable. **C'est un problème
  de modèle, pas de câblage.**

**Frère** : `SessionSnapshot` (`simSession.ts:20-34`) persiste `phase` mais pas
le brouillon d'évaluation → quitter puis « Reprendre » rouvre une évaluation
**vierge** (idem `grid` `:18` et `feeling` `:19`).

**« Tout sélectionner » manquant** : seul `toggle` existe
(`PartEvaluation.tsx:21`). Dimensionnement : 13 items en Anamnese, 11 en
Dokumentation, 11 en Fallvorstellung, 9 en Aufklärung (`checklists.ts:17-83`),
et `checklistPct` est **pondéré** (`scoring.ts:25-30`, `axisWeight` jusqu'à 2)
— tout cocher donne 100 % de contenu, donc ≥ 55 % du score de partie
(`scoring.ts:46`). L'action doit être visiblement un **raccourci de saisie**.

## 3. Identité visuelle — l'inventaire

### 3.1 Le système existant
| Primitive | Définition | Verre ? |
|---|---|---|
| `.card` | `index.css:88-117` | oui (blur 16 / sat 160 + liseré) |
| `.glass` / `.glass-edge` / `.glass-tint` | `index.css:232-272` | oui (blur 20 / sat 180) |
| `.dim-tag` | `index.css:172-188` | oui |
| `.input` | `index.css:148-154` | oui (blur 8) |
| `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-outline` | `index.css:136-145` | **non — aplats** |
| `.chip` | `index.css:147` | **non** |

La charte (`index.css:221-231`) réserve `.glass` à la navigation. Le manque
n'est donc pas un oubli d'application : **il n'existe aucun token de bouton en
verre**. C'est la brique à créer.

### 3.2 « Entrer — Dokumentation / Anamnese »
`PreSimulationPage.tsx:47` : `btn-primary` = aplat `bg-brand-600`
(`index.css:140`), ombre simple, aucun blur, aucun liseré, aucune profondeur.
`:46` : `btn-outline` bordure `slate-300` pleine. Le conteneur `:45` est une
boîte faite main (`border-brand-200 bg-brand-50/50`), ni `.card` ni `.glass`.

### 3.3 Pastilles qui se retournent
Le **cadre** est correct : `SimulationHub.tsx:87-88` (`perspective:1200px`,
`preserve-3d`, `rotateY(180deg)`, `ease-fluid`, `motion-reduce:transition-none`),
recto `.card` (`:90`), verso `.glass glass-edge` (`:101`).
Ce sont les **pastilles dedans** qui cassent — `ModeChooser.tsx:30-35` :
`bg-white text-brand-800 ring-1 ring-slate-200`, `bg-white/70`, sélectionné
`bg-brand-600 text-white shadow-md`. Aucun `backdrop-filter`, aucune classe
`.glass*`. Sur un verso en verre, elles posent **du verre sur du verre**
(interdit `index.css:225-226`) sans en avoir le matériau. Trait de division
`:44` = `h-px bg-slate-200`.
Duplication : second composant de flip 3D, `components/CardFlip.tsx:40`, non
partagé.

### 3.4 Tous les fonds blancs du parcours
`ModeChooser.tsx:32,35` · `ResumeSessionBar.tsx:31` · `AnamneseGuide.tsx:56` ·
`AnamneseBogen.tsx:20` · `SimulationSetup.tsx:163,195` · `ArztbriefGuide.tsx:55`
(contourne `.input`) · `PreSimulationPage.tsx:40` · `SimulationRunner.tsx:303`
· `SimulationRunner.tsx:476` et `VorstellungGuide.tsx:56` (3ᵉ style de bouton,
hors tokens) · `PatientScreen.tsx:28,46,47`.

Contre-exemples corrects à imiter : `timeGlass()` en style inline
(`SimulationRunner.tsx:242,247,318` ; source `TimeCapsule.tsx`) sur
`--glass-base` (`index.css:320-321`) ; `TopBar` (`Shell.tsx:87`) en
`glass glass-edge`.

## 4. La pré-simulation a quatre variantes

| Bloc | `fichier:ligne` | complète | anamnese | dokumentation | fallvorstellung |
|---|---|:-:|:-:|:-:|:-:|
| `ModeChooser` | `:40-42` | ✓ | ✓ | ✓ | ✓ |
| Barre d'action | `:45-48` | ✓ | ✓* | ✓* | ✓* |
| **`SimulationSetup` entier** | `:52` | ✓ | ✗ | ✓ | ✗ |
| Notions clés | `:55-66` | ✓ | ✓ | ✓ | ✓ |
| Questions d'anamnèse | `:68-71` | ✓ | ✓ | ✗ | ✗ |
| Phrases de Fallvorstellung | `:73-79` | ✓ | ✗ | ✗ | ✓ |
| Fachbegriffe | `:81-88` | ✓ | ✓ | ✓ | ✓ |

Le point dur est `:52` :
`{(!teil || teil === 'dokumentation') && <SimulationSetup caseId={c.id} />}`.
Le commentaire `:51` ne justifie que le Muster-Bogen, mais la condition masque
**tout** : assistance (`SimulationSetup.tsx:26-43`), couche + conseil
(`:46-84`), `RolesCard` (`:87`), « Avec ton IA » (`:90-97`),
`MusterModelPicker` (`:100-106`). Or le runner lit toujours `assistance` et
`layer` (`SimulationRunner.tsx:51-52`) et `saveSimulation` les enregistre et
les utilise pour pondérer la confiance (`simulationSave.ts:53,70`). **En
Anamnese seule et Fallvorstellung seule, on joue avec des réglages hérités,
invisibles et non modifiables.**

## 5. Deux cadres séparés, aucun conscient du Teil

- `RolesCard` — `SimulationSetup.tsx:87`, `:111-154` : `.card p-4`, QR + lien
  vers `/patient/:caseId` **sans `teil`** (`:143`).
- « Autre façon de simuler » — `:90-97` : seconde `.card p-4`, action
  `openExternalAi(caseId)` (`:94`) — **la signature ne prend qu'un `caseId`**.

Seul point d'entrée vers le runner sur toute la page : le `<Link>` de
`PreSimulationPage.tsx:47`. Pour qu'un cadre unifié « renvoie DANS la
simulation au Teil concerné », le choix (rôle humain / IA / solo) doit devenir
une branche de cette navigation, donc porter `teil` jusqu'à `openExternalAi`
et jusqu'à l'URL patient. **Rien de tout cela n'existe.** Aggravant : ce cadre
unifié serait, en l'état, invisible dans 2 modes sur 4 (§4).

## 6. Motion — inventaire

**Tokens** : `ease-fluid` (`tailwind.config.js:40-42`) ; `--ease-out`,
`--dur-fast`, `--dur` (`index.css:8-10`) — **ces deux durées ne sont utilisées
nulle part**, tout est en dur.

**Keyframes/classes** : `fade-in`, `fade-in-fast`, `slide-in`, `pulse-line`,
`pop`, `float`, `split-l/c/r` (`tailwind.config.js:46-73`) ; `reveal-up`
(`index.css:290`), `.reveal` (`:298`), `.stagger` 8 paliers (`:299-307`).

**Transitions de page** : `Shell.tsx:51` — `key={pathname}` + `.reveal`. C'est
**la seule**. Limites : entrée seulement, aucune sortie ni croisement ;
`key={pathname}` remonte tout le sous-arbre ; un changement de `?teil=`
(`PreSimulationPage.tsx:21`, `replace`) garde le même pathname → **aucune
animation** alors que la page change substantiellement. Aucune
`startViewTransition`, aucun `AnimatePresence`, **aucun framer-motion dans le
dépôt** (grep exhaustif : 0 occurrence).

Note d'architecture : `index.css:285-289` — `.reveal` anime `transform`, donc
le wrapper de page est un containing block ; tout overlay plein écran doit
passer par `components/Portal.tsx` (respecté `SimulationRunner.tsx:376`).

**Motion sur mesure** : FLIP manuel du chrono (`SimulationRunner.tsx:144-159`,
`el.animate`, relevés `:120-123`) ; fusion de l'en-tête au défilement
(`:238,241,245,250,254,261,282-285,316-318,322-323,335-336`, hystérésis 90/40
px `:116`) ; flip de carte (`SimulationHub.tsx:88`, `CardFlip.tsx:40`) ;
division des Teile (`ModeChooser.tsx:24,45-52`, délai `120 + i*40` ms).

**`prefers-reduced-motion`** : kill-switch global `index.css:69-76` — **ne
couvre pas `Element.animate()`**, donc le FLIP `:150` tourne quand même.
Gardes ponctuelles : `SimulationHub.tsx:88`, `ModeChooser.tsx:45`,
`CardFlip.tsx:40`, `Tilt.tsx:9`, `Sidebar.tsx:136`, `AlphabetRail.tsx:6`,
`AufklaerungPage.tsx:164`. **Contrat testé** : `motionSafe.test.ts:29-37`
interdit toute classe `transition-*`/`animate-*` sans préfixe `motion-*`, mais
son périmètre (`:14-23`) exclut `features/simulation` — et
`SimulationRunner.tsx:238/245/250` **échouerait** s'il y était.
*Incohérence de contrat à trancher avant d'ajouter la moindre transition.*

## 7. Persistance, stats, programme

**En vol** : `fsp.simSession` en **sessionStorage** (`simSession.ts:59,90`),
`partialize` `{snapshot, minimized}` (`:91`), champs `:20-34`. Non couvert : le
brouillon d'évaluation, `checked`/`hints` du guide, la position de défilement.

**À la fin** : `saveSimulation` (`simulationSave.ts:41-76`) écrit
`id: sim-${Date.now()}` (`:44`), `parts`, `passed` (`:52`),
`assistance`/`layer`/`muster` (`:53`), `scope` (`:54`), `teil` ; puis
`syncQueue.push('simulation.completed')` (`:61`), recalcul `caseMastery`
(`:69`), `confidence` (`:70`), `status` seuillé 80/40 (`:71`),
`db.cases.update` (`:72`). Table `simulations` indexée `'id, caseId, date,
role'` (`db/db.ts:54`) — **`role` est hérité** ; aucun index sur `scope`,
`teil` ni `profileId`.

**Un Teil isolé est-il distinguable ?** Oui en principe (`scope`+`teil`,
`SimulationRunner.tsx:196`), avec heuristique de rétrocompat (`simScope.ts:22`).
Trois réserves :
1. **Mis-classement réel** : `isFullSimulation` (`simScope.ts:19-23`) renvoie
   `true` dès `scope === 'full'`, **avant** de compter les parties. Un run
   complet abandonné après une partie (possible : le CTA apparaît dès
   `doneCount > 0`, `:397`) est compté « simulation complète »
   (`StatsPage.tsx:44`).
2. `caseMastery` ignore volontairement le scope (`simScope.ts:25-28`) : la
   distinction n'existe que pour l'affichage (`scopeLabel`, `:45-48`).
3. Pas d'index Dexie sur `scope`/`teil` : tout filtrage se fait en mémoire
   après `toArray()` (`hooks/useData.ts:37`).

## 8. Dette relevée en chemin

| # | Constat | `fichier:ligne` |
|---|---|---|
| 8.1 | **`lib/simulationStep.ts` est du code mort** (125 lignes), aucun import externe. | `simulationStep.ts:12-13` |
| 8.2 | **`Simulation.profileId` n'est jamais écrit** alors que `layerAdvice.ts:40` filtre dessus et que `SimulationSetup.tsx:177-203` permet de changer le médecin créditeur → en mode fondateur, toutes les simulations sont non attribuées. | `db/types.ts:470-471`, `simulationSave.ts:43-57` |
| 8.3 | `passed` recalculé à la main alors que `simulationPassed()` existe. Deux sources de vérité. | `simulationSave.ts:52` vs `scoring.ts:77-81` |
| 8.4 | `id: sim-${Date.now()}` — deux clics rapprochés écrasent le même enregistrement. | `simulationSave.ts:44` |
| 8.5 | Deux implémentations de flip 3D dupliquées. | `SimulationHub.tsx:87-88`, `CardFlip.tsx:40` |
| 8.6 | `--dur-fast` / `--dur` déclarées, jamais consommées. | `index.css:9-10` |
| 8.7 | `hints` « impacte le score » mais ne quitte jamais le composant. | `AnamneseGuide.tsx:16,33,121` |
| 8.8 | `PartResult.assistanceUsed` déclaré, jamais renseigné. | `db/types.ts:451`, `PartEvaluation.tsx:25-29` |
| 8.9 | `ChecklistItem.id` positionnel dépendant d'un compteur de module : aucune analyse longitudinale « ce critère, tu le rates toujours » n'est possible. | `checklists.ts:9-15` |
| 8.10 | `axisScores` agrège sans regarder le scope : un Teil isolé pèse comme une partie de run complet. | `stats.ts:12-26` |

## 9. Ordre de traitement conseillé

1. **§1 + §2 ensemble** — même sujet : l'automate de fin et son modèle de
   données. Un correctif de `savePart` qui n'ajoute pas d'**état terminal
   explicite** laissera le symptôme intact sur le dernier Teil.
2. **§4 + §5 ensemble** — `PreSimulationPage.tsx:52` est le nœud commun :
   l'unifier est le préalable au cadre unique.
3. **§3 puis §6** — créer d'abord le token bouton-verre manquant
   (`index.css:136-145`), et trancher le périmètre de `motionSafe.test.ts:14-23`
   **avant** d'ajouter une transition à `features/simulation`.
4. Traiter 8.2 (`profileId`) et le mis-classement 7-(1) dans le même lot que
   §1 : même chemin d'écriture.
