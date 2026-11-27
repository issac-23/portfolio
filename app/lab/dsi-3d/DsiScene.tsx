'use client'

import { createPortal as domPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { Cue } from '@/components/dsi/lab/sfx'
import { Canvas, createPortal, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer, useGLTF } from '@react-three/drei'
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
} from 'three'
import DsiMenu from '@/components/dsi/DsiMenu'
import type { DeviceProps } from '@/components/dsi/Device'
import { INITIAL } from '@/components/dsi/console'
import { getMotion } from '@/components/dsi/prefs'
import Level3D from './Level3D'

// The opening: the closed DSi turns to face the viewer, then the lid opens, the
// two overlapping a little so it reads as one movement.
const TURN_SECONDS = 0.7
const LID_START = 0.55
const LID_SECONDS = 0.85
const INTRO_SECONDS = LID_START + LID_SECONDS
const MAX_YAW = 0.7
const MAX_PITCH = 0.3
const INTRO_YAW = 0.6
// Shut, the DSi is drawn this much smaller so its turning fits a narrow window too.
const CLOSED_SCALE = 0.85
// Where the camera sits, as an angle above the table, and how much of the view
// the open model may fill (NDC, 1 is the edge). The bottom edge leaves room for the credit line.
const CAMERA_ELEVATION = 0.7
const FILL_X = 0.97
const FILL_Y = 0.9
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
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const unit = (t: number) => Math.max(0, Math.min(1, t))

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

/** A thin sample of the model's vertices as they are with the lid open (call after updateMatrixWorld). */
function openPoints(root: Object3D, center: Vector3, scale: number) {
  const meshes: Mesh[] = []
  let total = 0
  root.traverse(o => {
    const m = o as Mesh
    if (m.isMesh && m.name !== 'PowerHit') {
      meshes.push(m)
      total += m.geometry.getAttribute('position').count
    }
  })
  const stride = Math.max(1, Math.ceil(total / 30000))
  const out: number[] = []
  const v = new Vector3()
  for (const m of meshes) {
    const pos = m.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).sub(center).multiplyScalar(scale)
      out.push(v.x, v.y, v.z)
    }
  }
  return new Float32Array(out)
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
  // Where the camera looks, so the shut DSi can be brought to it.
  const aim = useRef(new Vector3())

  const rig = useMemo(() => {
    const lid = scene.getObjectByName('Lid') as Object3D
    const base = scene.getObjectByName('Base') as Object3D
    const axis = new Vector3(...(lid.userData.hingeAxis as [number, number, number]))
    const closeAngle = lid.userData.closeAngle as number
    const screenMat = new MeshStandardMaterial({ color: new Color('#050607'), roughness: 0.14, metalness: 0, envMapIntensity: 1.4 })
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
    const scale = 3.4 / Math.max(size.x, size.y, size.z)
    const points = openPoints(scene, center, scale)
    // Shut, the DSi lies lower than its open middle; the opening lifts it from there.
    lid.quaternion.setFromAxisAngle(axis, closeAngle)
    scene.updateMatrixWorld(true)
    const closedAt = new Box3().setFromObject(scene).getCenter(new Vector3()).sub(center).multiplyScalar(scale)
    lid.quaternion.setFromAxisAngle(axis, 0)
    scene.updateMatrixWorld(true)
    // The lowest point of the open model, in scene units, where the contact shadow sits.
    let floor = Infinity
    for (let i = 1; i < points.length; i += 3) floor = Math.min(floor, points[i])
    return {
      floor,
      lid,
      base,
      axis,
      closeAngle,
      screenMat,
      buttonMat,
      hit,
      center,
      scale,
      closedAt,
      // The open model's points, relative to its centre and in scene units, for the camera to fit.
      points,
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

  // Frames the open model for the window's shape: as close as it can get with
  // every point of it still inside the view. A wide window is limited by
  // height, a tall phone by width, so the distance is worked out from the
  // window's aspect rather than fixed.
  const aspect = useThree(s => s.size.width / Math.max(1, s.size.height))
  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const dir = new Vector3(0, Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_ELEVATION))
    const up = new Vector3(0, Math.cos(CAMERA_ELEVATION), -Math.sin(CAMERA_ELEVATION))
    const tanV = Math.tan((cam.fov * Math.PI) / 360)
    const tanH = tanV * aspect
    // For a point at x across, y up and z toward the camera, the camera at
    // distance d sees it at depth d - z, and it must satisfy |x| <= FILL * tan * depth.
    // The camera looks at the middle of the model's height, so the spare room is even.
    const p = rig.points
    const n = p.length / 3
    const ys = new Float32Array(n)
    const zs = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      ys[i] = p[i * 3 + 1] * up.y + p[i * 3 + 2] * up.z
      zs[i] = p[i * 3 + 1] * dir.y + p[i * 3 + 2] * dir.z
    }
    // Near parts look bigger, so the middle of the height is nudged until the
    // gaps above and below the model match.
    let mid = 0
    let d = 1
    for (let pass = 0; pass < 4; pass++) {
      d = 1
      for (let i = 0; i < n; i++) d = Math.max(d, zs[i] + Math.abs(p[i * 3]) / (FILL_X * tanH), zs[i] + Math.abs(ys[i] - mid) / (FILL_Y * tanV))
      let top = -Infinity
      let bottom = Infinity
      for (let i = 0; i < n; i++) {
        const v = (ys[i] - mid) / ((d - zs[i]) * tanV)
        top = Math.max(top, v)
        bottom = Math.min(bottom, v)
      }
      mid += ((top + bottom) / 2) * d * tanV
    }
    for (let i = 0; i < n; i++) d = Math.max(d, zs[i] + Math.abs(p[i * 3]) / (FILL_X * tanH), zs[i] + Math.abs(ys[i] - mid) / (FILL_Y * tanV))
    const target = up.clone().multiplyScalar(mid)
    aim.current.copy(target)
    cam.aspect = aspect
    cam.position.copy(dir).multiplyScalar(d).add(target)
    cam.lookAt(target)
    cam.updateProjectionMatrix()
  }, [rig, camera, aspect])

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
    const done = still || elapsed >= INTRO_SECONDS
    // Turn to face the viewer first, with the lid shut, then lift the lid.
    const turn = still ? 1 : easeInOut(unit(elapsed / TURN_SECONDS))
    const lid = still ? 1 : easeOutCubic(unit((elapsed - LID_START) / LID_SECONDS))
    if (done && !opened) {
      gl.domElement.dataset.phase = 'open'
      setOpened(true)
      onOpened()
    }
    setOpen(lid)

    // Drag offsets ease back to rest when the pointer lets go.
    const d = drag.current
    const k = 1 - Math.exp(-dt * (d.active ? 18 : 5))
    d.yaw += ((d.active ? d.x : 0) - d.yaw) * k
    d.pitch += ((d.active ? d.y : 0) - d.pitch) * k
    el.rotation.y = (1 - turn) * INTRO_YAW + d.yaw
    el.rotation.x = d.pitch
    // Shut, the DSi sits where the camera looks; the opening lowers it into its place.
    const shrink = CLOSED_SCALE + (1 - CLOSED_SCALE) * lid
    el.scale.setScalar(rig.scale * shrink)
    el.position.copy(rig.closedAt).multiplyScalar(shrink).applyEuler(el.rotation).negate().add(aim.current).multiplyScalar(1 - lid)
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
    <>
      {/* Soft shadow where the DSi meets the table; stays put while the DSi lifts and tilts. */}
      <ContactShadows position={[0, rig.floor - 0.005, 0]} scale={9} resolution={512} far={1.6} blur={2.6} opacity={0.55} color="#1b2a35" frames={Infinity} />
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
    </>
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
    // The list the arrow keys move is the one whose items carry data-idx
    // (useListNav's contract), on whichever screen it is; the top screen's own
    // aria-current marks are not that list. Items can be images with no text,
    // so the position is what is compared.
    const current = () => document.querySelector('.dsi-screen [data-idx][aria-current="true"]')?.getAttribute('data-idx') ?? null
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
    // Capture phase, so `before` is read ahead of the list's own key handler.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
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
        // On a tall window the open DSi is fitted to nearly the full width, so
        // any sideways turn would swing a corner off screen; only tilting is left.
        const yawLimit = window.innerWidth < window.innerHeight ? 0 : MAX_YAW
        d.x = clamp((e.clientX - origin.current.x) * 0.006, yawLimit)
        d.y = clamp((e.clientY - origin.current.y) * 0.004, MAX_PITCH)
      }}
      onPointerUp={() => {
        drag.current.active = false
      }}
      onPointerCancel={() => {
        drag.current.active = false
      }}
    >
      <Canvas
        frameloop={fps ? 'demand' : 'always'}
        dpr={[1, 2]}
        camera={{ position: [0, 2.6, 6.2], fov: 30 }}
        gl={{ alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05, outputColorSpace: SRGBColorSpace }}
      >
        {fps > 0 && <Ticker fps={fps} />}
        <Level3D still={still} />
        {/* A low key from the left rakes across the plastic so edges and engraving catch it; a softer fill from the right; the sky and ground tint keeps shadows from going black. */}
        <hemisphereLight args={['#eaf4ff', '#8fa7b8', 0.45]} />
        <directionalLight position={[-5, 2.6, 2.2]} intensity={2.6} color="#fff6ea" />
        <directionalLight position={[4, 3, 4]} intensity={0.7} color="#dcecff" />
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={2.2} position={[0, 5, 2]} scale={[8, 4, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.2} position={[-5, 1, 3]} scale={[3, 4, 1]} color="#cfe6ff" />
          <Lightformer form="rect" intensity={0.9} position={[5, 1, -2]} scale={[3, 4, 1]} color="#fff4e0" />
          <Lightformer form="rect" intensity={0.5} position={[0, 0.5, 6]} scale={[10, 1.5, 1]} color="#ffffff" />
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
