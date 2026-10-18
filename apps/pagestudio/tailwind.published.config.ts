import type { Config } from "tailwindcss";
import lineClamp from "@tailwindcss/line-clamp";

/**
 * Dedicated Tailwind config for compiling the CSS that gets inlined into
 * PUBLISHED page HTML (see scripts/build-published-styles.mjs). Kept
 * separate from tailwind.config.ts (which drives this app's own admin-UI
 * bundle) so the CSS embedded in every public page only contains classes
 * actually used by the page-rendering helpers, not the whole editor UI.
 */
const config: Config = {
  content: [
    "./src/helpers/**/*.{js,ts,jsx,tsx}",
    "./src/components/PuckEditor/htmlExport.ts",
  ],
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
        // Matches renderContactUsPageFromPuckJSON.ts's own runtime
        // tailwind.config override of the default `sans` key (Public Sans).
        sans: ['"Public Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [lineClamp],
};

export default config;
