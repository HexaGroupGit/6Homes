import { supabase } from './supabase.js'

// Signing in to Supabase is not enough to be an admin here — the email also has
// to appear in the `admins` table. RLS lets any authenticated user read that
// table, which is what makes this check possible from the browser; the api/
// functions repeat it server-side (api/_auth.js) so the client check is a
// convenience, never the actual boundary.
export async function fetchAdmin(email) {
  if (!email) return null
  const { data, error } = await supabase
    .from('admins')
    .select('email, name, role')
    .ilike('email', email)
    .maybeSingle()
  if (error) {
    console.error('admin lookup failed:', error.message)
    return null
  }
  return data
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const admin = await fetchAdmin(data.user?.email)
  if (!admin) {
    // A valid Supabase user who isn't on the allow-list gets signed straight
    // back out, so a half-authenticated session can't linger.
    await supabase.auth.signOut()
    throw new Error('That account does not have admin access.')
  }
  return admin
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/set-password`,
  })
  if (error) throw new Error(error.message)
}
