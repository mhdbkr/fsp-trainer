import { createRequire } from 'node:module';

// ── Jetons partagés (@doctopus/tokens) ───────────────────────────────────────
// s3-primitives T2 : le rayon et l'élévation sont LUS ici depuis
// packages/tokens/tokens.json, ils n'y sont plus recopiés. C'est le seul
// endroit de l'app où le flux va du paquet vers l'app ; le reste de la charte
// (couleurs, fontes, verre) reste chez l'app et `check-parity.mjs` en surveille
// la copie. Repli : les harnais de test copient ce fichier SEUL dans un dossier
// temporaire (packages/tokens/test/tokens.test.mjs, cas « app qui dérive ») —
// là packages/ n'existe pas, et ce fichier doit rester importable.
const tokens = (() => {
  try {
    return createRequire(import.meta.url)('../packages/tokens/tokens.json');
  } catch {
    process.emitWarning('tailwind.config: packages/tokens/tokens.json introuvable — rounded-card/shadow-e* sans valeur dans ce build.');
    return { radius: {}, elevation: { dark: {} } };
  }
})();

// ── Élévation : UNE classe par cran, le thème change la VARIABLE ─────────────
// fix-s3 I2 : les jumeaux `shadow-eN-dark` obligeaient chaque appelant à
// penser au sombre ; cinq ne l'ont pas fait (`.seg` pressé, CardToast,
// NewCardSheet, ResumeSessionBar, MusterModelPicker) et portaient en sombre le
// filet CLAIR. Désormais `shadow-eN` = `var(--eN)`, et `:root` / `.dark`
// posent les valeurs (plugin plus bas, lues dans tokens.json) : impossible
// d'oublier le sombre, il n'y a plus rien à choisir.
// `none` devient `0 0 #0000` : Tailwind compose `box-shadow: <ring-offset>,
// <ring>, var(--tw-shadow)` et `none` n'a pas le droit d'être dans une liste —
// la déclaration entière tombait, anneau `ring-*` compris.
const eVars = (scope) => Object.fromEntries(
  Object.entries(scope ?? {}).filter(([k]) => /^\d$/.test(k)).map(([k, v]) => [`--e${k}`, v === 'none' ? '0 0 #0000' : v]),
);
const elevation = Object.fromEntries(Object.keys(eVars(tokens.elevation)).map((v) => [v.slice(2), `var(${v})`]));
/** radius → { card, control, capsule } pour borderRadius (rounded-card…). */
const radius = Object.fromEntries(Object.entries(tokens.radius ?? {}).filter(([k]) => !k.startsWith('$')));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // ── `.btn-glass` n'existait PAS dans le CSS livré ────────────────────────
  // Mesuré le 30 sept. 2026 sur `dist/assets/*.css` : des sept règles portant
  // `.btn-glass`, il restait `:is(.dark) .btn-glass` (× 3) et les deux replis
  // sous `@media`/`@supports` — mais AUCUNE règle de base en clair, ni son
  // survol, ni son état pressé. Confirmé dans le navigateur : sur la page
  // réelle, en clair, un `<button class="btn-glass">` calcule
  // `border-top-color: rgb(229, 231, 235)` (le gris de preflight), `box-shadow:
  // none`, `backdrop-filter: none` — c'est-à-dire rien du tout.
  // Cause : la purge des règles `@layer components` de Tailwind se fonde sur
  // les classes trouvées dans `content`, et `.btn-glass` a ZÉRO occurrence en
  // `.tsx`. Les variantes `:is(.dark) …` et celles imbriquées dans une at-rule
  // échappent à l'extracteur, d'où ce reste en lambeaux — plus trompeur qu'une
  // absence franche, puisque le mode sombre semblait marcher.
  // La primitive est destinée à trois moments de `features/simulation` (voir
  // son commentaire dans index.css) : elle doit survivre jusqu'à ce qu'ils la
  // branchent. À RETIRER de cette liste le jour où un `.tsx` l'emploie ; si
  // personne ne l'emploie, c'est la classe qu'il faut supprimer, pas la ligne.
  safelist: ['btn-glass'],
  theme: {
    // ── `boxShadow` REMPLACE la palette, il ne l'étend pas (fix-s3 I4) ───────
    // Sous `extend`, Tailwind gardait `shadow-sm/md/lg/xl/2xl` et `shadow` : des
    // ombres PORTÉES générées dans le CSS livré, à un nom de classe de revenir
    // (gate G2-a : aucune ombre portée). Hors d'`extend`, il ne reste que les
    // crans de lumière (e0…e3), `inner` (interne, donc licite) et `none`.
    boxShadow: { ...elevation, inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)', none: 'none' },
    extend: {
      colors: {
        // ── Identité « instrument clinique » ─────────────────────────────────
        // brand = pétrole profond (calme médical, confiance ; évolution du teal
        // vers plus de profondeur). Dark mode cohérent via la palette.
        brand: {
          50: '#ecf7f4', 100: '#cfeae4', 200: '#a2d7cd', 300: '#6bbdb0',
          400: '#379e8f', 500: '#158375', 600: '#0c6157', 700: '#0b4e46',
          800: '#0d3f3a', 900: '#0e3530', 950: '#041e1b',
        },
        // signal = coral clinique — l'accent UNIQUE, employé avec parcimonie
        // (pulse actif, wordmark, un point de bascule). Jamais du texte courant.
        signal: {
          50: '#fdf1ec', 100: '#fbdfd3', 200: '#f6bda7', 300: '#f09374',
          400: '#e8613c', 500: '#d84a24', 600: '#bf3a19', 700: '#9e2d17',
          800: '#80271a', 900: '#6a2418', 950: '#3a0f0a',
        },
        // star = ambre glassy doux (F4b P3) — l'étoile PLEINE et rien d'autre ;
        // jamais du texte courant. Trait : 600 sur clair, 400 sur sombre (≥ 3:1).
        star: { 300: '#f7d48a', 400: '#f1b84a', 500: '#dd9a26', 600: '#a86f0c', 700: '#8a5a09' },
        // Neutres d'identité : papier clinique (clair) & vert-encre (sombre).
        paper: '#f4f5f2',
        ink: {
          DEFAULT: '#0c1a17', 800: '#12211e', 700: '#1b2f2b', 600: '#26403a',
        },
      },
      fontFamily: {
        // Corps/UI — clarté d'ingénieur (IBM Plex Sans).
        sans: ['"IBM Plex Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        // Display/wordmark — grotesque humaniste à caractère (Bricolage).
        display: ['"Bricolage Grotesque Variable"', '"IBM Plex Sans Variable"', 'system-ui', 'sans-serif'],
        // Signature — terminologie médicale & données en mono (IBM Plex Mono).
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Décélération « fluide » : départ franc, arrivée très douce, sans rebond.
      // C'est la courbe qui donne aux transitions de mise en page leur qualité
      // premium — utilisée pour la condensation de l'en-tête de simulation.
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      letterSpacing: {
        tightish: '-0.014em',
      },
      // Rayon : jetons, plus des valeurs au hasard (audit §2).
      // `rounded-card` / `rounded-control` / `rounded-capsule`.
      borderRadius: radius,
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        // Variante courte (≤150 ms, charte) pour un contenu qui apparaît déjà en place (pastille, bulle).
        'fade-in-fast': { '0%': { opacity: '0', transform: 'translateY(2px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        // Battement d'instrument — la « pulse » de marque.
        'pulse-line': { '0%,100%': { opacity: '0.35' }, '50%': { opacity: '1' } },
        // Ouverture d'un popover (assistant) — jaillit depuis son ancre.
        pop: { '0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' }, '100%': { opacity: '1', transform: 'none' } },
        // Flottement doux du bouton assistant (présence vivante, discrète).
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
        // Division (FB2-P) : les trois Teile naissent d'une seule barre — ils
        // partent du centre, collés, et s'écartent à leur place.
        'split-l': { '0%': { opacity: '0', transform: 'translateX(110%) scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
        'split-c': { '0%': { opacity: '0', transform: 'scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
        'split-r': { '0%': { opacity: '0', transform: 'translateX(-110%) scaleX(0.6)' }, '100%': { opacity: '1', transform: 'none' } },
        // Miroitement (F4b P8) : la Bedeutung se propose — reflet qui passe, figé sous reduced-motion.
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        // Filet de la pilule (F4c) : le temps qui reste avant qu'elle se retire.
        drain: { '0%': { transform: 'scaleX(1)' }, '100%': { transform: 'scaleX(0)' } },
        // Démonstration du sens (F4c) : la carte d'exemple se retourne, montre la réponse, revient.
        'demo-flip': { '0%,12%': { transform: 'rotateY(0)' }, '38%,72%': { transform: 'rotateY(180deg)' }, '100%': { transform: 'rotateY(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-fast': 'fade-in-fast 0.15s ease-out',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.16,1,0.3,1)',
        'pulse-line': 'pulse-line 2.4s ease-in-out infinite',
        pop: 'pop 0.24s cubic-bezier(0.16,1,0.3,1)',
        float: 'float 3.6s ease-in-out infinite',
        'split-l': 'split-l 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
        'split-c': 'split-c 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
        'split-r': 'split-r 0.55s cubic-bezier(0.32, 0.72, 0, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        drain: 'drain 6s linear forwards',
        'demo-flip': 'demo-flip 2.2s cubic-bezier(0.32, 0.72, 0, 1) 0.15s backwards',
      },
    },
  },
  plugins: [
    // Les valeurs des crans, par thème. `.dark` est sur <html> (darkMode:
    // 'class') : la variable descend, le composant n'a rien à savoir.
    ({ addBase }) => addBase({ ':root': eVars(tokens.elevation), '.dark': eVars(tokens.elevation?.dark) }),
  ],
};
