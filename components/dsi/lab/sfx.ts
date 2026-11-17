/**
 * Original UI sound effects, synthesised with the Web Audio API: short, soft
 * square and triangle blips and one filtered-noise sweep. Nothing is sampled or
 * loaded, and none of it is modelled on any console's or game's sounds; the
 * little figures here were written for this prototype.
 *
 * They share the chiptune's AudioContext, so they obey the same gesture rule
 * and the same mute: a muted context is suspended, and a cue asked of a
 * context that is not running is dropped. Drop this file and its caller to
 * remove them.
 */

export type Cue = 'power' | 'boot-chime' | 'move' | 'bump' | 'confirm' | 'whoosh' | 'back' | 'reveal'

const LEVEL = 0.2 // sits a little above the music, which is near -18 dB

const hz = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12)
// A few named pitches, in semitones from A4.
const N = { G3: -14, D4: -7, G4: -2, A4: 0, B4: 2, D5: 5, E5: 7, 'F#5': 9, G5: 10, A5: 12, B5: 14, D6: 17, G6: 22 }

type Wave = 'square' | 'triangle' | 'sine'

export function createSfx(getContext: () => AudioContext | null) {
  const log: string[] = []

  function blip(c: AudioContext, out: AudioNode, wave: Wave, f0: number, f1: number, t: number, dur: number, peak: number) {
    const osc = c.createOscillator()
    osc.type = wave
    osc.frequency.setValueAtTime(f0, t)
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.9)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(peak, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  function noiseSweep(c: AudioContext, out: AudioNode, t: number, dur: number) {
    const len = Math.floor(c.sampleRate * dur)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 2.2
    bp.frequency.setValueAtTime(300, t)
    bp.frequency.exponentialRampToValueAtTime(3200, t + dur * 0.8)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.5, t + dur * 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(bp).connect(g).connect(out)
    src.start(t)
  }

  const cues: Record<Cue, (c: AudioContext, out: AudioNode, t: number) => void> = {
    // ~0.16 s: a quick upward chirp.
    power: (c, out, t) => {
      blip(c, out, 'square', hz(N.D4), hz(N.D5), t, 0.16, 0.5)
    },
    // ~0.8 s: four soft notes, D major, rising then settling.
    'boot-chime': (c, out, t) => {
      const notes = [N.D5, N['F#5'], N.A5, N.D6]
      notes.forEach((n, i) => blip(c, out, 'triangle', hz(n), hz(n), t + i * 0.13, i === 3 ? 0.42 : 0.2, 0.6))
      blip(c, out, 'square', hz(N.D6), hz(N.D6), t + 0.39, 0.4, 0.12)
    },
    // ~0.08 s
    move: (c, out, t) => {
      blip(c, out, 'square', hz(N.B5), hz(N.D6), t, 0.08, 0.35)
    },
    // ~0.09 s, lower and duller.
    bump: (c, out, t) => {
      const lp = c.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 420
      lp.connect(out)
      blip(c, lp, 'triangle', 150, 95, t, 0.09, 0.8)
    },
    // ~0.15 s: two notes up.
    confirm: (c, out, t) => {
      blip(c, out, 'square', hz(N.G5), hz(N.G5), t, 0.07, 0.4)
      blip(c, out, 'square', hz(N.D6), hz(N.D6), t + 0.06, 0.09, 0.4)
    },
    // ~0.7 s
    whoosh: (c, out, t) => noiseSweep(c, out, t, 0.7),
    // ~0.15 s: two notes down.
    back: (c, out, t) => {
      blip(c, out, 'triangle', hz(N.D6), hz(N.D6), t, 0.07, 0.6)
      blip(c, out, 'triangle', hz(N.G5), hz(N.G5), t + 0.06, 0.09, 0.6)
    },
    // ~1.7 s: a slow rising shimmer of G major, then a held chord that fades.
    reveal: (c, out, t) => {
      ;[N.G3, N.D4, N.G4, N.B4, N.D5, N.G5, N.B5, N.D6, N.G6].forEach((n, i) =>
        blip(c, out, 'triangle', hz(n), hz(n), t + i * 0.1, 0.9, 0.3),
      )
      ;[N.G4, N.B4, N.D5].forEach(n => blip(c, out, 'sine', hz(n), hz(n), t + 0.9, 0.8, 0.3))
    },
  }

  return {
    /** Plays a cue if the context is running. Every cue that plays is logged. */
    play(name: Cue) {
      const c = getContext()
      if (!c || c.state !== 'running') return false
      const out = c.createGain()
      out.gain.value = LEVEL
      out.connect(c.destination)
      cues[name](c, out, c.currentTime + 0.01)
      log.push(name)
      return true
    },
    /** The cues that have played, in order. For tests. */
    log: () => [...log],
  }
}
