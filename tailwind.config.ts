import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Discord-inspired: light bg is a soft neutral gray (not stark
        // white), dark bg is Discord's deep charcoal, not pure black.
        paper: {
          DEFAULT: "#F2F3F5",
          dark: "#1E1F22",
        },
        ink: {
          DEFAULT: "#060607",
          dark: "#F2F3F5",
        },
        // "folder" now carries Discord's blurple brand ramp — every
        // primary button / accent in the app pulls from this token,
        // so retinting it here reskins the whole app at once.
        folder: {
          50: "#EEF0FF",
          100: "#E0E3FF",
          200: "#C7CCFB",
          300: "#A3AAF7",
          400: "#7F87F2",
          500: "#5865F2",
          600: "#4752C4",
          700: "#3C45A5",
          800: "#2F3686",
          900: "#232761",
        },
        // Urgency semantics stay meaningfully distinct from each
        // other, retinted to sit closer to Discord's status colors.
        stamp: {
          normal: "#23A55A",
          yellow: "#F0B232",
          orange: "#F5821F",
          red: "#F23F43",
          overdue: "#87383B",
        },
        parchment: "#EEF0FF",
        // Card surfaces one step up from the page background — this
        // is the piece the old cream/green theme was missing: real
        // surface layering like Discord's bg-primary/secondary/tertiary.
        surface: {
          DEFAULT: "#FFFFFF",
          dark: "#2B2D31",
        },
        online: "#23A55A",
      },
      fontFamily: {
        display: ["'Baloo 2'", "system-ui", "sans-serif"],
        body: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.06)",
        cardHover: "0 2px 6px rgba(0,0,0,0.12), 0 10px 24px rgba(0,0,0,0.10)",
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
