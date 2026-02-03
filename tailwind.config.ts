import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          750: '#2d3748', // Custom gray between 700 and 800 for dark mode
          850: '#1a202c', // Custom gray between 800 and 900
        },
        protocol: {
          http: '#4ade80',
          https: '#22c55e',
          dns: '#60a5fa',
          tcp: '#a78bfa',
          udp: '#f472b6',
          tls: '#34d399',
          error: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
export default config;
