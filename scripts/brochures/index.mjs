#!/usr/bin/env node
// Generates the 6Homes brochures as print-ready PDFs.
//
//   npm run brochures                 # all five
//   npm run brochures -- price-guide  # just one
//   npm run brochures -- --html       # also keep the HTML, for debugging a page
//
// Content comes from Supabase when credentials are present, otherwise from the
// WordPress migration output — the same order the website uses, so a brochure
// never disagrees with what is published.
//
// Output goes straight to site/public/downloads/, which is where the CRM's
// brochure and price-list emails fetch their attachments from.

import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'
import { loadContent, prepareImages } from './data.mjs'
import { DOCUMENTS, coverSources } from './docs.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..')
const OUT = path.join(ROOT, 'site', 'public', 'downloads')
const TMP = path.join(ROOT, 'scripts', 'out', 'brochures')

// Chrome or Edge, whichever this machine has. Rendering to PDF needs a real
// browser engine; there is no meaningful shortcut.
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)

function findBrowser() {
  for (const p of CANDIDATES) if (fs.existsSync(p)) return p
  return null
}

const args = process.argv.slice(2)
const keepHtml = args.includes('--html')
const wanted = args.filter((a) => !a.startsWith('--'))
const targets = wanted.length ? wanted : Object.keys(DOCUMENTS)

for (const t of targets) {
  if (!DOCUMENTS[t]) {
    console.error(`Unknown document "${t}". Available: ${Object.keys(DOCUMENTS).join(', ')}`)
    process.exit(1)
  }
}

const browserPath = findBrowser()
if (!browserPath) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser executable.')
  process.exit(1)
}

const { designs, projects, source } = await loadContent()
if (!designs.length) {
  console.error('No designs found. Run `npm run migrate` first, or set the Supabase credentials.')
  process.exit(1)
}

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

console.log(`Content from ${source} — ${designs.length} designs, ${projects.length} projects`)

// Every image any document might use, optimised once up front. Without this the
// full-resolution source PNGs go into the PDF raw: a 108 MB brochure, and enough
// memory pressure to crash the renderer on the longer documents.
const sources = [
  ...designs.flatMap((d) => [d.heroImage, d.floorplanImage, ...(d.gallery ?? [])]),
  ...projects.flatMap((p) => [p.heroImage, p.floorplanImage, ...(p.gallery ?? [])]),
  '/media/Factory-5.jpg',
  '/media/Install-4.jpg',
  '/media/Overhead-view.jpg',
]
const img = await prepareImages(sources, { hiRes: coverSources({ designs, projects }) })
const mbOf = (n) => (n / 1048576).toFixed(1)
console.log(
  `Images: ${img.total} used · ${img.built} optimised, ${img.cached} cached` +
    `${img.missing.length ? `, ${img.missing.length} MISSING` : ''} — ${mbOf(img.bytesIn)} MB → ${mbOf(img.bytesOut)} MB`
)
// A referenced file that does not exist resolves to null and the page quietly
// renders without it — which is how the factory cover spent its life as a flat
// teal rectangle. Name them.
for (const src of img.missing) console.warn(`  ! missing image: ${src}`)
console.log(`Rendering with ${path.basename(browserPath)}\n`)

const mb = (n) => (n / 1048576).toFixed(2) + ' MB'
let failed = 0

/**
 * Render one document in its own browser.
 *
 * A single shared browser accumulates memory across these — twenty A4 pages of
 * embedded photography each — and reliably died on the fourth document with
 * "Target closed". A fresh instance per document costs a second or two and
 * removes the failure entirely.
 */
async function render(key) {
  const doc = DOCUMENTS[key]
  const html = doc.build({ designs, projects })
  const htmlPath = path.join(TMP, `${key}.html`)
  fs.writeFileSync(htmlPath, html)

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--allow-file-access-from-files',
      '--font-render-hinting=none',
      // /dev/shm is small in containers and Chrome falls back to disk badly.
      '--disable-dev-shm-usage',
    ],
  })

  try {
    const page = await browser.newPage()
    // Loading from a file:// URL rather than setContent, so the local
    // photographs in site/public/media resolve without a server running.
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0', timeout: 120000 })
    // Webfonts can arrive after networkidle; waiting on the font set avoids a
    // PDF typeset in the fallback face.
    await page.evaluate(() => document.fonts.ready)

    const pageCount = await page.evaluate(() => document.querySelectorAll('.page').length)

    // .page is overflow:hidden by design, so a page whose content runs long is
    // clipped rather than reflowed — and clipped silently. Ask the DOM which
    // pages overflow, so a layout change that no longer fits is a warning in
    // the build rather than a missing line discovered in print.
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll('.page')]
        .map((el, i) => {
          const pad = el.querySelector('.pad')
          const over = Math.max(
            el.scrollHeight - el.clientHeight,
            pad ? pad.scrollHeight - pad.clientHeight : 0
          )
          return { page: i + 1, over: Math.round(over) }
        })
        // A millimetre of rounding is not an overflow; two is.
        .filter((p) => p.over > 8)
    )
    const pdfPath = path.join(OUT, doc.file)
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      timeout: 180000,
    })
    return { pageCount, pdfPath, htmlPath, overflowing }
  } finally {
    await browser.close().catch(() => {})
  }
}

for (const key of targets) {
  const doc = DOCUMENTS[key]
  const started = Date.now()

  try {
    const { pageCount, pdfPath, htmlPath, overflowing } = await render(key)
    if (!keepHtml) fs.unlinkSync(htmlPath)

    for (const o of overflowing) {
      console.warn(`  ! ${doc.label} page ${o.page} overflows its sheet by ${(o.over / 3.7795).toFixed(1)}mm — content is being clipped`)
    }

    const size = fs.statSync(pdfPath).size
    const warn = size > 8 * 1048576 ? '  ⚠ over the 8 MB email attachment limit' : ''
    console.log(
      `  ${doc.label.padEnd(30)} ${String(pageCount).padStart(2)} pages  ${mb(size).padStart(9)}  ${((Date.now() - started) / 1000).toFixed(1)}s${warn}`
    )
  } catch (err) {
    failed++
    console.error(`  ${doc.label.padEnd(30)} FAILED — ${err.message}`)
  }
}

console.log(`\nWritten to site/public/downloads/`)
if (keepHtml) console.log(`HTML kept in scripts/out/brochures/ for inspection.`)
if (failed) process.exitCode = 1
