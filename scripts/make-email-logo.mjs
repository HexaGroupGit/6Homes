#!/usr/bin/env node
// Builds the horizontal 6Homes lockup as a PNG for use in emails.
//
//   node scripts/make-email-logo.mjs
//
// Email clients do not render SVG — Gmail and every Outlook strip it — so the
// site's vector lockup cannot be reused directly. This composes the same two
// split assets the site header uses (scripts/split-logo.mjs) into a single
// raster at 2x, so it stays crisp on a retina screen while being declared at
// half that size in the markup.
//
// Output lands in the SITE's public folder, not the admin's: emails need an
// absolute URL on a host that serves it publicly, and that is 6homes.com.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const BRAND = path.join(ROOT, 'site', 'public', 'brand')
const OUT = path.join(BRAND, 'email-logo.png')

// Declared size in the email markup. The mark is set proportionally larger than
// the type, matching the site header's ratio (site/src/components/Wordmark.tsx).
const DISPLAY = { markH: 38, wordH: 22, gap: 13 }
const SCALE = 2

// Aspect ratios come from each asset's own viewBox, so a re-split that crops
// differently still composes correctly rather than silently stretching.
function ratioOf(file) {
  const svg = fs.readFileSync(file, 'utf8')
  const m = svg.match(/viewBox="([\d.\s-]+)"/)
  if (!m) throw new Error(`${path.basename(file)} has no viewBox`)
  const [, , w, h] = m[1].trim().split(/\s+/).map(Number)
  if (!w || !h) throw new Error(`${path.basename(file)} has an unusable viewBox`)
  return w / h
}

const markFile = path.join(BRAND, 'mark.svg')
const wordFile = path.join(BRAND, 'wordmark.svg')
for (const f of [markFile, wordFile]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing ${path.relative(ROOT, f)} — run \`npm run logo\` first.`)
    process.exit(1)
  }
}

const markH = DISPLAY.markH * SCALE
const wordH = DISPLAY.wordH * SCALE
const gap = DISPLAY.gap * SCALE
const markW = Math.round(markH * ratioOf(markFile))
const wordW = Math.round(wordH * ratioOf(wordFile))

// Round the canvas out to a whole multiple of SCALE so the declared size in the
// markup is an integer — a fractional width in an email is a rounding bug
// waiting to happen in Outlook.
const width = Math.ceil((markW + gap + wordW) / SCALE) * SCALE
const height = Math.ceil(markH / SCALE) * SCALE

const [mark, word] = await Promise.all([
  sharp(markFile).resize({ width: markW, height: markH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
  sharp(wordFile).resize({ width: wordW, height: wordH, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(),
])

await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    { input: mark, left: 0, top: 0 },
    // Optically centred against the mark rather than sitting on its baseline.
    { input: word, left: markW + gap, top: Math.round((height - wordH) / 2) },
  ])
  .png({ compressionLevel: 9 })
  .toFile(OUT)

const { size } = fs.statSync(OUT)
console.log(
  `email logo: ${path.relative(ROOT, OUT)} — ${width}x${height} (declare it ${width / SCALE}x${height / SCALE}), ${(size / 1024).toFixed(1)} kB`
)
