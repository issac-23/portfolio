/**
 * Pre-resizes gallery originals and prints intrinsic dimensions.
 *
 * Phone photos land at 4032x3024 with EXIF orientation; Next/sharp resolves the
 * rotation at request time, but shipping 4000px sources means every cold cache
 * pays for a large transform. This bakes the rotation in, caps the long edge,
 * and strips metadata.
 *
 * Originals are moved to public/photos/gallery/_originals (gitignored) rather
 * than overwritten, so nothing is destroyed.
 */
import sharp from 'sharp'
import { readdir, mkdir, stat, readFile, unlink, writeFile, access } from 'node:fs/promises'
import path from 'node:path'

const DIR = 'public/photos/gallery'
const BACKUP = path.join(DIR, '_originals')
const MAX_EDGE = 2400
const QUALITY = 82

await mkdir(BACKUP, { recursive: true })

const files = (await readdir(DIR, { withFileTypes: true }))
  .filter((d) => d.isFile() && /\.(jpe?g|png)$/i.test(d.name))
  .map((d) => d.name)

const results = []
const skipped = []

const exists = (p) => access(p).then(() => true, () => false)

for (const name of files) {
  const src = path.join(DIR, name)

  // Already processed: a backup means DIR holds the optimized copy. Re-encoding
  // it would lose quality and clobber the true original in _originals.
  if (await exists(path.join(BACKUP, name))) {
    const meta = await sharp(await readFile(src)).metadata()
    skipped.push({ file: name, width: meta.width, height: meta.height })
    continue
  }

  const before = (await stat(src)).size

  // Read the bytes up front. Passing the path to sharp keeps a file handle
  // open, which makes the rename below fail with EBUSY on Windows.
  const original = await readFile(src)
  const input = sharp(original).rotate() // bake in EXIF orientation
  const meta = await input.metadata()
  // metadata() reports pre-rotation dimensions; resolve them ourselves
  const swapped = meta.orientation && meta.orientation >= 5
  const w0 = swapped ? meta.height : meta.width
  const h0 = swapped ? meta.width : meta.height

  const needsResize = Math.max(w0, h0) > MAX_EDGE
  const pipeline = input.resize({
    width: needsResize ? (w0 >= h0 ? MAX_EDGE : undefined) : undefined,
    height: needsResize ? (h0 > w0 ? MAX_EDGE : undefined) : undefined,
    withoutEnlargement: true,
  })

  const buf = await pipeline
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })

  // stash the original, then write the optimized file in its place
  await writeFile(path.join(BACKUP, name), original)
  await unlink(src)
  const outName = name.replace(/\.(jpe?g|png)$/i, '.jpg')
  await writeFile(path.join(DIR, outName), buf.data)

  results.push({
    file: outName,
    width: buf.info.width,
    height: buf.info.height,
    beforeKB: Math.round(before / 1024),
    afterKB: Math.round(buf.info.size / 1024),
  })
}

const totalBefore = results.reduce((a, r) => a + r.beforeKB, 0)
const totalAfter = results.reduce((a, r) => a + r.afterKB, 0)

for (const r of results) {
  console.log(`${r.file}  ${r.width}x${r.height}  ${r.beforeKB}KB -> ${r.afterKB}KB`)
}
if (results.length) {
  console.log(`\nTOTAL ${totalBefore}KB -> ${totalAfter}KB (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`)
} else {
  console.log('\nNothing new to optimize.')
}
if (skipped.length) {
  console.log(`\nAlready optimized (skipped): ${skipped.map((s) => s.file).join(', ')}`)
}

console.log('\nDimensions for data/gallery.ts:')
const all = [...results, ...skipped]
console.log(JSON.stringify(all.map((r) => ({ src: `/photos/gallery/${r.file}`, width: r.width, height: r.height })), null, 2))
