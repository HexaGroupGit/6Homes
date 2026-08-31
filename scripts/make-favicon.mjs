#!/usr/bin/env node
// Builds the favicon and app icons from the official 6Homes mark.
//
//   npm run favicon
//
// The mark alone on a transparent ground disappears against a dark browser tab —
// half its gradient is nearly black. So it is set in white on a tile carrying the
// brand gradient, which reads at 16px on any chrome, light or dark.
//
// Run `npm run logo` first; this consumes site/public/brand/mark-white.svg.

import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const MARK = path.join(ROOT, 'site', 'public', 'brand', 'mark-white.svg')

if (!fs.existsSync(MARK)) {
  console.error('Missing site/public/brand/mark-white.svg — run `npm run logo` first.')
  process.exit(1)
}

const source = fs.readFileSync(MARK, 'utf8')

// Lift the paths and the mark's own viewBox out of the split asset.
const vb = (source.match(/viewBox="([^"]+)"/) || [])[1]
if (!vb) {
  console.error('mark-white.svg has no viewBox.')
  process.exit(1)
}
const [vx, vy, vw, vh] = vb.split(/\s+/).map(Number)
const paths = [...source.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*>/g)].map((m) => m[1])
if (!paths.length) {
  console.error('No paths found in mark-white.svg.')
  process.exit(1)
}

const SIZE = 512
// The mark occupies ~59% of the tile. Tighter and it crowds the corner radius;
// looser and it turns to mush at 16px.
const TARGET = SIZE * 0.59
const scale = Math.min(TARGET / vw, TARGET / vh)
const tx = (SIZE - vw * scale) / 2 - vx * scale
const ty = (SIZE - vh * scale) / 2 - vy * scale

// The brand gradient, in the direction the logo itself uses: deep at the top,
// bright at the bottom.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="6Homes">
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00515A"/>
      <stop offset="1" stop-color="#00BDCA"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="${Math.round(SIZE * 0.21)}" fill="url(#tile)"/>
  <g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})" fill="#FFFFFF">
${paths.map((d) => `    <path d="${d}"/>`).join('\n')}
  </g>
</svg>
`

// A maskable variant for Android, where the launcher crops to its own shape:
// the tile bleeds to the edges and the mark sits inside the safe area.
const maskScale = Math.min((SIZE * 0.46) / vw, (SIZE * 0.46) / vh)
const mtx = (SIZE - vw * maskScale) / 2 - vx * maskScale
const mty = (SIZE - vh * maskScale) / 2 - vy * maskScale
const maskable = svg
  .replace(/rx="\d+"/, 'rx="0"')
  .replace(/translate\([^)]+\) scale\([^)]+\)/, `translate(${mtx.toFixed(2)} ${mty.toFixed(2)}) scale(${maskScale.toFixed(4)})`)

const write = (file, content) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

// ── SVG ─────────────────────────────────────────────────────────────────────
// Next serves app/icon.svg as the favicon; the admin is a plain Vite index.html.
write(path.join(ROOT, 'site', 'src', 'app', 'icon.svg'), svg)
write(path.join(ROOT, 'site', 'public', 'brand', 'icon.svg'), svg)
write(path.join(ROOT, 'admin', 'public', 'favicon.svg'), svg)

// ── PNG ─────────────────────────────────────────────────────────────────────
// Safari ignores SVG favicons, and every platform wants a touch icon, so raster
// fallbacks are not optional.
const png = (size) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer()

const outputs = [
  [180, [['site/src/app/apple-icon.png'], ['admin/public/apple-touch-icon.png']]],
  [192, [['site/public/brand/icon-192.png']]],
  [512, [['site/public/brand/icon-512.png']]],
]

for (const [size, targets] of outputs) {
  const buf = await png(size)
  for (const [rel] of targets) write(path.join(ROOT, rel), buf)
}

const maskBuf = await sharp(Buffer.from(maskable)).resize(512, 512).png({ compressionLevel: 9 }).toBuffer()
write(path.join(ROOT, 'site', 'public', 'brand', 'icon-maskable-512.png'), maskBuf)

// A 32px PNG doubles as favicon.ico for anything that still asks for one.
const small = await png(32)
write(path.join(ROOT, 'site', 'public', 'favicon.ico'), small)
write(path.join(ROOT, 'admin', 'public', 'favicon.ico'), small)

console.log('Favicon built from the official mark:')
console.log('  site/src/app/icon.svg          (Next favicon)')
console.log('  site/src/app/apple-icon.png    180×180')
console.log('  site/public/favicon.ico        32×32')
console.log('  site/public/brand/icon-192.png, icon-512.png, icon-maskable-512.png')
console.log('  admin/public/favicon.svg, apple-touch-icon.png, favicon.ico')
