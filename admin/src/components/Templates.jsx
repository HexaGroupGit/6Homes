import { useEffect, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Field, Badge } from './ui.jsx'
import { EMAIL_TYPES, emailTypeMeta } from '../lib/emailTypes.js'
import { newId } from '../lib/utils.js'
import { cn } from '../lib/utils.js'

export default function Templates() {
  const { templates, create, update, remove } = useStore()
  const [selected, setSelected] = useState(EMAIL_TYPES[0].items[0].type)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const existing = templates.find((t) => t.category === 'email' && t.emailType === selected)
  const meta = emailTypeMeta(selected)

  useEffect(() => {
    setSubject(existing?.subject ?? '')
    setContent(existing?.content ?? '')
    setNotice('')
    setError('')
  }, [selected, existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

      <div className="grid gap-6 p-7 lg:grid-cols-[260px_1fr]">
        <nav className="space-y-5">
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

        <div className="space-y-4">
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
      </div>
    </>
  )
}
