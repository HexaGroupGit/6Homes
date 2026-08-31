import { useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Wordmark } from './PortalChrome.jsx'

// Sign-in for customers. No password, because someone who opens this four times
// across a four-month build will not remember one — and a password reset flow is
// just this flow with more steps.
export default function PortalLogin() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request-link', email }),
      })
      const data = await r.json().catch(() => null)
      if (!r.ok) throw new Error(data?.error || 'We couldn\'t send that. Try again in a moment.')
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-brand-700 lg:grid-cols-[1fr_minmax(0,480px)]">
      {/* The claim, once, on the deep field the emails use. */}
      <div className="hidden flex-col justify-between p-12 text-white lg:flex xl:p-16">
        <Wordmark tone="light" className="h-10" />
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-brand-200 uppercase">Your build</p>
          <h1 className="mt-4 max-w-md text-4xl leading-[1.08] font-semibold tracking-tight xl:text-5xl">
            Everything about your home, in one place.
          </h1>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/60">
            Where your build is up to, every document we've issued you, and the paperwork we still need — without
            digging through a year of email.
          </p>
        </div>
        <p className="font-mono text-[11px] tracking-wider text-white/35">6HOMES · BOX HILL, VICTORIA</p>
      </div>

      <div className="flex flex-col justify-center bg-white p-8 sm:p-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Wordmark className="h-9" /></div>

          {sent ? (
            <>
              <CheckCircle2 size={28} className="text-brand-600" />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-navy">Check your email</h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">
                If <span className="font-medium text-ink">{email}</span> is on a 6Homes build, a sign-in link is on
                its way. It opens your build directly — there's nothing to remember.
              </p>
              <button className="btn-secondary mt-7" onClick={() => { setSent(false); setEmail('') }}>
                Use a different email
              </button>
              <p className="mt-8 border-t border-hair pt-5 text-xs leading-relaxed text-mute">
                Nothing arrived? Check your junk folder, then call us on{' '}
                <a href="tel:1800646637" className="text-brand-600">1800 6HOMES</a> — we'll sort it out.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-navy">Open your build</h2>
              <p className="mt-3 text-sm leading-relaxed text-mute">
                Enter the email address we've been writing to. We'll send you a link that signs you straight in.
              </p>

              <form onSubmit={submit} className="mt-7">
                <label className="label" htmlFor="portal-email">Email address</label>
                <input
                  id="portal-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  className="field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

                <button className="btn-primary mt-5 w-full" disabled={busy || !email}>
                  {busy ? 'Sending…' : 'Send my sign-in link'} <ArrowRight size={15} />
                </button>
              </form>

              <p className="mt-8 border-t border-hair pt-5 text-xs leading-relaxed text-mute">
                Staff sign in the same way, with a password —{' '}
                <a href="/" className="text-brand-600 hover:underline">go to the CRM</a>.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
