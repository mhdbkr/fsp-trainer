# Doctopus — organisation agentique v2 · pôles, rôles, méthode, backlog

> **Version 2** — remplace la v1 (six départements) après la discussion
> stratégique de septembre 2026 et la livraison des Fondations SaaS (PR #2).
> Ce document est **exécutable** : chaque rôle est un fichier
> `.claude/agents/<pôle>-<rôle>.md`, chaque pôle a un skill de standards dans
> `.claude/skills/dept-*/`, chaque décision est un ADR dans `docs/adr/`,
> chaque sous-projet est une issue GitHub `epic`.
>
> Documents liés : `PRODUCT-VISION.md` (innovations, trajectoire, modèle),
> `ROADMAP-PRODUCTION.md` (verrous, phases), `AGENTIC-TEAM.md` (les 5
> relecteurs de contenu), `docs/superpowers/specs/*` (specs validés).

---

## 0. Les trois vérités qui gouvernent tout (inchangées, prouvées)

1. **Les sous-agents ne se parlent pas.** Ils lisent des **contrats écrits**
   (`docs/contracts/`, `CONTEXT.md`, ADRs) et rendent un livrable au
   coordinateur, seul point de fusion. C'est plus robuste qu'un chat : un
   contrat est versionné, diffable, testable.
2. **« Entraîné pour son rôle » = brief dense + outils restreints + exemples
   du projet + gate qui refuse la déviation.** Pas un modèle fine-tuné.
3. **On ne paie jamais un agent pour ce qu'un script fait gratuitement.**
   Couche mécanique (CI, validateurs, tests, evals) d'abord ; agents de
   jugement ensuite ; décision humaine enfin.

Preuve sur les Fondations SaaS : les revues et les parcours réels ont trouvé
~30 défauts dans le plan initial, dont 9 auraient été des incidents de
production silencieux. Aucun n'était visible par un test unitaire seul.

---

## 1. Organigramme — trois pôles, un coordinateur, une direction

```
                              DIRECTION — Mehdi
               produit · prix · légal · go/no-go de chaque phase
                                     │
                    COORDINATION — orchestrateur (session principale)
                    + coord-release-manager + coord-issue-triager
                                     │  contrats écrits
     ┌───────────────────────────────┼───────────────────────────────┐
     ▼                               ▼                               ▼
PÔLE PRODUIT                 PÔLE CROISSANCE                 PÔLE FONDATIONS
« ce qui se joue »           « ce qui se vend »              « ce qui tient »
─────────────────            ─────────────────               ─────────────────
Produit & Pédagogie          Marque & Site                   Plateforme
Expérience (UX, avocat       Marketing & Growth              Sécurité & Conformité
  utilisateur, mouvement)    Marché & Pricing                Ops & Scaling
Contenu clinique             Communauté & Support            Finance & Unit economics
Simulation (3 modes)                                         R&D / Innovation
Voix & IA (préparé)                                          Qualité
```

**Règle d'or** : chaque agent est **implémenteur** (écrit dans un périmètre de
fichiers précis) **ou relecteur** (lecture seule). Jamais les deux. Celui qui
écrit ne se relit pas.

---

## 2. La méthode — fusion Superpowers × Matt Pocock × Agent Skills

Trois bibliothèques, une seule chaîne. Chaque étape nomme **le skill à
invoquer** ; le coordinateur ne l'improvise pas.

| Étape | Skill(s) | Livrable | Gate |
|---|---|---|---|
| **0 · Comprendre** | `interview-me` (ce que l'utilisateur veut vraiment) → `idea-refine` (divergence/convergence) → `mattpocock:grilling` (les questions qui fâchent) | Intention claire, hypothèses surfacées | Direction valide l'intention |
| **1 · Concevoir** | `superpowers:brainstorming` (une question à la fois, décomposition si > 1 sous-système, 2–3 approches, design par sections) | `docs/superpowers/specs/YYYY-MM-DD-<sujet>-design.md` | Self-review du spec (placeholders, contradictions, périmètre) puis relecture Mehdi |
| **1b · Modéliser le domaine** | `mattpocock:domain-modeling` (termes → `CONTEXT.md`), `documentation-and-adrs` (décisions → `docs/adr/`) | Glossaire à jour, ADR par décision | Aucun terme inventé hors glossaire |
| **2 · Spécifier** | `spec-driven-development` / `mattpocock:to-spec` (critères d'acceptation **testables**) ; `constraint-driven-development` si la barre de qualité n'est pas écrite | Critères §11 du spec | Chaque critère a une preuve possible |
| **3 · Planifier** | `superpowers:writing-plans` + `planning-and-task-breakdown` ; `mattpocock:to-tickets` → issues GitHub | `docs/superpowers/plans/…md` (tâches 2–5 min, code inclus, TDD) + issues | Self-review : couverture du spec, placeholders, cohérence des types |
| **4 · Construire** | `superpowers:subagent-driven-development` (un implémenteur frais par tâche, revue par tâche) · `incremental-implementation` · `test-driven-development` (`mattpocock:tdd`) · `source-driven-development` (API externes : Supabase, Stripe, Rive) · `doubt-driven-development` (paiement, RLS, sync, irréversible) · `context-engineering` | Commits atomiques, ledger `.superpowers/sdd/progress.md` | Tests + tsc + validateurs par **code de sortie** ; vérification navigateur |
| **5 · Revoir** | Revue par tâche (spec + qualité) ; `code-review-and-quality` (5 axes) ; `security-review` / `security-and-hardening` sur auth/paiement/données ; `code-simplification` ; revue finale de branche sur **Opus** (`requesting-code-review`) ; `receiving-code-review` pour appliquer | Constats au format `_FORMAT.md` | Aucun Critical/Important ouvert |
| **6 · Livrer** | `superpowers:finishing-a-development-branch` → PR → CI verte → `git-workflow-and-versioning` ; `shipping-and-launch` (checklist, rollback) ; `observability-and-instrumentation` | PR mergée, release taguée | `superpowers:verification-before-completion` : preuve, pas impression |
| **7 · Diagnostiquer** (quand ça casse) | `superpowers:systematic-debugging` / `debugging-and-error-recovery` / `mattpocock:diagnosing-bugs` : reproduire → localiser → corriger → verrouiller par un test | Test de non-régression | Le bug a son test |

**Comportements non négociables** (Agent Skills) : surfacer ses hypothèses
avant d'agir ; s'arrêter sur une contradiction plutôt que deviner ; pousser
en retour quand une approche a un défaut concret ; simplicité ; périmètre
chirurgical ; vérifier, ne jamais supposer.

**Règles apprises sur ce projet** (dans `CLAUDE.md`, opposables à tout agent) :
vérifier par code de sortie ; mesurer depuis le DOM de l'app, jamais depuis un
module importé par une sonde ; paginer tout ce qui touche PostgREST ; un
writer par worktree ; stager par fichier ; ne jamais `db reset` sur une base
qui porte du contenu publié ; jamais le contexte Stripe live.

---

## 3. Routage des modèles

| Tier | Modèle | Rôles |
|---|---|---|
| **Jugement** | Opus | orchestrateur, architectes (plateforme, produit), relecteur clinique, avocat de l'utilisateur, pédagogue, auditeur sécurité, relecteur final de branche, analyste marché/pricing |
| **Exécution** | Sonnet | implémenteurs (front, plateforme, site), auteur de cas, rédacteurs marketing, relecteurs par tâche sur diffs simples, testeur QA, designer de mouvement |
| **Masse** | Haiku | classification, extraction, transformations mécaniques, tri d'issues, rapports de métriques |

Un modèle omis hérite du plus cher : **toujours** l'écrire dans le dispatch.

---

## 4. Les pôles, rôle par rôle

Colonne « Écrit dans » = seul périmètre modifiable. « Skills » = ce que le
fichier d'agent lui impose d'invoquer. Modèle entre crochets.

### 4.1 Coordination

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| **orchestrateur** (session, pas un fichier) [Opus] | Quelle est la prochaine étape, qui la fait, quel gate la valide ? | fusion des livrables | `using-agent-skills`, `superpowers:*`, `workflow-authoring`, `mattpocock:wizard` |
| `coord-release-manager` [Sonnet] | Cette version est-elle livrable ? | `CHANGELOG.md`, tags | `shipping-and-launch`, `git-workflow-and-versioning`, `engineering:deploy-checklist` |
| `coord-issue-triager` [Haiku] | Cette issue/retour va à quel pôle, avec quelle priorité ? | labels GitHub | `mattpocock:triage`-like, `small-business:lead-triage` (pattern) |

### 4.2 Pôle Produit

**Produit & Pédagogie**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `product-spec-writer` [Opus] | Que construit-on, pour qui, et comment saura-t-on que c'est réussi ? | `docs/superpowers/specs/` | `interview-me`, `idea-refine`, `spec-driven-development`, `product-management:write-spec`, `mattpocock:to-spec` |
| `product-pedagogy-designer` [Opus] — **droit de veto** sur toute mécanique de rétention ; relit chaque page de pricing | La progression apprend-elle vraiment, ou occupe-t-elle ? | `docs/specs/pedagogy/` | `design:user-research`, `design:research-synthesis`, `fsp-simulation`, `fsp-trainer` |
| `product-exam-fidelity-analyst` [Opus] | Ce que l'app dit de l'examen est-il vrai **dans ce Land** ? | `docs/exam/<land>.md`, `CONTEXT.md` (examen) | `fsp-simulation`, `mattpocock:research`, `mattpocock:domain-modeling` |

**Expérience**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `ux-user-advocate` [Opus] — rapport direct au coordinateur, priorité produit | Où la machine impose-t-elle sa logique à l'humain ? (personas : candidat à 3 semaines, binôme à distance, non-natif mobile) | lecture seule | `playwright-cli`, `design:design-critique`, `design:accessibility-review`, `design-audit` |
| `ux-motion-designer` [Sonnet] | Le mouvement est-il « apple-like » : fluide, interruptible, sans clignotement ? | `app/src/styles/`, composants animés | `animate`, `apple-design`, `emil-design-eng`, `find-animation-opportunities`, `improve-animations`, `animation-vocabulary` |
| `front-implementer` [Sonnet] | L'écran fait-il ce que le PRD dit, avec les composants qui existent ? | `app/src/` | `frontend-ui-engineering`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`, `vercel-react-best-practices`, `incremental-implementation`, `test-driven-development` |
| `front-design-keeper` [Sonnet] | La charte « instrument clinique » tient-elle ? Un composant nouveau était-il nécessaire ? | lecture seule | `design:design-system`, `typography`, `design-audit`, `impeccable` |
| `fsp-ux-auditor` (existant) [Sonnet] | a11y, responsive, thèmes | lecture seule | `playwright-cli`, `design:accessibility-review` |

**Contenu clinique** — les 5 relecteurs de `AGENTIC-TEAM.md` + :

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `content-case-author` [Sonnet] | Ce cas est-il fidèle au protocole, complet sur toutes les sondes, dans le registre ? | `app/scratchpad/lot*/` → `lotAssembler.py` | `fsp-simulation`, `writing-guidelines`, pipeline v3 |
| `content-anonymizer` [Haiku] | Un nom réel subsiste-t-il ? | `seedCases.ts` (noms) | validateur `checkNoRealNames` |
| `content-fachwissen-visualizer` [Sonnet] | Que faut-il montrer plutôt qu'écrire sur cette fiche ? | `app/src/data/fachwissenVisuals/*.json` (spec par pathologie) | `dataviz`, `artifact-diagramming` (méthode), `fsp-trainer` |
| `content-protocol-ingester` [Sonnet] | Ce protocole communautaire est-il exploitable, et que change-t-il aux fréquences ? | `data/protocols/` | `mattpocock:research`, `data:validate-data` |

**Simulation (3 modes)**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `sim-engine-engineer` [Sonnet] | Le moteur (rolePlay, simulationStep, sync patient) reste-t-il un seul code pour les trois modes ? | `app/src/lib/rolePlay.ts`, `simulationStep.ts`, `features/simulation/` | `api-and-interface-design`, `test-driven-development`, `fsp-simulation` |
| `sim-online-engineer` [Sonnet] | Le binôme à distance voit-il exactement ce que le QR local voyait, rôles inversables ? | `app/src/features/simulation/online/`, `supabase/functions/session-*` | `source-driven-development` (Supabase Realtime), `api-and-interface-design` |
| `sim-character-engineer` [Sonnet] | Le patient/Oberarzt croqué réagit-il à la bonne question (posture, zone, émotion) ? | `app/src/characters/` (Rive) | `animate`, `apple-design`, `source-driven-development` (Rive) |

**Voix & IA** (préparé ; démo statique d'abord)

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `ai-patient-engineer` [Opus] | Le patient IA reste-t-il **dans sa fiche** ? | `simulationStep.ts` hooks, `supabase/functions/ai-*` | `claude-api`, `source-driven-development`, `doubt-driven-development` |
| `ai-voice-engineer` [Sonnet] | Chaque patient a-t-il une voix stable, et le coût par simulation est-il borné ? | `supabase/functions/voice-*`, `app/src/voice/` | `source-driven-development` (fournisseur), pré-génération du `Rollenskript` |
| `ai-eval-engineer` [Opus] | Comment prouve-t-on que l'IA ne dérive pas ? | `evals/` | `gsd-core:ai-integration-phase` (eval-planner), `claude-api` |

### 4.3 Pôle Croissance

**Marque & Site**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `brand-strategist` [Opus] | Doctopus, c'est quoi en une phrase, pour qui, contre quoi ? | `docs/brand/` | `brand-building-skills:brand-strategy/positioning/story/messaging/voice/guidelines`, `brand-voice:generate-guidelines` |
| `site-implementer` [Sonnet] | La page convertit-elle sur mobile en < 3 s, avec la même identité que l'app ? | `apps/site/` | `frontend-design`, `ui-ux-pro-max`, `vercel-*`, `deploy-to-vercel`, `web-design-guidelines`, `seo` (`small-business:seo-ai-visibility`, `marketing:seo-audit`) |
| `brand-creative-director` [Sonnet] | Ce visuel/vidéo est-il reconnaissable sans logo ? | briefs Higgsfield/Canva | `canva:*`, `ui-ux-pro-max:banner-design`, `brand-voice:enforce-voice` |

**Marketing & Growth** — *machine à politiques* : Mehdi fixe budget max, audiences, ton ; approbation avant toute créa publiée et tout dépassement.

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `growth-campaign-manager` [Sonnet] | Quelle campagne, quel budget, quel résultat attendu, quelle preuve ? | `docs/marketing/campaigns/` ; comptes ads via MCP sous seuils | `marketing:campaign-plan/performance-report`, `brand-building-skills:meta-ads/google-ads`, `small-business:ad-manager` |
| `growth-content-engine` [Sonnet] | Que publie-t-on cette semaine, dans la voix Doctopus ? | calendrier, posts, `postiz` | `small-business:social-content-engine`, `marketing:content-creation/draft-content/email-sequence`, `brand-building-skills:ugc-strategy/influencer-marketing/email-marketing` |
| `growth-analyst` [Haiku→Sonnet] | Ça marche ? Où va l'argent ? | rapports | `small-business:growth-pulse/marketing-monday`, `data:analyze`, `product-management:metrics-review` |

**Marché & Pricing**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `market-analyst` [Opus] | Combien de candidats, où, prêts à payer quoi, contre qui ? | `docs/market/` | `product-management:competitive-brief`, `brand-building-skills:target-audience/competitor-branding`, `sales:competitive-intelligence`, `mattpocock:research` |
| `pricing-designer` [Opus] — **relu par le pédagogue et l'avocat utilisateur** | L'offre est-elle claire, honnête, alignée sur le cycle d'examen ? | `docs/contracts/entitlements.md` (proposition), `docs/pricing/` | `brand-building-skills:brand-measurement`, `small-business:price-check`, `data:statistical-analysis` |

**Communauté & Support**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `community-protocol-curator` [Sonnet] | Ce protocole soumis mérite-t-il ses crédits, et qu'apporte-t-il au corpus ? | `data/protocols/`, ledger via fonction | `data:validate-data`, `fsp-simulation` |
| `support-triager` [Haiku] | Bug, contenu faux, question, ou demande de feature ? Vers qui ? | labels/issues | `small-business:ticket-deflector` (pattern), `small-business:handle-complaint` |

### 4.4 Pôle Fondations

**Plateforme**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `platform-architect` [Opus] | Quel schéma, quelle API, quel modèle de sync tiennent hors-ligne ET multi-appareils ? | `docs/contracts/` (seul) | `api-and-interface-design`, `engineering:system-design`, `engineering:architecture`, `mattpocock:codebase-design`, `documentation-and-adrs` |
| `platform-implementer` [Sonnet] | Le backend respecte-t-il le contrat, ligne à ligne ? | `app/supabase/` | `source-driven-development`, `test-driven-development`, `sparc:supabase-admin` |
| `platform-billing-engineer` [Sonnet] | Le paiement est-il juste, idempotent, et l'entitlement suit-il Stripe en toute circonstance ? | `supabase/functions/{checkout,portal,stripe-webhook,credits-*}` | `source-driven-development` (Stripe), `doubt-driven-development`, `test-driven-development` |
| `platform-sync-engineer` [Sonnet] | La progression survit-elle à tout : hors-ligne long, deux appareils, conflit, réinstallation ? | `app/src/lib/sync/`, `supabase/functions/events` | `api-and-interface-design`, `test-driven-development`, `doubt-driven-development` |

**Sécurité & Conformité**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `security-auditor` [Opus] | Où un utilisateur peut-il lire ou écrire ce qui n'est pas à lui ? | lecture seule | `security-and-hardening`, `security-review`, `penetration-testing-with-strix`, `ci-security-scanning-with-strix`, `agent-skills:security-auditor` |
| `compliance-checker` [Sonnet] | Ce qui doit être écrit pour opérer est-il écrit et **branché** ? (Impressum, Datenschutz, AGB, Widerruf, avertissement « outil de langue ») | `docs/legal/`, pages légales | `legal:compliance-check/legal-risk-assessment`, `small-business:contract-review` — **brouillons ; un juriste valide** |

**Ops & Scaling**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `ops-devops-engineer` [Sonnet] | Peut-on déployer, revenir en arrière et observer sans intervention manuelle ? | `.github/workflows/`, `infra/` | `ci-cd-and-automation`, `deploy-to-vercel`, `vercel-cli-with-tokens`, `shipping-and-launch`, `engineering:incident-response` |
| `ops-observability-engineer` [Sonnet] | Saura-t-on qu'un utilisateur souffre avant qu'il ne l'écrive ? Le coût IA/voix dérive-t-il ? | Sentry, logs, tableau de coûts | `observability-and-instrumentation`, `performance-optimization`, `anthropic-skills:scalability-advisor`, `vercel-optimize` |

**Finance & Unit economics**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `finance-unit-economist` [Sonnet] | Une simulation vocale, un abonné, un mois : combien ça coûte, combien ça rapporte ? | `docs/finance/` | `small-business:margin-analyzer/cash-flow-snapshot/quarterly-review`, `finance:variance-analysis`, `data:analyze` |
| `finance-admin-guide` [Sonnet] | Quelles démarches, dans quel ordre, pour opérer légalement depuis la France puis l'Allemagne ? | `docs/finance/admin.md` | `small-business:tax-prep/tax-season-organizer` — **orientation, pas conseil ; un comptable valide** |

**R&D / Innovation**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `rd-spike-runner` [Sonnet] | En un temps borné, cette idée tient-elle techniquement ? | `spikes/` (jetable) | `mattpocock:prototype`, `gsd-core:spike`, `mattpocock:research`, `idea-refine` |
| `rd-innovation-scout` [Opus] | Qu'est-ce qui, dans le marché ou la technique, changerait la donne pour un candidat ? | `docs/rd/` | `mattpocock:research`, `product-management:product-brainstorming`, `doubt-driven-development` |

**Qualité**

| Agent | Question unique | Écrit dans | Skills |
|---|---|---|---|
| `fsp-qa-tester` (existant, étendu) [Sonnet] | Est-ce que ça marche vraiment, de bout en bout — y compris inscription → paiement → sync → résiliation ? | lecture seule | `playwright-cli`, `browser-testing-with-devtools`, `agent-skills:test-engineer` |
| `quality-task-reviewer` [Sonnet] | Cette tâche fait-elle ce que le brief dit, ni plus ni moins, et est-elle bien construite ? | lecture seule | `code-review-and-quality`, `mattpocock:code-review` |
| `quality-branch-reviewer` [Opus] | Cette branche est-elle prête à merger ? Sécurité, correctness inter-modules, critères prouvés ? | lecture seule | `requesting-code-review`, `security-review`, `code-simplification`, `agent-skills:web-performance-auditor` |

---

## 5. Contrats — ce qui fait tenir l'ensemble

`docs/contracts/` est la seule vérité partagée ; seul `platform-architect` y
écrit, sur validation du coordinateur.

| Contrat | Contenu | Consommé par |
|---|---|---|
| `schema.sql` (généré) | tables, RLS, index | plateforme, sécurité |
| `openapi.yaml` | chaque fonction, entrées/sorties/erreurs | plateforme, front, QA |
| `entitlements.md` | plan × feature × quota ; règles de tier | billing, front, IA, pricing |
| `sync-protocol.md` | ce qui se synchronise, comment, conflits | sync, front, QA |
| `characters.md` (à créer, #6) | machine à états des personnages Rive : `posture`, `douleur:zone`, `émotion` | simulation, voix, site |
| `fachwissen-visuals.md` (à créer, #7) | schéma JSON des specs visuelles par pathologie | contenu, front |
| `session-protocol.md` (à créer, #5) | messages du binôme en ligne (`active-case`, `guide-chapter`, `guide-probe`, `swap-roles`) | simulation, QA |

Un agent qui a besoin de « parler » à un autre pôle **propose un changement de
contrat** au coordinateur.

---

## 6. Backlog des sous-projets — ordre, dépendances, pôle pilote

Chaque ligne est une issue GitHub `epic`. Chacune suit la chaîne §2 en entier
(brainstorming → spec → plan → subagent-driven → revue → PR).

| # | Sous-projet | Dépend de | Pôle pilote | Innovation portée |
|---|---|---|---|---|
| 1 | **Fondations SaaS** | — | Fondations | ✅ livré (PR #2) |
| 2 | **Prüfungstag-Simulator + Bereitschaftsindex** | 1 | Produit | mode « jour d'examen » 60 min sans assistance ; indice « es-tu prêt ? » — feature de conversion n° 1 |
| 3 | **Fachbegriffe rafraîchi** | 1 | Produit | favoris (étoile + « expliquer »), decks perso, bouton Fachbegriffe du cas dans la barre de simulation, drill post-simulation ancré sur le cas puis la spécialité, tri alphabétique à curseur vertical (zoom au survol), étiquettes par statut SRS, favoris dans le programme, **explication en contexte**, **registre double** (technique / patient) |
| 4 | **Correction d'Arztbrief** | 1 (crédits) | Voix & IA | comparaison au Muster sur les axes de l'examen (Konjunktiv I, formule orale, Fachbegriff manquant) — première feature IA |
| 5 | **Binôme en ligne** | 1 (Realtime) | Simulation | session par lien, fiche simulant qui suit, **rôles inversables**, protocole hérité du sync local |
| 6 | **Personnages Rive + Prüfungsakademie + démo vocale statique** | — | Simulation/Expérience | patient croqué (posture, zone douloureuse, émotion), Oberarzt caricaturé, académie animée (salle, jury, barème 60 pts, minutage, enregistrements exemplaires), démo voix sur 1 cas / 5–6 questions **pré-générée, zéro coût** |
| 7 | **Fachwissen visuel** | — | Contenu | bibliothèque de composants pilotés par les données (silhouette anatomique, arbre décisionnel, mindmap, frise, tableau, toggles thérapie), spec JSON par pathologie, style reconnaissable sans logo |
| 8 | **Site marketing + légal minimal** | 1 (pricing) | Croissance | monorepo `apps/site` + `packages/tokens` ; accueil, présentation, quick guide, pricing, FAQ, blog (SEO), à propos, support, statut, Impressum/Datenschutz/AGB/Widerruf ; liquid glass **en signature du hero**, pas en matière de page ; page « ce qui tombe vraiment » (fréquences par ville) |
| 9 | **Ligue** | 1, 2 | Produit | opt-in, pseudonyme, **points validés serveur**, récompense les actions qui font réussir (simulation Autonome, couche validée), code promo mensuel |
| 10 | **Marketing autonome** | 8 | Croissance | machine à politiques Meta/Google (MCP), seuils d'approbation, créas Higgsfield, calendrier social |
| 11 | **Boucle de protocoles communautaires** | 1, 9 | Communauté | formulaire post-examen → crédits → pipeline v3 → corpus rafraîchi à chaque session — **le fossé défensif** |
| 12 | **Carte de fidélité par Landesärztekammer** | 2 | Produit | Land → Bogen, minutage, jury, questions typiques ; prérequis de l'expansion bundesweit |
| 13 | **Patient IA vocal complet** | 1, 4, 6 | Voix & IA | chantier à part : architecture immersion/coût, crédits, evals bloquantes |

Deux colonnes parallélisables dès maintenant : **plateforme** (2 → 3 → 4 → 5)
et **identité** (6, 7), qui ne se touchent pas.

Trajectoire au-delà : FSP bundesweit (#12) → **Kenntnisprüfung** (produit de
connaissances, réutilise les cas ; concomitant avec la KP de Mehdi) →
**automatisation des candidatures** (Hospitationen, Stellen ; base
d'hôpitaux, CRM — troisième ligne de produit) → **EVC France**. Le fil : le
profil = parcours de procédure.

---

## 7. Rituels — qui tourne quand

| Déclencheur | Mécanique | Agents |
|---|---|---|
| Chaque push | CI (contrats, tests, RLS, build ; evals IA quand #4/#13) | aucun |
| Nouvelle idée | — | `product-spec-writer` (interview → brainstorming) |
| Spec validé | — | orchestrateur : `writing-plans`, `to-tickets` |
| Tâche | tests/tsc/validateurs | implémenteur du pôle + `quality-task-reviewer` |
| Changement de contrat | tests de contrat | `platform-architect` propose ; implémenteurs concernés relisent |
| Lot de contenu | 8 validateurs | `content-case-author` → 3 relecteurs contenu |
| Écran modifié | typecheck/build/tests composants | `fsp-ux-auditor`, `front-design-keeper`, `ux-motion-designer` si mouvement |
| Backend/paiement/sync modifié | tests de contrat + RLS | `security-auditor` |
| Fin de branche | CI verte | `quality-branch-reviewer` (Opus) → `coord-release-manager` |
| Hebdo (lundi) | — | `growth-analyst` (marketing-monday), `support-triager`, `ux-user-advocate` (une journée d'usage) |
| Mensuel | — | `finance-unit-economist`, `pricing-designer` (revue), `rd-innovation-scout` |
| Session d'examen (2×/an) | pipeline v3 | `content-protocol-ingester`, `product-exam-fidelity-analyst`, 5 relecteurs |

---

## 8. Ce que l'organisation ne fait pas

- Ne décide ni le prix, ni les plans, ni la date de lancement.
- Ne certifie pas la conformité juridique ni ne donne de conseil fiscal
  (brouillons et orientation ; juriste et comptable valident).
- N'ouvre pas de compte publicitaire, ne signe rien, ne dépense pas au-delà
  des seuils fixés par Mehdi.
- Ne rend pas le contenu inviolable (la protection, c'est la licence et la
  valeur du service).
- Ne tourne pas en continu : les rituels sont un plafond.

---

## 9. Faire évoluer l'organisation

1. Le défaut est mécanique → **écrire un validateur**.
2. Il relève d'un périmètre existant → **enrichir l'agent**.
3. Il est vraiment nouveau → **créer un agent** avec périmètre exclusif,
   modèle explicite, skills nommés, livrable vérifiable.

Un agent dont le brief dépasse ~120 lignes fait probablement deux métiers.
