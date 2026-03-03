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
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
