import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#FBFAF5",
          dark: "#12161B",
        },
        ink: {
          DEFAULT: "#1E2A24",
          dark: "#E9EDE9",
        },
        folder: {
          50: "#F2F6F2",
          100: "#DFE9E0",
          200: "#B9CDBB",
          300: "#8FAE92",
          400: "#5F8A65",
          500: "#3E6B47",
          600: "#2C5237",
          700: "#1F4B3F",
          800: "#173A32",
          900: "#102921",
        },
        stamp: {
          normal: "#3E6B47",
          yellow: "#B8862E",
          orange: "#C2661C",
          red: "#B23B2E",
          overdue: "#6B6560",
        },
        parchment: "#F1EADA",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,42,36,0.06), 0 4px 14px rgba(30,42,36,0.06)",
        cardHover: "0 2px 6px rgba(30,42,36,0.10), 0 10px 24px rgba(30,42,36,0.10)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
