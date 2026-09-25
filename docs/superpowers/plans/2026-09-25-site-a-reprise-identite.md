# Site Doctopus — Plan A : reprise et identité de profondeur

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommandé) ou `superpowers:executing-plans`. Les étapes sont des cases à cocher (`- [ ]`).

**Goal:** Reprendre le site existant de `feat/site`, le remettre sous la nouvelle identité de marque (profondeur abyssale, voix allemande arrêtée, gradation pieuvre) et mécaniser cette identité par un validateur, de façon à obtenir un site **complet et déployable** avant d'y ajouter la vitrine animée.

**Architecture:** Le site existe déjà (`apps/site`, Astro 5 statique + Tailwind 3, jetons partagés `packages/tokens`, 10 validateurs, 20 pages). Ce plan **ne crée pas de site** : il change les jetons, la pile de surfaces, la copie et les gardes. Aucune page n'est ajoutée, aucun framework n'est ajouté. React, GSAP et la 3D arrivent au **Plan B**.

**Tech Stack:** Astro 5 (`output: 'static'`), Tailwind 3.4, `@doctopus/tokens` (build maison sans dépendance), `node --test`, Playwright + Lighthouse pour les gates.

## Contexte indispensable pour l'implémenteur

Tu travailles dans le worktree `…/doctopus-site`, branche `feat/site`. **Un seul writer.** Le site vit dans `apps/site`, les jetons dans `packages/tokens`.

Documents qui font autorité, dans cet ordre — lis-les avant la tâche 1 :
1. `app/docs/brand/PHILOSOPHIE.md` — **au-dessus de tout**. La métaphore fondatrice décide du visuel.
2. `app/docs/brand/VOIX.md` — comment on écrit. Contient les listes de mots.
3. `app/docs/brand/MESSAGES.md` — les accroches et les six piliers.
4. `docs/superpowers/specs/2026-09-25-site-marketing-design.md` — la spec du site.

Commandes de base (toujours depuis `apps/site`) :
```bash
npm ci                 # une seule fois
npm run build          # lance prebuild (jetons + fréquences + lexique) puis astro build
npm run verify         # la chaîne complète des gates — c'est elle qui tranche
npm test               # node --test seul
```
**Vérifier par code de sortie, jamais en lisant un message dans un pipe** (règle du dépôt).

## Global Constraints

- **Langue publique : allemand.** Aucun texte visible en français ou en anglais hors du miroir `/en/` (hors périmètre de ce plan).
- **Tutoiement (`du`) partout.** Un seul `Sie` sur une page publique est un défaut bloquant.
- **Ne jamais citer le nombre de comptes rendus sources.** Formulation unique : `Über 130 vollständige Fälle — real gestellte und realistisch mögliche — laufend aktualisiert.`
- **Aucune promesse de réussite**, aucun taux. `check-no-promise` reste bloquant.
- **Le barème « 60 points / 60 % » ne doit apparaître nulle part.** Toute évaluation affichée est signalée comme la **grille d'entraînement de Doctopus**, pas le barème d'une Landesärztekammer.
- **Aucun témoignage**, aucun nom de concurrent.
- **Aucune évocation animale au premier écran.** Pas d'yeux, pas de mascotte, pas d'émoji 🐙.
- **Aucun sauvetage, aucune noyade, aucun nageur représenté, aucune tempête.** (`PHILOSOPHIE.md` §08.)
- **La métaphore ne s'explique jamais en toutes lettres.** Aucun texte ne contient « wie ein Oktopus », « Ozean », « Abgrund ».
- **Le mot `lernen` est banni de la copie marketing** ; les verbes de marque sont `trainieren`, `sprechen`, `halten`.
- **Zéro point d'exclamation** dans la copie allemande publique.
- **Pas de nouvelle dépendance** dans ce plan. React, GSAP, R3F sont au Plan B.
- **Commits fichier par fichier** (`git add <chemin>`), jamais `git add -A`.
- Profondeur par **pile de surfaces d'une seule teinte, sans ombre portée** ; dégradés de **luminosité**, jamais de teinte.

---

### Task 1: Établir la ligne de base

Avant de changer quoi que ce soit, on constate l'état réel. Un plan bâti sur une supposition d'état est un plan faux.

**Files:**
- Create: `docs/superpowers/plans/2026-09-25-site-a-ETAT-INITIAL.md`

**Interfaces:**
- Consumes: rien.
- Produces: le fichier d'état, lu par les tâches suivantes pour savoir quelles gates étaient déjà rouges avant nous.

- [ ] **Step 1: Se placer et mettre à jour la branche**

```bash
cd "/Users/MehdiBoukari/Downloads/FSP VB/doctopus-site"
git status --porcelain          # doit être vide ; sinon STOP et signaler
git fetch origin
git rebase origin/main
```
Attendu : rebase sans conflit. En cas de conflit : **STOP**, ne rien résoudre à l'aveugle, remonter la liste des fichiers en conflit.

- [ ] **Step 2: Installer et construire**

```bash
cd apps/site && npm ci && npm run build; echo "build exit=$?"
```
Attendu : `build exit=0`. Si non nul, noter l'erreur exacte — elle va dans le fichier d'état, on ne la corrige pas encore.

- [ ] **Step 3: Passer toutes les gates et enregistrer le verdict**

```bash
cd apps/site
for g in test check:frequencies check:pricing check:lexicon check:legal check:placeholders check:budgets check:cta; do
  npm run --silent $g >/dev/null 2>&1; echo "$g=$?"
done
```
Attendu : une ligne par gate avec son code de sortie. `check:lighthouse` est exclu ici (il demande un build servi ; on le passe en tâche 8).

- [ ] **Step 4: Écrire le fichier d'état**

Créer `docs/superpowers/plans/2026-09-25-site-a-ETAT-INITIAL.md` avec, **avec les valeurs réellement obtenues** :

```markdown
# Site — état initial avant le plan A

Date : <date> · Commit : <sha court après rebase>

## Gates
| Gate | Code de sortie |
|---|---|
| build | 0 |
| test | 0 |
| … | … |

## Pages présentes
<sortie de `ls apps/site/src/pages/de/`>

## Ce qui est rouge avant nous
<liste, ou « rien »>
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-09-25-site-a-ETAT-INITIAL.md
git commit -m "chore(site): etat initial avant le plan A — gates et pages"
```

---

### Task 2: Les jetons de profondeur

La philosophie impose une pile de surfaces qui descend dans le noir pétrole, éclairée d'en haut. L'échelle `brand` actuelle s'arrête à `950` et sert l'app ; on ajoute un groupe **site-only** sans toucher à ce que `check-parity` surveille.

**Files:**
- Modify: `packages/tokens/tokens.json`
- Modify: `packages/tokens/test/tokens.test.mjs`
- Test: `packages/tokens/test/tokens.test.mjs`

**Interfaces:**
- Consumes: `flatten()` et `toCss()` de `packages/tokens/build.mjs` (déjà existants, inchangés).
- Produces: les variables CSS `--dt-depth-0` … `--dt-depth-4`, `--dt-depth-veil`, `--dt-depth-lift`, consommées par la tâche 3.

- [ ] **Step 1: Écrire le test qui échoue**

Vérifier d'abord que `readFileSync` est importé en tête du fichier ; sinon ajouter `import { readFileSync } from 'node:fs';`. Puis ajouter à la fin de `packages/tokens/test/tokens.test.mjs` :

```javascript
test('les jetons de profondeur existent et descendent en luminosité', async () => {
  const tokens = JSON.parse(readFileSync(new URL('../tokens.json', import.meta.url), 'utf8'));
  const depth = tokens.color.depth;
  assert.ok(depth, 'color.depth absent');

  // Cinq paliers, du plus clair (0) au plus profond (4).
  const steps = ['0', '1', '2', '3', '4'].map((k) => depth[k]);
  for (const [i, hex] of steps.entries()) {
    assert.match(hex ?? '', /^#[0-9a-f]{6}$/, `color.depth.${i} manquant ou mal formé`);
  }

  // Luminance relative strictement décroissante : la pile descend, elle ne chatoie pas.
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const lums = steps.map(lum);
  for (let i = 1; i < lums.length; i++) {
    assert.ok(lums[i] < lums[i - 1], `depth.${i} n'est pas plus profond que depth.${i - 1}`);
  }

  // Le texte « paper » doit rester lisible sur le palier le plus clair de la pile.
  const contrast = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  assert.ok(contrast(tokens.color.paper.DEFAULT, depth['0']) >= 4.5,
    'paper sur depth.0 sous 4,5:1');
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

```bash
cd packages/tokens && node --test test/tokens.test.mjs; echo "exit=$?"
```
Attendu : `exit=1`, message `color.depth absent`.

- [ ] **Step 3: Ajouter les jetons**

Dans `packages/tokens/tokens.json`, à l'intérieur de `"color"`, **après** le groupe `"signal"`, insérer :

```json
    "depth": {
      "$siteOnly": true,
      "$note": "Pile de surfaces du site (PHILOSOPHIE.md §04) : une seule teinte pétrole, luminosité décroissante, aucune ombre portée. depth-0 est la surface la plus haute (la plus proche de la lumière), depth-4 le fond. Non miroir de l'app : check-parity n'itère que sur brand et signal.",
      "0": "#0e3530",
      "1": "#0b2a26",
      "2": "#08201d",
      "3": "#051714",
      "4": "#030f0d",
      "veil": "rgb(244 245 242 / 0.06)",
      "lift": "rgb(244 245 242 / 0.10)"
    },
```

`veil` est le filet clair qui sépare deux surfaces (à la place d'une ombre). `lift` est le même filet, renforcé, pour le bord supérieur — **la lumière vient d'en haut**.

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

```bash
cd packages/tokens && node --test test/tokens.test.mjs; echo "exit=$?"
node scripts/check-parity.mjs; echo "parity=$?"
```
Attendu : `exit=0` et `parity=0`. Si `parity` vaut 1, **ne pas modifier l'app** : vérifier que le groupe ajouté est bien `depth` et non une modification de `brand`/`signal`.

- [ ] **Step 5: Régénérer et vérifier la sortie CSS**

```bash
cd packages/tokens && node build.mjs && grep -c "^  --dt-color-depth-" dist/tokens.css
```
Attendu : `7`.

- [ ] **Step 6: Commit**

```bash
git add packages/tokens/tokens.json packages/tokens/test/tokens.test.mjs
git commit -m "feat(tokens): pile de surfaces de profondeur — cinq paliers pétrole, filets de lumière, sans ombre"
```

---

### Task 3: Les deux registres et la pile de surfaces

Sombre = moments de marque. Clair = travail et lecture. Aujourd'hui le site utilise `dark:` de Tailwind au fil des composants ; on remplace ça par **deux registres explicites** posés sur une section.

**Files:**
- Modify: `apps/site/src/styles/global.css`
- Create: `apps/site/test/registers.test.mjs`
- Test: `apps/site/test/registers.test.mjs`

**Interfaces:**
- Consumes: les variables `--dt-color-depth-*` de la tâche 2.
- Produces: les classes `.register-deep`, `.register-work`, `.surface`, `.surface-raised` — utilisées par les tâches 5, 6 et 7, et par tout le Plan B.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `apps/site/test/registers.test.mjs` :

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');

test('les deux registres existent', () => {
  assert.match(css, /\.register-deep\s*\{/, '.register-deep absent');
  assert.match(css, /\.register-work\s*\{/, '.register-work absent');
});

test('la profondeur ne se fait jamais par ombre portée', () => {
  const surfaces = css.match(/\.surface[^{]*\{[^}]*\}/g) ?? [];
  assert.ok(surfaces.length > 0, 'aucune classe .surface');
  for (const block of surfaces) {
    assert.ok(!/box-shadow\s*:\s*(?!none)/.test(block),
      `ombre portée interdite dans une surface :\n${block}`);
  }
});

test('la lumière vient du haut : le filet supérieur est plus fort que le reste', () => {
  const block = css.match(/\.surface\s*\{[^}]*\}/)?.[0] ?? '';
  assert.match(block, /--dt-color-depth-lift/, 'le bord supérieur n\'utilise pas depth-lift');
  assert.match(block, /--dt-color-depth-veil/, 'les autres bords n\'utilisent pas depth-veil');
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

```bash
cd apps/site && node --test test/registers.test.mjs; echo "exit=$?"
```
Attendu : `exit=1`, `.register-deep absent`.

- [ ] **Step 3: Écrire les registres**

Ajouter à la fin de `apps/site/src/styles/global.css` :

```css
/* ── Les deux registres (PHILOSOPHIE.md §04, spec §6) ──────────────────────
   Sombre = moments de marque. Clair = travail et lecture.
   La profondeur se fait par PILE DE SURFACES d'une seule teinte, jamais par
   ombre portée. La lumière vient d'en haut : le filet supérieur est plus fort. */

.register-deep {
  --surface: var(--dt-color-depth-1);
  --surface-raised: var(--dt-color-depth-0);
  --on-surface: var(--dt-color-paper);
  --on-surface-muted: rgb(244 245 242 / 0.72);
  background-color: var(--dt-color-depth-2);
  color: var(--on-surface);
}

.register-work {
  --surface: #ffffff;
  --surface-raised: #ffffff;
  --on-surface: var(--dt-color-ink);
  --on-surface-muted: var(--dt-color-ink-600);
  background-color: var(--dt-color-paper);
  color: var(--on-surface);
}

.surface {
  background-color: var(--surface);
  color: var(--on-surface);
  border-radius: var(--dt-radius-card);
  border: 1px solid var(--dt-color-depth-veil);
  border-top-color: var(--dt-color-depth-lift);
}

.surface-raised {
  background-color: var(--surface-raised);
}

/* Dans le registre clair, les filets pétrole translucides sont invisibles :
   on redonne un trait d'encre très léger, même géométrie, même rôle. */
.register-work .surface {
  border-color: rgb(12 26 23 / 0.08);
  border-top-color: rgb(12 26 23 / 0.12);
}
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

```bash
cd apps/site && node --test test/registers.test.mjs; echo "exit=$?"
```
Attendu : `exit=0`.

- [ ] **Step 5: Vérifier que le build tient toujours**

```bash
cd apps/site && npm run build; echo "build=$?"
```
Attendu : `build=0`.

- [ ] **Step 6: Commit**

```bash
git add apps/site/src/styles/global.css apps/site/test/registers.test.mjs
git commit -m "feat(site): deux registres et pile de surfaces sans ombre, lumiere par le haut"
```

---

### Task 4: Le validateur de voix

`VOIX.md` contient des interdits précis. Un guide qu'aucune machine ne vérifie redevient un vœu au troisième sprint. On le mécanise, comme `check-no-promise`.

**Files:**
- Create: `apps/site/scripts/check-voice.mjs`
- Create: `apps/site/scripts/voice.lexicon.json`
- Create: `apps/site/test/check-voice.test.mjs`
- Modify: `apps/site/package.json` (scripts `check:voice`, et `verify`)

**Interfaces:**
- Consumes: `readTextFiles()` — **n'existe pas**, on l'écrit ici en local dans `check-voice.mjs`.
- Produces: la commande `npm run check:voice`, appelée par `verify` et par la CI (tâche 8).

- [ ] **Step 1: Écrire le lexique**

Créer `apps/site/scripts/voice.lexicon.json` :

```json
{
  "$note": "Interdits de VOIX.md §08 et PHILOSOPHIE.md §08. Motifs en minuscules, comparés sur le texte visible en minuscules. Voir README de chaque règle dans check-voice.mjs.",
  "vouvoiement": ["\\bsie können\\b", "\\bsie haben\\b", "\\bihre prüfung\\b", "\\bihr termin\\b"],
  "scolaire": ["\\blernen\\b", "\\bgelernt\\b", "\\blernreise\\b", "\\bkurs\\b", "\\blektion\\b", "\\bschüler\\b", "\\bniveau\\b"],
  "hype": ["\\brevolutionär\\b", "\\binnovativ\\b", "\\beinzigartig\\b", "\\bweltklasse\\b", "\\bganz einfach\\b", "\\bki-gestützt\\b"],
  "promesse": ["\\bgarantiert\\b", "\\berfolgsquote\\b", "\\bim ersten versuch\\b", "\\bprüfungsreif\\b"],
  "fuite": ["\\bprüfungsfragen\\b", "\\bdie themen\\b", "\\bdein fall ist dabei\\b"],
  "jeu": ["\\bstreak\\b", "\\bxp\\b", "\\bendgegner\\b", "\\bliga\\b"],
  "metaphore_explicitee": ["\\bwie ein oktopus\\b", "\\boktopus\\b", "\\bozean\\b", "\\babgrund\\b", "\\btintenfisch\\b"],
  "sauvetage": ["\\brette\\b", "\\brettung\\b", "\\brettungsring\\b", "\\bertrinken\\b", "\\bsturm\\b"],
  "bareme": ["60\\s*%", "60\\s*punkte"]
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `apps/site/test/check-voice.test.mjs` :

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findViolations } from '../scripts/check-voice.mjs';

test('attrape le vouvoiement', () => {
  const v = findViolations('a.html', '<p>Sie können hier üben.</p>');
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'vouvoiement');
});

test('attrape le verbe scolaire', () => {
  const v = findViolations('a.html', '<h1>Medizinisches Deutsch lernen</h1>');
  assert.deepEqual(v.map((x) => x.rule), ['scolaire']);
});

test('attrape la métaphore explicitée', () => {
  const v = findViolations('a.html', '<p>Wie ein Oktopus im Ozean.</p>');
  assert.ok(v.some((x) => x.rule === 'metaphore_explicitee'));
});

test('attrape le point d\'exclamation', () => {
  const v = findViolations('a.html', '<p>Jetzt starten!</p>');
  assert.deepEqual(v.map((x) => x.rule), ['exclamation']);
});

test('ignore ce qui est dans une balise script ou style', () => {
  const v = findViolations('a.html', '<script>const lernen = 1;</script><style>.x{}</style>');
  assert.deepEqual(v, []);
});

test('ignore les attributs : seul le texte visible compte', () => {
  const v = findViolations('a.html', '<a href="/de/kurs/" data-x="lernen">Training</a>');
  assert.deepEqual(v, []);
});

test('laisse passer une page propre', () => {
  const v = findViolations('a.html', '<h1>Dein Trainingsraum für die Sprache der Medizin.</h1><p>Du sprichst. Wir kennen die Tiefe.</p>');
  assert.deepEqual(v, []);
});
```

- [ ] **Step 3: Lancer le test et vérifier qu'il échoue**

```bash
cd apps/site && node --test test/check-voice.test.mjs; echo "exit=$?"
```
Attendu : `exit=1`, `Cannot find module .../scripts/check-voice.mjs`.

- [ ] **Step 4: Écrire le validateur**

Créer `apps/site/scripts/check-voice.mjs` :

```javascript
#!/usr/bin/env node
// Vérifie la voix de marque (app/docs/brand/VOIX.md §08, PHILOSOPHIE.md §08)
// sur le HTML construit. Sort en code 1 dès la première violation.
// Ne lit que le TEXTE VISIBLE : ni attributs, ni script, ni style.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const LEXICON = JSON.parse(readFileSync(join(here, 'voice.lexicon.json'), 'utf8'));

/** Texte visible d'un document HTML : balises, script, style et attributs retirés. */
export function visibleText(html) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/** @returns {{file: string, rule: string, match: string}[]} */
export function findViolations(file, html) {
  const text = visibleText(html);
  const lower = text.toLowerCase();
  const out = [];
  for (const [rule, patterns] of Object.entries(LEXICON)) {
    if (rule.startsWith('$')) continue;
    for (const p of patterns) {
      const m = lower.match(new RegExp(p));
      if (m) { out.push({ file, rule, match: m[0] }); break; }
    }
  }
  // Zéro point d'exclamation dans la copie allemande publique (VOIX.md §05).
  if (text.includes('!')) out.push({ file, rule: 'exclamation', match: '!' });
  return out;
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const dist = join(here, '..', 'dist');
let failed = 0;
for (const file of htmlFiles(dist)) {
  for (const v of findViolations(file, readFileSync(file, 'utf8'))) {
    console.error(`✗ ${v.rule.padEnd(22)} « ${v.match} »  ${file.replace(dist, 'dist')}`);
    failed++;
  }
}
if (failed) {
  console.error(`\ncheck-voice : ${failed} violation(s). Voir app/docs/brand/VOIX.md §08.`);
  process.exit(1);
}
console.log('check-voice : ok');
```

- [ ] **Step 5: Lancer le test et vérifier qu'il passe**

```bash
cd apps/site && node --test test/check-voice.test.mjs; echo "exit=$?"
```
Attendu : `exit=0`, 7 tests passés.

- [ ] **Step 6: Brancher la commande**

Dans `apps/site/package.json`, ajouter dans `"scripts"`, après `"check:cta"` :

```json
    "check:voice": "node scripts/check-voice.mjs",
```

et dans `"verify"`, insérer `&& npm run check:voice` **juste après** `npm run check:lexicon`.

- [ ] **Step 7: Lancer le validateur sur le site réel**

```bash
cd apps/site && npm run build >/dev/null && npm run check:voice; echo "voice=$?"
```
Attendu : **`voice=1` avec une liste de violations.** C'est normal : la copie actuelle a été écrite avant la session de marque. **Copier cette liste dans le commentaire du commit** — elle est le cahier des charges de la tâche 5.

- [ ] **Step 8: Commit**

```bash
git add apps/site/scripts/check-voice.mjs apps/site/scripts/voice.lexicon.json apps/site/test/check-voice.test.mjs apps/site/package.json
git commit -m "feat(site): validateur de voix — vouvoiement, verbe scolaire, hype, promesse, metaphore explicitee, exclamation"
```

---

### Task 5: Passer toute la copie existante à la nouvelle voix

Le validateur de la tâche 4 sort rouge. On le rend vert **en corrigeant les textes**, jamais en affaiblissant le lexique.

**Files:**
- Modify: chacun des fichiers listés par `npm run check:voice` à la tâche 4, étape 7. Le périmètre attendu : `apps/site/src/pages/de/*.astro`, `apps/site/src/components/*.astro`, `apps/site/src/content/faq/*.md`, `apps/site/src/content/blog/*.mdx`, `apps/site/src/data/site.json`.

**Interfaces:**
- Consumes: `findViolations()` via `npm run check:voice`.
- Produces: rien de programmatique. Produit un site dont `check:voice` sort en 0.

- [ ] **Step 1: Lister précisément ce qui est à corriger**

```bash
cd apps/site && npm run build >/dev/null && npm run check:voice 2>&1 | sed 's/^/  /'
```

Chaque ligne donne la règle, le mot et le fichier **construit**. Retrouver la source :
```bash
grep -rn "<le mot>" src/ --include=*.astro --include=*.md --include=*.mdx --include=*.json
```

- [ ] **Step 2: Corriger, règle par règle**

Règles de réécriture, dans l'ordre de fréquence attendue :

| Règle | Ce qu'on fait |
|---|---|
| `scolaire` (`lernen`, `Kurs`, `Niveau`) | remplacer par `trainieren` / `üben` / `sprechen`. « Vokabeln lernen » → « Fachbegriffe trainieren ». Jamais une glose : on change le verbe, pas la phrase autour |
| `vouvoiement` | passer au `du`. Attention aux accords : `Ihre Prüfung` → `deine Prüfung`, `Sie können` → `du kannst` |
| `exclamation` | supprimer le point d'exclamation. Si la phrase perd son énergie, c'est qu'elle reposait dessus : la réécrire en phrase courte affirmative |
| `hype` | supprimer l'adjectif. Ne pas le remplacer : un fait ou rien |
| `promesse` | réécrire en description du dispositif. « macht dich prüfungsreif » → « du übst die ganze Prüfung » |
| `jeu` | `Streak` → `Tage in Folge` ; ne jamais nommer un mécanisme de jeu en façade |
| `bareme` | supprimer toute mention de 60 % ou 60 points. Remplacer par « Doctopus-Übungsskala » avec le renvoi existant de `disclaimer.ts` |
| `metaphore_explicitee`, `sauvetage` | supprimer purement. Ces mots ne se remplacent pas |

**Interdit** : retirer un motif du lexique pour faire passer une page. Si un motif produit un faux positif légitime (ex. `Niveau` dans une citation officielle d'une Landesärztekammer), **l'entourer d'un commentaire et le signaler dans le commit** — la décision d'assouplir appartient à la revue, pas à l'implémenteur.

- [ ] **Step 3: Remplacer la formulation du corpus**

```bash
cd apps/site && grep -rn "Prüfungsprotokoll\|Protokolle von Kandidaten" src/
```
Chaque occurrence qui **révèle le sourcing** est remplacée par la formulation unique :
> `Über 130 vollständige Fälle — real gestellte und realistisch mögliche — laufend aktualisiert.`

Dire que les cas sont réels est autorisé ; décrire d'où ils viennent et en quelle quantité ne l'est pas.

- [ ] **Step 4: Supprimer les annonces de fonctionnalités non livrées**

```bash
cd apps/site && grep -rn "bald\|demnächst\|kommt" src/pages src/components src/content
```
Une vitrine ne promet pas ce qui n'existe pas. Chaque « bald » est soit supprimé, soit déplacé dans `/de/status/` (qui est fait pour ça).

- [ ] **Step 5: Vérifier**

```bash
cd apps/site && npm run build >/dev/null && npm run check:voice; echo "voice=$?"
npm run check:lexicon; echo "lexicon=$?"
```
Attendu : `voice=0` et `lexicon=0`.

- [ ] **Step 6: Commit, fichier par fichier**

```bash
git add apps/site/src/pages/de/index.astro
git commit -m "fix(site): accueil — voix de marque (du, trainieren, sans exclamation ni annonce)"
# puis un commit par groupe de fichiers cohérent : composants, faq, blog, données
```

---

### Task 6: La gradation de la pieuvre — la courbe

Premier écran : rien. Dès le deuxième, une courbe fine qui accompagne le scroll et sert d'indicateur de progression. **Sans JavaScript** : `scroll-timeline` là où c'est supporté, trait fixe partout ailleurs. La 3D et le mouvement orchestré sont au Plan B.

**Files:**
- Create: `apps/site/src/components/DepthRail.astro`
- Modify: `apps/site/src/layouts/Base.astro`
- Create: `apps/site/test/depth-rail.test.mjs`
- Test: `apps/site/test/depth-rail.test.mjs`

**Interfaces:**
- Consumes: `.register-deep` et les variables `--dt-color-depth-*` (tâche 3).
- Produces: le composant `<DepthRail />`, accepté par `Base.astro` via la prop booléenne `rail` (défaut `false`).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `apps/site/test/depth-rail.test.mjs` :

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/DepthRail.astro', import.meta.url), 'utf8');

test('la courbe est décorative pour les lecteurs d\'écran', () => {
  assert.match(src, /aria-hidden="true"/);
});

test('aucun script : la courbe est purement CSS', () => {
  assert.ok(!/<script/i.test(src), 'la courbe ne doit embarquer aucun JavaScript');
});

test('le mouvement est neutralisé sous prefers-reduced-motion', () => {
  assert.match(src, /prefers-reduced-motion:\s*reduce/);
});

test('aucun trait animal : ni œil, ni ventouse dessinée, ni emoji', () => {
  assert.ok(!/🐙|circle[^>]*class="[^"]*eye|<title>/i.test(src));
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

```bash
cd apps/site && node --test test/depth-rail.test.mjs; echo "exit=$?"
```
Attendu : `exit=1`, `ENOENT … DepthRail.astro`.

- [ ] **Step 3: Écrire le composant**

Créer `apps/site/src/components/DepthRail.astro` :

```astro
---
// La courbe de profondeur. Signature discrète de la marque (PHILOSOPHIE.md §06,
// spec §6 « gradation stricte ») : jamais au premier écran, jamais un animal.
// Elle indique l'avancée dans la page. Purement CSS : aucun JavaScript.
---
<div class="depth-rail" aria-hidden="true">
  <svg viewBox="0 0 8 1000" preserveAspectRatio="none" focusable="false">
    <path
      d="M4 0 C 1 120, 7 240, 4 360 S 1 600, 4 720 S 7 880, 4 1000"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      stroke-linecap="round"
      pathLength="1"
    />
  </svg>
</div>

<style>
  .depth-rail {
    position: fixed;
    top: 12vh;
    bottom: 12vh;
    left: max(1rem, env(safe-area-inset-left));
    width: 8px;
    color: var(--dt-color-depth-veil);
    pointer-events: none;
    z-index: 0;
  }
  .depth-rail svg { height: 100%; width: 100%; }

  /* La portion parcourue s'éclaire — la lumière vient d'en haut.
     `animation-timeline` n'est pas supporté partout : sans lui, le trait
     reste entier et fixe, ce qui est un état final valide. */
  .depth-rail path {
    stroke-dasharray: 1;
    stroke-dashoffset: 0;
  }

  @supports (animation-timeline: scroll()) {
    .depth-rail path {
      stroke-dasharray: 1;
      stroke-dashoffset: 1;
      animation: rail-fill linear both;
      animation-timeline: scroll();
    }
    @keyframes rail-fill { to { stroke-dashoffset: 0; } }
  }

  @media (prefers-reduced-motion: reduce) {
    .depth-rail path { animation: none; stroke-dashoffset: 0; }
  }

  /* Sous 900 px la colonne de texte occupe la largeur : la courbe s'efface. */
  @media (max-width: 900px) { .depth-rail { display: none; } }
</style>
```

- [ ] **Step 4: Lancer le test et vérifier qu'il passe**

```bash
cd apps/site && node --test test/depth-rail.test.mjs; echo "exit=$?"
```
Attendu : `exit=0`, 4 tests passés.

- [ ] **Step 5: Brancher dans le gabarit**

Dans `apps/site/src/layouts/Base.astro`, ajouter à l'import et aux props :

```astro
import DepthRail from '@/components/DepthRail.astro';

const { title, description, path, rail = false } = Astro.props;
```

puis, à l'intérieur de `<body>`, **avant** le contenu :

```astro
{rail && <DepthRail />}
```

- [ ] **Step 6: Vérifier qu'aucune page ne l'active encore**

```bash
cd apps/site && npm run build >/dev/null && grep -rl "depth-rail" dist/ | wc -l
```
Attendu : `0`. La courbe existe, aucune page ne l'a demandée : c'est le Plan B qui l'activera sur l'accueil, après le premier écran.

- [ ] **Step 7: Commit**

```bash
git add apps/site/src/components/DepthRail.astro apps/site/src/layouts/Base.astro apps/site/test/depth-rail.test.mjs
git commit -m "feat(site): courbe de profondeur — signature CSS sans script, neutralisee sous reduced-motion"
```

---

### Task 7: Le hero sous la nouvelle promesse

Le hero actuel porte l'ancienne accroche. On applique `MESSAGES.md` §04.

**Files:**
- Modify: `apps/site/src/components/Hero.astro`
- Modify: `apps/site/src/data/site.json`
- Create: `apps/site/test/hero.test.mjs`
- Test: `apps/site/test/hero.test.mjs`

**Interfaces:**
- Consumes: `.register-deep`, `.surface` (tâche 3) ; `readSite()` de `apps/site/src/lib/site.ts` (existant).
- Produces: rien de programmatique.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `apps/site/test/hero.test.mjs` :

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/components/Hero.astro', import.meta.url), 'utf8');
const site = JSON.parse(readFileSync(new URL('../src/data/site.json', import.meta.url), 'utf8'));

test('le hero porte l\'accroche arrêtée', () => {
  assert.match(src + JSON.stringify(site), /Dein Trainingsraum für die Sprache der Medizin/);
});

test('le descripteur reste indexable', () => {
  assert.match(JSON.stringify(site), /medizinisches Deutsch/i);
});

test('aucune évocation animale au premier écran', () => {
  assert.ok(!/oktopus|tintenfisch|🐙|tentakel/i.test(src));
});

test('le hero ne contient qu\'un seul appel à l\'action principal', () => {
  const ctas = src.match(/<CtaButton/g) ?? [];
  assert.ok(ctas.length <= 2, `${ctas.length} CTA dans le hero ; deux au maximum (principal + secondaire)`);
});
```

- [ ] **Step 2: Lancer le test et vérifier qu'il échoue**

```bash
cd apps/site && node --test test/hero.test.mjs; echo "exit=$?"
```
Attendu : `exit=1` sur la première assertion.

- [ ] **Step 3: Poser l'accroche dans les données**

Dans `apps/site/src/data/site.json`, remplacer la valeur de `tagline` par :

```json
  "tagline": "Dein Trainingsraum für die Sprache der Medizin",
  "descriptor": "Dein Trainingsraum für medizinisches Deutsch",
```

`tagline` sert le hero, `descriptor` sert la balise `<title>` et les annuaires — c'est lui qui contient les mots qu'on tape dans un moteur de recherche.

- [ ] **Step 4: Réécrire le hero**

Dans `apps/site/src/components/Hero.astro`, le bloc visible devient :

```astro
<section class="register-deep">
  <div class="mx-auto max-w-5xl px-4 py-24 md:py-32">
    <h1 class="font-display text-4xl leading-[1.05] tracking-[-0.03em] md:text-6xl">
      {site.tagline}.
    </h1>
    <p class="mt-6 max-w-2xl text-lg" style="color: var(--on-surface-muted)">
      Aussprache, Wortschatz, Grammatik, Redefluss, Kommunikation — trainiert an
      über 130 vollständigen Fällen. Mit einem Plan, der sich an deinen Termin
      und deine Schwächen anpasst.
    </p>
    <div class="mt-10 flex flex-wrap gap-3">
      <CtaButton href={ctaPrimary.href} variant="primary">{ctaPrimary.label}</CtaButton>
      <CtaButton href="/de/produkt/" variant="ghost">So funktioniert es</CtaButton>
    </div>
  </div>
</section>
```

Ne pas toucher au bloc frontmatter existant (imports, `readSite()`, `ctaPrimary`) — il fonctionne et `check-cta` en dépend.

- [ ] **Step 5: Lancer les tests et les gates**

```bash
cd apps/site && node --test test/hero.test.mjs; echo "hero=$?"
npm run build >/dev/null && npm run check:voice; echo "voice=$?"
npm run check:cta; echo "cta=$?"
```
Attendu : `hero=0`, `voice=0`, `cta=0`.

- [ ] **Step 6: Commit**

```bash
git add apps/site/src/data/site.json apps/site/src/components/Hero.astro apps/site/test/hero.test.mjs
git commit -m "feat(site): hero — Dein Trainingsraum fuer die Sprache der Medizin, les cinq competences en sous-titre"
```

---

### Task 8: Fermer la boucle — CI, contraste, vitesse

**Files:**
- Modify: `.github/workflows/quality.yml`
- Create: `apps/site/test/contrast.test.mjs`
- Test: `apps/site/test/contrast.test.mjs`

**Interfaces:**
- Consumes: `npm run verify` (étendu à la tâche 4).
- Produces: une CI qui refuse toute régression de voix ou de contraste.

- [ ] **Step 1: Écrire le test de contraste qui échoue**

Créer `apps/site/test/contrast.test.mjs` :

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokens = JSON.parse(readFileSync(new URL('../../../packages/tokens/tokens.json', import.meta.url), 'utf8'));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('le texte du registre profond tient AA sur chaque palier', () => {
  const paper = tokens.color.paper.DEFAULT;
  for (const step of ['0', '1', '2', '3', '4']) {
    const r = ratio(paper, tokens.color.depth[step]);
    assert.ok(r >= 4.5, `paper sur depth.${step} : ${r.toFixed(2)}:1 < 4,5:1`);
  }
});

test('le signal corail reste lisible sur le fond de section profond', () => {
  const r = ratio(tokens.color.signal['300'], tokens.color.depth['2']);
  assert.ok(r >= 4.5, `signal.300 sur depth.2 : ${r.toFixed(2)}:1 < 4,5:1`);
});
```

- [ ] **Step 2: Lancer le test**

```bash
cd apps/site && node --test test/contrast.test.mjs; echo "exit=$?"
```
Si `exit=1` : **ne pas baisser le seuil**. Corriger le jeton fautif dans `packages/tokens/tokens.json` (éclaircir `signal.300` ou le palier de fond), puis relancer la tâche 2 étape 4.

- [ ] **Step 3: Brancher la voix dans la CI**

Dans `.github/workflows/quality.yml`, dans le job du site, après l'étape qui lance `check:lexicon`, ajouter :

```yaml
      - name: Voix de marque
        working-directory: apps/site
        run: npm run check:voice
```

- [ ] **Step 4: Passer la chaîne complète**

```bash
cd apps/site && npm run verify; echo "verify=$?"
```
Attendu : `verify=0`. C'est **la** preuve de fin de plan : tout le reste est indicatif.

- [ ] **Step 5: Vérifier dans un vrai navigateur**

```bash
cd apps/site && npm run build && npm run preview &
sleep 3
npx playwright screenshot --viewport-size=390,844 http://localhost:5181/de/ /tmp/site-mobile.png
npx playwright screenshot --viewport-size=1440,900 http://localhost:5181/de/ /tmp/site-desktop.png
```
Regarder les deux captures. Contrôler : aucun débordement horizontal à 390 px · la pile de surfaces descend sans ombre portée · aucune évocation animale au premier écran · le filet supérieur est visible et plus clair que les autres bords.

- [ ] **Step 6: Commit**

```bash
git add apps/site/test/contrast.test.mjs .github/workflows/quality.yml
git commit -m "ci(site): voix bloquante en CI, contraste AA teste sur la pile de profondeur"
```

---

## Ce que ce plan ne fait pas

Volontairement hors périmètre — chacun a son plan :

- **Plan B — la vitrine** : les six moments du walkthrough, les îlots React, GSAP ScrollTrigger, la signature 3D en React Three Fiber, le rythme des ventouses comme système de formes. C'est là que vont les nouvelles dépendances.
- **Plan C — `/wissen`** : les deux portes (Procédure, Examen), la couche `/wissen/fragen/*`, le miroir `/en/`, les quatre composants de schéma.
- **Plan D — `/fahrplan`** : les six questions, le résultat sans compte, le pré-remplissage du profil, le consentement et la mise à jour de la Datenschutzerklärung.

## Décisions encore ouvertes (ne bloquent pas ce plan)

| # | Décision | Quand elle devient bloquante |
|---|---|---|
| 1 | **Hébergement** — Vercel ou GitHub Pages. Recommandation maintenue : **Vercel** (previews par PR). Le site est statique : la bascule ne coûte qu'un fichier de configuration | au déploiement, fin du Plan B |
| 2 | **Les prix** — montants Free / Pro / Premium. `apps/site/src/data/pricing.json` existe et `check-pricing-parity` garde la cohérence | avant la mise en ligne publique |
| 3 | **Le nom de domaine** — `doctopus.co` à confirmer | au déploiement |
| 4 | **Bake-off de direction artistique** (`taste-skill` / `refero-design` / `bencium-impact-designer`) | à l'ouverture du Plan B, sur le hero |
