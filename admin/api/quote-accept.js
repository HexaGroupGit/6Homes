// Vercel serverless — POST /api/quote-accept
// Public (token-addressed): the customer accepts their quote.
//
// Accepting does three things atomically enough to be safe on a retry:
//   1. marks the quote accepted
//   2. generates the contract from the accepted figures and mints a sign token
//   3. emails the customer the signing link and tells the team
//
// Body: { token, acceptedBy }
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendEmail } from './_email.js'
import { quoteAcceptedCustomerEmail, quoteTeamEmail, signUrl } from './_quote.js'
import { newContractToken, nextContractNumber, renderContractBody } from './_contract.js'
import { notifyList, adminUrl } from './_leads.js'
import { quoteState } from '../src/lib/quoteMath.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const { token, acceptedBy } = req.body ?? {}
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: rows } = await sb.from('quotes').select('id, data').eq('data->>token', token)
    const row = rows?.[0]
    if (!row) return res.status(404).json({ error: 'This quote link is not valid.' })

    const quote = { ...row.data, id: row.id }

    // Already accepted — return the existing contract rather than erroring or
    // creating a second one. Customers double-click, and email clients prefetch.
    if (quote.status === 'accepted') {
      const { data: existing } = await sb.from('contracts').select('data').eq('data->>quoteId', quote.id)
      return res.status(200).json({ ok: true, alreadyAccepted: true, signToken: existing?.[0]?.data?.token ?? null })
    }

    const state = quoteState(quote)
    if (state === 'declined') return res.status(409).json({ error: 'This quote was declined.' })
    if (state === 'expired') return res.status(409).json({ error: 'This quote has expired. Please contact us for an updated one.' })
    if (state !== 'sent') return res.status(409).json({ error: 'This quote is not available to accept.' })

    const [{ data: contractRows }, { data: settRows }] = await Promise.all([
      sb.from('contracts').select('data'),
      sb.from('settings').select('data').eq('id', 'global'),
    ])
    const settings = settRows?.[0]?.data ?? {}

    const now = new Date().toISOString()
    const contractNumber = nextContractNumber((contractRows ?? []).map((r) => r.data))
    const contractToken = newContractToken()

    const accepted = {
      ...quote,
      status: 'accepted',
      acceptedAt: now,
      acceptedBy: String(acceptedBy ?? '').slice(0, 120),
      contractNumber,
      updatedAt: now,
    }

    // Body is frozen at creation — what they sign must stay what they signed.
    const contract = {
      id: `con_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      number: contractNumber,
      quoteId: quote.id,
      leadId: quote.leadId ?? null,
      customerId: quote.customerId ?? null,
      projectId: quote.projectId ?? null,
      customerName: quote.customerName ?? '',
      customerEmail: quote.customerEmail ?? '',
      token: contractToken,
      status: 'sent',
      body: renderContractBody({ quote: accepted, settings }),
      createdAt: now,
      updatedAt: now,
    }

    const { error: cErr } = await sb.from('contracts').insert({ id: contract.id, data: contract })
    if (cErr) {
      console.error('quote-accept: contract insert failed', cErr)
      return res.status(500).json({ error: 'Could not prepare your contract. Please call us on 1800 646 637.' })
    }

    // Signatures live in their own relational table, keyed by the token, so the
    // signing page can resolve one row by primary key and the signature audit
    // trail is never mixed into the mutable contract jsonb.
    const { error: eErr } = await sb.from('esign_requests').insert({
      token: contractToken,
      contract_id: contract.id,
      customer_id: quote.customerId ?? null,
      status: 'pending',
    })
    if (eErr) {
      console.error('quote-accept: esign insert failed', eErr)
      return res.status(500).json({ error: 'Could not prepare your contract. Please call us on 1800 646 637.' })
    }

    await sb.from('quotes').update({ data: accepted, updated_at: now }).eq('id', quote.id)

    // Emails are best-effort — the acceptance itself is already recorded, and
    // failing the request here would tempt the customer into accepting twice.
    try {
      if (quote.customerEmail) {
        const { subject, html } = quoteAcceptedCustomerEmail({ quote: accepted, settings, signLink: signUrl(contractToken) })
        await sendEmail({
          to: quote.customerEmail, subject, html,
          replyTo: settings?.emails?.replyTo,
          leadId: quote.leadId, customerId: quote.customerId, emailType: 'quote_accepted',
        })
      }
    } catch (err) { console.error('quote-accept: customer email failed', err) }

    try {
      const { subject, html } = quoteTeamEmail({ quote: accepted, action: 'accepted' })
      await sendEmail({ to: notifyList(settings), subject, html, leadId: quote.leadId, emailType: 'team_quote_accepted' })
    } catch (err) { console.error('quote-accept: team email failed', err) }

    return res.status(200).json({ ok: true, signToken: contractToken, adminUrl: adminUrl(settings) })
  } catch (err) {
    console.error('quote-accept error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please call us on 1800 646 637.' })
  }
}
