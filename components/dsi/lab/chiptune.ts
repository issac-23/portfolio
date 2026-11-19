/**
 * An original looping chiptune, synthesised live with the Web Audio API: no
 * audio files. Pulse, square and triangle voices driven by a small lookahead
 * sequencer. The tune is this file's own: sixteen bars in G major at a calm
 * tempo over a plain I-vi-IV-V style progression, written for this prototype
 * and not taken from, or modelled on, any console's menu or shop music.
 *
 * Browsers only allow audio after a user gesture, so nothing here runs until
 * `start()` is called from a click or key press. Muting suspends the context,
 * so a muted visit costs nothing. Drop this file, and its one caller, to remove
 * the music.
 */

const BPM = 96
const EIGHTH = 60 / BPM / 2
const MASTER = Math.pow(10, -18 / 20) // about -18 dB
const FADE_IN = 1.6
const AHEAD = 0.25
const TICK_MS = 50

const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 }
const hz = (name: string) => {
  const m = /^([A-G]#?)(\d)$/.exec(name)
  if (!m) throw new Error('bad note ' + name)
  return 440 * Math.pow(2, (SEMI[m[1]] + 12 * (+m[2] + 1) - 69) / 12)
}

// One chord per bar: root, third, fifth.
const CHORDS: [string, string, string][] = [
  ['G', 'B', 'D'], ['E', 'G', 'B'], ['C', 'E', 'G'], ['D', 'F#', 'A'],
  ['G', 'B', 'D'], ['B', 'D', 'F#'], ['C', 'E', 'G'], ['D', 'F#', 'A'],
  ['E', 'G', 'B'], ['C', 'E', 'G'], ['G', 'B', 'D'], ['D', 'F#', 'A'],
  ['A', 'C', 'E'], ['D', 'F#', 'A'], ['C', 'E', 'G'], ['D', 'F#', 'A'],
]

// Eight eighth-notes per bar. A name starts a note, '-' holds it, '.' rests.
const MELODY: string[] = [
  'D5 - B4 - G4 B4 D5 -',
  'E5 - D5 B4 - G4 B4 -',
  'C5 - E5 - G5 - E5 C5',
  'D5 - - - A4 - F#4 A4',
  'B4 - D5 G5 - D5 B4 -',
  'D5 - F#5 - D5 B4 - A4',
  'G4 - C5 E5 - D5 C5 -',
  'A4 - - D5 - - - .',
  'G5 - E5 - B4 - E5 G5',
  'E5 - G5 - E5 - C5 -',
  'D5 - B4 D5 G5 - D5 -',
  'F#5 - D5 - A4 - D5 -',
  'E5 - C5 - A4 C5 E5 -',
  'F#5 - A5 - F#5 D5 - -',
  'E5 - D5 C5 B4 - G4 -',
  'A4 - C5 - D5 - - .',
]

const ARP = [0, 1, 2, 1, 0, 1, 2, 1]
const BARS = CHORDS.length

type Event = { step: number; len: number; note: string }
function parseMelody(): Event[] {
  const out: Event[] = []
  MELODY.forEach((bar, b) => {
    bar.split(' ').forEach((tok, i) => {
      const step = b * 8 + i
      if (tok === '.') return
      if (tok === '-') {
        const last = out[out.length - 1]
        if (last) last.len += 1
        return
      }
      out.push({ step, len: 1, note: tok })
    })
  })
  return out
}
const MELODY_EVENTS = parseMelody()

export interface Chiptune {
  /** Creates the context and starts the loop. Call from a user gesture. */
  start(): void
  /** True while the loop is scheduling notes. For tests. */
  playing(): boolean
  /** Mute or unmute. Safe before `start()`. */
  setMuted(muted: boolean): void
  /** Stops the loop and closes the context. */
  dispose(): void
  /** The context's state, or null before `start()`. For tests. */
  state(): AudioContextState | null
  /** The live context, for the sound effects to share. Null before `start()`. */
  context(): AudioContext | null
}

export function createChiptune(initiallyMuted: boolean): Chiptune {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let muted = initiallyMuted
  let nextStep = 0
  let nextTime = 0

  function pulse(c: AudioContext, duty: number) {
    const n = 32
    const real = new Float32Array(n)
    const imag = new Float32Array(n)
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
    return c.createPeriodicWave(real, imag)
  }

  function voice(c: AudioContext, out: AudioNode, wave: 'sine' | 'square' | 'triangle' | PeriodicWave, f: number, t: number, dur: number, peak: number) {
    const osc = c.createOscillator()
    if (wave instanceof PeriodicWave) osc.setPeriodicWave(wave)
    else osc.type = wave
    osc.frequency.value = f
    const g = c.createGain()
    const attack = 0.012
    const release = Math.min(0.12, dur * 0.5)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + attack)
    g.gain.setValueAtTime(peak * 0.8, t + Math.max(attack, dur - release))
    g.gain.linearRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  const waves: { lead?: PeriodicWave; arp?: PeriodicWave } = {}

  function schedule(step: number, t: number) {
    const c = ctx
    if (!c || !master) return
    const bar = Math.floor(step / 8) % BARS
    const inBar = step % 8
    const chord = CHORDS[bar]
    // Bass: triangle, root on beats 1 and 3, the fifth an octave up on the offbeat of 3.
    if (inBar === 0 || inBar === 4) voice(c, master, 'triangle', hz(chord[0] + '2'), t, EIGHTH * 3.6, 0.5)
    if (inBar === 6) voice(c, master, 'triangle', hz(chord[2] + '2'), t, EIGHTH * 1.8, 0.28)
    // Arpeggio: narrow pulse, quiet.
    voice(c, master, waves.arp!, hz(chord[ARP[inBar]] + '4'), t, EIGHTH * 0.9, 0.09)
    // Lead: 50% pulse.
    for (const e of MELODY_EVENTS) {
      if (e.step === step % (BARS * 8)) voice(c, master, waves.lead!, hz(e.note), t, EIGHTH * e.len * 0.95, 0.2)
    }
  }

  function tick() {
    if (!ctx) return
    while (nextTime < ctx.currentTime + AHEAD) {
      schedule(nextStep, nextTime)
      nextStep = (nextStep + 1) % (BARS * 8)
      nextTime += EIGHTH
    }
  }

  return {
    start() {
      if (ctx) return
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0
      master.connect(ctx.destination)
      waves.lead = pulse(ctx, 0.5)
      waves.arp = pulse(ctx, 0.25)
      nextTime = ctx.currentTime + 0.1
      nextStep = 0
      timer = setInterval(tick, TICK_MS)
      // A short fade-in, so the first note does not click.
      master.gain.setValueAtTime(0, ctx.currentTime)
      master.gain.linearRampToValueAtTime(MASTER, ctx.currentTime + FADE_IN)
      if (muted) void ctx.suspend()
    },
    playing: () => timer !== null,
    setMuted(next) {
      muted = next
      const c = ctx
      if (!c) return
      if (next) void c.suspend()
      else void c.resume()
    },
    dispose() {
      if (timer) clearInterval(timer)
      timer = null
      const c = ctx
      ctx = null
      master = null
      if (c && c.state !== 'closed') void c.close()
    },
    state: () => (ctx ? ctx.state : null),
    context: () => ctx,
  }
}
