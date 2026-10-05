# Rapport lot K3 — le moteur de cohérence au montage

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k3-cohere`. `origin/main` (S4-2 #76, puis lot F #77) est fusionné, sans conflit ; `merge-tree` contre `origin/main` @ `0e846533` : 0.
> Statut : **DONE_WITH_CONCERNS**. La 3e revue clinique de `1fe73eb6` est traitée : § 0 ter (B1 lyme, B2 gib, P2 tvt). **B2 s'écarte de la lettre** de la décision, parce que la fiche de gib porte une douleur épigastrique : la réponse est à relire au § 0 ter. La contre-revue de `56452456` est au § 0 bis, et ses concerns aux § 0bis.4 et § 0bis.6.
> Le § 0 décrit le fixeur des revues de `508639f6`. Les § 1 à § 10 donnent l'historique jusqu'à `508639f6` ; leurs chiffres sont ceux de ces commits.

## 0 ter. Troisième revue clinique de `1fe73eb6` (décisions de main)

| Item | Commit | Correction | Preuve |
|---|---|---|---|
| **B1 lyme** | `0e56a583` | Le profil de lyme déclare `fieber` : son motif dit « leicht erhöhte Temperatur ». D4-bis joue : « Fieber — Haben Sie Fieber gemessen? » est posée dans Aktuelle Beschwerden, et `fach-infekt-fieber` (« seit wann … in Schüben ») est retirée par r2. INV-77 est tenu : la banque `akt-infekt-fieber` a sa réponse dans la fiche. | Deux tests rouges avant : le signe `fieber` n'a qu'une unité, `akt-infekt-fieber` ; « Schüben » n'apparaît qu'une fois. Garde sur les 130 cas : tout motif fébrile (réponse à `akt-motiv` : Fieber / Temperatur / Schüttelfrost) déclare `fieber`. **lyme était le seul.** |
| **B2 gib** | `f7d5fede` | Le profil de gib exige `charakter`. Signe et banque existent déjà (`akt-charakter`, « Charakter — Wie fühlt sich der Schmerz an: … brennend … ? »). r3 la pose juste **après Beginn**, où le patient vient de dire « das Brennen im Bauch … seit Wochen » : aucune présupposition. | Test rouge avant. `checkCoherence --case case-gib` : porte à 0, `ajouteSansReponse` 0, ordre et présupposition 0 |
| **P2 tvt** | — | Acté : l'hémoptysie retirée de tvt est notée dans « Pour K4 » ci-dessous. | — |

**B2 : écart à la lettre de la décision, à relire.**
- La décision disait : « la fiche dit qu'il n'y a pas de douleur », donc il fallait une réponse négative. **La fiche dit le contraire** :
  - `schmerz: { ort: 'Oberbauch', charakter: 'brennend', intensitaet: 4, beginn: 'seit Wochen', verstaerker: 'kurz nach dem Essen' }` ;
  - `begleitsymptome` : « Oberbauchschmerzen seit Wochen » ;
  - la réponse à `akt-beginn` : « das Brennen im Bauch habe ich aber schon seit Wochen ».
- « Wehtun oder jucken tut da nichts » (réponse à `akt-veraend-blutung`) parle de la **lésion** de ce gabarit, les selles noires. Elle ne dit pas que le ventre ne fait pas mal.
- La décision demandait aussi une réponse « cohérente avec la fiche ». Une réponse négative aurait contredit la fiche, sur le signe même qui distingue l'ulcère sous AINS. J'ai donc écrit la réponse positive, tirée des champs de la fiche.
- Aucun signe `bauchschmerz` n'existe dans le lexique, et aucune banque gastro ou akt ne demande une douleur abdominale. L'équivalent existant est `charakter`, avec sa banque `akt-charakter`. Je l'ai pris par `exige` sur le cas, plutôt que par le tag `schmerz` : ce tag aurait aussi posé Ort et Intensität, et Ort serait venu avant Beginn, donc avant que le patient ait parlé du « Brennen ».

Réponse écrite (clé `akt-charakter` de case-gib), pour relecture :

> « Es brennt, oben im Bauch, in der Magengrube — vor allem kurz nach dem Essen. »

Elle reprend trois champs de la fiche : `ort` (Oberbauch), `charakter` (brennend) et `verstaerker` (kurz nach dem Essen). Elle ne dit rien de « jucken ».

**Si main préfère la lettre de la décision** (réponse négative), il suffit de remplacer cette réplique. Mais `schmerz`, `begleitsymptome` et `akt-beginn` de la fiche devront alors changer avec elle, sinon la fiche se contredit.

Trames jouées complètes après correction (ouverture et clôture exclues) :

**case-lyme**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Beginn — Seit wann haben Sie Fieber oder fühlen sich krank? Kam es schlagartig oder langsam?
9. Fieber — Haben Sie Fieber gemessen?
   ↳ Falls ja: Wie hoch war es?
   ↳ Falls ja: Wann ist das Fieber am höchsten?
10. Verlauf — Ist das Fieber dauerhaft, kommt es in Schüben, oder war es zwischendurch weg?
11. Herd — Haben Sie Husten, Halsschmerzen, Brennen beim Wasserlassen, Durchfall, einen Ausschlag oder eine Wunde bemerkt?
12. Auslöser — Gab es davor eine Erkältung, einen Eingriff, einen Zahnarztbesuch oder eine neue Verletzung?
13. Einflussfaktoren — Haben Sie schon etwas dagegen genommen — Paracetamol, Ibuprofen? Hat es geholfen?
14. Frühere Episoden — Hatten Sie so ein Fieber schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
15. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
16. Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?
17. Seit wann haben Sie diese Rötung bemerkt, und wird sie größer?
18. Haben Sie Herzstolpern, Herzrasen oder Schwindel bemerkt, oder waren Sie schon einmal ohnmächtig?
19. Haben Sie ähnliche Rötungen auch an anderen Stellen des Körpers bemerkt?

*Fachanamnese Infectiologie*
20. Hatten Sie einen Zeckenstich oder einen Insektenstich bemerkt? Waren Sie im Wald, im hohen Gras oder im Garten?
21. Haben Sie eine Hautveränderung oder Rötung bemerkt? Hat sie sich ausgebreitet, zum Beispiel ringförmig?
22. Haben Sie Gelenk- oder Muskelschmerzen? Wandern sie von Gelenk zu Gelenk?
23. Haben Sie Kopfschmerzen, Nackensteifigkeit, Missempfindungen oder eine Gesichtslähmung bemerkt?
24. Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?
25. Hatten Sie Kontakt zu kranken Personen oder zu Tieren?
   ↳ Arbeiten Sie mit vielen Menschen? Haben Sie ungewöhnliche Lebensmittel gegessen — rohe Milch, rohes Fleisch?
26. Sind Ihre Impfungen auf dem neuesten Stand?

*Vegetative Anamnese*
27. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
28. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
29. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
30. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
31. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?

*Vorerkrankungen & Voroperationen*
32. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
33. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
34. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
35. Waren Sie in letzter Zeit im Krankenhaus?

*Medikamente*
36. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
37. Nehmen Sie Blutverdünner oder Kortison?
38. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?

*Allergien & Unverträglichkeiten*
39. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
40. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
41. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
42. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
43. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
44. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
45. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
46. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
47. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
48. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
49. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
50. Haben Sie Haustiere, um die sich jemand kümmern muss?

*Frauenanamnese*
51. Verläuft Ihre Monatsblutung regelmäßig?
   ↳ Wann war Ihre letzte Regelblutung?
   ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
52. Besteht die Möglichkeit, dass Sie derzeit schwanger sind?
53. Verwenden Sie Verhütungsmethoden?
   ↳ Falls ja: Welche Methode verwenden Sie?
```

**case-gib**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Beginn — Seit wann haben Sie das bemerkt? Wie ist es Ihnen aufgefallen — zufällig, beim Duschen, durch jemand anderen?
9. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
10. Verlauf — Ist es dauernd da, oder kommt und geht es?
11. Auslöser — Ist Ihnen ein Auslöser aufgefallen — eine Verletzung, Sonne, ein neues Medikament, eine Ernährungsumstellung?
12. Einflussfaktoren — Gibt es etwas, das es bessert oder verschlimmert?
13. Frühere Episoden — Hatten Sie so eine Veränderung schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
14. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
15. Welche Farbe hatte das Blut, das Sie erbrochen haben — eher hellrot, dunkelrot oder wie Kaffeesatz?
16. Wird Ihnen schwindelig, vor allem wenn Sie aufstehen?

*Fachanamnese Gastroenterologie*
17. Haben Sie Sodbrennen? Müssen Sie aufstoßen?
18. Haben Sie ein Völlegefühl? Werden Sie viel schneller satt als früher? Fühlen Sie sich aufgebläht?
19. Treten die Beschwerden nach bestimmten Speisen auf? Was haben Sie in den letzten Stunden gegessen?
20. Haben Sie Durchfall oder Verstopfung? Wechseln sich beide ab?
   ↳ Welche Farbe hat der Stuhl — blutig, teerschwarz, sehr hell, gelblich?
   ↳ Welche Konsistenz — hart, fest, weich, schleimig, wässerig?
21. Haben Sie manchmal das Gefühl, zur Toilette zu müssen, aber es kommt eigentlich nichts?
22. Wann hatten Sie die letzte Magen- oder Darmspiegelung, und was war das Ergebnis?

*Vegetative Anamnese*
23. Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt?
   ↳ Falls Fieber: Seit wann haben Sie Fieber?
   ↳ Falls ja: Wie hoch war die Temperatur?
   ↳ Falls ja: Wo haben Sie gemessen (z. B. im Mund)?
24. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
25. Haben Sie Schwierigkeiten beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben?
26. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
27. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
28. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?
29. Sind Ihre Impfungen auf dem neuesten Stand?

*Vorerkrankungen & Voroperationen*
30. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
31. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
32. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
33. Waren Sie in letzter Zeit im Krankenhaus?

*Medikamente*
34. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
35. Nehmen Sie Blutverdünner oder Kortison?
36. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
37. Nehmen Sie regelmäßig Schmerzmittel wie Ibuprofen oder Diclofenac ein, und wie oft?

*Allergien & Unverträglichkeiten*
38. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
39. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
40. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
41. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
42. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
43. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
44. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
45. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
46. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
47. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
48. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
49. Haben Sie Haustiere, um die sich jemand kümmern muss?
```

Résidus vus dans ces deux trames, pour K4 ou le lot de contenu :
- **lyme**, questions du cas n° 16, 17 et 19 contre `fach-infekt-haut` (n° 21) : la rougeur est demandée par la question du cas puis par la Fach. `fach-infekt-haut` n'a pas de `parts` : elle n'est pas réduite (résidu `nonReduit`). Deux des questions du cas sont muettes (K4).
- **gib**, n° 8 et n° 11 : le gabarit « Veränderung » (lésion cutanée) parle à un saignement digestif de « beim Duschen » et de « Sonne ». C'est un gabarit de nature, à revoir au lot de contenu ou dans les natures (K4).

**Pour K4 (ajout de la 3e revue)** : l'hémoptysie de tvt, retirée par R3 avec les relances de saignement systémique, est actée. Si la direction la veut dans l'embolie (tvt), il faut la poser par une question du cas ou par la Fach pneumo, pas par le bloc « Veränderung ».

## 0 bis. Contre-revue de `56452456` (décisions de main)

Mêmes règles que le § 0 : test rouge d'abord, mutation prouvée, un commit par groupe. Après chaque groupe : `ajouteSansReponse = 0` et le plancher vérifiés.

### 0bis.1 R1 à R6

| Item | Commit | Correction | Preuve |
|---|---|---|---|
| **R6** | `2dd506e7` | r2 ne déplace une question du cas que si la perdante est **retirée**. Une perdante réduite ou non réduite reste posée, et la question du cas reste à sa place. Contrat §10.4 amendé. | Test rouge avant. Mutation « condition retirée » : rouge. gastroenteritis : « Was hat sich verändert » passait avant « Wie sieht Ihr Stuhl aus » |
| **R5** | `5fae0fc9` | D4-bis se fonde sur le motif **déclaré** : la fièvre n'est le motif que si le profil porte `fieber` (nature infekt), la dyspnée que s'il porte `dyspnoe` (nature atemnot). Table `TAG_DU_MOTIF`. Contrat amendé. | Test sur allergische-rhinitis (atemnot sans `dyspnoe`) : la question neutre de la Fach pneumo revient. Mutation « nature seule » : rouge |
| **R1** | `d8fa688c` | `stuhl_blut` est pertinent pour diarrhoe, transit, gastro, haem, onko. Tags nouveaux, déclarés sur les cas qui jouent la Fach correspondante : gastro (17 cas), haem (6), onko (4). | Il n'est plus demandé dans zystitis, bph, prostatakarzinom, glomerulonephritis, hepatitis-b |
| **R2** | `d8fa688c` | Mon écart est refusé, la décision est appliquée : `nykturie` est pertinente pour harn, kardio et endo (tags kardio : 9 cas ; endo : 6). | Les 15 cas Kardio / Endo la gardent. Elle disparaît des 7 cas digestifs, dont gastroenteritis |
| **R3** | `86ca7453` | La variante `akt-veraend-blutung` perd ses relances « Blut im Stuhl / Urin » et « Blut abhusten ». Là où elles servent, la Fach les pose. | mammakarzinom et les 4 cas derma ne les ont plus ; tvt perd l'hémoptysie (accepté) |
| **R4** | `92d4d328` | vorhofflimmern : le profil `exclut { zungenbiss, einnaessen }` (« keine Synkope »). INV-80 l'autorise : ces deux signes ne sont pas de dépistage. | Ni morsure ni énurésie posées. Test rouge avant |

### 0bis.2 gib, itp, lymphom — cas par cas (`86ca7453`, `aktuellSkip`)

| Cas | Décision | Raison |
|---|---|---|
| gib | `akt-veraend-was`, `-blutung`, `-entwicklung` retirés | Une hématémèse n'est pas une lésion qui « se modifie ». Le saignement est posé par la question du cas et la Fach |
| itp | `-blutung` retiré, `-was` gardé | Les pétéchies **sont** la Veränderung (Befund) ; le saignement est posé par la Fach haem |
| lymphom | `-was` et `-blutung` retirés | L'adénopathie est posée par la Fach onko et par la question du cas |

### 0bis.3 P2

- **Préfixe de dimension** (`604e7fe4`). Une part réduite porte le libellé de dimension de sa mère : « Beginn — Seit wann haben Sie die Schmerzen? », « Schmerz und Blutung — Tut es weh, juckt es? », « Verlauf — Ist es jeden Tag gleich… ». Test rouge avant. Le socle `checkTrameSymptoms` a un constat nhl renommé par le préfixe (même question) ; le compte reste 10 / 10.
- **« blutet es? »** (`86ca7453`). « Tut es weh, juckt es, oder blutet es? » est découpée en deux parts. Quand le saignement est déjà demandé, la douleur et le prurit restent.
- **Syncope** (`92d4d328`). Zungenbiss et Einnässen se posent après le témoin et la durée (questions du cas n° 11 et 12). Ces deux questions déclarent `fremdanamnese` et `anfallszeichen` ; le lexique place les deux signes après `fremdanamnese`.
- **Réponses retirées** (`92d4d328`). Les réponses ajoutées en P0-2 et que plus aucune question n'interroge sont retirées : vorhofflimmern (signes exclus) et sturz-im-alter (la Fach neuro les pose). Synkope garde la sienne.
- **Réponse « trop longue » : non faite, à décider.** Une relance détachée n'a pas de clé propre dans `antworten` : sa réplique est dans celle de sa mère, car le simulant reçoit l'id de sonde de la mère. Donner une clé à chaque relance change le protocole des deux onglets (`fsp-patient-sync`), `rolePlay` et `features/simulation`. C'est hors de mon périmètre K3 (« tu ne touches pas `features/simulation` ») : c'est une proposition de contrat.
- **Goutte : option (b) en K4** (§ 0bis.6).

### 0bis.4 gastroenteritis et fibromyalgie présentables (`3f464400`, `16d49801`)

**gastroenteritis**
- Questions du cas déclarées :
  - « dort gegessen » → `essen_expo`, avec `braucht ['reise']` : r4b la place après le voyage ;
  - Beruf → `beruf` ;
  - « Antibiotika … Krankenhaus » → `krankenhaus` : une seule question d'hospitalisation ;
  - « Wie sieht Ihr Stuhl aus » → `stuhl`, `stuhlaussehen` (jamais `stuhl_blut`).
- Parts découpées du texte :
  - `fach-infekt-kontakt` : contact / alimentation ;
  - `fam-beruf` : métier / stress. La part stress porte `braucht ['beruf']`, `pers-beruf` (« dabei ») aussi ;
  - `akt-ausscheid-aussehen` (`16d49801`) : alarme / couleur. La couleur n'est demandée qu'une fois, par la question du cas.
- Hors sujet retiré : `fachSkip` sur `fach-infekt-haut` et `-neuro` (gabarit borréliose) ; `aktuellSkip` sur `akt-ausscheid-was` (les questions du cas posent l'aspect des selles et des urines).
- Moteur : une question réduite à ses parts présuppose ce que présupposent les parts gardées (`braucht` des parts). Mutation « braucht des parts ignoré » : rouge.
- Mesure du cas : **zéro doublon, zéro hors profil, zéro présupposition violée, 0 / 6 question du cas muette** (`checkCoherence --case case-gastroenteritis`).

**fibromyalgie**
- Questions du cas déclarées : Zeichnung → `ort` (prend la place d'`akt-ort`), « seit mehr als drei Monaten » → `verlauf`, « morgens steif » → `steifigkeit` (une seule raideur matinale), « Gelenke … geschwollen » → `gelenk_entzuendung`.
- Hors sujet retiré : `fachSkip fach-rheuma-ausloeser` (relances de la goutte). L'Auslöser d'Aktuelle Beschwerden reste.
- Mesure du cas : doublons 0, horsProfil 0, brauchtViole 0.
- « Passiert Ihnen das auch im Unterricht? » (n° 16) **n'est pas une présupposition** : la réponse à `akt-begleit`, juste avant, dit « mitten im Unterricht ».

Trames jouées complètes, ligne à ligne (sommet ; ouverture et clôture exclues) :

**case-gastroenteritis**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Ort — Wo genau spüren Sie die Beschwerden?
   ↳ Können Sie mir zeigen, wo genau?
9. Beginn — Seit wann haben Sie das bemerkt? Kam es plötzlich oder hat es sich über Wochen entwickelt?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Häufigkeit — Wie oft haben Sie am Tag Stuhlgang, und müssen Sie auch nachts zum Stuhlgang aufstehen?
   ↳ Mehr oder weniger als sonst?
13. Aussehen — Ist Ihnen Blut oder Schleim im Stuhl aufgefallen?
14. Verlauf — Ist es dauernd so, oder gibt es Tage, an denen es normal ist? Wird es schlimmer?
15. Auslöser — Ist Ihnen ein Auslöser aufgefallen — ein bestimmtes Essen, eine Reise, ein neues Medikament, Stress?
16. Einflussfaktoren — Gibt es etwas, das es bessert oder verschlimmert — Essen, Trinken, Bewegung, Medikamente?
17. Frühere Episoden — Hatten Sie solche Beschwerden schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
18. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
19. Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe, riecht er auffällig, schwimmt er oben?
20. Haben Sie Fieber gemessen? Hatten Sie Schüttelfrost oder Nachtschweiß?

*Fachanamnese Infectiologie*
21. Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?
22. Was haben Sie dort gegessen und getrunken? Hatten Sie Eiswürfel in den Getränken, rohen Salat, ungeschältes Obst oder Leitungswasser?
23. Hatten Sie Kontakt zu kranken Personen oder zu Tieren?
   ↳ Arbeiten Sie mit vielen Menschen?
24. Sind Ihre Impfungen auf dem neuesten Stand?

*Vegetative Anamnese*
25. Haben Sie starke Schweißausbrüche?
26. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
27. Haben Sie Schwierigkeiten beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben?
28. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
29. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
30. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?
31. Trinken Sie genug? Wie oft müssen Sie Wasser lassen, und welche Farbe hat der Urin? Wird Ihnen beim Aufstehen schwindelig?

*Vorerkrankungen & Voroperationen*
32. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
33. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
34. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?

*Medikamente*
35. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
36. Nehmen Sie Blutverdünner oder Kortison?
37. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
38. Haben Sie in den letzten Wochen oder Monaten Antibiotika eingenommen oder waren Sie im Krankenhaus?

*Allergien & Unverträglichkeiten*
39. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
40. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
41. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
42. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
43. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
44. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
45. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
46. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
47. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
48. Haben Sie Haustiere, um die sich jemand kümmern muss?
49. Was arbeiten Sie beruflich, und arbeitet jemand in Ihrem Haushalt in einer Küche, in der Gastronomie oder in einem Kindergarten?
50. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
51. Empfinden Sie Stress durch Ihre Arbeitssituation?
```

**case-fibromyalgie**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Können Sie mir bitte auf dieser Zeichnung einzeichnen, wo überall es wehtut? Ist es links und rechts gleich?
9. Beginn — Seit wann haben Sie die Schmerzen?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Haben Sie diese Schmerzen ununterbrochen seit mehr als drei Monaten, oder gibt es bei Ihnen beschwerdefreie Phasen?
13. Auslöser — Gab es etwas Bestimmtes, das die Schmerzen ausgelöst hat? Was taten Sie, als sie begannen?
14. Einflussfaktoren — Gibt es etwas, das die Beschwerden bessert oder verschlimmert (Essen, Bewegung, Atmung, Körperhaltung)?
15. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
16. Haben Sie Schwierigkeiten, sich zu konzentrieren oder auf Wörter zu kommen? Passiert Ihnen das auch im Unterricht?
17. Wie lange sind Sie morgens steif — Minuten oder länger als eine Stunde? Bessert sich das durch Bewegung?
18. Sind Ihre Gelenke jemals sichtbar geschwollen, gerötet oder überwärmt gewesen — oder fühlen sie sich nur dick an?
19. Wie geht es Ihnen seelisch? Fühlen Sie sich in den letzten Wochen häufig niedergeschlagen oder freudlos?

*Fachanamnese Rhumatologie*
20. Kamen die Beschwerden plötzlich und anfallsartig, oder haben sie sich langsam über Wochen entwickelt?
21. Haben Sie Hautveränderungen bemerkt — Schuppenflechte, Knötchen unter der Haut oder an den Ohren?
22. Haben Sie Fieber, Augenentzündungen, Mund- oder Genitalgeschwüre, Durchfall oder eine Bindehautentzündung bemerkt?
23. Hatten Sie solche Gelenkbeschwerden schon einmal?

*Vegetative Anamnese*
24. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
25. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
26. Haben Sie Schwierigkeiten beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben?
27. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
28. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
29. Wie ist Ihr Schlaf? Fühlen Sie sich morgens erholt, wenn Sie aufgewacht sind?
30. Sind Ihre Impfungen auf dem neuesten Stand?

*Vorerkrankungen & Voroperationen*
31. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
32. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
33. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
34. Waren Sie in letzter Zeit im Krankenhaus?

*Medikamente*
35. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
36. Nehmen Sie Blutverdünner oder Kortison?
37. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
38. Nehmen Sie ein Medikament gegen erhöhte Cholesterinwerte oder haben Sie in letzter Zeit ein neues Medikament begonnen?

*Allergien & Unverträglichkeiten*
39. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
40. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
41. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
42. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
43. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
44. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
45. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
46. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
47. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
48. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
49. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
50. Haben Sie Haustiere, um die sich jemand kümmern muss?

*Frauenanamnese*
51. Verläuft Ihre Monatsblutung regelmäßig?
   ↳ Wann war Ihre letzte Regelblutung?
   ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
52. Besteht die Möglichkeit, dass Sie derzeit schwanger sind?
53. Verwenden Sie Verhütungsmethoden?
   ↳ Falls ja: Welche Methode verwenden Sie?
54. Haben die Wechseljahre bei Ihnen schon begonnen — Hitzewallungen, unregelmäßige Blutungen?
   ↳ Gehen Sie regelmäßig zum Frauenarzt?
```

Ce qui reste dans ces deux trames, à trancher par la troisième revue :
1. **gastro n° 27 ↳ / n° 31.** La relance « Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben? » recoupe la question du cas n° 31 (« Wie oft müssen Sie Wasser lassen, und welche Farbe hat der Urin? »). La relance est **conditionnelle** : elle ne se pose que si le patient a des difficultés. Et INV-84 interdit qu'une relance conditionnelle déclare un signe. C'est la même classe que la goutte, à régler par l'option (b) en K4 : des `parts` sur `veg-ausscheidung`.
2. **gastro n° 20 / n° 25.** « Nachtschweiß » (question du cas) et « starke Schweißausbrüche » (végétative) sont deux signes distincts (`nachtschweiss` ≠ `schwitzen`). Je les garde ; le mot « Schweiß » revient.
3. **gastro n° 23 ↳.** « Arbeiten Sie mit vielen Menschen? » vient avant la question du métier (n° 49). C'est un oui / non, sans présupposition forte. C'est le texte existant de la relance de contact.
4. **fibro n° 22.** « Augenentzündungen … oder eine Bindehautentzündung » se répète dans le texte même de `fach-rheuma-systemisch`. C'est un défaut de contenu (Pour contenu).

### 0bis.5 Mesure, plancher, gel (sommet)

| Porte après montage (130 cas) | Valeur |
|---|---|
| doublons, horsProfil, exigeAbsent, relancesOrphelines, brauchtViole, ajouteSansReponse | **0** |
| casRetiresParR1 | **0** |

| Plancher (`coherence-budget.json`) | `56452456` | **Sommet** |
|---|---:|---:|
| doublons | 218 | **203** |
| doublonsCas | 24 | 24 |
| horsProfil | 46 | **44** |
| exigeAbsent | 0 | 0 |
| brauchtViole | 20 | **19** |
| ajouteSansReponse | 0 | 0 |
| questionsMuettes | 803 | **794** |
| nonReduit | 112 | **103** |

`checkBudgetFloor.mjs origin/main` : 0. Socle `checkTrameSymptoms` : 10 / 10 (hausse documentée 2 → 10, deux constats lymphom résolus).

| Écarts (130 cas) | Nombre |
|---|---:|
| r2 retire | 371, + 340 relances |
| r2 réduit | 118, + 103 relances |
| r2 non-réduit | 65 |
| r2 déplace | 19 |
| r1 retire | 35, + 23 relances |
| r1 réduit | 100, + 371 relances |
| r1 non-réduit | 38 |
| r1 anomalie | 2 |
| r3 ajoute | 45 |
| r4a détache | 147 (5 relances distinctes : impfung, Gicht / Nierensteine, Familie Rheuma, Zungenbiss, Einnässen) |
| r4b déplace | 3 |

Le gel `trame-actuelle.txt` est régénéré à chaque groupe. `fachCovers` : 23 paires gardées, chacune avec sa raison.

### 0bis.6 Écarts à la lettre, Pour K4, Pour contenu

**Écarts à la lettre**
1. **R4.** J'ai pris `exclut` plutôt qu'`aktuellSkip`, parce que `zungenbiss` et `einnaessen` ne sont pas de dépistage. Pour gib, itp et lymphom, c'est `aktuellSkip`, car `knoten`, `lokalblutung`, etc. sont de dépistage (INV-80, § 0.6).
2. **`app/src/db/types.ts`** : `CaseQuestion` gagne `braucht?` (additif, contrat §10.2). C'est hors du périmètre de l'en-tête de rôle, mais dans le brief K3.
3. **« Wie sieht Ihr Stuhl aus »** déclare `stuhl` en plus de `stuhlaussehen` : la question pose aussi le changement des selles. La part `stuhl` de `veg-ausscheidung` est donc retirée.
4. **Textes découpés** (parts) : je n'ai écrit aucune phrase nouvelle. Chaque part est une coupe du texte de sa mère.

**Pour K4**
- **Goutte, option (b)** (décision de main). `fach-rheuma-ausloeser` reçoit des `parts`, sans nouvelle règle :
  - la part `ausloeser` garde la question principale ;
  - la part `gicht_ausloeser` (pertinence `gicht`) porte les deux lignes « Falls ein üppiges Essen: … Bier? » et « Falls ein neues Medikament: … Wassertablette? ».
- Même voie pour `veg-ausscheidung` (gastro n° 27 ↳).
- Les `parts` restantes : `akt-veraend-was` (P1-6c), `fach-pneumo-infekt`, `fach-infekt-haut` / `-neuro`, `fach-ortho-schwellung` (karpaltunnel). Résidu `nonReduit` : 103.
- Questions du cas muettes : 794. Parmi les cas listés par la revue, il reste schenkelhalsfraktur, zystitis, rheumatoide-arthritis, pankreatitis, zoeliakie et uterus-myomatosus #15.
- Le seuil de Morgensteifigkeit de fibromyalgie ; M3 ; les 10 constats de relecture de `checkTrameSymptoms`.
- Réponse « trop longue » d'une relance détachée : une clé par relance demande une proposition de contrat sur `fsp-patient-sync`, `rolePlay` et `features/simulation` (§ 0bis.3).

**Pour contenu**
- Aucune question sur une **tentative de suicide antérieure** dans le bloc de sécurité psy (non écrit ici, sur décision de main).
- `fach-rheuma-systemisch` : « Augenentzündungen » et « Bindehautentzündung » dans la même question.
- colitis-ulcerosa : « Welche Farbe hat es — hellrot oder schwarz? » et « Welche Farbe hat der Stuhl — blutig, teerschwarz… » se suivent (relevé en passant, hors des deux cas de la direction).

## 0. Fixeur des revues de `508639f6` (décisions de main)

Règles tenues : test rouge d'abord ; mutation prouvée ; un commit par groupe ; chaque signe nouveau respecte INV-77 et INV-78. Après chaque groupe : `ajouteSansReponse = 0` et le plancher vérifiés.

### 0.1 Mécanique

| Item | Commit | Correction | Preuve |
|---|---|---|---|
| **B1** | `25f75332` | Une relance hors signe suit sa propre décision, même si sa mère est retirée par r1 : `vivants()` ne filtre plus sur l'état de la mère. | Fixture de la revue : `fach-infekt-gelenke` sous un profil psy, relance `selbstverletzung_wunsch` détachée, jamais perdue. Rouge avant |
| **I1** | `25f75332` | Fixture « précède **ou égale** » : la relance détachée a le même premier signe qu'une question du chapitre cible et se pose après elle. | Mutation `<=` → `<` jouée : rouge |
| **I2** | `a6a42558` | `checkPlayedTrame` : l'exemption « question non réduite », non documentée, est retirée. `akt-ausscheid-harn-haeufigkeit` reçoit ses `parts` jour / nuit, découpées de son texte. | gastroenteritis ne repose plus la fréquence du jour ; `checkPlayedTrame` 0 sans exemption. L'ancienne ligne du § 8 (« sans aucun constat nouveau ») cachait cette exemption : corrigé au § 8 |
| **I3 / P2 psy** | `125b1f9f` | Le cadrage « Ich frage das jeden Patienten in Ihrer Situation » et le soutien « Gibt es jemanden, der Sie unterstützt? » passent sous `fach-psych-suizid` (texte déplacé). Ordre : idée → plans → intention (NOTFALL) → désir d'automutilation → acte → soutien. | Test sur les 10 cas psy ; gel I3 regravé pour ces 10 cas |
| **M1** | `25f75332` | Fixture r3 → r4b : `braucht: ['ort']` dans un cas `schmerz` ; la question suit `akt-ort`, ajouté par r3. | Mutation « r4b ne déplace rien » jouée : rouge |
| **M2** | `3542ab31` | Commentaires périmés : `signes.ts`, `probeSucht.ts`, `symptoms.ts`, libellé `adaptChapters.test.ts`. | — |
| **M3** | — | Renvoyé à K4. | — |
| **M4** | `25f75332` | r3 sans phrase de banque lève une erreur au lieu d'afficher l'id. | Rouge avant |

Contrat §10.4 (`0009cc34`) : B1 ; une banque à `parts` n'ajoute que les parts qu'aucune unité ne pose ; les parts gardées d'une même question se posent en une question et ses relances ; banque introuvable = erreur.

### 0.2 Clinique — P0

**P0-1 (`12151dab`) — le sang dans les selles.**
- Nouveau signe `stuhl_blut` (dépistage). Sa banque mono-signe est `akt-ausscheid-aussehen` (« Blut, Schleim oder eine ungewöhnliche Farbe im Stuhl »).
- Il est déclaré aussi par `fach-gastro-stuhl`, sur sa relance « blutig, teerschwarz », que la mère déclare aussi : la relance reste sous elle. Et par `fach-haem-blutverlust` et `fach-onko-blutung`.
- `PROFIL_EXIGE.diarrhoe = stuhlfrequenz, stuhl_blut`.
- **Écart à la lettre** : `stuhlaussehen` sort de l'exigence. Sa banque est devenue `stuhl_blut`, et un signe exigé doit avoir une banque mono-signe (INV-77). L'aspect reste cherché par `akt-ausscheid-was`, `fach-gastro-stuhl` et la question du cas.
- Garde-fou : « Wie sieht Ihr Stuhl aus » (gastroenteritis) déclare `stuhlaussehen` seul. « Blut, Schleim » revient dans gastroenteritis, avec sa réponse existante.

**P0-2 (`cef31c89`) — Zungenbiss et Einnässen.**
- Deux signes nouveaux, `zungenbiss` et `einnaessen`, au chapitre `aktuell`. Les relances de `akt-anfall-bewusstsein` les déclarent ; r4a les détache.
- Elles restent posées quand la Fach Kardio prend la perte de connaissance : synkope, vorhofflimmern. En épilepsie, `fach-neuro-anfallzeichen` les déclare (D1) ; r2 les retire, elles ne sont posées qu'une fois.
- **Écart à la lettre** : leur pertinence est `['anfall', 'neurologisch']`, pas `['anfall']` seul. La Fach neuro les pose en DD dans schlaganfall, tia et commotio ; sous `['anfall']`, r1 l'y laissait non réduite.

**Réponses écrites**, à relire. Elles sont ajoutées à la fin de `antworten['akt-anfall-bewusstsein']`, d'après la fiche :

| Cas | Ajouté | Source dans la fiche |
|---|---|---|
| synkope | « Auf die Zunge gebissen habe ich mich nicht, und eingenässt habe ich mich auch nicht. » | « kein lateraler Zungenbiss, kein Einnässen » |
| vorhofflimmern | « …, auf die Zunge gebissen auch nicht, und Urin ist auch keiner abgegangen. » | « keine Synkope, kein Sturz, kein Krampfanfall » |
| sturz-im-alter | « Die Zunge habe ich mir nicht gebissen, und in die Hose ist auch nichts gegangen. » | phrase déjà dans la fiche, autre clé |

panikstoerung avait déjà la réponse. En épilepsie, c'est la Fach qui pose ces questions.

### 0.3 Clinique — P1

| Item | Commit | Décision appliquée |
|---|---|---|
| **P1-1** | `49770214` | **D4-bis** (contrat §10.0). Quand un signe est le motif du cas (`SIGNE_DU_MOTIF` : fièvre / `infekt`, dyspnée / `atemnot`), Aktuelle Beschwerden l'emporte (rang 0,5 en r2). La Fach se réduit : `fach-pneumo-fieber` devient « Hatten Sie dabei Schüttelfrost? » et `fach-infekt-fieber` cède. Tests malaria, pneumonie, 130 cas `infekt`. Le test CAP retrouve son attente d'origine. Effet de bord voulu : dans les 6 cas `atemnot` avec Fach pneumo ou kardio, « Belastung » d'Aktuelle Beschwerden passe avant la Fach |
| **P1-2** | `3cd35142` | `fach-neuro-verlauf` déclare `schub, verlauf, waerme` (sa part « schubweise » porte le cours) : Aktuelle Beschwerden ne redemande plus le cours dans les 9 cas neuro |
| **P1-3** | `3cd35142` | La variante psy de Verlauf déclare `verlauf, tageszeit`, avec deux parts découpées de son texte |
| **P1-4** | `3cd35142` | La variante douleur d'`akt-beginn` déclare `beginn, beginn_art`, avec deux parts (« Seit wann haben Sie die Schmerzen? » / « Kamen sie plötzlich oder schleichend? »). La date reste ; le mode n'est posé qu'une fois (6 cas rhumato). La prémisse de la décision 3 est corrigée |
| **P1-5** | `3cd35142` | Pertinence de `stuhlfrequenz` : `diarrhoe, transit`. Pertinence de `miktion_frequenz` : `harn, diarrhoe`. Tags nouveaux : `transit` (obstipation, kolorektales-ca, reizdarm) et `harn` (6 cas uro, 4 cas néphro). Voir les écarts au § 0.6 |
| **P1-6** | `1bb8afc9` | (a) Les relances d'`akt-veraend-blutung` déclarent leur signe et restent sous leur mère, qui les déclare ; quatre parts découpées de son texte laissent r2 retirer ce que la Fach pose. Bronchialkarzinom n'a plus « Husten Sie Blut ab? » ; lymphom et itp n'ont plus « Blut im Stuhl ». (b) `knoten` est déclaré sur onko-knoten, haem-lymphknoten et gyn-brust ; `entwicklung` sur derma-muttermal et derma-beginn-ort. (c) Renvoyé à K4 |
| **P1-7** | `1bb8afc9` | uterus-myomatosus : ni « Befund » ni « Schmerz und Blutung ». **Écart à la lettre**, voir § 0.6 |
| **P1-8** | `d52ed90a` | herzinsuffizienz : « Mit wie vielen Kissen … wachen Sie nachts auf » déclare `orthopnoe, dpn` |
| **P1-9** | `d52ed90a` | `atemnot.bank = fach-pneumo-atemnot`. Les **5** cas où r3 l'ajoute reçoivent sous cette clé la réplique écrite en K2 pour la question de la variante : même texte, recopié. Ce sont bronchialkarzinom, diabetes-typ1, metabolisches-syndrom, colitis-ulcerosa et nephrotisches-syndrom |
| **P1-10** | `d52ed90a` | Signe `stuhl_nachts` ; parts jour / nuit d'`akt-ausscheid-haeufigkeit`. Crohn et zoeliakie déclarent `stuhl_nachts` ; karzinoid et colitis-ulcerosa déclarent `stuhlfrequenz, stuhl_nachts`. r3 n'ajoute que la part que personne ne pose |
| **P1-11** | `e13751c6` | Pertinence de `reise` : `infekt, fieber, reise, diarrhoe, lyme, meningitis`. Fibromyalgie n'a plus de « Waren Sie kürzlich im Ausland? » isolé. Résidu au § 0.6 |
| **P1-12** | `d52ed90a` | `impfung` est déclaré sur les questions du cas de pneumonie, copd, abszess, pertussis et hodentorsion ; itp déclare `vorinfekt, impfung`. La vaccination n'est plus posée deux fois |

### 0.4 Clinique — P2 (`860e2f7c`)

- **Transpiration** : les parts gardées d'une même question se posent en une question, puis ses relances. Nierenkolik : « Schwitzen Sie nachts stark? » ↳ « Haben Sie starke Schweißausbrüche? ».
- **`fach-rheuma-systemisch`** ne déclare plus `ausschlag`. Son alternative « Hautausschlag, Augenentzündung oder Fieber » est retirée : D1 l'aurait obligée à déclarer `ausschlag`. Gel I3 regravé pour les 6 cas rhumato.
- **`fach-ortho-mechanismus` déclare par variante** : sans traumatisme, « Unfall oder Sturz » déclare `unfallhergang, sturz`. Seule la déclaration du patch FACH_RULES change.
- **`akt-neuro-lage`** est retirée de schlaganfall et tia par `aktuellSkip` : le profil ne peut pas exclure un signe de dépistage (INV-80).
- **La vaccination** reste dans la végétative.
- **Relances goutte : non fait, contradiction.** Ce sont les relances de `fach-rheuma-ausloeser` : « Falls ein üppiges Essen: … Bier? » et « Falls ein neues Medikament: … Wassertablette? ». Elles posent problème dans fibromyalgie et polymyalgia.
  - Elles sont **conditionnelles**. La porte (INV-84, `suchtCheck`) refuse qu'une relance conditionnelle déclare un signe, même s'il est inclus dans celui de la mère.
  - Si la mère déclarait `gicht`, r1 la laisserait non réduite (elle n'a pas de `parts`), sans retirer les deux relances.
  - Enfin, l'identité (e) distingue l'antécédent de goutte (`fach-rheuma-vorgeschichte#1`) des facteurs déclenchants.
  - **Proposition** : (a) un signe `gicht_ausloeser` (pertinence `gicht`), avec une règle r1 qui retire une relance de précision dont tous les signes déclarés sont hors profil (amendement de §10.4 et d'INV-84) ; ou (b) des parts pour `fach-rheuma-ausloeser`, écrites en K4.

### 0.5 Mesure, plancher, gel

| Porte après montage (130 cas) | Valeur |
|---|---|
| doublons, horsProfil, exigeAbsent, relancesOrphelines, brauchtViole, ajouteSansReponse | **0** |
| casRetiresParR1 | **0** |

| Plancher (`coherence-budget.json`) | `508639f6` | **Sommet** |
|---|---:|---:|
| doublons | 224 | **218** |
| doublonsCas | 24 | 24 |
| horsProfil | 38 | **46** (voir § 0.6) |
| exigeAbsent | 0 | 0 |
| brauchtViole | 20 | 20 |
| ajouteSansReponse | 0 | 0 |
| questionsMuettes | 812 | **803** |
| nonReduit | 117 | **112** |

`checkBudgetFloor.mjs origin/main` : 0, sous la base K2 (269 / 70 / 47 / 820).

| Écarts (130 cas) | Nombre |
|---|---:|
| r2 retire | 379, + 313 relances |
| r2 réduit | 117, + 119 relances |
| r2 non-réduit | 72 |
| r2 déplace | 25 |
| r1 retire | 32, + 12 relances |
| r1 réduit | 98, + 374 relances (surtout `veg-fieber` sans voyage, P1-11) |
| r1 non-réduit | 40 |
| r1 anomalie | 2 |
| r3 ajoute | 45 |
| r4a détache | 149 |

Détachés : 5 relances distinctes (impfung → végétative ; Gicht / Nierensteine ; Familie Rheuma ; Zungenbiss et Einnässen → Aktuelle Beschwerden).

**Gel `trame-actuelle.txt`** : 128 cas changent depuis `508639f6`. Lignes de chapitre modifiées :

| Chapitre | Lignes | Chapitre | Lignes |
|---|---:|---|---:|
| aktuell | 108 | fach-psy | 10 |
| vegetativ | 101 | fach-ortho | 8 |
| fach-pneumo | 6 | fach-infektio | 5 |
| fach-neuro | 1 | fach-kardio | 1 |

Les catégories sont celles des tableaux ci-dessus : D4-bis, le voyage, les parts jour / nuit, le bloc de sécurité, les relances détachées. `fachCovers` : 26 paires restent posées, chacune avec sa raison vérifiée, dont la nouvelle `d4-bis`.

### 0.6 Concerns — écarts à la lettre, résidu

1. **P1-7.** Le profil `exclut` ne peut viser que des signes **non** de dépistage (INV-80 ; contrat §10.3). `knoten`, `ausschlag`, `lokalblutung`, `juckreiz` et `lokalschmerz` sont tous de dépistage. J'ai donc utilisé l'`aktuellSkip` du cas (`akt-veraend-was`, `akt-veraend-blutung`) : même effet, sans violer INV-80. Pour la lettre de la décision, il faudrait d'abord rendre ces cinq signes non de dépistage, ce qui touche tous les cas qui les posent.
2. **P1-5.** `nykturie` reste de dépistage : la Fach Kardio (insuffisance cardiaque) et Endo (polyurie) la posent dans 15 cas ni urinaires ni rénaux. Conséquence : dans 6 cas digestifs, la partie « nachts Wasser lassen » reste posée. `miktion_frequenz` est pertinent aussi pour `diarrhoe` (la diurèse dit la déshydratation) : c'est un ajout à la décision.
3. **P0-1 et P0-2** : écarts décrits au § 0.2.
4. **Résidu de P1-11.** `fach-pneumo-infekt` (« Atemwegsinfekt, Kontakt zu Kranken oder eine Reise? ») n'a pas de `parts` : elle est non réduite dans 6 cas pneumo non infectieux. C'est la hausse de mesure `horsProfil` de 39 à 46 et `nonReduit` de 110 à 116, que les groupes suivants ont fait redescendre à 112. K4 écrit ses parts.
5. **P1-6a** : dans les 4 cas derma, « Blut im Stuhl / Urin » et « Blut abhusten » restent posées comme parts (`stuhl_blut` et `haemoptyse` sont de dépistage). Leur pertinence dans une lésion cutanée est à trancher par la contre-revue clinique.
6. **P2 goutte** : non fait (§ 0.4).

### 0.7 Pour K4 (renvoyé, non fait)

- Questions du cas sans `sucht` listées par la revue :
  - gastroenteritis : « dort gegessen », Beruf, Krankenhaus ×2, Haut / Neuro de la Fach Infektio ;
  - fibromyalgie, schenkelhalsfraktur, zystitis, rheumatoide-arthritis, pankreatitis, zoeliakie ;
  - uterus-myomatosus #15.
- Le seuil de Morgensteifigkeit de fibromyalgie.
- M3.
- Les `parts` d'`akt-veraend-was` (P1-6c), de `fach-pneumo-infekt`, de `fach-rheuma-ausloeser` (goutte), de `fach-infekt-haut` / `-neuro` et de `fach-ortho-schwellung` (karpaltunnel).
- Les 12 constats de relecture de `checkTrameSymptoms`.

**Pour le lot de contenu** : aucune question sur une **tentative de suicide antérieure** dans le bloc de sécurité psy. C'est un manque de contenu ; il n'est pas écrit ici, sur décision de main.

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
- **Sécurité (règle finale, décision de main sur le § 9.1).** Garantie : tout signe de risque cherché par la trame brute reste cherché par la trame jouée.
  - `RISIKO_SIGNES = {suizid, selbstverletzung, selbstverletzung_wunsch}` : r1 ne les met jamais hors profil ; r2 s'applique, et le gagnant D4 reste posé.
  - Testé sur les 130 cas. Sur les **10 cas psy** : idéation, acte et désir d'automutilation sont posés, et la question de sécurité **une seule fois**. `akt-psych-sicherheit` est retirée au profit de `fach-psych-suizid` (D4).
  - **Mutation** : sans la protection r1, un profil qui exclut ces signes les fait perdre, et la garantie rougit.
  - Aucune autre paire de risque ne partageait un signe : « konkrete Pläne » est une précision qui suit la mère.
- **Décision 4 (fréquence des selles).** r3 ajoute `akt-ausscheid-haeufigkeit` à crohn, zoeliakie et chronische-pankreatitis. Elle est posée sans condition, avec la réponse de K2 (testé). Dans les 6 cas gastro où `FACH_COVERS` l'effaçait, elle revient.
- **SUCHT_MONTAGE dégelé.** Il est supprimé, avec `dedupeBySymptom`. `phraseSymptoms` lit la déclaration.
- **karpaltunnel.**
  - Fait en K3 : `fach-ortho-schwellung` reste entière, en non-réduite assumée, comme demandé en K2. Le seul signe hors profil est `gelenk_entzuendung`. Le moteur ne coupe rien.
  - Renvoyé à K4 : écrire ses `parts`.

## 5. Tests du lot (vitest `--dir src` : 166 fichiers, 1 647 tests, 0)

**`coherence.test.ts`** (37 tests) :
- INV-81 à 88, 90 et 91 sur fixtures (sondes réelles) et sur les 130 cas ;
- INV-86 : chaque garde rougit sur un moteur abîmé (entrée mutée, ordre instable, ajout à chaque passe) ;
- sécurité, avec sa mutation ;
- gastroenteritis et fibromyalgie ligne à ligne, plus la spec §3.3 « une fois annotés » : K4 simulé sur une copie, la question du cas gagne Ort, Verlauf, Steifigkeit et Entzündung, et « dort » suit le voyage.

**`coherence.fachCovers.test.ts`** : 73 paires, dont 71 s'appliquent. **42 sont retirées par r2 ; 29 restent posées**, avec leur raison vérifiée dans les données :

| Raison | Nombre | Détail |
|---|---:|---|
| signe distinct | 20 | dont le pont urinaire vers les selles (décision 3) et la fréquence des selles sous la Fach gastro (décision 4) |
| non réduite | 7 | la perdante n'a pas de `parts` (K4) |
| réduite | 1 | `fach-haem-bsymptomatik` → `akt-allgemein-gewicht` |
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

## 7. La porte et le plancher

`checkCoherence.mjs` est **bloquante**, sans `|| true`. Elle vérifie :
- les 6 compteurs **après montage**, relus sur la trame jouée : 0 ;
- `casRetiresParR1` : 0 ;
- `COHERENCE_ALLOWED` : raison, relecteur, entrée datée au fixture, entrée non périmée.

`--case` affiche les écarts. Mutations (`checkCoherence.test.mjs`, 37 tests) : r1 ou r2 désactivée, r1 qui retire une question du cas, exception invalide, réponse de banque retirée (case-zoeliakie) → exit 1.

| Plancher (`coherence-budget.json`) | K2 | **K3** |
|---|---:|---:|
| doublons | 269 | **224** |
| doublonsCas | 24 | 24 |
| horsProfil | 70 | **38** |
| exigeAbsent | 47 | **0** |
| relancesOrphelines | 0 | 0 |
| brauchtViole | 20 | 20 |
| ajouteSansReponse | 0 | 0 |
| questionsMuettes | 820 | **812** |
| nonReduit | — | **117** (mesuré) |
| casRetiresParR1 | — | **0** |

Ce qui reste dans `brut`, c'est la dette que le moteur ne corrige pas : les questions du cas muettes, encore lues par leur texte, et les non-réduites. **Contrat amendé** (§10.4, §10.6) : r1 et le rang 0 ; « précède ou égale » ; motif en tête ; `RISIKO_SIGNES` (aucun signe de risque perdu) ; `brut` sur la trame jouée ; `horsProfil` hors questions du cas gardées.

## 8. Portes secondaires

- **`checkPlayedTrame`** : la tolérance `deepens` est retirée (D3). À `508639f6`, la porte exemptait aussi en silence les questions non réduites. La revue I2 l'a relevé ; l'exemption est retirée en `a6a42558`, et la porte passe à 0 sans elle.
- **`checkTrameSymptoms`** :
  - il lit la déclaration ;
  - le résidu assumé du moteur n'y compte pas comme doublon : questions non réduites, nom et épellation, `SUCHT_AUSSER` ;
  - **10 constats de relecture ouverts**, hausse documentée de 2 à 12 au fixture, échéance K4 (cml, diabetes, lymphom ×2, nhl ×3, prostatakarzinom, schenkelhalsfraktur, zystitis). Ce sont des questions du cas muettes qui citent un signe qu'une autre question déclare. Lymphom et nhl : le prurit **généralisé** (signe B) n'est pas le « juckt es » d'une lésion.

## 9. Points soumis à main (première rédaction)

1. **Le risque suicidaire est demandé deux fois dans 6 cas psy.** `akt-psych-sicherheit` (« Sicherheit — Ich frage das jeden Patienten … ») et `fach-psych-suizid` cherchent `suizid`. C'est l'application littérale de « jamais retirée par r2 ». Si main le veut, une exception étroite est possible : la Fach garde la question de sécurité quand elle pose le même signe et que l'acte et le désir restent posés. **À trancher** (cas psy de la revue : `case-depression`).
2. **Revue K1 C6 inversée** : les relances de `akt-veraend-blutung` sont redevenues des précisions (§ 3). La revue C6 avait demandé `stuhlaussehen`, `urin_aspekt` et `haemoptyse` ; ces signes restent portés par les Fach.
3. **Extension de périmètre** : deux questions du cas déclarées en plus des 8 (§ 2). Même règle, à acter.
4. **Cas gynéco (`case-uterus-myomatosus`).** `akt-veraend-was` et `akt-veraend-blutung` reviennent (signes distincts de `fach-gyn-blutung` et `-brust`). `akt-veraend-blutung` est non réduite et porte ses relances « Blut im Stuhl / Urin, Blut abhusten ».
5. **gastroenteritis.** « Aussehen — Blut, Schleim im Stuhl? » est retirée par `akt-ausscheid-was`, qui énumère l'aspect (D1, déclaration K0 I2). La question du cas « Wie sieht Ihr Stuhl aus » reste muette jusqu'en K4. **fibromyalgie** : la végétative garde « Waren Sie kürzlich im Ausland? » seule, comme `part` de `veg-fieber`, la Fach ayant pris la fièvre.

## 9 bis. Décisions de main sur le § 9 (5 oct.), appliquées

| § 9 | Décision | Effet |
|---|---|---|
| 1 | La sécurité garantit qu'aucun signe de risque n'est perdu ; r2 s'applique | la question de sécurité n'est posée qu'une fois (6 cas psy), la Fach l'emporte ; tests, `adaptChapters` (assertion d'origine rétablie), `fachCovers` (29 paires gardées), contrat et plancher (doublons 230 → 224) à jour |
| 2 | Relances de `akt-veraend-blutung` en précisions : acceptées | — |
| 3 | Les deux questions du cas en plus : acceptées | — |
| 4 | Hausse `checkTrameSymptoms` 2 → 12 (K4) : acceptée | — |
| 5 | Vérification à deux onglets : par main, après le merge | — |

Restent pour la revue clinique : § 9.4 (cas gynéco) et § 9.5 (gastroenteritis, fibromyalgie).

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

- `npx tsc -b --noEmit` : **0**.
- `npx vitest run --dir src --maxWorkers=2` : **0** (170 fichiers, 1 731 tests).
  - Une première passe a eu un échec isolé : `features/simulation/horloge.test.tsx`, un test d'horloge à 1 160 ms. La branche ne touche pas `src/features`. Le test passe seul trois fois sur trois, et la passe complète relancée sort à 0.
- `node scripts/check*.mjs` : **tous 0**, sauf `checkProbeOverlap` (1, informatif, `|| true` en CI). Parmi eux :
  - `checkCoherence` 0, `checkPlayedTrame` 0, `checkTrameSymptoms` 0, `checkQuestionAtomicity` 0, `checkCaseCoherence` 0 ;
  - `checkGuideCoverage` 0 : c'est le contrat guide ↔ fiche ;
  - `checkTermRegister --require-all` 0.
- `checkBudgetFloor.mjs origin/main` : **0**.
- `node --test scripts/*.test.mjs` (12 fichiers) : **0**.
- `git merge-tree --write-tree origin/main HEAD` (`origin/main` @ `9422c98a`) : **0**. `evalDoctopus --dry` : **0**.
- Chaque code de sortie est relu par `rc=$?`, jamais à travers un pipe ni une substitution.

## Non vérifié

- **Pas de vérification à deux onglets dans un navigateur.** Le worktree n'a pas de `.env`, et l'app charge le contenu par Supabase, que je n'avais pas le droit de démarrer, comme je ne devais pas toucher la prod. Ce qui la remplace :
  - côté médecin, `checkGuideCoverage` (0) sur le montage réel : toute question jouée a sa réponse ;
  - côté simulant, le Rollenskript lit `antworten`. K3 n'y touche que là où main l'a autorisé : P0-2 (Zungenbiss / Einnässen ; ajout gardé en synkope, retiré en vorhofflimmern et sturz-im-alter) et P1-9 (`fach-pneumo-atemnot` copiée dans 5 cas). `checkGuideCoverage` le couvre.
  - Main fait la vérification à deux onglets après le merge (décision du § 9 bis).
- **La justesse clinique** des voies du § 3, des déclarations des § 2 et § 0bis.4, et des résidus du § 0bis.4 : c'est mon jugement, à relire par la troisième revue clinique.
- **Le contenu publié** : `publishContent.mjs` republiera les fiches touchées au merge ; je ne l'ai pas rejoué.
- **`graphify update app/src`** : il n'y a pas de graphe dans ce worktree.
