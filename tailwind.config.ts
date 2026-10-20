import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0B0D12", elev: "#12151D", card: "#171B25" },
        ink: { DEFAULT: "#F5F7FB", muted: "#9199AA", border: "#272D3A" },
        brand: { violet: "#8B7CFF", emerald: "#43D9A3" },
        state: { success: "#45D483", warn: "#F6BD60", danger: "#FF6B7A" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "InterVariable", "sans-serif"],
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(0,0,0,0.5)",
        ring: "0 0 0 1px rgba(139,124,255,0.4)",
      },
      animation: {
        "fade-up": "fade-up 240ms ease-out both",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: {
          "0%,100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
