// The five documents. Each is a list of pages assembled from blocks.mjs, so the
// set reads as one family and a change to the design system reaches all of them.

import {
  document, page, cover, contents, designPage, priceTable, processPage,
  inclusionsPage, backCover, dim, esc,
} from './blocks.mjs'
import { T } from './theme.mjs'
import {
  COMPANY, INCLUSIONS, PROCESS, SPECIFICATION,
  INSTALL_ASSUMPTION, INSTALL_INCLUDES, INSTALL_EXCLUDES,
  resolveImage, specLine, money,
} from './data.mjs'

// Pick a cover photograph by preference, falling back to whatever exists.
const pickImage = (designs, projects, prefer = []) => {
  for (const slug of prefer) {
    const hit = [...projects, ...designs].find((x) => x.slug === slug)
    if (hit?.heroImage && resolveImage(hit.heroImage)) return hit.heroImage
  }
  return [...projects, ...designs].find((x) => resolveImage(x.heroImage))?.heroImage ?? null
}

// The factory document's three full-bleed plates. These were '/media/Install-4.png'
// until the migration re-encoded the library to JPEG, at which point the cover
// silently fell back to a flat teal rectangle — resolveImage returns null for a
// path that does not exist, and nothing downstream complained.
const FACTORY_SHOTS = ['/media/Factory-5.jpg', '/media/Install-4.jpg', '/media/Overhead-view.jpg']

/**
 * Every photograph that ends up as a cover plate or a full-bleed page, so the
 * build can prepare those at the cover tier rather than the thumbnail one.
 *
 * pickImage can land on any project or design hero depending on what the
 * migration produced, so all of them are listed rather than guessing. Preparing
 * more than get used costs build time, not document size — a variant nothing
 * references is never embedded.
 */
export function coverSources({ designs, projects }) {
  return [
    // The look book is full-bleed photography end to end, so its gallery shots
    // need the cover tier just as much as the covers do.
    ...projects.flatMap((p) => [p.heroImage, ...(p.gallery ?? [])]),
    ...designs.map((d) => d.heroImage),
    ...FACTORY_SHOTS,
  ].filter(Boolean)
}

/** A simple editorial page: heading, lead, then a two-column list. */
const listPage = (title, { eyebrow, lead, items, note, dark = false, panel = false, folio }) =>
  page(
    `<div class="eyebrow">${esc(eyebrow)}</div>
     <h2 class="display-s" style="margin-top:4mm;max-width:130mm">${esc(title)}</h2>
     ${lead ? `<p class="prose" style="margin-top:5mm;max-width:135mm">${esc(lead)}</p>` : ''}
     <div class="hr" style="margin-top:8mm"></div>
     ${items
       .map(
         (t, i) => `
       <div style="display:flex;gap:7mm;align-items:baseline;padding:3.6mm 0;border-bottom:.25mm solid ${dark ? 'rgba(255,255,255,.2)' : T.rule}">
         <span class="spec" style="color:${dark ? T.teal : T.tealDeep};width:9mm">${String(i + 1).padStart(2, '0')}</span>
         <span style="font-size:9.5pt;line-height:1.55">${esc(t)}</span>
       </div>`
       )
       .join('')}
     ${note ? `<p class="prose" style="margin-top:6mm;font-size:8pt;max-width:140mm">${esc(note)}</p>` : ''}
     <div class="grow"></div>`,
    { dark, panel, folio }
  )

// ── 1. Brochure ─────────────────────────────────────────────────────────────
export function brochure({ designs, projects }) {
  return document('6Homes Brochure', [
    cover({
      image: pickImage(designs, projects, ['boonah-qld', 'ballarat']),
      kicker: 'Australian modular homes',
      title: 'Homes for everyone, everywhere',
      subtitle:
        'Built in a factory to the millimetre, delivered finished, and installed in days. Not a kit and not a caravan — a permanent home that simply was not assembled in the weather.',
      note: `${designs.length} designs · 20—120 m²`,
    }),

    contents([
      { title: 'Why modular', blurb: 'What changes when a home is built under cover.' },
      { title: 'The range', blurb: `All ${designs.length} designs at a glance.` },
      { title: 'The designs', blurb: 'A page for each home, with floorplan and specification.' },
      { title: 'How a build runs', blurb: 'Eight stages, first call to keys.' },
      { title: 'Standard inclusions', blurb: 'What arrives on every home, every time.' },
      { title: 'Delivered', blurb: 'Homes already standing.' },
    ]),

    listPage('Three mechanisms, not a slogan', {
      eyebrow: 'Why modular',
      lead: 'Building on site means a year of trades, weather and waiting, and a price that moves the whole way through. Modular takes most of that out.',
      items: [
        'Weather stops mattering. Your home is built inside a factory — rain does not stop work, and no framing gets wet before it is closed in.',
        'Two jobs run at once. Foundations and services go in while the modules are built. Running them in parallel rather than in sequence is where the months come off.',
        'Quality becomes repeatable. The same team, the same jigs, the same checks on every home — a good result reproduced rather than dependent on who turned up.',
      ],
      panel: true,
      folio: { right: 'Why modular' },
    }),

    priceTable(designs, { showPrice: false }),
    ...designs.map((d) => designPage(d, { showPrice: false })),
    processPage(PROCESS),
    inclusionsPage(INCLUSIONS),
    ...projectSpread(projects),
    backCover(),
  ])
}

// ── 2. Information and Price Guide ──────────────────────────────────────────
export function priceGuide({ designs, projects }) {
  return document('6Homes Information and Price Guide', [
    cover({
      image: pickImage(designs, projects, ['ballarat', 'boonah-qld']),
      kicker: 'Information and price guide',
      title: 'What it costs, and what that covers',
      subtitle:
        'Installed pricing across the range, what the installation price does and does not include, and how permits and payments work.',
      note: 'Installed pricing',
    }),

    contents([
      { title: 'The range', blurb: 'Every home, every installed price.' },
      { title: 'What installation covers', blurb: 'Included, excluded, and what the price assumes.' },
      { title: 'How a build runs', blurb: 'Eight stages, first call to keys.' },
      { title: 'Standard inclusions', blurb: 'What arrives on every home.' },
      { title: 'The designs', blurb: 'Specification and floorplan for each.' },
    ]),

    priceTable(designs, { showPrice: true }),

    listPage('What the installed price covers', {
      eyebrow: 'Installation',
      lead: INSTALL_ASSUMPTION,
      items: INSTALL_INCLUDES,
      folio: { right: 'Installation' },
    }),

    listPage('What it does not cover', {
      eyebrow: 'Installation',
      lead: 'These are quoted separately once your site has been assessed, and invoiced as they arise. We would rather price them properly than guess at them here.',
      items: INSTALL_EXCLUDES,
      panel: true,
      folio: { right: 'Exclusions' },
    }),

    processPage(PROCESS),
    inclusionsPage(INCLUSIONS),
    ...designs.map((d) => designPage(d, { showPrice: true })),
    backCover(),
  ])
}

// ── 3. Look Book ────────────────────────────────────────────────────────────
// Photography-led. Type gets out of the way — one line of annotation per spread.
export function lookBook({ designs, projects }) {
  const shots = []
  for (const p of projects) {
    const imgs = [p.heroImage, ...(p.gallery ?? [])].map(resolveImage).filter(Boolean)
    if (imgs.length) shots.push({ subject: p, images: imgs })
  }

  const fullBleed = (src, label, sub) =>
    page(
      `<img class="bleed" src="${src}" alt="">
       <div class="bleed" style="background:linear-gradient(180deg,rgba(15,26,30,0) 55%,rgba(15,26,30,.8) 100%)"></div>
       <div style="position:absolute;left:18mm;right:18mm;bottom:16mm">
         ${dim(label, true)}
         ${sub ? `<div class="display-x" style="color:#fff;margin-top:5mm">${esc(sub)}</div>` : ''}
       </div>`,
      { bare: true }
    )

  const pair = (a, b, caption) =>
    page(
      `<div class="row" style="flex:1;gap:5mm">
         <div class="col frame">${a ? `<img class="fit" src="${a}" alt="">` : ''}</div>
         <div class="col frame">${b ? `<img class="fit" src="${b}" alt="">` : ''}</div>
       </div>
       <div style="margin-top:6mm">${dim(caption)}</div>`,
      { folio: { right: caption } }
    )

  const pages = []
  for (const s of shots) {
    const loc = s.subject.location ?? s.subject.name
    pages.push(fullBleed(s.images[0], loc, `${s.subject.designName ?? ''} ${s.subject.category ? `· ${s.subject.category}` : ''}`.trim()))
    if (s.images.length > 1) pages.push(pair(s.images[1], s.images[2], loc))
  }

  return document('6Homes Look Book', [
    cover({
      image: pickImage(designs, projects, ['boonah-qld']),
      kicker: 'Look book',
      title: 'Homes already standing',
      subtitle: 'The same designs on real blocks — bushland, back gardens, sloping sites and tourism parks.',
      note: `${projects.length} projects`,
    }),
    ...pages,
    backCover(),
  ])
}

// ── 4. Product Guide ────────────────────────────────────────────────────────
// The full catalogue: every model, plus the construction specification that
// separates these from a container conversion.
export function productGuide({ designs, projects }) {
  const specPages = SPECIFICATION.map((section) =>
    listPage(section.title, {
      eyebrow: 'Construction specification',
      lead: undefined,
      items: section.items,
      note: section.note,
      folio: { right: section.title },
    })
  )

  return document('6Homes Product Guide', [
    cover({
      image: pickImage(designs, projects, ['ballarat', 'boonah-qld']),
      kicker: 'Product guide',
      title: 'Every home, in full',
      subtitle: `The complete ${designs.length}-design range with floorplans, specifications and how each one is built.`,
      note: '20—120 m²',
    }),

    contents([
      { title: 'The range', blurb: 'All designs at a glance.' },
      { title: 'The designs', blurb: 'A page each, with floorplan and specification.' },
      { title: 'Construction specification', blurb: 'Structure, insulation, glazing and fit-out.' },
      { title: 'Standard inclusions', blurb: 'What arrives on every home.' },
      { title: 'How a build runs', blurb: 'Eight stages, first call to keys.' },
    ]),

    priceTable(designs, { showPrice: false }),
    ...designs.map((d) => designPage(d, { showPrice: false })),
    ...specPages,
    inclusionsPage(INCLUSIONS),
    processPage(PROCESS),
    backCover(),
  ])
}

// ── 5. Factory Introduction ─────────────────────────────────────────────────
// For commercial and developer enquiries: capability, method, and the structural
// argument. Deliberately kept small enough to attach to an email.
export function factory({ designs, projects }) {
  const factoryShot = FACTORY_SHOTS.map(resolveImage).filter(Boolean)

  const photoPage = (src, label) =>
    page(
      `<img class="bleed" src="${src}" alt="">
       <div class="bleed" style="background:linear-gradient(180deg,rgba(15,26,30,0) 55%,rgba(15,26,30,.78) 100%)"></div>
       <div style="position:absolute;left:18mm;right:18mm;bottom:16mm">${dim(label, true)}</div>`,
      { bare: true }
    )

  return document('6Homes Factory Introduction', [
    cover({
      image: FACTORY_SHOTS[1],
      kicker: 'Manufacturing capability',
      title: 'Built under cover, installed in days',
      subtitle:
        'For accommodation villages, tourism cabins, worker housing and multi-dwelling developments — where programme certainty matters more than anything.',
      note: 'Commercial and multi-unit',
    }),

    listPage('Why this suits a development programme', {
      eyebrow: 'The case',
      lead: 'On a multi-unit programme the risk is not the build, it is the schedule. Modular removes most of what makes a schedule slip.',
      items: [
        'Manufacture runs in parallel with site works, rather than after them — the two critical paths become one.',
        'Weather cannot stop the build. Nothing is exposed, and no trade is waiting on a dry week.',
        'Repeatable units mean repeatable cost. The tenth unit is built the same way, by the same team, to the same checks as the first.',
        'On-site installation is measured in days, which cuts disruption, traffic management and neighbour impact.',
        'One contracting party is answerable for design, manufacture, delivery and installation.',
      ],
      panel: true,
      folio: { right: 'The case' },
    }),

    ...(factoryShot[0] ? [photoPage(factoryShot[0], 'Factory floor · steel carcass under construction')] : []),

    ...SPECIFICATION.map((section) =>
      listPage(section.title, {
        eyebrow: 'Construction specification',
        items: section.items,
        note: section.note,
        folio: { right: section.title },
      })
    ),

    ...(factoryShot[1] ? [photoPage(factoryShot[1], 'Installation · craned onto footings')] : []),

    priceTable(designs, { showPrice: false }),
    inclusionsPage(INCLUSIONS),
    processPage(PROCESS),
    backCover(),
  ])
}

// A closing spread of completed work, for the brochure.
function projectSpread(projects) {
  const withImages = projects.filter((p) => resolveImage(p.heroImage)).slice(0, 6)
  if (!withImages.length) return []

  const tile = (p) => `
    <div style="width:calc(50% - 3mm)">
      <div class="frame" style="height:52mm"><img class="fit" src="${resolveImage(p.heroImage)}" alt=""></div>
      <div class="spec" style="color:${T.tealDeep};margin-top:3mm">${esc(p.location ?? p.name)}</div>
      <div class="display-x" style="margin-top:1.5mm">${esc(p.designName ?? p.name)}</div>
      <div class="prose" style="font-size:8pt">${esc(p.category ?? '')}</div>
    </div>`

  return [
    page(
      `<div class="eyebrow">Delivered</div>
       <h2 class="display-s" style="margin-top:4mm">Homes already standing</h2>
       <div style="display:flex;flex-wrap:wrap;gap:6mm;margin-top:8mm">${withImages.map(tile).join('')}</div>
       <div class="grow"></div>
       ${dim('Victoria · Queensland · Tasmania')}`,
      { folio: { right: 'Projects' } }
    ),
  ]
}

export const DOCUMENTS = {
  'brochure': { build: brochure, file: '6homes-brochure.pdf', label: 'Brochure' },
  'price-guide': { build: priceGuide, file: '6homes-price-list.pdf', label: 'Information and Price Guide' },
  'look-book': { build: lookBook, file: '6homes-look-book.pdf', label: 'Look Book' },
  'product-guide': { build: productGuide, file: '6homes-product-guide.pdf', label: 'Product Guide' },
  'factory': { build: factory, file: '6homes-factory-introduction.pdf', label: 'Factory Introduction' },
}
