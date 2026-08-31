// Vercel cron — daily build-stage updates.
//
// Sweeps live projects and emails the customer whenever a build has entered a
// stage they haven't been told about yet. Sending on a sweep rather than on the
// stage change itself means a consultant can nudge a project back and forth
// while sorting something out without firing three emails at the customer.
//
// Idempotent: a stage is only ever announced once, tracked in
// project.notifiedStages.
import { createClient } from '@supabase/supabase-js'
import { requireCronOrAdmin } from './_auth.js'
import { sendStageUpdate } from './_projects.js'

export default async function handler(req, res) {
  const gate = await requireCronOrAdmin(req)
  if (!gate.ok) return res.status(gate.status ?? 401).json({ error: gate.error ?? 'Unauthorized' })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' })
  const sb = createClient(process.env.SUPABASE_URL, serviceKey, { auth: { persistSession: false } })

  try {
    const [{ data: projRows }, { data: custRows }, { data: designRows }, { data: tmplRows }, { data: settRows }] =
      await Promise.all([
        sb.from('projects').select('id, data'),
        sb.from('customers').select('id, data'),
        sb.from('designs').select('id, data'),
        sb.from('templates').select('data'),
        sb.from('settings').select('data').eq('id', 'global'),
      ])

    const customers = (custRows ?? []).map((r) => ({ ...r.data, id: r.id }))
    const designs = (designRows ?? []).map((r) => ({ ...r.data, id: r.id }))
    const templates = (tmplRows ?? []).map((r) => r.data)
    const settings = settRows?.[0]?.data ?? {}

    if (settings?.projects?.stageEmailsEnabled === false) {
      return res.status(200).json({ ok: true, skipped: 'stage emails disabled in settings' })
    }

    let sent = 0, skipped = 0
    for (const row of projRows ?? []) {
      const project = { ...row.data, id: row.id }

      // Handed over — nothing more to announce.
      if (project.completedAt) { skipped++; continue }
      if (!project.stage) { skipped++; continue }
      if ((project.notifiedStages ?? []).includes(project.stage)) { skipped++; continue }

      const customer = customers.find((c) => c.id === project.customerId) ?? null
      const design = designs.find((d) => d.id === project.designId) ?? null

      try {
        const r = await sendStageUpdate({ sb, project, customer, design, stageId: project.stage, templates, settings })
        if (r.ok && !r.skipped) sent++
        else skipped++
      } catch (err) {
        console.error(`project-updates: failed for ${project.id}`, err)
        skipped++
      }
    }

    return res.status(200).json({ ok: true, sent, skipped, total: (projRows ?? []).length })
  } catch (err) {
    console.error('project-updates error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
