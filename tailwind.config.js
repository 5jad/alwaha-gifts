/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/web/index.html",
    "./src/web/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fbf8f2',
          100: '#f5eee1',
          200: '#ebdcc4',
          300: '#dec2a0',
          400: '#cfa27b',
          500: '#c3865c',
          600: '#b46f4e',
          700: '#965741',
          800: '#7a4639',
          900: '#643a32',
          gold: '#D4AF37',
          emerald: '#15803d',
          dark: '#121214'
        }
      },
      fontFamily: {
        sans: [
          'Tajawal',
          'Cairo',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ]
      }
    },
  },
  plugins: [],
}
