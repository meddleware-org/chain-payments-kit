# Changelog

## Unreleased (first pass of the security audit, 2026-11-17; ships in the first npm release, 0.0.1)

- `suiClient` (required): the checkout reads the platform fee from the chain (`readPlatformFee`) when it shows a quote
  and again just before the wallet opens. It shows "Platform fee (included)" with the amount and treasury, and signs
  nothing if the fee cannot be read.
- A payment that arrives for a checkout already paid or closed (`unapplied`) is shown as such: it bought nothing here,
  the seller has been told, and `failed` is emitted with `unapplied`.
- The quote shows the network the payment is on ("Network: Sui testnet.") before the wallet is asked to sign.

## 0.0.1 — 2026-11-16

- First release: `ChainCheckout` (choose a coin, exact quote with a countdown and re-quote, pay through the host's wallet,
  follow to confirmation), its gallery and the AAA accessibility sweep.
