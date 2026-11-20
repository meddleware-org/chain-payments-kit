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

## Open standards

What this project speaks, what is planned and where you can extend it: [docs/INTEROP.md](docs/INTEROP.md).
