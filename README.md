# @meddleware/chain-payments-kit

A Vue checkout for [Chain Payments](https://github.com/meddleware-org/chain-payments-service): exact crypto prices, paid
from the buyer's own wallet, followed to on-chain confirmation.

```vue
<script setup lang="ts">
import { ChainCheckout } from '@meddleware/chain-payments-kit'
import { createToolWallet } from '@meddleware/wallet-adapter'
const { signAndExecute, getSuiClient } = createToolWallet()
</script>

<template>
  <ChainCheckout :session-id="id" base-url="https://chain-payments.example.org" :sui-client="getSuiClient()" :sign-and-execute="signAndExecute" @paid="done" />
</template>
```

The merchant's backend creates the session (merchant API); the component needs only its id. Peer dependencies:
`@meddleware/chain-payments-client`, `@meddleware/ui`, `@meddleware/design-tokens`, `vue`. Licence: [0BSD](LICENSE).

## Props and events

| Prop | Purpose |
| --- | --- |
| `sessionId` | The checkout session to pay (32 lowercase hex characters). |
| `baseUrl` | The Chain Payments public origin (ignored when `client` is given). |
| `signAndExecute` | Signs and executes the chain module's transaction with the buyer's wallet; resolves with `{ digest }`. |
| `suiClient` | Reads chain objects (the platform fee's terms) before signing: the wallet adapter's Sui client. |
| `network` | The network the app's wallet is on (for example `testnet`); when the coin's network differs the checkout says so and never asks the wallet. |
| `client` | An injected session client (tests, galleries). |
| `level` | The heading level of the title (2 to 4). |

Events: `paid` (`{ digest, quote }`) when the service confirms the payment, and `failed` (`'rejected'` or `'unapplied'`) when it ended without paying this checkout. A signed payment is kept in `sessionStorage`
(this tab; the quote and the digest only) until the service answers, so a reload resumes it without signing again.

## Development

```bash
npm ci
npm run type-check                # vue-tsc over the source, the tests and the gallery
npm run lint                      # stylelint, eslint (accessibility plugin, chain boundary) and html-validate
npm test                          # 9 offline unit tests (vitest, jsdom)
npm run build:gallery             # the checkout gallery the browser tests drive
npm run test:e2e                  # Playwright + axe over the gallery's thirteen states, every theme x season (needs Chromium)
npx --no-install mw-audit-gate    # the dependency check CI runs
```

How to propose a change: [CONTRIBUTING.md](CONTRIBUTING.md).

## Open standards

What this project speaks, what is planned and where you can extend it: [docs/INTEROP.md](docs/INTEROP.md).
