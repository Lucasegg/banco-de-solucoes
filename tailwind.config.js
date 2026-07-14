/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        muted: '#64748b',
        line: '#e2e8f0',
      },
      boxShadow: {
        soft: '0 20px 60px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
