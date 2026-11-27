import { expect, test } from './fixtures'

/**
 * While the 3D lab's console is off, a "Press POWER" pointer sits by the
 * model's power button. It goes when the console comes on, and stays gone for
 * the rest of the visit, even if the console is switched off again.
 */

type Lab = { powerPoint?: () => { x: number; y: number } | null }

test('the Press POWER hint shows while the console is off and goes once it is on', async ({ page }) => {
  await page.goto('/lab/dsi-3d')
  const hint = page.getByTestId('power-hint')
  // It waits for the lid to be up, then shows, pointing at the button.
  await expect(hint).toBeVisible({ timeout: 60_000 })
  await expect(hint).toContainText('Press POWER')
  await expect(hint).toHaveAttribute('aria-hidden', 'true')
  const gap = await page.evaluate(() => {
    const at = (window as unknown as { __dsiLab: Lab }).__dsiLab.powerPoint!()!
    const box = document.querySelector('.ph-label')!.getBoundingClientRect()
    return Math.hypot(box.left + box.width / 2 - at.x, box.top + box.height / 2 - at.y)
  })
  expect(gap).toBeLessThan(260)

  const power = page.getByRole('button', { name: /^Power (on|off)$/ })
  await power.evaluate(el => (el as HTMLButtonElement).click())
  await expect(power).toHaveAttribute('aria-label', 'Power off', { timeout: 30_000 })
  await expect(hint).toHaveCount(0)

  // Switched off again: the visitor knows by now, so it does not come back.
  await power.evaluate(el => (el as HTMLButtonElement).click())
  await expect(power).toHaveAttribute('aria-label', 'Power on', { timeout: 30_000 })
  await expect(hint).toHaveCount(0)
})
