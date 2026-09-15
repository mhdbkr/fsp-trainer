# Contrat — site marketing Doctopus (`apps/site`)

> ADR-0010 (monorepo), ADR-0008 (veto pédagogue sur le pricing), ADR-0009 (routage).
> Propriétaire : `platform-architect`. Statut : **brouillon sous réserve G1/G2** — la structure et les budgets ne dépendent pas du spec ; la liste des pages sera réconciliée avec `spec-site`.

## 1. Question tranchée

Un site **rapide sur mobile** (< 3 s), **indexable** (la FSP est une niche cherchée), avec **un** moment de magie (liquid glass 3D au hero), qui porte la charte de l'app via `@doctopus/tokens`, se déploie sur Vercel, et se vérifie **par scripts à code de sortie** avant tout jugement d'agent.

## 2. Stack — trois options, une recommandation

Critères pondérés : (a) JS embarqué par défaut, (b) SEO/blog Markdown natif, (c) isolation d'un îlot 3D lourd, (d) Vercel, (e) i18n DE/FR/EN, (f) consommation des tokens, (g) simplicité d'exploitation pour une équipe d'agents.

| | **Astro 5 (statique + îlots)** | Next.js 15 (App Router) | Vite + React SSG (vite-ssg / vike) |
|---|---|---|---|
| (a) JS par défaut | **0 Ko** hors îlots ; l'îlot hero seul charge React+three | ~85–90 Ko de runtime React/RSC sur chaque page, même statique | runtime React sur toutes les pages (~45 Ko) + hydratation complète |
| (b) Blog Markdown | **Content Collections** typées (Zod), MDX, RSS, sitemap officiels | possible (MDX + `generateStaticParams`), à assembler | plugin tiers, sitemap/RSS à écrire |
| (c) Îlot 3D isolé | `client:visible` / `client:idle` + `import()` : **natif** | `dynamic(() => …, { ssr:false })` : bien, mais la page porte déjà le runtime | `React.lazy` : bien |
| (d) Vercel | adaptateur officiel ; statique pur = CDN, zéro fonction | **natif** | statique pur |
| (e) i18n | routage i18n intégré (`i18n.locales`, `defaultLocale`) | middleware à écrire | à la main |
| (f) Tokens | `tailwind.config` lit `tokens` ; `tokens.css` importé une fois | idem | idem |
| (g) Simplicité | un seul modèle mental : HTML statique, îlots explicites | RSC/Client boundaries, cache, deux runtimes : **surface d'erreur inutile** pour un site vitrine | tout est à câbler ; moins d'outillage |
| Lighthouse ≥ 95 mobile | atteignable **par défaut** | atteignable avec discipline (fonts, images, RSC) | atteignable avec discipline |

**Recommandation : Astro 5, sortie statique (`output: 'static'`), Tailwind 3 (même version majeure que l'app pour que le `theme.extend` issu des tokens soit identique), îlot React uniquement pour le hero 3D et les rares widgets interactifs (calculateur de pricing, statut).** Next est la bonne réponse à une question que le site ne pose pas (rendu serveur dynamique) ; Vite+SSG refait à la main ce qu'Astro fournit testé.

Corollaire : **aucune donnée dynamique côté serveur** dans la v1. Pricing = données statiques dérivées du contrat `entitlements.md` (le vrai catalogue Stripe est lu par l'app, pas par le site) ; statut = page statique + lien vers la page de statut Supabase/Vercel, ou îlot qui lit un JSON public. Le jour où un formulaire (support, institutions) exige un serveur, ce sera une Edge Function Supabase existante — pas un runtime Node dans le site.

## 3. Structure de `apps/site/`

```
apps/site/
  package.json            # "@doctopus/tokens": "file:../../packages/tokens" ; dev sur 5180
  astro.config.mjs        # site: 'https://doctopus.de', output:'static', i18n, integrations: react, tailwind, sitemap, mdx
  tailwind.config.mjs     # theme.extend ← tokens (mêmes noms de classes que l'app)
  src/
    styles/global.css     # @import '@doctopus/tokens/tokens.css'; @tailwind …; fontes (fontsource, mêmes paquets que l'app)
    layouts/Base.astro    # <head> SEO, bandeau légal, nav verre, footer
    components/           # .astro par défaut ; React seulement dans components/islands/
      islands/HeroGlass.tsx   # three + R3F, client:visible, reduced-motion → <picture> statique
    content/
      config.ts           # collections zod : blog, faq, legal
      blog/*.md  faq/*.md  legal/*.md
    data/
      frequencies.json    # « Ce qui tombe vraiment » (§5)
      pricing.json        # dérivé de docs/contracts/entitlements.md — relu par le pédagogue (ADR-0008)
    pages/                # §4
    i18n/                 # dictionnaires ui.{de,fr,en}.json (v1 : DE seul actif)
  public/                 # favicons, og-default.png, hero-static.{avif,webp}, robots.txt
  scripts/
    check-lighthouse.mjs  check-no-promise.mjs  check-legal-banner.mjs  check-frequencies.mjs
  test/                   # node --test : schémas de données, scripts
```

Règles : **`.astro` par défaut, React par exception** (un fichier dans `islands/` = une justification en commentaire d'en-tête). Aucun `client:load` — `client:visible` ou `client:idle` seulement. Pas de fetch réseau au rendu (build hermétique, reproductible).

## 4. Routes

Locale par défaut `de` sans préfixe ; `fr`/`en` préfixés quand activés. Chaque page : `title` ≤ 60 car., `description` ≤ 155, OG image, `lang`, canonical, JSON-LD (`Organization`, `FAQPage`, `Article`, `Product` sur pricing).

| Route | Fichier | Source de contenu | Notes |
|---|---|---|---|
| `/` | `pages/index.astro` | — | hero 3D (îlot), 3 preuves, CTA « ouvrir l'app » |
| `/produkt` | `pages/produkt.astro` | — | présentation approfondie, captures |
| `/quick-guide` | `pages/quick-guide.astro` | `content/quick-guide.md` | parcours en 5 minutes |
| `/preise` | `pages/preise.astro` | `data/pricing.json` | **veto pédagogue** (ADR-0008) ; check-no-promise bloquant |
| `/faq` | `pages/faq.astro` | `content/faq/*.md` | JSON-LD `FAQPage` |
| `/blog`, `/blog/[slug]` | `pages/blog/…` | `content/blog/*.md` | RSS `/rss.xml`, sitemap |
| `/was-wirklich-drankommt` | `pages/was-wirklich-drankommt.astro` | `data/frequencies.json` | §5 ; page d'autorité SEO |
| `/ueber-uns` | `pages/ueber-uns.astro` | — | |
| `/support` | `pages/support.astro` | — | mailto + lien FAQ ; formulaire = v2 |
| `/status` | `pages/status.astro` | JSON public ou lien | pas de polling au rendu |
| `/legal/impressum`, `/legal/datenschutz`, `/legal/agb`, `/legal/widerruf` | `pages/legal/[slug].astro` | `content/legal/*.md` ← miroir de `docs/legal/` (compliance-site) | bandeau légal obligatoire (§7.3) |
| `/404` | `pages/404.astro` | — | |

Le site **ne fait pas d'auth** : « ouvrir l'app » pointe vers l'URL de l'app avec `?utm_*`. Aucun cookie non essentiel ; analytics = Vercel Web Analytics **après** consentement ou un compteur sans cookie (Plausible/Umami) — décision compliance-site, pas ici.

## 5. Données — « Ce qui tombe vraiment » (`src/data/frequencies.json`)

Dérivé de `ANALYSE.md` §3 (580 comptes rendus, 4 centres BW). Schéma (Zod dans `content/config.ts`, validé par `check-frequencies.mjs`) :

```jsonc
{
  "$version": 1,
  "source": {
    "protocols": 580,
    "derivedFrom": "ANALYSE.md §3",
    "asOf": "2026-09",
    "disclaimer": "Comptes rendus de candidats, Baden-Württemberg. Fréquences observées, pas une prédiction."
  },
  "centers": [
    { "code": "Fr", "name": "Freiburg",   "protocols": 91 },
    { "code": "Ka", "name": "Karlsruhe",  "protocols": 169 },
    { "code": "Re", "name": "Reutlingen", "protocols": 151 },
    { "code": "St", "name": "Stuttgart",  "protocols": 182 }
  ],
  "pathologies": [
    { "id": "depression", "name": "Depression", "specialty": "Psychiatrie",
      "total": 30, "byCenter": { "Fr": 1, "Ka": 11, "Re": 7, "St": 11 }, "tier": "top" },
    { "id": "oesophaguskarzinom", "name": "Ösophaguskarzinom", "specialty": "Gastro/Onko",
      "total": 22, "byCenter": { "Fr": 1, "Ka": 9, "St": 12 }, "tier": "top" },
    { "id": "osteoporose", "name": "Osteoporose", "specialty": "Rheuma/Endokrino",
      "total": 9, "byCenter": {}, "tier": "frequent" },
    { "id": "tonsillitis", "name": "Tonsillitis", "specialty": "HNO",
      "total": null, "byCenter": {}, "tier": "rare" }
  ]
}
```

Invariants (chacun = un test, exit 1) :
1. `id` unique, slug `[a-z0-9-]+` ; `name` = libellé DE de l'ANALYSE (pas de traduction).
2. `tier` ∈ `top` (≥ 10, tableau §3.1), `frequent` (4–9, §3.2), `rare` (≤ 3, §3.3 ; `total: null` autorisé — l'ANALYSE ne chiffre pas).
3. Σ `byCenter` **=** `total` quand `byCenter` est renseigné (§3.1 : vérifié mécaniquement sur les 20 lignes du tableau, `rows=20 bad=0`, exit 0 — ex. Depression 1+11+7+11 = 30, Ösophaguskarzinom 1+9+12 = 22).
4. Pour chaque centre, Σ `byCenter[c]` ≤ `centers[c].protocols`.
5. Σ `total` (non null) ≤ 580.
6. Les codes centres ⊆ `Fr Ka Re St`.

La page n'affiche **que** des faits (« Stuttgart : Ösophaguskarzinom 12 sur 182 comptes rendus ») — aucune phrase prédictive ; `check-no-promise` s'applique. Les tendances par centre (§3.4) sont du contenu éditorial en `content/`, pas des données.

## 6. Budgets de performance (mesurés sur le build, mobile Moto G Power émulé, 4G lente)

| Métrique | Budget | Où |
|---|---|---|
| Lighthouse Performance / A11y / Best Practices / SEO | **≥ 95** chacune | toutes pages sauf `/` : ≥ 95 ; `/` : Perf ≥ 90 (le hero paie l'îlot) |
| LCP | ≤ 2,5 s | toutes pages |
| INP | ≤ 200 ms | toutes pages |
| CLS | ≤ 0,05 | toutes pages |
| JS initial (compressé, hors îlots) | **≤ 25 Ko** | toutes pages |
| Îlot hero (three + R3F + scène, compressé) | **≤ 180 Ko**, chargé en `client:visible`, **jamais** avant LCP | `/` |
| CSS | ≤ 40 Ko compressé | toutes |
| Fontes | 3 fichiers max (Bricolage var, Plex Sans var, Plex Mono 400/500 subset latin), `font-display: swap`, préchargement du display | toutes |
| Image hero statique (repli) | AVIF + WebP, ≤ 80 Ko | `/` |
| Poids total page | ≤ 400 Ko (hors îlot) | toutes |

Liquid glass 3D : **une seule** scène, sur `/` uniquement ; `prefers-reduced-motion: reduce` → l'îlot n'est pas monté, `<picture>` statique ; `prefers-reduced-transparency` → verre opaque (mêmes replis que l'app, `tokens.glass.*.fallback`) ; navigateur sans WebGL → repli statique. Les transitions entre pages utilisent la View Transitions API native d'Astro, pas la 3D.

## 7. Scripts de vérification (`apps/site/scripts/`, tous exit ≠ 0 sur manquement)

### 7.1 `check-lighthouse.mjs`
Lance `astro preview` sur un port libre, exécute `lighthouse` (paquet npm, Chrome headless, preset `mobile`, `--throttling-method=simulate`) sur `/`, `/preise`, `/was-wirklich-drankommt`, `/blog`, un article, `/legal/impressum` ; compare aux seuils du §6 ; écrit `reports/lighthouse/*.json` ; exit 1 si un seuil manque. Trois runs, médiane (variance CI).

### 7.2 `check-no-promise.mjs`
Lexique : `docs/brand/voice.md` **§6** (contrat brand-site : tables à 3 colonnes FR/DE/EN). Analyse : chaque cellule → split sur `,` → retrait des parenthèses `( … )`, des `*` et des espaces ; normalisation NFD sans diacritiques, casse-insensible ; correspondance en mot entier. Corpus : `dist/**/*.html` (texte visible + `title`/`description`/`alt`) et `src/data/*.json`. Sévérité : **§6.1 et §6.4 bloquants** (exit 1) ; §6.2, §6.3, §6.5 **informatifs** (listés, exit 0) — ces trois sections dépendent du contexte (« diagnostic » est légitime dans un cas clinique). Exception explicite : un commentaire `<!-- voice:allow "…" -->` dans la source, avec motif, désactive une occurrence — et le script les liste pour relecture.

### 7.3 `check-legal-banner.mjs`
Sur chaque page de `dist/` : présence dans le footer du bloc légal (liens Impressum, Datenschutz, AGB, Widerruf — tous en 200 après build) et de la phrase de périmètre fixée par compliance-site dans `docs/legal/banner.md` (texte exact, comparé après normalisation des espaces). Sur `/preise` : présence de la mention TVA/prix TTC et du délai de rétractation. Exit 1 sur toute page manquante.

### 7.4 `check-frequencies.mjs`
Les 6 invariants du §5.

## 8. Intégration CI — proposition de diff sur `.github/workflows/quality.yml` (fichier partagé, NON appliqué)

```yaml
  site:
    name: Site — tokens, build, budgets, lexique, légal
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: apps/site } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: apps/site/package-lock.json }
      - run: npm ci
      - name: Tokens — parité avec l'app (ADR-0010)
        run: npm test --prefix ../../packages/tokens
      - run: node scripts/check-frequencies.mjs
      - run: npm run build
      - run: node scripts/check-no-promise.mjs
      - run: node scripts/check-legal-banner.mjs
      - name: Budgets Lighthouse (mobile)
        run: node scripts/check-lighthouse.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: lighthouse, path: apps/site/reports/lighthouse }
```

Pourquoi un job séparé : `npm ci` indépendant (lockfile `apps/site`), aucune modification des jobs `contrats`/`build`/`rls`/`publish` existants, échec isolé. Seul `lead-site` (ou `main`) applique ce diff — fichier partagé. `check-parity` y tourne **une fois**, dans ce job, car il lit `app/` : si un autre pipeline V1 change la charte de l'app, la CI de la branche site devient rouge au rebase — c'est voulu.

Déploiement : projet Vercel `doctopus-site`, root `apps/site`, framework Astro, build `npm run build`, output `dist`. Preview par PR. Le domaine et les en-têtes (CSP sans `unsafe-inline` sauf le style Astro hashé, `Permissions-Policy`, HSTS) dans `apps/site/vercel.json`. Aucune variable d'environnement secrète au build.

## 9. Ports et outillage local

- `npm run dev -- --port 5180` (team-protocol §5b). `astro preview --port 5181` pour les sondes.
- Sondes `playwright-cli -s=site` ; mesurer **depuis le DOM** de la page servie, jamais depuis un module importé (CLAUDE.md).

## 10. Compatibilité et non-régression

- L'app n'est pas modifiée ; ses jobs CI sont inchangés ; `check-parity` est le seul lien, en lecture.
- `DEPLOY.md` (GitHub Pages de l'app) reste valable ; le site ne l'emprunte pas.
- Le paquet `@fontsource*` est installé deux fois (app, site) jusqu'à la migration — accepté (pas de workspace racine avant).

## 11. Propositions de contrat en attente d'autres pôles

| Vers | Proposition |
|---|---|
| brand-site | garder §6 de `voice.md` au format tabulaire 3 colonnes (c'est l'interface du validateur) ; ajouter un mot par cellule autant que possible |
| compliance-site | fournir `docs/legal/banner.md` (phrase exacte de périmètre + mentions pricing) — lu par `check-legal-banner.mjs` |
| spec-site | confirmer la liste des routes du §4 (notamment `/status` statique en v1, support sans formulaire) |
| lead-site / main | appliquer le diff CI du §8 ; créer le projet Vercel |

## Non vérifié

- Tailles réelles de l'îlot three+R3F sous Astro (budget de 180 Ko posé d'après three ~150 Ko gz + R3F ~30 Ko ; à mesurer au premier build).
- Stabilité des scores Lighthouse sur runners GitHub (d'où la médiane de trois runs ; à ajuster).
- Aucun fichier `apps/site` n'existe encore : les chemins ci-dessus sont le contrat pour `plan-site`/`build-site`, pas un constat.
