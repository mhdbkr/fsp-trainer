# Chantier — harmoniser le guide rédigé et les sondes (Fachanamnese)

## Le problème, mesuré

Deux textes décrivent les mêmes questions d'anamnèse spécialisée :

| | fichier | rôle | conséquence |
|---|---|---|---|
| **Guide rédigé** | `data/guides/anamneseChapters.ts` → `FACHANAMNESEN` | matière pédagogique (page Guides) : scénarios, `alts`, conseils en français | ce que le candidat **lit** |
| **Sondes** | `data/guides/anamneseProbes.ts` → `FACH_PROBES` | contrat de couverture : chaque cas y répond via `patientSheet.antworten` | ce que le simulant **peut répondre** |

Ils ont divergé parce qu'ils ont été écrits **à des moments différents** : le guide
rédigé couvre 16 spécialités depuis l'origine ; les sondes ont été ajoutées
incrémentalement, spécialité par spécialité, comme prérequis de chaque lot de cas —
sans relire le guide.

### Chiffres (mesure du 2026-09-08)

- 127 questions écrites · 138 sondes · **49 sondes couvertes par le guide (35 %)**
- Appariement 1↔1 : 36 paires seulement. En appariement **1 question → N sondes**
  (une question écrite composée couvre plusieurs sondes) on monte à 49 — donc une
  partie de l'écart est structurelle, mais **89 sondes restent absentes du guide**.

| aligné (écrit *avec* ses sondes) | divergent (sondes ajoutées après) |
|---|---|
| Kardiologie 10/10 · Chirurgie 7/7 · Gastroenterologie 7/7 | Nephrologie 0/8 · Onkologie 0/9 · Neurologie 1/9 · Dermatologie 1/9 · Hämatologie 1/10 · Gynäkologie 1/9 · Orthopädie 1/8 · Rheumatologie 2/8 · Infektiologie 2/8 · Endokrinologie 3/10 · Psychiatrie 4/9 · Urologie 4/8 · Pneumologie 5/9 |

### Ce que ça coûte aujourd'hui

`fachChapterForSimulation()` **contourne** le guide rédigé : en simulation, le
chapitre Fachanamnese est régénéré depuis les sondes, sinon le candidat poserait
des questions auxquelles la fiche patient ne peut pas répondre (bug FB-A3). Le
guide rédigé n'est donc plus utilisé que sur la page Guides — sa richesse
(formulations alternatives, conseils) est perdue en simulation.

## La cible

**Un seul texte par spécialité**, où chaque question porte sa ou ses sondes :

```ts
{ text: '…', probe: 'fach-neuro-kopfschmerz' }              // question simple
{ text: '…', probe: ['fach-neuro-sehen', 'fach-neuro-kraft'] } // question composée
{ text: '…', alts: ['…'] , probe: '…' }                      // richesse conservée
```

Conséquences :
- le contrat est garanti **par construction** (validateur `checkGuideCoverage`) ;
- `fachChapterForSimulation()` disparaît : le guide rédigé redevient la source de
  la simulation, avec ses `alts` et ses conseils ;
- la page Guides et la simulation lisent enfin **le même texte**.

## La méthode, par spécialité

1. **Les sondes sont le squelette.** Elles portent le contrat (52 fiches patient y
   répondent déjà) et sont le travail clinique le plus récent.
2. **Une question écrite qui recouvre une sonde** → on garde la meilleure
   formulation et on la lie (`probe:`) ; l'autre formulation devient une `alts`.
3. **Une question écrite qui apporte un axe clinique absent des sondes** → on la
   PROMEUT en nouvelle sonde, et on écrit sa réponse dans les cas de cette
   spécialité (coût : 1 réponse × nombre de cas de la spécialité).
4. **Une question écrite redondante** → supprimée du guide, sa valeur étant déjà
   dans la sonde.
5. **Le conseil français (`tip`)** est pure pédagogie : conservé tel quel.

Le coût maximal, si l'on promouvait les 91 questions orphelines, serait de
**261 nouvelles réponses** dans les fiches patient. La curation (étape 4) doit
donc être réelle : on ne promeut que ce qui a une valeur clinique propre.

## Ordre de traitement

1. **Pilote : Neurologie** — divergence représentative (le guide est orienté
   céphalée/syncope, les sondes sont un examen neurologique systématique),
   3 cas seulement, contenu clinique net. Sert à prouver la méthode.
2. Spécialités à 1-2 cas (coût de promotion faible) : Nephrologie, Hämatologie,
   Dermatologie, Gynäkologie, Onkologie, Psychiatrie, Rheumatologie.
3. Spécialités à 3-4 cas : Infektiologie, Endokrinologie, Orthopädie, Urologie,
   Pneumologie.
4. Vérification finale : les 4 spécialités déjà alignées (Kardio, Chir, Gastro)
   — simple relecture, aucun travail attendu.

## Invariants à ne jamais casser

- `checkProbeCoverage` : chaque cas répond à toutes les sondes applicables.
- `checkGuideCoverage` : chaque question affichée a une réponse dans la fiche.
- Renommer une sonde casse les `antworten` des cas → **on n'en renomme aucune** ;
  on ajoute, on ne réécrit pas les identifiants.
