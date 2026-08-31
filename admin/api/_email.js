// Central outbound-email guard. EVERY email the platform sends — transactional,
// nurture, notification, broadcast — must go through sendEmail() or sendBatch()
// so the safe-mode allowlist is enforced in exactly one place.
//
// Safe mode (settings.emails.safeMode) redirects ALL recipients to a single
// address (settings.emails.safeRecipient) so real sending can be wired up and
// tested without any customer ever receiving an email. It is ON by default — the
// block only lifts when safeMode is explicitly set to false in Settings.
//
// Ported from Hexa Space RND api/_email.js, with delivery logging folded in so
// there is no path that sends without leaving a record.
import { createClient } from '@supabase/supabase-js'

export const DEFAULT_SAFE_RECIPIENT = 'eric@hexaspace.com.au'
const RESEND_URL = 'https://api.resend.com/emails'

// The settings row is read on nearly every send; cache it briefly so a burst
// (e.g. the nurture cron walking 200 leads) is one query, not 200.
let _cache = { at: 0, val: null }

function serviceClient() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getSafeConfig() {
  const now = Date.now()
  if (_cache.val && now - _cache.at < 20000) return _cache.val
  try {
    const sb = serviceClient()
    if (sb) {
      const { data } = await sb.from('settings').select('data').eq('id', 'global')
      const s = data?.[0]?.data ?? {}
      const e = s.emails ?? {}
      const val = {
        mode: e.safeMode !== false,
        to: e.safeRecipient || DEFAULT_SAFE_RECIPIENT,
        // Unsubscribed addresses (Settings → Emails). The platform never emails
        // these, on any flow. Compared lowercase.
        suppressed: (Array.isArray(e.suppressed) ? e.suppressed : [])
          .map((a) => String(a).toLowerCase().trim())
          .filter(Boolean),
        fromName: e.fromName || s.company?.name || '6Homes',
        fromEmail: e.fromEmail || 'noreply@6homes.com',
        replyTo: e.replyTo || '',
      }
      _cache = { at: now, val }
      return val
    }
  } catch (err) {
    console.error('email safe-config read failed:', err)
  }
  // Fail safe: if the setting can't be read, block everything but the default.
  return { mode: true, to: DEFAULT_SAFE_RECIPIENT, suppressed: [], fromName: '6Homes', fromEmail: 'noreply@6homes.com', replyTo: '' }
}

// Test seam + a way for Settings to force a re-read after saving.
export function clearEmailConfigCache() {
  _cache = { at: 0, val: null }
}

// The default `From:` / `Reply-To:`, resolved from Settings. Callers that don't
// care about branding per-flow can just omit `from` and get this.
export async function defaultFrom() {
  const safe = await getSafeConfig()
  return { from: `${safe.fromName} <${safe.fromEmail}>`, replyTo: safe.replyTo }
}

const isSuppressed = (safe, addr) => safe.suppressed.includes(String(addr ?? '').toLowerCase().trim())

const SAFE_BANNER = (orig, to) =>
  `<div style="background:#fff3cd;border:1px solid #ffe69c;color:#664d03;padding:10px 14px;font-family:Arial,sans-serif;font-size:12px;margin-bottom:12px">
    <strong>Safe mode is ON.</strong> This email would normally go to: ${orig || '—'}. All outbound email is being redirected to ${to} until safe mode is turned off in Settings.
  </div>`

// Record every attempt — delivered, suppressed or failed — so the CRM can show
// "what did we actually send this person". Never throws: a logging failure must
// not fail the send.
async function logEmail(entry) {
  try {
    const sb = serviceClient()
    if (!sb) return
    const id = `em_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    await sb.from('email_log').insert({ id, data: { id, sentAt: new Date().toISOString(), ...entry } })
  } catch (err) {
    console.error('email_log write failed:', err)
  }
}

/**
 * Send one email.
 * payload: { from, to, subject, html, replyTo, cc, bcc, attachments,
 *            leadId, customerId, projectId, emailType }
 * The trailing ids/emailType are not sent to Resend — they tag the log row so
 * the CRM can show a lead's email history.
 * Returns { ok, skipped?, reason?, status?, data? }.
 */
export async function sendEmail(payload = {}) {
  const { leadId, customerId, projectId, emailType, ...mail } = payload
  const tag = { leadId, customerId, projectId, emailType }

  const apiKey = process.env.RESEND_API_KEY
  const safe = await getSafeConfig()

  const p = {
    from: mail.from || `${safe.fromName} <${safe.fromEmail}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
  }
  const replyTo = mail.replyTo ?? mail.reply_to ?? safe.replyTo
  if (replyTo) p.reply_to = replyTo
  if (mail.cc) p.cc = Array.isArray(mail.cc) ? mail.cc : [mail.cc]
  if (mail.bcc) p.bcc = Array.isArray(mail.bcc) ? mail.bcc : [mail.bcc]
  if (mail.attachments?.length) p.attachments = mail.attachments

  // Unsubscribed addresses: drop them from every recipient field. If nobody is
  // left to address, skip entirely — reported ok+skipped so callers treat it as
  // a non-event rather than a failure.
  const toList = (Array.isArray(p.to) ? p.to : [p.to]).filter(Boolean).filter((a) => !isSuppressed(safe, a))
  if (!toList.length) {
    await logEmail({ ...tag, to: mail.to, subject: mail.subject, status: 'suppressed' })
    return { ok: true, skipped: true, reason: 'suppressed' }
  }
  p.to = toList
  if (p.cc) { p.cc = p.cc.filter((a) => !isSuppressed(safe, a)); if (!p.cc.length) delete p.cc }
  if (p.bcc) { p.bcc = p.bcc.filter((a) => !isSuppressed(safe, a)); if (!p.bcc.length) delete p.bcc }

  const intendedTo = [...toList]

  if (safe.mode) {
    // Redirect everything to the single safe recipient; strip cc/bcc so nobody
    // else is copied, and flag the subject so it's obviously a test send.
    const orig = intendedTo.join(', ')
    p.to = [safe.to]
    delete p.cc
    delete p.bcc
    p.subject = `[TEST → ${safe.to}] ${mail.subject || ''}`.trim()
    p.html = `${SAFE_BANNER(orig, safe.to)}${mail.html || ''}`
  }

  // No key configured — nothing can send. Still logged, so a misconfigured
  // environment is visible in the CRM instead of silently dropping mail.
  if (!apiKey) {
    await logEmail({ ...tag, to: intendedTo, subject: mail.subject, status: 'skipped', reason: 'no_key', safeMode: safe.mode })
    return { ok: false, skipped: true, reason: 'no_key' }
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    let data = null
    try { data = await res.json() } catch { /* non-JSON error body */ }
    await logEmail({
      ...tag,
      to: intendedTo,
      subject: mail.subject,
      status: res.ok ? 'sent' : 'failed',
      safeMode: safe.mode,
      redirectedTo: safe.mode ? safe.to : undefined,
      providerId: data?.id,
      error: res.ok ? undefined : JSON.stringify(data ?? {}).slice(0, 500),
    })
    return { ok: res.ok, status: res.status, data }
  } catch (err) {
    console.error('sendEmail error:', err)
    await logEmail({ ...tag, to: intendedTo, subject: mail.subject, status: 'failed', error: String(err).slice(0, 500) })
    return { ok: false, error: String(err) }
  }
}

/**
 * Send many INDIVIDUALLY-addressed emails in one request (Resend batch, max 100
 * per call). Each recipient gets their own email with a proper `To:` — no shared
 * BCC, which providers spam-filter when the envelope `to` is a no-reply address.
 *
 * Safe mode still applies: the whole batch collapses to a single email to the
 * safe recipient, so a broadcast can never escape during testing.
 * messages: [{ from, to, subject, html, replyTo }]. Returns { ok, status, sent }.
 */
export async function sendBatch(messages = []) {
  const apiKey = process.env.RESEND_API_KEY
  if (!messages.length) return { ok: true, sent: 0 }

  const safe = await getSafeConfig()

  let batch = messages
    .map((m) => {
      const p = {
        from: m.from || `${safe.fromName} <${safe.fromEmail}>`,
        to: (Array.isArray(m.to) ? m.to : [m.to]).filter(Boolean).filter((a) => !isSuppressed(safe, a)),
        subject: m.subject,
        html: m.html,
      }
      const replyTo = m.replyTo ?? m.reply_to ?? safe.replyTo
      if (replyTo) p.reply_to = replyTo
      return p
    })
    .filter((p) => p.to.length)
  if (!batch.length) return { ok: true, sent: 0 }

  const realCount = batch.length

  if (safe.mode) {
    // Collapse the entire batch to ONE email to the safe recipient.
    const first = batch[0]
    batch = [{
      from: first.from,
      to: [safe.to],
      ...(first.reply_to ? { reply_to: first.reply_to } : {}),
      subject: `[TEST → ${safe.to}] ${first.subject || ''}`.trim(),
      html: `<div style="background:#fff3cd;border:1px solid #ffe69c;color:#664d03;padding:10px 14px;font-family:Arial,sans-serif;font-size:12px;margin-bottom:12px">
        <strong>Safe mode is ON.</strong> This would normally go individually to ${realCount} recipient${realCount === 1 ? '' : 's'}. All outbound email is redirected to ${safe.to} until safe mode is turned off in Settings.
      </div>${first.html || ''}`,
    }]
  }

  if (!apiKey) {
    await logEmail({ subject: messages[0]?.subject, status: 'skipped', reason: 'no_key', batchSize: realCount })
    return { ok: false, skipped: true, reason: 'no_key', sent: 0 }
  }

  try {
    const res = await fetch(`${RESEND_URL}/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    })
    let data = null
    try { data = await res.json() } catch { /* ignore */ }
    await logEmail({
      subject: messages[0]?.subject,
      status: res.ok ? 'sent' : 'failed',
      batchSize: realCount,
      safeMode: safe.mode,
      error: res.ok ? undefined : JSON.stringify(data ?? {}).slice(0, 500),
    })
    // In safe mode the real recipients got nothing (only the safe address did).
    return { ok: res.ok, status: res.status, data, sent: res.ok ? (safe.mode ? 0 : realCount) : 0 }
  } catch (err) {
    console.error('sendBatch error:', err)
    await logEmail({ subject: messages[0]?.subject, status: 'failed', batchSize: realCount, error: String(err).slice(0, 500) })
    return { ok: false, error: String(err), sent: 0 }
  }
}
