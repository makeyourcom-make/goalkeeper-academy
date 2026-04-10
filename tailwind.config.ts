import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      colors: {
        navy: {
          50: "#E6EAF1",
          100: "#C3CCD9",
          400: "#2E4A70",
          500: "#1a3556",
          700: "#0B2545",
          800: "#081B35",
          900: "#051024",
          DEFAULT: "#0B2545",
        },
        orange: {
          400: "#FF9428",
          500: "#F57C00",
          600: "#E06C00",
          DEFAULT: "#F57C00",
        },
        grey: {
          100: "#F4F6F8",
          300: "#D1D5DB",
          500: "#6B7280",
          700: "#374151",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        anton: ["var(--font-anton)", "sans-serif"],
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      fontSize: {
        "h1-hero": ["4rem", { lineHeight: "1.1", fontWeight: "400" }],
        h1: ["3rem", { lineHeight: "1.15", fontWeight: "400" }],
        h2: ["2.25rem", { lineHeight: "1.2", fontWeight: "400" }],
        h3: ["1.75rem", { lineHeight: "1.25", fontWeight: "400" }],
        h4: ["1.375rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
      boxShadow: {
        sm: "0 1px 2px rgba(11, 37, 69, 0.05)",
        md: "0 4px 12px rgba(11, 37, 69, 0.08)",
        lg: "0 8px 24px rgba(11, 37, 69, 0.12)",
        xl: "0 16px 48px rgba(11, 37, 69, 0.16)",
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
