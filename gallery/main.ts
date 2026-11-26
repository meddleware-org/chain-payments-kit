// File: the entry of the checkout gallery (not published): the design tokens and the seasons, the reset, then the gallery page. Driven by e2e/a11y.spec.ts and e2e/screens.spec.ts.
import '@meddleware/design-tokens/tokens.css'
import '@meddleware/design-tokens/seasons.css'
import '@meddleware/ui/reset.css'
import { createApp } from 'vue'
import CheckoutGallery from './CheckoutGallery.vue'

// The gallery chooses its state from the page's `state` query parameter.
createApp(CheckoutGallery).mount('#app')
