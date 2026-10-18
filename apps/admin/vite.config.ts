import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    test: { environment: 'jsdom', include: ['src/**/*.test.{js,jsx,ts,tsx}'] },
    base: env.VITE_BASEPATH || '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // Page Studio source is shared with apps/pagestudio; /build mounts its editor.
        '@builder': path.resolve(__dirname, '../pagestudio/src'),
        '@studio': path.resolve(__dirname, '../pagestudio/src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  };
});
