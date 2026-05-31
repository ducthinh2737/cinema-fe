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
        background: {
          DEFAULT: '#0a0a0c',
          card: '#121216',
          overlay: 'rgba(10, 10, 12, 0.75)',
        },
        brand: {
          DEFAULT: '#e50914', // Crimson Netflix Red
          hover: '#f40b17',
          gold: '#e5a93b',    // Premium Gold Accents
          charcoal: '#1a1a22',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.03)',
          border: 'rgba(255, 255, 255, 0.07)',
          accent: 'rgba(229, 9, 20, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'cinema-gradient': 'linear-gradient(to top, #0a0a0c 0%, rgba(10, 10, 12, 0.8) 50%, rgba(10, 10, 12, 0) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'brand': '0 4px 20px 0 rgba(229, 9, 20, 0.25)',
      }
    },
  },
  plugins: [],
}
