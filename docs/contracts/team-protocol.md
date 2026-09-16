# Protocole d'équipe — comment les agents Doctopus se passent la main

> Contrat lu par TOUS les agents. Il définit les pipelines, les noms, les
> messages de handoff, les gates humains et les règles de parallélisme.
> La mécanique sous-jacente est `SendMessage` vers des agents **nommés** ; un
> agent lit `.superpowers/teams/<slug>/state.md` pour savoir où en est son
> pipeline et **écrit** dedans avant de passer la main.

## 1. Un sous-projet = un pipeline = un dossier d'état

```
.superpowers/teams/<slug>/
  state.md          ← la vérité : étape courante, gates, artefacts, blocages
  handoffs.log      ← une ligne par message envoyé (de → à, étape, résumé)
  briefs/           ← briefs de tâches (task-brief)
  reports/          ← rapports des agents
```

Le pipeline suit les étapes de `/doctopus-feature` : **1 comprendre → 2
concevoir → 3 planifier → 4 construire → 5 revoir → 6 livrer**.

## 2. Les rôles nommés d'un pipeline (nom = `<rôle>-<slug>`)

| Nom | Agent de base | Étape | Passe la main à |
|---|---|---|---|
| `lead-<slug>` | orchestrateur du pipeline (session principale ou agent `general-purpose` Opus) | toutes | dispatch initial, arbitrage, gates humains |
| `spec-<slug>` | `product-spec-writer` | 1–2 | `arch-<slug>` si données/serveur, sinon `plan-<slug>` ; `pedagogy-<slug>` si pédagogie/prix/gamification |
| `pedagogy-<slug>` | `product-pedagogy-designer` | 2 (veto) | retour à `spec-<slug>` (veto motivé) ou `plan-<slug>` |
| `arch-<slug>` | `platform-architect` | 2b (contrats) | `plan-<slug>` |
| `plan-<slug>` | orchestrateur (`writing-plans` + `to-tickets`) | 3 | `build-<slug>` |
| `build-<slug>` | orchestrateur SDD (dispatch implémenteurs + `quality-task-reviewer` par tâche) | 4 | `review-<slug>` |
| `review-<slug>` | `quality-branch-reviewer` (+ `security-auditor`, `ux-user-advocate` selon le périmètre) | 5 | `fix-<slug>` si findings, sinon `ship-<slug>` |
| `fix-<slug>` | implémenteur du pôle (un seul, toute la liste) | 5 | `review-<slug>` (re-revue) |
| `ship-<slug>` | `coord-release-manager` | 6 | **DIRECTION** (merge) |

Les implémenteurs par tâche (étape 4) ne sont **pas** nommés durablement : ils
sont dispatchés par `build-<slug>`, rendent un rapport, et disparaissent
(contexte frais par tâche — principe du SDD).

## 3. Le message de handoff — format obligatoire

Première ligne = phrase autonome (c'est l'aperçu). Puis :

```
HANDOFF <slug> · étape <N> → <N+1>
De : <nom>            À : <nom>
Artefact : <chemin(s) produit(s)>
Gate franchi : <quel gate, quelle preuve>
À faire : <la tâche du destinataire en une phrase>
Blocages : <aucun | description>
```

Avant d'envoyer : mettre à jour `state.md` (étape, artefact, gate) et ajouter
une ligne à `handoffs.log`. **Un handoff sans artefact committé est invalide.**

## 4. Les gates humains — où la direction intervient (et seulement là)

| Gate | Qui l'ouvre | Ce que Mehdi fait |
|---|---|---|
| **G1 · Intention** (fin étape 1) | `spec-<slug>` → `main` | confirme l'intention en une phrase, ou corrige |
| **G2 · Spec** (fin étape 2) | `spec-<slug>` → `main` | relit le spec, valide ou demande des changements |
| **G6 · Merge** (fin étape 6) | `ship-<slug>` → `main` | merge la PR (ou refuse) |

Tout le reste (plan, construction, revues, fixes, CI, PR) est **autonome**.
Un agent qui rencontre un choix qui change matériellement le produit escalade
vers `main` avec `BLOCKED` + les options — il ne devine pas.

En attendant une réponse humaine, le pipeline **ne s'arrête pas** : il
avance sur tout ce qui ne dépend pas de la réponse (ex. pendant G2, `arch`
peut préparer les contrats en brouillon marqué « sous réserve »).

## 5. Parallélisme — la règle et la carte

**Règle** : deux pipelines tournent en parallèle si et seulement si leurs
**périmètres d'écriture** ne se recouvrent pas ET qu'aucun ne dépend d'un
artefact non livré de l'autre. Chaque pipeline a son **worktree** (`git
worktree add ../doctopus-<slug> -b feat/<slug> main`) — un seul writer par
worktree, jamais deux.

Carte des dépendances (backlog §6 de `DOCTOPUS-AGENTIC-ORG.md`) :

```
#1 Fondations (livré) ──┬──▶ #2 Prüfungstag ──▶ #9 Ligue ──▶ #11 Protocoles
                        ├──▶ #3 Fachbegriffe            └──▶ #12 Kammern (dépend de #2)
                        ├──▶ #4 Arztbrief IA ──┐
                        └──▶ #5 Binôme en ligne │
#6 Personnages + Akademie + démo voix ──────────┴──▶ #13 Patient IA vocal
#7 Fachwissen visuel  (indépendant)
#8 Site (dépend de #1 pour le pricing réel) ──▶ #10 Marketing autonome
```

**Vagues de lancement** (ce qui peut tourner en même temps) :

| Vague | Pipelines parallèles | Pourquoi ensemble |
|---|---|---|
| **V1** | #2 Prüfungstag · #6 Personnages · #7 Fachwissen visuel · #8 Site | quatre périmètres disjoints (features/simulation+lib/readiness · characters/ · data/fachwissenVisuals+components/visuals · apps/site) |
| **V2** | #3 Fachbegriffe · #4 Arztbrief IA · #5 Binôme en ligne | après V1 ; disjoints entre eux (features/fachbegriffe · functions/ai-* · simulation/online) |
| **V3** | #9 Ligue · #12 Kammern · #10 Marketing | après #2 et #8 |
| **V4** | #11 Protocoles · #13 Patient IA vocal | après #9, #4, #6 |

**Périmètres d'écriture de la vague V1** (fixés ici pour éviter tout recouvrement) :

| Pipeline | Écrit dans | Ne touche pas |
|---|---|---|
| `pruefungstag` (#2) | `app/src/features/readiness/`, `app/src/lib/readiness/`, `app/src/features/simulation/examDay*` (nouveaux fichiers), événement `exam_day.completed` (contrat via `arch`) | `features/simulation/SimulationRunner.tsx` hors ajout d'un point d'entrée « mode examen » |
| `characters` (#6) | `app/src/characters/`, `app/src/features/akademie/`, `app/public/voice-demo/` (audio statique), `docs/contracts/characters.md` (via `arch`) | `components/visuals/`, `features/fachwissen/` |
| `fachwissen-visuals` (#7) | `app/src/components/visuals/`, `app/src/data/fachwissenVisuals/`, `app/src/features/fachwissen/` (intégration), `docs/contracts/fachwissen-visuals.md` (via `arch`) | `characters/`, `akademie/` |
| `site` (#8) | `apps/site/`, `packages/tokens/`, `docs/legal/`, `docs/brand/` | `app/src/` (la migration `app/` → `apps/app` est une tâche FINALE du pipeline, après accord de `main`, quand aucun autre pipeline V1 n'est ouvert) |

Conflits connus à arbitrer par `lead` avant de lancer une vague : `#2` et `#5`
touchent tous deux `features/simulation/` — #5 attend V2 ; `#6` et `#7`
peuvent partager `components/` — périmètres fixés dans les briefs
(`characters/` vs `components/visuals/`).

## 5b. Ressources partagées entre pipelines parallèles

Un seul Supabase local, une seule base, un seul serveur de fonctions — partagés
par tous les worktrees. Règles :
- **Ports Vite** : chaque pipeline lance son dev server sur son port
  (`npm run dev -- --port 51<NN>`, NN = numéro du sous-projet : #2 → 5102,
  #6 → 5106, #7 → 5107, #8 → 5108 ; le site sur 5180). Les sondes
  `playwright-cli` utilisent une session nommée par pipeline (`-s=<slug>`).
- **Migrations** : uniquement via `arch-<slug>` et appliquées sur la base
  vivante avec `psql` ; jamais `db reset` (efface le contenu publié).
  Deux pipelines qui ont besoin d'une migration la même semaine → `main`
  sérialise.
- **Comptes de test** : e-mails préfixés par le slug (`pruefungstag-a@test.dev`).
- **`.env`** : copié depuis le worktree principal (`app/supabase/.env`,
  `app/.env`) — jamais committé, jamais dans un message.
- **Fonctions Edge** : un seul `functions serve` (celui du worktree principal).
  Un pipeline qui ajoute une fonction demande à `main` un redémarrage.

## 6. Fusion et intégration

- Chaque pipeline livre une PR vers `main`. La direction merge dans l'ordre
  des vagues. `lead` rebase les pipelines encore ouverts après chaque merge.
- Les contrats (`docs/contracts/`) sont modifiés **uniquement** par
  `platform-architect`, un pipeline à la fois : un pipeline qui a besoin d'un
  contrat pendant qu'un autre le modifie attend (blocage explicite dans
  `state.md`, jamais une seconde modification concurrente).

## 7. Ce qu'un agent fait quand il reçoit un HANDOFF

1. Lit `state.md` du pipeline (pas la conversation — il n'y a pas accès).
2. Invoque le skill `dept-*` de son pôle, puis les skills de son étape.
3. Fait son travail dans son périmètre ; écrit son rapport dans `reports/`.
4. Met à jour `state.md` ; ajoute une ligne à `handoffs.log`.
5. Envoie le HANDOFF au suivant — ou `BLOCKED` à `main` avec les options.

Un agent qui ne trouve pas `state.md` ne devine pas : il demande à `main`.

## Worktrees — fichiers ignorés à copier

`git worktree add` ne copie PAS les fichiers ignorés : `app/.env` (clés Supabase
locales) et `app/supabase/.env` (Stripe sandbox) manquent dans tout nouveau
worktree. Sans `app/.env`, la chaîne de boot rend une page VIDE sans erreur —
sonde trompeuse. `/doctopus-run` les copie à la création ; un lead qui trouve
`body` vide vérifie d'abord ces deux fichiers.
