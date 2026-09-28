# ADR-0013 — Le site est statique (Astro), sans runtime serveur ; la 3D est un îlot

**Statut** : proposé (arch-site, sous réserve G2) · **Date** : 2026-09-16

## Contexte

ADR-0010 sépare le site de l'app. Le site doit charger en < 3 s sur mobile, être indexé (blog Markdown, niche cherchée), porter un hero « liquid glass » 3D, se déployer sur Vercel, consommer `@doctopus/tokens`, et rester simple à faire évoluer par des agents. Trois stacks comparées dans `docs/contracts/site.md` §2.

## Décision

`apps/site` est un site **Astro 5 en sortie statique**, Tailwind 3 alimenté par `@doctopus/tokens`, îlots React limités au hero 3D (`client:visible`, désactivé en `prefers-reduced-motion`, repli image) et aux rares widgets. Aucun rendu serveur, aucun fetch au build, aucune auth : les données (pricing, fréquences) sont des JSON versionnés validés par script. Toute future logique serveur passe par les Edge Functions Supabase existantes.

## Conséquences

- JS initial ≈ 0 hors îlots ; budgets Lighthouse ≥ 95 atteignables par défaut ; vérifiés en CI par `check-lighthouse.mjs`.
- Le pricing affiché est une copie statique de `entitlements.md` : un changement de prix = un commit relu par le pédagogue (ADR-0008), pas un appel Stripe.
- Next.js écarté : runtime React sur chaque page et frontière RSC sans besoin. Vite+SSG écarté : refaire collections, sitemap, i18n à la main.
- Réversible : Astro sait passer en `output: 'server'` avec l'adaptateur Vercel si un besoin dynamique apparaît — sans réécrire les pages.
