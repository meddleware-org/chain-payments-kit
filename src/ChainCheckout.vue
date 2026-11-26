<script setup lang="ts">
// File: ChainCheckout, the Vue checkout for one Chain Payments session (the package's only component). Props: `sessionId`, `baseUrl`, `signAndExecute`, `suiClient`, `client`, `level`,
// `network`. Emits: `paid` (with the transaction digest and the quote) and `failed` (with a reason). Related: `@meddleware/chain-payments-client` (the session client and the chain modules
// this component uses; it builds no transaction itself), `link-in-bio-ui` (the consumer), `gallery/` (every state, for the browser tests), `@meddleware/ui` (the controls).
//
// The flow is a small state machine (`Step`): loading, choose (a coin), quoting, ready (an exact amount held for a short time), signing (the host's wallet), confirming (following the
// transaction to an answer) and a final state: paid, rejected, unapplied, closed or error. There is deliberately no HTML comment before the template's root element: a comment next to the root
// would make the component a fragment in a development build and attributes passed by the parent would not fall through.
// Checkout for one Chain Payments session: choose a coin, see the exact amount (held for a short time), pay from the
// wallet the host app connects, then follow the payment to confirmation. The kit builds no transaction itself: the chain
// module from @meddleware/chain-payments-client does, and the host's `signAndExecute` signs it.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { UiButton, UiNotice, UiSegmentedControl } from '@meddleware/ui'
import { ChainPaymentsError, createSessionClient, loadChain, supported } from '@meddleware/chain-payments-client'
import type { CheckoutSession, PaymentStatus, Quote, SessionClient } from '@meddleware/chain-payments-client'
import type { PlatformFee, SuiObjectReader } from '@meddleware/chain-payments-client/sui'

const props = defineProps<{
  /** The checkout session to pay: 32 lowercase hex characters (the session client refuses anything else). */
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
  /**
   * The network the host app's wallet and chain reads are on (for example `testnet`). When the chosen coin's network is
   * another, the checkout says so and never asks the wallet: a payment there would fail, or be on the wrong chain.
   */
  network?: string
}>()

/** The two outcomes the host cares about: the payment was confirmed, or it ended without paying this checkout (`rejected` or `unapplied`). */
const emit = defineEmits<{
  paid: [{ digest: string; quote: Quote }]
  failed: [reason: string]
}>()

/** Where the checkout is: the state the template renders. */
type Step = 'loading' | 'choose' | 'quoting' | 'ready' | 'signing' | 'confirming' | 'paid' | 'rejected' | 'unapplied' | 'closed' | 'error'

/** The session client: the injected one (tests, the gallery), or one for `baseUrl`. */
const client = props.client ?? createSessionClient({ baseUrl: props.baseUrl ?? '' })
/** The current step. */
const step = ref<Step>('loading')
/** The session as the service reported it (description, price, methods); `null` until it is read. */
const session = ref<CheckoutSession | null>(null)
/** The id of the payment method (coin) the buyer has chosen. */
const method = ref('')
/** The exact, signed quote for the chosen method; `null` until one is requested. */
const quote = ref<Quote | null>(null)
/** A message for the buyer when something went wrong (shown as an error notice); empty otherwise. */
const problem = ref('')
/** The platform fee read from the chain for the current quote (Sui); `null` when there is none. */
const fee = ref<PlatformFee | null>(null)
/** The payment being followed (after the wallet signed): kept in this tab until it has an answer. */
const following = ref<{ quote: Quote; digest: string } | null>(null)
/** The current time in ms, refreshed every second so the countdown moves. */
const now = ref(Date.now())
/** The text of the polite live region: what a screen reader is told as the state changes. */
const announcement = ref('')
/** The countdown's interval timer, cleared when the component unmounts. */
let timer: ReturnType<typeof setInterval> | undefined

/** The session's methods this version of the client can pay on (a method on an unknown chain is hidden, not shown disabled). */
const usable = computed(() => {
  const m = session.value?.methods ?? []
  const ok = supported(m)
  return m.filter((_, i) => ok[i])
})
/** The coin choices as segmented-control options. */
const options = computed(() => usable.value.map((m) => ({ id: m.id, label: m.symbol })))
/** Whole seconds until the quote expires, never below 0. (The expiry is a string: it can exceed 2^53.) */
const secondsLeft = computed(() => (quote.value ? Math.max(0, Math.floor((Number(quote.value.expiresMs) - now.value) / 1000)) : 0))
/** `secondsLeft` as minutes and seconds, e.g. `1:59`. */
const countdown = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)
/** True when the held price has run out while the buyer is looking at it. */
const expired = computed(() => step.value === 'ready' && secondsLeft.value === 0)
/** The title's heading element (`h2` to `h4`), so the host fits the checkout into its own outline. */
const headingTag = computed(() => `h${props.level ?? 2}`)
/** How each chain is named for a person (looked up as an own key only: the chain name comes from the service). */
const CHAIN_NAMES: Record<string, string> = { sui: 'Sui' }
/** "Sui testnet": the network the wallet must be on, shown before it is asked to sign. */
const networkText = computed(() => {
  const m = quote.value?.method
  if (!m) return ''
  return `${Object.hasOwn(CHAIN_NAMES, m.chain) ? CHAIN_NAMES[m.chain] : m.chain} ${m.network}`
})
/** The chosen coin's method (the quote's once there is one). */
const chosen = computed(() => quote.value?.method ?? usable.value.find((m) => m.id === method.value) ?? null)
/** "This checkout is for Sui testnet; this app is on Sui mainnet.", or '' when the networks agree (or none was given). */
const wrongNetwork = computed(() => {
  const m = chosen.value
  if (!props.network || !m || m.network === props.network) return ''
  const chain = Object.hasOwn(CHAIN_NAMES, m.chain) ? CHAIN_NAMES[m.chain] : m.chain
  return `This checkout is for ${chain} ${m.network}; this app is on ${chain} ${props.network}.`
})

/** A smallest-unit amount in whole coins, e.g. 11084426n with 9 decimals → "0.011084426". */
function coins(v: bigint, decimals: number): string {
  // Work on the digit string, never a float: the figure shown is the figure paid. Pad so there is always a whole part.
  const s = v.toString().padStart(decimals + 1, '0')
  const whole = s.slice(0, s.length - decimals)
  const frac = s.slice(s.length - decimals).replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : whole
}
/** The platform fee as text with its symbol, or empty when there is no fee to show. */
const feeText = computed(() => {
  const q = quote.value
  return q && fee.value ? `${coins(fee.value.fee, q.method.decimals)} ${q.method.symbol}` : ''
})
/** The treasury address shortened to its first six and last four characters (the full address is on the chain). */
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

/** What to tell the buyer about an error: the service's own words, a plain sentence for a declined wallet prompt, or a generic fallback. */
function message(e: unknown): string {
  if (e instanceof ChainPaymentsError) return e.message
  if (e instanceof Error && /reject|denied|cancel/i.test(e.message)) return 'The wallet did not sign the payment.'
  return e instanceof Error ? e.message : 'Something went wrong.'
}

/**
 * Reads the session and chooses the first step: follows a payment already signed in this tab; shows "paid" or "closed" for a session that is not open; an error when no method is usable;
 * otherwise lets the buyer choose a coin.
 */
async function load() {
  step.value = 'loading'
  try {
    session.value = await client.getSession(props.sessionId)
    // A payment signed in this tab earlier (a reload, a failed submission): follow it to its answer first.
    const saved = remembered()
    if (saved) {
      void follow(saved.quote, saved.digest)
      return
    }
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

/** Asks the service for the exact quote of the chosen coin, reads the platform fee, and moves to `ready` (or back to `choose` with the reason). */
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

/**
 * Pays the quote with the host's wallet: refuses an expired quote or a wallet on another network, re-reads the platform fee just before the wallet opens, has the chain module build the
 * transaction and the host sign it, remembers the digest, then follows the payment to its answer.
 */
async function pay() {
  const q = quote.value
  if (!q || expired.value || wrongNetwork.value) return
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
  remember(q, digest)
  await follow(q, digest)
}

// A signed payment is kept in sessionStorage (this tab only) until the service answers, so a failed submission or a
// reload never leaves a paid transaction unreported. The service also finds such payments from their events (it does not
// depend on this), but this way the buyer sees the outcome. Nothing here is secret: a quote and a transaction digest.
/** The key under which this session's signed payment is kept in the tab. */
const storageKey = () => `chain-payments:pending:${props.sessionId}`
/** Keeps the quote and the digest of a payment just signed (this tab only); a blocked storage only loses the reload safety net. */
function remember(q: Quote, digest: string) {
  try {
    sessionStorage.setItem(storageKey(), JSON.stringify({ quote: q, digest }))
  } catch {
    /* storage unavailable: the in-memory follow still runs */
  }
}
/** Drops the kept payment once the service has given its final answer. */
function forget() {
  try {
    sessionStorage.removeItem(storageKey())
  } catch {
    /* nothing to forget */
  }
}
/** The kept payment for this session, if there is a well-formed one for it (a different session's or a damaged record is ignored). */
function remembered(): { quote: Quote; digest: string } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(storageKey()) ?? 'null')
    if (v && typeof v.digest === 'string' && v.quote?.session === props.sessionId && typeof v.quote?.nonce === 'string') return v
  } catch {
    /* unreadable: ignore */
  }
  return null
}

/** Retries before a failed submission is left to "Check again" (or a reload): 1, 2, 4 and 8 seconds apart. */
const SUBMIT_ATTEMPTS = 5
/** Resolves after `ms` milliseconds (the back-off between submission attempts). */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Follows a signed payment to its answer: tells the service (retrying with back-off if that fails), waits while it is pending, and ends in `paid`, `rejected` or `unapplied`; anything else
 * leaves a message and, for a failed submission, the "Check again" button. The payment is forgotten only when the service has answered.
 */
async function follow(q: Quote, digest: string) {
  following.value = { quote: q, digest }
  quote.value = q
  step.value = 'confirming'
  problem.value = ''
  announcement.value = 'Payment sent. Waiting for the network to confirm it.'
  let status: PaymentStatus | undefined
  for (let attempt = 1; attempt <= SUBMIT_ATTEMPTS && status === undefined; attempt++) {
    try {
      status = await client.submitPayment(props.sessionId, q.nonce, digest)
    } catch (e) {
      if (attempt === SUBMIT_ATTEMPTS) {
        problem.value = `${message(e)} Your payment is saved in this tab: choose Check again, or reload the page later.`
        return
      }
      await sleep(1000 * 2 ** (attempt - 1))
    }
  }
  try {
    if (status === 'pending') status = await client.waitForPayment(props.sessionId, digest)
  } catch (e) {
    problem.value = `${message(e)} Your payment is saved in this tab: choose Check again, or reload the page later.`
    return
  }
  if (status === 'confirmed') {
    forget()
    step.value = 'paid'
    announcement.value = 'Payment confirmed.'
    emit('paid', { digest, quote: q })
  } else if (status === 'rejected') {
    forget()
    step.value = 'rejected'
    emit('failed', 'rejected')
  } else if (status === 'unapplied') {
    forget()
    step.value = 'unapplied'
    announcement.value = 'Payment received, but this checkout was already paid or closed.'
    emit('failed', 'unapplied')
  } else {
    problem.value = 'The network has not confirmed the payment yet. It is checked again on its own; you can close this page.'
  }
}

/** The "Check again" button: follows the saved payment again. */
async function checkAgain() {
  if (following.value) await follow(following.value.quote, following.value.digest)
}

// Choosing another coin discards the held quote (it was for the old one) and goes back to choosing.
watch(method, () => {
  if (step.value === 'ready') {
    quote.value = null
    step.value = 'choose'
  }
})

// Tell a screen reader when the held price runs out.
watch(expired, (isExpired) => {
  if (isExpired) announcement.value = 'The price is no longer held. Get a new price to continue.'
})

// On mount: read the session, and start the one-second tick that drives the countdown. On unmount: stop it.
onMounted(() => {
  void load()
  timer = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <section class="chain-checkout" aria-labelledby="chain-checkout-title" :aria-busy="step === 'loading' || step === 'quoting' || step === 'confirming'">
    <component :is="headingTag" id="chain-checkout-title" class="title">Pay with crypto</component>
    <!-- The title and the session's summary (what it is for, and the price in the seller's currency). -->
    <p v-if="step === 'loading'" class="muted">Loading the checkout…</p>

    <template v-else-if="session">
      <p class="summary">
        <span class="description">{{ session.description }}</span>
        <strong class="price">{{ session.amountText }}</strong>
      </p>

      <!-- Choosing, quoting, ready and signing share one block: the coin choice, the exact price, and the button for the next action. -->
      <template v-if="step === 'choose' || step === 'quoting' || step === 'ready' || step === 'signing'">
        <UiSegmentedControl
          v-if="options.length > 1"
          v-model="method"
          :options="options"
          label="Coin"
          :label-hidden="false"
        />
        <p v-else class="muted">Paid in {{ options[0]?.label }}.</p>

        <!-- The exact amount, the platform fee included in it, the network, how long the price is held, and that the wallet shows the same amount. -->
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

        <!-- The wallet is on another network than the coin: say so and disable the pay button (it would fail or pay on the wrong chain). -->
        <UiNotice v-if="wrongNetwork" type="warning" :message="`${wrongNetwork} Nothing can be paid here; ask the seller.`" />
        <p class="actions">
          <UiButton v-if="step === 'choose' || step === 'quoting' || expired" :busy="step === 'quoting'" @click="getQuote">
            {{ expired ? 'Get a new price' : 'Get the exact price' }}
          </UiButton>
          <UiButton v-else :busy="step === 'signing'" :disabled="!!wrongNetwork" @click="pay">Pay with your wallet</UiButton>
        </p>
      </template>

      <!-- The final and waiting states, one notice each. `unapplied` means the transaction paid a checkout that was already paid or closed: the seller credits or refunds it. -->
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

    <!-- Any problem, and the retry for a payment that was sent but not yet reported. -->
    <UiNotice v-if="problem" type="error" :message="problem" />
    <p v-if="step === 'confirming' && problem" class="actions">
      <UiButton @click="checkAgain">Check again</UiButton>
    </p>
    <!-- The live region screen readers hear; hidden from sight only. -->
    <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<style scoped>
/* The checkout is a grid with the small spacing step between its parts (tokens only). */
.chain-checkout {
  display: grid;
  gap: var(--space-sm);
}

.title {
  /* The heading carries no margin of its own: the grid gap spaces it. */
  margin: 0;
  font-size: var(--font-size-lg, 1.25rem);
}

/* The description and the price on one row, wrapping on a narrow screen. */
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

/* The held quote in a bordered panel on the surface colour. */
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

/* The fee line wraps anywhere, so a long address never overflows. */
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

/* Digits of equal width, so the countdown does not jitter as it ticks. */
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

/* Hidden from sight but still read by assistive technology. */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
