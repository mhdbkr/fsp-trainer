# Lot L1 (série 3) — le tronc commun de la banque, atomique

Branche `feat/s3-l1-tronc`, partie de `origin/feat/s3-banque` @ `9dabc49c` (r5). Après le merge de #106, `origin/main` (`ebc1e5c8`) a été fusionné par un merge (`01fe47ee`, registre seulement, sans conflit). Commits fichier par fichier, sans trailer.

**Statut : DONE_WITH_CONCERNS.** Tout est vert au code de sortie (§ 7). Les réserves sont au § 8 : quatre questions du guide changent de contenu, six répliques sont retouchées pour une redite, et `checkProbeOverlap` (informatif) passe de 9 à 12 par une hausse de mesure.

## 1. Mesure (avant tout geste)

`checkQuestionAtomicity` sur `9dabc49c` donne A=239, A2=7, A3=17, B=53, D2=450, D3=12. La ventilation a été faite par un script de scratchpad. Il reprend le corpus exact du validateur, avec la même lecture, et le classe par **source** puis par **chapitre**. Pour une sonde, le chapitre est lu sur le préfixe de son id. Pour un énoncé de guide sans sonde, c'est le chapitre du guide.

| Source · chapitre | A | A2 | A3 | B | D2 | D3 |
|---|---:|---:|---:|---:|---:|---:|
| banque · personalia | 4 | 2 | 0 | 0 | 0 | 0 |
| banque · vegetativ | 11 | 0 | 0 | 0 | 0 | 0 |
| banque · vorerkrankungen | 2 | 0 | 0 | 1 | 0 | 0 |
| banque · medikamente | 1 | 0 | 0 | 0 | 0 | 0 |
| banque · allergien | 1 | 0 | 0 | 1 | 0 | 0 |
| banque · noxen | 2 | 0 | 0 | 0 | 0 | 0 |
| banque · familie-sozial | 8 | 0 | 1 | 1 | 0 | 0 |
| **tronc commun (L1)** | **29** | **2** | **1** | **3** | 0 | 0 |
| banque · aktuell (L2) | 28 | 2 | 2 | 16 | 0 | 0 |
| banque · fach (L4–L9) | 160 | 3 | 14 | 32 | 0 | 0 |
| page Guides `seedGuides` (L1b) | 22 | 0 | 0 | 2 | 0 | 0 |
| questions du cas | 0 | 0 | 0 | 0 | 0 | 0 |
| Oberarzt (exempté, compté) | 0 | 0 | 0 | 0 | 450 | 12 |
| **Total** | 239 | 7 | 17 | 53 | 450 | 12 |

Le tronc commun compte **136 énoncés** sur 5 184 : 134 sont rattachés à 29 sondes, et 2 sont des phrases sans sonde (récapitulation des Personalia, transition des Vorerkrankungen). Ces 136 énoncés portent **35 constats**, soit 12 % de A, 29 % de A2, 6 % de A3 et 6 % de B. Ils se répartissent ainsi :

- **20 constats sur le `frage` des sondes**, le repère affiché au simulant : 19 A et 1 A2 ;
- **15 constats sur le guide** :
  - 10 A, dont `veg-fieber` compté deux fois (la question et sa part, au même texte) ;
  - 1 A2 ;
  - 1 A3 ;
  - 3 B.

Les questions du cas sont déjà à 0 depuis Q7 et Q9.

## 2. Règle appliquée

- **Une réplique, une question.** Quand une ligne pose deux questions, la seconde devient une **relance de précision** de la même sonde. Elle porte le même id et n'a pas de `followUpSucht` : elle hérite du signe de sa mère. Elle est toujours posée (forme `immer`), et les « Falls ja » qui suivent s'y rapportent.
  - `groupFollowUps` montre d'abord les relances inconditionnelles, puis l'interrupteur « ja ».
  - Aucune `part` n'a été créée. Les sondes à plusieurs signes qui avaient des `parts` les gardent, avec le même découpage. Aucune réduction nouvelle n'est donc possible, et aucun cas nouveau de « réplique entière sous une question réduite » ne peut naître de ce lot.
- **Le `frage` d'une sonde** est désormais **la question mère du guide**, posée en une seule question.
- **Toute relance du tronc se pose seule.** Elle passe `promouvable` : elle est autonome, fait au moins quatre mots, et ne contient ni « es », ni « dabei », ni « das? », ni « sie » anaphorique. Il n'y a plus de « Seit wann? » nu.
- **Langue.** Les abréviations écrites (« z. B. », « kg »), le « / » et la note en français dans la relance de `fam-eltern` disparaissent.
- **Signes inchangés.** `PROBE_SUCHT` et `parts.sucht` ne bougent pas, `cohere` n'est pas touché. Le seul ajout côté moteur est le mot « woran », ajouté à `PART_INTERROG` (`phrases.ts`) : sans lui, « Woran ist … gestorben? » était jugé non autonome. Il n'a aucun autre effet sur la banque, car c'est le seul énoncé en « Woran ».

## 3. Avant / après, par sonde

Pour chaque sonde, ce tableau donne le guide (question ↳ relances) et le `frage`. Les ids sont inchangés. La colonne « Réplique (130 cas) » vérifie que la réplique répond toujours à ce qui est demandé.

| Sonde | Avant | Après | Réplique (130 cas) |
|---|---|---|---|
| pers-name | `frage` « Wie heißen Sie mit vollständigem Namen? Können Sie ihn buchstabieren? » | `frage` « Wie heißen Sie mit vollständigem Namen? » (le guide garde ses deux phrases) | nom + épellation : inchangé, la 2e phrase du guide demande l'épellation |
| pers-alter | « Wie alt sind Sie? Wann sind Sie geboren? » | « Wie alt sind Sie? » ↳ « Wann sind Sie geboren? » | âge + date : les deux sont demandés |
| pers-groesse | « Wie groß sind Sie und wie viel wiegen Sie derzeit? » (A2) | « Wie groß sind Sie? » ↳ « Wie viel wiegen Sie derzeit? » | taille + poids |
| pers-hausarzt | « Haben Sie einen Hausarzt? Wie heißt er / sie? » | « Haben Sie einen Hausarzt? » ↳ « Falls ja: Wie heißt Ihr Hausarzt? » | inchangé |
| veg-fieber | « Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt? » ↳ « Falls Fieber: Seit wann… » · « Wo haben Sie gemessen (z. B. im Mund)? » (question **et** part) | « Haben Sie in letzter Zeit Fieber gemessen? » ↳ « Falls ja: Seit wann haben Sie Fieber? » · « Wie hoch war die Temperatur? » · « Wo haben Sie die Temperatur gemessen, zum Beispiel im Mund? » (+ voyage, vaccins inchangés) | mesure / fièvre / voyage ; « gemessen » reste lu par `PRECISION` (P1-1 de la banque intact) |
| veg-uebelkeit | « Ist Ihnen übel? Mussten Sie sich übergeben? » | « Ist Ihnen übel? » ↳ « Mussten Sie sich übergeben? » ↳ Falls ja ×3 (parts inchangées) | nausée + vomissement |
| veg-ausscheidung | ↳ « Falls ja: Seit wann? » (question et deux parts) | « Seit wann » nomme son objet et passe en dernier : « Falls ja: Seit wann haben Sie Schwierigkeiten mit dem Stuhlgang? » (idem Wasserlassen ; question entière : « … beim Stuhlgang oder Wasserlassen? ») | inchangé ; r5 ouvre toujours sur « Wie oft … », sans « Seit wann? » orphelin derrière |
| veg-gewicht | ↳ « Falls ja: In welchem Zeitraum war das? » | ↳ « Falls ja: In welchem Zeitraum hat sich Ihr Gewicht verändert? » | inchangé |
| veg-appetit | « Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert? » | « Wie ist Ihr Appetit in letzter Zeit? » ↳ « Haben sich Ihre Essgewohnheiten verändert? » (« in letzter Zeit » : la part de fach-endo-gewicht dit déjà « Wie ist Ihr Appetit? », `checkGuideDuplicates` règle 2) | voir § 4 (prostatakarzinom) |
| veg-schlaf | « Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen? » | « Ist Ihr Schlaf erholsam? » ↳ « Haben Sie Probleme, ein- oder durchzuschlafen? » | inchangé |
| vor-erkrank | « Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte? » (B) ↳ « Welche sind das? » · « Seit wann sind sie bekannt? » · « Werden sie behandelt? » | « Haben Sie Vorerkrankungen, zum Beispiel Bluthochdruck oder Zuckerkrankheit? » ↳ « Welche Vorerkrankungen haben Sie? » · « Seit wann sind Ihre Vorerkrankungen bekannt? » · « Werden Ihre Vorerkrankungen behandelt? » | les répliques qui citent les lipides y répondent toujours (« Welche … ? ») |
| vor-op | ↳ « Was wurde operiert? » · « Wann war das? » · « Gab es dabei Komplikationen? » | ↳ « Was wurde bei Ihnen operiert? » · « Wann wurden Sie operiert? » · « Hatten Sie Komplikationen bei der Operation? » | inchangé |
| med-regelmaessig | ↳ « Welche Medikamente sind das? » · « Seit wann nehmen Sie sie? » · « In welcher Dosierung? » · « Wie oft am Tag? » | ↳ « Welche Medikamente nehmen Sie? » · « Seit wann nehmen Sie Ihre Medikamente? » · « In welcher Dosis nehmen Sie Ihre Medikamente? » · « Wie oft am Tag nehmen Sie Ihre Medikamente? » | inchangé |
| all-allergie | ↳ « Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf? » (B : 3 items > 2) | ↳ « Falls ja: Wie äußert sich Ihre Allergie? » | inchangé (la réaction) |
| all-unvertraeglich | « Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)? » | « Vertragen Sie bestimmte Nahrungsmittel nicht, zum Beispiel Milch oder Brot? » | les répliques disent « Milch, Brot » |
| nox-rauchen | ↳ « Wie viele Zigaretten ungefähr pro Tag? » · « Wann haben Sie aufgehört? » · « Wie viel haben Sie davor pro Tag geraucht? » | ↳ « Wie viele Zigaretten rauchen Sie ungefähr pro Tag? » · « Wann haben Sie mit dem Rauchen aufgehört? » · « Wie viele Zigaretten haben Sie früher pro Tag geraucht? » | inchangé |
| nox-alkohol | `frage` « Trinken Sie Alkohol? Was, wie oft und wie viel? » | `frage` « Trinken Sie Alkohol? » (guide inchangé) | inchangé |
| fam-familie | « Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen? » (B) ↳ « Welche Erkrankungen sind das? » · « Seit wann sind sie bekannt? » | « Gibt es in Ihrer Familie chronische Erkrankungen? » ↳ « Welche Erkrankungen kommen in Ihrer Familie vor? » · « Wer in Ihrer Familie ist betroffen? » | les répliques disent qui et quoi (souvent l'âge), presque jamais « depuis quand » |
| fam-eltern | ↳ « Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“) » · « Wann war das? » | ↳ « Woran ist Ihre Mutter oder Ihr Vater gestorben? » · « Wann ist Ihre Mutter oder Ihr Vater gestorben? » ; « Mein herzliches Beileid. » passe au tip du chapitre | inchangé |
| fam-stand | « Wie ist Ihr Familienstand? Haben Sie Kinder? » ↳ « Wie viele, und sind sie gesund? » (A + A3) | « Wie ist Ihr Familienstand? » ↳ « Haben Sie auch Kinder? » ↳ « Falls ja: Sind Ihre Kinder gesund? » | les répliques donnent le nombre d'elles-mêmes ; voir § 8 |
| fam-beruf | « Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation? » | « Was sind Sie von Beruf? » ↳ « Empfinden Sie Stress durch Ihre Arbeitssituation? » ↳ « Falls in Rente: … » (parts inchangées) | inchangé |
| pers-beruf | « Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen? » | « Kommen Sie bei der Arbeit mit Staub, Chemikalien oder Dämpfen in Kontakt? » (`braucht: beruf` gardé) | inchangé |
| fam-wohnen | « Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug? » | « Wohnen Sie allein oder mit jemandem zusammen? » ↳ « Leben Sie in einer Wohnung oder in einem Haus? » · « In welchem Stockwerk wohnen Sie? » · « Hat Ihr Haus einen Aufzug? » | inchangé |
| récapitulation (sans sonde) | « … wiegen … kg » | « … wiegen … Kilo » | — |

Les `frage` de veg-ausscheidung, veg-gewicht, veg-schlaf, vor-op, med-regelmaessig, all-allergie, nox-rauchen, fam-familie, fam-eltern, fam-beruf et fam-wohnen ont été réduits de la même façon, chacun à sa question mère.

**Relances du tronc.** On en comptait 51 avant le lot, dont 15 ne se posaient pas seules au sens de `promouvable`. D'autres renvoyaient sans être vues, par exemple « Seit wann sind sie bekannt? ». Après le lot, il y en a 62, et **toutes se posent seules**.

## 4. Impact sur les 130 cas

- **Structure de la trame jouée** : seuls les nombres de relances (`↳n`) changent, et seulement dans le tronc. Le gel `trame-actuelle.txt` a été regravé. Hors `↳n`, le diff fait une ligne : prostatakarzinom.
- **Écarts de `cohere`.** Les décisions sur les questions mères sont identiques dans 129 cas. Les écarts supplémentaires sont ceux des nouvelles relances, qui suivent leur mère (INV-87).
- **Une ouverture r5 nouvelle : prostatakarzinom, `veg-appetit`.** Avant, la question était retirée, car `akt-begleit` disait « kaum noch Appetit ». Désormais, la relance « Haben sich Ihre Essgewohnheiten verändert? » se pose seule et r5 l'ouvre. La patiente répond « Der Appetit ist seit etwa drei Monaten deutlich schlechter. Meine Frau sagt, ich lasse das halbe Essen stehen. ». La réplique répond bien à la question et apporte le début, qui n'avait pas été dit. Sa première demi-phrase redit tout de même l'appétit : c'est **le seul cas** du lot qui ressemble au défaut « réplique entière sous une question réduite ». Je le laisse et je le signale.
- **Réplique entière sous une question réduite** : aucun cas nouveau en dehors de prostatakarzinom. Aucune `part` n'a été ajoutée et les découpages existants sont intacts.
- **Six répliques retouchées pour une redite** (reliquat Q7 § 6.3). Chaque fois, la Fach ou `akt-frueher`, jouée **avant**, disait déjà le fait. Les faits nouveaux sont gardés, aucun n'est ajouté :

| Cas | Réplique | Redite retirée | Gardé |
|---|---|---|---|
| bronchialkarzinom | fam-familie | père mort d'un cancer du poumon à 72 ans, « sonst kein Krebs » (fach-onko-familie) | « Mein Vater hat auch geraucht. (Pause, leiser) Deswegen sitze ich hier … », mère, frère |
| hypothyreose | fam-familie | mère (Schilddrüse, Tablette), sœur (Typ 1) — fach-endo-familie-therapie | sœur sous insuline depuis l'adolescence, père, « kein Krebs » |
| diabetes-typ1 | fam-familie | mère (Typ 2, Tabletten), sœur (Schilddrüse) — idem | durée (« seit ungefähr zehn Jahren »), Metformin, père, « kein Krebs » |
| lungenembolie | fam-familie | mère morte d'une embolie (fach-gefaess-thrombose) | thromboses antérieures, âge (71), père, sœur |
| otitis-media | vor-erkrank | otites de l'enfance, perforation (akt-frueher) | « Außer den Mittelohrentzündungen als Kind … » + rhume des foins, négatifs |
| zystitis | vor-erkrank | « nichts mit den Nieren » (fach-uro-vorgeschichte) | rhume des foins, négatifs |

- **Raisonnement sur le cas** (DIRECTION-STYLE § 4.1). Le texte rendu a été relu sur des cas de natures différentes :
  - hypothyreose : femme, motif non douloureux ;
  - prostatakarzinom : homme âgé ;
  - otitis-media : femme jeune, douleur ;
  - bronchialkarzinom : homme, onco.

## 5. Budgets

| Compteur | Avant | Après |
|---|---:|---:|
| atomicité A | 239 | **210** |
| A2 | 7 | **5** |
| A3 | 17 | **16** |
| B | 53 | **50** |
| C, D, D2, D3, E | 0, 0, 450, 12, 0 | inchangés |
| corpus d'atomicité | 5 184 | 5 196 (+12 : les secondes questions comptent comme relances) |
| relances de banque qui ne se posent pas seules (cliquet `coherenceBanque.test.ts`) | 50 | **37** |
| constats du tronc commun (A + A2 + A3 + B) | 35 | **0** |
| `checkProbeOverlap` (informatif, `\|\| true`) | 9 | 12 (§ 8) |

- **Gravure.** Le budget d'atomicité a été gravé par `--bless`, en baisse, avec une note `l1` dans le fixture. `checkBudgetFloor origin/main` sort à 0. Aucun autre fixture n'a été touché : cohérence, réponses, relu.
- **Garde nouvelle** (`coherenceBanque.test.ts`, « L1 — tronc commun ») : toute relance du tronc commun doit se poser seule, quel que soit le nombre de signes de sa question. Sa mutation a été tuée : remettre « Falls ja: Wann war das? » la fait rougir (code 1).

## 6. Reliquats du registre rattachés

| Reliquat | Source | Sort |
|---|---|---|
| A3 de banque `fam-stand` (« — wie viele, und sind sie gesund? ») | Q9 § 7.1 | **fait** |
| Doublons banque-banque : bronchialkarzinom, hypothyreose, diabetes-typ1, lungenembolie, otitis-media, zystitis | Q7 § 6.3 | **fait côté tronc** : la redite est retirée de la réplique (§ 4). Les questions restent, car elles cherchent deux signes distincts (`familie_krebs` ≠ `familie_krank`…). |
| Relances qui ne se posent pas seules (cliquet 50) | Banque § 9.1 | **fait pour le tronc** : 13 relances sur 13, cliquet abaissé à 37. Le reste est en `aktuell` et en Fach. |
| `veg-ausscheidung`, relance « Seit wann? » ouverte en orpheline par r5 (2 cas) | trame jouée, Banque | **fait** |
| Ordre des noxen d'alkoholentzug (R6-bis) | Q7 § 6.2, Q9 § 4 | **non fait** : c'est une règle d'insertion du moteur, en attente du coordinateur. |
| `veg-ausscheidung`, aspect des urines (doublon nominal) | K4 § 5.2 | **non fait** : tranché D-2, résidu accepté. |
| tia, nombre de chutes contradictoire | Inventaire 7 oct. | **hors tronc**. `fam-wohnen` (« vor acht Tagen ») est conforme à la fiche (« zuletzt vor 8 Tagen »). La contradiction est entre `akt-neuro-lage` (« einmal ») et la fiche (deux chutes) : elle relève de L2. |
| Réplique entière sous une question réduite (magenkarzinom, lymphom) | Banque § 9.4, P2-7 | **hors tronc** : `akt-…-appetit` relève de L2, `fach-onko` de L4–L9. |

## 7. Codes de sortie

Sommet `01fe47ee` (merge de main). Contenu identique à `de2ac827`, où la suite a tourné : le merge n'apporte que le registre. Après le merge, j'ai relancé `checkQuestionAtomicity`, `checkCoherence`, `checkBudgetFloor` et `merge-tree`.

| Contrôle | Code |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (195 fichiers, 2 082 tests) | 0 |
| `npm run test:c6` (17 fichiers, 212 tests) | 0 |
| les `scripts/check*.mjs` du job `contrats`, dont `checkCoherence` sur les 130 cas, `checkQuestionAtomicity`, `checkTermRegister --require-all` et `evalDoctopus --dry` | 0 |
| `checkProbeOverlap`, `checkQuestionOrder`, `checkCaseQuestionAnswers` (informatifs) | 1 (12 constats, § 8), 0, 0 |
| `node --test` (17 fichiers du workflow) | 0 |
| `node --test scripts/checkProbeCoverage.test.mjs`, lancé seul | 0 |
| `node scripts/checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0, aucun fichier modifié |
| `git merge-tree --write-tree origin/main HEAD` | 0 |
| passe C6 de 5 jours (`parcours-candidat.mjs --days 5 --port 5199`) | **0** : 64/64 vérifications, 0 bug réel |

Le rapport généré par la passe C6 n'est pas commité, comme pour les lots précédents. La passe lit le contenu de cas publié dans la base locale. Le guide, lui, vient du bundle construit : c'est ce lot.

## 8. Points à trancher

1. **Contenu des questions (relecture clinique et de langue conseillée).**
   - **fam-familie** : « Seit wann sind sie bekannt? » est remplacé par « Wer in Ihrer Familie ist betroffen? ».
   - **fam-stand** : « Wie viele » sort. Écrit en clair, il redemandait la parité que la Fach gynéco venait de poser, dans 5 cas (`gynFusion.test.ts`, « gestité / parité » : eug, mammakarzinom, uterus-myomatosus, endometriose, adnexitis). Le doublon existait déjà, mais l'ancien « Wie viele, … » le cachait au détecteur. « Haben Sie auch Kinder? » reste posé après la parité dans ces 5 cas. Pour l'éviter, il faudrait déclarer `kinder` sur la sonde de parité. C'est une décision du moteur, et elle rejouerait la réplique entière de fam-stand sous une question réduite : je ne l'ai pas prise.
   - **vor-erkrank** : les lipides ne sont plus cités en exemple (règle B, trois items au plus).
   - **all-unvertraeglich** : « Laktose, Gluten » devient « Milch oder Brot ».
   - **fam-eltern** : « Mein herzliches Beileid » passe au tip du chapitre.
2. **`checkProbeOverlap` : de 9 à 12.** C'est une hausse de mesure. Raccourcir le `frage` général fait monter le recouvrement lexical (Jaccard) avec trois sondes Fach : fach-haem-infekte (« Fieber », « letzter Zeit »), fach-derma-vorgeschichte (« Familie ») et fach-gefaess-vorgeschichte (« operiert »). Les trois recouvrements sont réels et existaient déjà. Ils relèvent des lots Fach : il faudrait les marquer `deepens` ou les réécrire. Je n'ai pas reformulé pour esquiver le détecteur.
3. **prostatakarzinom** (§ 4) : faut-il ouvrir la relance « Essgewohnheiten » quand l'appétit a déjà été dit ?
4. **Les six répliques retouchées** (§ 4) sont à relire en revue clinique. Elles ne contiennent aucun fait nouveau.

## Non vérifié

- Le rendu dans le navigateur à deux onglets (médecin et simulant). Le guide lit `playedTrame`, qui est couvert par les tests et le gel ; la fiche du simulant affiche le `frage` raccourci. Aucune mesure n'a été prise dans le DOM.
- La publication (`publishContent.mjs`) : elle se fait au merge sur `main`.
