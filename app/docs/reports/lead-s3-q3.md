# Lot Q3 — composées d'`aktuell`, renvois des revues K3–K5, reliquat Q2

Branche `feat/s3-q3-contenu` (base `origin/main` @ `cb15a90d`, K0–K5 mergés). Commits : `961cbec0` (type `followUps`), `9f82a403` (contenu, tests, gels, budget), `4a888438` (reliquat Q2), puis ce rapport. **Statut : DONE_WITH_CONCERNS** — tout est vert par code de sortie ; les réserves sont au § 6 et au § Non vérifié. Une revue clinique et une relecture de langue Opus suivent.

Sources lues : `serie3-avancement.md` (§ 10, § 11), `audit-questions-du-cas-serie3.md`, `docs/contracts/frage-atomique.md` §1–3 et §10, `lead-s3-k3.md` (0.7, 0bis.6), `lead-s3-k4.md` (3, 5.3, G.3), `lead-s3-k5.md` (F.3, F.5), `lead-s3-q2.md`, `app/scripts/PIPELINE.md` (étape cohérence).

## 1. Mesures avant / après

| Compteur | `origin/main` | Q3 | Détail |
|---|---:|---:|---|
| Questions du cas composées d'`aktuell` (A + A2 + B, trame jouée) | **149** (A 101, A2 15, B 33) | **96** (A 63, A2 8, B 25) | −53 ; l'audit (avant le moteur) annonçait A 110 / B 34 |
| `checkQuestionAtomicity` A | 423 | **360** | `--bless` (baisse) ; note `q3` au fixture |
| A2 | 48 | **41** | |
| B | 113 | **105** | |
| C, D, E · D2 / D3 | 0 · 453 / 12 | 0 · 453 / 12 | inchangés |
| corpus « à dire » | 4 847 | 4 970 | +123 : chaque relance découpée est un énoncé |
| `checkCoherence` porte après montage | 0 | **0** | doublons, horsProfil, exigeAbsent, relancesOrphelines, brauchtViole, ajouteSansReponse, casRetiresParR1 |
| planchers de mesure (`coherence-budget.json`) | — | **inchangés** | aucun compteur ne bouge ; `checkBudgetFloor origin/main` = 0 |
| `presuppositionsTexte` (informatif) | 21 | **20** | anaphylaxie « Ihr Asthmaspray » résolue |
| `doublonsMasques` (informatif) | 51 | 51 | |
| `checkTrameSymptoms` socle · `relu` | 0 · 84 | 0 · **84** | aucun `relu` ajouté |
| `checkCaseQuestionAnswers` (informatif, plancher) | 74 | 74 | |
| `checkProbeOverlap` (informatif, `|| true` en CI) | 8 | **9** | +1 : `fach-rheuma-vorgeschichte` ↔ `akt-frueher` (43 %), voir § 6 |
| Lexique | 492 signes | 492 | +`suizidversuch`, −`postpartum` (devenu mort) |

## 2. Q3 — la re-mesure, puis le traitement

**Re-mesure sur la trame jouée d'aujourd'hui** (et non sur l'audit, antérieur au moteur) : `checkQuestionAtomicity --report --rule A|A2|B`, rattaché à chaque question du cas et à son chapitre (`loadCases.mjs`). 259 constats dans les questions du cas, dont **149 en `aktuell`**. Cas tier 1 : 4 questions (copd, diabetes, migraene, zystitis) — toutes traitées.

**Périmètre Q3** : le tiers de Q3–Q5, dans l'ordre du fichier, tier 1 compris : les 49 composées des 34 premiers cas touchés (bandscheibenvorfall → synkope), plus les deux de schenkelhalsfraktur (cas ouvert pour son renvoi). Les 96 qui restent commencent à `case-zoeliakie` (rang 65) : Q4, Q5.

**Les gestes**, selon le contrat (§3.2, §10.2) et `PIPELINE.md` :
- « fermée ? + W- ? », ou deux questions du **même** signe → une question et sa relance (`followUp`, « Falls ja: » quand elle n'a de sens qu'après un oui) ;
- deux signes → deux questions du cas, chacune déclarée (`sucht`) — jamais une relance hors signe ;
- énumération > 3 → coupée en deux questions selon les signes, ou la précision passe en relance ;
- `checkCoherence --case <id>` relu pour chaque cas touché (place des questions, présuppositions, doublons masqués), porte globale à 0 après chaque passe.

Aucun fait clinique n'est inventé : chaque moitié découpée existait déjà dans le texte, et la fiche y répond déjà (vérifié cas par cas avec `antworten`, `negativeFindings`, `begleitsymptome`, `sozialanamnese`). Les seules réponses écrites sont au § 4.

## 3. Avant / après — chaque question du cas modifiée

Signes entre accents graves ; kapitel indiqué s'il n'est pas `aktuell`. `↳` = relance (la première est `followUp`, les suivantes `followUps`).

| Cas | Avant | Après (signes déclarés) |
|---|---|---|
| gib | — | Seit wann haben Sie das bemerkt? — `beginn` |
| appendizitis | Kam die Übelkeit oder das Erbrechen erst, nachdem die Schmerzen begonnen hatten? | Ist Ihnen übel, oder mussten Sie erbrechen? ↳ Falls ja: Kam das erst, nachdem die Schmerzen begonnen hatten? — `uebelkeit, erbrechen` |
| bandscheibenvorfall | Werden die Schmerzen beim Husten, Niesen oder Pressen stärker und schießen dann ins Bein? | Werden die Schmerzen beim Husten, Niesen oder Pressen stärker? ↳ Falls ja: Schießen sie dann ins Bein? — `pressschmerz` |
| reizdarm | Hat sich seit Beginn der Schmerzen verändert, wie oft Sie zur Toilette müssen oder wie der Stuhl aussieht? | Hat sich seit Beginn der Schmerzen verändert, wie oft Sie zur Toilette müssen? — `stuhlfrequenz`<br>Hat sich das Aussehen Ihres Stuhls verändert? — `stuhlaussehen` |
| tvt | Wann genau haben die Beschwerden im Verhältnis zu Ihrem Flug begonnen, und wie lange hat der Flug gedauert? | Wann genau haben die Beschwerden im Verhältnis zu Ihrem Flug begonnen? ↳ Wie lange hat der Flug gedauert? — `flug`, braucht `beginn`<br>Seit wann ist Ihr Bein geschwollen? — `beginn` |
| tvt | — | Haben Sie Blut abgehustet? — `haemoptyse` |
| diabetes | Sehen Sie zwischendurch verschwommen? Waren Sie deswegen schon beim Augenarzt? | Sehen Sie zwischendurch verschwommen? ↳ Falls ja: Waren Sie deswegen schon beim Augenarzt? — `sehstoerung` |
| copd | Sind Ihre Beine geschwollen? Müssen Sie nachts Wasser lassen, und mit wie vielen Kissen schlafen Sie? | Sind Ihre Beine geschwollen? — `oedeme`<br>Müssen Sie nachts Wasser lassen? — `nykturie`<br>Mit wie vielen Kissen schlafen Sie? — `orthopnoe` |
| zystitis | Wie sieht Ihr Urin aus — trüb, ungewöhnlicher Geruch? Falls Blut dabei war: am Anfang, während oder am Ende des Wasserlassens? | Wie sieht Ihr Urin aus — trüb, ungewöhnlicher Geruch? ↳ Falls Blut dabei war: Am Anfang, während oder am Ende des Wasserlassens? — `urin_aspekt` |
| migraene | Wie lange dauert eine solche Attacke normalerweise bei Ihnen — und wie lange dauert diese jetzt schon? | Wie lange dauert eine solche Attacke normalerweise bei Ihnen? ↳ Wie lange dauert die jetzige Attacke schon? — `dauer` |
| asthma | Beim Sport — kommt die Luftnot während der Belastung oder erst einige Minuten danach? Macht es einen Unterschied, ob Sie draußen laufen oder in der Halle schwimmen? | Beim Sport — kommt die Luftnot während der Belastung oder erst einige Minuten danach? ↳ Macht es einen Unterschied, ob Sie draußen laufen oder in der Halle schwimmen? — `belastung`, relu |
| asthma | Wie sehr schränkt es Sie im Alltag und im Sportunterricht ein? Wie oft mussten Sie deswegen etwas absagen? | Wie sehr schränkt es Sie im Alltag und im Sportunterricht ein? ↳ Wie oft mussten Sie deswegen etwas absagen? — `leistung` |
| herzinsuffizienz | Sind beide Beine gleich stark geschwollen? Bleibt eine Delle stehen, wenn Sie mit dem Finger daraufdrücken? | Sind beide Beine gleich stark geschwollen? ↳ Bleibt eine Delle stehen, wenn Sie mit dem Finger daraufdrücken? — `oedem_qualitaet` |
| herzinsuffizienz | Wie salzig essen Sie? Gab es in den letzten Wochen eine Feier mit Wurst, Käse oder Salzgebäck? | Wie salzig essen Sie? ↳ Gab es in den letzten Wochen eine Feier mit Wurst, Käse oder Salzgebäck? — `salzkonsum` |
| tonsillitis | Können Sie den Mund normal weit öffnen, oder geht das nicht mehr richtig auf? Läuft Ihnen der Speichel aus dem Mund? | Können Sie den Mund normal weit öffnen, oder geht das nicht mehr richtig auf? ↳ Läuft Ihnen der Speichel aus dem Mund? — `kieferklemme` |
| anaemie | Sind Ihnen eingerissene Mundwinkel, eine brennende Zunge, brüchige Nägel oder vermehrter Haarausfall aufgefallen? | Sind Ihnen eingerissene Mundwinkel oder eine brennende Zunge aufgefallen? — `zunge`<br>Sind Ihre Nägel brüchig, oder haben Sie vermehrt Haarausfall? — `haut_haare` |
| vorhofflimmern | Was haben Sie an dem Abend vor Beginn der Beschwerden gegessen und getrunken — und wie viel genau? | Was haben Sie an dem Abend vor Beginn der Beschwerden gegessen und getrunken? ↳ Falls Alkohol: Wie viel genau? — `alkohol_akut` |
| erysipel | Gibt es an dem Bein oder am Fuß eine kleine Verletzung, eine offene oder eingerissene Stelle, ein Ekzem oder ein offenes Bein?<br>Wie sieht es zwischen Ihren Zehen aus — haben Sie Fußpilz, juckt oder schuppt es dort, ist die Haut eingerissen? Darf ich mir das ansehen?<br>Haben Sie einen roten Streifen bemerkt, der von der Stelle nach oben zieht? Sind die Lymphknoten in der Leiste geschwollen und schmerzhaft? | Haben Sie am Bein oder am Fuß eine kleine Wunde oder eine eingerissene Stelle? ↳ Haben Sie dort ein Ekzem oder ein offenes Bein? — `wunde`<br>Wie sieht es zwischen Ihren Zehen aus — juckt oder schuppt es dort? ↳ Falls ja: Ist die Haut dort eingerissen? — `fusspilz`, relu<br>Haben Sie einen roten Streifen bemerkt, der von der Stelle nach oben zieht? — `lymphangitis`<br>Sind die Lymphknoten in Ihrer Leiste geschwollen oder schmerzhaft? — `lymphknoten` |
| erysipel | Sind die Schmerzen stärker, als die Rötung vermuten lässt? Hat sich die Farbe bläulich verändert, oder sind Blasen oder schwarze Stellen entstanden? | Sind die Schmerzen stärker, als die Rötung vermuten lässt? ↳ Hat sich die Haut bläulich oder schwarz verfärbt, oder sind Blasen entstanden? — `nekrose_zeichen`, relu |
| hypothyreose | Waren Sie nach einer Ihrer Entbindungen über längere Zeit ungewöhnlich erschöpft? | — (retirée) |
| eug | Haben Sie Schmerzen in der Schulter oder unter dem Rippenbogen bemerkt, besonders im Liegen oder beim Einatmen? | Haben Sie Schmerzen in der Schulter oder unter dem Rippenbogen bemerkt? ↳ Falls ja: Vor allem im Liegen oder beim Einatmen? — `ausstrahlung` |
| meningitis | Können Sie das Kinn auf die Brust legen? Können Sie den Kopf zur Seite drehen und in den Nacken legen? | Können Sie das Kinn auf die Brust legen? ↳ Können Sie den Kopf zur Seite drehen und in den Nacken legen? — `meningismus` |
| meningitis | Hatten Sie einen Krampfanfall, eine Lähmung, Doppelbilder oder eine Sprachstörung? | Hatten Sie einen Krampfanfall? — `krampf`<br>Haben Sie eine Lähmung, Doppelbilder oder eine Sprachstörung bemerkt? — `schwaeche, sehstoerung, sprache` |
| pankreaskarzinom | Und wie sieht Ihr Stuhlgang aus? Ist er heller geworden, vielleicht fast weiß oder lehmfarben, und lässt er sich schlecht abspülen? | Wie sieht Ihr Stuhlgang aus — ist er heller geworden, vielleicht fast weiß oder lehmfarben? ↳ Lässt er sich schlecht abspülen? — `stuhlaussehen` |
| osteoporose | War es ein Sturz, oder reichte schon eine leichte Bewegung wie Husten, Niesen oder Bücken, um den Schmerz auszulösen? | War es ein Sturz, oder reichte schon eine leichte Bewegung, um den Schmerz auszulösen? ↳ Zum Beispiel Husten oder Bücken? — `ausloeser`, relu |
| bph | Wie viel trinken Sie am Tag, und wie viel davon am Abend? Nehmen Sie eine Wassertablette? | Wie viel trinken Sie am Tag? ↳ Wie viel davon am Abend? — `trinkmenge`<br>Nehmen Sie eine Wassertablette? — `diuretika` |
| demenz | Kochen Sie noch selbst? Ist der Herd schon einmal angeblieben oder etwas angebrannt?<br>Wer regelt Ihre Bankgeschäfte und Rechnungen? Sind schon Mahnungen gekommen? | Kochen Sie noch selbst? ↳ Falls ja: Ist der Herd schon einmal angeblieben oder etwas angebrannt? — `alltag_haushalt`<br>Wer regelt Ihre Bankgeschäfte und Rechnungen? ↳ Sind schon Mahnungen gekommen? — `alltag_finanzen` |
| demenz | Wissen Sie, welcher Wochentag heute ist und welches Datum wir haben? | Wissen Sie, welcher Wochentag heute ist? ↳ Welches Datum haben wir heute? — `orientierung_zeit` |
| bronchialkarzinom | Hatten Sie in den letzten Monaten eine Lungenentzündung? Wurde danach ein Kontrollröntgen gemacht, und war es wieder vollständig unauffällig? | Hatten Sie in den letzten Monaten eine Lungenentzündung? ↳ Falls ja: Wurde danach ein Kontrollröntgen gemacht? ↳ Falls ja: War es wieder vollständig unauffällig? — `atemwegsinfekt` |
| bronchialkarzinom | Haben Sie neue Rücken- oder Knochenschmerzen, Kopfschmerzen, Sehstörungen oder einen Krampfanfall bemerkt? | Haben Sie neue Rücken- oder Knochenschmerzen bemerkt? — `knochenschmerz`<br>Haben Sie neue Kopfschmerzen, Sehstörungen oder einen Krampfanfall bemerkt? — `kopfschmerz, sehstoerung, krampf` |
| mammakarzinom | Wann und wie haben Sie den Knoten bemerkt — haben Sie ihn selbst getastet, und ist er seither größer geworden? | Wann haben Sie den Knoten bemerkt? ↳ Haben Sie ihn selbst getastet? — `beginn`<br>Ist der Knoten seitdem größer geworden? — `entwicklung` |
| rheumatoide-arthritis | Werden die Beschwerden durch Bewegung besser oder schlechter? Und was passiert nach längerem Sitzen? | Werden die Beschwerden durch Bewegung besser oder schlechter? ↳ Und was passiert nach längerem Sitzen? — `einfluss` |
| rheumatoide-arthritis | Ist die Schwellung eher weich und teigig oder hart und knotig? Sind die Gelenke überwärmt? | Ist die Schwellung eher weich und teigig oder hart und knotig? ↳ Sind die Gelenke überwärmt? — `gelenk_entzuendung` |
| morbus-crohn | Haben Sie Blut IM Stuhl gesehen, oder nur AM Toilettenpapier beim Abputzen? Brennt es dabei? | Haben Sie Blut IM Stuhl gesehen, oder nur AM Toilettenpapier beim Abputzen? ↳ Brennt es beim Stuhlgang? — `stuhl_blut` |
| karpaltunnel | Welche Hand ist stärker betroffen — rechts oder links? Und welche ist Ihre Schreibhand? | Welche Hand ist stärker betroffen — rechts oder links? ↳ Welche ist Ihre Schreibhand? — `haendigkeit` |
| panikstoerung | Kommen die Anfälle völlig unerwartet, oder immer in bestimmten Situationen? Sind Sie schon einmal nachts aus dem Schlaf heraus davon aufgewacht? | Kommen die Anfälle völlig unerwartet, oder immer in bestimmten Situationen? — `ausloeser`<br>Sind Sie schon einmal nachts aus dem Schlaf heraus von einem Anfall aufgewacht? — `naechtliche_anfaelle` |
| panikstoerung | Haben Sie zwischen den Anfällen Angst davor, dass wieder einer kommt? Kontrollieren Sie zwischendurch Ihren Puls? | Haben Sie zwischen den Anfällen Angst davor, dass wieder einer kommt? ↳ Kontrollieren Sie zwischendurch Ihren Puls? — `erwartungsangst`, relu |
| prostatakarzinom | Haben Sie ein Kribbeln, ein Taubheitsgefühl oder eine Schwäche in den Beinen bemerkt? Können Sie Urin und Stuhl halten? | Haben Sie ein Kribbeln, ein Taubheitsgefühl oder eine Schwäche in den Beinen bemerkt? — `taubheit, schwaeche`<br>Können Sie Urin und Stuhl halten? — `inkontinenz` |
| hepatitis-b | Ist Ihnen aufgefallen, dass Sie verwirrt sind, den Tag-Nacht-Rhythmus verwechseln oder die Hände zittern? Haben Sie vermehrt blaue Flecken oder Nasenbluten? | Ist Ihnen aufgefallen, dass Sie verwirrt sind, den Tag-Nacht-Rhythmus verwechseln oder die Hände zittern? — `verwirrtheit, tremor`<br>Haben Sie vermehrt blaue Flecken oder Nasenbluten? — `blutungsneigung` |
| parkinson | Zittert die Hand vor allem, wenn sie ruhig auf dem Bein liegt, und wird das Zittern besser oder schlechter, wenn Sie nach einer Tasse greifen? Zittert es auch, wenn Sie den Arm ausgestreckt halten oder schreiben? | Zittert die Hand vor allem, wenn sie ruhig auf dem Bein liegt? ↳ Wird das Zittern besser oder schlechter, wenn Sie nach einer Tasse greifen? ↳ Zittert es auch, wenn Sie den Arm ausgestreckt halten oder schreiben? — `tremor` |
| parkinson | Schauen Sie sich bitte Ihre eigene Handschrift an: Wird die Schrift zum Ende der Zeile hin kleiner?<br>Hat Ihnen jemand gesagt, dass Sie kleinschrittiger gehen, schlurfen, oder dass ein Arm beim Gehen nicht mehr mitschwingt? Bleiben Sie beim Losgehen oder Umdrehen manchmal wie festgeklebt stehen, und sind Sie schon gestürzt?<br>Riechen Sie noch normal? Haben Sie schon einmal etwas Angebranntes nicht gerochen? | Ist Ihnen aufgefallen, dass Ihre Schrift zum Ende der Zeile hin kleiner wird? — `feinmotorik`<br>Hat Ihnen jemand gesagt, dass Sie kleinschrittiger gehen, schlurfen, oder dass ein Arm beim Gehen nicht mehr mitschwingt? ↳ Bleiben Sie beim Losgehen oder Umdrehen manchmal wie festgeklebt stehen? — `gang`<br>Sind Sie schon einmal gestürzt? — `sturz`<br>Riechen Sie noch normal? ↳ Haben Sie schon einmal etwas Angebranntes nicht gerochen? — `riechen` |
| gonarthrose | Haben Sie Schmerzen oder Schwellungen in anderen Gelenken, besonders in den Fingern, und sind die Beschwerden seitengleich? | Haben Sie Schmerzen oder Schwellungen in anderen Gelenken, besonders in den Fingern? ↳ Falls ja: Sind die Beschwerden auf beiden Seiten gleich? — `gelenke` |
| struma | Bewegt sich die Schwellung mit, wenn Sie schlucken? Können Sie mir das einmal zeigen? | Bewegt sich die Schwellung mit, wenn Sie schlucken? ↳ Können Sie mir das einmal zeigen? — `schluckverschieblich`, relu |
| otitis-media | Ist Flüssigkeit oder Eiter aus dem Ohr gelaufen? Und hat der Schmerz dabei plötzlich schlagartig nachgelassen? | Ist Flüssigkeit oder Eiter aus dem Ohr gelaufen? ↳ Falls ja: Hat der Schmerz dabei plötzlich nachgelassen? — `otorrhoe` |
| ileus | Ist Ihr Bauch aufgebläht? Ist Ihnen aufgefallen, dass die Kleidung enger geworden ist?<br>Wie sah das Erbrochene aus? War es zuletzt grünlich, oder hat es unangenehm, fast wie Stuhl gerochen? | Ist Ihr Bauch aufgebläht? ↳ Ist Ihnen aufgefallen, dass die Kleidung enger geworden ist? — `voellegefuehl`<br>Wie sah das Erbrochene aus? ↳ War es zuletzt grünlich, oder hat es unangenehm, fast wie Stuhl gerochen? — `erbrechen` |
| lagerungsschwindel | Hören Sie auf einem Ohr schlechter? Haben Sie ein Pfeifen, Rauschen oder ein Druckgefühl im Ohr? | Hören Sie auf einem Ohr schlechter? — `hoerminderung`<br>Haben Sie ein Pfeifen, Rauschen oder ein Druckgefühl im Ohr? — `tinnitus` |
| synkope | Ist Ihre Frau dabei gewesen? Dürfte ich sie kurz dazu bitten? Was genau hat sie gesehen?<br>Wie lange waren Sie nach Angabe Ihrer Frau nicht ansprechbar, und wie schnell waren Sie danach wieder ganz bei sich — sofort oder erst nach einigen Minuten? | Ist Ihre Frau dabei gewesen? ↳ Falls ja: Was genau hat sie gesehen? ↳ Falls ja: Dürfte ich sie kurz dazu bitten? — `fremdanamnese`<br>Wie lange waren Sie nach Angabe Ihrer Frau nicht ansprechbar? ↳ Wie schnell waren Sie danach wieder ganz bei sich — sofort oder erst nach einigen Minuten? — `anfallszeichen` |
| schenkelhalsfraktur | Waren Sie kurz bewusstlos? Haben Sie sich auf die Zunge gebissen oder Urin verloren? Erinnern Sie sich an alles?<br>Sind Sie mit dem Kopf aufgeschlagen? Hatten Sie danach Kopfschmerzen, Erbrechen oder Sehstörungen? | Waren Sie kurz bewusstlos? ↳ Erinnern Sie sich an alles? — `bewusstlos, anfallszeichen`<br>Haben Sie sich auf die Zunge gebissen oder Urin verloren? — `zungenbiss, einnaessen`<br>Sind Sie mit dem Kopf aufgeschlagen? — `kopfanprall`<br>Hatten Sie nach dem Sturz Kopfschmerzen, Erbrechen oder Sehstörungen? — `kopfschmerz, erbrechen, sehstoerung` |
| schenkelhalsfraktur | — | Wie gut konnten Sie vor dem Sturz gehen — brauchten Sie eine Gehhilfe? — `vorzustand`, familie-sozial |
| ulcus-cruris | Hatten Sie schon einmal eine Thrombose in einem Bein oder eine Lungenembolie? ↳ Falls ja: Wie wurde das behandelt? | Hatten Sie schon einmal eine Thrombose in einem Bein oder eine Lungenembolie? ↳ Falls ja: Wann war das? ↳ Falls ja: In welchem Bein? ↳ Falls ja: Wie wurde das behandelt? — `thrombose_vorgeschichte`, vorerkrankungen |
| akutes-nierenversagen | Nehmen Sie Schmerzmittel ein, die Sie ohne Rezept in der Apotheke bekommen — Ibuprofen, Diclofenac oder Voltaren? ↳ Falls ja: Wie viele Tabletten nehmen Sie pro Tag? | Nehmen Sie Schmerzmittel ein, die Sie ohne Rezept in der Apotheke bekommen — Ibuprofen, Diclofenac oder Voltaren? ↳ Falls ja: Wie viele Tabletten nehmen Sie pro Tag? ↳ Falls ja: Seit wann nehmen Sie sie? — `nsar`, medikamente |
| fibromyalgie | Wie lange sind Sie morgens steif — Minuten oder länger als eine Stunde? Bessert sich das durch Bewegung? | Wie lange sind Sie morgens steif — ein paar Minuten oder länger als eine halbe Stunde? ↳ Bessert sich das durch Bewegung? — `steifigkeit` |
| anorexia-nervosa | Ich frage das ganz ohne Vorwurf: Kommt es vor, dass Sie sich nach dem Essen übergeben? | Ich frage das ganz ohne Vorwurf: Kommt es vor, dass Sie sich nach dem Essen übergeben? ↳ Falls ja: Führen Sie das Erbrechen selbst herbei? ↳ Falls ja: Wie häufig kommt das vor? ↳ Falls ja: Seit wann? ↳ Falls ja: Können Sie das Erbrochene beschreiben? — `selbstinduziertes_erbrechen, erbrechen` |
| malaria | Sie haben keine Milz mehr — wurden Sie deswegen gegen Pneumokokken und Meningokokken geimpft, und tragen Sie einen Asplenie-Ausweis? | Sie haben keine Milz mehr — wurden Sie deswegen auch gegen Meningokokken geimpft? ↳ Tragen Sie einen Asplenie-Ausweis? — `asplenie_impfung`, braucht `vorerkrankung`, vorerkrankungen |
| anaphylaxie | Pfeift es beim Atmen? Haben Sie Ihr Asthmaspray dabei und schon benutzt? | Pfeift es beim Atmen? — `giemen` |
| anaphylaxie | — | Haben Sie Ihr Asthmaspray dabei? ↳ Falls ja: Haben Sie es schon benutzt? — `vorbehandlung`, braucht `vorerkrankung`, medikamente |
| hueftkopfnekrose | Haben Sie in den letzten Jahren Kortison bekommen — als Tabletten, Infusionen oder Spritzen? ↳ Falls ja: In welcher Dosis haben Sie es bekommen? | Haben Sie in den letzten Jahren Kortison bekommen — als Tabletten, Infusionen oder Spritzen? ↳ Falls ja: In welcher Dosis haben Sie es bekommen? ↳ Falls ja: Wie lange haben Sie es genommen? — `kortison`, medikamente |
| sturz-im-alter | — | Wann genau ist das passiert? — `beginn` |

**Hors questions du cas, dans `seedCases.ts`** : gib `aktuellSkip` + `akt-ausloeser` ; tvt `aktuellSkip` = `akt-veraend-blutung`, `akt-ausloeser` ; copd `profil.tags` + `kardio` (§ 5) ; malaria n° 6 `braucht: ['vorerkrankung']` (la splénectomie est dite en `vor-erkrank` juste au-dessus : le détecteur de texte ne la relit plus) ; réponses du § 4.

### 3.1 Sondes et relances du guide (`anamneseChapters.ts`, `anamneseProbes.ts`)

| Sonde | Avant | Après |
|---|---|---|
| `fach-rheuma-systemisch` (texte et frage canonique) | … Mund- oder Genitalgeschwüre, Durchfall **oder eine Bindehautentzündung** bemerkt? ; part « Augenentzündungen oder eine Bindehautentzündung » | … Mund- oder Genitalgeschwüre oder Durchfall bemerkt? ; part « Haben Sie Augenentzündungen bemerkt? » |
| `fach-rheuma-vorgeschichte` | Hatten Sie solche **Gelenk**beschwerden schon einmal? | Hatten Sie solche Beschwerden schon einmal? |
| `akt-begleit` (variante nerven), part `begleit` | Haben Sie außerdem noch andere Beschwerden bemerkt? | Haben Sie außerdem **Schmerzen oder** andere Beschwerden bemerkt? |
| `fach-psych-suizid`, relances | Pläne → NOTFALL → Wunsch → verletzt → Unterstützung | Pläne → NOTFALL → **Haben Sie schon einmal versucht, sich das Leben zu nehmen?** (`suizidversuch`) → Wunsch → verletzt → Unterstützung |
| `akt-frueher` (FRUEHER ×9 + variante douleur) | Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose …? | deux relances « Falls ja: » |
| `akt-verlauf` (douleur) | Falls anfallsartig: Wie lange …? Wie oft …? | deux relances « Falls anfallsartig: » |
| `akt-beginn` (neuro aigu) | Falls schlagartig: Um welche Uhrzeit genau? Wann … beschwerdefrei? | deux relances « Falls schlagartig: » |
| `akt-psych-sicherheit` | Falls ja: Haben Sie konkrete Pläne? Gibt es jemanden …? | deux relances |
| `veg-uebelkeit` | Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig? | les trois relances que K4 avait écrites pour la part `erbrechen` (Wie sah das Erbrochene aus? / Seit wann …? / Wie oft …?) |
| `veg-ausscheidung` (mère + parts stuhl, miktion) | Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen … beschreiben? | Seit wann? / Wie oft täglich? / Aussehen … (trois relances « Falls ja: ») |
| `vor-erkrank` | Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt? | Welche sind das? / Seit wann sind sie bekannt? / Werden sie behandelt? |
| `vor-op` | Falls ja: Welche Eingriffe …, und wann? Traten … Komplikationen auf? | Welche Eingriffe …? / Wann war das? / Komplikationen? |
| `fach-pneumo-husten` | Sind Sie heiser? Haben Sie sich verschluckt? — `followUpSucht [[stimme, verschlucken]]` | Sind Sie heiser? / Haben Sie sich in letzter Zeit öfter verschluckt? (texte des parts K4) — `[[stimme], [verschlucken]]` |
| `fach-pneumo-auswurf` | Welche Konsistenz — …? Nur Blutfäden oder richtig blutig? | deux relances ; la seconde « Falls Blut: » |
| `fach-haem-blutung` | Falls ja: Seit wann? Blutet es länger nach, etwa nach dem Zähneputzen oder einem kleinen Schnitt? | Falls ja: Seit wann? / Falls ja: Blutet es nach einem kleinen Schnitt oder beim Zähneputzen lange nach? (ordre changé : la version d'origine passait en règle B) |
| `fach-haem-blutverlust` | Blut im Erbrochenen, im Auswurf oder im Urin? Welche Farbe — …? | Haben Sie an anderer Stelle Blut bemerkt — im Erbrochenen, im Auswurf oder im Urin? / Falls ja: Welche Farbe — …? (« erbrochen » est lu `uebelkeit` par INV-79 ; « im Erbrochenen » ne l'est pas) |
| `fach-infekt-kontakt` | Arbeiten Sie mit vielen Menschen? Haben Sie ungewöhnliche Lebensmittel …? — `[[kontakt, essen_expo]]` | deux relances — `[[kontakt], [essen_expo]]` |
| `fach-derma-aussehen` | Falls Bläschen: Wie groß …? Sind sie mit … gefüllt? | deux relances « Falls Bläschen: » |

Parts qui ne sont pas de pures sous-chaînes de leur variante (règle K4, à la relecture de langue) : `akt-begleit` nerven « Haben Sie außerdem Schmerzen oder andere Beschwerden bemerkt? » (la part ouverte de BEGLEIT plus « Schmerzen » de la variante).

## 4. Réponses patient écrites — chacune avec sa source

| Cas · clé | Réponse écrite | Source dans la fiche |
|---|---|---|
| anaphylaxie · FA « Haben Sie Ihr Asthmaspray dabei? » | Nein, das habe ich zu Hause vergessen. Ich habe noch nichts genommen. | `akt-einfluss` (« Ich habe noch nichts genommen – mein Asthmaspray habe ich zu Hause vergessen »), `fach-derma-vorbehandlung` |
| anorexia-nervosa · `veg-uebelkeit` | Übel ist mir nicht, nein. | raccourcie (brief) ; la suite part à la n° 2 |
| anorexia-nervosa · FA n° 2 | (Pause) Erbrechen … ja, das schon, aber nur wegen dem Völlegefühl. Zwei- oder dreimal die Woche, nach dem Essen. Danach fühle ich mich einfach besser. | l'ancienne réponse `veg-uebelkeit`, déplacée mot pour mot ; `vegetativeAnamnese`. « selbst herbei » : `schwierigeReaktionen` (« Das ist nichts Absichtliches … ») répond déjà |
| schlaganfall · `akt-einfluss` | Ob ich mich hinlege oder bewege, ändert nichts. | raccourcie : la chute en sort |
| schlaganfall · FA n° 4 (Fach) | Nein, den Kopf nicht — ich habe mir nur die Knie aufgeschlagen. | l'ancienne `akt-einfluss` ; `negativeFindings` « kein Kopftrauma beim Sturz (nur die Knie verletzt) » |
| fibromyalgie · `fach-rheuma-morgensteifigkeit` | … so zwanzig bis dreißig Minuten, dann wird es besser, wenn ich mich bewege. Länger als eine halbe Stunde war es noch nie. (était : « Über eine Stunde war es noch nie. ») | `negativeFindings` « Morgensteifigkeit nie länger als 30 Minuten » ; `begleitsymptome` « 20–30 Minuten » ; `akt-begleit` « eine halbe Stunde » |
| tvt · FA « Haben Sie Blut abgehustet? » | Nein, gehustet habe ich gar nicht — und Blut schon gar nicht. | `negativeFindings` « kein Husten, kein Bluthusten (aktive Abfrage einer Lungenembolie negativ) » |
| schenkelhalsfraktur · FA « Wie gut konnten Sie vor dem Sturz gehen …? » | In der Wohnung bin ich an den Möbeln entlanggegangen, draußen mit dem Rollator und am Arm meiner Tochter — und auch das nur etwa hundertfünfzig Meter, dann tat die Wade weh. | `fach-ortho-belastung` (retirée de la trame par la n° 5 `belastbarkeit` : c'est là que la mobilité se perdait) ; `sozialanamnese` |
| depression · `fach-psych-suizid` (+) | Versucht habe ich es nie. | `negativeFindings` « keine früheren Suizidversuche » |
| ptbs · `fach-psych-suizid` (+) | Versucht habe ich es nie. | `negativeFindings` « kein früherer Suizidversuch » |
| opioidabhaengigkeit · `fach-psych-suizid` (+) | Versucht habe ich es nie. Das vor vier Monaten, als meine Frau mich kaum wach bekommen hat, war keine Absicht. | `negativeFindings` « kein früherer Suizidversuch » ; `vorerkrankungen` « Zustand nach Überdosierung vor etwa vier Monaten … von der Ehefrau kaum erweckbar vorgefunden ». **À juger** : la fiche classe l'overdose comme non suicidaire ; la phrase le fait dire au patient |
| demenz · `fach-psych-suizid` (+) | Versucht habe ich so etwas nie. | **fiche muette** sur la tentative → négative cohérente (`negativeFindings` : aucune idée suicidaire, jamais d'épisode dépressif) |
| panikstoerung · `fach-psych-suizid` (+) | Versucht habe ich so etwas nie. | **fiche muette** → négative cohérente (« KEINE Suizidgedanken ») |
| schizophrenie · `fach-psych-suizid` (+) | Versucht habe ich es nie. | **fiche muette** → négative cohérente (« passive Lebensüberdrussgedanken ohne konkrete Suizidpläne, glaubhaft absprachefähig ») |
| delir · `fach-psych-suizid` (fille, réécrit) | (Die Tochter: Lebensmüde Gedanken oder einen Versuch gab es nie, auch nicht nach dem Tod meiner Mutter. …) | **fiche muette** → négative cohérente ; phrase raccourcie pour tenir la borne O3 du prompt externe (12 000 car., 11 994) |
| alkoholentzug, somatoforme-schmerzstoerung, anorexia-nervosa | inchangées | elles répondent déjà (« Versucht habe ich nie etwas », « versucht habe ich es nie », « ich habe mir nie etwas angetan ») |

Aucune réponse aux questions du cas découpées n'a été écrite : la fiche répond déjà à chaque moitié (le simulant improvise depuis la fiche, comme avant).

## 5. Les renvois « lot de contenu » des revues

| Renvoi | Fait | Preuve (trame jouée ; test `coherenceQ3.test.ts`) |
|---|---|---|
| **anaphylaxie** (vraie présupposition en prod) | « Pfeift es beim Atmen? » reste en Aktuelle Beschwerden (`giemen`). Le spray devient une question du cas en Medikamente, `braucht: ['vorerkrankung']` (l'asthme est dit en `vor-erkrank`) : « Haben Sie Ihr Asthmaspray dabei? ↳ Falls ja: Haben Sie es schon benutzt? », `sucht: ['vorbehandlung']` | spray au rang 44, après `vor-erkrank` (37) ; présupposition 21 → 20 |
| **anorexia** n° 2 | relances « Falls ja: Führen Sie das Erbrechen selbst herbei? ↳ Wie häufig kommt das vor? ↳ Seit wann? ↳ Können Sie das Erbrochene beschreiben? » (la relance demandée, rendue atomique : une seule chaîne aurait remonté A et A2) ; `veg-uebelkeit` raccourcie ; le vomissement passe en FA de la n° 2 | 4 relances posées ; `erbrechen` cherché une fois |
| **schlaganfall** | la chute sort d'`akt-einfluss` ; la n° 4 (Fach, `braucht: sturz`) a sa réponse (FA) | n° 4 après `fach-neuro-koordination` |
| **hypothyreose** | la n° 7 (« nach einer Ihrer Entbindungen … erschöpft? », posée en familie-sozial après « Kinder ») est **retirée** : `akt-frueher` répond déjà « nach der Geburt meiner Tochter … monatelang völlig erschöpft » (identité §10.1). Le signe `postpartum`, devenu mort, est retiré (`signesDefsCas.ts`) | plus aucune « Entbindung » dans la trame |
| **malaria** | n° 6 → « Sie haben keine Milz mehr — wurden Sie deswegen auch gegen Meningokokken geimpft? ↳ Tragen Sie einen Asplenie-Ausweis? » ; le pneumocoque reste à `fach-infekt-impfung` | « Pneumokokken » n'est plus demandé ; Meningokokken l'est |
| **sturz-im-alter** | question du cas « Wann genau ist das passiert? » (`beginn`) : elle prend la place d'`akt-beginn` (« Wann war der erste Anfall? Und der letzte? »), réponse = `antworten['akt-beginn']` (règle d'identité). « der Sturz » dans le texte réveillait `checkTrameSymptoms` ; `relu` étant plafonné, le texte dit « das » (le motif) | rang 3 d'Aktuelle Beschwerden ; `akt-beginn` absent. **Réserve** au § 6 |
| **fibromyalgie** — seuil | n° 4 « … ein paar Minuten oder länger als eine halbe Stunde? ↳ Bessert sich das durch Bewegung? » ; réponse `fach-rheuma-morgensteifigkeit` alignée (30 min) | un seul seuil dans la trame et la fiche |
| fibromyalgie — Augenentzündung / Bindehautentzündung | retirée de `fach-rheuma-systemisch` (texte, part, frage canonique) : tous les cas rhumato | Fach brute, 6 cas |
| fibromyalgie — « Gelenkbeschwerden » | `fach-rheuma-vorgeschichte` dit « Beschwerden » (juste pour l'articulaire comme pour les parties molles) | — |
| **gib et tvt** — bloc Veränderung | `aktuellSkip` `akt-ausloeser` (gib, tvt : « Sonne ») et `akt-veraend-blutung` (tvt : « juckt es ») ; le Beginn par une question du cas qui prend la place d'`akt-beginn` (« beim Duschen ») : gib « Seit wann haben Sie das bemerkt? », tvt « Seit wann ist Ihr Bein geschwollen? ». Le déclencheur reste posé ailleurs : gib par les AINS (n° 1, Medikamente), tvt par le vol (n° 0 et sa relance « Wie lange hat der Flug gedauert? ») et `fach-gefaess-immobilisation` | plus de « beim Duschen », « Sonne », « juckt es » ; `beginn` cherché |
| **tvt** — hémoptysie | question du cas « Haben Sie Blut abgehustet? » (`haemoptyse`) juste après le dépistage d'embolie (n° 4). Cliniquement justifiée : la fiche la porte dans les `negativeFindings` (« aktive Abfrage einer Lungenembolie ») et dans les `pruefungsfallen` (« Lungenembolie nicht aktiv abgefragt (… Hämoptyse) ») | rang après la n° 4 ; FA |
| **schenkelhalsfraktur** — mobilité avant la chute | question du cas en Familie/Soziales « Wie gut konnten Sie vor dem Sturz gehen — brauchten Sie eine Gehhilfe? » (`vorzustand`, signe existant « autonomie avant l'épisode ») ; + ses deux composées (n° 1, n° 2) | FA « Rollator » |
| **parkinson** | « Schauen Sie sich bitte Ihre eigene Handschrift an: … » → « Ist Ihnen aufgefallen, dass Ihre Schrift zum Ende der Zeile hin kleiner wird? » | la consigne n'est plus dite |
| **appendizitis** n° 2 | « Ist Ihnen übel, oder mussten Sie erbrechen? ↳ Falls ja: Kam das erst, nachdem die Schmerzen begonnen hatten? » | plus de présupposition |
| **psy** (10 cas) | relance « Haben Sie schon einmal versucht, sich das Leben zu nehmen? » dans `fach-psych-suizid`, après l'intention (NOTFALL), avant l'automutilation ; signe `suizidversuch` (`signesDefs.ts`, dépistage) ajouté à `PROBE_SUCHT` et à `RISIKO_SIGNES` (jamais perdu) ; 10 réponses au § 4 | test SÉCURITÉ étendu (le signe attendu dans les 10 cas, le texte posé) ; mutation de la garantie étendue |
| **Fallvorstellung** « sich mit Stabile Angina pectoris… » | **code, non modifié** — rapporté § 6 | — |
| **« oder Schmerzen »** (l. 423) | la part ouverte `begleit` le reprend | parkinson : la question réduite contient « Schmerzen » |

Chaque renvoi a son test sur la trame jouée (`src/data/guides/coherenceQ3.test.ts`, 15 tests). Contrôle rouge : avec le `seedCases.ts` d'`origin/main` (le reste de la branche inchangé), 14 des 15 rougissent ; le quinzième, « oder Schmerzen », porte sur le guide seul.

## 6. Reliquat Q2

- **`CaseQuestion.followUps?: string[]`** (et non `followUp: string | string[]`) : le contrat §10.2 (I9) écrit cette forme et déclare le reliquat `string | string[]` remplacé par elle ; elle garde `followUp` en chaîne pour un client ancien (`followUp.trim()`). Pas de `followUpSucht` : une relance hors signe reste une question du cas à part (K5, F.6). Lecteurs : `cqFollowUps` (montage `caseQuestionsByKapitel`), `cqFollowUp` (écrans de lecture, Rollenskript : relances jointes), `checkQuestionAtomicity` (chaque relance suivante sous la même règle). `lotAssembler.py` passe les questions telles quelles (pas de liste blanche interne).
- **Sous-questions récupérées** : les trois que `main` a tracées pour Q3 — ulcus-cruris (« Wann war das? », « In welchem Bein? »), akutes-nierenversagen (« Seit wann nehmen Sie sie? »), hueftkopfnekrose (« Wie lange haben Sie es genommen? ») — plus, dans les cas de Q3, bronchialkarzinom (« War es wieder vollständig unauffällig? »), parkinson (tremblement postural), synkope (« Dürfte ich sie kurz dazu bitten? »), anorexia (§ 5). Les autres de la liste Q2 (pankreaskarzinom, mammakarzinom, morbus-crohn, karpaltunnel…) ne sont **pas** reprises : leurs cas sont hors de mon périmètre de lecture clinique, et la fiche les contient toujours ; à Q4/Q5 cas par cas.
- **Relances du guide à deux « ? »** : les 24 textes (16 sources) découpés (§ 3.1). Il n'en reste aucune ; restent à deux « ? » : la part `fieber` de `veg-fieber` (un énoncé de part, pas une relance) et les `frage` canoniques d'`anamneseProbes.ts` (catalogue de sondes, lot « sondes »).
- **Non repris** : les 22 énoncés de `guide-anamnese-v4` (`seedGuides.ts`), les sondes en A2 — hors des questions du cas, un lot « sondes / guides ».

## 7. Le gel — diff par catégorie

`trame-actuelle.txt` (régénéré, `vitest -u`) :
- **relances seules (`↳n`), aucune structure** : `vor-erkrank` et `vor-op` ↳1→↳3 (130 cas) ; `akt-frueher` ↳1→↳2 (87) ; `veg-uebelkeit` ↳1→↳3 (86) ; `veg-ausscheidung` ↳1→↳3 (93, dont parts `~miktion` 24 et `~stuhl` 11) ; `akt-verlauf` ↳1→↳2 (46) ; `fach-psych-suizid` ↳5→↳6 (10 psy) ; `fach-infekt-kontakt` (8), `fach-pneumo-auswurf` (8), `fach-haem-blutverlust` (6), `fach-pneumo-husten` (5), `fach-haem-blutung` (5), `fach-derma-aussehen` (5) ↳1→↳2 ; `akt-beginn` neuro ↳1→↳2 (commotio ; lagerungsschwindel dans une ligne de structure) ; questions du cas : ↳0→↳1 (23), ↳0→↳2 (synkope), ↳0→↳4 (anorexia), ↳1→↳2 (akutes-nierenversagen, hueftkopfnekrose), ↳1→↳3 (ulcus-cruris) — bronchialkarzinom et parkinson (↳2) sont dans leurs lignes de structure ;
- **structure** (20 lignes, les cas touchés) : gib et tvt (`akt-beginn` → `cas` à sa place ; `akt-ausloeser`, `akt-veraend-blutung` sortis) ; sturz-im-alter (`akt-beginn` → `cas`) ; hypothyreose (familie-sozial : une question du cas de moins) ; schenkelhalsfraktur (+2 en Aktuelle Beschwerden, +1 en familie-sozial) ; anaphylaxie (Medikamente +1) ; reizdarm, copd (+2), anaemie, erysipel, meningitis, bph, bronchialkarzinom, mammakarzinom, panikstoerung, prostatakarzinom, hepatitis-b, parkinson, lagerungsschwindel, tvt (+1 hémoptysie) : une question du cas découpée en deux (ou trois).

`fach-raw.txt` (Fach brute) : 48 cas, **aucun nombre de questions changé** — seuls les textes de relance (psy 10, infektio 11, pneumo 8, derma 7, rheuma 6, haemato 6).

## 8. Réserves (DONE_WITH_CONCERNS)

1. **sturz-im-alter, nature `anfall`** : seul « Wann war der erste Anfall? » est corrigé. Le reste du chapitre `anfall` parle encore d'« Anfall » (Ablauf, Dauer, Einfluss, Frühere Episoden) à une patiente qui a glissé ; la fiche répond « 'Anfall' ist eigentlich übertrieben ». C'est l'arbitrage des natures de motif (Q8) : je ne l'ai pas tranché.
2. **tvt, `akt-veraend-was`** pose encore « Ist Ihnen eine Blutung aufgefallen? » (part `lokalblutung`) à une thrombose : hors de la liste du renvoi (douche, soleil, démangeaison) ; même arbitrage de nature (tvt est l'un des six cas de Q8).
3. **copd + `kardio`** : la n° 3 demande la nycturie (`nykturie`, pertinente pour `harn / kardio / endo`). Le tag `kardio` (cœur pulmonaire : œdèmes, nycturie, fiche « Beine abends dick, nachts zwei- bis dreimal ») la rend pertinente ; la trame de copd ne change pas autrement (diff `--case` : seul l'écart « hors profil » disparaît). Le test R2 passe de 15 à 16 cas Kardio / Endo. À valider cliniquement.
4. **hypothyreose n° 7 retirée** (au lieu de reformulée) : la réponse d'`akt-frueher` en dit autant ; rien n'est perdu de la fiche. À valider.
5. **`checkProbeOverlap` 8 → 9** (informatif, `|| true`) : « Hatten Sie solche Beschwerden schon einmal? » recouvre `akt-frueher` à 43 % ; dans la trame jouée, r2 n'en pose qu'une (`frueher` dans les deux).
6. **Fallvorstellung** « … der sich mit Stabile Angina pectoris… vorgestellt hat » : c'est du **code** (`PreSimulationPage.tsx:132`, `vorstellungsSatz`, et `:108` qui y colle `medicalView.verdachtsdiagnose` au nominatif). Rapporté, non modifié. Proposition au pôle Expérience : ne pas décliner un diagnostic libre, mais dire « … der sich mit Beschwerden vorgestellt hat, bei denen der Verdacht auf **{verdachtsdiagnose}** besteht » (aucune flexion à calculer).
7. **anorexia n° 2** : quatre relances sur une même question (la relance demandée, atomisée). Lourd à l'écran : la relecture de langue dira si « Seit wann? » / « Wie häufig? » doivent fusionner (au prix d'un A2).
8. **Trailer** : `Co-Authored-By: Claude Opus 5.5`, comme demandé.

## 9. Vérifications — codes de sortie (sommet `4a888438` + ce rapport)

| Commande | Code |
|---|---:|
| `npx tsc -b` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (182 fichiers, 1 907 tests) | **0** |
| `npm run test:c6 -- --maxWorkers=2` (14 fichiers, 144 tests) | **0** |
| `node scripts/check*.mjs` (34) | **0**, sauf `checkProbeOverlap` **1** (informatif, `|| true` en CI ; 1 aussi sur `origin/main`) |
| `checkCoherence.mjs` · `checkTrameSymptoms` · `checkQuestionAtomicity` · `checkGuideDuplicates` · `checkTermRegister --require-all` | **0** |
| `node --test scripts/*.test.mjs` (199) | **0** |
| `checkBudgetFloor.mjs origin/main` | **0** |
| `npm run build` | **0** |
| `git merge-tree --write-tree origin/main HEAD` | **0** |

## Non vérifié

- **Navigateur** (médecin + simulant) : non ouvert (consigne : aucun serveur). Le montage est vérifié par `playedTrame` et le Rollenskript par les tests existants ; la jointure des relances (`cqFollowUp`) dans `ExaminerSheetView` / `PreSimulationPage` n'est pas vue à l'écran.
- **Contenu publié** : `publishContent.mjs` non rejoué ; un client ancien ignore `followUps` (il ne voit que la première relance) — par construction du contrat, non testé contre la prod.
- **Jugement clinique** des découpes et des déclarations (`sucht`) : la porte ne voit pas la justesse d'une déclaration (§10.11). En particulier : tonsillitis (le filet de salive en relance de la Kieferklemme, même tableau d'abcès), erysipel n° 6 (la décoloration en relance de la douleur disproportionnée), osteoporose (« Zum Beispiel Husten oder Bücken? » : « Niesen » tombe pour tenir la règle B).
- **Les 96 composées restantes** d'`aktuell` (Q4, Q5) et les autres chapitres (Q6–Q8) : non touchés.
