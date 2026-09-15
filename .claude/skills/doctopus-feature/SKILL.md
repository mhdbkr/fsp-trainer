---
name: doctopus-feature
description: Porte d'entrée UNIQUE pour développer un sous-projet Doctopus de bout en bout — de l'intention à la PR mergée — en enchaînant les skills de la méthode (Superpowers × Matt Pocock × Agent Skills) avec un gate entre chaque étape. À invoquer avec le sous-projet en argument (ex. `/doctopus-feature "#2 Prüfungstag-Simulator + Bereitschaftsindex"`). Reprend là où le ledger s'est arrêté si la branche existe déjà.
---

# /doctopus-feature — un sous-projet, une chaîne, des gates

**Argument** : le sous-projet (numéro et titre de `PRODUCT-VISION.md` / issue `epic`).
**Invariant** : une session = un sous-projet = une branche `feat/<slug>` = une issue
`epic`. Le ledger `.superpowers/sdd/progress.md` est la seule vérité sur « où on en est ».

Annonce au démarrage : « Sous-projet <X> — étape <N> selon le ledger. » Ne saute
jamais une étape ; ne passe jamais un gate rouge. Ce skill n'implémente rien
lui-même : il **invoque** les skills ci-dessous, dans l'ordre, et vérifie le gate.

## 0 · Reprise ou démarrage

```
cat .superpowers/sdd/progress.md 2>/dev/null   # existe → reprendre à la première étape non cochée
git branch --show-current                      # main → créer feat/<slug> ; sinon vérifier que c'est la bonne branche
gh issue list --label epic --search "<X>"      # pas d'epic → en créer une (mattpocock:to-tickets)
```
Invoquer `dept-coordination` (les règles opposables), puis le `dept-*` du pôle
dominant du sous-projet (produit / expérience / contenu / fondations / croissance).

## 1 · Comprendre — gate : intention validée par la direction

`interview-me` (ce que Mehdi veut vraiment) → `idea-refine` (divergence /
convergence) → `mattpocock:grilling` (les questions qui fâchent).
Sortie : hypothèses surfacées en clair, questions ouvertes tranchées ou
explicitement reportées. **Gate** : Mehdi confirme l'intention en une phrase.

## 2 · Concevoir — gate : spec committé et relu

`superpowers:brainstorming` : une question à la fois ; si le sujet couvre plus
d'un sous-système, **décomposer d'abord** ; 2–3 approches avec recommandation ;
design par sections validées une à une ; spec écrit dans
`docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` ; self-review
(placeholders, contradictions, ambiguïtés, périmètre).
Puis `mattpocock:domain-modeling` → termes nouveaux dans `CONTEXT.md` ;
`documentation-and-adrs` → une ADR par décision structurante.
Si le sous-projet touche données ou serveur : dispatcher `platform-architect`
(Opus) pour les contrats **avant** le plan ; s'il touche la pédagogie, la
gamification ou les prix : `product-pedagogy-designer` (veto, ADR-0008).
Puis `agentops:red-team` sur le spec : hypothèses non dites, trous, affirmations
non prouvées — chaque trou est fermé dans le spec ou reporté explicitement.
**Gate** : spec committé, red-team sans trou ouvert, relu par Mehdi, critères
d'acceptation testables.

## 3 · Planifier — gate : plan self-reviewed, issues créées

`superpowers:writing-plans` : tâches de 2–5 min, code inclus, TDD, fichiers
exacts, interfaces entre tâches ; self-review (couverture du spec, placeholders,
cohérence des types). `mattpocock:to-tickets` → une issue par tranche, liée à
l'epic. Puis `agentops:pre-mortem` sur le plan, AVANT le premier dispatch :
« le sous-projet a échoué — pourquoi ? » ; chaque mode d'échec plausible reçoit
une parade dans le plan (tâche, test, contrainte globale) ou est accepté par
écrit. **Gate** : chaque exigence du spec pointe vers une tâche ; chaque mode
d'échec du pre-mortem a sa parade.

## 4 · Construire — gate : ledger complet, CI verte à chaque tranche

`superpowers:subagent-driven-development` : un implémenteur frais par tâche
(brief par fichier via `task-brief`, modèle **explicite**, périmètre du rôle
`DOCTOPUS-AGENTIC-ORG.md` §4), revue par tâche (`quality-task-reviewer`), fix,
re-revue, ledger. Sous-skills que chaque implémenteur invoque : `incremental-
implementation`, `test-driven-development`, `source-driven-development` (API
externes), `doubt-driven-development` (paiement, RLS, sync, irréversible).
Après chaque tâche **observable** : vérification navigateur (`playwright-cli`,
DOM de l'app). Après chaque tranche : `dept-experience` → `impeccable` en mode
critique sur tout écran touché.
**Gate** : Definition of Done de `dept-coordination` pour chaque tâche.

## 5 · Revoir — gate : aucun Critical / Important ouvert

Revue finale de branche : `quality-branch-reviewer` (Opus) avec le package
`review-package <base> HEAD` ; `security-auditor` si auth / paiement / données ;
`ux-user-advocate` si un écran a changé ; `code-simplification` sur les hotspots.
Appliquer avec `receiving-code-review` : un seul fixeur pour toute la liste.
Toute décision **irréversible** rencontrée en route (fork d'architecture,
fournisseur, migration destructive, ADR) passe par `agentops:council` : juges
indépendants, verdict consigné dans l'ADR.
**Gate** : tout Critical/Important fermé avec test ; mineurs consignés en fin de
plan ; council en accord sur l'irréversible.

## 6 · Livrer — gate : PR mergeable, CI verte, preuves consignées

`superpowers:verification-before-completion` (preuve, pas impression, pour
chaque critère d'acceptation → section « Vérification » en fin de plan) →
`superpowers:finishing-a-development-branch` → PR (`gh pr create`) → CI verte
→ `coord-release-manager` pour le go/no-go → merge par Mehdi.
Après le merge : `agentops:post-mortem` sur l'arc entier — ce qui a surpris, ce
que la revue a attrapé que le plan aurait dû prévoir, ce qui a coûté. Les
apprentissages vont dans `CLAUDE.md` (règles opposables) ou le skill `dept-*`
concerné, jamais seulement dans la mémoire de session.
Mémoire projet mise à jour (`~/.claude/.../memory/`) : pièges, décisions, suivis.

## 7 · Quand ça casse (à n'importe quelle étape)

`superpowers:systematic-debugging` : reproduire → localiser → corriger →
**verrouiller par un test**. Un bug sans test de non-régression n'est pas corrigé.

## Plugins UI — attributions fermées (ne pas rediscuter)

| Plugin | Rôle | Qui |
|---|---|---|
| `impeccable` | Critique et affinage d'écrans existants (`critique`, `distill`, `clarify`, `polish`, `animate`) — **étape 4 et 5** | `ux-motion-designer`, `front-design-keeper`, revue UI |
| `taste-skill` | Anti-slop pour le **site marketing** (#8) uniquement — jamais sur l'app, dont la charte est décidée | `site-implementer` |
| `bencium-controlled-ux-designer` | Repli quand `impeccable` ne suffit pas : demande avant chaque décision, respecte la charte | `front-implementer` (écran neuf) |
| `bencium-innovative`, `bencium-impact` | **Non utilisés** — poussent vers l'extrême, contredisent la charte (concept aura rejeté) | — |
| `gsd-core` | **Non utilisé** — système de planification concurrent (`.planning/`, ses agents, son CLAUDE.md) : l'adopter recrée la dispersion | — |

## Ce que ce skill refuse

- Commencer le code sans spec approuvé (étape 2) — « c'est simple » n'est pas une raison.
- Un dispatch sans modèle explicite, ou avec le plan entier collé dans le prompt.
- Une étape 6 sans preuve écrite par critère d'acceptation.
- Deux sous-projets dans une même session ou une même branche.
