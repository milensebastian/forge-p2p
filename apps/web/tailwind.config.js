/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Linear / Vercel / VS Code deep charcoal palette
        charcoal: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#22242c',
          850: '#1a1c23',
          900: '#14151b',
          925: '#101116',
          950: '#0c0d10',
        },
        forge: {
          bg: '#0c0d10',
          sidebar: '#101115',
          surface: '#14151b',
          card: '#181920',
          elevated: '#1d1f27',
          border: '#23252f',
          'border-subtle': 'rgba(255, 255, 255, 0.07)',
          accent: '#6366f1',
          'accent-hover': '#4f46e5',
          'accent-subtle': 'rgba(99, 102, 241, 0.12)',
          'accent-text': '#818cf8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        elevated: '0 4px 12px 0 rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
