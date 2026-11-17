# Security Policy

## Scope

`@meddleware/chain-payments-kit` (`ChainCheckout`), from this repository's `main` and its npm releases. Out of scope: the
host application and its wallet connection, the Chain Payments service, SDK and Move package (their own policies).

## Security model

- The component holds no keys and builds no transaction itself: the chain module of `@meddleware/chain-payments-client`
  builds it from a quote the service signed, and the host's `signAndExecute` signs it. The Move package verifies the
  quote, so a tampered display cannot change what is paid.
- Before the wallet is asked to sign, the checkout shows the exact amount, how long the price is held and the network.
  The host must connect the wallet to that network; the component cannot see the wallet.
- Session text (the merchant's description) is rendered as text, never as HTML. Nothing is stored in the browser.

## Supported versions

The latest npm release. Older releases are not patched.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository. Please do not open a public issue. Expect an
acknowledgement within a week.

## Disclosure

Coordinated: a fixed release is published first; the report and the fix are then described in `CHANGELOG.md` and the
audit's re-verification log.
