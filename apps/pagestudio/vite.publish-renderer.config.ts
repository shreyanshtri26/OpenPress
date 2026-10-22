import { defineConfig } from 'vite';

// Second build output: the published-page renderer bundle.
//
// `npm run build` runs this after the app build (with `emptyOutDir: false`, so
// it lands next to the app in dist/ instead of wiping it). The result is one
// self-contained ESM file, `dist/publish-renderer.js`, that the backend
// republish-all worker imports at runtime from the PageBuilder origin.
//
// Because this is a normal Vite production build, every `import.meta.env.VITE_*`
// reference is replaced with this environment's value — the same substitution
// the app build performs — so published HTML is identical whether the browser
// or the backend rendered it. No renderer settings need to be mirrored into
// function environment variables.
export default defineConfig({
  // Same as vite.config.ts: use this app's React 19, not the monorepo root's React 18.
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    // Runs in function's Node runtime, never in a browser.
    target: 'node20',
    // Readable stack traces in CloudWatch matter more here than bytes: this
    // file is fetched once per warm function container, not by page visitors.
    minify: false,
    sourcemap: false,
    lib: {
      // Relative to this config's directory, so no node: imports are needed
      // here (tsconfig.node.json declares no Node types).
      entry: 'src/publish/rendererEntry.ts',
      formats: ['es'],
      fileName: () => 'publish-renderer.js',
    },
    rollupOptions: {
      // A single file is required: the worker writes it to /tmp and imports it,
      // so it cannot resolve sibling chunks.
      output: { inlineDynamicImports: true },
    },
  },
});
