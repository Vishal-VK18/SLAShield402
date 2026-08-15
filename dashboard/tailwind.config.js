/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      colors: {
        apple: {
          bg: '#F5F5F7',
          surface: 'rgba(255, 255, 255, 0.72)',
          border: 'rgba(0, 0, 0, 0.08)',
          'border-light': 'rgba(255, 255, 255, 0.6)',
          text: '#1D1D1F',
          secondary: '#86868B',
          tertiary: '#A1A1A6',
          graphite: '#1D1D1F',
          accent: '#000000',
        },
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'glass-subtle': '0 4px 20px 0 rgba(0, 0, 0, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.6)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.09), inset 0 1px 0 0 rgba(255, 255, 255, 0.9)',
      },
    },
  },
  plugins: [],
}
