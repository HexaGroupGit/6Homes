import { supabase } from './supabase.js'

// The api/ functions verify the caller from their Supabase JWT, so every
// privileged call has to carry the current access token.
export async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * POST to an api/ endpoint with the caller's auth attached.
 * Throws with the server's message so callers can surface something useful
 * rather than "Failed to fetch".
 */
export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body ?? {}),
  })
  let data = null
  try { data = await res.json() } catch { /* empty or non-JSON body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}

export async function apiGet(path) {
  const res = await fetch(path, { headers: await authHeaders() })
  let data = null
  try { data = await res.json() } catch { /* ignore */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data
}
