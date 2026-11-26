// ESLint configuration (`npm run lint:js`): the shared Vue app configuration from `@meddleware/frontend-config`.
import { vueApp } from '@meddleware/frontend-config/eslint'

// The fleet's Vue + TypeScript + accessibility + browser-compat config. The kit builds no transaction itself: the per-chain
// builders come from @meddleware/chain-payments-client.
// `name` labels this configuration in lint output; `sui: true` adds the chain-boundary rules (value imports of the Sui client, transaction building and chain reads are forbidden in src/).
export default vueApp({ name: 'chain-payments-kit', sui: true })
