/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Kaltera", "system-ui", "-apple-system", "sans-serif"],
        kaltera: ["Kaltera", "sans-serif"],
      },
      colors: {
        // 60% Dominant: Canvas (#EDF2F4 in CASSETTE TAPE theme)
        canvas: "var(--palette-canvas)",
        surface: "var(--palette-surface)",

        // 10% Hero CTAs: Vibrant Retro Crimson Red (#EF233C)
        primary: {
          DEFAULT: "var(--palette-primary)",
          dark: "var(--palette-primary-dark)",
          light: "var(--palette-primary-light)",
        },
        cherry: {
          DEFAULT: "var(--palette-primary)",
          dark: "var(--palette-primary-dark)",
          light: "var(--palette-primary-light)",
        },

        // Secondary Steel Slate Blue (#8D99AE)
        secondary: {
          DEFAULT: "var(--palette-secondary)",
          dark: "var(--palette-secondary-dark)",
          light: "var(--palette-secondary-light)",
        },
        sky: {
          DEFAULT: "var(--palette-secondary)",
          light: "var(--palette-secondary-light)",
          dark: "var(--palette-secondary-dark)",
        },
        vanilla: {
          DEFAULT: "var(--palette-canvas)",
          light: "var(--palette-surface-alt)",
          dark: "var(--palette-secondary-light)",
        },

        // 30% Structural Contrast & Borders: Deep Slate Navy Ink (#2B2D42)
        ink: {
          DEFAULT: "var(--palette-ink)",
          secondary: "var(--color-ink-secondary)",
          muted: "var(--color-ink-muted)",
        },
        border: "var(--palette-border)",

        // Retro Gold & Trim Accents
        gold: {
          DEFAULT: "var(--color-gold)",
          light: "var(--color-gold-light)",
          dark: "var(--color-gold-dark)",
          metallic: "var(--color-gold-metallic)",
        },

        // Auxiliary retro tones
        lime: {
          DEFAULT: "#90BE6D",
          light: "#F0F7EB",
          dark: "#58813B",
        },
        yellow: {
          DEFAULT: "#F9C74F",
          light: "#FEF8E9",
          dark: "#C59B27",
        },
        cyan: {
          DEFAULT: "var(--palette-secondary)",
          light: "var(--palette-secondary-light)",
          dark: "var(--palette-secondary-dark)",
        },
        purple: {
          DEFAULT: "#7209B7",
          light: "#F3E8F9",
          dark: "#480CA8",
        },
        peach: {
          DEFAULT: "#F4A261",
          light: "#FDF4EC",
          dark: "#C46820",
        },
      },
      borderRadius: {
        card: "18px",
      },
      borderWidth: {
        "2.5": "2.5px",
      },
      boxShadow: {
        retro: "3.5px 3.5px 0px var(--palette-shadow)",
        "retro-sm": "2px 2px 0px var(--palette-shadow)",
        "retro-lg": "5px 5px 0px var(--palette-shadow)",
        card: "3.5px 3.5px 0px var(--palette-shadow)",
        primary: "3.5px 3.5px 0px var(--palette-primary-dark)",
      },
    },
  },
  plugins: [],
};
