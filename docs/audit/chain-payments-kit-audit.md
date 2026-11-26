# Security Audit — `chain-payments-kit`

**Classification:** Internal security review (scaffold, awaiting first full pass)
**Project:** chain-payments-kit  (`@meddleware/chain-payments-kit`: `ChainCheckout`, a Vue checkout for one Chain Payments
  session. It lists the session's payable methods, gets an exact quote with a countdown, has the host's wallet sign the
  transaction that `@meddleware/chain-payments-client` builds, then follows the payment to confirmation)
**Project type:** Vue component library (npm package)
**Template:** AUDIT_TEMPLATE.md (2026-11-01) + AUDIT_TEMPLATE_VUE.md (2026-11-01) + AUDIT_TEMPLATE_A11Y.md (2026-11-01) +
  AUDIT_TEMPLATE_TS.md (2026-11-01) + AUDIT_TEMPLATE_SUI_CLIENT.md (2026-10-08, the signing-flow and chain-access rows only: the
  kit builds no transaction)
  - **Added 2026-11-26 (Part B documentation pass):** AUDIT_TEMPLATE_DOCS.md (2026-11-20); AUDIT_TEMPLATE_RFC.md (2026-11-19), partial: HTML, WAI-ARIA, WCAG and the Wallet Standard (through the host);
    AUDIT_TEMPLATE_IOP.md (2026-11-19), partial: the session API as the contract, versioning, the CI dependencies; AUDIT_TEMPLATE_PRIV.md (2026-11-20), partial: one `sessionStorage` record.
**Deployment status:** unpublished (`package.json` 0.0.1; no tag). Its one consumer is link-in-bio-ui (not reviewed here).
*(Current, 2026-11-26, F14: **npm `0.0.3` is `latest`** (0.0.2 on 2026-11-17 resolved F2 and F4, the client from npm resolved F5 the same day; 0.0.3 on 2026-11-19 added the `network` prop); tag `v0.0.3` = `d8fdf31`, three documentation or CI commits since,
nothing in `src/`. The tarball is 8 files, 31.0 kB unpacked, 11.5 kB packed (`npm pack --dry-run`). The consumer `link-in-bio-ui` depends on `^0.0.3`. Three Dependabot pull requests are open (#1 jsdom 30.1.3 →
31.0.1; #2 the minor and patch group of 7; #3 `@mysten/sui` 2.39.1 → 3.0.1), with Node CI green on #2 and #3. 9 tests pass and the sweep covers thirteen states.)*
**Review date:** 2026-11-17
**Reviewer:** Internal review
**Severity ceiling:** Medium — the component asks a buyer's wallet to sign a payment and tells the buyer whether it
  counted. It cannot change what is paid (the Move package checks the signed quote), but it can lose track of a payment, or
  report the wrong outcome. Realised ceiling at this pass: **Medium** (F2, DEFERRED).
**Status:** scaffold — awaiting first-pass (every section present; findings preliminary but each with a disposition)

**Front matter (DOCS, RFC, IOP and PRIV lenses, added 2026-11-26):**

| Field | Value |
| --- | --- |
| Documentation status | ledger (workspace `docs/audit/DOCS_LEDGER.tsv`): 33 tracked files, 30 done (28 measured against the thresholds), 3 excluded (the lockfile, `LICENSE` and the generated `docs/INTEROP.md`), 0 pending, 0 fu (2026-11-26 pass) |
| Required documents | README, CHANGELOG, SECURITY, CONTRIBUTING (added 2026-11-26), LICENSE (0BSD), CLAUDE.md, AGENTS.md: all present |
| Doc lints | `check-docs.mjs` (workspace) is the gate. The shared `eslint-plugin-jsdoc` fragment is switched on here after the Phase 5 release of `@meddleware/eslint-config` |
| Standards spoken | HTML and WAI-ARIA with WCAG 2.2 AA and AAA — the component, proven in the gallery sweep (thirteen states, five browsers); HTML Web Storage — one `sessionStorage` record (below); JSON (RFC 8259) — that record; the Wallet Standard — through the host's `signAndExecute`, never imported here; the Chain Payments session API (Meddleware's own, documented in `chain-payments-service`) — through `@meddleware/chain-payments-client`; SPDX `0BSD`, Sigstore / SLSA — as the other packages |
| Deviations | none |
| Drafts relied on | none |
| Data a person can take away | none held. The kept payment is the buyer's own transaction digest, in their tab |
| Personal data | none held. The quote and the digest are public chain data and the merchant's opaque identifiers; the buyer's address is the wallet's and is not read here |

**Build tool:** vite 8.3.x (gallery only), `@vitejs/plugin-vue` 6.0.x, vue 3.5.x (peer `^3.5.0`)
**Hosting:** none of its own: a library. The gallery (`gallery-dist/`, git-ignored) is a test fixture.
**Embedding hosts:** link-in-bio-ui (the app's checkout)
**VITE_\* inventory:** none read by the component
**Package manager / lockfile:** npm; `package-lock.json` committed
**Module format / publish model:** ESM; ships `src/` (Vue SFC + TS) for the host's bundler
**Runtime targets / peer dependencies:** browser / `@meddleware/chain-payments-client ^0.0.1`, `@meddleware/design-tokens
  ^0.1.13`, `@meddleware/ui ^0.1.43`, `vue ^3.5.0`
**Support promise:** `browserslist: extends @meddleware/frontend-config/browserslist-config` (frontend-config 0.0.10); compat
  lints through the shared eslint and stylelint configurations
**Accessibility gates:** axe AA **and AAA gated** (`aaa: 'gate'`) in every colour mode × season, plus reflow, 200 % text,
  forced colours, reduced motion and keyboard, on the gallery's states `choose`, `quoted`, `paid` and `closed`; five browser
  projects in CI (`E2E_BROWSERS=all`)
**Known exceptions:** none listed. The states `loading`, `quoting`, `confirming`, `rejected` and `error` are not swept (F4).

---

## Executive summary

`ChainCheckout.vue` (256 lines) renders the merchant's description and amount as text. It shows the exact quoted amount,
how long it is held and, since this pass, the network (F1). It never builds a transaction:
`loadChain(chain).buildPayment(quote)` comes from the client SDK, and the host's `signAndExecute` signs it. The flow is
guarded:

- buttons are inert while busy, so there is no double submission;
- an expired quote must be renewed;
- changing the coin discards the quote;
- a wallet refusal keeps the quote;
- only the service's `confirmed` shows "Paid".

Accessibility is unusually strong for a first release: AAA is gated, there is a polite live region for price, hold time and
outcome, `aria-busy` is set, and the heading level is configurable.

**Fixed inline:** F1 (the network shown before signing) and F6 (`SECURITY.md`). Kit tests: 3/3; type-check and the three
lints are clean.

**Open:** F2 (Medium) — if the submission fails after the wallet executed the payment, the component shows the error and
offers no retry, and nothing else ever submits that digest (FU-0124). F4 and F5 (Low) — sweep coverage of the remaining
states, and CI installing the client from a sibling path (FU-0129).

**Dispositions (14 findings, as of 2026-11-26):** RESOLVED 6 (F1, F6, F2 and F4 (0.0.2), F5 (the client from npm, 2026-11-17) and F14) · ADJUDICATED 3 · DEFERRED 0 · Positive 5.
**Counts by severity:** Medium 1 · Low 6 · Info 2 · Positive 5 (F2 is now resolved; its severity stands as found).

## Threat model / trust boundaries

| Actor | Controls | Bounded by |
| --- | --- | --- |
| Buyer + wallet | choice of coin, signing, the wallet's account and network | the component shows amount, hold time and network; the Move package checks the quote |
| Host application | `sessionId`, `baseUrl`, `signAndExecute`, optionally an injected `client` | trusted by design (it owns the wallet); the injected client exists for tests and galleries |
| Chain Payments service | session text, methods, quote, payment status | the client SDK's validation (client audit F2, F6); text-only rendering |
| Merchant (session description) | one line of text ≤ 120 characters, no control characters (the service checks) | rendered with `{{ }}`, never as HTML |

### Frontend actor matrix (VUE lens)

| Actor | What it controls | Bounded by |
| --- | --- | --- |
| End user + wallet extension | inputs, account and network, signing | signing UX (F1, F3); the chain |
| Embedding host | the page, global CSS, the wallet | scoped styles, no shell chrome (F13) |
| Authors of rendered data (the merchant's description, the service's `amountText`) | text shown to buyers | text interpolation (F7); amount from the service (F10) |
| RPC / relay | — | the kit makes no chain calls |
| Build environment | nothing: the component reads no `VITE_*` | — |

### Who is excluded, and by what (A11Y lens)

| Actor / source | What it controls | Bounded by |
| --- | --- | --- |
| Assistive technology and settings | perception and operation | the sweep (AAA gate) on four states; live region; native buttons and `UiSegmentedControl` |
| A visitor's browser | features | the shared browserslist; compat lints |
| Tokens | contrast | `@meddleware/design-tokens` (token-only colours: `var(--muted)`, `--border`, `--surface`) |
| Shared components (`@meddleware/ui`) | focus, labels | the ui library's own audit |
| Content (description, amounts) | length | `overflow-wrap: anywhere` on the amount; the description wraps |

## Severity scale

Critical / High / Medium / Low / Info / Positive.

## Scope

**In scope (`main` = `94a60c9` plus this pass's changes):** `src/ChainCheckout.vue`, `src/index.ts`, `src/env.d.ts`,
`tests/checkout.test.ts`, `e2e/{a11y,screens}.spec.ts`, `gallery/*`, `package.json`, `package-lock.json`,
`.github/workflows/{node-ci,npm-publish}.yml`, `.github/audit-gate.mjs`, `.github/audit-allowlist.json`, the lint
configurations, `SECURITY.md`.

**Out of scope:** the client SDK (its own audit); link-in-bio-ui (another workstream); the gallery's screenshots.

**Environment / commands (2026-11-17):**

| Command | Result |
| --- | --- |
| `npx vitest run` | **3 passed** |
| `npm run type-check` (`vue-tsc`) | clean |
| `npm run lint` (stylelint, eslint with vuejs-accessibility, html-validate) | clean |
| Playwright sweep (`npm run test:e2e`) | **not run** (not run in this review by instruction); CI runs it on five browser projects |

### What to audit in the full pass (file-level checklist)

- `src/ChainCheckout.vue`:
  - every `step` transition, including the error paths after `signAndExecute` (F2);
  - the `waitForPayment` timeout message;
  - focus after each state change (the button that had focus disappears on `confirming` and `paid`);
  - the live-region wording.
- `e2e/a11y.spec.ts`: the swept state list against the component's ten `Step` values (F4).
- `gallery/CheckoutGallery.vue`: the stub client's states (`?state=closed` …); add `rejected`, `error` and `confirming`.
- `package.json`: the `file:` dev dependency (F5); `files` (src, CHANGELOG.md, SECURITY.md only).
- `.github/workflows/npm-publish.yml`: the tarball assertion; that its verify job runs the e2e sweep as well as `node-ci.yml`.
- link-in-bio-ui: how it binds `signAndExecute` to the wallet and whether it checks the wallet's chain against
  `quote.method.network` (F3).

## Findings

### F1 — The network was not shown before signing

**Severity:** Low   **Disposition:** RESOLVED
**Where:** `src/ChainCheckout.vue` (the quote box).
**Issue:** VUE-M4: before every wallet prompt, show the action, amount, recipients and network. The box showed the amount
and hold time only.
**Impact:** A buyer whose wallet is on another network learns it only from a failed transaction.
**Remediation / evidence:** The quote box shows "Network: Sui testnet." (the method's chain and network; the chain name is
looked up with `Object.hasOwn`). Test: `offers only supported chains, quotes exactly, pays and reports`. The recipient is
the merchant object, which the wallet shows; naming the merchant is the host's page.

### F2 — A failed submission after a successful payment has no retry

**Severity:** Medium   **Disposition:** RESOLVED (0.0.2, 2026-11-17; FU-0124; re-verified 2026-11-26)
**Where:** `pay()`: after `signAndExecute` resolves, `submitPayment` / `waitForPayment` errors set `problem` and leave
`step = 'confirming'` with no action.
**Issue:** The digest exists only in this component's memory. A network error, a `503` or a closed tab loses it, and the
service never scans the chain (service audit F24).
**Impact:** The buyer paid; the checkout stays unpaid and expires.
**Remediation / evidence:** Part of FU-0124:

- keep `{sessionId, nonce, digest}` in `sessionStorage` under a key that includes the session id;
- resubmit with backoff until an answer arrives;
- offer "Check again" in the `confirming` state;
- on load, resume a stored pending digest for this session.

Values are not secret, and a tampered value can only produce a claim the service rejects (VUE-M7).

**Update 2026-11-26 (verified in `src/ChainCheckout.vue` and `tests/checkout.test.ts`):** all four parts are in 0.0.2: `remember` keeps `{ quote, digest }` in `sessionStorage` under a key with the session id, `follow` submits
with back-off (5 attempts), `load` resumes a kept payment for this session without signing again, and the `confirming` state offers "Check again". The tests `retries a failed submission and keeps the payment
for a reload`, `resumes a signed payment after a remount, without signing again` and `offers Check again while a payment is still unconfirmed` cover them.

### F3 — The component cannot check the wallet's network

**Severity:** Low   **Disposition:** ADJUDICATED (and, since 0.0.3, enforced by the host-supplied `network` prop; FU-0144)
**Where:** the `signAndExecute` prop.
**Issue:** VUE-M4 also asks that a wallet/app network mismatch block signing. The component sees only a function, not the
wallet.
**Impact:** A mismatch fails on-chain (the objects do not exist on the other network), so no funds move. It fails closed.
**Remediation / evidence:** The host binds the wallet. `SECURITY.md` says the host must connect it to the quote's network,
and F1 shows that network. The full pass reviews link-in-bio-ui's binding. A `network` check prop is a suggestion.

**Update 2026-11-26:** the suggestion was taken in 0.0.3: the `network` prop is the network the app's wallet is on, and when the coin's network differs the checkout says so and disables **Pay**, so the wallet is
never asked (test `on another network than the app, says so and never asks the wallet`; the gallery's `wrong network` state is swept).

### F4 — The accessibility sweep covers four of the component's states

**Severity:** Low   **Disposition:** RESOLVED (0.0.2, 2026-11-17; FU-0129; re-verified 2026-11-26)
**Where:** `e2e/a11y.spec.ts` (`choose`, `quoted`, `paid`, `closed`).
**Issue:** A11Y §A *Conformance gate*: every state a visitor can reach is swept. `loading`, `quoting`, `signing`,
`confirming`, `rejected` and `error`, and the expired-quote view, are not. They carry the `UiNotice` variants and the busy
buttons.
**Remediation / evidence:** Add gallery states and sweep entries for each. Run them in CI. They cannot be run in this
review. Tracked in FU-0129.

**Update 2026-11-26:** `e2e/a11y.spec.ts` now sweeps thirteen states (choose, quoted, paid, closed, loading, error, quoting, wrong network, expired, signing, confirming, rejected, unapplied); the
Chromium run on 2026-11-26 passed all 195 checks.

### F5 — CI installs the client from a sibling path

**Severity:** Low   **Disposition:** RESOLVED (2026-11-17, commit `84ea3bf`: the client from npm; FU-0129; re-verified 2026-11-26)
**Where:** `package.json` `devDependencies["@meddleware/chain-payments-client"] = "file:../chain-payments-client"`.
**Issue:** On a clean runner there is no sibling directory, so `npm ci` fails or links nothing. The kit's CI cannot be
green until the client is on npm (STATE: "chain-payments-kit waits for the client on npm").
**Remediation / evidence:** After the client's 0.0.1 publish, set the dev dependency to `0.0.1` (the peer stays `^0.0.1`),
refresh the lockfile, and confirm all three CI jobs run. Tracked in FU-0129.

**Update 2026-11-26:** the dev dependency is `0.0.1` from the registry, `npm ci` installs it on a clean runner, and the last Node CI runs on the open Dependabot pull requests (2026-11-24) are green.

### F6 — `SECURITY.md` lacked the required sections

**Severity:** Low   **Disposition:** RESOLVED
**Where:** `SECURITY.md`.
**Remediation / evidence:** Rewritten with Scope, Security model (no keys, no transaction building, the network shown, the
host's duty), Supported versions, Reporting and Disclosure.

### F7 — Untrusted rendering and storage

**Severity:** Positive
**Where:** the template.

- No `v-html` and no dynamic `href` or `src`. The description, amounts and errors are interpolated text.
- No browser storage is used.
- Error messages are the service's message or fixed text. Wallet errors that look like a refusal are mapped to "The wallet
  did not sign the payment."

### F8 — Signing-flow guards

**Severity:** Positive
**Where:** `pay()`, `getQuote()`, the `method` and `expired` watchers; `@meddleware/ui` `UiButton` (`busy` makes the button
inert).

- Busy buttons block a second click.
- An expired quote offers only "Get a new price", and `pay()` returns on `expired`.
- Changing the coin drops the quote.
- A wallet refusal keeps the quote and returns to `ready`.
- Only `confirmed` emits `paid`; `rejected` emits `failed`; `pending` after the wait says the payment will be checked again.
- Tests: the three component tests (pay, wallet refusal, expiry and closed).

### F9 — Chain-access layering

**Severity:** Positive
**Where:** `pay()`.
The kit imports `loadChain` from the domain client and builds nothing itself: no `Transaction` and no `moveCall`. The
lazy `import('./sui.js')` keeps `@mysten/sui` out of the initial chunk (VUE §A *Lazy boundaries*).

### F10 — The displayed amount is the service's text

**Severity:** Info   **Disposition:** ADJUDICATED
**Where:** `quote.amountText` (built by the service from `amount` and `decimals`).
**Issue:** The amount the buyer reads comes from the same reply as the `amount` the transaction uses, not from a local
formatting of `amount`.
**Impact:** None in practice. Both come from the service, which is the price authority; the wallet shows the real coin
split; and the client checks `amount` itself. Formatting `amount` locally would prove only that the two fields agree. That
is a suggestion.

### F11 — A host that gives neither `client` nor a valid `baseUrl` breaks the component

**Severity:** Info   **Disposition:** ADJUDICATED
**Where:** `createSessionClient({ baseUrl: props.baseUrl ?? '' })` in `setup`.
**Issue:** An empty or non-https `baseUrl` throws during setup, and the component does not render.
**Impact:** A host configuration error that fails closed: no payment can start. Showing an error state is a suggestion.

### F12 — Accessibility basics

**Severity:** Positive
**Where:** the template and the gallery sweep.

- One `section` labelled by its heading. The level is a prop, so the host's outline stays right.
- `aria-busy` is set while loading, quoting or confirming.
- A polite live region announces the price and hold time ("1 minute 59 seconds"), the expiry, sending and confirmation.
- Buttons and the coin selector are native or `@meddleware/ui` components.
- Colours are tokens only.
- The visually-hidden class uses `clip-path`.
- AAA is gated for the swept states.

### F13 — No global CSS or shell chrome

**Severity:** Positive
**Where:** `<style scoped>`.
All styles are scoped. The component renders no header, footer or wallet bar (VUE-M9). `sideEffects` lists `*.css` and
`*.vue` accurately.

### Part B documentation pass (2026-11-26)

Scope: every tracked file read against the workspace's `docs/operations/DOCUMENTATION_STANDARD.md` and annotated (Part B Phase 1, the twentieth repository, the second of the kits); the DOCS, RFC, IOP and PRIV
lenses applied for the first time. Before and after editing: `npm ci`, `vue-tsc`, the three linters, the 9 tests, the gallery build, `mw-audit-gate` (0 high or critical advisories), `npm pack --dry-run` (8 files)
and the Chromium run of the real-browser sweep (195 passed). The diff is comment-only: the TypeScript compiles to identical output with comments removed, the Vue single-file component compiles to the same render
function, and the styles, `tsconfig.json` and `.gitignore` parse alike; the YAML parses to identical values apart from the audit-gate command in `node-ci.yml` (F14). No defect was found in the code.

### F14 — Documentation drift found by the documentation pass
**Severity:** Low   **Disposition:** RESOLVED (2026-11-26, unreleased)
**Where:** this audit (deployment status, F2–F5, counts, Sections C and D), `README.md`, `CLAUDE.md`, `.github/workflows/node-ci.yml`, `.github/audit-gate.mjs`, `package.json` (no `engines`).
**Issue:** (1) the audit was still the 2026-11-17 scaffold: unpublished 0.0.1, F2, F4 and F5 DEFERRED, three tests, a four-state sweep, although 0.0.2 and 0.0.3 are published and resolve them (updates above);
(2) the README had no props table, no mention of the kept `sessionStorage` record and no Development section, there was no `CONTRIBUTING.md`, and CLAUDE.md had no Gotchas or Related; (3) the CI job
`node24-compat` is named "engines >=24", but `package.json` declares no `engines` field (the job still runs the tests on Node 24; the name and a field that says so should agree: noted, not changed);
(4) `.github/audit-gate.mjs` was an un-annotated copy of the gate that `@meddleware/frontend-config` ships as `mw-audit-gate` (one of the nine copies of FU-0196); (5) the component's 10 declarations, the tests and
most configuration files had no doc comment or header.
**Impact:** none on the shipped code. A reader could not tell what is published, which findings are open, or what the props are.
**Remediation / evidence:** the facts are checked against npm, the code, the tests, the sweep and the pull requests; the audit's dispositions are updated with dated evidence; the documents are written; every
declaration is documented; `node-ci.yml` runs `npx --no-install mw-audit-gate` and the copy is removed (the result is the same). The `engines` question is left to the maintainer's next release (add
`"engines": { "node": ">=24" }` or rename the job); no behaviour changes in this pass.

## Section A — Invariant verification matrix

| # | Invariant | Enforced at | Proven by | Status |
| --- | --- | --- | --- | --- |
| I1 | No untrusted data rendered as HTML; no dynamic URL sinks | template | inspection; html-validate | HOLDS (code-only) |
| I2 | Before signing: amount, hold time and network shown | quote box | `offers only supported chains…` (F1) | HOLDS |
| I3 | No double submission while a request is in flight | `UiButton busy` (inert) | the pay test calls `signAndExecute` once | HOLDS |
| I4 | Only a service-confirmed payment shows as paid | `pay()` | the pay test | HOLDS |
| I5 | A payment that executed is eventually submitted | — | — | GAP (F2) |
| I6 | Wallet network matches the quote's network | host | — | N/A for the component (F3) |
| I7 | No inline on-chain logic | `pay()` delegates | inspection | HOLDS |
| I8 | Every reachable state passes the AA (and AAA) sweep | `e2e/a11y.spec.ts` | CI | GAP (four of ten states, F4) |
| I9 | Scoped styles only; no shell chrome | `<style scoped>` | stylelint | HOLDS |

## Section B — Supply-chain, publish-authority & capability matrix

### B.1 Dependency & CVE risk

| Dependency | Version | Paths | Status |
| --- | --- | --- | --- |
| `vue` | peer `^3.5.0`, dev `^3.5.44` | rendering | `audit-gate.mjs` clean (allowlist empty) |
| `@meddleware/chain-payments-client` | peer `^0.0.1`; dev `file:` (F5) | session API, builder | its own audit |
| `@meddleware/ui`, `@meddleware/design-tokens` | peer `^0.1.43`, `^0.1.13` | buttons, notices, control, tokens | their audits |
| `@meddleware/frontend-config` | dev `^0.0.10` (exact on 0.0.x) | the sweep, lints, browserslist | its audit |
| `@playwright/test`, axe (through frontend-config) | `~1.64.1` | the sweep | — |
| `overrides` | `basic-ftp ^6.2.4`, `tmp ^0.2.7`, `zod ^4.6.7` | transitive dev tooling (advisory fixes) | B.TS-2 |

### B.2 Publish authority

npm through `npm-publish.yml`: OIDC trusted publishing with `--provenance`, tag-gated, a tag-version check, the tarball
assertion and the audit gate. Actions are pinned, and `permissions: contents: read` is set by default. Dependabot covers npm
and Actions.

### B.VUE-1 Hosting headers

N/A for the library. The host's CSP must allow `connect-src` to the Chain Payments public origin. The checkout itself loads
no images, fonts or scripts from elsewhere.

### B.VUE-2 Build inputs

The component reads no `VITE_*`. The gallery build is a test artefact, git-ignored and not published. There is no test-only
mode in the published code: the `client` prop is an ordinary injection point the host owns.

### B.A11Y-1 Gate inventory

| Gate | Tool | Scope | Fails CI? | Evidence |
| --- | --- | --- | --- | --- |
| axe AA + AAA | `defineA11ySuite` (frontend-config) | 4 states × every colour mode × season × 5 browsers | yes (`aaa: 'gate'`) | `node-ci.yml` job `e2e` |
| reflow / 200 % / forced colours / reduced motion / keyboard | `defineA11ySuite` | the same 4 states | yes | same |
| template / CSS / HTML lint | eslint + vuejs-accessibility, stylelint, html-validate | `src/` | yes | `node-ci.yml` job `check` |
| Lighthouse | — | n/a (a component, not a page) | — | the host's audit |
| token contrast | design-tokens | its own | its CI | design-tokens audit |

### B.TS-2 Install-time code

No lifecycle scripts. `overrides` as in B.1 (transitive dev tooling).

### B.DOCS-1 Ledger state

33 tracked files: 30 done (28 measured against the thresholds), 3 excluded (lockfile, licence text, generated `docs/INTEROP.md`), 0 pending, 0 `fu:` rows (2026-11-26, commit recorded in the ledger). Gate: `node scripts/check-docs.mjs --report chain-payments-kit` gives 28 measured, 28 meeting the standard, header 100 %, declaration docs 100 %, comment ratio 0.29, no TODOs, no broken links.

### B.DOCS-2 Commands run

Every command in the README's Development section, CLAUDE.md's Commands section and CONTRIBUTING.md was run on 2026-11-26 and gave what the documents say: `npm ci`, `npm run type-check`, `npm run lint`,
`npm test` (9 tests), `npm run build:gallery`, `npm run test:e2e` (Chromium: 195 passed), `npx --no-install mw-audit-gate` and `npm pack --dry-run` (8 files).

### B.DOCS-3 Generated documentation

`docs/INTEROP.md` is generated by the workspace's `scripts/interop/gen-interop.py` from `config/interop.yaml`. `gallery-dist/` is built by `npm run build:gallery` and not tracked.

### B.RFC-1 Standards inventory

| Interface | Standard (and version) | Role | Where | Conformance evidence | Deviation |
| --- | --- | --- | --- | --- | --- |
| Markup and accessibility | HTML, WAI-ARIA, WCAG 2.2 AA and AAA | produces | `src/ChainCheckout.vue` | html-validate, eslint-plugin-vuejs-accessibility, the thirteen-state gallery sweep in five browsers | — |
| Kept payment | HTML Web Storage (`sessionStorage`), JSON (RFC 8259) | produces | `remember`, `remembered`, `forget` | `resumes a signed payment after a remount, without signing again` | this tab only; storage that is unavailable only loses the reload safety net |
| Wallet | the Wallet Standard | consumes through the host | the `signAndExecute` prop | the host's tests; this package never imports a wallet | — |
| Session API | the Chain Payments session API (Meddleware's own) | consumes through the client | `createSessionClient`, `loadChain` | the client's tests and this package's fake client | — |
| Provenance | Sigstore / SLSA (npm provenance) | consumes | `npm-publish.yml` | `dist.attestations` on npm | — |

### B.IOP-1 Export and exit drill

Not applicable: the component holds no data about anyone. A host leaves it by writing its own checkout against the same session API and the chain module; both are public.

### B.IOP-2 Exit register entries

npm (publication), GitHub Actions (CI), and Playwright's container image on mcr.microsoft.com and the DejaVu font release on GitHub (the browser jobs, checksum-pinned). At run time the component talks only to
the Chain Payments service the host names and to the chain through the host's wallet and client.

### B.IOP-3 API stability

The public API is the `ChainCheckout` component's props and events (`README.md`). Versioning is patch-only until mainnet (workspace policy), so a consumer's `^0.0.x` is an exact pin; a rename or removal is a
breaking change and is announced in `CHANGELOG.md`.

### B.PRIV-1 / B.PRIV-2 / B.PRIV-3 Privacy inventories

Personal data: none held. The one thing kept in the page is a signed payment (the quote and the transaction digest) in `sessionStorage`, this tab only, written after the wallet signed and removed when the service
has answered, so a reload or a failed submission never loses a paid transaction: strictly necessary for what the buyer asked, and it belongs in the storage ledger (H2). The component sets no cookie, runs no
analytics and requests nothing of its own beyond the session service the host names. Recorded 2026-11-26.

## Section C — Test-coverage & hermetic/live split

### C.1 Coverage grade — C+ at the first pass (3/3 vitest; 4-state sweep); 2026-11-26: 9/9 vitest and a thirteen-state sweep (the grade is not re-assigned here)

| Dimension | Assessment |
| --- | --- |
| Happy path | session → quote → sign → submit → confirmed |
| Error paths | wallet refusal; expired quote; closed session. Not covered: rejected, a submission error, a `pending` timeout, a service error at load |
| Security-relevant | unsupported chains hidden; the network shown; a single sign call |

### C.2 Hermetic vs live

Every gate is hermetic (stub client, mock `signAndExecute`). A real payment through the kit happens only in the host's e2e
tests (link-in-bio-ui) and on testnet by hand.

## Section D — Deployment-readiness gates

### pre-localnet

- [x] no `v-html`; no dynamic `href`/`src`; no `VITE_*`
- [x] a11y lints green; token-only colours

### pre-testnet

- [x] signing UX shows amount, hold time and network; double submission blocked (F1, F8)
- [x] CI green on a clean runner (F5, FU-0129; the client from npm, 2026-11-17)
- [x] axe AA/AAA sweep over every reachable state (F4, FU-0129; 0.0.2, thirteen states)
- [x] `SECURITY.md` present and consistent (F6)

### pre-mainnet

- [x] a pending payment survives a failed submission and a reload (F2, FU-0124; 0.0.2)
- [x] the kit refuses to ask a wallet on another network (F3; the `network` prop, 0.0.3). The host's binding of that prop is reviewed in link-in-bio-ui's audit
- [ ] manual review recorded (screen reader on the pay flow, 44 px targets)

## Cross-project themes

- **Supply chain.** Lockfile, audit gate, OIDC publishing, Dependabot; the `file:` dependency is F5.
- **Wire-format coupling.** None of its own: the client SDK owns the API and the transaction.
- **On-chain-truth boundary.** "Paid" only from the service's on-chain confirmation (I4). The amount and hold time shown are
  the quote's, and the countdown is labelled as such.
- **Deployment readiness.** Section D.
- **Chain-access layering.** Holds (F9).

## Normative requirements (MUST / MUST NOT)

- VUE-M1 holds (F7).
- VUE-M2 holds (no `VITE_*`; ids come through the client).
- VUE-M3 holds (no test hooks in the published component).
- VUE-M4 holds for amount and network. The wallet-mismatch block is the host's (F3).
- VUE-M5 n/a (nothing irreversible but the payment itself, which is the action the buyer chose and sees).
- VUE-M6 is the host's: it owns the wallet. The component keeps no wallet state.
- VUE-M7 holds today (no storage); F2's fix must keep it.
- VUE-M8 n/a (library).
- VUE-M9 holds (F13).
- A11Y-M1 partly holds: AA and AAA are gated, but for four states only (F4).
- A11Y-M2 holds through the tokens.
- A11Y-M3, M5 and M6 hold in the sweep.
- A11Y-M4: focus after state changes is to be reviewed in the full pass.
- A11Y-M7 holds (no exceptions listed).
- TS-M1–M9: strict `vue-tsc` and no unchecked casts in `src/`; no fetch of its own; no dynamic code; the `files` whitelist.

**Lens baselines (DOCS, RFC, IOP, PRIV), first recorded 2026-11-26:**

| ID | Holds? | Evidence |
| --- | --- | --- |
| DOCS-M1 | yes (all seven documents; 0BSD; CHANGELOG with an Unreleased section) | B.DOCS-1 |
| DOCS-M2 | yes (every file's header and every declaration documented; ledger rows done) | `check-docs.mjs --report chain-payments-kit` |
| DOCS-M3 | yes (the root-comment rule, the kept record and the missing `engines` field are in CLAUDE.md) | CLAUDE.md |
| DOCS-M4 | yes (commands run, links resolve, ids exist) | B.DOCS-2 |
| DOCS-M5 | yes (no TODO, FIXME, XXX or HACK) | `check-docs.mjs` |
| DOCS-M6 | yes (CLAUDE.md, README and this audit verified against the code and npm, F14; AGENTS.md points to CLAUDE.md) | this pass |
| DOCS-M7 | yes (no secrets or private data; the ids are public chain ids) | inspection |
| RFC-M1 to RFC-M7 | yes where they apply (B.RFC-1); M5 is the hosts', not a package's | B.RFC-1 |
| IOP-M3, IOP-M5 | yes (B.IOP-3; no data, no ads, no tracking); IOP-M1, M2, M4, M6, M7: not applicable (no data, no service) | B.IOP-1 to 3 |
| PRIV-M1 to PRIV-M8 | yes: one strictly necessary record, nothing else stored or requested | B.PRIV |

## Implementation suggestions (SHOULD / MAY)

- SHOULD move focus to the status notice when the step becomes `confirming`, `paid` or `rejected`: the focused button
  disappears.
- SHOULD format the amount locally from `amount` and `method.decimals` and compare it with `amountText` (F10).
- MAY take an optional `network` prop (the host's wallet network) and block **Pay** on a mismatch (F3).
- MAY render an error state when the client cannot be created (F11).

## Open questions (`OQ#`)

- **OQ1** — Should the kit itself persist pending payments (F2), or should hosts own recovery through the `paid` and `failed`
  events plus a new `submitted` event carrying the digest?

## Risks (residual)

- The host's wallet binding and network (F3).
- Shared components (`@meddleware/ui`) decide focus and busy behaviour.

## Re-verification log

- 2026-11-17 — Scaffold pass at `94a60c9` plus this pass's changes:
  - read the component, tests, sweep, manifests and workflows;
  - 3/3 tests, `vue-tsc` and lints clean (Playwright not run);
  - fixed F1 and F6;
  - deferred F2 to FU-0124 and F4/F5 to FU-0129;
  - opened OQ1.
- 2026-11-26 — Part B documentation pass and first application of the DOCS, RFC, IOP and PRIV lenses (above, "Part B documentation pass"). Re-verified F2 and F4 (RESOLVED in 0.0.2) and F5 (RESOLVED by the client from npm) and F3 (enforced by
  the `network` prop in 0.0.3) against the code, the tests, the sweep and CI; the audit's deployment status, counts and Sections C and D are current. Baseline before editing: `npm ci`, type-check, the three
  linters, 9 tests, the gallery build, `mw-audit-gate`. Every tracked file annotated to the documentation standard; `CONTRIBUTING.md` added; README props table and Development section; CLAUDE.md Gotchas and
  Related. Found and fixed **F14** (documentation drift; the audit gate is now `mw-audit-gate`, FU-0196). Re-run after editing: the same commands plus the Chromium sweep (195 passed), all passing; the diff
  proven comment-only apart from F14's command. Verified live: npm `0.0.3` latest, the consumer read from its manifest, three Dependabot pull requests open. No defect found in the code. Counts: F1 to F14.

## Pre-save consistency checklist (this pass)

- [x] Section A ↔ findings (I5 → F2; I8 → F4)
- [x] Finding header ↔ body
- [x] Template line
- [x] Closing structure in order
- [x] Open questions stay open
- [x] Section D ↔ dispositions
- [x] Executive summary matches the current dispositions
- [x] Counts re-measured (3 tests)
- [x] Re-verification log entry
- [x] 2026-11-26: Template line cites DOCS, RFC, IOP and PRIV with their registry dates; their front-matter fields, Section B subsections and MUST rows added; F14 recorded in the findings and the log;
  F2 to F5, the deployment status, the counts and Sections C and D current.
