// Vercel serverless — POST /api/template-preview
// Admin action: render an email template as it will actually send, so the
// Templates screen can show the finished email beside the editor.
//
// Body: { emailType, subject, content }
//   `content` is the editor's UNSAVED draft. Send it empty to preview the
//   built-in default — which is what would go out if the override were reverted.
//
// Read-only: it renders and returns, and never touches `templates` or sends
// anything. The safe-mode fields come back so the screen can show the subject
// line the way it will really arrive while safe mode is on.
import { requireFullAdmin } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { renderPreview } from './_preview.js'
import { DEFAULT_SAFE_RECIPIENT } from './_email.js'

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const gate = await requireFullAdmin(req)
  if (gate.error) return res.status(gate.status).json({ error: gate.error })
  const sb = gate.sb

  const { emailType, subject, content } = req.body ?? {}
  if (!emailType) return res.status(400).json({ error: 'emailType is required.' })

  try {
    const [{ data: settRows }, { data: designRows }] = await Promise.all([
      sb.from('settings').select('data').eq('id', 'global'),
      // A real design makes the design card in the preview look like the one
      // customers get, photo included. The sample stands in if there are none.
      sb.from('designs').select('id, data').limit(1),
    ])

    const settings = settRows?.[0]?.data ?? {}
    const design = designRows?.[0] ? { id: designRows[0].id, ...designRows[0].data } : null

    const rendered = renderPreview({ emailType, subject, content, settings, design })
    if (!rendered) return res.status(404).json({ error: `No email is registered for "${emailType}".` })

    const emails = settings.emails ?? {}
    return res.status(200).json({
      subject: rendered.subject,
      html: rendered.html,
      usingDraft: rendered.usingDraft,
      safeMode: emails.safeMode !== false,
      safeRecipient: emails.safeRecipient || DEFAULT_SAFE_RECIPIENT,
    })
  } catch (err) {
    console.error('template-preview error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
