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
