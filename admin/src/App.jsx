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
        <Route path="*" element={<AdminArea session={session} admin={admin} checking={checking} />} />
      </Routes>
    </BrowserRouter>
  )
}

function AdminArea({ session, admin, checking }) {
  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-mute">Loading…</div>
      </div>
    )
  }

  // Signed in but not on the allow-list is treated as signed out.
  if (!session || !admin) return <Login />

  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Layout admin={admin} />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<LeadsBoard />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="designs" element={<Designs />} />
          <Route path="designs/:id" element={<DesignDetail />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="templates" element={<Templates />} />
          <Route path="email-log" element={<EmailLog />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  )
}
