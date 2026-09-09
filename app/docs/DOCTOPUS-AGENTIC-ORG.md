# Doctopus — organisation agentique, de la bêta locale au SaaS en ligne

> Ce document remplace la vision « outil local » de `ROADMAP-PRODUCTION.md` par
> la vision **Doctopus** : un SaaS freemium + abonnements, avec simulation
> vocale et patient IA en features premium. Il est écrit pour être exécuté :
> chaque département correspond à des fichiers réels dans `.claude/agents/`,
> chaque phase a un gate mécanique, chaque case à cocher a un propriétaire.
>
> `AGENTIC-TEAM.md` (les 5 relecteurs) reste valable : il devient le
> département **Qualité contenu** de cette organisation.

---

## 0. Trois vérités d'ingénierie avant l'organigramme

Une organisation d'agents ne vaut que si elle repose sur ce que les agents
**font réellement**. Trois points à poser d'emblée, pour ne pas construire sur
une fiction.

**1 · Les sous-agents ne se parlent pas — et c'est une bonne chose.**
Un agent est lancé, travaille isolément, rend un livrable. Ce qui fait
travailler un département avec un autre, ce n'est pas une conversation, c'est
un **contrat écrit** que les deux lisent : un schéma OpenAPI, un schéma de base,
une matrice d'entitlements, un fichier de types. C'est exactement comme ça que
des équipes humaines distribuées tiennent — et c'est plus robuste qu'un chat,
parce que le contrat est versionné, diffable et testable. Le **coordinateur**
est le seul point où tous les livrables convergent.

**2 · « Entraîné pour son rôle » signifie : un brief dense, des outils
restreints, des exemples du projet, et un gate qui refuse son travail s'il
dévie.** Pas un modèle fine-tuné. Un agent `.md` avec un périmètre exclusif, les
fichiers de référence à lire, les pièges déjà rencontrés sur ce projet, et un
livrable vérifiable. C'est ce qui a marché pour la pipeline de cas ; c'est ce
qui marchera ici.

**3 · On ne paie jamais un agent pour ce qu'un script fait gratuitement.**
Chaque département a d'abord une **couche mécanique** (tests, lint, contrats,
évaluations automatisées) et ensuite seulement des agents de jugement. Le
freemium ajoute un backend, donc des surfaces d'erreur nouvelles (auth,
paiement, données personnelles) : là, la couche mécanique n'est pas une
économie, c'est une obligation.

---

## 1. Ce qui change avec Doctopus

| | Bêta locale (aujourd'hui) | Doctopus (cible) |
|---|---|---|
| Données | 100 % IndexedDB, rien ne sort | Compte utilisateur, progression synchronisée, **hors-ligne conservé** |
| Contenu | Embarqué dans le bundle | Servi selon l'abonnement, mis en cache localement |
| Accès | Libre | Freemium → Pro → Premium |
| Simulation | Texte, second écran humain | + **patient IA** (LLM ancré sur la fiche) + **voix** (TTS par patient) |
| Responsabilité | Personnelle | Impressum, AGB, DSGVO, Stripe, support |
| Dépôt | Public | Code et contenu **séparés** ; contenu privé |

Ce n'est pas une évolution de l'app : **c'est un second produit autour de la
même app**. L'organisation ci-dessous est dimensionnée pour ça.

---

## 2. L'organigramme

```
                              ┌─────────────────────────────┐
                              │   DIRECTION — Mehdi          │
                              │   produit · prix · légal ·   │
                              │   go/no-go de chaque phase   │
                              └──────────────┬──────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │   COORDINATION               │
                              │   orchestrateur (session     │
                              │   principale) + workflows +  │
                              │   release-manager            │
                              └──────────────┬──────────────┘
                                             │  contrats écrits (docs/contracts/)
        ┌──────────────┬──────────────┬──────┴───────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼              ▼
  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
  │ PRODUIT & │ │ CONTENU   │ │ PLATEFORME│ │ FRONTEND  │ │ VOIX & IA │ │ QUALITÉ,  │
  │ PÉDAGOGIE │ │ CLINIQUE  │ │ (backend) │ │           │ │           │ │ SÉCU, OPS │
  └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘
   spec, parcours  cas, fiches,  schéma, API,  écrans,       patient LLM,  QA e2e,
   gamification    langue,       auth, Stripe, paywall,      TTS, evals    sécurité,
                   validateurs   sync          sync UI                     CI/CD, obs.
```

Six départements, un coordinateur, une direction. **Dix-huit agents** au total,
dont cinq existent déjà. Chacun est soit **implémenteur** (écrit dans un
périmètre de fichiers précis), soit **relecteur** (lecture seule). Jamais les
deux : celui qui écrit ne se relit pas.

---

## 3. Les départements, agent par agent

Convention de nommage : `<dept>-<rôle>.md` dans `.claude/agents/`.
Colonne « Écrit dans » = le seul périmètre où l'agent a le droit de modifier.

### 3.1 · Coordination

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| **orchestrateur** (session principale, pas un fichier) | Quelle est la prochaine étape, qui la fait, quel gate la valide ? | partout, par fusion des livrables | Commits, arbitrages, tableau de bord des phases |
| `coord-release-manager` | Cette version est-elle livrable ? | `CHANGELOG.md`, tags | Note de version, checklist de gate cochée avec preuves, go/no-go motivé |

Le coordinateur ne produit pas de code : il découpe, lance en éventail, fusionne,
arbitre les conflits entre rapports, applique. Ses procédures sont des
**skills** (`/phase-plan`, `/release-check`) et des **scripts `Workflow`** pour
les rituels répétitifs (revue de lot, audit pré-release).

### 3.2 · Produit & Pédagogie

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| `product-spec-writer` | Que construit-on exactement, pour qui, et comment saura-t-on que c'est réussi ? | `docs/specs/` | PRD par feature : problème, utilisateur, critères d'acceptation **testables**, hors-périmètre explicite |
| `product-pedagogy-designer` | La progression apprend-elle vraiment, ou occupe-t-elle ? | `docs/specs/pedagogy/` | Parcours d'apprentissage, règles de couches/SRS, **gamification ancrée sur des comportements utiles** (une simulation complète vaut plus qu'un login quotidien) |

Ce département écrit **avant** que quiconque code. Une feature sans PRD n'entre
pas en développement — c'est ce qui a manqué au mode focus, qu'on a dû
retravailler quatre fois.

### 3.3 · Contenu clinique

Les cinq relecteurs de `AGENTIC-TEAM.md`, plus l'auteur de la pipeline v3.

| Agent | Rôle | Écrit dans |
|---|---|---|
| `content-case-author` | Authore un cas complet depuis un protocole réel (pipeline v3 : recherche mutualisée → rédaction par lot) | `app/scratchpad/lot*/` (JSON), intégré par `lotAssembler.py` |
| `fsp-clinical-reviewer` · `fsp-language-reviewer` · `fsp-concision-editor` | existants — lecture seule | — |
| `content-anonymizer` | Aucun nom réel ne subsiste-t-il dans le corpus ? | `app/src/data/seedCases.ts` (noms uniquement) | Table de pseudonymisation + validateur `checkNoRealNames.mjs` qui refuse tout nom hors table |

**Gate mécanique** : les 6 validateurs existants + `checkNoRealNames`.
Prérequis absolu à toute diffusion : ce département est le seul qui touche à un
risque juridique direct.

### 3.4 · Plateforme (backend)

Le département qui n'existe pas encore et qui porte le plus de risque.

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| `platform-architect` | Quel schéma, quelle API, quel modèle de sync tiennent le hors-ligne ET le multi-appareil ? | `docs/contracts/` | **Les contrats** : `schema.sql`, `openapi.yaml`, `entitlements.md`, `sync-protocol.md`. Lecture seule sur le code. |
| `platform-implementer` | Le backend respecte-t-il le contrat, ligne à ligne ? | `server/` (ou `supabase/`) | Migrations, RLS, fonctions edge, **tests de contrat** qui échouent si l'API dévie d'`openapi.yaml` |
| `platform-billing-engineer` | Le paiement est-il juste, idempotent, et l'entitlement suit-il l'état Stripe en toute circonstance ? | `server/billing/` | Webhooks Stripe idempotents, matrice état-abonnement → droits, tests sur chaque transition (essai, échec de paiement, résiliation, remboursement) |
| `platform-sync-engineer` | La progression survit-elle à tout : hors-ligne long, deux appareils, conflit, réinstallation ? | `app/src/sync/`, `server/sync/` | Couche de sync Dexie ↔ Postgres, résolution de conflits **documentée**, tests de scénarios |

**Gate mécanique** : tests de contrat, tests d'intégration sur base éphémère,
migration up/down testée, `stripe-cli` en replay de webhooks.

### 3.5 · Frontend

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| `front-implementer` | L'écran fait-il ce que le PRD dit, avec les composants qui existent déjà ? | `app/src/` | Écrans compte / paywall / onboarding / paramètres de sync ; réutilise `PhraseControls`, `SidePanel`, `TimeCapsule` avant de créer |
| `front-design-keeper` | La charte « instrument clinique » tient-elle ? Un composant nouveau était-il nécessaire ? | lecture seule | Rapport : écarts de tokens, doublons de composants, régressions de mouvement (`ease-fluid`, reduced-motion) |
| `fsp-ux-auditor` | existant — a11y, responsive, thèmes | lecture seule | — |

**Gate mécanique** : `typecheck`, `build`, tests de composants (à introduire :
Vitest + Testing Library sur les contrôles interactifs), Lighthouse CI
(performance, a11y ≥ 95).

### 3.6 · Voix & IA

Le département premium. Deux briques, deux risques différents.

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| `ai-patient-engineer` | Le patient IA reste-t-il **dans sa fiche** — ne dit jamais ce que `patientSheet` ne contient pas ? | `app/src/lib/simulationStep.ts` (le hook prévu), `server/ai/` | Prompt système généré depuis la fiche, réponses ancrées sur `antworten`, refus élégant hors-fiche, registre patient (jamais de Fachbegriff) |
| `ai-voice-engineer` | Chaque patient a-t-il une voix stable, crédible, et le coût par simulation est-il borné ? | `server/voice/`, `app/src/voice/` | Profil vocal par cas (voix + prosodie + âge), **pré-génération et cache** des répliques fixes du `Rollenskript`, streaming pour le dynamique uniquement |
| `ai-eval-engineer` | Comment prouve-t-on que le patient IA ne dérive pas ? | `evals/` | Jeu d'évaluation par cas : fidélité à la fiche, registre, niveau de langue, refus hors-fiche ; **seuil bloquant en CI** |

**Une clarification sur « TTS entraînés par patient »** : avec les fournisseurs
actuels (ElevenLabs, Azure, OpenAI), on ne réentraîne pas un modèle par cas ; on
**conçoit** une voix (voice design ou clone d'acteur consentant) qui devient un
identifiant stable, puis on la paramètre (âge, débit, émotion) par personnage.
Le résultat perçu est le même — Frau Kovermann n'a pas la voix de Herr Kartmann —
pour une fraction du coût.

**Le levier économique décisif** : le moteur `rolePlay.ts` produit déjà des
répliques **déterministes** par sonde. Elles se pré-génèrent une fois, se
stockent, et se servent gratuitement à chaque simulation. Seules les réponses
libres du patient IA passent en TTS temps réel. Le coût marginal d'une
simulation vocale devient faible et prévisible — condition pour que le premium
soit rentable.

**Gate mécanique** : `evals/` en CI avec seuil ; budget de tokens et de
caractères TTS par simulation mesuré et plafonné côté serveur.

### 3.7 · Qualité, sécurité, opérations

| Agent | Question unique | Écrit dans | Livrable |
|---|---|---|---|
| `fsp-qa-tester` | existant — parcours de bout en bout | lecture seule | Étendu : parcours inscription → paiement (mode test) → accès → sync → résiliation |
| `ops-security-auditor` | Où un utilisateur peut-il lire ou écrire ce qui n'est pas à lui ? | lecture seule | Revue RLS ligne à ligne, OWASP top 10, secrets hors du client, rate-limiting sur l'IA/voix, **preuve par requête tentée et refusée** |
| `ops-devops-engineer` | Peut-on déployer, revenir en arrière et observer sans intervention manuelle ? | `.github/workflows/`, `infra/` | Environnements preview/staging/prod, migrations automatisées, rollback testé, alertes |
| `ops-compliance-checker` | Ce qui doit être écrit pour opérer en Allemagne est-il écrit et **branché** ? | `docs/legal/`, pages légales | Impressum, Datenschutzerklärung, AGB, avertissement « outil de langue, pas dispositif médical », registre des traitements. **Brouillons à faire valider par un juriste** — l'agent prépare, il ne certifie pas. |

**Gate mécanique** : scan de dépendances, scan de secrets, tests RLS
automatisés (un utilisateur A tente de lire B → 0 ligne), Lighthouse,
disponibilité mesurée.

---

## 4. Ce qui fait tenir l'ensemble : les contrats

Le répertoire `docs/contracts/` est **la seule source de vérité partagée**.
Chaque agent le lit ; seul `platform-architect` y écrit, sur validation du
coordinateur. Quatre fichiers :

| Contrat | Contenu | Consommé par |
|---|---|---|
| `schema.sql` | Tables, RLS, index. Ce qui existe en base, rien d'autre. | platform-*, sync, security |
| `openapi.yaml` | Chaque endpoint, ses entrées, ses sorties, ses erreurs | platform-implementer, front-implementer, qa |
| `entitlements.md` | Matrice plan × feature × quota. Free / Pro / Premium, en une table. | billing, front (paywall), ai-* (quotas), product |
| `sync-protocol.md` | Ce qui se synchronise, quand, et comment un conflit se résout | sync-engineer, front, qa |

Un agent qui a besoin de « parler » à un autre département **propose un
changement de contrat** au coordinateur. Le contrat change, les deux
implémenteurs relisent. C'est plus lent qu'un message — et c'est pour ça que ça
marche : chaque interface est explicite, versionnée, et testée.

---

## 5. Recommandation de pile technique

Tu n'as pas demandé la pile, mais l'organisation en dépend : les briefs d'agents
du département Plateforme ne s'écrivent pas de la même façon selon qu'on
choisit un BaaS ou un serveur maison.

| Brique | Recommandation | Pourquoi |
|---|---|---|
| Frontend | **garder** React + Vite + Dexie | Le hors-ligne est un avantage produit ; on ajoute, on ne remplace pas |
| Backend | **Supabase, région Francfort** (Postgres + Auth + RLS + Storage + Edge Functions) | Un fondateur seul : zéro serveur à administrer, RLS = sécurité déclarative auditable, données en UE pour la DSGVO. Alternative si souveraineté stricte : Hetzner + Postgres autogéré, mais c'est un poste d'ops à temps partiel. |
| Paiement | **Stripe** (Checkout + Customer Portal + webhooks) | Standard, TVA UE gérée, portail client sans code |
| Patient IA | **Claude** côté serveur (Edge Function), fiche patient en contexte | Ancrage strict sur `patientSheet` ; la clé ne touche jamais le client |
| Voix | ElevenLabs ou Azure Speech, via fonction serveur, **cache des répliques fixes** dans Storage | Coût borné par la pré-génération ; changement de fournisseur sans toucher au client |
| Hébergement front | Cloudflare Pages ou Vercel, domaine `doctopus.*` | Preview par PR, rollback instantané |
| Observabilité | Sentry (erreurs) + logs Supabase + un tableau de coûts IA/voix | Le poste de coût variable doit être visible dès le premier jour |

**Le principe directeur** : tout ce qui est secret, payant ou juridiquement
sensible passe par le serveur ; tout ce qui est expérience reste local et
hors-ligne. La sync ne fait que réconcilier.

---

## 6. La feuille de route — phases, propriétaires, gates

Chaque phase se termine par un **gate** : mécanique d'abord, agents de jugement
ensuite, go/no-go de la direction enfin. On n'ouvre pas la phase suivante sur un
gate rouge.

### Phase 0 — Décisions & fondations · *Direction + Coordination*

- [ ] **Trancher l'origine du corpus** (voir `ROADMAP-PRODUCTION.md` §1.1). Non délégable. Conditionne la monétisation, pas la construction — on construit en parallèle.
- [ ] **Séparer code et contenu** : dépôt `doctopus-app` (code, peut rester public) / dépôt ou bucket `doctopus-content` (privé). Le seed devient un chargement authentifié.
- [ ] Choisir la pile (§5) — ou l'amender. Les briefs Plateforme en dépendent.
- [ ] Créer `docs/contracts/`, `docs/specs/`, `evals/`.
- [ ] Scaffolder les 13 nouveaux agents dans `.claude/agents/` avec leurs briefs.
- [ ] **Gate** : décisions écrites et datées dans `docs/DECISIONS.md`.

### Phase 1 — Spécification & architecture · *Produit + Plateforme (architecte)*

- [ ] PRD : compte & onboarding · paywall & plans · sync · patient IA · voix. Critères d'acceptation testables.
- [ ] Parcours pédagogique et gamification écrits **avant** tout écran.
- [ ] `entitlements.md` — la matrice Free / Pro / Premium (les prix sont ta décision ; la structure est la nôtre).
- [ ] `schema.sql` avec RLS · `openapi.yaml` · `sync-protocol.md`.
- [ ] **Gate** : relecture croisée — `ops-security-auditor` sur le schéma, `front-design-keeper` sur les PRD d'écrans, `fsp-qa-tester` sur la testabilité des critères. Validation direction.

### Phase 2 — Durcir la bêta · *Contenu + Frontend*

Ce qui doit être vrai **avant** qu'un inconnu utilise l'app, indépendamment du SaaS.

- [ ] Pseudonymisation complète + `checkNoRealNames.mjs` en CI.
- [ ] Export / import de la progression (filet avant la sync).
- [ ] Migrations de schéma Dexie versionnées et testées.
- [ ] Onboarding 3 écrans.
- [ ] PWA : manifest + service worker (hors-ligne réel).
- [ ] Tests de composants sur les contrôles interactifs (Vitest).
- [ ] Passe complète des 5 relecteurs sur le corpus, correctifs appliqués.
- [ ] **Gate** : CI verte (contrats + tests + Lighthouse a11y ≥ 95), rapports des 5 relecteurs sans BLOQUANT.

### Phase 3 — Plateforme · *Plateforme + Sécurité*

- [ ] Projet Supabase EU, migrations depuis `schema.sql`, RLS activée sur **toutes** les tables.
- [ ] Auth (e-mail + magic link ; OAuth optionnel).
- [ ] Livraison du contenu selon entitlement, mise en cache Dexie.
- [ ] Sync de la progression (SRS, simulations, programme) selon `sync-protocol.md`.
- [ ] Stripe : Checkout, portail, webhooks idempotents, matrice de transitions testée.
- [ ] **Gate** : tests de contrat verts, tests RLS (A ne lit pas B : prouvé), replay de tous les webhooks Stripe, revue `ops-security-auditor` sans BLOQUANT.

### Phase 4 — Frontend SaaS · *Frontend + QA*

- [ ] Écrans compte, connexion, paywall contextuel (au moment où la feature manque, pas à l'entrée), paramètres de sync.
- [ ] Indicateur d'état hors-ligne / synchronisé, discret, charte respectée.
- [ ] Mode invité conservé : l'app reste utilisable sans compte sur le périmètre Free.
- [ ] **Gate** : `fsp-qa-tester` sur le parcours complet inscription → paiement test → accès → résiliation ; `fsp-ux-auditor` + `front-design-keeper` sans MAJEUR.

### Phase 5 — Voix & patient IA · *Voix & IA + Évaluation*

- [ ] Patient IA derrière un drapeau, ancré sur `patientSheet`, via `simulationStep.ts`.
- [ ] `evals/` : par cas, fidélité à la fiche · registre patient · niveau de langue · refus hors-fiche. Seuil bloquant.
- [ ] Profils vocaux par cas ; pré-génération du `Rollenskript` ; streaming des réponses libres.
- [ ] Plafonds par utilisateur et par plan (tokens, caractères), mesurés côté serveur.
- [ ] **Gate** : evals au-dessus du seuil sur les 52 cas ; coût moyen par simulation vocale mesuré et **inférieur au seuil de rentabilité** que tu fixeras d'après le prix Premium.

### Phase 6 — Conformité & lancement · *Compliance + Ops + Direction*

- [ ] Impressum, Datenschutzerklärung, AGB, avertissement médical — brouillons agents, **validation juriste**.
- [ ] Registre des traitements, DPA Supabase/Stripe/fournisseur voix signés.
- [ ] Domaine, environnements preview/staging/prod, rollback testé, alertes.
- [ ] Page d'accueil publique ; boucle de signalement d'un contenu faux.
- [ ] **Bêta fermée** : 20 à 50 candidats, un mois, retours structurés.
- [ ] **Gate** : `coord-release-manager` assemble la checklist avec preuves ; go/no-go direction.

### Phase 7 — Exploitation · *tous, en rituels*

- [ ] Cadence de contenu : un lot par session d'examen, pipeline v3 + relecteurs.
- [ ] Revue trimestrielle des 5 relecteurs sur tout le corpus.
- [ ] Tableau de coûts IA/voix hebdomadaire ; alerte si le coût par simulation dérive.
- [ ] Support : file de retours triée par le coordinateur, bugs vers QA, contenu vers Contenu.

---

## 7. Les rituels — qui tourne quand

| Déclencheur | Mécanique | Agents |
|---|---|---|
| Chaque push | CI complète (contrats, tests, RLS, evals, Lighthouse) | aucun |
| Nouvelle feature | — | `product-spec-writer` → PRD → coordinateur découpe |
| Changement de contrat | tests de contrat | `platform-architect` propose, les implémenteurs concernés relisent |
| Lot de contenu | 7 validateurs | `content-case-author` → 3 relecteurs contenu |
| Modification d'écran | typecheck, build, tests composants | `fsp-ux-auditor` + `front-design-keeper` |
| Modification backend | tests de contrat + RLS | `ops-security-auditor` |
| Modification IA/voix | `evals/` avec seuil | `ai-eval-engineer` |
| Pré-release | tout | les relecteurs de tous les départements → `coord-release-manager` |

---

## 8. Ce que cette organisation ne fera pas

- **Elle ne décide ni le prix, ni les plans, ni la date de lancement.** Elle
  fournit la structure et les mesures ; les nombres sont les tiens.
- **Elle ne certifie pas la conformité juridique.** Elle rédige des brouillons
  solides ; un juriste allemand valide. Sur l'Impressum, les AGB et la DSGVO,
  c'est non négociable pour un produit payant.
- **Elle ne rend pas le contenu inviolable.** Un abonné peut extraire ce que son
  navigateur affiche. La protection, c'est la licence et la valeur du service
  (sync, voix, IA, mises à jour), pas un DRM.
- **Elle ne tourne pas en continu.** Chaque agent lancé coûte ; les rituels
  sont un plafond.

---

## 9. Prochaine étape concrète

Trois décisions à valider pour que je scaffolde les 13 agents avec des briefs
justes (ils changent selon la réponse) :

1. **Pile** : Supabase EU, ou serveur autogéré ?
2. **Séparation** : code public + contenu privé, ou tout privé ?
3. **Fournisseur voix** : ElevenLabs (qualité, voice design) ou Azure (coût, conformité UE native) ?

Une fois tranché, la phase 0 se fait en une session : contrats vides, agents
scaffoldés, CI étendue, `DECISIONS.md` ouvert.
