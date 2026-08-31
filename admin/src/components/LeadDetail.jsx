import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, MapPin, HardHat, PauseCircle } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Badge, Field, Modal } from './ui.jsx'
import { fmtDateTime, fmtAgo, newId } from '../lib/utils.js'
import { BUILD_STAGES } from '../lib/projectStages.js'

const STATUS_TONE = { sent: 'green', failed: 'red', suppressed: 'amber', skipped: 'amber' }

// <input type="datetime-local"> wants a local "YYYY-MM-DDTHH:mm", but we store
// ISO/UTC. Convert by shifting out the offset rather than slicing the ISO string,
// which would show the UTC time and quietly book people an hour or ten out.
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { leads, designs, projects, emailLog, orderedStages, update, addActivity, create } = useStore()

  const lead = leads.find((l) => l.id === id)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [convertOpen, setConvertOpen] = useState(false)

  const emails = useMemo(
    () => emailLog.filter((e) => e.leadId === id).sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt)),
    [emailLog, id]
  )

  const existingProject = projects.find((p) => p.leadId === id)

  if (!lead) {
    return (
      <div className="p-8">
        <p className="text-sm text-mute">That lead no longer exists.</p>
        <Link to="/leads" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Back to leads</Link>
      </div>
    )
  }

  const stage = orderedStages.find((s) => s.id === lead.stageId)
  const design = designs.find((d) => d.id === lead.designId)

  const run = async (fn) => {
    setBusy(true); setError('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const addNote = () => {
    const text = note.trim()
    if (!text) return
    run(async () => {
      await addActivity(lead.id, { type: 'note', note: text })
      setNote('')
    })
  }

  // Stopping the sequence by hand — for when someone has spoken to the lead but
  // isn't ready to move them out of New yet.
  const stopNurture = () =>
    run(() => update('leads', lead.id, {
      nurture: { ...(lead.nurture ?? {}), done: true, stoppedReason: 'stopped manually' },
      activity: [...(lead.activity ?? []), { at: new Date().toISOString(), type: 'nurture', note: 'Follow-up sequence stopped manually' }],
    }))

  const convert = () =>
    run(async () => {
      const customer = await create('customers', {
        id: newId('cust'),
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        suburb: lead.suburb,
        leadId: lead.id,
      }, 'cust')

      const project = await create('projects', {
        id: newId('proj'),
        name: `${lead.name || 'New build'}${design ? ` — ${design.name}` : ''}`,
        customerId: customer.id,
        leadId: lead.id,
        designId: lead.designId ?? null,
        designName: lead.designName ?? '',
        suburb: lead.suburb ?? '',
        stage: BUILD_STAGES[0].id,
        stageHistory: [{ stage: BUILD_STAGES[0].id, at: new Date().toISOString() }],
        published: false,
      }, 'proj')

      const wonStage = orderedStages.find((s) => s.category === 'closed' && /won/i.test(s.name))
      await update('leads', lead.id, {
        stageId: wonStage?.id ?? lead.stageId,
        customerId: customer.id,
        projectId: project.id,
        nurture: { ...(lead.nurture ?? {}), done: true, stoppedReason: 'converted' },
        activity: [...(lead.activity ?? []), { at: new Date().toISOString(), type: 'converted', note: 'Converted to a project' }],
      })

      setConvertOpen(false)
      navigate(`/projects/${project.id}`)
    })

  const timeline = [...(lead.activity ?? [])].sort((a, b) => new Date(b.at) - new Date(a.at))

  return (
    <>
      <PageHeader title={lead.name || lead.email || lead.phone || 'Lead'} subtitle={lead.intentLabel}>
        <Link to="/leads" className="btn-secondary"><ArrowLeft size={15} /> Back</Link>
        {existingProject ? (
          <Link to={`/projects/${existingProject.id}`} className="btn-primary"><HardHat size={15} /> Open project</Link>
        ) : (
          <button className="btn-primary" onClick={() => setConvertOpen(true)} disabled={busy}>
            <HardHat size={15} /> Convert to project
          </button>
        )}
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 p-7 lg:grid-cols-3">
        {/* ── Left: details ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="card p-5">
            <Field label="Stage">
              <select
                className="field"
                value={lead.stageId}
                disabled={busy}
                onChange={(e) => run(() => update('leads', lead.id, { stageId: e.target.value }))}
              >
                {orderedStages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>

            <Field
              label="Consultation / showroom visit"
              className="mt-4"
              hint="Setting a time arms an automatic reminder the day before."
            >
              <input
                type="datetime-local"
                className="field"
                disabled={busy}
                value={toLocalInput(lead.consultAt)}
                onChange={(e) => run(() => update('leads', lead.id, {
                  consultAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                }))}
              />
            </Field>

            <dl className="mt-5 space-y-3 text-sm">
              {lead.email && (
                <div className="flex items-start gap-2.5">
                  <Mail size={15} className="mt-0.5 shrink-0 text-mute" />
                  <a href={`mailto:${lead.email}`} className="break-all text-brand-600 hover:underline">{lead.email}</a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone size={15} className="mt-0.5 shrink-0 text-mute" />
                  <a href={`tel:${lead.phone}`} className="text-brand-600 hover:underline">{lead.phone}</a>
                </div>
              )}
              {lead.suburb && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-mute" />
                  <span>{lead.suburb}</span>
                </div>
              )}
            </dl>

            <div className="mt-5 space-y-2 border-t border-hair pt-4 text-sm">
              {design && (
                <div className="flex justify-between gap-3">
                  <span className="text-mute">Interested in</span>
                  <Link to={`/designs/${design.id}`} className="text-brand-600 hover:underline">{design.name}</Link>
                </div>
              )}
              {lead.budget && <div className="flex justify-between gap-3"><span className="text-mute">Budget</span><span>{lead.budget}</span></div>}
              {lead.timeframe && <div className="flex justify-between gap-3"><span className="text-mute">Timeframe</span><span>{lead.timeframe}</span></div>}
              <div className="flex justify-between gap-3"><span className="text-mute">Source</span><span>{lead.source}</span></div>
              <div className="flex justify-between gap-3"><span className="text-mute">Enquired</span><span>{fmtDateTime(lead.createdAt)}</span></div>
            </div>
          </div>

          {lead.message && (
            <div className="card p-5">
              <h3 className="mb-2 text-xs tracking-wide text-mute uppercase">Their message</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{lead.message}</p>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-2 text-xs tracking-wide text-mute uppercase">Automated follow-up</h3>
            {lead.nurture?.done ? (
              <p className="text-sm text-mute">
                Stopped — {lead.nurture.stoppedReason ?? 'sequence complete'}.
              </p>
            ) : (
              <>
                <p className="text-sm">
                  {(lead.nurture?.sent ?? []).length} of 3 follow-ups sent. Runs on days 2, 5 and 9, then marks the lead
                  lost at day 14 if there's no reply.
                </p>
                <button className="btn-secondary mt-3 w-full" onClick={stopNurture} disabled={busy}>
                  <PauseCircle size={15} /> Stop the sequence
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Middle: activity ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 text-xs tracking-wide text-mute uppercase">Add a note</h3>
            <textarea
              className="field min-h-24 resize-y"
              placeholder="Called — wants to see the Selina in person…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn-primary mt-2 w-full" onClick={addNote} disabled={busy || !note.trim()}>
              Save note
            </button>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-xs tracking-wide text-mute uppercase">Activity</h3>
            <ol className="space-y-4">
              {timeline.map((a, i) => (
                <li key={`${a.at}-${i}`} className="border-l-2 border-hair pl-3">
                  <div className="text-sm whitespace-pre-wrap">{a.note}</div>
                  <div className="mt-0.5 text-[11px] text-mute">{fmtDateTime(a.at)} · {a.type}</div>
                </li>
              ))}
              {timeline.length === 0 && <li className="text-sm text-mute">Nothing recorded yet.</li>}
            </ol>
          </div>
        </div>

        {/* ── Right: what we've actually sent them ──────────────────────── */}
        <div className="card p-5">
          <h3 className="mb-4 text-xs tracking-wide text-mute uppercase">Emails sent</h3>
          <ol className="space-y-3">
            {emails.map((e) => (
              <li key={e.id} className="border-b border-hair pb-3 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm leading-snug">{e.subject}</span>
                  <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>
                </div>
                <div className="mt-0.5 text-[11px] text-mute">
                  {fmtAgo(e.sentAt)}
                  {e.safeMode && ` · redirected to ${e.redirectedTo}`}
                </div>
                {e.error && <div className="mt-1 text-[11px] text-red-600">{e.error}</div>}
              </li>
            ))}
            {emails.length === 0 && <li className="text-sm text-mute">No email has been sent to this lead.</li>}
          </ol>
        </div>
      </div>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to a project">
        <p className="text-sm leading-relaxed text-mute">
          This creates a customer record and a build project for{' '}
          <strong className="text-ink">{lead.name || lead.email}</strong>, marks the lead won, and stops any remaining
          follow-up emails.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setConvertOpen(false)}>Cancel</button>
          <button className="btn-primary flex-1" onClick={convert} disabled={busy}>
            {busy ? 'Working…' : 'Create project'}
          </button>
        </div>
      </Modal>
    </>
  )
}
