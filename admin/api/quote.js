// Vercel serverless — GET /api/quote?token=…
// Public: returns the customer-visible projection of a quote for the accept page.
// The token is the only credential; publicQuote() is an allow-list so nothing
// internal leaks through.
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { publicQuote } from './_quote.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'GET, OPTIONS')) return
  if (req.method !== 'GET') return methodNotAllowed(res, 'GET')

  const token = req.query?.token
  if (!token) return res.status(400).json({ error: 'Missing token' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const [{ data: rows }, { data: settRows }] = await Promise.all([
      sb.from('quotes').select('id, data').eq('data->>token', token),
      sb.from('settings').select('data').eq('id', 'global'),
    ])
    const row = rows?.[0]
    // Same response for "no such token" and "token belongs to a draft" — no
    // signal for someone probing tokens.
    if (!row || row.data?.status === 'draft') return res.status(404).json({ error: 'This quote link is not valid.' })

    const quote = { ...row.data, id: row.id }
    const { data: designRow } = quote.designId
      ? await sb.from('designs').select('id, data').eq('id', quote.designId).maybeSingle()
      : { data: null }

    // A contract already exists once the quote is accepted — hand the page the
    // signing link so the customer isn't left at a dead end.
    const { data: contractRows } = await sb.from('contracts').select('id, data').eq('data->>quoteId', quote.id)
    const contract = contractRows?.[0]?.data ?? null

    return res.status(200).json({
      quote: publicQuote(quote, {
        design: designRow ? { ...designRow.data, id: designRow.id } : null,
        settings: settRows?.[0]?.data ?? {},
      }),
      signToken: contract?.token ?? null,
    })
  } catch (err) {
    console.error('quote GET error:', err)
    return res.status(500).json({ error: 'Could not load this quote.' })
  }
}
