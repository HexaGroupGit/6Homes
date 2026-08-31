import { useState } from 'react'
import { signIn, sendPasswordReset } from '../lib/auth.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await signIn(email.trim(), password)
      // App's onAuthStateChange picks it up from here.
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function reset() {
    if (!email.trim()) return setError('Enter your email address first.')
    setBusy(true); setError(''); setNotice('')
    try {
      await sendPasswordReset(email.trim())
      setNotice('Check your inbox for a reset link.')
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

        <form onSubmit={submit} className="card space-y-4 p-7">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email" type="email" autoComplete="username" required
              className="field" value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password" type="password" autoComplete="current-password" required
              className="field" value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-brand-600">{notice}</p>}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <button type="button" onClick={reset} disabled={busy} className="btn-ghost w-full text-xs">
            Forgot your password?
          </button>
        </form>
      </div>
    </div>
  )
}
