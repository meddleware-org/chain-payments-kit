import { defineShots } from '@meddleware/frontend-config/shots'

defineShots({
  quoted: async (page) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Get the exact price' }).click()
    await page.getByRole('button', { name: 'Pay with your wallet' }).waitFor()
  },
})
