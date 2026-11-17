# CLAUDE.md — chain-payments-kit

The Vue checkout of Chain Payments: `ChainCheckout` (one component). It shows a session's price, lets the buyer choose a
coin, gets an exact quote (held about two minutes), has the host's wallet sign the transaction the chain module builds, and
follows the payment to confirmation.

## Invariants

- **No transaction is built here.** `loadChain(method.chain).buildPayment(quote)` from `@meddleware/chain-payments-client`
  builds it; the host passes `signAndExecute` (for example `createToolWallet().signAndExecute` from `@meddleware/wallet-adapter`).
- **Methods come from the session** and are filtered by what this version of the client supports; a new chain needs only a
  client upgrade.
- **Honest wording:** the exact amount, how long it is held, that the wallet shows the same amount and that change comes back
  in the same transaction. Never "approximately".
- `@meddleware/ui` components and design tokens only; semantic markup; the shared accessibility sweep at AAA over the gallery's
  states (`e2e/`), and screenshots (`npm run shots`, look at them).

## Commands

```bash
npm ci && npm run type-check && npm run lint && npm test
npm run build:gallery && npm run test:e2e        # E2E_BROWSERS=all for five browsers
```

Commit messages: one short line, no body, no trailer.
