# ADR-0023 — Le moteur de cohérence de l'anamnèse

**Statut** : accepté — décisions D1 à D7 prises par la direction le 4 oct. 2026
· **Date** : 2026-10-04 · **Chantier** : série 3, lots K0–K5
· **Amende** : ADR-0019 (le lexique `Symptom` devient le lexique de signes, et
`sucht` devient obligatoire) · **Contrat** : `docs/contracts/frage-atomique.md` §10
· **Spec** : `docs/superpowers/specs/2026-10-04-moteur-coherence-anamnese.md`

## Contexte

Retours d'usage de la direction du 4 oct. sur deux cas joués :

- `case-gastroenteritis` (diarrhée et douleurs spasmodiques) : Ort, Charakter et
  Intensität ne sont jamais demandés. Les Schluckstörungen le sont. La
  fréquence des selles est effacée. « Was haben Sie **dort** gegessen » est posé
  avant toute question de voyage. Trois questions de borréliose sont posées dans
  une diarrhée.
- `case-fibromyalgie` (douleur généralisée) : Steifigkeit, gonflement, Verlauf,
  Auslöser, Fieber et Ort sont demandés deux ou trois fois. « Welche Gelenke »
  est posé à un patient sans arthrite. Gicht et Familie sont rangés en relance
  d'une question sans rapport.

La mesure sur le montage réel (130 cas, 8 492 questions affichées, spec §2) :
266 signes demandés au moins deux fois (~195 nets), 55 questions impertinentes,
44 signes attendus absents, 12 relances sans lien, 20 présuppositions d'ordre.
Un cas sur cinq est propre.

Les causes sont structurelles, pas rédactionnelles :

1. **La porte est aveugle aux signes.** `checkPlayedTrame.mjs` mesure des
   *mots* (Jaccard ≥ 0,6). Il tolère `deepens` (`:60-62`) et imprime « SANS
   DOUBLON » sur les deux trames citées.
2. **La plupart des questions sont muettes.** 82 sondes sur 230 déclarent ce
   qu'elles cherchent (`PROBE_SUCHT`), contre 36 questions du cas sur 865.
   `dedupeBySymptom` ne voit pas ce qui n'est pas déclaré.
3. **Un cas n'a pas de profil.** La seule déclaration clinique est
   `leitsymptomKategorie`, une nature unique. Un motif mixte perd une moitié, et
   rien ne dit « douleur généralisée » ni « pas d'arthrite ».
4. **Les règles sont éparpillées et partielles.** `dedupeBySymptom` (premier
   arrivé, sauf question du cas), `FACH_COVERS` (une carte sonde par sonde, sans
   entrée Rhumato), les filtres de nature de `FACH_RULES`, `aktuellSkip`,
   `fachSkip`. Aucun ne dit pourquoi il a retiré une question.

## Décision

**Chaque question jouable déclare le signe qu'elle cherche. Chaque cas déclare
son profil clinique. Le montage applique quatre règles pures et
déterministes, et chaque écart est journalisé. Une porte CI bloquante vérifie
la trame après montage.**

1. **Le lexique de signes.** `Symptom` devient `Signe`, un seul lexique dans
   `symptoms.ts`. Règle d'identité : *deux questions cherchent le même signe si
   et seulement si la fiche y répondrait par la même réplique.* Chaque signe a
   une pertinence (`'screening'` ou une liste de tags de profil), un chapitre et,
   s'il peut être exigé, une sonde de banque mono-signe.
2. **`sucht` obligatoire** sur toute question jouable : sonde, question du cas
   et relance. `relu` ne sert plus qu'à nommer un signe sans l'interroger, et
   jamais dans une énumération (D1).
3. **Le profil clinique du cas** (`patientSheet.profil`) : `tags`, `exige`, et
   `exclut` avec sa raison. Il est déclaré à la main, pré-rempli par une
   proposition mécanique et relu par spécialité. Le tag de
   `leitsymptomKategorie` est le seul qui se dérive.
4. **`cohere(trame, profil) → { trame, journal }`**, appelé dans `playedTrame`
   à la place de `dedupeBySymptom`. Il applique quatre règles :
   - r1, hors profil : retrait ;
   - r2, un signe, une question, dans l'ordre de conservation D4 ;
   - r3, un signe exigé et absent est ajouté depuis la banque, jamais par du
     texte inventé ;
   - r4, les relances sont rattachées à leur mère, et une question ne vient
     jamais avant le signe qu'elle présuppose.

   Chaque retrait, réduction, ajout ou déplacement écrit une ligne au **journal
   de cohérence**, avec sa raison.
5. **La porte `checkCoherence.mjs`** (job `contrats`, bloquante). Après
   montage, cinq compteurs doivent valoir 0 : doublons, hors profil, exigé
   absent, relances orphelines, présuppositions violées. Le contenu brut est
   compté au plancher (`coherence-budget.json`, le compteur ne remonte jamais).
   Les exceptions sont nominatives et portent leur raison
   (`COHERENCE_ALLOWED`).
6. **Le pipeline des futurs cas** gagne une étape. L'auteur déclare le profil et
   `sucht`, lit le journal de son cas, puis la CI tranche. Un cas ne peut pas
   entrer avec une question muette, sans profil, ou avec une sonde exigée sans
   réponse.

### Décisions de la direction (4 oct. 2026) — DÉCIDÉES

| # | Décision |
|---|---|
| **D1** | Un signe cité dans une énumération compte comme demandé : nommer, c'est demander. |
| **D2** | Une douleur dans le premier symptôme du motif ajoute Ort, Charakter et Intensität, même quand la nature du cas n'est pas « douleur » (motif mixte). Une douleur accessoire, comme les courbatures d'une grippe, n'en ajoute pas. |
| **D3** | Une redite marquée `deepens` n'est plus tolérée : un signe, une question. |
| **D4** | Priorité de conservation : question du cas > Fachanamnese > Aktuelle Beschwerden > végétative. |
| **D5** | La Fach Infektiologie est taillée pour la borréliose : le moteur la réduit d'abord (r1). Elle n'est pas scindée ; on ne la scinde que si le journal montre trop de retraits. |
| **D6** | Pendant le chantier, Q3–Q5 et Q7 continuent et déclarent `sucht` sur tout ce qu'ils touchent. Q6 et Q8 sont gelés jusqu'à K3. |
| **D7** | Dès K3, la porte est à 0 sur la trame jouée **après** montage. Le contenu brut reste au plancher, qui ne remonte jamais, jusqu'à K4. |

## Alternatives écartées

- **Seuil lexical plus fin dans `checkPlayedTrame`.** Il mesure des mots, et la
  direction voit des signes : « Wie lange sind Sie morgens steif » et
  « Morgensteifigkeit ? » ne partagent presque aucun mot. Il reste en filet
  secondaire.
- **Déduire signes et profil du texte, sans déclaration.** La précision relue
  est de 74 % pour (a), 70 % pour (b) et 50 % pour (c) (spec §2.4) : elle ne
  suffit pas pour une porte. La lecture du texte **propose** et **détecte les
  oublis**, la déclaration fait foi.
- **Corriger cas par cas, à la main.** 13 des 15 pires cas viennent de deux
  gabarits (Rhumato, Infekt). Une règle au montage les règle tous, et elle
  protège aussi les futurs cas.
- **Prolonger `FACH_COVERS` et `dedupeBySymptom`.** On aurait deux mécanismes
  qui se recouvrent, aucun journal, et une carte sonde-à-sonde à entretenir pour
  chaque paire de chapitres. Le signe partagé rend la carte dérivable.
- **Scinder la Fach Infektiologie maintenant (D5).** r1 suffit à mesure égale.
  La scission reste ouverte si le journal le justifie.
- **Laisser `cohere` reformuler une question réduite.** Ce serait du texte
  inventé par un programme, ce que `symptoms.ts` interdit depuis FB2-J10. On
  réduit par `parts` rédigés à la main, ou on garde la question et on compte le
  résidu.

## Conséquences

- **Retirés** : `dedupeBySymptom` (`symptoms.ts:194`), `FACH_COVERS` et
  `coveredByFach` (`anamneseChapters.ts:419-462`), les filtres de nature de
  `FACH_RULES` (absorbés par r1), la tolérance `deepens` de
  `checkPlayedTrame.mjs:60-62`, et la règle « citer n'est pas chercher » de
  `symptoms.ts:16-19`. Les patchs de texte et les filtres sexe/âge de
  `FACH_RULES` restent.
- **Gelés** : `aktuellSkip` et `fachSkip` sont lus et appliqués par r1, avec
  une ligne de journal. Ils n'acceptent plus d'entrée nouvelle : un nouveau cas
  utilise `profil.exclut`.
- **Comportement changé** : dans un cas fébrile, la fièvre se pose désormais
  dans la Fach (`fach-infekt-fieber`) et non plus dans `akt-infekt-fieber`
  (D4). Les badges « ↗ approfondit / ↻ déjà demandé » (`PhraseLine.tsx:81-84`)
  n'ont plus d'objet, puisque la question approfondie n'est jamais dans la même
  trame. C'est une proposition au pôle Expérience.
- **Volume** : 148 sondes et 829 questions du cas à annoter. Une proposition
  mécanique passe d'abord, puis une revue par spécialité. Les questions que r2
  retirera n'ont pas besoin d'être réécrites.
- **Compatibilité** : tous les champs sont additifs, sans changement de schéma
  SQL ni de protocole de sync. Un contenu sans `profil` (cache ancien) ne voit
  que r2 et r4 : pas de retrait massif hors-ligne.
- **Dépendance** : Q-gyn merge **avant** K3. Le moteur s'applique à la trame
  fusionnée.
- **Risque assumé** : le moteur corrige l'affichage. Le compteur brut, au
  plancher, pousse à corriger la source. Sans lui, une mauvaise fiche serait
  masquée.
