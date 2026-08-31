// Vercel serverless — GET /api/sign/load?token=…
// Public (token-addressed): returns the contract document to display on the
// signing page, plus whatever signatures already exist.
//
// The body is returned exactly as stored — never re-rendered — so what the
// customer reads is what was frozen when they accepted the quote.
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from '../_cors.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'GET, OPTIONS')) return
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET')

  const token = req.query?.token
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const { data: esign } = await sb.from('esign_requests').select('*').eq('token', token).maybeSingle()
    if (!esign) return res.status(404).json({ error: 'This signing link is not valid.' })

    const { data: cRow } = await sb.from('contracts').select('id, data').eq('id', esign.contract_id).maybeSingle()
    if (!cRow) return res.status(404).json({ error: 'This signing link is not valid.' })

    const contract = cRow.data
    const { data: settRows } = await sb.from('settings').select('data').eq('id', 'global')
    const settings = settRows?.[0]?.data ?? {}

    return res.status(200).json({
      contract: {
        number: contract.number,
        customerName: contract.customerName,
        body: contract.body,
        createdAt: contract.createdAt,
      },
      signature: {
        status: esign.status,
        customerSignedAt: esign.customer_signed_at,
        customerSignerName: esign.customer_signer_name,
        companySignedAt: esign.company_signed_at,
        companySignerName: esign.company_signer_name,
      },
      company: {
        name: settings?.company?.name ?? '6Homes',
        phone: settings?.company?.phoneDisplay ?? '1800 6HOMES (646 637)',
      },
    })
  } catch (err) {
    console.error('sign/load error:', err)
    return res.status(500).json({ error: 'Could not load this contract.' })
  }
}
