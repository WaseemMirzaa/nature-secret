/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /** Warm stone — maps legacy `gold-*` utilities to neutral premium palette */
        gold: {
          50: '#fafafa',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f4',
          150: '#ebe9e3',
          200: '#e0ddd6',
          300: '#ccc8bf',
          400: '#9c9890',
          500: '#6f6b64',
          600: '#54514b',
          700: '#403e39',
          800: '#2c2a27',
          900: '#1a1917',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        soft: '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        premium: '0 1px 2px rgba(0,0,0,0.04), 0 12px 40px -16px rgba(0,0,0,0.08)',
        lift: '0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 40px -16px rgba(0,0,0,0.1)',
        'lift-lg': '0 8px 16px -4px rgba(0,0,0,0.06), 0 32px 64px -24px rgba(0,0,0,0.14)',
        card: '0 1px 0 rgba(0,0,0,0.04), 0 16px 48px -20px rgba(0,0,0,0.12)',
        'gold-sm': '0 2px 12px -2px rgba(0,0,0,0.08)',
        'gold-md': '0 4px 20px -4px rgba(0,0,0,0.12)',
        'gold-glow': '0 6px 28px -8px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
      },
      backgroundImage: {
        'gold-shine':
          'linear-gradient(135deg, #fffdf6 0%, #f0dfa8 24%, #c9a227 46%, #e8d48a 58%, #a88620 78%, #5c4510 100%)',
        'gold-shine-soft':
          'linear-gradient(165deg, #fffdfb 0%, #faf0d0 42%, #dcc06a 100%)',
        'gold-shine-cta':
          'linear-gradient(135deg, #fffef8 0%, #e8cf6a 30%, #c9a227 50%, #f2e2a0 62%, #8c6f1b 100%)',
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
        'pdp-reviews-marquee': 'pdpReviewsMarquee 55s linear infinite',
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
        /** PDP web: seamless horizontal review strip (track is 2× duplicated content). */
        pdpReviewsMarquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
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
