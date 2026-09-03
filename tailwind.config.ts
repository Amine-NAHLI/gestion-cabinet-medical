import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0284c7",
        "primary-container": "#0369a1",
        "primary-light": "#f0f9ff",
        "secondary": "#0d9488",
        "surface": "#f8fafc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5f9",
        "surface-container": "#e2e8f0",
        "on-surface": "#0f172a",
        "on-surface-variant": "#64748b",
        "border-subtle": "#e2e8f0"
      },
      fontFamily: {
        "headline-xl": ["plusJakartaSans", "sans-serif"],
        "headline-lg": ["plusJakartaSans", "sans-serif"],
        "headline-md": ["plusJakartaSans", "sans-serif"],
        "headline-sm": ["plusJakartaSans", "sans-serif"],
        "body-lg": ["inter", "sans-serif"],
        "body-md": ["inter", "sans-serif"],
        "body-sm": ["inter", "sans-serif"],
        "label-lg": ["inter", "sans-serif"],
        "label-md": ["inter", "sans-serif"],
        "label-sm": ["inter", "sans-serif"]
      }
    },
  },
  plugins: [],
};
export default config;
