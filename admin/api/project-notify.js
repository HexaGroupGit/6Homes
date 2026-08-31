// Vercel serverless — POST /api/project-notify
// Admin action: send the customer the "your build has reached X" email for one
// project, on demand. The daily cron (project-updates.js) does this
// automatically; this is the button for when you want it to go now.
//
// Body: { projectId, stageId }
import { requireAdmin } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendStageUpdate } from './_projects.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gate = await requireAdmin(req)
  if (gate.error) return res.status(gate.status).json({ error: gate.error })
  const sb = gate.sb

  const { projectId, stageId } = req.body ?? {}
  if (!projectId || !stageId) return res.status(400).json({ error: 'projectId and stageId are required.' })

  try {
    const [{ data: projRow }, { data: tmplRows }, { data: settRows }] = await Promise.all([
      sb.from('projects').select('id, data').eq('id', projectId).maybeSingle(),
      sb.from('templates').select('data'),
      sb.from('settings').select('data').eq('id', 'global'),
    ])
    if (!projRow) return res.status(404).json({ error: 'Project not found.' })

    const project = { ...projRow.data, id: projRow.id }
    const [{ data: custRow }, { data: designRow }] = await Promise.all([
      project.customerId
        ? sb.from('customers').select('id, data').eq('id', project.customerId).maybeSingle()
        : Promise.resolve({ data: null }),
      project.designId
        ? sb.from('designs').select('id, data').eq('id', project.designId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const result = await sendStageUpdate({
      sb,
      project,
      customer: custRow ? { ...custRow.data, id: custRow.id } : null,
      design: designRow ? { ...designRow.data, id: designRow.id } : null,
      stageId,
      templates: (tmplRows ?? []).map((r) => r.data),
      settings: settRows?.[0]?.data ?? {},
    })

    if (!result.ok) return res.status(400).json(result)
    return res.status(200).json(result)
  } catch (err) {
    console.error('project-notify error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
