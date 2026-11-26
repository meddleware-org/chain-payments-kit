// The shared sweep (AA and AAA in every colour mode × season, reflow, 200% text, forced colours, reduced motion, keyboard)
// over each checkout state in the gallery.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'

defineA11ySuite(
  {
    // One entry per state of the checkout; each is checked in every colour mode and season, at every width and text size the shared suite covers.
    // `choose`: the first screen, with the coin choice and the button to get the exact price.
    choose: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).waitFor()
    },
    // `quoted`: after the exact price is shown (the amount, the fee line, the countdown and the pay button).
    quoted: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).waitFor()
    },
    // `paid`: the whole happy path through the fake wallet to the thank-you notice.
    paid: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('Paid. Thank you.').waitFor()
    },
    // `closed`: a session that is no longer open.
    closed: async (page) => {
      await page.goto('/?state=closed')
      await page.getByText('This checkout is closed').waitFor()
    },
    // `loading`: the session request never answers.
    loading: async (page) => {
      await page.goto('/?state=loading')
      await page.getByText('Loading the checkout').waitFor()
    },
    // `error`: the session cannot be loaded.
    error: async (page) => {
      await page.goto('/?state=error')
      await page.getByText('could not be loaded').waitFor()
    },
    // `quoting`: the quote request never answers, so the busy state stays.
    quoting: async (page) => {
      await page.goto('/?state=quoting')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.locator('[aria-busy="true"]').first().waitFor()
    },
    // `wrong network`: the app's network differs from the coin's, so the warning shows and the pay button is disabled.
    'wrong network': async (page) => {
      await page.goto('/?state=wrong-network')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByText('This checkout is for Sui testnet; this app is on Sui mainnet.').waitFor()
    },
    // `expired`: the held price runs out within seconds, so the button becomes "Get a new price".
    expired: async (page) => {
      await page.goto('/?state=expired')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Get a new price' }).waitFor()
    },
    // `signing`: the wallet never answers.
    signing: async (page) => {
      await page.goto('/?state=signing')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.locator('[aria-busy="true"]').first().waitFor()
    },
    // `confirming`: the service keeps answering "pending", so "Check again" appears.
    confirming: async (page) => {
      await page.goto('/?state=confirming')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByRole('button', { name: 'Check again' }).waitFor()
    },
    // `rejected`: the service says the transaction did not pay this checkout.
    rejected: async (page) => {
      await page.goto('/?state=rejected')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('did not pay this checkout').waitFor()
    },
    // `unapplied`: the transaction paid a checkout that was already paid or closed.
    unapplied: async (page) => {
      await page.goto('/?state=unapplied')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('already been paid or closed').waitFor()
    },
  },
  // `aaa: 'gate'` makes the AAA findings block, not just warn.
  { aaa: 'gate' },
)
