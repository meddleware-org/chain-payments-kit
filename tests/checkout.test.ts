// Unit tests for the `ChainCheckout` component, mounted in jsdom with a fake session client, a fake wallet and a fake Sui client (no network). The real Sui chain module builds the payment transaction; nothing executes it.
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { CheckoutSession, Quote, SessionClient } from '@meddleware/chain-payments-client'
import ChainCheckout from '../src/ChainCheckout.vue'

// A session id in the service's shape, used for every fake.
const SESSION = '0123456789abcdef0123456789abcdef'
// The Sui testnet payment method (the package and merchant ids are the live testnet ones, public chain ids).
const sui = {
  id: 'sui-testnet:SUI', chain: 'sui', network: 'testnet', symbol: 'SUI', decimals: 9, coinType: '0x2::sui::SUI',
  packageId: '0x610cf31fa9455893f1d0d139e6aa6ca4559a9f2acf07391c0d47c4e86a9c6af2',
  merchantObject: '0xd92a3ce208124219667d5b17a939617cc4dc816c093b91fd80f1f164e635d5e5',
}
// An open session offering SUI and a coin on a chain this version cannot pay on (`eth`), which the checkout must hide.
const session: CheckoutSession = {
  id: SESSION, status: 'open', amountPence: 300, amountText: '£3.00', description: 'Link in Bio, 1 month', units: 1,
  expiresAt: new Date(Date.now() + 1e6).toISOString(),
  methods: [sui, { ...sui, id: 'eth:ETH', chain: 'eth', symbol: 'ETH' }],
}
/** quote(expiresIn): the fake quote for the SUI method, valid for `expiresIn` ms from now. */
const quote = (expiresIn = 120_000): Quote => ({
  nonce: 'fedcba9876543210fedcba9876543210', session: SESSION, method: sui, amount: '5542213191', amountText: '5.542213191 SUI',
  priceText: '£3.00', units: 1, periodMs: '0', subscriptionRef: '', expiresMs: String(Date.now() + expiresIn), signature: 'ab'.repeat(64),
})

// The platform treasury and the `PlatformConfig` the fake chain returns (20 basis points), so the fee line can be checked.
const TREASURY = '0xa991ae11b0785718cd3ad1c616e804a4c083f431b3144bb845bdec651164864a'
const platformConfig = {
  objectId: '0x7e3b9a5c5346850d0703df88fcab044644c3e92b84a65e59b4661ef0e7b96106',
  type: '0x610cf31fa9455893f1d0d139e6aa6ca4559a9f2acf07391c0d47c4e86a9c6af2::chain_payments::PlatformConfig',
  json: { fee_bps: '20', treasury: TREASURY },
}
// A Sui client whose only call, `getObject`, returns that `PlatformConfig`.
const suiClient = { core: { getObject: vi.fn(async () => ({ object: platformConfig })) } }

/** client(over): a session client that answers every call successfully, with any call replaced by `over`. */
function client(over: Partial<SessionClient> = {}): SessionClient {
  return {
    getSession: vi.fn(async () => session),
    requestQuote: vi.fn(async () => quote()),
    submitPayment: vi.fn(async () => 'confirmed' as const),
    paymentStatus: vi.fn(async () => 'confirmed' as const),
    waitForPayment: vi.fn(async () => 'confirmed' as const),
    ...over,
  }
}

// The checkout component, mounted with a fake session client, a fake wallet and the fake chain: the happy path, every refusal and every recovery.
describe('ChainCheckout', () => {
  // The happy path: the unsupported coin is hidden, the exact amount and network are shown, the wallet is asked once, the service is told the digest and the buyer sees the thank-you.
  it('offers only supported chains, quotes exactly, pays and reports', async () => {
    const c = client()
    const signAndExecute = vi.fn(async () => ({ digest: 'D1' }))
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient, client: c, signAndExecute } })
    await flushPromises()
    expect(w.text()).toContain('£3.00')
    expect(w.text()).toContain('Paid in SUI')
    expect(w.text()).not.toContain('ETH')
    await w.get('button').trigger('click')
    // The first quote also loads the Sui module (to read the platform fee).
    await vi.waitFor(() => expect(w.text()).toContain('Pay exactly 5.542213191 SUI'), { timeout: 10_000 })
    expect(w.text()).toContain('Network: Sui testnet.')
    expect(w.text()).toContain('returned to you in the same transaction')
    await w.get('button').trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(signAndExecute).toHaveBeenCalledOnce(), { timeout: 10_000 })
    await flushPromises()
    expect(c.submitPayment).toHaveBeenCalledWith(SESSION, quote().nonce, 'D1')
    expect(w.text()).toContain('Paid. Thank you.')
    expect(w.emitted('paid')?.[0]?.[0]).toMatchObject({ digest: 'D1' })
  })

  // A declined wallet prompt keeps the quote and says so in plain words; nothing is submitted.
  it('keeps the quote when the wallet refuses, and says so', async () => {
    const signAndExecute = vi.fn(async () => {
      throw new Error('User rejected the request')
    })
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient, client: client(), signAndExecute } })
    await flushPromises()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('The wallet did not sign the payment.'), { timeout: 10_000 })
    expect(w.text()).toContain('Pay with your wallet')
  })

  // An expired quote offers "Get a new price"; a closed session and a failing load are shown as such.
  it('asks for a new price once the quote expires, and shows closed and failing checkouts', async () => {
    const w = mount(ChainCheckout, {
      props: { sessionId: SESSION, suiClient, client: client({ requestQuote: vi.fn(async () => quote(-1)) }), signAndExecute: vi.fn() },
    })
    await flushPromises()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Get a new price')
    const closed = mount(ChainCheckout, {
      props: { sessionId: SESSION, suiClient, client: client({ getSession: vi.fn(async () => ({ ...session, status: 'expired' as const })) }), signAndExecute: vi.fn() },
    })
    await flushPromises()
    expect(closed.text()).toContain('This checkout is closed')
    const rejected = mount(ChainCheckout, {
      props: { sessionId: SESSION, suiClient, client: client({ submitPayment: vi.fn(async () => 'rejected' as const) }), signAndExecute: vi.fn(async () => ({ digest: 'D2' })) },
    })
    await flushPromises()
    await rejected.get('button').trigger('click')
    await flushPromises()
    await rejected.get('button').trigger('click')
    await vi.waitFor(() => expect(rejected.text()).toContain('did not pay this checkout'), { timeout: 10_000 })
  })

  // `unapplied`: the transaction paid, but not this checkout; the buyer is told the seller can credit or refund it.
  it('says so when a payment arrives for a checkout already paid or closed', async () => {
    const w = mount(ChainCheckout, {
      props: { sessionId: SESSION, suiClient, client: client({ submitPayment: vi.fn(async () => 'unapplied' as const) }), signAndExecute: vi.fn(async () => ({ digest: 'D3' })) },
    })
    await flushPromises()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('already been paid or closed'), { timeout: 10_000 })
    expect(w.emitted('failed')?.[0]).toEqual(['unapplied'])
    expect(w.emitted('paid')).toBeUndefined()
  })

  // The fee is read from the chain, shown, and read again just before signing; if the second read fails nothing is signed.
  it('shows the platform fee read from the chain, and signs nothing when it cannot be read again', async () => {
    const sign = vi.fn(async () => ({ digest: 'D4' }))
    const reader = { core: { getObject: vi.fn(async () => ({ object: platformConfig })) } }
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient: reader, client: client(), signAndExecute: sign } })
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Platform fee (included)'), { timeout: 10_000 })
    expect(w.text()).toContain('0.011084426 SUI to the platform (0xa991…864a)')
    reader.core.getObject.mockRejectedValueOnce(new Error('fullnode down'))
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('could not be read from the network, so nothing was signed')
    expect(sign).not.toHaveBeenCalled()
  })

  // A failed report to the service is retried with back-off, and the signed payment is kept in this tab for a reload.
  it('retries a failed submission and keeps the payment for a reload', async () => {
    sessionStorage.clear()
    let calls = 0
    const submitPayment = vi.fn(async () => {
      calls++
      if (calls < 3) throw new Error('network down')
      return 'confirmed' as const
    })
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient, client: client({ submitPayment }), signAndExecute: vi.fn(async () => ({ digest: 'D5' })) } })
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Pay exactly'), { timeout: 10_000 })
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Paid. Thank you.'), { timeout: 10_000 })
    expect(submitPayment).toHaveBeenCalledTimes(3)
    expect(sessionStorage.getItem(`chain-payments:pending:${SESSION}`)).toBeNull()
  })

  // After a remount the kept payment is followed to its answer without signing again.
  it('resumes a signed payment after a remount, without signing again', async () => {
    sessionStorage.clear()
    sessionStorage.setItem(`chain-payments:pending:${SESSION}`, JSON.stringify({ quote: quote(), digest: 'D6' }))
    const sign = vi.fn(async () => ({ digest: 'never' }))
    const submitPayment = vi.fn(async () => 'confirmed' as const)
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient, client: client({ submitPayment }), signAndExecute: sign } })
    await vi.waitFor(() => expect(w.text()).toContain('Paid. Thank you.'), { timeout: 10_000 })
    expect(submitPayment).toHaveBeenCalledWith(SESSION, quote().nonce, 'D6')
    expect(sign).not.toHaveBeenCalled()
    expect(w.emitted('paid')?.[0]?.[0]).toMatchObject({ digest: 'D6' })
    expect(sessionStorage.getItem(`chain-payments:pending:${SESSION}`)).toBeNull()
  })

  // With the wallet on another network the checkout says so and never asks the wallet.
  it('on another network than the app, says so and never asks the wallet', async () => {
    const signAndExecute = vi.fn(async () => ({ digest: 'never' }))
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, client: client(), suiClient, signAndExecute, network: 'mainnet' } })
    await flushPromises()
    expect(w.text()).toContain('This checkout is for Sui testnet; this app is on Sui mainnet.')
    await w.findAll('button').find((b) => b.text() === 'Get the exact price')!.trigger('click')
    await flushPromises()
    const pay = w.findAll('button').find((b) => b.text() === 'Pay with your wallet')!
    expect(pay.attributes('disabled')).toBeDefined()
    await pay.trigger('click')
    await flushPromises()
    expect(signAndExecute).not.toHaveBeenCalled()
    // The same network: no notice, and paying works as before.
    const ok = mount(ChainCheckout, { props: { sessionId: SESSION, client: client(), suiClient, signAndExecute, network: 'testnet' } })
    await flushPromises()
    expect(ok.text()).not.toContain('This checkout is for')
  })

  // A payment the network has not confirmed keeps a "Check again" button.
  it('offers Check again while a payment is still unconfirmed', async () => {
    sessionStorage.clear()
    const c = client({ submitPayment: vi.fn(async () => 'pending' as const), waitForPayment: vi.fn(async () => 'pending' as const) })
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, suiClient, client: c, signAndExecute: vi.fn(async () => ({ digest: 'D7' })) } })
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Pay exactly'), { timeout: 10_000 })
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('has not confirmed the payment yet'), { timeout: 10_000 })
    expect(sessionStorage.getItem(`chain-payments:pending:${SESSION}`)).not.toBeNull()
    c.submitPayment = vi.fn(async () => 'confirmed' as const)
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('Paid. Thank you.'), { timeout: 10_000 })
  })
})

