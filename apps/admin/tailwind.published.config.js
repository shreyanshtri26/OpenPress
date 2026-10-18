/**
 * Dedicated Tailwind config for compiling the CSS that gets inlined into
 * PUBLISHED page HTML (see scripts/build-published-styles.mjs). Kept
 * separate from tailwind.config.js (which drives this app's own admin-UI
 * bundle) so the CSS embedded in every public page only contains classes
 * actually used by the page-rendering helpers, not the whole admin app.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    './src/helpers/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts}',
    './node_modules/@relume_io/relume-ui/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        share: ['"Share Tech Mono"', 'monospace'],
        lato: ['"Lato"', 'sans-serif'],
        merriweather: ['"Merriweather"', 'serif'],
        libre: ['Libre Franklin', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
