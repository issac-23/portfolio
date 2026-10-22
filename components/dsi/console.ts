import type { AppId } from './apps'

/**
 * The console's state and the moves between states, kept apart from React and
 * from the DOM so the layout's inline boot script can import its constants.
 * useConsole.ts runs the effects each move calls for.
 *
 * The boot has three rules that look alike and deliberately differ. Merging
 * them would change what a visitor sees, so that is a separate decision.
 *  a. Before first paint: no boot if this visit already booted, if the DSi's
 *     own less-motion setting is on, in plain view, or on any address with a
 *     hash. See bootScript.
 *  b. Switching back on replays the boot unless the DSi's own less-motion
 *     setting is on. The system's reduced-motion preference does not count,
 *     because the boot only fades. See replaysBoot in useConsole.ts.
 *  c. The launch and return animations skip when either that setting or the
 *     system preference asks for less motion. See animates in useConsole.ts.
 */

export type Phase = 'off' | 'booting' | 'menu' | 'launching' | 'app' | 'returning'

/**
 * `app` is the open app in launching, app and returning, and null otherwise.
 * `sel` is the selection inside the open app, `rail` the index of the
 * highlighted slot, and `refocus` is whether the menu was reached by coming
 * back from an app, which is when the rail takes focus.
 */
export interface ConsoleState {
  phase: Phase
  app: AppId | null
  sel: number
  rail: number
  refocus: boolean
}

export const INITIAL: ConsoleState = { phase: 'menu', app: null, sel: 0, rail: 0, refocus: false }

export type Trigger =
  /** The page has hydrated. `booting` is whether the layout's script started a boot. */
  | { type: 'arrive'; booting: boolean }
  | { type: 'power' }
  | { type: 'bootDone' }
  | { type: 'launch'; app: AppId; icon: HTMLElement }
  /** The launch reached the white, where the app replaces the menu. */
  | { type: 'launched' }
  | { type: 'launchFailed' }
  | { type: 'back' }
  /** The return reached the white, where the menu replaces the app. */
  | { type: 'returned' }
  | { type: 'returnFailed' }
  /** The address changed. `app` is the one it names, if any, and `slot` its place on the rail. */
  | { type: 'hash'; app: AppId | null; slot: number }
  | { type: 'select'; index: number }
  | { type: 'railMoved'; index: number }

/** What the table has to ask of the outside world. */
export interface ConsoleEnv {
  /** Whether switching on plays the boot again. */
  replaysBoot: () => boolean
  /** Whether the app has a screen to open onto. */
  opens: (app: AppId) => boolean
}

type Of<T extends Trigger['type']> = Extract<Trigger, { type: T }>
type Row = { [T in Trigger['type']]?: (s: ConsoleState, t: Of<T>, env: ConsoleEnv) => ConsoleState | null }

// Back to the start: the menu with the rail on the first app. Switching off
// and on both land here, so power always ends up on Profile.
const reset = (phase: Phase): ConsoleState => ({ ...INITIAL, phase })

const to = (s: ConsoleState, phase: Phase): ConsoleState => ({ ...s, phase })

// An address that names an app opens it straight away, from anywhere the
// console is on and not mid-transition: the link was the click.
const openFromHash = (s: ConsoleState, t: Of<'hash'>, env: ConsoleEnv): ConsoleState | null =>
  t.app && env.opens(t.app) ? { phase: 'app', app: t.app, sel: 0, rail: t.slot, refocus: false } : null

const railMoved = (s: ConsoleState, t: Of<'railMoved'>): ConsoleState => (s.rail === t.index ? s : { ...s, rail: t.index })

const select = (s: ConsoleState, t: Of<'select'>): ConsoleState => (s.sel === t.index ? s : { ...s, sel: t.index })

/**
 * Every move the console can make. A trigger with no entry for the current
 * phase is ignored, which is what stops a second press from starting a
 * transition on top of one that is running.
 */
const MOVES: Record<Phase, Row> = {
  off: {
    power: (_s, _t, env) => reset(env.replaysBoot() ? 'booting' : 'menu'),
  },
  booting: {
    bootDone: s => to(s, 'menu'),
    power: () => reset('off'),
    hash: openFromHash,
    railMoved,
  },
  menu: {
    arrive: (s, t) => (t.booting ? to(s, 'booting') : null),
    power: () => reset('off'),
    launch: (s, t, env) => (env.opens(t.app) ? { ...s, phase: 'launching', app: t.app, refocus: false } : null),
    hash: openFromHash,
    railMoved,
  },
  launching: {
    launched: s => ({ ...s, phase: 'app', sel: 0 }),
    launchFailed: s => ({ ...s, phase: 'menu', app: null }),
    railMoved,
  },
  app: {
    back: s => to(s, 'returning'),
    power: () => reset('off'),
    hash: openFromHash,
    select,
  },
  returning: {
    returned: s => ({ ...s, phase: 'menu', app: null, sel: 0, refocus: true }),
    returnFailed: s => to(s, 'app'),
    select,
  },
}

/** The next state, or null when the current phase does not allow the trigger. */
export function move(s: ConsoleState, t: Trigger, env: ConsoleEnv): ConsoleState | null {
  const row = MOVES[s.phase][t.type] as ((s: ConsoleState, t: Trigger, env: ConsoleEnv) => ConsoleState | null) | undefined
  return row ? row(s, t, env) : null
}

// Names the console and the layout's pre-paint script share, so neither can
// drift from the other. The dataset names are the camelCase of the
// data-boot and data-motion attributes on <html>.
export const BOOTED_KEY = 'dsi-booted'
export const MOTION_KEY = 'dsi-motion'
export const BOOT_DATASET = 'boot'
export const MOTION_DATASET = 'motion'
export const PLAIN_QUERY = 'view=plain'
