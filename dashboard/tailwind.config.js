/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "outer-bg": "#E7E9ED",
        "app-surface": "#FFFFFF",
        "secondary-surface": "#F6F6F6",
        "charcoal": "#1B1F19",
        "lime-accent": "#B1EC49",
        "dark-green": "#245239",
        "muted-green": "#5FA637",
        "border-light": "#E3E5E2",
        "text-muted": "#666663",
        "primary": "#476800",
        "primary-container": "#b1ec49",
        "on-primary": "#ffffff",
        "on-primary-container": "#476900",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "surface-container-lowest": "#ffffff",
        "surface-container": "#edf0de",
        "surface-container-high": "#e7ead8",
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px",
        "app": "24px",
        "card": "20px"
      },
      spacing: {
        "container-padding": "32px",
        "gutter": "16px",
        "unit": "4px",
        "section-margin": "32px",
        "card-gap": "20px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        premium: "0 4px 20px rgba(0, 0, 0, 0.04)",
        card: "0 2px 12px rgba(0, 0, 0, 0.03)",
        elevated: "0 8px 30px rgba(0, 0, 0, 0.08)",
      }
    },
  },
  plugins: [],
}
