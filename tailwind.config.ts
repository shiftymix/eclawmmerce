import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#1a1f2e",
        surface: "#242938",
        border: "#2e3450",
        "crab-red": "#e8392e",
        amber: "#d4943a",
        success: "#43c59e",
        "text-primary": "#f0f0f0",
        "text-secondary": "#8892b0",
        // Use case category colors
        "uc-biz": "#e8392e",
        "uc-ecom": "#d4943a",
        "uc-paid": "#4a9eff",
        "uc-workflow": "#43c59e",
        "uc-api": "#9b59b6",
        "uc-video": "#ff6b6b",
        "uc-ugc": "#ffd93d",
        "uc-demand": "#6bcb77",
        "uc-docs-ext": "#ff9f43",
        "uc-docs-int": "#a8a8b3",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "cursive"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",
        lg: "4px",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
