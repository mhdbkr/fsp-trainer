/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
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
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        // Battement d'instrument — la « pulse » de marque.
        'pulse-line': { '0%,100%': { opacity: '0.35' }, '50%': { opacity: '1' } },
        // Ouverture d'un popover (assistant) — jaillit depuis son ancre.
        pop: { '0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' }, '100%': { opacity: '1', transform: 'none' } },
        // Flottement doux du bouton assistant (présence vivante, discrète).
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.16,1,0.3,1)',
        'pulse-line': 'pulse-line 2.4s ease-in-out infinite',
        pop: 'pop 0.24s cubic-bezier(0.16,1,0.3,1)',
        float: 'float 3.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
