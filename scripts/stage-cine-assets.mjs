// Stages the hero-grade marketing imagery for the cinematic rebuild.
//
// Reads the workflow's asset findings, takes every top pick worth shipping,
// re-encodes it to web weight with sharp, and writes a manifest the site can
// import. Idempotent: existing outputs are skipped unless the source is newer.
//
//   node scripts/stage-cine-assets.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'site', 'public', 'media', 'cine')
const FINDINGS = path.join(ROOT, 'scripts', 'out', 'era-study', 'findings.json')

fs.mkdirSync(OUT, { recursive: true })

const findings = JSON.parse(fs.readFileSync(FINDINGS, 'utf8'))
const picks = Object.values(findings.inventories).flatMap((inv) => inv.topPicks ?? [])

// Only images sharp can eat; PDFs and videos are handled elsewhere.
const IMG = /\.(jpe?g|png|webp|tiff?)$/i
const usable = picks.filter((p) => IMG.test(p.path) && fs.existsSync(p.path) && (p.quality ?? 0) >= 4)

// Name each file by what it shows, not what the render farm called it.
const slug = (s) =>
  s.toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .slice(0, 7)
    .join('-')

const manifest = []
const claimed = new Set()

for (const p of usable) {
  let name = slug(p.subject)
  let n = 2
  while (claimed.has(name)) name = `${slug(p.subject)}-${n++}`
  claimed.add(name)

  const dest = path.join(OUT, `${name}.jpg`)
  const src = fs.statSync(p.path)
  const exists = fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= src.mtimeMs

  try {
    if (!exists) {
      // 2400px is enough for a full-bleed hero on a retina laptop once the
      // browser picks the next/image variant; q82 keeps texture in dusk skies.
      await sharp(p.path)
        .rotate()
        .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(dest)
    }
    const meta = await sharp(dest).metadata()
    manifest.push({
      file: `/media/cine/${name}.jpg`,
      w: meta.width,
      h: meta.height,
      kind: p.kind,
      quality: p.quality,
      subject: p.subject,
      source: p.path,
    })
    console.log(`  ${exists ? 'cached ' : 'staged '} ${name}.jpg  ${meta.width}x${meta.height}`)
  } catch (err) {
    console.warn(`  FAILED  ${p.path}: ${err.message}`)
  }
}

manifest.sort((a, b) => b.quality - a.quality || b.w - a.w)
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
const mb = manifest.length
  ? (fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg')).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0) / 1048576).toFixed(1)
  : 0
console.log(`\n${manifest.length} assets staged, ${mb} MB total → site/public/media/cine/`)
