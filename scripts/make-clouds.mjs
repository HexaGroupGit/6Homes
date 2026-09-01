// Builds the site's drifting cloud plates from the client's OWN sky
// photography — Kinsfolk Stage 2 was shot under big cumulus, so the sky bands
// of those frames become translucent cloud strips.
//
// Technique: crop a sky band, then turn "how much whiter than the blue sky is
// this pixel" into alpha. On a blue sky, clouds are the only pixels where the
// red channel approaches the blue channel, so alpha ≈ smoothstep(R - baseline).
// A soft blur keeps the edges atmospheric rather than cut out.
//
//   node scripts/make-clouds.mjs
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const MEDIA = path.join(ROOT, 'xhomes', 'public', 'media')

// Three source frames with distinct cloud shapes, one strip each.
// Bands chosen to stay in open sky — buildings enter the lower corners of
// these frames, and a ghosted parapet drifting across the page reads as a
// rendering bug, not weather.
// All three strips come from dsf3148 — the one frame whose sky is both
// dramatic and clean. Three separate bands give three distinct silhouettes;
// the other frames kept leaking rooflines into the mask.
const SOURCES = [
  { src: 'kinsfolk-s2-dsf3148.jpg', name: 'clouds-1', band: [0.05, 0.0, 0.85, 0.14] },
  { src: 'kinsfolk-s2-dsf3148.jpg', name: 'clouds-2', band: [0.05, 0.1, 0.67, 0.16] },
  { src: 'kinsfolk-s2-dsf3148.jpg', name: 'clouds-3', band: [0.28, 0.02, 0.47, 0.18] },
]

for (const { src, name, band } of SOURCES) {
  const input = path.join(MEDIA, src)
  const meta = await sharp(input).metadata()
  const region = {
    left: Math.round(band[0] * meta.width),
    top: Math.round(band[1] * meta.height),
    width: Math.round(band[2] * meta.width),
    height: Math.round(band[3] * meta.height),
  }

  const { data, info } = await sharp(input)
    .extract(region)
    .resize(1600, null)
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Alpha from cloud-ness; colour pushed to soft white so the strip sits on
  // any ground the sections choose.
  const out = Buffer.alloc(info.width * info.height * 4)
  const fx = Math.round(info.width * 0.12) // horizontal feather
  const fy = Math.round(info.height * 0.22) // vertical feather
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels
      const j = (y * info.width + x) * 4
      const r = data[i], b = data[i + 2]
      // Blue sky: b >> r. Cloud: r rises toward b. Brightness floor keeps
      // dark structures out even inside the band.
      const bright = (data[i] + data[i + 1] + data[i + 2]) / 765
      let cloudness = Math.max(0, Math.min(1, (r - b * 0.66 - 46) / 80))
      if (bright < 0.5) cloudness = 0
      // Feather every edge so the strip dissolves instead of ending.
      const ex = Math.min(1, x / fx, (info.width - 1 - x) / fx)
      const ey = Math.min(1, (y + fy * 0.4) / fy, (info.height - 1 - y) / fy)
      const a = Math.round(Math.pow(cloudness, 1.6) * 255 * Math.max(0, ex) * Math.max(0, ey))
      out[j] = 250
      out[j + 1] = 251
      out[j + 2] = 253
      out[j + 3] = a
    }
  }

  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .blur(1.6)
    .webp({ quality: 74, alphaQuality: 80 })
    .toFile(path.join(MEDIA, `${name}.webp`))

  const kb = (await sharp(path.join(MEDIA, `${name}.webp`)).toBuffer()).length / 1024
  console.log(`${name}.webp  ${info.width}x${info.height}  ${kb.toFixed(0)} KB`)
}

// Preview sheet on two grounds, because alpha lies on a single background.
const W = 800
const strips = []
for (const { name } of SOURCES) {
  for (const bg of ['#B9D2E8', '#101010']) {
    const cloud = await sharp(path.join(MEDIA, `${name}.webp`)).resize(W).toBuffer()
    const h = (await sharp(cloud).metadata()).height
    strips.push(
      await sharp({ create: { width: W, height: h, channels: 3, background: bg } })
        .composite([{ input: cloud }])
        .jpeg({ quality: 80 })
        .toBuffer()
    )
  }
}
let y = 0
const heights = await Promise.all(strips.map(async (s) => (await sharp(s).metadata()).height))
const total = heights.reduce((a, b) => a + b, 0)
await sharp({ create: { width: W, height: total, channels: 3, background: '#333' } })
  .composite(strips.map((s, i) => ({ input: s, left: 0, top: (y += i ? heights[i - 1] : 0) })))
  .jpeg({ quality: 80 })
  .toFile(path.join(ROOT, 'scripts', 'out', 'clouds-preview.jpg'))
console.log('preview → scripts/out/clouds-preview.jpg')
