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
        // Cyprus & Sand Palette (Combo 04: #004741 Cyprus & #F0EDE4 Sand)
        cyprus: {
          50: '#e6f4f2',
          100: '#c2e4df',
          200: '#91ceca',
          300: '#58b4ae',
          400: '#2b9891',
          500: '#008077',
          600: '#00665f',
          DEFAULT: '#004741', // Exact user Cyprus
          700: '#004741',
          800: '#043834',
          900: '#062c29',
          950: '#021a18',
        },
        sand: {
          50: '#fbfaf8',
          100: '#F0EDE4', // Exact user Sand
          DEFAULT: '#F0EDE4',
          200: '#e4dfd3',
          300: '#d5ccc0',
          400: '#b8aba0',
          500: '#988779',
          600: '#7a6a5d',
          700: '#5e5046',
          800: '#423831',
          900: '#28221d',
        },
        background: '#031a18', // Deep Cyprus Canvas
        surface: '#072b27',    // Cyprus Card Surface
        'surface-elevated': '#0c3833',
        'surface-card': '#0f443e',
        border: '#134e48',
        'border-highlight': '#1b635c',
        credit: {
          light: '#e6f7f3',
          DEFAULT: '#10b981',
          dark: '#059669',
        },
        debit: {
          light: '#fef2f2',
          DEFAULT: '#f43f5e',
          dark: '#e11d48',
        },
        contra: {
          light: '#faf6f0',
          DEFAULT: '#d4a373', // Warm sand-terracotta contra accent
          dark: '#bc8a5f',
        },
        brand: {
          50: '#e6f4f2',
          100: '#c2e4df',
          200: '#91ceca',
          300: '#58b4ae',
          400: '#2b9891',
          500: '#007a70',
          600: '#006159',
          DEFAULT: '#004741', // Exact Cyprus
          700: '#004741',
          800: '#043834',
          900: '#062c29',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
