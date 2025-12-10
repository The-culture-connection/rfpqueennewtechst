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
        // Superlist-inspired color palette
        primary: {
          DEFAULT: "#ff6b9d", // Pink
          light: "#ff8fb3",
          dark: "#ff4d7a",
        },
        secondary: {
          DEFAULT: "#a855f7", // Purple
          light: "#c084fc",
          dark: "#9333ea",
        },
        accent: {
          DEFAULT: "#ec4899", // Pink-purple blend
          light: "#f472b6",
          dark: "#db2777",
        },
        dark: {
          DEFAULT: "#0a0a0a", // Deep black
          light: "#1a1a1a",
          lighter: "#2a2a2a",
        },
        surface: {
          DEFAULT: "#1a1a1a",
          light: "#2a2a2a",
          lighter: "#3a3a3a",
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-superlist': 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 25%, #2a0a2a 50%, #1a0a1a 75%, #0a0a0a 100%)',
        'gradient-pink-purple': 'linear-gradient(135deg, #ff6b9d 0%, #a855f7 50%, #ec4899 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
      },
      fontFamily: {
        primary: ['var(--font-primary)', 'sans-serif'],
        secondary: ['var(--font-secondary)', 'sans-serif'],
      },
      boxShadow: {
        'superlist': '0 4px 20px rgba(255, 107, 157, 0.1), 0 0 40px rgba(168, 85, 247, 0.05)',
        'superlist-lg': '0 8px 40px rgba(255, 107, 157, 0.15), 0 0 60px rgba(168, 85, 247, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;

