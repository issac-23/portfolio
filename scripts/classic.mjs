/** Shared bits for the screenshot scripts that target the classic site. */

// Override when 3000 is taken by another project: SITE=http://localhost:3009
const SITE = process.env.SITE ?? 'http://localhost:3000'

/** The classic site. / is the DSi now, which has no .section-fade to reveal. */
export const classicUrl = () => `${SITE}/classic`

/** Opens /classic, reveals the scroll-triggered sections and scrolls to the gallery. */
export async function openClassicGallery(page) {
  await page.goto(classicUrl(), { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => document.querySelectorAll('.section-fade').forEach((n) => n.classList.add('visible')))
  await page.locator('#gallery').scrollIntoViewIfNeeded()
}
