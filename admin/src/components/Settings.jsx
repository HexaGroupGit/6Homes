import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { useStore } from '../store/useStore.jsx'
import { PageHeader, Field, Badge, Modal } from './ui.jsx'

const linesToArray = (s) => s.split(/[\n,]/).map((l) => l.trim()).filter(Boolean)
const arrayToLines = (a) => (a ?? []).join('\n')

export default function Settings() {
  const { settings, saveSettings } = useStore()
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    setForm({
      company: settings.company ?? {},
      emails: settings.emails ?? {},
      leads: settings.leads ?? {},
      projects: settings.projects ?? {},
      downloads: settings.downloads ?? {},
      notifyText: arrayToLines(settings.emails?.notify),
      suppressedText: arrayToLines(settings.emails?.suppressed),
    })
  }, [settings])

  if (!form) return <div className="p-8 text-sm text-mute">Loading…</div>

  const safeOn = form.emails.safeMode !== false

  const setCompany = (patch) => { setForm((f) => ({ ...f, company: { ...f.company, ...patch } })); setNotice('') }
  const setEmails = (patch) => { setForm((f) => ({ ...f, emails: { ...f.emails, ...patch } })); setNotice('') }
  const setLeads = (patch) => { setForm((f) => ({ ...f, leads: { ...f.leads, ...patch } })); setNotice('') }
  const setProjects = (patch) => { setForm((f) => ({ ...f, projects: { ...f.projects, ...patch } })); setNotice('') }

  async function save(extraEmails = {}) {
    setBusy(true); setError(''); setNotice('')
    try {
      await saveSettings({
        company: form.company,
        emails: {
          ...form.emails,
          ...extraEmails,
          notify: linesToArray(form.notifyText),
          suppressed: linesToArray(form.suppressedText),
        },
        leads: form.leads,
        projects: form.projects,
        downloads: form.downloads,
      })
      setNotice('Settings saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Turning safe mode off is the single most consequential switch in the app —
  // after it, real customers get real email. It gets a typed confirmation.
  async function goLive() {
    if (confirmText.trim().toUpperCase() !== 'SEND FOR REAL') {
      return setError('Type SEND FOR REAL to confirm.')
    }
    setGoLiveOpen(false)
    setConfirmText('')
    setEmails({ safeMode: false })
    await save({ safeMode: false })
  }

  async function enableSafeMode() {
    setEmails({ safeMode: true })
    await save({ safeMode: true })
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Company details, email delivery and automation.">
        <button className="btn-primary" onClick={() => save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </PageHeader>

      {error && <div className="bg-red-50 px-7 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="bg-emerald-50 px-7 py-2 text-sm text-emerald-800">{notice}</div>}

      <div className="max-w-3xl space-y-6 p-7">
        {/* ── Email safety ──────────────────────────────────────────────── */}
        <section className={`card p-6 ${safeOn ? 'border-amber-300 bg-amber-50/40' : 'border-emerald-300 bg-emerald-50/40'}`}>
          <div className="flex items-start gap-3">
            {safeOn ? <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-600" />
                    : <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-navy">Email delivery</h2>
                <Badge tone={safeOn ? 'amber' : 'green'}>{safeOn ? 'Safe mode on' : 'Live'}</Badge>
              </div>

              {safeOn ? (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-mute">
                    Every email — customer acknowledgements, follow-ups, build updates and team notifications — is being
                    redirected to a single inbox with a <code className="rounded bg-white px-1">[TEST → …]</code> subject.
                    No customer is receiving anything. This is the right setting until launch day.
                  </p>
                  <div className="mt-4 max-w-sm">
                    <Field label="Redirect everything to">
                      <input
                        className="field"
                        value={form.emails.safeRecipient ?? ''}
                        onChange={(e) => setEmails({ safeRecipient: e.target.value })}
                        placeholder="melissa@6homes.com"
                      />
                    </Field>
                  </div>
                  <button className="btn-primary mt-4" onClick={() => setGoLiveOpen(true)} disabled={busy}>
                    Turn safe mode off
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-relaxed text-mute">
                    Emails are going to real customers. Every send is recorded in the email log.
                  </p>
                  <button className="btn-secondary mt-4" onClick={enableSafeMode} disabled={busy}>
                    Turn safe mode back on
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Sending identity ──────────────────────────────────────────── */}
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy">Sending identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From name">
              <input className="field" value={form.emails.fromName ?? ''} onChange={(e) => setEmails({ fromName: e.target.value })} />
            </Field>
            <Field label="From address" hint="Must be on a domain verified in Resend.">
              <input className="field" value={form.emails.fromEmail ?? ''} onChange={(e) => setEmails({ fromEmail: e.target.value })} />
            </Field>
          </div>
          <Field label="Reply-to" hint="Where a customer's reply actually lands.">
            <input className="field" value={form.emails.replyTo ?? ''} onChange={(e) => setEmails({ replyTo: e.target.value })} />
          </Field>
          <Field label="Notify these addresses of new leads" hint="One per line. Everyone here gets every website enquiry.">
            <textarea
              className="field min-h-24 resize-y font-mono text-xs"
              value={form.notifyText}
              onChange={(e) => { setForm((f) => ({ ...f, notifyText: e.target.value })); setNotice('') }}
            />
          </Field>
          <Field label="Never email these addresses" hint="Unsubscribes and bounces. One per line — the platform skips them on every flow.">
            <textarea
              className="field min-h-20 resize-y font-mono text-xs"
              value={form.suppressedText}
              onChange={(e) => { setForm((f) => ({ ...f, suppressedText: e.target.value })); setNotice('') }}
            />
          </Field>
        </section>

        {/* ── Automation ────────────────────────────────────────────────── */}
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy">Automation</h2>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.leads.nurtureEnabled !== false}
              onChange={(e) => setLeads({ nurtureEnabled: e.target.checked })}
            />
            <span>
              Chase unattended leads automatically
              <span className="mt-0.5 block text-xs text-mute">
                Follow-ups on days 2, 5 and 9, then marked lost at day 14. Stops the moment anyone moves the lead out of a
                New stage.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.projects.stageEmailsEnabled !== false}
              onChange={(e) => setProjects({ stageEmailsEnabled: e.target.checked })}
            />
            <span>
              Email customers when their build reaches a new stage
              <span className="mt-0.5 block text-xs text-mute">Each stage is announced once, on the daily sweep.</span>
            </span>
          </label>
          <Field label="Consultation booking link" hint="Used in the follow-up emails' call to action.">
            <input className="field" value={form.leads.consultUrl ?? ''} onChange={(e) => setLeads({ consultUrl: e.target.value })} />
          </Field>
        </section>

        {/* ── Company ───────────────────────────────────────────────────── */}
        <section className="card space-y-4 p-6">
          <h2 className="font-semibold text-navy">Company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trading name">
              <input className="field" value={form.company.name ?? ''} onChange={(e) => setCompany({ name: e.target.value })} />
            </Field>
            <Field label="Legal name">
              <input className="field" value={form.company.legalName ?? ''} onChange={(e) => setCompany({ legalName: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="field" value={form.company.phoneDisplay ?? ''} onChange={(e) => setCompany({ phoneDisplay: e.target.value })} />
            </Field>
            <Field label="Website">
              <input className="field" value={form.company.website ?? ''} onChange={(e) => setCompany({ website: e.target.value })} />
            </Field>
          </div>
          <Field label="Head office">
            <input className="field" value={form.company.headOffice ?? ''} onChange={(e) => setCompany({ headOffice: e.target.value })} />
          </Field>
          <Field label="Display showroom">
            <input className="field" value={form.company.showroom ?? ''} onChange={(e) => setCompany({ showroom: e.target.value })} />
          </Field>
        </section>
      </div>

      <Modal open={goLiveOpen} onClose={() => { setGoLiveOpen(false); setConfirmText('') }} title="Send email to real customers?">
        <p className="text-sm leading-relaxed text-mute">
          Turning safe mode off means the next website enquiry gets a real reply, the follow-up sequence starts chasing
          real people, and build updates go to real customers.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-mute">
          Before you do this, make sure the from-address domain is verified in Resend and you've walked every form at
          least once in safe mode.
        </p>
        <div className="mt-5">
          <Field label="Type SEND FOR REAL to confirm">
            <input className="field" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoFocus />
          </Field>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => { setGoLiveOpen(false); setConfirmText('') }}>Cancel</button>
          <button className="btn-primary flex-1" onClick={goLive} disabled={busy}>Turn safe mode off</button>
        </div>
      </Modal>
    </>
  )
}
