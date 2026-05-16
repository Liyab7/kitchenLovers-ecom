/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette derived from maxshop home2 demo
        primary: {
          DEFAULT: '#FF6B35',
          50: '#FFF1EB',
          100: '#FFD9C5',
          500: '#FF6B35',
          600: '#E85A26',
          700: '#C04918',
        },
        accent: {
          DEFAULT: '#0099CC',
          500: '#0099CC',
        },
        success: { DEFAULT: '#28A745' },
        danger: { DEFAULT: '#D32F2F' },
        ink: '#333333',
        canvas: '#F5F5F5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
