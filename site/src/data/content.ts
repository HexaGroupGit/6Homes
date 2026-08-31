// Site-wide copy and structured content. Kept here rather than in the CRM
// because it's marketing copy, not operational data — it changes with a deploy,
// not with a sales conversation.

export const COMPANY = {
  name: '6Homes',
  legalName: '6Homes Pty Ltd',
  tagline: 'Homes for everyone, everywhere',
  intro:
    '6Homes is a proud Australian company designing and delivering high-quality modular homes at affordable prices, customised to your style.',
  phone: '1800 6HOMES',
  phoneDigits: '646 637',
  phoneHref: 'tel:1800646637',
  email: 'info@6homes.com',
  headOffice: '4/830 Whitehorse Road, Box Hill VIC 3128',
  showroom: '878 Whitehorse Road, Box Hill VIC 3128',
  showroomMapUrl: 'https://maps.google.com/?q=878+Whitehorse+Road+Box+Hill+VIC+3128',
  social: {
    instagram: 'https://www.instagram.com/6homes',
    linkedin: 'https://www.linkedin.com/company/6homes',
    facebook: 'https://www.facebook.com/6homes',
    x: 'https://x.com/6homes',
  },
} as const

export const NAV = [
  { href: '/models', label: 'Our Designs' },
  { href: '/projects', label: 'Projects' },
  { href: '/3d-virtual-tours', label: '3D Virtual Tours' },
  { href: '/services', label: 'Services' },
  { href: '/our-process', label: 'Our Process' },
  { href: '/contact', label: 'Contact' },
] as const

// The homepage's short version of the build process.
export const BUILD_STEPS = [
  { n: '01', title: 'Showroom Visit', body: 'Visit our Melbourne showroom to explore finishes, layouts, and what is possible with 6Homes.' },
  { n: '02', title: 'Determine Site Specifics', body: 'We assess your land, zoning and access to make sure your design fits the block properly.' },
  { n: '03', title: 'Design', body: 'Work with our team to customise the look, layout and inclusions of your new home.' },
  { n: '04', title: 'Order / Purchase', body: 'Once your plans are finalised we lock in pricing and move forward with approvals.' },
  { n: '05', title: 'Manufacture', body: 'Your home is built in our off-site facility with precision, care and quality control.' },
  { n: '06', title: 'Shipping & Installation', body: 'We deliver your home and complete onsite setup — ready for you to move in.' },
] as const

// The full eight-stage version, for /our-process.
export const PROCESS_STEPS = [
  {
    n: '01',
    title: 'Initial Consultation',
    body: 'Begin with a free consultation to discuss your vision, requirements and preferences. This conversation helps us understand your needs and give you tailored advice for your modular home project.',
  },
  {
    n: '02',
    title: 'Design Selection and Customisation',
    body: 'Choose your preferred design from our range, then work with our team to customise interior finishes, fixtures and fittings so the home matches your style and how you actually live.',
  },
  {
    n: '03',
    title: 'Site Assessment',
    body: 'We evaluate your property — soil conditions, accessibility, local regulations. This confirms the project is feasible and tells us exactly what preparation your site needs.',
  },
  {
    n: '04',
    title: 'Permits and Approvals',
    body: 'We assist in obtaining every required permit and approval, including planning and building permits, and navigate the regulatory side so the approval process does not stall your build.',
  },
  {
    n: '05',
    title: 'Construction',
    body: 'Construction begins in our controlled factory environment, which means precision, efficiency and strict quality control. We send regular updates and progress photos throughout.',
  },
  {
    n: '06',
    title: 'Site Preparation',
    body: 'While your home is being built, our team prepares your site — laying foundations and putting services in place. Running these in parallel is what takes months off the timeline.',
  },
  {
    n: '07',
    title: 'Delivery and Installation',
    body: 'Your completed home is transported to site and installed by our team, ready for occupancy shortly after installation.',
  },
  {
    n: '08',
    title: 'Handover',
    body: 'After final inspections and approvals, we hand over the keys to your new modular home.',
  },
] as const

export const INCLUSIONS = [
  'Double-glazed windows and doors',
  'Designer kitchens and bathrooms',
  'Your choice of tapware finishes',
  'Energy-efficient insulation',
  'Turnkey service from permits to handover',
] as const

export const SERVICES = [
  {
    slug: 'residential',
    title: 'Residential',
    body: 'From backyard studios to full family homes, we create modular spaces designed to suit your land, lifestyle and budget.',
    intent: 'domestic' as const,
    cta: 'Project enquiry',
  },
  {
    slug: 'commercial',
    title: 'Commercial',
    body: 'Whether it is a display suite, Airbnb accommodation or a multi-unit development, our team builds smart commercial spaces with speed and precision.',
    intent: 'commercial' as const,
    cta: 'Commercial enquiry',
  },
] as const

export const FAQS = [
  {
    q: 'How long does it take to receive my modular home?',
    a: 'Subject to design and site constraints, a modular home can be delivered approximately four months from the moment layouts, finishes and fixtures have been selected, signed off and deposits paid.',
  },
  {
    q: 'How do I finance it?',
    a: 'Modular construction often requires the majority or entirety of payment upfront. We have partnered with finance teams so more flexible payment terms can be made available. A consultation can be arranged to explore your finance options.',
  },
  {
    q: 'What permits do I need?',
    a: 'If a planning permit application is required for your property, our team of planners can assist you throughout the process. In some cases all you will need is a building permit — our team can advise on this too.',
  },
  {
    q: 'Can I make changes to the floorplan?',
    a: 'Yes. We know our standard layouts will not suit every site or every household, so we work through what can be changed within the module structure and show you what is possible.',
  },
  {
    q: 'What distinguishes modular homes from traditional site-built homes?',
    a: 'Modular homes are constructed in a factory using advanced techniques, which means precision and quality control, then transported and assembled on a permanent foundation. Traditional homes are built entirely on site, which means longer build times and weather delays. Both meet the same building codes and standards.',
  },
  {
    q: 'Are modular homes the same as kit homes?',
    a: 'No. Modular homes are fully constructed in sections in a factory — electrical, plumbing and interior finishes included — before being transported and assembled on site. Kit homes are a package of materials delivered for assembly entirely on site.',
  },
  {
    q: 'How much does it cost to transport the home to my site?',
    a: 'Transport costs vary with distance, access and craneage requirements. We quote this properly after your site assessment rather than guessing at it up front.',
  },
] as const

// Matterport walkthroughs that do not belong to a published design.
//
// The old site carried three tours: Murray, Selina and Darling. The first two
// map to designs in the range and their tour lives on the design record. Darling
// is not in the published range — it appears only in the internal 17-model
// list — so it has nowhere to hang, but the tour is real and was public, so it
// is kept here rather than quietly dropped.
export const EXTRA_TOURS = [
  {
    name: 'Darling',
    tourUrl: 'https://my.matterport.com/show/?m=T6UhZq4wzJt',
    note: 'Available on request — not part of the standard range.',
  },
] as const
