import { useMemo, useRef, useState } from 'react'
import {
  UserPlus, X, Plus, Send, Download, Trash2, Check, XCircle, Upload, FileText, Mail, ExternalLink,
} from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { apiPost } from '../lib/apiFetch.js'
import { Field, Badge, Modal } from './ui.jsx'
import { cn, fmtDate, fmtDateTime } from '../lib/utils.js'
import {
  DOCS_BUCKET, DOC_LIBRARY, APPROVAL_LIBRARY, docStatusMeta, fmtBytes,
  clientEmails, fileRejectionReason,
} from '../lib/portal.js'
import { BUILD_STAGES, stageById } from '../lib/projectStages.js'

const post = (action, body) => apiPost('/api/portal', { action, ...body })

const PORTAL_ORIGIN = (import.meta.env.VITE_PORTAL_URL || window.location.origin).replace(/\/+$/, '')

/**
 * The staff side of the client portal, mounted inside ProjectDetail.
 *
 * Everything here writes through /api/portal rather than the store. The store
 * saves the whole project record from whatever it held at page load, which
 * silently discards anything the customer did in the meantime — and on this
 * panel, in particular, the customer is doing things.
 */
export default function ProjectPortal({ project, onChanged }) {
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [picker, setPicker] = useState(null) // 'docRequests' | 'approvals'

  const emails = clientEmails(project)
  const docRequests = project.docRequests ?? []
  const approvals = project.approvals ?? []
  const sharedDocs = project.sharedDocs ?? []
  const messages = useMemo(
    () => [...(project.messages ?? [])].sort((a, b) => new Date(a.at) - new Date(b.at)),
    [project.messages]
  )

  const run = async (key, fn) => {
    setBusy(key); setError(''); setNotice('')
    try {
      const r = await fn()
      if (r?.note) setNotice(r.note)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const openFile = (path) => run(`dl-${path}`, async () => {
    const { url } = await post('admin-download-url', { projectId: project.id, path })
    window.open(url, '_blank', 'noopener')
  })

  return (
    <div id="portal" className="scroll-mt-6 space-y-5">
      {error && <div className="rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</div>}

      {/* ── Access ─────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-navy">Portal access</h3>
            <p className="mt-0.5 text-xs text-mute">
              Who can sign in and see this build. Inviting someone emails them a link — there's no password.
            </p>
          </div>
          {emails.length > 0 && (
            <a
              href={`${PORTAL_ORIGIN}/portal/${project.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs"
            >
              <ExternalLink size={13} /> View as they see it
            </a>
          )}
        </div>

        {emails.length > 0 && (
          <ul className="mt-4 space-y-2">
            {emails.map((e) => (
              <li key={e} className="flex items-center gap-3 rounded-md bg-brand-50 px-3 py-2 text-sm">
                <Mail size={14} className="shrink-0 text-mute" />
                <span className="min-w-0 flex-1 truncate">{e}</span>
                {project.portalInvitedAt?.[e] && (
                  <span className="hidden shrink-0 text-[11px] text-mute sm:inline">
                    invited {fmtDate(project.portalInvitedAt[e])}
                  </span>
                )}
                <button
                  className="shrink-0 text-mute hover:text-navy"
                  title="Send them a fresh sign-in link"
                  disabled={!!busy}
                  onClick={() => run(`re-${e}`, async () => {
                    const r = await post('invite', { projectId: project.id, email: e })
                    return { note: r.skipped ? `Not sent: ${r.reason}` : `Sign-in link sent to ${e}.` }
                  })}
                >
                  <Send size={14} />
                </button>
                <button
                  className="shrink-0 text-mute hover:text-red-600"
                  title="Remove their access"
                  disabled={!!busy}
                  onClick={() => run(`rm-${e}`, () => post('revoke', { projectId: project.id, email: e }))}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <InviteForm projectId={project.id} busy={busy} run={run} />
      </div>

      {/* ── Documents we've asked for ──────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-navy">Documents we need</h3>
            <p className="mt-0.5 text-xs text-mute">What the customer uploads. They see these the moment you add them.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary text-xs" onClick={() => setPicker('docRequests')} disabled={!!busy}>
              <Plus size={14} /> Add
            </button>
            {docRequests.some((d) => d.status === 'requested') && (
              <button
                className="btn-primary text-xs"
                disabled={!!busy || !emails.length}
                title={emails.length ? 'Email the customer everything still outstanding' : 'Invite the customer first'}
                onClick={() => run('ask', async () => {
                  const ids = docRequests.filter((d) => d.status === 'requested' || d.status === 'rejected').map((d) => d.id)
                  const r = await post('request-docs', { projectId: project.id, requestIds: ids })
                  return { note: r.skipped ? `Not sent: ${r.reason}` : `Asked for ${r.count} document${r.count === 1 ? '' : 's'}.` }
                })}
              >
                <Send size={14} /> {busy === 'ask' ? 'Sending…' : 'Email the list'}
              </button>
            )}
          </div>
        </div>

        {docRequests.length === 0 ? (
          <p className="mt-4 text-sm text-mute">Nothing requested yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {docRequests.map((d) => {
              const meta = docStatusMeta(d.status)
              return (
                <li key={d.id} className="rounded-md border border-hair p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{d.label}</span>
                        <Badge tone={meta.tone === 'amber' ? 'neutral' : meta.tone === 'red' ? 'red' : meta.tone}>
                          {meta.label}
                        </Badge>
                        {d.required === false && <span className="text-[11px] text-mute">optional</span>}
                        {d.stage && <span className="text-[11px] text-mute">· {stageById(d.stage)?.name}</span>}
                      </div>
                      {d.note && <p className="mt-1 max-w-xl text-xs leading-relaxed text-mute">{d.note}</p>}
                    </div>
                    <button
                      className="shrink-0 text-mute hover:text-red-600"
                      title="Remove this request and any files against it"
                      disabled={!!busy}
                      onClick={() => run(`rmd-${d.id}`, () => post('remove-item', { projectId: project.id, list: 'docRequests', itemId: d.id }))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {(d.files ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {d.files.map((f) => (
                        <li key={f.id} className="flex items-center gap-2.5 rounded bg-brand-50 px-2.5 py-1.5 text-xs">
                          <FileText size={13} className="shrink-0 text-mute" />
                          <span className="min-w-0 flex-1 truncate">{f.name}</span>
                          <span className="shrink-0 text-[11px] text-mute">{fmtBytes(f.size)} · {fmtDate(f.uploadedAt)}</span>
                          <button className="shrink-0 text-mute hover:text-navy" title="Download" onClick={() => openFile(f.path)}>
                            <Download size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {d.reviewNote && (
                    <p className="mt-2 text-xs text-mute">
                      <span className="font-medium">Note to them:</span> {d.reviewNote}
                    </p>
                  )}

                  {(d.files ?? []).length > 0 && d.status !== 'accepted' && (
                    <ReviewRow projectId={project.id} request={d} busy={busy} run={run} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* ── Approvals ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-navy">Approvals</h3>
            <p className="mt-0.5 text-xs text-mute">Milestones the customer signs off, with their name and the time recorded.</p>
          </div>
          <button className="btn-secondary text-xs" onClick={() => setPicker('approvals')} disabled={!!busy}>
            <Plus size={14} /> Add
          </button>
        </div>

        {approvals.length === 0 ? (
          <p className="mt-4 text-sm text-mute">Nothing waiting on a sign-off.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-md border border-hair p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{a.label}</span>
                    <Badge tone={a.status === 'approved' ? 'green' : 'neutral'}>
                      {a.status === 'approved' ? 'Approved' : 'Waiting'}
                    </Badge>
                    {a.stage && <span className="text-[11px] text-mute">· {stageById(a.stage)?.name}</span>}
                  </div>
                  {a.body && <p className="mt-1 max-w-xl text-xs leading-relaxed text-mute">{a.body}</p>}
                  {a.status === 'approved' && (
                    <p className="mt-1.5 text-[11px] text-mute">{a.approvedBy} · {fmtDateTime(a.approvedAt)}</p>
                  )}
                </div>
                <button
                  className="shrink-0 text-mute hover:text-red-600"
                  disabled={!!busy}
                  onClick={() => run(`rma-${a.id}`, () => post('remove-item', { projectId: project.id, list: 'approvals', itemId: a.id }))}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── What we've issued ──────────────────────────────────────────────── */}
      <SharedDocs project={project} docs={sharedDocs} busy={busy} run={run} openFile={openFile} />

      {/* ── Thread ─────────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-navy">Messages</h3>
        <p className="mt-0.5 text-xs text-mute">Replying here posts to their build page and emails them.</p>

        {messages.length > 0 && (
          <ol className="mt-4 space-y-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn(
                  'max-w-lg rounded-md px-3.5 py-2.5 text-sm',
                  m.from === 'team' ? 'ml-auto bg-brand-100' : 'bg-brand-50'
                )}
              >
                <div className="mb-1 text-[10px] tracking-wide text-mute uppercase">
                  {m.from === 'team' ? m.authorName || 'Team' : m.authorName || 'Customer'} · {fmtDateTime(m.at)}
                </div>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ol>
        )}

        <ReplyForm projectId={project.id} busy={busy} run={run} canEmail={emails.length > 0} />
      </div>

      {picker && (
        <LibraryPicker
          list={picker}
          project={project}
          onClose={() => setPicker(null)}
          onAdd={(items) => run('add', async () => {
            await post('add-items', { projectId: project.id, list: picker, items })
            setPicker(null)
          })}
        />
      )}
    </div>
  )
}

// ── Invite ──────────────────────────────────────────────────────────────────

function InviteForm({ projectId, busy, run }) {
  const [email, setEmail] = useState('')
  return (
    <form
      className="mt-4 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        run('invite', async () => {
          const r = await post('invite', { projectId, email })
          setEmail('')
          return { note: r.skipped ? `Added, but the email wasn't sent: ${r.reason}` : `Invitation sent to ${email}.` }
        })
      }}
    >
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <label className="label" htmlFor={`inv-${projectId}`}>Invite by email</label>
        <input
          id={`inv-${projectId}`}
          type="email"
          className="field"
          placeholder="customer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <button className="btn-secondary" disabled={!!busy || !email.includes('@')}>
        <UserPlus size={15} /> {busy === 'invite' ? 'Sending…' : 'Invite'}
      </button>
    </form>
  )
}

// ── Accept / reject an upload ───────────────────────────────────────────────

function ReviewRow({ projectId, request, busy, run }) {
  const [note, setNote] = useState('')
  const review = (status) =>
    run(`rev-${request.id}`, () => post('review-doc', { projectId, requestId: request.id, status, reviewNote: note }))

  return (
    <div className="mt-3 border-t border-hair pt-3">
      <input
        className="field text-xs"
        placeholder="Optional note — shown to the customer, and the reason if you're sending it back"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button className="btn-secondary text-xs" disabled={!!busy} onClick={() => review('accepted')}>
          <Check size={13} /> Accept
        </button>
        <button className="btn-ghost text-xs" disabled={!!busy} onClick={() => review('rejected')}>
          <XCircle size={13} /> Send it back
        </button>
      </div>
    </div>
  )
}

// ── Issued documents ────────────────────────────────────────────────────────

function SharedDocs({ project, docs, busy, run, openFile }) {
  const inputRef = useRef(null)
  const [problem, setProblem] = useState('')

  const upload = (files) => run('share', async () => {
    setProblem('')
    for (const f of files) {
      const reason = fileRejectionReason(f)
      if (reason) { setProblem(reason); return }
    }
    for (const file of files) {
      const { path, token } = await post('shared-upload-url', {
        projectId: project.id, fileName: file.name, size: file.size,
      })
      const { error } = await supabase.storage.from(DOCS_BUCKET).uploadToSignedUrl(path, token, file)
      if (error) throw new Error(`${file.name} didn't upload: ${error.message}`)
      await post('attach-shared', { projectId: project.id, path, name: file.name, label: file.name })
    }
    if (inputRef.current) inputRef.current.value = ''
  })

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-navy">Documents we've issued</h3>
          <p className="mt-0.5 text-xs text-mute">Plans, permits, certificates, contracts. Visible on their build page immediately.</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            id={`share-${project.id}`}
            onChange={(e) => upload([...e.target.files])}
          />
          <label htmlFor={`share-${project.id}`} className={cn('btn-secondary cursor-pointer text-xs', busy && 'pointer-events-none opacity-50')}>
            <Upload size={14} /> {busy === 'share' ? 'Uploading…' : 'Upload'}
          </label>
        </div>
      </div>

      {problem && <p className="mt-3 text-xs text-red-700">{problem}</p>}

      {docs.length === 0 ? (
        <p className="mt-4 text-sm text-mute">Nothing issued yet.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {docs.map((f) => (
            <li key={f.id} className="flex items-center gap-2.5 rounded bg-brand-50 px-3 py-2 text-xs">
              <FileText size={13} className="shrink-0 text-mute" />
              <span className="min-w-0 flex-1 truncate">{f.label || f.name}</span>
              <span className="shrink-0 text-[11px] text-mute">{fmtBytes(f.size)} · {fmtDate(f.addedAt)}</span>
              <button className="shrink-0 text-mute hover:text-navy" title="Download" onClick={() => openFile(f.path)}>
                <Download size={13} />
              </button>
              <button
                className="shrink-0 text-mute hover:text-red-600"
                title="Remove"
                disabled={!!busy}
                onClick={() => run(`rms-${f.id}`, () => post('remove-item', { projectId: project.id, list: 'sharedDocs', itemId: f.id }))}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Reply ───────────────────────────────────────────────────────────────────

function ReplyForm({ projectId, busy, run, canEmail }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-4">
      <textarea
        className="field min-h-20 resize-y text-sm"
        placeholder="Reply to the customer…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          className="btn-secondary text-xs"
          disabled={!!busy || !text.trim()}
          onClick={() => run('reply', async () => {
            const r = await post('reply', { projectId, body: text })
            setText('')
            return { note: r.skipped ? `Posted, but not emailed: ${r.reason}` : 'Sent.' }
          })}
        >
          <Send size={14} /> {busy === 'reply' ? 'Sending…' : 'Send'}
        </button>
        {!canEmail && <span className="text-[11px] text-mute">Nobody is on the portal yet — this will post without emailing.</span>}
      </div>
    </div>
  )
}

// ── Library picker ──────────────────────────────────────────────────────────

/**
 * The standard 6Homes asks, grouped by the stage that needs them. Typing these
 * out per customer is how the wording drifts, so the library is the default
 * path and free text is the exception.
 */
function LibraryPicker({ list, project, onClose, onAdd }) {
  const library = list === 'docRequests' ? DOC_LIBRARY : APPROVAL_LIBRARY
  const existing = new Set((project[list] ?? []).map((x) => x.label))
  const [picked, setPicked] = useState(() => new Set())
  const [custom, setCustom] = useState({ label: '', note: '', stage: '' })

  const toggle = (key) =>
    setPicked((s) => {
      const next = new Set(s)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const submit = () => {
    const items = library.flatMap((group) =>
      group.items
        .filter((it) => picked.has(`${group.stage}:${it.label}`))
        .map((it) => ({ ...it, stage: group.stage }))
    )
    if (custom.label.trim()) {
      items.push(
        list === 'docRequests'
          ? { label: custom.label, note: custom.note, stage: custom.stage || null, required: true }
          : { label: custom.label, body: custom.note, stage: custom.stage || null }
      )
    }
    if (items.length) onAdd(items)
  }

  const total = picked.size + (custom.label.trim() ? 1 : 0)

  return (
    <Modal
      open
      onClose={onClose}
      title={list === 'docRequests' ? 'Ask for documents' : 'Add an approval'}
      width="max-w-2xl"
    >
      <div className="max-h-[55vh] space-y-6 overflow-y-auto pr-1">
        {library.map((group) => (
          <div key={group.stage}>
            <div className="mb-2 text-[11px] tracking-wide text-mute uppercase">{stageById(group.stage)?.name}</div>
            <div className="space-y-1.5">
              {group.items.map((it) => {
                const key = `${group.stage}:${it.label}`
                const already = existing.has(it.label)
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md border p-3',
                      already ? 'cursor-not-allowed border-hair opacity-45' : picked.has(key) ? 'border-brand-400 bg-brand-50' : 'border-hair hover:bg-brand-50'
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 shrink-0"
                      disabled={already}
                      checked={picked.has(key)}
                      onChange={() => toggle(key)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {it.label}
                        {already && <span className="ml-2 text-[11px] font-normal text-mute">already added</span>}
                        {it.required === false && <span className="ml-2 text-[11px] font-normal text-mute">optional</span>}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-mute">{it.note ?? it.body}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}

        <div className="border-t border-hair pt-4">
          <div className="mb-2 text-[11px] tracking-wide text-mute uppercase">Something else</div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <Field label={list === 'docRequests' ? 'What do you need?' : 'What are they approving?'}>
              <input className="field" value={custom.label} onChange={(e) => setCustom({ ...custom, label: e.target.value })} />
            </Field>
            <Field label="Stage">
              <select className="field" value={custom.stage} onChange={(e) => setCustom({ ...custom, stage: e.target.value })}>
                <option value="">Any</option>
                {BUILD_STAGES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Explain it to them" className="sm:col-span-2">
              <textarea
                className="field min-h-16 resize-y"
                value={custom.note}
                onChange={(e) => setCustom({ ...custom, note: e.target.value })}
                placeholder="Where to find it, or why we need it."
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-hair pt-4">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!total} onClick={submit}>
          <Plus size={15} /> Add {total || ''}
        </button>
      </div>
    </Modal>
  )
}
