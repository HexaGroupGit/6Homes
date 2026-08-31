import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

/**
 * Where an invitation or a "forgot your password" link lands.
 *
 * Clicking either puts a recovery token in the URL fragment; supabase-js
 * exchanges it for a session on load. That session is enough to set a password
 * and nothing else, which is why this screen is outside the admin gate — the
 * person using it does not have a password yet, so they cannot sign in to reach
 * a screen that is behind one.
 *
 * auth.js has always pointed resetPasswordForEmail here. Until now the route
 * did not exist, so the link dropped people on the dashboard with no way to
 * finish, and they could never sign in again.
 */
const MIN_LENGTH = 10

export default function SetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true

    // The token may already be exchanged by the time this mounts, or may still
    // be in flight — so check for a session and also listen for one arriving.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) { setReady(true) } else { setExpired(true) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!active || !session) return
      setReady(true); setExpired(false)
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError('Those two don\'t match.')

    setBusy(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw new Error(err.message)
      setDone(true)
      // Straight into the CRM — the session from the link is already valid.
      setTimeout(() => navigate('/', { replace: true }), 1400)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-brand-50 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl tracking-wide text-navy">
            <span className="font-bold">6</span>
            <span className="font-normal tracking-[0.18em]">HOMES</span>
          </div>
          <div className="mt-2 text-xs tracking-[0.2em] text-mute uppercase">Admin</div>
        </div>

        <div className="card p-7">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={26} className="mx-auto text-brand-600" />
              <h1 className="mt-4 font-semibold text-navy">You're all set</h1>
              <p className="mt-2 text-sm text-mute">Taking you to the dashboard…</p>
            </div>
          ) : expired ? (
            <>
              <KeyRound size={22} className="text-brand-600" />
              <h1 className="mt-4 font-semibold text-navy">That link has expired</h1>
              <p className="mt-2 text-sm leading-relaxed text-mute">
                Sign-in links last an hour and work once. Go back to the sign-in page and use{' '}
                <span className="text-ink">Forgot your password?</span> to get a fresh one.
              </p>
              <button className="btn-secondary mt-5 w-full" onClick={() => navigate('/', { replace: true })}>
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <h1 className="font-semibold text-navy">Choose a password</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">
                This is what you'll use to sign in to the 6Homes CRM from now on.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label className="label" htmlFor="new-password">New password</label>
                  <input
                    id="new-password" type="password" required autoFocus
                    autoComplete="new-password" className="field"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-mute">At least {MIN_LENGTH} characters.</p>
                </div>
                <div>
                  <label className="label" htmlFor="confirm-password">Type it again</label>
                  <input
                    id="confirm-password" type="password" required
                    autoComplete="new-password" className="field"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button className="btn-primary w-full" disabled={busy || !ready}>
                  {busy ? 'Saving…' : ready ? 'Save and sign in' : 'Checking your link…'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
