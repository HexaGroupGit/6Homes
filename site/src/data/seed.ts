import type { Design, Project } from '@/lib/crm'
import MEDIA from './migrated-media.json'

// Seed content, carried over from the WordPress site.
//
// The CRM is the source of truth once designs and projects are entered there —
// these are what the site falls back to while it's still being populated, and
// they're also what the migration script writes into Supabase. Either way the
// site is never empty, which matters because it's replacing a live one.

// Everything scripts/migrate-wordpress.mjs pulled off the old site — photography,
// tour URLs, prices, exact areas — merged in by slug. Once a design exists in the
// CRM its own record wins; this keeps the site correct in the meantime.
type Migrated = Partial<Design & Project>
const migrated = MEDIA as Record<string, Migrated>

function withMigrated<T extends { slug: string }>(rows: T[]): T[] {
  return rows.map((row) => {
    const m = migrated[row.slug]
    if (!m) return row
    // Undefined keys in the manifest must not blank a value the seed sets.
    const patch = Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined))
    return { ...row, ...patch, gallery: m.gallery ?? [] } as T
  })
}

const DESIGNS: Design[] = [
  {
    id: 'seed-elsey', slug: 'elsey', name: 'Elsey', published: true,
    bedrooms: 1, bathrooms: 1, areaSqm: 20,
    tagline: 'Small, complete, and genuinely liveable',
    description:
      'Our most compact home. One bedroom, one bathroom and an open living space in twenty square metres — enough for a studio, a guest suite, a short-stay rental or a first step onto a block you already own.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-alton', slug: 'alton', name: 'Alton', published: true,
    bedrooms: 1, bathrooms: 1, areaSqm: 30,
    tagline: 'Room to breathe in a single-bedroom plan',
    description:
      'Thirty square metres arranged around a proper living area, so a one-bedroom home stops feeling like a room with a kitchen in it.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-avon', slug: 'avon', name: 'Avon', published: true,
    bedrooms: 1, bathrooms: 1, areaSqm: 30,
    tagline: 'The same footprint, a different way of living in it',
    description:
      'An alternative thirty-square-metre layout to the Alton, with the living and sleeping zones separated differently. Which one suits comes down to your block and your outlook.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-belford', slug: 'belford', name: 'Belford', published: true,
    bedrooms: 1, bathrooms: 1, areaSqm: 40,
    tagline: 'A full home at one-bedroom scale',
    description:
      'Forty square metres with a generous bedroom, a full bathroom and a living and kitchen space that works for more than one person. Popular as a granny flat and as a permanent single-residential home.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-murray', slug: 'murray', name: 'Murray', published: true,
    bedrooms: 2, bathrooms: 1, areaSqm: 40,
    tagline: 'Two bedrooms without the footprint',
    description:
      'Two bedrooms in forty square metres — our most efficient plan and the one that turns up most often in our completed projects, from granny flats to short-stay accommodation.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-selina', slug: 'selina', name: 'Selina', published: true,
    bedrooms: 2, bathrooms: 2, areaSqm: 60,
    dimensions: '2.0m x 4.8m modules',
    tagline: 'Double the comfort, perfectly balanced',
    description:
      'Two well-sized bedrooms, each with its own ensuite, positioned either side of a central living and kitchen area. It works as well for two households sharing as it does for a couple with regular guests. An external deck is available.',
    inclusions: [
      'Oven, stove and dishwasher',
      'All internals completed in the factory',
      'Built-in roof and downpipes',
    ],
    gallery: [],
  },
  {
    id: 'seed-norfolk', slug: 'norfolk', name: 'Norfolk', published: true,
    bedrooms: 2, bathrooms: 1, areaSqm: 80,
    tagline: 'Two bedrooms, and space to actually live',
    description:
      'Eighty square metres over two bedrooms, which puts the space into the living areas rather than the bedroom count. A comfortable permanent home for one or two people.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-miranda', slug: 'miranda', name: 'Miranda', published: true,
    bedrooms: 3, bathrooms: 2, areaSqm: 80,
    tagline: 'A three-bedroom family plan',
    description:
      'Three bedrooms and two bathrooms in eighty square metres. Planned so the second bathroom does real work at the busy end of the morning.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-dawson', slug: 'dawson', name: 'Dawson', published: true,
    bedrooms: 3, bathrooms: 2, areaSqm: 80,
    tagline: 'Three bedrooms, arranged differently',
    description:
      'The same size and bedroom count as the Miranda with a different arrangement — worth comparing the two floorplans side by side against your block and its aspect.',
    inclusions: [], gallery: [],
  },
  {
    id: 'seed-claremont', slug: 'claremont', name: 'Claremont', published: true,
    bedrooms: 4, bathrooms: 2, areaSqm: 120,
    tagline: 'Our largest home',
    description:
      'Four bedrooms, two bathrooms and one hundred and twenty square metres — a full family home, delivered as modules and installed in days rather than built on site over a year.',
    inclusions: [], gallery: [],
  },
]

const PROJECTS: Project[] = [
  { id: 'seed-p1', slug: 'lockyer-valley', name: 'Lockyer Valley', published: true, location: 'Lockyer Valley, QLD', designName: 'Miranda', category: 'Wedding accommodation', gallery: [] },
  { id: 'seed-p2', slug: 'ipswich', name: 'Ipswich', published: true, location: 'Ipswich, QLD', designName: 'Murray', category: 'Single residential', gallery: [] },
  { id: 'seed-p3', slug: 'ballarat', name: 'Ballarat', published: true, location: 'Ballarat, VIC', designName: 'Murray', category: 'Granny flat', gallery: [] },
  { id: 'seed-p4', slug: 'woodside-beach', name: 'Woodside Beach', published: true, location: 'Woodside Beach, VIC', designName: 'Belford', category: 'Single residential', gallery: [] },
  { id: 'seed-p5', slug: 'brisbane', name: 'Brisbane City Living', published: true, location: 'Brisbane, QLD', designName: 'City Living', category: 'Double residential', gallery: [] },
  { id: 'seed-p6', slug: 'boonah-qld', name: 'Boonah', published: true, location: 'Boonah, QLD', designName: 'Selina', category: 'Off-grid', gallery: [] },
  { id: 'seed-p7', slug: 'redbank-valley', name: 'Redbank Valley', published: true, location: 'Redbank Valley, QLD', designName: 'Elsey', category: 'Hotel', gallery: [] },
  { id: 'seed-p8', slug: 'brisbane-2', name: 'Brisbane Airbnb', published: true, location: 'Brisbane, QLD', designName: 'Elsey', category: 'Airbnb', gallery: [] },
  { id: 'seed-p9', slug: 'tasmania', name: 'Tasmania', published: true, location: 'Tasmania', designName: 'Murray', category: 'Airbnb', gallery: [] },
]

export const SEED_DESIGNS = withMigrated(DESIGNS)
export const SEED_PROJECTS = withMigrated(PROJECTS)
