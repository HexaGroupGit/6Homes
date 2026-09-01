// Stages the X-Homes site imagery: every Kinsfolk web-use photo (the client
// already curated those folders), every Lumina digital render, and the Berwick
// Views floor plan — hydrated out of OneDrive, re-encoded to web weight, and
// summarised in contact sheets so the hero shots can be picked by eye.
//
//   node scripts/stage-xh-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'xhomes', 'public', 'media')
const TMP = path.join(ROOT, 'scripts', 'out', 'xh-src')
const OD = 'C:/Users/EricKuang/OneDrive - HEXA PACIFIC PTY LTD/Documents'

const SETS = [
  {
    prefix: 'kinsfolk-s1',
    dir: `${OD}/Hexa Projects/Kinsfolk/KINSFOLK Doveton/Kinsfolk Stage 1 Web-Use Photos`,
  },
  {
    prefix: 'kinsfolk-s2',
    dir: `${OD}/Hexa Projects/Kinsfolk/KINSFOLK Doveton/Kinsfolk Stage 2 Web-Use Photos`,
  },
  {
    prefix: 'lumina',
    dir: `${OD}/Hexa Group Videos/Lumina/Lumina Renders/Renders - A3RGB - Digital Use`,
  },
  {
    prefix: 'berwick',
    dir: `${OD}/Hexa Projects/Berwick Views`,
    only: /\.jpe?g$/i, // just the floor plan; the PDFs are content sources, not images
  },
]

fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(TMP, { recursive: true })

const IMG = /\.(jpe?g|png|tiff?)$/i
const manifest = []

for (const set of SETS) {
  if (!fs.existsSync(set.dir)) {
    console.warn(`missing: ${set.dir}`)
    continue
  }
  const files = fs.readdirSync(set.dir).filter((f) => IMG.test(f) && (!set.only || set.only.test(f)))
  let n = 0
  for (const f of files) {
    const src = path.join(set.dir, f)
    const name =
      set.prefix +
      '-' +
      f
        .replace(/\.[^.]+$/, '')
        .replace(/HEXA\d+_Lumina_/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
    const dest = path.join(OUT, `${name}.jpg`)
    if (fs.existsSync(dest)) {
      const meta = await sharp(dest).metadata()
      manifest.push({ file: `/media/${name}.jpg`, w: meta.width, h: meta.height, set: set.prefix })
      n++
      continue
    }
    try {
      // Copy first: OneDrive hydrates a placeholder for the OS copy call where
      // libvips' open can fail on the reparse point.
      const local = path.join(TMP, `${set.prefix}-${f}`)
      if (!fs.existsSync(local)) execFileSync('cmd', ['/c', 'copy', '/y', src.replace(/\//g, '\\'), local.replace(/\//g, '\\')], { stdio: 'pipe' })
      await sharp(local)
        .rotate()
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(dest)
      const meta = await sharp(dest).metadata()
      manifest.push({ file: `/media/${name}.jpg`, w: meta.width, h: meta.height, set: set.prefix })
      n++
    } catch (err) {
      console.warn(`  FAIL ${f}: ${err.message.slice(0, 80)}`)
    }
  }
  console.log(`${set.prefix}: ${n} staged`)
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))

// Contact sheets, 24 thumbs each, so hero selection is a look not a guess.
const thumbs = manifest.filter((m) => m.set !== 'berwick')
const W = 360, H = 240, cols = 6
for (let sheet = 0; sheet * 24 < thumbs.length; sheet++) {
  const batch = thumbs.slice(sheet * 24, sheet * 24 + 24)
  const bufs = []
  for (const m of batch) {
    const label = Buffer.from(
      `<svg width="${W}" height="24"><rect width="${W}" height="24" fill="black" opacity="0.55"/><text x="6" y="16" font-family="monospace" font-size="11" fill="white">${m.file.replace('/media/', '').slice(0, 52)}</text></svg>`
    )
    bufs.push(
      await sharp(path.join(ROOT, 'xhomes', 'public', m.file))
        .resize(W, H, { fit: 'cover' })
        .composite([{ input: label, top: H - 24, left: 0 }])
        .jpeg({ quality: 74 })
        .toBuffer()
    )
  }
  await sharp({ create: { width: W * cols, height: H * Math.ceil(batch.length / cols), channels: 3, background: '#111' } })
    .composite(bufs.map((b, i) => ({ input: b, left: (i % cols) * W, top: Math.floor(i / cols) * H })))
    .jpeg({ quality: 80 })
    .toFile(path.join(ROOT, 'scripts', 'out', `xh-sheet-${sheet}.jpg`))
}

const mb = (manifest.reduce((s, m) => s + fs.statSync(path.join(ROOT, 'xhomes', 'public', m.file)).size, 0) / 1048576).toFixed(1)
console.log(`\n${manifest.length} assets, ${mb} MB → xhomes/public/media/ · sheets in scripts/out/xh-sheet-*.jpg`)
