import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured) {
  // Loud, early, and in plain language — a blank screen with a console 401 is a
  // miserable way to discover a missing env var.
  console.error(
    'Supabase is not configured. Copy admin/.env.example to admin/.env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// createClient throws "supabaseUrl is required" on an empty string, and it runs
// at module load — which killed the app before React could render the
// "not configured" screen, leaving a blank white page instead of the message
// explaining exactly what to do. A syntactically valid placeholder lets the
// module load; App checks `isConfigured` and shows the real explanation, so no
// request is ever made against this.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export const supabase = createClient(
  isConfigured ? url : PLACEHOLDER_URL,
  isConfigured ? anonKey : PLACEHOLDER_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
)
