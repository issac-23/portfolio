'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  InstancedMesh,
  LinearMipmapLinearFilter,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Quaternion,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * A little platformer level behind the DSi: a brick path winding away over a
 * grassy field, green pipes, floating brick blocks, round hills, puffy
 * clouds and a flagpole far down the path, fading into a bright sky.
 *
 * It is built in its own frame (x right, y up, the path running toward -z)
 * and the whole group is tilted so the camera, which really looks down on the
 * DSi at CAMERA_ELEVATION, sees the level from a shallow angle: a horizon
 * near the top of the view and the ground receding to it.
 *
 * Cheap on purpose: every kind of thing is one InstancedMesh, shaded by
 * colours baked into the vertices (so the scene's lights, which are tuned for
 * the plastic, never touch it), and the only texture is a tiny brick pattern.
 * Nothing here has a pointer handler, so clicks and drags go to the DSi.
 */

// Keep in step with DsiScene's CAMERA_ELEVATION.
const CAMERA_ELEVATION = 0.7
// How far the camera looks down on the level itself.
const GAZE = 0.14
// The level's ground sits this far below the DSi's middle, and is pushed this
// far back along the view, so the device hovers over it.
const GAP = 2.6
const PUSH = 3
// The level is modelled big and drawn at this scale, so it reads as far off next to the DSi.
const SCALE = 0.45

const SKY_TOP = '#3d98e4'
const SKY_MID = '#86caf6'
const SKY_HORIZON = '#c4e8fb'

// The home page's stage palette, in 3D.
const GRASS = '#72b85a'
const GRASS_HI = '#8ccc6c'
const SOIL = '#c9926a'
const BRICK = ['#d9996c', '#cf8e62', '#c98558', '#dba577']
const PIPE = ['#4aa84f', '#43a04b']
const HILL_FAR = '#b2d89a'
const HILL_NEAR = '#86c06f'
const CLOUD = '#fbfdff'
const FLAG = '#e0604f'

type Item = { p: [number, number, number]; s?: [number, number, number]; ry?: number; color: string }

/** What the camera sees, in the level's own units: its height and distance, and how wide the view is per unit of depth. */
interface View {
  camY: number
  camZ: number
  tanH: number
  /** 0 for a tall window, where the DSi covers the middle and the level shows above and below it, to 1 for a wide one, where it shows at the sides. */
  wide: number
}
const smooth = (t: number) => {
  const k = Math.max(0, Math.min(1, t))
  return k * k * (3 - 2 * k)
}

// A small seeded generator, so the level is the same every time.
function rng(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LIGHT = new Vector3(-0.45, 0.8, 0.4).normalize()
/** Bakes a soft toy shading into the vertices: lit tops, darker sides and undersides. */
function shade<T extends BufferGeometry>(g: T): T {
  const n = g.getAttribute('normal')
  const c = new Float32Array(n.count * 3)
  const v = new Vector3()
  for (let i = 0; i < n.count; i++) {
    v.fromBufferAttribute(n, i)
    const f = v.y < -0.5 ? 0.55 : 0.66 + 0.34 * Math.max(0, v.dot(LIGHT))
    c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = f
  }
  g.setAttribute('color', new Float32BufferAttribute(c, 3))
  return g
}

/** Lifts baked shading toward white, for clouds, which should stay bright even underneath. */
function soften<T extends BufferGeometry>(g: T): T {
  const c = g.getAttribute('color')
  for (let i = 0; i < c.count * 3; i++) (c.array as Float32Array)[i] = 0.82 + 0.18 * (c.array as Float32Array)[i]
  return g
}

/** One InstancedMesh for a list of items. */
function instanced(geo: BufferGeometry, mat: Material, items: Item[]) {
  const mesh = new InstancedMesh(geo, mat, items.length)
  const m = new Matrix4()
  const q = new Quaternion()
  const up = new Vector3(0, 1, 0)
  const col = new Color()
  items.forEach((it, i) => {
    const s = it.s ?? [1, 1, 1]
    m.compose(new Vector3(...it.p), q.setFromAxisAngle(up, it.ry ?? 0), new Vector3(...s))
    mesh.setMatrixAt(i, m)
    mesh.setColorAt(i, col.set(it.color))
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  return mesh
}

/** A 32 px brick pattern, white with grey mortar: it only darkens the colour it multiplies. */
function brickTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const x = c.getContext('2d')!
  x.fillStyle = '#ffffff'
  x.fillRect(0, 0, 32, 32)
  x.fillStyle = '#b9a79a'
  for (let r = 0; r < 4; r++) {
    x.fillRect(0, r * 8, 32, 2)
    const off = r % 2 ? 0 : 16
    x.fillRect(off, r * 8, 2, 8)
    x.fillRect((off + 16) % 32, r * 8, 2, 8)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.magFilter = NearestFilter
  t.minFilter = LinearMipmapLinearFilter
  t.anisotropy = 4
  return t
}

function skyTexture() {
  const c = document.createElement('canvas')
  c.width = 2
  c.height = 256
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, SKY_TOP)
  g.addColorStop(0.13, SKY_MID)
  g.addColorStop(0.27, SKY_HORIZON)
  g.addColorStop(1, SKY_HORIZON)
  x.fillStyle = g
  x.fillRect(0, 0, 2, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function build(still: boolean, v: View) {
  const root = new Group()
  // A point at this fraction of the screen's half-width (-1 left, 1 right), at depth z down the level.
  const across = (f: number, z: number) => f * v.tanH * (v.camZ - z)
  // The path keeps to the left gutter of a wide window, then swings out toward the flag; on a tall one it runs up the middle.
  const roadNear = across(-0.8 * v.wide, -35)
  const roadFar = across(-0.74 * v.wide, -84)
  const pathX = (z: number) => roadNear + (roadFar - roadNear) * smooth((-z - 35) / 50) + (1.6 - 0.7 * v.wide) * Math.sin(z * 0.11)
  const toDispose: { dispose(): void }[] = []
  const track = <T extends { dispose(): void }>(o: T) => (toDispose.push(o), o)
  const plain = track(new MeshBasicMaterial({ vertexColors: true, toneMapped: false }))
  const bricks = track(new MeshBasicMaterial({ vertexColors: true, toneMapped: false, map: track(brickTexture()) }))
  const flat = track(new MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: DoubleSide }))
  const add = (geo: BufferGeometry, mat: Material, items: Item[]) => {
    track(geo)
    const m = instanced(geo, mat, items)
    root.add(m)
    return m
  }
  const box = () => shade(new BoxGeometry(1, 1, 1))

  // The field: a grass top over soil, running far off.
  const LEN = 170
  add(box(), plain, [
    { p: [0, -0.3, 9 - LEN / 2], s: [110, 0.6, LEN], color: GRASS },
    { p: [0, -2.6, 9 - LEN / 2], s: [110, 4, LEN], color: SOIL },
  ])
  // Lighter grass stripes, so the way the field runs shows.
  const stripes: Item[] = []
  for (let z = 6; z > -150; z -= 8) stripes.push({ p: [0, 0.01, z], s: [110, 0.04, 4], color: GRASS_HI })
  add(box(), plain, stripes)

  // The brick path, laid in tiles that follow the bends.
  const tiles: Item[] = []
  const r = rng(7)
  for (let z = 8; z > -110; z -= 1.25) {
    const dz = 0.1
    const ry = Math.atan2(pathX(z - dz) - pathX(z + dz), -2 * dz)
    const cx = pathX(z)
    for (let k = -1.5; k <= 1.5; k += 1) {
      tiles.push({
        p: [cx + k * Math.cos(ry), 0.1, z - k * Math.sin(ry)],
        s: [0.97, 0.22, 1.2],
        ry,
        color: BRICK[Math.floor(r() * BRICK.length)],
      })
    }
  }
  add(box(), bricks, tiles)

  // Green pipes of three heights, each a body with a wider rim, beside the path.
  // Beside the path and out in the other gutter, [x, z, height].
  const pipeSpots: [x: number, z: number, h: number][] = [
    [pathX(-5) + 3.9, -5, 2.4], [pathX(-12) - 3.9, -12, 3.4], [pathX(-20) + 3.9, -20, 3.4], [pathX(-28) - 3.9, -28, 4.4],
    [pathX(-37) + 3.9, -37, 2.4], [pathX(-48) - 3.9, -48, 3.4], [pathX(-58) + 3.9, -58, 4.4], [pathX(-68) - 3.9, -68, 2.4],
    [across(0.78, -10), -10, 3.4], [across(0.72, -26), -26, 2.4], [across(0.8, -42), -42, 4.4], [across(0.7, -60), -60, 3.4],
  ]
  const bodies: Item[] = []
  const rims: Item[] = []
  pipeSpots.forEach(([x, z, h], i) => {
    const color = PIPE[i % PIPE.length]
    bodies.push({ p: [x, (h - 0.55) / 2, z], s: [1, h - 0.55, 1], color })
    rims.push({ p: [x, h - 0.275, z], s: [1, 0.55, 1], color: '#56b95a' })
  })
  add(shade(new CylinderGeometry(0.78, 0.78, 1, 20)), plain, bodies)
  add(shade(new CylinderGeometry(0.98, 0.98, 1, 20)), plain, rims)

  // Floating brick blocks, in short rows.
  const blocks: Item[] = []
  const row = (x: number, z: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) blocks.push({ p: [x + i * 1.35, y, z], s: [1.3, 1.3, 1.3], color: BRICK[(i + n) % BRICK.length] })
  }
  row(pathX(-14) - 2.7, -14, 6.2, 4)
  row(pathX(-26) - 1.4, -26, 7, 3)
  row(pathX(-36) - 3.4, -36, 5.8, 5)
  row(pathX(-50) + 1, -50, 6.8, 3)
  row(pathX(-64) - 2, -64, 6, 4)
  row(across(0.62, -18), -18, 5.6, 3)
  row(across(0.7, -34), -34, 6.6, 4)
  row(across(-0.5, -8), -8, 5.2, 2)
  add(box(), bricks, blocks)

  // Round low-poly hills, paler the further they are.
  const hills: Item[] = []
  const hr = rng(21)
  for (let i = 0; i < 18; i++) {
    const z = -22 - i * 6.5 - hr() * 4
    const side = i % 2 ? 1 : -1
    const x = side * (12 + hr() * 30)
    const far = Math.min(1, (-z - 20) / 100)
    const w = 6 + hr() * 7
    hills.push({
      p: [x, -1.2, z],
      s: [w, 2.5 + hr() * 5 + far * 3, w * 0.9],
      color: new Color(HILL_NEAR).lerp(new Color(HILL_FAR), far).getStyle(),
    })
  }
  // Two wide ones right behind the flag.
  hills.push({ p: [-9, -1.4, -96], s: [14, 8, 11], color: HILL_FAR })
  hills.push({ p: [11, -1.4, -102], s: [16, 10, 12], color: HILL_FAR })
  const hillGeo = new SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)
  const flatHill = hillGeo.toNonIndexed()
  hillGeo.dispose()
  flatHill.computeVertexNormals()
  add(shade(flatHill), plain, hills)

  // Puffy clouds: a few overlapping blocks, merged into one shape.
  const puff = (w: number, h: number, d: number, x: number, y: number, z: number) => new BoxGeometry(w, h, d).translate(x, y, z)
  const cloudGeo = soften(shade(mergeGeometries([puff(4, 1.1, 2.2, 0, 0, 0), puff(2.6, 1.3, 1.8, -0.7, 0.95, 0), puff(2.2, 1.5, 1.7, 1.0, 0.95, 0.1), puff(1.5, 1, 1.4, 1.9, 0.1, 0.2)]) as BufferGeometry))
  const cr = rng(3)
  const clouds: Item[] = []
  for (let i = 0; i < 10; i++) {
    const near = i < 4
    const depth = near ? 35 + cr() * 25 : 70 + cr() * 60
    const s = near ? 0.7 + cr() * 0.4 : 1.2 + cr() * 1.0
    const elev = (near ? 3 + cr() * 2.5 : 1.2 + cr() * 3.5) * (Math.PI / 180)
    clouds.push({ p: [-80 + (i / 10) * 160 + cr() * 10, v.camY + depth * Math.tan(elev), v.camZ - depth], s: [s, s, s], color: CLOUD })
  }
  const cloudMesh = add(cloudGeo, plain, clouds)

  // The flagpole, far down the path: a block base, a pole, a gold ball and a pennant.
  const fz = -84
  const fx = pathX(fz)
  add(box(), bricks, [{ p: [fx, 0.7, fz], s: [2.4, 1.4, 2.4], color: BRICK[2] }])
  add(shade(new CylinderGeometry(0.16, 0.16, 1, 8)), plain, [{ p: [fx, 8.3, fz], s: [1, 14.6, 1], color: '#e8f0e4' }])
  add(shade(new SphereGeometry(0.42, 10, 8)), plain, [{ p: [fx, 15.8, fz], color: '#f2c94c' }])
  const pennant = new BufferGeometry()
  pennant.setAttribute('position', new Float32BufferAttribute([0, 0, 0, -3.6, -1.1, 0, 0, -2.2, 0], 3))
  pennant.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  shade(pennant)
  add(pennant, flat, [{ p: [fx - 0.16, 15.1, fz], s: [1, 1, 1], color: FLAG }])

  // Slow drift: the clouds slide sideways and wrap round. Still stays still.
  const m = new Matrix4()
  const pos = new Vector3()
  const q = new Quaternion()
  const sc = new Vector3()
  const drift = (dt: number) => {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]
      c.p[0] += dt * (0.25 + (i % 3) * 0.08)
      if (c.p[0] > 80) c.p[0] -= 160
      cloudMesh.getMatrixAt(i, m)
      m.decompose(pos, q, sc)
      pos.x = c.p[0]
      m.compose(pos, q, sc)
      cloudMesh.setMatrixAt(i, m)
    }
    cloudMesh.instanceMatrix.needsUpdate = true
  }
  const meshes: Mesh[] = []
  root.traverse(o => (o as Mesh).isMesh && meshes.push(o as Mesh))
  return { root, drift: still ? null : drift, dispose: () => toDispose.forEach(o => o.dispose()), triangles: meshes.reduce((t, mesh) => t + ((mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3) * ((mesh as InstancedMesh).count ?? 1), 0), draws: meshes.length }
}

/** The 3D level behind the DSi. `still` freezes its drift (reduced motion). */
export default function Level3D({ still }: { still: boolean }) {
  const { scene, camera } = useThree()
  const aspect = useThree(st => st.size.width / Math.max(1, st.size.height))
  // The scene fits the camera to the DSi after this renders, so the first frame's
  // distance is read back, and the level is laid out again if it moved.
  const [camD, setCamD] = useState(0)
  const view = useMemo(() => {
    const dir = new Vector3(0, Math.sin(CAMERA_ELEVATION), Math.cos(CAMERA_ELEVATION))
    const tilt = -(CAMERA_ELEVATION - GAZE)
    const up = new Vector3(0, Math.cos(tilt), Math.sin(tilt))
    const fwd = new Vector3(0, -Math.sin(tilt), Math.cos(tilt))
    const origin = up.clone().multiplyScalar(-GAP).addScaledVector(dir, -PUSH)
    const d = camD || 8
    const rel = dir.clone().multiplyScalar(d).sub(origin)
    const v: View = {
      camY: rel.dot(up) / SCALE,
      camZ: rel.dot(fwd) / SCALE,
      tanH: Math.tan((30 * Math.PI) / 360) * aspect,
      wide: Math.max(0, Math.min(1, (aspect - 0.9) / 0.5)),
    }
    return { tilt, origin, v }
  }, [aspect, camD])
  const level = useMemo(() => build(still, view.v), [still, view])
  // The sky is the scene's background; the fog fades the far ground into it.
  useEffect(() => {
    const sky = skyTexture()
    const prevBg = scene.background
    const prevFog = scene.fog
    scene.background = sky
    scene.fog = new Fog(SKY_HORIZON, 14, 95)
    ;(window as unknown as { __dsiLab?: Record<string, unknown> }).__dsiLab = {
      ...(window as unknown as { __dsiLab?: Record<string, unknown> }).__dsiLab,
      levelStats: () => ({ draws: level.draws, triangles: level.triangles }),
    }
    return () => {
      scene.background = prevBg
      scene.fog = prevFog
      sky.dispose()
    }
  }, [scene, level])
  useEffect(() => () => level.dispose(), [level])

  useFrame((_, dt) => {
    const d = camera.position.length()
    if (Math.abs(d - camD) > 0.05) setCamD(d)
    level.drift?.(Math.min(dt, 0.1))
  })

  return (
    <group position={view.origin} rotation={[view.tilt, 0, 0]} scale={SCALE}>
      <primitive object={level.root} />
    </group>
  )
}
