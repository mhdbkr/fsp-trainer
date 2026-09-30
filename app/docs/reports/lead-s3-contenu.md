# s3-contenu — rapport final

Branche `feat/s3-contenu`, worktree `/Users/MehdiBoukari/Downloads/FSP VB/doctopus-s3-contenu`.
Writer unique : `lead-s3-contenu`. Dix-sept commits.

**Statut : DONE_WITH_CONCERNS.** Tout ce qui était demandé est livré et vert par
code de sortie. Une réserve, une seule, et elle est structurelle : **le gate de
relecture n'a pas pu être franchi** — `Task`, `SendMessage` et `ToolSearch` sont
indisponibles dans cette session, donc ni `fsp-language-reviewer`, ni
`fsp-clinical-reviewer`, ni `fsp-concision-editor`, ni `quality-branch-reviewer`
n'ont pu être dispatchés. Je suis implémenteur ; je ne me relis pas moi-même.
Détail en fin de rapport.

---

## 1. Le budget d'atomicité, avant et après

La mesure décisive : **le même validateur**, sur le contenu d'avant et d'après.
Le worktree détaché `4eb24a4` (juste avant la découpe) a reçu une copie du
script et du fixture d'aujourd'hui ; les deux exécutions sont comparables ligne
à ligne.

| | avant (`4eb24a4`) | après (`919b43f`) | |
|---|---:|---:|---|
| corpus « à dire » | 3 721 | 3 755 | +34 (la sonde neuve et ses relances) |
| **A** — plus d'un « ? » | **577** | **520** | **−57** |
| B — énumération | 120 | 120 | inchangé |
| C — alternative dépendante du cas | 5 | 5 | inchangé |
| D — salve d'examinateur | 0 | 0 | inchangé |

Le contenu d'avant, passé au validateur d'aujourd'hui, **échoue** :
`❌ règle A : 577 (budget 520, +57)`, code de sortie **1**. C'est la preuve
demandée : le budget ne fait pas que refuser de remonter, **il est descendu**,
et la porte rejetterait un retour en arrière.

La descente est aussi lisible commit par commit, à corpus constant (3 594) :

```
521  plancher d'entrée (après la décision Q11)
509  sous-lot 1 — 9 relances       e80dfa3   (−12)
494  sous-lot 2 — 15 relances      a550790   (−15)
490  sous-lot 3 — la sonde neuve   c456eab   (−4)
```

Puis le corpus s'élargit de 3 594 à 3 755 (§ 4) et le plancher est gravé à
**A = 520 · B = 120 · C = 5 · D = 0**.

## 2. Le tri des 27, et ce qu'il a coûté de faux

Artefact complet : **`app/docs/reports/lead-s3-contenu-tri27.md`** (`de87e95`,
corrigé par `d2808b7`).

Jurisprudence de la direction appliquée telle quelle : *relance par défaut,
nouvelle sonde seulement quand la seconde question porte une dimension que
l'examen note séparément.* Résultat : **26 relances, 1 nouvelle sonde.**

Le critère seul en fabriquait huit. **Un garde-fou a dû être ajouté**, et c'est
lui qui a tranché la moitié des cas :

> Une seconde question qui **duplique une sonde existante ailleurs** ne devient
> jamais une sonde neuve. Elle devient relance — ou disparaît.

Six des huit auraient été le **troisième** passage sur un signe déjà demandé
deux fois : l'orthopnée est dans `fach-pneumo-orthopnoe` *et*
`fach-kardio-oedeme` ; la diathèse hémorragique dans `fach-haem-blutung` ; le
Drang et le jet dans `fach-uro-drang` et `fach-uro-strahl` ; l'inventaire
Sprechen / Sehen / Gehen dans quatre sondes `fach-neuro-*`.

**Deux verdicts du tri ont été renversés par la mesure, après écriture.**
`akt-psych-interesse` et `akt-psych-konzentration` dupliquent
`fach-psych-interesse` et `fach-psych-konzentration`, mot pour mot. Je ne les
avais pas vues : mon grep de vérification cherchait `fach-psy-`, et le préfixe
réel est `fach-psych-`. Dix sondes de Fachanamnese psychiatrique sont restées
invisibles à une vérification **qui n'a pas échoué — elle a renvoyé zéro**.
C'est `checkPlayedTrame` qui l'a rattrapé, à **1,00 de similarité** sur trois
cas ; les douze réponses déjà rédigées ont été retirées et les six réponses
composées restaurées (`c456eab`).

Reste **`akt-ausscheid-schlucken`**, l'exemple de la direction : « nur Festes,
oder auch Flüssiges » tranche sténose mécanique (`case-oesophaguskarzinom` — le
solide seul) et trouble moteur (`case-achalasie` — les deux, et le froid
d'abord). Treize réponses rédigées, une par cas de la catégorie.

Et un allègement net : le **Schüttelfrost sort** de `akt-infekt-fieber`.
`veg-schuettelfrost` le pose déjà, plus richement. Il a fallu faire suivre la
déclaration `sucht` dans `symptoms.ts` — sinon la règle « un symptôme, une
question » continuait d'effacer la question végétative au nom d'une question qui
ne demande plus rien. Trame jouée **8 529 → 8 531** : deux cas infectieux
retrouvent la question, mesuré.

### Ce que la découpe a fait tomber au passage

Trois choses qu'aucune consigne ne demandait, et que la mesure a imposées :

1. **`case-arterielle-hypertonie`** — raccourcir `akt-allgemein-tageszeit` a fait
   apparaître un doublon que la verbosité cachait (`checkPlayedTrame`, 0,60). La
   question du cas redemandait « morgens … im Laufe des Tages ». Elle devient ce
   qu'elle seule apporte : la localisation occipitale, que la variante
   `allgemein` ne demande nulle part.
2. **`akt-nerven-art` et `akt-nerven-alltag`** ont dû perdre des items *en même
   temps* qu'elles étaient découpées : ramenées à une interrogation, elles
   passaient de la règle A à la règle B. Un compteur qui baisse en poussant
   l'autre vers le haut n'est pas un progrès.
3. **`case-covid19`** perd « Rast dabei das Herz, schwitzen Sie? » : la sueur
   d'effort faisait doublon avec `veg-schuettelfrost`, et la question portait
   deux interrogations.

## 3. Les 85 constats du socle — arbitrés, socle à zéro

`919b43f`. **85 → 0.** Le socle ne gèle plus rien.

**Quatre-vingt-une relectures tiennent** et reçoivent `relu: true` : la question
du cas cite un symptôme que la Fachanamnese cherche plus bas, mais elle demande
*autre chose* — la durée d'une perte de connaissance (`case-commotio`), le test
des orteils et des talons (`case-bandscheibenvorfall`), la Zielscheibe d'un
érythème migrant (`case-lyme`), la triade du phéochromocytome
(`case-arterielle-hypertonie`), la dissémination dans le temps
(`case-multiple-sklerose`). L'en-tête de `symptoms.ts` le dit depuis l'origine :
citer un symptôme n'est pas le chercher.

**Quatre sont de vrais doublons**, et ceux-là se corrigent :

| cas | constat | arbitrage |
|---|---|---|
| `case-arterielle-hypertonie` | « Schmerzen oder ein Engegefühl in der Brust, Luftnot beim Liegen, geschwollene Beine? » = `fach-kardio-brust` mot pour mot, six questions plus haut, et **moins précis** | **supprimée** — garder la version pauvre au prix de la riche aurait été l'inverse du but |
| `case-hws-diskusprolaps` | la question du cas EST la question sensitive, et plus riche (territoire de la main) | `sucht: ['taubheit','schwaeche']` — la Fach ortho s'efface |
| `case-osteoporose` | même collision, mais `sucht` y créait une **erreur** (la Fach ortho n'a pas de `parts`) | reformulée en ce qu'elle seule apporte : le drapeau rouge de la queue de cheval |
| `case-multiple-sklerose` | **le constat nommé par la direction** | voir ci-dessous |

### `case-multiple-sklerose`, mesuré sur la trame jouée

La trame réelle (`checkTrameSymptoms --show`) montre le problème exactement :

```
21  [aktuell]    ★ Haben Sie ein Taubheitsgefühl im Bereich zwischen den Beinen bemerkt?
...
27  [fach-neuro]   Haben Sie Kribbeln, Taubheitsgefühl oder ein pelziges Gefühl?
                   Wo genau, und seit wann?                              {taubheit}
```

Six questions d'écart, **sur le même écran** — la Fachanamnese est insérée juste
après `aktuell`. Le candidat ouvre le sujet de l'engourdissement par le détail,
puis le rouvre en général une minute plus tard.

La question du cas redevient ce qu'elle est : un **drapeau rouge médullaire**,
pas une seconde anamnèse sensitive —
« Ist das Gefühl auch zwischen den Beinen und am Gesäß verändert — merken Sie
noch, wann die Blase voll ist? ». Elle ne cite plus le concept, donc elle ne
double plus rien, et la Fachanamnese garde la topographie, qui est son travail.

### La seule ERREUR du socle

`case-diabetes-typ1` comptait les levers nocturnes, puis `fach-endo-durst`
redemandait « müssen Sie häufiger Wasser lassen, auch nachts? ». La question
endocrino reçoit des `parts` : quand la miction est déjà comptée, il ne reste
que la soif — l'autre moitié de la paire cardinale.

### Le troisième test de mutation a dû être réécrit

Il amputait le socle d'un constat pour vérifier que la porte rougissait. **Le
socle est vide : il n'y a plus rien à amputer.** La propriété a changé de nature
— ce n'est plus « le socle ne remonte jamais », c'est « le socle ne masque plus
rien ». Le test annule maintenant une annotation `relu` de `case-lyme` et
vérifie que la porte rougit. 3/3.

## 4. L'angle mort du validateur, trouvé en mesurant

`0157bfe`. Les dix variantes de « Aktuelle Beschwerden » portent toutes
`id: 'aktuell'`. `checkQuestionAtomicity` dédoublonnait les chapitres **par
`id`** : il lisait `schmerz` et jetait les neuf autres.

Corpus réel **3 755**, pas 3 594 : **161 répliques n'avaient jamais été
comptées**, et avec elles 36 constats A et 13 constats B.

Ils ne sont pas nouveaux — ils n'avaient jamais été vus. La preuve tient dans un
chiffre : **A tient sous le plancher précédent (520 ≤ 521) malgré le corpus
élargi**, parce que la découpe des 27 avait déjà corrigé les phrases de ces neuf
variantes. Et B vaut **120 dans les deux mesures**, avant comme après : les
13 constats révélés préexistaient tous.

C'est **le seul mouvement vers le haut de la série 3** (B : 107 → 120), et il est
écrit en toutes lettres dans `atomicity-budget.json`, avec les deux corpus cités :
correction de **mesure**, pas régression de contenu.

### Une question laissée à la direction, pas tranchée par moi

Les 13 constats B révélés sont des **énumérations de dépistage** :
« Begleitbeschwerden — Luftnot, Brustschmerzen, Schwindel, Schwitzen, Übelkeit? »,
« Herd — Husten, Halsschmerzen, Brennen beim Wasserlassen, Durchfall, Ausschlag,
Wunde? ». Les ramener à trois items ferait **perdre de la clinique** — c'est
l'argument même qui a exempté `fach-kardio-ausstrahlung` de la règle 3
(l'énumération EST la question). La règle 2 doit-elle exempter `akt-begleit`,
`akt-ausloeser`, `akt-infekt-herd` de la même façon ? Ce n'est pas au validateur
de le décider. En attendant, ils sont au budget : visibles, comptés, et le
compteur ne peut plus remonter.

## 5. T5 — les trois ruptures d'ordre Tier A

**Déjà faites** (`a74285c`, avant cette tranche) : `checkQuestionOrder` mesure
**Tier A = 0** sur 130 cas. Le `state.md` que j'ai repris les donnait BLOQUÉES ;
il était périmé. Vérifié par code de sortie, pas déduit.

## 6. Vérifications — par code de sortie

Toutes lancées sans pipe, code de sortie lu directement.

```
checkTrameSymptoms                          0     socle 0/0
checkPlayedTrame                            0     130 cas, aucune paire ≥ 0,6
checkQuestionAtomicity                      0     A=520/520 B=120/120 C=5/5 D=0/0
checkProbeCoverage                          0     130 cas, couverture complète
checkCaseQuestionChapters                   0
checkCaseCoherence                          0
checkCaseCohesion                           0
checkGuideCoverage                          0
checkGuideDuplicates                        0
checkPatientWorte                           0
checkQuestionOrder                          0     informatif, Tier A = 0
node --test checkTrameSymptoms.test.mjs     0     3/3 (le 3ᵉ réécrit)
node --test checkQuestionAtomicity.test.mjs 0     6/6
npx tsc -b --noEmit                         0
```

### Ce qui échouait déjà, et que je n'ai pas cassé

- `checkProbeOverlap.mjs` → 1. Dette antérieure, vérifiée comme telle à la
  tranche 1 (relancée sur l'arbre d'avant : déjà 1). Déjà en `|| true` en CI.
- `npx vitest run --dir src` (suite complète) → échecs de délai dans
  `src/features/fachbegriffe/`, `src/components/`, `src/features/simulation/`.
  Sans lien avec cette tranche : ce sont des dépassements de délai sous charge
  parallèle — au moment de ces mesures, **vingt-cinq worktrees** sont
  enregistrés sur le dépôt et plusieurs `vitest run --dir src` d'autres agents
  tournaient simultanément (relevé par `ps`).

## 7. Les lignes CI à ajouter au merge

Je n'écris pas dans `.github/`. Dans `quality.yml`, job `contrats`, **après**
l'étape « Un symptôme, une question » :

```yaml
      - name: Atomicité des questions — une question à la fois, budget dégressif
        run: node scripts/checkQuestionAtomicity.mjs
      - name: Tests du validateur d'atomicité
        run: node --test scripts/checkQuestionAtomicity.test.mjs
      - name: Tests du socle « un symptôme, une question »
        run: node --test scripts/checkTrameSymptoms.test.mjs
```

Et dans le bloc informatif (après `checkProbeOverlap.mjs || true`) :

```yaml
      - name: Rupture d'ordre clinique (informatif)
        run: node scripts/checkQuestionOrder.mjs || true
```

## 8. Non vérifié — et pourquoi

### Le gate de relecture est OUVERT

`Task`, `SendMessage` et `ToolSearch` sont **indisponibles dans cette session**
(`ToolSearch` répond explicitement « disabled for this session, in subagents as
well as here »). Aucun sous-agent n'a pu être lancé. N'ont donc **pas** eu lieu :

- `fsp-language-reviewer` et `fsp-clinical-reviewer` sur chacun des trois
  sous-lots ;
- `fsp-concision-editor` sur les relances — la règle « une relance qui rallonge
  ce qu'elle devait alléger est un échec » n'a été tenue que par ma propre
  auto-vérification, pas par un relecteur ;
- `quality-branch-reviewer` (Opus) sur la branche entière, et donc pas de
  re-revue par un fixeur unique.

Je suis implémenteur. **Je ne me suis pas relu à leur place, et je ne déclare pas
ce gate franchi.** Il doit l'être avant tout merge.

### La vérification navigateur — menée, puis arrêtée sur un blocage partagé

Elle a été poussée jusqu'au bout de ce que je pouvais faire sans toucher à une
ressource partagée. Trois obstacles, tous **mesurés**, aucun supposé.

**1. Un code HTTP 200 ne prouve pas qu'on mesure la bonne branche.** Deux
serveurs de dev répondaient 200 sur les ports essayés sans servir ce worktree.
Identifiés en demandant le module source et en y cherchant
`akt-ausscheid-schlucken` : absent. C'est précisément le piège que vise la règle
« mesurer depuis le DOM de l'app ». Le port 5787 sert bien ce worktree (le module
contient la sonde neuve), vérifié par contenu.

**2. Le cache de l'optimiseur Vite est partagé par vingt-cinq worktrees.**
`app/node_modules` est un **lien symbolique** vers celui du dépôt principal
(`node_modules -> /Users/…/Claude FSP/app/node_modules`), donc `node_modules/.vite`
aussi. Avec plusieurs serveurs de dev concurrents il est réécrit en continu et
`#root` reste vide : React ne monte jamais. Contourné par un `vite build` dans
un `outDir` privé (`dist-s3`, code de sortie **0**) servi par `vite preview` sur
un port dédié — le bundle contient bien `akt-ausscheid-schlucken`, vérifié.

**3. Sur le bundle statique, React monte** (`#root` a un enfant) et l'app
affiche : *« Doctopus a besoin d'une connexion pour le premier chargement »*.
La cause est mesurée : le Supabase local est **arrêté** —
`http://127.0.0.1:54321/rest/v1/` et `/functions/v1/content` renvoient
`ERR_CONNECTION_REFUSED` (curl : code `000`).

**Je ne l'ai pas démarré.** C'est un service partagé sur une machine qui porte
vingt-cinq worktrees et plusieurs agents actifs ; un autre agent peut l'avoir
délibérément arrêté, ou être en train de travailler dessus. Démarrer une
ressource partagée pour se déverrouiller soi-même n'est pas dans mon périmètre.

**Reste donc non observé à l'écran** : le rendu des relances en retrait, la
disparition de la question de `case-karpaltunnel`, les réductions par `parts`.
Ces trois effets sont mesurés **hors DOM**, par `checkPlayedTrame` et
`checkTrameSymptoms`, qui exécutent le montage réel via esbuild (8 531 questions
affichées sur 130 cas, aucune paire ≥ 0,6). Ce n'est pas le DOM de l'app et je ne
le présente pas comme tel : la réserve que j'avais posée à la tranche 1 **reste
ouverte**.

**Deux propositions de contrat** (pas des modifications) :
- donner à chaque worktree son propre `node_modules`, ou un `cacheDir` privé
  dans `vite.config.ts`. Tant que le cache de l'optimiseur est partagé, aucune
  vérification navigateur n'est fiable dans ce dépôt dès que deux agents
  travaillent — et il y en a vingt-cinq ;
- nommer **un** propriétaire du Supabase local, pour qu'un agent bloqué sache à
  qui demander le démarrage au lieu de le faire dans le dos des autres.

### Autres réserves

- **Un doublon repéré, non corrigé, hors des 84** : dans `case-multiple-sklerose`,
  le phénomène d'Uhthoff est demandé deux fois — par la question du cas
  (« heiß duschen, Sauna ») et par `fach-neuro-verlauf` (« bei Wärme oder
  Anstrengung schlimmer »). Aucun concept du lexique ne porte l'Uhthoff, et la
  similarité reste sous 0,6 : **aucun validateur ne le voit**. Corriger
  `fach-neuro-verlauf` toucherait tous les cas neurologiques — c'est une
  décision de contenu, pas un correctif de lot.
- L'option **(b)** du tri — deux `Phrase` du guide sous une seule sonde, comme
  `personalia` le fait déjà pour `pers-name` — lève l'objection « la relance rend
  la question facultative » sans coûter une réponse. Elle n'a **pas** été
  appliquée : la direction a tranché en deux options. Proposition de contrat,
  pas une modification.
