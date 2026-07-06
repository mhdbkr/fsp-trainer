/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm clinical palette. `brand` = teal/petrol (medical, calm),
        // driven by CSS variables so dark mode swaps automatically.
        brand: {
          50: '#eefaf8', 100: '#d3f1ec', 200: '#a8e3da', 300: '#74cec2',
          400: '#45b2a5', 500: '#2b9689', 600: '#217a70', 700: '#1f625b',
          800: '#1e4f4a', 900: '#1c423f', 950: '#0b2523',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
