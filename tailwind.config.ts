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
          DEFAULT: "#b2b1b1", // Light gray background
          light: "#c5c4c4",
          lighter: "#d8d7d7",
        },
        surface: {
          DEFAULT: "#c5c4c4",
          light: "#d8d7d7",
          lighter: "#e8e7e7",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-superlist': 'linear-gradient(135deg, #b2b1b1 0%, #c5c4c4 25%, #d8d7d7 50%, #c5c4c4 75%, #b2b1b1 100%)',
        'gradient-pink-purple': 'linear-gradient(135deg, #406da8 0%, #5c8bc4 50%, #406da8 100%)',
        'gradient-dark': 'linear-gradient(180deg, #b2b1b1 0%, #c5c4c4 100%)',
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

