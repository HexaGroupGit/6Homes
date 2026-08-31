import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Loud, early, and in plain language — a blank screen with a console 401 is a
  // miserable way to discover a missing env var.
  console.error(
    'Supabase is not configured. Copy admin/.env.example to admin/.env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true },
})

export const isConfigured = Boolean(url && anonKey)
