'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ENQUIRY_FORMS, FIELD_LABELS, BUDGET_OPTIONS, TIMEFRAME_OPTIONS,
  type Intent, type FormField,
} from './config'

const EMPTY: Record<FormField, string> = {
  name: '', email: '', phone: '', suburb: '', message: '', budget: '', timeframe: '',
}

// Fields share one look: no border box, just a hairline underneath, mono label
// above. It reads like filling in a form on a drawing sheet rather than a
// signup page, which is the register the rest of the site is in.
const FIELD =
  'w-full border-0 border-b border-rule bg-transparent px-0 py-2.5 text-[15px] text-ink outline-none transition-colors duration-300 placeholder:text-mute/40 focus:border-teal focus:ring-0'

export default function EnquiryModal({
  intent,
  designSlug,
  source,
  onClose,
}: {
  intent: Intent
  designSlug?: string
  source?: string
  onClose: () => void
}) {
  const config = ENQUIRY_FORMS[intent]
  const [values, setValues] = useState({ ...EMPTY })
  const [honeypot, setHoneypot] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const firstField = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstField.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const set = (field: FormField, value: string) => setValues((v) => ({ ...v, [field]: value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // One of the two is enough — plenty of people leave a number and no email,
    // and refusing those loses real customers.
    if (!values.email.trim() && !values.phone.trim()) {
      return setError('We need either an email address or a phone number to reply to you.')
    }
    for (const field of config.required) {
      if (!values[field].trim()) return setError(`Please fill in ${FIELD_LABELS[field].toLowerCase()}.`)
    }

    setBusy(true)
    try {
      const r = await fetch('/api/enquire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, intent, designSlug, source, website: honeypot }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl animate-rise bg-paper sm:my-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="enquiry-title"
      >
        {/* A teal rule across the top — the same annotation line as everywhere else. */}
        <div className="h-px w-full bg-teal" />

        {done ? (
          <div className="px-8 py-16 text-center sm:px-14">
            <p className="spec text-teal-deep">Sent</p>
            <h2 className="display-sm mt-5">{config.successTitle}</h2>
            <p className="prose-body mx-auto mt-5 max-w-sm">{config.successBody}</p>
            <button onClick={onClose} className="btn mt-10">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-10 sm:px-12 sm:py-12">
            <div className="flex items-start justify-between gap-6 border-b border-rule pb-7">
              <div>
                <p className="eyebrow">Enquiry</p>
                <h2 id="enquiry-title" className="display-sm mt-4">
                  {config.title}
                </h2>
                <p className="prose-body mt-4 max-w-sm">{config.blurb}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mt-1 -mr-2 p-2 text-mute transition-colors hover:text-ink"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="square" />
                </svg>
              </button>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {config.fields.map((field, i) => {
                const label = FIELD_LABELS[field]
                const required = config.required.includes(field)
                const id = `enq-${field}`
                const full = field === 'message'

                return (
                  <div key={field} className={full ? 'sm:col-span-2' : ''}>
                    <label htmlFor={id} className="spec block text-mute">
                      {full ? (config.messageLabel ?? label) : label}
                      {required && <span className="text-teal"> *</span>}
                    </label>

                    {full ? (
                      <textarea
                        id={id}
                        className={`${FIELD} mt-1 min-h-20 resize-y`}
                        placeholder={config.messagePlaceholder}
                        value={values.message}
                        onChange={(e) => set('message', e.target.value)}
                      />
                    ) : field === 'budget' || field === 'timeframe' ? (
                      <select
                        id={id}
                        className={`${FIELD} mt-1`}
                        value={values[field]}
                        onChange={(e) => set(field, e.target.value)}
                      >
                        <option value="">Prefer not to say</option>
                        {(field === 'budget' ? BUDGET_OPTIONS : TIMEFRAME_OPTIONS).map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={id}
                        ref={i === 0 ? firstField : undefined}
                        type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                        autoComplete={
                          field === 'email' ? 'email' : field === 'phone' ? 'tel' : field === 'name' ? 'name' : 'off'
                        }
                        className={`${FIELD} mt-1`}
                        value={values[field]}
                        onChange={(e) => set(field, e.target.value)}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Honeypot — invisible to people, irresistible to bots. */}
            <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="enq-website">Website</label>
              <input
                id="enq-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {error && <p className="mt-7 border-l-2 border-teal pl-4 text-[13px] text-ink">{error}</p>}

            <button type="submit" disabled={busy} className="btn mt-9 w-full disabled:opacity-50">
              {busy ? 'Sending…' : config.submitLabel}
            </button>

            <p className="prose-body mt-5 !text-[12px]">
              We use your details to answer this enquiry and will not pass them to anyone else. Ask us to stop emailing
              at any time.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
