/**
 * Which view of the home page a visitor wants: the DSi itself, or plain, the same
 * content as an ordinary page. The URL is the source of truth (?view=plain),
 * so the server renders the right one and a plain link can be shared. This
 * only remembers the choice, so someone who picked plain once is not made
 * to find the setting again on their next visit.
 *
 * No 'use client': the home layout imports plainRedirectScript, and a function
 * exported from a client module reaches a server component as a reference, not
 * as the function.
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
 * guard reads the parameter the same way and cannot loop. A hash that names
 * a section keeps its place in plain view; the browser scrolls to it once the
 * section is parsed. Back and forward are left alone: after choosing plain in
 * Settings, Back has to reach the DSi, and a browser that reloads the page
 * from history instead of restoring it would otherwise send it straight back.
 * The choice stays in storage for the next fresh visit. Takes the
 * hash-to-section map rather than importing the registry, like bootScript.
 * The layout passes PLAIN_SECTIONS.
 */
export const plainRedirectScript = (sections: Readonly<Record<string, string>>) => `(function(){try{var n=performance.getEntriesByType('navigation')[0];if((n?n.type==='back_forward':performance.navigation&&performance.navigation.type===2))return;if(localStorage.getItem('${KEY}')==='plain'&&new URLSearchParams(location.search).get('view')!=='plain'){var s=${JSON.stringify(sections)},h=location.hash.replace(/^#/,'');location.replace('/?view=plain'+(Object.prototype.hasOwnProperty.call(s,h)?'#'+s[h]:''))}}catch(e){}})()`
