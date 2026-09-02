import { NextResponse } from 'next/server'

// X-Homes enquiries stay X-Homes'.
//
// This deliberately does NOT feed the 6Homes CRM — they are different
// companies, and one business's leads do not belong in another's pipeline.
// An enquiry becomes one email to the X-Homes inbox, reply-to the customer,
// and nothing else: no shared lead table, no cross-branded auto-reply, no
// nurture sequence. When X-Homes wants automation, it gets its own.
//
// Sender note: the group's Resend account currently has only 6homes.com
// verified, so the internal notification arrives from that domain until
// x-homes.com.au is verified in Resend (a one-off DNS step). The customer
// never sees this address — it is back-office mail only.

const TO = 'accounts@x-homes.com.au'
const FROM = 'XHomes Website <noreply@6homes.com>'

const str = (v: unknown) => String(v ?? '').trim().slice(0, 2000)
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot: bots fill it, humans never see it. Fake success, no email.
  if (str(body.website)) return NextResponse.json({ ok: true })

  const name = str(body.name)
  const email = str(body.email).toLowerCase()
  const phone = str(body.phone)
  const company = str(body.company)
  const site = str(body.site)
  const message = str(body.message)

  if (!name) return NextResponse.json({ error: 'Please tell us your name.' }, { status: 400 })
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 })
  if (phone.replace(/\D/g, '').length < 8)
    return NextResponse.json({ error: 'That phone number looks too short.' }, { status: 400 })
  if (!message) return NextResponse.json({ error: 'Please tell us a little about your project.' }, { status: 400 })

  const rows: [string, string][] = [
    ['Name', name],
    ['Phone', phone],
    ['Email', email],
    ...(company ? ([['Company', company]] as [string, string][]) : []),
    ...(site ? ([['Project address', site]] as [string, string][]) : []),
  ]

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f4;padding:24px 12px">
<table role="presentation" style="width:100%;max-width:560px;margin:0 auto;border-collapse:collapse;background:#fff">
  <tr><td style="background:#0a0a0b;padding:18px 24px">
    <span style="font-family:Georgia,serif;font-size:16px;letter-spacing:.24em;color:#fff">XHOMES</span>
    <span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:.18em;color:#999;text-transform:uppercase">&nbsp;&nbsp;website enquiry</span>
  </td></tr>
  <tr><td style="padding:24px">
    <table role="presentation" style="width:100%;border-collapse:collapse">
      ${rows
        .map(
          ([k, v]) => `<tr>
        <td style="padding:7px 12px 7px 0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;color:#888;text-transform:uppercase;white-space:nowrap;vertical-align:top">${k}</td>
        <td style="padding:7px 0;font-family:Arial,sans-serif;font-size:14px;color:#111">${esc(v)}</td>
      </tr>`
        )
        .join('')}
    </table>
    <div style="margin-top:16px;padding:14px 16px;background:#f6f6f4;font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222;white-space:pre-wrap">${esc(message)}</div>
    <p style="margin:18px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#888">Reply to this email to answer ${esc(name.split(' ')[0] || 'them')} directly.</p>
  </td></tr>
</table>
</body></html>`

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('enquire: RESEND_API_KEY is not set — enquiry from', email, 'NOT delivered')
    return NextResponse.json(
      { error: 'We couldn’t send that just now — please call us on (03) 7018 2130.' },
      { status: 503 }
    )
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `Enquiry — ${name}${site ? ` · ${site}` : ''}`,
      html,
    }),
  })

  if (!r.ok) {
    const detail = await r.text().catch(() => '')
    console.error('enquire: resend refused', r.status, detail.slice(0, 300))
    return NextResponse.json(
      { error: 'We couldn’t send that just now — please call us on (03) 7018 2130.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
