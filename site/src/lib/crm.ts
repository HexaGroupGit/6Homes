import { createClient } from '@supabase/supabase-js'
import { SEED_DESIGNS, SEED_PROJECTS } from '@/data/seed'

// Read side of the CRM.
//
// The site reads published designs and projects with the anon key, under RLS
// that only exposes rows flagged `published`. Pages are statically generated and
// revalidated, so a Supabase outage can't take the marketing site down with it —
// and if the CRM has nothing in it yet, we fall back to the seed content so the
// site is never blank.

export type Design = {
  id: string
  slug: string
  name: string
  published: boolean
  tagline?: string
  description?: string
  bedrooms?: number | null
  bathrooms?: number | null
  areaSqm?: number | null
  dimensions?: string
  priceFrom?: number | null
  publishPrice?: boolean
  priceNote?: string
  areaExact?: number | null
  moduleBase?: string
  heroImage?: string
  floorplanImage?: string
  gallery?: string[]
  inclusions?: string[]
  tourUrl?: string
}

export type Project = {
  id: string
  slug: string
  name: string
  published: boolean
  location?: string
  designName?: string
  category?: string
  description?: string
  heroImage?: string
  floorplanImage?: string
  gallery?: string[]
  completedAt?: string
}

// One hour: fresh enough that publishing a design shows up the same morning,
// slow enough that the site isn't hammering Supabase on every request.
export const revalidate = 3600

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function fetchTable<T>(table: string, fallback: T[]): Promise<T[]> {
  const sb = client()
  if (!sb) return fallback
  try {
    const { data, error } = await sb.from(table).select('id, data')
    if (error) {
      console.error(`crm: ${table} read failed —`, error.message)
      return fallback
    }
    const rows = (data ?? [])
      .map((r) => ({ ...(r.data as object), id: r.id }) as T)
      .filter((r) => (r as { slug?: string }).slug)
    // An empty table means "not populated yet", not "we have no designs".
    return rows.length ? rows : fallback
  } catch (err) {
    console.error(`crm: ${table} read threw —`, err)
    return fallback
  }
}

// Smallest first, so the catalogue reads as a progression rather than a jumble.
const bySize = (a: Design, b: Design) =>
  (a.bedrooms ?? 0) - (b.bedrooms ?? 0) || (a.areaSqm ?? 0) - (b.areaSqm ?? 0) || a.name.localeCompare(b.name)

export async function getDesigns(): Promise<Design[]> {
  const designs = await fetchTable<Design>('designs', SEED_DESIGNS)
  return designs.filter((d) => d.published !== false).sort(bySize)
}

export async function getDesign(slug: string): Promise<Design | null> {
  const designs = await getDesigns()
  return designs.find((d) => d.slug === slug) ?? null
}

export async function getProjects(): Promise<Project[]> {
  const projects = await fetchTable<Project>('projects', SEED_PROJECTS)
  return projects.filter((p) => p.published !== false)
}

export async function getProject(slug: string): Promise<Project | null> {
  const projects = await getProjects()
  return projects.find((p) => p.slug === slug) ?? null
}

// Designs that have a 3D walkthrough, for /3d-virtual-tours.
export async function getTours(): Promise<Design[]> {
  return (await getDesigns()).filter((d) => !!d.tourUrl)
}

// "2 Bed · 1 Bath · 40m²" — the one-line spec used on every card.
export function specLine(design: Design): string {
  return [
    design.bedrooms ? `${design.bedrooms} Bed` : null,
    design.bathrooms ? `${design.bathrooms} Bath` : null,
    design.areaSqm ? `${design.areaSqm}m²` : null,
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export function formatPrice(n?: number | null): string | null {
  if (!n) return null
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

/**
 * What the PUBLIC site is allowed to show for a design's price.
 *
 * 6Homes gate pricing behind the price-list download — that form is a large part
 * of how they capture leads, and publishing the figures would undercut it. The
 * numbers are in the CRM and in the generated price guide; this returns null
 * unless a design is explicitly marked publishPrice.
 */
export function publicPrice(design: Design): string | null {
  if (!design.publishPrice) return null
  return formatPrice(design.priceFrom)
}
