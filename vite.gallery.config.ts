import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Builds the gallery the Playwright accessibility sweep and the screenshots use (not part of the package).
export default defineConfig({
  // The gallery's own folder is the project root (its index.html is the entry).
  root: 'gallery',
  // The Vue plugin compiles the single-file components.
  plugins: [vue()],
  // Output next to the repository root (ignored by git), emptied before each build.
  build: { outDir: '../gallery-dist', emptyOutDir: true },
})
