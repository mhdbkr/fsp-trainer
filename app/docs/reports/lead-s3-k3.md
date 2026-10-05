# Rapport lot K3 — le moteur de cohérence au montage

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k3-cohere` (base `origin/main` @ `967d9d20` ; `origin/main` @ `142835d1`, avec S4-2 #76, fusionné en `0fbcf112`, sans conflit).
> Statut : **DONE_WITH_CONCERNS**. Les concerns sont au § 9 : quatre points de relecture clinique et une extension de périmètre à acter.
> Première passe : BLOQUÉE sur `ajouteSansReponse = 8` (§ 10). Elle a été reprise après les décisions de main (5 oct.).

## 1. Livrables et commits

| Commit | Contenu |
|---|---|
| `ea9ddaf4`, `bc5f4717` | Gel I3 de `fachChapterRaw`, gravé avant le moteur. L'empreinte couvre le texte, les sondes, les relances et les `parts`, mais pas les déclarations K (§ 6) |
| `d07a5878` | `coherence.ts` : `cohere`, `profilEffectif`, `compteursApres`, `COHERENCE_ALLOWED` (vide), `R2_EXEMPTES = {pers-name}`. Il est branché dans `playedTrame`, qui gagne `ecarts`. `FACH_COVERS`, `coveredByFach` et l'exception testiculaire codée en dur disparaissent |
| `2e2adb7f` | Décision 1 : 8 questions du cas déclarent leur `sucht` (§ 2) |
| `893c41d6` | Décision 2 : les relances et le lexique sont corrigés à la source (§ 3) |
| `4f43c9db` | `RISIKO_SIGNES` (sécurité). `SUCHT_MONTAGE` et `dedupeBySymptom` sont supprimés. Tests adaptés avec leur décision ; gel régénéré |
| `e967ba8f` | `coherence.test.ts` et `coherence.fachCovers.test.ts` (§ 5). `trameBrute`, `profilDuCas` et `ctxDuCas` sont exportés. `familie_rheuma` passe après `familie_krank` dans le lexique |
| `37c5dd29` | Porte bloquante (`checkCoherence.mjs`). `quality.yml` perd son `|| true`. Plancher regravé à la baisse. Contrat amendé (§ 7) |
| `a71e4194` | `checkPlayedTrame` et `checkTrameSymptoms` sont alignés sur le moteur. Deux doublons lexicaux sont résolus à la source (§ 2, § 8) |

## 2. Décision 1 — les questions du cas déclarent ce qu'elles posent (`ajouteSansReponse` 8 → 0)

Seule la déclaration change : texte et `antworten` intacts. J'ai relu chaque question en entier, et chacune déclare ce qu'elle pose vraiment.

| Cas | Question | `sucht` |
|---|---|---|
| gerd | « Haben Sie nachts Husten oder eine heisere Stimme bemerkt? » | `husten, stimme` |
| niereninsuffizienz | « Bekommen Sie Luftnot beim Treppensteigen, und schlafen Sie flach oder mit mehreren Kissen? » | `atemnot, orthopnoe` (avant : `orthopnoe`) |
| akutes-nierenversagen | « … wie oft mussten Sie erbrechen oder zur Toilette wegen des Durchfalls? » | `uebelkeit, stuhlfrequenz`. La quantité bue n'a pas de signe au lexique : `relu` est gardé |
| karzinoid | « Müssen Sie auch nachts wegen Durchfall aufstehen, und wie oft haben Sie insgesamt Stuhlgang am Tag? » | `stuhlfrequenz` (avant : `stuhl`, mais la question ne demande pas ce qui a changé) |
| karzinoid | « … Herzrasen oder Luftnot, und pfeift es dabei beim Atmen? » | `herzrasen, atemnot, giemen` |
| colitis-ulcerosa | « Schmerzen oder Schwellungen an Gelenken, rote Knoten an den Schienbeinen, gerötete oder schmerzende Augen oder eine Gelbfärbung … » | `arthralgie, gelenk_entzuendung, ausschlag, augenentzuendung, gelbfaerbung` (D1) |
| glomerulonephritis | « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? » | `kopfschmerz, sehstoerung, atemnot` |
| arterielle-hypertonie | « Wo sitzt der Kopfschmerz? » | `ort` |

**Extension à acter (`a71e4194`).** Deux questions de plus, même règle. Sans elles, `checkPlayedTrame` (bloquant) restait rouge sur un doublon visible :
- colitis-ulcerosa : « Wie oft müssen Sie am Tag zur Toilette — und müssen Sie auch nachts aufstehen? » déclare `stuhlfrequenz`. La question du cas gagne contre `akt-ausscheid-haeufigkeit`.
- gastroenteritis : « Trinken Sie genug? Wie oft müssen Sie Wasser lassen, und welche Farbe hat der Urin? Wird Ihnen beim Aufstehen schwindelig? » déclare `miktion_frequenz, urin_aspekt, schwindel`.

## 3. Décision 2 — r4a : 366 détachements (27 relances distinctes) → 139 (3 relances)

Une relance reste sous sa mère par défaut. Chaque erreur est corrigée à la source, dans la table des sondes ou dans la relance ; `cohere` n'a reçu aucune exception.

Voies : (a) précision — la mère déclare le signe (a1), ou la relance n'en déclare plus d'autre (a2) ; (b) le `kapitel` du signe était faux ; (c) deux signes distincts.

| Relance (sonde #n) | Avant K3 | Voie | Décision |
|---|---:|---|---|
| `akt-allgemein-gewicht#2` « Und Ihr Appetit, Ihr Durst? » | 15 | a1 | la mère déclare `gewicht, appetit, durst` ; ses `parts` les portaient déjà |
| `akt-allgemein-schwellung#1` « Hat sich die Urinmenge verändert? » | 15 | a2 | précise l'œdème ; la Fach Kardio ou Néphro l'emporte |
| `akt-anfall-bewusstsein#1-3` (Zungenbiss, Urin, Zeuge) | 15 | a2 | « dabei » = cet épisode ; les relances suivent la question |
| `akt-atemnot-husten#1` « Husten Sie dabei etwas ab? » | 7 | a2 | précise la toux. La mère est la banque de `husten` (INV-77 : mono-signe) |
| `akt-atemnot-nachts#2` « Wachen Sie nachts auf, weil Ihnen die Luft wegbleibt? » | 5 | a1 | la mère déclare `orthopnoe, dpn` |
| `akt-infekt-kontakt#1, #2` (Kontakt, Essen) | 16 | a2 | « Kontakt und Reise » forme une unité d'exposition ; la Fach Infekt ou Pneumo l'emporte |
| `akt-nerven-alltag#1` « … sind Sie schon gestürzt? » | 3 | a1 | la mère déclare `feinmotorik, sturz` |
| `akt-neuro-ausfall#2` « Konnten Sie normal sprechen, sehen und gehen? » | 5 | a1 | la mère déclare les 5 signes du déficit (D1) |
| `akt-veraend-blutung#1, #2` (Blut im Stuhl / Urin, Blut abhusten) | 30 | a2 + `relu` | précisent « blutet es ? ». **Revient sur la déclaration de la revue K1 C6** : la Fach (onko, haem, gastro) pose ces signes avec leur signe propre |
| `fach-derma-muttermal#1` « Hautkrebsvorsorge? » | 1 | a1 | `+ vorsorge_krebs` |
| `fach-gyn-dyspareunie#2` « Brennt oder schmerzt es beim Wasserlassen? » | 4 | a1 | `+ miktion` (Q-gyn : une question, deux relances) |
| `fach-gyn-eingriffe#1` (Hormone) | 5 | a1 | `+ hormone` (Q-gyn C1) |
| `fach-gyn-vorsorge#1` « Sind Sie gegen HPV geimpft? » | 3 | a2 | précise la prévention gynéco. Seule la déclaration de FACH_RULES est retirée ; texte et applicabilité inchangés |
| `fach-infekt-kontakt#1` (Menschen, Lebensmittel) | 11 | a1 | `kontakt, essen_expo` |
| `fach-ortho-mechanismus#1, #2` (ohnmächtig, verletzt) | 4 | a1 | **imposé** : `+ bewusstlos, begleitverletzung`, et les deux restent sous la chute |
| `fach-pneumo-husten#1` « heiser ? verschluckt ? » | 8 | a1 | `+ stimme, verschlucken` |
| `fach-psych-angst#1` (Panikattacken) | 10 | a1 | `+ panikattacke` |
| `fach-psych-suizid#1` (acte), `#2` (désir) | 20 | **c** + a1 | **sécurité** : `selbstverletzung` ≠ `selbstverletzung_wunsch`. La mère déclare les trois signes de risque |
| `fach-uro-sexualanamnese#1` (STD) | 6 | a1 | `+ std_vorgeschichte` |
| `frau-wechseljahre#1, #2` (Frauenarzt, Hormone) | 44 | a2 | **imposé** (Q-gyn) : ils restent dans la Frauenanamnese ou dans le bloc gynéco fondu, jamais dans une Fach non gynéco |
| `veg-fieber#5` « Sind Ihre Impfungen auf dem neuesten Stand? » | 130 | **b** | **imposé** : `impfung` → `vegetativ`. Détachée (légitime, ci-dessous) |
| `fach-rheuma-vorgeschichte#1` « Gichtanfall oder Nierensteine? » | 4 | — | détachement **légitime** |
| `fach-rheuma-vorgeschichte#2` « Familie Rheuma oder Gicht? » | 5 | — | détachement **légitime** : l'exemple d'INV-84 |

**Les trois détachements restants (139), justifiés :**
- **`veg-fieber#5` (130 cas, dont 11 retirés ensuite par `fach-infekt-impfung`).**
  - Le statut vaccinal est une question de dépistage autonome ; il n'a rien d'une précision de la fièvre. Il reste dans la végétative, en fin de chapitre.
  - Il survit quand r2 retire la question de fièvre, ce qu'aucune autre voie ne permettait. Avec a1, `veg-fieber` passait en non réduite et redemandait la fièvre.
- **`fach-rheuma-vorgeschichte#1` (4 cas).**
  - Un antécédent personnel est un autre signe (identité (e)). Comme unité à part, r1 peut le retirer seul (fibromyalgie, polymyalgia).
  - La règle d'insertion le pose juste après sa mère.
- **`fach-rheuma-vorgeschichte#2` (5 cas).**
  - C'est la famille, qui va dans `familie-sozial` (INV-84).
  - Il se pose après « Haben Familienmitglieder … chronische Erkrankungen? ». `familie_rheuma` suit désormais `familie_krank` dans l'ordre du lexique.

**Tests rouges de la première passe.** Les 13 sont verts. Sans réécriture : Q-gyn (×4), L0 (chute), FB2-J4. Réécrits parce qu'ils exprimaient l'ancien comportement que le contrat voulait changer :

| Test | Décision qui justifie la réécriture |
|---|---|
| CAP « la fièvre dans Aktuelle Beschwerden » | contrat §11.4 : D4, « changement de comportement assumé » |
| moitiés urinaires effacées (K1) | décision 3 : FACH_COVERS absorbé |
| INV-90 forme K2 | §10.8, forme K3 |
| 216 signes et ordre | décisions 3 et 4 |
| question de sécurité psy retirée | décision sécurité |
| tests de `dedupeBySymptom` | rejoués sur `cohere`, même attente |
| mutation « gestürzt » | la mère déclare désormais `sturz` |
| gel | régénéré |

## 4. Décisions 3, 4, 5 et sécurité

- **3. « Seit wann ».** Nouveau signe `beginn_art` (mode de début) ; `fach-rheuma-verlauf` ne déclare plus que lui. « Beginn — Seit wann haben Sie die Schmerzen? » reste dans les 6 cas rhumato.
- **4. Motif en tête.** `motiv` est le premier signe du lexique. Exemple : gastroenteritis pose `akt-motiv · akt-ort · akt-beginn · akt-charakter · akt-intensitaet`.
- **5. Contrat.** Insertion « précède **ou égale** » ; `casRetiresParR1 = 0` ; plancher `brut` mesuré sur la trame jouée (§ 7).
- **Sécurité.**
  - `RISIKO_SIGNES = {suizid, selbstverletzung, selbstverletzung_wunsch}` : ni r1 ni r2 n'y touchent.
  - Test sur les **10 cas psy** : idéation, acte et désir d'automutilation sont présents. Autant de questions de risque dans la trame jouée que dans la trame brute.
  - **Mutation** : sans la protection, r2 retire la question de sécurité. Aucune autre paire de risque ne partageait un signe : « konkrete Pläne » est une précision qui suit la mère.
- **Décision 4 (fréquence des selles).** r3 ajoute `akt-ausscheid-haeufigkeit` à crohn, zoeliakie et chronische-pankreatitis. Elle est posée sans condition, avec la réponse de K2 (testé). Dans les 6 cas gastro où `FACH_COVERS` l'effaçait, elle revient.
- **SUCHT_MONTAGE dégelé.** Il est supprimé, avec `dedupeBySymptom`. `phraseSymptoms` lit la déclaration.
- **karpaltunnel.**
  - Fait en K3 : `fach-ortho-schwellung` reste entière, en non-réduite assumée, comme demandé en K2. Le seul signe hors profil est `gelenk_entzuendung`. Le moteur ne coupe rien.
  - Renvoyé à K4 : écrire ses `parts`.

## 5. Tests du lot (vitest `--dir src` : 166 fichiers, 1 646 tests, 0)

**`coherence.test.ts`** (36 tests) :
- INV-81 à 88, 90 et 91 sur fixtures (sondes réelles) et sur les 130 cas ;
- INV-86 : chaque garde rougit sur un moteur abîmé (entrée mutée, ordre instable, ajout à chaque passe) ;
- sécurité, avec sa mutation ;
- gastroenteritis et fibromyalgie ligne à ligne, plus la spec §3.3 « une fois annotés » : K4 simulé sur une copie, la question du cas gagne Ort, Verlauf, Steifigkeit et Entzündung, et « dort » suit le voyage.

**`coherence.fachCovers.test.ts`** : 73 paires, dont 71 s'appliquent. **41 sont retirées par r2 ; 30 restent posées**, avec leur raison vérifiée dans les données :

| Raison | Nombre | Détail |
|---|---:|---|
| signe distinct | 20 | dont le pont urinaire vers les selles (décision 3) et la fréquence des selles sous la Fach gastro (décision 4) |
| non réduite | 7 | la perdante n'a pas de `parts` (K4) |
| réduite | 1 | `fach-haem-bsymptomatik` → `akt-allgemein-gewicht` |
| risque | 1 | `fach-psych-suizid` → `akt-psych-sicherheit` |
| `SUCHT_AUSSER` | 1 | hodentorsion |

**Gel I3** : la Fach brute est identique pour les 130 cas, texte compris. Seules ont changé des déclarations K : FACH_RULES HPV et le catalogue (`fachRaw.test.ts`).

## 6. Le gel `trame-actuelle.txt` — le diff par catégorie

**129 cas sur 130** bougent. Lignes de chapitre modifiées :

| Chapitre | Lignes | Chapitre | Lignes |
|---|---:|---|---:|
| vegetativ | 124 | fach-rheuma | 6 |
| aktuell | 89 | fach-haemato | 6 |
| fach-infektio | 9 | fach-pneumo | 5 |
| fach-gastro | 6 | familie-sozial | 5 |
| fach-uro | 6 | fach-nephro | 4 |
| autres | 4 | | |

Écarts qui l'expliquent (130 cas) :

| Règle | Action | Nombre | Les plus fréquents |
|---|---|---:|---|
| r2 | retire | 343, + 359 relances | `veg-uebelkeit` ← `fach-gastro-uebelkeit` 16, `akt-ausstrahlung` ← Fach 16, `akt-ausloeser` / `akt-frueher` ← Fach psy / rhumato / derma 39, `veg-fieber` ← Fach 20 |
| r2 | réduit | 111, + 172 relances | `veg-ausscheidung`, `veg-schuettelfrost`, `veg-fieber` réduits à leurs `parts` |
| r2 | non-réduit | 83 | résidu, sans `parts` |
| r2 | déplacé | 24 | une question du cas prend la place de la générale |
| r1 | retire | 24, + 4 relances | `akt-ausscheid-schlucken` 11, `fach-infekt-gelenke` 6 |
| r1 | non-réduit | 34 | `fach-infekt-haut` / `-neuro` 16 |
| r1 | anomalie | 2 | pankreaskarzinom et cml : question du cas hors profil, gardée |
| r3 | ajoute | 45 | Ort / Charakter / Intensität (D2) 31, `akt-atemnot-belastung` 5, fréquence des selles 3, banques rhumato 4, Schlucken 1, aspect des selles 1. Toutes ont leur réponse |
| r4a | détaché | 139 | § 3 |

Ce que l'utilisateur voit en plus, et que `FACH_COVERS` effaçait :
- la fréquence des selles (gastro, uro) ;
- `akt-verlauf` dans les cas psy et neuro (`tageszeit` et `schub` ne sont pas le cours de la maladie) ;
- `akt-veraend-was` et `-entwicklung` dans les cas derma et gyn ;
- `akt-psych-sicherheit` dans 6 cas psy (sécurité).

## 7. La porte et le plancher

`checkCoherence.mjs` est **bloquante**, sans `|| true`. Elle vérifie :
- les 6 compteurs **après montage**, relus sur la trame jouée : 0 ;
- `casRetiresParR1` : 0 ;
- `COHERENCE_ALLOWED` : raison, relecteur, entrée datée au fixture, entrée non périmée.

`--case` affiche les écarts. Mutations (`checkCoherence.test.mjs`, 37 tests) : r1 ou r2 désactivée, r1 qui retire une question du cas, exception invalide, réponse de banque retirée (case-zoeliakie) → exit 1.

| Plancher (`coherence-budget.json`) | K2 | **K3** |
|---|---:|---:|
| doublons | 269 | **230** |
| doublonsCas | 24 | 24 |
| horsProfil | 70 | **38** |
| exigeAbsent | 47 | **0** |
| relancesOrphelines | 0 | 0 |
| brauchtViole | 20 | 20 |
| ajouteSansReponse | 0 | 0 |
| questionsMuettes | 820 | **812** |
| nonReduit | — | **117** (mesuré) |
| casRetiresParR1 | — | **0** |

Ce qui reste dans `brut`, c'est la dette que le moteur ne corrige pas : les questions du cas muettes, encore lues par leur texte, et les non-réduites. **Contrat amendé** (§10.4, §10.6) : r1 et le rang 0 ; « précède ou égale » ; motif en tête ; `RISIKO_SIGNES` ; `brut` sur la trame jouée ; `horsProfil` hors questions du cas gardées.

## 8. Portes secondaires

- **`checkPlayedTrame`** : la tolérance `deepens` est retirée (D3), sans aucun constat nouveau.
- **`checkTrameSymptoms`** :
  - il lit la déclaration ;
  - le résidu assumé du moteur n'y compte pas comme doublon : questions non réduites, questions de risque, nom et épellation, `SUCHT_AUSSER` ;
  - **10 constats de relecture ouverts**, hausse documentée de 2 à 12 au fixture, échéance K4 (cml, diabetes, lymphom ×2, nhl ×3, prostatakarzinom, schenkelhalsfraktur, zystitis). Ce sont des questions du cas muettes qui citent un signe qu'une autre question déclare. Lymphom et nhl : le prurit **généralisé** (signe B) n'est pas le « juckt es » d'une lésion.

## 9. Concerns — à relire (revue clinique Opus annoncée)

1. **Le risque suicidaire est demandé deux fois dans 6 cas psy.** `akt-psych-sicherheit` (« Sicherheit — Ich frage das jeden Patienten … ») et `fach-psych-suizid` cherchent `suizid`. C'est l'application littérale de « jamais retirée par r2 ». Si main le veut, une exception étroite est possible : la Fach garde la question de sécurité quand elle pose le même signe et que l'acte et le désir restent posés. **À trancher** (cas psy de la revue : `case-depression`).
2. **Revue K1 C6 inversée** : les relances de `akt-veraend-blutung` sont redevenues des précisions (§ 3). La revue C6 avait demandé `stuhlaussehen`, `urin_aspekt` et `haemoptyse` ; ces signes restent portés par les Fach.
3. **Extension de périmètre** : deux questions du cas déclarées en plus des 8 (§ 2). Même règle, à acter.
4. **Cas gynéco (`case-uterus-myomatosus`).** `akt-veraend-was` et `akt-veraend-blutung` reviennent (signes distincts de `fach-gyn-blutung` et `-brust`). `akt-veraend-blutung` est non réduite et porte ses relances « Blut im Stuhl / Urin, Blut abhusten ».
5. **gastroenteritis.** « Aussehen — Blut, Schleim im Stuhl? » est retirée par `akt-ausscheid-was`, qui énumère l'aspect (D1, déclaration K0 I2). La question du cas « Wie sieht Ihr Stuhl aus » reste muette jusqu'en K4. **fibromyalgie** : la végétative garde « Waren Sie kürzlich im Ausland? » seule, comme `part` de `veg-fieber`, la Fach ayant pris la fièvre.

## 10. Première passe (BLOQUÉE) — rappel

Elle s'est arrêtée sur `ajouteSansReponse = 8` : 8 questions du cas posaient le signe sans le déclarer, la mesure K2 lisait leur texte et `cohere` ne le lit pas (I2). Elle a aussi relevé que r4a contredisait des décisions déjà testées (Q-gyn, L0). Main a tranché : § 2 à § 4.

## Annexe — les deux cas de la direction (cœur ; `~` = réduite, `^` = détachée)

**case-gastroenteritis**

| Chapitre | Avant (K2) | Après (K3) |
|---|---|---|
| aktuell | motiv · beginn · ausscheid-was · ausscheid-aussehen · ausscheid-schlucken · verlauf · ausloeser · einfluss · frueher · begleit · CAS ×3 | motiv · **ort** · beginn · **charakter** · **intensitaet** · ausscheid-was · **ausscheid-haeufigkeit** · **ausscheid-harn-haeufigkeit** · verlauf · ausloeser · einfluss · frueher · begleit · CAS ×3 |
| fach-infektio | haut · gelenke · neuro · reise · kontakt↳1 · impfung | haut · neuro · reise · kontakt↳1 · impfung |
| vegetativ | schuettelfrost~schwitzen · uebelkeit · gewicht · appetit · schlaf · CAS | schuettelfrost~schwitzen · uebelkeit · gewicht · appetit · schlaf · CAS |

**case-fibromyalgie**

| Chapitre | Avant (K2) | Après (K3) |
|---|---|---|
| aktuell | motiv · ort · beginn · charakter · intensitaet · ausstrahlung · verlauf · ausloeser · einfluss · frueher · begleit · CAS ×6 | motiv · ort · beginn · charakter · intensitaet · verlauf · einfluss · begleit · CAS ×6 |
| fach-rheuma | gelenke · morgensteifigkeit · entzuendung · verlauf · ausloeser · haut · systemisch · vorgeschichte↳2 | morgensteifigkeit · entzuendung · verlauf (`beginn_art`) · ausloeser · haut · systemisch · vorgeschichte |
| vegetativ | fieber↳5 · schuettelfrost · uebelkeit · ausscheidung · gewicht · appetit · CAS | fieber~reise · schuettelfrost · uebelkeit · ausscheidung~miktion · gewicht · appetit · CAS · ^Impfungen |

| Spec §3.3 | K3 |
|---|---|
| gastro : Schlucken retiré (r1) | ✓ |
| gastro : Infekt haut / neuro / gelenke | gelenke retiré ✓ ; haut et neuro non réduites (`parts`, K4) |
| gastro : Ort / Charakter / Intensität (r3) | ✓, après le motif |
| gastro : fréquence des selles | ✓ |
| gastro : « dort » après le voyage | ✓ une fois annotée (K4) |
| gastro : relance alimentaire retirée | ✗ : c'est désormais une précision de `fach-infekt-kontakt`, qui perdrait `essen_expo` en non-réduite (K4 : `parts`) |
| fibro : « Welche Gelenke », Gicht, Ausstrahlung retirés | ✓ |
| fibro : Auslöser, Früher, Fieber une fois | ✓ |
| fibro : Ort, Verlauf, Steifigkeit, Entzündung | ✓ une fois annotés (K4) |
| fibro : « Familie Rheuma » vers familie-sozial | ✗ : retirée par r1 (`familie_rheuma` n'est pertinent que sous gelenk / arthritis, profil K2) |

## Vérifications (codes de sortie, sommet de branche)

- `npx tsc -b --noEmit` : **0**. `npx vitest run --dir src --maxWorkers=2` : **0** (166 fichiers, 1 646 tests).
- `node scripts/check*.mjs` : **tous 0**, sauf `checkProbeOverlap` (1, informatif, `|| true`). Dont `checkCoherence` 0, `checkPlayedTrame` 0, `checkTrameSymptoms` 0, `checkGuideCoverage` 0 (contrat guide ↔ fiche), `checkTermRegister --require-all` 0. `checkBudgetFloor.mjs origin/main` : **0**, avec une hausse documentée : constats de trame-symptoms, 2 → 12.
- `node --test scripts/*.test.mjs` (12 fichiers) : **tous 0**.
- `git merge-tree --write-tree origin/main HEAD` : voir le message de handoff.

## Non vérifié

- **Pas de vérification à deux onglets dans un navigateur.** Le worktree n'a pas de `.env`, et l'app charge le contenu par Supabase, que je n'avais pas le droit de démarrer, comme je ne devais pas toucher la prod. Ce qui la remplace :
  - côté médecin, `checkGuideCoverage` (0) sur le montage réel : toute question jouée a sa réponse ;
  - côté simulant, le Rollenskript lit `antworten`, que K3 ne touche pas (INV-88, testé sur les 130 cas).
- **La justesse clinique** des voies du § 3, des 10 déclarations du § 2 et des concerns du § 9 : mon jugement, à relire.
- **Le contenu publié** : `publishContent.mjs` republiera les 10 fiches touchées au merge ; je ne l'ai pas rejoué.
- **`graphify update app/src`** : il n'y a pas de graphe dans ce worktree.
