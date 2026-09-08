# L'équipe — organisation du travail assisté par agents

> Réponse à FB-I1 et FB-I2 du backlog. Ce document dit **qui fait quoi, quand,
> et avec quel livrable vérifiable**. Il est écrit pour être exécuté, pas pour
> décorer : chaque rôle correspond à une définition d'agent réelle dans
> `.claude/agents/`.

---

## 1. Le principe qui gouverne tout

**On ne paie jamais un agent pour ce qu'un script fait mieux et pour rien.**

Ce n'est pas une posture d'économie, c'est un constat mesuré sur ce projet. Sur
les lots 5 à 12 de production de contenu, les agents de vérification ont échoué
**9 fois sur 12** (limites de session, veille de la machine, connexion perdue).
Cela n'a **jamais** bloqué une livraison : le gate déterministe attrapait tout
ce qui comptait — y compris les deux erreurs médicales bloquantes de la COPD
(critères d'Anthonisen mal comptés, score mMRC incohérent avec le symptôme).

À l'inverse, quand les agents tournaient, ils produisaient aussi des **faux
positifs** : sur la revue de la cystite, 2 objections sur 5 étaient fausses —
des Muster déclarés « absents » alors qu'ils étaient tronqués dans l'objet
transmis, une prognose « contradictoire » qui était une fourchette cohérente.

D'où l'architecture en trois couches, du moins cher au plus cher :

| Couche | Qui | Coût | Ce qu'elle tranche |
|---|---|---|---|
| **0 · Mécanique** | `.github/workflows/quality.yml` | gratuit, à chaque push | Ce qui est vérifiable **sans jugement** : contrats de contenu, types, build |
| **1 · Jugement** | les 5 agents de `.claude/agents/` | payant, à la demande | Ce qu'aucun script ne peut trancher : exactitude clinique, langue, verbosité, ergonomie, bugs de parcours |
| **2 · Décision** | Mehdi | — | Ce qui engage le produit : arbitrages, priorités, mise en production |

Un agent qui refait le travail de la couche 0 est un agent mal employé.

---

## 2. La couche 0 — le gate mécanique

Tourne à chaque push et sur chaque PR. **Bloquant :**

| Validateur | Ce qu'il garantit |
|---|---|
| `checkProbeCoverage.mjs` | Chaque cas répond à **toutes** ses sondes d'anamnèse applicables |
| `checkMusterCoverage.mjs` | 9 chapitres d'Arztbrief + 12 de Fallvorstellung, pour chaque cas |
| `checkCaseCoherence.mjs` | Nom, âge, sexe, IMC, Packungsjahre cohérents dans toute la fiche |
| `checkGuideCoverage.mjs` | Toute question **affichée** par le guide a sa réponse côté simulant |
| `npm run typecheck` · `npm run build` | Le code compile et se construit |

**Informatifs** (signalent sans bloquer) : `checkCaseCohesion.mjs` (DD non
neutralisées), `checkProbeOverlap.mjs` (recouvrements de sondes).

> Quand un défaut se répète, la bonne réponse n'est pas de mieux briefer un
> agent : c'est **d'écrire un validateur**. `checkGuideCoverage.mjs` est né
> comme ça, d'un trou structurel que trois relectures humaines n'avaient pas vu.

---

## 3. La couche 1 — les cinq rôles

Chacun a un périmètre **exclusif** : on ne demande pas à un relecteur médical
de juger la longueur, ni à un éditeur de juger la clinique. C'est ce qui rend
les rapports fusionnables et évite les jugements mous.

| Agent | Question unique | Livrable vérifiable |
|---|---|---|
| `fsp-clinical-reviewer` | Le contenu est-il médicalement juste et cohérent avec lui-même ? | Constats avec citation exacte + correctif ; recalcule IMC, py, seuils |
| `fsp-language-reviewer` | La langue tient-elle le niveau et le registre de l'examen ? | Chaque faute avec sa **phrase corrigée** prête à copier |
| `fsp-concision-editor` | Ce texte aide-t-il à passer l'examen, ou encombre-t-il ? | Version resserrée + compte de caractères avant/après, vs médiane du corpus |
| `fsp-ux-auditor` | L'interface tient-elle la charte, l'accessibilité, le responsive ? | Mesures DOM et captures, pas des impressions |
| `fsp-qa-tester` | Est-ce que ça marche vraiment, de bout en bout ? | Bugs avec **étapes → attendu → obtenu** |

Tous sont en **lecture seule** (`Read, Grep, Glob, Bash`) : un relecteur ne
corrige pas ce qu'il relit. La correction revient à l'orchestrateur, qui voit
tous les rapports et arbitre les conflits.

### La règle qui les lie

Tous rendent le format de `.claude/agents/_FORMAT.md`, avec une règle absolue :
**aucun constat sans preuve citée**, et une section `## Non vérifié` en fin de
rapport. « Je n'ai pas pu vérifier » est une information utile ; une affirmation
non étayée est un coût.

---

## 4. Comment ils travaillent ensemble

**Ils ne se parlent pas.** Un sous-agent est lancé, travaille isolément, rend
un rapport. Il n'y a pas de conversation entre agents — le prétendre
produirait une organisation qui ne tourne pas.

Ce qui les fait travailler **ensemble**, c'est trois choses :

1. **Un format de constat commun** → les rapports se concatènent et se trient
   par sévérité sans retraitement.
2. **Des périmètres disjoints** → deux agents ne peuvent pas se contredire sur
   le même objet ; s'ils le font, c'est que le périmètre est mal découpé.
3. **Un point de fusion unique** → l'orchestrateur (moi, ou un script
   `Workflow`) fait l'éventail, fusionne, dédoublonne, arbitre, applique.

```
                    ┌── fsp-clinical-reviewer ──┐
                    ├── fsp-language-reviewer ──┤
  gate mécanique ──▶├── fsp-concision-editor ───┤──▶ fusion ──▶ correctifs ──▶ Mehdi
      (couche 0)    ├── fsp-ux-auditor ─────────┤   (orchestr.)   (commits)     (décision)
                    └── fsp-qa-tester ──────────┘
```

L'éventail est **parallèle** : les cinq n'ont aucune dépendance entre eux. Mais
le gate mécanique passe **avant** — inutile de payer cinq relectures sur un
contenu qui ne compile pas ou dont une sonde est vide.

---

## 5. Les rituels — quand lancer quoi

| Moment | Couche 0 | Agents à lancer |
|---|---|---|
| **Chaque push** | automatique | aucun |
| **Après un lot de contenu** | automatique | `clinical` + `language` + `concision` |
| **Après une modification d'écran** | automatique | `ux-auditor` |
| **Après une modification du moteur de simulation** | automatique | `qa-tester` |
| **Avant une livraison** | automatique | les cinq |
| **Revue trimestrielle** | automatique | les cinq, sur tout le corpus |

**Règle de relance** : si un agent échoue sur une limite de session, ne le
relance pas en boucle — le travail déjà abouti est mis en cache par
`resumeFromRunId`, et la couche 0 couvre l'essentiel en attendant.

---

## 6. Ce que l'équipe ne fait pas

À dire clairement, pour ne pas se raconter d'histoires :

- **Elle ne remplace pas le jugement de Mehdi.** Les agents produisent des
  constats ; les arbitrages produit (quelle pathologie ajouter, quel prix,
  quelle priorité) ne sont pas délégables.
- **Elle ne valide pas médicalement l'app pour un usage clinique.** FSP-Cockpit
  est un outil de préparation linguistique, pas une aide à la décision
  médicale. Aucun agent ne certifie quoi que ce soit.
- **Elle ne tourne pas toute seule en continu.** Chaque lancement coûte. Les
  rituels ci-dessus sont un plafond, pas un minimum.
- **Elle ne corrige pas.** Les cinq sont en lecture seule, par conception.

---

## 7. Faire évoluer l'équipe

Ajouter un agent se justifie quand **un type de défaut échappe aux cinq
existants ET ne peut pas devenir un validateur**. Dans l'ordre de préférence :

1. Le défaut est mécanique → **écrire un validateur** (couche 0).
2. Le défaut relève d'un périmètre existant → **enrichir l'agent** concerné.
3. Le défaut est vraiment nouveau → **créer un agent**, avec un périmètre
   exclusif et un livrable vérifiable, sinon il diluera les autres.

Candidats identifiés mais **non créés** faute de besoin démontré : un agent
« pédagogie » (la progression d'apprentissage est-elle juste ?), un agent
« sécurité/données » (à ouvrir si l'app quitte le tout-local — voir
`ROADMAP-PRODUCTION.md`).
