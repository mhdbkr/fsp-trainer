# Chantier Site — carte des skills et des agents

Date : 2026-09-25 · Demandé par la direction · Inventaire fait **sur disque**, pas de mémoire.
Objet : le site n'est pas une plaquette. C'est la **première interface** du produit : il doit expliquer la vision, le projet, **l'équivalence médicale en Allemagne**, et convertir. Premium, dynamique, 3D localisée, attention maximale au détail.

## 0. L'existant à trancher avant tout

`feat/site` porte **123 commits** gelés par ADR-0015 : Astro, 19 composants (`Hero`, `Proof`, `FreqTable`, `PricingTable`, `ExamFacts`, `Steps`, `FaqList`, `LegalBanner`, `StatusBoard`, `MobileCtaBar`…), pages `de/`, `404`, `rss.xml`, `robots.txt`, et **8 validateurs** (`check-cta`, `check-legal`, `check-no-promise`, `check-pricing-parity`, `check-frequencies`, `check-lighthouse`, `build-lexicon`, `build-frequencies`).

Ces validateurs sont de l'or : ils empêchent mécaniquement une promesse illégale, une page légale manquante, une parité de prix cassée, un score Lighthouse qui chute. **Recommandation : repartir de cette branche** (rebaser sur `main`), refaire le design par-dessus, garder la couche mécanique. Repartir de zéro coûterait ces 8 gardes et les contenus DE déjà relus.

---

## 1. La colonne vertébrale (constitution, non négociable)

| Étape | Skill | Qui |
|---|---|---|
| Comprendre | `interview-me`, `idea-refine`, `mattpocock-skills:grilling` | main |
| Concevoir | `superpowers:brainstorming` (une question à la fois) | main |
| Modéliser | `mattpocock-skills:domain-modeling` → `CONTEXT.md`, `documentation-and-adrs` | main |
| Spécifier | `spec-driven-development`, `constraint-driven-development` | `product-spec-writer` |
| Planifier | `superpowers:writing-plans`, `planning-and-task-breakdown` | main |
| Construire | `superpowers:subagent-driven-development`, `incremental-implementation`, `superpowers:using-git-worktrees`, `superpowers:dispatching-parallel-agents` | main + implémenteurs |
| Revoir | `superpowers:requesting-code-review`, `code-review-and-quality`, `superpowers:verification-before-completion` | relecteurs |
| Livrer | `superpowers:finishing-a-development-branch`, `shipping-and-launch`, `git-workflow-and-versioning` | main |
| Gates | `agentops:pre-mortem`, `agentops:red-team`, `agentops:council`, `agentops:post-mortem` (ADR-0012 : ces quatre-là seulement) | main |
| Pôles | `dept-coordination`, `dept-experience`, `dept-croissance`, `dept-contenu` | chaque agent, en premier |

---

## 2. Le cœur du « premium » — les skills de goût

**C'est ici que se joue la différence entre un site correct et le site que tu veux.**

| Skill | Ce qu'il apporte | Quand |
|---|---|---|
| **`refero-design`** ⭐ | Skill par défaut pour design web, landing pages, polish visuel, systèmes de composants, typo/couleur/espacement/motion. **C'est la source de ta référence Auros.** | Spine de tout le design du site |
| **`emil-design-eng`** ⭐ | Philosophie Emil Kowalski : polish UI, décisions d'animation, les détails invisibles qui font qu'un logiciel « se sent » bien | Chaque composant, chaque état |
| **`apple-design`** | Mouvement fluide et physique : ressorts, drag/swipe/sheet, momentum, transitions **interruptibles**, matières translucides | Hero, transitions de section, sheet mobile |
| **`liquid-glass`** | La signature déjà arbitrée (vision §6, ADR) : verre du hero et des transitions | Hero, une fois |
| **`typography`** | L'escalier, le tracking négatif aux grandes tailles, les capitales espacées | Titres de marque |
| **`design-audit`** | Audit de design structuré | Gate avant merge |
| **`web-design-guidelines`** | Conformité Web Interface Guidelines + accessibilité | Gate avant merge |
| **`renaissance-architecture`** | Premiers principes, anti-dérivatif — « ne pas faire un SaaS de plus » | Au brainstorming, pas après |
| **`human-architect-mindset`**, **`negentropy-lens`** | Recul sur les choix de structure | Au brainstorming |
| **`prototype`** | Génère **plusieurs versions vraiment différentes** d'un bloc derrière un sélecteur visuel, on choisit en direct | **Le hero** — exactement l'outil pour ça |
| **`pick-ui-library`** | Choix de lib par tâche (charts, command menu, virtualisation, toasts…) sur liste curée | Avant d'installer quoi que ce soit |
| **`image-to-code-skill`** | Transformer une référence visuelle (tes planches ORVIO/Auros) en code | Reprise des maquettes |
| **`taste-skill`**, **`minimalist-skill`**, **`brandkit`** | Familles de goût ; `minimalist` colle à « instrument clinique » | Optionnel, si un écran patine |

### Motion (le « dynamique »)
| Skill | Rôle |
|---|---|
| **`animate`** | Construire une animation **dans l'ordre des décisions** : faut-il animer, dans quel but, quel outil, quelles propriétés, quelle courbe, comment elle s'interrompt et sort |
| **`animation-vocabulary`** | Nommer précisément un effet (« le truc qui rebondit quand un popover s'ouvre » → Pop in) — utile pour te comprendre sans ambiguïté |
| **`find-animation-opportunities`** | Trouver ce qui **devrait** bouger et rejeter tout le reste (lecture seule) |
| **`improve-animations`** | Audit priorisé + plans d'implémentation pour d'autres agents |
| **`review-animations`** ⭐ | **Relecture au niveau d'exigence d'Emil ; par défaut ça flague, l'approbation se mérite.** Le gate anti-« animation gratuite » |
| `vercel-react-view-transitions` | View Transitions (Astro les supporte) — transitions de page sans SPA |

---

## 3. Marque et message (avant le pixel)

| Skill | Rôle |
|---|---|
| `brand-building-skills:brand-positioning` | Où l'on se place face aux écoles de prépa, livres, apps |
| `brand-building-skills:target-audience` | Les personas réels : médecin étranger, Land visé, étape de procédure |
| `brand-building-skills:brand-story` | Le récit — pourquoi Doctopus existe |
| `brand-building-skills:brand-messaging` | Hiérarchie de messages par persona et par page |
| `brand-building-skills:brand-voice` | La voix (déjà partiellement dans `voice.md` de la branche site) |
| `brand-building-skills:brand-identity` / `brand-guidelines` | Le symbole reconstruit (cf. `brand/INSPIRATION-ORVIO.md` §4) |
| `brand-building-skills:competitor-branding` | Ce que font les autres, pour ne pas leur ressembler |
| `brand-building-skills:brand-audit` | État des lieux de l'identité actuelle |
| `brand-building-skills:brand-launch` | Le plan de mise en ligne |
| `writing-guidelines` | Relecture de toute la prose du site |
| `adaptive-communication` | Adapter le registre (candidat stressé ≠ investisseur) |

---

## 4. Conversion, SEO et — surtout — AEO

| Skill | Rôle |
|---|---|
| **`bencium-aeo`** ⭐ | **Answer Engine Optimization** : être cité par ChatGPT / Claude / Gemini / AI Overviews. Schémas FAQ, panneaux de preuve, extractibilité LLM. **Pour une niche comme la FSP, c'est probablement le premier canal d'acquisition en 2026** — un candidat demande à ChatGPT « comment préparer la FSP », pas à Google |
| `marketing:seo-audit` | SEO classique (la FSP est une niche *cherchée*) |
| `marketing:content-creation`, `marketing:draft-content` | Blog, pages piliers |
| `marketing:competitive-brief` | Paysage concurrentiel |
| `marketing:campaign-plan`, `marketing:email-sequence` | Après le lancement |
| `brand-building-skills:google-ads`, `meta-ads`, `email-marketing`, `d2c-marketing` | Acquisition payante (phase 2, ADR : seuils d'approbation) |
| `dataviz` | « Ce qui tombe vraiment à Stuttgart » : fréquences par pathologie et par ville — la preuve d'autorité. Un `FreqTable.astro` et `build-frequencies.mjs` existent déjà |
| `artifact-diagramming` | Schémas de la trajectoire FSP → KP → candidatures (la page « équivalence ») |

---

## 5. Construire et vérifier

| Skill | Rôle |
|---|---|
| `frontend-ui-engineering` | UI accessible, responsive, production |
| `source-driven-development` | Toute API externe (Astro, Stripe Checkout, analytics) vérifiée dans la doc, pas de mémoire |
| `test-driven-development` / `superpowers:test-driven-development` | Les validateurs et la logique |
| **`playwright-cli`** | Vérification navigateur headless, **mesures depuis le DOM** (règle CLAUDE.md) |
| `browser-testing-with-devtools` | Debug runtime |
| **`performance-optimization`** | Budget de performance — un site premium lent est un site raté |
| `vercel-composition-patterns`, `vercel-react-best-practices` | Si l'on passe par Vercel |
| `deploy-to-vercel`, `vercel-cli-with-tokens` | Déploiement + previews par PR |
| `ci-cd-and-automation` | Les 8 validateurs en CI |
| `security-and-hardening` | En-têtes, CSP, formulaires |
| `observability-and-instrumentation` | Analytics EU sans cookie (ADR-0014) |
| `verification-quality`, `superpowers:verification-before-completion` | « Fait » = prouvé |
| `documentation-and-adrs` | Les décisions du chantier |

---

## 6. Les agents à dispatcher

| Agent | Rôle sur ce chantier |
|---|---|
| **`site-implementer`** | Construit `apps/site` |
| **`brand-strategist`** | Positionnement, promesse, voix, messages par persona |
| **`brand-creative-director`** | Briefs et validation des créas (Higgsfield/Canva) |
| **`front-design-keeper`** | Garde la charte — gate avant merge |
| **`ux-motion-designer`** | Le mouvement, avec `animate` + `review-animations` |
| **`ux-user-advocate`** | Joue le candidat : où hésite-t-il, où abandonne-t-il |
| **`product-exam-fidelity-analyst`** ⭐ | **Toute affirmation sur la FSP, l'Approbation, la Gleichwertigkeit, la KP.** Le site parle d'équivalence médicale : une phrase fausse coûte la crédibilité. Rappel : le barème « 60 pts / 60 % » **n'est pas sourcé** (commit 3f48b96) — il ne doit pas réapparaître |
| **`compliance-checker`** | Impressum, Datenschutzerklärung, AGB, Widerrufsbelehrung, avertissement « outil de langue, pas dispositif médical ». Obligatoire pour un site visant l'Allemagne — brouillons, un juriste valide |
| **`market-analyst`**, **`pricing-designer`** | Page prix ; le pédagogue a un droit de veto (ADR-0008) |
| **`product-pedagogy-designer`** | Veto sur toute page de prix et toute mécanique de rétention |
| **`growth-analyst`**, **`growth-content-engine`** | Après la mise en ligne |
| **`agent-skills:web-performance-auditor`** | Core Web Vitals |
| **`quality-branch-reviewer`** (Opus) | Revue de branche finale |
| **`security-auditor`** | Si formulaire, paiement ou données |
| **`direction-keeper`** ⭐ | **Avant tout « fait »** : raisonnement sur le cas, zéro doublon, anti-slop, concision, personnalisation |

---

## 7. Écarté, et pourquoi

- **claude-flow** (`agents:*`, `sparc:*`, `swarm:*`, `hive-mind:*`, `v3-*`, `agentdb-*`, `reasoningbank-*`, `flow-nexus-*`, `stream-chain`, `worker-*`) : une seconde chaîne d'orchestration concurrente de la nôtre — exclue par `doctopus-method` (ADR-0012).
- **gsd-core** : exclu par la même décision.
- **AgentOps** hors des quatre skills de gate : exclu (ADR-0012).
- `shopify`, `aso`, `whatsapp-marketing`, `influencer-marketing`, `ugc-strategy`, `brand-packaging`, `brand-partnerships` : hors modèle (pas de boutique, pas d'app store, pas d'influenceurs pour l'instant).
- `hungarian-humanizer`, `write-swift`, `animate-expo`, `vercel-react-native-skills` : hors sujet.
- `*-with-strix` (pentesting) : surdimensionné pour un site statique ; `security-and-hardening` suffit.
- `ponytail-*`, `impeccable`, `vanity-engineering-review`, `insurgent-campaign`, `relationship-design` : hors périmètre ici.
- **`bencium-innovative-ux-designer`** / **`bencium-impact-designer`** : exclus par `doctopus-method`. **Mais leur objet est précisément ce chantier** (« interfaces distinctives, production-grade, qui évitent l'esthétique IA générique »). → **décision à prendre** : lever l'exclusion pour le site uniquement, ou s'en tenir à `refero-design` + `emil-design-eng` (qui couvrent déjà le terrain). Recommandation : **s'en tenir à refero + emil**, et n'appeler bencium que si un écran patine — deux philosophies concurrentes sur le même écran produisent de la bouillie.

---

## 8. Ce qu'il reste à trancher (direction)

1. **Base** : repartir de `feat/site` (123 commits, 8 validateurs) — recommandé — ou page blanche ?
2. **Hébergement** : GitHub Pages (comme l'app, gratuit, statique) ou **Vercel** (previews par PR, edge, meilleure boîte à outils pour un site premium) ?
3. **Langue** : la branche existante est en **DE** (ADR-0014). Confirmer DE d'abord, ou DE + EN dès le départ ?
4. **Périmètre v1** : accueil, vision/projet, **équivalence en Allemagne**, méthode, preuve (« ce qui tombe vraiment »), prix, FAQ, blog, légal, statut. Tout ou sous-ensemble ?
5. **Les trois skills « goût »** à retenir comme canon : `refero-design` + `emil-design-eng` + `apple-design` (mouvement) — d'accord ?
