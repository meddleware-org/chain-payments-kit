// The shared sweep (AA and AAA in every colour mode × season, reflow, 200% text, forced colours, reduced motion, keyboard)
// over each checkout state in the gallery.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'

defineA11ySuite(
  {
    choose: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).waitFor()
    },
    quoted: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).waitFor()
    },
    paid: async (page) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('Paid. Thank you.').waitFor()
    },
    closed: async (page) => {
      await page.goto('/?state=closed')
      await page.getByText('This checkout is closed').waitFor()
    },
    loading: async (page) => {
      await page.goto('/?state=loading')
      await page.getByText('Loading the checkout').waitFor()
    },
    error: async (page) => {
      await page.goto('/?state=error')
      await page.getByText('could not be loaded').waitFor()
    },
    quoting: async (page) => {
      await page.goto('/?state=quoting')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.locator('[aria-busy="true"]').first().waitFor()
    },
    'wrong network': async (page) => {
      await page.goto('/?state=wrong-network')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByText('This checkout is for Sui testnet; this app is on Sui mainnet.').waitFor()
    },
    expired: async (page) => {
      await page.goto('/?state=expired')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Get a new price' }).waitFor()
    },
    signing: async (page) => {
      await page.goto('/?state=signing')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.locator('[aria-busy="true"]').first().waitFor()
    },
    confirming: async (page) => {
      await page.goto('/?state=confirming')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByRole('button', { name: 'Check again' }).waitFor()
    },
    rejected: async (page) => {
      await page.goto('/?state=rejected')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('did not pay this checkout').waitFor()
    },
    unapplied: async (page) => {
      await page.goto('/?state=unapplied')
      await page.getByRole('button', { name: 'Get the exact price' }).click()
      await page.getByRole('button', { name: 'Pay with your wallet' }).click()
      await page.getByText('already been paid or closed').waitFor()
    },
  },
  { aaa: 'gate' },
)
