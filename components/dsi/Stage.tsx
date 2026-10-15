/**
 * The stage behind the device: an 8-bit day level, or a night one in dark
 * mode. Sky in dsi.css, everything else here as small inline SVGs.
 *
 * Every piece is drawn in "pixels" of a few CSS px, on a grid, and repeated
 * as a pattern at its native size rather than stretched, so the pixels stay
 * square at every window size. Colours are classes, so the theme swap is
 * all in dsi.css. Decorative only: hidden from assistive tech, no pointer
 * events, nothing to tab to.
 */

type Rect = [x: number, y: number, w: number, h: number]

/** One path for a list of same-coloured pixel runs, which keeps the markup small. */
function pixels(list: Rect[], className: string) {
  return <path className={className} d={list.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join('')} />
}

/** A dome h rows tall and 2r wide at its foot, centred on cx, standing on base. */
function dome(cx: number, h: number, r: number, base: number): Rect[] {
  const out: Rect[] = []
  for (let j = 0; j < h; j++) {
    const d = (h - j - 0.5) / h
    const w = Math.max(1, Math.round(r * Math.sqrt(1 - d * d)))
    const last = out[out.length - 1]
    if (last && last[2] === 2 * w) last[3] += 1
    else out.push([cx - w, base - h + j, 2 * w, 1])
  }
  return out
}

/** Rows of a dome every `every` rows, inset a pixel, for the far hills' terraces. */
function terraces(cx: number, h: number, r: number, base: number, every: number): Rect[] {
  const out: Rect[] = []
  for (let j = every; j < h; j += every) {
    const d = (h - j - 0.5) / h
    const w = Math.round(r * Math.sqrt(1 - d * d)) - 1
    if (w > 1) out.push([cx - w, base - h + j, 2 * w, 1])
  }
  return out
}

/** A regular lattice of single pixels inside a dome, for the near hills. */
function speckle(cx: number, h: number, r: number, base: number): Rect[] {
  const out: Rect[] = []
  for (let j = 4; j < h; j += 3) {
    const d = (h - j - 0.5) / h
    const w = Math.round(r * Math.sqrt(1 - d * d)) - 2
    const shift = (j / 3) % 2 ? 2 : 0
    for (let x = cx - w + shift; x < cx + w; x += 4) out.push([x, base - h + j, 1, 1])
  }
  return out
}

// Two lumps over a flat underside, the bottom rows in shade.
const BIG_CLOUD: Rect[] = [
  [5, 0, 4, 1], [13, 0, 5, 1],
  [4, 1, 6, 1], [12, 1, 7, 1],
  [3, 2, 17, 1],
  [1, 3, 21, 1],
  [0, 4, 24, 2],
]
const BIG_CLOUD_SHADE: Rect[] = [[1, 6, 22, 1], [3, 7, 18, 1]]
const SMALL_CLOUD: Rect[] = [[4, 0, 5, 1], [2, 1, 9, 1], [1, 2, 12, 1], [0, 3, 14, 1]]
const SMALL_CLOUD_SHADE: Rect[] = [[1, 4, 12, 1]]

function cloud(big: boolean, x: number, y: number, key: string) {
  return (
    <g key={key} transform={`translate(${x} ${y})`}>
      {pixels(big ? BIG_CLOUD : SMALL_CLOUD, 'dsi-px-cloud')}
      {pixels(big ? BIG_CLOUD_SHADE : SMALL_CLOUD_SHADE, 'dsi-px-cloud-shade')}
    </g>
  )
}

// 240 x 56 pixels of sky, 1440px across at 6px a pixel. The strip drifts by
// exactly one of these, so the loop has no seam.
const CLOUDS: [big: boolean, x: number, y: number][] = [
  [true, 10, 3],
  [false, 64, 11],
  [true, 118, 27],
  [false, 176, 5],
  [false, 150, 46],
  [true, 204, 38],
]

const FAR: [cx: number, h: number, r: number][] = [[28, 34, 22], [74, 22, 16]]
const NEAR: [cx: number, h: number, r: number][] = [[18, 16, 18], [54, 11, 14]]

// Grass with a ragged edge over two courses of soil brick, 16 x 10 pixels.
const GRASS_TUFT: Rect[] = [[1, 0, 2, 1], [6, 0, 1, 1], [9, 0, 2, 1], [13, 0, 1, 1]]
const GRASS: Rect[] = [[0, 1, 16, 2]]
const GRASS_EDGE: Rect[] = [[0, 3, 1, 1], [3, 3, 2, 1], [7, 3, 1, 1], [11, 3, 2, 1], [15, 3, 1, 1]]
const MORTAR: Rect[] = [[0, 6, 16, 1], [8, 3, 1, 3], [4, 7, 1, 3], [12, 7, 1, 3]]
const SOIL_HI: Rect[] = [[1, 4, 2, 1], [9, 4, 2, 1], [5, 7, 2, 1], [13, 7, 2, 1]]

// A plain brick block, 10 x 10 pixels: three courses inside an outline,
// the joints staggered, each brick lit along its top.
const BLOCK_EDGE: Rect[] = [[0, 0, 10, 1], [0, 9, 10, 1], [0, 1, 1, 8], [9, 1, 1, 8]]
const BLOCK_MORTAR: Rect[] = [[1, 3, 8, 1], [1, 6, 8, 1], [5, 1, 1, 2], [3, 4, 1, 2], [7, 4, 1, 2], [5, 7, 1, 2]]
const BLOCK_HI: Rect[] = [[1, 1, 3, 1], [6, 1, 2, 1], [1, 4, 1, 1], [4, 4, 2, 1], [8, 4, 1, 1], [1, 7, 3, 1], [6, 7, 2, 1]]

function Blocks({ count, className }: { count: number; className: string }) {
  return (
    <svg className={`dsi-blocks ${className}`} width={60 * count} height={60} shapeRendering="crispEdges">
      <g transform="scale(6)">
        {Array.from({ length: count }, (_, i) => (
          <g key={i} transform={`translate(${10 * i} 0)`}>
            <rect className="dsi-px-soil" x={1} y={1} width={8} height={8} />
            {pixels(BLOCK_MORTAR, 'dsi-px-mortar')}
            {pixels(BLOCK_HI, 'dsi-px-soil-hi')}
            {pixels(BLOCK_EDGE, 'dsi-px-block-edge')}
          </g>
        ))}
      </g>
    </svg>
  )
}

/** A crescent 2r pixels across: a disc with a smaller one bitten out of its upper right. */
function crescent(r: number): Rect[] {
  const out: Rect[] = []
  const [bx, by, br] = [r * 1.5, r * 0.55, r * 0.85]
  for (let y = 0; y < 2 * r; y++) {
    const cy = y + 0.5
    for (let x = 0; x < 2 * r; x++) {
      const cx = x + 0.5
      const inDisc = (cx - r) ** 2 + (cy - r) ** 2 <= r * r
      const inBite = (cx - bx) ** 2 + (cy - by) ** 2 <= br * br
      if (!inDisc || inBite) continue
      const last = out[out.length - 1]
      if (last && last[1] === y && last[0] + last[2] === x) last[2] += 1
      else out.push([x, y, 1, 1])
    }
  }
  return out
}
const MOON = crescent(7)
const MOON_SHADE: Rect[] = [[2, 6, 1, 2], [4, 10, 2, 1], [6, 11, 1, 1]]

// Stars scattered over 160 x 120 pixels of night, at 3px a pixel: a tile
// big enough that the repeat is hard to spot. A fixed seed, so the server
// draws the same sky every time.
function scatter(count: number, seed: number): [x: number, y: number][] {
  let n = seed
  const next = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
  return Array.from({ length: count }, () => [Math.floor(next() * 156) + 2, Math.floor(next() * 116) + 2])
}
const STARS: Rect[] = scatter(22, 7).map(([x, y]) => [x, y, 1, 1])
const TWINKLES = scatter(5, 41)

export default function Stage() {
  return (
    <div className="dsi-scene" aria-hidden="true">
      <svg className="dsi-stars" width="100%" height="100%" shapeRendering="crispEdges">
        <defs>
          <pattern id="dsi-pat-stars" width={160} height={120} patternUnits="userSpaceOnUse" patternTransform="scale(3)">
            {pixels(STARS, 'dsi-px-star-dim')}
            {pixels(TWINKLES.flatMap(([x, y]): Rect[] => [[x - 1, y, 3, 1], [x, y - 1, 1, 3]]), 'dsi-px-star')}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dsi-pat-stars)" />
      </svg>

      <svg className="dsi-moon" width={70} height={70} shapeRendering="crispEdges">
        <g transform="scale(5)">
          {pixels(MOON, 'dsi-px-moon')}
          {pixels(MOON_SHADE, 'dsi-px-moon-shade')}
        </g>
      </svg>

      <svg className="dsi-clouds" height={336} shapeRendering="crispEdges">
        <defs>
          <pattern id="dsi-pat-clouds" width={240} height={56} patternUnits="userSpaceOnUse" patternTransform="scale(6)">
            {CLOUDS.map(([big, x, y]) => cloud(big, x, y, `${x}-${y}`))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dsi-pat-clouds)" />
      </svg>

      <Blocks count={3} className="dsi-blocks-l" />
      <Blocks count={2} className="dsi-blocks-r" />
      <Blocks count={1} className="dsi-blocks-r2" />

      {/* Far hills 216px tall, near hills over their foot, then the ground. */}
      <svg className="dsi-land" width="100%" height={264} shapeRendering="crispEdges">
        <defs>
          <pattern id="dsi-pat-far" width={100} height={36} patternUnits="userSpaceOnUse" patternTransform="scale(6)">
            {pixels(FAR.flatMap(([cx, h, r]) => dome(cx, h, r, 36)), 'dsi-px-far')}
            {pixels(FAR.flatMap(([cx, h, r]) => terraces(cx, h, r, 36, 5)), 'dsi-px-far-line')}
          </pattern>
          <pattern id="dsi-pat-near" width={72} height={20} patternUnits="userSpaceOnUse" patternTransform="scale(6)">
            {/* A low base, so the hills roll into one another at the ground. */}
            <rect className="dsi-px-near" y={18} width={72} height={2} />
            {pixels(NEAR.flatMap(([cx, h, r]) => dome(cx, h, r, 20)), 'dsi-px-near')}
            {pixels(NEAR.flatMap(([cx, h, r]) => speckle(cx, h, r, 20)), 'dsi-px-near-dot')}
          </pattern>
          <pattern id="dsi-pat-ground" width={16} height={10} patternUnits="userSpaceOnUse" patternTransform="scale(6)">
            {/* The near hills' colour behind the tufts, so no sky shows between them. */}
            <rect className="dsi-px-near" width={16} height={1} />
            <rect className="dsi-px-soil" y={3} width={16} height={7} />
            {pixels(MORTAR, 'dsi-px-mortar')}
            {pixels(SOIL_HI, 'dsi-px-soil-hi')}
            {pixels(GRASS, 'dsi-px-grass')}
            {pixels(GRASS_TUFT, 'dsi-px-grass-hi')}
            {pixels(GRASS_EDGE, 'dsi-px-grass-lo')}
          </pattern>
        </defs>
        <rect width="100%" height={216} fill="url(#dsi-pat-far)" />
        <g transform="translate(0 84)">
          <rect width="100%" height={120} fill="url(#dsi-pat-near)" />
        </g>
        <g transform="translate(0 204)">
          <rect width="100%" height={60} fill="url(#dsi-pat-ground)" />
        </g>
      </svg>
    </div>
  )
}
