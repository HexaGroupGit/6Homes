// Vercel cron — daily lead nurture. Advances website enquiries through the
// follow-up sequence and parks cold ones in Lost.
//
// A lead is only chased while it is still sitting in a "new" stage. The moment
// the team moves it forward — contacted, consult booked, quoted, won — the
// sequence stops on its own, so nobody gets an automated "still thinking it
// over?" the day after they spoke to a real person.
//
// Ported from Hexa Space RND api/lead-nurture.js.
import { createClient } from '@supabase/supabase-js'
import { requireCronOrAdmin } from './_auth.js'
import {
  renderLeadEmail, NURTURE_BUILDERS, daysBetween, sendLeadEmail,
} from './_leads.js'

// Cadence, in days since the enquiry. Each step sends at most once, tracked by
// `id` in lead.nurture.sent.
const STEPS = [
  { id: 'd2', afterDays: 2, emailType: 'lead_followup' },
  { id: 'd5', afterDays: 5, emailType: 'lead_followup' },
  { id: 'd9', afterDays: 9, emailType: 'lead_final' },
]
const LOST_AFTER = 14

export default async function handler(req, res) {
  const gate = await requireCronOrAdmin(req)
  if (!gate.ok) return res.status(gate.status ?? 401).json({ error: gate.error ?? 'Unauthorized' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const supabase = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const [{ data: leadRows }, { data: stageRows }, { data: tmplRows }, { data: settRows }, { data: designRows }] =
      await Promise.all([
        supabase.from('leads').select('id, data'),
        supabase.from('lead_pipeline_stages').select('data'),
        supabase.from('templates').select('data'),
        supabase.from('settings').select('data').eq('id', 'global'),
        supabase.from('designs').select('id, data'),
      ])

    const stages = (stageRows ?? []).map((r) => r.data)
    const templates = (tmplRows ?? []).map((r) => r.data)
    const settings = settRows?.[0]?.data ?? {}
    const designs = (designRows ?? []).map((r) => ({ id: r.id, ...r.data }))

    // An explicit off switch, so the team can pause automation without a deploy.
    if (settings?.leads?.nurtureEnabled === false) {
      return res.status(200).json({ ok: true, skipped: 'nurture disabled in settings' })
    }

    const newStageIds = new Set(stages.filter((s) => s.category === 'new').map((s) => s.id))
    const lostStage =
      stages.find((s) => s.category === 'lost') || stages.find((s) => /lost/i.test(s.name || ''))

    const today = new Date().toISOString()
    let sent = 0, lost = 0, skipped = 0

    for (const row of leadRows ?? []) {
      const lead = row.data
      const n = lead?.nurture
      if (!n || n.done) { skipped++; continue }

      // The team has moved it on — automation's job is over.
      if (!newStageIds.has(lead.stageId)) {
        await supabase.from('leads').update({
          data: { ...lead, nurture: { ...n, done: true, stoppedReason: 'stage advanced' } },
          updated_at: today,
        }).eq('id', row.id)
        skipped++
        continue
      }

      // No email to chase — leave it for the team to phone.
      if (!lead.email) { skipped++; continue }

      const age = daysBetween(n.startedAt || lead.createdAt, today)

      // Cold: park in Lost and stop.
      if (age >= LOST_AFTER) {
        await supabase.from('leads').update({
          data: {
            ...lead,
            stageId: lostStage?.id ?? lead.stageId,
            nurture: { ...n, done: true, stoppedReason: 'no response' },
            updatedAt: today,
            activity: [...(lead.activity ?? []), { at: today, type: 'auto-lost', note: `No response after ${LOST_AFTER} days` }],
          },
          updated_at: today,
        }).eq('id', row.id)
        lost++
        continue
      }

      // The latest step that is due and hasn't been sent. Taking the *last*
      // match (not the first) means a lead that somehow went a few days without
      // a cron run gets the step it's actually due, not a backlog of all of them.
      const due = STEPS.filter((s) => age >= s.afterDays && !(n.sent ?? []).includes(s.id)).pop()
      if (!due) { skipped++; continue }

      const design = designs.find((d) => d.id === lead.designId) ?? null

      try {
        const { subject, html } = renderLeadEmail({
          emailType: due.emailType,
          templates,
          lead,
          design,
          settings,
          builder: NURTURE_BUILDERS[due.emailType],
        })
        const r = await sendLeadEmail({
          to: lead.email, subject, html,
          leadId: lead.id, emailType: due.emailType, settings,
        })

        // Only mark the step sent if it actually went. A transient Resend
        // failure should retry tomorrow rather than silently skip the step.
        if (r.ok) {
          await supabase.from('leads').update({
            data: {
              ...lead,
              nurture: { ...n, sent: [...(n.sent ?? []), due.id], lastSentAt: today },
              updatedAt: today,
              activity: [...(lead.activity ?? []), { at: today, type: 'nurture', note: `Sent ${due.emailType} (day ${due.afterDays})` }],
            },
            updated_at: today,
          }).eq('id', row.id)
          sent++
        } else {
          skipped++
        }
      } catch (err) {
        console.error(`lead-nurture: step ${due.id} failed for ${row.id}`, err)
        skipped++
      }
    }

    return res.status(200).json({ ok: true, sent, lost, skipped, total: (leadRows ?? []).length })
  } catch (err) {
    console.error('lead-nurture error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
