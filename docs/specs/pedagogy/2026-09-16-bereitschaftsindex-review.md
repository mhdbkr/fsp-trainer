# Avis pédagogique — Prüfungstag-Simulator + Bereitschaftsindex

> Pipeline `pruefungstag` · étape 2 (veto, ADR-0008) · auteur `pedagogy-pruefungstag` (product-pedagogy-designer, Opus) · 2026-09-16
> Spec relu : `docs/superpowers/specs/2026-09-16-pruefungstag-design.md` (7fa9641) · ADR-0013 (b731d0c, brouillon) · `app/src/lib/readiness.ts`
> Question unique du pôle : *la progression apprend-elle vraiment, ou occupe-t-elle ?*

## VERDICT : `APPROVED_WITH_CHANGES`

Le spec récompense les bonnes actions (une simulation tenue 60 min en conditions réelles vaut plus qu'une simulation assistée ; un login vaut zéro) et n'a aucun dark pattern structurel. Six modifications sont exigées et **appliquées par moi dans le spec** (commits `docs(pedagogy): …`) ; deux propositions sortent de mon périmètre et sont adressées à `arch` / `spec`.

| # | Question du brief | Décision | Où dans le spec |
|---|---|---|---|
| 1 | Plafond 79 sans Prüfungstag réussi < 30 j | **Accepté, modifié** : ne lève le plafond qu'un Prüfungstag **avec simulant** ; la date d'expiration est affichée, jamais notifiée | D7, §6.1, §6.2, CA-11 |
| 2 | Couverture C sur le dénominateur du plan | **Accepté, modifié** : dénominateur = plan, mais la phrase affiche les **deux** nombres (plan / protocoles) et la liste hors plan | §6.2, §7, §10 |
| 3 | Fallback Free sans chiffre de gain | **Pas un dark pattern, sous 4 conditions** listées ; appliquées | §7 |
| 4 | Axe non testé = 30 vs 0 | **Refusé (le 30)** : un axe jamais joué vaut **0** et s'affiche « — nicht getestet » ; l'Aufklärung rejoint l'axe Anamnese (l'examen note 3 parties, pas 4) | §6.1, §6.2, CA-7 |
| 5 | 12 vs 20 min Fallvorstellung en entraînement | **Hors périmètre confirmé** ; recommandation sourcée pour les deux modes | §5.2, §15 + ticket proposé |
| 6 | Le mode examen apprend-il ou stresse-t-il ? | **Apprend, sous conditions** : débrief obligatoire sur le résultat, fréquence conseillée (jamais imposée), aucune relance | §5.5, §5.1 setup, CA-16 |

---

## 1. Mécanique par mécanique : action récompensée → fait-elle réussir l'examen ?

### 1.1 Poids des simulations dans S (Prüfungstag 3 · Autonome 2 · Assisté 1, décroissance 30/90 j)

- **Action récompensée** : jouer sans aide, récemment, les trois parties.
- **Preuve** : l'examen ne donne ni guide ni Muster (`ANALYSE.md` l.31-33 : Arztbrief « à partir des seules notes ») ; les six familles de critères du Bogen officiel (`fsp-official-grading`) sont toutes des critères de production spontanée. Un score assisté mesure la reconnaissance, pas la production. La décroissance temporelle est cohérente avec le persona « candidat à 3 semaines ».
- **Verdict** : **accepté**.

### 1.2 Plafond 79 sans Prüfungstag réussi dans les 30 jours (question 1)

- **Action récompensée** : avoir tenu 60 minutes enchaînées, sans aide, et réussi chaque partie ≥ 60 %.
- **Preuve** : le verdict officiel est « ≥ 60 % dans **chaque** partie » (`fsp-official-grading`) ; les protocoles montrent que la tenue du temps est la première cause d'échec vécue (Stuttgart l.512 « Ich habe es nicht geschafft, die Anamnese innerhalb der 20 Minuten abzuschließen » ; Reutlingen l.331 « Die Zeit für den Arztbrief (20 Minuten) war für mich zu kurz »). Un « Prêt » sans cette preuve serait une promesse que l'app ne peut pas tenir. Le plafond n'est pas punitif : il est **expliqué, daté, et levable par une action gratuite et illimitée**.
- **Incohérence relevée** : §6.2 lève le plafond pour tout `context==='pruefungstag' ∧ passed`, donc aussi pour un Prüfungstag **solo** (`withSimulant:false`) — que le même spec pèse comme une Autonome (poids 2) parce qu'« il n'y a personne pour jouer le patient ». Une Anamnese sans interlocuteur ne mesure ni Hörverstehen ni Kommunikation (deux des six familles du Bogen). Un solo ne peut pas être la preuve qu'on « tiendrait l'examen ».
- **Verdict** : **accepté, modifié** — (a) le plafond n'est levé que par un Prüfungstag `withSimulant:true` réussi < 30 j ; (b) le résultat d'un solo le dit en clair (« Sans simulant, ce Prüfungstag compte comme une simulation Autonome et ne lève pas le plafond ») ; (c) la page affiche la date à laquelle le plafond reviendra (« ton dernier Prüfungstag réussi date du 12.08 ; sans nouveau Prüfungstag avant le 11.09, l'indice repassera sous 80 ») — **sans notification, sans e-mail** (hors périmètre confirmé, et je le veux ainsi : la relance fabriquerait de l'anxiété, pas de la préparation).
- **Alternative écartée** : plafond à 30 j calendaires *depuis le dernier Prüfungstag quel qu'il soit* (même échoué) — non : un échec récent n'est pas une preuve de tenue.

### 1.3 Couverture C sur les spécialités du plan (question 2)

- **Fait vérifié** : les 12 cas Free couvrent **8 spécialités sur 16** (Kardiologie, Gastro, Psychiatrie, Pneumologie ×2, Urologie ×3, Orthopädie, Neurologie ×2, Endokrinologie) — `seedCases.ts`, `tier: 1`. La matrice d'entitlements dit « un par spécialité majeure » : inexact (proposition de correction à `arch`, §4).
- **Dilemme** : dénominateur = protocoles (16) → un Free plafonne mécaniquement à ~60 % de C parce qu'il n'a pas payé : **chiffre dégradé par le paywall = dark pattern** (le candidat ne peut pas agir dessus dans le produit). Dénominateur = plan (8) → un Free à C = 100 pourrait se croire couvert alors que l'examen tire dans 16 : **chiffre gonflé = mensonge par omission**.
- **Verdict** : **accepté, modifié** — dénominateur = plan (le chiffre reste un diagnostic de ce que le candidat *peut* faire), **à condition** que la phrase d'explication porte les deux nombres et la liste nominative hors plan : « Abdeckung : 6 des 8 spécialités de ton plan (pondérées par fréquence). Les protocoles en comptent 16 ; les 8 autres (Dermatologie, Infektiologie, …) ne sont pas dans le plan Free. » C'est de l'information, pas un chiffre inventé, et le candidat sait exactement ce que son 100 % vaut.

### 1.4 Courbe de langue L (5 dernières parties orales, tendance ±5, plafond 30 si < 3)

- **Action récompensée** : remplir la grille de langue officielle à chaque partie orale, et progresser.
- **Preuve** : la grille `officialPct` reprend les familles du Musterbewertungsbogen — c'est littéralement ce que l'examen note.
- **Verdict** : **accepté**. La tendance ±5 est un signal faible mais honnête ; le plafond 30 avec < 3 échantillons est cohérent avec la règle « pas de preuve, pas de points » (§1.5).

### 1.5 Axe non testé (question 4)

- **Fait vérifié** : `computeReadiness` fait `score: scores[a] ?? 0` puis `Math.min(a.score, 30)` → **0 effectif** ; le commentaire « plafonne à 30 » décrit une intention qui n'a jamais été implémentée. Le spec §6.2 propose de fixer **30** (« potentiel inconnu »).
- **Argument** : 30 points pour n'avoir rien fait récompense l'inaction. Un candidat sans aucune simulation obtiendrait S = 30, L ≤ 30 → BI ≈ 22 sans avoir ouvert un cas. Ce n'est pas un « potentiel », c'est un chiffre inventé ; il rend l'indice non recalculable à la main (« d'où viennent ces 30 ? »). Le vrai potentiel inconnu se dit avec un tiret, pas avec un nombre.
- **Second problème** : S moyenne 4 axes à poids égal (Anamnese, Dokumentation, Fallvorstellung, Aufklärung). L'examen note **3 parties** ; l'Aufklärung est demandée « à la volée » pendant l'Anamnese (`CONTEXT.md` § Examen, Stuttgart l.359) et notée dedans. Un axe Aufklärung à 25 % de S — et à 0 si jamais joué — fausse l'indice dans les deux sens.
- **Verdict** : **refusé, remplacé** — S = moyenne des **3 parties de l'examen** ; les évaluations d'Aufklärung entrent dans le pool de l'axe Anamnese avec un poids × 0,5 (sous-partie courte) ; un axe jamais joué vaut **0** dans la formule et s'affiche « — nicht getestet · compte 0 jusqu'à ta première simulation ». `computeReadiness` (accueil) reste tel quel — écart documenté dans le spec, à résorber quand `HomePage` migrera vers le BI.

### 1.6 Tirage imposé, verrouillage total, fin dure, pas de pause (D2, D4, D5)

- **Action récompensée** : accepter les conditions réelles.
- **Preuve** : Reutlingen l.2771 « Irgendwann sagten die Prüfer, dass meine Zeit vorbei sei, und ich konnte nur noch einen letzten Satz sagen » ; « Nach 20 Minuten wurde mir gesagt, ich solle gehen, sie nahmen meine Notizen ».
- **Verdict** : **accepté**. Voir §1.8 pour les conditions qui font que cela apprend au lieu de stresser.

### 1.7 Minutage 20/20/20 et l'incohérence 12/20 (question 5)

- **Faits** : Anamnese 20 et Dokumentation 20 sont sourcés dans les protocoles (Stuttgart l.512 ; Reutlingen l.331, l.2771 ; Karlsruhe l.1178, l.4419). La 3ᵉ partie « ~20 » n'a que le livre (`ANALYSE.md` l.33) comme source directe — **mais les protocoles la décomposent** : Freiburg l.1378 « in Freiburg ist das AA-Gespräch **15 Minuten** und Vokabeltest **5 Minuten** » ; Stuttgart l.1449 « Liste mit Fachbegriffen … **5 Minuten** », l.3964 « FB-Liste. Es dauert 5 Minuten » ; Stuttgart l.4211 « Er hat 15 Minuten spontan gesprochen ». Le 12 min du Runner entraînement vient du commit initial `53b209d`, sans source.
- **Hors périmètre confirmé** pour le mode entraînement (le spec ne touche pas `SimulationRunner.tsx`).
- **Recommandation mode examen (appliquée)** : Partie 3 = **20:00 au total** (seule valeur sourcée pour l'enveloppe), avec dans le setup et le chrono la sous-structure sourcée « ≈ 15 min Arzt-Arzt-Gespräch + ≈ 5 min Fachbegriffe-Liste (BW : Freiburg, Stuttgart) ». Le spec n'implémente pas l'étape « liste de Fachbegriffe » (elle n'existe nulle part dans le Runner) : ticket de suite proposé (§4), **pas** d'invention de durée.
- **Recommandation mode entraînement (ticket, hors spec)** : 12 → **15 min** de Fallvorstellung suivies du « Drill des termes du cas » existant (`SimulationRunner.tsx` l.566) présenté comme les 5 min de Fachbegriffe-Liste. Le total redevient 20, sourcé.

### 1.8 Le mode examen lui-même : apprend-il ou stresse-t-il ? (question 6)

Un examen blanc apprend **si et seulement si** il produit un débrief exploitable et qu'il est espacé. Sans cela, c'est de l'exposition au stress sans consolidation. Conditions, appliquées au spec :

1. **Débrief obligatoire sur l'écran de résultat** (Free) : par partie, score et seuil ; les items de checklist manqués (ce sont les seules traces objectives) ; le critère de langue le plus bas ; le temps consommé ; **une** action suivante, gratuite (« rejoue ce cas en Autonome », « fais un Arztbrief sur ce cas »). Le BI avant → après vient après ce débrief, pas avant.
2. **Fréquence conseillée, jamais imposée** (« le cœur est illimité ») : dans le setup, « recommandé : au plus un Prüfungstag par semaine, après ≥ 3 simulations Autonome ; le dernier 3 à 5 jours avant l'examen ». Étiqueté « conseil pédagogique », pas fait d'examen.
3. **Aucune relance** : pas de notification, e-mail, badge ou compteur « X jours sans Prüfungstag ». La date d'expiration du plafond est visible sur la page `/bereitschaft` uniquement.
4. **Abandon sans trace** (existant, §5.1) : conservé — enregistrer un abandon comme échec punirait la lucidité.
5. **Un mot de contexte au top départ** (existant : nom, âge, motif) + le rappel « comme à l'examen, tu ne connais pas le cas » — pas d'ajout.

**Verdict** : **accepté, modifié** (conditions 1–3 ajoutées ; 4–5 déjà présentes).

## 2. Pricing / Free vs Pro (question 3)

Le pricing lui-même (page, prix, résiliation) appartient au pipeline #8 — **non vérifié ici**. Ce que je relis : la frontière Free/Pro *dans cette feature* et la carte de fallback.

- **Clarté** : la frontière est nette (chiffre + formule + composantes + listes = Free ; plan chiffré + historique + projection = Pro). Accepté.
- **Honnêteté** : le Free peut recalculer son indice à la main — vrai après §1.5 (plus de 30 magique). Accepté.
- **Alignement sur le cycle d'examen** : le plafond à 30 j et la décroissance 30/90 j suivent le cycle réel (inscription → 4-8 semaines). Accepté.
- **Fallback Free — pas un dark pattern, sous quatre conditions** (appliquées §7) :
  1. Le Free voit **quelle composante a le plus de marge** (« ton levier principal : Abdeckung ») — c'est une explication du chiffre, pas le plan ; le plan, c'est *combien* et *dans quel ordre*.
  2. La carte dit **exactement** ce que contient le Pro (trois éléments nommés) et rien d'autre : pas de « jusqu'à +X », pas de compte à rebours, pas de couleur d'alerte, pas d'apparition sur le résultat d'un Prüfungstag (le CTA Free y reste « Voir mon Bereitschaftsindex »).
  3. Titre « Voir comment progresser » (et non « atteindre 80 » quand BI ≥ 80 ou quand le plafond est la seule cause).
  4. L'hypothèse de calcul du gain Pro (« action réussie à 70 % ») est affichée à côté de chaque gain — un chiffre sans hypothèse est une promesse.
- Les recommandations gratuites existantes de `computeReadiness` (accueil) **restent gratuites** : on n'enlève rien.

## 3. Modifications appliquées au spec (section par section)

| Section | Changement |
|---|---|
| D7 | plafond levé uniquement par Prüfungstag **avec simulant** ; S sur 3 parties ; axe non testé = 0 |
| §5.1 | setup : conseil de fréquence (étiqueté conseil) ; sous-structure P3 affichée |
| §5.2 | ligne Fallvorstellung : sources protocoles (15 + 5) ; note « Fachbegriffe-Liste = ticket de suite » |
| §5.5 | écran de résultat : débrief d'abord (5 éléments), BI ensuite ; badge solo explicite |
| §6.1 | formule affichée : S sur Anamnese/Dokumentation/Fallvorstellung, Aufklärung dans Anamnese ; « jamais joué = 0, affiché — » ; plafond « avec simulant » ; phrase C à deux nombres |
| §6.2 | définitions : pool Anamnese (+ aufklaerung × 0,5) ; `eff[a] = axis[a] ?? 0` ; `hasRecentPassedExamDay` exige `withSimulant === true` ; `c.outsidePlan` ; `capExpiresAt` |
| §6.3 | interface `Bereitschaft` : `s.byAxis` sur 3 axes + `tested` ; `c.outsidePlan` ; `capExpiresAt`, `leverage` |
| §7 | fallback Free : 4 conditions ; hypothèse 70 % affichée en Pro ; aucune relance |
| §10 | ligne Free 12 cas : deux nombres ; ligne « Prüfungstag solo » |
| §11–12 | CA-7, CA-8, CA-11 ajustés ; **CA-16** (débrief), **CA-17** (aucune relance) ajoutés |
| §14 | vocabulaire : « Prüfungstag solo », « Débrief » |
| §15 | risque 12/20 : recommandation ; risque « Free connaît ses 12 cas » ajouté |
| §16 | écart `computeReadiness` reformulé (0 dans les deux, l'écart est le nombre d'axes) |

## 4. Propositions hors de mon périmètre (pas de modification)

| Destinataire | Proposition |
|---|---|
| `spec-pruefungstag` | aligner ADR-0013 §Décision 1–2 sur §6.1 (3 parties, 0 pour non testé, plafond « avec simulant ») — 3 lignes |
| `arch-pruefungstag` | `docs/contracts/entitlements.md` : « 12 cas Free (un par spécialité majeure) » → « 12 cas Free, 8 spécialités » (fait vérifié `seedCases.ts`) |
| `arch-pruefungstag` | payload `exam_day.completed` : `bereitschaft.capped` prend aussi `'solo'` (Prüfungstag sans simulant) |
| `lead` (ticket, autre pipeline) | mode entraînement : Fallvorstellung 12 → 15 min + Drill = 5 min Fachbegriffe-Liste (sources §1.7) |
| `lead` (ticket de suite #2) | étape « Fachbegriffe-Liste » 5 min en P3 du Prüfungstag (termes du cas, écrit, sans aide) |

## 5. Métrique qui prouve l'apprentissage (pas l'occupation)

Une seule, calculable depuis `exam_day.completed` : **part des candidats dont le 2ᵉ Prüfungstag avec simulant est réussi alors que le 1ᵉʳ ne l'était pas**, à ≥ 7 jours d'écart. Si cette part ne monte pas, le mode examen stresse sans apprendre — et le débrief (§1.8) est à revoir avant toute autre chose. Métrique de vanité à ne **pas** suivre : nombre de Prüfungstage par utilisateur.

## 6. Non vérifié

- Minutage hors BW (aucun `docs/exam/<land>.md`) ; le « 15 + 5 » est attesté à Freiburg et Stuttgart, pas à Karlsruhe ni Reutlingen explicitement.
- Le prix, la page pricing et la résiliation en un clic (pipeline #8).
- Le comportement réel de la détection « simulant connecté » (canal `fsp-patient-sync`) — si elle est peu fiable, la condition « avec simulant » du plafond deviendra punitive par accident : à tester par `build` (CA-11) et à surveiller.
- Les hypothèses de fréquence (« 1 par semaine ») sont un conseil de pratique espacée, pas un fait d'examen.
