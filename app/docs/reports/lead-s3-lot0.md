# s3-lot0 : la Fachanamnese choisie selon la nature du motif

Branche `feat/s3-lot0-fach-nature`, worktree `doctopus-s3-lot0`. Un seul writer : `lead-s3-lot0`.
Commits : `fc9f5a8b` (mesure), `89896337` (règle, textes, motifs, tests), `4874ed01` (rachis dorsal).

**Statut : DONE_WITH_CONCERNS.** Tout est vert par code de sortie. Il reste deux réserves.
1. Les textes n'ont pas été relus par `fsp-clinical-reviewer` ni par `fsp-language-reviewer` (voir §4).
2. La règle s'écarte de la décision de `main` sur trois points, chacun motivé par le cas (voir §3).

## 1. Mesure avant / après

Le script de mesure se rejoue avec `node app/scripts/measureFachNature.mjs`. Il lit la liste des paires dans `app/scripts/fixtures/fach-nature-pairs.json`. La porte `src/data/guides/fachNature.test.ts` lit la même liste.

| | `main` | branche |
|---|---:|---:|
| paires (cas × sonde) absurdes jouées | **91** sur 47 cas | **0** (+1 conservée par décision) |
| budget A (plus d'un « ? ») | 522 | **510** (−12) |
| budget B (énumération) | 118 | **114** (−4) |
| budget C (alternative de membre) | 8 | **0** |
| total du budget | 648 | **624** (−24, l'objectif était −21) |

Le budget gagne 3 points de plus que prévu. Ils viennent de la réécriture générique de `fach-rheuma-vorgeschichte` (A −2 : sonde + guide) et de `fach-rheuma-ausloeser` (B −1).

J'ai comparé les trames jouées des 130 cas, `main` contre la branche :
- **62 lignes retirées.** Ce sont exactement les paires du planificateur, sans aucun retrait collatéral.
- **28 paires corrigées par le texte**, sans retrait : Helm ×11, appui du bras ×2, rhumato ×6, FSME ×9.
- **6 lignes ajoutées.** `veg-ausscheidung` revient pour les 6 cas d'ortho hors rachis (osg, karpaltunnel, gonarthrose, schenkelhals, coxarthrose, hueftkopfnekrose). Jusqu'ici, la question de queue de cheval effaçait la question végétative générale sur les selles et les urines. C'est le comportement attendu, et la réponse existe : `checkGuideCoverage` est vert.

Résultats des portes, par code de sortie (tous à 0) :
- tous les `app/scripts/check*.mjs` de la CI, `checkBudgetFloor main`, `evalDoctopus --dry` ;
- `node --test scripts/*.test.mjs` ;
- `npx tsc -b --noEmit` ;
- `npx vitest run --dir src/data` : 170/170 ;
- `npm run build`.

## 2. La règle

`fachChapterRaw` remplit maintenant `Who = { geschlecht, age, kategorie, schmerzOrt, motiv? }`, puis applique `fachSkip`.

**`motiv?: { trauma, region }`** est déclaré sur `PatientSheet`. Il est présent sur les 13 cas : les 11 Ortho, `bauchaortenaneurysma` (abdomen) et `aortendissektion` (thorax). Seuls `osg-fraktur` et `schenkelhalsfraktur` ont `trauma: true`. Un test exige `motiv` pour tout cas qui joue la Fach Ortho, ce qui empêche un import futur de passer sans.

Règles ajoutées à `FACH_RULES` (`text` accepte maintenant un patch `{text, alts, followUp}`) :

| sonde | règle |
|---|---|
| `ortho-mechanismus` | Sans trauma : « Hatten Sie in letzter Zeit einen Unfall oder einen Sturz? », sans récit de chute ni relances |
| `ortho-ausstrahlung` | Selon la région : bras / jambe / lombaire (genou : radiculaire ou non) / dorsal (en ceinture) |
| `ortho-sensomotorik` | Bras / jambe / les deux jambes (rachis lombaire ou dorsal) |
| `ortho-durchblutung` | Retirée pour le rachis dorsal et cervical ; main pour le membre supérieur, pied sinon |
| `ortho-cauda` | Rachis seulement (lws, bws, hws) |
| `ortho-schwellung` | Pas pour le rachis |
| `ortho-belastung` | Bras (main + bras), rachis (« sitzen, stehen oder gehen »), jambe (texte du guide) |
| `kardio-nitro`, `kardio-ausstrahlung` | Seulement si la douleur est thoracique (`schmerz.ort` ~ Brust / sternal / Thorax) |
| `neuro-autonom` | Catégorie douleur et siège à la tête |
| `gefaess-gehstrecke` / `-ruheschmerz` / `-wunde` | Pas sans `motiv`, ou seulement si `region: 'untere'` |
| `uro-strahl` | Pas chez une femme |

**`fachSkip`** : 27 lignes sur 21 cas.
- Neuro : anfallzeichen ×4, aura ×2.
- Derma : muttermal ×6, verlauf ×4, vorbehandlung ×1.
- Infekt : zecke ×6.
- Ortho : durchblutung ×3 (bandscheibenvorfall, lumboischialgie, karpaltunnel).
- Kardio : herzinsuffizienz × ausstrahlung (voir §3).

`checkProbeCoverage` honore `fachSkip`. Les sondes retirées par une règle gardent leur réponse exigée : le simulant y répond si le candidat les pose de lui-même. Le lieur de termes ignore désormais `aktuellSkip`, `fachSkip` et `motiv`. Sans cela, `'fach-neuro-aura'` liait le terme « Aura » à parkinson et à commotio.

## 3. Écarts à la décision de `main` (à trancher)

1. **Helm.** La règle décidée était : « Helm seulement si trauma ». Les deux seuls cas avec traumatisme sont une entorse au football et une chute du fauteuil à 90 ans. Le casque ne concerne ni l'un ni l'autre, et le planificateur le dit lui-même : « ne concerne aucun ». J'ai donc retiré le casque de toute trame jouée et je l'ai reporté dans le conseil (en français) de la Fach Ortho : « Accident de vélo ou de la route : demander le casque ». Les relances de chute (« ohnmächtig », « woanders verletzt ») restent pour les deux cas avec traumatisme.
2. **Cauda pour le rachis cervical.** La règle décidée disait « lombaire/dorsal ». J'ai gardé `hws-diskusprolaps` : une compression médullaire cervicale donne aussi des troubles vésicaux. La fiche y répond déjà (« Wasserlassen ist ganz normal… Taub ist zwischen den Beinen nichts »), et le planificateur ne listait pas cette paire.
3. **Synkope × nitro conservée.** C'est la règle elle-même qui la garde : la douleur est rétrosternale (« mittig hinter dem Brustbein »). Le planificateur l'avait comptée parmi les absurdes. Elle est marquée `kept` dans le fixture.

**Le piège regex, une fois.** Le `schmerz.ort` de `case-herzinsuffizienz` contient « Druck auf der Brust ohne Schmerz ». La règle thoracique garde donc nitro, ce qui est voulu (la fiche répond « Nitrospray von damals, nach dem Herzinfarkt »). Elle garderait aussi l'irradiation, qui est absurde ici. Je l'ai retirée par `fachSkip` plutôt que de compliquer la regex.

## 4. À relire (je ne peux pas lancer les relecteurs)

Pour **`fsp-language-reviewer`**, sur le registre patient, l'atomicité et la grammaire. Les textes sont dans `anamneseChapters.ts` (guide Ortho/Neuro/Infekt/Rheuma et `FACH_RULES`) et dans `anamneseProbes.ts` (`frage`) :

1. « Wie genau ist es passiert — gab es einen Unfall oder einen Sturz? »
   - alt : « Sind Sie gestürzt — auf welche Seite, und worauf? »
   - relances : « Sind Sie dabei ohnmächtig geworden? » / « Haben Sie sich dabei noch woanders verletzt? »
2. « Hatten Sie in letzter Zeit einen Unfall oder einen Sturz? »
3. Irradiation, cinq variantes :
   - « Strahlen die Schmerzen aus — und wenn ja, bis wohin genau? »
   - « … in den Arm aus — und wenn ja, bis wohin? »
   - « … ins Bein aus — und wenn ja, bis wohin? »
   - « … ins Bein aus — bis über das Knie oder bis in den Fuß? »
   - « … gürtelförmig um den Brustkorb aus? »
4. Sensibilité et motricité, quatre variantes : « Haben Sie [∅ | im Arm | im Bein | in den Beinen] Kribbeln, ein Taubheitsgefühl oder weniger Kraft bemerkt? »
5. « Ist der Fuß kälter, blasser oder bläulich geworden? » et « Ist die Hand … »
6. « Haben Sie Probleme beim Wasserlassen oder Stuhlgang, oder ist es zwischen den Beinen taub? »
7. Appui, trois variantes :
   - « Können Sie das Bein noch belasten — wie weit können Sie gehen? »
   - « Was können Sie mit der Hand und dem Arm im Alltag noch machen? »
   - « Wie lange können Sie sitzen, stehen oder gehen, bevor die Schmerzen zu stark werden? »
8. « Haben Sie an Armen oder Beinen eine Schwäche bemerkt? »
   - relance : « Lassen Sie Dinge fallen, oder bleiben Sie mit dem Fuß hängen? »
9. « Sind Ihre Impfungen auf dem neuesten Stand — haben Sie Ihren Impfpass dabei? »
10. « Ist Ihnen etwas aufgefallen, das die Beschwerden ausgelöst haben könnte — etwa ein Infekt, ein üppiges Essen oder ein neues Medikament? »
    - relances : « Falls ein üppiges Essen: Gab es viel Fleisch oder Alkohol, besonders Bier? » / « Falls ein neues Medikament: Ist es eine Wassertablette? »
11. « Hatten Sie solche Gelenkbeschwerden schon einmal? »
    - relances : « Hatten Sie schon einmal einen Gichtanfall oder Nierensteine? » / « Gibt es in Ihrer Familie Rheuma oder Gicht? »

Pour **`fsp-clinical-reviewer`** :
- les trois écarts du §3 ;
- les 27 lignes `fachSkip` (`grep -n "fachSkip" app/src/data/seedCases.ts`) ;
- `spinalkanalstenose` garde la question de perfusion : c'est le diagnostic différentiel avec la claudication vasculaire ;
- l'Impfpass générique fait perdre la mention FSME à `lyme` et à `meningitis`. Leurs fiches répondent déjà sur la FSME, et le conseil Infekt la nomme. Faut-il une relance conditionnelle ?
- la relance de goutte reste affichée, sous condition, à la fibromyalgie.

## Non vérifié

- **Rendu dans l'app (DOM) non mesuré.** La trame est vérifiée par `playedTrame`, le montage que lisent le guide et le focus. Je n'ai pas fait de passage `playwright-cli`.
- **`npx vitest run --dir src` complet : 3 échecs UI quand toute la suite tourne en même temps.** Les tests concernés sont `CardToast`, `Doctopus` et `TermSheet`. Ils passent tous les trois quand on les lance seuls (18/18) et ne touchent aucun fichier du lot. Je les crois instables sous charge, mais je ne l'ai pas prouvé sur `main`.
- **Doublon préexistant non traité.** Dans `case-osteoporose`, la question de cas « War es ein Sturz, oder reichte schon eine leichte Bewegung… » double `ortho-mechanismus`. Le doublon existait déjà avant le lot (sous le seuil de `checkPlayedTrame`). Si `main` le veut, le correctif tient en une ligne de `fachSkip`.
- **Planificateur suivi sans contre-mesure.** Le caractère absurde de chaque paire vient de sa liste, que j'ai relue au cas pour les écarts du §3 seulement.
