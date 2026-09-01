// Scroll-films a page the way the ERA study filmed theirs: load, then step
// through the full scroll height capturing frames, so every scrubbed scene is
// seen at several points mid-animation — the states a static screenshot never
// shows and where scrub bugs actually live.
//
//   node scripts/cine-shot.mjs [path] [outdir] [steps] [width]
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const PAGE = (process.argv[2] ?? '/').replace(/^.*Git$/, '/').replace(/^home$/, '/')
const OUT = path.resolve(process.argv[3] ?? 'scripts/out/cine')
const STEPS = Number(process.argv[4] ?? 14)
const WIDTH = Number(process.argv[5] ?? 1440)
const BASE = process.env.BASE ?? 'http://localhost:3311'

fs.mkdirSync(OUT, { recursive: true })
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
const page = await browser.newPage()
const height = WIDTH < 700 ? 844 : 900
await page.setViewport({ width: WIDTH, height, deviceScaleFactor: 1.5 })

const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 300)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text().slice(0, 300))
})

await page.goto(BASE + PAGE, { waitUntil: 'networkidle0', timeout: 90000 })
// Let the preloader play out on first load.
await new Promise((r) => setTimeout(r, 3600))

const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
const name = PAGE === '/' ? 'home' : PAGE.replace(/\//g, '-').replace(/^-/, '')

for (let i = 0; i <= STEPS; i++) {
  const y = Math.round((total * i) / STEPS)
  // Real wheel-style travel so Lenis + scrub timelines follow along.
  await page.evaluate((to) => window.scrollTo({ top: to, behavior: 'instant' }), y)
  await new Promise((r) => setTimeout(r, 1000))
  await page.screenshot({ path: path.join(OUT, `${name}-${WIDTH}-${String(i).padStart(2, '0')}.png`) })
}

const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth
)
console.log(`${name} @${WIDTH}: ${STEPS + 1} frames, scrollHeight ${total}, hOverflow ${overflow}px`)
if (errors.length) console.log('JS ERRORS:\n  ' + [...new Set(errors)].join('\n  '))
await browser.close()
