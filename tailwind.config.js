/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#EEF2FA', 100: '#D9E1F2', 200: '#B3C2E3', 300: '#8299CC', 400: '#5470B0',
          500: '#344F90', 600: '#243C74', 700: '#1B305E', 800: '#13254A', 900: '#0C1833'
        },
        accent: { 50: '#ECFDF3', 100: '#D1FADF', 400: '#4ADE80', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' },
        ink: { 900: '#0F172A', 700: '#334155', 500: '#64748B', 400: '#94A3B8', 300: '#CBD5E1', 200: '#E2E8F0', 100: '#F1F5F9' },
        canvas: '#F7F8FA'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)',
        float: '0 8px 30px rgba(19,37,74,.28)'
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        pop: { '0%': { transform: 'scale(.6)', opacity: 0 }, '80%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', opacity: 1 } }
      },
      animation: {
        'slide-up': 'slide-up .28s cubic-bezier(.2,.8,.2,1)',
        'fade-in': 'fade-in .2s ease-out',
        pop: 'pop .35s ease-out'
      }
    }
  },
  plugins: []
}
