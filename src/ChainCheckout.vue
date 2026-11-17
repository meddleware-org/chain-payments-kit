<script setup lang="ts">
// Checkout for one Chain Payments session: choose a coin, see the exact amount (held for a short time), pay from the
// wallet the host app connects, then follow the payment to confirmation. The kit builds no transaction itself: the chain
// module from @meddleware/chain-payments-client does, and the host's `signAndExecute` signs it.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { UiButton, UiNotice, UiSegmentedControl } from '@meddleware/ui'
import { ChainPaymentsError, createSessionClient, loadChain, supported } from '@meddleware/chain-payments-client'
import type { CheckoutSession, Quote, SessionClient } from '@meddleware/chain-payments-client'
import type { PlatformFee, SuiObjectReader } from '@meddleware/chain-payments-client/sui'

const props = defineProps<{
  sessionId: string
  /** The Chain Payments public origin. Ignored when `client` is given. */
  baseUrl?: string
  /** Signs and executes the chain module's transaction with the buyer's wallet; resolves with the digest. */
  signAndExecute: (tx: unknown) => Promise<{ digest: string }>
  /** Reads chain objects (the platform fee's terms) before signing: the wallet adapter's Sui client. */
  suiClient: SuiObjectReader
  /** Injected session client (tests and galleries). */
  client?: SessionClient
  /** Heading level of the checkout's title. */
  level?: 2 | 3 | 4
}>()

const emit = defineEmits<{
  paid: [{ digest: string; quote: Quote }]
  failed: [reason: string]
}>()

type Step = 'loading' | 'choose' | 'quoting' | 'ready' | 'signing' | 'confirming' | 'paid' | 'rejected' | 'unapplied' | 'closed' | 'error'

const client = props.client ?? createSessionClient({ baseUrl: props.baseUrl ?? '' })
const step = ref<Step>('loading')
const session = ref<CheckoutSession | null>(null)
const method = ref('')
const quote = ref<Quote | null>(null)
const problem = ref('')
const fee = ref<PlatformFee | null>(null)
const now = ref(Date.now())
const announcement = ref('')
let timer: ReturnType<typeof setInterval> | undefined

const usable = computed(() => {
  const m = session.value?.methods ?? []
  const ok = supported(m)
  return m.filter((_, i) => ok[i])
})
const options = computed(() => usable.value.map((m) => ({ id: m.id, label: m.symbol })))
const secondsLeft = computed(() => (quote.value ? Math.max(0, Math.floor((Number(quote.value.expiresMs) - now.value) / 1000)) : 0))
const countdown = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)
const expired = computed(() => step.value === 'ready' && secondsLeft.value === 0)
const headingTag = computed(() => `h${props.level ?? 2}`)
/** "Sui testnet": the network the wallet must be on, shown before it is asked to sign. */
const CHAIN_NAMES: Record<string, string> = { sui: 'Sui' }
const networkText = computed(() => {
  const m = quote.value?.method
  if (!m) return ''
  return `${Object.hasOwn(CHAIN_NAMES, m.chain) ? CHAIN_NAMES[m.chain] : m.chain} ${m.network}`
})

/** A smallest-unit amount in whole coins, e.g. 11084426n with 9 decimals → "0.011084426". */
function coins(v: bigint, decimals: number): string {
  const s = v.toString().padStart(decimals + 1, '0')
  const whole = s.slice(0, s.length - decimals)
  const frac = s.slice(s.length - decimals).replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole
}
const feeText = computed(() => {
  const q = quote.value
  return q && fee.value ? `${coins(fee.value.fee, q.method.decimals)} ${q.method.symbol}` : ''
})
const treasuryText = computed(() => (fee.value ? `${fee.value.treasury.slice(0, 6)}…${fee.value.treasury.slice(-4)}` : ''))

/** The platform fee of a quote, read from the chain (Sui methods). */
async function readFee(q: Quote): Promise<PlatformFee | null> {
  if (q.method.chain !== 'sui') return null
  const { readPlatformFee } = await import('@meddleware/chain-payments-client/sui')
  return readPlatformFee(props.suiClient, q)
}

/** "1 minute 59 seconds" for a screen reader. */
function spoken(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`
  return [m ? part(m, 'minute') : '', s || !m ? part(s, 'second') : ''].filter(Boolean).join(' ')
}

function message(e: unknown): string {
  if (e instanceof ChainPaymentsError) return e.message
  if (e instanceof Error && /reject|denied|cancel/i.test(e.message)) return 'The wallet did not sign the payment.'
  return e instanceof Error ? e.message : 'Something went wrong.'
}

async function load() {
  step.value = 'loading'
  try {
    session.value = await client.getSession(props.sessionId)
    if (session.value.status !== 'open') {
      step.value = session.value.status === 'paid' ? 'paid' : 'closed'
      return
    }
    if (!usable.value.length) {
      problem.value = 'This checkout offers no payment method this page can use.'
      step.value = 'error'
      return
    }
    method.value = usable.value[0]!.id
    step.value = 'choose'
  } catch (e) {
    problem.value = message(e)
    step.value = 'error'
  }
}

async function getQuote() {
  step.value = 'quoting'
  problem.value = ''
  try {
    const q = await client.requestQuote(props.sessionId, method.value)
    fee.value = await readFee(q)
    quote.value = q
    now.value = Date.now()
    step.value = 'ready'
    announcement.value = `Pay exactly ${quote.value.amountText}. This price is held for ${spoken(secondsLeft.value)}.`
  } catch (e) {
    problem.value = message(e)
    step.value = 'choose'
  }
}

async function pay() {
  const q = quote.value
  if (!q || expired.value) return
  step.value = 'signing'
  problem.value = ''
  // Read the fee again just before the wallet opens, so what is shown is what the chain says now.
  try {
    fee.value = await readFee(q)
  } catch {
    problem.value = 'The platform fee could not be read from the network, so nothing was signed. Try again.'
    step.value = 'ready'
    return
  }
  let digest: string
  try {
    const chain = await loadChain(q.method.chain)
    digest = (await props.signAndExecute(chain.buildPayment(q))).digest
  } catch (e) {
    problem.value = message(e)
    step.value = 'ready'
    return
  }
  step.value = 'confirming'
  announcement.value = 'Payment sent. Waiting for the network to confirm it.'
  try {
    let status = await client.submitPayment(props.sessionId, q.nonce, digest)
    if (status === 'pending') status = await client.waitForPayment(props.sessionId, digest)
    if (status === 'confirmed') {
      step.value = 'paid'
      announcement.value = 'Payment confirmed.'
      emit('paid', { digest, quote: q })
    } else if (status === 'rejected') {
      step.value = 'rejected'
      emit('failed', 'rejected')
    } else if (status === 'unapplied') {
      step.value = 'unapplied'
      announcement.value = 'Payment received, but this checkout was already paid or closed.'
      emit('failed', 'unapplied')
    } else {
      problem.value = 'The network has not confirmed the payment yet. It will be checked again; you can close this page.'
    }
  } catch (e) {
    problem.value = message(e)
  }
}

watch(method, () => {
  if (step.value === 'ready') {
    quote.value = null
    step.value = 'choose'
  }
})

watch(expired, (isExpired) => {
  if (isExpired) announcement.value = 'The price is no longer held. Get a new price to continue.'
})

onMounted(() => {
  void load()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="chain-checkout" aria-labelledby="chain-checkout-title" :aria-busy="step === 'loading' || step === 'quoting' || step === 'confirming'">
    <component :is="headingTag" id="chain-checkout-title" class="title">Pay with crypto</component>
    <p v-if="step === 'loading'" class="muted">Loading the checkout…</p>

    <template v-else-if="session">
      <p class="summary">
        <span class="description">{{ session.description }}</span>
        <strong class="price">{{ session.amountText }}</strong>
      </p>

      <template v-if="step === 'choose' || step === 'quoting' || step === 'ready' || step === 'signing'">
        <UiSegmentedControl
          v-if="options.length > 1"
          v-model="method"
          :options="options"
          label="Coin"
          :label-hidden="false"
        />
        <p v-else class="muted">Paid in {{ options[0]?.label }}.</p>

        <div v-if="step === 'ready' || step === 'signing'" class="quote">
          <p class="amount">Pay exactly <strong>{{ quote?.amountText }}</strong></p>
          <dl v-if="fee" class="split">
            <dt>Platform fee (included)</dt>
            <dd>{{ feeText }} to the platform ({{ treasuryText }}); the seller receives the rest.</dd>
          </dl>
          <p class="muted">Network: {{ networkText }}.</p>
          <p v-if="!expired" class="muted">This price is held for <span class="countdown">{{ countdown }}</span>.</p>
          <p class="muted">Your wallet shows the same amount. Any coin left over is returned to you in the same transaction.</p>
        </div>

        <p class="actions">
          <UiButton v-if="step === 'choose' || step === 'quoting' || expired" :busy="step === 'quoting'" @click="getQuote">
            {{ expired ? 'Get a new price' : 'Get the exact price' }}
          </UiButton>
          <UiButton v-else :busy="step === 'signing'" @click="pay">Pay with your wallet</UiButton>
        </p>
      </template>

      <UiNotice v-if="step === 'confirming'" type="info" message="Payment sent. Waiting for the network to confirm it…" />
      <UiNotice v-if="step === 'paid'" type="ok" message="Paid. Thank you." />
      <UiNotice
        v-if="step === 'unapplied'"
        type="warning"
        message="Your payment arrived, but this checkout had already been paid or closed, so it bought nothing here. The seller has been told and can credit it or refund it to the address that paid; contact them if you have not heard back."
      />
      <UiNotice v-if="step === 'rejected'" type="error" message="That transaction did not pay this checkout. Nothing was charged by this page; check your wallet's history." />
      <UiNotice v-if="step === 'closed'" type="warning" message="This checkout is closed. Start a new one to pay." />
    </template>

    <UiNotice v-if="problem" type="error" :message="problem" />
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
.chain-checkout {
  display: grid;
  gap: var(--space-sm);
}

.title {
  margin: 0;
  font-size: var(--font-size-lg, 1.25rem);
}

.summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-xs);
  margin: 0;
}

.price {
  font-size: var(--font-size-lg, 1.25rem);
}

.quote {
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.split {
  margin: 0;
}

.split dt {
  font-weight: 600;
}

.split dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.quote p {
  margin: var(--space-2xs) 0;
}

.amount {
  overflow-wrap: anywhere;
}

.countdown {
  font-variant-numeric: tabular-nums;
}

.muted {
  margin: 0;
  color: var(--muted);
}

.actions {
  margin: 0;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
