# Doctopus / FSP-Cockpit

Trainer pour la Fachsprachprüfung Medizin (React + TypeScript + Vite + Dexie,
hors-ligne d'abord), en cours de conversion en SaaS **Doctopus** (Supabase EU,
Stripe, crédits IA). L'app vit dans `app/` ; les sources brutes des cas sont à
la racine du dépôt.

## Documents de référence

- `app/docs/DOCTOPUS-AGENTIC-ORG.md` — organisation agentique (pôles, rôles, gates)
- `app/docs/ROADMAP-PRODUCTION.md` — feuille de route et verrous
- `app/docs/BACKLOG-FEEDBACK.md` — retours d'usage réel, source des chantiers UX
- `app/docs/AGENTIC-TEAM.md` — les 5 relecteurs de contenu (`.claude/agents/`)

## Règles de travail

- **Couche mécanique d'abord** : les validateurs de `app/scripts/check*.mjs`
  et la CI (`.github/workflows/quality.yml`) tranchent avant tout jugement
  d'agent. Vérifier par **code de sortie**, jamais par lecture d'un message
  via un pipe.
- Les fichiers de contenu (`app/src/data/seed*.ts`, `caseMuster.ts`) font
  plus d'un mégaoctet : cibler avec `grep -n` puis lire la plage utile.
- Bump `SEED_VERSION` dans `app/src/data/seed.ts` à chaque modification de
  contenu.
- Mehdi édite des fichiers en parallèle : **stager les commits fichier par
  fichier**, jamais `git add -A`.
- Vérification navigateur : `playwright-cli` headless (le panneau intégré ne
  délivre ni scroll ni timers quand il est masqué).

## Agent skills

### Issue tracker

Les issues vivent dans GitHub Issues du dépôt `mhdbkr/fsp-trainer` (`gh` CLI).
See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context : `CONTEXT.md` à la racine + `docs/adr/`.
See `docs/agents/domain.md`.
