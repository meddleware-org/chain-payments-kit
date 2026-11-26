<script setup lang="ts">
// File: the gallery page: the checkout in every state, with a fake session client and a fake wallet (no network). Not published. Related: gallery/main.ts (mounts it), e2e/a11y.spec.ts
// (the sweep over each state), e2e/screens.spec.ts (the screenshot).
// Every state of the checkout, with a fake session client and wallet (no network): the accessibility sweep and the
// screenshots read this page. `?state=` picks one state; without it, all are shown.
import { computed } from 'vue'
import { AppToolShell } from '@meddleware/ui'
import type { CheckoutSession, Quote, SessionClient } from '@meddleware/chain-payments-client'
import { ChainCheckout } from '../src'

// A session id in the service's shape, used for every fake.
const SESSION = '0123456789abcdef0123456789abcdef'
// The Sui testnet payment method of the fake session (the package and merchant ids are the live testnet ones, public chain ids).
const sui = {
  id: 'sui-testnet:SUI', chain: 'sui', network: 'testnet', symbol: 'SUI', decimals: 9, coinType: '0x2::sui::SUI',
  packageId: '0x610cf31fa9455893f1d0d139e6aa6ca4559a9f2acf07391c0d47c4e86a9c6af2',
  merchantObject: '0xd92a3ce208124219667d5b17a939617cc4dc816c093b91fd80f1f164e635d5e5',
}
// A second coin, so the coin choice is shown (6 decimals instead of 9).
const usdc = { ...sui, id: 'sui-testnet:USDC', symbol: 'USDC', decimals: 6, coinType: '0xa1ec::usdc::USDC' }
/** The fake session, with the given status (open, paid or expired) and both coins on offer. */
const session = (status: CheckoutSession['status'] = 'open'): CheckoutSession => ({
  id: SESSION, status, amountPence: 900, amountText: '£9.00', description: 'Link in Bio, 3 months', units: 3,
  expiresAt: new Date(Date.now() + 1e6).toISOString(), methods: [sui, usdc],
})
/** The fake quote for the SUI method, valid for 115 seconds so the countdown is visible. */
const quote = (): Quote => ({
  nonce: 'fedcba9876543210fedcba9876543210', session: SESSION, method: sui, amount: '16626639573', amountText: '16.626639573 SUI',
  priceText: '£9.00', units: 3, periodMs: '0', subscriptionRef: '', expiresMs: String(Date.now() + 115_000), signature: 'ab'.repeat(64),
})
/** A session client that answers instantly and confirms every payment. */
const fake = (status: CheckoutSession['status'] = 'open'): SessionClient => ({
  getSession: async () => session(status),
  requestQuote: async () => quote(),
  submitPayment: async () => 'confirmed',
  paymentStatus: async () => 'confirmed',
  waitForPayment: async () => 'confirmed',
})
// A wallet that signs at once and returns a fixed digest.
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
// The `state` query parameter picks one state; without it the open checkout shows.
const state = computed(() => new URLSearchParams(location.search).get('state'))
// A promise that never settles: holds a step (loading, quoting, signing) still for the screenshot and the check.
const never = <T,>() => new Promise<T>(() => {})
// The other states: the same checkout with a fake that stops (or answers) at the step the state shows.
const STATES = ['loading', 'quoting', 'signing', 'confirming', 'rejected', 'unapplied', 'error', 'expired'] as const
const staged = computed(() => (STATES as readonly string[]).includes(state.value ?? '') ? state.value : null)
/** The session client for the staged states: the fake, with one call that stops, fails or answers differently. */
const stagedClient = computed((): SessionClient => {
  const base = fake()
  switch (staged.value) {
    case 'loading': return { ...base, getSession: () => never() }
    case 'error': return { ...base, getSession: async () => { throw new Error('The checkout could not be loaded. Try again later.') } }
    case 'quoting': return { ...base, requestQuote: () => never() }
    case 'expired': return { ...base, requestQuote: async () => ({ ...quote(), expiresMs: String(Date.now() + 1500) }) }
    case 'confirming': return { ...base, submitPayment: async () => 'pending', waitForPayment: async () => 'pending' }
    case 'rejected': return { ...base, submitPayment: async () => 'rejected' }
    case 'unapplied': return { ...base, submitPayment: async () => 'unapplied' }
    default: return base
  }
})
// The signing state never gets a digest; every other state signs at once.
const stagedWallet = computed(() => (staged.value === 'signing' ? () => never<{ digest: string }>() : wallet))
</script>

<template>
  <AppToolShell title="Chain Payments kit" slug="chain-payments-kit" :docs-url="false" :dev-url="false" default-mode="light">
    <!-- One checkout per state; only the chosen one renders. `paid` and `closed` come from the session's status, the staged ones from the fake client's behaviour. -->
    <ChainCheckout v-if="!state || state === 'open'" :session-id="SESSION" :client="fake()" :sui-client="suiClient" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'paid'" :session-id="SESSION" :client="fake('paid')" :sui-client="suiClient" :sign-and-execute="wallet" />
    <ChainCheckout v-if="state === 'closed'" :session-id="SESSION" :client="fake('expired')" :sui-client="suiClient" :sign-and-execute="wallet" />
    <ChainCheckout v-if="staged" :session-id="SESSION" :client="stagedClient" :sui-client="suiClient" :sign-and-execute="stagedWallet" />
    <!-- The app is on mainnet while the coin is testnet: the checkout says so and never asks the wallet. -->
    <ChainCheckout v-if="state === 'wrong-network'" :session-id="SESSION" :client="fake()" :sui-client="suiClient" :sign-and-execute="wallet" network="mainnet" />
  </AppToolShell>
</template>
