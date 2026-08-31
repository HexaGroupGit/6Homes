// Vercel serverless — POST /api/quote-send
// Admin action: issue a quote. Mints the accept token, marks the quote sent, and
// emails the customer the branded PDF plus a link to accept online.
//
// Body: { quoteId, pdfBase64? }
// The PDF is generated in the browser (src/lib/quotePdf.js) and posted up, so the
// customer's attachment is byte-for-byte the file the admin previewed.
import { requireFullAdmin } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendEmail } from './_email.js'
import { newToken, quoteEmail, quoteUrl } from './_quote.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gate = await requireFullAdmin(req)
  if (gate.error) return res.status(gate.status).json({ error: gate.error })
  const sb = gate.sb

  const { quoteId, pdfBase64 } = req.body ?? {}
  if (!quoteId) return res.status(400).json({ error: 'quoteId is required.' })

  try {
    const [{ data: qRow }, { data: tmplRows }, { data: settRows }] = await Promise.all([
      sb.from('quotes').select('id, data').eq('id', quoteId).maybeSingle(),
      sb.from('templates').select('data'),
      sb.from('settings').select('data').eq('id', 'global'),
    ])
    if (!qRow) return res.status(404).json({ error: 'Quote not found.' })

    const quote = { ...qRow.data, id: qRow.id }
    if (!quote.customerEmail) return res.status(400).json({ error: 'This quote has no customer email address.' })

    const settings = settRows?.[0]?.data ?? {}
    const templates = (tmplRows ?? []).map((r) => r.data)

    const { data: designRow } = quote.designId
      ? await sb.from('designs').select('id, data').eq('id', quote.designId).maybeSingle()
      : { data: null }
    const design = designRow ? { ...designRow.data, id: designRow.id } : null

    // Re-issuing keeps the original token so a link already in the customer's
    // inbox doesn't quietly stop working.
    const token = quote.token || newToken()
    const now = new Date().toISOString()
    const sent = { ...quote, token, status: 'sent', sentAt: quote.sentAt ?? now, updatedAt: now }

    const { subject, html } = quoteEmail({ quote: sent, design, settings, templates })
    const r = await sendEmail({
      to: quote.customerEmail,
      subject,
      html,
      replyTo: settings?.emails?.replyTo,
      attachments: pdfBase64 ? [{ filename: `${quote.number || 'quote'}.pdf`, content: pdfBase64 }] : undefined,
      leadId: quote.leadId,
      customerId: quote.customerId,
      emailType: 'quote_sent',
    })
    if (!r.ok) return res.status(502).json({ error: `The quote could not be emailed (${r.reason ?? 'send failed'}).` })

    await sb.from('quotes').update({ data: sent, updated_at: now }).eq('id', quoteId)

    return res.status(200).json({ ok: true, token, url: quoteUrl(token) })
  } catch (err) {
    console.error('quote-send error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
