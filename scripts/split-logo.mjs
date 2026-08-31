#!/usr/bin/env node
// Splits the official 6Homes lockup into a mark and a wordmark.
//
//   node scripts/split-logo.mjs
//
// The brand pack only ships a vertical lockup (mark above wordmark) and a
// mark-only PNG. A site header is a 64px-high horizontal bar, where a vertical
// lockup is unusable and a PNG mark goes soft on a retina screen. Splitting the
// vector into its two groups gives a horizontal lockup built from the real
// artwork rather than a redrawn approximation.
//
// Bounding boxes come from a real browser (getBBox) rather than being estimated,
// so each output crops exactly to its own ink.

import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(import.meta.dirname, '..')

// Both lockups get split: the colour one for light backgrounds, the white one
// for the dark footer and the brochure covers. The wordmark carries its fill in
// a <style> block, so it cannot inherit currentColor — a real white asset is the
// only honest way to put it on a dark field.
const SOURCES = [
  { file: 'FullLogo.svg', mark: 'mark.svg', wordmark: 'wordmark.svg' },
  { file: 'FullLogo_White.svg', mark: 'mark-white.svg', wordmark: 'wordmark-white.svg' },
]

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean)
const browserPath = CANDIDATES.find((p) => fs.existsSync(p))
if (!browserPath) {
  console.error('No Chrome or Edge found. Set CHROME_PATH.')
  process.exit(1)
}

const browser = await puppeteer.launch({ executablePath: browserPath, headless: 'new', args: ['--no-sandbox'] })

// Crop to the ink — spacing is the layout's job, not the asset's.
const svg = (box, inner, style) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x.toFixed(2)} ${box.y.toFixed(2)} ${box.width.toFixed(2)} ${box.height.toFixed(2)}" role="img" aria-label="6Homes">
${style}
${inner.trim()}
</svg>
`

for (const src of SOURCES) {
  const srcPath = path.join(ROOT, 'site', 'public', 'brand', src.file)
  if (!fs.existsSync(srcPath)) {
    console.error(`Missing ${src.file} — copy it from the brand pack first.`)
    process.exitCode = 1
    continue
  }
  const source = fs.readFileSync(srcPath, 'utf8')

  const page = await browser.newPage()
  await page.setContent(source, { waitUntil: 'load' })
  // The lockup is two top-level groups: the gradient mark, then the wordmark.
  const boxes = await page.evaluate(() =>
    [...document.querySelectorAll('svg > g')].map((g) => {
      const b = g.getBBox()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    })
  )
  await page.close()

  if (boxes.length < 2) {
    console.error(`${src.file}: expected two groups, found ${boxes.length}. The brand pack may have changed.`)
    process.exitCode = 1
    continue
  }

  // Carry the shared <style> block through so the class names keep resolving.
  const style = (source.match(/<style[\s\S]*?<\/style>/) || [''])[0]
  // The wordmark group nests another <g>, so split on the second top-level <g>
  // rather than trying to balance tags with a regex.
  const first = source.indexOf('<g>')
  const second = source.indexOf('<g>', first + 1)
  const markInner = source.slice(first, second)
  const wordInner = source.slice(second, source.lastIndexOf('</svg>'))

  for (const [name, box, inner] of [
    [src.mark, boxes[0], markInner],
    [src.wordmark, boxes[1], wordInner],
  ]) {
    const content = svg(box, inner, style)
    for (const app of ['site', 'admin']) {
      const dir = path.join(ROOT, app, 'public', 'brand')
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(path.join(dir, name), content)
    }
    console.log(`  ${name.padEnd(20)} ${String(Math.round(box.width)).padStart(4)} × ${String(Math.round(box.height)).padEnd(4)}  ${content.length} bytes`)
  }
}

await browser.close()
console.log(`\nWritten to site/public/brand/ and admin/public/brand/`)
