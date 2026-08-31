// Where the brochures get their content.
//
// Supabase is the source of truth once designs and projects are entered there.
// Without credentials we fall back to the migration's output, then to the site's
// seed — the same order the website uses, so a brochure built on a laptop with
// no keys still matches what is published.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..')

function loadEnv() {
  for (const file of ['admin/.env.local', 'site/.env.local']) {
    const p = path.join(ROOT, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)

async function fromSupabase(table) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(url, key, { auth: { persistSession: false } })
    const { data, error } = await sb.from(table).select('id, data')
    if (error || !data?.length) return null
    return data.map((r) => ({ ...r.data, id: r.id }))
  } catch {
    return null
  }
}

// Smallest first, so the catalogue reads as a progression.
const bySize = (a, b) =>
  (a.bedrooms ?? 0) - (b.bedrooms ?? 0) || (a.areaSqm ?? 0) - (b.areaSqm ?? 0) || String(a.name).localeCompare(b.name)

export async function loadContent() {
  loadEnv()

  const migrated = {
    designs: readJson(path.join(ROOT, 'scripts/out/designs.json')),
    projects: readJson(path.join(ROOT, 'scripts/out/projects.json')),
  }

  const designs = (await fromSupabase('designs')) ?? migrated.designs ?? []
  const projects = (await fromSupabase('projects')) ?? migrated.projects ?? []

  const source = (await fromSupabase('designs')) ? 'Supabase' : migrated.designs ? 'scripts/out' : 'nothing'

  return {
    source,
    designs: designs.filter((d) => d.published !== false).sort(bySize),
    projects: projects.filter((p) => p.published !== false),
  }
}

// `${role}|${src}` -> { file, width, height }, filled in by prepareImages().
// Keyed by role because one photograph can be both a full-width cover plate and
// a thumbnail on a design page, and those want very different encodings.
const OPTIMISED = new Map()
const ASSET_DIR = path.join(ROOT, 'scripts', 'out', 'brochure-assets')

/**
 * How each kind of image is encoded, and why.
 *
 * The number that matters is not an image's pixel width but how many of those
 * pixels survive per millimetre of paper. A cover plate spans the full 210mm
 * page, so 1920px across it is 232 dpi — respectable. The same 1920px image
 * cropped into a portrait full-bleed keeps only 764px of its width, which is
 * 92 dpi, and under the old flat 1500px cap only 597px, which is 72 dpi and
 * visibly soft. Covers are therefore never downscaled, and never cropped
 * against their own aspect ratio — see cover() in blocks.mjs.
 *
 * Floorplans are line art: thin rules and dimension text are the entire point
 * of the drawing, so they keep full chroma and a higher quality floor.
 */
const TIERS = {
  cover:   { width: 2400, quality: 86, chroma: '4:4:4' },
  plan:    { width: 2400, quality: 88, chroma: '4:4:4' },
  default: { width: 1500, quality: 80, chroma: '4:2:0' },
}

// Floorplans are recognisable by name, so no caller has to say so.
const roleFor = (src, role = null) => role ?? (/floor.?plan/i.test(src) ? 'plan' : 'default')

// Images are referenced as /media/x.jpg. For print we need absolute file URLs so
// Puppeteer can load them straight off disk without a server running.
export function resolveImage(src, role = null) {
  if (!src) return null
  if (/^https?:\/\//.test(src)) return src

  // Prefer the print-optimised copy when one has been prepared, falling back to
  // the default tier so a caller asking for a tier that was never built still
  // gets a picture rather than nothing.
  const hit = OPTIMISED.get(`${roleFor(src, role)}|${src}`) ?? OPTIMISED.get(`default|${src}`)
  if (hit) return 'file:///' + hit.file.replace(/\\/g, '/')

  const p = path.join(ROOT, 'site', 'public', src.replace(/^\//, ''))
  if (!fs.existsSync(p)) return null
  return 'file:///' + p.replace(/\\/g, '/')
}

/**
 * Width / height of a prepared image, or null if it was never prepared.
 * The cover sizes its photo band to the picture's own proportions with this,
 * rather than cropping the picture to fit the band.
 */
export function imageAspect(src) {
  if (!src) return null
  for (const role of ['cover', 'plan', 'default']) {
    const hit = OPTIMISED.get(`${role}|${src}`)
    if (hit?.width && hit?.height) return hit.width / hit.height
  }
  return null
}

/**
 * Downscale and re-encode every image the brochures will use.
 *
 * The source photography is full-resolution PNG — several megabytes each — and
 * embedding those raw produced a 108 MB brochure and crashed the renderer on
 * the longer documents. Re-encoding to the tiers above keeps the documents at a
 * few megabytes without the flat cap that used to soften the covers.
 *
 * `hiRes` names the sources used as cover plates or full-bleed photographs;
 * those are additionally prepared at the cover tier. Preparing a few more than
 * are used costs build time, not document size — an unused variant is never
 * embedded.
 *
 * Results are cached by tier, source size and mtime, so a re-run is near
 * instant.
 */
export async function prepareImages(sources, { hiRes = [] } = {}) {
  const sharp = (await import('sharp')).default
  fs.mkdirSync(ASSET_DIR, { recursive: true })

  const local = (s) => s && !/^https?:\/\//.test(s)
  const jobs = new Map()
  for (const src of sources.filter(local)) jobs.set(`${roleFor(src)}|${src}`, { src, role: roleFor(src) })
  for (const src of hiRes.filter(local)) jobs.set(`cover|${src}`, { src, role: 'cover' })

  let built = 0
  let cached = 0
  let bytesIn = 0
  let bytesOut = 0
  const missing = []

  for (const [key, { src, role }] of jobs) {
    const abs = path.join(ROOT, 'site', 'public', src.replace(/^\//, ''))
    if (!fs.existsSync(abs)) {
      if (!missing.includes(src)) missing.push(src)
      continue
    }

    const stat = fs.statSync(abs)
    const tier = TIERS[role]
    const base = path.basename(src).replace(/\.[^.]+$/, '')
    const out = path.join(ASSET_DIR, `${base}-${role}-${stat.size}-${Math.round(stat.mtimeMs)}.jpg`)

    if (!fs.existsSync(out)) {
      await sharp(abs)
        .rotate()
        .resize({ width: tier.width, withoutEnlargement: true })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: tier.quality, mozjpeg: true, chromaSubsampling: tier.chroma })
        .toFile(out)
      built++
    } else {
      cached++
    }

    const meta = await sharp(out).metadata()
    bytesIn += stat.size
    bytesOut += fs.statSync(out).size
    OPTIMISED.set(key, { file: out, width: meta.width, height: meta.height })
  }

  return { built, cached, missing, bytesIn, bytesOut, total: jobs.size }
}

export const money = (n) =>
  n == null ? null : n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

// "2 Bed · 1 Bath · 40.8 m²"
// Uses areaExact where the price guide gives one. The website publishes rounded
// figures and for Alton the two disagree outright — showing 30 m² in the header
// and 20.4 m² in the spec table on the same page is worse than picking one, and
// in a pricing document the engineering figure is the one that governs.
export const specLine = (d) =>
  [d.bedrooms ? `${d.bedrooms} Bed` : null, d.bathrooms ? `${d.bathrooms} Bath` : null, (d.areaExact ?? d.areaSqm) ? `${d.areaExact ?? d.areaSqm} m²` : null]
    .filter(Boolean)
    .join('  ·  ')

export const COMPANY = {
  name: '6Homes',
  legalName: '6Homes Pty Ltd',
  tagline: 'Homes for everyone, everywhere',
  phone: '1800 6HOMES (646 637)',
  email: 'sales@6homes.com',
  website: 'www.6homes.com',
  headOffice: '4/830 Whitehorse Road, Box Hill VIC 3128',
  showroom: '878 Whitehorse Road, Box Hill VIC 3128',
}

export const INCLUSIONS = [
  'Double-glazed windows and doors',
  'Designer kitchens and bathrooms',
  'Your choice of tapware finishes',
  'Energy-efficient insulation',
  'Turnkey service from permits to handover',
]

export const PROCESS = [
  { n: '01', title: 'Initial consultation', body: 'A free conversation about your vision, your block and your budget, and honest advice on whether modular suits the site.' },
  { n: '02', title: 'Design selection', body: 'Choose a design, then customise interior finishes, fixtures and fittings so the home matches how you actually live.' },
  { n: '03', title: 'Site assessment', body: 'Soil conditions, access and local regulations assessed, confirming feasibility and telling us exactly what your site needs.' },
  { n: '04', title: 'Permits and approvals', body: 'We obtain the planning and building permits and manage the regulatory process so approvals do not stall the build.' },
  { n: '05', title: 'Construction', body: 'Your home is built in our controlled factory environment, with progress photos throughout.' },
  { n: '06', title: 'Site preparation', body: 'Foundations and services go in while the modules are being built. Running the two in parallel is where the months come off.' },
  { n: '07', title: 'Delivery and installation', body: 'Modules are transported to site and craned into place, ready for occupancy shortly after.' },
  { n: '08', title: 'Handover', body: 'After final inspections and approvals, we hand over the keys.' },
]

// ── Installation ────────────────────────────────────────────────────────────
// Taken verbatim in substance from the Information and Price Guide. These are
// commercial terms, so they are transcribed rather than rewritten.

export const INSTALL_ASSUMPTION =
  'Installed prices are approximate and a guide only — every site is quoted individually. The indicative pricing assumes a standard flat block with M-class soil and easy access. Variations in site conditions, soil type and access will change the final installation quote.'

export const INSTALL_INCLUDES = [
  'Site assessment and groundwork preparation',
  'Delivery with a 100km allowance from port, and a 60-tonne, six-hour crane allowance',
  'Foundation installation, with a 600mm allowance off the ground',
  'Connection of essential services, where services are available on site',
  'Module assembly and securing',
  'Final touches to a move-in-ready finish',
]

export const INSTALL_EXCLUDES = [
  'Council fees and legal costs',
  'Service requirements beyond the standard module connection — upgrades, septic installation, running service to site',
  'Utility connection fees exceeding standard provisions',
  'Landscaping and external works such as driveways and fencing',
  'Customisation beyond the standard inclusions',
]

// ── Construction specification ──────────────────────────────────────────────
// The engineering detail from the guide. This is what separates the product
// from a shipping-container conversion, so it is worth stating precisely.

export const SPECIFICATION = [
  {
    title: 'Structure',
    items: [
      'Purpose-built modular carcass with heavy-duty external steel framing, produced to a structural engineer’s design',
      'Seam-welded corrugated high-strength steel external wall and roof panels, corrosion and weather resistant',
      'Galvanised steel framed internal walls',
      'Heavy-gauge steel floor joists, bearers and corner posts for bracing and load capacity',
      'Pressed steel seam-welded roofing panels',
    ],
    note: 'These are not shipping containers. The load-bearing capacity of a shipping container falls well below the safety standard required of a housing structure; our carcasses comply with architectural design standards.',
  },
  {
    title: 'Insulation',
    items: [
      'Closed-cell polyurethane (R1.5) sprayed to internal walls and ceilings',
      'Sisalation between the spray-on polyurethane and the adjacent internal steel frame, and over the ceiling frame',
      '50mm Rockwool or fibreglass batts (R1.5) through all outer shell cavities and internal walls',
      'Fire-rated plasterboard',
      'Long-life anti-corrosive coating to carcass walls, roof and floor joists',
    ],
  },
  {
    title: 'Windows and external doors',
    items: ['Double glazing to aluminium framed windows and glass sliding doors', 'Keyed locks to all external doors'],
  },
  {
    title: 'Internal fit-out',
    items: [
      'Compressed fibre cement flooring, glued and screw-fixed to steel floor joists',
      'Floating vinyl timber flooring with foam underlay throughout, excluding wet areas',
      'Plaster-lined walls throughout; fibre cement sheet to bathrooms',
      'Plasterboard to ceiling battens with shadow line detail',
      'European Beech architraves and skirting throughout, excluding wet areas',
    ],
  },
]
