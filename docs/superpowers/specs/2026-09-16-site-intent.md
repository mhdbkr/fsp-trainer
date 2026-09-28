# Site Doctopus — intention (G1)

**Date** : 2026-09-16 · **Sous-projet** : #8 (epic #9) · **Auteur** : spec-site
**Statut** : en attente de G1 (direction) — le spec de design avance sous réserve.

## Intention en une phrase

Un site public rapide et sobre, dans l'identité de l'app, qui prouve l'autorité
de Doctopus (« ce qui tombe vraiment », ancré sur ~580 protocoles) et convertit
un candidat FSP non natif, sur mobile, vers l'inscription gratuite — sans jamais
promettre la réussite, et avec le bloc légal allemand en brouillon prêt pour
un juriste.

## Pour qui, contre quoi

- **Persona** : médecin étranger, examen dans 3 semaines à 3 mois, cherche
  « Fachsprachprüfung Stuttgart Fälle », sur téléphone, dans un train ou une
  pause d'Hospitation. Compare avec une école de prépa (1 000–2 000 €) et des
  PDF de protocoles qui circulent.
- **Ce qu'il veut vraiment** (interview-me / idea-refine) : savoir *ce qui
  tombe* dans sa ville, savoir *s'il est prêt*, et s'entraîner sans binôme à
  23 h. Le site doit répondre « oui » à ces trois attentes en 10 secondes.
- **Succès** : un visiteur mobile comprend l'offre, voit la preuve, clique
  « Kostenlos starten » sans jamais avoir eu à zoomer, attendre ou chercher le
  bouton. Mesuré : Lighthouse mobile ≥ 95 (perf/a11y/SEO), TTI < 3 s en 4G
  simulée, CTA dans chaque viewport, zéro promesse de résultat.

## Hypothèses surfacées (tranchées par spec-site sauf mention « → direction »)

| # | Hypothèse | Tranché |
|---|---|---|
| H1 | Le site vit dans `apps/site/` d'un monorepo npm workspaces ; `app/` reste en place jusqu'à la tâche finale de migration (ADR-0010). | Oui |
| H2 | `packages/tokens` est la **source de vérité** de la charte ; l'app ne la consomme qu'à la migration. D'ici là un script vérifie la parité avec `app/tailwind.config.js` (lecture seule). | Oui |
| H3 | Générateur statique avec îlots (Astro) plutôt que SPA React : SEO, poids, Lighthouse. | Oui (alternatives dans le spec) |
| H4 | Liquid glass = CSS (`backdrop-filter` + dégradés animés) sur le hero et les transitions de page seulement ; aucun WebGL en v1 ; désactivé sous `prefers-reduced-motion`. | Oui |
| H5 | Aucun cookie, aucune analytics tierce en v1 (« aucune donnée ne quitte votre appareil » est un argument) ; fonts auto-hébergées. | Oui, → direction pour l'analytics |
| H6 | Les pages légales sont rendues depuis `docs/legal/*.md` (brouillons de compliance-site) et portent une bannière « Brouillon — validation juriste requise » tant qu'un front-matter `validated_by` est absent. | Oui |
| H7 | Le site n'est **pas** indexé ni mis en ligne sur le domaine final tant que l'Impressum n'est pas validé (verrou ROADMAP §1.3) : déploiement preview `noindex` uniquement. | Oui |
| H8 | La page « Ce qui tombe vraiment » couvre les 4 centres de BW (Freiburg, Karlsruhe, Reutlingen, Stuttgart), n = 580 protocoles, ~80 pathologies, données dérivées d'`ANALYSE.md` §3 par script ; la période des protocoles est affichée comme « à vérifier » tant qu'elle n'est pas sourcée. | Oui |
| H9 | Pricing : trois plans Free / Pro / Premium, contenu des colonnes dérivé de `docs/contracts/entitlements.md` (parité vérifiée par script), montants en placeholders `{{PRICE_PRO}}` / `{{PRICE_PREMIUM}}`. | Oui |
| H10 | Support v1 = FAQ + `mailto:{{SUPPORT_EMAIL}}` ; pas de formulaire (pas de backend côté site). | Oui |
| H11 | Statut v1 = page statique listant les composants (app, API Supabase, paiement Stripe) + historique d'incidents dans un JSON versionné ; pas de sonde automatique. | Oui, → direction si un fournisseur externe est préféré |
| H12 | Nom affiché : **Doctopus** ; « FSP-Trainer » en descripteur. | → direction (Q4) |
| H13 | Langue du site : allemand d'abord. | → direction (Q1) |

## Questions à la direction (avec options et recommandation)

**Q1 · Langue du site.**
(a) Allemand seul ; (b) allemand + français + anglais dès la v1 ; (c) allemand
v1, structure i18n prête (`/de/` par défaut, `/fr/`, `/en/` ajoutés plus tard).
**Recommandation : (c).** Les requêtes cherchées sont allemandes ; la cible
est non native mais cherche l'examen dans sa langue d'examen ; FR/EN suivent
quand le marketing autonome (#10) les justifie.

**Q2 · Nom de domaine.** Placeholder `{{SITE_DOMAIN}}` dans le spec. Options :
`doctopus.de` / `doctopus.app` / `doctopus.eu` / autre. Le choix conditionne le
canonical, l'Impressum et Stripe. **Recommandation : `.de` si disponible**
(confiance côté Ärztekammer et candidats).

**Q3 · Prix et cadence.** Montants Pro / Premium et cadence (mensuel, ou
« cycle d'examen » 3 mois). Le spec garde `{{PRICE_PRO}}`, `{{PRICE_PREMIUM}}`
et `{{BILLING_PERIOD}}` ; la page affiche « mensuel, résiliable en un clic ».
**Recommandation : mensuel + option 3 mois** (ADR-0008 : aligné sur le cycle).

**Q4 · Nom et ton.** Le site dit « Doctopus » partout ; l'app affiche encore
« FSP-Cockpit ». (a) Doctopus seul ; (b) « Doctopus — ehemals FSP-Cockpit »
pendant la transition. **Recommandation : (a)**, l'app n'ayant pas encore
d'utilisateurs publics.

**Q5 · Mode de lancement.** (a) pricing avec CTA vers le checkout réel ;
(b) pricing visible + liste d'attente (`mailto`) tant que le verrou
ROADMAP §1.1 (origine du contenu) n'est pas levé. Le spec construit les deux ;
un seul réglage `SITE_LAUNCH_MODE`. **Recommandation : (b) jusqu'à décision.**

**Q6 · Analytics.** (a) aucune ; (b) Plausible/Umami EU sans cookie (à
mentionner dans Datenschutz). **Recommandation : (a) en v1**, (b) au lancement
de #10 marketing.

**Q7 · Identité de l'Impressum.** Nom, adresse, e-mail, forme juridique
(micro-entreprise FR, PRODUCT-VISION §8). Placeholders `{{LEGAL_NAME}}`,
`{{LEGAL_ADDRESS}}`, `{{LEGAL_EMAIL}}`. Non délégable.

## Hors périmètre explicite

Migration `app/` → `apps/app` (tâche finale, accord `main`) ; marketing
autonome (#10) ; page institutions ; formulaire de contact ; multi-Land hors BW
(dépend de #12) ; contenu rédactionnel du blog au-delà d'un article de
démonstration (growth-content-engine).
