# Changelog

## Unreleased (first pass of the security audit, 2026-11-17; ships in the first npm release, 0.0.1)

- A payment that arrives for a checkout already paid or closed (`unapplied`) is shown as such: it bought nothing here,
  the seller has been told, and `failed` is emitted with `unapplied`.
- The quote shows the network the payment is on ("Network: Sui testnet.") before the wallet is asked to sign.

## 0.0.1 — 2026-11-16

- First release: `ChainCheckout` (choose a coin, exact quote with a countdown and re-quote, pay through the host's wallet,
  follow to confirmation), its gallery and the AAA accessibility sweep.
