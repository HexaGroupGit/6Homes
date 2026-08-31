import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, isConfigured } from './lib/supabase.js'
import { fetchAdmin } from './lib/auth.js'
import { StoreProvider } from './store/useStore.jsx'
import Login from './components/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import LeadsBoard from './components/LeadsBoard.jsx'
import LeadDetail from './components/LeadDetail.jsx'
import Designs from './components/Designs.jsx'
import DesignDetail from './components/DesignDetail.jsx'
import Projects from './components/Projects.jsx'
import ProjectDetail from './components/ProjectDetail.jsx'
import Quotes from './components/Quotes.jsx'
import QuoteDetail from './components/QuoteDetail.jsx'
import Templates from './components/Templates.jsx'
import EmailLog from './components/EmailLog.jsx'
import Settings from './components/Settings.jsx'
import QuoteAccept from './components/QuoteAccept.jsx'
import SignPage from './components/SignPage.jsx'
import PortalApp from './components/portal/PortalApp.jsx'
import PortalLogin from './components/portal/PortalLogin.jsx'
import SetPassword from './components/SetPassword.jsx'
import { canOpen, homePath } from './lib/roles.js'

function NotConfigured() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="card max-w-lg p-8">
        <h1 className="mb-3 text-xl font-semibold text-navy">Supabase isn't configured</h1>
        <p className="mb-4 text-sm leading-relaxed text-mute">
          Copy <code className="rounded bg-brand-100 px-1.5 py-0.5">admin/.env.example</code> to{' '}
          <code className="rounded bg-brand-100 px-1.5 py-0.5">admin/.env.local</code> and set{' '}
          <code className="rounded bg-brand-100 px-1.5 py-0.5">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-brand-100 px-1.5 py-0.5">VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
        </p>
        <p className="text-sm text-mute">
          Run <code className="rounded bg-brand-100 px-1.5 py-0.5">sql/6homes-setup.sql</code> in the Supabase SQL editor first
          if you haven't.
        </p>
      </div>
    </div>
  )
}

const Loading = () => (
  <div className="grid min-h-screen place-items-center">
    <div className="text-sm text-mute">Loading…</div>
  </div>
)

export default function App() {
  const [session, setSession] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isConfigured) { setChecking(false); return }

    let active = true

    // Resolve the stored session on load, then keep in step with auth changes
    // (sign-in, sign-out, token refresh, another tab signing out).
    const resolve = async (s) => {
      if (!active) return
      setSession(s)
      setAdmin(s?.user?.email ? await fetchAdmin(s.user.email) : null)
      if (active) setChecking(false)
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => resolve(s))

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  if (!isConfigured) return <NotConfigured />

  return (
    <BrowserRouter>
      <Routes>
        {/*
          Customer-facing pages, deliberately OUTSIDE the auth gate. They
          authenticate by an unguessable token in the URL and fetch everything
          through /api, so they never touch the store or a Supabase session.
        */}
        <Route path="/quote/:token" element={<QuoteAccept />} />
        <Route path="/sign/:token" element={<SignPage />} />

        {/* Where an invitation or a password reset lands. Outside the admin
            gate on purpose: whoever is here does not have a password yet, so
            they cannot sign in to reach a screen that is behind one. */}
        <Route path="/set-password" element={<SetPassword />} />

        {/*
          The client portal. Same domain and same deployment as the CRM, split
          by role rather than by host: staff land on the board, customers on
          their build. One login surface each, one place to keep them working.
        */}
        <Route path="/portal" element={<PortalArea session={session} checking={checking} />} />
        <Route path="/portal/:projectId" element={<PortalArea session={session} checking={checking} />} />

        <Route path="*" element={<AdminArea session={session} admin={admin} checking={checking} />} />
      </Routes>
    </BrowserRouter>
  )
}

function PortalArea({ session, checking }) {
  if (checking) return <Loading />
  // An admin who follows a portal link sees exactly what the customer sees —
  // useful, and the API allows it, so there's nothing to special-case.
  if (!session?.user?.email) return <PortalLogin />
  return <PortalApp email={session.user.email} />
}

function AdminArea({ session, admin, checking }) {
  if (checking) return <Loading />

  // Signed in but not on the allow-list is either a portal customer who landed
  // on the CRM — send them to their build — or someone who shouldn't be here.
  if (session && !admin) return <Navigate to="/portal" replace />
  if (!session) return <Login />

  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Layout admin={admin} />}>
          {/* Wrapped rather than omitted: a restricted account that types a URL
              gets sent home instead of a blank screen, and the guard lives in
              one place rather than being repeated per route. */}
          <Route index element={<Allowed admin={admin} path="/"><Dashboard /></Allowed>} />
          <Route path="leads" element={<Allowed admin={admin} path="/leads"><LeadsBoard /></Allowed>} />
          <Route path="leads/:id" element={<Allowed admin={admin} path="/leads"><LeadDetail /></Allowed>} />
          <Route path="designs" element={<Allowed admin={admin} path="/designs"><Designs /></Allowed>} />
          <Route path="designs/:id" element={<Allowed admin={admin} path="/designs"><DesignDetail /></Allowed>} />
          <Route path="projects" element={<Allowed admin={admin} path="/projects"><Projects /></Allowed>} />
          <Route path="projects/:id" element={<Allowed admin={admin} path="/projects"><ProjectDetail /></Allowed>} />
          <Route path="quotes" element={<Allowed admin={admin} path="/quotes"><Quotes /></Allowed>} />
          <Route path="quotes/:id" element={<Allowed admin={admin} path="/quotes"><QuoteDetail /></Allowed>} />
          <Route path="templates" element={<Allowed admin={admin} path="/templates"><Templates /></Allowed>} />
          <Route path="email-log" element={<Allowed admin={admin} path="/email-log"><EmailLog /></Allowed>} />
          <Route path="settings" element={<Allowed admin={admin} path="/settings"><Settings admin={admin} /></Allowed>} />
          <Route path="*" element={<Navigate to={homePath(admin)} replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  )
}

// The browser-side half of the role check. The database and api/_auth.js are
// the real boundary — this only decides what is worth rendering.
function Allowed({ admin, path, children }) {
  return canOpen(admin, path) ? children : <Navigate to={homePath(admin)} replace />
}
