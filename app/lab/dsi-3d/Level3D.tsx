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
  Points,
  PointsMaterial,
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

// The home page's stage palette, in 3D: a day and a night one (the night values are the stage's :root.dark ones).
const DAY = {
  skyTop: '#3d98e4', skyMid: '#86caf6', skyHorizon: '#c4e8fb',
  grass: '#72b85a', grassHi: '#8ccc6c', soil: '#c9926a',
  brick: ['#d9996c', '#cf8e62', '#c98558', '#dba577'],
  pipe: ['#4aa84f', '#43a04b'], rim: '#56b95a',
  hillFar: '#b2d89a', hillNear: '#86c06f', cloud: '#fbfdff',
  flag: '#e0604f', pole: '#e8f0e4', ball: '#f2c94c',
}
const NIGHT: typeof DAY = {
  skyTop: '#070c1a', skyMid: '#0d1830', skyHorizon: '#1b2d52',
  grass: '#1b3f2c', grassHi: '#245036', soil: '#2f2420',
  brick: ['#4a362c', '#42302a', '#3d2c24', '#50392e'],
  pipe: ['#1f4a34', '#1b4330'], rim: '#2b5e43',
  hillFar: '#12303a', hillNear: '#143128', cloud: '#2d3a5a',
  flag: '#7a3d3a', pole: '#9aa6b8', ball: '#b89a3a',
}
const STAR = '#c8d3ea'
const MOON = '#e6dfbf'

/** A screen rectangle in NDC: x0, y0, x1, y1. */
type Rect = [number, number, number, number]
const overlaps = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
const within = (a: Rect, b: Rect) => a[0] >= b[0] && a[2] <= b[2] && a[1] >= b[1] && a[3] <= b[3]
const around = (x: number, y: number, w: number, h: number): Rect => [x - w, y - h, x + w, y + h]

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

const TANV = Math.tan((15 * Math.PI) / 180)
const SING = Math.sin(GAZE)
const COSG = Math.cos(GAZE)
/** Where the horizon is on screen (NDC y). */
const HORIZON = Math.tan(GAZE) / TANV

function skyTexture(dark: boolean) {
  const P = dark ? NIGHT : DAY
  const c = document.createElement('canvas')
  c.width = 2
  c.height = 256
  const x = c.getContext('2d')!
  const g = x.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, P.skyTop)
  g.addColorStop(0.13, P.skyMid)
  g.addColorStop(0.27, P.skyHorizon)
  g.addColorStop(1, P.skyHorizon)
  x.fillStyle = g
  x.fillRect(0, 0, 2, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

function build(still: boolean, v: View, dark: boolean) {
  const P = dark ? NIGHT : DAY
  const root = new Group()
  // A point at this fraction of the screen's half-width (-1 left, 1 right), at depth z down the level.
  const across = (f: number, z: number) => f * v.tanH * (v.camZ - z)
  // A point at screen position (nx, ny) in NDC, t units out along the view, and back again.
  const screenAt = (nx: number, ny: number, t: number): [number, number, number] => [
    nx * v.tanH * t,
    v.camY + t * (ny * TANV * COSG - SING),
    v.camZ - t * (ny * TANV * SING + COSG),
  ]
  const toScreen = (p: [number, number, number]) => {
    const dy = p[1] - v.camY
    const dz = p[2] - v.camZ
    const t = -dy * SING - dz * COSG
    return { x: p[0] / (t * v.tanH), y: (dy * COSG - dz * SING) / (t * TANV), t }
  }
  // Where the open DSi covers the screen (NDC): the lid over the base, fitted the way DsiScene fits it.
  const A = v.tanH / TANV
  const halfX0 = (1.17 * 0.9) / A
  const halfX = Math.min(0.97, halfX0)
  const halfY = halfX0 > 0.97 ? (0.97 * A) / 1.17 : 0.9
  const deviceRects = (mx: number, my: number): Rect[] => [
    [-0.83 * halfX - mx, -0.04 - my, 0.83 * halfX + mx, halfY + my],
    [-halfX - mx, -halfY - my, halfX + mx, -0.04 + my],
  ]
  // The path hugs the right gutter of a wide window, so it stays in view beside the DSi
  // and recedes to the horizon; on a tall one it runs up the middle and bends right at the far end.
  const FZ = -125
  const f0 = v.wide * 0.95
  const f1 = v.wide * 0.66 + (1 - v.wide) * 0.5
  const pathX = (z: number) => across(f0 + (f1 - f0) * smooth(-z / -FZ), z) + (1.6 - 0.7 * v.wide) * Math.sin(z * 0.11)
  // The flag: on a wide window it stands on the ground at the road's end; on a tall one, where
  // the DSi hides everything near the horizon, it stands on a far hill that rises into the sky above it.
  const flagDepth = v.camZ - FZ
  const flagBase = (1 - v.wide) * (v.camY + flagDepth * Math.tan((1.1 * Math.PI) / 180))
  const poleH = v.wide > 0.5 ? 14.6 : 8
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
    { p: [0, -0.3, 9 - LEN / 2], s: [110, 0.6, LEN], color: P.grass },
    { p: [0, -2.6, 9 - LEN / 2], s: [110, 4, LEN], color: P.soil },
  ])
  // Lighter grass stripes, so the way the field runs shows.
  const stripes: Item[] = []
  for (let z = 6; z > -150; z -= 8) stripes.push({ p: [0, 0.01, z], s: [110, 0.04, 4], color: P.grassHi })
  add(box(), plain, stripes)

  // The brick path, laid in tiles that follow the bends.
  const tiles: Item[] = []
  const r = rng(7)
  for (let z = 8; z > FZ - 4; z -= 1.25) {
    const dz = 0.1
    const ry = Math.atan2(pathX(z - dz) - pathX(z + dz), -2 * dz)
    const cx = pathX(z)
    for (let k = -1.5; k <= 1.5; k += 1) {
      tiles.push({
        p: [cx + k * Math.cos(ry), 0.1, z - k * Math.sin(ry)],
        s: [0.97, 0.22, 1.2],
        ry,
        color: P.brick[Math.floor(r() * P.brick.length)],
      })
    }
  }
  add(box(), bricks, tiles)

  // Green pipes of three heights, each a body with a wider rim, beside the path.
  // Beside the path and out in the other gutter, [x, z, height].
  const pipeSpots: [x: number, z: number, h: number][] = [
    [pathX(-5) + 3.9, -5, 2.4], [pathX(-12) - 3.9, -12, 3.4], [pathX(-20) + 3.9, -20, 3.4], [pathX(-28) - 3.9, -28, 4.4],
    [pathX(-37) + 3.9, -37, 2.4], [pathX(-48) - 3.9, -48, 3.4], [pathX(-58) + 3.9, -58, 4.4], [pathX(-68) - 3.9, -68, 2.4],
    [across(-0.8, -10), -10, 3.4], [across(-0.78, -26), -26, 2.4], [across(-0.8, -42), -42, 4.4], [across(-0.72, -60), -60, 3.4],
  ]
  const bodies: Item[] = []
  const rims: Item[] = []
  pipeSpots.forEach(([x, z, h], i) => {
    const color = P.pipe[i % P.pipe.length]
    bodies.push({ p: [x, (h - 0.55) / 2, z], s: [1, h - 0.55, 1], color })
    rims.push({ p: [x, h - 0.275, z], s: [1, 0.55, 1], color: P.rim })
  })
  add(shade(new CylinderGeometry(0.78, 0.78, 1, 20)), plain, bodies)
  add(shade(new CylinderGeometry(0.98, 0.98, 1, 20)), plain, rims)

  // Floating brick blocks, in short rows.
  const blocks: Item[] = []
  // The path's last stretch and the flag, on screen: nothing else goes there.
  const flagTop = toScreen([pathX(FZ), flagBase + poleH + 2, FZ])
  const roadNearEnd = toScreen([pathX(-80), 0, -80])
  const roadEnd = toScreen([pathX(FZ), flagBase, FZ])
  const endBox: Rect = [
    Math.min(roadNearEnd.x, roadEnd.x, flagTop.x) - 0.12,
    Math.min(roadEnd.y, roadNearEnd.y) - 0.08,
    Math.max(roadNearEnd.x, roadEnd.x, flagTop.x) + 0.2,
    flagTop.y + 0.08,
  ]
  // Rows of blocks are kept only where they are whole on screen, do not overlap one another and
  // leave the path's end clear; on a wide window that leaves one or two on the right.
  const rowBoxes: Rect[] = []
  const row = (cx: number, z: number, y: number, n: number) => {
    const c = toScreen([cx, y, z])
    const box = around(c.x, c.y, ((n * 1.35) / 2 + 0.2) / (c.t * v.tanH), 0.9 / (c.t * TANV))
    const edgeOk = Math.max(Math.abs(box[0]), Math.abs(box[2])) < 0.97 || Math.min(Math.abs(box[0]), Math.abs(box[2])) > 1.03
    if (!edgeOk || overlaps(box, endBox) || rowBoxes.some(b => overlaps(b, around(c.x, c.y, (box[2] - box[0]) / 2 + 0.04, (box[3] - box[1]) / 2 + 0.04)))) return
    rowBoxes.push(box)
    for (let i = 0; i < n; i++) blocks.push({ p: [cx + (i - (n - 1) / 2) * 1.35, y, z], s: [1.3, 1.3, 1.3], color: P.brick[(i + n) % P.brick.length] })
  }
  row(pathX(-14), -14, 6.2, 4)
  row(pathX(-36), -36, 5.8, 3)
  row(pathX(-26), -26, 7, 3)
  row(pathX(-50), -50, 6.8, 3)
  row(pathX(-64), -64, 6, 4)
  row(across(-0.82, -18), -18, 5.6, 3)
  row(across(-0.84, -34), -34, 6.6, 4)
  row(across(-0.86, -8), -8, 5.2, 2)
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
    if (Math.abs(x - pathX(z)) < w + 8) continue
    hills.push({
      p: [x, -1.2, z],
      s: [w, 2.5 + hr() * 5 + far * 3, w * 0.9],
      color: new Color(P.hillNear).lerp(new Color(P.hillFar), far).getStyle(),
    })
  }
  // On a tall window the flag stands on a far hill of its own.
  if (flagBase > 0) hills.push({ p: [pathX(FZ), -1.4, FZ], s: [flagBase * 2.6, flagBase + 1.4, flagBase * 2.2], color: P.hillFar })
  const hillGeo = new SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2)
  const flatHill = hillGeo.toNonIndexed()
  hillGeo.dispose()
  flatHill.computeVertexNormals()
  add(shade(flatHill), plain, hills)

  // Puffy clouds: a handful of overlapping round puffs, merged into one shape.
  const puff = (sx: number, sy: number, sz: number, x: number, y: number, z: number) => new SphereGeometry(1, 9, 6).scale(sx, sy, sz).translate(x, y, z)
  const cloudGeo = soften(shade(mergeGeometries([puff(2.0, 0.8, 1.1, 0, 0, 0), puff(1.3, 0.95, 1, -0.9, 0.55, 0), puff(1.4, 1.1, 1.1, 0.8, 0.6, 0.1), puff(0.9, 0.7, 0.8, 1.9, -0.05, 0.1), puff(0.9, 0.7, 0.8, -1.9, -0.05, 0.1)]) as BufferGeometry))
  const cloudMat = dark ? track(new MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.7, depthWrite: false })) : plain
  // The moon's place on screen; clouds keep clear of it, and of the frame's edges and the horizon.
  const moonAt = v.wide > 0.5 ? { x: 0.8, y: 0.72 } : { x: -0.6, y: 0.72 }
  // A cloud is fine where it is whole in the frame and either fully behind the device or clear of its
  // outline by a margin (4% of the view height); anywhere else it is shrunk away, so none grazes an edge.
  const inner = deviceRects(0, 0)
  const outer = deviceRects(0.08 / A, 0.08)
  const cloudClear = (nx: number, ny: number, w: number, h: number) => {
    const box = around(nx, ny, w, h)
    if (Math.max(Math.abs(box[0]), Math.abs(box[2])) > 0.95 && Math.min(Math.abs(box[0]), Math.abs(box[2])) < 1.05) return false
    if (box[3] > 0.95 && box[1] < 1.05) return false
    if (inner.some(r => within(box, r))) return true
    return !outer.some(r => overlaps(box, r))
  }
  const flagNdcX = pathX(FZ) / (flagDepth * v.tanH)
  const cr = rng(3)
  const clouds: Item[] = []
  for (let tries = 0; clouds.length < 9 && tries < 400; tries++) {
    const near = clouds.length < 3
    const t = near ? 35 + cr() * 25 : 70 + cr() * 60
    // No wider on screen than a fifth of the view, so a narrow window is not swamped.
    const s = Math.min(near ? 0.7 + cr() * 0.4 : 1.2 + cr() * 1.0, (0.2 * t * v.tanH) / 2.9)
    const nx = -1 + cr() * 2
    const ny = HORIZON + 0.08 + cr() * 0.26
    const w = (2.9 * s) / (t * v.tanH)
    const h = (1.5 * s) / (t * TANV)
    if (ny - h < HORIZON + 0.02 || Math.hypot(nx - moonAt.x, (ny - moonAt.y) * 0.9) < 0.3 + w || Math.hypot(nx - flagNdcX, (ny - (HORIZON + 0.2)) * 0.9) < 0.3 + w) continue
    if (!cloudClear(nx, ny, w, h)) continue
    clouds.push({ p: screenAt(nx, ny, t), s: [s, s, s], color: P.cloud })
  }
  const cloudMesh = add(cloudGeo, cloudMat, clouds)

  // The flagpole, far down the path: a block base, a pole, a gold ball and a pennant.
  const fz = FZ
  const fx = pathX(fz)
  add(box(), bricks, [{ p: [fx, flagBase + 0.7, fz], s: [2.4, 1.4, 2.4], color: P.brick[2] }])
  add(shade(new CylinderGeometry(0.16, 0.16, 1, 8)), plain, [{ p: [fx, flagBase + 1 + poleH / 2, fz], s: [1, poleH, 1], color: P.pole }])
  add(shade(new SphereGeometry(0.42, 10, 8)), plain, [{ p: [fx, flagBase + 1.2 + poleH, fz], color: P.ball }])
  const pennant = new BufferGeometry()
  pennant.setAttribute('position', new Float32BufferAttribute([0, 0, 0, -3.6, -1.1, 0, 0, -2.2, 0], 3))
  pennant.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3))
  shade(pennant)
  add(pennant, flat, [{ p: [fx - 0.16, flagBase + 0.5 + poleH, fz], s: [1, 1, 1], color: P.flag }])

  if (dark) {
    // Stars: one Points object scattered over the sky above the horizon, and a round moon.
    const sr = rng(11)
    const pts: number[] = []
    for (let i = 0; i < 220; i++) {
      const depth = 150
      const elev = (0.4 + sr() * 9) * (Math.PI / 180)
      pts.push(-170 + sr() * 340, v.camY + depth * Math.tan(elev), v.camZ - depth)
    }
    const sg = track(new BufferGeometry())
    sg.setAttribute('position', new Float32BufferAttribute(pts, 3))
    const stars = new Points(sg, track(new PointsMaterial({ color: STAR, size: 2, sizeAttenuation: false, fog: false, toneMapped: false })))
    stars.frustumCulled = false
    root.add(stars)
    const moon = new Mesh(track(new SphereGeometry(5.5, 16, 12)), track(new MeshBasicMaterial({ color: MOON, fog: false, toneMapped: false })))
    moon.position.set(...screenAt(moonAt.x, moonAt.y, 150))
    root.add(moon)
  }

  // Slow drift: the clouds slide sideways and wrap round. Still stays still.
  const m = new Matrix4()
  const q = new Quaternion()
  const pos = new Vector3()
  const sc = new Vector3()
  const grow = clouds.map(() => 1)
  const drift = (dt: number) => {
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]
      c.p[0] += dt * (0.25 + (i % 3) * 0.08)
      if (c.p[0] > 80) c.p[0] -= 160
      // Shrink away while crossing the device's outline or the frame's edge, grow back once clear.
      const sp = toScreen(c.p)
      const ok = cloudClear(sp.x, sp.y, (2.9 * (c.s as number[])[0]) / (sp.t * v.tanH), (1.5 * (c.s as number[])[0]) / (sp.t * TANV))
      grow[i] += ((ok ? 1 : 0) - grow[i]) * Math.min(1, dt * 3)
      const k = (c.s as number[])[0] * Math.max(grow[i], 0.001)
      m.compose(pos.set(c.p[0], c.p[1], c.p[2]), q, sc.set(k, k, k))
      cloudMesh.setMatrixAt(i, m)
    }
    cloudMesh.instanceMatrix.needsUpdate = true
  }
  const meshes: Mesh[] = []
  root.traverse(o => ((o as Mesh).isMesh || (o as Points).isPoints) && meshes.push(o as Mesh))
  return { root, clouds: clouds.map(c => c.p.map(n => Math.round(n))), drift: still ? null : drift, dispose: () => toDispose.forEach(o => o.dispose()), triangles: meshes.reduce((t, mesh) => t + ((mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3) * ((mesh as InstancedMesh).count ?? 1), 0), draws: meshes.length }
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
  // The site's theme is the `dark` class on <html>; follow it live.
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.classList.contains('dark'))
    read()
    const mo = new MutationObserver(read)
    mo.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  const level = useMemo(() => build(still, view.v, dark), [still, view, dark])
  // The sky is the scene's background; the fog fades the far ground into it.
  useEffect(() => {
    const sky = skyTexture(dark)
    const prevBg = scene.background
    const prevFog = scene.fog
    scene.background = sky
    scene.fog = new Fog((dark ? NIGHT : DAY).skyHorizon, 20, 140)
    ;(window as unknown as { __dsiLab?: Record<string, unknown> }).__dsiLab = {
      ...(window as unknown as { __dsiLab?: Record<string, unknown> }).__dsiLab,
      levelStats: () => ({ draws: level.draws, triangles: level.triangles, clouds: level.clouds }),
    }
    return () => {
      scene.background = prevBg
      scene.fog = prevFog
      sky.dispose()
    }
  }, [scene, level, dark])
  useEffect(() => () => level.dispose(), [level])

  useFrame((_, dt) => {
    const d = camera.position.length()
    if (Math.abs(d - camD) > 0.05) setCamD(d)
    level.drift?.(Math.min(dt, 0.1))
  })

  return (
    <group position={view.origin} rotation={[view.tilt, 0, 0]} scale={SCALE}>
      <primitive object={level.root} />
      {/* A cool light from behind keeps the black DSi's edges against the night. */}
      {dark && <directionalLight position={[0, 4, -8]} intensity={1.6} color="#7aa4ee" />}
    </group>
  )
}
