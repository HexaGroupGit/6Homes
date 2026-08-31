import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { quoteTotals, lineTotal } from './quoteMath.js'
import { fmtDate, fmtMoney } from './utils.js'

// Branded quote PDF. Generated in the browser so the admin gets an instant
// download without a round-trip, and attached to the customer email by the same
// code path (the caller passes the base64 output to /api/quote-send).

const TEAL = [19, 183, 196]
const TEAL_DEEP = [13, 121, 130]
const NAVY = [14, 84, 118]
const INK = [22, 36, 44]
const MUTE = [100, 117, 126]

export function buildQuotePdf({ quote, settings }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 48
  const company = settings?.company ?? {}
  const totals = quoteTotals(quote)

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...TEAL)
  doc.rect(0, 0, W, 5, 'F')

  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...NAVY)
  doc.text('6', M, 64)
  const sixWidth = doc.getTextWidth('6')
  doc.setFont('helvetica', 'normal').setFontSize(22)
  doc.text('HOMES', M + sixWidth + 2, 64, { charSpace: 2 })

  doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTE)
  const headerRight = [
    company.legalName || '6Homes Pty Ltd',
    company.headOffice || '4/830 Whitehorse Road, Box Hill VIC 3128',
    company.phoneDisplay || '1800 6HOMES (646 637)',
    company.website || '6homes.com',
  ]
  headerRight.forEach((line, i) => doc.text(line, W - M, 44 + i * 12, { align: 'right' }))

  // ── Title block ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK)
  doc.text('Quotation', M, 108)

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...MUTE)
  const meta = [
    ['Quote number', quote.number || '—'],
    ['Date', fmtDate(quote.sentAt || quote.createdAt)],
    ['Valid until', quote.validUntil ? fmtDate(quote.validUntil) : '—'],
  ]
  meta.forEach(([label, value], i) => {
    const y = 100 + i * 13
    doc.setTextColor(...MUTE).text(label, W - M - 130, y)
    doc.setTextColor(...INK).text(String(value), W - M, y, { align: 'right' })
  })

  // ── Prepared for ──────────────────────────────────────────────────────────
  let y = 140
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEAL_DEEP)
  doc.text('PREPARED FOR', M, y, { charSpace: 1 })
  y += 15
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK)
  const to = [
    quote.customerName,
    quote.customerEmail,
    quote.customerPhone,
    quote.siteAddress && `Site: ${quote.siteAddress}`,
  ].filter(Boolean)
  to.forEach((line, i) => doc.text(String(line), M, y + i * 13))
  y += to.length * 13 + 18

  // ── Line items ────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Description', 'Qty', 'Unit price', 'Amount']],
    body: (quote.lineItems ?? []).map((i) => [
      i.description || '',
      String(i.qty ?? 1),
      fmtMoney(i.unitPrice),
      fmtMoney(lineTotal(i)),
    ]),
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 7, textColor: INK, lineColor: [223, 230, 233] },
    headStyles: { fillColor: [242, 247, 248], textColor: NAVY, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 44, halign: 'right' },
      2: { cellWidth: 80, halign: 'right' },
      3: { cellWidth: 84, halign: 'right' },
    },
    theme: 'grid',
  })

  y = doc.lastAutoTable.finalY + 22

  // ── Totals ────────────────────────────────────────────────────────────────
  const rows = [
    ['Subtotal (ex GST)', fmtMoney(totals.exGst)],
    ['GST', fmtMoney(totals.gst)],
    ['Total (inc GST)', fmtMoney(totals.total), true],
    [`Deposit due (${quote.depositPercent ?? 10}%)`, fmtMoney(totals.deposit)],
    ['Balance', fmtMoney(totals.balance)],
  ]
  rows.forEach(([label, value, strong]) => {
    doc.setFont('helvetica', strong ? 'bold' : 'normal').setFontSize(strong ? 11 : 9.5)
    doc.setTextColor(...(strong ? INK : MUTE)).text(label, W - M - 170, y)
    doc.setTextColor(...(strong ? NAVY : INK)).text(String(value), W - M, y, { align: 'right' })
    if (strong) {
      doc.setDrawColor(223, 230, 233).line(W - M - 175, y + 6, W - M, y + 6)
      y += 6
    }
    y += 16
  })

  // ── Notes and terms ───────────────────────────────────────────────────────
  y += 10
  const block = (heading, text) => {
    if (!text) return
    if (y > doc.internal.pageSize.getHeight() - 130) { doc.addPage(); y = 60 }
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEAL_DEEP)
    doc.text(heading, M, y, { charSpace: 1 })
    y += 14
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
    const lines = doc.splitTextToSize(String(text), W - M * 2)
    doc.text(lines, M, y)
    y += lines.length * 12 + 16
  }

  block('NOTES', quote.notes)
  block(
    'TERMS',
    quote.terms ||
      'This quotation is valid until the date shown above. Site works are indicative until a site assessment ' +
      'is completed; any variation will be quoted separately and approved by you in writing before work proceeds. ' +
      'Production is scheduled on receipt of the signed contract and deposit. Delivery is approximately four ' +
      'months from design approval and payment.'
  )

  // ── Footer on every page ──────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    const H = doc.internal.pageSize.getHeight()
    doc.setDrawColor(223, 230, 233).line(M, H - 46, W - M, H - 46)
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...MUTE)
    doc.text(`${company.name || '6Homes'} — ${company.website || '6homes.com'}`, M, H - 32)
    doc.text(`Page ${p} of ${pages}`, W - M, H - 32, { align: 'right' })
  }

  return doc
}

export function downloadQuotePdf({ quote, settings }) {
  buildQuotePdf({ quote, settings }).save(`${quote.number || 'quote'}.pdf`)
}

// Base64 (no data: prefix) — the shape Resend wants for an attachment.
export function quotePdfBase64({ quote, settings }) {
  return buildQuotePdf({ quote, settings }).output('datauristring').split(',')[1]
}
