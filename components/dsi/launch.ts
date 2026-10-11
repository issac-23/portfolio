import { lessMotion } from './prefs'

/**
 * The DSi's launch: the selected icon blows up past the edges of both screens
 * at once, its corners squaring off as it goes, the screens flash white, and
 * the app is already there when the white clears.
 *
 * Both screens is the detail that sells it. The icon lives on the lower
 * screen, but the real thing grows straight up through the hinge into the top
 * one, as if the two screens were one surface with a gap in it. So each
 * screen gets its own copy of the icon, positioned where the icon sits
 * relative to that screen, and both scale from the same point. The top copy
 * starts below its screen's edge and grows into view.
 *
 * Everything is drawn into the shell's .dsi-fx layers, never into the app, so
 * the swap underneath cannot take the animation with it. Every node it adds
 * is removed again, even if an animation is interrupted.
 */

const GROW_MS = 340
const FLASH_IN_MS = 110
const FLASH_OUT_MS = 240


function fxLayers(from: Element): HTMLElement[] {
  const device = from.closest('.dsi-device')
  return device ? Array.from(device.querySelectorAll<HTMLElement>('.dsi-fx')) : []
}

function flash(layer: HTMLElement) {
  const white = document.createElement('div')
  white.className = 'dsi-fx-flash'
  layer.appendChild(white)
  return white
}

async function fadeOut(nodes: HTMLElement[]) {
  await Promise.all(
    nodes.map(n => n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLASH_OUT_MS, easing: 'ease-out', fill: 'forwards' }).finished),
  )
}

function clear(layers: HTMLElement[]) {
  for (const l of layers) l.replaceChildren()
}

/**
 * Plays the launch from `icon` and calls `swap` at the white, which is when
 * the app should replace the menu. Without motion it just swaps.
 */
export async function playLaunch(icon: HTMLElement, swap: () => void) {
  const layers = fxLayers(icon)
  if (lessMotion() || !layers.length) return swap()

  const r = icon.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const radius = getComputedStyle(icon).borderRadius

  // Big enough to cover the farthest corner of either screen from the icon's
  // centre, plus a little so the edges are well past the bezel by the end.
  let reach = 0
  for (const l of layers) {
    const s = l.getBoundingClientRect()
    reach = Math.max(reach, Math.abs(s.left - cx), Math.abs(s.right - cx), Math.abs(s.top - cy), Math.abs(s.bottom - cy))
  }
  const scale = ((reach * 1.08) / Math.min(r.width, r.height)) * 2

  try {
    const grows = layers.map(layer => {
      const at = layer.getBoundingClientRect()
      const copy = icon.cloneNode(true) as HTMLElement
      copy.classList.add('dsi-fx-icon')
      Object.assign(copy.style, {
        left: `${r.left - at.left}px`,
        top: `${r.top - at.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      })
      layer.appendChild(copy)
      return copy.animate(
        [
          { transform: 'scale(1)', borderRadius: radius },
          { transform: `scale(${scale})`, borderRadius: '0px' },
        ],
        { duration: GROW_MS, easing: 'cubic-bezier(0.55, 0, 0.8, 0.3)', fill: 'forwards' },
      ).finished
    })
    await Promise.all(grows)

    const whites = layers.map(flash)
    await Promise.all(whites.map(w => w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLASH_IN_MS, fill: 'forwards' }).finished))

    // Behind the white, so the swap itself is never seen.
    swap()
    for (const l of layers) l.querySelectorAll('.dsi-fx-icon').forEach(n => n.remove())
    await fadeOut(whites)
  } finally {
    clear(layers)
  }
}

/** Going back home: just the white, out and in, around the swap. */
export async function playReturn(from: Element, swap: () => void) {
  const layers = fxLayers(from)
  if (lessMotion() || !layers.length) return swap()

  try {
    const whites = layers.map(flash)
    await Promise.all(whites.map(w => w.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FLASH_IN_MS, fill: 'forwards' }).finished))
    swap()
    await fadeOut(whites)
  } finally {
    clear(layers)
  }
}
