/**
 * Which view of the home page a visitor wants: the DSi itself, or plain, the same
 * content as an ordinary page. The URL is the source of truth (?view=plain),
 * so the server renders the right one and a plain link can be shared. This
 * only remembers the choice, so someone who picked plain once is not made
 * to find the setting again on their next visit.
 *
 * No 'use client': the home layout imports plainRedirectScript, and a string
 * exported from a client module reaches a server component as a reference, not
 * as the string.
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

/**
 * Sends a visitor who chose plain view to it, inline before first paint. The
 * layout puts it ahead of the page, so the redirect happens while the HTML is
 * still being parsed and the device markup after it is never painted. Doing
 * this after hydration let the DSi flash up first. Storage is the only record
 * of the choice and middleware cannot read it, so this has to run in the
 * browser. The page shows plain view only for ?view=plain exactly, so the
 * guard reads the parameter the same way and cannot loop.
 */
export const plainRedirectScript = `(function(){try{if(localStorage.getItem('${KEY}')==='plain'&&new URLSearchParams(location.search).get('view')!=='plain')location.replace('/?view=plain')}catch(e){}})()`
