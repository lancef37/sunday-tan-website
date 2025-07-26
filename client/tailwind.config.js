/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-inter)'],
        'serif': ['var(--font-playfair)'],
      },
      colors: {
        'tan': {
          50: '#fdfcf8',
          100: '#faf7ee',
          200: '#f5f1e8', // tan-cream
          300: '#ede6d5',
          400: '#e3d4b8',
          500: '#d4a574', // tan-gold
          600: '#c69860',
          700: '#b5956a', // tan-bronze
          800: '#937b56',
          900: '#6f5e43',
          950: '#4a3f2e',
        },
        'accent': {
          'warm': '#e8b4a0',
          'cool': '#a8c4c6',
          'neutral': '#d4c4b0',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}