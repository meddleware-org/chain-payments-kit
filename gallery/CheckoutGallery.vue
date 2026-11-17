<script setup lang="ts">
// Every state of the checkout, with a fake session client and wallet (no network): the accessibility sweep and the
// screenshots read this page. `?state=` picks one state; without it, all are shown.
import { computed } from 'vue'
import { AppToolShell } from '@meddleware/ui'
import type { CheckoutSession, Quote, SessionClient } from '@meddleware/chain-payments-client'
import { ChainCheckout } from '../src'

const SESSION = '0123456789abcdef0123456789abcdef'
const sui = {
  id: 'sui-testnet:SUI', chain: 'sui', network: 'testnet', symbol: 'SUI', decimals: 9, coinType: '0x2::sui::SUI',
  packageId: '0x610cf31fa9455893f1d0d139e6aa6ca4559a9f2acf07391c0d47c4e86a9c6af2',
  merchantObject: '0xd92a3ce208124219667d5b17a939617cc4dc816c093b91fd80f1f164e635d5e5',
}
const usdc = { ...sui, id: 'sui-testnet:USDC', symbol: 'USDC', decimals: 6, coinType: '0xa1ec::usdc::USDC' }
const session = (status: CheckoutSession['status'] = 'open'): CheckoutSession => ({
  id: SESSION, status, amountPence: 900, amountText: '£9.00', description: 'Link in Bio, 3 months', units: 3,
  expiresAt: new Date(Date.now() + 1e6).toISOString(), methods: [sui, usdc],
})
const quote = (): Quote => ({
  nonce: 'fedcba9876543210fedcba9876543210', session: SESSION, method: sui, amount: '16626639573', amountText: '16.626639573 SUI',
  priceText: '£9.00', units: 3, periodMs: '0', subscriptionRef: '', expiresMs: String(Date.now() + 115_000), signature: 'ab'.repeat(64),
})
const fake = (status: CheckoutSession['status'] = 'open'): SessionClient => ({
  getSession: async () => session(status),
  requestQuote: async () => quote(),
  submitPayment: async () => 'confirmed',
  paymentStatus: async () => 'confirmed',
  waitForPayment: async () => 'confirmed',
})
const wallet = async () => ({ digest: 'AkJZej7Bto2iCcX26Ab4CTQaBaVzKKUzN3ywTfwBmLZw' })
// The testnet PlatformConfig as the chain returns it (0.2 % to the treasury).
const suiClient = {
  core: {
    getObject: async () => ({
      object: {
        objectId: '0x7e3b9a5c5346850d0703df88fcab044644c3e92b84a65e59b4661ef0e7b96106',
        type: '0x610cf31fa9455893f1d0d139e6aa6ca4559a9f2acf07391c0d47c4e86a9c6af2::chain_payments::PlatformConfig',
        json: { fee_bps: '20', treasury: '0xa991ae11b0785718cd3ad1c616e804a4c083f431b3144bb845bdec651164864a' },
      },
    }),
  },
}
const state = computed(() => new URLSearchParams(location.search).get('state'))
</script>

<template>
  <AppToolShell title="Chain Payments kit" slug="chain-payments-kit" :docs-url="false" :dev-url="false" default-mode="light">
    <ChainCheckout v-if="!state || state === 'open'" :session-id="SESSION" :client="fake()" :sui-client="suiClient" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'paid'" :session-id="SESSION" :client="fake('paid')" :sui-client="suiClient" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'closed'" :session-id="SESSION" :client="fake('expired')" :sui-client="suiClient" :sign-and-execute="wallet" />
  </AppToolShell>
</template>
