// Vitest configuration for the offline unit tests (`npm test`): the Vue checkout in jsdom, one Vue copy, and the Meddleware packages' CSS processed through Vite.
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { inlineMeddleware } from '@meddleware/frontend-config/vitest'

export default defineConfig({
  // The Vue plugin compiles the single-file component the tests mount.
  plugins: [vue()],
  // One Vue copy for SFCs and @vue/test-utils (events and reactivity must cross the boundary).
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    // jsdom: the checkout is mounted into a DOM (no layout or colours: the real-browser run covers those).
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    // @meddleware/ui imports its own .css (each component brings its CSS), which Node cannot import: process it through Vite.
    server: { deps: { inline: inlineMeddleware } },
  },
})
