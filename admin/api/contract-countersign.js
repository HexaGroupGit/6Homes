// Vercel serverless — POST /api/contract-countersign
// Admin action: countersign a contract the customer has already signed, then
// email the customer confirming both parties have signed.
//
// Body: { contractId, signerName, signatureData }
import { requireAdmin } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendEmail } from './_email.js'
import { contractSignedEmail } from './_contract.js'

const MAX_SIGNATURE_BYTES = 400_000

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gate = await requireAdmin(req)
  if (gate.error) return res.status(gate.status).json({ error: gate.error })
  const sb = gate.sb

  const { contractId, signerName, signatureData } = req.body ?? {}
  if (!contractId) return res.status(400).json({ error: 'contractId is required.' })

  const name = String(signerName ?? '').trim()
  if (!name) return res.status(400).json({ error: 'Type the name of the person signing.' })
  if (!signatureData || !/^data:image\/(png|jpeg);base64,/.test(signatureData)) {
    return res.status(400).json({ error: 'Draw the signature before submitting.' })
  }
  if (signatureData.length > MAX_SIGNATURE_BYTES) {
    return res.status(413).json({ error: 'That signature image is too large.' })
  }

  try {
    const { data: cRow } = await sb.from('contracts').select('id, data').eq('id', contractId).maybeSingle()
    if (!cRow) return res.status(404).json({ error: 'Contract not found.' })
    const contract = { ...cRow.data, id: cRow.id }

    const { data: esign } = await sb.from('esign_requests').select('*').eq('token', contract.token).maybeSingle()
    // Countersigning first would leave a contract that looks executed but which
    // the customer never actually signed.
    if (!esign?.customer_signed_at) {
      return res.status(409).json({ error: 'The customer has not signed this contract yet.' })
    }
    if (esign.company_signed_at) return res.status(200).json({ ok: true, alreadySigned: true })

    const now = new Date().toISOString()
    await sb.from('esign_requests').update({
      status: 'signed',
      company_signature_data: signatureData,
      company_signer_name: name,
      company_signed_at: now,
    }).eq('token', contract.token)

    const signed = { ...cRow.data, status: 'signed', signedAt: now, companySignerName: name }
    await sb.from('contracts').update({ data: signed, updated_at: now }).eq('id', contractId)

    try {
      const [{ data: settRows }, { data: qRow }] = await Promise.all([
        sb.from('settings').select('data').eq('id', 'global'),
        contract.quoteId
          ? sb.from('quotes').select('id, data').eq('id', contract.quoteId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const settings = settRows?.[0]?.data ?? {}
      const quote = qRow ? { ...qRow.data, id: qRow.id } : {}
      if (contract.customerEmail) {
        const { subject, html } = contractSignedEmail({ contract: signed, quote, settings, forCustomer: true })
        await sendEmail({
          to: contract.customerEmail, subject, html,
          replyTo: settings?.emails?.replyTo,
          leadId: contract.leadId, customerId: contract.customerId, emailType: 'contract_signed',
        })
      }
    } catch (err) { console.error('contract-countersign: customer email failed', err) }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('contract-countersign error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
