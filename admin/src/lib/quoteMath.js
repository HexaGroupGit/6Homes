// Quote arithmetic, shared by the browser and the serverless api/ functions.
//
// IMPORTANT: keep this module import-free (same rule as projectStages.js) — the
// Vercel runtime pulls it in directly.
//
// Australian consumer pricing: line prices are GST-INCLUSIVE, because that is
// what has to be displayed to a consumer. The GST component is therefore
// backed out of the total (total ÷ 11), not added on top. Storing ex-GST prices
// and adding 10% would show a customer a number they never agreed to.

export const GST_DIVISOR = 11

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export function lineTotal(item) {
  const qty = Number(item?.qty ?? 1)
  const price = Number(item?.unitPrice ?? 0)
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0
  return round2(qty * price)
}

export function quoteTotals(quote) {
  const items = quote?.lineItems ?? []
  const total = round2(items.reduce((sum, i) => sum + lineTotal(i), 0))
  const gst = round2(total / GST_DIVISOR)
  const exGst = round2(total - gst)
  const deposit = round2(total * (Number(quote?.depositPercent ?? 10) / 100))
  return { total, gst, exGst, deposit, balance: round2(total - deposit) }
}

// A quote is only actionable while it's sent and unexpired. Everything that can
// change what a customer sees or does derives from this one function so the
// admin UI, the public page and the accept endpoint can never disagree.
export function quoteState(quote, now = new Date()) {
  if (!quote) return 'missing'
  if (quote.status === 'accepted') return 'accepted'
  if (quote.status === 'declined') return 'declined'
  if (quote.status === 'draft') return 'draft'
  if (quote.validUntil && new Date(quote.validUntil) < startOfDay(now)) return 'expired'
  return 'sent'
}

export const isActionable = (quote, now) => quoteState(quote, now) === 'sent'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// QUO-0001, QUO-0002 … Sequential and human-quotable over the phone.
export function nextQuoteNumber(existing = []) {
  const max = existing.reduce((m, q) => {
    const n = Number(String(q?.number ?? '').replace(/\D/g, ''))
    return Number.isFinite(n) ? Math.max(m, n) : m
  }, 0)
  return `QUO-${String(max + 1).padStart(4, '0')}`
}

// The standard set of lines for a new quote, so nobody has to remember that
// site works and delivery are separate items.
export function starterLineItems(design) {
  return [
    {
      id: 'li_home',
      description: design?.name ? `${design.name} — modular home, turnkey` : 'Modular home, turnkey',
      qty: 1,
      unitPrice: Number(design?.priceFrom ?? 0),
    },
    { id: 'li_delivery', description: 'Delivery and craneage', qty: 1, unitPrice: 0 },
    { id: 'li_site', description: 'Site works (per site assessment)', qty: 1, unitPrice: 0 },
  ]
}
