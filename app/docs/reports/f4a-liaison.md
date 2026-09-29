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
