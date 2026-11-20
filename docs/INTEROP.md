# Open standards and interoperability: chain-payments-kit

The checkout widget embedded in other people's pages (Chain Payments).

This page lists what the project speaks today, what is planned, what was considered and does not apply, where someone else can extend it, and what proves each claim. The platform-wide list is [Standards we use](https://meddleware.dev/platform/standards). A row appears there in the same change that turns a standard on.

## Spoken today

- Signed quotes and webhooks (EdDSA, RFC 8032), verified by the service
- No rights notice by design (it is embedded in others' pages)

## Planned

- Open Payments (GNAP with RFC 9421 signatures) as a second checkout path

## Considered, not applicable

- none

## Extension points

- Embed the widget; the session API is documented in @meddleware/chain-payments-client

## What proves it

- its unit tests
- the gallery's five-browser e2e

_Maintained centrally with the platform's interoperability map; changes go through it so every repository says the same thing._
