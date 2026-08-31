// Vercel serverless function — POST /api/form-submit
//
// The single public intake for every 6Homes website form: consultation,
// brochure, price list, domestic enquiry, commercial enquiry and showroom tour.
// Turns a submission into a lead, acknowledges the customer with the right
// branded email (and the right PDF attached), and notifies the sales team.
//
// Uses the service role to write past RLS, like the other server endpoints.
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. RESEND_API_KEY optional
// (without it the lead is still captured, the email is just skipped).
//
// Body:
//   { intent, name, email, phone, suburb, message, designSlug,
//     budget, timeframe, source, ref, website }
//   `website` is a honeypot — if filled we treat it as a bot and no-op.
//
// Ported from Hexa Space RND api/form-submit.js.
import { createClient } from '@supabase/supabase-js'
import { applyCors, methodNotAllowed } from './_cors.js'
import {
  INTENTS, resolveIntent, attachmentsFor, renderLeadEmail, notifyList,
  newId, adminUrl, sendLeadEmail,
} from './_leads.js'
import { teamNotifyEmail } from './_leadEmails.js'
import { sendEmail } from './_email.js'
import { contactError } from './_contact.js'

const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim())

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const body = req.body ?? {}

  // Honeypot — pretend success so bots don't retry with a different shape.
  if (str(body.website)) return res.status(200).json({ success: true })

  const name = str(body.name)
  const email = str(body.email).toLowerCase()
  const phone = str(body.phone)
  const suburb = str(body.suburb)
  const message = str(body.message)
  const designSlug = str(body.designSlug)
  const budget = str(body.budget)
  const timeframe = str(body.timeframe)
  const source = str(body.source) || '6homes.com'
  const ref = str(body.ref)

  // Both an email address and a phone number, on every form. This is the real
  // boundary: the website checks the same rule in the browser and again in its
  // own route, but neither is binding — anything can POST here.
  //
  // Kept word-for-word in step with site/src/lib/contact.ts, so a visitor never
  // sees one message from the browser and a different one from the server.
  const contact = contactError({ email, phone })
  if (contact) return res.status(400).json({ error: contact })

  const intentKey = resolveIntent(body.intent)
  const intent = INTENTS[intentKey]

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('form-submit: SUPABASE_SERVICE_ROLE_KEY not set')
    return res.status(500).json({ error: 'Not configured' })
  }
  const supabase = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const [{ data: stageRows }, { data: tmplRows }, { data: settRows }, { data: designRows }] = await Promise.all([
      supabase.from('lead_pipeline_stages').select('data'),
      supabase.from('templates').select('data'),
      supabase.from('settings').select('data').eq('id', 'global'),
      designSlug ? supabase.from('designs').select('id, data').eq('data->>slug', designSlug) : Promise.resolve({ data: [] }),
    ])

    const stages = (stageRows ?? []).map((r) => r.data)
    const templates = (tmplRows ?? []).map((r) => r.data)
    const settings = settRows?.[0]?.data ?? {}
    const design = designRows?.[0] ? { id: designRows[0].id, ...designRows[0].data } : null

    // Land in the first 'new' stage so the nurture cron picks it up.
    const newStage = stages.filter((s) => s.category === 'new').sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]

    const now = new Date().toISOString()
    const lead = {
      id: newId('lead'),
      name,
      email,
      phone,
      suburb,
      message,
      budget,
      timeframe,
      source,
      ref,
      intent: intentKey,
      intentLabel: intent.label,
      designId: design?.id ?? null,
      designName: design?.name ?? '',
      stageId: newStage?.id ?? 'stage_new',
      createdAt: now,
      updatedAt: now,
      // Nurture state — lead-nurture.js reads and advances this. `sent` records
      // which steps have fired so a re-run can never double-send.
      nurture: { startedAt: now, sent: [], done: false },
      activity: [{ at: now, type: 'created', note: `${intent.label} from ${source}` }],
    }

    const { error: insertErr } = await supabase.from('leads').insert({ id: lead.id, data: lead })
    if (insertErr) {
      console.error('form-submit: lead insert failed', insertErr)
      return res.status(500).json({ error: 'Could not save your enquiry.' })
    }

    // ── Customer acknowledgement ────────────────────────────────────────────
    // Fire-and-report: an email failure must not fail the submission. The lead
    // is already saved, and the team notification below still goes out.
    let acknowledged = false
    if (email) {
      try {
        const { subject, html } = renderLeadEmail({
          emailType: intent.emailType,
          templates,
          lead,
          design,
          settings,
          builder: intent.build,
        })
        const attachments = await attachmentsFor(intentKey, settings)
        const r = await sendLeadEmail({
          to: email, subject, html, attachments,
          leadId: lead.id, emailType: intent.emailType, settings,
        })
        acknowledged = !!r.ok
      } catch (err) {
        console.error('form-submit: acknowledgement failed', err)
      }
    }

    // ── Team notification ───────────────────────────────────────────────────
    try {
      const notify = notifyList(settings)
      const { subject, html } = teamNotifyEmail({
        lead,
        intentLabel: intent.label,
        adminUrl: adminUrl(settings),
      })
      await sendEmail({
        to: notify,
        subject,
        html,
        replyTo: email || undefined, // reply goes straight to the customer
        leadId: lead.id,
        emailType: 'team_new_lead',
      })
    } catch (err) {
      console.error('form-submit: team notification failed', err)
    }

    return res.status(200).json({ success: true, leadId: lead.id, acknowledged })
  } catch (err) {
    console.error('form-submit error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please call us on 1800 646 637.' })
  }
}
