/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // The design system uses fine-grained alpha steps (bg-white/4,
      // border-white/8, …) that are NOT in Tailwind's default opacity scale —
      // without these entries those ~200 class instances silently compile to
      // nothing, which left inputs with the browser's default white
      // background (white-on-white text) and cards with fallback borders.
      opacity: {
        3: '0.03',
        4: '0.04',
        6: '0.06',
        7: '0.07',
        8: '0.08',
        12: '0.12',
      },
      colors: {
        blue: {
          500: '#3B82F6',
          600: '#2563EB',
          400: '#60A5FA',
        },
        // ── Design system (2026 rebuild) ─────────────────────────────────
        // `ink` is the neutral near-black surface ramp — replaces the old
        // navy-tinted panels (#0d1426) so the one warm accent reads louder.
        // Pattern borrowed from Linear: depth comes from 1px borders between
        // near-identical darks, not from colour-tinted gradient panels.
        ink: {
          950: '#0a0b0d', // page background
          900: '#0f1114', // raised panel
          850: '#121418', // hover / elevated panel
          800: '#17191e', // highest surface (dropdowns, modals)
        },
        // The single product accent. Warmer + less saturated than Tailwind's
        // stock orange-500 — closer to hi-vis workwear than to a warning
        // state, which matters when red/amber remain semantic colours.
        orange: {
          300: '#ffb392',
          400: '#ff8a5e',
          500: '#ff6b35',
          600: '#e85a28',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-33.33%)' } },
      },
    },
  },
  plugins: [],
};
