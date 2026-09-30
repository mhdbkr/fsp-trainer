# Tri des 27 sondes composées d'`AKTUELL_VARIANT_PROBES`

Branche `feat/s3-contenu`. Artefact du gate G2, tranché par la direction.

## La jurisprudence appliquée

> **Relance par défaut** — `followUp` sur la `Phrase` du chapitre, un seul `id`,
> aucune fiche patient touchée.
> **Nouvelle sonde seulement quand la seconde question porte une dimension que
> l'examen note séparément.**

Deux exemples de la direction font foi et bornent la frontière :

- `akt-ort` — « Wo genau? » + « Können Sie mit dem Finger zeigen? » : un seul
  **O** d'OPQRST, la seconde phrase est une *invitation*, pas une dimension →
  **relance**.
- `akt-ausscheid-aussehen` — aspect des selles **et** « Bleibt Festes oder auch
  Flüssiges hängen? » (= dysphagie) : deux dimensions sans rapport →
  **deux sondes**.

### Le garde-fou que la mesure a imposé

Le critère « dimension notée séparément » ne suffit pas seul : appliqué à la
lettre il fabriquait **huit** sondes neuves, dont six redemandaient ce qu'une
sonde existante pose déjà trois lignes plus bas. La série 3 corrige exactement
ce défaut. Règle ajoutée, et c'est elle qui tranche la moitié des cas :

> **Une seconde question qui duplique une sonde existante ailleurs ne devient
> jamais une sonde neuve.** Elle devient relance — ou disparaît.

Les recoupements ont été relevés dans `anamneseProbes.ts`, pas supposés :
`fach-uro-drang` · `fach-uro-strahl` · `fach-haem-blutung` · `veg-schlaf` ·
`veg-appetit` · `veg-gewicht` · `veg-schuettelfrost` · `fach-pneumo-orthopnoe` ·
`fach-kardio-oedeme` · `fach-neuro-sprache` · `fach-neuro-sehen` ·
`fach-neuro-kraft` · `fach-neuro-sensibilitaet` · `fach-neuro-koordination` ·
`fach-neuro-anfallzeichen` · `fach-pneumo-auswurf`.

### Option mesurée mais NON appliquée

Une troisième voie existe dans le modèle et est déjà utilisée (`personalia`,
deux `Phrase` portant toutes deux `probe: 'pers-name'`) : **deux questions à
l'écran, une seule sonde, aucune fiche touchée**. Elle lève l'objection « la
relance rend la question facultative » sans coûter une réponse.
Elle n'est pas appliquée ici : la direction a tranché en deux options, et
(b) créerait une question obligatoire sans réponse propre — le simulant lirait
la réponse de l'autre sonde. Légitime quand la seconde question ne demande pas
une information *nouvelle* mais une *forme* de la même information
(épeler un nom, montrer du doigt) ; c'est déjà ce que la relance couvre.
Proposition de contrat, pas une modification.

## Résultat

**26 relances · 1 nouvelle sonde.** (Première rédaction : 24 / 3.
**Corrigé après application** — voir « Ce que la mise en œuvre a corrigé ».)

Coût de la sonde neuve : **13 réponses** dans `patientSheet.antworten`
(ausscheidung = 13 cas). Comptage mesuré sur `seedCases.ts` : schmerz 52 ·
allgemein 16 · veraenderung 15 · ausscheidung 13 · infekt 8 · atemnot 7 ·
psychisch 6 · neurologisch 5 · anfall 5 · nerven 3.

---

## schmerz (52 cas)

### 1. `akt-ort` → **RELANCE**
« Wo genau spüren Sie die Beschwerden? / Können Sie mit dem Finger zeigen, wo es
wehtut? » — Exemple de la direction. Un seul **O**. Montrer du doigt n'est pas
une information nouvelle : c'est la même localisation obtenue autrement, et
c'est une technique d'entretien, pas un item de statut.

### 2. `akt-ausstrahlung` → **RELANCE**
« Strahlen die Schmerzen aus? / Wohin? » — Le **R** d'OPQRST. « Ob » et « wohin »
sont une seule dimension, et la seconde n'a de sens que si la première est oui :
c'est la définition même d'une relance conditionnelle. La Doku écrit une ligne :
*Ausstrahlung in den linken Arm*.

## atemnot (7 cas)

### 3. `akt-atemnot-belastung` → **RELANCE**
« Nur bei Anstrengung oder auch in Ruhe? / Wie viele Treppenstufen ohne Pause? »
— La seconde **quantifie** la première. C'est la gradation NYHA : une seule
ligne de Doku (*Dyspnoe NYHA III, zwei Etagen*). Le stade et son unité de mesure
ne sont pas deux dimensions.

### 4. `akt-atemnot-nachts` → **RELANCE**
« Mit erhöhtem Oberkörper schlafen? / Nachts aufwachen, weil die Luft
wegbleibt? » — Orthopnoe et paroxysmale nächtliche Dyspnoe *sont* deux items
notés séparément, et j'ai d'abord tranché « deux sondes ». Le garde-fou
l'emporte : `fach-pneumo-orthopnoe` pose déjà les deux
(« Wie viele Kissen…? Wachen Sie nachts mit Luftnot auf…? ») et
`fach-kardio-oedeme` pose les coussins. Une sonde neuve serait le troisième
passage sur le même signe.

### 5. `akt-atemnot-husten` → **RELANCE**
« Haben Sie Husten? / Trocken oder mit Auswurf — welche Farbe? » — L'expectoration
est bien une dimension propre (la couleur oriente l'antibiotique), mais elle est
**conditionnelle** : sans toux, pas d'expectoration. Et `fach-pneumo-auswurf` la
pose en détail. Le chapitre porte déjà un `followUp` « Falls Auswurf: Ist Blut
dabei? » — la structure était déjà la bonne, il manquait un cran.

## allgemein (16 cas)

### 6. `akt-allgemein-alltag` → **RELANCE**
« Was schaffen Sie im Alltag nicht mehr? / Müssen Sie sich tagsüber hinlegen? »
— La seconde est un **exemple concret** de la première, pas un autre axe. Doku :
*Leistungsminderung, muss sich tagsüber hinlegen* — une ligne.

### 7. `akt-allgemein-tageszeit` → **RELANCE**
« Morgens schlimmer oder im Laufe des Tages? / Bessert es sich nach Ruhe? » —
Rythme circadien et réversibilité au repos forment ensemble **un** profil
temporel. L'examen note *Tagesabhängigkeit* d'un bloc. (La seconde reste une
vraie question clinique — l'Erschöpfbarkeit myasthénique — d'où la relance et
non la suppression.)

### 8. `akt-allgemein-gewicht` → **RELANCE**
« Hat sich Ihr Gewicht verändert? / Und Ihr Appetit, Ihr Durst? » — Poids et
appétit *sont* notés séparément… et ont déjà leurs sondes : `veg-gewicht` et
`veg-appetit`. Une sonde de plus serait le troisième endroit où l'on demande
l'appétit. Le `parts` de la `Phrase` fait déjà le partage quand la trame l'exige.

### 9. `akt-allgemein-schwellung` → **RELANCE**
« Sind Beine, Gesicht oder Bauch angeschwollen? / Hat sich die Urinmenge
verändert? » — L'œdème est la dimension du chapitre ; la diurèse en est la
relance logique (l'une explique l'autre). La miction a déjà `veg-ausscheidung`,
et `fach-kardio-nykturie` / `fach-nephro-*` la creusent. Troisième passage
refusé.

## psychisch (6 cas)

### 10. `akt-psych-stimmung` → **RELANCE**
« Wie ist Ihre Stimmung? / Gibt es Momente, in denen es besser ist? » — La
Schwingungsfähigkeit est un item du Psychopathologischer Befund. Mais
`akt-verlauf` du **même chapitre** la pose mot pour mot trois lignes plus bas :
« Ist es jeden Tag gleich, oder gibt es bessere und schlechtere Tage? » Deux
sondes ne peuvent pas porter la même dimension. Relance — et le doublon avec
`akt-verlauf` est signalé au lot des 84.

### 11. `akt-psych-antrieb` → ~~NOUVELLE SONDE~~ → **RELANCE** *(corrigé)*
« Fällt es Ihnen schwer, den Tag zu beginnen? / Haben Sie noch Freude an
Dingen? » — **Antriebsminderung** et **Interessenverlust** sont deux des *trois*
symptômes cardinaux de la dépression (CIM-10 F32 : gedrückte Stimmung,
Interessenverlust, Antriebsminderung). Le jury attend les trois nommément ; les
empiler dans une réplique en fait perdre une. Aucune Fachanamnese psychiatrique
n'existe dans le corpus : rien d'autre ne les pose. C'est le cas d'école du
critère de la direction.
**CORRIGÉ À L'APPLICATION** : `fach-psych-interesse` existe et pose la
question **mot pour mot** — « Haben Sie noch Freude oder Interesse an Dingen,
die Ihnen früher wichtig waren? ». Mon grep de vérification (`fach-psy-`) ne
pouvait pas la voir : il manque le « ch » de `fach-psych-`. Le garde-fou
tranche : relance. `checkPlayedTrame` a mesuré la similarité à **1,00** sur
trois cas — ce n'est pas une lecture, c'est une mesure.

### 12. `akt-psych-schlaf` → ~~NOUVELLE SONDE~~ → **RELANCE** *(corrigé)*
« Wie schlafen Sie? / Können Sie sich konzentrieren? » — Le sommeil reste ici
(la version du chapitre est plus fine que `veg-schlaf` : Ein-/Durchschlafen et
surtout le **frühes Erwachen**, marqueur de la dépression mélancolique). La
**Konzentrationsstörung** est un symptôme accessoire distinct de la CIM-10,
et elle n'est demandée **nulle part ailleurs** dans les 229 sondes — la mettre
en relance revenait à la rendre facultative dans les seuls six cas où elle
décide du diagnostic.
**CORRIGÉ À L'APPLICATION** : `fach-psych-konzentration` existe
(« Können Sie sich noch gut konzentrieren und Entscheidungen treffen? »), et
`fach-psych-tagesverlauf` couvre en plus la Schwingungsfähigkeit du § 10.
Même grep faux, même correction : relance.
La Fachanamnese Psychiatrie contient **dix** sondes, dont `fach-psych-stimmung`,
`-interesse`, `-antrieb`, `-schlaf`, `-konzentration`, `-suizid` : le triptyque
CIM-10 y est déjà nommé item par item. La variante `aktuell` n'a pas à le
refaire.

## neurologisch (5 cas)

### 13. `akt-neuro-ausfall` → **RELANCE**
« Schwäche oder Taubheit — welche Seite? / Probleme beim Sprechen, Sehen,
Gehen? » — C'était mon exemple « deux sondes » dans la question du gate.
Le garde-fou le renverse : `fach-neuro-sprache`, `fach-neuro-sehen`,
`fach-neuro-kraft`, `fach-neuro-koordination` posent chacune *sa* fonction,
en détail, dans le chapitre suivant. La variante `aktuell` cherche le déficit
et son côté ; l'inventaire des fonctions est la Fachanamnese.

### 14. `akt-neuro-dauer` → **RELANCE**
« Wie lange hat es angehalten? / Ist es ganz weg, teilweise, oder noch da? » —
Une seule dimension temporelle, et c'est elle qui tranche AIT ↔ AVC constitué :
*Symptomdauer 20 Minuten, vollständig rückläufig* est une ligne, pas deux.

### 15. `akt-neuro-lage` → **RELANCE**
« Schlimmer beim Kopfdrehen, Hinlegen, Aufstehen? / Dreht sich alles, oder ist
es ein Schwanken? » — Dreh- vs Schwankschwindel est un vrai premier tri, et
j'ai d'abord tranché « deux sondes ». `fach-neuro-koordination` couvre
« Schwindel, Gangunsicherheit oder das Gefühl zu schwanken » : le chevauchement
est direct. Relance — et la qualité du vertige est portée en tête de la relance
pour qu'elle reste la première chose lue.

## infekt (8 cas)

### 16. `akt-infekt-fieber` → **RELANCE + suppression**
« Haben Sie gemessen — wie hoch? / Zu welcher Tageszeit am höchsten? / Hatten
Sie Schüttelfrost? » — Trois interrogations, deux sorts :
- la **Tageszeit** est la courbe fébrile, même dimension que « wie hoch » →
  relance ;
- le **Schüttelfrost** est **supprimé d'ici** : `veg-schuettelfrost` le pose
  déjà, plus richement (« Schüttelfrost, Nachtschweiß oder starke
  Schweißausbrüche »), et `fach-uro-fieber` / `fach-pneumo-fieber` le déclarent
  en `deepens`. C'est le seul allègement net du lot.
  *Effet à mesurer* : la règle « un symptôme, une question » efface
  `veg-schuettelfrost` quand la variante infekt le cherche — le retrait doit
  la faire réapparaître en Vegetative Anamnese. Diff de trame obligatoire.

### 17. `akt-infekt-kontakt` → **RELANCE**
« Waren Sie im Ausland? / Kontakt zu Kranken, zu Tieren, etwas Ungewöhnliches
gegessen? » — Voyage, contact, animal, nourriture sont **quatre canaux d'une
seule dimension : l'exposition**. L'examen écrit une ligne, *Expositionsanamnese*.
(Le doublon avec `veg-fieber`, qui demande déjà « Waren Sie kürzlich im
Ausland? », relève du lot des 84, pas d'ici.)

## veraenderung (15 cas)

### 18. `akt-veraend-entwicklung` → **RELANCE**
« Größer, häufiger, schlimmer geworden? / Farbe oder Form verändert? » — Les
deux phrases décrivent **la même dynamique de croissance** (les critères ABCDE
d'un naevus sont un seul faisceau). Doku : *Wachstumsdynamik*.

### 19. `akt-veraend-blutung` → **RELANCE**
« Tut es weh, juckt es, blutet es? / Blut im Stuhl, im Urin, beim Husten, aus
der Nase? » — La seconde change de sujet (diathèse hémorragique systémique) et
j'ai d'abord tranché « deux sondes ». Deux raisons l'interdisent :
`fach-haem-blutung` pose exactement cela (« blaue Flecken, Nasenbluten,
Zahnfleischbluten, punktförmige Hauteinblutungen ») ; et sur les **15 cas** de
la catégorie, la réponse serait « nein » dans la grande majorité — un nodule,
un goitre, une hernie ne saignent pas du nez. Une sonde dont la réponse est
« non » douze fois sur quinze n'est pas une dimension de ce chapitre.

## nerven (3 cas)

### 20. `akt-nerven-art` → **RELANCE**
« Zittern, Kribbeln, Taubheit, Schwäche, Steifigkeit? / Wo — und auf einer oder
beiden Seiten? » — La topographie (handschuh-/sockenförmig, radikulär,
halbseitig) est un item propre… que `fach-neuro-sensibilitaet` pose déjà :
« Wo genau, und seit wann? ». Relance.

### 21. `akt-nerven-alltag` → **RELANCE**
« Knöpfe, schreiben, Tasse halten, gehen, Treppen? / Sind Sie schon gestürzt? »
— La chute est la **conséquence** de la faiblesse, pas un axe parallèle ; et
`fach-neuro-koordination` demande déjà « Sind Sie schon gestürzt? ».

### 22. `akt-nerven-tageszeit` → **RELANCE**
« Nachts oder morgens schlimmer? / Bei Anstrengung, Wärme, Aufregung, in
bestimmten Haltungen stärker? » — La dimension propre du chapitre est la
**nocturnalité** (Brachialgia paraesthetica nocturna du canal carpien) ; les
facteurs aggravants ont déjà `akt-einfluss` trois lignes plus bas, et
`fach-neuro-verlauf` pose la chaleur (Uhthoff). Relance.

## ausscheidung (13 cas)

### 23. `akt-ausscheid-haeufigkeit` → **RELANCE**
« Wie oft am Tag, wie oft nachts? / Mehr oder weniger als sonst? / Müssen Sie
plötzlich, oder kommt es nur tröpfchenweise? » — Trois interrogations. La
troisième oppose symptomatique irritative et obstructive (IPSS), et *serait*
notée séparément — mais `fach-uro-drang` (« plötzlichen, starken Harndrang »)
et `fach-uro-strahl` (« abgeschwächt? pressen? tropft es nach? ») la posent déjà
toutes les deux, chacune de son côté. Fréquence et quantité forment une seule
relance.

### 24. `akt-ausscheid-aussehen` → **NOUVELLE SONDE** `akt-ausscheid-schlucken`
« Wie sieht es aus: Farbe, Blut, Schleim, schaumig, Geruch? / Bei
Schluckbeschwerden: bleibt Festes hängen, oder auch Flüssiges? » — Exemple de la
direction. L'aspect d'une excrétion et la dysphagie n'ont **aucun rapport** :
elles ne partagent ni organe, ni examen, ni diagnostic différentiel. Et la
seconde est la question qui *décide* : solide seul = sténose mécanique ;
solide **et** liquide = trouble moteur (achalasie). Aucune sonde ne la pose —
`fach-endo-hals`, `fach-onko-appetit` et `fach-neuro-sprache` ne font que citer
« Schluckbeschwerden » dans une énumération de dépistage, ce que l'en-tête de
`symptoms.ts` distingue explicitement d'une question sur le symptôme.
→ 13 réponses à rédiger.

## anfall (5 cas)

### 25. `akt-anfall-ablauf` → **RELANCE**
« Wie fängt ein Anfall an — schlagartig oder langsam? / Wie hört er auf? / Was
spüren Sie währenddessen? » — La phase post-critique est un discriminant
(Verwirrtheit après une crise ≠ récupération immédiate d'une syncope), mais
`fach-neuro-anfallzeichen` la pose : « Erinnern Sie sich an alles vor und nach
der Episode? ». Le déroulé reste une sémiologie d'un bloc.

### 26. `akt-anfall-dauer` → **RELANCE**
« Wie lange dauert ein Anfall? / Wie oft kommt das vor? » — Deux
quantifications du **même** objet, écrites sur la même ligne de Doku
(*Anfallsdauer / -frequenz*).

### 27. `akt-anfall-bewusstsein` → **RELANCE**
« Bewusstlos, schwarz vor Augen? / Haben Sie sich verletzt? » — La blessure est
une **conséquence**, conditionnelle à la perte de connaissance ; le chapitre
porte déjà un `followUp` (« Zungenbiss? eingenässt? ») que la relance rejoint
au lieu de le doubler.

---

## Tableau de synthèse

| sonde | verdict | dimension seconde | pourquoi |
|---|---|---|---|
| `akt-ort` | relance | montrer du doigt | invitation, même **O** |
| `akt-ausstrahlung` | relance | wohin | conditionnelle au « ob » |
| `akt-atemnot-belastung` | relance | étages | quantifie la première |
| `akt-atemnot-nachts` | relance | PND | `fach-pneumo-orthopnoe` |
| `akt-atemnot-husten` | relance | Auswurf | conditionnelle · `fach-pneumo-auswurf` |
| `akt-allgemein-alltag` | relance | hinlegen | exemple de la première |
| `akt-allgemein-tageszeit` | relance | Ruhe | un seul profil temporel |
| `akt-allgemein-gewicht` | relance | Appetit/Durst | `veg-appetit` |
| `akt-allgemein-schwellung` | relance | Urinmenge | `veg-ausscheidung` |
| `akt-psych-stimmung` | relance | Schwingung | `akt-verlauf`, même chapitre |
| `akt-psych-antrieb` | relance ~~sonde~~ | Interessenverlust | `fach-psych-interesse`, mot pour mot |
| `akt-psych-schlaf` | relance ~~sonde~~ | Konzentration | `fach-psych-konzentration` |
| `akt-neuro-ausfall` | relance | Sprechen/Sehen/Gehen | 4 sondes `fach-neuro-*` |
| `akt-neuro-dauer` | relance | Rückbildung | une ligne AIT/AVC |
| `akt-neuro-lage` | relance | Dreh-/Schwankschwindel | `fach-neuro-koordination` |
| `akt-infekt-fieber` | relance **+ suppr.** | Tageszeit / **Schüttelfrost** | courbe · `veg-schuettelfrost` |
| `akt-infekt-kontakt` | relance | Kontakt/Tier/Essen | une Expositionsanamnese |
| `akt-veraend-entwicklung` | relance | Farbe/Form | même dynamique |
| `akt-veraend-blutung` | relance | Blutungsneigung | `fach-haem-blutung` · « nein » 12/15 |
| `akt-nerven-art` | relance | Verteilung | `fach-neuro-sensibilitaet` |
| `akt-nerven-alltag` | relance | Stürze | `fach-neuro-koordination` |
| `akt-nerven-tageszeit` | relance | Verstärker | `akt-einfluss`, même chapitre |
| `akt-ausscheid-haeufigkeit` | relance | Drang/Tröpfeln | `fach-uro-drang` + `-strahl` |
| **`akt-ausscheid-aussehen`** | **sonde** | **Dysphagie fest/flüssig** | **aucun rapport · rien ailleurs** |
| `akt-anfall-ablauf` | relance | postiktal | `fach-neuro-anfallzeichen` |
| `akt-anfall-dauer` | relance | Häufigkeit | même ligne de Doku |
| `akt-anfall-bewusstsein` | relance | Verletzung | conséquence · `followUp` existant |

## Ce que le tri a appris

Ma proposition initiale (celle de la question du gate) nommait `akt-neuro-ausfall`
comme candidat évident aux deux sondes. **Le tri la contredit.** Le critère
« dimension notée séparément » est vrai de beaucoup de secondes questions ; ce
qui décide, c'est de savoir si cette dimension a **déjà un endroit** dans les
229 sondes. Six des huit sondes que le critère seul aurait créées auraient été
le troisième passage sur un signe déjà demandé deux fois.

Les trois qui restent ont la même signature : la seconde dimension n'est posée
**nulle part ailleurs dans le corpus**, et le cas en dépend.


---

## Ce que la mise en œuvre a corrigé

Le tri annonçait **trois** sondes neuves. À l'application, **deux sont tombées**.

`akt-psych-interesse` et `akt-psych-konzentration` dupliquent `fach-psych-interesse`
et `fach-psych-konzentration`, qui existent depuis toujours. Je ne les avais pas
vues parce que mon grep de vérification cherchait `fach-psy-` : le préfixe réel
est `fach-psych-`, et `fach-psy-` ne le matche pas. Les dix sondes de
Fachanamnese psychiatrique sont restées invisibles à ma vérification.

Ce n'est pas une relecture qui l'a rattrapé, c'est **`checkPlayedTrame`** : dès
les sondes créées, il a signalé une similarité de **1,00** entre
« Interesse — Haben Sie noch Freude an Dingen… » et
« Haben Sie noch Freude oder Interesse an Dingen… » sur `case-schizophrenie`,
`case-anorexia-nervosa` et `case-opioidabhaengigkeit`. Les douze réponses
rédigées ont été retirées, les six réponses composées restaurées.

**La leçon, et elle vaut au-delà de ce lot** : le garde-fou du tri (« une
seconde question qui duplique une sonde existante ailleurs ne devient jamais
une sonde neuve ») n'a de valeur que si l'inventaire des sondes existantes est
fait par la machine. Un grep manuel sur un préfixe supposé n'est pas une
vérification — il n'échoue pas, il renvoie zéro.

## L'asymétrie qu'il faut assumer

`akt-ausscheid-schlucken` reçoit « nein » dans **10 cas sur 13**, et j'ai refusé
une sonde à `akt-veraend-blutung` en partie parce qu'elle recevrait « nein »
douze fois sur quinze. La différence n'est pas le compte : c'est la
**couverture**. La diathèse hémorragique est posée par `fach-haem-blutung` ; la
question « nur Festes, oder auch Flüssiges » n'est posée **nulle part**. Et les
deux cas où elle est positive — `case-oesophaguskarzinom` (le solide seul),
`case-achalasie` (les deux, et le froid en premier) — sont ceux où elle *fait*
le diagnostic. Le compte des « nein » est un argument d'appoint, jamais le
critère.
