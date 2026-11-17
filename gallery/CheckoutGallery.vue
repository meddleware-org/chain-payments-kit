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
  packageId: '0x5f67109c6b436fc0c0415d7f3e63ca10d374d8c4bb5e3b1f087cabb1c785bc14',
  merchantObject: '0x30b6d544652d35d4a481fa7e45adf8e514b9ae1596377e837b6fdf36d967dae8',
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
const state = computed(() => new URLSearchParams(location.search).get('state'))
</script>

<template>
  <AppToolShell title="Chain Payments kit" slug="chain-payments-kit" :docs-url="false" :dev-url="false" default-mode="light">
    <ChainCheckout v-if="!state || state === 'open'" :session-id="SESSION" :client="fake()" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'paid'" :session-id="SESSION" :client="fake('paid')" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'closed'" :session-id="SESSION" :client="fake('expired')" :sign-and-execute="wallet" />
  </AppToolShell>
</template>
