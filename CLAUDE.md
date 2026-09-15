# Doctopus / FSP-Cockpit

Trainer pour la Fachsprachprüfung Medizin (React + TypeScript + Vite + Dexie,
hors-ligne d'abord), en cours de conversion en SaaS **Doctopus** (Supabase EU,
Stripe, crédits IA). L'app vit dans `app/` ; les sources brutes des cas sont à
la racine du dépôt.

## Documents de référence

- `app/docs/PRODUCT-VISION.md` — la vision, les innovations, le modèle, les décisions (→ ADRs)
- `app/docs/DOCTOPUS-AGENTIC-ORG.md` — organisation v2 : 3 pôles, 48 agents, méthode, backlog des sous-projets
- `app/docs/ROADMAP-PRODUCTION.md` — verrous et phases de mise en production
- `app/docs/BACKLOG-FEEDBACK.md` — retours d'usage réel, étalon d'une « rupture de symbiose »
- `app/docs/AGENTIC-TEAM.md` — les 5 relecteurs de contenu
- `docs/contracts/` — seule vérité partagée entre pôles (schéma, OpenAPI, entitlements, sync)
- `docs/adr/` — une décision par fichier ; `CONTEXT.md` — le vocabulaire

## Constitution de travail (opposable à tout agent)

**Chaîne de méthode** (skill `dept-coordination`) : comprendre (`interview-me`, `idea-refine`, `mattpocock:grilling`) → concevoir (`superpowers:brainstorming`, une question à la fois, décomposer si > 1 sous-système) → modéliser (`mattpocock:domain-modeling` → `CONTEXT.md`, `documentation-and-adrs`) → spécifier (critères testables) → planifier (`superpowers:writing-plans`, `mattpocock:to-tickets` → issues) → construire (`superpowers:subagent-driven-development`, TDD, `source-driven-development` pour toute API externe, `doubt-driven-development` sur paiement/RLS/sync) → revoir (par tâche, puis branche entière sur Opus, `security-review` si auth/paiement/données) → livrer (`finishing-a-development-branch`, PR, CI verte).

**Routage des modèles** (ADR-0009) : Opus juge, Sonnet exécute, Haiku trie. Toujours explicite dans le dispatch. Chaque agent invoque d'abord le skill `dept-*` de son pôle.

**Implémenteur OU relecteur**, jamais les deux. Un relecteur ne modifie rien. Un implémenteur n'écrit que dans son périmètre ; un besoin ailleurs = proposition de changement de contrat.

**Comportements** : surfacer ses hypothèses avant d'agir ; s'arrêter sur une contradiction plutôt que deviner ; pousser en retour sur un défaut concret ; simplicité ; périmètre chirurgical ; vérifier, ne jamais supposer.

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
  délivre ni scroll ni timers quand il est masqué). **Mesurer depuis le DOM de
  l'app** : un `import("/src/…")` dans une sonde crée une seconde instance de
  module (≠ `@/…`) — sondes trompeuses.
- PostgREST plafonne à 1 000 lignes : paginer (content, pull, publish).
- `npm run db:reset` EFFACE le contenu publié : appliquer les migrations sur la
  base vivante (`psql`), republier sinon. Les fonctions se servent avec
  `--env-file supabase/.env` ; jamais `--no-verify-jwt` (la config fait foi).
- Stripe : sandbox `acct_1UG2IORuBvu9xf7x` uniquement ; le contexte live
  `acct_1UG2HQRzMItO2h5z` n'est jamais touché par un agent.
- Un seul writer par worktree ; les dispatchs d'agents portent le brief par
  fichier, jamais le plan entier.

## Agent skills

### Issue tracker

Les issues vivent dans GitHub Issues du dépôt `mhdbkr/fsp-trainer` (`gh` CLI).
See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context : `CONTEXT.md` à la racine + `docs/adr/`.
See `docs/agents/domain.md`.
