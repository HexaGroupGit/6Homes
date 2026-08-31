import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare, Home, HardHat, FileText, Mail, Send, Settings as SettingsIcon, LogOut, ShieldAlert,
} from 'lucide-react'
import { signOut } from '../lib/auth.js'
import { useStore } from '../store/useStore.jsx'
import { cn, initials } from '../lib/utils.js'
import { visibleNav, roleMeta, isFullAdmin } from '../lib/roles.js'

const NAV = [
  { to: '/', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/leads', label: 'Leads', icon: KanbanSquare },
  { to: '/designs', label: 'Designs', icon: Home },
  { to: '/projects', label: 'Projects', icon: HardHat },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/templates', label: 'Email templates', icon: Mail },
  { to: '/email-log', label: 'Email log', icon: Send },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

// While safe mode is on, nothing reaches a customer. That is the correct state
// for everything up to launch — but it has to be impossible to forget, or
// someone will spend a week wondering why leads never hear back.
function SafeModeBanner({ settings }) {
  if (settings?.emails?.safeMode === false) return null
  const to = settings?.emails?.safeRecipient || 'the safe recipient'
  return (
    <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-100 px-5 py-2 text-[13px] text-amber-900">
      <ShieldAlert size={15} className="shrink-0" />
      <span>
        <strong className="font-semibold">Safe mode is on.</strong> No customer receives email — everything is
        redirected to <strong className="font-semibold">{to}</strong>. Turn it off in Settings when you go live.
      </span>
    </div>
  )
}

export default function Layout({ admin }) {
  const { settings, loading, error } = useStore()
  const full = isFullAdmin(admin)

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-hair bg-white">
        <div className="px-5 py-6">
          <div className="text-xl tracking-wide text-navy">
            <span className="font-bold">6</span>
            <span className="font-normal tracking-[0.18em]">HOMES</span>
          </div>
          <div className="mt-1 text-[10px] tracking-[0.2em] text-mute uppercase">Admin</div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {visibleNav(admin, NAV).map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-brand-100 font-medium text-navy' : 'text-mute hover:bg-brand-50 hover:text-ink'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hair p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
              {initials(admin?.name || admin?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{admin?.name || 'Admin'}</div>
              {/* Say which role, so a restricted account knows the missing nav
                  items are a setting rather than something broken. */}
              <div className="truncate text-[11px] text-mute" title={admin?.email}>
                {full ? admin?.email : roleMeta(admin?.role).label}
              </div>
            </div>
          </div>
          <button onClick={signOut} className="btn-ghost mt-1 w-full justify-start text-xs">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {full && <SafeModeBanner settings={settings} />}
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-[13px] text-red-800">
            Couldn't load data: {error}
          </div>
        )}
        <main className="flex-1 overflow-x-hidden">
          {loading ? <div className="p-8 text-sm text-mute">Loading…</div> : <Outlet />}
        </main>
      </div>
    </div>
  )
}
