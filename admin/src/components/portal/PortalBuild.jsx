import { useRef, useState } from 'react'
import {
  Check, Upload, Download, FileText, Trash2, Send, AlertCircle, ChevronRight, LogOut, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { apiPost } from '../../lib/apiFetch.js'
import { signOut } from '../../lib/auth.js'
import { cn, fmtDate, fmtDateTime, mediaUrl } from '../../lib/utils.js'
import {
  DOCS_BUCKET, docStatusMeta, fileRejectionReason, fmtBytes, outstanding, byStage,
} from '../../lib/portal.js'
import { Wordmark, BuildRail, Pill, Block, Empty } from './PortalChrome.jsx'

const post = (action, body) => apiPost('/api/portal', { action, ...body })

/** Open a private document. The URL is minted per click and lives five minutes. */
async function openDoc(projectId, path) {
  const { url } = await post('download-url', { projectId, path })
  window.open(url, '_blank', 'noopener')
}

export default function PortalBuild({ build, email, onRefresh, others = [], onSwitch }) {
  const [error, setError] = useState('')
  const pending = outstanding(build)
  const current = build.stages[build.stageIndex] ?? build.stages[0]

  const run = async (fn) => {
    setError('')
    try { await fn(); await onRefresh() } catch (err) { setError(err.message) }
  }

  return (
    <div className="min-h-screen bg-brand-50">
      {/* ── Header ──────────────────────────────────────────────────────────
          Deep teal, the same field the emails use, so arriving from an email
          feels like following a link rather than landing somewhere else. */}
      <header className="bg-brand-700 text-white">
        <div className="mx-auto max-w-5xl px-5 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-14">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Wordmark tone="light" className="h-8" />
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="hidden sm:inline">{email}</span>
              <button onClick={signOut} className="inline-flex items-center gap-1.5 hover:text-white">
                <LogOut size={13} /> Sign out
              </button>
            </div>
          </div>

          <div className="mt-10 sm:mt-14">
            <p className="font-mono text-[11px] tracking-[0.16em] text-brand-200 uppercase">
              {build.completedAt ? 'Handed over' : `Stage ${build.stageIndex + 1} of ${build.stages.length}`}
            </p>
            <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{build.name}</h1>
            <p className="mt-2 text-sm text-white/55">
              {[build.designName, build.designSummary, build.suburb].filter(Boolean).join(' · ')}
            </p>
          </div>

          <BuildRail stages={build.stages} tone="light" className="mt-10" />

          {others.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5 text-xs">
              <span className="text-white/40">Your other builds:</span>
              {others.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onSwitch(o.id)}
                  className="rounded-full bg-white/10 px-3 py-1 text-white/80 hover:bg-white/20"
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-16 px-5 py-12 sm:px-8 sm:py-16">
        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-red-50 px-5 py-4 text-sm text-red-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}

        {/* ── The ask, first ─────────────────────────────────────────────────
            If we're waiting on the customer, that is the only thing worth
            leading with. When there's nothing outstanding it collapses to a
            single reassuring line rather than an empty heading. */}
        {pending.total > 0 ? (
          <Block
            id="needed"
            label="Action needed"
            title={pending.total === 1 ? 'One thing from you' : `${pending.total} things from you`}
            intro="Your build waits on these. Everything else is with us."
          >
            <div className="space-y-3">
              {pending.docs.map((d) => (
                <a key={d.id} href={`#doc-${d.id}`} className="card flex items-center gap-4 px-5 py-4 hover:border-brand-400">
                  <Upload size={16} className="shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-navy">{d.label}</span>
                    {!d.required && <span className="text-mute"> · optional</span>}
                    {d.status === 'rejected' && <Pill tone="red" className="ml-2">Needs redoing</Pill>}
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-mute" />
                </a>
              ))}
              {pending.approvals.map((a) => (
                <a key={a.id} href={`#approval-${a.id}`} className="card flex items-center gap-4 px-5 py-4 hover:border-brand-400">
                  <Check size={16} className="shrink-0 text-brand-600" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium text-navy">{a.label}</span>
                    <span className="text-mute"> · needs your approval</span>
                  </span>
                  <ChevronRight size={15} className="shrink-0 text-mute" />
                </a>
              ))}
            </div>
          </Block>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <Check size={16} className="mt-0.5 shrink-0" />
            <span>Nothing needed from you right now — your build is with us.</span>
          </div>
        )}

        {/* ── Where the build is ─────────────────────────────────────────── */}
        <Block
          label="Progress"
          title={build.completedAt ? 'Your home is handed over' : current?.name}
          intro={build.completedAt ? `Completed ${fmtDate(build.completedAt)}.` : current?.blurb}
        >
          <ol className="border-t border-hair">
            {build.stages.map((s, i) => (
              <li key={s.id} className="flex gap-4 border-b border-hair py-5 sm:gap-6">
                <div className="w-6 shrink-0 pt-0.5">
                  {s.state === 'done' ? (
                    <Check size={16} className="text-brand-600" />
                  ) : s.state === 'current' ? (
                    <span className="block h-2.5 w-2.5 translate-x-0.5 translate-y-1 rounded-full bg-brand-400 ring-4 ring-brand-100" />
                  ) : (
                    <span className="block h-2.5 w-2.5 translate-x-0.5 translate-y-1 rounded-full border border-hair" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className={cn('text-sm font-medium', s.state === 'todo' ? 'text-mute' : 'text-navy')}>
                      {i + 1}. {s.name}
                    </h3>
                    {s.state === 'current' && <Pill tone="blue">Here now</Pill>}
                    {s.actualDate ? (
                      <span className="font-mono text-[11px] text-mute">{fmtDate(s.actualDate)}</span>
                    ) : s.targetDate ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-mute">
                        <Clock size={11} /> expected {fmtDate(s.targetDate)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-mute">{s.blurb}</p>
                  {s.note && (
                    <p className="mt-3 border-l-2 border-brand-200 pl-4 text-[13px] leading-relaxed text-ink">{s.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {(build.heroImage || build.floorplanImage) && (
            <div className={cn('mt-8 grid gap-4', build.heroImage && build.floorplanImage && 'sm:grid-cols-2')}>
              {build.heroImage && (
                <img
                  src={mediaUrl(build.heroImage)}
                  alt={build.designName}
                  className="aspect-[16/9] w-full rounded-lg object-cover sm:aspect-[2/1]"
                />
              )}
              {build.floorplanImage && (
                <img
                  src={mediaUrl(build.floorplanImage)}
                  alt={`${build.designName} floor plan`}
                  className="aspect-[4/3] w-full rounded-lg bg-white object-contain p-3"
                />
              )}
            </div>
          )}
        </Block>

        {/* ── What we need ───────────────────────────────────────────────── */}
        <Block
          id="documents"
          label="From you"
          title="Documents to send us"
          intro="Upload straight here — no need to email them. PDFs, photos and Word documents, up to 25 MB each."
        >
          {build.docRequests.length === 0 ? (
            <Empty>We haven't asked you for anything yet.</Empty>
          ) : (
            <div className="space-y-4">
              {byStage(build.docRequests).map((d) => (
                <DocRequest key={d.id} request={d} projectId={build.id} run={run} />
              ))}
            </div>
          )}
        </Block>

        {/* ── Approvals ──────────────────────────────────────────────────── */}
        {build.approvals.length > 0 && (
          <Block
            label="Sign-off"
            title="Approvals"
            intro="Approving here records your name and the time, and lets us move to the next step."
          >
            <div className="space-y-4">
              {byStage(build.approvals).map((a) => (
                <Approval key={a.id} approval={a} projectId={build.id} run={run} />
              ))}
            </div>
          </Block>
        )}

        {/* ── What we've issued ──────────────────────────────────────────── */}
        <Block
          label="From us"
          title="Your documents"
          intro="Plans, permits, certificates and contracts — kept here so you're never hunting through email for them."
        >
          {build.sharedDocs.length === 0 ? (
            <Empty>Nothing issued yet. Your plans and certificates will appear here as they're produced.</Empty>
          ) : (
            <ul className="border-t border-hair">
              {byStage(build.sharedDocs).map((f) => (
                <li key={f.id} className="flex items-center gap-4 border-b border-hair py-4">
                  <FileText size={16} className="shrink-0 text-mute" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-navy">{f.label || f.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-mute">
                      {fmtBytes(f.size)} · added {fmtDate(f.addedAt)}
                    </div>
                  </div>
                  <button
                    className="btn-secondary shrink-0 text-xs"
                    onClick={() => run(() => openDoc(build.id, f.path))}
                  >
                    <Download size={14} /> Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Block>

        <Messages build={build} run={run} />

        <footer className="border-t border-hair pt-8 text-xs leading-relaxed text-mute">
          Something not right, or a question that doesn't fit above? Call{' '}
          <a href="tel:1800646637" className="text-brand-600">1800 6HOMES</a> and ask for your project consultant.
          <div className="mt-3 font-mono text-[10px] tracking-wider text-hair uppercase">
            6Homes · 4/830 Whitehorse Road, Box Hill VIC 3128
          </div>
        </footer>
      </main>
    </div>
  )
}

// ── Document request ────────────────────────────────────────────────────────

function DocRequest({ request, projectId, run }) {
  const meta = docStatusMeta(request.status)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const inputRef = useRef(null)

  const upload = async (files) => {
    setProblem('')
    // Check every file before uploading any, so a bad one doesn't leave half a
    // set on the server with no explanation.
    for (const f of files) {
      const reason = fileRejectionReason(f)
      if (reason) return setProblem(reason)
    }
    setBusy(true)
    try {
      for (const file of files) {
        const { path, token } = await post('upload-url', {
          projectId, requestId: request.id, fileName: file.name, size: file.size,
        })
        const { error } = await supabase.storage.from(DOCS_BUCKET).uploadToSignedUrl(path, token, file)
        if (error) throw new Error(`${file.name} didn't upload: ${error.message}`)
        await post('attach', { projectId, requestId: request.id, path, name: file.name })
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const done = request.status === 'accepted'

  return (
    <div
      id={`doc-${request.id}`}
      className={cn('card scroll-mt-24 p-5', request.status === 'rejected' && 'border-red-200')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-navy">
            {request.label}
            {!request.required && <span className="ml-2 text-xs font-normal text-mute">if you have it</span>}
          </h3>
          {request.note && <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mute">{request.note}</p>}
        </div>
        <Pill tone={meta.tone}>{meta.client}</Pill>
      </div>

      {request.reviewNote && (
        <p className={cn(
          'mt-4 rounded-md px-4 py-3 text-[13px] leading-relaxed',
          request.status === 'rejected' ? 'bg-red-50 text-red-800' : 'bg-brand-50 text-ink'
        )}>
          {request.reviewNote}
        </p>
      )}

      {request.files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {request.files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-md bg-brand-50 px-3 py-2">
              <FileText size={14} className="shrink-0 text-mute" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{f.name}</span>
              <span className="hidden shrink-0 font-mono text-[11px] text-mute sm:inline">{fmtBytes(f.size)}</span>
              <button
                className="shrink-0 text-mute hover:text-navy"
                title="Download"
                onClick={() => run(() => openDoc(projectId, f.path))}
              >
                <Download size={14} />
              </button>
              {!done && (
                <button
                  className="shrink-0 text-mute hover:text-red-600"
                  title="Remove"
                  onClick={() => run(() => post('remove-file', { projectId, requestId: request.id, fileId: f.id }))}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {problem && <p className="mt-3 text-[13px] text-red-700">{problem}</p>}

      {!done && (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            id={`file-${request.id}`}
            onChange={(e) => run(() => upload([...e.target.files]))}
          />
          <label htmlFor={`file-${request.id}`} className={cn('btn-secondary cursor-pointer', busy && 'pointer-events-none opacity-50')}>
            <Upload size={14} /> {busy ? 'Uploading…' : request.files.length ? 'Add another file' : 'Choose a file'}
          </label>
        </div>
      )}
    </div>
  )
}

// ── Approval ────────────────────────────────────────────────────────────────

function Approval({ approval, projectId, run }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const approved = approval.status === 'approved'

  const approve = () =>
    run(async () => {
      setBusy(true)
      try { await post('approve', { projectId, approvalId: approval.id, name }) } finally { setBusy(false) }
    })

  return (
    <div id={`approval-${approval.id}`} className={cn('card scroll-mt-24 p-5', approved && 'bg-emerald-50/40')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-navy">{approval.label}</h3>
        {approved && <Pill tone="green">Approved</Pill>}
      </div>
      {approval.body && <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mute">{approval.body}</p>}

      {approved ? (
        <p className="mt-4 font-mono text-[11px] text-mute">
          {approval.approvedBy} · {fmtDateTime(approval.approvedAt)}
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:max-w-xs">
            <label className="label" htmlFor={`name-${approval.id}`}>Type your full name to approve</label>
            <input
              id={`name-${approval.id}`}
              className="field"
              value={name}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <button className="btn-primary" disabled={busy || name.trim().length < 2} onClick={approve}>
            <Check size={15} /> {busy ? 'Recording…' : 'Approve'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Messages ────────────────────────────────────────────────────────────────

function Messages({ build, run }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const send = () =>
    run(async () => {
      setBusy(true)
      try {
        await post('message', { projectId: build.id, body: text })
        setText('')
      } finally { setBusy(false) }
    })

  return (
    <Block
      id="messages"
      label="Talk to us"
      title="Messages"
      intro="Anything you write here lands against your build, so whoever picks it up already has the context."
    >
      {build.messages.length > 0 && (
        <ol className="mb-6 space-y-4">
          {build.messages.map((m) => (
            <li
              key={m.id}
              className={cn(
                'max-w-xl rounded-lg px-4 py-3 text-[13px] leading-relaxed',
                m.from === 'team' ? 'bg-white ring-1 ring-hair' : 'ml-auto bg-brand-100'
              )}
            >
              <div className="mb-1 font-mono text-[10px] tracking-wide text-mute uppercase">
                {m.from === 'team' ? m.authorName || '6Homes' : 'You'} · {fmtDateTime(m.at)}
              </div>
              <p className="whitespace-pre-wrap text-ink">{m.body}</p>
            </li>
          ))}
        </ol>
      )}

      <textarea
        className="field min-h-28 resize-y"
        placeholder="Ask us anything about your build…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn-primary mt-3" disabled={busy || !text.trim()} onClick={send}>
        <Send size={15} /> {busy ? 'Sending…' : 'Send'}
      </button>
    </Block>
  )
}
