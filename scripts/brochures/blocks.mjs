// Shared page components. Every document is assembled from these, so the five
// brochures stay one family rather than five separate designs.

import { css, PAGE, T } from './theme.mjs'
import { COMPANY, resolveImage, imageAspect, specLine, money } from './data.mjs'

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The signature dimension rule. `light` for use over a photograph. */
export const dim = (label, light = false) =>
  `<div class="dim${light ? ' light' : ''}"><i></i><s></s><span>${esc(label)}</span><s></s><i></i></div>`

/**
 * The real lockup, from the brand pack.
 *
 * `white` picks the actual white artwork rather than trying to recolour the
 * colour one — the wordmark carries its fill inside the SVG.
 */
export const wordmark = (white = false) => {
  const s = white ? '-white' : ''
  const mark = resolveImage(`/brand/mark${s}.svg`)
  const word = resolveImage(`/brand/wordmark${s}.svg`)
  if (!mark || !word) return `<span class="wordmark" style="color:${white ? '#fff' : T.navy}">6HOMES</span>`
  return `<span style="display:inline-flex;align-items:center;gap:3mm">
    <img src="${mark}" alt="" style="height:11mm;display:block">
    <img src="${word}" alt="6Homes" style="height:6.4mm;display:block">
  </span>`
}

/** One A4 sheet. `bare` skips the padded frame for full-bleed pages. */
export const page = (inner, { dark = false, panel = false, bare = false, folio = null } = {}) => `
  <section class="page${dark ? ' dark' : ''}${panel ? ' panel' : ''}">
    ${bare ? inner : `<div class="pad">${inner}</div>`}
    ${folio ? `<div class="folio"><span>${esc(folio.left ?? COMPANY.name)}</span><span>${esc(folio.right ?? '')}</span></div>` : ''}
  </section>`

/**
 * Cover: a photograph at its own proportions, then the title block on solid
 * ground beneath it.
 *
 * This was a full-bleed photograph. Every cover source is landscape — 1920x1080
 * and similar — and cropping one into portrait A4 keeps only a narrow vertical
 * slice: 764px of the 1920 stretched across 210mm, which is 92 dpi, and less
 * once the old thumbnail cap had been applied. The band is sized to the
 * picture's own aspect ratio instead, so nothing is thrown away and the whole
 * 1920px spans the page at 232 dpi.
 */
export function cover({ image, kicker, title, subtitle, note }) {
  const src = resolveImage(image, 'cover')
  const aspect = imageAspect(image) ?? 16 / 9
  // Clamped at both ends: a panorama should not thin into a stripe, and a
  // squarer picture must not push the title block off the foot of the page.
  const bandH = Math.max(100, Math.min(132, PAGE.w / aspect))

  return page(
    `<div class="bleed" style="background:${T.deep}"></div>
     <div style="position:absolute;top:34mm;left:0;right:0;height:${bandH}mm;overflow:hidden;background:${T.deep2}">
       ${src ? `<img class="fit" src="${src}" alt="">` : ''}
     </div>
     <div style="position:absolute;inset:0;padding:${PAGE.margin}mm;display:flex;flex-direction:column">
       <div style="font-size:13pt">${wordmark(true)}</div>
       <div class="grow"></div>
       ${kicker ? `<div class="spec" style="color:${T.teal};margin-bottom:6mm">${esc(kicker)}</div>` : ''}
       <h1 class="display" style="color:#fff;max-width:165mm">${esc(title)}</h1>
       ${subtitle ? `<p class="lead" style="color:rgba(255,255,255,.85);margin-top:7mm;max-width:140mm">${esc(subtitle)}</p>` : ''}
       ${note ? `<div style="margin-top:10mm">${dim(note, true)}</div>` : ''}
     </div>`,
    { bare: true }
  )
}

/** Contents page — numbered, because a document's sections are an order. */
export function contents(items, { title = 'Contents' } = {}) {
  return page(
    `<div class="eyebrow">${esc(title)}</div>
     <h2 class="display-s" style="margin-top:5mm">What is in here</h2>
     <div class="hr" style="margin:10mm 0 0"></div>
     ${items
       .map(
         (it, i) => `
       <div style="display:flex;gap:8mm;align-items:baseline;padding:5mm 0;border-bottom:.25mm solid ${T.rule}">
         <span class="data" style="color:${T.tealDeep};width:10mm">${String(i + 1).padStart(2, '0')}</span>
         <span class="display-x" style="flex:1">${esc(it.title)}</span>
         <span class="prose" style="flex:1.4;font-size:8.5pt">${esc(it.blurb ?? '')}</span>
       </div>`
       )
       .join('')}
     <div class="grow"></div>
     ${dim(COMPANY.tagline)}`,
    { folio: { right: 'Contents' } }
  )
}

/**
 * A full design spread: photograph and specification across the top, then the
 * floorplan across the full width of the page.
 *
 * The floorplan used to share a two-column row with the specification, which
 * printed it at 71 x 47mm — under three inches wide, with dimension text and
 * room labels far too small to read. It is line art, and its whole purpose is
 * to be read, so it now gets the full measure: 159 x 106mm, five times the
 * area. The 1920px drawing lands at just over 300 dpi there.
 */
export function designPage(d, { showPrice = true, folio } = {}) {
  const hero = resolveImage(d.heroImage)
  const plan = resolveImage(d.floorplanImage)
  const price = showPrice ? money(d.priceFrom) : null

  const rows = [
    d.bedrooms ? ['Bedrooms', d.bedrooms] : null,
    d.bathrooms ? ['Bathrooms', d.bathrooms] : null,
    d.areaSqm ? ['Internal area', `${d.areaExact ?? d.areaSqm} m²`] : null,
    d.moduleBase ? ['Modules', d.moduleBase] : null,
    showPrice ? ['Installed price', price ?? (d.priceNote || 'POA')] : null,
  ].filter(Boolean)

  return page(
    `<div class="eyebrow">${esc(specLine(d))}</div>
     <h2 class="display-s" style="margin-top:4mm">${esc(d.name)}</h2>
     ${d.tagline ? `<p class="prose" style="margin-top:3mm;max-width:120mm">${esc(d.tagline)}</p>` : ''}

     <div class="row" style="margin-top:6mm;align-items:stretch">
       <div class="frame" style="flex:1.15;min-width:0;height:78mm">
         ${hero ? `<img class="fit" src="${hero}" alt="">` : ''}
       </div>
       <div class="col" style="flex:1">
         <table class="spec-table">
           ${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
         </table>
         ${d.description ? `<p class="prose" style="margin-top:4mm;font-size:8.5pt">${esc(d.description)}</p>` : ''}
       </div>
     </div>

     ${
       plan
         ? `<div class="spec" style="color:${T.mute};margin-top:7mm;margin-bottom:3mm">Floorplan</div>
            <div style="background:#fff;padding:4mm;height:114mm"><img class="contain" src="${plan}" alt=""></div>`
         : ''
     }

     <div class="grow"></div>
     <div>${dim(`${d.areaExact ?? d.areaSqm} m²`)}</div>`,
    { folio: folio ?? { right: d.name } }
  )
}

/** The whole range as one table — the spread people compare on. */
export function priceTable(designs, { showPrice = true } = {}) {
  const groups = [
    { beds: 1, label: 'One bedroom' },
    { beds: 2, label: 'Two bedrooms' },
    { beds: 3, label: 'Three bedrooms' },
    { beds: 4, label: 'Four bedrooms' },
  ]
    .map((g) => ({ ...g, items: designs.filter((d) => d.bedrooms === g.beds) }))
    .filter((g) => g.items.length)

  const row = (d) => `
    <tr>
      <td style="font-family:'Archivo';font-variation-settings:'wdth' 114,'wght' 700;font-size:11pt;text-transform:uppercase;letter-spacing:0;color:${T.navy}">${esc(d.name)}</td>
      <td style="text-align:left">${d.bedrooms ?? '—'}</td>
      <td style="text-align:left">${d.bathrooms ?? '—'}</td>
      <td style="text-align:left">${d.areaExact ?? d.areaSqm ?? '—'} m²</td>
      ${showPrice ? `<td>${esc(money(d.priceFrom) ?? d.priceNote ?? 'POA')}</td>` : ''}
    </tr>`

  return page(
    `<div class="eyebrow">${showPrice ? 'Modular price list · installed' : 'The range'}</div>
     <h2 class="display-s" style="margin-top:4mm">${showPrice ? 'Every home, every price' : 'Every home in the range'}</h2>

     ${groups
       .map(
         (g) => `
       <div style="margin-top:8mm">
         <div class="spec" style="color:${T.tealDeep}">${esc(g.label)}</div>
         <table class="spec-table" style="margin-top:2mm">
           <tr style="border-bottom:.25mm solid ${T.rule}">
             <td style="width:44mm">Model</td><td style="text-align:left;width:16mm">Bed</td>
             <td style="text-align:left;width:16mm">Bath</td><td style="text-align:left;width:24mm">Area</td>
             ${showPrice ? '<td>Installed</td>' : ''}
           </tr>
           ${g.items.map(row).join('')}
         </table>
       </div>`
       )
       .join('')}

     <div class="grow"></div>
     <p class="prose" style="font-size:7pt;line-height:1.6">
       Prices shown are list prices and are subject to change without notice, including for cost increases in
       imported product, raw materials or currency movement. Installed price covers delivery and installation of the
       modules; it does not cover site works, which vary with access, slope, services and council requirements, nor
       third-party reports such as soil tests, bushfire management plans or land capability assessments — these are
       quoted after a site assessment and invoiced as incurred. Floorplans and specifications may be varied without
       notice; dimensions are approximate. Furniture, floor coverings, window furnishings, landscaping, fencing,
       driveways and decking are indicative only and not included unless separately listed.
     </p>`,
    { folio: { right: showPrice ? 'Price list' : 'The range' } }
  )
}

/** The build process. Numbered because it genuinely is a sequence. */
export function processPage(steps) {
  return page(
    `<div class="eyebrow">How a build runs</div>
     <h2 class="display-s" style="margin-top:4mm">First call to keys</h2>
     <div class="hr" style="margin-top:8mm"></div>
     ${steps
       .map(
         (s) => `
       <div style="display:flex;gap:7mm;padding:4.2mm 0;border-bottom:.25mm solid ${T.rule}">
         <span class="data" style="color:${T.tealDeep};width:9mm">${esc(s.n)}</span>
         <div style="flex:1">
           <div class="display-x">${esc(s.title)}</div>
           <p class="prose" style="margin-top:1.5mm;font-size:8.5pt">${esc(s.body)}</p>
         </div>
       </div>`
       )
       .join('')}
     <div class="grow"></div>
     ${dim('Approx. 4 months')}`,
    { panel: true, folio: { right: 'Process' } }
  )
}

/** Inclusions, on the dark field. */
export function inclusionsPage(items) {
  return page(
    `<div class="eyebrow">Standard, always</div>
     <h2 class="display-s" style="margin-top:4mm;max-width:110mm">Premium is the specification</h2>
     <p class="prose" style="margin-top:5mm;max-width:105mm">
       There is no cheaper version of a 6Homes home with the budget tapware in it. This list is what arrives, every
       time, on every design.
     </p>
     <div class="hr" style="margin-top:9mm"></div>
     ${items
       .map(
         (t, i) => `
       <div style="display:flex;gap:7mm;align-items:baseline;padding:4.5mm 0;border-bottom:.25mm solid rgba(255,255,255,.2)">
         <span class="spec" style="color:${T.teal};width:9mm">${String(i + 1).padStart(2, '0')}</span>
         <span style="font-size:10.5pt">${esc(t)}</span>
       </div>`
       )
       .join('')}
     <div class="grow"></div>
     ${dim('No upgrades required', true)}`,
    { dark: true, folio: { right: 'Inclusions' } }
  )
}

/** Back cover — how to reach them, and nothing else. */
export function backCover() {
  return page(
    `<div style="font-size:15pt">${wordmark(true)}</div>
     <div class="grow"></div>
     <h2 class="display-s" style="max-width:120mm">Come and stand inside one</h2>
     <p class="prose" style="margin-top:5mm;max-width:100mm">
       Photographs only go so far. Five minutes in a finished home tells you what a floorplan cannot — the ceiling
       height, the joinery, the way the light lands.
     </p>
     <table class="spec-table" style="margin-top:9mm;max-width:120mm">
       <tr><td>Display showroom</td><td>${esc(COMPANY.showroom)}</td></tr>
       <tr><td>Head office</td><td>${esc(COMPANY.headOffice)}</td></tr>
       <tr><td>Phone</td><td>${esc(COMPANY.phone)}</td></tr>
       <tr><td>Email</td><td>${esc(COMPANY.email)}</td></tr>
       <tr><td>Web</td><td>${esc(COMPANY.website)}</td></tr>
     </table>
     <div style="margin-top:10mm">${dim(COMPANY.tagline, true)}</div>`,
    { dark: true }
  )
}

/** Wraps a set of pages into a printable document. */
export const document = (title, pages) => `<!doctype html>
<html lang="en-AU"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css()}</style></head>
<body>${pages.join('\n')}</body></html>`
