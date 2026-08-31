// Vercel cron — daily reminder for tomorrow's consultations and showroom visits.
//
// Reads `consultAt` on a lead (set by the team from the lead screen) and emails
// the customer the day before. A no-show costs a consultant half a day, and a
// one-line reminder the afternoon before fixes most of them.
//
// Idempotent: `consultReminderSentFor` stores the booking timestamp the reminder
// went out for, so re-running the cron sends nothing, but *rescheduling* the
// appointment correctly arms a fresh reminder.
import { createClient } from '@supabase/supabase-js'
import { requireCronOrAdmin } from './_auth.js'
import { sendEmail } from './_email.js'
import {
  brandFrame, bKicker, bH1, bP, bBtn, bTable, bSmall, esc, COMPANY,
} from './_brand.js'

const SITE = (process.env.PUBLIC_SITE_URL || 'https://6homes.com').replace(/\/+$/, '')

// Australian formatting — these emails are read by people in Melbourne.
const fmt = (iso) => {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Australia/Melbourne' })
  const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Melbourne' })
  return { date, time }
}

function reminderEmail({ lead, settings }) {
  const { date, time } = fmt(lead.consultAt)
  const showroom = settings?.company?.showroom || COMPANY.showroom
  const atShowroom = lead.intent === 'tour' || lead.consultLocation === 'showroom'

  const rows = [
    ['When', `${date}, ${time}`],
    ['Where', atShowroom ? showroom : (lead.consultLocation || 'We\'ll call you')],
  ]
  if (lead.designName) rows.push(['Talking about', esc(lead.designName)])

  return {
    subject: `Tomorrow: your 6Homes ${atShowroom ? 'showroom visit' : 'consultation'}`,
    html: brandFrame(
      bKicker('Tomorrow') +
      bH1(atShowroom ? 'See you at the showroom' : 'See you tomorrow') +
      bP(`Hi ${esc((lead.name || '').split(' ')[0] || 'there')},`) +
      bP(`Just a quick reminder about your ${atShowroom ? 'visit to our display showroom' : 'consultation'} tomorrow.`) +
      bTable(rows) +
      (atShowroom
        ? bBtn('Get directions', `https://maps.google.com/?q=${encodeURIComponent(showroom)}`)
        : bBtn('View our designs beforehand', `${SITE}/models`)) +
      bP(`If tomorrow no longer works, just reply to this email or call us on <a href="${COMPANY.phoneHref}" style="color:#0D7982">${COMPANY.phone}</a> — moving it is no trouble.`) +
      bSmall('— The 6Homes team'),
      { footerLabel: atShowroom ? 'Showroom Visit' : 'Consultation', preheader: `${date}, ${time}` }
    ),
  }
}

export default async function handler(req, res) {
  const gate = await requireCronOrAdmin(req)
  if (!gate.ok) return res.status(gate.status ?? 401).json({ error: gate.error ?? 'Unauthorized' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const [{ data: leadRows }, { data: settRows }] = await Promise.all([
      sb.from('leads').select('id, data'),
      sb.from('settings').select('data').eq('id', 'global'),
    ])
    const settings = settRows?.[0]?.data ?? {}

    // "Tomorrow" in Melbourne, not in UTC — the cron runs at 22:00 UTC, which is
    // already the next morning locally, and getting this wrong sends the
    // reminder either two days early or on the day itself.
    const melbourneToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
    const tomorrow = new Date(`${melbourneToday}T00:00:00`)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowKey = tomorrow.toLocaleDateString('en-CA')

    let sent = 0, skipped = 0
    for (const row of leadRows ?? []) {
      const lead = { ...row.data, id: row.id }
      if (!lead.consultAt || !lead.email) { skipped++; continue }
      if (lead.consultReminderSentFor === lead.consultAt) { skipped++; continue }

      const bookingKey = new Date(lead.consultAt).toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' })
      if (bookingKey !== tomorrowKey) { skipped++; continue }

      try {
        const { subject, html } = reminderEmail({ lead, settings })
        const r = await sendEmail({
          to: lead.email, subject, html,
          replyTo: settings?.emails?.replyTo,
          leadId: lead.id, emailType: 'consult_reminder',
        })
        if (!r.ok) { skipped++; continue }

        const now = new Date().toISOString()
        await sb.from('leads').update({
          data: {
            ...lead,
            consultReminderSentFor: lead.consultAt,
            activity: [...(lead.activity ?? []), { at: now, type: 'reminder', note: 'Sent the day-before reminder' }],
          },
          updated_at: now,
        }).eq('id', lead.id)
        sent++
      } catch (err) {
        console.error(`consult-reminders: failed for ${lead.id}`, err)
        skipped++
      }
    }

    return res.status(200).json({ ok: true, sent, skipped, forDate: tomorrowKey })
  } catch (err) {
    console.error('consult-reminders error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
