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
          DEFAULT: "#f5f5f5", // Light gray for surface
          light: "#fafafa",
          lighter: "#ffffff",
        },
        surface: {
          DEFAULT: "#fafafa",
          light: "#ffffff",
          lighter: "#f5f5f5",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-superlist': 'linear-gradient(135deg, #ffffff 0%, #fafafa 25%, #f5f5f5 50%, #fafafa 75%, #ffffff 100%)',
        'gradient-pink-purple': 'linear-gradient(135deg, #406da8 0%, #5c8bc4 50%, #406da8 100%)',
        'gradient-dark': 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
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

