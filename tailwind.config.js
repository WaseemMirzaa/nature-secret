/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdfbf5',
          100: '#f9f0d9',
          200: '#f0dcad',
          300: '#e4c276',
          400: '#d4a84a',
          500: '#cba847',
          600: '#b8860b',
          700: '#9a7209',
          800: '#7d5d0b',
          900: '#664d0f',
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
        'gold-sm': '0 2px 8px -2px rgba(203,168,71,0.25)',
        'gold-md': '0 4px 16px -4px rgba(203,168,71,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'cta-pulse': 'ctaPulse 2s ease-in-out infinite',
        'cta-bounce': 'ctaBounce 1.5s ease-in-out infinite',
        'cta-shimmer': 'ctaShimmer 2.5s ease-in-out infinite',
        'cta-glow': 'ctaGlow 2s ease-in-out infinite',
        'cta-lift': 'ctaLift 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        ctaPulse: { '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(212, 168, 74, 0.4)' }, '50%': { transform: 'scale(1.02)', boxShadow: '0 0 0 6px rgba(212, 168, 74, 0.15)' } },
        ctaBounce: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-3px)' } },
        ctaShimmer: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.92' } },
        ctaGlow: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(28, 25, 23, 0.3)' }, '50%': { boxShadow: '0 0 20px 2px rgba(212, 168, 74, 0.25)' } },
        ctaLift: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-2px)' } },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
