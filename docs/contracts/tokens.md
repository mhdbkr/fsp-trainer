# Contrat — tokens de design partagés (`@doctopus/tokens`)

> Décision structurante : ADR-0010 (monorepo app + site + tokens).
> Propriétaire du contrat : `platform-architect`. Implémenteurs : pipeline #8 (site).
> Statut : **v0.1.0 — sous réserve G2** (le spec du site n'est pas encore validé ; les valeurs, elles, sont celles de l'app livrée et ne dépendent pas du spec).

## 1. La question tranchée

Une charte, deux surfaces (app, site) — sans modifier l'app maintenant, et sans dupliquer les valeurs à la main. Le mécanisme doit tenir **pendant** la période où l'app lit encore ses propres CSS, et rester le même **après** la migration `app/` → `apps/app`.

## 2. Source de vérité

| Élément | Chemin | Rôle |
|---|---|---|
| Source unique | `packages/tokens/tokens.json` | LA valeur de chaque token. Toute autre copie est dérivée ou vérifiée. |
| Générateur | `packages/tokens/build.mjs` | produit `dist/tokens.css`, `dist/tokens.js`, `dist/tokens.d.ts` |
| Garde-fou | `packages/tokens/scripts/check-parity.mjs` | compare `tokens.json` aux valeurs encore lues par l'app ; **exit 1 sur dérive** |
| Tests | `packages/tokens/test/tokens.test.mjs` | `node --test` — build, export, parity OK sur l'app réelle, parity **KO** sur une app mutée |

Chaque groupe de `tokens.json` porte une clé `$src` = `fichier:lignes` de l'app au commit `e2a2c70` (ex. `tailwind:11-14` = `app/tailwind.config.js` l. 11–14). Les clés `$…` sont des métadonnées, jamais émises.

### 2.1 Périmètre des tokens (v0.1.0 — 58 propriétés)

| Groupe | Contenu | Provenance |
|---|---|---|
| `color.brand` 50–950 | pétrole (11 pas) | `tailwind.config.js:11-14` |
| `color.signal` 50–950 | coral clinique (11 pas) — accent unique | `tailwind.config.js:18-21` |
| `color.paper`, `color.ink` (+800/700/600) | neutres d'identité | `tailwind.config.js:24-26` |
| `color.focus.light/dark` | anneau de focus | `index.css:7,13` |
| `font.sans/display/mono` | piles complètes (Plex Sans, Bricolage, Plex Mono) | `tailwind.config.js:31-35` |
| `type.headingTracking/headingWeight` | `-0.014em` / `600` | `tailwind.config.js:44`, `index.css:54-58` |
| `motion.easeFluid/easeOut/durationFast/duration` | courbes et durées | `tailwind.config.js:41`, `index.css:8-10` |
| `radius.card/control` | `0.75rem` / `0.5rem` (défauts Tailwind employés par `.card`/`.btn`) | `index.css:89,136` |
| `glass.*` | blur 20px, saturate 180 %, fonds/bords/ombres clair-sombre, replis opaques, teinte pétrole | `index.css:207-257` |
| `card.*` | blur 16px, saturate 160 %, fonds/bords clair-sombre | `index.css:88-114` |

**Hors périmètre v0.1** (délibérément) : les classes composées (`.eyebrow`, `.callout`, `.seg`…) — ce sont des composants, pas des tokens ; les keyframes ; les blobs d'ambiance du `body` (décor, pas charte). Un token n'entre dans le paquet que s'il est employé par les deux surfaces.

## 3. Formats de sortie

### 3.1 CSS — `@doctopus/tokens/tokens.css`

Custom properties sur `:root`, préfixe **`--dt-`**, chemin aplati en kebab-case, `DEFAULT` omis :

```css
--dt-color-brand-500: #158375;
--dt-color-paper: #f4f5f2;
--dt-color-ink: #0c1a17;         /* ink.DEFAULT */
--dt-color-ink-800: #12211e;
--dt-font-display: "Bricolage Grotesque Variable", "IBM Plex Sans Variable", system-ui, sans-serif;
--dt-motion-ease-fluid: cubic-bezier(0.32, 0.72, 0, 1);
--dt-glass-light-background: rgb(255 255 255 / 0.60);
```

Le mode sombre n'est **pas** résolu par le paquet : il expose `light`/`dark` côte à côte ; chaque surface les branche sur son propre sélecteur (`.dark` dans l'app, `[data-theme=dark]` ou `prefers-color-scheme` sur le site).

### 3.2 TypeScript — `import { tokens } from '@doctopus/tokens'`

Objet typé, même arborescence que `tokens.json` sans les `$…`. Usage attendu côté site : alimenter `theme.extend` de Tailwind (`colors: tokens.color`, `fontFamily`, etc.) pour que les classes `bg-brand-600`, `font-display`, `ease-fluid` aient **le même nom** sur les deux surfaces.

### 3.3 JSON brut — `@doctopus/tokens/tokens.json`

Pour les outils (Figma sync, Rive, générateurs d'images sociales).

## 4. Consommation

### 4.1 Le site — maintenant

`apps/site/package.json` : `"@doctopus/tokens": "file:../../packages/tokens"`. Zéro workspace racine, zéro fichier partagé touché. Le script `prepare` du paquet lance le build à l'installation ; `apps/site` ajoute `prebuild: node ../../packages/tokens/build.mjs` par sûreté.

### 4.2 L'app — PLUS TARD, sans modification aujourd'hui

L'app continue de lire `app/tailwind.config.js` et `app/src/styles/index.css`. La parité est **mécanique** : `check-parity.mjs` tourne en CI (job `site`, voir `site.md` §8) et casse la CI si l'un des deux côtés bouge sans l'autre. Règle opposable : **qui change une valeur de charte change les deux fichiers dans le même commit** (`tokens.json` + l'app), sinon la CI est rouge.

Au moment de la migration (`migration-apps-app.md`), l'app remplace ses littéraux par `tokens.color` / `var(--dt-…)`, et `check-parity.mjs` est supprimé (la source devient le paquet). Jusque-là, le validateur accepte `DOCTOPUS_APP_DIR` pour pointer vers `apps/app`.

## 5. Versionnement

- `tokens.json.$version` = `package.json.version` (semver). Un test l'imposera dès qu'un second consommateur existe.
- **patch** : correction d'une valeur (sans renommage) — ex. contraste.
- **minor** : ajout d'un token ou d'un groupe.
- **major** : suppression ou renommage d'un token, changement de préfixe CSS. Interdit tant que l'app n'est pas consommatrice (il n'y aurait personne à casser, donc personne pour le remarquer).
- Le `CHANGELOG` est le message de commit ; pas de fichier séparé avant le premier major.

## 6. Tests de contrat (existants, `npm test` dans `packages/tokens`)

1. Aucun token vide ; aucune métadonnée n'atteint le CSS ; `--dt-color-brand-500`, `--dt-color-paper`, `--dt-font-display` présents.
2. L'export JS s'importe et `tokens.color.signal[500] === '#d84a24'`.
3. `check-parity.mjs` → exit 0 sur `app/`.
4. `check-parity.mjs` → exit 1 sur une app mutée (couleur, easing, verre) avec les trois dérives nommées.

Preuve au commit `9ad5e1c` : `npm test` exit 0, `npm run check:parity` exit 0 (Node 26 local ; CI Node 22 — `node --test` découvre `test/*.test.mjs` depuis Node 20).

## 7. Ce que ce contrat n'autorise pas

- Écrire dans `app/` depuis le pipeline site (y compris pour « aligner » — on aligne `tokens.json`, jamais l'app, sauf commit conjoint validé par `main`).
- Ajouter une dépendance à `packages/tokens` (Style Dictionary, etc.) : 58 valeurs ne justifient pas un outil ; on y reviendra au-delà de ~300 ou d'un troisième consommateur.
- Un token « site-only » (ex. couleur de hero 3D) : il vit dans `apps/site`, pas dans le paquet.

## Non vérifié

- Le comportement de `prepare` avec `file:` sous `npm ci` en CI (documenté npm, non exécuté ici — `apps/site` n'existe pas encore) ; d'où le `prebuild` redondant.
