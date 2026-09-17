# Spec — Anamnèse vivante, lot 5 (FB2-J1/13, FB2-J7, FB2-K1)

**Statut** : validé par la direction (« ok », 17 sept.), livré ; amendé après revue du gardien : 10 natures (`ausscheidung`, `nerven` ajoutées), règle « un seul endroit par trame » (`FACH_COVERS`), `aktuellSkip`, `FACH_RULES` sexe/âge · **Date** : 2026-09-17
**Source** : `BACKLOG-FEEDBACK.md` série 2, points 1, 13, 14, 5 ; `DIRECTION-STYLE.md` §2.1.

## Constat

`aktuell` applique OPQRST (douleur) à tous les cas. Les 30 cas sans douleur ont
été authorés POUR ce squelette : le simulant de la BPCO répond « Nein, da
strahlt nichts aus ; ich habe ja keine Schmerzen » à une question
d'irradiation, la dépression donne une « intensité 8/10 » à une échelle de
douleur. L'adaptation existante (`PAINLESS_TEXT`, « Schmerzen → Beschwerden »)
est précisément ce que la direction rejette : elle sera **supprimée**, pas
retouchée.

## Décision 1 — `aktuell` = un tronc commun + une déclinaison par nature du motif

Chaque cas déclare `patientSheet.leitsymptomKategorie` (liste fermée). Les
dimensions **communes** gardent leurs sondes actuelles (réponses déjà
authorées, réutilisées telles quelles) ; seules les dimensions **propres**
changent. Standard pour apprendre, décliné pour rester vrai.

| Catégorie | Cas (130) | Dimensions propres (nouvelles sondes `akt-<cat>-*`) |
|---|---|---|
| `schmerz` | ~100 | inchangé : Ort, Charakter, Intensität (Skala), Ausstrahlung |
| `atemnot` | copd, asthma, allergische-rhinitis, lungenembolie? | Ruhe/Belastung (Treppen), Orthopnoe/Kissen, anfallsartig, Husten/Auswurf, Pfeifen |
| `allgemein` | anaemie, hypo/hyperthyreose, diabetes ×2, metabolisches-syndrom, niereninsuffizienz, nephrotisches-syndrom, akutes-nierenversagen | Art (Müdigkeit/Schwäche/Schwellung), Ausmaß im Alltag, Tageszeit, Gewicht/Appetit/Durst, Ödeme/Urinmenge |
| `psychisch` | depression, schizophrenie, alkoholentzug, demenz | Stimmung, Antrieb/Interesse, Schlaf, Konzentration, Lebensereignis, Sicherheit (suicidalité, formulée avec tact) |
| `neurologisch` | schlaganfall, tia, multiple-sklerose, lagerungsschwindel | Uhrzeit genau, Art des Ausfalls (Seite/Sprache/Sehen/Gleichgewicht), Dauer, rückläufig?, Lagerung, Begleit (Kopfschmerz/Übelkeit) |
| `infekt` | covid19, endokarditis | Fieberhöhe/-verlauf, Schüttelfrost, Kontakt, Reise, Impfstatus (→ Vorerkrankungen) |
| `veraenderung` | itp, basaliom, mammakarzinom, struma, oesophaguskarzinom, kolorektales-ca, pankreaskarzinom | Was genau bemerkt (Knoten/Haut/Blutung/Schlucken/Stuhl/Gelbfärbung), Größe/Verlauf, Schmerz ja/nein, Blutung, seit wann |
| `anfall` | vorhofflimmern (+ synkope, epilepsie si leur motif n'est pas la douleur) | Dauer, Häufigkeit, Auslöser, Beginn/Ende abrupt?, Begleit (Schwindel, Luftnot, Bewusstsein) |

Communes à toutes : Motiv, Beginn, Verlauf, Auslöser, Einflussfaktoren,
Frühere Episoden, Begleitbeschwerden (sondes existantes `akt-motiv`,
`akt-beginn`, `akt-verlauf`, `akt-ausloeser`, `akt-einfluss`, `akt-frueher`,
`akt-begleit` — texte reformulé par catégorie, réponses inchangées).

**Affectation** : les 30 cas sans `schmerz` sont affectés ci-dessus ; les
100 avec `schmerz` sont **relus** par `fsp-clinical-reviewer` (un cas peut
avoir un bloc douleur ET un motif qui n'est pas la douleur : synkope,
epilepsie, gastroenteritis…). Aucune affectation automatique.

**Contenu** : les réponses aux dimensions propres sont authorées pour chaque
cas concerné (~2–5 par cas, ~120 réponses), relues langue + clinique. Les
réponses OPQRST absurdes des cas sans douleur (« ich habe ja keine
Schmerzen ») sont retirées de leur fiche.

**Mécanique** : `adaptChaptersForCase` choisit la variante ; le guide statique
(page Guides) montre `schmerz` par défaut avec un sélecteur de catégorie ;
`checkGuideCoverage` exige les réponses de la variante du cas ;
`checkGuideDuplicates` s'applique par variante.

## Décision 2 — `abschluss` : 5 blocs standardisés, personnalisés par le cas

Chaque cas gagne `medicalView.patientWorte` :
`{ verdacht: string; diagnostik: string; therapie: string }` — la
Verdachtsdiagnose, les examens prévus et la thérapie **en registre patient**,
une phrase chacun (« eine Entzündung des Blinddarms », « ein Ultraschall vom
Bauch und eine Blutabnahme », « wahrscheinlich eine Operation heute noch »).
Le chapitre devient : (1) clore les questions, (2) « Ich vermute, dass … »
+ `verdacht`, (3) « Um das abzuklären, … » + `diagnostik`, (4) « Je nach
Ergebnis … » + `therapie`, (5) rassurer et vérifier la compréhension. Chaque
bloc a une alternative ; la Fallvorstellung réutilise `patientWorte` pour la
phrase d'ouverture. Validateur : `patientWorte` présent et sans Fachbegriff
non expliqué (liste noire : lateinische Termini du glossaire) sur 130 cas.

## Décision 3 — Fachanamnese `gefaess` (Angiologie)

Nouvelle `F('Angiologie', …, 'gefaess')` : Gehstrecke/Claudicatio, Ruheschmerz
nachts, einseitige Schwellung/Rötung/Überwärmung, Immobilisation/Reise/OP,
Hormone/Pille, frühere Thrombose/Embolie (auch Familie), Wunden die nicht
heilen, kalte/blasse Extremität, Rauchen (→ renvoi Noxen, pas de redite).
Comme un cas ne porte qu'une spécialité, un champ `fachanamneseOverride?:
'gefaess'` sur le cas désigne la Fachanamnese jouée : tvt, pavk,
lungenembolie, bauchaortenaneurysma, ulcus-cruris, aortendissektion.
Réponses `fach-gefaess-*` authorées pour ces 6 cas ; la Fachanamnese
apparaît dans le module Fachanamnese (page Guides).

## Critères d'acceptation

1. Sur copd, depression, schlaganfall, itp, vorhofflimmern, appendizitis :
   le chapitre `aktuell` affiché est celui de la catégorie, aucune question
   de douleur hors `schmerz`, aucune Skala hors `schmerz`.
2. `checkGuideCoverage` vert : chaque question affichée a sa réponse ; aucune
   réponse du type « ich habe ja keine Schmerzen » ne subsiste (grep).
3. `abschluss` sur 3 cas de natures différentes : Verdacht/Diagnostik/Therapie
   en langage patient, cohérents avec `medicalView` (validateur).
4. tvt et pavk jouent la Fachanamnese `gefaess`, pas la cardio.
5. Passage de `direction-keeper` : « le modèle n'a pas été copié ».

## Ordre de réalisation

Décision 1 (mécanique + 30 cas + relecture des 100) → Décision 3 (petite,
indépendante) → Décision 2 (130 `patientWorte`, le plus long).

## Questions à la direction (une réponse suffit)

- Les 8 catégories ci-dessus te vont-elles, ou veux-tu en fusionner
  (`anfall` dans `neurologisch` ?) / en ajouter ?
