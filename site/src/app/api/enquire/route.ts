import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Forwards website enquiries to the 6Homes CRM's public intake endpoint, which
// creates the lead, sends the customer their acknowledgement (with the right
// brochure or price list attached) and notifies the sales team.
//
// Server-to-server, so there's no CORS and the CRM endpoint stays off the client.
//
// If the CRM is unreachable — DNS still propagating, admin briefly down, a bad
// deploy — we write the lead straight into Supabase instead. The customer never
// sees an error and the enquiry is never lost; the acknowledgement email is the
// only thing that doesn't happen, and the team can see the lead and reply by hand.

const ENDPOINT = process.env.SIXHOMES_ADMIN_ENDPOINT || 'https://admin.6homes.com/api/form-submit'

const VALID_INTENTS = new Set(['consultation', 'brochure', 'pricelist', 'domestic', 'commercial', 'tour'])

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot — a bot filled a field a human never sees. Report success so it
  // doesn't retry with a different shape.
  if (str(body.website)) return NextResponse.json({ success: true })

  const payload = {
    intent: VALID_INTENTS.has(str(body.intent)) ? str(body.intent) : 'domestic',
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    phone: str(body.phone),
    suburb: str(body.suburb),
    message: str(body.message),
    designSlug: str(body.designSlug),
    budget: str(body.budget),
    timeframe: str(body.timeframe),
    source: str(body.source) || '6homes.com',
  }

  if (!payload.email && !payload.phone) {
    return NextResponse.json({ error: 'Please give us an email address or a phone number.' }, { status: 400 })
  }
  if (payload.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
    return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 })
  }

  // 1. Primary path — the CRM intake.
  try {
    const controller = new AbortController()
    // A form that spins for thirty seconds loses the customer. Give up at eight
    // and use the fallback rather than making them wait.
    const timeout = setTimeout(() => controller.abort(), 8000)
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (r.ok) return NextResponse.json({ success: true })

    // Only 400 and 422 mean "this submission is wrong" — those are worth showing
    // the visitor, because they can fix them. Every other status is the endpoint
    // being missing, unauthorised, rate-limited or broken, which is our problem
    // and not theirs: fall through and capture the lead rather than turning an
    // infrastructure fault into a lost customer.
    if (r.status === 400 || r.status === 422) {
      const detail = await r.json().catch(() => ({}))
      return NextResponse.json({ error: detail?.error || 'We couldn’t accept that enquiry.' }, { status: r.status })
    }
    console.error(`enquire: CRM intake returned ${r.status}, falling back to direct write`)
  } catch (err) {
    console.error('enquire: CRM intake unreachable, falling back to direct write —', err)
  }

  // 2. Fallback — write the lead directly so it is never lost.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.CRM_SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    console.error('enquire: no fallback configured (CRM_SUPABASE_SERVICE_KEY unset)')
    return NextResponse.json(
      { error: 'We couldn’t submit that just now. Please call us on 1800 646 637.' },
      { status: 502 }
    )
  }

  try {
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } })
    const now = new Date().toISOString()
    const id = `lead_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

    const { error } = await sb.from('leads').insert({
      id,
      data: {
        ...payload,
        id,
        stageId: 'stage_new',
        createdAt: now,
        updatedAt: now,
        // Deliberately no nurture block: the acknowledgement never went out, so
        // dropping into a follow-up sequence would have the customer receive
        // "still thinking it over?" as the very first thing they hear from us.
        needsManualAck: true,
        activity: [{ at: now, type: 'created', note: 'Captured via website fallback — CRM intake was unreachable' }],
      },
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, fallback: true })
  } catch (err) {
    console.error('enquire: fallback write failed —', err)
    return NextResponse.json(
      { error: 'We couldn’t submit that just now. Please call us on 1800 646 637.' },
      { status: 502 }
    )
  }
}
