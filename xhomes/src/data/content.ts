// X-Homes site content — the company's own copy from x-homes.com.au, tightened
// for the new structure (and their "singe dwelling" typo repaired). Facts and
// figures are theirs verbatim: 600+ townhouses, 200+ combined years, Tom's
// 2,000 homes over 20 years.

export const COMPANY = {
  name: 'XHomes',
  tagline: 'Building with excellence',
  phone: '(03) 7018 2130',
  phoneHref: 'tel:0370182130',
  email: 'accounts@x-homes.com.au',
  address: 'L2, 10 Queen Street, Melbourne VIC 3000',
  mapsUrl: 'https://maps.app.goo.gl/j1d6iEjSVwhVDyBe7',
  blurb:
    'A premier Melbourne construction company specialising in premium townhouse projects and single dwelling homes — craftsmanship first, delivered with precision and care.',
}

export const STATS = [
  { value: 600, suffix: '+', label: 'Townhouses delivered' },
  { value: 2000, suffix: '+', label: 'Homes Tom has helped deliver' },
  { value: 200, suffix: '+', label: 'Years of combined experience' },
  { value: 20, suffix: '', label: 'Years leading in construction' },
] as const

export const REASONS = [
  {
    n: '01',
    title: 'Proven at scale',
    body: 'More than 600 townhouses delivered across masterplanned communities and bespoke developments. The team has done this before — many times, at every scale.',
  },
  {
    n: '02',
    title: 'Led from the front',
    body: 'XHomes is led by Tom Maidment — twenty years in property and construction, more than 2,000 homes delivered, and a habit of building strong teams that run projects properly.',
  },
  {
    n: '03',
    title: 'No shortcuts',
    body: 'Well-designed, well-built homes, with the stress taken out of the process. Not the biggest builder — the one people trust to get it right.',
  },
] as const

export const SERVICES = [
  {
    n: '01',
    title: 'Project construction',
    body: 'From large-scale masterplanned communities to bespoke developments — delivered professionally, efficiently, and to the highest standard.',
    image: '/media/xh-facade-lowangle.jpg',
    imageAlt: 'Contemporary three-storey townhouse facades with timber-lined entry',
  },
  {
    n: '02',
    title: 'New home builds',
    body: 'Premium floor plans, built efficiently and cost-effectively — on land you own, or on a site we help you secure within a new estate.',
    image: '/media/xh-hero-street.jpg',
    imageAlt: 'A completed XHomes townhouse street',
  },
  {
    n: '03',
    title: 'Architecture & design',
    body: 'We collaborate with leading architects and project teams so every home is expertly designed before a single trade sets foot on site.',
    image: '/media/xh-design-wireframe.jpg',
    imageAlt: 'An interior resolving from wireframe sketch into a finished render',
  },
  {
    n: '04',
    title: 'Interiors & lifestyle',
    body: 'Timeless interiors with sophisticated finishes — smart layouts and inviting spaces that make everyday living effortless, whether entertaining or working from home.',
    image: '/media/xh-elgar-kitchen.jpg',
    imageAlt: 'Dark luxury kitchen with grey marble waterfall island',
  },
] as const

export type Scheme = { label: string; image: string }

export const PROJECTS = [
  {
    slug: 'kinsfolk',
    name: 'Kinsfolk',
    place: 'Doveton',
    status: 'Completed · Stages 1 & 2',
    body: 'A completed townhouse community — crisp white and charcoal forms, breeze-block screens and landscaped streets, photographed as built, not as imagined.',
    hero: '/media/kinsfolk-s2-dji-0808.jpg',
    tiles: ['/media/kinsfolk-s2-dji-0823.jpg', '/media/kinsfolk-s1-kinsfolk-6.jpg', '/media/kinsfolk-s2-bzp1033.jpg'],
  },
  {
    slug: 'lumina',
    name: 'Lumina',
    place: 'Wollert',
    status: 'Townhome community',
    body: 'Streetscapes built around a central park — jacarandas, play spaces and a green spine running through every stage. Interiors come in two schemes; see both below.',
    hero: '/media/lumina-ea01-central-park-a3rgb.jpg',
    tiles: ['/media/lumina-e02-type-b-townhome-streetscape-a3rgb.jpg', '/media/lumina-e06-type-a-townhome-streetscape-a3rgb.jpg', '/media/lumina-in03-living-dining-type-f-a3rgb.jpg'],
    schemes: {
      light: { label: 'Light scheme', image: '/media/lumina-in01-kitchen-type-f-a3rgb.jpg' },
      dark: { label: 'Dark scheme', image: '/media/lumina-in01-kitchen-type-f-dark-a3rgb.jpg' },
    },
  },
  {
    slug: 'berwick-views',
    name: 'Berwick Views',
    place: 'Berwick',
    status: 'In planning',
    body: 'The next release — townhouse types now moving through design. Register interest and be first through the door.',
    hero: '/media/berwick-tp05-10-townhouses-type-b-floor-plans-a.jpg',
    tiles: [],
  },
] as const

export const QUOTE = {
  text: 'We’re not interested in being the biggest builder — just one that people can trust to get it right.',
  attribution: 'Tom Maidment — Director, XHomes',
}

export const PROCESS = [
  'First conversation and site review',
  'Feasibility, budget and program',
  'Architecture and interior design',
  'Permits and authority approvals',
  'Construction, properly run',
  'Handover, and a home that lasts',
] as const
