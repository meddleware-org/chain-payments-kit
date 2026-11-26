// Playwright configuration for the real-browser accessibility run (`npm run test:e2e`): the shared fleet configuration from `@meddleware/frontend-config`.
import { definePlaywrightConfig } from '@meddleware/frontend-config/playwright'

// The component gallery, built and served with `vite preview`; Chromium locally, all five browser projects in CI.
// Port 4300 for the preview server, so it does not collide with another gallery's; `kind: 'gallery'` selects the gallery's test layout in the shared configuration.
export default definePlaywrightConfig({ port: 4300, kind: 'gallery' })
