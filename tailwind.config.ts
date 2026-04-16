import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#141414",
        "surface-hover": "#1a1a1a",
        border: "#262626",
        text: "#fafafa",
        "text-secondary": "#737373",
        accent: "#3b82f6",
        "accent-hover": "#2563eb",
        positive: "#22c55e",
        negative: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};

export default config;
