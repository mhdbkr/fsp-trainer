# Moteur de cohérence de l'anamnèse — audit et conception

> Statut : **proposé** · 4 oct. 2026 · branche `feat/s3-coherence` · auteur : agent coherence (Opus)
> Demande : retours de la direction du 4 oct. (diarrhée + douleurs spasmodiques ; rhumato à douleur généralisée).
> Cette passe : audit + conception. **Aucun contenu ni code applicatif modifié.**
> Mesures : scripts jetables `…/scratchpad/coherence/{dump,measure,show}.mjs`, sur le montage RÉEL
> (`playedTrame`, 130 cas, 8 492 questions affichées).

La demande, en une phrase : *« un système qui corrige les répétitions et les impertinences dans chaque
cas, et à l'avenir à la création d'autres cas »*. La réponse, en une phrase : **chaque question jouable
déclare le signe qu'elle cherche, chaque cas déclare son profil clinique, et le montage applique quatre
règles déterministes et journalisées — un signe une question, rien hors profil, rien d'attendu absent,
rien avant son antécédent — sous une porte CI qui ne laisse rien passer.**

---

## 1. Les deux cas, rejoués

Commande de rejeu : `node show.mjs <id>` (ordre d'affichage réel, Fach insérée après `aktuell`,
`anamneseChapters.ts:1814`).

### 1.1 Diarrhée + douleurs spasmodiques → `case-gastroenteritis`

Motif (fiche) : *krampfartige Bauchschmerzen 6/10 + wässrige Durchfälle, eine Woche nach Rückkehr aus
Indonesien*. Trame jouée (cœur) :

```
 1 akt-motiv · 2 akt-beginn · 3 akt-ausscheid-was · 4 akt-ausscheid-aussehen
 5 akt-ausscheid-schlucken  ← « Bleibt beim Schlucken nur Festes stecken… ? »
 6 akt-verlauf · 7 akt-ausloeser · 8 akt-einfluss · 9 akt-frueher · 10 akt-begleit
11 CAS « Was haben Sie DORT gegessen und getrunken? … »         ← avant toute question de voyage
12 CAS « Wie sieht Ihr Stuhl aus… » · 13 CAS Fieber/Schüttelfrost/Nachtschweiß
14 fach-infekt-haut « …ringförmig? » · 15 fach-infekt-gelenke · 16 fach-infekt-neuro (Nackensteifigkeit, Gesichtslähmung)
17 fach-infekt-reise « Waren Sie kürzlich im Ausland? »         ← le voyage arrive ici
18 fach-infekt-kontakt ↳ « …ungewöhnliche Lebensmittel gegessen? »  ← 2ᵉ question alimentaire
```

| Défaut cité | Cause racine |
|---|---|
| **Ne questionne pas les douleurs** (ni Ort, ni Charakter, ni Intensität) | `seedCases.ts:40126` déclare `leitsymptomKategorie: 'ausscheidung'` ; la variante `ausscheidung` (`anamneseChapters.ts:353-375`) n'a **aucune** dimension douleur. Le modèle n'admet **qu'une** nature de motif : une plainte mixte (douleur + diarrhée) perd l'une des deux. Déjà repéré, non tranché : audit questions du cas, point 16 (« 6 cas à arbitrer », renvoyé à Q8). |
| **Demande les Schluckstörungen** | La variante `ausscheidung` est un gabarit à quatre organes (urines, selles, **déglutition**, teint — `:353-354`) ; `akt-ausscheid-schlucken` (`:369`) se joue pour tout cas `ausscheidung`. Rien ne le retire : pas de règle par sous-nature, pas d'`aktuellSkip` au cas (seul `fachSkip` à `:40125`). Même faute dans 8 autres cas (colitis, kolorektales-ca, laktoseintoleranz, zystitis, prostatakarzinom, hepatitis-b, pankreaskarzinom…). |
| **Ne cherche pas la fréquence des selles** | La question existe (`akt-ausscheid-haeufigkeit`, `:364-366`) mais **le dédoublonnage l'efface** : `PROBE_SUCHT` lui donne les mêmes concepts que la question précédente (`symptoms.ts:80-81` : `['stuhl','miktion']` pour *was* ET *häufigkeit*), donc `dedupeBySymptom` (`symptoms.ts:226-235`) la juge « déjà cherchée ». Cause : **granularité du lexique** — « Stuhl » confond *ce qui a changé* et *combien de fois*. |
| **« dort » avant le voyage** | La question du cas est rangée en `aktuell` (`seedCases.ts:40476`) ; la sonde voyage vit dans la Fach Infekt (`anamneseProbes.ts:172`), montée APRÈS `aktuell`. Aucun `braucht` déclaré ; `questionOrderDetect.mjs:27` ne voit que des groupes nominaux (pas l'anaphore adverbiale *dort*) et excuse tout mot déjà dit par le patient (`known` nourri des réponses) — or le motif contient « Indonesien ». |
| (non cité, même cas) Lyme dans une diarrhée | La Fach Infektiologie est taillée pour la borréliose (`anamneseProbes.ts:168-171` : ringförmig, Gesichtslähmung, Nackensteifigkeit) ; seul `fach-infekt-zecke` est sauté. 3 questions hors profil. |

### 1.2 Rhumato à douleur généralisée → `case-fibromyalgie`

Motif : *douleurs généralisées depuis 10 ans, « nicht auf ein einzelnes Gelenk lokalisierbar »,
Morgensteifigkeit 20–30 min « ohne jede Gelenkschwellung »*. Trame jouée (cœur) :

```
 2 akt-ort · 6 akt-ausstrahlung · 7 akt-verlauf · 8 akt-ausloeser · 10 akt-frueher
12 CAS Zeichnung « wo überall es wehtut » (= Ort, 2ᵉ fois) · 13 CAS > 3 Monate (= Verlauf)
15 CAS « Wie lange sind Sie morgens steif… » · 16 CAS « Gelenke … geschwollen, gerötet oder überwärmt… »
18 fach-rheuma-gelenke « Welche Gelenke sind betroffen… »
19 fach-rheuma-morgensteifigkeit (Steifigkeit, 2ᵉ fois) · 20 fach-rheuma-entzuendung (geschwollen/gerötet/überwärmt, 2ᵉ fois)
21 fach-rheuma-verlauf (Verlauf, 3ᵉ fois) · 22 fach-rheuma-ausloeser (Auslöser, 2ᵉ fois)
24 fach-rheuma-systemisch « Haben Sie Fieber, … » · 25 fach-rheuma-vorgeschichte « …Gelenkbeschwerden schon einmal? »
     ↳ « Hatten Sie schon einmal einen Gichtanfall oder Nierensteine? »  ↳ « Gibt es in Ihrer Familie Rheuma oder Gicht? »
26 veg-fieber (Fieber, 2ᵉ fois)
```

| Défaut cité | Cause racine |
|---|---|
| **Steifigkeit ×2** ; **geschwollen/gerötet/überwärmt ×2** | Questions du cas (`seedCases.ts:33566-33567`) **sans `sucht`** + concepts absents du lexique (`symptoms.ts:42-53` : ni raideur ni inflammation articulaire) → invisibles pour `dedupeBySymptom` et pour `checkTrameSymptoms` (qui n'exige `sucht`/`relu` que pour un concept que `TEXT_RE` connaît). Mesure : **36 questions du cas sur 865 jouées (4 %) déclarent `sucht`.** |
| **Auslöser ×2**, **Verlauf ×2 (×3)** | `fach-rheuma-verlauf` et `fach-rheuma-ausloeser` portent `deepens` (`anamneseProbes.ts:208-209`) : le contrat *tolère* la redite (`checkPlayedTrame.mjs:60-61`) et `dedupeBySymptom` ne retire que les `deepens` marqués `redundant` (`symptoms.ts:208-213`). `FACH_COVERS` (`anamneseChapters.ts:419-456`) n'a **aucune** entrée Rheumatologie : la variante douleur garde ses dimensions que la Fach repose. |
| **Fieber ×2** | `fach-rheuma-systemisch` n'est pas dans `PROBE_SUCHT` **par choix écrit** (`symptoms.ts:16-19` : « citer un symptôme parmi d'autres n'est pas le chercher »). La direction juge l'inverse : nommer = demander. |
| **« Welche Gelenke sind betroffen » systématique** | La question présuppose une atteinte articulaire (`anamneseChapters.ts:1194-1199`). Aucune règle de Fach Rhumato : `FACH_RULES` (`:1728-1770`) couvre ortho, kardio, neuro, angio, uro, gyn — pas la rhumato ; le cas n'a pas de `motiv` ; rien ne dit « douleur généralisée, non articulaire ». |
| **Gicht/Nierensteine et Familie en relance d'une question sans rapport** | `anamneseChapters.ts:1233` : deux `followUp` **sans préfixe `Falls …:`** → `parseFollowUp` (`followUp.ts:30`) les classe `immer`, affichées en second plan sous « Gelenkbeschwerden schon einmal ? ». Une relance d'antécédent personnel et une question de **chapitre Familie** ont été rangées sous une question de Fach. Joué dans les 6 cas rhumato. |
| (non cités, même cas) Ort ×2, Frühere Episoden ×2, Ausstrahlung d'une douleur généralisée | CAS « Zeichnung » sans `sucht` (`:33562`) ; `akt-frueher` × `fach-rheuma-vorgeschichte` (pas de `FACH_COVERS`) ; aucune règle ne retire l'irradiation quand `schmerz.ausstrahlung` dit « keine, da generalisiert ». |

**Constat transversal.** La porte actuelle `checkPlayedTrame.mjs` imprime *« TRAME JOUÉE SANS DOUBLON —
130 cas, aucune paire ≥ 0,6 »* sur ces deux trames : elle mesure des **mots**, pas des **signes**, et
tolère `deepens`. Elle ne peut pas voir ce que la direction voit.

---

## 2. La mesure sur les 130 cas

### 2.1 Méthode

- **Signe recherché** : concept clinique dont la réponse est UNE information de la fiche. 11 dimensions de
  plainte (`ort, beginn, charakter, intensitaet, ausstrahlung, verlauf, ausloeser, einfluss, frueher,
  begleit, gelenke`) + ~50 signes (les 38 `Symptom` existants, affinés : `stuhl` / `stuhlfrequenz` /
  `stuhlaussehen`, `miktion` / `polyurie` / `nykturie` / `inkontinenz` / `urin_aspekt` ; ajoutés :
  `steifigkeit`, `gelenk_entzuendung`, `gicht`, `nierensteine`, `essen_expo`, `meningismus`, `zecke`,
  `erythem_ring`, `fazialis`, `konzentration`, `familie_rheuma`…).
- Annotation par **lecture du texte** (motifs étroits) + `PROBE_SUCHT` + `sucht` déclaré. Une dimension
  (« Seit wann haben Sie Fieber? ») porte SUR le motif : le symptôme nommé est son objet, pas un signe
  cherché. Les exemples d'un Auslöser (« — ein Essen, eine Reise ») ne sont pas demandés.
  **Une énumération demande ce qu'elle nomme** (« Haben Sie Fieber, Augenentzündungen… ? » cherche
  la fièvre) — règle de la direction (§6, D1).
- **Profil** déduit de la fiche (motif, `begleitsymptome`, bloc `schmerz`, `verdachtsdiagnose`, DD), avec
  négation (« ohne Gelenkschwellung », « nicht auf ein Gelenk ») ; détail dans `measure.mjs`.
- Périmètre des doublons : `aktuell`, `fach`, `vegetativ` (le cœur de l'entretien) ; une unité = question
  mère + ses relances.

### 2.2 Résultats bruts et précision relue

| Mesure | Total | Cas touchés | Max/cas | Précision (échantillon relu) | Estimation nette |
|---|---:|---:|---:|---|---:|
| (a) signe demandé ≥ 2 fois | 266 | 101 | 8 | 23/31 ≈ **74 %** | ~195 dans ~90 cas |
| (b) question impertinente | 55 | 24 | 7 | 7/10 ≈ **70–75 %** | ~40 |
| (c) signe attendu absent | 44 | 25 | 4 | 22/44 ≈ **50 %** | ~22 |
| (d) relance sans lien — strict (famille / antécédent nommé) | 12 | 6 | 2 | 10/12 | 10 |
| (d') relance inconditionnelle cherchant un autre signe | 39 | — | — | 5/11 ≈ 45 % | ~18 |
| (e) présupposition d'ordre (anaphore + détecteur Q0) | 20 | 17 | 2 | ~55 % | ~11 |

Distribution du score par cas (a+b+c+d+e) : **0 → 24 cas · 1–3 → 58 · 4–6 → 30 · 7–10 → 17 · > 10 → 1**.
Un cas « propre » sur cinq.

**D'où viennent les doublons** (266) :

| Famille | Nb | Mécanisme fautif |
|---|---:|---|
| sonde × sonde, signe nommé dans une énumération hors `PROBE_SUCHT` | 125 | `fach-*-systemisch`, `akt-infekt-herd`, `akt-begleit` nomment fièvre / Durchfall / Luftnot, puis `veg-*` ou la Fach les redemandent |
| question du cas × sonde, question du cas sans `sucht` | 118 | 829 questions du cas sur 865 n'annoncent rien |
| dimension × dimension (`deepens` toléré, `FACH_COVERS` absent) | 18 | Verlauf, Auslöser, Frühere Episoden — rhumato surtout |
| question du cas × question du cas | 5 | rédaction |

Par paire de chapitres : `aktuell→fach` 101 · `fach→vegetativ` 48 · `aktuell→vegetativ` 38 · intra-Fach 33 ·
intra-aktuell 29. Signes les plus doublés (nb de cas) : stuhl 35 · fieber 24 · miktion 16 · schwitzen 14 ·
atemnot 13 · husten 11 · reise 10 · ausschlag 9.

Impertinences par signe : schluck 14 (8× `akt-ausscheid-schlucken`, 3× `fach-endo-hals` dans un diabète) ·
welche Gelenke 9 (`fach-infekt-gelenke` hors arthrite) · ringförmig 8 et Gesichtslähmung 8 (gabarit Lyme
de la Fach Infekt joué en grippe, COVID, malaria, typhus, otite, angine, hépatite) · Nackensteifigkeit 5.

Manques (c) les plus nets : douleur du motif principal sans Ort/Intensität (gastroenteritis,
laktoseintoleranz, commotio, sinusitis, erysipel, sturz-im-alter) ; diarrhée sans fréquence
(gastroenteritis, laktoseintoleranz, morbus-crohn) ; tonsillitis sans question de déglutition.

### 2.3 Les 15 pires cas

| # | Cas | Nature | Score | a (signes doublés) | b | c | d | e |
|---:|---|---|---:|---|---:|---:|---:|---:|
| 1 | fibromyalgie | schmerz | 17 | 8 (ort, verlauf, auslöser, früher, steifigkeit, gelenk-entz., fieber, stuhl) | 7 | 0 | 2 | 0 |
| 2 | polymyalgia | schmerz | 10 | 6 (ort, verlauf, auslöser, früher, fieber, stuhl) | 2 | 0 | 2 | 0 |
| 3 | gastroenteritis | ausscheidung | 10 | 1 (essen) | 5 | 3 | 0 | 1 |
| 4 | malaria | infekt | 10 | 4 (fieber, stuhl, miktion, ausschlag) | 3 | 1 | 0 | 2 |
| 5 | typhus | infekt | 10 | 5 (fieber, stuhl, miktion, ausschlag, essen) | 5 | 0 | 0 | 0 |
| 6 | rheumatoide-arthritis | schmerz | 9 | 7 | 0 | 0 | 2 | 0 |
| 7 | influenza | infekt | 9 | 4 | 3 | 2 | 0 | 0 |
| 8 | covid19 | infekt | 9 | 3 | 4 | 2 | 0 | 0 |
| 9 | reaktive-arthritis | schmerz | 9 | 7 | 0 | 0 | 2 | 0 |
| 10 | sturz-im-alter | anfall | 9 | 6 (schwindel, schwitzen, bewusstlos, sturz, taubheit, inkontinenz) | 0 | 2 | 0 | 1 |
| 11 | gicht | schmerz | 8 | 6 | 0 | 0 | 2 | 0 |
| 12 | commotio | neurologisch | 8 | 6 | 0 | 2 | 0 | 0 |
| 13 | lyme | infekt | 7 | 4 | 1 | 2 | 0 | 0 |
| 14 | tonsillitis | schmerz | 7 | 2 | 4 | 1 | 0 | 0 |
| 15 | hepatitis-b | ausscheidung | 7 | 3 | 4 | 0 | 0 | 0 |

Lecture : les deux cas de la direction sont #1 et #3. **5 des 6 cas joués en Fach Rhumato et 8 des 11
joués en Fach Infekt font 13 des 15 pires** — ce sont des défauts de **gabarit**, pas de rédaction : une
correction au montage les règle tous d'un coup.

### 2.4 Limites de la mesure

Annotation par motifs : elle confond deux contextes d'un même mot (Schwitzen d'une hypoglycémie vs d'une
hyperthyroïdie), prend une question d'approfondissement pour une redite (« Stuhl bleistiftdünn » après
« Stuhlgang verändert ») et déduit le profil d'un texte libre (c'est la cause des 50 % de (c)). **C'est
l'argument central de la conception : un signe et un profil se DÉCLARENT ; la lecture du texte ne sert
qu'à PROPOSER et à détecter les oublis de déclaration.**

---

## 3. Le moteur

### 3.1 Modèle — trois déclarations, rien de plus

```ts
// 1. Le lexique — `Symptom` devient `Signe` (alias conservé), un seul fichier : symptoms.ts
//    Critère de granularité : deux questions cherchent le même signe
//    SSI la fiche y répondrait par la même réplique.
type Signe = Symptom | Dimension | 'stuhlfrequenz' | 'stuhlaussehen' | 'steifigkeit' | …;   // ~60
interface SigneDef { id: Signe; kapitel: KapitelId;        // où il se cherche par défaut
                     screening?: true;                       // dépistage : pertinent pour tous
                     braucht?: ProfilTag[];                  // sinon : pertinent seulement si le profil a l'un de ces tags
                     bank?: ProbeId; }                       // la sonde canonique qui le cherche (ajout d'un manquant)

// 2. Chaque question jouable déclare ce qu'elle cherche
PROBE_SUCHT: Record<ProbeId, Signe[]>                       // 230 sondes sur 230 (82 aujourd'hui)
CaseQuestion.sucht: Signe[]                                  // OBLIGATOIRE (36/865 aujourd'hui)
followUp: string | { text: string; sucht: Signe[] }          // une relance = un signe de sa mère ou une précision de celle-ci
CaseQuestion.braucht?: Signe[]                               // « dort » → ['reise']

// 3. Chaque cas déclare son profil
PatientSheet.profil: {
  tags: ProfilTag[];          // 'schmerz' | 'diarrhoe' | 'reise' | 'arthritis' | 'dysphagie' | 'generalisiert' | …
  exige?: Signe[];            // en plus de ce que les tags exigent
  exclut?: Signe[];           // absorbe aktuellSkip / fachSkip, avec la raison au commentaire
}
PROFIL_EXIGE: Record<ProfilTag, Signe[]>   // 'schmerz' → ort, charakter, intensitaet ; 'diarrhoe' → stuhlfrequenz, stuhlaussehen …
```

`sucht` et `Symptom` existent déjà (contrat `frage-atomique.md` §5) : on les **complète**, on n'en crée
pas de parallèle. `relu` reste pour « nomme sans chercher » mais devient l'exception tracée.

### 3.2 Annoter l'existant

1. **Proposition mécanique** — `measureCoherence.mjs --propose` (pérennise `measure.mjs`) : lexique de
   motifs → `sucht` proposé pour les 148 sondes muettes, les 829 questions du cas muettes et les relances ;
   tags de profil proposés depuis la fiche (motif, bloc douleur, `begleitsymptome`, soupçon), négation
   comprise.
2. **Revue** — par spécialité, un relecteur clinique accepte/corrige ; ce qui est accepté est écrit dans la
   source (pas un fichier à côté). Ordre : sondes (230, une fois pour tous les cas) → relances des sondes →
   profils (130) → questions du cas (865).
3. **Discordance = échec** : si le texte d'une question nomme un signe que sa déclaration ne porte pas,
   il faut `sucht` ou `relu` (extension de `checkTrameSymptoms`, déjà le principe pour 36 concepts).

### 3.3 Correction au montage — `cohere(trame, profil) → { trame, journal }`

Fonction pure, appelée dans `playedTrame` à la place de `dedupeBySymptom` ; elle **remplace aussi
`FACH_COVERS`** (devenu dérivable : signes de la Fach ∩ signes de la variante) et la partie « nature »
de `FACH_RULES` (une sonde hors profil tombe par la règle 1). Quatre règles, dans cet ordre, chacune
écrite au journal avec sa raison :

| # | Règle | Décision déterministe | Entrée de journal |
|---|---|---|---|
| 1 | **Pertinence** | Retire tout signe non `screening` dont aucun `braucht` n'est dans `profil.tags`, et tout signe de `profil.exclut`. Question réduite à ses `parts` restants, sinon retirée. | `RETIRÉ fach-infekt-neuro : meningismus, fazialis — profil sans méningite ni Lyme` |
| 2 | **Un signe, une question** | Pour chaque signe cherché plusieurs fois, on garde la question **la plus spécifique** : question du cas > Fach > variante `aktuell` > `vegetativ` ; à égalité, la première. `deepens` ne tolère plus la redite : la version gardée est la plus fine. Les autres sont réduites par `parts` ou retirées. | `RETIRÉ akt-verlauf : verlauf — posé par fach-rheuma-verlauf (plus spécifique)` |
| 3 | **Rien d'attendu absent** | Pour chaque signe exigé (`PROFIL_EXIGE[tag]` ∪ `profil.exige`) non cherché : insertion de la sonde `bank` du signe dans son chapitre. | `AJOUTÉ akt-ausscheid-haeufigkeit : stuhlfrequenz — exigé par « diarrhoe »` |
| 4 | **Relances et ordre** | Une relance qui ne cherche ni un signe de sa mère ni une précision (dimension) de celui-ci est **détachée** et posée comme question dans le chapitre de son signe (`familie_rheuma` → `familie-sozial`) — ou retirée si ce signe y est déjà. Une question dont `braucht` n'est pas encore cherché est **déplacée juste après** la première question qui le cherche. | `DÉPLACÉ CAS « dort gegessen » après fach-infekt-reise — braucht reise` |

Propriétés : **idempotente** (`cohere(cohere(t)) = cohere(t)`), **sans texte inventé** (on retire, on
réduit par `parts` rédigés à la main, on ajoute une sonde de la banque — jamais une phrase recoupée par
programme, règle de `symptoms.ts`), **explicable** (chaque écart à la trame brute a une ligne de journal).
Le journal est lisible par `checkCoherence.mjs --case <id>` et, en dev, sous le guide d'anamnèse.

Ce que donnent les deux cas de la direction, une fois annotés :

- *gastroenteritis* — tags `schmerz, diarrhoe, reise` : `akt-ausscheid-schlucken` retiré (r1),
  `fach-infekt-haut/neuro/gelenke` réduits ou retirés (r1), Ort/Charakter/Intensität ajoutés (r3, D2),
  `stuhlfrequenz` ajoutée (r3 — et sa granularité la distingue de *was*), « dort gegessen » déplacé après
  `fach-infekt-reise` (r4), la relance alimentaire de `fach-infekt-kontakt` retirée (r2).
- *fibromyalgie* — tags `schmerz, generalisiert` (pas `arthritis`) : « Welche Gelenke » et la relance
  Gicht/Nierensteine retirées (r1), Ausstrahlung retirée (r1, `generalisiert`), Ort/Verlauf/Auslöser/
  Früher/Steifigkeit/Entzündung/Fieber posés une fois (r2 — la question du cas gagne), « Familie Rheuma »
  détachée vers `familie-sozial` (r4).

### 3.4 Les gardes

**`checkCoherence.mjs`** (job `contrats`, après `checkTrameSymptoms`), sur le montage réel des 130 cas :

| Invariant | Avant `cohere` (diagnostic) | Après `cohere` (porte) |
|---|---|---|
| INV-C1 toute question jouable (sonde, CAS, relance) déclare `sucht` ou `relu` | — | **bloquant** |
| INV-C2 tout cas déclare `profil.tags` | — | **bloquant** |
| INV-C3 0 signe cherché deux fois | 266 | **0** |
| INV-C4 0 signe hors profil | 55 | **0** |
| INV-C5 0 signe exigé absent | 44 | **0** |
| INV-C6 0 relance orpheline, 0 `braucht` violé | 12 + 20 | **0** |
| INV-C7 toute sonde ajoutée par r3 a sa réponse dans `antworten` | — | **bloquant** (`checkProbeCoverage`) |
| INV-C8 `cohere` idempotente, journal complet | — | test vitest |

La porte vérifie l'**après** ; l'**avant** est le compteur de dette de contenu (combien de corrections le
moteur fait), dans `app/scripts/fixtures/coherence-budget.json`, enregistré dans `checkBudgetFloor.mjs` :
il ne remonte jamais. Le seul résidu toléré pendant la transition — question à réduire sans `parts`
rédigés, sonde ajoutée sans réponse — a son propre compteur au même fixture, plancher descendant, 0 à la
fin de K4. Exceptions : liste nominative `COHERENCE_ALLOWED` (id, signe, raison, relecteur) — une red flag
volontairement redemandée par exemple ; le script échoue si la liste grossit sans raison (même règle
qu'`ALLOWED_COMPOSED`).

`checkPlayedTrame` (lexical) reste en filet secondaire ; `checkProbeOverlap` et `checkQuestionOrder`
restent informatifs.

### 3.5 Les futurs cas

Le pipeline v3 (`content-case-author`, `app/scripts/PIPELINE.md`) gagne une étape et une porte :
1. l'auteur écrit `profil.tags` et `sucht` sur chaque question du cas (la proposition mécanique les
   pré-remplit) ;
2. `node scripts/checkCoherence.mjs --case <id>` affiche la trame jouée et son journal : l'auteur lit ce que
   le moteur retire / ajoute / déplace et corrige la source si le journal le surprend ;
3. le lot ne s'intègre que si la porte passe (CI identique). Un futur cas ne peut donc **pas** entrer avec
   une question muette, un profil absent ou une sonde exigée sans réponse.

### 3.6 Ce qui reste au jugement humain

| Jugement | Qui | Trace |
|---|---|---|
| Le lexique : un signe de plus ou de moins, sa granularité | relecteur clinique + direction | `symptoms.ts`, commentaire par signe |
| `braucht` des signes ciblés (quel tag rend « Schluck » pertinent) | relecteur clinique | `SIGNE_DEF`, raison écrite |
| Le profil de chaque cas (surtout les natures mixtes) | relecteur clinique, par spécialité | `profil` dans la fiche, revue de lot |
| Les `parts` et les sondes de la banque (texte allemand) | relecteur langue | source, règle d'atomicité |
| Les exceptions | direction | `COHERENCE_ALLOWED` |
| Le journal d'un lot | relecteur clinique sur échantillon (1/5 des cas) | rapport de lot |

---

## 4. Plan de lots

| Lot | Contenu | Nature | Sortie mesurable |
|---|---|---|---|
| **K0** | Lexique `Signe` (granularité), `measureCoherence.mjs` (mesure + `--propose`), fixture plancher, job **informatif** | mécanique | les chiffres du §2 reproduits en CI |
| **K1** | `PROBE_SUCHT` 230/230 + relances des sondes structurées (`{text, sucht}`) + `parts` des sondes énumératives (`*-systemisch`, `akt-infekt-herd`, `akt-begleit`) ; fix immédiat `fach-rheuma-vorgeschichte` (relances) | annotation relue | INV-C1 sur les sondes |
| **K2** | `profil` des 130 cas (proposé, relu par spécialité) ; tranche les 6 natures mixtes | clinique | INV-C2 |
| **K3** | `cohere()` au montage (remplace `dedupeBySymptom`, `FACH_COVERS`, la part « nature » de `FACH_RULES`) + journal + tests | code | INV-C3…C6 après montage ; avant/après publié |
| **K4** | Résidu de contenu : `sucht` des 829 questions du cas, réponses des sondes ajoutées, `parts` manquants, `braucht` | contenu relu | résidu → 0 |
| **K5** | Porte **bloquante** + pipeline v3 + `content-case-author` | mécanique | INV-C1…C8 bloquants |

Dépendance : Q-gyn (fusion Frauenanamnese/Gyn, `origin/feat/s3-qgyn`) merge **avant** K3 — le moteur
s'applique à la trame fusionnée.

**Effet sur Q3–Q8** (audit questions du cas, §6) :
- **Q3–Q5** (composées cliniques d'`aktuell`) : l'atomicité est orthogonale au moteur — le lot reste, mais
  doit **écrire `sucht` sur chaque question qu'il touche** (sinon K4 repasse dessus). Les ~30 questions du
  cas que r2 retirera (doublons d'une sonde) ne valent pas d'être réécrites : les laisser à K4.
- **Q6** (`vegetativ`) : en grande partie **absorbé** — 86 des doublons passent par `vegetativ` ; r2 les
  règle sans réécriture.
- **Q7** (médicaments, allergies, noxes) : inchangé.
- **Q8** : l'« arbitrage des 6 natures de motif » **devient K2** (profil multi-tags) ; `fach` et
  `familie-sozial` sont partiellement absorbés (relances détachées par r4).

### Risques

| Risque | Parade |
|---|---|
| Sur-retrait : une question légitime tombe (red flag redemandée, DD délibérée) | journal relu au lot ; `COHERENCE_ALLOWED` ; r1 ne touche jamais un signe `screening` |
| Granularité mal tenue (un signe trop large efface une dimension, cf. `stuhl`) | critère « même réplique de la fiche » ; test de discrimination sur les paires connues (was/häufigkeit, polyurie/miktion, Schwitzen hypo/hyper) |
| Le Rollenskript perd une réplique dont la suite dépend | les réponses restent dans `antworten` (le simulant peut toujours répondre) ; seule la question affichée change |
| Annotation de 865 + 230 questions = volume | proposition mécanique d'abord ; revue par spécialité ; les questions retirées par r2 n'ont pas besoin de réécriture |
| Le moteur masque une mauvaise fiche | l'**avant** reste compté (dette de contenu au plancher) — le moteur corrige l'affichage, le compteur pousse à corriger la source |

---

## 5. Ce que la mesure ne dit pas

Précision relue ~74 % (a), ~70 % (b), ~50 % (c) : la mesure est une **boussole**, pas une porte. Elle
devient exacte quand les déclarations remplacent la lecture du texte (K1–K2). Les chiffres du §2 sont la
référence initiale du fixture ; ils bougeront à la hausse le jour où l'annotation déclarée remplacera les
motifs (un doublon jusque-là invisible devient visible) — hausse de **mesure**, acceptée en revue, raison
écrite au fixture, comme pour l'atomicité.

---

## 6. Décisions de direction

| # | Question | Recommandation |
|---|---|---|
| **D1** | **Nommer = demander ?** « Haben Sie Fieber, Augenentzündungen… ? » compte-t-il comme la question de la fièvre ? (Aujourd'hui non, par choix écrit `symptoms.ts:16-19`.) | **Oui** — c'est ce que la direction a vécu ; l'énumération se réduit ensuite par `parts`. |
| **D2** | **Motif mixte** : une douleur dans le motif principal d'un cas non-douleur ajoute-t-elle un bloc Ort/Charakter/Intensität ? | **Oui**, quand la douleur est dans le **premier** `leitsymptom` ; pas pour une douleur accessoire (courbatures d'une grippe). |
| **D3** | **`deepens`** : la version Fach « approfondit » — redite tolérée ou non ? | **Non tolérée** : un signe, une question ; la plus spécifique reste. |
| **D4** | **Ordre de priorité** du gardien : question du cas > Fach > variante > végétative ? | **Oui** (la question du cas est écrite pour ce patient). |
| **D5** | **Fach Infektiologie** = gabarit Lyme. Laisser le moteur la réduire au profil, ou la scinder (tropical/digestif vs vecteurs) ? | Moteur d'abord (r1 suffit) ; scinder seulement si le journal montre trop de retraits. |
| **D6** | **Q3–Q8** : poursuivre en parallèle ou attendre K3 ? | Poursuivre **Q3–Q5 et Q7** avec `sucht` obligatoire ; **geler Q6 et Q8** jusqu'à K3. |
| **D7** | **Blocage** : 0 dès K3 sur l'après-montage, ou plancher pendant K4 ? | Après-montage **à 0 dès K3** ; résidu de contenu au plancher jusqu'à K4. |
