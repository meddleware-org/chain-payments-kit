# Changelog

## 0.0.2 — 2026-11-17

- A signed payment is kept in `sessionStorage` (this tab, the quote and the digest only) until the service answers. A
  failed submission is retried 5 times with backoff, a reload resumes it without signing again, and "Check again" is
  offered while the payment is unconfirmed (FU-0124).
- The gallery has every state, and the accessibility sweep covers twelve (choose, quoted, paid, closed, loading, error,
  quoting, expired, signing, confirming, rejected, unapplied), in five browsers (FU-0129).

## 0.0.1 — 2026-11-17 (first npm release)

After the first pass of the security audit:

- Built and tested against `@meddleware/chain-payments-client` 0.0.1 from npm (no longer a sibling folder, FU-0129).
- The platform fee row stacks its label over the amount, so it reflows at 320 CSS pixels.
- `suiClient` (required): the checkout reads the platform fee from the chain (`readPlatformFee`) when it shows a quote
  and again just before the wallet opens. It shows "Platform fee (included)" with the amount and treasury, and signs
  nothing if the fee cannot be read.
- A payment that arrives for a checkout already paid or closed (`unapplied`) is shown as such: it bought nothing here,
  the seller has been told, and `failed` is emitted with `unapplied`.
- The quote shows the network the payment is on ("Network: Sui testnet.") before the wallet is asked to sign.

First built 2026-11-16:

- First release: `ChainCheckout` (choose a coin, exact quote with a countdown and re-quote, pay through the host's wallet,
  follow to confirmation), its gallery and the AAA accessibility sweep.
