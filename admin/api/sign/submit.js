// Vercel serverless — POST /api/sign/submit
// Public (token-addressed): records the customer's signature on their contract.
//
// Body: { token, signerName, signatureData }
//   signatureData is a PNG data URI drawn on the signing page's canvas.
//
// Once signed, the record is closed: re-submitting is refused rather than
// overwriting, so a signature can never be silently replaced.
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from '../_cors.js'
import { sendEmail } from '../_email.js'
import { contractSignedEmail } from '../_contract.js'
import { notifyList } from '../_leads.js'

// A drawn signature is a few tens of KB; anything much larger is either a
// pasted photo or someone probing the endpoint.
const MAX_SIGNATURE_BYTES = 400_000

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const { token, signerName, signatureData } = req.body ?? {}
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const name = String(signerName ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Please type your full name.' })
  if (!signatureData || !/^data:image\/(png|jpeg);base64,/.test(signatureData)) {
    return res.status(400).json({ error: 'Please draw your signature.' })
  }
  if (signatureData.length > MAX_SIGNATURE_BYTES) {
    return res.status(413).json({ error: 'That signature image is too large.' })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: esign } = await sb.from('esign_requests').select('*').eq('token', token).maybeSingle()
    if (!esign) return res.status(404).json({ error: 'This signing link is not valid.' })
    if (esign.customer_signed_at) {
      return res.status(200).json({ ok: true, alreadySigned: true })
    }

    const now = new Date().toISOString()
    const { error: uErr } = await sb.from('esign_requests').update({
      status: 'customer_signed',
      customer_signature_data: signatureData,
      customer_signer_name: name,
      customer_signed_at: now,
    }).eq('token', token)
    if (uErr) {
      console.error('sign/submit: update failed', uErr)
      return res.status(500).json({ error: 'Could not record your signature. Please call us on 1800 646 637.' })
    }

    const { data: cRow } = await sb.from('contracts').select('id, data').eq('id', esign.contract_id).maybeSingle()
    const contract = cRow ? { ...cRow.data, id: cRow.id, customerSignerName: name } : null
    if (contract) {
      await sb.from('contracts').update({
        data: { ...cRow.data, status: 'customer_signed', customerSignedAt: now, customerSignerName: name },
        updated_at: now,
      }).eq('id', cRow.id)
    }

    // Tell the team so someone can countersign and raise the deposit invoice.
    try {
      const [{ data: settRows }, { data: qRow }] = await Promise.all([
        sb.from('settings').select('data').eq('id', 'global'),
        contract?.quoteId
          ? sb.from('quotes').select('id, data').eq('id', contract.quoteId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const settings = settRows?.[0]?.data ?? {}
      const quote = qRow ? { ...qRow.data, id: qRow.id } : {}
      const { subject, html } = contractSignedEmail({ contract, quote, settings, forCustomer: false })
      await sendEmail({
        to: notifyList(settings), subject, html,
        leadId: contract?.leadId, customerId: contract?.customerId, emailType: 'team_contract_signed',
      })
    } catch (err) { console.error('sign/submit: team email failed', err) }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('sign/submit error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please call us on 1800 646 637.' })
  }
}
