/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /** Classic metallic gold (#D4AF37) — highlights + deep bronze for depth */
        gold: {
          50: '#fffdf7',
          100: '#fff8e8',
          200: '#ffecb8',
          300: '#f4d978',
          400: '#e6c74a',
          500: '#d4af37',
          600: '#b8962e',
          700: '#967d25',
          800: '#7a651f',
          900: '#5c4d18',
        },
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          150: '#efeeec',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        premium: '0 4px 24px -4px rgba(0,0,0,0.08)',
        'gold-sm': '0 2px 10px -2px rgba(212,175,55,0.28)',
        'gold-md': '0 4px 18px -4px rgba(212,175,55,0.34)',
        'gold-glow': '0 4px 24px -6px rgba(212,175,55,0.45), 0 0 0 1px rgba(255,248,220,0.4)',
      },
      backgroundImage: {
        'gold-shine':
          'linear-gradient(135deg, #fffef8 0%, #f5e6a8 22%, #d4af37 45%, #f4e8a1 56%, #c9a227 82%, #8b6914 100%)',
        'gold-shine-soft':
          'linear-gradient(165deg, #fffdf7 0%, #fff3c8 40%, #e8d48a 100%)',
        'gold-shine-cta':
          'linear-gradient(135deg, #fffef5 0%, #f0d860 28%, #d4af37 48%, #f7e98a 58%, #b8962e 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'cta-pulse': 'ctaPulse 2s ease-in-out infinite',
        'cta-attract': 'ctaAttract 0.65s ease-in-out infinite',
        'cta-bounce': 'ctaBounce 1.5s ease-in-out infinite',
        'cta-shimmer': 'ctaShimmer 2.5s ease-in-out infinite',
        'cta-glow': 'ctaGlow 2s ease-in-out infinite',
        'cta-lift': 'ctaLift 2s ease-in-out infinite',
        'vibrate': 'vibrate 0.35s ease-out',
        'stagger-in': 'staggerIn 0.5s ease-out forwards',
        'gold-pulse': 'goldPulse 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        /** Prefer transform-only (composited) — avoid animating box-shadow on mobile (PSI / jank). */
        ctaPulse: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.02)' } },
        ctaAttract: {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.06) translateY(-3px)' },
        },
        ctaBounce: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
        ctaShimmer: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.92' } },
        ctaGlow: { '0%, 100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.92', transform: 'scale(1.01)' } },
        ctaLift: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
        vibrate: { '0%, 100%': { transform: 'translateX(0) scale(1)' }, '15%': { transform: 'translateX(-4px) scale(1.02)' }, '35%': { transform: 'translateX(4px) scale(0.98)' }, '55%': { transform: 'translateX(-3px) scale(1.01)' }, '75%': { transform: 'translateX(3px) scale(0.99)' }, '90%': { transform: 'translateX(-1px) scale(1)' } },
        goldPulse: { '0%, 100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.03)' } },
        staggerIn: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    function ({ addUtilities }) {
      addUtilities({
        '.animation-delay-75': { animationDelay: '75ms' },
        '.animation-delay-150': { animationDelay: '150ms' },
        '.animation-delay-225': { animationDelay: '225ms' },
        '.animation-delay-300': { animationDelay: '300ms' },
        '.animation-delay-375': { animationDelay: '375ms' },
        '.animation-delay-450': { animationDelay: '450ms' },
      });
    },
  ],
};
