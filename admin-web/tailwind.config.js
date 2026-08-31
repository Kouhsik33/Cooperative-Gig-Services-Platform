/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Same palette as mobile-app/src/theme/tokens.ts, expressed as
        // Tailwind theme extensions so both surfaces share one identity.
        primary: {
          DEFAULT: "#0F6B5C",
          dark: "#0A4F44",
          light: "#E3F3EF",
        },
        secondary: {
          DEFAULT: "#C97B3D",
          dark: "#A85F27",
          light: "#FBEEE0",
        },
        surface: "#FFFFFF",
        canvas: "#F7F8F6",
        ink: {
          DEFAULT: "#1A2421",
          secondary: "#5B6B65",
          muted: "#8A9A94",
        },
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 4px 10px -2px rgba(10,35,29,0.08)",
      },
    },
  },
  plugins: [],
};
