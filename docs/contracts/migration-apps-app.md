# Migration `app/` → `apps/app` — plan en une page

> **TÂCHE FINALE du pipeline #8, après accord explicite de `main`, quand aucun autre pipeline V1 (#2, #6, #7) n'est ouvert** (team-protocol §5 : leurs périmètres vivent dans `app/src/`, un `git mv` sous leurs pieds casserait chaque rebase). Ce document ne s'exécute pas ; il se lit.
> ADR-0010. Propriétaire : `platform-architect`.

## 0. Ce qui doit rester vrai avant, pendant, après

- CI verte à chaque commit de la migration (pas de « on répare après »).
- Le contenu publié en base n'est pas touché (aucune migration SQL, aucun `db reset`).
- L'URL GitHub Pages de l'app ne change pas (`deploy.yml` suit le dossier).
- Un seul writer (l'implémenteur de la tâche) ; `main` merge ; les autres pipelines V1 sont fermés.

## 1. Pré-requis (vérifiables)

| # | Condition | Preuve |
|---|---|---|
| P1 | `#2`, `#6`, `#7` mergés ou fermés | `git worktree list` sans `doctopus-pruefungstag/characters/fachwissen-visuals` ; aucune PR ouverte vers `main` touchant `app/src` |
| P2 | `apps/site` livré et CI job `site` vert | run CI |
| P3 | `packages/tokens` v0.1.x avec `check-parity` vert sur `main` | `npm test --prefix packages/tokens` exit 0 |
| P4 | Le `package-lock.json` racine **non suivi** du worktree principal est supprimé ou expliqué (bruit d'un `npm install` égaré : aucun `package.json` racine n'existe) | `git status` |

## 2. Étapes — un commit par ligne, CI verte entre chaque

| # | Action | Fichiers | Vérification (exit 0) |
|---|---|---|---|
| 1 | `git mv app apps/app` (un seul commit de déplacement, **aucun autre changement**) | tout `app/**` | `git diff --stat -M` ne montre que des renames |
| 2 | Chemins CI : `working-directory: apps/app`, `cache-dependency-path: apps/app/package-lock.json` (4 jobs de `quality.yml`, 1 de `deploy.yml` + `path: apps/app/dist`) | `.github/workflows/*.yml` | CI verte |
| 3 | `.gitignore` racine : `app/.env`, `app/.env.local`, `app/scratchpad/`, `app/supabase/.branches`, `app/supabase/.env`, `app/supabase/.temp` → préfixe `apps/app/` | `.gitignore` | `git status` ne révèle aucun secret ; `git check-ignore apps/app/.env` exit 0 |
| 4 | Docs opérationnelles : `CLAUDE.md` (commandes `cd app`, chemins `app/scripts`, `app/src/data/seed*.ts`, `app/docs/*`), `DEPLOY.md`, `docs/agents/*.md`, `team-protocol.md` §5 (périmètres) | 9 occurrences `app/` recensées dans `CLAUDE.md` + `docs/agents` | `grep -rn "\bapp/" CLAUDE.md docs/agents docs/contracts/team-protocol.md DEPLOY.md` → 0 hors historique |
| 5 | Racine : `package.json` avec `"workspaces": ["apps/*", "packages/*"]`, `package-lock.json` racine unique ; suppression de `apps/app/package-lock.json` et `apps/site/package-lock.json` ; `file:../../packages/tokens` du site → `"@doctopus/tokens": "*"` ; CI : `npm ci` à la racine, `cache-dependency-path: package-lock.json`, jobs avec `--workspace apps/app` | `package.json`, lockfile, `apps/site/package.json`, `.github/workflows/*.yml` | `npm ci && npm run build -w apps/app -w apps/site` exit 0 ; **lockfile racine = fichier partagé, commit par `main`** |
| 6 | L'app consomme les tokens : `apps/app/package.json` + `@doctopus/tokens` ; `tailwind.config.js` → `colors: tokens.color` (avec `paper: tokens.color.paper.DEFAULT`, etc.), `fontFamily`, `transitionTimingFunction.fluid`, `letterSpacing.tightish` ; `index.css` : `--focus-ring`, `--ease-out`, `--dur*` → `var(--dt-…)` via `@import '@doctopus/tokens/tokens.css'` ; les littéraux `.glass`/`.card` → `var(--dt-glass-…)` | `apps/app/tailwind.config.js`, `apps/app/src/styles/index.css`, `apps/app/package.json` | `npm run build -w apps/app` ; sonde `playwright-cli` : `getComputedStyle(document.body).backgroundColor` et `--dt-color-brand-500` lus **depuis le DOM** identiques avant/après (captures avant migration conservées dans `reports/`) |
| 7 | Supprimer `packages/tokens/scripts/check-parity.mjs` et son test (la source est le paquet) ; `tokens.md` §4.2 mis à jour ; `DOCTOPUS_APP_DIR` retiré | `packages/tokens/**`, `docs/contracts/tokens.md` | `npm test --prefix packages/tokens` exit 0 |
| 8 | Supabase : **rien ne bouge** dans cette migration (`apps/app/supabase/` reste ; `project_id = "app"` inchangé). Le déplacement vers `supabase/` racine (ADR-0010) est une décision séparée — proposée en ADR quand `packages/content-schema` existera | — | `supabase status` depuis `apps/app` |
| 9 | `ROADMAP-PRODUCTION.md`, `DOCTOPUS-AGENTIC-ORG.md` : note de migration ; ADR-0010 : conséquence « exécutée le … » | `apps/app/docs/*.md`, `docs/adr/0010-*.md` | relecture |

## 3. Risques identifiés (doubt-driven)

| Risque | Parade |
|---|---|
| Un rebase d'une branche ouverte sur `app/src` après l'étape 1 | P1 est bloquant ; `git mv` détecté comme rename (`-M`) aide, mais ne sauve pas les fichiers **créés** dans `app/` par la branche |
| `npm ci` racine change les versions résolues (dédoublonnage) → régression silencieuse (three, react) | après l'étape 5, `npm ls react three @supabase/supabase-js -w apps/app` doit donner les mêmes versions qu'avant ; `npm test -w apps/app` |
| Le `base: './'` de Vite et le hash-router : indépendants du dossier | vérifier l'URL Pages après l'étape 2 (QR de la fiche simulant) |
| Chemins absolus dans les mémoires/skills des agents (`app/scripts/check*.mjs`) | l'étape 4 traite `CLAUDE.md` et `docs/agents` ; les fichiers `.claude/skills/**` et `.claude/agents/**` sont grep-és de la même façon (`grep -rn "app/" .claude/`), même commit |
| Le hook `prepare` de tokens ne tourne pas sous workspaces avec `npm ci` selon les versions npm | le `prebuild` d'`apps/site` et un `pretest` d'`apps/app` appellent `node ../../packages/tokens/build.mjs` explicitement |

## 4. Retour arrière

Jusqu'à l'étape 5 incluse : `git revert` des commits dans l'ordre inverse (des renames purs). Après l'étape 6 : revert de 6–7 ramène l'app sur ses littéraux — les valeurs sont identiques par construction (check-parity vert à P3).

## 5. Estimation

Une journée d'agent Sonnet pour les étapes 1–5 et 7–9 ; l'étape 6 (charte lue depuis le paquet) demande un relecteur par tâche + sonde DOM avant/après — une demi-journée. `main` commit les étapes 2 et 5 (fichiers partagés).
