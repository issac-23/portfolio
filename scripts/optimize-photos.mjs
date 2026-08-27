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
import { readdir, mkdir, rename, stat } from 'node:fs/promises'
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

for (const name of files) {
  const src = path.join(DIR, name)
  const before = (await stat(src)).size

  const input = sharp(src).rotate() // bake in EXIF orientation
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
  await rename(src, path.join(BACKUP, name))
  const outName = name.replace(/\.(jpe?g|png)$/i, '.jpg')
  await sharp(buf.data).toFile(path.join(DIR, outName))

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
console.log(`\nTOTAL ${totalBefore}KB -> ${totalAfter}KB (${Math.round((1 - totalAfter / totalBefore) * 100)}% smaller)`)
console.log('\nDimensions for data/gallery.ts:')
console.log(JSON.stringify(results.map((r) => ({ src: `/photos/gallery/${r.file}`, width: r.width, height: r.height })), null, 2))
