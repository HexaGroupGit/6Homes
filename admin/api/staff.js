// Managing who has access to the CRM.
//
// Owner-only, every action. This endpoint can hand out full access to the
// database, so the gate is deliberately the narrowest one in the codebase —
// tighter even than requireFullAdmin.
//
// Inviting someone never sends them a password. It creates the account with a
// throwaway secret nobody is told, then emails a single-use link to
// /set-password so the only person who ever knows the password is the person
// using it.
import { serviceClient, verifiedUser, adminRole } from './_auth.js'
import { applyCors, methodNotAllowed } from './_cors.js'
import { sendEmail } from './_email.js'
import { renderStaffInvite } from './_staffEmail.js'
import { ROLES, DEFAULT_ROLE } from '../src/lib/roles.js'

const PORTAL = (process.env.PORTAL_URL || process.env.ADMIN_URL || 'https://portal.6homes.com').replace(/\/+$/, '')

const normEmail = (e) => String(e ?? '').trim().toLowerCase()

// Exists only so the account is complete. The invitation link is what gets
// them in, and this is replaced the moment they set their own.
function throwawayPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(24)
  globalThis.crypto.getRandomValues(bytes)
  return 'Tmp-' + [...bytes].map((b) => alphabet[b % alphabet.length]).join('')
}

export default async function handler(req, res) {
  if (applyCors(req, res, 'POST, OPTIONS')) return
  if (req.method !== 'POST') return methodNotAllowed(res, 'POST')

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const sb = serviceClient()

  const user = await verifiedUser(req, sb)
  if (!user) return res.status(401).json({ error: 'Sign in to continue.' })

  const role = await adminRole(sb, user.email)
  if (role !== 'owner') {
    return res.status(403).json({ error: 'Only an owner can manage who has access.' })
  }

  const list = async () => {
    const { data } = await sb.from('admins').select('email, name, role').order('email')
    return (data ?? []).map((a) => ({ ...a, role: a.role ?? DEFAULT_ROLE }))
  }

  try {
    switch (body.action) {
      case 'list':
        return res.status(200).json({ staff: await list() })

      case 'invite': {
        const email = normEmail(body.email)
        const name = String(body.name ?? '').trim().slice(0, 120)
        const wanted = ROLES[body.role] ? body.role : DEFAULT_ROLE
        if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email address.' })

        const { error: aErr } = await sb.from('admins')
          .upsert({ email, name: name || email.split('@')[0], role: wanted }, { onConflict: 'email' })
        if (aErr) throw new Error(aErr.message)

        // The account may already exist — someone re-invited, or a former
        // portal customer being promoted to staff.
        const { data: existing } = await sb.auth.admin.listUsers({ perPage: 200 })
        if (!existing.users.some((u) => u.email?.toLowerCase() === email)) {
          const { error: cErr } = await sb.auth.admin.createUser({
            email, password: throwawayPassword(), email_confirm: true, user_metadata: { name },
          })
          if (cErr && !/already/i.test(cErr.message)) throw new Error(cErr.message)
        }

        const { data: link, error: lErr } = await sb.auth.admin.generateLink({
          type: 'recovery', email, options: { redirectTo: `${PORTAL}/set-password` },
        })
        if (lErr) throw new Error(`Could not generate a sign-in link: ${lErr.message}`)

        const { data: sconf } = await sb.from('settings').select('data').eq('id', 'global').maybeSingle()
        const mail = renderStaffInvite({
          name: name || email.split('@')[0],
          role: wanted,
          link: link.properties.action_link,
          portal: PORTAL,
        })
        const sent = await sendEmail({
          to: email, ...mail, replyTo: sconf?.data?.emails?.replyTo, emailType: 'staff_invite', internal: true,
        })

        return res.status(200).json({
          ok: true, staff: await list(), sent: sent.ok, skipped: sent.skipped, reason: sent.reason,
        })
      }

      case 'set-role': {
        const email = normEmail(body.email)
        if (!ROLES[body.role]) return res.status(400).json({ error: 'Unknown role.' })
        // An owner demoting themselves would lock the last door behind them.
        if (email === user.email && body.role !== 'owner') {
          return res.status(400).json({ error: 'You can\'t remove your own owner access — ask another owner to do it.' })
        }
        const { error } = await sb.from('admins').update({ role: body.role }).ilike('email', email)
        if (error) throw new Error(error.message)
        return res.status(200).json({ ok: true, staff: await list() })
      }

      case 'remove': {
        const email = normEmail(body.email)
        if (email === user.email) return res.status(400).json({ error: 'You can\'t remove your own access.' })

        // Off the allow-list, and the auth account with it. Leaving the account
        // behind would let them keep a valid session that no longer resolves to
        // staff — harmless today, confusing the day someone re-adds the address.
        const { error } = await sb.from('admins').delete().ilike('email', email)
        if (error) throw new Error(error.message)

        const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 })
        const found = users.users.find((u) => u.email?.toLowerCase() === email)
        if (found) await sb.auth.admin.deleteUser(found.id)

        return res.status(200).json({ ok: true, staff: await list() })
      }

      default:
        return res.status(400).json({ error: `Unknown action "${body.action}".` })
    }
  } catch (err) {
    console.error('staff', body.action, 'failed:', err)
    return res.status(500).json({ error: err.message || 'Something went wrong.' })
  }
}
