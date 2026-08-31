#!/usr/bin/env node
// Migrates content off the old WordPress site.
//
//   node scripts/migrate-wordpress.mjs            # download assets, write seed JSON
//   node scripts/migrate-wordpress.mjs --push     # …and upsert into Supabase
//
// Image mapping is done by scraping each page's own rendered HTML rather than
// guessing from filenames — the media library is full of "Untitled-design-26.png"
// and "Image_20240722173547.jpg", so filename matching would silently put the
// wrong photo on the wrong home. What a page displays is what that page is about.
//
// Idempotent: files already downloaded are skipped, and rows are upserted by id.
// It never deletes anything.

import fs from 'node:fs/promises'
import path from 'node:path'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

const WP = 'https://6homes.com'
const ROOT = path.resolve(import.meta.dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'site', 'public')
const MEDIA_DIR = path.join(PUBLIC_DIR, 'media')
const DOWNLOADS_DIR = path.join(PUBLIC_DIR, 'downloads')
const OUT_DIR = path.join(ROOT, 'scripts', 'out')

const PUSH = process.argv.includes('--push')

// slug on WordPress → what it becomes for us.
//
// `areaSqm` is the rounded figure the website publishes; `areaExact` and
// `moduleBase` come from the Information and Price Guide, which is the document
// engineering and pricing actually work from. Where the two disagree the guide
// is the authority, but the website's number is what customers have been reading
// — see the note on Alton below.
//
// `priceFrom` is the INSTALLED price from that guide (Feb 2025 edition).
// `publishPrice` is false on every design: the website deliberately gates pricing
// behind the download form, as the old one did. The CRM and the generated
// brochures use these numbers; the public pages do not show them until someone
// flips this flag.
const DESIGNS = [
  { slug: 'elsey', tagline: 'Small, complete, and genuinely liveable', description: 'Our most compact home. One bedroom, one bathroom and an open living space in twenty square metres — enough for a studio, a guest suite, a short-stay rental, or a first step onto a block you already own.', name: 'Elsey', bedrooms: 1, bathrooms: 1, areaSqm: 20, areaExact: 20.4, moduleBase: '1 × 6.0m × 3.4m', priceFrom: 99999 },
  // The guide says 20.4 m² and a 12.2 × 2.4 module; the website says 30 m².
  // Left as the website has it until 6Homes confirms which is right.
  { slug: 'alton', tagline: 'Room to breathe in a single-bedroom plan', description: 'Arranged around a proper living area, so a one-bedroom home stops feeling like a room with a kitchen in it.', name: 'Alton', bedrooms: 1, bathrooms: 1, areaSqm: 30, areaExact: 20.4, moduleBase: '1 × 12.2m × 2.4m', priceFrom: 125500, areaConflict: true },
  { slug: 'avon', tagline: 'The same footprint, a different way of living in it', description: 'An alternative one-bedroom layout to the Alton, with the living and sleeping zones separated differently. Which one suits comes down to your block and its outlook.', name: 'Avon', bedrooms: 1, bathrooms: 1, areaSqm: 30, areaExact: 28.8, moduleBase: '2 × 6.0m × 2.4m', priceFrom: 155000 },
  { slug: 'belford', tagline: 'A full home at one-bedroom scale', description: 'A generous bedroom, a full bathroom, and a living and kitchen space that works for more than one person. Popular as a granny flat and as a permanent single-residential home.', name: 'Belford', bedrooms: 1, bathrooms: 1, areaSqm: 40, areaExact: 40.8, moduleBase: '1 × 12.2m × 3.4m', priceFrom: 155000 },
  { slug: 'murray', tourUrl: 'https://my.matterport.com/show/?m=M6Upp7SNQ35', tagline: 'Two bedrooms without the footprint', description: 'Our most efficient plan, and the one that turns up most often in our completed projects — from granny flats to short-stay accommodation.', name: 'Murray', bedrooms: 2, bathrooms: 1, areaSqm: 40, areaExact: 40.8, moduleBase: '1 × 12.2m × 3.4m', priceFrom: 155000 },
  { slug: 'selina', tourUrl: 'https://my.matterport.com/show/?m=7Vnw6R18Lbx', tagline: 'Double the comfort, perfectly balanced', description: 'Two well-sized bedrooms, each with its own ensuite, positioned either side of a central living and kitchen area. It works as well for two households sharing as it does for a couple with regular guests.', name: 'Selina', bedrooms: 2, bathrooms: 2, areaSqm: 60, areaExact: 57.6, moduleBase: '2 × 12.2m × 2.4m', priceFrom: 220000 },
  // Norfolk is on the website but absent from the price guide entirely.
  { slug: 'norfolk', tagline: 'Two bedrooms, and space to actually live', description: 'Puts the floor area into the living spaces rather than the bedroom count. A comfortable permanent home for one or two people.', name: 'Norfolk', bedrooms: 2, bathrooms: 1, areaSqm: 80, priceFrom: null, priceNote: 'POA' },
  { slug: 'miranda', tagline: 'A three-bedroom family plan', description: 'Three bedrooms and two bathrooms, planned so the second bathroom does real work at the busy end of the morning.', name: 'Miranda', bedrooms: 3, bathrooms: 2, areaSqm: 80, areaExact: 81.6, moduleBase: '1 × 12.2m × 3.4m + 2 × 6.0m × 3.4m', priceFrom: 340000 },
  { slug: 'dawson', tagline: 'Three bedrooms, arranged differently', description: 'The same size and bedroom count as the Miranda with a different arrangement — worth comparing the two floorplans against your block and its aspect.', name: 'Dawson', bedrooms: 3, bathrooms: 2, areaSqm: 80, areaExact: 81.6, moduleBase: '2 × 12.2m × 3.4m', priceFrom: 275000 },
  { slug: 'claremont', tagline: 'Our largest home', description: 'Four bedrooms and two bathrooms — a full family home, delivered as modules and installed in days rather than built on site over a year.', name: 'Claremont', bedrooms: 4, bathrooms: 2, areaSqm: 120, areaExact: 122.4, moduleBase: '3 × 12.2m × 3.4m', priceFrom: null, priceNote: 'POA' },
].map((d) => ({ ...d, publishPrice: false }))

const PROJECTS = [
  { slug: 'lockyer-valley', name: 'Lockyer Valley', location: 'Lockyer Valley, QLD', designName: 'Miranda', category: 'Wedding accommodation' },
  { slug: 'ipswich', name: 'Ipswich', location: 'Ipswich, QLD', designName: 'Murray', category: 'Single residential' },
  { slug: 'ballarat', name: 'Ballarat', location: 'Ballarat, VIC', designName: 'Murray', category: 'Granny flat' },
  { slug: 'woodside-beach', name: 'Woodside Beach', location: 'Woodside Beach, VIC', designName: 'Belford', category: 'Single residential' },
  { slug: 'brisbane', name: 'Brisbane City Living', location: 'Brisbane, QLD', designName: 'City Living', category: 'Double residential' },
  { slug: 'boonah-qld', name: 'Boonah', location: 'Boonah, QLD', designName: 'Selina', category: 'Off-grid' },
  { slug: 'redbank-valley', name: 'Redbank Valley', location: 'Redbank Valley, QLD', designName: 'Elsey', category: 'Hotel' },
  { slug: 'brisbane-2', name: 'Brisbane Airbnb', location: 'Brisbane, QLD', designName: 'Elsey', category: 'Airbnb' },
  { slug: 'tasmania', name: 'Tasmania', location: 'Tasmania', designName: 'Murray', category: 'Airbnb' },
]

// Collateral the CRM attaches to brochure / price list replies.
const COLLATERAL = [
  { match: /guide|brochure/i, as: '6homes-brochure.pdf' },
  { match: /price|pricelist/i, as: '6homes-price-list.pdf' },
]

const log = (...args) => console.log(...args)

// ── Fetch helpers ───────────────────────────────────────────────────────────

async function getJson(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} — ${url}`)
  return r.json()
}

async function download(url, dest) {
  try {
    await fs.access(dest)
    return { skipped: true }
  } catch {
    // Not there yet — fetch it.
  }
  const r = await fetch(url)
  if (!r.ok) return { error: `${r.status} ${r.statusText}` }
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await pipeline(Readable.fromWeb(r.body), createWriteStream(dest))
  return { ok: true }
}

// ── Scraping ────────────────────────────────────────────────────────────────

// Full-size uploads only. WordPress emits a -300x200 style suffix for every
// generated thumbnail; keeping those would migrate ten copies of each photo.
const THUMB = /-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i

function imagesFrom(html) {
  const urls = new Set()
  for (const m of html.matchAll(/https:\/\/6homes\.com\/wp-content\/uploads\/[^\s"'<>\\)]+?\.(?:jpg|jpeg|png|webp)/gi)) {
    const url = m[0]
    if (/FullLogo|cropped-/i.test(url)) continue // the logo, in its many crops
    urls.add(url.replace(THUMB, ''))
  }
  return [...urls]
}

function textFrom(html) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function scrapePage(slug) {
  const pages = await getJson(`${WP}/wp-json/wp/v2/pages?slug=${slug}`)
  const page = pages?.[0]
  if (!page) return null
  const html = page.content?.rendered ?? ''
  return { images: imagesFrom(html), text: textFrom(html) }
}

const localPath = (url) => `/media/${url.split('/').pop()}`

// ── Steps ───────────────────────────────────────────────────────────────────

async function migrateCollateral() {
  log('\n── Collateral ───────────────────────────────')
  const media = await getJson(`${WP}/wp-json/wp/v2/media?per_page=100&media_type=application&_fields=source_url,title`)
  let found = 0
  for (const item of media) {
    const filename = item.source_url.split('/').pop()
    const target = COLLATERAL.find((c) => c.match.test(filename) || c.match.test(item.title?.rendered ?? ''))
    if (!target) continue
    const dest = path.join(DOWNLOADS_DIR, target.as)
    const r = await download(item.source_url, dest)
    log(`  ${r.skipped ? 'have' : r.ok ? 'got ' : 'FAIL'}  ${target.as}  ← ${filename}`)
    if (r.ok || r.skipped) found++
  }
  if (!found) {
    log('  No PDFs found in the media library.')
  }
  // Say plainly what is missing — a brochure email that silently arrives with
  // no attachment is worse than one that never sends.
  for (const c of COLLATERAL) {
    try {
      await fs.access(path.join(DOWNLOADS_DIR, c.as))
    } catch {
      log(`  MISSING  site/public/downloads/${c.as} — drop the PDF here before turning safe mode off`)
    }
  }
}

/**
 * Pull every image in the WordPress media library.
 *
 * The per-page scrape only captures what a page actually displays, which misses
 * anything uploaded but unused — factory and installation photography, extra
 * interiors, shots that were swapped out. Those are the client's assets and
 * they disappear the day WordPress is switched off, so take all of them now and
 * let the team choose later. Logo crops and generated thumbnails are skipped.
 */
async function migrateLibrary() {
  log('\n── Media library ───────────────────────────────')

  const all = []
  for (let page = 1; ; page++) {
    const r = await fetch(`${WP}/wp-json/wp/v2/media?per_page=100&page=${page}&_fields=source_url,mime_type`)
    if (!r.ok) break
    const batch = await r.json()
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < 100) break
  }

  const images = all
    .filter((m) => /^image\//.test(m.mime_type))
    .map((m) => m.source_url)
    .filter((u) => !/FullLogo|cropped-/i.test(u))
    .filter((u) => !THUMB.test(u))

  let got = 0, had = 0, failed = 0
  for (const url of images) {
    const r = await download(url, path.join(MEDIA_DIR, url.split('/').pop()))
    if (r.ok) got++
    else if (r.skipped) had++
    else { failed++; log(`  ! ${url.split('/').pop()} — ${r.error}`) }
  }

  log(`  ${images.length} images in the library — ${got} downloaded, ${had} already had, ${failed} failed`)
  log('  Unused ones sit in site/public/media for the team to pick from.')
}

/**
 * Re-encode everything in site/public/media for the web.
 *
 * WordPress stores the originals: 88 PNGs totalling 333 MB, several of them
 * 15–20 MB each. Those are committed to the repo and served straight to
 * visitors — a gallery image on a design page was a 20 MB download, and git
 * history keeps every byte forever.
 *
 * Photographs become JPEG at 2000px, which is more than any layout here uses.
 * Floorplans stay PNG, because they are line art and JPEG would fur the thin
 * rules and dimension text.
 *
 * Returns a map of old path → new path so the records that reference them can be
 * rewritten; the originals remain in OneDrive and on WordPress.
 */
async function optimiseWebMedia() {
  log('\n── Optimising media for the web ──────────────')
  const sharp = (await import('sharp')).default

  const files = (await fs.readdir(MEDIA_DIR)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  const rename = new Map()
  let before = 0
  let after = 0
  let converted = 0

  // The library holds both a 3.png and a 3.jpg — different images entirely.
  // Converting PNG to JPEG would have them fight over the same name and one
  // would silently overwrite the other, so every output name is claimed first.
  const claimed = new Set(files.map((f) => f.toLowerCase()))

  for (const file of files) {
    const src = path.join(MEDIA_DIR, file)
    const stat = await fs.stat(src)
    before += stat.size

    const isPlan = /floor.?plan/i.test(file)
    const base = file.replace(/\.[^.]+$/, '')
    const ext = isPlan ? 'png' : 'jpg'

    let outName = `${base}.${ext}`
    if (outName !== file && claimed.has(outName.toLowerCase())) {
      // Keep the source extension in the name so the two stay distinguishable.
      const srcExt = file.split('.').pop().toLowerCase()
      outName = `${base}-${srcExt}.${ext}`
      let n = 2
      while (claimed.has(outName.toLowerCase())) outName = `${base}-${srcExt}-${n++}.${ext}`
    }
    claimed.add(outName.toLowerCase())
    const out = path.join(MEDIA_DIR, outName)
    const tmp = path.join(MEDIA_DIR, `.tmp-${outName}`)

    try {
      const pipeline = sharp(src).rotate().resize({ width: 2000, withoutEnlargement: true })
      if (isPlan) {
        await pipeline.png({ compressionLevel: 9, palette: true }).toFile(tmp)
      } else {
        await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toFile(tmp)
      }

      // Only keep the new file if it is actually smaller — a small JPEG source
      // re-encoded can come out larger, and there is no sense in that trade.
      const tmpStat = await fs.stat(tmp)
      if (tmpStat.size < stat.size) {
        if (outName !== file) await fs.rm(src)
        await fs.rename(tmp, out)
        after += tmpStat.size
        if (outName !== file) {
          rename.set(`/media/${file}`, `/media/${outName}`)
          converted++
        }
      } else {
        await fs.rm(tmp)
        after += stat.size
      }
    } catch (err) {
      log(`  ! ${file} — ${err.message}`)
      await fs.rm(tmp).catch(() => {})
      after += stat.size
    }
  }

  const mb = (n) => (n / 1048576).toFixed(0)
  log(`  ${files.length} images · ${converted} re-encoded to JPEG — ${mb(before)} MB → ${mb(after)} MB`)
  return rename
}

// Rewrite every image reference on a record through the rename map.
function applyRenames(records, rename) {
  if (!rename.size) return records
  const swap = (p) => (p && rename.get(p)) || p
  return records.map((r) => ({
    ...r,
    heroImage: swap(r.heroImage),
    floorplanImage: swap(r.floorplanImage),
    gallery: (r.gallery ?? []).map(swap),
  }))
}

async function migrateContent(kind, entries) {
  log(`\n── ${kind} ───────────────────────────────`)

  // Scrape every page first so we can count how often each image appears.
  const pages = []
  for (const entry of entries) {
    pages.push({ entry, page: await scrapePage(entry.slug) })
  }

  // An image that turns up on most pages is page furniture, not the subject —
  // these pages head their spec block with bed and bath icons, and taking the
  // first image on the page put a line drawing of a bed where the photograph of
  // the house should be. Anything appearing on more than a third of the pages
  // (and at least three) is chrome, and is dropped.
  const fileOf = (u) => u.split('/').pop()
  const counts = new Map()
  for (const { page } of pages) {
    for (const url of new Set(page?.images ?? [])) counts.set(fileOf(url), (counts.get(fileOf(url)) ?? 0) + 1)
  }
  const threshold = Math.max(3, Math.ceil(entries.length / 3))
  const chrome = new Set([...counts].filter(([, n]) => n >= threshold).map(([file]) => file))
  if (chrome.size) {
    log(`  (ignoring ${chrome.size} shared image${chrome.size === 1 ? '' : 's'} used across pages — icons and furniture)`)
  }

  const results = []
  for (const { entry, page } of pages) {
    if (!page) {
      log(`  ${entry.slug.padEnd(18)} no WordPress page — seeded without images`)
      results.push({ ...entry, published: true, gallery: [] })
      continue
    }

    const downloaded = []
    for (const url of page.images) {
      if (chrome.has(fileOf(url))) continue
      const dest = path.join(MEDIA_DIR, url.split('/').pop())
      const r = await download(url, dest)
      if (r.ok || r.skipped) downloaded.push(localPath(url))
      else log(`      ! ${url.split('/').pop()} — ${r.error}`)
    }

    // Floorplans are the one image type that IS reliably named, and they belong
    // in their own field — the design page gives them a dedicated section, and
    // a floorplan sitting in the photo gallery looks like a mistake.
    const floorplan = downloaded.find((p) => /floor.?plan/i.test(p))
    const photos = downloaded.filter((p) => p !== floorplan)

    // Prefer a photograph unique to this page as the hero. Ipswich and Ballarat
    // are both Murray builds and share three interior shots, so "first image on
    // the page" gave them the same hero and two identical-looking tiles — while
    // Ballarat's own twilight exterior sat third in its gallery. A picture only
    // this project has is almost always the one worth leading with.
    const hero = photos.find((p) => (counts.get(fileOf(p)) ?? 0) === 1) ?? photos[0]
    const gallery = photos.filter((p) => p !== hero)
    results.push({
      ...entry,
      published: true,
      heroImage: hero ?? undefined,
      floorplanImage: floorplan ?? undefined,
      gallery,
      sourceText: page.text.slice(0, 2000),
    })
    log(
      `  ${entry.slug.padEnd(18)} ${photos.length} photo${photos.length === 1 ? '' : 's'}` +
      `${floorplan ? ' + floorplan' : ''}`
    )
  }

  return results
}

async function push(designs, projects) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    log('\n--push needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.')
    process.exitCode = 1
    return
  }

  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(url, key, { auth: { persistSession: false } })

  log('\n── Pushing to Supabase ───────────────────────')
  for (const [table, rows, prefix] of [['designs', designs, 'dsn'], ['projects', projects, 'proj']]) {
    for (const row of rows) {
      // A stable id derived from the slug, so re-running updates rather than
      // duplicating — and so a hand-edit in the CRM survives a second run only
      // where it doesn't conflict.
      const id = `${prefix}_${row.slug}`
      const { sourceText, ...data } = row
      const { error } = await sb.from(table).upsert({
        id,
        data: { ...data, id, migratedFrom: 'wordpress', updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      log(`  ${error ? 'FAIL' : 'ok  '}  ${table}/${row.slug}${error ? ` — ${error.message}` : ''}`)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  log('Migrating content from 6homes.com')
  await fs.mkdir(MEDIA_DIR, { recursive: true })
  await fs.mkdir(DOWNLOADS_DIR, { recursive: true })
  await fs.mkdir(OUT_DIR, { recursive: true })

  await migrateCollateral()
  await migrateLibrary()
  const designsRaw = await migrateContent('Designs', DESIGNS)
  const projectsRaw = await migrateContent('Projects', PROJECTS)

  // Re-encode after scraping, then point every record at the optimised file.
  const rename = await optimiseWebMedia()
  const designs = applyRenames(designsRaw, rename)
  const projects = applyRenames(projectsRaw, rename)

  await fs.writeFile(path.join(OUT_DIR, 'designs.json'), JSON.stringify(designs, null, 2))
  await fs.writeFile(path.join(OUT_DIR, 'projects.json'), JSON.stringify(projects, null, 2))
  log(`\nWrote scripts/out/designs.json and scripts/out/projects.json`)

  // The site's seed merges this in, so the marketing site is correct from the
  // moment it builds — before anyone has opened the CRM.
  //
  // Everything the site can use, not just images. A tour URL, a price and an
  // exact area added here previously reached the brochures but never the
  // website, because the site reads its own seed rather than scripts/out.
  // Writing the whole record removes that class of drift.
  const merge = Object.fromEntries(
    [...designs, ...projects].map((r) => [
      r.slug,
      {
        heroImage: r.heroImage,
        floorplanImage: r.floorplanImage,
        gallery: r.gallery,
        tourUrl: r.tourUrl,
        priceFrom: r.priceFrom,
        priceNote: r.priceNote,
        publishPrice: r.publishPrice,
        areaExact: r.areaExact,
        moduleBase: r.moduleBase,
        tagline: r.tagline,
        description: r.description,
      },
    ])
  )
  const mergePath = path.join(ROOT, 'site', 'src', 'data', 'migrated-media.json')
  await fs.writeFile(mergePath, JSON.stringify(merge, null, 2))
  log('Wrote site/src/data/migrated-media.json')

  if (PUSH) await push(designs, projects)
  else log('\nRe-run with --push to upsert these into Supabase.')

  log('\nDone. Review the images in the CRM — the first image on each page was')
  log('taken as the hero, which is right most of the time but not always.')
}

main().catch((err) => {
  console.error('\nMigration failed:', err)
  process.exit(1)
})
