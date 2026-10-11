'use client'

/**
 * Which view of /dsi a visitor wants: the DSi itself, or plain, the same
 * content as an ordinary page. The URL is the source of truth (?view=plain),
 * so the server renders the right one and a plain link can be shared. This
 * only remembers the choice, so someone who picked plain once is not made
 * to find the setting again on their next visit.
 */

export type View = 'dsi' | 'plain'

const KEY = 'dsi-view'

export function rememberView(view: View) {
  try {
    if (view === 'plain') localStorage.setItem(KEY, 'plain')
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the link still works, it just will not be remembered.
  }
}

export function rememberedView(): View {
  try {
    return localStorage.getItem(KEY) === 'plain' ? 'plain' : 'dsi'
  } catch {
    return 'dsi'
  }
}
