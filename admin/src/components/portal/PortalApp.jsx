import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, LogOut } from 'lucide-react'
import { apiPost } from '../../lib/apiFetch.js'
import { signOut } from '../../lib/auth.js'
import { Wordmark } from './PortalChrome.jsx'
import PortalBuild from './PortalBuild.jsx'

/**
 * The customer's side of portal.6homes.com.
 *
 * Access is resolved entirely server-side: /api/portal?action=me returns only
 * the builds this signed-in email is attached to, already reduced to the fields
 * a customer may see. The browser never queries a CRM table, so there is no
 * client-side check here that could be skipped.
 */
export default function PortalApp({ email }) {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [builds, setBuilds] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const r = await apiPost('/api/portal', { action: 'me' })
    setBuilds(r.projects ?? [])
    return r.projects ?? []
  }, [])

  useEffect(() => {
    load().catch((err) => setError(err.message))
  }, [load])

  const refresh = useCallback(() => load().catch((err) => setError(err.message)), [load])

  if (error) return <Notice title="We couldn't load your build">{error}</Notice>
  if (builds === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand-50">
        <div className="text-sm text-mute">Loading your build…</div>
      </div>
    )
  }

  // Signed in, but no build attached. Almost always a second email address —
  // say so, rather than implying they've done something wrong.
  if (builds.length === 0) {
    return (
      <Notice title="Nothing here yet">
        We couldn't find a build linked to <span className="font-medium text-ink">{email}</span>. If you've written to
        us from a different address, try signing in with that one — or call{' '}
        <a href="tel:1800646637" className="text-brand-600">1800 6HOMES</a> and we'll link this address to your build.
      </Notice>
    )
  }

  const build = builds.find((b) => b.id === projectId) ?? builds[0]
  const others = builds.filter((b) => b.id !== build.id)

  return (
    <PortalBuild
      build={build}
      email={email}
      others={others}
      onSwitch={(id) => navigate(`/portal/${id}`)}
      onRefresh={refresh}
    />
  )
}

function Notice({ title, children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-50 p-6">
      <div className="w-full max-w-md">
        <Wordmark className="mb-8" />
        <div className="card p-7">
          <AlertCircle size={20} className="text-brand-600" />
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-navy">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">{children}</p>
          <button className="btn-secondary mt-6" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
