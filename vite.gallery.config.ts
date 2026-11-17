import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Builds the gallery the Playwright accessibility sweep and the screenshots use (not part of the package).
export default defineConfig({
  root: 'gallery',
  plugins: [vue()],
  build: { outDir: '../gallery-dist', emptyOutDir: true },
})
