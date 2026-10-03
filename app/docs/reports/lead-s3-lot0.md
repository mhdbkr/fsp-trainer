# s3-lot0 : la Fachanamnese choisie selon la nature du motif

Branche `feat/s3-lot0-fach-nature`, worktree `doctopus-s3-lot0`. Un seul writer : `lead-s3-lot0`.

Commits :
- lot : `fc9f5a8b` (mesure), `89896337` (règle, textes, motifs, tests), `4874ed01` (rachis dorsal), `f53530a2` (rapport) ;
- correctifs après revue : `840e4a00` (I1), `13174237` (I2), `f782c649` (I3), m1, m2, cliniques 1 à 5, mineurs de langue.

**Statut : DONE.** Les deux revues indépendantes sont reportées au §5. Tous leurs items sont corrigés, chacun avec un test rouge d'abord. Les items hors périmètre L0 restent tracés par `main`.

## 1. Mesure avant / après

Le script de mesure se rejoue avec `node app/scripts/measureFachNature.mjs`. Il lit la liste des paires dans `app/scripts/fixtures/fach-nature-pairs.json`. La porte `src/data/guides/fachNature.test.ts` lit la même liste, et `checkBudgetFloor` en fait un plancher.

| | `main` | branche |
|---|---:|---:|
| paires (cas × sonde) absurdes jouées | **90** sur 46 cas (+1 que la règle conserve : synkope × nitro) | **0** (+1 conservée) |
| budget A (plus d'un « ? ») | 522 | **510** (−12) |
| budget B (énumération) | 118 | **114** (−4) |
| budget C (alternative de membre) | 8 | **0** |
| total du budget | 648 | **624** (−24, l'objectif était −21) |

Le budget gagne 3 points de plus que prévu. Ils viennent de la réécriture générique de `fach-rheuma-vorgeschichte` (A −2) et de `fach-rheuma-ausloeser` (B −1).

Comparaison des trames jouées des 130 cas, `main` contre la branche :
- **61 lignes retirées.** Ce sont les 60 paires du planificateur retirées par une règle ou par `fachSkip`, plus `osteoporose × ortho-mechanismus` (revue clinique, item 5). Aucun retrait collatéral.
- **30 paires corrigées par le texte**, sans retrait : Helm ×11, appui du bras ×2, rhumato ×6, FSME ×9, plaie de jambe des aortes ×2.
- **6 lignes ajoutées.** `veg-ausscheidung` revient pour les 6 cas d'ortho hors rachis : la question de queue de cheval l'effaçait jusqu'ici. La réponse existe (`checkGuideCoverage` est vert).

Les portes sont listées au §6.

## 2. La règle

`fachChapterRaw` remplit maintenant `Who = { geschlecht, age, kategorie, schmerzOrt, motiv? }`, puis applique `fachSkip`.

**`motiv?: { trauma, region }`** est déclaré sur `PatientSheet`. Il est présent sur les 13 cas : les 11 Ortho, `bauchaortenaneurysma` (abdomen) et `aortendissektion` (thorax). Seuls `osg-fraktur` et `schenkelhalsfraktur` ont `trauma: true`. Un test exige `motiv` pour tout cas qui joue la Fach Ortho.

La question canonique (`frage`) et le guide ne nomment aucun membre : le Rollenskript affiche la `frage` telle quelle (I1). C'est la trame jouée qui dit le membre du cas.

| sonde | règle |
|---|---|
| `ortho-mechanismus` | Sans trauma : « Hatten Sie in letzter Zeit einen Unfall oder einen Sturz? », sans relances. Le casque n'est posé dans aucune trame. |
| `ortho-ausstrahlung` | Bras, jambe (« ins Bein aus — und wenn ja, bis wohin? »), lombaire (« Ziehen die Schmerzen bis ins Bein hinunter — und wenn ja, wie weit? »), dorsal (en ceinture) |
| `ortho-sensomotorik` | Bras ou jambe ; neutre pour le rachis |
| `ortho-durchblutung` | Retirée pour le rachis dorsal et cervical ; main (membre supérieur), pied (membre inférieur, rachis lombaire) |
| `ortho-cauda` | Rachis seulement (lws, bws, hws) |
| `ortho-schwellung` | Pas pour le rachis |
| `ortho-belastung` | Bras (main + bras), rachis (« sitzen, stehen oder gehen »), jambe (« Wie weit können Sie noch gehen? ») |
| `kardio-nitro`, `kardio-ausstrahlung` | Douleur thoracique : Brust, sternal, thorakal/Thorax, präkordial, « Herz » en début de mot |
| `neuro-autonom` | Catégorie douleur et siège à la tête |
| `gefaess-gehstrecke`, `-ruheschmerz` | Retirées aux aortes (`motiv.region` ≠ `untere`) |
| `gefaess-wunde` | Aortes : « Ist ein Fuß kalt, blass oder bläulich? » (malperfusion, sans la plaie) |
| `uro-strahl` | Pas chez une femme |

**`fachSkip`** : 28 lignes sur 22 cas.
- Neuro : anfallzeichen ×4, aura ×2.
- Derma : muttermal ×6, verlauf ×4, vorbehandlung ×1.
- Infekt : zecke ×6.
- Ortho : durchblutung ×3, mechanismus ×1 (osteoporose).
- Kardio : herzinsuffizienz × ausstrahlung. Son `schmerz.ort` dit « Druck auf der Brust ohne Schmerz » : nitro reste posé, comme voulu ; l'irradiation est retirée.

`checkProbeCoverage` refuse un id de `fachSkip` inexistant ou hors de la Fach jouée. `fachSkip` ne dispense plus de la réponse : le simulant répond si le candidat pose la question de lui-même (I3).

La relance FSME (« Falls ja: Sind Sie gegen FSME geimpft? ») est accrochée à `fach-infekt-zecke`. Elle n'apparaît donc que dans les trames qui posent la tique : lyme, meningitis, malaria, typhus, rheumatisches-fieber.

## 3. Écarts à la décision initiale de `main`

La revue clinique les a jugés justes.
1. **Helm** hors de toute trame jouée. Il reste dans le conseil de la Fach Ortho (« Accident de vélo ou de la route : demander le casque »).
2. **Cauda gardée pour le rachis cervical** : une compression médullaire cervicale donne aussi des troubles vésicaux.
3. **Synkope × nitro conservée** : la douleur est rétrosternale. L'entrée est marquée `kept` dans le fixture, et le plancher empêche le nombre de `kept` de monter.

## 4. Textes du lot

Toutes les répliques sont à une seule question.

**Ortho**
- « Wie ist es passiert? »
  - alt : « Was genau ist passiert? »
  - relances : « Sind Sie dabei ohnmächtig geworden? » / « Haben Sie sich dabei noch woanders verletzt? »
- Sans trauma : « Hatten Sie in letzter Zeit einen Unfall oder einen Sturz? »
- Irradiation : les variantes du §2.
- « Haben Sie [∅ | im Arm | im Bein] Kribbeln, ein Taubheitsgefühl oder weniger Kraft bemerkt? »
- « Ist [die betroffene Stelle | die Hand | der Fuß] kälter, blasser oder bläulich geworden? »
- « Haben Sie Probleme beim Wasserlassen oder Stuhlgang, oder ist die Haut zwischen den Beinen taub? »
- « Können Sie die betroffene Seite noch belasten? », puis les trois variantes du §2.

**Neuro**
- « Haben Sie an Armen oder Beinen eine Schwäche bemerkt? »
  - relance : « Lassen Sie Dinge fallen, oder bleiben Sie mit dem Fuß hängen? »

**Infekt**
- « Sind Ihre Impfungen auf dem neuesten Stand? »
- Sous la tique : « Falls ja: Sind Sie gegen FSME geimpft? »

**Rheuma**
- « Ist Ihnen etwas aufgefallen, das die Beschwerden ausgelöst haben könnte — etwa ein Infekt, ein üppiges Essen oder ein neues Medikament? »
  - relances : la goutte (Fleisch/Bier, Wassertablette).
- « Hatten Sie solche Gelenkbeschwerden schon einmal? »
  - relances : Gichtanfall/Nierensteine, famille.

**Réponses patient retouchées**
- `bandscheibenvorfall` et `lumboischialgie` : la réponse à `ortho-mechanismus` commence par « Nein, kein Unfall — ».

## 5. Revues

### Revue clinique et langue (Sonnet) : aucun bloquant

Les 62 retraits annoncés sont exactement ceux faits, et les trois écarts du §3 sont justes.

| item | correctif |
|---|---|
| 1. `gefaess-wunde` retirée aux aortes : la dissection perdait sa malperfusion voulue | Reformulée, plus retirée ; test « la dissection garde le pied froid » |
| 2. Irradiation lombaire suggestive (« bis über das Knie oder bis in den Fuß? ») | Question ouverte. Le texte de la jambe doublait à 0,60 une question de cas de `bandscheibenvorfall`, d'où une formulation propre au rachis lombaire. |
| 3. Deux questions sous un seul « ? » | « Wie ist es passiert? », variante unique, Impfungen seules, « Wie weit können Sie noch gehen? » |
| 4. Décision de `main` : relance FSME | Sous `fach-infekt-zecke` ; test : présente à lyme et meningitis, absente à tonsillitis, hepatitis-b, covid19 |
| 5. Doublon `case-osteoporose` | `fachSkip: ['fach-ortho-mechanismus']` |
| mineurs | « die Haut zwischen den Beinen » ; sensibilité neutre au rachis ; « Nein, kein Unfall — » |

Hors périmètre, tracé par `main` pour le lot suivant :
- « wirklich im Knie » de `case-coxarthrose` ;
- les quatre questions veineuses posées aux aortes ;
- la région `untere` trop large.

### Revue mécanique (Opus) : mesure honnête, aucun retrait hors liste, merge sans conflit

| item | correctif | preuve |
|---|---|---|
| I1. Le Rollenskript affichait « Ist der Fuß kälter? » au simulant de karpaltunnel | `frage` et guide neutres ; le pied et la main passent par `FACH_RULES` ; C reste 0 | test vitest : la fiche de rôle de karpaltunnel et de hws ne nomme ni le pied ni la marche |
| I2. Aucun plancher sur la liste des paires | `checkBudgetFloor` lit `fach-nature-pairs.json` : chaque paire est une clé (disparue = rouge), et le nombre de `kept` ne monte pas | 2 tests de mutation (`checkBudgetFloor.test.mjs`) |
| I3. `fachSkip` non validé, et sa dispense masquait un vrai trou | Id inexistant ou hors Fach jouée → rouge ; dispense de réponse retirée | 3 tests de mutation sur copie (`checkProbeCoverage.test.mjs`, nouveau) |
| m1. Regex thoracique | thorakal, präkordial, « Herz » en début de mot (« Schmerz » exclu) | test sur cas fictifs |
| m2. Espace manquante dans « voyage.Érythème » | corrigé | — |
| m3. Chiffre faux dans le rapport | 90 paires sur 46 cas (+1 conservée), plutôt que « 91 sur 47 » | §1 |

**Proposition de contrat (hors de mon périmètre) :** `.github/workflows/quality.yml` liste les `node --test` un par un. Il faut y ajouter `node --test scripts/checkProbeCoverage.test.mjs`. La règle elle-même est déjà en CI, via `checkProbeCoverage.mjs`.

## 6. Portes (code de sortie 0)

- Tous les `app/scripts/check*.mjs` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry`.
- `node --test scripts/*.test.mjs`, dont les nouveaux tests de mutation.
- `npx tsc -b --noEmit`.
- `npx vitest run --dir src/data`.
- `node scripts/measureFachNature.mjs` : 0 / 91, 1 conservée.
- `node scripts/checkBudgetFloor.mjs origin/main` : vert. Le fixture des paires est absent d'`origin/main`, donc rien à comparer pour lui.

## Non vérifié

- **Rendu dans l'app (DOM) non mesuré.** La trame est vérifiée par `playedTrame`, et le Rollenskript par `buildRollenskript`. Je n'ai pas fait de passage `playwright-cli`.
- **`npx vitest run --dir src` complet sous forte charge machine (load ≈ 40).** Trois tests UI (`CardToast`, `Doctopus`, `TermSheet`) ont échoué une fois. Ils passent lancés seuls et ne touchent aucun fichier du lot ; je ne l'ai pas prouvé sur `main`.
- **Planificateur suivi.** Le caractère absurde de chaque paire vient de sa liste, confirmée par la revue clinique.
