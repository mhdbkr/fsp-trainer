# Contrat — site marketing Doctopus (`apps/site`)

> ADR-0010 (monorepo), ADR-0008 (veto pédagogue sur le pricing), ADR-0009 (routage).
> Propriétaire : `platform-architect`. Statut : **brouillon sous réserve G1/G2** — aligné sur `docs/superpowers/specs/2026-09-16-site-design.md` (D1–D14) ; les divergences restantes sont listées en §11.

## 1. Question tranchée

Un site **rapide sur mobile** (< 3 s), **indexable** (la FSP est une niche cherchée), avec **un** moment de magie (liquid glass au hero — CSS seul en v1, spec D4), qui porte la charte de l'app via `@doctopus/tokens`, se déploie sur Vercel, et se vérifie **par scripts à code de sortie** avant tout jugement d'agent.

## 2. Stack — trois options, une recommandation

Critères pondérés : (a) JS embarqué par défaut, (b) SEO/blog Markdown natif, (c) isolation d'un îlot 3D lourd, (d) Vercel, (e) i18n DE/FR/EN, (f) consommation des tokens, (g) simplicité d'exploitation pour une équipe d'agents.

| | **Astro 5 (statique + îlots)** | Next.js 15 (App Router) | Vite + React SSG (vite-ssg / vike) |
|---|---|---|---|
| (a) JS par défaut | **0 Ko** hors îlots ; v1 : seul le script vanilla du hero (≤ 8 Ko gz) | ~85–90 Ko de runtime React/RSC sur chaque page, même statique | runtime React sur toutes les pages (~45 Ko) + hydratation complète |
| (b) Blog Markdown | **Content Collections** typées (Zod), MDX, RSS, sitemap officiels | possible (MDX + `generateStaticParams`), à assembler | plugin tiers, sitemap/RSS à écrire |
| (c) Îlot 3D isolé | `client:visible` / `client:idle` + `import()` : **natif** | `dynamic(() => …, { ssr:false })` : bien, mais la page porte déjà le runtime | `React.lazy` : bien |
| (d) Vercel | adaptateur officiel ; statique pur = CDN, zéro fonction | **natif** | statique pur |
| (e) i18n | routage i18n intégré (`i18n.locales`, `defaultLocale`) | middleware à écrire | à la main |
| (f) Tokens | `tailwind.config` lit `tokens` ; `tokens.css` importé une fois | idem | idem |
| (g) Simplicité | un seul modèle mental : HTML statique, îlots explicites | RSC/Client boundaries, cache, deux runtimes : **surface d'erreur inutile** pour un site vitrine | tout est à câbler ; moins d'outillage |
| Lighthouse ≥ 95 mobile | atteignable **par défaut** | atteignable avec discipline (fonts, images, RSC) | atteignable avec discipline |

**Recommandation : Astro 5, sortie statique (`output: 'static'`), Tailwind 3 (même version majeure que l'app pour que le `theme.extend` issu des tokens soit identique), aucun îlot React en v1 — le hero est un `<script>` vanilla dans `Hero.astro` (H1, plan 35352b0) ; `components/islands/` reste vide jusqu'à un besoin réel.** Le spec (`docs/superpowers/specs/2026-09-16-site-design.md` D1, D4) retient la même stack et choisit un **liquid glass en CSS seul** (aucun WebGL) : ce contrat le permet et fixe le plafond si la direction demandait un jour du WebGL (§6). Next est la bonne réponse à une question que le site ne pose pas (rendu serveur dynamique) ; Vite+SSG refait à la main ce qu'Astro fournit testé.

Corollaire : **aucune donnée dynamique côté serveur** dans la v1. Pricing = données statiques dérivées du contrat `entitlements.md` (le vrai catalogue Stripe est lu par l'app, pas par le site) ; statut = page statique + lien vers la page de statut Supabase/Vercel, ou îlot qui lit un JSON public. Le jour où un formulaire (support, institutions) exige un serveur, ce sera une Edge Function Supabase existante — pas un runtime Node dans le site.

## 3. Structure de `apps/site/`

```
apps/site/
  package.json            # "@doctopus/tokens": "file:../../packages/tokens" ; dev sur 5180
  astro.config.mjs        # site: '{{SITE_URL}}', output:'static', i18n { defaultLocale:'de', prefixDefaultLocale:true }, integrations: react, tailwind, sitemap, mdx
  vercel.json             # 308 / → /de/, en-têtes (CSP, HSTS, Permissions-Policy, X-Robots-Tag si SITE_PUBLIC=false)
  tailwind.config.mjs     # theme.extend ← tokens (mêmes noms de classes que l'app)
  src/
    styles/global.css     # @import '@doctopus/tokens/tokens.css'; @tailwind …; fontes (fontsource, mêmes paquets que l'app)
    layouts/Base.astro    # <head> SEO, bandeau légal, nav verre, footer
    components/           # .astro par défaut ; React seulement dans components/islands/ (VIDE en v1)
      Hero.astro              # hero liquid glass CSS + <script> vanilla ≤ 8 Ko gz ; HTML complet sans JS (D4, H1)
      islands/                # vide jusqu'à besoin réel ; tout fichier ajouté = justification en en-tête
    content/
      config.ts           # collections zod : blog, faq, legal
      blog/*.md  faq/*.md
    data/
      frequencies.json    # « Ce qui tombe vraiment » (§5) — GÉNÉRÉ depuis ANALYSE.md
      pricing.json        # dérivé de docs/contracts/entitlements.md — relu par le pédagogue (ADR-0008)
      status.json  site.json  exam-bw.json   # spec §4.5, §4.6, §5
    pages/                # §4
    i18n/                 # dictionnaires ui.{de,fr,en}.json (v1 : DE seul actif)
  public/                 # favicons, og-default.png, hero-static.{avif,webp}, robots.txt
  scripts/
    build-frequencies.mjs  build-lexicon.mjs  no-promise.lexicon.json (généré)
    check-lighthouse.mjs  check-no-promise.mjs  check-legal-banner.mjs  check-frequencies.mjs  check-pricing-parity.mjs
  test/                   # node --test : schémas de données, scripts
```

Règles : **`.astro` par défaut, React par exception** (un fichier dans `islands/` = une justification en commentaire d'en-tête). Aucun `client:load` — `client:visible` ou `client:idle` seulement. Pas de fetch réseau au rendu (build hermétique, reproductible).

## 4. Routes

**Le spec §5 fait foi pour la liste et le contenu des pages** ; ce contrat fixe les invariants techniques. Toutes les pages sous `/de/` (D13 : i18n prête, DE seul en v1, `/fr/` en réserve) ; `/` → `/de/` par **redirection 308 dans `vercel.json`** (pas une page `<meta refresh>` : Lighthouse mesure `/` et une redirection client coûterait 100–300 ms de LCP). Chaque page : `title` ≤ 60 car., `description` ≤ 155, OG image, `lang`, canonical, `hreflang`, JSON-LD (`Organization` + `WebSite` partout ; `FAQPage` sur la FAQ ; `Article` sur le blog ; `Product` sur les prix).

Routes v1 (spec §5) : `/de/` · `/de/produkt/` · `/de/quick-guide/` · `/de/was-drankommt/` · `/de/preise/` · `/de/faq/` · `/de/blog/`, `/de/blog/[slug]/` · `/de/ueber/` · `/de/support/` · `/de/status/` · `/de/impressum/`, `/de/datenschutz/`, `/de/agb/`, `/de/widerruf/` · `/404`. Plus `/rss.xml`, `/sitemap-index.xml`, `/robots.txt`.

Invariants :
- Le site **ne fait pas d'auth** ; le CTA pointe vers `{{APP_URL}}` (D10). Aucun cookie, aucune analytics (D11).
- Pages légales rendues depuis `docs/legal/*.md` (D5) — collection Astro pointée hors de `src/` ; bandeau « Entwurf » tant que `validated_by` est vide.
- `SITE_PUBLIC=false` ⇒ `noindex` (D6) ; `check-legal-banner.mjs` vérifie aussi que **`SITE_PUBLIC=true` exige `validated_by` non vide sur l'Impressum** (exit 1 sinon).

## 5. Données — « Ce qui tombe vraiment » (`src/data/frequencies.json`)

**Généré** par `scripts/build-frequencies.mjs` depuis `ANALYSE.md` §3.1–3.4 (D8) — jamais saisi à la main ; committé pour un build hermétique, régénéré et comparé en CI (`--check` : exit 1 si le fichier committé diffère de la génération). Schéma (Zod dans `content/config.ts`, vérifié par `check-frequencies.mjs`) :

```jsonc
{
  "$version": 1,
  "source": "ANALYSE.md §3 — comptes rendus de candidats, 4 centres BW",
  "generatedAt": "2026-09-16",
  "period": "{{PROTOCOLS_PERIOD}}",
  "n": 580,                       // tel qu'énoncé par ANALYSE.md §3 (« 580 comptes-rendus »)
  "nByCenterSum": 593,            // Σ centers.n — ANALYSE.md l. 110 ; l'écart avec n est documenté, pas masqué
  "disclaimer": "Beobachtete Häufigkeiten in Prüfungsprotokollen, keine Vorhersage.",
  "centers": [
    { "code": "Fr", "name": "Freiburg",   "n": 91 },
    { "code": "Ka", "name": "Karlsruhe",  "n": 169 },
    { "code": "Re", "name": "Reutlingen", "n": 151 },
    { "code": "St", "name": "Stuttgart",  "n": 182 }
  ],
  "pathologies": [
    { "id": "depression", "name": "Depression", "specialty": "Psychiatrie",
      "total": 30, "byCenter": { "Fr": 1, "Ka": 11, "Re": 7, "St": 11 }, "tier": "top" },
    { "id": "osteoporose", "name": "Osteoporose", "specialty": null,
      "total": 9, "byCenter": null, "tier": "frequent" },
    { "id": "tonsillitis", "name": "Tonsillitis", "specialty": null,
      "total": null, "byCenter": null, "tier": "rare" }
  ],
  "trends": [ { "center": "Re", "summary": "…§3.4, texte tel quel…" } ]
}
```

Invariants (chacun = un test, exit 1) :
1. `id` unique, slug `[a-z0-9-]+` dérivé de `name` (translittération `ö→oe`, `ß→ss`) ; `name` = libellé DE de l'ANALYSE, sans traduction.
2. `tier` ∈ `top` (§3.1, `total` ≥ 10, `byCenter` obligatoire), `frequent` (§3.2, 4–9, `byCenter: null`), `rare` (§3.3, `total: null`, `byCenter: null`).
3. Pour `tier: top` : Σ `byCenter` **=** `total` — vérifié mécaniquement sur les 20 lignes du tableau §3.1 (`rows=20 bad=0`, exit 0). Un centre absent de la cellule = 0, pas `partial` (le §3.1 boucle exactement ; le marqueur `partial` du spec §4.2 est donc inutile — proposition : le retirer).
4. Pour chaque centre `c` : Σ `byCenter[c]` ≤ `centers[c].n`.
5. `n === 580` **et** `centers` = `[91, 169, 151, 182]` littéralement (les deux sont des citations d'ANALYSE.md). **Pas** de `Σ centers.n === n` : la somme fait 593 (vérifié) — l'AC7 du spec est infalsifiable telle quelle ; proposition à spec-site : remplacer par « `n` et `centers.n` égaux aux valeurs citées » et afficher la note d'écart dans la méthodologie.
6. Σ `total` (non null) ≤ `nByCenterSum`.
7. Codes centres ⊆ `Fr Ka Re St` ; `trends[].center` ∈ codes ∪ `'all'` (`'all'` = pathologies transversales, §3.4 « tous centres » ; H2).

La page n'affiche **que** des faits (« Stuttgart : Ösophaguskarzinom 12 sur 182 comptes rendus ») — aucune phrase prédictive ; `check-no-promise` s'applique. Les tendances (§3.4) sont reprises **textuellement** dans `trends` (donnée), pas réécrites.

## 6. Budgets de performance (mesurés sur le build, mobile Moto G Power émulé, 4G lente)

| Métrique | Budget | Où |
|---|---|---|
| Lighthouse Performance / A11y / Best Practices / SEO | **≥ 95** chacune | toutes pages, `/de/` comprise (hero CSS seul) |
| LCP | ≤ 2,5 s | toutes pages |
| INP | ≤ 200 ms | toutes pages |
| CLS | ≤ 0,05 | toutes pages |
| JS initial (compressé, hors îlots) | **≤ 25 Ko** | toutes pages |
| Script du hero — **v1 (spec D4, CSS seul, vanilla dans `Hero.astro`)** | **≤ 8 Ko** gz, `<script>` différé ; le HTML du hero est complet sans JS | `/de/` |
| Îlot hero — **plafond si WebGL un jour** (three + R3F) | ≤ 180 Ko gz, `client:visible`, jamais avant LCP, repli `<picture>` ; exige une décision de `main` | `/de/` |
| CSS | ≤ 40 Ko compressé | toutes |
| Fontes | 3 fichiers max (Bricolage var, Plex Sans var, Plex Mono 400/500 subset latin), `font-display: swap`, préchargement du display | toutes |
| Image/capture du hero | AVIF + WebP, ≤ 80 Ko, dimensions déclarées (CLS) | `/de/` |
| Poids total page | ≤ 400 Ko (hors îlot) | toutes |

Liquid glass : `backdrop-filter` + dégradés + `transform` 3D léger (D4), **sur le hero uniquement**, jamais en matière de page (même règle que l'app : le verre n'habille que la navigation) ; `prefers-reduced-motion: reduce` → toute animation neutralisée ; `prefers-reduced-transparency` ou pas de `backdrop-filter` → opaque (`tokens.glass.*.fallback`). Transitions de page : View Transitions API d'Astro.

## 7. Scripts de vérification (`apps/site/scripts/`, tous exit ≠ 0 sur manquement)

### 7.1 `check-lighthouse.mjs`
Lance `astro preview` sur un port libre, exécute `lighthouse` (paquet npm, Chrome headless, preset `mobile`, `--throttling-method=simulate`) sur `/de/`, `/de/preise/`, `/de/was-drankommt/`, `/de/blog/`, un article, `/de/impressum/` ; compare aux seuils du §6 ; écrit `reports/lighthouse/*.json` ; exit 1 si un seuil manque. Trois runs, médiane (variance CI).

### 7.2 `check-no-promise.mjs`
Lexique : **source = `docs/brand/voice.md` §6** (tables à 3 colonnes FR/DE/EN, écrites pour être lues par un validateur). Le fichier `apps/site/scripts/no-promise.lexicon.json` du spec (D9) est un **cache généré** par `scripts/build-lexicon.mjs` depuis `voice.md`, comparé en CI (`--check`) — jamais édité à la main, sinon deux vérités. Analyse : chaque cellule → split sur `,` → retrait des parenthèses `( … )`, des `*` et des espaces ; normalisation NFD sans diacritiques, casse-insensible ; correspondance en mot entier. Corpus : `dist/**/*.html` (texte visible + `title`/`description`/`alt`) et `src/data/*.json`. Sévérité : **§6.1 et §6.4 bloquants** (exit 1) ; §6.2, §6.3, §6.5 **informatifs** (listés, exit 0) — ces trois sections dépendent du contexte (« diagnostic » est légitime dans un cas clinique). Exception explicite : un commentaire `<!-- voice:allow "…" -->` dans la source, avec motif, désactive une occurrence — et le script les liste pour relecture.

### 7.3 `check-legal-banner.mjs`
Sur chaque page de `dist/` : présence dans le footer des liens Impressum, Datenschutz, AGB, Widerruf (fichiers présents dans `dist/`) et de la **version courte DE** de `docs/legal/disclaimer.md` (section « Version courte pour le footer (DE) », texte exact après normalisation des espaces). Sur `/de/preise/` : mention TVA/prix TTC et délai de rétractation. Sur `/de/impressum/` : bandeau « Entwurf » présent ⇔ front-matter `validated_by` vide ; `SITE_PUBLIC=true` avec `validated_by` vide ⇒ exit 1. Exit 1 sur toute page manquante.

### 7.4 `check-frequencies.mjs`
Les 7 invariants du §5 ; `build-frequencies.mjs --check` garantit que le JSON committé est celui de la génération.

### 7.5 `check-pricing-parity.mjs` (spec D7)
Chaque feature de `src/data/pricing.json` existe dans `docs/contracts/entitlements.md` avec le même plan minimal ; aucun montant en dur (placeholders `{{PRICE_*}}`) tant que `main` n'a pas fixé les prix. Exit 1 sinon. Ce script lit un contrat : toute évolution d'`entitlements.md` casse la CI du site — voulu.

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
      - run: node scripts/build-frequencies.mjs --check
      - run: node scripts/check-frequencies.mjs
      - run: node scripts/build-lexicon.mjs --check
      - run: node scripts/check-pricing-parity.mjs
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
| compliance-site | garder stable l'en-tête « Version courte pour le footer (DE) » de `disclaimer.md` (interface de `check-legal-banner.mjs`) ; front-matter `validated_by` sur chaque fichier de `docs/legal/` (D5) |
| spec-site | AC7 : remplacer `Σ centers.n === 580` (faux : 593) par « `n` et `centers.n` = valeurs citées d'ANALYSE.md » + note d'écart ; retirer `partial: true` (le §3.1 boucle sur les 20 lignes) ; D2 : workspaces racine reportés à la migration (§4.1 de `tokens.md`), `file:` en attendant |
| brand-site | `no-promise.lexicon.json` est généré depuis `voice.md` §6, pas maintenu à part |
| lead-site / main | appliquer le diff CI du §8 ; créer le projet Vercel |

## Non vérifié

- Tailles réelles de l'îlot three+R3F sous Astro (budget de 180 Ko posé d'après three ~150 Ko gz + R3F ~30 Ko ; à mesurer au premier build).
- Stabilité des scores Lighthouse sur runners GitHub (d'où la médiane de trois runs ; à ajuster).
- Aucun fichier `apps/site` n'existe encore : les chemins ci-dessus sont le contrat pour `plan-site`/`build-site`, pas un constat.
