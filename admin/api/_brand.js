// Shared 6Homes branded email kit for the serverless api/ functions.
//
// Every transactional email rendered on the server should be built from
// brandFrame() + these helpers so the look is identical across flows: soft
// off-white canvas, white card with a teal top-rule, the 6Homes wordmark, and a
// footer carrying the showroom address and socials.
//
// Palette sampled from the 6Homes logo mark.
// Ported from Hexa Space RND api/_brand.js — same helper API, 6Homes identity.

export const TEAL = '#13B7C4'      // bright teal — the mark's highlight
export const TEAL_MID = '#15A2AE'
export const TEAL_DEEP = '#0D7982'
export const TEAL_DARK = '#11555E'
export const NAVY = '#0E5476'      // the wordmark colour
export const CANVAS = '#F2F7F8'
export const INK = '#16242C'
export const MUTE = '#64757E'
export const HAIR = '#DFE6E9'

// Email clients are hostile to webfonts — use a system stack everywhere and let
// weight and letter-spacing do the brand work instead.
export const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif"
export const DISPLAY = "'Helvetica Neue', Helvetica, Arial, sans-serif"

const SITE = (process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

// The real lockup, rasterised by scripts/make-email-logo.mjs — email clients do
// not render SVG, so the site's vector assets cannot be reused here. Served at
// 2x and declared at half size so it stays sharp on a retina screen. It has to
// be an absolute URL on a public host: an email has no origin to resolve
// against, and the admin is behind a login.
const LOGO = {
  src: `${SITE}/brand/email-logo.png`,
  width: 175,
  height: 38,
}

export const COMPANY = {
  name: '6Homes',
  tagline: 'Homes for everyone, everywhere',
  phone: '1800 6HOMES (646 637)',
  phoneHref: 'tel:1800646637',
  headOffice: '4/830 Whitehorse Road, Box Hill VIC 3128',
  showroom: '878 Whitehorse Road, Box Hill VIC 3128',
}

const SOCIAL = [
  ['Instagram', 'https://www.instagram.com/6homes'],
  ['LinkedIn', 'https://www.linkedin.com/company/6homes'],
  ['Facebook', 'https://www.facebook.com/6homes'],
  ['Website', SITE],
]

const socialRow = () =>
  `<div style="margin-top:14px">${SOCIAL.map(([label, href], i) =>
    `${i ? `<span style="color:${HAIR};font-size:10px">&nbsp;&nbsp;·&nbsp;&nbsp;</span>` : ''}` +
    `<a href="${href}" style="font-family:${SANS};font-size:10px;letter-spacing:.16em;color:${MUTE};text-decoration:none;text-transform:uppercase">${label}</a>`
  ).join('')}</div>`

// ── Content helpers ─────────────────────────────────────────────────────────
// A small caps eyebrow above the headline, e.g. "YOUR BROCHURE".
export const bKicker = (t) =>
  `<div style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:.22em;color:${TEAL_DEEP};text-transform:uppercase;margin:0 0 12px">${t}</div>`

export const bH1 = (t) =>
  `<h1 style="font-family:${DISPLAY};font-weight:600;font-size:26px;line-height:1.2;color:${NAVY};margin:0 0 16px">${t}</h1>`

export const bH2 = (t) =>
  `<h2 style="font-family:${DISPLAY};font-weight:600;font-size:19px;line-height:1.25;color:${NAVY};margin:0 0 14px">${t}</h2>`

export const bP = (t) =>
  `<p style="font-family:${SANS};font-size:15px;line-height:1.65;color:#39474F;margin:0 0 16px">${t}</p>`

export const bSmall = (t) =>
  `<p style="font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTE};margin:16px 0 0">${t}</p>`

export const bBtn = (label, href) =>
  `<div style="text-align:center;margin:28px 0"><a href="${href}" style="display:inline-block;background:${TEAL_DEEP};color:#ffffff;text-decoration:none;padding:14px 36px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border-radius:6px"><span style="color:#ffffff;text-decoration:none">${label}</span></a></div>`

// A soft panel — for summaries, codes, callouts.
export const bPanel = (inner) =>
  `<div style="background:${CANVAS};border-radius:8px;padding:16px 18px;margin:0 0 18px">${inner}</div>`

// Key/value summary table. rows = [[label, value, strong?], …].
export function bTable(rows = []) {
  const tr = ([l, v, strong]) => `<tr>
    <td style="padding:9px 0;font-family:${SANS};font-size:12px;color:${MUTE};width:150px;border-bottom:1px solid ${HAIR};vertical-align:top">${l}</td>
    <td style="padding:9px 0;font-family:${SANS};font-size:13px;color:${INK};${strong ? 'font-weight:600;' : ''}border-bottom:1px solid ${HAIR}">${v}</td>
  </tr>`
  return `<table style="width:100%;border-collapse:collapse;margin:4px 0 22px">${rows.map(tr).join('')}</table>`
}

export const bDivider = () =>
  `<div style="height:1px;background:${HAIR};margin:26px 0"></div>`

// A design/model card — image, name, and the headline specs. Used in brochure
// and nurture emails to show what the lead was looking at.
export function bDesignCard(design = {}) {
  const specs = [
    design.bedrooms ? `${design.bedrooms} bed` : '',
    design.bathrooms ? `${design.bathrooms} bath` : '',
    design.areaSqm ? `${design.areaSqm} m²` : '',
  ].filter(Boolean).join('  ·  ')
  const img = design.heroImage
    ? `<img src="${design.heroImage}" alt="${design.name || ''}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px 8px 0 0" />`
    : ''
  return `<div style="border:1px solid ${HAIR};border-radius:8px;overflow:hidden;margin:0 0 22px">
    ${img}
    <div style="padding:16px 18px">
      <div style="font-family:${DISPLAY};font-size:17px;font-weight:600;color:${NAVY};margin-bottom:5px">${design.name || ''}</div>
      ${specs ? `<div style="font-family:${SANS};font-size:12px;letter-spacing:.06em;color:${MUTE};text-transform:uppercase">${specs}</div>` : ''}
    </div>
  </div>`
}

// ── The wrapper ─────────────────────────────────────────────────────────────
/**
 * Full branded email shell.
 * `footerLabel` prints a small caps line above the social row
 * (e.g. "Showroom Tours", "Your Build"); omit for none.
 */
export function brandFrame(inner, { footerLabel = '', preheader = '' } = {}) {
  // Hidden preheader text — what shows next to the subject in an inbox list.
  const pre = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">${preheader}</div>`
    : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${SANS};color:${INK}">
  ${pre}
  <div style="max-width:600px;margin:0 auto;padding:30px 16px">

    <div style="text-align:center;padding:6px 0 22px">
      <a href="${SITE}" style="text-decoration:none">
        <!-- The type styles are for the ALT text: images are blocked by default in
             plenty of clients, and this keeps the fallback reading as the wordmark. -->
        <img src="${LOGO.src}" alt="6Homes" width="${LOGO.width}" height="${LOGO.height}" style="display:inline-block;width:${LOGO.width}px;height:${LOGO.height}px;border:0;outline:none;text-decoration:none;font-family:${DISPLAY};font-size:22px;font-weight:700;letter-spacing:.06em;color:${NAVY}" />
      </a>
    </div>

    <div style="background:#ffffff;border:1px solid ${HAIR};border-radius:12px;overflow:hidden">
      <div style="height:4px;background:${TEAL}"></div>
      <div style="padding:38px 40px">${inner}</div>
    </div>

    <div style="text-align:center;padding:24px 8px 8px">
      ${footerLabel ? `<div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:.22em;color:${TEAL_DEEP};text-transform:uppercase;margin-bottom:10px">${footerLabel}</div>` : ''}
      <div style="font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTE}">
        <strong style="color:${INK};font-weight:600">${COMPANY.name}</strong> — ${COMPANY.tagline}<br />
        Display showroom: ${COMPANY.showroom}<br />
        <a href="${COMPANY.phoneHref}" style="color:${MUTE};text-decoration:none">${COMPANY.phone}</a>
      </div>
      ${socialRow()}
    </div>

  </div>
</body></html>`
}

// Escape untrusted values (names, messages from the public form) before they go
// anywhere near an HTML email body.
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Multi-line free text → HTML, escaped, with line breaks preserved.
export const escLines = (s) => esc(s).replace(/\r?\n/g, '<br />')
