/**
 * `@meddleware/chain-payments-kit`: the Vue checkout for Chain Payments. `ChainCheckout` lists whatever payment methods a
 * session offers (and this version's `@meddleware/chain-payments-client` can pay on), shows the exact amount with how long it
 * is held, has the host's wallet sign the chain module's transaction, and follows the payment to confirmation.
 */
export { default as ChainCheckout } from './ChainCheckout.vue'
