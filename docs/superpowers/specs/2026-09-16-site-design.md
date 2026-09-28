# Doctopus — Site marketing + légal minimal · spec de design

**Date** : 2026-09-16 · **Statut** : validé G2 (direction, 2026-09-16)
**Sous-projet** : #8 (epic #9) · **Pôle pilote** : Croissance · **Auteur** : spec-site
**Intention (G1)** : `docs/superpowers/specs/2026-09-16-site-intent.md`

## 1. Objectif

Livrer `apps/site`, un site public statique dans l'identité de l'app
(tokens partagés, ADR-0010), qui : (a) explique Doctopus à un candidat FSP
non natif sur mobile en moins de 10 secondes ; (b) prouve son autorité par la
page « Ce qui tombe vraiment » (fréquences par centre, dérivées de ~580
protocoles) ; (c) mène vers l'inscription gratuite depuis chaque viewport ;
(d) porte le bloc légal allemand (Impressum, Datenschutz, AGB,
Widerrufsbelehrung) en brouillon signalé, plus l'avertissement « outil de
langue » ; (e) ne promet jamais un résultat.

Le succès est mesuré, pas jugé : Lighthouse mobile ≥ 95 (perf, a11y, SEO),
TTI < 3 s en 4G simulée, validateurs lexical et structurel verts en CI.

**Hors périmètre** : migration `app/` → `apps/app` (tâche finale distincte,
accord `main`) ; marketing autonome (#10) ; page institutions ; formulaire de
contact avec backend ; multi-Land hors Bade-Wurtemberg (#12) ; langues autres que DE ;
rédaction du blog au-delà d'un article de démonstration ; toute modification
de `app/src/`.

## 2. Décisions prises (avec alternatives écartées)

Brainstorming — trois approches comparées :

| Approche | Pour | Contre |
|---|---|---|
| **A · Astro statique + îlots** (retenue) | HTML pur par défaut, zéro JS hors îlots, content collections (blog, FAQ, légal), Tailwind partagé avec les tokens, Lighthouse ≥ 95 atteignable sans effort spécial | Second framework dans le dépôt ; le hero animé est un îlot à isoler |
| B · Next.js App Router (SSG) | Écosystème Vercel, images optimisées | Runtime React sur chaque page (poids), complexité inutile pour un site sans état |
| C · Vite + React prérendu, composants de l'app réutilisés | Une seule pile | Couplage à `app/src/` (interdit ici), prérendu fragile, SEO moins direct |

| # | Décision | Alternatives écartées |
|---|---|---|
| D1 | **Astro** (sortie `static`), Tailwind alimenté par `@doctopus/tokens`, un seul îlot interactif (hero). | B, C ci-dessus |
| D2 | **Pas de workspaces racine pendant la vague** : `apps/site` référence `@doctopus/tokens` via `"file:../../packages/tokens"` (`docs/contracts/site.md`, arch-site). Les workspaces npm arrivent avec la migration `apps/app` (étape finale). | Workspaces racine maintenant (touche la racine pendant V1) ; pnpm/turbo ; migrer l'app maintenant (interdit par le protocole V1) |
| D3 | **`packages/tokens` = source de vérité** : `tokens.json` → `dist/tokens.css` (custom properties `--dt-…`), `dist/tokens.js` (objet typé alimentant `theme.extend` de Tailwind). Script `scripts/check-parity.mjs` compare avec `app/tailwind.config.js` + `index.css` en lecture seule et échoue sur divergence. Formats et règles : `docs/contracts/tokens.md` (arch-site, prime sur ce spec). | Copier la charte dans le site (dérive garantie) ; faire consommer le preset par l'app dès maintenant (touche `app/`) |
| D4 | **Liquid glass v1 en CSS seul, plafond 8 Ko** (CSS + JS du hero, gz — `docs/contracts/site.md`) : `backdrop-filter`, dégradés coniques animés, `transform` 3D léger sur le hero, transitions de page via View Transitions API. Aucun WebGL, aucune bibliothèque 3D. Tout est neutralisé sous `prefers-reduced-motion: reduce`. L'îlot WebGL (~180 Ko) est une promotion ultérieure conditionnée à la réponse de la direction (§13). | Three.js / shader (≥ 150 Ko, TTI mobile menacé) ; vidéo de fond |
| D5 | **Pages légales rendues depuis `docs/legal/*.md`** (périmètre de compliance-site) via une collection Astro pointée hors de `src/`. Bannière « Entwurf — juristische Prüfung ausstehend » tant que le front-matter `validated_by` est vide. | Dupliquer le texte dans le site ; bloquer le build sans validation |
| D6 | **Déploiement preview `noindex`** (`X-Robots-Tag` + `<meta name="robots">`) tant que `SITE_PUBLIC=false` ; le passage en public est une décision de `main` après validation de l'Impressum. | Mettre en ligne dès la PR (illégal sans Impressum valide) |
| D7 | **Pricing dérivé des contrats** : `apps/site/src/data/pricing.json` porte les lignes de la matrice ; `check-pricing-parity.mjs` vérifie que chaque feature affichée existe dans `docs/contracts/entitlements.md` avec le même plan minimal. Montants en placeholders `{{PRICE_PRO}}`, `{{PRICE_PREMIUM}}`, `{{BILLING_PERIOD}}`. | Texte libre (dérive avec la matrice) ; lecture de `seed.sql` (couplage au serveur) |
| D8 | **« Ce qui tombe vraiment » = JSON généré** par `scripts/build-frequencies.mjs` depuis `ANALYSE.md` §3.1–3.4 (racine du dépôt), validé par schéma ; la page ne contient aucun chiffre en dur. | Saisir les chiffres à la main ; interroger Supabase (le site n'a pas de backend) |
| D9 | **Validateur lexical anti-promesse** `check-no-promise.mjs` sur le HTML construit (DE/FR/EN) ; échec = build rouge. Lexique = `docs/brand/voice.md` §6 « Interdits — liste opposable » **en entier** (C5), chargé par le script depuis ce fichier ; s'y ajoutent « Kündigung mit einem Klick » et « ein Klick » (C2). | Relecture humaine seule |
| D10 | **CTA constant** : bouton « Mit {freeCases} kostenlosen Fällen starten · Ohne Kreditkarte » (C6, `freeCases` = 12 lu du contrat) dans l'en-tête sticky (desktop) et une barre basse sticky (mobile ≤ 768 px), cible `{{APP_URL}}/signup` ; le pricing renvoie vers `{{APP_URL}}/pricing` (Stripe Checkout, fondations #1). Verrou ROADMAP §1.1 levé par la direction : pas de liste d'attente. | CTA seulement dans le hero ; pop-up ; liste d'attente (écartée par la direction) |
| D11 | **Aucun cookie, analytics Plausible/Umami hébergée en UE sans cookie** (endpoint `{{ANALYTICS_ENDPOINT}}`, script ≤ 1 Ko, mentionnée dans Datenschutz), fonts auto-hébergées (`@fontsource` identiques à l'app), pas de bandeau de consentement. | Google Fonts (transfert hors UE), GA |
| D12 | **Statut v1 statique** : `src/data/status.json` (composants + incidents datés, édité à la main) ; pas de sonde. | Fournisseur externe (question Q-direction) ; cron GitHub Actions |
| D13 | **Allemand seul en v1, i18n prête** (décision direction Q1 ; aucune autre langue en V1) : routes sous `/de/`, redirection `/` → `/de/`, `hreflang` uniquement `de`. Chaînes UI dans `src/i18n/de.json`. | Sans structure (coût de rattrapage) ; trois langues v1 (contenu triplé) |
| D14 | **Hébergement Vercel** pour le site (skills `vercel-*`, previews par PR) ; l'app reste sur son hébergement actuel. | GitHub Pages (pas de headers `noindex`, pas de previews) |

## 3. Architecture

```
<racine du dépôt>
├── apps/
│   └── site/                 ← Astro
│       ├── package.json      (dependencies: "@doctopus/tokens": "file:../../packages/tokens")
│       ├── astro.config.mjs  (site: https://{{SITE_DOMAIN}}, output: 'static')
│       ├── tailwind.config.js (theme.extend depuis `tokens` de @doctopus/tokens)
│       ├── src/
│       │   ├── layouts/Base.astro       (head SEO, header, CTA, footer, avertissement)
│       │   ├── components/              (Hero.astro + hero.island.ts, Cta, Pricing, FreqTable, LegalBanner…)
│       │   ├── pages/de/…               (voir §5)
│       │   ├── content/                 (blog/, faq/ — collections Astro)
│       │   ├── data/                    (pricing.json, frequencies.json [généré], status.json, site.json)
│       │   ├── i18n/de.json
│       │   └── styles/site.css          (@import "@doctopus/tokens/tokens.css" (dist))
│       ├── scripts/
│       │   ├── build-frequencies.mjs    (ANALYSE.md §3 → data/frequencies.json)
│       │   ├── check-lighthouse.mjs     (lighthouse CLI, mobile, seuils)
│       │   ├── check-no-promise.mjs     (lexique sur dist/**/*.html)
│       │   ├── check-pricing-parity.mjs (pricing.json ↔ docs/contracts/entitlements.md)
│       │   ├── check-legal.mjs          (4 pages présentes, bannière si non validée, avertissement accueil+footer)
│       │   ├── check-cta.mjs            (playwright : CTA visible à chaque scroll-stop, 3 viewports)
│       │   └── check-placeholders.mjs   (aucun {{…}} dans dist si SITE_PUBLIC=true)
│       └── public/                      (og-image, favicons, captures d'app statiques)
├── packages/
│   └── tokens/
│       ├── tokens.json                  (source unique : couleurs, polices, rayons, durées, easing)
│       ├── build.mjs                    (→ dist/)
│       ├── dist/tokens.css, dist/tokens.js, dist/tokens.d.ts (générés)
│       ├── scripts/check-parity.mjs      (↔ app/tailwind.config.js + index.css, lecture seule)
│       └── test/tokens.test.mjs         (node --test)
├── docs/legal/                          (compliance-site : impressum.md, datenschutz.md, agb.md, widerruf.md)
├── docs/brand/                          (brand-site : positionnement, voix)
└── .github/workflows/site.yml           (build + les 6 check-* + lighthouse ; exit code tranche)
```

Flux de données : `ANALYSE.md` ─(build-frequencies)→ `frequencies.json` ─→ page
« Was wirklich drankommt ». `docs/legal/*.md` ─(collection)→ pages légales.
`docs/contracts/entitlements.md` ─(check-pricing-parity)→ garde-fou du pricing.
`packages/tokens/tokens.json` ─(build)→ CSS + preset ─→ site (et app à la migration).

## 4. Données

### 4.1 `packages/tokens/tokens.json`

```json
{
  "color": { "brand": {"50":"#ecf7f4", "…":"…", "950":"#041e1b"},
             "signal": {"50":"#fdf1ec", "…":"…", "950":"#3a0f0a"},
             "paper": "#f4f5f2",
             "ink": {"DEFAULT":"#0c1a17","800":"#12211e","700":"#1b2f2b","600":"#26403a"} },
  "font": { "display": "Bricolage Grotesque Variable", "sans": "IBM Plex Sans Variable", "mono": "IBM Plex Mono" },
  "motion": { "easeOut": "cubic-bezier(0.16, 1, 0.3, 1)", "durFast": "130ms", "dur": "200ms" },
  "glass": { "baseLight": "255 255 255 / 0.52", "baseDark": "18 33 30 / 0.46" }
}
```
Les valeurs sont **copiées à l'identique** de `app/tailwind.config.js` et
`app/src/styles/index.css` (relevé du 2026-09-16). La parité est vérifiée,
pas supposée.

### 4.2 `apps/site/src/data/frequencies.json` (généré)

```json
{
  "source": "ANALYSE.md §3 — ~580 comptes rendus, 4 centres BW",
  "generatedAt": "2026-09-16",
  "period": "{{PROTOCOLS_PERIOD}}",
  "totalProtocols": 580,
  "nByCenterSum": 593,
  "centers": [{"code":"Fr","name":"Freiburg","n":91}, {"code":"Ka","name":"Karlsruhe","n":169},
              {"code":"Re","name":"Reutlingen","n":151}, {"code":"St","name":"Stuttgart","n":182}],
  "pathologies": [
    {"name":"Depression","specialty":"Psychiatrie","total":30,"byCenter":{"Fr":1,"Ka":11,"Re":7,"St":11}},
    "…"
  ],
  "trends": [{"center":"Re","summary":"…"}]
}
```
`totalProtocols: 580` et `nByCenterSum: 593` (91 + 169 + 151 + 182) sont
cités **tels quels** depuis `ANALYSE.md` l. 110 — un compte rendu peut compter
dans deux centres. `build-frequencies.mjs` vérifie que **chaque valeur
affichée est présente dans `ANALYSE.md`** (chaîne exacte) ; jamais de champ
`partial`, jamais d'arrondi, jamais de somme recalculée. L'écart 580 / 593
est documenté dans une note de méthode (`Methodology`) visible sur la page.
Le §3.2 (fréquences 8→4) est parsé en lignes `total` sans `byCenter`.

### 4.3 `apps/site/src/data/pricing.json`

```json
{
  "billingPeriods": ["monthly", "3-months"],
  "freeCases": 12,
  "plans": [
    {"id":"free","price":"0","features":[{"id":"content.tier:1","status":"live","dir":"cases"}]},
    {"id":"pro","price":"{{PRICE_PRO}}","features":[
      {"id":"content.tier:2","status":"live","dir":"cases"},
      {"id":"sim.online","status":"bald"}, {"id":"league","status":"bald"},
      {"id":"ai.arztbrief","status":"bald"}, {"id":"credits.monthly:200","status":"bald"}]},
    {"id":"premium","price":"{{PRICE_PREMIUM}}","features":[
      {"id":"credits.monthly:1000","status":"bald"}, {"id":"ai.voice","status":"bald"},
      {"id":"priority","status":"bald"}]}
  ],
  "labels": { "content.tier:1": "12 vollständige Fälle …", "…": "…" }
}
```
Conditions du pédagogue (ADR-0008, `reports/pedagogy-site.md`, verdict OK
avec conditions) intégrées :
- **C1** — chaque feature porte `status: live | bald`. `sim.online`, `league`,
  `ai.arztbrief`, `ai.voice`, `credits.monthly` n'ont pas de dossier dans
  `app/src/features/` (relevé 2026-09-16 : account, aufklaerung, cases,
  fachbegriffe, fachwissen, guides, home, pricing, program, simulation, stats)
  → `bald`, rendus groupés sous « Bald verfügbar ». Une feature `live` doit
  déclarer `dir` et ce dossier doit exister.
- **C3** — Premium ne vend pas « plus de contenu » : aucun cas `tier: 3`
  (`grep -c "tier: 3" seedCases.ts` = 0) → pas de `content.tier:3` affiché ;
  Premium = crédits + priorité.
- **C4** — les crédits sont décrits par ce qu'ils achètent aujourd'hui ; tant
  que rien n'est livré, le bloc crédits est `bald`.
- **C6** — `freeCases` est lu depuis `entitlements.md` (« 12 cas Free ») par
  `check-pricing-parity` ; le CTA affiche cette valeur, jamais un littéral.
- **C7** — cadences : mensuel et 3 mois, **sans reconduction tacite**, pas
  d'annuel ; FAQ « Bestanden? » : après la réussite, arrêt sans frais.

`check-pricing-parity.mjs` : chaque `feature.id` listée pour un plan doit
apparaître dans la matrice `entitlements.md` avec une valeur non « — » pour ce
plan ; un plan ne peut pas afficher une feature qu'il n'a pas ; les
`credits.monthly` affichés égalent la matrice ; `freeCases` égale la valeur
du contrat ; **toute feature `live` sans dossier `app/src/features/<dir>`
⇒ exit 1** (lecture seule de `app/`).

### 4.4 `docs/legal/*.md` — front-matter attendu

```yaml
---
title: Impressum
slug: impressum
validated_by: ""        # vide = bannière brouillon ; rempli = nom + date
validated_at: ""
placeholders: ["LEGAL_NAME","LEGAL_ADDRESS","LEGAL_EMAIL"]
---
```
Contrat proposé à compliance-site (périmètre `docs/legal/`) : ces quatre
fichiers, ce front-matter. Sans eux, `check-legal.mjs` échoue.

### 4.5 `src/data/status.json`

`{"components":[{"id":"app","label":"App","state":"operational"},{"id":"api","label":"API (Supabase EU)","state":"operational"},{"id":"billing","label":"Zahlung (Stripe)","state":"operational"}],"incidents":[]}` — `state ∈ operational | degraded | outage | maintenance`.

### 4.6 `src/data/site.json` (réglages)

`{"domain":"{{SITE_DOMAIN}}","appUrl":"{{APP_URL}}","supportEmail":"{{SUPPORT_EMAIL}}","brandName":"Doctopus","productName":"FSP Trainer","tagline":"Die Generalprobe.","analyticsEndpoint":"{{ANALYTICS_ENDPOINT}}","public":false}`
— `public` est surchargeable par la variable d'environnement `SITE_PUBLIC` au
build. Domaine décidé : `doctopus.co` (le placeholder `{{SITE_DOMAIN}}`
reste la valeur de build jusqu'à la mise en ligne) ; canonical sur
`https://doctopus.co`, redirections `www.` → apex et `/` → `/de/`. Marque
**Doctopus**, produit **FSP Trainer** : le site présente Doctopus qui édite
FSP Trainer.

## 5. Composants et pages

Toutes les pages sous `/de/`. Chaque page : `Base.astro` (titre, description,
canonical, OG, `hreflang`, JSON-LD `Organization` + `WebSite`, header sticky
avec CTA, footer avec avertissement « Sprachtrainer, kein Medizinprodukt » et
liens légaux).

| Route | Contenu | Composants |
|---|---|---|
| `/de/` accueil | Hero (thèse en une phrase + CTA + capture de simulation), 3 promesses de *fonction* (jamais de résultat), preuve « Ce qui tombe vraiment » (top 5 + lien), comment ça marche (3 étapes), pricing résumé, FAQ courte, avertissement outil de langue **dans le corps** (pas seulement le footer) | `Hero`, `Proof`, `Steps`, `PricingSummary`, `FaqShort`, `LanguageToolNotice` |
| `/de/produkt/` présentation | Les trois parties de l'examen et les modules (cas, simulation locale/binôme, Fachbegriffe, Fachwissen, Arztbrief), captures | `FeatureSection` × n |
| `/de/quick-guide/` | La FSP en 5 minutes : 60 points, ≥ 60 % par partie, langue uniquement, déroulé ; indexé par Land (BW seul en v1, mention explicite) | `ExamFacts` (données dans `src/data/exam-bw.json`, valeurs de `fsp-official-grading`) |
| `/de/was-drankommt/` « Ce qui tombe vraiment » | Tableau trié, filtre par centre (îlot léger ou `<details>` sans JS), n et période, méthodologie, CTA | `FreqTable`, `Methodology` |
| `/de/preise/` | Trois colonnes ; features `bald` groupées « Bald verfügbar » (C1) ; résiliation formulée « Kündigung jederzeit im Konto, ohne Begründung, wirksam zum Periodenende » (C2 — jamais « mit einem Klick ») ; Premium = crédits + priorité (C3) ; crédits expliqués par ce qu'ils achètent, sans compteur anxiogène (C4) ; cadence mensuel / 3 mois sans reconduction tacite (C7) ; FAQ pricing dont « Bestanden? » ; relu par pédagogue et avocat utilisateur (ADR-0008) | `PricingTable`, `CreditsExplainer` |
| `/de/faq/` | Collection `faq` (md, front-matter `category`) | `FaqList` |
| `/de/blog/`, `/de/blog/[slug]/` | Collection `blog` ; 1 article de démonstration (« Was in Stuttgart wirklich drankommt ») ; RSS ; sitemap | `PostLayout` |
| `/de/ueber/` à propos | Origine (un médecin candidat, ~580 protocoles), équipe, principe de symbiose | statique |
| `/de/support/` | FAQ + `mailto`, délais annoncés, signalement de contenu faux | statique |
| `/de/status/` | `status.json` | `StatusBoard` |
| `/de/impressum/`, `/de/datenschutz/`, `/de/agb/`, `/de/widerruf/` | rendus de `docs/legal/` | `LegalPage` + `LegalBanner` |
| `/404` | | |

`Hero` : îlot `client:idle` ≤ 8 Ko gz, CSS liquid glass ; le HTML du hero est
complet sans JS (texte, CTA, image). `View Transitions` pour les transitions
de page (`transition:animate` sur le hero), désactivées sous
`prefers-reduced-motion`.

## 6. Flux

1. **Build** : `npm run build -w packages/tokens` → `npm run build -w apps/site`
   (exécute `build-frequencies.mjs` en `prebuild`) → `dist/`.
2. **Vérification** (CI `site.yml`, dans l'ordre, chaque étape par code de
   sortie) : `check-parity` → build → `check-placeholders` (mode
   `public` seulement) → `check-no-promise` → `check-legal` →
   `check-pricing-parity` → `check-cta` (Playwright, serveur `astro preview`)
   → `check-lighthouse` (mobile, 4G simulée, 3 passes, médiane).
3. **Déploiement** : Vercel preview par PR (`SITE_PUBLIC=false` → `noindex`).
   Production = `main` décide (`SITE_PUBLIC=true`, domaine final, `robots`).
4. **Visiteur** : arrive par recherche ou pub → page → CTA → `{{APP_URL}}/signup`
   (ou liste d'attente). Aucun état côté site.

## 7. Erreurs et cas limites

- `ANALYSE.md` modifié et non parsable → `build-frequencies` échoue avec la
  ligne fautive ; le JSON précédent n'est pas réutilisé silencieusement.
- Un fichier légal manquant ou sans front-matter → `check-legal` échoue.
- `validated_by` renseigné mais placeholders `{{…}}` encore présents →
  `check-placeholders` échoue en mode public.
- `prefers-reduced-motion` : hero statique, transitions instantanées, aucun
  `backdrop-filter` animé ; vérifié par `check-cta` (émulation du media).
- JS désactivé : toutes les pages lisibles, CTA fonctionnels, filtre de
  centre replié en `<details>`.
- Blog vide : la route `/de/blog/` affiche un état vide honnête, pas une 404.

## 8. Sécurité et conformité

- Site statique : pas de secret, pas de backend, pas de formulaire. En-têtes
  Vercel : `Content-Security-Policy` sans `unsafe-inline` hors `style` des
  îlots hachés, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` minimal.
- Aucun transfert hors UE (fonts locales, pas de CDN tiers, analytics UE sans cookie).
- Pages légales : brouillons de `compliance-site`, jamais présentées comme
  validées sans `validated_by`.
- Le site ne cite aucun nom de patient ni contenu de cas (ROADMAP §1.1) ; les
  captures d'écran d'app sont anonymisées (cas Free uniquement).
- Aucune promesse de résultat (D9) ; formulation « bereitet auf die
  Sprachprüfung vor », jamais « besteht ».

## 9. Tests

| Type | Outil | Ce qui est vérifié |
|---|---|---|
| Unitaire | Vitest dans `apps/site` | parsing `build-frequencies` (fixture d'un extrait d'ANALYSE §3), lexique `check-no-promise` (faux positifs : « keine Garantie » doit passer), parité pricing |
| Contrat | `check-parity` | `tokens.json` ⊆ valeurs de `app/tailwind.config.js` + `index.css` |
| Structure | `check-legal`, `check-placeholders` | présence, bannière, placeholders |
| Navigateur | Playwright (`check-cta`) sur `astro preview`, viewports 360×640, 768×1024, 1280×800 | à chaque scroll-stop (pas de 100 vh), un élément `[data-cta]` est visible dans le viewport ; sous reduced-motion, aucune animation active (`getAnimations().length === 0`) |
| Performance | `lighthouse` CLI, preset mobile, throttling 4G (`--throttling.rttMs=150 --throttling.throughputKbps=1600`), médiane de 3 | perf ≥ 95, a11y ≥ 95, SEO ≥ 95, `interactive` < 3000 ms, sur `/de/`, `/de/preise/`, `/de/was-drankommt/` |
| Visuel | `impeccable` (relecture pôle) | hors CI |

Toutes les vérifications tranchent par **code de sortie** (ADR-0001).

## 10. Critères d'acceptation

| ID | Critère | Preuve |
|---|---|---|
| AC1 | `npm run build -w apps/site` sort 0 et produit les 15 routes du §5. | CI `site.yml` |
| AC2 | `check-lighthouse.mjs` sort 0 : perf/a11y/SEO ≥ 95 et TTI < 3 s (mobile, 4G simulée) sur les trois pages du §9. | artefact JSON Lighthouse joint à la CI |
| AC3 | `check-no-promise.mjs` sort 0 sur `dist/` ; un test injectant « garantiert bestehen » fait sortir 1. | test Vitest + CI |
| AC4 | L'avertissement « outil de langue » est présent dans `<main>` de `/de/` et dans le `<footer>` de chaque page (`[data-notice="language-tool"]`). | `check-legal.mjs` |
| AC5 | Les 4 pages légales existent, rendues depuis `docs/legal/`, avec bannière `[data-legal-status="draft"]` quand `validated_by` est vide. | `check-legal.mjs` |
| AC6 | Un `[data-cta]` est visible à chaque scroll-stop sur les 3 viewports, toutes pages. | `check-cta.mjs` |
| AC7 | `/de/was-drankommt/` ne contient aucun chiffre en dur : tous proviennent de `frequencies.json`, régénéré depuis `ANALYSE.md` ; `totalProtocols: 580` et `nByCenterSum: 593` cités tels quels ; chaque valeur affichée existe dans `ANALYSE.md` ; note de méthode `[data-methodology]` présente ; aucun champ `partial`. | test Vitest sur le script + grep négatif en CI (`grep -c "Depression" src/pages` = 0) |
| AC8 | `/de/preise/` affiche Free/Pro/Premium avec `{{PRICE_PRO}}`, `{{PRICE_PREMIUM}}` (mode preview) ; `check-pricing-parity.mjs` sort 0 ; une feature ajoutée hors matrice fait sortir 1. | test + CI |
| AC9 | Liquid glass : `backdrop-filter` n'apparaît que dans les styles de `Hero` et des transitions (grep CSS de `dist/`) ; sous `prefers-reduced-motion: reduce`, `document.getAnimations()` est vide sur `/de/`. | `check-cta.mjs` (émulation) + grep |
| AC10 | Aucun cookie posé ; la seule requête vers un domaine tiers pendant la navigation des 15 routes est l'endpoint analytics configuré (`{{ANALYTICS_ENDPOINT}}`). | Playwright : `context.cookies()` vide, `request` listener filtré sur l'hôte analytics |
| AC11 | `check-parity.mjs` sort 0 ; la modification d'une couleur dans `tokens.json` sans mise à jour de l'app fait sortir 1. | test |
| AC12 | `SITE_PUBLIC=false` → chaque page porte `<meta name="robots" content="noindex">` et l'en-tête `X-Robots-Tag: noindex` (config Vercel). | Playwright sur preview |
| AC13 | `app/src/` est **inchangé** sur la branche (diff vide). | `git diff --stat main -- app/src` |
| AC14 | Le pédagogue et l'avocat utilisateur ont relu `/de/preise/` (ADR-0008). | rapports dans `reports/` |
| AC15 | `check-pricing-parity.mjs` sort 1 si une feature `live` n'a pas de dossier dans `app/src/features/` ; sort 0 sur le `pricing.json` du §4.3. | test Vitest (fixture avec `live` + `dir` inexistant) + CI |

## 11. Impacts

- **Racine du dépôt** : aucun `package.json` racine (D2) ; seul
  `.github/workflows/site.yml` est nouveau. Proposition de contrat à `main` :
  la CI existante `quality.yml` n'est pas modifiée.
- **`docs/contracts/`** : aucun contrat modifié. Proposition à `arch-site` :
  documenter dans `docs/contracts/site.md` (a) le front-matter légal §4.4, (b)
  le schéma `frequencies.json`, (c) la règle de parité pricing.
- **`CONTEXT.md`** (section « Site » à créer, proposition) : *Ce qui tombe
  vraiment* (page de fréquences par centre), *Centre* (Freiburg, Karlsruhe,
  Reutlingen, Stuttgart — lieu de passage, pas Land), *Mode de lancement*
  (supprimé — checkout réel décidé), *Avertissement outil de langue*, *Bannière
  brouillon légal*.
- **Migration `app/` → `apps/app`** : préparée par D2/D3, exécutée comme
  tâche finale distincte après accord `main`.
- **#10 Marketing** : consomme les pages et le blog ; aucune dépendance
  inverse.

## 12. Red-team (agentops) sur ce spec — trous fermés / reportés

| Attaque | Réponse |
|---|---|
| « La page de fréquences expose l'origine douteuse du corpus (ROADMAP §1.1). » | Elle affiche des agrégats (pathologie × centre), jamais un protocole ni un nom. Mention « Aggregierte Auswertung von Prüfungsberichten » ; la formulation exacte est relue par compliance-site. **Fermé.** Le verrou §1.1 reste non délégable et est rappelé à la direction (Q5). |
| « Une page pricing avec `{{PRICE_PRO}}` mise en ligne par erreur. » | `check-placeholders` bloque tout build `SITE_PUBLIC=true` contenant `{{`. **Fermé.** |
| « Lighthouse ≥ 95 est flou : quel appareil, quel réseau ? » | Preset mobile Lighthouse (Moto G Power émulé), throttling explicite, médiane de 3, pages nommées. **Fermé.** |
| « Le liquid glass CSS n'est pas “3D” comme la vision le dit. » | La vision demande un *moment de magie* rapide, pas une technologie. CSS 3D (`perspective`, `rotate3d` au pointeur) suffit en v1 ; WebGL **reporté** à une itération mesurée si le budget perf le permet. |
| « Les tokens divergent dès la première retouche de l'app. » | Parité vérifiée en CI, mais la CI du site ne tourne pas sur un changement d'`app/tailwind.config.js` → **Reporté** : ajouter le check à `quality.yml` lors de la migration. D'ici là, risque accepté et documenté. |
| « Le statut “manuel” ment si personne ne l'édite. » | Page datée (`updatedAt` affiché) ; libellé « manuell gepflegt ». Fournisseur externe **reporté** (Q direction). |
| « Datenschutz sans analytics est simple, mais l'app, elle, collecte. » | Le Datenschutz couvre site **et** app ; c'est le périmètre de compliance-site ; le spec exige seulement que la page existe et soit signalée brouillon. **Fermé** (renvoi). |
| « Playwright “visible à chaque scroll-stop” est non déterministe. » | Scroll par pas de 80 % de la hauteur du viewport, attente `networkidle`, vérification par `boundingClientRect` intersecté au viewport. Déterministe sur contenu statique. **Fermé.** |
| « Le blog vide tue le SEO. » | 1 article de démonstration exigé ; le reste appartient à #10. **Reporté** explicitement. |
| « L'app affiche “FSP-Cockpit”, le site dit “Doctopus”. » | Tranché par la direction : Doctopus = marque, FSP Trainer = produit (`site.json.brandName` / `productName`). |

## 13. Reporté (explicite)

- Résiliation réellement « en un clic » = proposition de contrat aux fondations (bouton « Kündigen » dans l'app → `cancel_at_period_end`), pas un texte de site (C2) ;
- Îlot WebGL liquid glass (~180 Ko) — promotion ultérieure, conditionnée à la réponse de la direction et à une mesure AC2 verte avec l'îlot ; fournisseur de statut externe ; FR/EN (aucune autre langue en V1) ; page institutions ; formulaire de contact ;
  intégration du check de parité des tokens dans `quality.yml` (à la
  migration) ; multi-Land dans « Ce qui tombe vraiment » (#12) ; rédaction
  du blog (#10).

## 14. Self-review

- Placeholders : tous nommés et bloqués en mode public (`{{SITE_DOMAIN}}`,
  `{{APP_URL}}`, `{{SUPPORT_EMAIL}}`, `{{PRICE_PRO}}`, `{{PRICE_PREMIUM}}`,
  `{{BILLING_PERIOD}}`, `{{PROTOCOLS_PERIOD}}`, `{{ANALYTICS_ENDPOINT}}`, `{{LEGAL_*}}`).
- Contradictions : le brief lead-site parle de « 4G simulée » et Lighthouse
  applique par défaut un « slow 4G » — le spec fixe les valeurs (§9) pour lever
  l'ambiguïté. Le brief mentionne « pricing réel » comme dépendance de #1 :
  la matrice est réelle, les montants restent une décision de direction (Q3).
- Périmètre : seuls `apps/site/`, `packages/tokens/` et
  `.github/workflows/site.yml` sont écrits ; ce dernier est signalé comme
  proposition à `main` (§11). Aucun `package.json` racine (D2). `docs/legal/` et
  `docs/brand/` appartiennent à compliance-site et brand-site.
- Ambiguïtés restantes : Q1–Q7 de l'intention ; la période des protocoles
  (`{{PROTOCOLS_PERIOD}}`) est inconnue de tous les documents lus.

## 16. Décisions de la direction (G1 + G2 validés le 2026-09-16 sur `93ea334`)

- Q1 : DE seul, i18n prête, aucune autre langue V1 (D13).
- Q2 : domaine `doctopus.co` ; `{{SITE_DOMAIN}}` reste le placeholder de build ; canonical + redirections (§4.6).
- Q3 : inchangé — `{{PRICE_PRO}}`, `{{PRICE_PREMIUM}}` ; mensuel + 3 mois sans reconduction tacite (C7).
- Q4 : « Doctopus » = marque, « FSP Trainer » = produit.
- Q5 : verrou ROADMAP §1.1 levé → checkout réel via l'app (`/pricing` → Stripe Checkout, #1) ; liste d'attente supprimée (D10).
- Q6 : analytics Plausible/Umami UE sans cookie (D11, AC10).
- Q7 : `{{LEGAL_*}}` restent des placeholders bloqués en mode public.
- Tagline « Die Generalprobe. » ; D4 glass CSS ≤ 8 Ko ; job CI `site` autorisé (diff `docs/contracts/site.md` §8) ; D2 sans workspaces.

## 15. Divergences avec les artefacts parallèles (tranchées par la direction, §16)

- **Langue** : `docs/brand/naming-and-domain.md` (brand-site) recommande FR + DE
  dès la v1 (option 3) ; ce spec recommande DE d'abord avec i18n prête (D13,
  Q1-c). Les deux sont compatibles techniquement (D13 prévoit `/fr/`) ; la
  différence est le volume de contenu v1. **Question Q1 enrichie** : (c') DE +
  FR pour hero, présentation, quick guide, pricing, FAQ, à propos ; DE seul
  pour « Ce qui tombe vraiment », blog et légal — c'est la proposition de la
  marque. Si la direction retient (c'), AC1 passe à ~21 routes et `hreflang`
  `de` + `fr`.
- **Tokens** : `docs/contracts/tokens.md` (arch-site) fixe les formats de
  sortie ; ce spec s'y aligne (D3). Aucune divergence restante.
- **Tagline** : la marque recommande « Die Generalprobe. » ; adoptée (G1).
- **Langue** : tranchée — DE seul (Q1).
