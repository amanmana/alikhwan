/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0F766E',
          secondary: '#14B8A6',
          accent: '#F59E0B',
          background: '#F8FAF7',
          surface: '#FFFFFF',
          text: '#17352F',
          muted: '#52645F',
          success: '#15803D',
          danger: '#B91C1C',
        }
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
      }
    },
  },
  plugins: [],
}
