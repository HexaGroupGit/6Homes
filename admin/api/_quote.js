// Shared server-side quote helpers. Underscore prefix = not an API route.
//
// The customer-facing quote page authenticates by an unguessable token in the
// URL, so these helpers are careful about two things: tokens are generated with
// real randomness, and the public projection never returns a field the customer
// shouldn't see (internal notes, margins, the lead's pipeline history).
import { randomBytes } from 'node:crypto'
import { quoteTotals, quoteState } from '../src/lib/quoteMath.js'
import {
  brandFrame, bKicker, bH1, bP, bBtn, bTable, bSmall, bDesignCard, esc, escLines, COMPANY,
} from './_brand.js'
import { fillVars, findEmailTemplate } from './_leads.js'

const ADMIN = (process.env.ADMIN_URL || 'https://admin.6homes.com').replace(/\/+$/, '')

// 32 hex chars. Guessing one is not a realistic attack; a sequential id would be.
export const newToken = () => randomBytes(16).toString('hex')

export const quoteUrl = (token) => `${ADMIN}/quote/${token}`
export const signUrl = (token) => `${ADMIN}/sign/${token}`

/**
 * What the public accept page is allowed to see.
 * Deliberately an allow-list, not a delete-list — a field added to the quote
 * later is private by default rather than accidentally published.
 */
export function publicQuote(quote, { design, settings } = {}) {
  return {
    number: quote.number,
    status: quoteState(quote),
    customerName: quote.customerName,
    siteAddress: quote.siteAddress,
    designName: quote.designName,
    lineItems: (quote.lineItems ?? []).map((i) => ({
      description: i.description,
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    totals: quoteTotals(quote),
    depositPercent: quote.depositPercent ?? 10,
    validUntil: quote.validUntil ?? null,
    notes: quote.notes ?? '',
    terms: quote.terms ?? '',
    sentAt: quote.sentAt ?? null,
    acceptedAt: quote.acceptedAt ?? null,
    declinedAt: quote.declinedAt ?? null,
    design: design ? { name: design.name, heroImage: design.heroImage, bedrooms: design.bedrooms, bathrooms: design.bathrooms, areaSqm: design.areaSqm } : null,
    company: {
      name: settings?.company?.name ?? COMPANY.name,
      phone: settings?.company?.phoneDisplay ?? COMPANY.phone,
      website: settings?.company?.website ?? '6homes.com',
    },
  }
}

// ── Emails ──────────────────────────────────────────────────────────────────

export function quoteEmail({ quote, design, settings, templates }) {
  const totals = quoteTotals(quote)
  const firstName = (quote.customerName || '').split(' ')[0] || 'there'
  const link = quoteUrl(quote.token)

  const vars = {
    firstName,
    name: quote.customerName || 'there',
    number: quote.number || '',
    design: quote.designName || design?.name || '',
    total: totals.total.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }),
    quoteLink: link,
    company: settings?.company?.name || COMPANY.name,
  }

  const tpl = findEmailTemplate(templates, 'quote_sent')
  if (tpl) return { subject: fillVars(tpl.subject || `Your 6Homes quote ${quote.number}`, vars), html: fillVars(tpl.content, vars) }

  const money = (n) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
  const rows = [
    ['Quote', esc(quote.number || '—')],
    ['Your home', esc(quote.designName || design?.name || '—')],
  ]
  if (quote.siteAddress) rows.push(['Site', esc(quote.siteAddress)])
  rows.push(['Total (inc GST)', money(totals.total), true])
  rows.push([`Deposit (${quote.depositPercent ?? 10}%)`, money(totals.deposit)])
  if (quote.validUntil) rows.push(['Valid until', new Date(quote.validUntil).toLocaleDateString('en-AU')])

  return {
    subject: `Your 6Homes quote ${quote.number}`,
    html: brandFrame(
      bKicker('Your quote') +
      bH1('Here\'s your quote') +
      bP(`Hi ${esc(firstName)},<br /><br />Your quote is attached as a PDF, and the summary is below. Take your time with it — and ask us anything, including the awkward questions.`) +
      bTable(rows) +
      (design ? bDesignCard(design) : '') +
      bBtn('Review and accept online', link) +
      (quote.notes ? bP(escLines(quote.notes)) : '') +
      bP(`Site works stay indicative until we've completed your site assessment. If that number moves, we'll quote the variation and get your written approval before anything proceeds — no surprises at the end.`) +
      bSmall(`Questions? Call us on <a href="${COMPANY.phoneHref}" style="color:#64757E">${COMPANY.phone}</a>.<br /><br />— The 6Homes team`),
      { footerLabel: 'Quotation', preheader: `Quote ${quote.number} — ${money(totals.total)} inc GST` }
    ),
  }
}

export function quoteAcceptedCustomerEmail({ quote, settings, signLink }) {
  const firstName = (quote.customerName || '').split(' ')[0] || 'there'
  const totals = quoteTotals(quote)
  const money = (n) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

  return {
    subject: `Quote ${quote.number} accepted — next step`,
    html: brandFrame(
      bKicker('Accepted') +
      bH1('Thanks — let\'s get it signed') +
      bP(`Hi ${esc(firstName)},<br /><br />You've accepted quote <strong>${esc(quote.number)}</strong>. The last piece of paperwork is your build contract, which you can read and sign online.`) +
      bTable([
        ['Quote', esc(quote.number)],
        ['Total (inc GST)', money(totals.total), true],
        [`Deposit to book production`, money(totals.deposit)],
      ]) +
      bBtn('Read and sign your contract', signLink) +
      bP(`Once it's signed and the deposit is received, we book your production slot and your build officially starts. We'll email you at every stage from there.`) +
      bSmall(`Anything unclear in the contract, call us on <a href="${COMPANY.phoneHref}" style="color:#64757E">${COMPANY.phone}</a> before you sign it.<br /><br />— The 6Homes team`),
      { footerLabel: 'Your Contract', preheader: 'Your contract is ready to read and sign.' }
    ),
  }
}

export function quoteTeamEmail({ quote, action, reason }) {
  const totals = quoteTotals(quote)
  const money = (n) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
  const accepted = action === 'accepted'

  return {
    subject: `Quote ${quote.number} ${action} — ${quote.customerName || 'customer'}`,
    html: brandFrame(
      bKicker(accepted ? 'Quote accepted' : 'Quote declined') +
      bH1(`${esc(quote.customerName || 'A customer')} ${action} ${esc(quote.number)}`) +
      bTable([
        ['Customer', esc(quote.customerName || '—')],
        ['Email', esc(quote.customerEmail || '—')],
        ['Home', esc(quote.designName || '—')],
        ['Total', money(totals.total), true],
      ]) +
      (reason ? bP(`<strong>Reason given:</strong><br />${escLines(reason)}`) : '') +
      bBtn('Open the quote', `${ADMIN}/quotes/${quote.id}`) +
      bSmall(accepted
        ? 'The customer has been sent their contract to sign.'
        : 'No further automated email will go to this customer about this quote.'),
      { footerLabel: 'Internal' }
    ),
  }
}
