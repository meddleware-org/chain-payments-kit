# CLAUDE.md — chain-payments-kit

The Vue checkout of Chain Payments: `ChainCheckout` (one component). It shows a session's price, lets the buyer choose a
coin, gets an exact quote (held about two minutes), has the host's wallet sign the transaction the chain module builds, and
follows the payment to confirmation.

## Invariants

- **No transaction is built here.** `loadChain(method.chain).buildPayment(quote)` from `@meddleware/chain-payments-client`
  builds it; the host passes `signAndExecute` (for example `createToolWallet().signAndExecute` from `@meddleware/wallet-adapter`).
- **Methods come from the session** and are filtered by what this version of the client supports; a new chain needs only a
  client upgrade.
- **Honest wording:** the exact amount, how long it is held, that the wallet shows the same amount and that change comes back
  in the same transaction. Never "approximately".
- `@meddleware/ui` components and design tokens only; semantic markup; the shared accessibility sweep at AAA over the gallery's
  states (`e2e/`), and screenshots (`npm run shots`, look at them).

## Commands

```bash
npm ci && npm run type-check && npm run lint && npm test
npm run build:gallery && npm run test:e2e        # E2E_BROWSERS=all for five browsers
npx --no-install mw-audit-gate                   # the dependency gate CI runs (the copy that lived in .github/ is gone: FU-0196)
```

Release: bump `version`, push, tag `v<version>`; `npm-publish.yml` re-runs the whole Node CI on the tagged commit and publishes with npm trusted publishing.

Commit messages: one short line, no body, no trailer.

## Gotchas

- **No HTML comment before the template's root element.** A comment next to the root makes the component a fragment in a development build, so `class` and other attributes passed by the parent no longer fall through (only there: production strips comments). Put such notes in the `<script>` header; comments inside the root element are fine.
- **A signed payment is kept in `sessionStorage`** (this tab, the quote and the digest only) until the service answers; the storage ledger (legal register H2) lists it as strictly necessary for what the buyer asked. Do not keep anything else there.
- **`engines` is `node >=24`**, like the other packages, and the CI job `node24-compat` proves it by running the tests on Node 24 (added 2026-11-26, audit F14).
- **The gallery is not published** (`files` ships `src` only); its fake session client and wallet are in `gallery/CheckoutGallery.vue`, and each state has an entry in `e2e/a11y.spec.ts`.

## Related

- The audit: [`docs/audit/chain-payments-kit-audit.md`](docs/audit/chain-payments-kit-audit.md); how to propose a change: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Consumer: `link-in-bio-ui` (its checkout). Its dependencies: `chain-payments-client` (peer and dev), `ui` and `design-tokens` (peers).

## Interoperability

- [docs/INTEROP.md](docs/INTEROP.md): the standards this project speaks, what is planned, where to extend it, and what proves each claim.
