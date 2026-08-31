import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Trash2, ShieldCheck, Send } from 'lucide-react'
import { apiPost } from '../lib/apiFetch.js'
import { Field, Badge } from './ui.jsx'
import { cn, initials } from '../lib/utils.js'
import { ROLES, DEFAULT_ROLE, canManageStaff } from '../lib/roles.js'

const post = (action, body) => apiPost('/api/staff', { action, ...body })

const TONE = { owner: 'blue', admin: 'neutral', projects: 'amber' }

/**
 * Who can sign in to the CRM, and at what level.
 *
 * Owner-only — the endpoint enforces that too, because this screen can hand out
 * access to every lead and price in the business.
 */
export default function Team({ admin }) {
  const [staff, setStaff] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [invite, setInvite] = useState({ name: '', email: '', role: DEFAULT_ROLE })

  const owner = canManageStaff(admin)

  const load = useCallback(async () => {
    try { setStaff((await post('list')).staff) } catch (err) { setError(err.message) }
  }, [])

  useEffect(() => { if (owner) load() }, [owner, load])

  const run = async (key, fn) => {
    setBusy(key); setError(''); setNotice('')
    try {
      const r = await fn()
      if (r?.staff) setStaff(r.staff)
      if (r?.note) setNotice(r.note)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  if (!owner) {
    return (
      <div className="card p-5">
        <h2 className="text-sm font-medium text-navy">Team</h2>
        <p className="mt-1 text-sm text-mute">Only an owner can change who has access.</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-navy">Team</h2>
          <p className="mt-0.5 text-xs text-mute">
            Who can sign in, and what they can reach. Inviting someone emails them a link to set their own password —
            you never handle it.
          </p>
        </div>
      </div>

      {error && <div className="mt-4 rounded-md bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      {notice && <div className="mt-4 rounded-md bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</div>}

      {staff === null ? (
        <p className="mt-4 text-sm text-mute">Loading…</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {staff.map((s) => {
            const me = s.email === admin?.email
            return (
              <li key={s.email} className="flex flex-wrap items-center gap-3 rounded-md border border-hair p-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                  {initials(s.name || s.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{s.name || s.email.split('@')[0]}</span>
                    {me && <Badge tone="blue">You</Badge>}
                  </div>
                  <div className="truncate text-xs text-mute">{s.email}</div>
                </div>

                <select
                  className="field w-auto max-w-[11rem] py-1.5 text-xs"
                  value={s.role ?? DEFAULT_ROLE}
                  disabled={!!busy || me}
                  title={me ? 'You can\'t change your own access' : ROLES[s.role]?.blurb}
                  onChange={(e) => run(`role-${s.email}`, () => post('set-role', { email: s.email, role: e.target.value }))}
                >
                  {Object.entries(ROLES).map(([id, r]) => (
                    <option key={id} value={id}>{r.label}</option>
                  ))}
                </select>

                <button
                  className="shrink-0 text-mute hover:text-navy disabled:opacity-40"
                  title="Send them a fresh link to set their password"
                  disabled={!!busy}
                  onClick={() => run(`re-${s.email}`, async () => {
                    const r = await post('invite', { email: s.email, name: s.name, role: s.role })
                    return { ...r, note: r.sent ? `New sign-in link sent to ${s.email}.` : `Not sent: ${r.reason}` }
                  })}
                >
                  <Send size={15} />
                </button>

                <button
                  className="shrink-0 text-mute hover:text-red-600 disabled:opacity-40"
                  title={me ? 'You can\'t remove your own access' : 'Remove their access entirely'}
                  disabled={!!busy || me}
                  onClick={() => {
                    if (!window.confirm(`Remove ${s.email}? They lose access immediately and their account is deleted.`)) return
                    run(`rm-${s.email}`, () => post('remove', { email: s.email }))
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── What the roles mean, stated once ──────────────────────────────── */}
      <dl className="mt-5 space-y-1.5 border-t border-hair pt-4">
        {Object.entries(ROLES).map(([id, r]) => (
          <div key={id} className="flex gap-3 text-xs">
            <dt className="w-24 shrink-0">
              <Badge tone={TONE[id]}>{r.label}</Badge>
            </dt>
            <dd className="text-mute">{r.blurb}</dd>
          </div>
        ))}
      </dl>

      {/* ── Invite ────────────────────────────────────────────────────────── */}
      <form
        className="mt-5 grid gap-3 border-t border-hair pt-4 sm:grid-cols-[1fr_1.4fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          run('invite', async () => {
            const r = await post('invite', invite)
            setInvite({ name: '', email: '', role: DEFAULT_ROLE })
            return { ...r, note: r.sent ? `Invitation sent to ${invite.email}.` : `Added, but the email wasn't sent: ${r.reason}` }
          })
        }}
      >
        <Field label="Name">
          <input className="field" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <input
            type="email" className="field" placeholder="name@6homes.com"
            value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })}
          />
        </Field>
        <Field label="Access">
          <select className="field" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            {Object.entries(ROLES).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}
          </select>
        </Field>
        <div className="flex items-end">
          <button className={cn('btn-primary w-full sm:w-auto')} disabled={!!busy || !invite.email.includes('@')}>
            <UserPlus size={15} /> {busy === 'invite' ? 'Sending…' : 'Invite'}
          </button>
        </div>
      </form>

      <p className="mt-3 flex items-start gap-2 text-xs text-mute">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" />
        Staff invitations are sent even while safe mode is on, so you can get your team in before you go live.
        Customer email stays redirected.
      </p>
    </div>
  )
}
