import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// The component gallery, built and served with `vite preview`; Chromium locally, all five browser projects in CI.
export default definePlaywrightConfig({ port: 4300, kind: 'gallery' })
