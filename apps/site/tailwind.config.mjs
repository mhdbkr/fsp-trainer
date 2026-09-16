import { tokens } from '@doctopus/tokens';

const font = (stack) => stack.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,md,mdx,ts}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: tokens.color.brand,
        signal: tokens.color.signal,
        paper: tokens.color.paper.DEFAULT,
        ink: tokens.color.ink,
      },
      fontFamily: {
        sans: font(tokens.font.sans),
        display: font(tokens.font.display),
        mono: font(tokens.font.mono),
      },
      transitionTimingFunction: { fluid: tokens.motion.easeFluid, 'out-soft': tokens.motion.easeOut },
      transitionDuration: { fast: tokens.motion.durationFast, DEFAULT: tokens.motion.duration },
      borderRadius: { card: tokens.radius.card, control: tokens.radius.control },
      letterSpacing: { tightish: tokens.type.headingTracking },
    },
  },
  plugins: [],
};
