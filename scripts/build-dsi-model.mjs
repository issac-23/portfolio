// Builds public/models/dsi.glb from the Sketchfab "DSi" model (CC BY 4.0, see
// public/models/CREDITS.md). The source is treated as data only: it is read,
// never executed, and the 29 MB original is not copied into the repo.
//
//   node scripts/build-dsi-model.mjs [path/to/scene.gltf] [out.glb]
//
// What it does to the source:
//   - bakes every node transform into the vertices so the scene is flat
//   - finds the hinge axis by fitting a circle to the hinge barrel's cross
//     section along the device width
//   - groups the lid parts under a node `Lid` whose origin sits on that axis,
//     and everything else under `Base`; the hinge axis and the closed angle
//     are written to Lid.extras so the page does not need to guess
//   - drops the original animation, simplifies, shrinks textures, and
//     meshopt-compresses
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { mkdirSync, statSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer'
import sharp from 'sharp'

const SRC = resolve(process.argv[2] ?? join(homedir(), 'Downloads', 'dsi-model', 'scene.gltf'))
const OUT = resolve(process.argv[3] ?? join(import.meta.dirname, '..', 'public', 'models', 'dsi.glb'))
const TARGET_TRIS = 40000

// ---- small vector helpers -------------------------------------------------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const len = a => Math.hypot(a[0], a[1], a[2])
const unit = a => a.map(x => x / len(a))
const fmt = a => '(' + a.map(x => (x * 1000).toFixed(2)).join(', ') + ') mm'

function apply(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ]
}
function applyDir(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
  ]
}
const det3 = m =>
  m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2])

// ---- load ----------------------------------------------------------------
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder })
const doc = await io.read(SRC)
const root = doc.getRoot()
doc.getRoot().listAnimations().forEach(a => a.dispose())

const meshNodes = root.listNodes().filter(n => n.getMesh())
const ancestors = n => {
  const out = []
  for (let p = n.getParentNode(); p; p = p.getParentNode()) out.push(p)
  return out
}

// Bake world transforms into vertex data (positions, normals, tangents).
for (const node of meshNodes) {
  const W = node.getWorldMatrix()
  const flip = det3(W) < 0
  for (const prim of node.getMesh().listPrimitives()) {
    const pos = prim.getAttribute('POSITION')
    const nor = prim.getAttribute('NORMAL')
    const tan = prim.getAttribute('TANGENT')
    const v = [0, 0, 0]
    const t4 = [0, 0, 0, 0]
    for (let i = 0; i < pos.getCount(); i++) {
      pos.setElement(i, apply(W, pos.getElement(i, v)))
      if (nor) nor.setElement(i, unit(applyDir(W, nor.getElement(i, [0, 0, 0]))).map(x => (flip ? -x : x)))
      if (tan) {
        tan.getElement(i, t4)
        const d = unit(applyDir(W, t4))
        tan.setElement(i, [d[0], d[1], d[2], flip ? -t4[3] : t4[3]])
      }
    }
    if (flip) {
      const idx = prim.getIndices()
      const a = idx.getArray()
      for (let i = 0; i < a.length; i += 3) [a[i + 1], a[i + 2]] = [a[i + 2], a[i + 1]]
      idx.setArray(a)
    }
  }
}

// Classify: lid = everything under the top-level `Lock` group plus the top
// screen. Everything else is base.
const isLid = node => ancestors(node).some(a => a.getName() === 'Lock') || /^Plast_uppe/.test(node.getName())
const groupOf = node => (isLid(node) ? 'Lid' : 'Base')
const byName = re => meshNodes.find(n => re.test(n.getName()))

function worldVerts(node) {
  const pos = node.getMesh().listPrimitives()[0].getAttribute('POSITION')
  const out = []
  for (let i = 0; i < pos.getCount(); i++) out.push(pos.getElement(i, [0, 0, 0]))
  return out
}

// ---- hinge axis ------------------------------------------------------------
// The hinge barrel ("Arm") is a cylinder along the device width (roughly X).
// Fit a circle to its YZ cross-section in slices along X, then a line through
// the slice centres.
function fitCircle(pts) {
  // Algebraic (Kasa) fit: y^2+z^2 = 2ay + 2bz + c
  const solve = P => {
    let S = [0, 0, 0, 0, 0, 0], r = [0, 0, 0]
    for (const [y, z] of P) {
      const f = y * y + z * z
      S[0] += y * y; S[1] += y * z; S[2] += y; S[3] += z * z; S[4] += z; S[5] += 1
      r[0] += y * f; r[1] += z * f; r[2] += f
    }
    const A = [[2 * S[0], 2 * S[1], S[2]], [2 * S[1], 2 * S[3], S[4]], [2 * S[2], 2 * S[4], S[5]]]
    const d = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    const D = d(A)
    const col = k => A.map((row, i) => row.map((x, j) => (j === k ? r[i] : x)))
    const a = d(col(0)) / D, b = d(col(1)) / D, c = d(col(2)) / D
    return { y: a, z: b, r: Math.sqrt(Math.max(c + a * a + b * b, 0)) }
  }
  let P = pts
  let c = solve(P)
  for (let it = 0; it < 6; it++) {
    const res = P.map(p => Math.abs(Math.hypot(p[0] - c.y, p[1] - c.z) - c.r))
    const sorted = [...res].sort((a, b) => a - b)
    const cut = sorted[Math.floor(sorted.length * 0.7)]
    P = P.filter((_, i) => res[i] <= cut)
    if (P.length < 12) break
    c = solve(P)
  }
  const rms = Math.sqrt(P.reduce((s, p) => s + (Math.hypot(p[0] - c.y, p[1] - c.z) - c.r) ** 2, 0) / P.length)
  return { ...c, rms, n: P.length }
}

const arm = meshNodes.find(n => n.getName() === 'Arm_Matte_plastic_0')
const armV = worldVerts(arm)
const xs = armV.map(v => v[0])
const xMin = Math.min(...xs), xMax = Math.max(...xs)
const slices = []
const SL = 14
for (let s = 0; s < SL; s++) {
  const x0 = xMin + ((xMax - xMin) * s) / SL, x1 = xMin + ((xMax - xMin) * (s + 1)) / SL
  const pts = armV.filter(v => v[0] >= x0 && v[0] < x1).map(v => [v[1], v[2]])
  if (pts.length < 40) continue
  const c = fitCircle(pts)
  slices.push({ x: (x0 + x1) / 2, ...c })
}
// Keep the slices whose fit agrees with the median radius (the barrel proper).
const med = a => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)]
const rMed = med(slices.map(s => s.r))
const good = slices.filter(s => Math.abs(s.r - rMed) < 0.15 * rMed && s.rms < 0.25 * rMed)
if (good.length < 4) throw new Error('hinge fit failed: only ' + good.length + ' consistent slices')
// Least-squares line: y(x), z(x)
function lin(ps) {
  const n = ps.length, sx = ps.reduce((s, p) => s + p[0], 0), sy = ps.reduce((s, p) => s + p[1], 0)
  const sxx = ps.reduce((s, p) => s + p[0] * p[0], 0), sxy = ps.reduce((s, p) => s + p[0] * p[1], 0)
  const m = (n * sxy - sx * sy) / (n * sxx - sx * sx)
  return [m, (sy - m * sx) / n]
}
const [my, by] = lin(good.map(s => [s.x, s.y]))
const [mz, bz] = lin(good.map(s => [s.x, s.z]))
const axis = unit([1, my, mz])
const xMid = (good[0].x + good[good.length - 1].x) / 2
const hinge = [xMid, my * xMid + by, mz * xMid + bz]
console.log(`hinge fit: ${good.length}/${slices.length} slices, barrel radius ${(rMed * 1000).toFixed(2)} mm`)

// ---- closed angle ---------------------------------------------------------
// Closed = the two screens face each other, i.e. the lid's screen normal ends
// up anti-parallel to the base's screen normal. Normals come from plane fits
// (smallest-variance direction) to the two screen protectors.
function planeNormal(verts) {
  const c = [0, 1, 2].map(k => verts.reduce((s, v) => s + v[k], 0) / verts.length)
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
  for (const v of verts) {
    const d = sub(v, c)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]
  }
  // Power iteration on (traceI - C) finds the smallest eigenvector of C.
  const tr = C[0][0] + C[1][1] + C[2][2]
  let n = unit([0.3, 0.5, 0.8])
  for (let it = 0; it < 200; it++) {
    const m = [0, 1, 2].map(i => tr * n[i] - (C[i][0] * n[0] + C[i][1] * n[1] + C[i][2] * n[2]))
    n = unit(m)
  }
  return { c, n }
}
const centroid = verts => [0, 1, 2].map(k => verts.reduce((s, v) => s + v[k], 0) / verts.length)
const lidShell = byName(/^Lock_Matte/)
const baseShell = byName(/^Main_Matte/)
const plateTop = planeNormal(worldVerts(byName(/^Plast_uppe/)))
const plateBot = planeNormal(worldVerts(byName(/^Plast_nere/)))
// Orient normals to face out of their own body.
if (dot(plateTop.n, sub(plateTop.c, centroid(worldVerts(lidShell)))) < 0) plateTop.n = plateTop.n.map(x => -x)
if (dot(plateBot.n, sub(plateBot.c, centroid(worldVerts(baseShell)))) < 0) plateBot.n = plateBot.n.map(x => -x)
// Where each screen sits, as a frame the page can hang live content on:
// `right` runs along the hinge, `up` across the screen, `normal` out of it.
// `center` is on the outer face of the screen protector.
function screenFrame(verts, normal, shift = [0, 0, 0]) {
  const right = unit(perpTo(axis, normal))
  const up = cross(normal, right)
  const pr = verts.map(v => dot(v, right)), pu = verts.map(v => dot(v, up)), pn = verts.map(v => dot(v, normal))
  const mid = a => (Math.min(...a) + Math.max(...a)) / 2
  const center = [0, 1, 2].map(k => right[k] * mid(pr) + up[k] * mid(pu) + normal[k] * Math.max(...pn) - shift[k])
  return { center, right, up, normal, width: Math.max(...pr) - Math.min(...pr), height: Math.max(...pu) - Math.min(...pu) }
}
function perpTo(v, n) {
  const k = dot(v, n)
  return v.map((x, i) => x - k * n[i])
}
// Signed angle about `axis` taking the lid normal onto the opposite of the base normal.
const target = plateBot.n.map(x => -x)
const perp = v => { const k = dot(v, axis); return v.map((x, i) => x - k * axis[i]) }
const a0 = perp(plateTop.n), a1 = perp(target)
const closeAngle = Math.atan2(dot(axis, cross(a0, a1)), dot(a0, a1))
console.log(`screens: lid normal ${plateTop.n.map(x => x.toFixed(3))}, base normal ${plateBot.n.map(x => x.toFixed(3))}`)

// ---- restructure -----------------------------------------------------------
const scene = root.listScenes()[0]
const oldTop = [...scene.listChildren()]
// The source is posed at a slant. Turn the whole device so the hinge axis is
// +X and the base's screen faces +Y, i.e. it sits flat on a table.
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]
const qRot = (q, v) => {
  const c = cross([q[0], q[1], q[2]], v)
  const d = cross([q[0], q[1], q[2]], c)
  return [0, 1, 2].map(i => v[i] + 2 * (q[3] * c[i] + d[i]))
}
const arc = (a, b) => {
  const c = cross(a, b)
  const w = 1 + dot(a, b)
  const l = Math.hypot(c[0], c[1], c[2], w)
  return [c[0] / l, c[1] / l, c[2] / l, w / l]
}
const qAxis = arc(axis, [1, 0, 0])
const nBase = qRot(qAxis, plateBot.n)
const pitch = Math.atan2(-nBase[2], nBase[1])
const qLevel = qMul([Math.sin(pitch / 2), 0, 0, Math.cos(pitch / 2)], qAxis)
const dsi = doc.createNode('DSi').setRotation(qLevel)
const base = doc.createNode('Base')
const lid = doc.createNode('Lid').setTranslation(hinge)
lid.setExtras({ hingeAxis: axis, closeAngle, screen: screenFrame(worldVerts(byName(/^Plast_uppe/)), plateTop.n, hinge) })
base.setExtras({ screen: screenFrame(worldVerts(byName(/^Plast_nere/)), plateBot.n) })
dsi.addChild(base).addChild(lid)

const names = new Set()
const cleanName = n => {
  const raw = n.getName()
  let name = /^Plast_uppe/.test(raw) ? 'ScreenTop' : /^Plast_nere/.test(raw) ? 'ScreenBottom' : raw.replace(/_(Matte_plastic|Buttons1|Shiny|Metal|Glass1|Game1|Skyddsplast)_0$/, '')
  let k = name, i = 2
  while (names.has(k)) k = name + i++
  names.add(k)
  return k
}
const tris = { Base: 0, Lid: 0 }
for (const node of meshNodes) {
  const g = groupOf(node)
  const name = cleanName(node)
  node.getMesh().setName(name)
  node.setName(name)
  node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1])
  const parent = node.getParentNode()
  if (parent) parent.removeChild(node)
  else scene.removeChild(node)
  if (g === 'Lid') {
    for (const prim of node.getMesh().listPrimitives()) {
      const pos = prim.getAttribute('POSITION')
      for (let i = 0; i < pos.getCount(); i++) pos.setElement(i, sub(pos.getElement(i, [0, 0, 0]), hinge))
    }
  }
  ;(g === 'Lid' ? lid : base).addChild(node)
  tris[g] += node.getMesh().listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0)
}
for (const n of oldTop) scene.removeChild(n)
scene.addChild(dsi)
// Dispose the now-empty source hierarchy.
for (const n of root.listNodes()) if (!n.getMesh() && n !== dsi && n !== base && n !== lid) n.dispose()
const trisBefore = { ...tris }

// ---- optimise ----------------------------------------------------------------
await MeshoptEncoder.ready
await MeshoptSimplifier.ready
const totalBefore = tris.Base + tris.Lid
await doc.transform(
  dedup(),
  weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: TARGET_TRIS / totalBefore, error: 0.02 }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024] }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
)

const after = { Base: 0, Lid: 0 }
for (const node of root.listNodes()) {
  if (!node.getMesh()) continue
  const g = ancestors(node).some(a => a.getName() === 'Lid') ? 'Lid' : 'Base'
  after[g] += node.getMesh().listPrimitives().reduce((s, p) => s + p.getIndices().getCount() / 3, 0)
}

mkdirSync(dirname(OUT), { recursive: true })
await io.write(OUT, doc)

console.log('\nHinge axis')
console.log('  point     ', fmt(hinge), '(model metres, before the Lid origin move)')
console.log('  direction ', axis.map(x => x.toFixed(4)).join(', '))
console.log('  close angle', ((closeAngle * 180) / Math.PI).toFixed(1), 'deg (rotate Lid about the axis by this to close)')
console.log('Triangles   Base', trisBefore.Base, '->', after.Base, '   Lid', trisBefore.Lid, '->', after.Lid, '   total ->', after.Base + after.Lid)
console.log('Output      ', OUT, (statSync(OUT).size / 1024 / 1024).toFixed(2), 'MB')
