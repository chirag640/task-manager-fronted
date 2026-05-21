/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: '#FFFDF5',
        'neo-accent': '#FF6B6B',
        'neo-secondary': '#FFD93D',
        'neo-muted': '#C4B5FD',
      },
      fontFamily: {
        space: ['Space Grotesk', 'sans-serif'],
      },
      boxShadow: {
        'neo-sm': '4px 4px 0px 0px #000',
        'neo-md': '8px 8px 0px 0px #000',
        'neo-lg': '12px 12px 0px 0px #000',
        'neo-xl': '16px 16px 0px 0px #000',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '8': '8px',
      },
    },
  },
  plugins: [],
}