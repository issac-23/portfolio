'use client'

import { createPortal as domPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Cue } from '@/components/dsi/lab/sfx'
import { Canvas, createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, Html, Lightformer, useGLTF } from '@react-three/drei'
import {
  Box3,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import DsiMenu from '@/components/dsi/DsiMenu'
import type { DeviceProps } from '@/components/dsi/Device'
import { INITIAL } from '@/components/dsi/console'
import { getMotion } from '@/components/dsi/prefs'

const OPEN_SECONDS = 1.1
const MAX_YAW = 0.7
const MAX_PITCH = 0.3
const INTRO_YAW = 0.65
// The live screens are laid out at this many CSS px and scaled onto the model.
const PANEL_W = 400
const PANEL_H = 300
// drei's <Html transform> draws one CSS px as 1/40 of a world unit.
const PX = 0.025

type Drag = { active: boolean; id: number; x: number; y: number; yaw: number; pitch: number }
interface Frame {
  center: number[]
  right: number[]
  up: number[]
  normal: number[]
  width: number
  height: number
}

const OFF_AT_START = { ...INITIAL, phase: 'off' as const }
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** The page's reduced-motion choices: the system's, or the DSi's own setting. */
function wantsStill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  return getMotion() === 'reduce'
}

type LabHooks = Record<string, unknown>
const hooks = (): LabHooks => {
  const w = window as unknown as { __dsiLab?: LabHooks }
  return (w.__dsiLab ??= {})
}

/** Hangs a DOM panel on a screen: a CSS3D plane glued to the model's screen frame. */
function ScreenPanel({ frame, container, setEl }: { frame: Frame; container: Object3D; setEl: (el: HTMLDivElement | null) => void }) {
  const q = useMemo(
    () => new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(new Vector3(...frame.right), new Vector3(...frame.up), new Vector3(...frame.normal))),
    [frame],
  )
  const pos = useMemo(() => new Vector3(...frame.center).addScaledVector(new Vector3(...frame.normal), 0.0002), [frame])
  const k = Math.min(frame.width / (PX * PANEL_W), frame.height / (PX * PANEL_H))
  return createPortal(
    <group position={pos} quaternion={q} scale={k}>
      <Html transform>
        <div ref={setEl} style={{ width: PANEL_W, height: PANEL_H }} />
      </Html>
    </group>,
    container,
  )
}

/** Lab-only debug (?fps=4): renders on a slow timer, for software-GL headless runs. */
function Ticker({ fps }: { fps: number }) {
  const invalidate = useThree(s => s.invalidate)
  useEffect(() => {
    const id = setInterval(invalidate, 1000 / fps)
    return () => clearInterval(id)
  }, [fps, invalidate])
  return null
}

interface DeviceBits {
  drag: MutableRefObject<Drag>
  still: boolean
  lit: boolean
  freeze: number | null
  onPress: () => void
  onOpened: () => void
  setTopEl: (el: HTMLDivElement | null) => void
  setBottomEl: (el: HTMLDivElement | null) => void
}

function Device({ drag, still, lit, freeze, onPress, onOpened, setTopEl, setBottomEl }: DeviceBits) {
  const { scene } = useGLTF('/models/dsi.glb', false)
  const { camera, gl } = useThree()
  const pivot = useRef<Group>(null)
  const start = useRef<number | null>(null)
  const [opened, setOpened] = useState(false)
  const hovering = useRef(false)

  const rig = useMemo(() => {
    const lid = scene.getObjectByName('Lid') as Object3D
    const base = scene.getObjectByName('Base') as Object3D
    const axis = new Vector3(...(lid.userData.hingeAxis as [number, number, number]))
    const closeAngle = lid.userData.closeAngle as number
    const screenMat = new MeshStandardMaterial({ color: new Color('#050607'), roughness: 0.35, metalness: 0 })
    for (const name of ['ScreenTop', 'ScreenBottom']) {
      const m = scene.getObjectByName(name) as Mesh | undefined
      if (m) m.material = screenMat
    }
    // The power button gets its own material so it can light up on hover, and a
    // larger invisible target so a 4 mm button is not hard to hit.
    const button = scene.getObjectByName('Power_button') as Mesh
    const buttonMat = (button.material as MeshStandardMaterial).clone()
    button.material = buttonMat
    lid.quaternion.setFromAxisAngle(axis, 0)
    scene.updateMatrixWorld(true)
    const bb = new Box3().setFromObject(button)
    const hit = new Mesh(new SphereGeometry(0.0065, 12, 8), new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    hit.name = 'PowerHit'
    hit.position.copy(bb.getCenter(new Vector3()))
    scene.add(hit)
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    return {
      lid,
      base,
      axis,
      closeAngle,
      screenMat,
      buttonMat,
      hit,
      center,
      scale: 3.4 / Math.max(size.x, size.y, size.z),
      top: lid.userData.screen as Frame,
      bottom: base.userData.screen as Frame,
    }
  }, [scene])

  const setOpen = (t: number) => rig.lid.quaternion.setFromAxisAngle(rig.axis, rig.closeAngle * (1 - t))

  useEffect(() => {
    setOpen(still ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, still])

  // Dark until powered on, then lit.
  useEffect(() => {
    rig.screenMat.color.set(lit ? '#cfe8f6' : '#050607')
    rig.screenMat.emissive.set(lit ? '#9fd0ea' : '#000000')
    rig.screenMat.emissiveIntensity = lit ? 0.55 : 0
  }, [rig, lit])

  // For the headless checks: where the power button is on screen.
  useEffect(() => {
    hooks().powerPoint = () => {
      const v = rig.hit.getWorldPosition(new Vector3()).project(camera)
      const r = gl.domElement.getBoundingClientRect()
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height }
    }
  }, [rig, camera, gl])

  useFrame(({ clock }, dt) => {
    const el = pivot.current
    if (!el) return
    if (start.current === null) {
      start.current = clock.elapsedTime
      gl.domElement.dataset.phase = still ? 'open' : 'opening'
    }
    const elapsed = freeze !== null ? freeze / 1000 : clock.elapsedTime - start.current
    const t = still ? 1 : Math.min(elapsed / OPEN_SECONDS, 1)
    const e = easeOutCubic(t)
    if (t >= 1 && !opened) {
      gl.domElement.dataset.phase = 'open'
      setOpened(true)
      onOpened()
    }
    setOpen(e)

    // Drag offsets ease back to rest when the pointer lets go.
    const d = drag.current
    const k = 1 - Math.exp(-dt * (d.active ? 18 : 5))
    d.yaw += ((d.active ? d.x : 0) - d.yaw) * k
    d.pitch += ((d.active ? d.y : 0) - d.pitch) * k
    el.rotation.y = (still ? 0 : (1 - e) * INTRO_YAW) + d.yaw
    el.rotation.x = d.pitch
  })

  const isPower = (o: Object3D) => o.name === 'PowerHit' || o.name === 'Power_button'
  const hover = (on: boolean) => {
    if (hovering.current === on) return
    hovering.current = on
    rig.buttonMat.emissive.set(on ? '#58c8e9' : '#000000')
    rig.buttonMat.emissiveIntensity = on ? 1.2 : 0
    gl.domElement.style.cursor = on ? 'pointer' : ''
  }

  return (
    <group ref={pivot} scale={rig.scale}>
      <primitive
        object={scene}
        position={[-rig.center.x, -rig.center.y, -rig.center.z]}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => isPower(e.object) && hover(true)}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => isPower(e.object) && hover(false)}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          // A drag that happens to end on the button is not a press.
          if (isPower(e.object) && e.delta < 5) {
            e.stopPropagation()
            onPress()
          }
        }}
      />
      {/* Only once the lid is up: before that the DOM layer would sit on top of a closed lid. */}
      {opened && <ScreenPanel frame={rig.top} container={rig.lid} setEl={setTopEl} />}
      {opened && <ScreenPanel frame={rig.bottom} container={rig.base} setEl={setBottomEl} />}
    </group>
  )
}

interface ScreensProps extends DeviceProps {
  topEl: HTMLElement | null
  bottomEl: HTMLElement | null
  register: (power: () => void) => void
  onLit: (lit: boolean) => void
  onCue: (cue: Cue) => void
}

/**
 * The shell DsiMenu draws, in place of <Device>: the same screen markup, but
 * each screen goes into its own panel on the 3D model. DsiMenu itself, the
 * console, the rail and every app are the home page's, unchanged.
 */
function Screens({ top, bottom, power, phase, onPower, topEl, bottomEl, register, onLit, onCue }: ScreensProps) {
  useEffect(() => {
    register(onPower)
    onLit(power)
  }, [register, onLit, onPower, power])

  // Sound cues, read off what the console already does: its phase changes, and
  // the arrow keys the rail and the lists already handle. No state of their own.
  const lastPhase = useRef(phase)
  const phaseNow = useRef(phase)
  phaseNow.current = phase
  useEffect(() => {
    const was = lastPhase.current
    lastPhase.current = phase
    if (was === phase) return
    if (phase === 'booting') onCue('boot-chime')
    else if (was === 'menu' && phase === 'launching') {
      onCue('confirm')
      onCue('whoosh')
    } else if (was === 'app' && phase === 'returning') onCue('back')
  }, [phase, onCue])
  useEffect(() => {
    const current = () => document.querySelector('.dsi-screen [aria-current="true"]')?.textContent ?? null
    const onKey = (e: KeyboardEvent) => {
      if (!/^Arrow(Left|Right|Up|Down)$/.test(e.key) || e.metaKey || e.ctrlKey || e.altKey) return
      const p = phaseNow.current
      if (p === 'menu' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) onCue('move')
      else if (p === 'app') {
        // A list item stayed current: pressed past the end.
        const before = current()
        if (before === null) return
        setTimeout(() => onCue(current() === before ? 'bump' : 'move'), 60)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCue])

  const screen = (content: React.ReactNode, mark: boolean) => (
    <div className="dsi-root" style={{ fontFamily: 'var(--font-rounded)' }}>
      <div className="dsi-device" data-power={power ? undefined : 'off'} data-console={phase} style={{ width: '100%' }}>
        <div className="dsi-screen" style={{ width: '100%' }}>
          {content}
          <div className="dsi-fx" aria-hidden="true" />
          <div className="dsi-boot" aria-hidden="true">
            {mark && <span className="dsi-boot-mark">Issac Ip</span>}
          </div>
        </div>
      </div>
    </div>
  )
  return (
    <>
      {topEl && domPortal(screen(top, true), topEl)}
      {bottomEl && domPortal(screen(bottom, false), bottomEl)}
    </>
  )
}

export interface DsiSceneProps {
  /** The 3D POWER button was pressed. */
  onPress: () => void
  /** Hands the page the console's power trigger. */
  register: (power: () => void) => void
  /** The console went on or off. */
  onLit: (lit: boolean) => void
  lit: boolean
  onCue: (cue: Cue) => void
  /** The lid finished opening. */
  onOpened: () => void
}

export default function DsiScene({ onPress, register, onLit, lit, onCue, onOpened }: DsiSceneProps) {
  const drag = useRef<Drag>({ active: false, id: -1, x: 0, y: 0, yaw: 0, pitch: 0 })
  const origin = useRef({ x: 0, y: 0 })
  const still = useMemo(() => wantsStill(), [])
  // Lab-only debug: ?freeze=<ms> pins the opening animation at that moment.
  const freeze = useMemo(() => {
    const v = new URLSearchParams(window.location.search).get('freeze')
    return v === null ? null : Number(v)
  }, [])
  const fps = useMemo(() => Number(new URLSearchParams(window.location.search).get('fps')) || 0, [])
  const [topEl, setTopEl] = useState<HTMLElement | null>(null)
  const [bottomEl, setBottomEl] = useState<HTMLElement | null>(null)
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

  const shell = useCallback(
    (p: DeviceProps) => <Screens {...p} topEl={topEl} bottomEl={bottomEl} register={register} onLit={onLit} onCue={onCue} />,
    [topEl, bottomEl, register, onLit, onCue],
  )

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={e => {
        // Only a press on the canvas drags the model. A press on a screen is the page's.
        if ((e.target as HTMLElement).tagName !== 'CANVAS') return
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        const d = drag.current
        d.active = true
        d.id = e.pointerId
        d.x = 0
        d.y = 0
        origin.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerMove={e => {
        const d = drag.current
        if (!d.active || e.pointerId !== d.id) return
        d.x = clamp((e.clientX - origin.current.x) * 0.006, MAX_YAW)
        d.y = clamp((e.clientY - origin.current.y) * 0.004, MAX_PITCH)
      }}
      onPointerUp={() => {
        drag.current.active = false
      }}
      onPointerCancel={() => {
        drag.current.active = false
      }}
    >
      <Canvas frameloop={fps ? 'demand' : 'always'} dpr={[1, 2]} camera={{ position: [0, 2.6, 6.2], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}>
        {fps > 0 && <Ticker fps={fps} />}
        <hemisphereLight args={['#eaf4ff', '#9db8cc', 0.9]} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} />
        <directionalLight position={[-4, 2, 3]} intensity={0.8} />
        <Environment resolution={64}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 4, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, 3]} scale={[3, 4, 1]} color="#cfe6ff" />
          <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[3, 4, 1]} color="#fff4e0" />
        </Environment>
        <Device
          drag={drag}
          still={still}
          lit={lit}
          freeze={freeze}
          onPress={onPress}
          onOpened={onOpened}
          setTopEl={setTopEl}
          setBottomEl={setBottomEl}
        />
      </Canvas>
      {/* The home page's menu, drawn through the shell above. Nothing of its own to show here. */}
      <DsiMenu initial={OFF_AT_START} shell={shell} />
    </div>
  )
}
