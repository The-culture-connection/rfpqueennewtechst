import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Royal blue color palette
        primary: {
          DEFAULT: "#406da8", // Royal blue
          light: "#5c8bc4",
          dark: "#2d4f7a",
        },
        secondary: {
          DEFAULT: "#406da8", // Royal blue
          light: "#5c8bc4",
          dark: "#2d4f7a",
        },
        accent: {
          DEFAULT: "#406da8", // Royal blue
          light: "#5c8bc4",
          dark: "#2d4f7a",
        },
        dark: {
          DEFAULT: "#000000", // Pure black
          light: "#0a0a0a",
          lighter: "#1a1a1a",
        },
        surface: {
          DEFAULT: "#0a0a0a",
          light: "#1a1a1a",
          lighter: "#2a2a2a",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-superlist': 'linear-gradient(135deg, #000000 0%, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%, #000000 100%)',
        'gradient-pink-purple': 'linear-gradient(135deg, #406da8 0%, #5c8bc4 50%, #406da8 100%)',
        'gradient-dark': 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
      },
      fontFamily: {
        primary: ['var(--font-primary)', 'sans-serif'],
        secondary: ['var(--font-secondary)', 'sans-serif'],
      },
      boxShadow: {
        'superlist': '0 4px 20px rgba(64, 109, 168, 0.1), 0 0 40px rgba(64, 109, 168, 0.05)',
        'superlist-lg': '0 8px 40px rgba(64, 109, 168, 0.15), 0 0 60px rgba(64, 109, 168, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;

