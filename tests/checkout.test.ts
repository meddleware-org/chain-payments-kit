import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { CheckoutSession, Quote, SessionClient } from '@meddleware/chain-payments-client'
import ChainCheckout from '../src/ChainCheckout.vue'

const SESSION = '0123456789abcdef0123456789abcdef'
const sui = {
  id: 'sui-testnet:SUI', chain: 'sui', network: 'testnet', symbol: 'SUI', decimals: 9, coinType: '0x2::sui::SUI',
  packageId: '0x5f67109c6b436fc0c0415d7f3e63ca10d374d8c4bb5e3b1f087cabb1c785bc14',
  merchantObject: '0x30b6d544652d35d4a481fa7e45adf8e514b9ae1596377e837b6fdf36d967dae8',
}
const session: CheckoutSession = {
  id: SESSION, status: 'open', amountPence: 300, amountText: '£3.00', description: 'Link in Bio, 1 month', units: 1,
  expiresAt: new Date(Date.now() + 1e6).toISOString(),
  methods: [sui, { ...sui, id: 'eth:ETH', chain: 'eth', symbol: 'ETH' }],
}
const quote = (expiresIn = 120_000): Quote => ({
  nonce: 'fedcba9876543210fedcba9876543210', session: SESSION, method: sui, amount: '5542213191', amountText: '5.542213191 SUI',
  priceText: '£3.00', units: 1, periodMs: '0', subscriptionRef: '', expiresMs: String(Date.now() + expiresIn), signature: 'ab'.repeat(64),
})

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

describe('ChainCheckout', () => {
  it('offers only supported chains, quotes exactly, pays and reports', async () => {
    const c = client()
    const signAndExecute = vi.fn(async () => ({ digest: 'D1' }))
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, client: c, signAndExecute } })
    await flushPromises()
    expect(w.text()).toContain('£3.00')
    expect(w.text()).toContain('Paid in SUI')
    expect(w.text()).not.toContain('ETH')
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Pay exactly 5.542213191 SUI')
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

  it('keeps the quote when the wallet refuses, and says so', async () => {
    const signAndExecute = vi.fn(async () => {
      throw new Error('User rejected the request')
    })
    const w = mount(ChainCheckout, { props: { sessionId: SESSION, client: client(), signAndExecute } })
    await flushPromises()
    await w.get('button').trigger('click')
    await flushPromises()
    await w.get('button').trigger('click')
    await vi.waitFor(() => expect(w.text()).toContain('The wallet did not sign the payment.'), { timeout: 10_000 })
    expect(w.text()).toContain('Pay with your wallet')
  })

  it('asks for a new price once the quote expires, and shows closed and failing checkouts', async () => {
    const w = mount(ChainCheckout, {
      props: { sessionId: SESSION, client: client({ requestQuote: vi.fn(async () => quote(-1)) }), signAndExecute: vi.fn() },
    })
    await flushPromises()
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Get a new price')
    const closed = mount(ChainCheckout, {
      props: { sessionId: SESSION, client: client({ getSession: vi.fn(async () => ({ ...session, status: 'expired' as const })) }), signAndExecute: vi.fn() },
    })
    await flushPromises()
    expect(closed.text()).toContain('This checkout is closed')
    const rejected = mount(ChainCheckout, {
      props: { sessionId: SESSION, client: client({ submitPayment: vi.fn(async () => 'rejected' as const) }), signAndExecute: vi.fn(async () => ({ digest: 'D2' })) },
    })
    await flushPromises()
    await rejected.get('button').trigger('click')
    await flushPromises()
    await rejected.get('button').trigger('click')
    await vi.waitFor(() => expect(rejected.text()).toContain('did not pay this checkout'), { timeout: 10_000 })
  })
})
