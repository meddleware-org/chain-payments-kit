import { vueApp } from '@meddleware/frontend-config/eslint'

// The fleet's Vue + TypeScript + accessibility + browser-compat config. The kit builds no transaction itself: the per-chain
// builders come from @meddleware/chain-payments-client.
export default vueApp({ name: 'chain-payments-kit', sui: true })
