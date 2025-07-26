/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'tan-gold': '#D4A574',
        'tan-bronze': '#B5956A',
        'tan-cream': '#F5F1E8',
      },
    },
  },
  plugins: [],
}