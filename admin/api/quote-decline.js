// Vercel serverless — POST /api/quote-decline
// Public (token-addressed): the customer declines their quote, optionally saying
// why. The reason is the most useful thing on this endpoint — it is the only
// structured feedback we get on losing a job.
//
// Body: { token, reason }
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendEmail } from './_email.js'
import { quoteTeamEmail } from './_quote.js'
import { notifyList } from './_leads.js'
import { quoteState } from '../src/lib/quoteMath.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const { token, reason } = req.body ?? {}
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: rows } = await sb.from('quotes').select('id, data').eq('data->>token', token)
    const row = rows?.[0]
    if (!row) return res.status(404).json({ error: 'This quote link is not valid.' })

    const quote = { ...row.data, id: row.id }
    if (quote.status === 'declined') return res.status(200).json({ ok: true, alreadyDeclined: true })
    if (quote.status === 'accepted') return res.status(409).json({ error: 'This quote has already been accepted.' })
    if (quoteState(quote) === 'draft') return res.status(404).json({ error: 'This quote link is not valid.' })

    const now = new Date().toISOString()
    const declined = {
      ...quote,
      status: 'declined',
      declinedAt: now,
      declineReason: String(reason ?? '').slice(0, 2000),
      updatedAt: now,
    }
    await sb.from('quotes').update({ data: declined, updated_at: now }).eq('id', quote.id)

    // Move the lead to Lost and stop any remaining automation — nobody should
    // get a cheerful follow-up after telling us no.
    try {
      if (quote.leadId) {
        const [{ data: leadRow }, { data: stageRows }] = await Promise.all([
          sb.from('leads').select('id, data').eq('id', quote.leadId).maybeSingle(),
          sb.from('lead_pipeline_stages').select('data'),
        ])
        if (leadRow) {
          const lead = leadRow.data
          const lost = (stageRows ?? []).map((r) => r.data).find((s) => s.category === 'lost')
          await sb.from('leads').update({
            data: {
              ...lead,
              stageId: lost?.id ?? lead.stageId,
              nurture: { ...(lead.nurture ?? {}), done: true, stoppedReason: 'quote declined' },
              activity: [...(lead.activity ?? []), { at: now, type: 'quote', note: `Declined quote ${quote.number}${reason ? `: ${reason}` : ''}` }],
            },
            updated_at: now,
          }).eq('id', leadRow.id)
        }
      }
    } catch (err) { console.error('quote-decline: lead update failed', err) }

    try {
      const { data: settRows } = await sb.from('settings').select('data').eq('id', 'global')
      const settings = settRows?.[0]?.data ?? {}
      const { subject, html } = quoteTeamEmail({ quote: declined, action: 'declined', reason: declined.declineReason })
      await sendEmail({ to: notifyList(settings), subject, html, leadId: quote.leadId, emailType: 'team_quote_declined' })
    } catch (err) { console.error('quote-decline: team email failed', err) }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('quote-decline error:', err)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}
