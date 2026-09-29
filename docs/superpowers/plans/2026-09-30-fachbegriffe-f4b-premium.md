# Fachbegriffe F4b — Couche premium : verre, étoile, decks flottants, mouvement · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner aux Fachbegriffe une matière (une seule verre, deux densités), une étoile cristal/ambre, des decks en onglets flottants, un mouvement partagé et interruptible, une carte d'embarquement du drill et une mini-fiche « carte en devenir » — sans toucher aux données, aux événements ni à la logique.

**Architecture:** Tranche A — `lib/motion.ts`, seul point d'import de `motion` (`LazyMotion` strict + `domMin`, `MotionConfig reducedMotion="user"` + `skipAnimations` sous mouvement réduit, gestes apparaître / s'étendre / glisser / se poser, vol FLIP natif) monté une fois dans `Shell` ; jetons `glass-thin` / `glass-full` dérivés de `.glass` et jeton Tailwind `star`. Tranche B — l'étoile dessinée (`StarGlyph`) et la confirmation en pilule. Tranche C — la bulle de sélection en pilule qui s'étend en carte. Tranche D — la mini-fiche « carte en devenir » qui se pose dans la pilule. Tranche E — suppression de deck différée (même mécanique que `pendingDeletion`), tiroir de gestion `DeckManager`, tiroir d'un terme en verre, onglets de decks `DeckRail` sur son bord gauche (allumé = rangé, toucher = ranger/retirer). Tranche F — carte d'embarquement du drill (relevés comptés une fois). Tranche G — revues, preuve navigateur, mesure du bundle, PR.

**Tech Stack:** React 18, Vite 7, TypeScript, Tailwind 3.4, `motion` 13.4.6 (`motion/react`, `motion/react-m`), Dexie 4, Zustand, Vitest 5 + @testing-library/react + fake-indexeddb (jsdom), playwright-cli.

Spec : `docs/superpowers/specs/2026-09-30-fachbegriffe-f4b-premium-design.md` (source de vérité, P1–P10, AC-1–AC-10). Forme : `docs/superpowers/plans/2026-09-28-fachbegriffe-f4a-clarte.md`.

## Global Constraints

- Branche `feat/fachbegriffe-premium`, worktree `/Users/MehdiBoukari/Downloads/FSP VB/doctopus-premium` (depuis `main` 4968e17 + spec 2142978). Commandes depuis `app/` sauf mention. Node ≥ 22. Le worktree n'a pas de `node_modules` : `npm ci; echo exit=$?` → `exit=0` avant la Task A1.
- Gates après chaque tâche : `npm run typecheck; echo exit=$?`, `npx vitest run --dir src; echo exit=$?`, `npm run build; echo exit=$?` → `exit=0`. Vérifier par **code de sortie**, jamais par un message lu via un pipe. Les tests passent **sans** `app/.env`.
- Stager **fichier par fichier** (`git add <chemin>`), jamais `git add -A` ; **aucun** trailer `Co-Authored-By` ; un seul writer par worktree ; le brief d'un sous-agent contient sa tâche, pas le plan entier. Mehdi édite en parallèle : ne jamais toucher un fichier hors de la liste `Files:` de la tâche.
- **Hors périmètre (spec §2)** : aucune donnée, aucun événement, aucune migration, aucune fonction serveur nouvelle ; `docs/contracts/` intouché ; pas de refonte hors Fachbegriffe/drill ; personnalisation des cartes = chantier 3.
- **Matière (P1/P2)** : une seule verre, `glass-thin` (pilule, onglets) et `glass-full` (carte, tiroir), dérivées de `.glass` ; liseré de lumière en haut (inset) ; **aucune ombre portée** ; repli opaque sous `prefers-reduced-transparency` et sans `backdrop-filter`. Le verre n'habille que ce qui **flotte** (bulle, onglets, confirmation, mini-fiche, tiroirs) ; les surfaces de lecture restent la charte « instrument clinique ». Aucune classe `shadow-*` sur un élément refondu.
- **Étoile (P3)** : vide = cristal (incolore, liseré clair) ; pleine = ambre glassy doux, jeton `star` (jamais en texte courant) ; contraste ≥ 3:1 clair et sombre ; **aucun corail** (`signal-*`) sur l'étoile.
- **Mouvement (P9/P10)** : `motion` importé **uniquement** dans `src/lib/motion.ts` (hors tests) — vérifié par `grep -rl "from 'motion" src | grep -v '\.test\.' | grep -v '^src/lib/motion.ts$'; echo exit=$?` → aucune ligne, `exit=1`. Composants : `m.*` seulement (LazyMotion strict), jamais `motion.*`. Quatre gestes : apparaître, s'étendre, glisser, se poser ; ressort court **sans rebond** ; interruptibles ; états instantanés sous `prefers-reduced-motion`. Compteurs de la carte d'embarquement comptés **une fois**, statiques sous mouvement réduit.
- **Tests déterministes sous jsdom** (vérifié en rédigeant ce plan) : les tests de composants rendent **sans** `MotionRoot` → aucune fonction d'animation n'est chargée, `AnimatePresence` retire l'élément **dans le même rendu** (sortie synchrone), `layout`/`initial` n'animent rien. Le câblage (`reducedMotion`, `skipAnimations`, interruption) est testé dans `src/lib/motion.test.tsx` avec `MotionRoot` et un `matchMedia` simulé. Le mouvement réel est prouvé au navigateur (Task G2, vidéo).
- Cibles ≥ 44 px (`h-11`/`min-h-11`/`w-11`) ; 390 px sans débordement (`document.documentElement.scrollWidth <= 390`) ; `aria-label` conservés.
- **Copy exacte (spec)**, français, tutoiement : « Rangée dans Favoris », « Révéler », « Changer », « Annuler », « Carte supprimée », « Créer la carte », « Ranger », « Touche le mot à garder », « À jour ✓ — prochain terme dû le … », « Commencer (N cartes) », exemples « Aszites → ? », « Bauchwasser → ? ».
- **Bundle (AC-9, relevé par la direction le 30 sept.)** : **+30 Ko gzip max**, mesuré par la commande de la Task G3 (somme gzip niveau 9 des `dist/assets/*.js`, en Kio) avant/après. Mesuré en rédigeant : +29,8 Kio — marge 0,2 Kio : toute tâche qui ajoute du JS remesure (G3) avant son commit.

## Hypothèses et décisions

1. **Onglets de decks (P6, décidé par la direction le 30 sept.)** : ils sortent du bord gauche du **tiroir latéral d'un terme** (`GlossaryDrawer`) ; téléphone = bande horizontale en haut du tiroir. **Comportement retenu (défaut à confirmer, Question ouverte 1)** : un onglet par deck ; **allumé = CE terme y est rangé** ; toucher = ranger / retirer (fonctions existantes `addTermToDeck` / `removeTermFromDeck`) ; decks intelligents affichés avec leur icône, inertes ; « ⋯ Decks » ouvre le tiroir de gestion. Les onglets **remplacent** l'étoile du tiroir et le menu `DeckChecklist` (supprimé) : une ★ pleine, partout ailleurs, ouvre la fiche du terme, où vivent ses onglets — un seul endroit pour ranger.
2. La page Fachbegriffe garde ses onglets-filtres (`DeckTabs`, inchangés) ; son bouton « ⋯ » ouvre le **même** tiroir de gestion (`DeckManager`) au lieu du mode « édition » de `DeckSheet`, qui ne sert plus qu'à **créer** (manuel ou intelligent) — zéro doublon.
3. `s'étendre` et `se poser` sont faits **sans** animations de mise en page (`layoutId`) : `domMax` coûte +13 Kio gzip de plus que `domMin` (mesuré). La carte naît de l'ancre (`scale` depuis `transformOrigin`) et se pose en descendant vers la pilule ; le mot « vole » par un FLIP natif (WAAPI, 0 Ko).

## Carte des fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `app/package.json`, `app/package-lock.json` | dépendance `motion@^13.4.6` | A1 |
| `app/src/lib/motion.ts` (+ `motion.test.tsx`) | seul import de `motion` : `MotionRoot`, `spring`, `appear`, `expand`, `slide`, `settleOrClose`, `flyFrom` (A1), `useCountUp` (F1) | A1, F1 |
| `app/src/components/Shell.tsx` | monte `MotionRoot` | A1 |
| `app/src/styles/index.css`, `app/tailwind.config.js`, `app/src/styles/tokens.test.ts` | `glass-thin`/`glass-full` + replis, jeton `star`, animation `shimmer` | A2 |
| `app/src/components/StarButton.tsx` (+ test) | `StarGlyph` cristal/ambre, retrait de `tone` ; ★ pleine → fiche du terme | B1, E4 |
| `app/src/components/CardToast.tsx` (+ test) | pilule de confirmation | B2, E1 |
| `app/src/components/SelectionExplainer.tsx` (+ test) | pilule 2 icônes → carte | B1, C1, D1 |
| `app/src/components/NewCardSheet.tsx` (+ test), `TermSheet.tsx` | carte en devenir, se pose | D1 |
| `app/src/lib/collections/index.ts`, `pendingDeletion.ts` (+ test), `app/src/store/cardToast.ts` | suppression de deck différée | E1 |
| `app/src/features/fachbegriffe/DeckManager.tsx` (+ test) | tiroir de gestion (renommer, supprimer + Annuler, créer sur place) | E2, E4 |
| `app/src/components/GlossaryDrawer.tsx` (+ test) | tiroir en verre, glisse ; porte les onglets | E3, E4 |
| `app/src/components/DeckRail.tsx` ; suppression de `DeckChecklist.tsx` | onglets de decks d'un terme | E4 |
| `app/src/features/fachbegriffe/{DeckSheet,FachbegriffePage}.tsx` (+ test), `TermHoverCard.test.tsx`, `CaseTermsPanel.test.tsx` | création seule ; « ⋯ » → gestion ; decks en attente masqués | E4 |
| `app/src/features/fachbegriffe/DrillPage.tsx` (+ test) | carte d'embarquement | F1 |
| `app/scripts/e2e/fachbegriffe-f4b.spec.md` | preuve navigateur | G2 |

## Mesures faites en rédigeant ce plan (code de ce plan exécuté sur une copie jetable)

Source-driven (`npm view motion version` → **13.4.6** ; installé dans une copie, jamais dans le worktree) : `motion` 13.4.6 dépend de `framer-motion` 13.4.6 (`motion-dom` 13.4.5, `motion-utils` 13.3.0). `motion/react` exporte `LazyMotion` (`features`, `strict`), `domAnimation`, `domMax`, **`domMin`** (rendu + `animate`/`exit`, sans gestes ni layout), `MotionConfig` (`reducedMotion: 'always' | 'never' | 'user'`, **`skipAnimations`**), `AnimatePresence` (`initial`, `custom`, `mode`), `useReducedMotion`, `MotionConfigContext`, `MotionGlobalConfig` ; `motion/react-m` exporte les composants `m.*`. Ressort : `{ type: 'spring', visualDuration, bounce }`. Constats jsdom : sans `LazyMotion`, `m.div` pose le style `initial` et n'anime pas, `AnimatePresence` retire tout de suite ; `useReducedMotion` lit `matchMedia('(prefers-reduced-motion)')` **une fois** puis suit son événement `change` ; `reducedMotion="user"` ne coupe que les transforms → `skipAnimations` requis pour des états instantanés.

Bundle (`vite build`, somme gzip des `dist/assets/*.js`, niveau 9, Kio ; entre parenthèses la ligne `index-*.js` de Vite, en kB) :

| Variante | JS gzip | Δ |
|---|---|---|
| `main` (2142978) | 547,15 Kio (561,52 kB) | — |
| sonde `domMax` synchrone (+ `layoutId`) | 589,84 Kio | +42,7 Kio |
| sonde `domAnimation` synchrone | 576,31 Kio | +29,2 Kio |
| sonde `domAnimation` asynchrone (chunk séparé) | 563,25 + 14,05 Kio | +16,1 Kio au démarrage, +30,6 au total |
| sonde `domMin` synchrone | 574,40 Kio (589,49 kB) | +27,3 Kio (+28,0 kB) |
| première version du plan (onglets sur la page, `DeckChecklist` gardé) | 576,99 Kio | +29,8 Kio |
| **ce plan (`domMin`, onglets dans le tiroir, `DeckChecklist` retiré, tâches A1–F1)** | **576,97 Kio (592,14 kB)** | **+29,8 Kio (+30,6 kB)** ; CSS +0,72 Kio |

`motion` seul (cœur `m` + `AnimatePresence` + `LazyMotion` ≈ 16 Kio, `domMin` ≈ 11 Kio) en prend ≈ 27 Kio ; le code F4b ≈ 2,5 Kio. Plafond de la direction : +30 Ko, mesuré en Kio par la commande G3 → tenu, à 0,2 Kio près. La ligne `index-*.js` de Vite (gzip par défaut, kB décimaux) affiche +30,6 kB : reporter les deux dans la PR. Un `React.lazy` du tiroir de gestion a été essayé : −0,85 kB au démarrage mais +0,6 au total, et un chunk manquant après déploiement ferait planter l'app sans frontière d'erreur — écarté.

Tests (copie jetable, après F1) : typecheck `exit=0`, `npx vitest run --dir src` **583/583** (trois passages consécutifs verts), build `exit=0`. Un test de `main` était déjà instable sous charge (`DrillPage` « ?case= sans rien à réviser ») : corrigé en F1 (délai de 3 s).

---

# Tranche A — Fondations (spec §3, P1, P3, P9)

### Task A1 : Dépendance `motion`, `lib/motion.ts`, `MotionRoot` dans `Shell` (ux-motion-designer, Sonnet)

**Files:**
- Modify: `app/package.json`, `app/package-lock.json` (via `npm install`)
- Create: `app/src/lib/motion.ts`, `app/src/lib/motion.test.tsx`
- Modify: `app/src/components/Shell.tsx`

**Interfaces:**
- Consumes : rien.
- Produces (importés par toutes les tâches suivantes, jamais `motion` directement) : `MotionRoot({ children })` ; `m` (namespace `motion/react-m`) ; `AnimatePresence` ; `spring: Transition` ; `appear`, `expand` (objets `{ initial, animate, exit, transition }` à étaler sur un `m.*`) ; `slide(edge: 'left' | 'right' | 'bottom')` (même forme) ; `settleOrClose(dy: number | undefined)` (variante de sortie : `dy` → se poser, sinon `expand.exit`) ; `flyFrom(el: HTMLElement | null, from: DOMRect | null): void` (FLIP natif).

- [ ] **Step 1 : dépendance (source-driven)**

```bash
npm view motion version            # attendu : 13.4.6
npm install motion@^13.4.6; echo exit=$?
node -e "const l=require('./package-lock.json');for(const k of ['motion','framer-motion','motion-dom','motion-utils'])console.log(k,l.packages['node_modules/'+k].version)"
```

Attendu : `exit=0`, `package.json` gagne `"motion": "^13.4.6",` (entre `dexie-react-hooks` et `qrcode`), puis `motion 13.4.6`, `framer-motion 13.4.6`, `motion-dom 13.4.5`, `motion-utils 13.3.0`. Si la version publiée a changé : **s'arrêter**, revérifier les exports listés dans « Mesures » sur la nouvelle version avant de continuer.

- [ ] **Step 2 : test qui échoue** — créer `app/src/lib/motion.test.tsx` :

```tsx
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { useContext, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MotionConfigContext } from 'motion/react';
import { AnimatePresence, m, appear, MotionRoot, flyFrom, settleOrClose, expand } from './motion';

// jsdom n'a pas matchMedia : une requête pilotable, avec son événement `change`
// (motion l'écoute une fois, au premier useReducedMotion).
const listeners = new Set<() => void>();
const mql = { matches: false, media: '(prefers-reduced-motion)', onchange: null,
  addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  addListener() {}, removeListener() {}, dispatchEvent: () => false };
const setReduce = (on: boolean) => { mql.matches = on; listeners.forEach((f) => f()); };

function Config() {
  const c = useContext(MotionConfigContext);
  return <span data-testid="cfg">{`${c.reducedMotion}|${c.skipAnimations}`}</span>;
}
function Toggle() {
  const [open, setOpen] = useState(true);
  return (<>
    <button type="button" onClick={() => setOpen((o) => !o)}>basculer</button>
    <AnimatePresence>{open && <m.div key="b" data-testid="b" {...appear}>x</m.div>}</AnimatePresence>
  </>);
}

describe('MotionRoot (F4b P9, AC-8)', () => {
  beforeAll(() => { window.matchMedia = (() => mql) as never; });

  it('reducedMotion="user" ; sans préférence, les animations tournent', () => {
    render(<MotionRoot><Config /></MotionRoot>);
    expect(screen.getByTestId('cfg').textContent).toBe('user|false');
  });
  it('prefers-reduced-motion : skipAnimations → états instantanés', () => {
    setReduce(true);
    render(<MotionRoot><Config /></MotionRoot>);
    expect(screen.getByTestId('cfg').textContent).toBe('user|true');
    setReduce(false);
  });
  it('interruptible : fermer puis rouvrir pendant la sortie garde UN élément, qui finit visible', async () => {
    render(<MotionRoot><Toggle /></MotionRoot>);
    fireEvent.click(screen.getByText('basculer'));   // sortie en cours
    fireEvent.click(screen.getByText('basculer'));   // réouverture pendant la sortie
    expect(screen.getAllByTestId('b')).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('b').style.opacity).toBe('1'));
  });
});

describe('gestes (F4b P8/P9)', () => {
  const rect = (left: number, top: number) => ({ left, top, width: 10, height: 10, right: left + 10, bottom: top + 10, x: left, y: top, toJSON() {} }) as DOMRect;
  it('se poser : descend de dy en se réduisant ; sans dy, sortie ordinaire (s\'étendre à l\'envers)', () => {
    expect(settleOrClose(120)).toMatchObject({ opacity: 0, scale: 0.3, y: 120 });
    expect(settleOrClose(undefined)).toBe(expand.exit);
  });
  it('voler : part du rectangle d\'origine, annule le vol précédent ; rien sous mouvement réduit', () => {
    const cancel = vi.fn();
    const el = { getBoundingClientRect: () => rect(100, 40), getAnimations: () => [{ cancel }], animate: vi.fn() } as unknown as HTMLElement;
    flyFrom(el, rect(30, 200));
    expect(cancel).toHaveBeenCalled();
    expect(vi.mocked(el.animate).mock.calls[0][0]).toEqual([{ transform: 'translate(-70px, 160px)', opacity: 0.6 }, { transform: 'none', opacity: 1 }]);
    mql.matches = true;
    flyFrom(el, rect(30, 200));
    expect(el.animate).toHaveBeenCalledTimes(1);
    mql.matches = false;
  });
});
```

- [ ] **Step 3 : vérifier l'échec** — `npx vitest run src/lib/motion.test.tsx; echo exit=$?` → ≠ 0 (`Failed to resolve import "./motion"`).

- [ ] **Step 4 : implémentation** — créer `app/src/lib/motion.ts` :

```ts
// ============================================================================
// Mouvement de Doctopus (F4b P9) — SEUL point d'import de `motion`.
// Quatre gestes partagés : apparaître, s'étendre, glisser, se poser (+ voler :
// FLIP natif du mot choisi, sans coût de bundle). Ressort court sans rebond
// (le texte ne rebondit jamais). Interruptibles par construction : motion
// repart de la valeur COURANTE — fermer pendant l'ouverture repart en sens
// inverse (AnimatePresence).
// `MotionRoot` (monté une fois dans Shell) : LazyMotion strict + `domMin`
// (animate + exit, sans gestes ni layout : budget AC-9 mesuré — `domMax`
// coûte +13 Kio de plus) ; MotionConfig reducedMotion="user" et, sous
// prefers-reduced-motion, skipAnimations → états instantanés (pas seulement
// les transforms). Tests unitaires : composants rendus SANS MotionRoot →
// aucune fonction d'animation chargée, AnimatePresence retire tout de suite.
// ============================================================================
import { createElement, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, domMin, useReducedMotion, type Transition } from 'motion/react';

export { AnimatePresence } from 'motion/react';
export * as m from 'motion/react-m';

/** Ressort court, sans rebond. */
export const spring: Transition = { type: 'spring', visualDuration: 0.26, bounce: 0 };

/** Apparaître : fondu + 4 px. */
export const appear = {
  initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 }, transition: spring,
} as const;

/** S'étendre : la surface grandit depuis son ancre (donner `style={{ transformOrigin }}`). */
export const expand = {
  initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.85 }, transition: spring,
} as const;

/** Glisser : entre et sort par un bord. */
export function slide(edge: 'left' | 'right' | 'bottom') {
  const off = edge === 'bottom' ? { y: 24 } : { x: edge === 'left' ? -24 : 24 };
  return { initial: { opacity: 0, ...off }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, ...off }, transition: spring } as const;
}

/** Se poser : la carte créée descend de `dy` px en se réduisant, jusqu'à la
 *  pilule de confirmation (bas de l'écran). `dy` absent → sortie ordinaire. */
export const settleOrClose = (dy: number | undefined) =>
  dy === undefined ? expand.exit : { opacity: 0, scale: 0.3, y: dy, transition: spring };

/** Le mouvement est-il permis ? Non sous prefers-reduced-motion, ni sans matchMedia (tests). */
const mayMove = () => typeof window !== 'undefined' && !!window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Voler (FLIP natif, WAAPI) : `el` part de `from` et rejoint sa place. Sans
 *  mouvement réduit seulement ; un nouveau vol annule le précédent. */
export function flyFrom(el: HTMLElement | null, from: DOMRect | null) {
  if (!el || !from || typeof el.animate !== 'function' || !mayMove()) return;
  const to = el.getBoundingClientRect();
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, opacity: 0.6 }, { transform: 'none', opacity: 1 }],
    { duration: 260, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  );
}

export function MotionRoot({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return createElement(LazyMotion, { features: domMin, strict: true },
    createElement(MotionConfig, { reducedMotion: 'user', skipAnimations: reduce }, children));
}
```

Monter `MotionRoot` dans `Shell` :

```diff
--- a/app/src/components/Shell.tsx
+++ b/app/src/components/Shell.tsx
@@ -9,6 +9,7 @@ import { Doctopus } from './Doctopus';
 import { ResumeSessionBar } from './ResumeSessionBar';
 import { SelectionExplainer } from './SelectionExplainer';
 import { CardToast } from './CardToast';
+import { MotionRoot } from '@/lib/motion';
 
 // Barre latérale déportée dans ./Sidebar (modes déployé / dock immersif).
 // La palette ⌘K double chaque destination au clavier (NAV partagé, ./nav).
@@ -42,6 +43,8 @@ export function Shell() {
   }, [pathname, setAtPageBottom]);
 
   return (
+    // Mouvement (F4b P9) : un seul MotionRoot pour l'app — réglages et fonctions chargés une fois.
+    <MotionRoot>
     <div className="flex h-full">
       <Sidebar />
 
@@ -70,6 +73,7 @@ export function Shell() {
       {/* Barre « reprendre » d'une simulation en pause */}
       <ResumeSessionBar />
     </div>
+    </MotionRoot>
   );
 }
```

- [ ] **Step 5 : vérifier** — `npx vitest run src/lib/motion.test.tsx src/components/Shell.test.tsx; echo exit=$?` → 0 ; gate d'import (Global Constraints) → aucune ligne ; gates. Mesurer le bundle (commande de la Task G3) et noter la valeur : attendu ≈ +27 Kio gzip.

- [ ] **Step 6 : commit**
```bash
git add package.json
git add package-lock.json
git add src/lib/motion.ts
git add src/lib/motion.test.tsx
git add src/components/Shell.tsx
git commit -m "feat(motion): lib/motion — seul import de motion, quatre gestes, MotionRoot (F4b P9)"
```

---

### Task A2 : Verre `glass-thin` / `glass-full`, jeton `star`, miroitement (front-implementer, Sonnet)

**Files:**
- Modify: `app/src/styles/index.css` (bloc LIQUID GLASS, avant « Accessibilité & repli »)
- Modify: `app/tailwind.config.js`
- Create: `app/src/styles/tokens.test.ts`

**Interfaces:**
- Produces : classes `glass-thin`, `glass-full` (à combiner avec `rounded-*`, jamais `shadow-*`) ; couleurs Tailwind `star-300/400/500/600/700` (`text-star-600 dark:text-star-400` = trait de l'étoile pleine) ; `animate-shimmer` (miroitement).

- [ ] **Step 1 : test qui échoue** — créer `app/src/styles/tokens.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'index.css'), 'utf8');
const tailwind = readFileSync(join(here, '../../tailwind.config.js'), 'utf8');

// Invariants de matière et d'étoile (F4b AC-1, AC-2), vérifiés sur les sources.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const star = Object.fromEntries([...tailwind.match(/star: \{([^}]*)\}/)![1].matchAll(/(\d+): '(#[0-9a-f]{6})'/g)].map((mt) => [mt[1], mt[2]]));
const rules = (selector: string) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((mt) => mt[1].split(',').some((s) => s.trim() === selector)).map((mt) => mt[2]);

describe('verre flottant (AC-1)', () => {
  it('glass-thin et glass-full existent, sans ombre portée (inset seulement)', () => {
    for (const cls of ['.glass-thin', '.glass-full', ':is(.dark) .glass-thin', ':is(.dark) .glass-full']) {
      const shadows = rules(cls).flatMap((body) => [...body.matchAll(/box-shadow:([^;]*);/g)].map((mt) => mt[1]));
      for (const s of shadows) expect(s.trim().startsWith('inset')).toBe(true);
    }
    expect(rules('.glass-thin').join('')).toMatch(/backdrop-filter: blur\(12px\)/);
    expect(rules('.glass-full').join('')).toMatch(/backdrop-filter: blur\(24px\)/);
  });
  it('repli opaque sous prefers-reduced-transparency et sans backdrop-filter', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-transparency: reduce) {\n    .glass,'));
    expect(reduced).toMatch(/^@media \(prefers-reduced-transparency: reduce\) \{\n\s+\.glass, \.glass-thin, \.glass-full \{ background: rgb\(244 245 242 \/ 0\.98\); backdrop-filter: none;/);
    expect(css).toMatch(/@supports not[^{]+\{\n\s+\.glass, \.glass-thin, \.glass-full \{ background: rgb\(244 245 242 \/ 0\.97\); \}/);
  });
});

describe('étoile (AC-2)', () => {
  it('pleine : trait star-600 ≥ 3:1 sur blanc et papier, star-400 ≥ 3:1 sur encre', () => {
    for (const bg of ['#ffffff', '#f4f5f2']) expect(contrast(star['600'], bg)).toBeGreaterThanOrEqual(3);
    for (const bg of ['#0c1a17', '#12211e', '#1b2f2b']) expect(contrast(star['400'], bg)).toBeGreaterThanOrEqual(3);
  });
  it('vide (cristal) : trait slate-500 / slate-300 ≥ 3:1', () => {
    for (const bg of ['#ffffff', '#f4f5f2']) expect(contrast('#64748b', bg)).toBeGreaterThanOrEqual(3);
    for (const bg of ['#0c1a17', '#12211e']) expect(contrast('#cbd5e1', bg)).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/styles/tokens.test.ts; echo exit=$?` → ≠ 0 (`expected '' to match /backdrop-filter: blur\(12px\)/`, puis lecture de `star` sur `null`).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/styles/index.css
+++ b/app/src/styles/index.css
@@ -271,14 +271,40 @@ h1, h2, h3 {
   .glass-tint { background: rgb(21 131 117 / 0.16); }        /* brand-500 */
   :is(.dark) .glass-tint { background: rgb(21 131 117 / 0.20); }
 
-  /* — Accessibilité & repli — */
+  /* Verre FLOTTANT (F4b P1/P2) — la même matière que .glass, en deux densités :
+     `glass-thin` (pilule, onglets) et `glass-full` (carte, tiroir). Liseré de
+     lumière en haut (inset), AUCUNE ombre portée. Réservé à ce qui flotte
+     au-dessus de la lecture ; les surfaces de lecture restent opaques. */
+  .glass-thin, .glass-full {
+    position: relative;
+    border: 1px solid rgb(255 255 255 / 0.55);
+    box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.70);
+  }
+  .glass-thin {
+    background: rgb(255 255 255 / 0.52);
+    backdrop-filter: blur(12px) saturate(180%);
+    -webkit-backdrop-filter: blur(12px) saturate(180%);
+  }
+  .glass-full {
+    background: rgb(255 255 255 / 0.68);
+    backdrop-filter: blur(24px) saturate(180%);
+    -webkit-backdrop-filter: blur(24px) saturate(180%);
+  }
+  :is(.dark) .glass-thin, :is(.dark) .glass-full {
+    border-color: rgb(255 255 255 / 0.12);
+    box-shadow: inset 0 1px 0 0 rgb(255 255 255 / 0.10);
+  }
+  :is(.dark) .glass-thin { background: rgb(18 33 30 / 0.52); }
+  :is(.dark) .glass-full { background: rgb(18 33 30 / 0.70); }
+
+  /* — Accessibilité & repli (toutes les densités) — */
   @media (prefers-reduced-transparency: reduce) {
-    .glass { background: rgb(244 245 242 / 0.98); backdrop-filter: none; -webkit-backdrop-filter: none; }
-    :is(.dark) .glass { background: rgb(18 33 30 / 0.98); }
+    .glass, .glass-thin, .glass-full { background: rgb(244 245 242 / 0.98); backdrop-filter: none; -webkit-backdrop-filter: none; }
+    :is(.dark) .glass, :is(.dark) .glass-thin, :is(.dark) .glass-full { background: rgb(18 33 30 / 0.98); }
   }
   @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
-    .glass { background: rgb(244 245 242 / 0.97); }
-    :is(.dark) .glass { background: rgb(18 33 30 / 0.97); }
+    .glass, .glass-thin, .glass-full { background: rgb(244 245 242 / 0.97); }
+    :is(.dark) .glass, :is(.dark) .glass-thin, :is(.dark) .glass-full { background: rgb(18 33 30 / 0.97); }
   }
 }
```

```diff
--- a/app/tailwind.config.js
+++ b/app/tailwind.config.js
@@ -20,6 +20,9 @@ export default {
           400: '#e8613c', 500: '#d84a24', 600: '#bf3a19', 700: '#9e2d17',
           800: '#80271a', 900: '#6a2418', 950: '#3a0f0a',
         },
+        // star = ambre glassy doux (F4b P3) — l'étoile PLEINE et rien d'autre ;
+        // jamais du texte courant. Trait : 600 sur clair, 400 sur sombre (≥ 3:1).
+        star: { 300: '#f7d48a', 400: '#f1b84a', 500: '#dd9a26', 600: '#a86f0c', 700: '#8a5a09' },
         // Neutres d'identité : papier clinique (clair) & vert-encre (sombre).
         paper: '#f4f5f2',
         ink: {
@@ -59,6 +62,8 @@ export default {
         'split-l': { '0%': { opacity: '0', transform: 'translateX(110%) scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
         'split-c': { '0%': { opacity: '0', transform: 'scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
         'split-r': { '0%': { opacity: '0', transform: 'translateX(-110%) scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
+        // Miroitement (F4b P8) : la Bedeutung se propose — reflet qui passe, figé sous reduced-motion.
+        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
       },
       animation: {
         'fade-in': 'fade-in 0.2s ease-out',
@@ -70,6 +75,7 @@ export default {
         'split-l': 'split-l 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
         'split-c': 'split-c 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
         'split-r': 'split-r 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
+        shimmer: 'shimmer 1.4s linear infinite',
       },
     },
   },
```

- [ ] **Step 4 : vérifier** — test → 0 ; gates ; après build : `grep -c "glass-thin" dist/assets/index-*.css` ≥ 1 et `grep -c "prefers-reduced-transparency" dist/assets/index-*.css` ≥ 1.

- [ ] **Step 5 : commit**
```bash
git add src/styles/index.css
git add tailwind.config.js
git add src/styles/tokens.test.ts
git commit -m "feat(charte): verre flottant glass-thin/glass-full sans ombre portée, jeton star, miroitement (F4b P1/P3)"
```

---

# Tranche B — Étoile et confirmation (P3, P5)

### Task B1 : Étoile cristal / ambre (`StarGlyph`) (front-implementer, Sonnet)

**Files:**
- Modify: `app/src/components/StarButton.tsx`, `app/src/components/StarButton.test.tsx`
- Modify: `app/src/components/SelectionExplainer.tsx` (retrait du prop `tone`, une ligne)

**Interfaces:**
- Consumes : A2 (`star`).
- Produces : `StarGlyph({ filled: boolean })` (SVG `aria-hidden`, `data-star="crystal" | "amber"`, trait `currentColor`) — réutilisé par `CardToast` (B2), `SelectionExplainer` (C1), `DeckRail` (E3). `StarButton({ term, filled, caseId?, buttonRef? })` — **le prop `tone` disparaît** (la pilule n'est plus pétrole pleine).

- [ ] **Step 1 : test qui échoue** — ajouter à `app/src/components/StarButton.test.tsx`, avant le test « decks en chargement » :

```diff
--- a/app/src/components/StarButton.test.tsx
+++ b/app/src/components/StarButton.test.tsx
@@ -102,6 +102,18 @@ describe('StarButton + CardToast (F4a D6/D7, AC-6)', () => {
     fireEvent.keyDown(window, { key: 'Escape' });
     await waitFor(() => expect(screen.queryByText('Favoris', { selector: 'strong' })).toBeNull());
   });
+  it('matière (F4b P3, AC-2) : vide = cristal, pleine = ambre `star` ; jamais de corail', async () => {
+    const { container } = render(<Harness />);
+    await clickEmptyStar();
+    const full = await screen.findByRole('button', { name: 'Decks de Aszites' });
+    expect(full.querySelector('[data-star]')!.getAttribute('data-star')).toBe('amber');
+    expect(full.className).toContain('text-star-600');
+    expect(full.className).toContain('dark:text-star-400');
+    render(<StarButton term={{ ...(term as object), id: 'fb-x', term: 'X' } as never} filled={false} />);
+    const empty = screen.getByRole('button', { name: 'Ajouter aux favoris : X' });
+    expect(empty.querySelector('[data-star]')!.getAttribute('data-star')).toBe('crystal');
+    expect(container.ownerDocument.body.innerHTML).not.toMatch(/signal-/);
+  });
   it('decks en chargement : étoile inerte, pas de ★ vide cliquable (revue C4)', () => {
     render(<StarButton term={term} filled={undefined} />);
     const b = screen.getByRole('button', { hidden: true });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/StarButton.test.tsx; echo exit=$?` → ≠ 0 (`Cannot read properties of null (reading 'getAttribute')` sur `[data-star]`).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/components/StarButton.tsx
+++ b/app/src/components/StarButton.tsx
@@ -2,16 +2,40 @@
 // L'étoile (F4a D6) — une seule notion : les decks. ★ vide → le terme est rangé
 // dans Favoris (deck par défaut) et la confirmation montre la carte (D7).
 // ★ pleine = le terme est dans au moins un deck → toucher liste ses decks.
+// Matière (F4b P3) : vide = cristal (incolore, liseré clair) ; pleine = ambre
+// glassy doux (jeton `star`). Le corail n'habille plus l'étoile.
 // ============================================================================
-import { useEffect, useRef, useState } from 'react';
+import { useEffect, useId, useRef, useState } from 'react';
 import { FAVORITES_DECK_ID } from '@/db/types';
 import type { AnyTerm } from '@/lib/collections/allTerms';
 import { addTermToDeck } from '@/lib/collections';
 import { useCardToast } from '@/store/cardToast';
 import { DeckChecklist } from './DeckChecklist';
 
-export function StarButton({ term, filled, caseId, tone = 'plain', buttonRef }: {
-  term: AnyTerm; filled: boolean | undefined; caseId?: string; tone?: 'plain' | 'onBrand'; buttonRef?: (el: HTMLButtonElement | null) => void;
+const STAR = 'M12 3.6l2.55 5.2 5.75.83-4.16 4.05.98 5.72L12 16.7l-5.12 2.7.98-5.72L3.7 9.63l5.75-.83z';
+
+/** L'étoile dessinée : cristal (vide) ou ambre (pleine), trait = currentColor. */
+export function StarGlyph({ filled }: { filled: boolean }) {
+  const id = `star-${useId().replace(/:/g, '')}`;
+  return (
+    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden data-star={filled ? 'amber' : 'crystal'}>
+      {filled && (
+        <defs>
+          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
+            <stop offset="0" className="[stop-color:theme(colors.star.300)]" />
+            <stop offset="1" className="[stop-color:theme(colors.star.500)]" />
+          </linearGradient>
+        </defs>
+      )}
+      <path d={STAR} fill={filled ? `url(#${id})` : 'rgb(255 255 255 / 0.28)'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
+      {/* liseré de lumière : un reflet sur l'arête haute gauche */}
+      <path d="M8.9 9.2 11.3 5.2" fill="none" stroke="white" strokeOpacity={filled ? 0.75 : 0.9} strokeWidth="1.1" strokeLinecap="round" />
+    </svg>
+  );
+}
+
+export function StarButton({ term, filled, caseId, buttonRef }: {
+  term: AnyTerm; filled: boolean | undefined; caseId?: string; buttonRef?: (el: HTMLButtonElement | null) => void;
 }) {
   const [anchor, setAnchor] = useState<DOMRect | null>(null);
   const [error, setError] = useState<string | null>(null);
@@ -31,15 +55,13 @@ export function StarButton({ term, filled, caseId, tone = 'plain', buttonRef }:
     } catch { setError('Impossible d\'enregistrer : réessaie.'); }
     finally { busy.current = false; }
   };
-  const color = tone === 'onBrand'
-    ? `hover:bg-brand-700 ${filled ? 'text-signal-300' : 'text-white'}`
-    : filled ? 'text-signal-600 dark:text-signal-400' : 'text-slate-400 hover:text-signal-500 dark:text-slate-500';
+  const color = filled ? 'text-star-600 dark:text-star-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100';
   return (
     <>
       <button ref={buttonRef} type="button" onClick={(e) => { void onClick(e); }} aria-pressed={filled ?? false} aria-busy={filled === undefined || undefined} disabled={filled === undefined}
         aria-label={filled ? `Decks de ${term.term}` : `Ajouter aux favoris : ${term.term}`}
         aria-haspopup={filled ? 'menu' : undefined} aria-expanded={filled ? !!anchor : undefined}
-        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${color} ${filled === undefined ? 'invisible' : ''}`}>{filled ? '★' : '☆'}</button>
+        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 ${color} ${filled === undefined ? 'invisible' : ''}`}><StarGlyph filled={!!filled} /></button>
       {anchor && filled && <DeckChecklist termId={term.id} caseId={caseId} anchor={anchor} onClose={() => setAnchor(null)} />}
       {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
     </>
```

```diff
--- a/app/src/components/SelectionExplainer.tsx
+++ b/app/src/components/SelectionExplainer.tsx
@@ -148,7 +148,7 @@ export function SelectionExplainer() {
   // 'pill' : pastille pétrole pleine (fond bg-brand-600) — ☆ blanc, survol foncé.
   // 'bubble' : carte claire — tons ardoise/signal lisibles sur les deux fonds.
   const starButton = (variant: 'pill' | 'bubble') => known
-    ? <StarButton term={known} filled={inDecks?.has(known.id)} caseId={caseId} tone={variant === 'pill' ? 'onBrand' : 'plain'} />
+    ? <StarButton term={known} filled={inDecks?.has(known.id)} caseId={caseId} />
     : (
       <button type="button" onClick={openNewCard} disabled={!canCreate} aria-label={`Nouvelle carte : ${clean}`}
         className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg disabled:opacity-40 ${variant === 'pill' ? 'text-white hover:bg-brand-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>☆</button>
```

Note : l'état vide survolé passe à `dark:hover:text-slate-100` (pas `text-white`) — le test existant « ★ dans la bulle réponse … couleur blanche » le vérifie jusqu'à C1.

- [ ] **Step 4 : vérifier** — `npx vitest run src/components; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/StarButton.tsx
git add src/components/StarButton.test.tsx
git add src/components/SelectionExplainer.tsx
git commit -m "feat(fachbegriffe): étoile cristal vide / ambre pleine, le corail quitte l'étoile (F4b P3)"
```

---

### Task B2 : Confirmation = pilule verre une ligne (front-implementer, Sonnet)

**Files:**
- Modify: `app/src/components/CardToast.tsx` (réécrit), `app/src/components/CardToast.test.tsx`, `app/src/components/StarButton.test.tsx`

**Interfaces:**
- Consumes : A1 (`AnimatePresence`, `appear`, `expand`, `m`), A2, B1 (`StarGlyph`), store `useCardToast` inchangé.
- Produces : pilule `role="status"` (ou `alert` pour une erreur) : « ★ Rangée dans **<deck>** · Révéler · Changer ». Bouton « Rangée dans … » (`aria-expanded`) = ouvre la miniature ; « Révéler »/« Recto » ; « Changer » (`aria-label="Changer de deck"`, masqué s'il n'y a que Favoris) ; « Carte supprimée · Annuler ». Le store reste `{ kind: 'saved' | 'deleted' | 'error' }` (E1 ajoute `deck-deleted`).

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/components/CardToast.test.tsx
+++ b/app/src/components/CardToast.test.tsx
@@ -37,6 +37,27 @@ describe('CardToast — suppression (m2)', () => {
     expect(await screen.findByText('Trop tard : la carte est supprimée.')).toBeTruthy();
   });
 
+  it('pilule verre une ligne : « Carte supprimée · Annuler », sans ombre portée (F4b P5, AC-1)', async () => {
+    const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
+    useCardToast.getState().show({ kind: 'deleted', term: toView((await db.personal_terms.get(id))!) });
+    render(<CardToast />);
+    const status = screen.getByRole('status');
+    expect(status.textContent).toBe('Carte supprimée·Annuler');
+    expect(status.className).toContain('glass-thin');
+    expect(document.body.innerHTML).not.toMatch(/shadow-/);
+  });
+  it('« Rangée » : une ligne ★ · Révéler · Changer ; aucun miniature tant qu\'on ne touche pas', async () => {
+    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Leber', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
+    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
+    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
+    useCardToast.getState().show({ kind: 'saved', term: toView((await db.personal_terms.get(id))!), deckId: 'deck-favorites' });
+    render(<CardToast />);
+    expect(await screen.findByRole('button', { name: 'Changer de deck' })).toBeTruthy();
+    expect(screen.getByRole('button', { name: 'Changer de deck' }).textContent).toBe('Changer');
+    expect(screen.getByRole('button', { name: /Rangée dans Favoris/ }).getAttribute('aria-expanded')).toBe('false');
+    expect(document.querySelector('[data-card-flip]')).toBeNull();
+    expect(document.body.innerHTML).not.toMatch(/shadow-/);
+  });
   it('expiration (flushDeletions) masque la confirmation de suppression de la carte concernée', async () => {
     const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
     const term = toView((await db.personal_terms.get(id))!);
```

```diff
--- a/app/src/components/StarButton.test.tsx
+++ b/app/src/components/StarButton.test.tsx
@@ -39,11 +39,13 @@ async function clickEmptyStar() {
 describe('StarButton + CardToast (F4a D6/D7, AC-6)', () => {
   beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); await db.deck_terms.clear(); useCardToast.setState({ toast: null }); });
 
-  it('★ vide → Favoris (+caseId), confirmation avec miniature, « Voir la carte » retourne', async () => {
+  it('★ vide → Favoris (+caseId) ; pilule « Rangée dans Favoris » : toucher ouvre la miniature, « Révéler » la retourne (F4b P5)', async () => {
     render(<Harness caseId="case-leberzirrhose" />);
     await clickEmptyStar();
     expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
     expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')!.payload).toEqual({ caseId: 'case-leberzirrhose' });
+    expect(document.querySelector('[data-card-flip]')).toBeNull();   // une ligne : la carte ne s'ouvre qu'au toucher
+    fireEvent.click(screen.getByRole('button', { name: /Rangée dans/ }));
     expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('recto');
     fireEvent.click(screen.getByRole('button', { name: 'Révéler' }));
     expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('verso');
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/CardToast.test.tsx src/components/StarButton.test.tsx; echo exit=$?` → ≠ 0 (`Carte « Orthopnoe » supprimée` ≠ `Carte supprimée·Annuler` ; miniature présente d'emblée).

- [ ] **Step 3 : implémentation** — remplacer `app/src/components/CardToast.tsx` par :

```tsx
// ============================================================================
// Confirmation d'une carte (F4a D7/D10 → F4b P5) : UNE pilule verre en bas de
// l'écran, une ligne, discrète pendant un cas.
// « Rangée » : ★ Rangée dans <deck> · Révéler · Changer. Toucher la pilule
// ouvre la miniature (la carte) ; Révéler la retourne ; Changer DÉPLACE (D6 ;
// masqué sans autre deck). « Supprimée » : Annuler pendant le délai — rien
// n'a encore été émis. Erreur : même pilule, rôle alert.
// Se ferme seule (8 s ; le délai de suppression pour « Supprimée »), sauf une
// fois touchée. Échap la ferme (une suppression différée suit son cours).
// ============================================================================
import { useEffect, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks } from '@/hooks/useData';
import { moveTermToDeck } from '@/lib/collections';
import { cancelDeletion, DELETE_DELAY_MS } from '@/lib/collections/pendingDeletion';
import { AnimatePresence, appear, expand, m } from '@/lib/motion';
import { useCardToast } from '@/store/cardToast';
import { CardFlip } from './CardFlip';
import { Portal } from './Portal';
import { StarGlyph } from './StarButton';

const SAVED_MS = 8000;
const pill = 'glass-thin pointer-events-auto flex min-h-11 max-w-full items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm';
const link = 'min-h-11 shrink-0 rounded-full px-2.5 font-medium text-brand-700 hover:bg-white/50 dark:text-brand-300 dark:hover:bg-white/10';
const Dot = () => <span aria-hidden className="text-slate-400">·</span>;

export function CardToast() {
  const toast = useCardToast((s) => s.toast);
  const show = useCardToast((s) => s.show);
  const hide = useCardToast((s) => s.hide);
  const decks = useDecks();
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [touched, setTouched] = useState(false);
  const termId = toast && 'term' in toast ? toast.term.id : null;
  useEffect(() => { setOpen(false); setFlipped(false); setChoosing(false); setTouched(false); }, [termId, toast?.kind]);
  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast, hide]);
  useEffect(() => {
    if (!toast || (touched && toast.kind === 'saved')) return;
    const t = setTimeout(hide, toast.kind === 'deleted' ? DELETE_DELAY_MS : SAVED_MS);
    return () => clearTimeout(t);
  }, [toast, touched, hide]);

  const targets = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  let body: React.ReactNode = null;
  if (toast?.kind === 'error') {
    body = (
      <m.div key="error" role="alert" {...appear} className={pill}>
        <span className="min-w-0 flex-1 truncate">{toast.message}</span>
        <button type="button" aria-label="Fermer" onClick={hide} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/50 dark:hover:bg-white/10">✕</button>
      </m.div>
    );
  } else if (toast?.kind === 'deleted') {
    body = (
      <m.div key={`deleted-${toast.term.id}`} role="status" data-keep-open {...appear} className={pill}>
        <span className="min-w-0 truncate">Carte supprimée</span><Dot />
        <button type="button" onClick={() => { if (cancelDeletion(toast.term.id)) hide(); else show({ kind: 'error', message: 'Trop tard : la carte est supprimée.' }); }} className={link}>Annuler</button>
      </m.div>
    );
  } else if (toast?.kind === 'saved') {
    const deckName = targets.find((d) => d.id === toast.deckId)?.name ?? 'Favoris';
    body = (
      <m.div key={`saved-${toast.term.id}`} role="status" data-keep-open {...appear}
        onPointerDown={() => setTouched(true)} onFocus={() => setTouched(true)}
        className="flex max-w-full flex-col items-center gap-2">
        <AnimatePresence>
          {open && (
            <m.div key="mini" {...expand} style={{ transformOrigin: 'bottom center' }} className="glass-full pointer-events-auto w-64 rounded-2xl p-2">
              <CardFlip card={toast.term} direction="term2simple" revealed={flipped} onFlip={() => setFlipped(true)} size="mini" />
            </m.div>
          )}
          {choosing && (
            <m.div key="decks" {...expand} style={{ transformOrigin: 'bottom center' }} role="group" aria-label="Déplacer vers" className="glass-full pointer-events-auto w-56 space-y-1 rounded-2xl p-1">
              {targets.filter((d) => d.id !== toast.deckId).map((d) => (
                <button key={d.id} type="button" onClick={async () => {
                  await moveTermToDeck(toast.term.id, toast.deckId, d.id, toast.caseId ? { caseId: toast.caseId } : {});
                  show({ ...toast, deckId: d.id }); setChoosing(false);
                }} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left hover:bg-white/50 dark:hover:bg-white/10">{d.name}</button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
        <div className={pill}>
          <button type="button" aria-expanded={open} onClick={() => { setOpen((o) => !o); setChoosing(false); }}
            className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full pr-1 text-left">
            <span className="shrink-0 text-star-600 dark:text-star-400"><StarGlyph filled /></span>
            <span className="min-w-0 truncate">Rangée dans <strong className="font-semibold">{deckName}</strong></span>
          </button>
          <Dot />
          <button type="button" onClick={() => { setChoosing(false); if (open) setFlipped((f) => !f); else { setOpen(true); setFlipped(true); } }} className={link}>{open && flipped ? 'Recto' : 'Révéler'}</button>
          {targets.length > 1 && (<>
            <Dot />
            <button type="button" aria-label="Changer de deck" aria-expanded={choosing} onClick={() => { setChoosing((c) => !c); setOpen(false); }} className={link}>Changer</button>
          </>)}
        </div>
      </m.div>
    );
  }
  return (
    <Portal>
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] mx-auto flex max-w-md justify-center">
        <AnimatePresence>{body}</AnimatePresence>
      </div>
    </Portal>
  );
}
```

- [ ] **Step 4 : vérifier** — `npx vitest run src/components; echo exit=$?` → 0 (les tests `SelectionExplainer` « Révéler » / pas de « Changer de deck » restent verts) ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/CardToast.tsx
git add src/components/CardToast.test.tsx
git add src/components/StarButton.test.tsx
git commit -m "feat(fachbegriffe): confirmation en pilule verre — Rangée dans Favoris · Révéler · Changer (F4b P5)"
```

---

# Tranche C — Bulle de sélection (P4)

### Task C1 : Pilule verre à deux icônes qui s'étend en carte (front-implementer, Sonnet ; relecture ux-motion-designer)

**Files:**
- Modify: `app/src/components/SelectionExplainer.tsx`, `app/src/components/SelectionExplainer.test.tsx`

**Interfaces:**
- Consumes : A1 (`AnimatePresence`, `appear`, `expand`, `m`, `spring`), A2, B1 (`StarButton`, `StarGlyph`).
- Produces : calque `.fixed.z-[80]` (position `left/top`, `transformOrigin: 0 0`) → enfant `[data-anchor-box]` (centrage `translate`) → `[data-pill]` (`glass-thin`, 2 boutons 44 px : « Expliquer », ★) **ou** la carte `glass-full w-64`. Libellés au survol : `span` `aria-hidden`, visibles seulement sous `@media (hover:hover)`.

- [ ] **Step 1 : tests qui échouent** — remplacer le test « ★ dans la bulle réponse (fond clair)… » et adapter la lecture du `translate` :

```diff
--- a/app/src/components/SelectionExplainer.test.tsx
+++ b/app/src/components/SelectionExplainer.test.tsx
@@ -137,14 +137,22 @@ describe('SelectionExplainer', () => {
     fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
     expect(await screen.findByText('die Dyspnoe = Atemnot')).toBeTruthy();
   });
-  it('★ dans la bulle réponse (fond clair) n\'utilise pas la couleur blanche de la pastille (re-review)', async () => {
+  it('pilule verre à 2 icônes de 44 px (≤ 120 px), libellés au survol ; « Expliquer » l\'étend en carte verre (F4b P4, AC-3)', async () => {
     render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
-    selectText(screen.getByTestId('t'));
-    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
-    fireEvent.click(await screen.findByRole('button', { name: /Expliquer/ }));
-    const starInBubble = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
-    expect(starInBubble.className).not.toMatch(/text-white/);
-    expect(starInBubble.className).not.toMatch(/hover:bg-brand-700/);
+    selectText(screen.getByTestId('t')); pill();
+    await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
+    const p = document.querySelector('[data-pill]') as HTMLElement;
+    expect(p.className).toContain('glass-thin');
+    expect(p.className).toMatch(/\bp-0\.5\b/); expect(p.className).toMatch(/\bgap-0\.5\b/);   // 2 × 44 + 2 + 4 = 94 px
+    const buttons = [...p.querySelectorAll('button')];
+    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Expliquer', 'Ajouter aux favoris : Aszites']);
+    for (const b of buttons) { expect(b.className).toMatch(/\bh-11\b/); expect(b.className).toMatch(/\bw-11\b/); }
+    expect(p.textContent).toBe('ExpliquerFavoris');   // libellés (aria-hidden), visibles au survol seulement
+    fireEvent.click(screen.getByRole('button', { name: 'Expliquer' }));
+    await screen.findByText(/Bauchwasser/);
+    expect(document.querySelector('[data-pill]')).toBeNull();
+    expect(document.querySelector('.glass-full')).toBeTruthy();
+    expect(document.body.innerHTML).not.toMatch(/shadow-/);
   });
   it('sélection près du haut du viewport → pastille bascule sous la sélection, jamais hors écran (B1)', async () => {
     render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
@@ -152,7 +160,7 @@ describe('SelectionExplainer', () => {
     act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
     await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
     const box = document.querySelector('.fixed.z-\\[80\\]') as HTMLElement;
-    expect(box.style.transform).toBe('translate(-50%, 0)');
+    expect((box.querySelector('[data-anchor-box]') as HTMLElement).style.transform).toBe('translate(-50%, 0)');
     const top = parseFloat(box.style.top);
     expect(top).toBeGreaterThanOrEqual(36); // sous la sélection (bottom), jamais négatif à l'écran
   });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/SelectionExplainer.test.tsx; echo exit=$?` → ≠ 0 (`[data-pill]` introuvable ; `[data-anchor-box]` introuvable).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/components/SelectionExplainer.tsx
+++ b/app/src/components/SelectionExplainer.tsx
@@ -11,13 +11,17 @@ import { toView } from '@/lib/collections/allTerms';
 import { sentenceOfRange } from '@/lib/sentence';
 import { TermSheet } from '@/components/TermSheet';
 import { StarButton } from '@/components/StarButton';
+import { StarGlyph } from '@/components/StarButton';
 import { NewCardSheet, selectionWords, CHIP_THRESHOLD } from '@/components/NewCardSheet';
+import { AnimatePresence, appear, expand, m, spring } from '@/lib/motion';
 import type { Fachbegriff } from '@/db/types';
 
 // ============================================================================
 // Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
-// phrase (FB2-M2), une pastille apparaît près de la sélection. Au clic sur
-// « Expliquer », une bulle donne une glose brève. L'étoile (F4a D4–D6) : un
+// phrase (FB2-M2), une petite pilule verre à deux icônes (Expliquer, ★ ;
+// libellés au survol sur ordinateur) apparaît près de la sélection (F4b P4).
+// « Expliquer » l'ÉTEND en carte verre (glose brève) ; elle se rétracte à la
+// fermeture — gestes interruptibles (lib/motion). L'étoile (F4a D4–D6) : un
 // terme du glossaire (ou une carte déjà créée) se range comme partout
 // (StarButton) ; un mot hors glossaire ouvre la mini-fiche de création
 // (NewCardSheet), qui prend la phrase de la sélection pour contexte.
@@ -28,12 +32,16 @@ import type { Fachbegriff } from '@/db/types';
 // ============================================================================
 
 interface Anchor { text: string; sentence: string; x: number; y: number; bottom: number }
-// ponytail : hauteurs estimées (pastille mesurée ~48px ; bulle réponse, taille
+// ponytail : hauteurs estimées (pilule 48 px ; bulle réponse, taille
 // variable, plafond prudent) plutôt qu'une mesure DOM réelle avant premier
 // rendu — si une bulle très longue déborde encore en haut, mesurer via ref.
 const PILL_H = 48;
 const BUBBLE_H = 260;
 const GUTTER = 16;
+// Libellé au survol (souris seulement) : la pilule reste deux icônes.
+const tip = (label: string) => (
+  <span aria-hidden className="glass-thin pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-700 opacity-0 transition-opacity dark:text-slate-200 [@media(hover:hover)]:group-hover:opacity-100">{label}</span>
+);
 type Bubble = { loading: boolean; text?: string; error?: string; source?: 'glossaire' | 'IA'; fb?: Fachbegriff };
 
 export function SelectionExplainer() {
@@ -135,60 +143,71 @@ export function SelectionExplainer() {
   };
 
   const sheet = newCard && <NewCardSheet key={newCard.selection + newCard.sentence} selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} onClose={() => setNewCard(null)} />;
-  if (!anchor) return sheet || null;
-  // Pas assez de place au-dessus (pastille ou bulle) : bascule sous la sélection
-  // plutôt que de partir hors écran (bug B1). Demi-largeurs approximatives
-  // (pastille compacte, bulle w-64 fixe) pour un clamp horizontal à 16 px du bord.
+  // Pas assez de place au-dessus (pilule ou bulle) : bascule sous la sélection
+  // plutôt que de partir hors écran (bug B1). Demi-largeurs (pilule 94 px,
+  // bulle w-64) pour un clamp horizontal à 16 px du bord.
   const contentH = bubble ? BUBBLE_H : PILL_H;
-  const flipBelow = anchor.y - contentH - 8 < 8;
-  const top = flipBelow ? anchor.bottom + 8 : Math.max(8, anchor.y - 8);
-  const transform = flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
-  const halfWidth = bubble ? 128 : 140;
-  const left = Math.min(Math.max(anchor.x, halfWidth + GUTTER), window.innerWidth - halfWidth - GUTTER);
-  // 'pill' : pastille pétrole pleine (fond bg-brand-600) — ☆ blanc, survol foncé.
-  // 'bubble' : carte claire — tons ardoise/signal lisibles sur les deux fonds.
-  const starButton = (variant: 'pill' | 'bubble') => known
+  const flipBelow = !!anchor && anchor.y - contentH - 8 < 8;
+  const top = !anchor ? 0 : flipBelow ? anchor.bottom + 8 : Math.max(8, anchor.y - 8);
+  const halfWidth = bubble ? 128 : 48;
+  const left = !anchor ? 0 : Math.min(Math.max(anchor.x, halfWidth + GUTTER), window.innerWidth - halfWidth - GUTTER);
+  const star = known
     ? <StarButton term={known} filled={inDecks?.has(known.id)} caseId={caseId} />
     : (
       <button type="button" onClick={openNewCard} disabled={!canCreate} aria-label={`Nouvelle carte : ${clean}`}
-        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg disabled:opacity-40 ${variant === 'pill' ? 'text-white hover:bg-brand-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>☆</button>
+        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/40 hover:text-slate-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"><StarGlyph filled={false} /></button>
     );
+  const starTip = !known ? 'Nouvelle carte' : inDecks?.has(known.id) ? 'Decks' : 'Favoris';
   return (
     <>
     {sheet}
-    <div ref={rootRef} className="fixed z-[80]" style={{ left, top, transform }}>
-      {!bubble ? (
-        <div className="flex items-center gap-1 rounded-full bg-brand-600 p-0.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 motion-safe:animate-fade-in-fast">
-          {starButton('pill')}
-          <button type="button" onClick={() => { void explain(); }} className="flex h-11 items-center gap-1 rounded-full px-3 hover:bg-brand-700">
-            <Icon name="search" className="h-3.5 w-3.5" />Expliquer
-          </button>
-        </div>
-      ) : (
-        <div className="flex w-64 items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] shadow-xl motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
-          {!bubble.loading && !bubble.error && <div className="-m-0.5 -mt-1">{starButton('bubble')}</div>}
-          <div className="min-w-0 flex-1">
-            {bubble.loading ? (
-              <div className="flex items-center gap-2 text-slate-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> Doctopus cherche…</div>
-            ) : bubble.error ? (
-              <div className="text-[12px] text-amber-600 dark:text-amber-400">{bubble.error}</div>
-            ) : (
-              <>
-                <div className="mb-1 flex items-center justify-between">
-                  <span className="text-[10px] font-bold text-slate-400">« {anchor.text} »</span>
-                  <span className="chip py-0 text-[9px] text-slate-400">{bubble.source}</span>
-                </div>
-                {bubble.fb ? <TermSheet term={bubble.fb} compact /> : <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>}
-              </>
-            )}
-            <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
-              className="mt-1.5 w-full rounded-md bg-slate-100 py-1 text-[11px] font-medium text-brand-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-slate-700">
-              Voir plus avec Doctopus →
-            </button>
+    <AnimatePresence>
+      {anchor && (
+        // Position (left/top) sur le calque animé ; le centrage (translate) sur l'enfant :
+        // l'origine du geste (0 0) tombe ainsi pile sur l'ancre de la sélection.
+        <m.div key="selection" ref={rootRef} className="fixed z-[80]" style={{ left, top, transformOrigin: '0 0' }}
+          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
+          <div data-anchor-box style={{ transform: flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}
+            className={`grid justify-items-center ${flipBelow ? 'items-start' : 'items-end'}`}>
+            <AnimatePresence initial={false}>
+              {!bubble ? (
+                <m.div key="pill" {...appear} data-pill className="glass-thin flex items-center gap-0.5 rounded-full p-0.5 [grid-area:1/1]">
+                  <button type="button" aria-label="Expliquer" onClick={() => { void explain(); }}
+                    className="group relative grid h-11 w-11 place-items-center rounded-full text-brand-700 hover:bg-white/40 dark:text-brand-300 dark:hover:bg-white/10">
+                    <Icon name="search" className="h-4 w-4" />{tip('Expliquer')}
+                  </button>
+                  <span className="group relative">{star}{tip(starTip)}</span>
+                </m.div>
+              ) : (
+                <m.div key="card" {...expand} style={{ transformOrigin: flipBelow ? 'top center' : 'bottom center' }}
+                  className="glass-full flex w-64 items-start gap-1.5 rounded-2xl p-2.5 text-[13px] [grid-area:1/1]">
+                  {!bubble.loading && !bubble.error && <div className="-m-0.5 -mt-1">{star}</div>}
+                  <div className="min-w-0 flex-1">
+                    {bubble.loading ? (
+                      <div className="flex items-center gap-2 text-slate-500"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> Doctopus cherche…</div>
+                    ) : bubble.error ? (
+                      <div className="text-[12px] text-amber-700 dark:text-amber-400">{bubble.error}</div>
+                    ) : (
+                      <>
+                        <div className="mb-1 flex items-center justify-between">
+                          <span className="text-[10px] font-bold text-slate-500">« {anchor.text} »</span>
+                          <span className="chip py-0 text-[9px] text-slate-500">{bubble.source}</span>
+                        </div>
+                        {bubble.fb ? <TermSheet term={bubble.fb} compact /> : <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>}
+                      </>
+                    )}
+                    <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
+                      className="mt-1.5 min-h-11 w-full rounded-full text-[12px] font-medium text-brand-700 hover:bg-white/40 dark:text-brand-300 dark:hover:bg-white/10">
+                      Voir plus avec Doctopus →
+                    </button>
+                  </div>
+                </m.div>
+              )}
+            </AnimatePresence>
           </div>
-        </div>
+        </m.div>
       )}
-    </div>
+    </AnimatePresence>
     </>
   );
 }
```

Largeur : 2 × 44 + `p-0.5` (2 × 2) + `gap-0.5` (2) = **94 px ≤ 120** (AC-3, mesuré au navigateur en G2).

- [ ] **Step 4 : vérifier** — `npx vitest run src/components; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/SelectionExplainer.tsx
git add src/components/SelectionExplainer.test.tsx
git commit -m "feat(fachbegriffe): bulle de sélection = pilule verre à deux icônes qui s'étend en carte (F4b P4)"
```

---

# Tranche D — Mini-fiche (P8)

### Task D1 : La carte en train de se faire, qui se pose dans la pilule (front-implementer, Sonnet ; relecture ux-motion-designer)

**Files:**
- Modify: `app/src/components/NewCardSheet.tsx`, `app/src/components/NewCardSheet.test.tsx`
- Modify: `app/src/components/TermSheet.tsx` (`ContextSentence` accepte `className`)
- Modify: `app/src/components/SelectionExplainer.tsx` (ancre + `AnimatePresence custom`), `app/src/components/SelectionExplainer.test.tsx` (« Créer » → « Créer la carte »)

**Interfaces:**
- Consumes : A1 (`expand`, `flyFrom`, `m`, `settleOrClose`, `AnimatePresence`), A2 (`glass-full`, `animate-shimmer`), B2 (la pilule où la carte se pose).
- Produces : `NewCardSheet({ selection, sentence, caseId?, at?: { x: number; bottom: number }, onClose: (settleDy?: number) => void })` — `onClose(dy)` après création (se poser), `onClose()` pour fermer. `ContextSentence({ sentence, word, className = 'text-sm' })`. Libellés : `dialog` « Nouvelle carte », champs `Mot` / `Bedeutung` (sans bordure), boutons « Corriger le mot », « Créer la carte » / « Ranger », groupe « Deck ».

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/components/NewCardSheet.test.tsx
+++ b/app/src/components/NewCardSheet.test.tsx
@@ -41,7 +41,7 @@ describe('NewCardSheet', () => {
     const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
     await waitFor(() => expect((input as HTMLInputElement).value).toBe('ancienne signification'));   // chargé : Créer actif (m-a)
     fireEvent.change(input, { target: { value: 'nouvelle signification' } });
-    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
     await waitFor(async () => expect((await db.personal_terms.get(id))?.explanation).toBe('nouvelle signification'));
   });
 
@@ -50,7 +50,7 @@ describe('NewCardSheet', () => {
     act(() => vi.advanceTimersByTime(0));
     vi.useRealTimers();
     await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
-    const btn = screen.getByRole('button', { name: 'Créer' });
+    const btn = screen.getByRole('button', { name: 'Créer la carte' });
     fireEvent.click(btn); fireEvent.click(btn);
     await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
     expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_created')).toHaveLength(1);
@@ -128,7 +128,7 @@ describe('NewCardSheet', () => {
     const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
     await waitFor(() => expect((input as HTMLInputElement).value).toBe('signification déjà enregistrée'));
     expect(askBedeutung).not.toHaveBeenCalled();
-    expect((screen.getByRole('button', { name: 'Créer' }) as HTMLButtonElement).disabled).toBe(false);
+    expect((screen.getByRole('button', { name: 'Créer la carte' }) as HTMLButtonElement).disabled).toBe(false);
   });
 
   it('carte existante non modifiée → Créer ne réécrit pas la Bedeutung (revue N1)', async () => {
@@ -137,7 +137,7 @@ describe('NewCardSheet', () => {
     render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
     const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
     await waitFor(() => expect((input as HTMLInputElement).value).toBe('signification déjà enregistrée'));
-    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
     await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
     expect((await db.personal_terms.get(id))?.explanation).toBe('signification déjà enregistrée');
     expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_updated')).toBe(false);
@@ -191,4 +191,52 @@ describe('NewCardSheet', () => {
     await screen.findByRole('textbox', { name: 'Bedeutung' });
     expect(screen.queryByText('Pas de proposition : écris la signification.')).toBeNull();
   });
+
+  it('carte en devenir (F4b P8, AC-7) : mot en grand, Bedeutung en italique, contexte en petit surligné, « Créer la carte » ; verre sans ombre', async () => {
+    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="Seit Wochen Belastungsdyspnoe beim Treppensteigen." onClose={() => {}} />);
+    act(() => vi.advanceTimersByTime(0));
+    vi.useRealTimers();
+    const dialog = await screen.findByRole('dialog', { name: 'Nouvelle carte' });
+    expect(dialog.className).toContain('glass-full');
+    expect(screen.getByRole('textbox', { name: 'Mot' }).className).toMatch(/font-display.*text-2xl/);
+    expect(screen.getByRole('textbox', { name: 'Bedeutung' }).className).toContain('italic');
+    expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' }).closest('p')!.className).toContain('text-xs');
+    expect(screen.getByRole('button', { name: 'Créer la carte' })).toBeTruthy();
+    expect(screen.getByText('Ma carte')).toBeTruthy();
+    expect(document.body.innerHTML).not.toMatch(/shadow-/);
+  });
+  it('miroitement pendant la proposition IA, plus après', async () => {
+    const { askBedeutung } = await import('@/lib/onlineAi');
+    let resolve: (v: string) => void = () => {};
+    vi.mocked(askBedeutung).mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
+    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
+    act(() => vi.advanceTimersByTime(0));
+    vi.useRealTimers();
+    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
+    await waitFor(() => expect(input.className).toContain('animate-shimmer'));
+    await act(async () => { resolve('Atemnot bei Belastung'); });
+    await waitFor(() => expect(input.className).not.toContain('animate-shimmer'));
+  });
+  it('clavier : Entrée dans la Bedeutung crée la carte, qui se pose (onClose reçoit la descente) ; Fermer = onClose() sans descente', async () => {
+    const onClose = vi.fn();
+    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={onClose} />);
+    act(() => vi.advanceTimersByTime(0));
+    vi.useRealTimers();
+    const input = await screen.findByRole('textbox', { name: 'Bedeutung' });
+    await waitFor(() => expect((input as HTMLInputElement).value).toBe('Atemnot bei Belastung'), { timeout: 3000 });   // suite complète : IA simulée + Dexie sous charge
+    fireEvent.keyDown(input, { key: 'Enter' });
+    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1), { timeout: 3000 });
+    expect(typeof onClose.mock.calls[0][0]).toBe('number');
+    expect(await db.personal_terms.count()).toBe(1);
+    onClose.mockClear();
+    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
+    expect(onClose).toHaveBeenCalledWith();
+  });
+  it('« Corriger le mot » : le crayon donne la main sur le mot', async () => {
+    render(<NewCardSheet selection="Belastungsdyspnoe" sentence="" onClose={() => {}} />);
+    act(() => vi.advanceTimersByTime(0));
+    vi.useRealTimers();
+    fireEvent.click(await screen.findByRole('button', { name: 'Corriger le mot' }));
+    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Mot' }));
+  });
 });
```

```diff
--- a/app/src/components/SelectionExplainer.test.tsx
+++ b/app/src/components/SelectionExplainer.test.tsx
@@ -75,7 +75,7 @@ describe('SelectionExplainer', () => {
     expect(dialog.textContent).toContain('Seit Wochen Belastungsdyspnoe beim Treppensteigen.');
     expect(dialog.textContent).not.toContain('Fieber');
     expect(screen.getByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
-    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
     await waitFor(async () => expect(await db.personal_terms.count()).toBe(1));
     const pt = (await db.personal_terms.toArray())[0];
     expect(pt).toMatchObject({ term: 'Belastungsdyspnoe', explanation: 'Atemnot bei Belastung', context: 'Seit Wochen Belastungsdyspnoe beim Treppensteigen.' });
@@ -91,7 +91,7 @@ describe('SelectionExplainer', () => {
     act(() => vi.advanceTimersByTime(0));
     vi.useRealTimers();
     await waitFor(() => expect(screen.getByRole('textbox', { name: 'Bedeutung' }).getAttribute('placeholder')).toBe('Écris la signification'));
-    expect((screen.getByRole('button', { name: 'Créer' }) as HTMLButtonElement).disabled).toBe(true);
+    expect((screen.getByRole('button', { name: 'Créer la carte' }) as HTMLButtonElement).disabled).toBe(true);
     fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
     expect(screen.queryByRole('dialog', { name: 'Nouvelle carte' })).toBeNull();
     expect(await db.progress_events.count()).toBe(0);
@@ -106,7 +106,7 @@ describe('SelectionExplainer', () => {
     fireEvent.click(await screen.findByRole('button', { name: 'Belastungsdyspnoe' }));
     await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung'));
     expect((screen.getByRole('textbox', { name: 'Mot' }) as HTMLInputElement).value).toBe('Belastungsdyspnoe');
-    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
     await waitFor(async () => expect((await db.personal_terms.toArray())[0]).toMatchObject({ term: 'Belastungsdyspnoe', context: 'Der Patient klagt über zunehmende Belastungsdyspnoe seit Wochen.' }));
   });
   it('IA indisponible → aucune demande, invite « Écris la signification »', async () => {
@@ -216,7 +216,7 @@ describe('SelectionExplainer', () => {
     fireEvent.click(await screen.findByRole('button', { name: 'Nouvelle carte : Belastungsdyspnoe' }));
     await waitFor(() => expect((screen.getByRole('textbox', { name: 'Bedeutung' }) as HTMLInputElement).value).toBe('Atemnot bei Belastung (originale)'));
     expect(askBedeutung).not.toHaveBeenCalled();
-    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    fireEvent.click(screen.getByRole('button', { name: 'Créer la carte' }));
     await waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false));
     // Laisse largement passer le délai qui aurait déclenché la suppression.
     await new Promise((r) => setTimeout(r, DELAY * 3));
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/NewCardSheet.test.tsx src/components/SelectionExplainer.test.tsx; echo exit=$?` → ≠ 0 (bouton « Créer la carte » introuvable).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/components/TermSheet.tsx
+++ b/app/src/components/TermSheet.tsx
@@ -11,10 +11,10 @@ import { highlightParts } from '@/lib/sentence';
 import { TermUsage } from './TermUsage';
 import { Icon } from './icons';
 
-export function ContextSentence({ sentence, word }: { sentence: string; word: string }) {
+export function ContextSentence({ sentence, word, className = 'text-sm' }: { sentence: string; word: string; className?: string }) {
   const parts = highlightParts(sentence, word);
   return (
-    <p className="text-sm text-slate-600 dark:text-slate-300">
+    <p className={`${className} text-slate-600 dark:text-slate-300`}>
       {parts ? <>{parts[0]}<mark className="rounded bg-brand-100 px-0.5 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100">{parts[1]}</mark>{parts[2]}</> : sentence}
     </p>
   );
```

```diff
--- a/app/src/components/NewCardSheet.tsx
+++ b/app/src/components/NewCardSheet.tsx
@@ -1,8 +1,14 @@
 // ============================================================================
-// Mini-fiche de création (F4a D4/D5) : ★ sur un mot hors glossaire. Le mot
-// (modifiable), sa Bedeutung, le Contexte = la seule phrase qui le contient
-// (mot surligné), le deck (Favoris par défaut), « Créer ». Plus de 4 mots
-// sélectionnés : on touche le mot à garder. Fermer sans créer n'écrit rien.
+// Mini-fiche de création (F4a D4/D5 → F4b P8) = la carte EN TRAIN DE SE FAIRE :
+// le mot en grand (police du recto, crayon discret pour corriger), la
+// Bedeutung en italique éditable sur place (miroitement pendant la proposition
+// IA), la phrase de contexte en petit, mot surligné ; pied : bande de decks
+// (s'il existe un deck manuel) + « Créer la carte ». Plus de 4 mots : les
+// pastilles d'abord, le mot touché « vole » à sa place. Champs sans bordure
+// (soulignement fin au survol/focus). Ouverture : la carte s'étend (ancrée
+// sous la sélection sur ordinateur, depuis le bas sur téléphone) ; « Créer »
+// → elle se pose dans la pilule de confirmation (`onClose(dy)`). Clavier :
+// focus sur la Bedeutung, Entrée crée, Échap ferme. Fermer n'écrit rien.
 // Le mot choisi peut recouper deux cas déjà connus (revue re-revue C7) :
 //   - un terme du GLOSSAIRE (N2) : sa Bedeutung s'affiche en lecture, aucun
 //     appel IA, jamais de doublon `pt-` (I1), « Créer » range le terme publié.
@@ -15,7 +21,7 @@
 // jetée si le mot change avant la réponse (m3). IA indisponible : « Écris la
 // signification ».
 // ============================================================================
-import { useEffect, useRef, useState } from 'react';
+import { useEffect, useLayoutEffect, useRef, useState } from 'react';
 import { FAVORITES_DECK_ID } from '@/db/types';
 import { db } from '@/db/db';
 import { useDecks, useFachbegriffe, usePersonalTerms } from '@/hooks/useData';
@@ -24,8 +30,10 @@ import { cleanSelection, createPersonalTerm, personalTermId, PT_LIMITS, updatePe
 import { toView } from '@/lib/collections/allTerms';
 import { lookupTerm } from '@/lib/dictionary';
 import { askBedeutung, canAskAi } from '@/lib/onlineAi';
+import { expand, flyFrom, m, settleOrClose } from '@/lib/motion';
 import { useCardToast } from '@/store/cardToast';
 import { ContextSentence } from './TermSheet';
+import { Icon } from './icons';
 import { Portal } from './Portal';
 
 export const CHIP_THRESHOLD = 4;
@@ -34,7 +42,14 @@ export function selectionWords(selection: string): string[] {
   return [...new Set(selection.split(/\s+/).map(cleanSelection).filter((w) => w.length >= 2))];
 }
 
-export function NewCardSheet({ selection, sentence, caseId, onClose }: { selection: string; sentence: string; caseId?: string; onClose: () => void }) {
+/** Hauteur réservée sous l'ancre (ordinateur) : la carte ne sort jamais par le bas. */
+const CARD_H = 400;
+const CARD_W = 352;   // w-[22rem]
+
+/** `onClose(dy)` : `dy` = descente jusqu'à la pilule (« se poser ») ; absent = simple fermeture. */
+export function NewCardSheet({ selection, sentence, caseId, at, onClose }: {
+  selection: string; sentence: string; caseId?: string; at?: { x: number; bottom: number }; onClose: (settleDy?: number) => void;
+}) {
   const decks = useDecks();
   const manualDecks = (decks ?? []).filter((d) => d.kind === 'manual');
   const begriffeRaw = useFachbegriffe();
@@ -60,7 +75,13 @@ export function NewCardSheet({ selection, sentence, caseId, onClose }: { selecti
   const autoFilled = useRef(false);   // Bedeutung reprise du glossaire / de la carte, pas tapée
   const firstChipRef = useRef<HTMLButtonElement>(null);
   const bedeutungRef = useRef<HTMLInputElement>(null);
+  const wordInputRef = useRef<HTMLInputElement>(null);
+  const wordRowRef = useRef<HTMLDivElement>(null);
+  const cardRef = useRef<HTMLDivElement>(null);
+  const flightFrom = useRef<DOMRect | null>(null);
   useEffect(() => { wordRef.current = word; }, [word]);
+  // Le mot touché en pastille « vole » à sa place (FLIP natif, lib/motion).
+  useLayoutEffect(() => { flyFrom(wordRowRef.current, flightFrom.current); flightFrom.current = null; }, [word]);
 
   // Le mot choisi touche-t-il un terme déjà publié, ou une carte personnelle
   // déjà là (y compris en attente de suppression : elle reste en base tant
@@ -105,6 +126,11 @@ export function NewCardSheet({ selection, sentence, caseId, onClose }: { selecti
 
   const canCreate = !!word.trim() && word.length <= PT_LIMITS.term && !submitting && !loading &&   // pas de doublon du glossaire avant son chargement (m-a)
     (!!hit || !!bedeutung.trim());
+  // Se poser : de son centre jusqu'à la pilule de confirmation (bas de l'écran, ~32 px).
+  const settleDy = () => {
+    const r = cardRef.current?.getBoundingClientRect();
+    return r && r.height ? Math.max(0, window.innerHeight - 32 - (r.top + r.height / 2)) : 96;
+  };
   const create = async () => {
     if (!canCreate || busy.current) return;
     busy.current = true; setSubmitting(true); setError(null);
@@ -113,7 +139,7 @@ export function NewCardSheet({ selection, sentence, caseId, onClose }: { selecti
       if (hit) {
         await addTermToDeck(deckId, hit.id, caseId ? { caseId } : {});
         show({ kind: 'saved', term: hit, deckId, ...(caseId ? { caseId } : {}) });
-        onClose();
+        onClose(settleDy());
         return;
       }
       const { id, created } = await createPersonalTerm({ term: word, explanation: bedeutung, context: sentence, caseId });
@@ -124,61 +150,68 @@ export function NewCardSheet({ selection, sentence, caseId, onClose }: { selecti
       await addTermToDeck(deckId, id, caseId ? { caseId } : {});
       const pt = await db.personal_terms.get(id);
       if (pt) show({ kind: 'saved', term: toView(pt), deckId, ...(caseId ? { caseId } : {}) });
-      onClose();
+      onClose(settleDy());
     } catch { setError('Impossible de créer la carte : réessaie.'); }
     finally { busy.current = false; setSubmitting(false); }
   };
 
+  // Ordinateur (sm+) : ancrée sous la sélection, jamais hors écran ; téléphone : depuis le bas.
+  const anchorStyle = at && typeof window !== 'undefined' ? {
+    '--nc-top': `${Math.max(8, Math.min(at.bottom + 8, window.innerHeight - CARD_H))}px`,
+    '--nc-left': `${Math.max(16, Math.min(at.x - CARD_W / 2, window.innerWidth - CARD_W - 16))}px`,
+  } as React.CSSProperties : undefined;
+  const field = 'w-full min-h-11 border-b border-transparent bg-transparent outline-none transition-colors hover:border-slate-300 focus:border-brand-500 dark:hover:border-white/20';
+  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void create(); } };
+
   return (
     <Portal>
-      <div role="dialog" aria-label="Nouvelle carte" data-keep-open
+      <m.div ref={cardRef} role="dialog" aria-label="Nouvelle carte" data-keep-open style={anchorStyle}
+        {...expand} exit="gone" variants={{ gone: settleOrClose }}
         onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
-        className="fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-md space-y-3 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-in-fast dark:bg-slate-900 dark:ring-slate-700">
-        <div className="flex items-center justify-between">
-          <h3 className="font-semibold">{hit ? 'Déjà dans le glossaire' : 'Nouvelle carte'}</h3>
-          <button type="button" aria-label="Fermer" onClick={onClose} className="btn-ghost h-11 w-11 justify-center">✕</button>
+        className={`glass-full fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-[22rem] origin-bottom space-y-3 rounded-2xl p-4 text-sm ${at ? 'sm:inset-x-auto sm:bottom-auto sm:left-[var(--nc-left)] sm:top-[var(--nc-top)] sm:w-[22rem] sm:origin-top' : ''}`}>
+        <div className="flex items-start justify-between gap-2">
+          <p className="label pt-1">{hit ? 'Déjà dans le glossaire' : 'Ma carte'}</p>
+          <button type="button" aria-label="Fermer" onClick={() => onClose()} className="-m-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/50 dark:hover:bg-white/10">✕</button>
         </div>
         {chips && (
           <div>
-            <p className="label mb-1">Touche le mot à garder</p>
+            <p className="label mb-1.5">Touche le mot à garder</p>
             <div className="flex flex-wrap gap-1.5">
               {chips.map((w, i) => (
                 <button key={w} ref={i === 0 ? firstChipRef : undefined} type="button" aria-pressed={word === w}
-                  onClick={() => { setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
-                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{w}</button>
+                  onClick={(e) => { flightFrom.current = e.currentTarget.getBoundingClientRect(); setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
+                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-white/50 dark:ring-white/20 dark:hover:bg-white/10'}`}>{w}</button>
               ))}
             </div>
           </div>
         )}
         {word && (
           <>
-            <label className="block"><span className="label">Mot</span>
-              <input value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} className="input mt-1 min-h-11 w-full" />
-            </label>
-            <label className="block"><span className="label">Bedeutung</span>
-              <input ref={bedeutungRef} value={bedeutung} maxLength={PT_LIMITS.explanation} readOnly={!!hit}
-                placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
-                aria-busy={ai === 'loading' || undefined}
-                onChange={(e) => { if (hit) return; typed.current = true; setBedeutung(e.target.value); }}
-                className={`input mt-1 min-h-11 w-full ${hit ? 'bg-slate-50 dark:bg-white/5' : ''}`} />
-            </label>
-            {sentence && <div><span className="label">Contexte</span><ContextSentence sentence={sentence} word={word} /></div>}
+            <div ref={wordRowRef} className="flex items-center gap-1">
+              <input ref={wordInputRef} aria-label="Mot" value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} onKeyDown={onEnter}
+                className={`${field} min-w-0 font-display text-2xl font-bold tracking-tightish text-slate-900 dark:text-white`} />
+              <button type="button" aria-label="Corriger le mot" onClick={() => { wordInputRef.current?.focus(); wordInputRef.current?.select(); }}
+                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/50 hover:text-slate-600 dark:hover:bg-white/10"><Icon name="pen" className="h-4 w-4" title="Corriger" /></button>
+            </div>
+            <input ref={bedeutungRef} aria-label="Bedeutung" value={bedeutung} maxLength={PT_LIMITS.explanation} readOnly={!!hit}
+              placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
+              aria-busy={ai === 'loading' || undefined}
+              onChange={(e) => { if (hit) return; typed.current = true; setBedeutung(e.target.value); }} onKeyDown={onEnter}
+              className={`${field} text-base italic text-slate-700 placeholder:text-slate-400 dark:text-slate-200 ${ai === 'loading' ? 'animate-shimmer bg-[linear-gradient(90deg,transparent,rgb(21_131_117/0.14),transparent)] bg-[length:200%_100%]' : ''}`} />
+            {sentence && <ContextSentence sentence={sentence} word={word} className="text-xs leading-relaxed" />}
             {manualDecks.length > 0 && (
-              <div>
-                <span className="label">Deck</span>
-                <div className="mt-1 flex flex-wrap gap-1.5">
-                  {[{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...manualDecks].map((d) => (
-                    <button key={d.id} type="button" aria-pressed={deckId === d.id} onClick={() => setDeckId(d.id)}
-                      className={`min-h-11 rounded-full px-3 ring-1 ${deckId === d.id ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{d.name}</button>
-                  ))}
-                </div>
+              <div role="group" aria-label="Deck" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
+                {[{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...manualDecks].map((d) => (
+                  <button key={d.id} type="button" aria-pressed={deckId === d.id} onClick={() => setDeckId(d.id)}
+                    className={`min-h-11 shrink-0 rounded-full px-3 ring-1 ${deckId === d.id ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-white/50 dark:ring-white/20 dark:hover:bg-white/10'}`}>{d.name}</button>
+                ))}
               </div>
             )}
-            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full disabled:opacity-40">{hit ? 'Ranger' : 'Créer'}</button>
+            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full rounded-full disabled:opacity-40">{hit ? 'Ranger' : 'Créer la carte'}</button>
             {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
           </>
         )}
-      </div>
+      </m.div>
     </Portal>
   );
 }
```

```diff
--- a/app/src/components/SelectionExplainer.tsx
+++ b/app/src/components/SelectionExplainer.tsx
@@ -53,7 +53,8 @@ export function SelectionExplainer() {
   const caseId = useCaseId() ?? undefined;
   const [anchor, setAnchor] = useState<Anchor | null>(null);
   const [bubble, setBubble] = useState<Bubble | null>(null);
-  const [newCard, setNewCard] = useState<{ selection: string; sentence: string } | null>(null);
+  const [newCard, setNewCard] = useState<{ selection: string; sentence: string; at: { x: number; bottom: number } } | null>(null);
+  const [settleDy, setSettleDy] = useState<number | undefined>(undefined);   // « se poser » (P8) : lu par la sortie de la carte
   const rootRef = useRef<HTMLDivElement>(null);
   const anchorRef = useRef<Anchor | null>(null);
   useEffect(() => { anchorRef.current = anchor; }, [anchor]);
@@ -119,7 +120,7 @@ export function SelectionExplainer() {
   const canCreate = !!clean && (chips || clean.length <= PT_LIMITS.term);
   const openNewCard = () => {
     if (!anchor) return;
-    setNewCard({ selection: anchor.text, sentence: anchor.sentence });
+    setNewCard({ selection: anchor.text, sentence: anchor.sentence, at: { x: anchor.x, bottom: anchor.bottom } });
     setAnchor(null); setBubble(null);
   };
 
@@ -142,7 +143,12 @@ export function SelectionExplainer() {
     catch (e) { setBubble({ loading: false, error: honestAiError(e) }); }
   };
 
-  const sheet = newCard && <NewCardSheet key={newCard.selection + newCard.sentence} selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} onClose={() => setNewCard(null)} />;
+  const sheet = (
+    <AnimatePresence custom={settleDy}>
+      {newCard && <NewCardSheet key={newCard.selection + newCard.sentence} selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} at={newCard.at}
+        onClose={(dy) => { setSettleDy(dy); setNewCard(null); }} />}
+    </AnimatePresence>
+  );
   // Pas assez de place au-dessus (pilule ou bulle) : bascule sous la sélection
   // plutôt que de partir hors écran (bug B1). Demi-largeurs (pilule 94 px,
   // bulle w-64) pour un clamp horizontal à 16 px du bord.
```

- [ ] **Step 4 : vérifier** — `for i in 1 2 3; do npx vitest run src/components >/dev/null 2>&1 || echo FAIL; done` → aucune ligne `FAIL` ; gates (suite complète : délais de 3 s déjà posés sur les attentes IA du test « clavier »).

- [ ] **Step 5 : commit**
```bash
git add src/components/TermSheet.tsx
git add src/components/NewCardSheet.tsx
git add src/components/NewCardSheet.test.tsx
git add src/components/SelectionExplainer.tsx
git add src/components/SelectionExplainer.test.tsx
git commit -m "feat(fachbegriffe): mini-fiche = la carte en devenir — mot en grand, Bedeutung en place, se pose dans la pilule (F4b P8)"
```

---

# Tranche E — Decks flottants (P6)

### Task E1 : Suppression de deck différée + « Deck supprimé · Annuler » (platform-sync-engineer, Sonnet ; `doubt-driven-development`)

**Files:**
- Modify: `app/src/lib/collections/index.ts`, `app/src/lib/collections/pendingDeletion.ts`, `app/src/lib/collections/pendingDeletion.test.ts`
- Modify: `app/src/store/cardToast.ts`, `app/src/components/CardToast.tsx`, `app/src/components/CardToast.test.tsx`

**Interfaces:**
- Consumes : `syncQueue.pushMany`, `reprojectCollections`, événement existant `deck.deleted` (aucun nouveau type).
- Produces : `planDeckDeletion(deckId): NewEvent[]` (lève `reserved` pour Favoris) ; `commitCollectionEvents(events): Promise<void>` ; `scheduleDeletion(id, delayMs = DELETE_DELAY_MS, kind: 'card' | 'deck' = 'card')` (signature existante étendue, appels F4a inchangés) ; `usePendingDeletions().ids` contient aussi les ids de decks masqués ; toast `{ kind: 'deck-deleted'; deckId: string; name: string }`.

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/lib/collections/pendingDeletion.test.ts
+++ b/app/src/lib/collections/pendingDeletion.test.ts
@@ -1,7 +1,7 @@
 import { describe, it, expect, beforeEach, vi } from 'vitest';
 import { db } from '@/db/db';
 import { createPersonalTerm } from './personalTerms';
-import { toggleFavorite } from './index';
+import { toggleFavorite, createDeck, addTermToDeck } from './index';
 import { scheduleDeletion, cancelDeletion, flushDeletions, usePendingDeletions } from './pendingDeletion';
 
 vi.mock('@/lib/sync/queue', async () => {
@@ -85,3 +85,35 @@ describe('suppression différée (F4a D10, AC-9)', () => {
     expect(useCardToast.getState().toast).toMatchObject({ kind: 'error', message: 'Impossible de supprimer : réessaie.' });
   });
 });
+
+describe('suppression différée d\'un deck (F4b P6, AC-5)', () => {
+  let deckId: string; let termId: string;
+  const deckDeleted = async () => (await db.progress_events.toArray()).filter((e) => e.type === 'deck.deleted');
+  beforeEach(async () => {
+    await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.deck_terms.clear(); await db.decks.clear();
+    deckId = await createDeck('Leber', 'manual');
+    termId = (await createPersonalTerm({ term: 'Aszites', explanation: 'Bauchwasser' })).id;
+    await addTermToDeck(deckId, termId);
+  });
+
+  it('masqué tout de suite, rien émis ; Annuler → aucun événement, deck intact', async () => {
+    await scheduleDeletion(deckId, DELAY, 'deck');
+    expect(usePendingDeletions.getState().ids.has(deckId)).toBe(true);
+    expect(await deckDeleted()).toEqual([]);
+    expect(cancelDeletion(deckId)).toBe(true);
+    await sleep(DELAY * 3);
+    expect(await deckDeleted()).toEqual([]);
+    expect(await db.decks.get(deckId)).toBeTruthy();
+  });
+  it('expiration → deck.deleted émis ; aucune carte supprimée', async () => {
+    await scheduleDeletion(deckId, DELAY, 'deck');
+    await vi.waitFor(() => expect(usePendingDeletions.getState().ids.has(deckId)).toBe(false), { timeout: 3000 });
+    expect(await deckDeleted()).toHaveLength(1);
+    expect(await db.decks.get(deckId)).toBeUndefined();
+    expect(await db.personal_terms.get(termId)).toBeTruthy();
+    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_deleted')).toBe(false);
+  });
+  it('Favoris ne se supprime pas', async () => {
+    await expect(scheduleDeletion('deck-favorites', DELAY, 'deck')).rejects.toThrow('reserved');
+  });
+});
```

```diff
--- a/app/src/components/CardToast.test.tsx
+++ b/app/src/components/CardToast.test.tsx
@@ -58,6 +58,15 @@ describe('CardToast — suppression (m2)', () => {
     expect(document.querySelector('[data-card-flip]')).toBeNull();
     expect(document.body.innerHTML).not.toMatch(/shadow-/);
   });
+  it('« Deck supprimé · Annuler » : Annuler → rien n\'est émis, la pilule se ferme (F4b P6)', async () => {
+    useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd1', name: 'Leber' });
+    vi.mocked(cancelDeletion).mockReturnValueOnce(true);
+    render(<CardToast />);
+    expect(screen.getByRole('status').textContent).toBe('Deck « Leber » supprimé·Annuler');
+    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
+    expect(cancelDeletion).toHaveBeenCalledWith('d1');
+    await waitFor(() => expect(useCardToast.getState().toast).toBeNull());
+  });
   it('expiration (flushDeletions) masque la confirmation de suppression de la carte concernée', async () => {
     const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
     const term = toView((await db.personal_terms.get(id))!);
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/collections/pendingDeletion.test.ts src/components/CardToast.test.tsx; echo exit=$?` → ≠ 0 (sans le 3ᵉ argument, `planPersonalDeletion` lève `not_personal` sur un id de deck ; `deck-deleted` n'a pas de pilule).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/lib/collections/index.ts
+++ b/app/src/lib/collections/index.ts
@@ -37,6 +37,17 @@ export async function createDeck(name: string, kind: 'manual' | 'smart', query?:
 export const renameDeck = async (deckId: string, name: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.renamed', deckId, { name: normalizeDeckName(name) }); };
 export const setDeckQuery = (deckId: string, query: DeckQuery) => emit('deck.query_changed', deckId, { query });
 export const deleteDeck = async (deckId: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.deleted', deckId, {}); };
+/** Suppression d'un deck PLANIFIÉE (F4b P6) : rien n'est émis ici (Annuler
+ *  pendant le délai, pendingDeletion) ; les termes restent dans le glossaire. */
+export function planDeckDeletion(deckId: string): NewEvent[] {
+  if (deckId === FAVORITES_DECK_ID) throw new Error('reserved');
+  return [{ type: 'deck.deleted', subject_id: deckId, payload: {} }];
+}
+/** Émet un lot planifié en UNE transaction, puis reprojette les collections. */
+export async function commitCollectionEvents(events: NewEvent[]): Promise<void> {
+  await syncQueue.pushMany(events);
+  await reprojectCollections();
+}
 export const addToDeck = (deckId: string, termId: string, opts: { caseId?: string } = {}) => emit('deck.term_added', deckId, { termId, ...(opts.caseId ? { caseId: opts.caseId } : {}) });
 export const removeFromDeck = (deckId: string, termId: string) => emit('deck.term_removed', deckId, { termId });
```

```diff
--- a/app/src/lib/collections/pendingDeletion.ts
+++ b/app/src/lib/collections/pendingDeletion.ts
@@ -1,28 +1,31 @@
 // ============================================================================
-// Suppression différée d'une carte personnelle (F4a D10). Le journal est
-// append-only : un « annuler » après émission remettrait le SRS à zéro. Donc :
-// masquage LOCAL immédiat, événements planifiés au clic, émis d'un bloc à
-// l'expiration du délai, au `pagehide` ou quand la page passe en arrière-plan
-// (iOS tue souvent l'onglet sans `pagehide`). Annuler = rien n'est émis.
+// Suppression différée d'une carte personnelle (F4a D10) ou d'un deck (F4b P6).
+// Le journal est append-only : un « annuler » après émission remettrait le SRS
+// à zéro. Donc : masquage LOCAL immédiat, événements planifiés au clic, émis
+// d'un bloc à l'expiration du délai, au `pagehide` ou quand la page passe en
+// arrière-plan (iOS tue souvent l'onglet sans `pagehide`). Annuler = rien
+// n'est émis. Supprimer un deck ne supprime aucune carte.
 // ============================================================================
 import { create } from 'zustand';
 import type { NewEvent } from '@/lib/sync/events';
 import { commitPersonalDeletion, planPersonalDeletion } from './personalTerms';
+import { commitCollectionEvents, planDeckDeletion } from './index';
 import { useCardToast } from '@/store/cardToast';
 
 export const DELETE_DELAY_MS = 5000;
-interface Pending { events: NewEvent[]; timer: ReturnType<typeof setTimeout>; committing: boolean }
+type Kind = 'card' | 'deck';
+interface Pending { events: NewEvent[]; kind: Kind; timer: ReturnType<typeof setTimeout>; committing: boolean }
 const pending = new Map<string, Pending>();
 
-/** Ids masqués en attente de suppression (lu par useAllTerms). */
+/** Ids masqués en attente de suppression — cartes (lu par useAllTerms) et decks (onglets). */
 export const usePendingDeletions = create<{ ids: ReadonlySet<string> }>(() => ({ ids: new Set() }));
 const publish = () => usePendingDeletions.setState({ ids: new Set(pending.keys()) });
 
 let listening = false;
-export async function scheduleDeletion(id: string, delayMs = DELETE_DELAY_MS): Promise<void> {
+export async function scheduleDeletion(id: string, delayMs = DELETE_DELAY_MS, kind: Kind = 'card'): Promise<void> {
   if (pending.has(id)) return;
-  const events = await planPersonalDeletion(id);
-  pending.set(id, { events, committing: false, timer: setTimeout(() => { void commit(id); }, delayMs) });
+  const events = kind === 'deck' ? planDeckDeletion(id) : await planPersonalDeletion(id);
+  pending.set(id, { events, kind, committing: false, timer: setTimeout(() => { void commit(id); }, delayMs) });
   publish();
   if (!listening && typeof window !== 'undefined') {
     window.addEventListener('pagehide', () => { void flushDeletions(); });
@@ -44,10 +47,10 @@ async function commit(id: string): Promise<void> {
   if (!p || p.committing) return;
   p.committing = true; clearTimeout(p.timer);
   try {
-    await commitPersonalDeletion(p.events);
-    // La confirmation « Annuler » de CETTE carte n'a plus de sens une fois émise (flush/expiration).
+    await (p.kind === 'deck' ? commitCollectionEvents(p.events) : commitPersonalDeletion(p.events));
+    // La confirmation « Annuler » de CE terme / deck n'a plus de sens une fois émise (flush/expiration).
     const t = useCardToast.getState().toast;
-    if (t && t.kind === 'deleted' && t.term.id === id) useCardToast.getState().hide();
+    if (t && ((t.kind === 'deleted' && t.term.id === id) || (t.kind === 'deck-deleted' && t.deckId === id))) useCardToast.getState().hide();
   }
   catch { useCardToast.getState().show({ kind: 'error', message: 'Impossible de supprimer : réessaie.' }); }   // plus de rejet silencieux (revue B3 m3) ; message unifié avec GlossaryDrawer
   finally { pending.delete(id); publish(); }   // échec d'écriture : la carte réapparaît, rien de perdu
```

```diff
--- a/app/src/store/cardToast.ts
+++ b/app/src/store/cardToast.ts
@@ -1,11 +1,12 @@
 // Confirmation d'une carte (F4a D7/D10) — montée une fois dans Shell, ouverte
-// par l'étoile, la mini-fiche de création et la corbeille.
+// par l'étoile, la mini-fiche de création, la corbeille et la gestion des decks.
 import { create } from 'zustand';
 import type { AnyTerm } from '@/lib/collections/allTerms';
 
 export type CardToast =
   | { kind: 'saved'; term: AnyTerm; deckId: string; caseId?: string }
   | { kind: 'deleted'; term: AnyTerm }
+  | { kind: 'deck-deleted'; deckId: string; name: string }
   | { kind: 'error'; message: string };
 
 export const useCardToast = create<{ toast: CardToast | null; show: (t: CardToast) => void; hide: () => void }>((set) => ({
```

```diff
--- a/app/src/components/CardToast.tsx
+++ b/app/src/components/CardToast.tsx
@@ -4,7 +4,7 @@
 // « Rangée » : ★ Rangée dans <deck> · Révéler · Changer. Toucher la pilule
 // ouvre la miniature (la carte) ; Révéler la retourne ; Changer DÉPLACE (D6 ;
 // masqué sans autre deck). « Supprimée » : Annuler pendant le délai — rien
-// n'a encore été émis. Erreur : même pilule, rôle alert.
+// n'a encore été émis (idem « Deck supprimé »). Erreur : même pilule, rôle alert.
 // Se ferme seule (8 s ; le délai de suppression pour « Supprimée »), sauf une
 // fois touchée. Échap la ferme (une suppression différée suit son cours).
 // ============================================================================
@@ -43,7 +43,7 @@ export function CardToast() {
   }, [toast, hide]);
   useEffect(() => {
     if (!toast || (touched && toast.kind === 'saved')) return;
-    const t = setTimeout(hide, toast.kind === 'deleted' ? DELETE_DELAY_MS : SAVED_MS);
+    const t = setTimeout(hide, toast.kind === 'deleted' || toast.kind === 'deck-deleted' ? DELETE_DELAY_MS : SAVED_MS);
     return () => clearTimeout(t);
   }, [toast, touched, hide]);
 
@@ -63,6 +63,13 @@ export function CardToast() {
         <button type="button" onClick={() => { if (cancelDeletion(toast.term.id)) hide(); else show({ kind: 'error', message: 'Trop tard : la carte est supprimée.' }); }} className={link}>Annuler</button>
       </m.div>
     );
+  } else if (toast?.kind === 'deck-deleted') {
+    body = (
+      <m.div key={`deck-deleted-${toast.deckId}`} role="status" data-keep-open {...appear} className={pill}>
+        <span className="min-w-0 truncate">Deck « {toast.name} » supprimé</span><Dot />
+        <button type="button" onClick={() => { if (cancelDeletion(toast.deckId)) hide(); else show({ kind: 'error', message: 'Trop tard : le deck est supprimé.' }); }} className={link}>Annuler</button>
+      </m.div>
+    );
   } else if (toast?.kind === 'saved') {
     const deckName = targets.find((d) => d.id === toast.deckId)?.name ?? 'Favoris';
     body = (
```

- [ ] **Step 4 : vérifier** — `npx vitest run src/lib/collections src/components/CardToast.test.tsx; echo exit=$?` → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/lib/collections/index.ts
git add src/lib/collections/pendingDeletion.ts
git add src/lib/collections/pendingDeletion.test.ts
git add src/store/cardToast.ts
git add src/components/CardToast.tsx
git add src/components/CardToast.test.tsx
git commit -m "feat(fachbegriffe): suppression de deck différée — rien n'est émis avant l'expiration, Annuler (F4b P6)"
```

---

### Task E2 : Tiroir de gestion `DeckManager` (front-implementer, Sonnet)

**Files:**
- Create: `app/src/features/fachbegriffe/DeckManager.tsx`, `app/src/features/fachbegriffe/DeckManager.test.tsx`

**Interfaces:**
- Consumes : E1 (`scheduleDeletion(id, undefined, 'deck')`, `usePendingDeletions`, toast `deck-deleted`), `renameDeck`, A1 (`m`, `slide`), A2.
- Produces : `DeckManager({ decks: Deck[], counts: Record<string, number>, onCreate: () => void, onClose: () => void })` — `role="dialog"` « Decks », champs « Nom du deck <nom> », boutons « Supprimer le deck <nom> », « Nouveau deck », « Fermer ». À monter dans un `<AnimatePresence>`. E4 remplace `onCreate` par une création sur place.

- [ ] **Step 1 : test qui échoue** — créer `app/src/features/fachbegriffe/DeckManager.test.tsx` :

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useCardToast } from '@/store/cardToast';
import { createDeck, reprojectCollections } from '@/lib/collections';
import { cancelDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { CardToast } from '@/components/CardToast';
import { DeckManager } from './DeckManager';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

const decks = () => db.decks.toArray();
function renderManager(onCreate = vi.fn(), onClose = vi.fn()) {
  return decks().then((d) => render(<><DeckManager decks={d} counts={{ 'deck-favorites': 2 }} onCreate={onCreate} onClose={onClose} /><CardToast /></>));
}

describe('DeckManager (F4b P6, AC-5)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
  });

  it('renommer sur place (Entrée) → deck.renamed ; Favoris n\'est ni renommable ni supprimable', async () => {
    const id = await createDeck('Leber', 'manual');
    await renderManager();
    expect(screen.queryByRole('textbox', { name: /Favoris/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer le deck Favoris/ })).toBeNull();
    const input = screen.getByRole('textbox', { name: 'Nom du deck Leber' });
    fireEvent.change(input, { target: { value: 'Leber & Galle' } });
    fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.blur(input);
    await waitFor(async () => expect((await db.decks.get(id))?.name).toBe('Leber & Galle'));
  });
  it('nom vide → message, rien n\'est émis', async () => {
    await createDeck('Leber', 'manual');
    await renderManager();
    const input = screen.getByRole('textbox', { name: 'Nom du deck Leber' });
    fireEvent.change(input, { target: { value: '   ' } }); fireEvent.blur(input);
    expect(await screen.findByText('Nom : 1 à 40 caractères.')).toBeTruthy();
    expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.renamed')).toBe(false);
  });
  it('supprimer → masqué, pilule « Deck supprimé · Annuler » ; Annuler → rien n\'est émis', async () => {
    const id = await createDeck('Leber', 'manual');
    await renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer le deck Leber' }));
    expect(await screen.findByText('Deck « Leber » supprimé')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Nom du deck Leber' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false));
    expect(await screen.findByRole('textbox', { name: 'Nom du deck Leber' })).toBeTruthy();
    expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.deleted')).toBe(false);
    expect(cancelDeletion(id)).toBe(false);
  });
  it('deck intelligent : icône, renommable ; « Nouveau deck » et Échap délèguent', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 's1', payload: { name: 'À revoir', kind: 'smart', query: { state: 'Zu wiederholen' } }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    await reprojectCollections();
    const onCreate = vi.fn(); const onClose = vi.fn();
    await renderManager(onCreate, onClose);
    expect(screen.getByRole('img', { name: 'Deck intelligent' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Nouveau deck' }));
    expect(onCreate).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/features/fachbegriffe/DeckManager.test.tsx; echo exit=$?` → ≠ 0 (`Failed to resolve import "./DeckManager"`).

- [ ] **Step 3 : implémentation** — créer `app/src/features/fachbegriffe/DeckManager.tsx` :

```tsx
// ============================================================================
// Tiroir de gestion des decks (F4b P6), ouvert par « ⋯ Decks » : renommer
// (sur place), supprimer (+ Annuler 5 s : rien n'est émis avant l'expiration,
// pendingDeletion), créer (« Nouveau deck » → DeckSheet). Supprimer un deck
// ne supprime aucune carte. Favoris est réservé : ni renommé, ni supprimé.
// Verre plein, glisse depuis la gauche (côté des onglets) ; Échap ferme.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import type { Deck } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { renameDeck } from '@/lib/collections';
import { scheduleDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { m, slide } from '@/lib/motion';
import { useCardToast } from '@/store/cardToast';
import { Icon } from '@/components/icons';
import { Portal } from '@/components/Portal';

function DeckRow({ deck, count }: { deck: Deck; count: number | undefined }) {
  const [name, setName] = useState(deck.name);
  const [error, setError] = useState<string | null>(null);
  const show = useCardToast((s) => s.show);
  useEffect(() => { setName(deck.name); }, [deck.name]);
  const commit = async () => {
    if (name.trim() === deck.name) { setName(deck.name); return; }
    try { await renameDeck(deck.id, name); setError(null); }
    catch (e) { setError(e instanceof Error && e.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de renommer.'); }
  };
  const remove = () => {
    scheduleDeletion(deck.id, undefined, 'deck')
      .then(() => show({ kind: 'deck-deleted', deckId: deck.id, name: deck.name }))
      .catch(() => setError('Impossible de supprimer : réessaie.'));
  };
  return (
    <li className="py-1">
      <div className="flex items-center gap-1">
        {deck.kind === 'smart' && <Icon name="bolt" className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" title="Deck intelligent" />}
        <input aria-label={`Nom du deck ${deck.name}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
          onBlur={() => { void commit(); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="min-h-11 min-w-0 flex-1 border-b border-transparent bg-transparent px-1 outline-none hover:border-slate-300 focus:border-brand-500 dark:hover:border-white/20" />
        {count !== undefined && <span className="shrink-0 font-mono text-[11px] text-slate-500">{count}</span>}
        <button type="button" aria-label={`Supprimer le deck ${deck.name}`} onClick={remove}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/50 hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-400">
          <Icon name="trash" className="h-4 w-4" title="Supprimer" />
        </button>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </li>
  );
}

export function DeckManager({ decks, counts, onCreate, onClose }: {
  decks: Deck[]; counts: Record<string, number>; onCreate: () => void; onClose: () => void;
}) {
  const hidden = usePendingDeletions((s) => s.ids);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shown = decks.filter((d) => !hidden.has(d.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Portal>
      <m.div key="deck-manager-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/15" onClick={onClose} />
      <m.aside key="deck-manager" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Decks" {...slide('left')}
        className="glass-full fixed left-0 top-0 z-50 flex h-full w-full max-w-sm flex-col rounded-r-2xl p-4 outline-none">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Decks</h2>
          <button type="button" aria-label="Fermer" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/50 dark:hover:bg-white/10">✕</button>
        </div>
        <ul className="mt-2 flex-1 divide-y divide-white/40 overflow-y-auto dark:divide-white/10">
          <li className="flex min-h-11 items-center gap-1 px-1 text-slate-500">Favoris<span className="ml-auto pr-3 font-mono text-[11px]">{counts[FAVORITES_DECK_ID] ?? 0}</span></li>
          {shown.map((d) => <DeckRow key={d.id} deck={d} count={counts[d.id]} />)}
        </ul>
        <button type="button" onClick={onCreate} className="btn-primary mt-3 min-h-11 w-full rounded-full">Nouveau deck</button>
      </m.aside>
    </Portal>
  );
}
```

- [ ] **Step 4 : vérifier** — test → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/features/fachbegriffe/DeckManager.tsx
git add src/features/fachbegriffe/DeckManager.test.tsx
git commit -m "feat(fachbegriffe): tiroir de gestion des decks — renommer, supprimer + Annuler, créer (F4b P6)"
```

---

### Task E3 : Tiroir d'un terme en verre plein, qui glisse (front-implementer, Sonnet)

**Files:**
- Modify: `app/src/components/GlossaryDrawer.tsx`, `app/src/components/GlossaryDrawer.test.tsx`

**Interfaces:**
- Consumes : A1 (`AnimatePresence`, `m`, `slide`), A2.
- Produces : `aside.glass-full` monté dans un `AnimatePresence` persistant (la sortie se joue) ; comportement F4a inchangé. E4 y ajoute les onglets.

- [ ] **Step 1 : test qui échoue**

```diff
--- a/app/src/components/GlossaryDrawer.test.tsx
+++ b/app/src/components/GlossaryDrawer.test.tsx
@@ -94,6 +94,15 @@ describe('GlossaryDrawer (F4a)', () => {
     await screen.findByText('Abdomen');
     await waitFor(() => expect(useUi.getState().hoverTerm).toBeNull());
   });
+  it('tiroir en verre plein, sans ombre portée ; fermer le retire (F4b P1/P9)', async () => {
+    renderDrawer();
+    await screen.findByText('Bauch');
+    const aside = document.querySelector('aside')!;
+    expect(aside.className).toContain('glass-full');
+    expect(aside.className).not.toMatch(/animate-slide-in|shadow-/);
+    fireEvent.click(screen.getAllByRole('button', { name: 'Fermer' })[0]);
+    await waitFor(() => expect(document.querySelector('aside')).toBeNull());
+  });
   it('terme du glossaire : pas de corbeille', async () => {
     renderDrawer();
     await screen.findByText('Abdomen');
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components/GlossaryDrawer.test.tsx; echo exit=$?` → ≠ 0 (`expected 'glass glass-edge … animate-slide-in …' to contain 'glass-full'`).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/components/GlossaryDrawer.tsx
+++ b/app/src/components/GlossaryDrawer.tsx
@@ -10,10 +10,12 @@ import { TermSheet } from './TermSheet';
 import { CardFlip } from './CardFlip';
 import { StarButton } from './StarButton';
 import { Icon } from './icons';
+import { AnimatePresence, m, slide } from '@/lib/motion';
 
 // Panneau latéral d'un Fachbegriff (F4a D2/D9/D10) : la fiche (TermSheet), ou
 // la carte recto/verso comme au drill (« Carte ») ; l'étoile des decks ; la
 // corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
+// Verre plein ; glisse depuis la droite et repart par là (F4b P1/P9).
 export function GlossaryDrawer() {
   const opened = useUi((s) => s.glossaryTerm);
   const close = useUi((s) => s.closeGlossary);
@@ -45,7 +47,7 @@ export function GlossaryDrawer() {
     openedOn.current = pathname;
   }, [pathname, close]);
 
-  if (!opened) return null;
+  if (!opened) return <AnimatePresence>{null}</AnimatePresence>;   // même instance : la sortie du tiroir se joue
   // Carte personnelle : la version VIVANTE (Bedeutung modifiée, D8), pas l'instantané de l'ouverture.
   const live = isPersonalView(opened) ? personalTerms?.find((p) => p.id === opened.id) : undefined;
   const fb = live ? toView(live) : opened;
@@ -59,9 +61,9 @@ export function GlossaryDrawer() {
   };
 
   return (
-    <>
-      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
-      <aside className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col border-y-0 border-r-0">
+    <AnimatePresence>
+      <m.div key="glossary-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
+      <m.aside key="glossary-drawer" {...slide('right')} className="glass-full glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-y-0 border-r-0">
         <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
           <div className="label">{personal ? 'Ma carte' : 'Fachbegriff'}</div>
           <div className="flex items-center gap-1">
@@ -110,7 +112,7 @@ export function GlossaryDrawer() {
         <div className="border-t border-slate-100 p-4 dark:border-slate-800">
           <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
         </div>
-      </aside>
-    </>
+      </m.aside>
+    </AnimatePresence>
   );
 }
```

- [ ] **Step 4 : vérifier** — test → 0 ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/components/GlossaryDrawer.tsx
git add src/components/GlossaryDrawer.test.tsx
git commit -m "feat(fachbegriffe): tiroir d'un terme en verre plein, glisse depuis la droite (F4b P1/P9)"
```

---

### Task E4 : Onglets de decks sur le bord gauche du tiroir d'un terme (front-implementer, Sonnet ; relecture ux-user-advocate)

**Files:**
- Create: `app/src/components/DeckRail.tsx`
- Delete: `app/src/components/DeckChecklist.tsx`
- Modify: `app/src/components/GlossaryDrawer.tsx` (+ test), `app/src/components/StarButton.tsx` (+ test), `app/src/components/TermHoverCard.test.tsx`, `app/src/features/fachbegriffe/CaseTermsPanel.test.tsx`
- Modify: `app/src/features/fachbegriffe/DeckManager.tsx` (+ test), `DeckSheet.tsx`, `FachbegriffePage.tsx` (+ test)

**Interfaces:**
- Consumes : E1 (`usePendingDeletions`, `scheduleDeletion(…, 'deck')`), E2 (`DeckManager`), E3 (tiroir), B1 (`StarGlyph`), `addTermToDeck`, `removeTermFromDeck`, `createDeck`, `decksOfTerm` (existants).
- Produces :
  - `DeckRail({ termId: string, caseId?: string, onManage: () => void })` — `role="group"` « Decks de ce terme » ; boutons `aria-pressed` (Favoris, decks manuels par date), decks intelligents `disabled` avec l'icône « Deck intelligent », « ⋯ Decks » (`aria-label="Gérer les decks"`, `aria-haspopup="dialog"`). Classes : `overflow-x-auto` (bande, téléphone) ; `md:absolute md:right-full md:flex-col` (colonne qui sort du bord gauche du tiroir).
  - `DeckManager({ decks, counts, onClose })` — **plus de `onCreate`** : création d'un deck manuel sur place (« Nom du nouveau deck » + « Créer ») ; `z-[60]` (au-dessus du tiroir), rend le focus à l'ouvreur.
  - `StarButton` : ★ pleine → `useUi().openGlossary(term)` (`aria-haspopup="dialog"`), rien n'est émis ; ★ vide inchangée (Favoris + pilule).
  - `DeckSheet({ initialQuery?, specialties, centers, onClose: (createdId?: string) => void })` — création seule.
  - `GlossaryDrawer` : plus d'étoile dans l'en-tête ; Échap ferme d'abord le tiroir de gestion (`[role="dialog"][aria-label="Decks"]`).

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/components/GlossaryDrawer.test.tsx
+++ b/app/src/components/GlossaryDrawer.test.tsx
@@ -1,5 +1,5 @@
 import { describe, it, expect, beforeEach, vi } from 'vitest';
-import { render, screen, fireEvent, waitFor } from '@testing-library/react';
+import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
 import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
 import { db } from '@/db/db';
 import { useUi } from '@/store/ui';
@@ -37,17 +37,28 @@ describe('GlossaryDrawer (F4a)', () => {
     expect(await screen.findByText('Bauch')).toBeTruthy();
     expect(document.body.textContent).not.toMatch(/patientengerecht/i);
   });
-  it('★ vide → Favoris ; ★ pleine → decks du terme, cocher un deck l\'y range (D6)', async () => {
-    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
+  it('onglets du terme (F4b P6) : allumé = rangé ; toucher range / retire ; intelligent inerte ; plus d\'étoile', async () => {
+    await db.progress_events.bulkPut([
+      { id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' },
+      { id: 'e2', user_id: 'u', type: 'deck.created', subject_id: 's1', payload: { name: 'À revoir', kind: 'smart', query: {} }, occurred_at: '2020-01-02T00:00:00Z' },
+    ] as never);
     const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
     renderDrawer();
-    const starBtn = await screen.findByRole('button', { name: 'Ajouter aux favoris : Abdomen' });
-    await waitFor(() => expect(starBtn.hasAttribute('disabled')).toBe(false));   // decks en chargement : étoile inerte (revue C4)
-    fireEvent.click(starBtn);
+    const rail = await screen.findByRole('group', { name: 'Decks de ce terme' });
+    expect(screen.queryByRole('button', { name: /Ajouter aux favoris/ })).toBeNull();
+    const fav = within(rail).getByRole('button', { name: /Favoris/ });
+    expect(fav.getAttribute('aria-pressed')).toBe('false');
+    fireEvent.click(fav);
     await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
-    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
-    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
+    await waitFor(() => expect(within(rail).getByRole('button', { name: /Favoris/ }).getAttribute('aria-pressed')).toBe('true'));
+    fireEvent.click(within(rail).getByRole('button', { name: 'Kardio' }));
     await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
+    await waitFor(() => expect(within(rail).getByRole('button', { name: 'Kardio' }).getAttribute('aria-pressed')).toBe('true'));
+    fireEvent.click(within(rail).getByRole('button', { name: 'Kardio' }));
+    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeUndefined());
+    expect((within(rail).getByRole('button', { name: /À revoir/ }) as HTMLButtonElement).disabled).toBe(true);
+    for (const b of within(rail).getAllByRole('button')) { expect(b.className).toContain('min-h-11'); expect(b.className).toContain('glass-thin'); }
+    for (const c of ['overflow-x-auto', 'md:absolute', 'md:right-full', 'md:flex-col']) expect(rail.className).toContain(c);
   });
   it('« Carte » retourne la fiche en carte recto/verso comme au drill (D9, AC-8)', async () => {
     renderDrawer();
@@ -59,13 +70,12 @@ describe('GlossaryDrawer (F4a)', () => {
     fireEvent.click(screen.getByRole('button', { name: 'Fiche' }));
     expect(document.querySelector('[data-card-flip]')).toBeNull();
   });
-  it('Échap ferme le panneau ; avec la liste des decks ouverte, Échap ne ferme que la liste', async () => {
-    await db.favorites.put({ termId: 'fb-a', since: '' } as never);
+  it('« ⋯ Decks » ouvre la gestion ; Échap ne ferme qu\'elle, puis le panneau', async () => {
     renderDrawer();
-    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
-    await screen.findByRole('menu');
+    fireEvent.click(await screen.findByRole('button', { name: 'Gérer les decks' }));
+    expect(await screen.findByRole('dialog', { name: 'Decks' })).toBeTruthy();
     fireEvent.keyDown(document, { key: 'Escape' });
-    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
+    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Decks' })).toBeNull());
     expect(useUi.getState().glossaryTerm).toBeTruthy();
     fireEvent.keyDown(document, { key: 'Escape' });
     await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
```

```diff
--- a/app/src/components/StarButton.test.tsx
+++ b/app/src/components/StarButton.test.tsx
@@ -61,41 +61,20 @@ describe('StarButton + CardToast (F4a D6/D7, AC-6)', () => {
     expect(await db.favorites.get('fb-aszites')).toBeUndefined();
     expect(await screen.findByText('Leber', { selector: 'strong' })).toBeTruthy();
   });
-  it('★ pleine (terme dans un deck, pas en Favoris) → liste ses decks ; décocher retire', async () => {
+  it('★ pleine (terme dans un deck) → ouvre la fiche du terme, sans rien émettre (F4b P6 : les decks se rangent dans ses onglets)', async () => {
+    const { useUi } = await import('@/store/ui');
+    useUi.setState({ glossaryTerm: null });
     const deckId = await createDeck('Leber', 'manual');
     await addTermToDeck(deckId, 'fb-aszites');
+    const before = (await db.progress_events.toArray()).length;
     render(<Harness />);
-    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Aszites' }));
-    expect((await screen.findByRole('menuitemcheckbox', { name: /Favoris/ })).getAttribute('aria-checked')).toBe('false');
-    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Leber/ }));
-    await waitFor(async () => expect(await db.deck_terms.get([deckId, 'fb-aszites'])).toBeUndefined());
-    expect(await screen.findByRole('button', { name: 'Ajouter aux favoris : Aszites' })).toBeTruthy();
+    const full = await screen.findByRole('button', { name: 'Decks de Aszites' });
+    expect(full.getAttribute('aria-haspopup')).toBe('dialog');
+    fireEvent.click(full);
+    expect(useUi.getState().glossaryTerm?.id).toBe('fb-aszites');
+    expect((await db.progress_events.toArray()).length).toBe(before);
     expect(FAVORITES_DECK_ID).toBe('deck-favorites');
-  });
-  it('checklist : « + » crée le deck ET y range le terme (revue C4)', async () => {
-    await addTermToDeck(FAVORITES_DECK_ID, 'fb-aszites');
-    render(<Harness />);
-    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Aszites' }));
-    fireEvent.change(await screen.findByRole('textbox', { name: 'Nom du nouveau deck' }), { target: { value: 'Hepato' } });
-    fireEvent.click(screen.getByRole('button', { name: 'Créer le deck et y ranger ce terme' }));
-    await waitFor(async () => {
-      const deck = (await db.decks.toArray()).find((d) => d.name === 'Hepato');
-      expect(deck && (await db.deck_terms.get([deck.id, 'fb-aszites']))).toBeTruthy();
-    });
-  });
-  it("l'ancre du menu decks repart de zéro quand le terme redevient sans deck puis en regagne un (m4)", async () => {
-    const deckId = await createDeck('Leber', 'manual');
-    await addTermToDeck(deckId, 'fb-aszites');
-    render(<Harness />);
-    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Aszites' }));
-    await screen.findByRole('menu');
-    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Leber/ }));
-    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
-    await screen.findByRole('button', { name: 'Ajouter aux favoris : Aszites' });
-    await addTermToDeck(deckId, 'fb-aszites');
-    const starBtn = await screen.findByRole('button', { name: 'Decks de Aszites' });
-    fireEvent.click(starBtn);
-    expect(await screen.findByRole('menu')).toBeTruthy();
+    useUi.setState({ glossaryTerm: null });
   });
   it('Échap ferme la confirmation (revue C4)', async () => {
     render(<Harness />);
```

```diff
--- a/app/src/components/TermHoverCard.test.tsx
+++ b/app/src/components/TermHoverCard.test.tsx
@@ -46,15 +46,14 @@ describe('TermHoverCard', () => {
     expect(await screen.findByRole('dialog')).toBeTruthy();
     expect(screen.getByText('Abdomen')).toBeTruthy(); expect(screen.getByText(/Bauch/)).toBeTruthy();
   });
-  it('★ = Favoris immédiat avec caseId du store ; ★ pleine → decks du terme, décocher Favoris retire (F4a D6)', async () => {
+  it('★ = Favoris immédiat avec caseId du store ; ★ pleine → ouvre la fiche du terme, où vivent ses onglets de decks (F4b P6)', async () => {
     act(() => useUi.getState().openHover(fb, anchor, 'c9'));
     render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
     fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
     await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c9' }));
     fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
-    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Favoris/ }));
-    await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(true));
-    expect(screen.getByRole('dialog')).toBeTruthy();   // la liste des decks ne referme pas la carte
+    expect(useUi.getState().glossaryTerm?.id).toBe('fb-a');
+    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(false);
   });
   it('Échap et clic extérieur ferment', async () => {
     act(() => useUi.getState().openHover(fb, anchor));
```

```diff
--- a/app/src/features/fachbegriffe/CaseTermsPanel.test.tsx
+++ b/app/src/features/fachbegriffe/CaseTermsPanel.test.tsx
@@ -54,17 +54,19 @@ describe('CaseTermsPanel', () => {
     chip.remove();
   });
 
-  it('mode drawer : liste des decks ouverte, Échap la ferme d\'abord, pas le panneau (m3)', async () => {
+  it('mode drawer : ★ pleine ouvre la fiche du terme ; Échap, fiche ouverte, ne ferme pas le panneau (m3, F4b P6)', async () => {
+    const { useUi } = await import('@/store/ui');
+    useUi.setState({ glossaryTerm: null });
     await db.decks.put({ id: 'd1', name: 'Kardio', kind: 'manual', createdAt: '', updatedAt: '' } as never);
     await db.deck_terms.put({ deckId: 'd1', termId: 'fb-a', addedAt: '' } as never);
     const onClose = vi.fn();
     render(<MemoryRouter><CaseTermsPanel caseId="c1" mode="drawer" onClose={onClose} onDrill={() => {}} /></MemoryRouter>);
     await screen.findByRole('dialog');
     fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
-    await screen.findByRole('menu');
+    expect(useUi.getState().glossaryTerm?.id).toBe('fb-a');
     fireEvent.keyDown(document, { key: 'Escape' });
-    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
     expect(onClose).not.toHaveBeenCalled();
+    useUi.setState({ glossaryTerm: null });
   });
 
   it('un terme avec register affiche register.patient au lieu de translationSimple (C2)', async () => {
```

```diff
--- a/app/src/features/fachbegriffe/DeckManager.test.tsx
+++ b/app/src/features/fachbegriffe/DeckManager.test.tsx
@@ -19,8 +19,8 @@ vi.mock('@/lib/sync/queue', async () => {
 });
 
 const decks = () => db.decks.toArray();
-function renderManager(onCreate = vi.fn(), onClose = vi.fn()) {
-  return decks().then((d) => render(<><DeckManager decks={d} counts={{ 'deck-favorites': 2 }} onCreate={onCreate} onClose={onClose} /><CardToast /></>));
+function renderManager(onClose = vi.fn()) {
+  return decks().then((d) => render(<><DeckManager decks={d} counts={{ 'deck-favorites': 2 }} onClose={onClose} /><CardToast /></>));
 }
 
 describe('DeckManager (F4b P6, AC-5)', () => {
@@ -59,14 +59,15 @@ describe('DeckManager (F4b P6, AC-5)', () => {
     expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.deleted')).toBe(false);
     expect(cancelDeletion(id)).toBe(false);
   });
-  it('deck intelligent : icône, renommable ; « Nouveau deck » et Échap délèguent', async () => {
+  it('deck intelligent : icône ; créer un deck manuel sur place ; Échap délègue', async () => {
     await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 's1', payload: { name: 'À revoir', kind: 'smart', query: { state: 'Zu wiederholen' } }, occurred_at: '2020-01-01T00:00:00Z' } as never);
     await reprojectCollections();
-    const onCreate = vi.fn(); const onClose = vi.fn();
-    await renderManager(onCreate, onClose);
+    const onClose = vi.fn();
+    await renderManager(onClose);
     expect(screen.getByRole('img', { name: 'Deck intelligent' })).toBeTruthy();
-    fireEvent.click(screen.getByRole('button', { name: 'Nouveau deck' }));
-    expect(onCreate).toHaveBeenCalled();
+    fireEvent.change(screen.getByRole('textbox', { name: 'Nom du nouveau deck' }), { target: { value: 'Hepato' } });
+    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
+    await waitFor(async () => expect((await db.decks.toArray()).some((d) => d.name === 'Hepato' && d.kind === 'manual')).toBe(true));
     fireEvent.keyDown(document, { key: 'Escape' });
     expect(onClose).toHaveBeenCalled();
   });
```

```diff
--- a/app/src/features/fachbegriffe/FachbegriffePage.test.tsx
+++ b/app/src/features/fachbegriffe/FachbegriffePage.test.tsx
@@ -1,5 +1,5 @@
 import { describe, it, expect, beforeEach, vi } from 'vitest';
-import { render, screen, fireEvent, waitFor } from '@testing-library/react';
+import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
 import { MemoryRouter } from 'react-router-dom';
 import { db } from '@/db/db';
 import { freshSrs } from '@/lib/srs';
@@ -85,4 +85,16 @@ describe('FachbegriffePage', () => {
     expect(tab.getAttribute('aria-selected')).toBe('true');
     expect((screen.getByRole('link', { name: /drill/i }) as HTMLAnchorElement).getAttribute('href')).toContain('deck=d1');
   });
+  it('un deck en attente de suppression (Annuler 5 s) disparaît des onglets ; Annuler le rend (F4b P6)', async () => {
+    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Mon deck', kind: 'manual' }, occurred_at: '2026-09-17T10:00:00Z' } as never);
+    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
+    const { scheduleDeletion, cancelDeletion } = await import('@/lib/collections/pendingDeletion');
+    renderAt();
+    await screen.findByRole('tab', { name: /mon deck/i });
+    await act(async () => { await scheduleDeletion('d1', 60_000, 'deck'); });
+    await waitFor(() => expect(screen.queryByRole('tab', { name: /mon deck/i })).toBeNull());
+    act(() => { cancelDeletion('d1'); });
+    expect(await screen.findByRole('tab', { name: /mon deck/i })).toBeTruthy();
+    expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.deleted')).toBe(false);
+  });
 });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/components src/features/fachbegriffe; echo exit=$?` → ≠ 0 (groupe « Decks de ce terme » introuvable ; `menuitemcheckbox` attendu par l'ancien comportement disparu ; champ « Nom du nouveau deck » absent du tiroir de gestion).

- [ ] **Step 3 : implémentation** — créer `app/src/components/DeckRail.tsx` :

```tsx
// ============================================================================
// Onglets des decks d'UN terme (F4b P6) — verre fin, dans le tiroir latéral
// (GlossaryDrawer). Ordinateur (md+) : une colonne d'onglets qui SORTENT du
// bord gauche du tiroir ; téléphone : les mêmes en bande horizontale en haut
// du tiroir (défile seule). Onglet allumé = le terme est rangé dans ce deck ;
// toucher = ranger / retirer (addTermToDeck / removeTermFromDeck, rien de
// nouveau). Decks intelligents : icône, jamais rangeables à la main (inertes).
// « ⋯ Decks » ouvre le tiroir de gestion. Remplace l'étoile du tiroir.
// ============================================================================
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, removeTermFromDeck } from '@/lib/collections';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { decksOfTerm } from '@/lib/collections/query';
import { Icon } from './icons';
import { StarGlyph } from './StarButton';

const tab = 'glass-thin group flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-700 transition-colors hover:text-brand-700 aria-pressed:bg-brand-600 aria-pressed:text-white disabled:opacity-60 dark:text-slate-200 md:max-w-[10rem] md:rounded-l-full md:rounded-r-none md:border-r-0';

export function DeckRail({ termId, caseId, onManage }: { termId: string; caseId?: string; onManage: () => void }) {
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const hidden = usePendingDeletions((s) => s.ids);
  if (!decks || !deckTerms || !favorites) return null;   // états inconnus : rien à toucher (comme DeckChecklist)
  const has = new Set(decksOfTerm(termId, favorites, deckTerms));
  const byDate = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
  const visible = decks.filter((d) => !hidden.has(d.id));
  const rows = [...visible.filter((d) => d.kind === 'manual').sort(byDate), ...visible.filter((d) => d.kind === 'smart').sort(byDate)];
  const opts = caseId ? { caseId } : {};
  const toggle = (id: string) => { void (has.has(id) ? removeTermFromDeck(id, termId) : addTermToDeck(id, termId, opts)); };
  return (
    <div role="group" aria-label="Decks de ce terme"
      className="flex gap-1.5 overflow-x-auto border-b border-white/40 px-4 py-2 dark:border-white/10 md:absolute md:right-full md:top-16 md:w-40 md:flex-col md:items-end md:overflow-visible md:border-0 md:p-0">
      <button type="button" aria-pressed={has.has(FAVORITES_DECK_ID)} onClick={() => toggle(FAVORITES_DECK_ID)} className={tab}>
        <span className="text-star-600 group-aria-pressed:text-star-300 dark:text-star-400"><StarGlyph filled={has.has(FAVORITES_DECK_ID)} /></span>
        <span className="truncate">Favoris</span>
      </button>
      {rows.map((d) => d.kind === 'smart' ? (
        <button key={d.id} type="button" disabled title="Se remplit tout seul" className={tab}>
          <Icon name="bolt" className="h-4 w-4 shrink-0" title="Deck intelligent" /><span className="truncate">{d.name}</span>
        </button>
      ) : (
        <button key={d.id} type="button" aria-pressed={has.has(d.id)} onClick={() => toggle(d.id)} className={tab}><span className="truncate">{d.name}</span></button>
      ))}
      <button type="button" onClick={onManage} aria-haspopup="dialog" aria-label="Gérer les decks" className={`${tab} text-slate-500`}>⋯ Decks</button>
    </div>
  );
}
```

```diff
--- a/app/src/components/GlossaryDrawer.tsx
+++ b/app/src/components/GlossaryDrawer.tsx
@@ -2,19 +2,22 @@ import { useEffect, useRef, useState } from 'react';
 import { Link, useLocation } from 'react-router-dom';
 import { useUi } from '@/store/ui';
 import { useCardToast } from '@/store/cardToast';
-import { useCases, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
+import { useCases, useDecks, useDeckTerms, useFavorites, usePersonalTerms } from '@/hooks/useData';
 import { scheduleDeletion } from '@/lib/collections/pendingDeletion';
 import { isPersonalView, toView } from '@/lib/collections/allTerms';
 import { SRS_TONE } from '@/lib/srsTone';
 import { TermSheet } from './TermSheet';
 import { CardFlip } from './CardFlip';
-import { StarButton } from './StarButton';
+import { DeckRail } from './DeckRail';
+import { DeckManager } from '@/features/fachbegriffe/DeckManager';
 import { Icon } from './icons';
 import { AnimatePresence, m, slide } from '@/lib/motion';
+import { FAVORITES_DECK_ID } from '@/db/types';
 
 // Panneau latéral d'un Fachbegriff (F4a D2/D9/D10) : la fiche (TermSheet), ou
-// la carte recto/verso comme au drill (« Carte ») ; l'étoile des decks ; la
-// corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
+// la carte recto/verso comme au drill (« Carte ») ; les onglets de decks du
+// terme (DeckRail, F4b P6 — remplacent l'étoile) et leur gestion (DeckManager) ;
+// la corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
 // Verre plein ; glisse depuis la droite et repart par là (F4b P1/P9).
 export function GlossaryDrawer() {
   const opened = useUi((s) => s.glossaryTerm);
@@ -24,11 +27,12 @@ export function GlossaryDrawer() {
   const { pathname } = useLocation();
   const cases = useCases();
   const personalTerms = usePersonalTerms();
-  const inDecks = useTermsInDecks();
+  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
+  const [manager, setManager] = useState(false);
   const [view, setView] = useState<'sheet' | 'card'>('sheet');
   const [revealed, setRevealed] = useState(false);
   const [deleteError, setDeleteError] = useState<string | null>(null);
-  useEffect(() => { setView('sheet'); setRevealed(false); setDeleteError(null); }, [opened?.id]);
+  useEffect(() => { setView('sheet'); setRevealed(false); setDeleteError(null); setManager(false); }, [opened?.id]);
 
   // Ouverture : la hover-card ★ cède la place (une seule carte à l'écran).
   // Échap ferme le panneau — sauf si une liste de decks est ouverte (elle se ferme d'abord).
@@ -36,7 +40,8 @@ export function GlossaryDrawer() {
   useEffect(() => { if (open) closeHover(); }, [open, closeHover]);
   useEffect(() => {
     if (!open) return;
-    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="menu"][data-keep-open]')) close(); };
+    // … ou le tiroir de gestion des decks (il se ferme d'abord).
+    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="menu"][data-keep-open], [role="dialog"][aria-label="Decks"]')) close(); };
     document.addEventListener('keydown', onKeyDown);
     return () => document.removeEventListener('keydown', onKeyDown);
   }, [open, close]);
@@ -54,6 +59,8 @@ export function GlossaryDrawer() {
   const personal = isPersonalView(fb);
   const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));
 
+  const counts: Record<string, number> = { [FAVORITES_DECK_ID]: favorites?.length ?? 0 };
+  for (const t of deckTerms ?? []) counts[t.deckId] = (counts[t.deckId] ?? 0) + 1;
   const remove = () => {
     scheduleDeletion(fb.id)
       .then(() => { showToast({ kind: 'deleted', term: fb }); close(); })
@@ -64,10 +71,10 @@ export function GlossaryDrawer() {
     <AnimatePresence>
       <m.div key="glossary-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
       <m.aside key="glossary-drawer" {...slide('right')} className="glass-full glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-y-0 border-r-0">
+        <DeckRail termId={fb.id} onManage={() => setManager(true)} />
         <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
           <div className="label">{personal ? 'Ma carte' : 'Fachbegriff'}</div>
           <div className="flex items-center gap-1">
-            <StarButton term={fb} filled={inDecks?.has(fb.id)} />
             <button type="button" aria-pressed={view === 'card'} onClick={() => { setView((v) => (v === 'card' ? 'sheet' : 'card')); setRevealed(false); }}
               className="btn-ghost min-h-11 px-2 text-sm">{view === 'card' ? 'Fiche' : 'Carte'}</button>
             {personal && (
@@ -113,6 +120,7 @@ export function GlossaryDrawer() {
           <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
         </div>
       </m.aside>
+      {manager && <DeckManager key="deck-manager" decks={decks ?? []} counts={counts} onClose={() => setManager(false)} />}
     </AnimatePresence>
   );
 }
```

```diff
--- a/app/src/components/StarButton.tsx
+++ b/app/src/components/StarButton.tsx
@@ -1,16 +1,17 @@
 // ============================================================================
 // L'étoile (F4a D6) — une seule notion : les decks. ★ vide → le terme est rangé
 // dans Favoris (deck par défaut) et la confirmation montre la carte (D7).
-// ★ pleine = le terme est dans au moins un deck → toucher liste ses decks.
+// ★ pleine = le terme est dans au moins un deck → toucher ouvre sa fiche, dont
+// les onglets de decks (DeckRail, F4b P6) rangent et retirent : un seul endroit.
 // Matière (F4b P3) : vide = cristal (incolore, liseré clair) ; pleine = ambre
 // glassy doux (jeton `star`). Le corail n'habille plus l'étoile.
 // ============================================================================
-import { useEffect, useId, useRef, useState } from 'react';
+import { useId, useRef, useState } from 'react';
 import { FAVORITES_DECK_ID } from '@/db/types';
 import type { AnyTerm } from '@/lib/collections/allTerms';
 import { addTermToDeck } from '@/lib/collections';
 import { useCardToast } from '@/store/cardToast';
-import { DeckChecklist } from './DeckChecklist';
+import { useUi } from '@/store/ui';
 
 const STAR = 'M12 3.6l2.55 5.2 5.75.83-4.16 4.05.98 5.72L12 16.7l-5.12 2.7.98-5.72L3.7 9.63l5.75-.83z';
 
@@ -37,16 +38,13 @@ export function StarGlyph({ filled }: { filled: boolean }) {
 export function StarButton({ term, filled, caseId, buttonRef }: {
   term: AnyTerm; filled: boolean | undefined; caseId?: string; buttonRef?: (el: HTMLButtonElement | null) => void;
 }) {
-  const [anchor, setAnchor] = useState<DOMRect | null>(null);
   const [error, setError] = useState<string | null>(null);
   const busy = useRef(false);
-  // Le terme perd son dernier deck (ex. décoché) : l'ancre repart de zéro, sinon un
-  // prochain clic sur ★ (redevenue pleine) la trouve déjà posée et bascule à vide (m4).
-  useEffect(() => { if (!filled) setAnchor(null); }, [filled]);
+  const openGlossary = useUi((s) => s.openGlossary);
   const show = useCardToast((s) => s.show);
-  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
+  const onClick = async () => {
     if (filled === undefined) return;   // decks en chargement : ni ★ vide trompeuse ni ajout en double
-    if (filled) { const r = e.currentTarget.getBoundingClientRect(); setAnchor((a) => (a ? null : r)); return; }
+    if (filled) { openGlossary(term); return; }
     if (busy.current) return;
     busy.current = true; setError(null);
     try {
@@ -58,11 +56,10 @@ export function StarButton({ term, filled, caseId, buttonRef }: {
   const color = filled ? 'text-star-600 dark:text-star-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100';
   return (
     <>
-      <button ref={buttonRef} type="button" onClick={(e) => { void onClick(e); }} aria-pressed={filled ?? false} aria-busy={filled === undefined || undefined} disabled={filled === undefined}
+      <button ref={buttonRef} type="button" onClick={() => { void onClick(); }} aria-pressed={filled ?? false} aria-busy={filled === undefined || undefined} disabled={filled === undefined}
         aria-label={filled ? `Decks de ${term.term}` : `Ajouter aux favoris : ${term.term}`}
-        aria-haspopup={filled ? 'menu' : undefined} aria-expanded={filled ? !!anchor : undefined}
+        aria-haspopup={filled ? 'dialog' : undefined}
         className={`grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 ${color} ${filled === undefined ? 'invisible' : ''}`}><StarGlyph filled={!!filled} /></button>
-      {anchor && filled && <DeckChecklist termId={term.id} caseId={caseId} anchor={anchor} onClose={() => setAnchor(null)} />}
       {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
     </>
   );
```

```diff
--- a/app/src/features/fachbegriffe/DeckManager.tsx
+++ b/app/src/features/fachbegriffe/DeckManager.tsx
@@ -1,14 +1,15 @@
 // ============================================================================
 // Tiroir de gestion des decks (F4b P6), ouvert par « ⋯ Decks » : renommer
 // (sur place), supprimer (+ Annuler 5 s : rien n'est émis avant l'expiration,
-// pendingDeletion), créer (« Nouveau deck » → DeckSheet). Supprimer un deck
+// pendingDeletion), créer un deck manuel (sur place). Supprimer un deck
 // ne supprime aucune carte. Favoris est réservé : ni renommé, ni supprimé.
-// Verre plein, glisse depuis la gauche (côté des onglets) ; Échap ferme.
+// Verre plein, glisse depuis la gauche (côté des onglets), AU-DESSUS du tiroir
+// d'un terme qui l'ouvre (z-60) ; Échap ne ferme que lui.
 // ============================================================================
 import { useEffect, useRef, useState } from 'react';
 import type { Deck } from '@/db/types';
 import { FAVORITES_DECK_ID } from '@/db/types';
-import { renameDeck } from '@/lib/collections';
+import { createDeck, renameDeck } from '@/lib/collections';
 import { scheduleDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
 import { m, slide } from '@/lib/motion';
 import { useCardToast } from '@/store/cardToast';
@@ -48,23 +49,30 @@ function DeckRow({ deck, count }: { deck: Deck; count: number | undefined }) {
   );
 }
 
-export function DeckManager({ decks, counts, onCreate, onClose }: {
-  decks: Deck[]; counts: Record<string, number>; onCreate: () => void; onClose: () => void;
+export function DeckManager({ decks, counts, onClose }: {
+  decks: Deck[]; counts: Record<string, number>; onClose: () => void;
 }) {
   const hidden = usePendingDeletions((s) => s.ids);
+  const [name, setName] = useState('');
+  const [error, setError] = useState<string | null>(null);
+  const create = async () => {
+    try { await createDeck(name, 'manual'); setName(''); setError(null); }
+    catch (e) { setError(e instanceof Error && e.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de créer le deck.'); }
+  };
   const ref = useRef<HTMLElement>(null);
   useEffect(() => {
     ref.current?.focus();
+    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
     const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
     document.addEventListener('keydown', onKey);
-    return () => document.removeEventListener('keydown', onKey);
+    return () => { document.removeEventListener('keydown', onKey); opener?.focus(); };
   }, [onClose]);
   const shown = decks.filter((d) => !hidden.has(d.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
   return (
     <Portal>
-      <m.div key="deck-manager-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/15" onClick={onClose} />
+      <m.div key="deck-manager-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[55] bg-slate-900/15" onClick={onClose} />
       <m.aside key="deck-manager" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Decks" {...slide('left')}
-        className="glass-full fixed left-0 top-0 z-50 flex h-full w-full max-w-sm flex-col rounded-r-2xl p-4 outline-none">
+        className="glass-full fixed left-0 top-0 z-[60] flex h-full w-full max-w-sm flex-col rounded-r-2xl p-4 outline-none">
         <div className="flex items-center justify-between">
           <h2 className="text-lg">Decks</h2>
           <button type="button" aria-label="Fermer" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/50 dark:hover:bg-white/10">✕</button>
@@ -73,7 +81,12 @@ export function DeckManager({ decks, counts, onCreate, onClose }: {
           <li className="flex min-h-11 items-center gap-1 px-1 text-slate-500">Favoris<span className="ml-auto pr-3 font-mono text-[11px]">{counts[FAVORITES_DECK_ID] ?? 0}</span></li>
           {shown.map((d) => <DeckRow key={d.id} deck={d} count={counts[d.id]} />)}
         </ul>
-        <button type="button" onClick={onCreate} className="btn-primary mt-3 min-h-11 w-full rounded-full">Nouveau deck</button>
+        <div className="mt-3 flex gap-2">
+          <input aria-label="Nom du nouveau deck" value={name} maxLength={40} placeholder="Nouveau deck" onChange={(e) => setName(e.target.value)}
+            onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} className="input min-h-11 flex-1" />
+          <button type="button" onClick={() => { void create(); }} disabled={!name.trim()} className="btn-primary min-h-11 rounded-full">Créer</button>
+        </div>
+        {error && <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
       </m.aside>
     </Portal>
   );
```

Remplacer `app/src/features/fachbegriffe/DeckSheet.tsx` par :

```tsx
import { useEffect, useState } from 'react';
import type { DeckQuery, Specialty, Srs, Center } from '@/db/types';
import { createDeck } from '@/lib/collections';

interface Props { initialQuery?: DeckQuery; specialties: Specialty[]; centers: Center[]; onClose: (createdId?: string) => void }
const STATES: Srs['state'][] = ['Neu', 'Gelernt', 'Zu wiederholen'];

/** Feuille de création d'un deck : nom, type, filtres. Renommer et supprimer
 *  vivent dans le tiroir de gestion (DeckManager, F4b P6). */
export function DeckSheet({ initialQuery, specialties, centers, onClose }: Props) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'manual' | 'smart'>('manual');
  const [query, setQuery] = useState<DeckQuery>(initialQuery ?? {});
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof DeckQuery, v: string) => setQuery((q) => ({ ...q, [k]: v || undefined }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { onClose(await createDeck(name, kind, kind === 'smart' ? query : undefined)); }
    catch (err) { setError((err as Error).message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : (err as Error).message); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={() => onClose()} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label="Nouveau deck" className="glass-full fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md space-y-3 rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="label">Nouveau deck</div>
        <label className="block text-sm"><span className="label">Nom du deck</span><input aria-label="Nom du deck" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="input w-full" autoFocus /></label>
        <div role="radiogroup" aria-label="Type" className="flex gap-3 text-sm">
          <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'manual'} onChange={() => setKind('manual')} aria-label="Liste manuelle" />Liste manuelle</label>
          <label className="flex items-center gap-1.5"><input type="radio" name="kind" checked={kind === 'smart'} onChange={() => setKind('smart')} aria-label="Deck intelligent" />Deck intelligent</label>
        </div>
        {kind === 'smart' && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label><span className="label">Recherche</span><input aria-label="Recherche" value={query.q ?? ''} onChange={(e) => set('q', e.target.value)} className="input w-full" /></label>
            <label><span className="label">Spécialité</span><select aria-label="Spécialité" value={query.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)} className="input w-full"><option value="">Toutes</option>{specialties.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">État</span><select aria-label="État" value={query.state ?? ''} onChange={(e) => set('state', e.target.value)} className="input w-full"><option value="">Tous</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label><span className="label">Centre</span><select aria-label="Centre" value={query.center ?? ''} onChange={(e) => set('center', e.target.value)} className="input w-full"><option value="">Tous</option>{centers.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
        )}
        {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => onClose()} className="btn-outline min-h-11">Annuler</button><button type="submit" className="btn-primary min-h-11">Créer</button></div>
      </form>
    </>
  );
}
```

```diff
--- a/app/src/features/fachbegriffe/FachbegriffePage.tsx
+++ b/app/src/features/fachbegriffe/FachbegriffePage.tsx
@@ -10,23 +10,31 @@ import { EmptyState } from '@/components/ui';
 import { applyQuery, termsOfDeck } from '@/lib/collections/query';
 import { removeFromDeck, setDeckQuery } from '@/lib/collections';
 import { loadDrillContext } from '@/lib/collections/drillContext';
+import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
 import { drillMinutes } from '@/lib/collections/relevance';
 import { sortDe, letterOf } from './letters';
 import { TermList, type TermListHandle } from './TermList';
 import { AlphabetRail } from './AlphabetRail';
 import { DeckTabs } from './DeckTabs';
 import { DeckSheet } from './DeckSheet';
+import { DeckManager } from './DeckManager';
+import { AnimatePresence } from '@/lib/motion';
 import { SrsSettingsSheet } from './SrsSettingsSheet';
 
 const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };
 
 export function FachbegriffePage() {
-  const begriffe = useAllTerms(); const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites(); const inDecks = useTermsInDecks();
+  const begriffe = useAllTerms(); const allDecks = useDecks();
+  // Un deck supprimé depuis le tiroir d'un terme (Annuler 5 s, F4b P6) disparaît déjà des onglets.
+  const pendingIds = usePendingDeletions((s) => s.ids);
+  const decks = useMemo(() => allDecks?.filter((d) => !pendingIds.has(d.id)), [allDecks, pendingIds]);
+  const deckTerms = useDeckTerms(); const favorites = useFavorites(); const inDecks = useTermsInDecks();
   const openGlossary = useUi((s) => s.openGlossary);
   const [params, setParams] = useSearchParams();
   const activeId = params.get('deck');
   const [filters, setFilters] = useState<DeckQuery>({});
-  const [sheet, setSheet] = useState<null | { mode: 'create' } | { mode: 'edit' }>(null);
+  const [sheet, setSheet] = useState(false);
+  const [manager, setManager] = useState(false);   // renommer / supprimer : le même tiroir que depuis la fiche d'un terme (F4b P6)
   const listRef = useRef<TermListHandle>(null);
   const pendingIdRef = useRef<string | null>(null);
   const [remaining, setRemaining] = useState(0);
@@ -92,14 +100,14 @@ export function FachbegriffePage() {
           </p>
         </div>
         <div className="flex items-center gap-2">
-          {activeDeck && activeId !== FAVORITES_DECK_ID && <button type="button" onClick={() => setSheet({ mode: 'edit' })} className="btn-outline min-h-11 min-w-11 justify-center" aria-label="Gérer le deck">⋯</button>}
+          <button type="button" onClick={() => setManager(true)} className="btn-outline min-h-11 min-w-11 justify-center" aria-label="Gérer les decks">⋯</button>
           <button type="button" onClick={() => setSrsSheet(true)} className="btn-outline min-h-11 gap-1.5" aria-label="Répétitions"><Icon name="gear" className="h-4 w-4" />Répétitions</button>
           <Link to={drillHref} className="btn-primary gap-1.5"><Icon name="nav-abc" className="h-4 w-4" />{`Drill${activeDeck ? ` · ${activeDeck.name}` : ''} (${due + fresh})`}</Link>
           {due + fresh > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">≈ {drillMinutes(due + fresh)} min</span>}
         </div>
       </header>
 
-      <DeckTabs decks={decks} activeId={activeId} counts={counts} onSelect={select} onCreate={() => setSheet({ mode: 'create' })} />
+      <DeckTabs decks={decks} activeId={activeId} counts={counts} onSelect={select} onCreate={() => setSheet(true)} />
 
       <div className="card flex flex-wrap items-end gap-3 p-3">
         <div className="min-w-[160px] flex-1"><label className="label">Recherche</label><input value={effective.q ?? ''} onChange={(e) => set('q', e.target.value)} placeholder="Terme, traduction…" className="input mt-1" /></div>
@@ -119,8 +127,11 @@ export function FachbegriffePage() {
         </div>
       )}
 
-      {sheet && <DeckSheet mode={sheet.mode} deck={sheet.mode === 'edit' ? (activeDeck as never) : undefined} initialQuery={filters} specialties={specialties} centers={centers}
-        onClose={(createdId, opts) => { setSheet(null); if (createdId) { pendingIdRef.current = createdId; select(createdId); } else if (opts?.deleted) select(null); }} />}
+      <AnimatePresence>
+        {manager && <DeckManager key="deck-manager" decks={decks} counts={counts} onClose={() => setManager(false)} />}
+      </AnimatePresence>
+      {sheet && <DeckSheet initialQuery={filters} specialties={specialties} centers={centers}
+        onClose={(createdId) => { setSheet(false); if (createdId) { pendingIdRef.current = createdId; select(createdId); } }} />}
       {srsSheet && <SrsSettingsSheet onClose={() => { setSrsSheet(false); reloadCtx(); }} />}
     </div>
   );
```

Supprimer le menu devenu doublon : `git rm src/components/DeckChecklist.tsx` (`grep -rn DeckChecklist src; echo exit=$?` → `exit=1`).

Note : les onglets du tiroir n'ont pas de `caseId` (le tiroir vit dans `Shell`, hors du contexte du cas) — un rangement fait depuis le tiroir ne marque pas « pendant ce cas » ; l'étoile vide des listes du cas, elle, le marque toujours.

- [ ] **Step 4 : vérifier** — `npx vitest run --dir src; echo exit=$?` → 0 ; gates ; **bundle** (G3) ≤ +30 Kio.

- [ ] **Step 5 : commit**
```bash
git add src/components/DeckRail.tsx
git add src/components/GlossaryDrawer.tsx
git add src/components/GlossaryDrawer.test.tsx
git add src/components/StarButton.tsx
git add src/components/StarButton.test.tsx
git add src/components/TermHoverCard.test.tsx
git add src/features/fachbegriffe/CaseTermsPanel.test.tsx
git add src/features/fachbegriffe/DeckManager.tsx
git add src/features/fachbegriffe/DeckManager.test.tsx
git add src/features/fachbegriffe/DeckSheet.tsx
git add src/features/fachbegriffe/FachbegriffePage.tsx
git add src/features/fachbegriffe/FachbegriffePage.test.tsx
git commit -m "feat(fachbegriffe): onglets de decks sur le bord gauche du tiroir d'un terme — allumé = rangé, toucher = ranger/retirer (F4b P6)"
```
(`git rm` a déjà stagé la suppression de `DeckChecklist.tsx`.)

---

# Tranche F — Drill (P7, P10)

### Task F1 : Carte d'embarquement du drill, relevés comptés une fois (front-implementer, Sonnet ; relecture product-pedagogy-designer)

**Files:**
- Modify: `app/src/lib/motion.ts`, `app/src/lib/motion.test.tsx` (`useCountUp`)
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx` (bloc `if (!started)`), `app/src/features/fachbegriffe/DrillPage.test.tsx`

**Interfaces:**
- Consumes : A1 (`appear`, `m`, `mayMove` interne), `queueCounts`, `nextDueAt`, `drillMinutes`, `recentCaseAnchor` (inchangés).
- Produces : `useCountUp(to: number, ms = 600): number` ; relevés `[data-readout="à revoir" | "nouveaux" | "≈ min"]` (`dd` en `font-mono`) ; bascule `button[aria-pressed]` « Terme → sens » / « Sens → terme » avec exemple ; bouton « Commencer (N cartes) » ; état vide « À jour ✓ — prochain terme dû le <jour mois> ».

- [ ] **Step 1 : tests qui échouent**

```diff
--- a/app/src/lib/motion.test.tsx
+++ b/app/src/lib/motion.test.tsx
@@ -2,7 +2,7 @@
 import { useContext, useState } from 'react';
 import { render, screen, fireEvent, waitFor } from '@testing-library/react';
 import { MotionConfigContext } from 'motion/react';
-import { AnimatePresence, m, appear, MotionRoot, flyFrom, settleOrClose, expand } from './motion';
+import { AnimatePresence, m, appear, MotionRoot, flyFrom, settleOrClose, expand, useCountUp } from './motion';
 
 // jsdom n'a pas matchMedia : une requête pilotable, avec son événement `change`
 // (motion l'écoute une fois, au premier useReducedMotion).
@@ -64,3 +64,20 @@
     mql.matches = false;
   });
 });
+
+describe('compter (F4b P10)', () => {
+  function Count({ to }: { to: number }) { return <span data-testid="n">{useCountUp(to, 50)}</span>; }
+  it('compte de 0 à la valeur à l\'apparition, puis affiche les changements tels quels', async () => {
+    const { rerender } = render(<Count to={42} />);
+    expect(screen.getByTestId('n').textContent).toBe('0');
+    await waitFor(() => expect(screen.getByTestId('n').textContent).toBe('42'));
+    rerender(<Count to={7} />);
+    expect(screen.getByTestId('n').textContent).toBe('7');
+  });
+  it('mouvement réduit : la valeur tout de suite', () => {
+    mql.matches = true;
+    render(<Count to={42} />);
+    expect(screen.getByTestId('n').textContent).toBe('42');
+    mql.matches = false;
+  });
+});
```

```diff
--- a/app/src/features/fachbegriffe/DrillPage.test.tsx
+++ b/app/src/features/fachbegriffe/DrillPage.test.tsx
@@ -77,7 +77,7 @@ describe('DrillPage — pas de boucle de rendu', () => {
     await db.fachbegriffe.bulkPut([{ id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }, { id: 'fb-z', term: 'Zyste', translationSimple: 'Z', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() }] as never);
     renderAt('/fachbegriffe/drill?case=c1');
     expect(await screen.findByText(/Termes de Ulcus ventriculi/)).toBeTruthy();
-    expect(screen.getByText(/1 nouveaux/)).toBeTruthy(); // fb-a seulement, jamais fb-z
+    expect(document.querySelector('[data-readout="nouveaux"] dd')!.textContent).toBe('1'); // fb-a seulement, jamais fb-z
   });
 
   it('?case= sans rien à réviser → « Réviser la spécialité »', async () => {
@@ -85,7 +85,7 @@ describe('DrillPage — pas de boucle de rendu', () => {
     await db.cases.put({ id: 'c2', name: 'Angina', specialty: 'Kardiologie', linkedFachbegriffeIds: ['fb-k'] } as never);
     await db.fachbegriffe.put({ id: 'fb-k', term: 'Koronar', translationSimple: 'K', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never);
     renderAt('/fachbegriffe/drill?case=c2');
-    const btn = await screen.findByRole('link', { name: /Réviser la spécialité Kardiologie/ });
+    const btn = await screen.findByRole('link', { name: /Réviser la spécialité Kardiologie/ }, { timeout: 3000 });   // sous charge (suite complète), le cas charge après 1 s
     expect(btn.getAttribute('href')).toContain('specialty=Kardiologie');
   });
 
@@ -204,4 +204,33 @@ describe('DrillPage — pas de boucle de rendu', () => {
     fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
     expect(await screen.findByText('nouvelle signification')).toBeTruthy();
   });
+
+  it('carte d\'embarquement (F4b P7, AC-6) : portée, trois relevés, sens avec exemples, UNE action ; plus de SM-2', async () => {
+    renderAt('/fachbegriffe/drill?specialty=Kardiologie');
+    const start = await screen.findByRole('button', { name: /Commencer \(2 cartes\)/ });
+    expect(screen.getByRole('heading', { name: 'Tous les termes' })).toBeTruthy();
+    expect([...document.querySelectorAll('[data-readout]')].map((r) => r.getAttribute('data-readout'))).toEqual(['à revoir', 'nouveaux', '≈ min']);
+    expect(document.querySelector('[data-readout="nouveaux"] dd')!.className).toContain('font-mono');
+    expect(screen.getByRole('button', { name: /Terme → sens/ }).textContent).toContain('Aszites → ?');
+    expect(screen.getByRole('button', { name: /Sens → terme/ }).textContent).toContain('Bauchwasser → ?');
+    expect(screen.getByRole('button', { name: /Terme → sens/ }).getAttribute('aria-pressed')).toBe('true');
+    expect(screen.getByText('Priorité Kardiologie')).toBeTruthy();
+    expect(document.body.textContent).not.toMatch(/SM-2|bidirectionnel|Répétition espacée/);
+    expect(screen.queryByText(/Budget du jour/)).toBeNull();   // 2 nouveaux ≤ budget 10 : il ne limite pas
+    expect(start).toBeTruthy();
+  });
+  it('budget du jour affiché seulement quand il retient des nouveaux', async () => {
+    vi.mocked(loadDrillContext).mockResolvedValue({ ...defaultCtx, remaining: 1, daily: { ...defaultCtx.daily, newPerDay: 1 } });
+    renderAt('/fachbegriffe/drill');
+    expect(await screen.findByRole('button', { name: /Commencer \(1 carte\)/ })).toBeTruthy();
+    expect(screen.getByText('Budget du jour : 1 nouveaux')).toBeTruthy();
+  });
+  it('état vide : « À jour ✓ — prochain terme dû le … »', async () => {
+    await db.fachbegriffe.clear();
+    const due = new Date(2030, 9, 3).getTime();
+    await db.fachbegriffe.put({ id: 'fb-x', term: 'Zyste', translationSimple: 'Z', specialty: 'X', pathologyTags: [], centers: [], linkedCaseIds: [], srs: { ...freshSrs(), state: 'Gelernt', dueDate: due, repetitions: 2, interval: 6 } } as never);
+    renderAt('/fachbegriffe/drill');
+    expect(await screen.findByText('À jour ✓ — prochain terme dû le 3 octobre')).toBeTruthy();
+    expect(screen.queryByRole('button', { name: /commencer/i })).toBeNull();
+  });
 });
```

- [ ] **Step 2 : vérifier l'échec** — `npx vitest run src/lib/motion.test.tsx src/features/fachbegriffe/DrillPage.test.tsx; echo exit=$?` → ≠ 0 (`useCountUp` non exporté ; `[data-readout]` introuvable).

- [ ] **Step 3 : implémentation**

```diff
--- a/app/src/lib/motion.ts
+++ b/app/src/lib/motion.ts
@@ -12,7 +12,7 @@
 // les transforms). Tests unitaires : composants rendus SANS MotionRoot →
 // aucune fonction d'animation chargée, AnimatePresence retire tout de suite.
 // ============================================================================
-import { createElement, type ReactNode } from 'react';
+import { createElement, useEffect, useRef, useState, type ReactNode } from 'react';
 import { LazyMotion, MotionConfig, domMin, useReducedMotion, type Transition } from 'motion/react';
 
 export { AnimatePresence } from 'motion/react';
@@ -56,6 +56,26 @@
   );
 }
 
+/** Compter (F4b P10) : de 0 à `to` à l'apparition (~600 ms), UNE fois ; ensuite
+ *  (et sous mouvement réduit) la valeur s'affiche telle quelle. */
+export function useCountUp(to: number, ms = 600): number {
+  const counted = useRef(!mayMove());
+  const [shown, setShown] = useState(counted.current ? to : 0);
+  useEffect(() => {
+    if (counted.current) { setShown(to); return; }
+    counted.current = true;
+    const t0 = performance.now(); let raf = 0;
+    const tick = () => {
+      const p = Math.min(1, (performance.now() - t0) / ms);
+      setShown(Math.round(to * (1 - (1 - p) ** 3)));
+      if (p < 1) raf = requestAnimationFrame(tick);
+    };
+    raf = requestAnimationFrame(tick);
+    return () => { cancelAnimationFrame(raf); setShown(to); };
+  }, [to, ms]);
+  return shown;
+}
+
 export function MotionRoot({ children }: { children: ReactNode }) {
   const reduce = useReducedMotion() ?? false;
   return createElement(LazyMotion, { features: domMin, strict: true },
```

```diff
--- a/app/src/features/fachbegriffe/DrillPage.tsx
+++ b/app/src/features/fachbegriffe/DrillPage.tsx
@@ -16,10 +16,11 @@ import { buildDrillQueue, nextDueAt, queueCounts } from '@/lib/collections/drill
 import { loadDrillContext, type DrillContext } from '@/lib/collections/drillContext';
 import { drillMinutes, recentCaseAnchor } from '@/lib/collections/relevance';
 import { useSimSession } from '@/store/simSession';
+import { appear, m, useCountUp } from '@/lib/motion';
 
 const FAV_DECK = { id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'manual' as const, createdAt: '', updatedAt: '' };
 
-// Drill SM-2 bidirectionnel. Priorité aux termes de la spécialité/pathologie
+// Drill bidirectionnel. Priorité aux termes de la spécialité/pathologie
 // du cas travaillé, puis progression libre (couverture inclusive).
 // Un deck (ou les favoris) borne la file : jamais un terme hors du deck.
 export function DrillPage() {
@@ -101,49 +102,64 @@ export function DrillPage() {
   };
 
   if (!started) {
+    // Carte d'embarquement (F4b P7) : la portée, trois relevés, le sens, UNE action.
+    const total = qc.due + qc.fresh;
+    const newInPool = pool.filter((b) => b.srs.state === 'Neu').length;
+    const budgetLimits = newInPool > qc.fresh;   // le budget du jour retient des nouveaux
+    const scope = caseId && theCase ? `Termes de ${theCase.name}` : deck ? deck.name : 'Tous les termes';
+    // Prochain terme dû : un terme déjà vu qui revient, ou demain si le budget retient des nouveaux.
+    const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
+    const nextAt = budgetLimits ? Math.min(next ?? Infinity, tomorrow.getTime()) : next;
     return (
-      <div className="mx-auto max-w-xl space-y-5 text-center">
-        <h1 className="text-2xl font-bold">Drill Fachbegriffe{caseId && theCase ? ` · Termes de ${theCase.name}` : deck ? ` · ${deck.name}` : ''}</h1>
-        <div className="card p-6">
-          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon name="nav-abc" className="h-8 w-8" /></div>
-          <p className="mt-2 text-slate-500 dark:text-slate-400">
-            {qc.due} dus · {qc.fresh} nouveaux · budget du jour {ctx.daily.newPerDay}{prioritySpecialty ? ` · priorité ${prioritySpecialty}` : ''}{qc.due + qc.fresh > 0 ? ` · ≈ ${minutes} min` : ''}.
-            Répétition espacée (SM-2), cartes bidirectionnelles.
-          </p>
-          {anchor && <p className="mt-1 text-sm text-brand-600 dark:text-brand-300">Ancré sur ton cas récent : {anchor.name}</p>}
-          <div className="mt-4 flex items-center justify-center gap-2">
-            <span className="text-sm">Sens :</span>
-            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
-              <button onClick={() => setDirection('term2simple')} className={`min-h-11 rounded px-3 ${direction === 'term2simple' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Terme → sens</button>
-              <button onClick={() => setDirection('simple2term')} className={`min-h-11 rounded px-3 ${direction === 'simple2term' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Sens → terme</button>
+      <div className="mx-auto max-w-xl space-y-5">
+        <m.section {...appear} className="card p-6">
+          <p className="eyebrow">Drill Fachbegriffe</p>
+          <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">{scope}</h1>
+          {(prioritySpecialty || anchor) && (
+            <div className="mt-2 flex flex-wrap gap-1.5">
+              {prioritySpecialty && <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">Priorité {prioritySpecialty}</span>}
+              {anchor && <span className="chip bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">Ton cas récent : {anchor.name}</span>}
             </div>
-          </div>
-          {qc.due + qc.fresh === 0 ? (
-            caseId && theCase ? (
-              <>
-                <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
-                  <Icon name="check" className="h-4 w-4" />
-                  Rien à réviser dans ce cas aujourd'hui.
-                </p>
-                <Link to={`/fachbegriffe/drill?specialty=${encodeURIComponent(theCase.specialty)}`} className="btn-primary mt-3">Réviser la spécialité {theCase.specialty}</Link>
-                <Link to="/fachbegriffe/drill" className="btn-outline mt-3 ml-2">Drill global</Link>
-              </>
-            ) : deck ? (
-              <>
-                <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400">
-                  <Icon name="check" className="h-4 w-4" />
-                  Rien à réviser dans « {deck.name} » aujourd'hui.{next ? ` Prochain terme dû : ${new Date(next).toLocaleDateString('fr-FR')}.` : ''}
-                </p>
-                <Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>
-              </>
-            ) : (
-              <p className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400"><Icon name="check" className="h-4 w-4" />Rien à réviser aujourd'hui — les nouveaux termes reviennent demain (budget {ctx.daily.newPerDay}/jour).</p>
-            )
+          )}
+          {total === 0 ? (
+            <>
+              <p className="mt-5 font-medium text-emerald-700 dark:text-emerald-400">
+                À jour ✓{nextAt ? ` — prochain terme dû le ${new Date(nextAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}
+              </p>
+              {caseId && theCase ? (
+                <div className="mt-3 flex flex-wrap gap-2">
+                  <Link to={`/fachbegriffe/drill?specialty=${encodeURIComponent(theCase.specialty)}`} className="btn-primary">Réviser la spécialité {theCase.specialty}</Link>
+                  <Link to="/fachbegriffe/drill" className="btn-outline">Drill global</Link>
+                </div>
+              ) : deck && <Link to="/fachbegriffe/drill" className="btn-outline mt-3">Drill global</Link>}
+            </>
           ) : (
-            <button onClick={start} className="btn-primary mt-5 gap-1.5 px-8 py-3 text-base"><Icon name="play" className="h-4 w-4" />Commencer</button>
+            <>
+              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
+                <Readout label="à revoir" value={qc.due} />
+                <Readout label="nouveaux" value={qc.fresh} />
+                <Readout label="≈ min" value={minutes} />
+              </dl>
+              {budgetLimits && <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Budget du jour : {ctx.daily.newPerDay} nouveaux</p>}
+              <fieldset className="mt-5">
+                <legend className="label mb-1.5">Sens</legend>
+                <div className="grid grid-cols-2 gap-2">
+                  {DIRECTIONS.map((d) => (
+                    <button key={d.id} type="button" aria-pressed={direction === d.id} onClick={() => setDirection(d.id)}
+                      className="min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-left transition-colors hover:border-brand-300 aria-pressed:border-brand-500 aria-pressed:bg-brand-50 dark:border-ink-600 dark:aria-pressed:bg-brand-900/30">
+                      <span className="block text-sm font-semibold">{d.label}</span>
+                      <span className="block font-mono text-xs text-slate-500 dark:text-slate-400">{d.example}</span>
+                    </button>
+                  ))}
+                </div>
+              </fieldset>
+              <button type="button" onClick={start} className="btn-primary mt-5 min-h-11 w-full gap-1.5 text-base">
+                <Icon name="play" className="h-4 w-4" />Commencer ({total} {total === 1 ? 'carte' : 'cartes'})
+              </button>
+            </>
           )}
-        </div>
-        <Link to={exitTo()} className="btn-ghost">← {caseId ? 'Retour au cas' : 'Glossaire'}</Link>
+        </m.section>
+        <div className="text-center"><Link to={exitTo()} className="btn-ghost">← {caseId ? 'Retour au cas' : 'Glossaire'}</Link></div>
       </div>
     );
   }
@@ -212,6 +228,22 @@ export function DrillPage() {
   );
 }
 
+const DIRECTIONS: { id: CardDirection; label: string; example: string }[] = [
+  { id: 'term2simple', label: 'Terme → sens', example: 'Aszites → ?' },
+  { id: 'simple2term', label: 'Sens → terme', example: 'Bauchwasser → ?' },
+];
+
+/** Un relevé de la carte d'embarquement : chiffre en mono, compté une fois (P10). */
+function Readout({ label, value }: { label: string; value: number }) {
+  const n = useCountUp(value);
+  return (
+    <div data-readout={label} className="flex flex-col-reverse rounded-xl bg-slate-50 py-3 dark:bg-white/5">
+      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
+      <dd className="font-mono text-2xl font-semibold tabular-nums">{n}</dd>
+    </div>
+  );
+}
+
 function GradeBtn({ label, sub, color, onClick }: { label: string; sub: string; color: 'rose' | 'amber' | 'emerald' | 'sky'; onClick: () => void }) {
   const cls = {
     rose: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
```

Budget : affiché seulement si `newInPool > qc.fresh` (le budget du jour retient des nouveaux). Prochain terme dû : `nextDueAt(pool)`, ou demain si le budget retient des nouveaux. La puce « Ton cas récent » garde l'ancrage F2b (Question ouverte 4).

- [ ] **Step 4 : vérifier** — `for i in 1 2 3; do npx vitest run --dir src >/dev/null 2>&1 || echo FAIL; done` → aucune ligne `FAIL` ; gates.

- [ ] **Step 5 : commit**
```bash
git add src/lib/motion.ts
git add src/lib/motion.test.tsx
git add src/features/fachbegriffe/DrillPage.tsx
git add src/features/fachbegriffe/DrillPage.test.tsx
git commit -m "feat(drill): carte d'embarquement — portée, trois relevés comptés une fois, sens avec exemples, une action (F4b P7/P10)"
```

---

# Tranche G — Fin de branche

### Task G1 : Revues (une par rôle, relecteurs ≠ implémenteurs ; un seul fixeur par série)

- [ ] `quality-branch-reviewer` (Opus) sur la branche entière : AC-1–AC-10 prouvés, `motion` importé seulement par `lib/motion.ts`, suppression de deck différée (rien avant expiration, `pagehide`, Favoris réservé), aucun événement nouveau (`git diff main -- src/lib/sync docs/contracts supabase` → vide).
- [ ] `front-design-keeper` : une seule matière (`glass-thin`/`glass-full`), zéro `shadow-*` sur les éléments refondus (`grep -n "shadow-" src/components/{CardToast,SelectionExplainer,NewCardSheet,GlossaryDrawer,DeckRail}.tsx src/features/fachbegriffe/DeckManager.tsx; echo exit=$?` → `exit=1`), `star` jamais en texte courant, corail absent de l'étoile, 44 px.
- [ ] `ux-user-advocate` : le comportement des onglets du tiroir (allumé = rangé, toucher = ranger/retirer) et la ★ pleine qui ouvre la fiche — pas de rupture de symbiose pendant un cas.
- [ ] `ux-motion-designer` : quatre gestes cohérents, ressort sans rebond, interruption (fermer pendant l'ouverture), aucun mouvement sous mouvement réduit, vol du mot.
- [ ] Accessibilité (skill `design:accessibility-review`) : `aria-pressed` des onglets du tiroir et de la bascule du drill, `aria-expanded` de la pilule, focus du tiroir `DeckManager` et retour, libellés au survol `aria-hidden`, contraste ≥ 3:1 de l'étoile mesuré en clair/sombre.
- [ ] `direction-keeper` : copy exacte (Global Constraints), zéro doublon (`DeckChecklist` retiré, `DeckSheet` création seule, un seul tiroir de gestion), anti-slop, concision de la carte d'embarquement.

### Task G2 : Preuve navigateur (playwright-cli headless, mesures depuis le DOM de l'app)

Créer `app/scripts/e2e/fachbegriffe-f4b.spec.md` (même forme que `fachbegriffe-f4a.spec.md`) : pile Supabase locale, `npx supabase functions serve --env-file supabase/.env` (`AI_ALLOW_MOCK=1`, `AI_CHAIN_BRIEF=mock:brief`), contenu publié en local (`node scripts/publishContent.mjs`), app sur un port libre. Jamais `import("/src/…")` dans une sonde. Deux tailles (`resize 390 844`, `resize 1440 900`) × clair/sombre (`run-code` : `await page.emulateMedia({ colorScheme: 'dark' })`).

- [ ] **AC-1** : `getComputedStyle` de `[data-pill]`, `.glass-full` (mini-fiche, tiroirs) : `backdrop-filter` contient `blur`, `box-shadow` commence par `inset` ; repli : `run-code` → `const s = await page.context().newCDPSession(page); await s.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] })` → `backdrop-filter: none`, fond opaque (alpha ≥ 0,97).
- [ ] **AC-2** : étoile pleine/vide mesurée (couleur du trait vs fond effectif) ≥ 3:1 en clair et sombre ; aucune couleur `signal` sur `[data-star]`.
- [ ] **AC-3** : `[data-pill].getBoundingClientRect().width <= 120` ; chaque bouton ≥ 44 × 44 ; « Expliquer » → carte `glass-full` ; sélection près du haut → carte sous la sélection.
- [ ] **AC-4** : ★ sur `Aszites` → pilule `role=status` une ligne (hauteur ≤ 52 px) ; toucher → miniature ; « Révéler » → `data-card-flip="verso"` ; « Changer » déplace (IndexedDB `favorites` / `deck_terms`) ; corbeille d'une carte → « Carte supprimée · Annuler » → rien dans `progress_events`.
- [ ] **AC-5** : ouvrir la fiche d'`Aszites` (tiroir). 1440 px : onglets hors du tiroir, à sa gauche (`rail.right <= aside.left + 1`) ; toucher « Favoris » → allumé + `favorites` contient le terme ; retoucher → éteint, retiré ; deck intelligent inerte. « ⋯ Decks » → renommer, supprimer → onglet absent (tiroir et page), pilule « Deck « X » supprimé · Annuler » ; Annuler → aucun `deck.deleted` ; attendre 6 s → `deck.deleted` présent, `personal_terms` et `deck_terms` des autres decks intacts. 390 px : bande horizontale en haut du tiroir, `document.documentElement.scrollWidth <= 390`. ★ pleine dans une liste → le tiroir s'ouvre sur ce terme.
- [ ] **AC-6** : `/fachbegriffe/drill` : trois `[data-readout]`, exemples « Aszites → ? » / « Bauchwasser → ? », « Commencer (N cartes) », aucun « SM-2 » ; deck à jour → « À jour ✓ — prochain terme dû le … ».
- [ ] **AC-7** : sélection d'une phrase de 6+ mots → pastilles, le mot touché vole (`el.getAnimations().length === 1` juste après le clic) ; ordinateur : carte ancrée sous la sélection (`dialog.top >= selection.bottom`) ; 390 px : depuis le bas ; Entrée crée → la carte descend et la pilule apparaît.
- [ ] **AC-8** : ouvrir puis fermer la bulle à 50 ms → un seul calque, qui disparaît ; `run-code` → `await page.emulateMedia({ reducedMotion: 'reduce' })` + rechargement → après chaque changement d'état, `document.getAnimations().length === 0` et styles finaux immédiats.
- [ ] **AC-10** : rejouer `fachbegriffe-f4a.spec.md` (AC-4 à AC-9 F4a) → verts.
- [ ] **Vidéo** pour la direction : `playwright-cli video-start f4b-gestes.webm` → sélection → Expliquer → fermer ; ★ ; mini-fiche → Créer (se poser) ; onglets ; ⋯ Decks → supprimer → Annuler ; drill → `video-stop`. Fichier joint à la PR (hors dépôt).
- [ ] Commit : `git add scripts/e2e/fachbegriffe-f4b.spec.md` puis `git commit -m "test(fachbegriffe): preuve navigateur F4b — AC-1 à AC-10, vidéo des gestes"`.

### Task G3 : Mesure du bundle (AC-9)

- [ ] Depuis `app/`, sur `main` puis sur la branche : `npm run build >/dev/null; echo exit=$?` puis
```bash
node -e "const fs=require('fs'),z=require('zlib');let j=0,c=0;for(const f of fs.readdirSync('dist/assets')){const n=z.gzipSync(fs.readFileSync('dist/assets/'+f),{level:9}).length;if(f.endsWith('.js'))j+=n;else if(f.endsWith('.css'))c+=n}console.log(JSON.stringify({jsGzipKB:+(j/1024).toFixed(2),cssGzipKB:+(c/1024).toFixed(2)}))"
```
Attendu (mesuré en rédigeant) : `main` `{"jsGzipKB":547.15,"cssGzipKB":16.92}`, branche `{"jsGzipKB":576.97,"cssGzipKB":17.64}` → **+29,8 Kio JS ≤ +30 (AC-9)**. Reporter les deux lignes et la ligne `index-*.js … gzip:` de Vite (+30,6 kB, autre convention) dans la PR. Au-dessus de +30 Kio : ne pas merger, remonter au coordinateur.

### Task G4 : [CONTRÔLEUR] PR et livraison

- [ ] `git push -u origin feat/fachbegriffe-premium` ; `gh pr create` (corps : résumé par tranche, tableau AC → preuve, mesures bundle avant/après, hypothèses et questions ouvertes tranchées, lien vidéo) ; CI verte (`.github/workflows/quality.yml`).
- [ ] Aucune migration ni fonction : rien à appliquer en EU. Merge par la direction ; vérification sur l'app en production (390 px + ordinateur) ; mémoire.

---

## Couverture des critères d'acceptation

| AC | Tâches | Preuve |
|---|---|---|
| AC-1 | A2, B2, C1, D1, E2, E3, E4, G2 | `tokens.test` (inset seulement, replis), tests « sans `shadow-` », `getComputedStyle` + émulation `prefers-reduced-transparency` |
| AC-2 | A2, B1, G2 | `tokens.test` (contrastes calculés), `StarButton.test` (cristal/ambre, pas de `signal-`), mesure navigateur |
| AC-3 | C1, G2 | `SelectionExplainer.test` (2 × `h-11 w-11`, `p-0.5 gap-0.5`, carte `glass-full`), largeur mesurée ≤ 120 |
| AC-4 | B2, E1, G2 | `CardToast.test`, `StarButton.test`, `SelectionExplainer.test` (Révéler, pas de Changer sans autre deck) |
| AC-5 | E1, E2, E4, G2 | `pendingDeletion.test` (deck : rien avant expiration, cartes intactes), `DeckManager.test` (renommer, supprimer + Annuler, créer), `GlossaryDrawer.test` (onglets : allumé = rangé, ranger/retirer, intelligent inerte, bande/colonne, gestion + Échap), `FachbegriffePage.test` (deck en attente masqué) ; 390 px |
| AC-6 | F1, G2 | `DrillPage.test` (relevés, exemples, action unique, pas de SM-2, budget, état vide daté) |
| AC-7 | D1, G2 | `NewCardSheet.test` (mise en page, miroitement, Entrée, se poser, crayon), `SelectionExplainer.test` (pastilles, contexte) ; navigateur (vol, ancre) |
| AC-8 | A1, F1, G2 | `motion.test` (skipAnimations sous mouvement réduit, interruption, vol, compter) ; `document.getAnimations()` |
| AC-9 | A1, E4, G3 | mesure G3 : **+29,8 Kio ≤ +30** (plafond relevé par la direction) |
| AC-10 | toutes, G2 | suites existantes vertes (583 tests : 3 tests F4a du menu `DeckChecklist` remplacés), preuve F4a rejouée |

## Questions ouvertes (à trancher par la direction, défaut appliqué entre parenthèses)

Tranchées le 30 sept. : budget bundle **+30 Ko gzip** (spec P9, AC-9 mises à jour) ; onglets sur le **bord gauche du tiroir d'un terme** (`GlossaryDrawer`), bande en haut du tiroir sur téléphone.

1. **Onglets du tiroir — que fait un toucher ?** (Défaut, à confirmer : onglet allumé = ce terme est rangé dans ce deck ; toucher = ranger / retirer ; decks intelligents avec icône, inertes ; « ⋯ Decks » = gestion. Les onglets remplacent l'étoile du tiroir et le menu `DeckChecklist` ; une ★ pleine ailleurs ouvre la fiche du terme. Alternative : garder `DeckChecklist` sur les ★ pleines des listes — +0,8 Kio, deux endroits pour la même action.)
2. **Rangement depuis le tiroir pendant un cas** : les onglets n'ont pas le `caseId` (le tiroir vit hors du contexte du cas). (Défaut : accepté — l'étoile vide des listes du cas marque toujours le cas ; brancher le contexte du cas dans le tiroir si la direction le veut.)
3. **Ancrage « Ton cas récent »** sur la carte d'embarquement : non listé par P7 ; gardé en puce à côté de la priorité (défaut) ; alternative : le retirer.
4. **`s'étendre` / `se poser` sans `layoutId`** (Hypothèse 3) : le morphing exact pilule → carte coûterait `domMax` (+13 Kio, hors budget). (Défaut : croissance depuis l'ancre et descente vers la pilule.)

## Auto-revue (faite)

- Couverture : P1 (A2, E3), P2 (C1, D1, B2, E2, E4 : verre seulement sur le flottant ; drill et liste restent opaques), P3 (A2, B1), P4 (C1), P5 (B2, E1), P6 (E1, E2, E4 — tiroir d'un terme), P7 (F1), P8 (D1), P9 (A1 + tous les `m.*`), P10 (F1) ; AC-1–AC-10 dans le tableau ; hors périmètre respecté (aucun fichier `sync`, `contracts`, `supabase` touché).
- Placeholders : aucun ; chaque bloc de code ci-dessus est extrait **tel quel** des commits de la copie jetable où il a passé typecheck, tests et build.
- Noms : `MotionRoot`, `m`, `AnimatePresence`, `spring`, `appear`, `expand`, `slide`, `settleOrClose`, `flyFrom`, `useCountUp` (A1/F1) ; `StarGlyph` (B1) ; `CardToast` kinds `saved | deleted | deck-deleted | error` (B2/E1) ; `NewCardSheet({ …, at, onClose(settleDy?) })`, `ContextSentence({ …, className })` (D1) ; `planDeckDeletion`, `commitCollectionEvents`, `scheduleDeletion(id, delayMs, kind)` (E1) ; `DeckManager` (E2, `onCreate` retiré en E4), `DeckRail({ termId, caseId?, onManage })`, `DeckSheet` création seule (E4). Aucun nom utilisé avant d'être défini.

## Ce qui a été exécuté en rédigeant ce plan

- Copie jetable (`git archive` de 2142978 → scratchpad, `npm ci`) ; `motion` installé **dans la copie seulement**.
- Chaque tâche A1–F1 appliquée et commitée dans la copie (révision du 30 sept. : E3/E4 refaites pour les onglets dans le tiroir, F1 rejouée par-dessus) ; après chacune : typecheck `exit=0` et tests ciblés verts ; à la fin : typecheck `exit=0`, `vitest --dir src` 583/583 (trois passages consécutifs), build `exit=0`, bundle mesuré (tableau « Mesures »), import de `motion` confiné à `lib/motion.ts`, aucun `shadow-` sur les éléments refondus, CSS contrôlée (`stop-color`, `hover:hover`, `aria-pressed`, `glass-thin`, `glass-full`, `text-star-600`, `animate-shimmer`, `prefers-reduced-transparency` présents).
- **Non exécuté** : la preuve navigateur (G2) — un `vite preview` de la copie a démarré, mais la première synchronisation du contenu exige `functions serve` sur la pile locale (réponse 503) ; les gestes, le verre rendu, les contrastes mesurés, 390 px et la vidéo restent à prouver en G2. Les revues G1 et la PR (G4) ne sont pas faites.
