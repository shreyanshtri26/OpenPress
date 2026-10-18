import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  // The monorepo root holds React 18 (admin) next to shared libs like Puck; always use this app's React 19.
  resolve: { dedupe: ['react', 'react-dom'] },
})
