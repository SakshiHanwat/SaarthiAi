import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          2: '#111111',
          3: '#1a1a1a',
        },
        border: {
          DEFAULT: '#222222',
          light: '#2e2e2e',
        },
        accent: {
          DEFAULT: '#1d9bf0',
          hover: '#1a8cd8',
          dim: 'rgba(29, 155, 240, 0.12)',
        },
        saarthi: {
          text: '#e8e8e8',
          muted: '#777777',
          dim: '#444444',
        },
      },
    },
  },
  plugins: [],
};
export default config;
