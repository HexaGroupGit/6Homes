import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Send, CircleDot, Circle } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { apiPost } from '../lib/apiFetch.js'
import { PageHeader, Field, Badge } from './ui.jsx'
import { fmtDate, fmtDateTime, mediaUrl } from '../lib/utils.js'
import { BUILD_STAGES, stageIndex, isFinalStage } from '../lib/projectStages.js'

export default function ProjectDetail() {
  const { id } = useParams()
  const { projects, customers, designs, emailLog, update } = useStore()

  const project = projects.find((p) => p.id === id)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-sm text-mute">That project no longer exists.</p>
        <Link to="/projects" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Back to projects</Link>
      </div>
    )
  }

  const customer = customers.find((c) => c.id === project.customerId)
  const design = designs.find((d) => d.id === project.designId)
  const current = stageIndex(project.stage)
  const emails = emailLog
    .filter((e) => e.projectId === id)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))

  const run = async (key, fn) => {
    setBusy(key); setError(''); setNotice('')
    try { await fn() } catch (err) { setError(err.message) } finally { setBusy('') }
  }

  const moveToStage = (stageId) =>
    run(`stage-${stageId}`, () => {
      const now = new Date().toISOString()
      return update('projects', id, {
        stage: stageId,
        stageHistory: [...(project.stageHistory ?? []), { stage: stageId, at: now }],
        // Reaching the last stage doesn't finish the build — handover does, and
        // that's marked explicitly below.
        ...(isFinalStage(stageId) ? {} : { completedAt: null }),
      })
    })

  const markComplete = () =>
    run('complete', () => update('projects', id, { completedAt: new Date().toISOString() }))

  // The stage email is sent server-side so it goes through the same safe-mode
  // guard and lands in the email log like every other send.
  const notifyCustomer = (stageId) =>
    run(`notify-${stageId}`, async () => {
      const r = await apiPost('/api/project-notify', { projectId: id, stageId })
      setNotice(r?.skipped ? `Not sent: ${r.reason}` : 'Update email sent.')
    })

  const setStageField = (stageId, patch) =>
    run(`field-${stageId}`, () =>
      update('projects', id, {
        stageDetail: { ...(project.stageDetail ?? {}), [stageId]: { ...(project.stageDetail?.[stageId] ?? {}), ...patch } },
      })
    )

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={[customer?.name, project.designName, project.suburb].filter(Boolean).join(' · ')}
      >
        <Link to="/projects" className="btn-secondary"><ArrowLeft size={15} /> Back</Link>
        {!project.completedAt && (
          <button className="btn-primary" onClick={markComplete} disabled={!!busy}>
            <Check size={15} /> Mark handed over
          </button>
        )}
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="bg-emerald-50 px-7 py-2 text-sm text-emerald-800">{notice}</div>}

      <div className="grid gap-6 p-7 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-xs tracking-wide text-mute uppercase">Build progress</h2>

          {BUILD_STAGES.map((s, i) => {
            const state = i < current ? 'done' : i === current ? 'current' : 'todo'
            const detail = project.stageDetail?.[s.id] ?? {}
            const reached = project.stageHistory?.find((h) => h.stage === s.id)
            return (
              <div
                key={s.id}
                className={`card p-5 ${state === 'current' ? 'border-brand-400 ring-1 ring-brand-400/40' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {state === 'done' ? (
                      <Check size={17} className="text-brand-600" />
                    ) : state === 'current' ? (
                      <CircleDot size={17} className="text-brand-400" />
                    ) : (
                      <Circle size={17} className="text-hair" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-medium ${state === 'todo' ? 'text-mute' : ''}`}>
                        {i + 1}. {s.name}
                      </span>
                      {state === 'current' && <Badge tone="blue">Current</Badge>}
                      {reached && <span className="text-[11px] text-mute">Reached {fmtDate(reached.at)}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-mute">{s.blurb}</p>

                    {(state === 'current' || state === 'done') && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Field label="Target date">
                          <input
                            type="date"
                            className="field"
                            defaultValue={detail.targetDate ?? ''}
                            onBlur={(e) => setStageField(s.id, { targetDate: e.target.value })}
                          />
                        </Field>
                        <Field label="Actual date">
                          <input
                            type="date"
                            className="field"
                            defaultValue={detail.actualDate ?? ''}
                            onBlur={(e) => setStageField(s.id, { actualDate: e.target.value })}
                          />
                        </Field>
                        <Field label="Notes" className="sm:col-span-2">
                          <textarea
                            className="field min-h-20 resize-y"
                            defaultValue={detail.notes ?? ''}
                            onBlur={(e) => setStageField(s.id, { notes: e.target.value })}
                            placeholder="Anything the team needs to know about this stage…"
                          />
                        </Field>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {state !== 'current' && (
                        <button className="btn-secondary text-xs" onClick={() => moveToStage(s.id)} disabled={!!busy}>
                          {state === 'done' ? 'Move back here' : 'Move to this stage'}
                        </button>
                      )}
                      {state !== 'todo' && (
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => notifyCustomer(s.id)}
                          disabled={!!busy || !customer?.email}
                          title={customer?.email ? 'Send the customer this stage update' : 'No email on file for this customer'}
                        >
                          <Send size={13} /> Email the customer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="mb-3 text-xs tracking-wide text-mute uppercase">Customer</h3>
            {customer ? (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-xs text-mute">Name</dt><dd>{customer.name || '—'}</dd></div>
                <div>
                  <dt className="text-xs text-mute">Email</dt>
                  <dd>{customer.email ? <a href={`mailto:${customer.email}`} className="break-all text-brand-600 hover:underline">{customer.email}</a> : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-mute">Phone</dt>
                  <dd>{customer.phone ? <a href={`tel:${customer.phone}`} className="text-brand-600 hover:underline">{customer.phone}</a> : '—'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-mute">No customer linked.</p>
            )}
            {project.leadId && (
              <Link to={`/leads/${project.leadId}`} className="mt-3 inline-block text-xs text-brand-600 hover:underline">
                View the original enquiry
              </Link>
            )}
          </div>

          {design && (
            <div className="card overflow-hidden">
              {design.heroImage && <img src={mediaUrl(design.heroImage)} alt={design.name} className="aspect-[4/3] w-full object-cover" />}
              <div className="p-4">
                <div className="text-xs tracking-wide text-mute uppercase">Design</div>
                <Link to={`/designs/${design.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                  {design.name}
                </Link>
                <div className="mt-1 text-xs text-mute">
                  {[design.bedrooms && `${design.bedrooms} bed`, design.bathrooms && `${design.bathrooms} bath`, design.areaSqm && `${design.areaSqm} m²`]
                    .filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="mb-3 text-xs tracking-wide text-mute uppercase">Emails sent</h3>
            <ol className="space-y-3">
              {emails.map((e) => (
                <li key={e.id} className="border-b border-hair pb-3 text-sm last:border-0 last:pb-0">
                  <div className="leading-snug">{e.subject}</div>
                  <div className="mt-0.5 text-[11px] text-mute">{fmtDateTime(e.sentAt)} · {e.status}</div>
                </li>
              ))}
              {emails.length === 0 && <li className="text-sm text-mute">Nothing sent for this build yet.</li>}
            </ol>
          </div>
        </div>
      </div>
    </>
  )
}
