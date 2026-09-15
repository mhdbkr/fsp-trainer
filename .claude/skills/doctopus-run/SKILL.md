---
name: doctopus-run
description: LANCE l'équipe autonome Doctopus sur une vague de sous-projets parallèles — crée un worktree et un pipeline nommé par sous-projet, dispatche les leads en arrière-plan, et ne remonte à la direction qu'aux trois gates humains (intention, spec, merge). À invoquer avec une vague ou une liste (ex. `/doctopus-run V1` ou `/doctopus-run "#2,#6"`). `/doctopus-run status` pour l'état ; `/doctopus-run resume` pour reprendre après une coupure.
---

# /doctopus-run — l'équipe travaille, la direction arbitre aux gates

Tu es la session principale (`main`). Tu ne codes pas, tu ne rédiges pas de
spec : tu **lances des pipelines**, tu **relaies les gates humains**, tu
**débloques**. Lis d'abord `docs/contracts/team-protocol.md` (obligatoire) et
invoque `dept-coordination`.

## Arguments
- `V1` … `V4` : une vague de la carte (`team-protocol.md` §5).
- `"#2,#6"` : une liste explicite — tu VÉRIFIES toi-même que leurs périmètres
  d'écriture sont disjoints avant de lancer (sinon tu sérialises et tu le dis).
- `status` : lis chaque `.superpowers/teams/*/state.md` et rends un tableau
  (slug · étape · gate en attente · dernier handoff · blocage).
- `resume` : pour chaque pipeline dont `state.md` n'est pas à l'étape 6-livré,
  réveille son `lead-<slug>` par `SendMessage` avec « reprends depuis state.md ».

## Lancement d'une vague — procédure exacte

1. **Pré-vol** (une seule fois) :
   ```bash
   git -C "$(git rev-parse --show-toplevel)" status --short | grep -v '^??' && echo "ARBRE SALE — committer ou stasher d'abord" 
   gh pr list --state open --json number,title,headRefName   # PR en attente de merge = à signaler
   ```
   Si une PR mergeable attend la direction (ex. Fondations), le dire en une
   ligne — ne pas bloquer le lancement pour autant.

2. **Pour chaque sous-projet `#N` de la vague** (slug = `pruefungstag`,
   `characters`, `fachwissen-visuals`, `site`, `fachbegriffe`, `arztbrief-ai`,
   `online-duo`, `league`, `marketing`, `protocols`, `kammern`, `voice-ai`) :
   ```bash
   ROOT=$(git rev-parse --show-toplevel)
   git -C "$ROOT" worktree add "../doctopus-<slug>" -b "feat/<slug>" main 2>/dev/null || true
   mkdir -p "$ROOT/.superpowers/teams/<slug>"/{briefs,reports}
   ```
   Écris `.superpowers/teams/<slug>/state.md` :
   ```
   # <slug> — pipeline
   epic: #<issue>   branche: feat/<slug>   worktree: ../doctopus-<slug>
   étape: 1   gate_attendu: G1   dernier_handoff: —   blocage: aucun
   périmètre_écriture: <depuis DOCTOPUS-AGENTIC-ORG.md §4 / team-protocol §5>
   ```

3. **Dispatch des leads — TOUS dans UN SEUL message, `run_in_background: true`,
   `name: "lead-<slug>"`, `model: opus`**, `subagent_type: general-purpose`.
   Prompt du lead (gabarit — remplacer <slug>, <#N>, <titre>) :

   > Tu es `lead-<slug>`, orchestrateur du pipeline du sous-projet <#N> <titre> de Doctopus.
   > Travaille EXCLUSIVEMENT dans le worktree `../doctopus-<slug>` (branche `feat/<slug>`) ; l'état de ton pipeline est `<ROOT>/.superpowers/teams/<slug>/state.md`.
   > Lis dans l'ordre : `docs/contracts/team-protocol.md`, `CLAUDE.md`, le skill `dept-coordination`, `app/docs/PRODUCT-VISION.md` §3 (ton innovation), `app/docs/DOCTOPUS-AGENTIC-ORG.md` §4 (les rôles de ton pôle) et §6 (ta ligne du backlog), l'issue `gh issue view <#issue>`.
   > Déroule `/doctopus-feature "<#N> <titre>"` étape par étape en DISPATCHANT les rôles nommés du protocole (`spec-<slug>`, `pedagogy-<slug>` si pédagogie/prix, `arch-<slug>` si données/serveur, puis `build-<slug>` = toi en SDD, `review-<slug>`, `fix-<slug>`, `ship-<slug>`), chacun avec le `subagent_type` de son agent de base, son modèle explicite (ADR-0009) et le format HANDOFF. Chaque rôle écrit son rapport dans `reports/` et met `state.md` à jour avant de passer la main.
   > Aux gates humains G1 (intention) et G2 (spec) : envoie à `main` par `SendMessage` un message dont la première ligne est « GATE G<k> <slug> : <question en une phrase> », avec le chemin de l'artefact — puis CONTINUE sur ce qui n'en dépend pas (contrats en brouillon, recherche, tests d'infra). Reprends l'étape suivante dès la réponse.
   > Étape 4 : subagent-driven development — un implémenteur frais par tâche (brief par fichier, modèle explicite, périmètre du rôle), `quality-task-reviewer` après chaque tâche, fix puis re-revue, ledger `.superpowers/sdd/progress.md` DANS TON WORKTREE.
   > Étape 5 : `quality-branch-reviewer` (Opus) sur `review-package <base> HEAD` ; `security-auditor` si auth/paiement/données ; `ux-user-advocate` si un écran a changé ; un seul fixeur pour toute la liste ; re-revue.
   > Étape 6 : preuves des critères d'acceptation en fin de plan, PR `gh pr create` vers main, CI verte, `coord-release-manager`, puis « GATE G6 <slug> : PR #<n> prête à merger » à `main`.
   > Ne touche JAMAIS : `docs/contracts/` (sauf via `arch-<slug>`), un fichier hors de ton périmètre d'écriture, le contexte Stripe live, `main`. Tout choix qui change le produit → `BLOCKED` à `main` avec les options. Vérifie par code de sortie ; mesure depuis le DOM de l'app.
   > Termine par un rapport dans `reports/lead-final.md` et un dernier message à `main`.

4. **Puis** : rends à la direction un tableau des pipelines lancés (slug,
   epic, worktree, périmètre) et **arrête-toi**. Les gates arriveront par
   message ; tu les relaies à Mehdi en une ligne chacun, tu transmets sa
   réponse au lead par `SendMessage`, et rien d'autre.

## Ce que `main` fait pendant que ça tourne
- Relayer les gates (texte de Mehdi → `SendMessage` au `lead-<slug>`).
- Sur `BLOCKED` : présenter les options à Mehdi ; transmettre le choix.
- Sur `HANDOFF … étape 6` : dire à Mehdi « PR #n prête », c'est tout.
- Après un merge : `SendMessage` à chaque lead encore ouvert : « main a
  avancé, rebase ton worktree ».
- Jamais de polling ; jamais « t'as fini ? » ; jamais coder à la place d'un
  pipeline.

## Reprise après coupure
`state.md` et le ledger SDD sont la vérité. `resume` réveille chaque lead par
son nom avec « reprends depuis state.md à l'étape <N> » — un nom continue de
fonctionner après la fin d'un agent (le send le reprend depuis son transcript).
