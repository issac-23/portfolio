'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { Box3, Color, Group, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { getMotion } from '@/components/dsi/prefs'

const OPEN_SECONDS = 1.1
const MAX_YAW = 0.7
const MAX_PITCH = 0.3
const INTRO_YAW = 0.65

type Drag = { active: boolean; id: number; x: number; y: number; yaw: number; pitch: number }

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** The page's reduced-motion choices: the system's, or the DSi's own setting. */
function wantsStill() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  return getMotion() === 'reduce'
}

function Device({ drag, still }: { drag: React.MutableRefObject<Drag>; still: boolean }) {
  const { scene } = useGLTF('/models/dsi.glb', false)
  const pivot = useRef<Group>(null)
  const start = useRef<number | null>(null)

  const rig = useMemo(() => {
    const lid = scene.getObjectByName('Lid') as Object3D
    const axis = new Vector3(...(lid.userData.hingeAxis as [number, number, number]))
    const closeAngle = lid.userData.closeAngle as number
    // Placeholder for the two screens: a flat, lit colour. Live content later.
    const screenMat = new MeshStandardMaterial({
      color: new Color('#cfe8f6'),
      emissive: new Color('#9fd0ea'),
      emissiveIntensity: 0.55,
      roughness: 0.35,
      metalness: 0,
    })
    for (const name of ['ScreenTop', 'ScreenBottom']) {
      const m = scene.getObjectByName(name) as Mesh | undefined
      if (m) m.material = screenMat
    }
    // Centre on the open pose and normalise the size, so framing is simple.
    lid.quaternion.setFromAxisAngle(axis, 0)
    scene.updateMatrixWorld(true)
    const box = new Box3().setFromObject(scene)
    const center = box.getCenter(new Vector3())
    const size = box.getSize(new Vector3())
    return { lid, axis, closeAngle, center, scale: 3.4 / Math.max(size.x, size.y, size.z) }
  }, [scene])

  // Opening: the lid angle runs from closed to its modelled angle.
  const setOpen = (t: number) => rig.lid.quaternion.setFromAxisAngle(rig.axis, rig.closeAngle * (1 - t))

  useEffect(() => {
    setOpen(still ? 1 : 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rig, still])

  useFrame(({ clock, gl }, dt) => {
    const el = pivot.current
    if (!el) return
    if (start.current === null) {
      start.current = clock.elapsedTime
      gl.domElement.dataset.phase = still ? 'open' : 'opening'
    }
    const t = still ? 1 : Math.min((clock.elapsedTime - start.current) / OPEN_SECONDS, 1)
    const e = easeOutCubic(t)
    if (t >= 1 && gl.domElement.dataset.phase !== 'open') gl.domElement.dataset.phase = 'open'
    setOpen(e)

    // Drag offsets ease back to rest when the pointer lets go.
    const d = drag.current
    const k = 1 - Math.exp(-dt * (d.active ? 18 : 5))
    d.yaw += ((d.active ? d.x : 0) - d.yaw) * k
    d.pitch += ((d.active ? d.y : 0) - d.pitch) * k
    el.rotation.y = (still ? 0 : (1 - e) * INTRO_YAW) + d.yaw
    el.rotation.x = d.pitch
  })

  return (
    <group ref={pivot} scale={rig.scale}>
      <primitive object={scene} position={[-rig.center.x, -rig.center.y, -rig.center.z]} />
    </group>
  )
}

export default function DsiScene() {
  const drag = useRef<Drag>({ active: false, id: -1, x: 0, y: 0, yaw: 0, pitch: 0 })
  const origin = useRef({ x: 0, y: 0 })
  const still = useMemo(() => wantsStill(), [])
  const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v))

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      aria-label="3D Nintendo DSi, drag to turn it"
      role="img"
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
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
      <Canvas dpr={[1, 2]} camera={{ position: [0, 2.6, 6.2], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}>
        <hemisphereLight args={['#eaf4ff', '#9db8cc', 0.9]} />
        <directionalLight position={[3, 6, 4]} intensity={2.2} />
        <directionalLight position={[-4, 2, 3]} intensity={0.8} />
        <Environment resolution={64}>
          <Lightformer form="rect" intensity={3} position={[0, 5, 2]} scale={[8, 4, 1]} color="#ffffff" />
          <Lightformer form="rect" intensity={1.5} position={[-5, 1, 3]} scale={[3, 4, 1]} color="#cfe6ff" />
          <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[3, 4, 1]} color="#fff4e0" />
        </Environment>
        <Device drag={drag} still={still} />
      </Canvas>
    </div>
  )
}
