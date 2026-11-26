/**
 * `@meddleware/chain-payments-kit`: the Vue checkout for Chain Payments. `ChainCheckout` lists whatever payment methods a
 * session offers (and this version's `@meddleware/chain-payments-client` can pay on), shows the exact amount with how long it
 * is held, has the host's wallet sign the chain module's transaction, and follows the payment to confirmation.
 *
 * Role: the package's only entry (`.`); it re-exports the one component. The package ships Vue source (no build step): the consuming app's bundler compiles it, and `package.json` declares `*.css`
 * and `*.vue` as side-effectful so the styles survive tree-shaking. Related: `ChainCheckout.vue`, `@meddleware/chain-payments-client` (the session client and the chain modules it uses).
 */
/** The checkout component. */
export { default as ChainCheckout } from './ChainCheckout.vue'
