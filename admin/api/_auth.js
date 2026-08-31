// Server-side caller verification for the api/ endpoints.
//
// Every api/ handler runs with the service role and bypasses RLS, so it MUST
// establish who is calling before acting on any id. Three gates:
//   requireAdmin(req)        — a verified admin (email in the `admins` table)
//   requireCron(req)         — a Vercel cron invocation (Bearer CRON_SECRET)
//   requireCronOrAdmin(req)  — either, for endpoints that are both
//
// Admin identity comes from the caller's Supabase JWT
// (`Authorization: Bearer <access_token>`), verified via the Auth admin API —
// never from the request body.
//
// Public endpoints (form-submit, quote accept, e-sign) deliberately have no
// gate: they authenticate by an unguessable token, or they only ever create.
// Ported from Hexa Space RND api/_auth.js.
import { createClient } from '@supabase/supabase-js'

export function serviceClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export function bearer(req) {
  return (req.headers?.authorization || '').replace(/^Bearer\s+/i, '').trim()
}

// Resolve + verify the caller's JWT → { id, email } or null.
export async function verifiedUser(req, sb) {
  const jwt = bearer(req)
  if (!jwt) return null
  const { data: { user } = {}, error } = await sb.auth.getUser(jwt)
  if (error || !user?.email) return null
  return { id: user.id, email: user.email.toLowerCase() }
}

export async function isAdminEmail(sb, email) {
  const { data } = await sb.from('admins').select('email').ilike('email', email).maybeSingle()
  return !!data
}

// Gate: a verified admin. Returns { sb, user } or { error, status }.
export async function requireAdmin(req) {
  const sb = serviceClient()
  const user = await verifiedUser(req, sb)
  if (!user) return { error: 'Sign in required.', status: 401 }
  if (!(await isAdminEmail(sb, user.email))) return { error: 'Admin access required.', status: 403 }
  return { sb, user }
}

// Gate: a Vercel cron invocation. Vercel adds `Authorization: Bearer $CRON_SECRET`
// when the CRON_SECRET env var is set. If it is unset we allow the call (so crons
// keep working before the secret is configured) but flag it — SET CRON_SECRET in
// the Vercel project env to actually enforce this.
export function requireCron(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return { ok: true, unguarded: true }
  const tok = bearer(req) || req.query?.key
  return tok === secret ? { ok: true } : { ok: false }
}

// Gate for endpoints that are BOTH a Vercel cron and a manual admin action.
export async function requireCronOrAdmin(req) {
  const cron = requireCron(req)
  if (cron.ok) return { ok: true, cron: true, unguarded: cron.unguarded }
  const admin = await requireAdmin(req)
  if (!admin.error) return { ok: true, admin: true, sb: admin.sb, user: admin.user }
  return { ok: false, status: 401, error: 'Unauthorized' }
}
