import type { Config } from "tailwindcss";
import lineClamp from "@tailwindcss/line-clamp";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        'space-mono': ['"Space Mono"', 'monospace'],
        'cormorant-garamond': ['"Cormorant Garamond"', 'serif'],
        jetbrains: ['"JetBrains Mono"', 'monospace'],
        'libre': ['Libre Franklin', 'sans-serif'],
        'merriweather': ['Merriweather', 'serif'],
        share: ['"Share Tech Mono"', 'monospace'],
        'lato': ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [lineClamp],
};

export default config;
