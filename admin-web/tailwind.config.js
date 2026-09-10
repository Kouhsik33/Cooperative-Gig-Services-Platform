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
        // 60% Dominant: Vanilla Cream
        vanilla: {
          DEFAULT: "#FFF6E8",
          light: "#FFFBF5",
          dark: "#F7E7CE",
        },
        canvas: "#FFF6E8",
        surface: "#FFFFFF",

        // 30% Structural Brand: Cherry Velvet
        primary: {
          DEFAULT: "#C1121F",
          dark: "#980F19",
          light: "#FDE8EA",
        },
        cherry: {
          DEFAULT: "#C1121F",
          dark: "#980F19",
          light: "#FDE8EA",
        },

        // 10% Accent: Sky Powder
        sky: {
          DEFAULT: "#A9C6EA",
          light: "#EBF2FA",
          dark: "#7FA7D9",
        },
        secondary: {
          DEFAULT: "#A9C6EA",
          dark: "#7FA7D9",
          light: "#EBF2FA",
        },

        // 10% Accent: Golden Typography & Royal Accents
        gold: {
          DEFAULT: "#C59B27",
          light: "#FFF4D2",
          dark: "#9A7513",
          metallic: "#D4AF37",
        },

        // Legacy compatibility aliases mapped harmoniously
        lime: {
          DEFAULT: "#D5E5B8",
          light: "#F2F8E9",
          dark: "#A3BD79",
        },
        yellow: {
          DEFAULT: "#F9DCA4",
          light: "#FFF4D2",
          dark: "#C59B27",
        },
        cyan: {
          DEFAULT: "#A9C6EA",
          light: "#EBF2FA",
          dark: "#7FA7D9",
        },
        purple: {
          DEFAULT: "#DAC8E8",
          light: "#F4EFF9",
          dark: "#A48BBD",
        },
        peach: {
          DEFAULT: "#FAD8C3",
          light: "#FFF0E6",
          dark: "#CFA085",
        },

        ink: {
          DEFAULT: "#1F1516",
          secondary: "#5C4A4D",
          muted: "#8C787B",
        },
      },
      borderRadius: {
        card: "18px",
      },
      borderWidth: {
        "2.5": "2.5px",
      },
      boxShadow: {
        retro: "3.5px 3.5px 0px #1F1516",
        "retro-sm": "2px 2px 0px #1F1516",
        "retro-lg": "5px 5px 0px #1F1516",
        card: "3.5px 3.5px 0px #1F1516",
        gold: "3.5px 3.5px 0px #C59B27",
        cherry: "3.5px 3.5px 0px #980F19",
      },
    },
  },
  plugins: [],
};
