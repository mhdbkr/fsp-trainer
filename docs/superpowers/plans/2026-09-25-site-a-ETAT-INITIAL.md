# Site — état initial avant le plan A

Date : 2026-09-25 · Commit : `659a185` (feat/site, rebasé sur origin/main `c8c79f7`)

## Environnement

- Node : `v26.3.0`
- Astro : `v5.18.2`

## Rebase

`git rebase origin/main` : succès, sans conflit (126 commits rejoués). Arbre propre avant et après.

## Installation

`npm ci` dans `apps/site` : exit 0, sans dérive de `package-lock.json` (pas eu besoin de `npm install`).
606 paquets installés, 25 vulnérabilités signalées par npm audit (3 low, 16 moderate, 5 high, 1 critical) — non traitées ici, hors périmètre de cette tâche.

## Gates

| Gate | Code de sortie |
|---|---|
| build | 0 |
| test | 0 |
| check:frequencies | 0 |
| check:pricing | 0 |
| check:lexicon | 0 |
| check:legal | 0 |
| check:placeholders | 1 |
| check:budgets | 1 |
| check:cta | 0 |

`check:lighthouse` exclu de cette tâche (nécessite un build servi ; traité en tâche 8).

## Pages présentes

Sortie de `ls apps/site/src/pages/de/` :

```
agb.astro
blog
datenschutz.astro
faq.astro
impressum.astro
index.astro
preise.astro
produkt.astro
quick-guide.astro
status.astro
support.astro
ueber.astro
was-drankommt.astro
widerruf.astro
```

## Ce qui est rouge avant nous

- `check:placeholders` (exit 1) : le script `apps/site/scripts/check-placeholders.mjs` n'existe pas sur disque (`MODULE_NOT_FOUND`). Le gate échoue par absence du script, pas par un contenu fautif.
- `check:budgets` (exit 1) : même cause — `apps/site/scripts/check-budgets.mjs` n'existe pas (`MODULE_NOT_FOUND`).

Tout le reste (build, test, frequencies, pricing, lexicon, legal, cta) est vert avant toute intervention du plan A.
