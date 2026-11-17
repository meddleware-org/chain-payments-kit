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
  },
  { aaa: 'gate' },
)
