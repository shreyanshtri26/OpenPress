/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../pagestudio/src/**/*.{js,ts,jsx,tsx}',
   "./node_modules/@relume_io/relume-ui/dist/**/*.{js,ts,jsx,tsx}"

  ],
  theme: {
    extend: {
      fontFamily: {
        share: ['"Share Tech Mono"', 'monospace'],
        lato: ['"Lato"', 'sans-serif'],
        merriweather: ['"Merriweather"', 'serif'],
        libre: ['"Libre Franklin"', 'sans-serif'],
        'space-mono': ['"Space Mono"', 'monospace'],
        'cormorant-garamond': ['"Cormorant Garamond"', 'serif'],
        jetbrains: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}