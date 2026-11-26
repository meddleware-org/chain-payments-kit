// Screenshots for LOOKING at the checkout (see @meddleware/frontend-config/shots). Run: npm run shots
import { defineShots } from '@meddleware/frontend-config/shots'

// One screenshot, of the state a buyer spends most time in: the exact price, ready to pay. They are for looking, not asserting.
defineShots({
  quoted: async (page) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Get the exact price' }).click()
    await page.getByRole('button', { name: 'Pay with your wallet' }).waitFor()
  },
})
