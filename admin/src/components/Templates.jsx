import { useEffect, useRef, useState } from 'react'
import { AlertCircle, RefreshCw, RotateCcw, Save } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Field, Badge } from './ui.jsx'
import { EMAIL_TYPES, emailTypeMeta } from '../lib/emailTypes.js'
import { apiPost } from '../lib/apiFetch.js'
import { newId } from '../lib/utils.js'
import { cn } from '../lib/utils.js'

// How long to wait after the last keystroke before re-rendering the preview.
// Long enough that typing a sentence is one request, short enough that it still
// feels live.
const PREVIEW_DEBOUNCE_MS = 500

const EMPTY_PREVIEW = {
  loading: true, error: '', html: '', subject: '', usingDraft: false, safeMode: false, safeRecipient: '',
}

export default function Templates() {
  const { templates, create, update, remove } = useStore()
  const [selected, setSelected] = useState(EMAIL_TYPES[0].items[0].type)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(EMPTY_PREVIEW)
  const [refreshTick, setRefreshTick] = useState(0)

  // Guards against a slow earlier request landing after a faster later one and
  // showing the preview for wording the editor has already moved past.
  const reqRef = useRef(0)

  const existing = templates.find((t) => t.category === 'email' && t.emailType === selected)
  const meta = emailTypeMeta(selected)

  useEffect(() => {
    setSubject(existing?.subject ?? '')
    setContent(existing?.content ?? '')
    setNotice('')
    setError('')
  }, [selected, existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // The preview is rendered by api/template-preview.js, which runs the draft
  // through the same builders a real send uses — so what's on screen is the
  // email, not an approximation of it.
  useEffect(() => {
    const id = ++reqRef.current
    setPreview((p) => ({ ...p, loading: true, error: '' }))

    const timer = setTimeout(async () => {
      try {
        const r = await apiPost('/api/template-preview', { emailType: selected, subject, content })
        if (reqRef.current !== id) return
        setPreview({ loading: false, error: '', ...r })
      } catch (err) {
        if (reqRef.current !== id) return
        setPreview((p) => ({ ...p, loading: false, error: err.message }))
      }
    }, PREVIEW_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [selected, subject, content, refreshTick])

  async function save() {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!content.trim()) throw new Error('Add some content, or use "Revert to the built-in" to remove the override.')
      if (existing) {
        await update('templates', existing.id, { subject, content })
      } else {
        await create('templates', { id: newId('tpl'), category: 'email', emailType: selected, subject, content }, 'tpl')
      }
      setNotice('Saved. This wording is now used instead of the built-in.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function revert() {
    if (!existing) return
    setBusy(true); setError(''); setNotice('')
    try {
      await remove('templates', existing.id)
      setNotice('Reverted — the built-in wording is back in use.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const insertVar = (v) => setContent((c) => `${c}{{${v}}}`)

  return (
    <>
      <PageHeader
        title="Email templates"
        subtitle="Override the built-in wording. Anything you don't customise keeps sending the default."
      />

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="bg-emerald-50 px-7 py-2 text-sm text-emerald-800">{notice}</div>}

      <div className="grid gap-6 p-7 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)]">
        <nav className="space-y-5 2xl:row-start-1">
          {EMAIL_TYPES.map((group) => (
            <div key={group.group}>
              <div className="mb-1.5 px-2 text-[11px] tracking-wide text-mute uppercase">{group.group}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const custom = templates.some((t) => t.category === 'email' && t.emailType === item.type)
                  return (
                    <button
                      key={item.type}
                      onClick={() => setSelected(item.type)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        selected === item.type ? 'bg-brand-100 font-medium text-navy' : 'text-mute hover:bg-brand-50 hover:text-ink'
                      )}
                    >
                      <span className="truncate">{item.label}</span>
                      {custom && <Badge tone="blue">Custom</Badge>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Editor ──────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4 2xl:row-start-1">
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-navy">{meta?.label}</h2>
                <p className="mt-0.5 text-sm text-mute">{meta?.hint}</p>
              </div>
              <Badge tone={existing ? 'blue' : 'neutral'}>{existing ? 'Custom wording' : 'Using the built-in'}</Badge>
            </div>

            <Field label="Subject" hint="Leave blank to keep the built-in subject line.">
              <input className="field" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>

            <div className="mt-4">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="label mb-0">Body (HTML)</span>
                <span className="text-xs text-mute">— insert:</span>
                {meta?.vars.map((v) => (
                  <button
                    key={v}
                    onClick={() => insertVar(v)}
                    className="rounded bg-brand-100 px-1.5 py-0.5 font-mono text-[11px] text-navy hover:bg-brand-200"
                    type="button"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              <textarea
                className="field min-h-80 resize-y font-mono text-xs leading-relaxed"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'<p>Hi {{firstName}},</p>\n<p>Thanks for getting in touch about {{design}}…</p>'}
              />
              <p className="mt-1.5 text-xs text-mute">
                A custom body replaces the whole email, branded frame included — so include your own greeting and
                sign-off. Leave it empty and revert if you'd rather keep the designed default.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <button className="btn-primary" onClick={save} disabled={busy}>
                <Save size={15} /> {busy ? 'Saving…' : 'Save'}
              </button>
              {existing && (
                <button className="btn-secondary" onClick={revert} disabled={busy}>
                  <RotateCcw size={15} /> Revert to the built-in
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Live preview ────────────────────────────────────────────── */}
        <div className="min-w-0 lg:col-start-2 2xl:col-start-3 2xl:row-start-1">
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-navy">Preview</h3>
                  <Badge tone={preview.usingDraft ? 'blue' : 'neutral'}>
                    {preview.usingDraft ? 'Your wording' : 'Built-in wording'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-mute">
                  Rendered by the same code that sends it, using sample customer details.
                </p>
              </div>
              <button
                className="btn-secondary text-xs"
                onClick={() => setRefreshTick((n) => n + 1)}
                disabled={preview.loading}
                type="button"
              >
                <RefreshCw size={14} className={cn(preview.loading && 'animate-spin')} />
                {preview.loading ? 'Rendering…' : 'Refresh'}
              </button>
            </div>

            {/* The subject exactly as it will land, safe-mode prefix included. */}
            {!preview.error && preview.subject && (
              <div className="border-b border-hair bg-brand-50 px-5 py-2.5 text-sm">
                <span className="mr-2 text-[11px] tracking-wide text-mute uppercase">Subject</span>
                {preview.safeMode && (
                  <span className="font-mono text-xs text-amber-700">[TEST → {preview.safeRecipient}] </span>
                )}
                <span className="text-ink">{preview.subject}</span>
              </div>
            )}

            {preview.error ? (
              <div className="flex items-start gap-3 p-5 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
                <div>
                  <p className="text-red-700">{preview.error}</p>
                  <p className="mt-1.5 text-xs text-mute">
                    The preview is rendered by <code className="rounded bg-brand-100 px-1">/api/template-preview</code>.
                    Editing and saving still work without it — only this panel needs the API running.
                  </p>
                </div>
              </div>
            ) : (
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={preview.html}
                className={cn(
                  'block h-[680px] w-full border-0 bg-white transition-opacity',
                  preview.loading && 'opacity-50'
                )}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
