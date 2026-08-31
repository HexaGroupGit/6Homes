// Shared server-side lead helpers — used by form-submit.js and lead-nurture.js.
// Underscore prefix = not exposed as an API route.
//
// NOTE: never import anything from ../src here. The browser modules read
// import.meta.env and break in the serverless runtime.
//
// Ported from Hexa Space RND api/_leads.js, with the office/desk split replaced
// by the six 6Homes website intents.
import {
  consultationEmail, brochureEmail, pricelistEmail, domesticEmail,
  commercialEmail, tourEmail, followupEmail, finalEmail,
} from './_leadEmails.js'
import { sendEmail } from './_email.js'

const SITE = (process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

export function adminUrl(settings) {
  return (settings?.adminUrl || process.env.ADMIN_URL || 'https://admin.6homes.com').replace(/\/+$/, '')
}

// ── The six website forms ───────────────────────────────────────────────────
// `emailType` is the key an editable row in `templates` must use to override the
// default copy. `attach` names a file in the downloads registry below.
export const INTENTS = {
  consultation: { label: 'Consultation request', emailType: 'lead_consultation', build: consultationEmail, attach: null },
  brochure:     { label: 'Brochure download',    emailType: 'lead_brochure',     build: brochureEmail,     attach: 'brochure' },
  pricelist:    { label: 'Price list download',  emailType: 'lead_pricelist',    build: pricelistEmail,    attach: 'pricelist' },
  domestic:     { label: 'Domestic enquiry',     emailType: 'lead_domestic',     build: domesticEmail,     attach: 'brochure' },
  commercial:   { label: 'Commercial enquiry',   emailType: 'lead_commercial',   build: commercialEmail,   attach: 'commercial' },
  tour:         { label: 'Showroom tour request',emailType: 'lead_tour',         build: tourEmail,         attach: null },
}

export const DEFAULT_INTENT = 'domestic'

// Normalise whatever the website sent into a known intent key.
export function resolveIntent(raw) {
  const k = String(raw ?? '').toLowerCase().trim()
  if (INTENTS[k]) return k
  // Tolerate the labels a form might send instead of the key.
  if (/price|pricing|cost/.test(k)) return 'pricelist'
  if (/brochure|catalog/.test(k)) return 'brochure'
  if (/consult|design/.test(k)) return 'consultation'
  if (/tour|showroom|display|visit/.test(k)) return 'tour'
  if (/commercial|multi|develop/.test(k)) return 'commercial'
  return DEFAULT_INTENT
}

// ── Downloadable collateral ─────────────────────────────────────────────────
// Resend accepts a remote URL as `path`, so the PDFs live in the website's
// /public rather than being bundled into the serverless function. Override any
// of these from Settings → Downloads without a deploy.
const DEFAULT_DOWNLOADS = {
  brochure:   { filename: '6Homes-Brochure.pdf',   url: `${SITE}/downloads/6homes-brochure.pdf` },
  pricelist:  { filename: '6Homes-Price-List.pdf', url: `${SITE}/downloads/6homes-price-list.pdf` },
  // Commercial enquiries get the brochure. The Factory Introduction is the more
  // apt document for a developer, but at 14 MB it bounces on plenty of corporate
  // mail gateways — it is hosted at /downloads/6homes-factory-introduction.pdf
  // for the team to link instead.
  commercial: { filename: '6Homes-Brochure.pdf',   url: `${SITE}/downloads/6homes-brochure.pdf` },
}

// Gmail and Outlook accept ~20–25 MB, but corporate gateways routinely cap at
// 10 MB and reject silently. Anything above this is refused here rather than
// handed to Resend to bounce somewhere we cannot see.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

/**
 * Resend attachment array for an intent, or [] if it has none.
 * A missing, unreachable or oversized file must never block the
 * acknowledgement — we send without it and log a warning, because a customer
 * getting a reply with no PDF beats getting no reply at all.
 */
export async function attachmentsFor(intentKey, settings) {
  const key = INTENTS[intentKey]?.attach
  if (!key) return []
  const cfg = { ...DEFAULT_DOWNLOADS[key], ...(settings?.downloads?.[key] ?? {}) }
  if (!cfg?.url) return []
  try {
    const head = await fetch(cfg.url, { method: 'HEAD' })
    if (!head.ok) {
      console.warn(`attachment ${key} unavailable (${head.status}) at ${cfg.url} — sending without it`)
      return []
    }
    const size = Number(head.headers.get('content-length') ?? 0)
    if (size > MAX_ATTACHMENT_BYTES) {
      console.warn(
        `attachment ${key} is ${(size / 1048576).toFixed(1)} MB, over the ${MAX_ATTACHMENT_BYTES / 1048576} MB limit — sending without it. Link to it instead.`
      )
      return []
    }
  } catch (err) {
    console.warn(`attachment ${key} check failed at ${cfg.url}:`, String(err))
    return []
  }
  return [{ filename: cfg.filename, path: cfg.url }]
}

// ── Template resolution ─────────────────────────────────────────────────────
// {{name}} style interpolation, same as the Hexa templates.
export function fillVars(str, vars) {
  return String(str || '').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? (vars[k] ?? '') : m))
}

export function findEmailTemplate(templates, emailType) {
  return (templates || []).find((t) => t?.category === 'email' && t?.emailType === emailType && t?.content) || null
}

/**
 * Render a lead email. An editable CRM template wins; otherwise the built-in
 * default from _leadEmails.js is used, so the funnel works before anyone has
 * written a single template.
 */
export function renderLeadEmail({ emailType, templates, lead, design, settings, builder }) {
  const tpl = findEmailTemplate(templates, emailType)
  if (tpl) {
    const vars = {
      name: lead?.name || 'there',
      firstName: (lead?.name || '').split(' ')[0] || 'there',
      email: lead?.email || '',
      phone: lead?.phone || '',
      design: design?.name || lead?.designName || '',
      company: settings?.company?.name || '6Homes',
      website: SITE,
      consultLink: settings?.leads?.consultUrl || `${SITE}/contact`,
      showroom: settings?.company?.showroom || '878 Whitehorse Road, Box Hill VIC 3128',
    }
    return { subject: fillVars(tpl.subject || '', vars), html: fillVars(tpl.content, vars) }
  }
  return builder({ name: lead?.name, message: lead?.message, design })
}

// The nurture steps reuse the same resolution path.
export const NURTURE_BUILDERS = {
  lead_followup: followupEmail,
  lead_final: finalEmail,
}

// ── Notification routing ────────────────────────────────────────────────────
// Every new-lead notification goes to the whole sales team. Configured in
// Settings → Emails → Notify; falls back to the shared inbox.
export function notifyList(settings) {
  const list = settings?.emails?.notify
  const arr = (Array.isArray(list) ? list : [list]).filter(Boolean)
  return arr.length ? arr : ['melissa@6homes.com']
}

// ── Small utilities ─────────────────────────────────────────────────────────
export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// Whole days between two dates (b - a). Used by the nurture cadence.
export function daysBetween(a, b) {
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0)
  return Math.round(ms / 86400000)
}

// Send through the central guard, tagged so it lands in the lead's history.
export async function sendLeadEmail({ to, subject, html, attachments, leadId, emailType, settings }) {
  return sendEmail({
    to,
    subject,
    html,
    attachments,
    replyTo: settings?.emails?.replyTo,
    leadId,
    emailType,
  })
}
