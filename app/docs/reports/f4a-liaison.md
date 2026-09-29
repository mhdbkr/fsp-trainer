# F4a — Liaison cas ↔ termes : relecture clinique des mots d'examen, registre, mesures

Tâche A4 du plan `docs/superpowers/plans/2026-09-25-fachbegriffe-f4a-clarte.md` (§ spec `2026-09-28-fachbegriffe-f4a-clarte-design.md`). Relectures faites en lecture seule par `fsp-clinical-reviewer` (Step 1) et `fsp-language-reviewer` (Step 3) ; appliquées par l'implémenteur (writer unique du worktree).

## Mesures avant/après

| Mesure | Avant (`main`) | Après (ce commit) |
|---|---|---|
| Liens cas ↔ termes | 16 248 | 7 134 |
| Termes liés (distincts) | 1 354 | 1 253 |
| Termes liés à > 20 % des cas | 156 | 1 (`fb-gewichtsverlust`, 31 cas) |
| Min · médiane · max par cas | 47 · 128 · 195 | 19 · 56 · 100 |

Écart aux cibles du plan (7 325 liens / 1 261 termes / min 19 médiane 57) : liens −189 (−2,6 %), termes −8, médiane 56 au lieu de 57. Écart attendu et explicable : les 8 ajouts au glossaire des mots d'examen (Step 1) retirent leurs occurrences des liaisons partout où elles apparaissaient comme mot d'examen, y compris dans des cas déjà proches du seuil — c'est l'effet recherché du filtre, pas une régression. Le minimum reste à 19 (cible respectée), aucun cas n'est passé sous 8 termes, aucun diagnostic n'a perdu son lien (`checkCaseTermLinks.mjs` exit=0).

## Top 10 des termes les plus liés (après)

| Terme | Cas |
|---|---|
| `fb-gewichtsverlust` | 31 |
| `fb-malignom` | 26 |
| `fb-stenose` | 26 |
| `fb-kompression` | 26 |
| `fb-abszess` | 26 |
| `fb-metabolisch` | 26 |
| `fb-hyperthyreose` | 26 |
| `fb-leberzirrhose` | 25 |
| `fb-proximal` | 25 |
| `fb-gastrointestinal` | 25 |

Un seul terme (`fb-gewichtsverlust`) dépasse le seuil de 20 % des cas (130 cas × 20 % = 26) ; le validateur ne bloque qu'au-delà de 10 termes larges, ce qui est le cas ici (1 ≤ 10).

## Liste générique finale (`genericTerms.json`, 44 ids)

Les 36 ids d'origine sont conservés tels quels par le relecteur clinique (aucun retrait) : ce sont tous des mots de méthode d'examen, d'étape du raisonnement ou de temporalité, jamais le sujet clinique d'un cas.

Ajouts retenus (8, tous vérifiés comme mots d'examen/adjectifs de temporalité, jamais un constat clinique nommé) :

- `fb-aetiologisch`
- `fb-idiopathisch`
- `fb-digital`
- `fb-noxen`
- `fb-praeoperativ`
- `fb-praevention`
- `fb-basis`
- `fb-spiegel` — sous condition vérifiée : aucun cas du corpus n'a un taux sanguin comme sujet central du diagnostic (recherche de cas d'intoxication au lithium, à la digoxine, aux salicylés, etc. dans `seedCases.ts` — les seules occurrences de « Spiegel » relèvent d'examens complémentaires ou d'ajustements posologiques dans des cas dont le diagnostic central est autre, ex. lithium cité comme cause de dysthyroïdie ou comme substance dialysable dans un cas d'IRA, jamais une intoxication au lithium comme diagnostic principal). Ajout appliqué.

Candidats écartés par le relecteur clinique (entrent dans des diagnostics, donc jamais génériques) :

- `fb-remission` — objectif central de la leucémie aiguë
- `fb-proximal`
- `fb-subkutan`
- `fb-maligne`
- `fb-obstruktiv`
- `fb-fokal`
- `fb-metabolisch`
- `fb-kognitiv`
- `fb-gastrointestinal`

## Cas au minimum de termes liés

`case-angina-pectoris` — 19 termes (= minimum autorisé, cible du plan atteinte).

## `DIAGNOSIS_EXCEPTIONS` (`scripts/checkCaseTermLinks.mjs`)

```
case-gerd, case-oesophaguskarzinom, case-magenkarzinom, case-bandscheibenvorfall,
case-tvt, case-opioidabhaengigkeit, case-aortendissektion, case-ptbs, case-alkoholentzug
```

Justification (relecture Step 1) :
- Les 6 premiers cas sont l'exception mesurée dès la spec F4a §3.1 (diagnostic sans terme correspondant dans le glossaire au moment de la spec).
- Les 3 suivants (`case-aortendissektion`, `case-ptbs`, `case-alkoholentzug`) ont été vérifiés en Step 1 : `grep -n '"t":"Aortendissektion"\|"t":"Posttraumatische Belastungsstörung"\|"t":"Alkoholentzugssyndrom"' src/data/fachbegriffe.json` ne retourne aucune ligne — ces trois diagnostics n'existent pas dans le glossaire. C'est attendu, pas une anomalie de liaison.

## Registre du terme nouvellement lié

`checkTermRegister.mjs --require-all` signalait `fb-inguinalhernie` lié (via le diagnostic de `case-leistenhernie`) sans registre. Patch appliqué (`scripts/registerLots.mjs apply`), relu par `fsp-language-reviewer` :

- `pa` : « Ich habe eine Beule in der Leiste. »
- `vo` : « Sonographisch zeigte sich eine reponible Inguinalhernie. »
- `an` : « Haben Sie eine Schwellung in der Leiste bemerkt, die beim Husten hervortritt und im Liegen verschwindet? »

`checkTermRegister.mjs --require-all` → exit=0 après application (1 355 termes renseignés, 0 lié sans registre).

## Hors périmètre relevé (à ne pas corriger ici)

Doublon `fb-alkoholdelir-syn-delirium-tremens` / `fb-delirium-tremens` repéré par le relecteur clinique — deux ids distincts pour le même concept. Hors périmètre de la tâche A4, signalé pour arbitrage ultérieur.

> Après revue B4 : un ordinal (« 3. Lendenwirbel », « am 12. März ») ne coupe plus la phrase — 2 liens retirés (achalasie·Inzidenz, lumboischialgie·lokalisiert).

---

## Correctif de fond — retour direction n°1 (« filtre vraiment les Fachbegriffe liés au cas »)

Blocage `direction-keeper` : top 10 contaminés par la fiche Fachwissen (« Fontanelle » chez un homme de 54 ans), les diagnostics différentiels (« Adnexitis », « Endometriose » dans l'appendicite masculine), un homonyme (« Stärke » = amidon pour « in gleichbleibender Stärke ») et un ordre « le plus rare d'abord ».

### Règles changées (`scripts/linkCaseTerms.mjs`)

1. **Seul ce que dit le cas lie** : fiche patient, vue médicale, Muster, Arztbrief de référence. La fiche Fachwissen (générique de la pathologie), `examinerQuestions`, `examinerSheet`, `pruefungsfallen` et `caseSpecificQuestions` deviennent **contextuels** (ne lient rien).
2. **Diagnostics différentiels** : clés réelles du corpus (inventaire des 130 cas + 134 fiches) = `differenzialdiagnosen`, `dd`, `unterscheidung` — toutes contextuelles. Et, dans un champ central, une **phrase** de DD/exclusion (`DD_SENTENCE` : « Differenzialdiagnostisch… », « … in Betracht », « Ausschluss/auszuschließen », « abgrenzen ») est contextuelle — les Muster en contiennent dans `diagnose` et `diagnostik-procedere`.
3. **`persona` exclue** : consignes de jeu du simulant, en français (« t'interrompre » faisait lier *Interruptio* à l'HBP).
4. **Homonymes du quotidien** : `src/data/homonymTerms.json` (id → justification), jamais liés.
5. **Ordre** : diagnostic → symptômes clés (leitsymptome, begleitsymptome, schmerz) → ce que dit le patient → vue médicale hors DD → ce que seuls les Muster disent. Dans un rang : le plus cité dans le cas, puis le plus spécifique (DF asc), puis id.

### Porte CI (`scripts/checkCaseTermLinks.mjs`)

- Chaque terme du **top 10** figure dans le texte du cas lui-même : fiche patient hors `EXCLUDED_KEYS`, vue médicale hors DD (clés et phrases), ou diagnostic (`verdachtsdiagnose`, nom, pathologie).
- **Termes sexués** : aucun terme de `sexSpecificTerms.json#w` dans un cas `geschlecht: 'm'`, ni de `#m` dans un cas `'w'`. Le glossaire n'a **pas** de spécialité gynécologie/andrologie (`sp` : 12 valeurs, aucune) ; la liste est donc construite par radicaux (`SEX_STEMS`) sur « terme | Bedeutung | définition », puis relue : 91 termes F, 24 termes M, 27 exclusions motivées dans le fichier (faux positifs de radical — « schmerzstillend », « Speichel » ; termes des deux sexes — sein, *Kontrazeption* exigée chez l'homme sous méthotrexate, *Gynäkomastie*, *Testosteron*, *Lanugo*). Un test vérifie dans les deux sens : liste = hits des radicaux − exclusions, chaque exclusion a un hit et une raison.

### Homonymes ajoutés (`homonymTerms.json`)

| Terme | Bedeutung du glossaire | Sens dans les cas |
|---|---|---|
| `fb-staerke` Stärke | Vielfachzucker | intensité (« in gleichbleibender Stärke », « Stärke 8 von 10 ») — 10 cas, aucun au sens d'amidon |
| `fb-media` Media | mittlere Schicht der Blutgefäßwand | « A. cerebri media » (schlaganfall, arterielle-hypertonie) |
| `fb-duplex` Duplex | doppelt | Duplexsonographie (aortendissektion, arterielle-hypertonie) |
| `fb-ueberall` überall | an allen Orten | adverbe du quotidien, pas un Fachbegriff (« habe überall Schmerzen ») |

Relevé, non exclu (le terme est juste, la Bedeutung est étroite) : `fb-zervix` (« Hals ») lié à `case-adnexitis` au sens de col utérin ; `fb-phototherapie` (« … bei Neugeborenengelbsucht ») lié à `case-psoriasis`.

### Mesures

| Mesure | Avant (f203571) | Après |
|---|---|---|
| Liens cas ↔ termes | 7 134 | 3 573 |
| Termes liés (distincts) | 1 253 | 893 |
| Termes liés à > 20 % des cas | 1 (`fb-gewichtsverlust`, 31) | 1 (`fb-gewichtsverlust`, 31) |
| Min · médiane · max par cas | 19 · 56 · 100 | 6 · 27 · 62 |
| Cas < 8 termes | 0 | 1 (`case-bandscheibenvorfall`, 6) |

Top termes les plus liés après : gewichtsverlust 31, antikoerper 26, kontrastmittel 25, fieber 25, albumin 24, nuechtern 24, spontan 23, hepatitis 23, obstipation 23, tumor 23.

### Top 10 avant / après

| Cas | Avant | Après |
|---|---|---|
| `case-gastroenteritis` (m, 54 ans) | infektiös · Dehydratation · Gastroenteritis · Meteorismus · Gewichtsverlust · diffus · **Stärke** · Botulismus · **Fontanelle** · Kontagiosität | Dehydratation · Gewichtsverlust · infektiös · Gastroenteritis · Meteorismus · diffus · Parasit · Antiemetikum · Tachykardie · Defäkation |
| `case-appendizitis` (m, 41 ans) | Appendizitis · Nachtschweiß · Spina iliaca anterior superior · Bride · digitale Untersuchung · Meckel-Divertikel · Nausea · inkarzeriert · Urolithiasis · **Adnexitis** | Appendizitis · Nachtschweiß · Appendektomie · nüchtern · Peritonitis · Abszess · postoperativ · Laparoskopie · intraoperativ · Perforation |
| `case-arterielle-hypertonie` (m) | Schlafapnoe · **Adrenalektomie** · **Hyperaldosteronismus** · **Ovulationshemmer** · **Lysetherapie** · Striae · Epistaxis · Intima · Antihypertensivum · intrazerebrale Blutung | Schlafapnoe · Hypokaliämie · Lipid · Albumin · Phäochromozytom · Angiographie · kardiovaskulär · Intima · Hypertrophie · Plasma |
| `case-pneumonie` (m) | Pneumonie · Thorax · Inspiration · Inappetenz · Fieber · Alveolen · **Zytostatika** · antipyretisch · Antitussivum · Diarrhö | Pneumonie · Thorax · Fieber · Inappetenz · Inspiration · antipyretisch · Empyem · Pleuraerguss · Tachypnoe · Antitussivum |
| `case-tia` (tirage) | transitorisch · rezidivierend · Attacke · Amaurose · Embolus · Neglect · Arteriosklerose · Hemisphäre · kontralateral · Polyglobulie | Attacke · rezidivierend · transitorisch · Antikoagulans · Karotisstenose · Arrhythmie · Arterie · Antikoagulation · Endokarditis · kardial |
| `case-anorexia-nervosa` (tirage) | Hypotonie · Anorexia nervosa · Amenorrhoe · sekundär · Bradykardie · Gewichtsverlust · Obstipation · Gonade · Gynäkologe · Karies | Amenorrhoe · sekundär · Bradykardie · Anorexia nervosa · Gewichtsverlust · Hypotonie · Obstipation · Hypokaliämie · Ödem · Albumin |
| `case-coxarthrose` (tirage) | primär · Adipositas · Coxarthrose · Ausstrahlung · Adduktoren · Poliomyelitis · Adduktion · Hyperlordose · Kontraktur · aseptisch | Coxarthrose · Adipositas · primär · Ausstrahlung · Motorik · Extension · Endoprothese · Abduktion · Hyperurikämie · Adduktion |
| `case-tonsillitis` (tirage) | Tonsillitis · viral · Fieber · Deviation · Tonsillitis purulenta · Trismus · Antitoxin · Arthritis urica · Foetor ex ore · Anosmie | Fieber · viral · Tonsillitis · Foetor ex ore · Nephrolithiasis · Tonsillektomie · Glomerulonephritis · infektiöse Mononukleose · Trismus · Inzision |

Tirage : générateur congruentiel de graine 20260929 sur les 126 autres cas. *Hyperurikämie* (coxarthrose) et *Nephrolithiasis* (tonsillitis) sont des antécédents réels du patient, repris dans sa prise en charge.

### Limites et points ouverts

- **Porte rouge (7 manquements, 4 cas)** — non contournée :
  - `case-bandscheibenvorfall` : 6 termes (< 8). Son diagnostic n'est pas au glossaire (exception) et la fiche patient parle en langue courante ; ses termes venaient de la fiche Fachwissen et de l'examinateur.
  - `case-gib` (8 termes : *Hämoglobin*, *gastrointestinale Blutung*, *postprandial*), `case-angina-pectoris` (9 : *Adipositas*), `case-tvt` (10 : *Mutation*), `case-bandscheibenvorfall` (*Parästhesie*) : moins de 10 termes dans la fiche patient + vue médicale, donc le top 10 se complète avec des termes que seuls les Muster disent. Ce sont des faits du patient (« Adipositas Grad I » pour 92 kg / 175 cm ; « postprandiale » douleurs), pas des DD. À trancher : (a) élargir la porte aux Muster hors phrases DD (une ligne dans `ownTexts`) ; (b) ne lier que la fiche patient + vue médicale (gib passe à 5 termes, bandscheibenvorfall à 5) ; (c) enrichir ces fiches patient.
- `case-somatoforme-schmerzstoerung` ajouté à `DIAGNOSIS_EXCEPTIONS` : son seul « terme de diagnostic » était *überall* (nom du cas « Schmerzen überall »), désormais homonyme ; « somatoform » n'est pas au glossaire.
- La vue médicale garde ses bilans conditionnels : dans `case-arterielle-hypertonie`, *Hypokaliämie* et *Phäochromozytom* viennent de « Bei Hypokaliämie…: Metanephrine im Plasma (Phäochromozytom) » — un DD entre parenthèses que `DD_SENTENCE` ne reconnaît pas (idem *Endokarditis* dans `case-tia`). Élargir la règle à « Abklärung / Suche nach » a été mesuré : −75 liens, top 10 de l'hypertension quasi inchangé ; non retenu.
- Les composés à trait d'union se découpent : « Intima-Media-Dicke » lie *Intima* (règle de mot entier partagée avec l'autolink de l'app, inchangée ici).

### Registre et Bedeutung

- `checkTermRegister.mjs --require-all` → exit 0 (0 terme lié sans registre).
- `checkBedeutung.mjs` → exit 1 : **1 terme nouvellement lié** à reformuler, `fb-kontrastmittel` (« Substanz, die Strukturen im Bild sichtbar macht », > 6 mots), désormais lié à 25 cas (dont pankreatitis, myokardinfarkt, ileus, bauchaortenaneurysma). Il était filtré avant comme terme trop large ; il repasse sous 20 % puisque les fiches Fachwissen ne lient plus. Non rédigé ici.
